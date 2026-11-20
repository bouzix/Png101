import { useState, useEffect, useRef } from 'react';
import { Head, usePage } from '@inertiajs/react';
import AdminLayout from '@/Layouts/AdminLayout';
import DropZone from '@/components/admin/DropZone';
import AssetCard from '@/components/admin/AssetCard';
import { useBulkEdit } from '@/components/admin/BulkEditSidebar';
import ConfirmDialog from '@/components/admin/ConfirmDialog';
import { toast } from 'sonner';
import {
    CheckSquare,
    Square,
    Trash2,
    Loader2,
    CheckCircle2,
    Copy,
    X,
    Sparkles,
    AlertTriangle,
    RotateCcw,
    Upload,
    Pencil,
    Image as ImageIcon,
} from 'lucide-react';
import { useUploadManager } from '@/components/admin/UploadManager';

const CATEGORY_BADGE = {
    format: 'Wrong Format',
    size: 'Too Large',
    corrupt: 'Corrupted PNG',
    transient: 'Temp Error',
    network: 'Network',
    auth: 'Auth',
    server: 'Server Error',
};

export default function Dashboard() {
    const pageProps = usePage().props;
    const [stagedFiles, setStagedFiles] = useState([]);
    const [targetKeyword, setTargetKeyword] = useState(() => {
        if (typeof window !== 'undefined') {
            return new URLSearchParams(window.location.search).get('keyword') || '';
        }
        return '';
    });
    const [deleting, setDeleting] = useState(false);
    const [failedFilter, setFailedFilter] = useState('all');
    const [isBarSticky, setIsBarSticky] = useState(false);
    const stickyBarRef = useRef(null);
    const replaceInputRef = useRef(null);
    const replacingFailedIdRef = useRef(null);
    const lastSelectedIdRef = useRef(null);
    const lastSelectedActionRef = useRef(null);

    useEffect(() => {
        const barEl = stickyBarRef.current;
        if (!barEl) {
            setIsBarSticky(false);
            return;
        }
        const scrollRoot = barEl.closest('main') || window;
        const checkSticky = () => {
            if (!stickyBarRef.current || !stickyBarRef.current.parentElement) return;
            const barRect = stickyBarRef.current.getBoundingClientRect();
            const parentRect = stickyBarRef.current.parentElement.getBoundingClientRect();
            setIsBarSticky(barRect.top - parentRect.top > 1);
        };
        checkSticky();
        scrollRoot.addEventListener('scroll', checkSticky, { passive: true });
        window.addEventListener('scroll', checkSticky, { passive: true });
        window.addEventListener('resize', checkSticky, { passive: true });
        return () => {
            scrollRoot.removeEventListener('scroll', checkSticky);
            window.removeEventListener('scroll', checkSticky);
            window.removeEventListener('resize', checkSticky);
        };
    }, [stagedFiles.length > 0]);

    const {
        job: progress,
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
        requestStopUpload,
        subscribe,
    } = useUploadManager();

    useEffect(() => {
        if (pageProps?.uploadLimits) {
            setUploadLimits(pageProps.uploadLimits);
        }
    }, [pageProps?.uploadLimits, setUploadLimits]);

    const uploading = progress.status === 'running' && progress.mode === 'publishing';

    const {
        isOpen: isBulkEditOpen,
        isMinimized: isBulkEditMinimized,
        formsData: bulkEditItems,
        openBulkEdit,
        removeBulkEditItems,
        startDraggingItems,
        endDraggingItems,
        subscribe: subscribeBulkEdit,
    } = useBulkEdit();

    const bulkEditIdSet = new Set((bulkEditItems || []).map((item) => item.id));

    const [confirmDialog, setConfirmDialog] = useState({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => {},
    });

    useEffect(() => {
        fetch('/api/images?status=draft')
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) {
                    const drafts = data.map(img => ({
                        id: img.id,
                        file: null,
                        preview: img.path,
                        name: img.name,
                        tags: img.tags || [],
                        altText: img.altText || '',
                        description: img.description || '',
                        categoryIds: img.categories?.map(c => c.categoryId) || [],
                        hasMetadata: !!(img.name && img.tags && img.tags.length > 0),
                        isSelected: false,
                        luminance: img.luminance || null,
                        contrastBgDark: img.contrastBgDark || null,
                        contrastBgLight: img.contrastBgLight || null,
                    }));
                    setStagedFiles(drafts);
                }
            });

        const unsubUpload = subscribe({
            onStaged: (newFile) => {
                setStagedFiles((prev) =>
                    prev.some((f) => f.id === newFile.id) ? prev : [newFile, ...prev]
                );
            },
            onPublished: (publishedId) => {
                setStagedFiles((prev) => prev.filter((f) => f.id !== publishedId));
                removeBulkEditItems([publishedId]);
            },
        });

        const unsubBulkEdit = subscribeBulkEdit((updates) => {
            const updateMap = new Map(updates.map((u) => [u.id, u]));
            setStagedFiles((prev) =>
                prev.map((f) => {
                    const update = updateMap.get(f.id);
                    if (update) {
                        return {
                            ...f,
                            ...update,
                            hasMetadata: !!(update.name && update.tags && update.tags.length > 0),
                        };
                    }
                    return f;
                })
            );
        });

        return () => {
            unsubUpload();
            unsubBulkEdit();
        };
    }, [subscribe, subscribeBulkEdit, removeBulkEditItems]);

    const handleFilesDropped = (files) => {
        if (files.length === 0) return;
        startStagingUpload(files);
    };

    const toBulkItemPayload = (f) => ({
        ...f,
        path: f.preview,
        filename: f.name,
        luminance: f.luminance,
        contrastBgDark: f.contrastBgDark,
        contrastBgLight: f.contrastBgLight,
    });

    const handleEdit = (id) => {
        const file = stagedFiles.find((f) => f.id === id);
        if (!file) return;
        if (!file.isSelected) {
            lastSelectedIdRef.current = file.id;
            lastSelectedActionRef.current = 'select';
            setStagedFiles((prev) =>
                prev.map((f) => (f.id === file.id ? { ...f, isSelected: true } : f))
            );
        }
        openBulkEdit([toBulkItemPayload(file)]);
    };

    const handleBulkEdit = () => {
        const selected = stagedFiles.filter((f) => f.isSelected);
        if (selected.length === 0) return;
        openBulkEdit(selected.map(toBulkItemPayload));
    };

    const handleCardDragStart = (e, file) => {
        if (!file.isSelected) {
            lastSelectedIdRef.current = file.id;
            lastSelectedActionRef.current = 'select';
            setStagedFiles((prev) =>
                prev.map((f) => (f.id === file.id ? { ...f, isSelected: true } : f))
            );
        }
        const selected = stagedFiles.filter((f) => f.isSelected);
        const itemsToDrag =
            selected.length > 0
                ? selected.some((s) => s.id === file.id)
                    ? selected
                    : [...selected, file]
                : [file];
        const payload = itemsToDrag.map(toBulkItemPayload);
        startDraggingItems(payload, e);
        if (e.dataTransfer) {
            e.dataTransfer.effectAllowed = 'copy';
            try {
                e.dataTransfer.setData('application/x-png101-bulk-items', JSON.stringify(payload));
            } catch {
                // Ignore dataTransfer quota limits
            }
        }
    };

    const handleToggleSelect = (id, event) => {
        const isShift = Boolean(event?.shiftKey || event?.nativeEvent?.shiftKey);

        setStagedFiles((prev) => {
            const targetIdx = prev.findIndex((f) => f.id === id);
            if (targetIdx === -1) return prev;

            if (isShift && lastSelectedIdRef.current !== null) {
                const startIdx = prev.findIndex((f) => f.id === lastSelectedIdRef.current);
                if (startIdx !== -1) {
                    const [from, to] = startIdx < targetIdx ? [startIdx, targetIdx] : [targetIdx, startIdx];
                    const rangeSlice = prev.slice(from, to + 1);
                    const allRangeSelected = rangeSlice.every((f) => f.isSelected);
                    const shouldSelect =
                        lastSelectedActionRef.current === 'unselect'
                            ? false
                            : allRangeSelected
                            ? false
                            : true;

                    const rangeIds = new Set(rangeSlice.map((f) => f.id));
                    lastSelectedIdRef.current = id;
                    lastSelectedActionRef.current = shouldSelect ? 'select' : 'unselect';

                    return prev.map((f) =>
                        rangeIds.has(f.id) ? { ...f, isSelected: shouldSelect } : f
                    );
                }
            }

            const nextSelected = !prev[targetIdx].isSelected;
            lastSelectedIdRef.current = id;
            lastSelectedActionRef.current = nextSelected ? 'select' : 'unselect';

            return prev.map((f) => (f.id === id ? { ...f, isSelected: nextSelected } : f));
        });
    };

    const allSelected = stagedFiles.length > 0 && stagedFiles.every(f => f.isSelected);

    const handleToggleSelectAll = () => {
        const nextState = !allSelected;
        lastSelectedActionRef.current = nextState ? 'select' : 'unselect';
        setStagedFiles(prev => prev.map(f => ({ ...f, isSelected: nextState })));
    };

    const handleDeleteSelected = () => {
        const selected = stagedFiles.filter(f => f.isSelected);
        if (selected.length === 0) return;

        setConfirmDialog({
            isOpen: true,
            title: 'Delete Selected Draft Images',
            message: `Are you sure you want to permanently delete ${selected.length} selected ${selected.length === 1 ? 'image' : 'images'}? This action cannot be undone.`,
            onConfirm: async () => {
                setDeleting(true);
                const idsToDelete = selected.map(f => f.id);
                try {
                    const res = await fetch('/api/images/delete', {
                        method: 'DELETE',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ ids: idsToDelete }),
                    });

                    if (res.ok) {
                        setStagedFiles(prev => prev.filter(f => !idsToDelete.includes(f.id)));
                        removeBulkEditItems(idsToDelete);
                        toast.success(
                            `Deleted ${idsToDelete.length} ${idsToDelete.length === 1 ? 'image' : 'images'} successfully`
                        );
                    } else {
                        toast.error('Failed to delete selected images');
                    }
                } catch (error) {
                    console.error('Delete failed:', error);
                    toast.error('An error occurred while deleting images');
                } finally {
                    setDeleting(false);
                }
            },
        });
    };

    const handleUploadSelected = () => {
        const selectedReady = stagedFiles.filter(f => f.isSelected && f.hasMetadata);
        if (selectedReady.length === 0) return;
        startPublishingBatch(selectedReady);
    };

    const triggerReplaceFailed = (failedId) => {
        replacingFailedIdRef.current = failedId;
        if (replaceInputRef.current) {
            replaceInputRef.current.value = '';
            replaceInputRef.current.click();
        }
    };

    const handleReplaceFileSelected = (e) => {
        const file = e.target.files?.[0];
        const targetId = replacingFailedIdRef.current;
        replacingFailedIdRef.current = null;
        e.target.value = '';
        if (file && targetId) {
            replaceFailedUpload(targetId, file);
        }
    };

    const selectedFiles = stagedFiles.filter(f => f.isSelected);
    const readyToUploadCount = stagedFiles.filter(f => f.isSelected && f.hasMetadata).length;
    const progressPercent = progress.total > 0 ? Math.round((progress.completed / progress.total) * 100) : 0;

    const retryableFailedCount = failedUploads.filter((f) => f.canRetry).length;
    const fixRequiredFailedCount = failedUploads.length - retryableFailedCount;
    const activeFailedFilter =
        (failedFilter === 'retryable' && retryableFailedCount === 0) ||
        (failedFilter === 'fix_required' && fixRequiredFailedCount === 0)
            ? 'all'
            : failedFilter;
    const filteredFailedUploads =
        activeFailedFilter === 'retryable'
            ? failedUploads.filter((f) => f.canRetry)
            : activeFailedFilter === 'fix_required'
            ? failedUploads.filter((f) => !f.canRetry)
            : failedUploads;

    return (
        <AdminLayout>
            <Head title="Upload Image - Admin" />
            <div className="w-full pb-24">
                <div className="mb-5 sm:mb-6">
                    <h1 className="text-xl sm:text-2xl xl:text-3xl font-bold text-foreground flex items-center gap-2.5 sm:gap-3">
                        <Upload className="w-6 h-6 sm:w-7 sm:h-7 text-primary-glow shrink-0" />
                        <span>Upload Image</span>
                    </h1>
                    <p className="hidden xl:block text-sm text-foreground/60 mt-1">
                        Drop transparent PNG files to stage, edit metadata with AI, and publish to your catalog.
                    </p>
                </div>

                {targetKeyword && (
                    <div className="mb-6 bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <Sparkles className="w-5 h-5 text-amber-400 flex-shrink-0" />
                            <div>
                                <div className="text-xs font-bold uppercase tracking-wider text-amber-400">
                                    Filling Search Demand Gap
                                </div>
                                <p className="text-sm text-foreground">
                                    Target keyword from Dashboard: <span className="font-bold text-amber-300">"{targetKeyword}"</span>
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => {
                                    navigator.clipboard.writeText(targetKeyword);
                                    toast.success(`Copied "${targetKeyword}"`);
                                }}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-xs font-bold text-amber-300 cursor-pointer"
                            >
                                <Copy className="w-3.5 h-3.5" />
                                Copy Keyword
                            </button>
                            <button
                                type="button"
                                onClick={() => setTargetKeyword('')}
                                className="p-1.5 rounded-lg text-foreground/50 hover:text-foreground cursor-pointer"
                                title="Dismiss"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}

                <div className="mb-8">
                    <DropZone onFilesDropped={handleFilesDropped} />
                </div>

                {progress.active && (
                    <div className="mb-8 bg-card-bg border border-card-border rounded-xl p-5 shadow-xl animate-in fade-in duration-200">
                        <div className="flex items-center justify-between gap-4 mb-3">
                            <div className="flex items-center gap-3 min-w-0">
                                {progress.completed < progress.total ? (
                                    <div className="p-2 rounded-lg bg-primary-glow/10 text-primary-glow border border-primary-glow/20 flex-shrink-0">
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    </div>
                                ) : (
                                    <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex-shrink-0">
                                        <CheckCircle2 className="w-5 h-5" />
                                    </div>
                                )}
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-sm font-bold text-foreground">
                                            {progress.completed < progress.total
                                                ? progress.mode === 'staging'
                                                    ? 'Uploading Files...'
                                                    : 'Publishing Images...'
                                                : progress.mode === 'staging'
                                                ? 'Batch Upload Complete!'
                                                : 'Publishing Complete!'}
                                        </h3>
                                        <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-primary-glow/10 text-primary-glow border border-primary-glow/20">
                                            {progressPercent}%
                                        </span>
                                    </div>
                                    <p className="text-xs text-foreground/60 truncate mt-0.5">
                                        {progress.completed < progress.total
                                            ? `Processing: ${progress.currentFileName}`
                                            : `${progress.succeeded} succeeded${progress.failed > 0 ? `, ${progress.failed} failed` : ''}`}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 flex-shrink-0">
                                <div className="text-right">
                                    <span className="text-sm font-bold text-foreground">
                                        {progress.completed} / {progress.total}
                                    </span>
                                    <p className="text-xs text-foreground/50">files</p>
                                </div>
                                {progress.completed < progress.total && (
                                    <button
                                        type="button"
                                        onClick={requestStopUpload}
                                        title="Stop upload"
                                        aria-label="Stop upload"
                                        className="p-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/25 text-rose-500 cursor-pointer transition-colors"
                                    >
                                        <Square className="w-4 h-4 fill-current" />
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="w-full h-3 bg-background border border-card-border rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-blue-600 to-primary-glow transition-all duration-300 ease-out rounded-full"
                                style={{ width: `${progressPercent}%` }}
                            />
                        </div>
                    </div>
                )}

                {failedUploads.length > 0 && (
                    <div className="mb-8 bg-rose-500/5 border border-rose-500/25 rounded-2xl p-5 space-y-4">
                        <input
                            ref={replaceInputRef}
                            type="file"
                            accept=".png,image/png"
                            onChange={handleReplaceFileSelected}
                            className="hidden"
                        />

                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-xl bg-rose-500/15 text-rose-400 border border-rose-500/25">
                                    <AlertTriangle className="w-5 h-5" />
                                </div>
                                <div>
                                    <div className="flex flex-wrap items-center gap-2">
                                        <h3 className="text-sm font-bold text-foreground">
                                            Failed Uploads ({failedUploads.length})
                                        </h3>
                                        {uploadLimits?.effectiveMaxLabel && (
                                            <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-background/80 border border-card-border text-foreground/60">
                                                Max size: {uploadLimits.effectiveMaxLabel}
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs text-foreground/60">
                                        Hover over any faded image to see why it failed, then retry or replace the file.
                                    </p>
                                </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                                {retryableFailedCount > 0 && fixRequiredFailedCount > 0 && (
                                    <div className="inline-flex items-center p-0.5 rounded-xl bg-background border border-card-border text-xs">
                                        <button
                                            type="button"
                                            onClick={() => setFailedFilter('all')}
                                            className={`px-2.5 py-1.5 rounded-lg font-semibold cursor-pointer transition-colors ${
                                                activeFailedFilter === 'all'
                                                    ? 'bg-card-bg text-foreground shadow-sm'
                                                    : 'text-foreground/60 hover:text-foreground'
                                            }`}
                                        >
                                            All ({failedUploads.length})
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setFailedFilter('retryable')}
                                            className={`px-2.5 py-1.5 rounded-lg font-semibold cursor-pointer transition-colors ${
                                                activeFailedFilter === 'retryable'
                                                    ? 'bg-primary-glow/15 text-primary-glow'
                                                    : 'text-foreground/60 hover:text-foreground'
                                            }`}
                                        >
                                            Retryable ({retryableFailedCount})
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setFailedFilter('fix_required')}
                                            className={`px-2.5 py-1.5 rounded-lg font-semibold cursor-pointer transition-colors ${
                                                activeFailedFilter === 'fix_required'
                                                    ? 'bg-amber-500/15 text-amber-300'
                                                    : 'text-foreground/60 hover:text-foreground'
                                            }`}
                                        >
                                            Needs Replace ({fixRequiredFailedCount})
                                        </button>
                                    </div>
                                )}

                                {retryableFailedCount > 0 && (
                                    <button
                                        type="button"
                                        onClick={retryAllFailedUploads}
                                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary-glow/15 hover:bg-primary-glow/25 border border-primary-glow/30 text-xs font-bold text-primary-glow cursor-pointer transition-all"
                                    >
                                        <RotateCcw className="w-3.5 h-3.5" />
                                        Retry All
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={clearFailedUploads}
                                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-background hover:bg-white/5 border border-card-border text-xs font-semibold text-foreground/70 hover:text-foreground cursor-pointer transition-all"
                                >
                                    <X className="w-3.5 h-3.5" />
                                    Clear All
                                </button>
                            </div>
                        </div>

                        <div
                            className={`grid transition-all duration-300 ${
                                isBulkEditOpen && !isBulkEditMinimized
                                    ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3.5'
                                    : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8 gap-4'
                            }`}
                        >
                            {filteredFailedUploads.map((item) => {
                                const sizeKb = item.size > 0 ? `${Math.max(1, Math.round(item.size / 1024))} KB` : '';
                                const badgeText = CATEGORY_BADGE[item.failureCategory] || 'Failed';
                                return (
                                    <div
                                        key={item.id}
                                        title={item.reason}
                                        className="group relative rounded-xl border border-rose-500/30 bg-card-bg/80 overflow-hidden aspect-square flex flex-col justify-between transition-all hover:border-rose-400/60 shadow-md"
                                    >
                                        {/* Faded Image Preview */}
                                        <div className="relative flex-1 flex items-center justify-center p-3 overflow-hidden">
                                            {item.previewUrl ? (
                                                <img
                                                    src={item.previewUrl}
                                                    alt={item.name}
                                                    className="max-h-full max-w-full object-contain opacity-45 grayscale-[40%] group-hover:opacity-25 group-hover:scale-95 transition-all duration-200"
                                                />
                                            ) : (
                                                <ImageIcon className="w-10 h-10 text-rose-400/40 group-hover:opacity-25 transition-opacity" />
                                            )}

                                            {/* Top Status Badge */}
                                            <div className="absolute top-2 left-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500/20 border border-rose-500/35 text-[10px] font-bold text-rose-300">
                                                <AlertTriangle className="w-3 h-3" />
                                                {badgeText}
                                            </div>

                                            {/* Top-right Quick Dismiss */}
                                            <button
                                                type="button"
                                                onClick={() => removeFailedUpload(item.id)}
                                                className="absolute top-2 right-2 p-1 rounded-full bg-black/50 text-white/70 hover:text-white hover:bg-black/80 cursor-pointer z-20 transition-colors"
                                                title="Remove from failed list"
                                            >
                                                <X className="w-3 h-3" />
                                            </button>

                                            {/* Hover Error Reason & Actions Overlay */}
                                            <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm p-3 flex flex-col justify-between opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
                                                <div className="pt-4 space-y-1 overflow-y-auto">
                                                    <div className="text-[10px] font-bold uppercase tracking-wider text-rose-400">
                                                        Failure Reason
                                                    </div>
                                                    <p className="text-[11px] text-slate-200 leading-snug break-words">
                                                        {item.reason}
                                                    </p>
                                                    <div className="text-[10px] text-slate-400 pt-0.5">
                                                        {sizeKb ? `Size: ${sizeKb} · ` : ''}Attempts: {item.attempts}
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-1.5">
                                                    {item.canRetry ? (
                                                        <>
                                                            <button
                                                                type="button"
                                                                onClick={() => retryFailedUpload(item.id)}
                                                                className="flex-1 inline-flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg bg-primary-glow hover:bg-primary-glow/90 text-white text-[11px] font-bold cursor-pointer transition-colors"
                                                            >
                                                                <RotateCcw className="w-3 h-3" />
                                                                Retry
                                                            </button>
                                                            {item.kind === 'staging' && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => triggerReplaceFailed(item.id)}
                                                                    className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-200 cursor-pointer transition-colors"
                                                                    title="Replace with another PNG"
                                                                >
                                                                    <Upload className="w-3.5 h-3.5" />
                                                                </button>
                                                            )}
                                                        </>
                                                    ) : (
                                                        <button
                                                            type="button"
                                                            onClick={() => triggerReplaceFailed(item.id)}
                                                            className="w-full inline-flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-[11px] font-bold cursor-pointer transition-colors"
                                                        >
                                                            <Upload className="w-3 h-3" />
                                                            Replace File
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Bottom Filename Footer */}
                                        <div className="px-2.5 py-2 border-t border-card-border/70 bg-background/60 flex items-center justify-between gap-1.5">
                                            <span className="text-[11px] font-medium text-foreground/75 truncate">
                                                {item.name}
                                            </span>
                                            {item.canRetry ? (
                                                <button
                                                    type="button"
                                                    onClick={() => retryFailedUpload(item.id)}
                                                    className="p-1 rounded-md text-primary-glow hover:bg-primary-glow/15 cursor-pointer flex-shrink-0"
                                                    title="Retry upload"
                                                >
                                                    <RotateCcw className="w-3 h-3" />
                                                </button>
                                            ) : (
                                                <button
                                                    type="button"
                                                    onClick={() => triggerReplaceFailed(item.id)}
                                                    className="p-1 rounded-md text-amber-400 hover:bg-amber-500/15 cursor-pointer flex-shrink-0"
                                                    title="Replace invalid file"
                                                >
                                                    <Upload className="w-3 h-3" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Floating Circular Icon-Only Action Buttons when Bulk Edit Sidebar is Open */}
                {isBulkEditOpen && !isBulkEditMinimized && stagedFiles.length > 0 && (
                    <div className="fixed top-4 right-[516px] z-[52] flex items-center gap-2.5 bg-card-bg/95 backdrop-blur-xl border border-card-border rounded-full px-3 py-2 shadow-2xl animate-in fade-in slide-in-from-right-4 duration-250">
                        <span className="text-xs font-semibold text-foreground/75 px-2 whitespace-nowrap hidden sm:inline">
                            <strong className="text-foreground">{selectedFiles.length}</strong>/{stagedFiles.length} selected
                            <span className="mx-1.5 text-foreground/30">&bull;</span>
                            <strong className="text-emerald-400">{readyToUploadCount}</strong> ready
                        </span>

                        {/* Circular Edit / Add to Bulk Edit Button */}
                        <button
                            type="button"
                            onClick={
                                selectedFiles.length === 1
                                    ? () => handleEdit(selectedFiles[0].id)
                                    : handleBulkEdit
                            }
                            disabled={selectedFiles.length === 0}
                            title={
                                selectedFiles.length > 0
                                    ? `Edit / Add ${selectedFiles.length} selected item(s) to Bulk Editor`
                                    : 'Select items to add to Bulk Editor'
                            }
                            aria-label="Edit selected items"
                            className="relative w-10 h-10 rounded-full flex items-center justify-center bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/30 transition-all hover:scale-105 active:scale-95 disabled:opacity-35 disabled:cursor-not-allowed disabled:hover:scale-100 cursor-pointer"
                        >
                            <Pencil className="w-4 h-4" />
                            {selectedFiles.length > 0 && (
                                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-white text-blue-600 text-[10px] font-extrabold flex items-center justify-center shadow">
                                    {selectedFiles.length}
                                </span>
                            )}
                        </button>

                        {/* Circular Delete Selected Button */}
                        <button
                            type="button"
                            onClick={handleDeleteSelected}
                            disabled={selectedFiles.length === 0 || deleting || uploading}
                            title={
                                selectedFiles.length > 0
                                    ? `Delete ${selectedFiles.length} selected item(s)`
                                    : 'Select items to delete'
                            }
                            aria-label="Delete selected items"
                            className="relative w-10 h-10 rounded-full flex items-center justify-center bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/30 transition-all hover:scale-105 active:scale-95 disabled:opacity-35 disabled:cursor-not-allowed disabled:hover:scale-100 cursor-pointer"
                        >
                            {deleting ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Trash2 className="w-4 h-4" />
                            )}
                            {selectedFiles.length > 0 && (
                                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-white text-rose-600 text-[10px] font-extrabold flex items-center justify-center shadow">
                                    {selectedFiles.length}
                                </span>
                            )}
                        </button>

                        {/* Circular Upload Selected Button */}
                        <button
                            type="button"
                            onClick={handleUploadSelected}
                            disabled={readyToUploadCount === 0 || uploading}
                            title={
                                readyToUploadCount > 0
                                    ? `Upload ${readyToUploadCount} ready item(s)`
                                    : 'Select items with metadata ready to upload'
                            }
                            aria-label="Upload selected ready items"
                            className="relative w-10 h-10 rounded-full flex items-center justify-center bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/30 transition-all hover:scale-105 active:scale-95 disabled:opacity-35 disabled:cursor-not-allowed disabled:hover:scale-100 cursor-pointer"
                        >
                            {uploading ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Upload className="w-4 h-4" />
                            )}
                            {readyToUploadCount > 0 && (
                                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-white text-emerald-600 text-[10px] font-extrabold flex items-center justify-center shadow">
                                    {readyToUploadCount}
                                </span>
                            )}
                        </button>
                    </div>
                )}

                {stagedFiles.length > 0 && (
                    <div className="space-y-4">
                        <div
                            ref={stickyBarRef}
                            className={`sticky top-4 z-30 flex flex-wrap items-center justify-between gap-3 bg-card-bg/95 backdrop-blur-md border border-card-border rounded-xl px-3.5 py-2.5 transition-shadow duration-200 ${
                                isBarSticky ? 'shadow-xl shadow-black/25' : 'shadow-none'
                            }`}
                        >
                            <div className="flex flex-wrap items-center gap-2">
                                <div className="flex items-center gap-1 p-1 bg-card-header-bg border border-card-border rounded-xl">
                                    <button
                                        type="button"
                                        onClick={handleToggleSelectAll}
                                        title={allSelected ? 'Deselect All' : `Select All (${stagedFiles.length})`}
                                        aria-label={allSelected ? 'Deselect All' : `Select All (${stagedFiles.length})`}
                                        className="w-7 h-7 inline-flex items-center justify-center rounded-lg bg-card-bg hover:text-primary-glow text-foreground shadow-sm transition-all cursor-pointer shrink-0"
                                    >
                                        {allSelected ? (
                                            <CheckSquare className="w-3.5 h-3.5 text-primary-glow" />
                                        ) : (
                                            <Square className="w-3.5 h-3.5 text-foreground/60" />
                                        )}
                                    </button>

                                    <div className="h-7 px-2.5 rounded-lg bg-card-bg text-xs font-bold text-foreground/70 shadow-sm inline-flex items-center gap-1.5">
                                        <span>
                                            <strong className="text-foreground">{selectedFiles.length}</strong> of{' '}
                                            <strong className="text-foreground">{stagedFiles.length}</strong> selected
                                        </span>
                                        <span className="text-foreground/30">&bull;</span>
                                        <span>
                                            <strong className="text-primary-glow">{readyToUploadCount}</strong>/{stagedFiles.length} ready to upload
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {selectedFiles.length > 0 && (!isBulkEditOpen || isBulkEditMinimized) && (
                                <div className="flex items-center gap-1 p-1 bg-card-header-bg border border-card-border rounded-xl animate-in fade-in duration-200">
                                    <button
                                        type="button"
                                        onClick={handleDeleteSelected}
                                        disabled={deleting || uploading}
                                        title={deleting ? 'Deleting...' : `Delete (${selectedFiles.length})`}
                                        aria-label={`Delete ${selectedFiles.length} selected`}
                                        className="w-7 h-7 inline-flex items-center justify-center rounded-lg bg-card-bg hover:bg-red-500/20 text-red-400 shadow-sm transition-colors disabled:opacity-50 cursor-pointer"
                                    >
                                        {deleting ? (
                                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        ) : (
                                            <Trash2 className="w-3.5 h-3.5" />
                                        )}
                                    </button>

                                    <button
                                        type="button"
                                        onClick={selectedFiles.length === 1 ? () => handleEdit(selectedFiles[0].id) : handleBulkEdit}
                                        title={`Edit (${selectedFiles.length})`}
                                        aria-label={`Edit ${selectedFiles.length} selected`}
                                        className="w-7 h-7 inline-flex items-center justify-center rounded-lg bg-card-bg hover:bg-blue-500/20 text-primary-glow shadow-sm transition-colors cursor-pointer"
                                    >
                                        <Pencil className="w-3.5 h-3.5" />
                                    </button>

                                    <button
                                        type="button"
                                        onClick={handleUploadSelected}
                                        disabled={readyToUploadCount === 0 || uploading}
                                        title={
                                            uploading
                                                ? 'Publishing...'
                                                : readyToUploadCount > 0
                                                ? `Upload Selected (${readyToUploadCount} ready)`
                                                : 'Add metadata before uploading'
                                        }
                                        aria-label="Upload selected"
                                        className="w-7 h-7 inline-flex items-center justify-center rounded-lg bg-primary-glow hover:bg-primary-glow/90 disabled:bg-card-bg disabled:text-foreground/30 text-white shadow-sm transition-colors cursor-pointer"
                                    >
                                        {uploading ? (
                                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        ) : (
                                            <Upload className="w-3.5 h-3.5" />
                                        )}
                                    </button>
                                </div>
                            )}
                        </div>

                        <div
                            className={`grid transition-all duration-300 ${
                                isBulkEditOpen && !isBulkEditMinimized
                                    ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4'
                                    : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8 gap-6'
                            }`}
                        >
                            {stagedFiles.map(file => (
                                <AssetCard
                                    key={file.id}
                                    file={file.file}
                                    previewUrl={file.preview}
                                    hasMetadata={file.hasMetadata}
                                    isSelected={file.isSelected}
                                    isInBulkEdit={bulkEditIdSet.has(file.id)}
                                    onDragStart={(e) => handleCardDragStart(e, file)}
                                    onDragEnd={endDraggingItems}
                                    onEdit={() => handleEdit(file.id)}
                                    onToggleSelect={(e) => handleToggleSelect(file.id, e)}
                                    luminance={file.luminance}
                                    contrastBgDark={file.contrastBgDark}
                                    contrastBgLight={file.contrastBgLight}
                                />
                            ))}
                        </div>
                    </div>
                )}

                <ConfirmDialog
                    isOpen={confirmDialog.isOpen}
                    onClose={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
                    onConfirm={confirmDialog.onConfirm}
                    title={confirmDialog.title}
                    message={confirmDialog.message}
                    confirmText="Yes, Delete"
                    cancelText="Cancel"
                    type="danger"
                />
            </div>
        </AdminLayout>
    );
}
