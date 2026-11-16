import React, { useEffect, useMemo, useRef, useState } from 'react';
import { usePage } from '@inertiajs/react';
import {
    Circle,
    Copy,
    Download,
    Eye,
    FileArchive,
    Loader2,
    Plus,
    RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import {
    buildZipBlob,
    canvasToBlob,
    loadImageFromFileOrUrl,
    renderRoundedCornerCanvas,
    stripExtension,
} from '@/lib/imageConverter';
import { appendDomainToFilename, triggerSiteBlobDownload } from '@/lib/utils';
import { useBatchControl } from '@/lib/useBatchControl';
import { AspectLockButton, clampSvgDim, LockedPixelInput } from '@/components/tools/SvgSizeControls';
import IosBrandProgressBar from '@/components/tools/IosBrandProgressBar';
import StudioColorPicker from '@/components/tools/StudioColorPicker';
import {
    StudioBatchFilmstrip,
    StudioClosedSummaryBar,
    StudioInitialDropZone,
    StudioModalFrame,
    StudioViewportStage,
    useStudioViewport,
} from '@/components/tools/StudioPopupShell';
import WatermarkStudio from '@/components/tools/WatermarkStudio';

/* ───────────────────────────────────────────────────────────────────────────
 * 1. Round Corners & Circle Crop Studio (Full-Width Live Studio Popup)
 * ──────────────────────────────────────────────────────────────────────── */
function RoundCornersStudio({ tool, preloadAsset, onTrackEvent }) {
    const { props } = usePage();
    const websiteInfo = props?.websiteInfo || {};
    const fileRef = useRef(null);
    const itemsRef = useRef([]);
    const activeLoadedRef = useRef(null); // { id, img, width, height, revoke }
    const canvasRef = useRef(null);

    const [items, setItems] = useState([]);
    itemsRef.current = items;
    const [activeId, setActiveId] = useState(null);
    const activeIdRef = useRef(null);
    activeIdRef.current = activeId;
    const batchRunRef = useRef(0);
    const [studioOpen, setStudioOpen] = useState(false);
    const [activeDims, setActiveDims] = useState({ width: 0, height: 0 });
    const [previewTick, setPreviewTick] = useState(0);
    const [showOriginal, setShowOriginal] = useState(false);
    const viewport = useStudioViewport({ minZoom: 0.05, maxZoom: 8, initialZoom: 1 });

    // Style controls
    const [isCircle, setIsCircle] = useState(false);
    const [radiusPct, setRadiusPct] = useState(18);
    const [borderWidth, setBorderWidth] = useState(0);
    const [borderColor, setBorderColor] = useState('#3b82f6');
    const [outWidth, setOutWidth] = useState('');
    const [outHeight, setOutHeight] = useState('');
    const [aspectLocked, setAspectLocked] = useState(true);
    const [lockedRatio, setLockedRatio] = useState(1);

    // Batch export state
    const [exporting, setExporting] = useState(false);
    const [exportProgress, setExportProgress] = useState(0);
    const [exportDoneCount, setExportDoneCount] = useState(0);
    const batchCtrl = useBatchControl();

    const activeItem = items.find((i) => i.id === activeId) || items[0] || null;

    useEffect(() => {
        return () => {
            batchRunRef.current++;
            itemsRef.current.forEach((it) => {
                if (it.sourcePreviewUrl) URL.revokeObjectURL(it.sourcePreviewUrl);
                if (it.processedUrl) URL.revokeObjectURL(it.processedUrl);
            });
            activeLoadedRef.current?.revoke?.();
        };
    }, []);

    const getNaturalDimsForMode = (iw, ih, circle) => {
        const w = circle ? Math.min(iw, ih) : iw;
        const h = circle ? Math.min(iw, ih) : ih;
        return { w, h, ratio: w / Math.max(1, h) };
    };

    const DEFAULT_BORDER = { width: 0, color: '#3b82f6' };
    const clampBorderWidth = (v) => Math.max(0, Math.min(1000, Math.round(Number(v) || 0)));
    const getEffectiveItemBorder = (it) => {
        if (!it?.customBorder) return DEFAULT_BORDER;
        return {
            width: clampBorderWidth(it.customBorder.width),
            color: it.customBorder.color || DEFAULT_BORDER.color,
        };
    };

    const handleFilesAdded = async (list) => {
        const valid = Array.from(list || []).filter((f) => f.type.startsWith('image/'));
        if (!valid.length) {
            toast.error('Please upload valid image files.');
            return;
        }
        const hadExisting = itemsRef.current.length > 0;
        const added = valid.map((f, idx) => ({
            id: `${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 7)}`,
            file: f,
            name: f.name,
            size: f.size,
            sourcePreviewUrl: URL.createObjectURL(f),
            status: 'pending',
            progress: 0,
            processedUrl: null,
            result: null,
            settingsSig: '',
            customSize: null,
            customBorder: null,
        }));
        setItems((prev) => [...prev, ...added]);
        if (!hadExisting || added.length === 1 || !studioOpen) {
            setActiveId(added[0].id);
        }
        setStudioOpen(true);
        if (hadExisting) {
            toast.success(`Added ${added.length} image(s) to studio`);
        }
    };

    // Preload gallery asset if launched with ?asset=
    useEffect(() => {
        if (!preloadAsset?.path) return;
        let cancelled = false;
        fetch(preloadAsset.path)
            .then((r) => (r.ok ? r.blob() : Promise.reject()))
            .then((blob) => {
                if (cancelled) return;
                const ext = (blob.type?.split('/')[1] || 'png').replace('jpeg', 'jpg');
                const file = new File([blob], `${preloadAsset.name || 'asset'}.${ext}`, {
                    type: blob.type || 'image/png',
                });
                handleFilesAdded([file]);
            })
            .catch(() => {});
        return () => {
            cancelled = true;
        };
    }, [preloadAsset?.path]);

    // Decode active image and sync saved per-item or natural output dimensions & border without reprocessing batch
    useEffect(() => {
        const effBorder = getEffectiveItemBorder(activeItem);
        setBorderWidth(effBorder.width);
        setBorderColor(effBorder.color);
        if (!activeItem?.file) {
            activeLoadedRef.current?.revoke?.();
            activeLoadedRef.current = null;
            setActiveDims({ width: 0, height: 0 });
            return;
        }
        let cancelled = false;
        const snapshotCustom = activeItem.customSize;
        loadImageFromFileOrUrl(activeItem.file)
            .then((loaded) => {
                if (cancelled) {
                    loaded.revoke?.();
                    return;
                }
                activeLoadedRef.current?.revoke?.();
                activeLoadedRef.current = { id: activeItem.id, ...loaded };
                const iw = Math.max(1, loaded.width || 512);
                const ih = Math.max(1, loaded.height || 512);
                setActiveDims({ width: iw, height: ih });
                if (snapshotCustom) {
                    const cw = String(snapshotCustom.width ?? iw);
                    const ch = String(snapshotCustom.height ?? ih);
                    const nw = Math.max(1, Number(cw) || iw);
                    const nh = Math.max(1, Number(ch) || ih);
                    setOutWidth(cw);
                    setOutHeight(ch);
                    setAspectLocked(snapshotCustom.aspectLocked ?? true);
                    setLockedRatio(snapshotCustom.lockedRatio || nw / Math.max(1, nh));
                } else {
                    const { w, h, ratio } = getNaturalDimsForMode(iw, ih, isCircle);
                    setOutWidth(String(w));
                    setOutHeight(String(h));
                    setAspectLocked(true);
                    setLockedRatio(ratio);
                }
                setPreviewTick((t) => t + 1);
            })
            .catch(() => toast.error('Failed to decode image'));

        return () => {
            cancelled = true;
        };
    }, [activeItem?.id]);

    const saveActiveCustomSize = (widthStr, heightStr, locked = aspectLocked, ratio = lockedRatio) => {
        if (!activeItem?.id) return;
        const wNum = parseInt(widthStr, 10);
        const hNum = parseInt(heightStr, 10);
        if (!Number.isFinite(wNum) || wNum <= 0 || !Number.isFinite(hNum) || hNum <= 0) return;
        const fallback = getNaturalDimsForMode(activeDims.width || 512, activeDims.height || 512, isCircle);
        const clampedW = String(clampSvgDim(wNum, fallback.w));
        const clampedH = String(clampSvgDim(hNum, fallback.h));
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
                          },
                      }
                    : it
            )
        );
    };

    const handleModeSwitch = (circle) => {
        setIsCircle(circle);
        if (activeItem?.customSize) return;
        if (!activeDims.width || !activeDims.height) return;
        const { w, h, ratio } = getNaturalDimsForMode(activeDims.width, activeDims.height, circle);
        setOutWidth(String(w));
        setOutHeight(String(h));
        setLockedRatio(ratio);
    };

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
                saveActiveCustomSize(rawValue, nextHStr);
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
            saveActiveCustomSize(nextWStr, rawValue);
        }
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
            saveActiveCustomSize(outWidth, outHeight, nextLocked, nextRatio);
        }
    };

    const handleResetSize = () => {
        if (!activeItem) return;
        setItems((prev) =>
            prev.map((it) => (it.id === activeItem.id ? { ...it, customSize: null } : it))
        );
        if (!activeDims.width || !activeDims.height) return;
        const { w, h, ratio } = getNaturalDimsForMode(activeDims.width, activeDims.height, isCircle);
        setOutWidth(String(w));
        setOutHeight(String(h));
        setLockedRatio(ratio);
        setAspectLocked(true);
    };

    const handleApplySizeToAll = () => {
        if (!activeItem || items.length < 2) return;
        const wStr = String(parsedOutW);
        const hStr = String(parsedOutH);
        const ratio = parsedOutW / Math.max(1, parsedOutH);
        setItems((prev) =>
            prev.map((it) => ({
                ...it,
                customSize: {
                    width: wStr,
                    height: hStr,
                    aspectLocked,
                    lockedRatio: ratio,
                },
            }))
        );
        toast.success(`Applied ${wStr}×${hStr}px to all ${items.length} images`);
    };

    const saveActiveCustomBorder = (nextWidth, nextColor) => {
        const w = clampBorderWidth(nextWidth);
        const c = nextColor || DEFAULT_BORDER.color;
        setBorderWidth(w);
        setBorderColor(c);
        if (!activeItem?.id) return;
        const isDefault = w === DEFAULT_BORDER.width && c === DEFAULT_BORDER.color;
        setItems((prev) =>
            prev.map((it) =>
                it.id === activeItem.id
                    ? {
                          ...it,
                          customBorder: isDefault ? null : { width: w, color: c },
                      }
                    : it
            )
        );
    };

    const handleResetBorder = () => {
        setBorderWidth(DEFAULT_BORDER.width);
        setBorderColor(DEFAULT_BORDER.color);
        if (!activeItem?.id) return;
        setItems((prev) =>
            prev.map((it) => (it.id === activeItem.id ? { ...it, customBorder: null } : it))
        );
    };

    const handleApplyBorderToAll = () => {
        if (!activeItem || items.length < 2) return;
        const w = clampBorderWidth(borderWidth);
        const c = borderColor || DEFAULT_BORDER.color;
        const nextCustomBorder = w === 0 ? null : { width: w, color: c };
        if (w === 0) setBorderColor(DEFAULT_BORDER.color);
        setItems((prev) =>
            prev.map((it) => ({
                ...it,
                customBorder: nextCustomBorder,
            }))
        );
        toast.success(
            w > 0
                ? `Applied ${w}px border to all ${items.length} images`
                : `Removed border from all ${items.length} images`
        );
    };

    const handleSelectActive = (id) => {
        setActiveId(id);
        const target = itemsRef.current.find((it) => it.id === id) || null;
        const effBorder = getEffectiveItemBorder(target);
        setBorderWidth(effBorder.width);
        setBorderColor(effBorder.color);
    };

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
        batchRunRef.current++;
        itemsRef.current.forEach((it) => {
            if (it.sourcePreviewUrl) URL.revokeObjectURL(it.sourcePreviewUrl);
            if (it.processedUrl) URL.revokeObjectURL(it.processedUrl);
        });
        activeLoadedRef.current?.revoke?.();
        activeLoadedRef.current = null;
        setItems([]);
        setActiveId(null);
        setActiveDims({ width: 0, height: 0 });
        setStudioOpen(false);
    };

    const activeFallbackW = isCircle ? Math.min(activeDims.width || 512, activeDims.height || 512) : activeDims.width || 512;
    const activeFallbackH = isCircle ? Math.min(activeDims.width || 512, activeDims.height || 512) : activeDims.height || 512;
    const parsedOutW = clampSvgDim(
        activeItem?.customSize ? activeItem.customSize.width : outWidth,
        activeFallbackW
    );
    const parsedOutH = clampSvgDim(
        activeItem?.customSize ? activeItem.customSize.height : outHeight,
        activeFallbackH
    );

    // Real-time canvas draw whenever settings or active decoded image change
    useEffect(() => {
        if (!studioOpen || !activeLoadedRef.current?.img || !canvasRef.current) return;
        const target = canvasRef.current;
        const raf = requestAnimationFrame(() => {
            const rendered = renderRoundedCornerCanvas(activeLoadedRef.current.img, {
                isCircle,
                radiusPct,
                borderWidth,
                borderColor,
                outerBackground: 'transparent',
                targetWidth: parsedOutW,
                targetHeight: parsedOutH,
            });
            target.width = rendered.width;
            target.height = rendered.height;
            target.getContext('2d').drawImage(rendered, 0, 0);
        });
        return () => cancelAnimationFrame(raf);
    }, [studioOpen, previewTick, isCircle, radiusPct, borderWidth, borderColor, parsedOutW, parsedOutH]);

    const renderItemToBlob = async (row) => {
        const loaded = await loadImageFromFileOrUrl(row.file);
        try {
            const iw = Math.max(1, loaded.width || 512);
            const ih = Math.max(1, loaded.height || 512);
            const fallback = getNaturalDimsForMode(iw, ih, isCircle);
            const w = row.customSize ? clampSvgDim(row.customSize.width, fallback.w) : fallback.w;
            const h = row.customSize ? clampSvgDim(row.customSize.height, fallback.h) : fallback.h;

            const b = getEffectiveItemBorder(row);
            const rendered = renderRoundedCornerCanvas(loaded.img, {
                isCircle,
                radiusPct,
                borderWidth: b.width,
                borderColor: b.color,
                outerBackground: 'transparent',
                targetWidth: w,
                targetHeight: h,
            });
            const blob = await canvasToBlob(rendered, 'image/png', 1);
            return {
                blob,
                filename: `${stripExtension(row.name)}-rounded.png`,
                width: rendered.width,
                height: rendered.height,
            };
        } finally {
            loaded.revoke?.();
        }
    };

    const baseSettingsSig = useMemo(
        () => `${isCircle}|${radiusPct}`,
        [isCircle, radiusPct]
    );
    const getItemSettingsSig = (it) => {
        const sizeSig = it?.customSize
            ? `custom:${clampSvgDim(it.customSize.width, 512)}x${clampSvgDim(it.customSize.height, 512)}`
            : 'nat';
        const b = getEffectiveItemBorder(it);
        const borderSig = b.width > 0 ? `b:${b.width}:${b.color}` : 'b:0';
        return `${baseSettingsSig}|${sizeSig}|${borderSig}`;
    };
    const itemsSignatureKey = items.map((it) => `${it.id}:${getItemSettingsSig(it)}`).join('|');
    const doneCount = items.filter((it) => it.status === 'done' && it.settingsSig === getItemSettingsSig(it)).length;
    const batchProcessing = items.length > 0 && doneCount < items.length;
    const batchProgressPct = items.length > 0 ? Math.round((doneCount / items.length) * 100) : 0;

    // Automatically pre-render only stale/unprocessed items whenever files or settings/item size change
    useEffect(() => {
        if (!itemsRef.current.length) return undefined;

        const stale = itemsRef.current.filter(
            (it) => it.settingsSig !== getItemSettingsSig(it) || it.status === 'pending' || it.status === 'processing'
        );
        if (!stale.length) return undefined;

        const runId = ++batchRunRef.current;
        const staleSet = new Set(stale.map((it) => it.id));

        setItems((prev) =>
            prev.map((it) =>
                staleSet.has(it.id)
                    ? { ...it, status: 'pending', progress: 0 }
                    : it
            )
        );

        const timer = setTimeout(async () => {
            const processedInRun = new Set();

            while (batchRunRef.current === runId) {
                const candidates = itemsRef.current.filter(
                    (it) =>
                        !processedInRun.has(it.id) &&
                        (staleSet.has(it.id) || it.settingsSig !== getItemSettingsSig(it) || it.status === 'pending')
                );
                if (!candidates.length) break;

                const nextRow =
                    candidates.find((it) => it.id === activeIdRef.current) || candidates[0];
                processedInRun.add(nextRow.id);

                setItems((prev) =>
                    prev.map((it) =>
                        it.id === nextRow.id ? { ...it, status: 'processing', progress: 40 } : it
                    )
                );
                await new Promise((r) => requestAnimationFrame(r));
                if (batchRunRef.current !== runId) break;

                try {
                    const rowSig = getItemSettingsSig(nextRow);
                    const res = await renderItemToBlob(nextRow);
                    if (batchRunRef.current !== runId) break;
                    const nextUrl = URL.createObjectURL(res.blob);

                    setItems((prev) =>
                        prev.map((it) => {
                            if (it.id !== nextRow.id) return it;
                            if (it.processedUrl && it.processedUrl !== nextUrl) {
                                URL.revokeObjectURL(it.processedUrl);
                            }
                            return {
                                ...it,
                                status: 'done',
                                progress: 100,
                                processedUrl: nextUrl,
                                result: res,
                                settingsSig: rowSig,
                            };
                        })
                    );
                } catch {
                    if (batchRunRef.current !== runId) break;
                    setItems((prev) =>
                        prev.map((it) =>
                            it.id === nextRow.id ? { ...it, status: 'error', progress: 0 } : it
                        )
                    );
                }
            }
        }, 120);

        return () => clearTimeout(timer);
    }, [itemsSignatureKey]);

    const handleDownloadCurrent = async () => {
        if (!activeItem) return;
        try {
            const activeSig = getItemSettingsSig(activeItem);
            const res =
                activeItem.status === 'done' &&
                activeItem.settingsSig === activeSig &&
                activeItem.result?.blob
                    ? activeItem.result
                    : await renderItemToBlob(activeItem);
            triggerSiteBlobDownload(res.blob, res.filename, websiteInfo);
            onTrackEvent?.({
                slug: tool.slug,
                eventType: 'convert',
                filesCount: 1,
                inputBytes: activeItem.size,
                outputBytes: res.blob.size,
            });
            toast.success(`Downloaded ${res.width}×${res.height} PNG!`);
        } catch {
            toast.error('Failed to render rounded image');
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
                const res =
                    row.status === 'done' && row.settingsSig === rowSig && row.result?.blob
                        ? row.result
                        : await renderItemToBlob(row);
                const tagged = appendDomainToFilename(res.filename, websiteInfo);
                const count = (usedNames.get(tagged) || 0) + 1;
                usedNames.set(tagged, count);
                const uniqueName = count === 1 ? tagged : tagged.replace(/(\.[^.]+)$/, `-${count}$1`);

                entries.push({ filename: uniqueName, blob: res.blob });
                inSum += row.size;
                outSum += res.blob.size;
                setExportDoneCount(i + 1);
                setExportProgress(Math.round(((i + 1) / items.length) * 100));
                await new Promise((r) => requestAnimationFrame(r));
            }

            if (entries.length === 1 && items.length === 1) {
                triggerSiteBlobDownload(entries[0].blob, entries[0].filename, websiteInfo);
            } else if (entries.length > 0) {
                const zipBlob = await buildZipBlob(entries);
                triggerSiteBlobDownload(zipBlob, 'rounded-images.zip', websiteInfo);
                onTrackEvent?.({
                    slug: tool.slug,
                    eventType: 'convert',
                    filesCount: entries.length,
                    inputBytes: inSum,
                    outputBytes: outSum,
                });
                toast.success(`Exported ${entries.length} rounded PNGs as ZIP!`);
            }
        } catch {
            toast.error('Failed to export batch ZIP');
        } finally {
            setExporting(false);
        }
    };

    return (
        <section className="w-full space-y-6">
            <input
                ref={fileRef}
                type="file"
                multiple
                accept={tool.accept}
                className="hidden"
                onChange={(e) => {
                    if (e.target.files?.length) handleFilesAdded(e.target.files);
                    e.target.value = '';
                }}
            />

            {/* Initial Drop Zone (disappears once images are uploaded) */}
            {items.length === 0 && (
                <StudioInitialDropZone
                    icon={Circle}
                    title="Drop an image here, or click to round corners & craft circle avatars"
                    subtitle="PNG, JPG, WebP, or SVG · Real-time transparent corners, custom size & borders in your browser"
                    onFiles={handleFilesAdded}
                    onClick={() => fileRef.current?.click()}
                />
            )}

            {/* Compact Queue Summary when closed */}
            {items.length > 0 && !studioOpen && (
                <StudioClosedSummaryBar
                    thumbs={items.map((it) => ({ id: it.id, url: it.sourcePreviewUrl, name: it.name }))}
                    fallbackIcon={Circle}
                    title={
                        items.length === 1
                            ? items[0].name
                            : `${items.length} images ready for corner rounding`
                    }
                    subtitle={`${isCircle ? 'Circle Avatar' : `Rounded ${radiusPct}%`} · ${parsedOutW}×${parsedOutH}px${borderWidth > 0 ? ` · ${borderWidth}px border` : ''}`}
                    onAddClick={() => fileRef.current?.click()}
                    addLabel="Upload Another Image"
                    onOpenStudio={() => setStudioOpen(true)}
                    onPrimaryAction={items.length > 1 ? handleDownloadAllZip : handleDownloadCurrent}
                    primaryLabel={
                        items.length > 1
                            ? `Download All (${items.length}) .zip`
                            : `Download PNG (${parsedOutW}×${parsedOutH})`
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
                ariaLabel="Live Round Corners and Avatar Studio"
                icon={Circle}
                title={activeItem?.name || 'Round Corners Studio'}
                subtitle={
                    exporting
                        ? `Exporting ${exportDoneCount} of ${items.length} (${exportProgress}%)...`
                        : 'All corner, size & border edits update live with transparent PNG alpha'
                }
                badges={
                    <>
                        {activeDims.width > 0 && (
                            <span className="px-2 py-0.5 rounded-md bg-background border border-card-border font-mono text-[10px] text-foreground/65">
                                {activeDims.width}×{activeDims.height} → {parsedOutW}×{parsedOutH}px
                            </span>
                        )}
                        <span className="px-2 py-0.5 rounded-md bg-blue-500/10 border border-blue-500/25 font-mono text-[10px] font-bold text-blue-500">
                            {Math.max(1, items.findIndex((i) => i.id === activeItem?.id) + 1)} / {items.length}
                        </span>
                    </>
                }
                onFilesDrop={handleFilesAdded}
                dropOverlayTitle="Drop images to add to studio"
                dropOverlaySubtitle="Batch round-corner and circle avatar export ready"
                topSubBar={
                    (exporting || batchProcessing) && (
                        <div className="px-5 py-2 border-b border-card-border bg-background/60 shrink-0 space-y-1">
                            <div className="flex items-center justify-between text-[11px] font-semibold text-foreground/70">
                                <span>
                                    {exporting
                                        ? `Packing ZIP archive (${exportDoneCount} / ${items.length})...`
                                        : `Rendering corners in background (${doneCount} / ${items.length})...`}
                                </span>
                                <span className="font-mono font-bold text-blue-500">
                                    {exporting ? exportProgress : batchProgressPct}%
                                </span>
                            </div>
                            <IosBrandProgressBar
                                progress={exporting ? exportProgress : batchProgressPct}
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
                            onClick={() => fileRef.current?.click()}
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
                                      : `Download PNG (${parsedOutW}×${parsedOutH})`}
                            </span>
                        </button>
                    </>
                }
                leftSidebar={
                    <>
                        {/* Shape Mode */}
                        <div className="space-y-2">
                            <span className="font-bold text-foreground/75 uppercase tracking-wider text-[11px] block">
                                Crop Shape
                            </span>
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    type="button"
                                    onClick={() => handleModeSwitch(false)}
                                    className={`py-2 rounded-xl font-bold border cursor-pointer transition-all ${
                                        !isCircle
                                            ? 'bg-blue-600 text-white border-blue-500 shadow-sm'
                                            : 'bg-card-bg border-card-border text-foreground/75 hover:border-blue-500/40'
                                    }`}
                                >
                                    Rounded Box
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleModeSwitch(true)}
                                    className={`py-2 rounded-xl font-bold border cursor-pointer transition-all ${
                                        isCircle
                                            ? 'bg-blue-600 text-white border-blue-500 shadow-sm'
                                            : 'bg-card-bg border-card-border text-foreground/75 hover:border-blue-500/40'
                                    }`}
                                >
                                    Circle Avatar
                                </button>
                            </div>
                        </div>

                        {/* Custom Output Size with Aspect Ratio Lock */}
                        <div className="space-y-2 pt-2 border-t border-card-border">
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
                                <button
                                    type="button"
                                    onClick={handleResetSize}
                                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-500 hover:underline cursor-pointer"
                                    title="Reset to source size"
                                >
                                    <RefreshCw className="w-3 h-3" />
                                    <span>Reset</span>
                                </button>
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
                            {items.length > 1 && parsedOutW > 0 && parsedOutH > 0 && (
                                <button
                                    type="button"
                                    onClick={handleApplySizeToAll}
                                    title={`Apply ${parsedOutW}×${parsedOutH}px to all ${items.length} images`}
                                    className="w-full inline-flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-lg border border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/15 text-[11px] font-bold text-blue-500 cursor-pointer transition-colors"
                                >
                                    <Copy className="w-3 h-3" />
                                    <span>
                                        Apply {parsedOutW}×{parsedOutH} to all ({items.length})
                                    </span>
                                </button>
                            )}
                        </div>

                        {/* Corner Radius */}
                        {!isCircle && (
                            <div className="space-y-2 pt-2 border-t border-card-border">
                                <div className="flex justify-between font-bold">
                                    <span className="text-foreground/75">Corner Radius</span>
                                    <span className="font-mono text-blue-500">{radiusPct}%</span>
                                </div>
                                <input
                                    type="range"
                                    min={0}
                                    max={50}
                                    value={radiusPct}
                                    onChange={(e) => setRadiusPct(Number(e.target.value))}
                                    className="w-full accent-blue-500 cursor-pointer"
                                />
                                <div className="grid grid-cols-4 gap-1.5">
                                    {[0, 12, 24, 50].map((v) => (
                                        <button
                                            key={v}
                                            type="button"
                                            onClick={() => setRadiusPct(v)}
                                            className={`py-1 rounded-lg border text-[11px] font-mono font-bold cursor-pointer ${
                                                radiusPct === v
                                                    ? 'bg-blue-600 text-white border-blue-500'
                                                    : 'bg-card-bg border-card-border text-foreground/70 hover:border-blue-500/40'
                                            }`}
                                        >
                                            {v}%
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Border Width & Color */}
                        <div className="space-y-2 pt-2 border-t border-card-border">
                            <div className="flex items-center justify-between gap-2 font-bold">
                                <span className="text-foreground/75 flex items-center gap-1.5">
                                    Border Width
                                    {activeItem?.customBorder && (
                                        <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-500">
                                            Custom
                                        </span>
                                    )}
                                </span>
                                <div className="flex items-center gap-1.5">
                                    {activeItem?.customBorder && (
                                        <button
                                            type="button"
                                            onClick={handleResetBorder}
                                            className="text-[10px] font-bold text-foreground/60 hover:text-blue-500 transition-colors cursor-pointer"
                                        >
                                            Reset
                                        </button>
                                    )}
                                    <div className="flex items-center gap-1 bg-input-bg border border-input-border rounded-lg px-2 py-1 focus-within:border-blue-500">
                                        <input
                                            type="number"
                                            min={0}
                                            max={1000}
                                            value={borderWidth}
                                            aria-label="Border width in pixels"
                                            onChange={(e) => saveActiveCustomBorder(e.target.value, borderColor)}
                                            className="w-14 bg-transparent font-mono text-right text-blue-500 focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                                        />
                                        <span className="font-mono text-[10px] text-foreground/55 select-none">px</span>
                                    </div>
                                </div>
                            </div>
                            <input
                                type="range"
                                min={0}
                                max={200}
                                value={Math.min(200, borderWidth)}
                                onChange={(e) => saveActiveCustomBorder(e.target.value, borderColor)}
                                className="w-full accent-blue-500 cursor-pointer"
                            />
                            {borderWidth > 0 && (
                                <div className="flex items-center justify-between pt-1">
                                    <span className="font-bold text-foreground/75">Border Color</span>
                                    <StudioColorPicker
                                        value={borderColor}
                                        onChange={(c) => saveActiveCustomBorder(borderWidth, c)}
                                        ariaLabel="Border color"
                                        showHexLabel
                                    />
                                </div>
                            )}
                            {items.length > 1 && (
                                <button
                                    type="button"
                                    onClick={handleApplyBorderToAll}
                                    className="w-full py-1.5 px-2.5 rounded-lg bg-foreground/5 hover:bg-blue-500/10 border border-card-border hover:border-blue-500/40 text-[10px] font-bold text-foreground/80 hover:text-blue-500 transition-colors cursor-pointer"
                                >
                                    {borderWidth > 0
                                        ? `Apply ${borderWidth}px border to all (${items.length})`
                                        : `Apply no border to all (${items.length})`}
                                </button>
                            )}
                        </div>
                    </>
                }
                rightStage={
                    <>
                        {/* Stage Top Bar */}
                        <div className="px-4 sm:px-6 py-2.5 border-b border-card-border flex flex-wrap items-center justify-between gap-2 text-xs shrink-0">
                            <span className="text-foreground/65 font-medium">
                                Transparent checkerboard live PNG output preview · Scroll to zoom & drag to pan
                            </span>
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

                        {/* Checkerboard Live Canvas with Scroll-Wheel Zoom & Drag Pan (No shadow on output preview) */}
                        <StudioViewportStage
                            viewport={viewport}
                            contentWidth={parsedOutW}
                            contentHeight={parsedOutH}
                            autoFitKey={
                                studioOpen && activeItem && activeDims.width > 0
                                    ? `${activeItem.id}-${activeDims.width}x${activeDims.height}`
                                    : null
                            }
                            footerHint={`${parsedOutW}×${parsedOutH}px PNG`}
                        >
                            <div
                                style={{
                                    width: `${parsedOutW}px`,
                                    height: `${parsedOutH}px`,
                                }}
                                className="relative shrink-0 flex items-center justify-center"
                            >
                                {showOriginal && activeItem && (
                                    <img
                                        src={activeItem.sourcePreviewUrl}
                                        alt={activeItem.name}
                                        draggable={false}
                                        style={{
                                            width: `${parsedOutW}px`,
                                            height: `${parsedOutH}px`,
                                            maxWidth: 'none',
                                            maxHeight: 'none',
                                        }}
                                        className="block object-contain"
                                    />
                                )}
                                <canvas
                                    ref={canvasRef}
                                    data-round-preview="true"
                                    style={{
                                        width: `${parsedOutW}px`,
                                        height: `${parsedOutH}px`,
                                        maxWidth: 'none',
                                        maxHeight: 'none',
                                    }}
                                    className={`${showOriginal && activeItem ? 'hidden' : 'block'}`}
                                />
                            </div>
                        </StudioViewportStage>

                        <StudioBatchFilmstrip
                            items={items}
                            activeId={activeItem?.id}
                            onSelect={handleSelectActive}
                            onRemove={handleRemoveItem}
                            onAddClick={() => fileRef.current?.click()}
                        />
                    </>
                }
            />
        </section>
    );
}

export default function ImageEditStudios(props) {
    switch (props.tool.mode) {
        case 'round-corners':
            return <RoundCornersStudio {...props} />;
        case 'watermark':
            return <WatermarkStudio {...props} />;
        default:
            return null;
    }
}
