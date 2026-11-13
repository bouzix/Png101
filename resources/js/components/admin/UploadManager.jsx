import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import {
    Loader2,
    CheckCircle2,
    AlertTriangle,
    Minimize2,
    X,
    Image as ImageIcon,
} from 'lucide-react';

const UploadManagerContext = createContext(null);

const INITIAL_JOB = {
    active: false,
    status: 'idle', // 'idle' | 'running' | 'completed'
    mode: 'staging', // 'staging' | 'publishing'
    total: 0,
    completed: 0,
    succeeded: 0,
    failed: 0,
    currentFileName: '',
    currentPreview: null,
};

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const IHDR_BYTES = [0x49, 0x48, 0x44, 0x52];
const TRANSIENT_STATUS_CODES = new Set([408, 429, 500, 502, 503, 504]);
const AUTO_RETRY_DELAYS_MS = [900, 2200];
const DEFAULT_CONCURRENCY = 3;
const MIN_CONCURRENCY = 1;
const THROTTLE_COOLDOWN_MS = 1200;
const RECOVERY_SUCCESS_STREAK = 4;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function formatBytes(bytes) {
    if (!bytes || bytes <= 0) return '0 B';
    if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    if (bytes >= 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
    return `${bytes} B`;
}

function isPngFile(file) {
    if (!file) return false;
    if (file.type === 'image/png') return true;
    return String(file.name || '').toLowerCase().endsWith('.png');
}

/**
 * Client-side pre-flight check: format, non-empty size, server limit, and PNG header + IHDR bytes.
 */
async function inspectPngFile(file, uploadLimits) {
    if (!isPngFile(file)) {
        const ext = String(file?.name || '').includes('.')
            ? `.${file.name.split('.').pop()}`
            : 'unknown';
        return {
            ok: false,
            failureCategory: 'format',
            reason: `Unsupported format (${file?.type || ext}). Only PNG (.png) images are allowed.`,
        };
    }

    if (!file.size || file.size <= 0) {
        return {
            ok: false,
            failureCategory: 'corrupt',
            reason: 'File is empty (0 bytes) and cannot be uploaded.',
        };
    }

    const maxBytes = uploadLimits?.effectiveMaxBytes || 0;
    if (maxBytes > 0 && file.size > maxBytes) {
        const limitLabel = uploadLimits?.effectiveMaxLabel || formatBytes(maxBytes);
        return {
            ok: false,
            failureCategory: 'size',
            reason: `File is ${formatBytes(file.size)}, which exceeds the server upload limit (${limitLabel}).`,
        };
    }

    if (typeof file.slice === 'function' && typeof Blob.prototype.arrayBuffer === 'function') {
        try {
            const headerBuffer = await file.slice(0, 24).arrayBuffer();
            const bytes = new Uint8Array(headerBuffer);

            if (bytes.length < 24) {
                return {
                    ok: false,
                    failureCategory: 'corrupt',
                    reason: 'File is too short or truncated to be a valid PNG image.',
                };
            }

            const sigMatches = PNG_SIGNATURE.every((val, i) => bytes[i] === val);
            if (!sigMatches) {
                return {
                    ok: false,
                    failureCategory: 'corrupt',
                    reason: 'Invalid PNG signature — this file may be a renamed JPG/WebP or corrupted.',
                };
            }

            const ihdrMatches = IHDR_BYTES.every((val, i) => bytes[12 + i] === val);
            if (!ihdrMatches) {
                return {
                    ok: false,
                    failureCategory: 'corrupt',
                    reason: 'Corrupted PNG header (missing IHDR chunk).',
                };
            }

            const view = new DataView(headerBuffer);
            const width = view.getUint32(16, false);
            const height = view.getUint32(20, false);
            if (width === 0 || height === 0) {
                return {
                    ok: false,
                    failureCategory: 'corrupt',
                    reason: 'Corrupted PNG dimensions reported in file header.',
                };
            }
        } catch {
            return {
                ok: false,
                failureCategory: 'corrupt',
                reason: 'Could not read PNG file bytes from disk.',
            };
        }
    }

    return { ok: true };
}

function makePreviewUrl(file) {
    if (!file || typeof URL === 'undefined') return null;
    try {
        return URL.createObjectURL(file);
    } catch {
        return null;
    }
}

function revokePreviewUrl(url) {
    if (!url || typeof url !== 'string' || !url.startsWith('blob:')) return;
    try {
        URL.revokeObjectURL(url);
    } catch {
        // Ignore
    }
}

function extractHttpError(status, data, fallback) {
    const serverMsg = data?.error || data?.message;
    if (typeof serverMsg === 'string' && serverMsg.trim() !== '') {
        return serverMsg.trim();
    }
    if (status === 413) return 'File is too large for server upload limit (HTTP 413).';
    if (status === 429) return 'Server rate limit reached while uploading (HTTP 429).';
    if (status === 403) return 'Permission denied — missing upload permission (HTTP 403).';
    if (status === 401) return 'Session expired — please sign in again (HTTP 401).';
    if (status >= 500) return `Server error while processing PNG (HTTP ${status}).`;
    return `${fallback} (HTTP ${status})`;
}

function isTransientFailure(status, isNetworkError) {
    if (isNetworkError) return true;
    return TRANSIENT_STATUS_CODES.has(status);
}

function classifyFailureCategory(status, isNetworkError) {
    if (isNetworkError) return 'network';
    if (status === 413) return 'size';
    if (status === 401 || status === 403) return 'auth';
    if (isTransientFailure(status, false)) return 'transient';
    return 'server';
}

export function UploadManagerProvider({ children, initialUploadLimits = null }) {
    const [job, setJob] = useState(INITIAL_JOB);
    const [isMinimized, setIsMinimized] = useState(false);
    const [failedUploads, setFailedUploads] = useState([]);
    const [uploadLimits, setUploadLimits] = useState(initialUploadLimits);

    const queueRef = useRef([]);
    const processingRef = useRef(false);
    const modeRef = useRef('staging');
    const listenersRef = useRef(new Set());
    const failedUploadsRef = useRef([]);
    const uploadLimitsRef = useRef(initialUploadLimits);

    // Adaptive concurrency state for batch runs
    const concurrencyRef = useRef(DEFAULT_CONCURRENCY);
    const successStreakRef = useRef(0);
    const throttleUntilRef = useRef(0);

    useEffect(() => {
        failedUploadsRef.current = failedUploads;
    }, [failedUploads]);

    useEffect(() => {
        uploadLimitsRef.current = uploadLimits;
    }, [uploadLimits]);

    const subscribe = useCallback((callbacks) => {
        listenersRef.current.add(callbacks);
        return () => {
            listenersRef.current.delete(callbacks);
        };
    }, []);

    const notifyStaged = useCallback((stagedItem) => {
        listenersRef.current.forEach((cb) => {
            if (typeof cb?.onStaged === 'function') {
                cb.onStaged(stagedItem);
            }
        });
    }, []);

    const notifyPublished = useCallback((publishedId) => {
        listenersRef.current.forEach((cb) => {
            if (typeof cb?.onPublished === 'function') {
                cb.onPublished(publishedId);
            }
        });
    }, []);

    const recordFailedItem = useCallback((entry) => {
        setFailedUploads((prev) => [entry, ...prev]);
    }, []);

    // Warn before full browser tab close/reload only while requests are actively running
    useEffect(() => {
        if (job.status !== 'running') return;
        const handleBeforeUnload = (e) => {
            e.preventDefault();
            e.returnValue = '';
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [job.status]);

    const performSingleAttempt = useCallback(
        async (item) => {
            if (item.kind === 'staging') {
                const formData = new FormData();
                formData.append('file', item.file);

                try {
                    const res = await fetch('/api/upload', {
                        method: 'POST',
                        body: formData,
                    });

                    if (res.ok) {
                        const data = await res.json();
                        const stagedObj = {
                            id: data.image.id,
                            file: item.file,
                            preview: data.image.path,
                            name: data.image.name,
                            tags: [],
                            altText: '',
                            description: '',
                            categoryIds: [],
                            hasMetadata: false,
                            isSelected: false,
                            luminance: data.image.luminance || null,
                            contrastBgDark: data.image.contrastBgDark || null,
                            contrastBgLight: data.image.contrastBgLight || null,
                        };
                        notifyStaged(stagedObj);
                        return { ok: true, serverPreview: data.image?.path || null };
                    }

                    const errBody = await res.json().catch(() => null);
                    return {
                        ok: false,
                        status: res.status,
                        isNetworkError: false,
                        reason: extractHttpError(res.status, errBody, 'Upload rejected by server'),
                    };
                } catch (err) {
                    return {
                        ok: false,
                        status: 0,
                        isNetworkError: true,
                        reason: err?.message
                            ? `Network error: ${err.message}`
                            : 'Network connection failed or timed out.',
                    };
                }
            }

            if (item.kind === 'publishing') {
                try {
                    const res = await fetch('/api/images/update', {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ id: item.id, status: 'published' }),
                    });

                    if (res.ok) {
                        notifyPublished(item.id);
                        return { ok: true, serverPreview: item.preview || null };
                    }

                    const errBody = await res.json().catch(() => null);
                    return {
                        ok: false,
                        status: res.status,
                        isNetworkError: false,
                        reason: extractHttpError(res.status, errBody, 'Failed to publish image'),
                    };
                } catch (err) {
                    return {
                        ok: false,
                        status: 0,
                        isNetworkError: true,
                        reason: err?.message
                            ? `Network error: ${err.message}`
                            : 'Network connection failed while publishing.',
                    };
                }
            }

            return { ok: false, status: 0, isNetworkError: false, reason: 'Unsupported upload task.' };
        },
        [notifyPublished, notifyStaged]
    );

    const runItemWithAutoRetry = useCallback(
        async (item) => {
            const displayName = item.name || item.file?.name || 'Untitled PNG';
            const liveObjectUrl =
                item.kind === 'staging' && item.file ? makePreviewUrl(item.file) : null;
            const activeThumb = liveObjectUrl || item.preview || null;

            setJob((prev) => ({
                ...prev,
                currentFileName: displayName,
                currentPreview: activeThumb || prev.currentPreview,
            }));

            let attempt = 0;
            let lastResult = null;

            while (attempt <= AUTO_RETRY_DELAYS_MS.length) {
                lastResult = await performSingleAttempt(item);
                if (lastResult.ok) {
                    if (liveObjectUrl) revokePreviewUrl(liveObjectUrl);
                    return {
                        ok: true,
                        autoRetriesUsed: attempt,
                        serverPreview: lastResult.serverPreview || null,
                    };
                }

                const transient = isTransientFailure(lastResult.status, lastResult.isNetworkError);
                if (transient) {
                    // Throttle concurrency smoothly so shared hosting isn't overwhelmed
                    concurrencyRef.current = MIN_CONCURRENCY;
                    successStreakRef.current = 0;
                    throttleUntilRef.current = Date.now() + THROTTLE_COOLDOWN_MS;
                }

                if (!transient || attempt >= AUTO_RETRY_DELAYS_MS.length) {
                    break;
                }

                await sleep(AUTO_RETRY_DELAYS_MS[attempt]);
                attempt += 1;
            }

            const failedThumb =
                item.kind === 'staging'
                    ? liveObjectUrl || makePreviewUrl(item.file)
                    : item.preview || null;

            const failureCategory = classifyFailureCategory(
                lastResult?.status || 0,
                Boolean(lastResult?.isNetworkError)
            );
            const autoSuffix =
                attempt > 0 ? ` (after ${attempt} automatic ${attempt === 1 ? 'retry' : 'retries'})` : '';

            return {
                ok: false,
                autoRetriesUsed: attempt,
                failedEntry: {
                    id: `fail-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                    kind: item.kind,
                    file: item.file || null,
                    itemId: item.id || null,
                    name: displayName,
                    size: item.file?.size || 0,
                    previewUrl: failedThumb,
                    reason: `${lastResult?.reason || 'Unknown upload error.'}${autoSuffix}`,
                    failureCategory,
                    attempts: (item.attempts || 0) + attempt + 1,
                    autoRetried: attempt,
                    canRetry: item.kind === 'staging' ? Boolean(item.file) : Boolean(item.id),
                },
            };
        },
        [performSingleAttempt]
    );

    const processQueue = useCallback(async () => {
        if (processingRef.current) return;
        processingRef.current = true;

        concurrencyRef.current = DEFAULT_CONCURRENCY;
        successStreakRef.current = 0;
        throttleUntilRef.current = 0;

        const activeMode = modeRef.current;
        let batchSucceeded = 0;
        let batchFailed = 0;
        let batchAutoRecovered = 0;

        const inFlight = new Set();

        const launchWorker = (item) => {
            const p = runItemWithAutoRetry(item)
                .then((outcome) => {
                    if (outcome.ok) {
                        batchSucceeded += 1;
                        if (outcome.autoRetriesUsed > 0) {
                            batchAutoRecovered += 1;
                        }
                        successStreakRef.current += 1;
                        if (
                            successStreakRef.current >= RECOVERY_SUCCESS_STREAK &&
                            concurrencyRef.current < DEFAULT_CONCURRENCY
                        ) {
                            concurrencyRef.current += 1;
                            successStreakRef.current = 0;
                        }
                    } else {
                        batchFailed += 1;
                        successStreakRef.current = 0;
                        recordFailedItem(outcome.failedEntry);
                    }

                    setJob((prev) => ({
                        ...prev,
                        completed: prev.completed + 1,
                        succeeded: prev.succeeded + (outcome.ok ? 1 : 0),
                        failed: prev.failed + (outcome.ok ? 0 : 1),
                        currentPreview: outcome.serverPreview || prev.currentPreview,
                    }));
                })
                .finally(() => {
                    inFlight.delete(p);
                });

            inFlight.add(p);
        };

        while (queueRef.current.length > 0 || inFlight.size > 0) {
            while (queueRef.current.length > 0 && inFlight.size < concurrencyRef.current) {
                const now = Date.now();
                if (throttleUntilRef.current > now) {
                    if (inFlight.size === 0) {
                        await sleep(Math.min(THROTTLE_COOLDOWN_MS, throttleUntilRef.current - now));
                    } else {
                        break;
                    }
                }
                const nextItem = queueRef.current.shift();
                if (nextItem) {
                    launchWorker(nextItem);
                }
            }

            if (inFlight.size > 0) {
                await Promise.race(inFlight);
            }
        }

        processingRef.current = false;

        setJob((prev) => ({
            ...prev,
            status: 'completed',
        }));

        if (batchFailed === 0) {
            const recoveredNote =
                batchAutoRecovered > 0
                    ? ` (${batchAutoRecovered} auto-recovered)`
                    : '';
            if (activeMode === 'staging') {
                toast.success(
                    batchSucceeded === 1
                        ? `Image uploaded successfully${recoveredNote}`
                        : `Successfully uploaded all ${batchSucceeded} images!${recoveredNote}`
                );
            } else {
                toast.success(`Successfully published ${batchSucceeded} images!${recoveredNote}`);
            }
        } else {
            const verb = activeMode === 'staging' ? 'Uploaded' : 'Published';
            toast.warning(`${verb} ${batchSucceeded} images. ${batchFailed} failed.`);
        }
    }, [recordFailedItem, runItemWithAutoRetry]);

    const startStagingUpload = useCallback(
        async (files, attemptMap = null) => {
            if (!files || files.length === 0) return;

            const limits = uploadLimitsRef.current;
            const inspections = await Promise.all(
                files.map((file, idx) =>
                    inspectPngFile(file, limits).then((check) => ({
                        file,
                        attempts: attemptMap ? attemptMap[idx] || 0 : 0,
                        check,
                    }))
                )
            );

            const validItems = [];
            const invalidEntries = [];

            inspections.forEach(({ file, attempts, check }) => {
                if (check.ok) {
                    validItems.push({
                        kind: 'staging',
                        file,
                        name: file.name,
                        attempts,
                    });
                } else {
                    const previewUrl = String(file?.type || '').startsWith('image/')
                        ? makePreviewUrl(file)
                        : null;
                    invalidEntries.push({
                        id: `fail-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                        kind: 'staging',
                        file: null,
                        itemId: null,
                        name: file?.name || 'Invalid file',
                        size: file?.size || 0,
                        previewUrl,
                        reason: check.reason,
                        failureCategory: check.failureCategory || 'format',
                        attempts: attempts + 1,
                        autoRetried: 0,
                        canRetry: false,
                    });
                }
            });

            if (invalidEntries.length > 0) {
                setFailedUploads((prev) => [...invalidEntries, ...prev]);
                toast.error(
                    invalidEntries.length === 1
                        ? `"${invalidEntries[0].name}" failed pre-flight check — see Failed Uploads.`
                        : `${invalidEntries.length} files failed pre-flight checks — see Failed Uploads.`
                );
            }

            if (validItems.length === 0) return;

            if (processingRef.current && modeRef.current === 'staging') {
                queueRef.current.push(...validItems);
                setJob((prev) => ({
                    ...prev,
                    active: true,
                    status: 'running',
                    total: prev.total + validItems.length,
                }));
                toast.info(`Added ${validItems.length} more files to upload queue`);
                return;
            }

            modeRef.current = 'staging';
            queueRef.current = validItems;

            setJob({
                active: true,
                status: 'running',
                mode: 'staging',
                total: validItems.length,
                completed: 0,
                succeeded: 0,
                failed: 0,
                currentFileName: validItems[0].name,
                currentPreview: null,
            });
            setIsMinimized(false);

            processQueue();
        },
        [processQueue]
    );

    const startPublishingBatch = useCallback(
        (items) => {
            if (!items || items.length === 0) return;

            const queuedItems = items.map((item) => ({
                kind: 'publishing',
                id: item.id,
                name: item.name,
                preview: item.preview,
                attempts: item.attempts || 0,
            }));

            if (processingRef.current && modeRef.current === 'publishing') {
                queueRef.current.push(...queuedItems);
                setJob((prev) => ({
                    ...prev,
                    active: true,
                    status: 'running',
                    total: prev.total + queuedItems.length,
                }));
                return;
            }

            modeRef.current = 'publishing';
            queueRef.current = queuedItems;

            setJob({
                active: true,
                status: 'running',
                mode: 'publishing',
                total: queuedItems.length,
                completed: 0,
                succeeded: 0,
                failed: 0,
                currentFileName: queuedItems[0].name,
                currentPreview: queuedItems[0].preview || null,
            });
            setIsMinimized(false);

            processQueue();
        },
        [processQueue]
    );

    const removeFailedUpload = useCallback((failedId) => {
        setFailedUploads((prev) => {
            const target = prev.find((f) => f.id === failedId);
            if (target?.previewUrl) {
                revokePreviewUrl(target.previewUrl);
            }
            return prev.filter((f) => f.id !== failedId);
        });
    }, []);

    const clearFailedUploads = useCallback(() => {
        setFailedUploads((prev) => {
            prev.forEach((f) => {
                if (f.previewUrl) revokePreviewUrl(f.previewUrl);
            });
            return [];
        });
    }, []);

    const retryFailedUpload = useCallback(
        (failedId) => {
            const target = failedUploadsRef.current.find((f) => f.id === failedId);
            if (!target || !target.canRetry) return;

            removeFailedUpload(failedId);

            if (target.kind === 'staging' && target.file) {
                startStagingUpload([target.file], [target.attempts]);
            } else if (target.kind === 'publishing' && target.itemId) {
                startPublishingBatch([
                    {
                        id: target.itemId,
                        name: target.name,
                        preview: target.previewUrl,
                        attempts: target.attempts,
                    },
                ]);
            }
        },
        [removeFailedUpload, startPublishingBatch, startStagingUpload]
    );

    const replaceFailedUpload = useCallback(
        (failedId, newFile) => {
            if (!failedId || !newFile) return;
            removeFailedUpload(failedId);
            startStagingUpload([newFile]);
        },
        [removeFailedUpload, startStagingUpload]
    );

    const retryAllFailedUploads = useCallback(() => {
        const retryableStaging = failedUploadsRef.current.filter(
            (f) => f.canRetry && f.kind === 'staging' && f.file
        );
        const retryablePublishing = failedUploadsRef.current.filter(
            (f) => f.canRetry && f.kind === 'publishing' && f.itemId
        );

        if (retryableStaging.length === 0 && retryablePublishing.length === 0) {
            toast.info('No retryable failed files remain.');
            return;
        }

        const retryIds = new Set([
            ...retryableStaging.map((f) => f.id),
            ...retryablePublishing.map((f) => f.id),
        ]);

        setFailedUploads((prev) => {
            prev.forEach((f) => {
                if (retryIds.has(f.id) && f.previewUrl) {
                    revokePreviewUrl(f.previewUrl);
                }
            });
            return prev.filter((f) => !retryIds.has(f.id));
        });

        if (retryableStaging.length > 0) {
            startStagingUpload(
                retryableStaging.map((f) => f.file),
                retryableStaging.map((f) => f.attempts)
            );
        } else if (retryablePublishing.length > 0) {
            startPublishingBatch(
                retryablePublishing.map((f) => ({
                    id: f.itemId,
                    name: f.name,
                    preview: f.previewUrl,
                    attempts: f.attempts,
                }))
            );
        }
    }, [startPublishingBatch, startStagingUpload]);

    const dismissJob = useCallback(() => {
        if (processingRef.current) return;
        setJob(INITIAL_JOB);
        setIsMinimized(false);
    }, []);

    return (
        <UploadManagerContext.Provider
            value={{
                job,
                isMinimized,
                setIsMinimized,
                failedUploads,
                uploadLimits,
                setUploadLimits,
                startStagingUpload,
                startPublishingBatch,
                retryFailedUpload,
                replaceFailedUpload,
                retryAllFailedUploads,
                removeFailedUpload,
                clearFailedUploads,
                dismissJob,
                subscribe,
            }}
        >
            {children}
        </UploadManagerContext.Provider>
    );
}

export function useUploadManager() {
    const ctx = useContext(UploadManagerContext);
    if (!ctx) {
        throw new Error('useUploadManager must be used within UploadManagerProvider');
    }
    return ctx;
}

export function FloatingUploadTracker() {
    const { job, isMinimized, setIsMinimized, dismissJob } = useUploadManager();

    if (!job.active) return null;

    const percent = job.total > 0 ? Math.min(100, Math.round((job.completed / job.total) * 100)) : 0;
    const isRunning = job.status === 'running';
    const hasErrors = job.failed > 0;

    // Circular progress ring math (r = 25 -> circumference = ~157.08)
    const radius = 25;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (percent / 100) * circumference;

    const ringColor = isRunning
        ? '#3b82f6'
        : hasErrors
        ? '#f59e0b'
        : '#10b981';

    const titleText = isRunning
        ? job.currentFileName || (job.mode === 'staging' ? 'Uploading...' : 'Publishing...')
        : job.mode === 'staging'
        ? 'Upload complete'
        : 'Publishing complete';

    const countSummary = isRunning
        ? `${job.completed} / ${job.total} ${job.mode === 'staging' ? 'uploading' : 'publishing'}${
              job.failed > 0 ? ` · ${job.failed} failed` : ''
          }`
        : `${job.succeeded} uploaded${job.failed > 0 ? ` · ${job.failed} failed` : ''}`;

    return (
        <div
            className="fixed bottom-5 right-5 z-[60] select-none"
            style={{
                width: isMinimized ? '64px' : 'min(344px, calc(100vw - 24px))',
                height: isMinimized ? '64px' : '88px',
                borderRadius: isMinimized ? '9999px' : '16px',
                transformOrigin: 'bottom right',
                transition:
                    'width 340ms cubic-bezier(0.22, 1, 0.36, 1), height 340ms cubic-bezier(0.22, 1, 0.36, 1), border-radius 340ms cubic-bezier(0.22, 1, 0.36, 1), box-shadow 300ms ease',
            }}
        >
            <div
                className={`relative w-full h-full overflow-hidden border backdrop-blur-xl shadow-2xl ${
                    isMinimized
                        ? 'rounded-full bg-slate-900/95 border-white/15 shadow-blue-500/20 hover:scale-105 active:scale-95 cursor-pointer'
                        : 'rounded-2xl bg-card-bg/95 border-card-border shadow-black/45'
                }`}
                style={{
                    transition:
                        'transform 200ms ease, border-radius 340ms cubic-bezier(0.22, 1, 0.36, 1), background-color 250ms ease',
                }}
                onClick={isMinimized ? () => setIsMinimized(false) : undefined}
                title={isMinimized ? `Click to expand (${percent}% · ${job.completed}/${job.total})` : undefined}
                role={isMinimized ? 'button' : undefined}
                aria-label={isMinimized ? `Expand upload progress (${percent}%)` : undefined}
            >
                {/* Minimized Circular Progress Ring */}
                <div
                    className={`absolute inset-0 flex items-center justify-center transition-all duration-300 ${
                        isMinimized
                            ? 'opacity-100 scale-100 delay-75'
                            : 'opacity-0 scale-50 pointer-events-none'
                    }`}
                >
                    <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
                        <circle
                            cx="32"
                            cy="32"
                            r={radius}
                            fill="none"
                            stroke="rgba(148, 163, 184, 0.22)"
                            strokeWidth="4.5"
                        />
                        <circle
                            cx="32"
                            cy="32"
                            r={radius}
                            fill="none"
                            stroke={ringColor}
                            strokeWidth="4.5"
                            strokeLinecap="round"
                            strokeDasharray={circumference}
                            strokeDashoffset={strokeDashoffset}
                            style={{
                                transition: 'stroke-dashoffset 280ms ease-out, stroke 250ms ease',
                            }}
                        />
                    </svg>
                    <span className="absolute text-xs font-extrabold text-white tabular-nums">
                        {percent}%
                    </span>
                </div>

                {/* Compact Rectangular Popup View */}
                <div
                    className={`w-full h-full px-3 py-2.5 flex items-center gap-3 transition-all duration-300 ${
                        isMinimized
                            ? 'opacity-0 scale-90 pointer-events-none'
                            : 'opacity-100 scale-100 delay-75'
                    }`}
                >
                    {/* Small Image Thumbnail */}
                    <div className="relative w-14 h-14 rounded-xl bg-background/80 border border-card-border flex items-center justify-center overflow-hidden flex-shrink-0">
                        {job.currentPreview ? (
                            <img
                                src={job.currentPreview}
                                alt={job.currentFileName || 'Uploading preview'}
                                className="w-full h-full object-contain p-1"
                            />
                        ) : (
                            <ImageIcon className="w-6 h-6 text-foreground/35" />
                        )}
                        <div className="absolute bottom-0.5 right-0.5 rounded-full bg-background/90 p-0.5 border border-card-border">
                            {isRunning ? (
                                <Loader2 className="w-3 h-3 text-primary-glow animate-spin" />
                            ) : hasErrors ? (
                                <AlertTriangle className="w-3 h-3 text-amber-400" />
                            ) : (
                                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                            )}
                        </div>
                    </div>

                    {/* Right Column: Name + Progress Bar + Counts */}
                    <div className="flex-1 min-w-0 h-14 flex flex-col justify-between">
                        <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-bold text-foreground truncate">
                                {titleText}
                            </span>

                            <div className="flex items-center gap-0.5 flex-shrink-0">
                                <button
                                    type="button"
                                    onClick={() => setIsMinimized(true)}
                                    className="p-1 rounded-md text-foreground/60 hover:text-foreground hover:bg-foreground/10 cursor-pointer transition-colors"
                                    title="Minimize"
                                >
                                    <Minimize2 className="w-3.5 h-3.5" />
                                </button>
                                {!isRunning && (
                                    <button
                                        type="button"
                                        onClick={dismissJob}
                                        className="p-1 rounded-md text-foreground/60 hover:text-foreground hover:bg-foreground/10 cursor-pointer transition-colors"
                                        title="Close"
                                    >
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="w-full h-2 bg-background border border-card-border rounded-full overflow-hidden">
                            <div
                                className={`h-full rounded-full transition-all duration-300 ease-out ${
                                    isRunning
                                        ? 'bg-gradient-to-r from-blue-600 via-primary-glow to-purple-500'
                                        : hasErrors
                                        ? 'bg-amber-500'
                                        : 'bg-emerald-500'
                                }`}
                                style={{ width: `${percent}%` }}
                            />
                        </div>

                        <div className="flex items-center justify-between gap-2 text-[11px] text-foreground/65 tabular-nums">
                            <span className="truncate">{countSummary}</span>
                            <span className="font-mono font-bold text-primary-glow flex-shrink-0">
                                {percent}%
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
