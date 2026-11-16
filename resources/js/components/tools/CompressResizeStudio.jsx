import React, { useEffect, useMemo, useRef, useState } from 'react';
import { usePage } from '@inertiajs/react';
import {
    ArrowLeftRight,
    Copy,
    Download,
    Eye,
    FileArchive,
    Loader2,
    Maximize2,
    Minimize2,
    MoveHorizontal,
    Plus,
    RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import {
    buildZipBlob,
    convertImageFile,
    formatFileSize,
    loadImageFromFileOrUrl,
    stripExtension,
} from '@/lib/imageConverter';
import { appendDomainToFilename, triggerSiteBlobDownload } from '@/lib/utils';
import { useBatchControl } from '@/lib/useBatchControl';
import { AspectLockButton, clampSvgDim, LockedPixelInput } from '@/components/tools/SvgSizeControls';
import IosBrandProgressBar from '@/components/tools/IosBrandProgressBar';
import StudioColorPicker from '@/components/tools/StudioColorPicker';
import {
    inferImageFormatFromFile,
    StudioBatchFilmstrip,
    StudioClosedSummaryBar,
    StudioInitialDropZone,
    StudioModalFrame,
    StudioViewportStage,
    useStudioViewport,
} from '@/components/tools/StudioPopupShell';

export default function CompressResizeStudio({
    tool,
    avifSupported = true,
    preloadAsset = null,
    onTrackEvent,
}) {
    const isCompress = tool.mode === 'compress';
    const isResize = tool.mode === 'resize';
    const { props } = usePage();
    const websiteInfo = props?.websiteInfo || {};
    const fileInputRef = useRef(null);
    const itemsRef = useRef([]);
    const activeIdRef = useRef(null);
    const previewRunRef = useRef(0);
    const splitBoxRef = useRef(null);

    const [items, setItems] = useState([]);
    itemsRef.current = items;
    const [activeId, setActiveId] = useState(null);
    activeIdRef.current = activeId;
    const [studioOpen, setStudioOpen] = useState(false);

    // Output Format & Quality (per-item custom quality falls back to defaultQuality)
    const defaultQuality = tool.defaultQuality || (isCompress ? 82 : 90);
    const [targetFormat, setTargetFormat] = useState(
        `${tool.targetMime || 'image/png'}|${tool.targetExt || 'png'}`
    );
    const [quality, setQuality] = useState(defaultQuality);
    const [bgFillColor, setBgFillColor] = useState('#ffffff');

    // Dimensions & fit controls (shared UI inputs synced to active item's custom or source size)
    const [outWidth, setOutWidth] = useState('1080');
    const [outHeight, setOutHeight] = useState('1080');
    const [aspectLocked, setAspectLocked] = useState(true);
    const [lockedRatio, setLockedRatio] = useState(1);
    const [fitMode, setFitMode] = useState('contain');
    const [transparentBg, setTransparentBg] = useState(true);

    // Live preview & background batch processing state
    const [showOriginal, setShowOriginal] = useState(false);
    const [splitPos, setSplitPos] = useState(50);
    const [draggingSplit, setDraggingSplit] = useState(false);
    const viewport = useStudioViewport({ minZoom: 0.05, maxZoom: 8, initialZoom: 1 });

    // Batch export state
    const [exporting, setExporting] = useState(false);
    const [exportProgress, setExportProgress] = useState(0);
    const [exportDoneCount, setExportDoneCount] = useState(0);
    const batchCtrl = useBatchControl();

    const [targetMime, targetExt] = targetFormat.split('|');

    const activeItem = items.find((i) => i.id === activeId) || items[0] || null;

    // Reset format/quality defaults if user navigates between Compressor & Resizer via SPA
    useEffect(() => {
        setTargetFormat(`${tool.targetMime || 'image/png'}|${tool.targetExt || 'png'}`);
        setQuality(tool.defaultQuality || (isCompress ? 82 : 90));
        viewport.resetView();
        setSplitPos(50);
    }, [tool.slug, isCompress]);

    useEffect(() => {
        return () => {
            itemsRef.current.forEach((it) => {
                if (it.sourcePreviewUrl) URL.revokeObjectURL(it.sourcePreviewUrl);
                if (it.processedUrl) URL.revokeObjectURL(it.processedUrl);
            });
        };
    }, []);

    const probeImageFiles = async (fileList) => {
        const valid = Array.from(fileList || []).filter((f) => f.type.startsWith('image/'));
        if (!valid.length) {
            toast.error('Please upload valid image files.');
            return [];
        }

        const added = [];
        for (let i = 0; i < valid.length; i++) {
            const file = valid[i];
            let width = 0;
            let height = 0;
            try {
                const loaded = await loadImageFromFileOrUrl(file);
                width = loaded.width || 0;
                height = loaded.height || 0;
                loaded.revoke();
            } catch {
                // Keep zero fallback
            }
            added.push({
                id: `${Date.now()}-${i}-${Math.random().toString(36).slice(2, 7)}`,
                file,
                name: file.name,
                size: file.size,
                width,
                height,
                sourcePreviewUrl: URL.createObjectURL(file),
                processedUrl: null,
                result: null,
                status: 'pending',
                progress: 0,
                settingsSig: '',
                lastSavedPct: null,
                customSize: null,
                customQuality: null,
            });
        }
        return added;
    };

    const handleFilesAdded = async (fileList) => {
        const added = await probeImageFiles(fileList);
        if (!added.length) return;

        const hadExisting = itemsRef.current.length > 0;
        const first = added[0];
        setItems((prev) => [...prev, ...added]);

        if (!hadExisting) {
            const origFmt = inferImageFormatFromFile(first.file, avifSupported);
            setTargetFormat(`${origFmt.mime}|${origFmt.ext}`);
            viewport.resetView();
            if (first.width > 0 && first.height > 0) {
                setOutWidth(String(first.width));
                setOutHeight(String(first.height));
                setLockedRatio(first.width / Math.max(1, first.height));
            }
        }

        if (added.length === 1 || !studioOpen || !hadExisting) {
            setActiveId(first.id);
        }
        setStudioOpen(true);
        if (hadExisting) {
            toast.success(`Added ${added.length} image(s) to studio`);
        }
    };

    // Preload handed-off asset if opened from gallery
    useEffect(() => {
        if (!preloadAsset?.path) return;
        let cancelled = false;
        fetch(preloadAsset.path)
            .then((r) => (r.ok ? r.blob() : Promise.reject()))
            .then((blob) => {
                if (cancelled) return;
                const ext = (blob.type?.split('/')[1] || 'png').replace('jpeg', 'jpg');
                const file = new File([blob], `${preloadAsset.name || 'png-asset'}.${ext}`, {
                    type: blob.type || 'image/png',
                });
                handleFilesAdded([file]);
            })
            .catch(() => {});
        return () => {
            cancelled = true;
        };
    }, [preloadAsset?.path]);

    const handleRemoveItem = (id) => {
        setItems((prev) => {
            const target = prev.find((it) => it.id === id);
            if (target?.sourcePreviewUrl) URL.revokeObjectURL(target.sourcePreviewUrl);
            if (target?.processedUrl) URL.revokeObjectURL(target.processedUrl);
            const next = prev.filter((it) => it.id !== id);
            if (activeId === id) {
                setActiveId(next[0]?.id || null);
            }
            if (next.length === 0) {
                setStudioOpen(false);
            }
            return next;
        });
    };

    const clearQueue = () => {
        batchCtrl.stop();
        previewRunRef.current++;
        itemsRef.current.forEach((it) => {
            if (it.sourcePreviewUrl) URL.revokeObjectURL(it.sourcePreviewUrl);
            if (it.processedUrl) URL.revokeObjectURL(it.processedUrl);
        });
        setItems([]);
        setActiveId(null);
        setStudioOpen(false);
    };

    // Sync pixel inputs, quality & lock state whenever the user switches active thumbnail
    useEffect(() => {
        if (!activeItem) return;
        setQuality(
            typeof activeItem.customQuality === 'number' ? activeItem.customQuality : defaultQuality
        );
        if (activeItem.customSize) {
            const cw = String(activeItem.customSize.width ?? activeItem.width ?? 1080);
            const ch = String(activeItem.customSize.height ?? activeItem.height ?? 1080);
            const nw = Math.max(1, Number(cw) || activeItem.width || 1080);
            const nh = Math.max(1, Number(ch) || activeItem.height || 1080);
            setOutWidth(cw);
            setOutHeight(ch);
            setAspectLocked(activeItem.customSize.aspectLocked ?? true);
            setLockedRatio(activeItem.customSize.lockedRatio || nw / Math.max(1, nh));
            return;
        }
        const iw = activeItem.width || 1080;
        const ih = activeItem.height || 1080;
        setOutWidth(String(iw));
        setOutHeight(String(ih));
        setAspectLocked(true);
        setLockedRatio(iw / Math.max(1, ih));
    }, [activeItem?.id, isCompress]);

    const saveActiveCustomSize = (
        widthStr,
        heightStr,
        locked = aspectLocked,
        ratio = lockedRatio,
        scalePct = null
    ) => {
        if (!activeItem?.id) return;
        const wNum = parseInt(widthStr, 10);
        const hNum = parseInt(heightStr, 10);
        if (!Number.isFinite(wNum) || wNum <= 0 || !Number.isFinite(hNum) || hNum <= 0) return;
        const clampedW = String(clampSvgDim(wNum, activeItem.width || 1080));
        const clampedH = String(clampSvgDim(hNum, activeItem.height || 1080));
        setItems((prev) =>
            prev.map((it) =>
                it.id === activeItem.id
                    ? {
                          ...it,
                          customSize: {
                              width: clampedW,
                              height: clampedH,
                              aspectLocked: locked,
                              lockedRatio: ratio || Number(clampedW) / Math.max(1, Number(clampedH)),
                              scalePct,
                          },
                      }
                    : it
            )
        );
    };

    // Resize & Compress per-image dimension handlers
    const handleDimensionChange = (axis, rawValue) => {
        const parsed = parseInt(rawValue, 10);
        if (axis === 'width') {
            setOutWidth(rawValue);
            let nextHStr = outHeight;
            if (aspectLocked && Number.isFinite(parsed) && parsed > 0) {
                nextHStr = String(clampSvgDim(Math.round(parsed / (lockedRatio || 1)), parsed));
                setOutHeight(nextHStr);
            }
            if (Number.isFinite(parsed) && parsed > 0) {
                saveActiveCustomSize(rawValue, nextHStr, aspectLocked, lockedRatio, null);
            }
            return;
        }
        setOutHeight(rawValue);
        let nextWStr = outWidth;
        if (aspectLocked && Number.isFinite(parsed) && parsed > 0) {
            nextWStr = String(clampSvgDim(Math.round(parsed * (lockedRatio || 1)), parsed));
            setOutWidth(nextWStr);
        }
        if (Number.isFinite(parsed) && parsed > 0) {
            saveActiveCustomSize(nextWStr, rawValue, aspectLocked, lockedRatio, null);
        }
    };

    // Compress Optional Downscale % presets (applies strictly to the active image)
    const handleCompressPctSelect = (pct) => {
        if (!activeItem) return;
        const iw = activeItem.width || 1080;
        const ih = activeItem.height || 1080;
        const ratio = iw / Math.max(1, ih);
        if (pct === 100) {
            setOutWidth(String(iw));
            setOutHeight(String(ih));
            setAspectLocked(true);
            setLockedRatio(ratio);
            if (activeItem.customSize) {
                setItems((prev) =>
                    prev.map((it) => (it.id === activeItem.id ? { ...it, customSize: null } : it))
                );
            }
            return;
        }
        const nextW = Math.max(1, Math.round((iw * pct) / 100));
        const nextH = Math.max(1, Math.round((ih * pct) / 100));
        setOutWidth(String(nextW));
        setOutHeight(String(nextH));
        setAspectLocked(true);
        setLockedRatio(ratio);
        saveActiveCustomSize(String(nextW), String(nextH), true, ratio, pct);
    };

    const handleToggleLock = () => {
        const nextLocked = !aspectLocked;
        let nextRatio = lockedRatio;
        if (nextLocked) {
            const w = Number(outWidth);
            const h = Number(outHeight);
            if (w > 0 && h > 0) {
                nextRatio = w / h;
                setLockedRatio(nextRatio);
            }
        }
        setAspectLocked(nextLocked);
        if (activeItem?.customSize) {
            saveActiveCustomSize(
                outWidth,
                outHeight,
                nextLocked,
                nextRatio,
                activeItem.customSize.scalePct ?? null
            );
        }
    };

    const handleResetDimensions = () => {
        if (!activeItem) return;
        const w = activeItem.width || 1080;
        const h = activeItem.height || 1080;
        setItems((prev) =>
            prev.map((it) => (it.id === activeItem.id ? { ...it, customSize: null } : it))
        );
        setOutWidth(String(w));
        setOutHeight(String(h));
        setLockedRatio(w / Math.max(1, h));
        setAspectLocked(true);
    };

    const applyPercentResize = (pct) => {
        if (!activeItem) return;
        const baseW = activeItem.width || 1080;
        const baseH = activeItem.height || 1080;
        const nextW = Math.max(16, Math.round((baseW * pct) / 100));
        const nextH = Math.max(16, Math.round((baseH * pct) / 100));
        const nextRatio = nextW / Math.max(1, nextH);
        setOutWidth(String(nextW));
        setOutHeight(String(nextH));
        setLockedRatio(nextRatio);
        saveActiveCustomSize(String(nextW), String(nextH), aspectLocked, nextRatio, pct);
    };

    const handleSwapDimensions = () => {
        const w = outWidth;
        const h = outHeight;
        setOutWidth(h);
        setOutHeight(w);
        const nw = Number(h);
        const nh = Number(w);
        const nextRatio = nw > 0 && nh > 0 ? nw / nh : lockedRatio;
        if (nw > 0 && nh > 0) {
            setLockedRatio(nextRatio);
        }
        saveActiveCustomSize(h, w, aspectLocked, nextRatio, null);
    };

    const handleApplySizeToAll = () => {
        if (!activeItem || items.length < 2) return;
        // If Compress mode has a percentage preset active on this image (75%/50%/25%) or 100% reset,
        // apply that percentage proportionally across every image in the batch; otherwise apply exact pixels.
        if (isCompress && !activeItem.customSize) {
            setItems((prev) => prev.map((it) => (it.customSize ? { ...it, customSize: null } : it)));
            toast.success(`Reset all ${items.length} images to 100% original size`);
            return;
        }
        if (isCompress && activeItem.customSize?.scalePct) {
            const pct = activeItem.customSize.scalePct;
            setItems((prev) =>
                prev.map((it) => {
                    const iw = it.width || 1080;
                    const ih = it.height || 1080;
                    const wStr = String(Math.max(1, Math.round((iw * pct) / 100)));
                    const hStr = String(Math.max(1, Math.round((ih * pct) / 100)));
                    return {
                        ...it,
                        customSize: {
                            width: wStr,
                            height: hStr,
                            aspectLocked: true,
                            lockedRatio: iw / Math.max(1, ih),
                            scalePct: pct,
                        },
                    };
                })
            );
            toast.success(`Applied ${pct}% scale to all ${items.length} images`);
            return;
        }
        const eff = getEffectiveItemDims(activeItem);
        const wStr = String(eff.width);
        const hStr = String(eff.height);
        const ratio = eff.width / Math.max(1, eff.height);
        setItems((prev) =>
            prev.map((it) => ({
                ...it,
                customSize: {
                    width: wStr,
                    height: hStr,
                    aspectLocked,
                    lockedRatio: ratio,
                    scalePct: null,
                },
            }))
        );
        toast.success(`Applied ${wStr}×${hStr}px to all ${items.length} images`);
    };

    const getEffectiveItemQuality = (item) =>
        typeof item?.customQuality === 'number' ? item.customQuality : defaultQuality;

    const handleQualityChange = (nextQuality) => {
        const q = Math.max(15, Math.min(100, Number(nextQuality) || defaultQuality));
        setQuality(q);
        if (!activeItem?.id) return;
        setItems((prev) =>
            prev.map((it) =>
                it.id === activeItem.id
                    ? { ...it, customQuality: q === defaultQuality ? null : q }
                    : it
            )
        );
    };

    const handleApplyQualityToAll = () => {
        if (!activeItem || items.length < 2) return;
        const q = getEffectiveItemQuality(activeItem);
        const stored = q === defaultQuality ? null : q;
        setItems((prev) => prev.map((it) => ({ ...it, customQuality: stored })));
        toast.success(`Applied ${q}% quality to all ${items.length} images`);
    };

    const resolvedTargetBackgroundForItem = (item) => {
        const isJpgOut =
            targetMime === 'image/jpeg' ||
            (targetMime === 'auto' && item?.file?.type === 'image/jpeg');
        if (isJpgOut) return bgFillColor || '#ffffff';
        if (isResize && fitMode === 'contain' && !transparentBg) return bgFillColor || '#ffffff';
        return null;
    };

    const getEffectiveItemDims = (item) => {
        if (!item) {
            const w = clampSvgDim(outWidth, 1080);
            const h = clampSvgDim(outHeight, 1080);
            return { width: w, height: h, aspectLocked, isCustom: false };
        }
        if (item.customSize) {
            return {
                width: clampSvgDim(item.customSize.width, item.width || 1080),
                height: clampSvgDim(item.customSize.height, item.height || 1080),
                aspectLocked: item.customSize.aspectLocked ?? true,
                isCustom: true,
            };
        }
        return {
            width: item.width || 1080,
            height: item.height || 1080,
            aspectLocked: true,
            isCustom: false,
        };
    };

    const buildConversionOptionsForItem = (item) => {
        const eff = getEffectiveItemDims(item);
        const bg = resolvedTargetBackgroundForItem(item);
        const itemQualityRatio = getEffectiveItemQuality(item) / 100;
        if (isCompress) {
            if (eff.isCustom) {
                return {
                    mode: 'compress',
                    targetMime,
                    targetExt,
                    quality: itemQualityRatio,
                    targetWidth: eff.width,
                    targetHeight: eff.height,
                    fitMode: eff.aspectLocked ? 'contain' : 'stretch',
                    backgroundColor: targetMime === 'image/jpeg' ? bgFillColor : null,
                };
            }
            return {
                mode: 'compress',
                targetMime,
                targetExt,
                quality: itemQualityRatio,
                scale: 1,
                backgroundColor: targetMime === 'image/jpeg' ? bgFillColor : null,
            };
        }
        return {
            mode: 'resize',
            targetMime,
            targetExt,
            quality: itemQualityRatio,
            targetWidth: eff.width,
            targetHeight: eff.height,
            fitMode,
            backgroundColor: bg,
        };
    };

    const baseSettingsSig = useMemo(
        () =>
            isCompress
                ? `compress|${targetFormat}|${bgFillColor}`
                : `resize|${targetFormat}|${bgFillColor}|${fitMode}|${transparentBg}`,
        [isCompress, targetFormat, bgFillColor, fitMode, transparentBg]
    );

    const getItemSettingsSig = (it) => {
        const q = getEffectiveItemQuality(it);
        if (!it) return `${baseSettingsSig}|q:${q}`;
        if (it.customSize) {
            const cw = clampSvgDim(it.customSize.width, it.width || 1080);
            const ch = clampSvgDim(it.customSize.height, it.height || 1080);
            const lk = it.customSize.aspectLocked === false ? 'F' : 'L';
            return `${baseSettingsSig}|q:${q}|custom:${cw}x${ch}:${lk}`;
        }
        return `${baseSettingsSig}|q:${q}|nat:${it.width || 0}x${it.height || 0}`;
    };

    const itemsSignatureKey = items.map((it) => `${it.id}:${getItemSettingsSig(it)}`).join('|');
    const previewData = activeItem?.result || null;
    const previewBusy = Boolean(
        activeItem && (activeItem.status === 'pending' || activeItem.status === 'processing')
    );
    const doneCount = items.filter((it) => it.status === 'done' && it.settingsSig === getItemSettingsSig(it)).length;
    const batchProcessing = items.length > 0 && doneCount < items.length;
    const batchProgressPct = items.length > 0 ? Math.round((doneCount / items.length) * 100) : 0;

    // Automatically process only stale/unprocessed items whenever files are added or settings/item size change
    useEffect(() => {
        if (!itemsRef.current.length) return undefined;

        const stale = itemsRef.current.filter(
            (it) => it.settingsSig !== getItemSettingsSig(it) || it.status === 'pending' || it.status === 'processing'
        );
        if (!stale.length) return undefined;

        const runId = ++previewRunRef.current;
        const staleSet = new Set(stale.map((it) => it.id));

        setItems((prev) =>
            prev.map((it) =>
                staleSet.has(it.id)
                    ? { ...it, status: 'pending', progress: 0 }
                    : it
            )
        );

        const delay = targetMime === 'image/avif' ? 320 : 100;
        const timer = setTimeout(async () => {
            const processedInRun = new Set();

            while (previewRunRef.current === runId) {
                const candidates = itemsRef.current.filter(
                    (it) =>
                        !processedInRun.has(it.id) &&
                        (staleSet.has(it.id) || it.settingsSig !== getItemSettingsSig(it) || it.status === 'pending')
                );
                if (!candidates.length) break;

                // Prioritize whichever image the user is currently viewing first
                const nextRow =
                    candidates.find((it) => it.id === activeIdRef.current) || candidates[0];
                processedInRun.add(nextRow.id);

                setItems((prev) =>
                    prev.map((it) =>
                        it.id === nextRow.id ? { ...it, status: 'processing', progress: 35 } : it
                    )
                );
                await new Promise((r) => requestAnimationFrame(r));
                if (previewRunRef.current !== runId) break;

                try {
                    const rowSig = getItemSettingsSig(nextRow);
                    const opts = buildConversionOptionsForItem(nextRow);
                    const res = await convertImageFile(nextRow.file, opts);
                    if (previewRunRef.current !== runId) {
                        if (res?.url) URL.revokeObjectURL(res.url);
                        break;
                    }
                    const savedPct =
                        nextRow.size > 0
                            ? Math.round(((nextRow.size - res.size) / nextRow.size) * 100)
                            : 0;

                    setItems((prev) =>
                        prev.map((it) => {
                            if (it.id !== nextRow.id) return it;
                            if (it.processedUrl && it.processedUrl !== res.url) {
                                URL.revokeObjectURL(it.processedUrl);
                            }
                            return {
                                ...it,
                                status: 'done',
                                progress: 100,
                                settingsSig: rowSig,
                                processedUrl: res.url,
                                lastSavedPct: savedPct,
                                result: {
                                    blob: res.blob,
                                    url: res.url,
                                    size: res.size,
                                    width: res.width,
                                    height: res.height,
                                    ext: res.ext || opts.targetExt || targetExt,
                                    filename: res.filename,
                                    alreadyOptimal: Boolean(res.alreadyOptimal),
                                },
                            };
                        })
                    );
                } catch {
                    if (previewRunRef.current === runId) {
                        setItems((prev) =>
                            prev.map((it) =>
                                it.id === nextRow.id
                                    ? { ...it, status: 'error', progress: 0 }
                                    : it
                            )
                        );
                    }
                }
            }
        }, delay);

        return () => clearTimeout(timer);
    }, [itemsSignatureKey]);

    const handleDownloadCurrent = async () => {
        if (!activeItem) return;
        try {
            const activeSig = getItemSettingsSig(activeItem);
            const cached =
                activeItem.status === 'done' &&
                activeItem.settingsSig === activeSig &&
                activeItem.result?.blob
                    ? activeItem.result
                    : null;
            const res =
                cached ||
                (await convertImageFile(activeItem.file, buildConversionOptionsForItem(activeItem)));
            triggerSiteBlobDownload(res.blob, res.filename, websiteInfo);
            if (!cached && res.url) URL.revokeObjectURL(res.url);
            onTrackEvent?.({
                slug: tool.slug,
                eventType: 'convert',
                filesCount: 1,
                inputBytes: activeItem.size,
                outputBytes: res.size,
            });
            toast.success(`Downloaded ${res.filename}!`);
        } catch (err) {
            toast.error(err?.message || 'Export failed');
        }
    };

    const handleDownloadAllZip = async () => {
        if (!items.length || exporting) return;
        batchCtrl.reset();
        setExporting(true);
        setExportProgress(0);
        setExportDoneCount(0);

        try {
            const entries = [];
            const usedNames = new Map();
            let inSum = 0;
            let outSum = 0;

            for (let i = 0; i < items.length; i++) {
                if (await batchCtrl.waitIfPausedOrStopped()) {
                    toast.info(`Stopped after ${entries.length} image(s).`);
                    break;
                }
                const row = items[i];
                const rowSig = getItemSettingsSig(row);
                const cached =
                    row.status === 'done' && row.settingsSig === rowSig && row.result?.blob
                        ? row.result
                        : null;
                const res =
                    cached ||
                    (await convertImageFile(row.file, buildConversionOptionsForItem(row)));
                if (!cached && res.url) URL.revokeObjectURL(res.url);

                const tagged = appendDomainToFilename(res.filename, websiteInfo);
                const count = (usedNames.get(tagged) || 0) + 1;
                usedNames.set(tagged, count);
                const uniqueName = count === 1 ? tagged : tagged.replace(/(\.[^.]+)$/, `-${count}$1`);

                entries.push({ filename: uniqueName, blob: res.blob });
                inSum += row.size;
                outSum += res.size;
                setExportDoneCount(i + 1);
                setExportProgress(Math.round(((i + 1) / items.length) * 100));
                await new Promise((r) => requestAnimationFrame(r));
            }

            if (entries.length === 1 && items.length === 1) {
                triggerSiteBlobDownload(entries[0].blob, entries[0].filename, websiteInfo);
            } else if (entries.length > 0) {
                const zipName = isCompress ? 'compressed-images.zip' : 'resized-images.zip';
                const zipBlob = await buildZipBlob(entries);
                triggerSiteBlobDownload(zipBlob, zipName, websiteInfo);
                onTrackEvent?.({
                    slug: tool.slug,
                    eventType: 'convert',
                    filesCount: entries.length,
                    inputBytes: inSum,
                    outputBytes: outSum,
                });
                toast.success(`Exported ${entries.length} image(s) as ZIP!`);
            }
        } catch {
            toast.error('Failed to export batch ZIP');
        } finally {
            setExporting(false);
        }
    };

    const updateSplitFromClientX = (clientX) => {
        if (!splitBoxRef.current) return;
        const rect = splitBoxRef.current.getBoundingClientRect();
        if (rect.width <= 0) return;
        const pct = ((clientX - rect.left) / rect.width) * 100;
        setSplitPos(Math.max(0, Math.min(100, pct)));
    };

    const savingsBytes = activeItem && previewData ? activeItem.size - previewData.size : 0;
    const savingsPct =
        activeItem && previewData && activeItem.size > 0
            ? ((savingsBytes / activeItem.size) * 100).toFixed(1)
            : null;

    const showBgFillPicker =
        targetMime === 'image/jpeg' || (isResize && fitMode === 'contain' && !transparentBg);

    const isPngSelected =
        targetMime === 'image/png' ||
        (targetMime === 'auto' &&
            (activeItem?.file?.type === 'image/png' || /\.png$/i.test(activeItem?.name || '')));

    const activeItemSig = activeItem ? getItemSettingsSig(activeItem) : '';
    const activeEff = activeItem ? getEffectiveItemDims(activeItem) : { width: 0, height: 0, isCustom: false };
    const hasFreshPreview = Boolean(
        activeItem && activeItem.settingsSig === activeItemSig && previewData?.width > 0
    );
    const parsedPreviewW = hasFreshPreview ? previewData.width : activeEff.width;
    const parsedPreviewH = hasFreshPreview ? previewData.height : activeEff.height;
    const resizeTargetW = isResize ? activeEff.width : 0;
    const resizeTargetH = isResize ? activeEff.height : 0;
    const stageDisplayW = showOriginal ? (activeItem?.width || parsedPreviewW) : parsedPreviewW;
    const stageDisplayH = showOriginal ? (activeItem?.height || parsedPreviewH) : parsedPreviewH;
    const formatOptions = useMemo(() => {
        const list = [
            { value: 'image/png|png', label: 'PNG' },
            { value: 'image/jpeg|jpg', label: 'JPG' },
            { value: 'image/webp|webp', label: 'WEBP' },
        ];
        if (avifSupported) {
            list.push({ value: 'image/avif|avif', label: 'AVIF' });
        }
        return list;
    }, [avifSupported]);

    return (
        <section className="w-full space-y-6">
            <input
                ref={fileInputRef}
                type="file"
                multiple
                accept={tool.accept}
                className="hidden"
                onChange={(e) => {
                    if (e.target.files?.length) handleFilesAdded(e.target.files);
                    e.target.value = '';
                }}
            />

            {/* Initial Drop Zone (disappears once images are queued) */}
            {items.length === 0 && (
                <StudioInitialDropZone
                    icon={isCompress ? Minimize2 : Maximize2}
                    title={
                        isCompress
                            ? 'Drop one or more images here to open the Live Compression Studio'
                            : 'Drop one or more images here to open the Live Resize Studio'
                    }
                    subtitle={
                        isCompress
                            ? 'Inspect compressed quality side-by-side with live byte savings & batch ZIP export'
                            : 'Preview true 1:1 real-pixel dimensions, crop/contain fit & batch export in real time'
                    }
                    onFiles={handleFilesAdded}
                    onClick={() => fileInputRef.current?.click()}
                />
            )}

            {/* Compact Queue Summary when closed */}
            {items.length > 0 && !studioOpen && (
                <StudioClosedSummaryBar
                    thumbs={items.map((it) => ({ id: it.id, url: it.sourcePreviewUrl, name: it.name }))}
                    fallbackIcon={isCompress ? Minimize2 : Maximize2}
                    title={
                        items.length === 1
                            ? items[0].name
                            : `${items.length} images ready for ${isCompress ? 'compression' : 'resizing'}`
                    }
                    subtitle={
                        isCompress
                            ? `${targetExt.toUpperCase()} · ${quality}% quality${items.some((i) => i.customSize) ? ' · Custom downscale' : ''}`
                            : `${items.some((i) => i.customSize) ? 'Custom sizes' : `${outWidth}×${outHeight}px`} (${fitMode}) · ${targetExt.toUpperCase()}`
                    }
                    onAddClick={() => fileInputRef.current?.click()}
                    onOpenStudio={() => setStudioOpen(true)}
                    onPrimaryAction={items.length > 1 ? handleDownloadAllZip : handleDownloadCurrent}
                    primaryLabel={
                        items.length > 1
                            ? `Download All (${items.length}) .zip`
                            : isCompress
                              ? 'Download Compressed'
                              : 'Download Resized'
                    }
                    primaryIcon={items.length > 1 ? FileArchive : Download}
                    primaryDisabled={exporting}
                    onClear={clearQueue}
                    onFilesDrop={handleFilesAdded}
                />
            )}

            <StudioModalFrame
                open={studioOpen && items.length > 0}
                onClose={() => setStudioOpen(false)}
                busy={exporting}
                ariaLabel={isCompress ? 'Live Image Compression Studio' : 'Live Image Resize Studio'}
                icon={isCompress ? Minimize2 : Maximize2}
                title={activeItem?.name || (isCompress ? 'Compression Studio' : 'Resize Studio')}
                subtitle={
                    exporting
                        ? `Exporting ${exportDoneCount} of ${items.length} (${exportProgress}%)...`
                        : isCompress
                          ? 'Real-time compressed output · Drag slider on canvas to compare Original vs Compressed'
                          : 'Real-time dimension & fit preview · Applied uniformly across your batch on export'
                }
                badges={
                    <>
                        {activeItem?.width > 0 && (
                            <span className="px-2 py-0.5 rounded-md bg-background border border-card-border font-mono text-[10px] text-foreground/65">
                                {activeItem.width}×{activeItem.height}
                                {parsedPreviewW > 0 && (parsedPreviewW !== activeItem.width || parsedPreviewH !== activeItem.height)
                                    ? ` → ${parsedPreviewW}×${parsedPreviewH}px`
                                    : 'px'}
                            </span>
                        )}
                        <span className="px-2 py-0.5 rounded-md bg-blue-500/10 border border-blue-500/25 font-mono text-[10px] font-bold text-blue-500">
                            {Math.max(1, items.findIndex((i) => i.id === activeItem?.id) + 1)} / {items.length}
                        </span>
                    </>
                }
                onFilesDrop={handleFilesAdded}
                dropOverlayTitle="Drop images to add to studio"
                dropOverlaySubtitle={`Added images will use your ${isCompress ? 'compression' : 'resize'} settings right away`}
                topSubBar={
                    (exporting || batchProcessing) &&
                    items.length > 0 && (
                        <div className="px-5 py-2 border-b border-card-border bg-background/60 shrink-0 space-y-1">
                            <div className="flex items-center justify-between text-[11px] font-mono text-foreground/70">
                                <span>
                                    {exporting
                                        ? `Exporting ZIP: ${exportDoneCount} / ${items.length}`
                                        : `Processing batch: ${doneCount} / ${items.length} ready`}
                                </span>
                                <span className="font-bold text-blue-500">
                                    {exporting ? exportProgress : batchProgressPct}%
                                </span>
                            </div>
                            <IosBrandProgressBar
                                progress={exporting ? exportProgress : batchProgressPct}
                                isPending={batchProcessing && batchProgressPct === 0}
                                size="sm"
                                withShadow
                            />
                        </div>
                    )
                }
                headerActions={
                    <>
                        <button
                            type="button"
                            disabled={exporting}
                            onClick={() => fileInputRef.current?.click()}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-background hover:bg-card-header-bg border border-card-border hover:border-blue-500/40 text-xs font-bold text-foreground cursor-pointer disabled:opacity-50 transition-colors"
                        >
                            <Plus className="w-3.5 h-3.5 text-blue-500" />
                            <span>Add Images</span>
                        </button>

                        {items.length > 1 && (
                            <button
                                type="button"
                                disabled={exporting}
                                onClick={handleDownloadCurrent}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-background border border-card-border hover:border-blue-500 text-xs font-bold text-foreground cursor-pointer disabled:opacity-50 transition-colors"
                            >
                                <Download className="w-3.5 h-3.5 text-blue-500" />
                                <span>Download Current</span>
                            </button>
                        )}

                        <button
                            type="button"
                            disabled={exporting}
                            onClick={items.length > 1 ? handleDownloadAllZip : handleDownloadCurrent}
                            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-600/25 cursor-pointer disabled:opacity-50 transition-colors"
                        >
                            {exporting ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : items.length > 1 ? (
                                <FileArchive className="w-3.5 h-3.5" />
                            ) : (
                                <Download className="w-3.5 h-3.5" />
                            )}
                            <span>
                                {exporting
                                    ? `${exportProgress}%`
                                    : items.length > 1
                                      ? `Download All (${items.length}) .zip`
                                      : isCompress
                                        ? 'Download Compressed'
                                        : 'Download Resized'}
                            </span>
                        </button>
                    </>
                }
                leftSidebar={
                    <>
                        {/* Live Size Telemetry Card */}
                        {activeItem && (
                            <div className="p-3.5 rounded-xl bg-card-bg border border-card-border space-y-2">
                                <div className="flex items-center justify-between text-[11px] font-bold text-foreground/65 uppercase tracking-wider">
                                    <span>{isCompress ? 'Live Compression' : 'Live Output Estimate'}</span>
                                    {previewBusy && <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500" />}
                                </div>
                                <div className="flex items-baseline justify-between gap-2">
                                    <div className="font-mono text-xs text-foreground/75">
                                        {formatFileSize(activeItem.size)}{' '}
                                        <span className="text-foreground/40">→</span>{' '}
                                        <span className="font-bold text-foreground">
                                            {previewData ? formatFileSize(previewData.size) : '...'}
                                        </span>
                                    </div>
                                    {savingsPct !== null && (
                                        <span
                                            className={`px-2 py-0.5 rounded-md font-mono text-[11px] font-bold ${
                                                Number(savingsPct) > 0
                                                    ? 'bg-emerald-500/15 text-emerald-500'
                                                    : 'bg-amber-500/15 text-amber-500'
                                            }`}
                                        >
                                            {Number(savingsPct) > 0 ? `-${savingsPct}%` : `+${Math.abs(Number(savingsPct))}%`}
                                        </span>
                                    )}
                                </div>
                                {previewData?.alreadyOptimal && (
                                    <p className="text-[10px] text-amber-500 leading-snug">
                                        Source is already compact — lower quality or try WebP/AVIF for more savings.
                                    </p>
                                )}
                            </div>
                        )}

                        {/* Resize Specific Dimension & Fit Controls */}
                        {isResize && (
                            <div className="space-y-3">
                                <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-1.5">
                                        <span className="font-bold text-foreground/75 uppercase tracking-wider text-[11px]">
                                            Output Size (px)
                                        </span>
                                        {activeItem?.customSize && (
                                            <span className="px-1.5 py-0.5 rounded bg-blue-500/15 border border-blue-500/25 text-[9px] font-bold uppercase tracking-wider text-blue-500">
                                                Custom
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={handleSwapDimensions}
                                            title="Swap width and height"
                                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-foreground/70 hover:text-blue-500 cursor-pointer"
                                        >
                                            <ArrowLeftRight className="w-3 h-3" />
                                            <span>Swap</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleResetDimensions}
                                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-500 hover:underline cursor-pointer"
                                        >
                                            <RefreshCw className="w-3 h-3" />
                                            <span>Original</span>
                                        </button>
                                    </div>
                                </div>

                                <div className="flex items-center gap-1.5">
                                    <LockedPixelInput
                                        value={outWidth}
                                        onChange={(val) => handleDimensionChange('width', val)}
                                        onStep={(delta) =>
                                            handleDimensionChange('width', String(clampSvgDim((Number(outWidth) || 512) + delta, 1)))
                                        }
                                        placeholder="Width"
                                        ariaLabel="Output width in pixels"
                                        compact
                                    />
                                    <AspectLockButton compact isLocked={aspectLocked} onToggle={handleToggleLock} />
                                    <LockedPixelInput
                                        value={outHeight}
                                        onChange={(val) => handleDimensionChange('height', val)}
                                        onStep={(delta) =>
                                            handleDimensionChange('height', String(clampSvgDim((Number(outHeight) || 512) + delta, 1)))
                                        }
                                        placeholder="Height"
                                        ariaLabel="Output height in pixels"
                                        compact
                                    />
                                </div>

                                {items.length > 1 && resizeTargetW > 0 && resizeTargetH > 0 && (
                                    <button
                                        type="button"
                                        onClick={handleApplySizeToAll}
                                        title={`Apply ${resizeTargetW}×${resizeTargetH}px to all ${items.length} images`}
                                        className="w-full inline-flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-lg border border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/15 text-[11px] font-bold text-blue-500 cursor-pointer transition-colors"
                                    >
                                        <Copy className="w-3 h-3" />
                                        <span>
                                            Apply {resizeTargetW}×{resizeTargetH} to all ({items.length})
                                        </span>
                                    </button>
                                )}

                                <div className="space-y-1.5">
                                    <div className="flex items-center justify-between">
                                        <span className="font-bold text-foreground/65">Quick Scale</span>
                                        {resizeTargetW > 0 && resizeTargetH > 0 && (
                                            <span className="font-mono text-[10px] text-foreground/55">
                                                Ratio {(resizeTargetW / resizeTargetH).toFixed(2)}:1
                                            </span>
                                        )}
                                    </div>
                                    <div className="grid grid-cols-4 gap-1.5">
                                        {[25, 50, 75, 200].map((pct) => (
                                            <button
                                                key={pct}
                                                type="button"
                                                onClick={() => applyPercentResize(pct)}
                                                className="py-1.5 rounded-lg border border-card-border bg-card-bg hover:border-blue-500/50 font-mono font-bold text-foreground/80 cursor-pointer transition-colors"
                                            >
                                                {pct}%
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <span className="font-bold text-foreground/75 uppercase tracking-wider text-[11px] block">
                                        Fit Mode
                                    </span>
                                    <div className="grid grid-cols-3 gap-1.5">
                                        {[
                                            { id: 'contain', label: 'Contain' },
                                            { id: 'cover', label: 'Cover' },
                                            { id: 'stretch', label: 'Stretch' },
                                        ].map((fm) => (
                                            <button
                                                key={fm.id}
                                                type="button"
                                                onClick={() => setFitMode(fm.id)}
                                                className={`py-1.5 rounded-lg border font-bold cursor-pointer transition-all ${
                                                    fitMode === fm.id
                                                        ? 'bg-blue-600 text-white border-blue-500'
                                                        : 'bg-card-bg border-card-border text-foreground/75 hover:border-blue-500/40'
                                                }`}
                                            >
                                                {fm.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {fitMode === 'contain' && targetMime !== 'image/jpeg' && (
                                    <label className="flex items-center justify-between gap-2 pt-1 cursor-pointer select-none">
                                        <span className="font-bold text-foreground/75">Transparent Padding</span>
                                        <input
                                            type="checkbox"
                                            checked={transparentBg}
                                            onChange={(e) => setTransparentBg(e.target.checked)}
                                            className="w-4 h-4 accent-blue-500 cursor-pointer"
                                        />
                                    </label>
                                )}
                            </div>
                        )}

                        {/* Format & Quality */}
                        <div className="space-y-3 pt-2 border-t border-card-border">
                            <span className="font-bold text-foreground/75 uppercase tracking-wider text-[11px] block">
                                Output Format
                            </span>
                            <div
                                role="group"
                                aria-label="Target output format"
                                className={`grid gap-1.5 ${avifSupported ? 'grid-cols-4' : 'grid-cols-3'}`}
                            >
                                {formatOptions.map((fmt) => {
                                    const active = targetFormat === fmt.value;
                                    return (
                                        <button
                                            key={fmt.value}
                                            type="button"
                                            aria-pressed={active}
                                            onClick={() => setTargetFormat(fmt.value)}
                                            className={`py-1.5 px-2 rounded-lg border font-mono text-xs font-extrabold tracking-wide cursor-pointer transition-all ${
                                                active
                                                    ? 'bg-blue-600 text-white border-blue-500 shadow-sm'
                                                    : 'bg-card-bg border-card-border text-foreground/75 hover:border-blue-500/40 hover:text-foreground'
                                            }`}
                                        >
                                            {fmt.label}
                                        </button>
                                    );
                                })}
                            </div>

                            <div className="space-y-1.5 pt-1">
                                <div className="flex items-center justify-between gap-2 font-bold">
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-foreground/75">Output Quality</span>
                                        {typeof activeItem?.customQuality === 'number' && (
                                            <span className="px-1.5 py-0.5 rounded bg-blue-500/15 border border-blue-500/25 text-[9px] font-bold uppercase tracking-wider text-blue-500">
                                                Custom
                                            </span>
                                        )}
                                    </div>
                                    <span className="font-mono text-blue-500">{quality}%</span>
                                </div>
                                <input
                                    type="range"
                                    aria-label="Output quality percentage"
                                    min={15}
                                    max={100}
                                    value={quality}
                                    onChange={(e) => handleQualityChange(Number(e.target.value))}
                                    className="w-full accent-blue-500 cursor-pointer"
                                />
                                <div className="grid grid-cols-3 gap-1.5 pt-0.5">
                                    {[
                                        { label: 'Max Save', val: 60 },
                                        { label: 'Balanced', val: 82 },
                                        { label: 'Sharp', val: 94 },
                                    ].map((chip) => (
                                        <button
                                            key={chip.val}
                                            type="button"
                                            onClick={() => handleQualityChange(chip.val)}
                                            className={`py-1 rounded-lg border text-[11px] font-bold cursor-pointer ${
                                                quality === chip.val
                                                    ? 'bg-blue-600 text-white border-blue-500'
                                                    : 'bg-card-bg border-card-border text-foreground/70 hover:border-blue-500/40'
                                            }`}
                                        >
                                            {chip.label}
                                        </button>
                                    ))}
                                </div>
                                {items.length > 1 && (
                                    <button
                                        type="button"
                                        onClick={handleApplyQualityToAll}
                                        title={`Apply ${quality}% quality to all ${items.length} images`}
                                        className="w-full inline-flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-lg border border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/15 text-[11px] font-bold text-blue-500 cursor-pointer transition-colors"
                                    >
                                        <Copy className="w-3 h-3" />
                                        <span>
                                            Apply {quality}% to all ({items.length})
                                        </span>
                                    </button>
                                )}
                                {isPngSelected && (
                                    <p className="text-[10px] text-foreground/55 leading-snug pt-0.5">
                                        {quality >= 98
                                            ? '98–100% keeps lossless PNG. Lower below 98% for quantized PNG compression.'
                                            : 'Smart PNG palette quantization active — visually lossless at far fewer bytes.'}
                                    </p>
                                )}
                            </div>

                            {showBgFillPicker && (
                                <div className="flex items-center justify-between pt-1">
                                    <span className="font-bold text-foreground/75">Background Fill</span>
                                    <StudioColorPicker
                                        value={bgFillColor}
                                        onChange={setBgFillColor}
                                        ariaLabel="Background fill color"
                                        size="sm"
                                        showHexLabel
                                    />
                                </div>
                            )}

                            {isCompress && (() => {
                                const activeDownscalePct = activeItem?.customSize
                                    ? (activeItem.customSize.scalePct ?? null)
                                    : 100;
                                const applyAllLabel = activeDownscalePct
                                    ? `Apply ${activeDownscalePct}% to all (${items.length})`
                                    : `Apply ${activeEff.width}×${activeEff.height} to all (${items.length})`;
                                return (
                                <div className="space-y-2.5 pt-2 border-t border-card-border">
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-1.5">
                                            <span className="font-bold text-foreground/75">Optional Downscale</span>
                                            {activeItem?.customSize && (
                                                <span className="px-1.5 py-0.5 rounded bg-blue-500/15 border border-blue-500/25 text-[9px] font-bold uppercase tracking-wider text-blue-500">
                                                    Custom
                                                </span>
                                            )}
                                        </div>
                                        {Boolean(activeItem?.customSize) && (
                                            <button
                                                type="button"
                                                onClick={handleResetDimensions}
                                                className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-500 hover:underline cursor-pointer"
                                            >
                                                <RefreshCw className="w-3 h-3" />
                                                <span>Reset</span>
                                            </button>
                                        )}
                                    </div>

                                    {activeItem && (
                                        <div className="p-2.5 rounded-xl bg-background/80 border border-card-border space-y-1 font-mono text-[11px]">
                                            <div className="flex items-center justify-between gap-2">
                                                <span className="text-foreground/60">Dimensions</span>
                                                <span className="font-semibold text-foreground">
                                                    {activeItem.width}×{activeItem.height}
                                                    <span className="text-foreground/40"> → </span>
                                                    <span className="text-blue-500 font-bold">
                                                        {hasFreshPreview
                                                            ? `${previewData.width}×${previewData.height}`
                                                            : `${activeEff.width}×${activeEff.height}`}
                                                    </span>
                                                    <span className="text-foreground/50"> px</span>
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between gap-2">
                                                <span className="text-foreground/60">File Size</span>
                                                <span className="font-semibold text-foreground">
                                                    {formatFileSize(activeItem.size)}
                                                    <span className="text-foreground/40"> → </span>
                                                    <span className="text-emerald-500 font-bold">
                                                        {hasFreshPreview ? formatFileSize(previewData.size) : '...'}
                                                    </span>
                                                </span>
                                            </div>
                                        </div>
                                    )}

                                    <div className="grid grid-cols-4 gap-1.5">
                                        {[100, 75, 50, 25].map((pct) => (
                                            <button
                                                key={pct}
                                                type="button"
                                                onClick={() => handleCompressPctSelect(pct)}
                                                className={`py-1.5 rounded-lg border font-mono font-bold cursor-pointer transition-all ${
                                                    activeDownscalePct === pct
                                                        ? 'bg-blue-600 text-white border-blue-500'
                                                        : 'bg-card-bg border-card-border text-foreground/75 hover:border-blue-500/40'
                                                }`}
                                            >
                                                {pct}%
                                            </button>
                                        ))}
                                    </div>

                                    <div className="space-y-1.5 pt-0.5">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-foreground/60 block">
                                            Custom Size (px)
                                        </span>
                                        <div className="flex items-center gap-1.5">
                                            <LockedPixelInput
                                                value={outWidth}
                                                onChange={(val) => handleDimensionChange('width', val)}
                                                onStep={(delta) =>
                                                    handleDimensionChange(
                                                        'width',
                                                        String(clampSvgDim((Number(outWidth) || activeItem?.width || 512) + delta, 1))
                                                    )
                                                }
                                                placeholder="Width"
                                                ariaLabel="Compress custom width in pixels"
                                                compact
                                            />
                                            <AspectLockButton compact isLocked={aspectLocked} onToggle={handleToggleLock} />
                                            <LockedPixelInput
                                                value={outHeight}
                                                onChange={(val) => handleDimensionChange('height', val)}
                                                onStep={(delta) =>
                                                    handleDimensionChange(
                                                        'height',
                                                        String(clampSvgDim((Number(outHeight) || activeItem?.height || 512) + delta, 1))
                                                    )
                                                }
                                                placeholder="Height"
                                                ariaLabel="Compress custom height in pixels"
                                                compact
                                            />
                                        </div>
                                        {items.length > 1 && activeEff.width > 0 && activeEff.height > 0 && (
                                            <button
                                                type="button"
                                                onClick={handleApplySizeToAll}
                                                title={
                                                    activeDownscalePct
                                                        ? `Apply ${activeDownscalePct}% scale to all ${items.length} images`
                                                        : `Apply ${activeEff.width}×${activeEff.height}px to all ${items.length} images`
                                                }
                                                className="w-full inline-flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-lg border border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/15 text-[11px] font-bold text-blue-500 cursor-pointer transition-colors"
                                            >
                                                <Copy className="w-3 h-3" />
                                                <span>{applyAllLabel}</span>
                                            </button>
                                        )}
                                    </div>
                                </div>
                                );
                            })()}
                        </div>
                    </>
                }
                rightStage={
                    <>
                        {/* Stage Top Toolbar */}
                        <div className="px-4 sm:px-6 py-2.5 border-b border-card-border flex flex-wrap items-center justify-between gap-2 text-xs shrink-0">
                            <div className="flex items-center gap-2 text-foreground/70 font-medium">
                                <MoveHorizontal className="w-3.5 h-3.5 text-blue-500" />
                                <span>
                                    {isCompress
                                        ? 'Drag divider to compare Original vs Compressed · Scroll to zoom & drag to pan'
                                        : `True-scale ${stageDisplayW}×${stageDisplayH}px preview (${fitMode}) · 100% = real pixel size`}
                                </span>
                            </div>

                            <div className="flex items-center gap-1.5">
                                <button
                                    type="button"
                                    onPointerDown={() => setShowOriginal(true)}
                                    onPointerUp={() => setShowOriginal(false)}
                                    onPointerLeave={() => setShowOriginal(false)}
                                    onPointerCancel={() => setShowOriginal(false)}
                                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border font-bold cursor-pointer select-none transition-colors ${
                                        showOriginal
                                            ? 'bg-blue-600 text-white border-blue-500'
                                            : 'bg-card-bg border-card-border text-foreground/75 hover:border-blue-500/50'
                                    }`}
                                >
                                    <Eye className="w-3.5 h-3.5" />
                                    <span>{showOriginal ? 'Showing Original' : 'Hold to Compare'}</span>
                                </button>
                            </div>
                        </div>

                        {/* Live Preview Stage with Scroll-Wheel Zoom & Click-Drag Pan */}
                        <StudioViewportStage
                            viewport={viewport}
                            contentWidth={stageDisplayW}
                            contentHeight={stageDisplayH}
                            autoFitKey={studioOpen && activeItem ? activeItem.id : null}
                            footerHint={
                                isResize
                                    ? `${stageDisplayW}×${stageDisplayH}px @ ${Math.round(viewport.zoom * 100)}%`
                                    : previewData
                                      ? `${(previewData.ext || targetExt).toUpperCase()} · ${formatFileSize(previewData.size)}`
                                      : stageDisplayW > 0
                                        ? `${stageDisplayW}×${stageDisplayH}px @ ${Math.round(viewport.zoom * 100)}%`
                                        : undefined
                            }
                        >
                            {activeItem && (() => {
                                const invScale = 1 / Math.max(0.05, viewport.zoom || 1);
                                const visualW = stageDisplayW * (viewport.zoom || 1);
                                const showInFrameLabels = visualW >= 180;
                                return (
                                    <div
                                        ref={splitBoxRef}
                                        data-resize-frame={isResize ? 'true' : undefined}
                                        style={
                                            stageDisplayW > 0 && stageDisplayH > 0
                                                ? {
                                                      width: `${stageDisplayW}px`,
                                                      height: `${stageDisplayH}px`,
                                                  }
                                                : undefined
                                        }
                                        className="relative shrink-0 inline-flex items-center justify-center overflow-hidden select-none"
                                    >
                                        <img
                                            src={showOriginal ? activeItem.sourcePreviewUrl : previewData?.url || activeItem.sourcePreviewUrl}
                                            alt={activeItem.name}
                                            draggable={false}
                                            style={
                                                stageDisplayW > 0 && stageDisplayH > 0
                                                    ? {
                                                          width: `${stageDisplayW}px`,
                                                          height: `${stageDisplayH}px`,
                                                          maxWidth: 'none',
                                                          maxHeight: 'none',
                                                      }
                                                    : undefined
                                            }
                                            className={
                                                stageDisplayW > 0 && stageDisplayH > 0
                                                    ? 'block object-contain'
                                                    : 'block max-w-[78vw] max-h-[62vh] object-contain'
                                            }
                                        />

                                        {/* Split Comparison Overlay in Compress Mode */}
                                        {isCompress && !showOriginal && previewData?.url && (
                                            <>
                                                <img
                                                    src={activeItem.sourcePreviewUrl}
                                                    alt="Original"
                                                    draggable={false}
                                                    className="absolute inset-0 w-full h-full object-contain pointer-events-none select-none"
                                                    style={{ clipPath: `inset(0 ${100 - splitPos}% 0 0)` }}
                                                />
                                                {showInFrameLabels && splitPos > 14 && (
                                                    <span
                                                        style={{
                                                            top: `${10 * invScale}px`,
                                                            left: `${10 * invScale}px`,
                                                            transform: `scale(${invScale})`,
                                                            transformOrigin: 'top left',
                                                        }}
                                                        className="pointer-events-none absolute z-10 px-2.5 py-1 rounded-md bg-slate-950/80 backdrop-blur-sm text-[11px] font-bold uppercase tracking-wider text-white border border-white/15 whitespace-nowrap shadow"
                                                    >
                                                        Original · {formatFileSize(activeItem.size)}
                                                    </span>
                                                )}
                                                {showInFrameLabels && splitPos < 86 && (
                                                    <span
                                                        style={{
                                                            top: `${10 * invScale}px`,
                                                            right: `${10 * invScale}px`,
                                                            transform: `scale(${invScale})`,
                                                            transformOrigin: 'top right',
                                                        }}
                                                        className="pointer-events-none absolute z-10 px-2.5 py-1 rounded-md bg-blue-600/90 backdrop-blur-sm text-[11px] font-bold uppercase tracking-wider text-white border border-white/20 whitespace-nowrap shadow"
                                                    >
                                                        Compressed ({(previewData.ext || targetExt).toUpperCase()}) · {formatFileSize(previewData.size)}
                                                    </span>
                                                )}

                                                <div
                                                    role="slider"
                                                    tabIndex={0}
                                                    aria-label="Original vs Compressed divider"
                                                    aria-valuemin={0}
                                                    aria-valuemax={100}
                                                    aria-valuenow={Math.round(splitPos)}
                                                    onDoubleClick={() => setSplitPos(50)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'ArrowLeft') {
                                                            e.preventDefault();
                                                            setSplitPos((p) => Math.max(0, p - 2));
                                                        } else if (e.key === 'ArrowRight') {
                                                            e.preventDefault();
                                                            setSplitPos((p) => Math.min(100, p + 2));
                                                        }
                                                    }}
                                                    onPointerDown={(e) => {
                                                        e.stopPropagation();
                                                        e.preventDefault();
                                                        setDraggingSplit(true);
                                                        e.currentTarget.setPointerCapture?.(e.pointerId);
                                                        updateSplitFromClientX(e.clientX);
                                                    }}
                                                    onPointerMove={(e) => {
                                                        if (!draggingSplit) return;
                                                        e.stopPropagation();
                                                        updateSplitFromClientX(e.clientX);
                                                    }}
                                                    onPointerUp={(e) => {
                                                        if (!draggingSplit) return;
                                                        e.stopPropagation();
                                                        setDraggingSplit(false);
                                                        e.currentTarget.releasePointerCapture?.(e.pointerId);
                                                    }}
                                                    onPointerCancel={() => setDraggingSplit(false)}
                                                    style={{
                                                        left: `${splitPos}%`,
                                                        width: `${Math.max(20, 28 * invScale)}px`,
                                                        transform: 'translateX(-50%)',
                                                    }}
                                                    className="absolute inset-y-0 z-20 flex items-center justify-center cursor-ew-resize touch-none"
                                                >
                                                    <div
                                                        style={{ width: `${Math.max(1, 2 * invScale)}px` }}
                                                        className="h-full bg-white shadow-[0_0_8px_rgba(0,0,0,0.65)]"
                                                    />
                                                    <div
                                                        style={{ transform: `scale(${invScale})` }}
                                                        className="absolute w-8 h-8 rounded-full bg-white text-blue-600 border-2 border-blue-500 shadow-lg flex items-center justify-center shrink-0"
                                                    >
                                                        <MoveHorizontal className="w-3.5 h-3.5" />
                                                    </div>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                );
                            })()}
                        </StudioViewportStage>

                        <StudioBatchFilmstrip
                            items={items}
                            activeId={activeItem?.id}
                            onSelect={setActiveId}
                            onRemove={handleRemoveItem}
                            onAddClick={() => fileInputRef.current?.click()}
                            renderBadge={(it) => {
                                if (isCompress && it.lastSavedPct !== null && it.lastSavedPct > 0) {
                                    return { text: `-${it.lastSavedPct}%`, tone: 'success' };
                                }
                                return it.width > 0 ? { text: `${it.width}×${it.height}` } : null;
                            }}
                        />
                    </>
                }
            />
        </section>
    );
}
