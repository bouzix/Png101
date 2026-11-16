import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Head, Link, usePage } from '@inertiajs/react';
import {
    ArrowLeft,
    ArrowLeftRight,
    ArrowRight,
    ChevronDown,
    Download,
    Eraser,
    FileArchive,
    Image as ImageIcon,
    Layers,
    Pipette,
    RefreshCw,
    Sliders,
    Sparkles,
    Trash2,
    UploadCloud,
    AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';
import Header from '@/components/Header';
import StudioSelect from '@/components/ui/StudioSelect';
import {
    buildZipBlob,
    checkAvifEncodeSupport,
    convertImageFile,
    DEFAULT_ICO_SIZES,
    formatFileSize,
    inspectSvgFile,
    stripExtension,
} from '@/lib/imageConverter';
import BgRemoverStudio from '@/components/tools/BgRemoverStudio';
import PackGeneratorStudio from '@/components/tools/PackGeneratorStudio';
import ImageEditStudios from '@/components/tools/ImageEditStudios';
import CompressResizeStudio from '@/components/tools/CompressResizeStudio';
import { appendDomainToFilename } from '@/lib/utils';
import { useBatchControl } from '@/lib/useBatchControl';
import DevToolsStudios from '@/components/tools/DevToolsStudios';
import StudioColorPicker from '@/components/tools/StudioColorPicker';
import BatchProgressHeader from '@/components/tools/BatchProgressHeader';
import BatchAssetGridCard from '@/components/tools/BatchAssetGridCard';
import IosBrandProgressBar from '@/components/tools/IosBrandProgressBar';
import {
    AspectLockButton,
    clampSvgDim,
    computeSvgTargetDims,
    LockedPixelInput,
    SvgCardDimensionEditor,
    SvgGlobalSizeBar,
} from '@/components/tools/SvgSizeControls';

function trackToolEvent(payload) {
    try {
        fetch('/api/tools/track', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        }).catch(() => { });
    } catch {
        // Ignore
    }
}

export default function ConvertTool({ seo = {}, tool, preloadAsset = null }) {
    const { props } = usePage();
    const websiteInfo = props?.websiteInfo || {};
    const siteName = websiteInfo?.websiteName || 'Png101';
    const baseUrl = (websiteInfo?.websiteUrl || (typeof window !== 'undefined' ? window.location.origin : '')).replace(/\/+$/, '');

    const isConverterTool = tool.category === 'converters';
    const isBgRemover = tool.mode === 'bg-remove';
    const isResizer = tool.mode === 'resize';
    const isCompressor = tool.mode === 'compress';
    const isSvgMode = tool.mode === 'svg-to-png';
    const isIcoMode = tool.mode === 'ico';
    const isPackMode = ['favicon-pack', 'app-icons'].includes(tool.mode);
    const isEditStudioMode = ['round-corners', 'watermark'].includes(tool.mode);
    const isCompressResizeMode = ['compress', 'resize'].includes(tool.mode);
    const isDevStudioMode = ['base64', 'svg-optimize', 'palette', 'metadata-strip'].includes(tool.mode);
    const isCustomStudioMode = isPackMode || isEditStudioMode || isCompressResizeMode || isDevStudioMode || isBgRemover;

    // Format conversion options
    const [quality, setQuality] = useState(tool.defaultQuality || 88);
    const [outputMimeOverride, setOutputMimeOverride] = useState(tool.targetMime || 'image/png');
    const [outputExtOverride, setOutputExtOverride] = useState(tool.targetExt || 'png');
    const [bgFillColor, setBgFillColor] = useState('#ffffff');
    const [svgSizeMode, setSvgSizeMode] = useState('scale');
    const [svgScale, setSvgScale] = useState(2);
    const [svgTargetWidth, setSvgTargetWidth] = useState(512);
    const [svgGlobalWidth, setSvgGlobalWidth] = useState('512');
    const [svgGlobalHeight, setSvgGlobalHeight] = useState('512');
    const [svgGlobalLocked, setSvgGlobalLocked] = useState(true);
    const [svgGlobalRatio, setSvgGlobalRatio] = useState(1);
    const [svgFitMode, setSvgFitMode] = useState('contain');
    const [icoSizes, setIcoSizes] = useState(DEFAULT_ICO_SIZES);

    // Resize options
    const [resizeEnabled, setResizeEnabled] = useState(isResizer);
    const [resizeWidth, setResizeWidth] = useState('1080');
    const [resizeHeight, setResizeHeight] = useState('1080');
    const [resizeLocked, setResizeLocked] = useState(true);
    const [resizeRatio, setResizeRatio] = useState(1);
    const [fitMode, setFitMode] = useState('contain');

    // Batch queue state
    const [items, setItems] = useState([]);
    const itemsRef = useRef([]);
    itemsRef.current = items;
    const activeRunIdRef = useRef(0);
    const [queueViewMode, setQueueViewMode] = useState('list');
    const [isDragging, setIsDragging] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [zipping, setZipping] = useState(false);
    const batchCtrl = useBatchControl();
    const [avifSupported, setAvifSupported] = useState(true);
    const [openFaqIndex, setOpenFaqIndex] = useState(0);
    const fileInputRef = useRef(null);
    const prevToolSlugRef = useRef(tool.slug);

    useEffect(() => {
        if (prevToolSlugRef.current !== tool.slug) {
            prevToolSlugRef.current = tool.slug;
            setQuality(tool.defaultQuality || 88);
            setOutputMimeOverride(tool.targetMime || 'image/png');
            setOutputExtOverride(tool.targetExt || 'png');
            setResizeEnabled(isResizer);
        }
        setOpenFaqIndex(0);
        trackToolEvent({ slug: tool.slug, eventType: 'view' });
        if (tool.targetMime === 'image/avif' || isCompressor || isResizer) {
            checkAvifEncodeSupport().then((ok) => setAvifSupported(Boolean(ok)));
        }
    }, [tool.slug]);

    useEffect(() => {
        return () => {
            items.forEach((item) => {
                if (item.sourcePreviewUrl) URL.revokeObjectURL(item.sourcePreviewUrl);
                if (item.result?.url) URL.revokeObjectURL(item.result.url);
            });
        };
    }, []);

    // Load asset handed off from PNG catalog (?asset=/uploads/...) if enabled
    useEffect(() => {
        if (!preloadAsset?.path || isCustomStudioMode) return;
        let cancelled = false;

        fetch(preloadAsset.path)
            .then((res) => (res.ok ? res.blob() : Promise.reject(new Error('Could not load asset'))))
            .then((blob) => {
                if (cancelled) return;
                const ext = (blob.type?.split('/')[1] || 'png').replace('jpeg', 'jpg');
                const file = new File([blob], `${preloadAsset.name || 'asset'}.${ext}`, {
                    type: blob.type || 'image/png',
                });
                enqueueFiles([file]);
            })
            .catch(() => { });

        return () => {
            cancelled = true;
        };
    }, [preloadAsset?.path]);

    const runConversionForItems = async (targetItems, optionsOverride = {}) => {
        if (!targetItems.length) return;
        const runId = ++activeRunIdRef.current;
        batchCtrl.reset();
        setProcessing(true);

        const activeTargetMime = isCompressor || isResizer ? outputMimeOverride : tool.targetMime;
        const activeTargetExt = isCompressor || isResizer ? outputExtOverride : tool.targetExt;

        let convertedCount = 0;
        let totalIn = 0;
        let totalOut = 0;

        for (const item of targetItems) {
            if (activeRunIdRef.current !== runId) {
                return;
            }

            if (await batchCtrl.waitIfPausedOrStopped()) {
                if (activeRunIdRef.current !== runId) {
                    return;
                }
                setItems((prev) =>
                    prev.map((row) =>
                        row.status === 'pending' ? { ...row, status: 'stopped' } : row
                    )
                );
                toast.info('Batch processing stopped.');
                break;
            }

            if (activeRunIdRef.current !== runId) {
                return;
            }

            setItems((prev) =>
                prev.map((row) =>
                    row.id === item.id ? { ...row, status: 'converting', progress: 10, error: null } : row
                )
            );
            await new Promise((r) => requestAnimationFrame(r));

            if (activeRunIdRef.current !== runId) {
                return;
            }

            const itemTargetWidth = isSvgMode
                ? (item.targetWidth ?? (Number(item.draftWidth) || null))
                : isConverterTool ? null : resizeEnabled ? Number(resizeWidth) || null : null;
            const itemTargetHeight = isSvgMode
                ? (item.targetHeight ?? (Number(item.draftHeight) || null))
                : isConverterTool ? null : resizeEnabled ? Number(resizeHeight) || null : null;
            const itemFitMode = isSvgMode
                ? (optionsOverride.fitMode ?? item.fitMode ?? (svgSizeMode === 'custom' ? svgFitMode : 'contain'))
                : fitMode;

            try {
                const res = await convertImageFile(item.file, {
                    mode: tool.mode,
                    targetMime: activeTargetMime,
                    targetExt: activeTargetExt,
                    quality: isConverterTool ? (tool.defaultQuality || 88) / 100 : quality / 100,
                    scale: isSvgMode ? (Number(svgScale) || 2) : 1,
                    targetWidth: itemTargetWidth,
                    targetHeight: itemTargetHeight,
                    fitMode: itemFitMode,
                    backgroundColor: !tool.supportsTransparency ? (isConverterTool ? '#ffffff' : bgFillColor) : null,
                    icoSizes: isConverterTool ? DEFAULT_ICO_SIZES : icoSizes,
                    onProgress: (pct) => {
                        if (activeRunIdRef.current !== runId) return;
                        setItems((prev) =>
                            prev.map((row) => (row.id === item.id ? { ...row, progress: pct } : row))
                        );
                    },
                });

                if (activeRunIdRef.current !== runId) {
                    if (res?.url) URL.revokeObjectURL(res.url);
                    res?.icoEntries?.forEach((entry) => entry?.url && URL.revokeObjectURL(entry.url));
                    return;
                }

                convertedCount += 1;
                totalIn += item.file.size || 0;
                totalOut += res.size || 0;

                setItems((prev) =>
                    prev.map((row) => {
                        if (row.id !== item.id) return row;
                        if (row.result?.url) URL.revokeObjectURL(row.result.url);
                        row.result?.icoEntries?.forEach((entry) => entry?.url && URL.revokeObjectURL(entry.url));
                        return { ...row, status: 'done', progress: 100, result: res, error: null };
                    })
                );
            } catch (err) {
                if (activeRunIdRef.current !== runId) {
                    return;
                }
                setItems((prev) =>
                    prev.map((row) =>
                        row.id === item.id
                            ? { ...row, status: 'error', progress: 0, error: err?.message || 'Conversion failed' }
                            : row
                    )
                );
            }
        }

        if (activeRunIdRef.current !== runId) {
            return;
        }

        if (convertedCount > 0 && !optionsOverride.skipTracking) {
            trackToolEvent({
                slug: tool.slug,
                eventType: 'convert',
                filesCount: convertedCount,
                inputBytes: totalIn,
                outputBytes: totalOut,
            });
        }

        setProcessing(false);
    };

    const isLiveSettingsTool = isCompressor || isResizer;
    const liveSettingsSig = useMemo(
        () =>
            JSON.stringify([
                outputMimeOverride,
                outputExtOverride,
                quality,
                resizeEnabled,
                resizeEnabled ? resizeWidth : null,
                resizeEnabled ? resizeHeight : null,
                resizeEnabled ? fitMode : null,
            ]),
        [outputMimeOverride, outputExtOverride, quality, resizeEnabled, resizeWidth, resizeHeight, fitMode]
    );
    const prevLiveSettingsSigRef = useRef(liveSettingsSig);
    const prevLiveToolSlugRef = useRef(tool.slug);

    // Live auto-apply when Output Settings change on Compressor / Resizer
    useEffect(() => {
        if (!isLiveSettingsTool || prevLiveToolSlugRef.current !== tool.slug) {
            prevLiveToolSlugRef.current = tool.slug;
            prevLiveSettingsSigRef.current = liveSettingsSig;
            return;
        }
        if (prevLiveSettingsSigRef.current === liveSettingsSig) return;
        prevLiveSettingsSigRef.current = liveSettingsSig;

        if (!itemsRef.current.length) return;
        if (resizeEnabled && (Number(resizeWidth) || 0) <= 0 && (Number(resizeHeight) || 0) <= 0) {
            return;
        }

        const delay = outputMimeOverride === 'image/avif' ? 500 : 280;
        const timer = setTimeout(() => {
            const latest = itemsRef.current;
            if (!latest.length) return;
            const queued = latest.map((row) => ({
                ...row,
                status: 'pending',
                progress: 0,
                error: null,
            }));
            setItems(queued);
            runConversionForItems(queued, { skipTracking: true });
        }, delay);

        return () => clearTimeout(timer);
    }, [isLiveSettingsTool, tool.slug, liveSettingsSig]);

    const enqueueFiles = async (fileList) => {
        const files = Array.from(fileList || []).filter((f) => f && (f.type.startsWith('image/') || /\.(png|jpe?g|webp|avif|svg|bmp|gif)$/i.test(f.name)));
        if (files.length === 0) {
            toast.error('Please choose valid image files.');
            return;
        }

        let newItems;
        if (isSvgMode) {
            const inspected = await Promise.all(
                files.map(async (file) => ({ file, info: await inspectSvgFile(file) }))
            );
            newItems = inspected.map(({ file, info }, idx) => {
                const target = computeSvgTargetDims(info.width, info.height, {
                    sizeMode: svgSizeMode,
                    scale: svgScale,
                    targetWidth: svgTargetWidth,
                    globalWidth: svgGlobalWidth,
                    globalHeight: svgGlobalHeight,
                });
                return {
                    id: `${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 7)}`,
                    file,
                    name: file.name,
                    size: file.size,
                    sourcePreviewUrl: URL.createObjectURL(file),
                    sourceWidth: info.width,
                    sourceHeight: info.height,
                    draftWidth: String(target.width),
                    draftHeight: String(target.height),
                    targetWidth: target.width,
                    targetHeight: target.height,
                    fitMode: svgSizeMode === 'custom' ? svgFitMode : 'contain',
                    aspectLocked: true,
                    isCustomSize: false,
                    status: 'pending',
                    progress: 0,
                    result: null,
                    error: null,
                };
            });
        } else {
            newItems = files.map((file, idx) => ({
                id: `${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 7)}`,
                file,
                name: file.name,
                size: file.size,
                sourcePreviewUrl: URL.createObjectURL(file),
                status: 'pending',
                progress: 0,
                result: null,
                error: null,
            }));
        }

        setItems((prev) => [...prev, ...newItems]);
        runConversionForItems(newItems);
    };

    const applyGlobalSvgDimensionsToAll = () => {
        if (!items.length || processing) return;
        const resolvedFit = svgSizeMode === 'custom' ? svgFitMode : 'contain';
        const nextItems = items.map((item) => {
            const srcW = item.sourceWidth || item.result?.width || 512;
            const srcH = item.sourceHeight || item.result?.height || 512;
            const target = computeSvgTargetDims(srcW, srcH, {
                sizeMode: svgSizeMode,
                scale: svgScale,
                targetWidth: svgTargetWidth,
                globalWidth: svgGlobalWidth,
                globalHeight: svgGlobalHeight,
            });
            return {
                ...item,
                draftWidth: String(target.width),
                draftHeight: String(target.height),
                targetWidth: target.width,
                targetHeight: target.height,
                lockedRatio: srcW / srcH,
                fitMode: resolvedFit,
                isCustomSize: false,
                status: 'pending',
                progress: 0,
                error: null,
            };
        });
        setItems(nextItems);
        runConversionForItems(nextItems, { fitMode: resolvedFit });
    };

    const handleGlobalSvgDimensionChange = (axis, rawValue) => {
        const parsed = parseInt(rawValue, 10);
        if (axis === 'width') {
            setSvgGlobalWidth(rawValue);
            if (svgGlobalLocked && Number.isFinite(parsed) && parsed > 0) {
                setSvgGlobalHeight(String(clampSvgDim(Math.round(parsed / (svgGlobalRatio || 1)), parsed)));
            }
            return;
        }
        setSvgGlobalHeight(rawValue);
        if (svgGlobalLocked && Number.isFinite(parsed) && parsed > 0) {
            setSvgGlobalWidth(String(clampSvgDim(Math.round(parsed * (svgGlobalRatio || 1)), parsed)));
        }
    };

    const handleGlobalSvgPresetSquare = (px) => {
        setSvgGlobalWidth(String(px));
        setSvgGlobalHeight(String(px));
        setSvgGlobalRatio(1);
    };

    const handleGlobalSvgToggleLock = () => {
        setSvgGlobalLocked((prev) => {
            const next = !prev;
            if (next) {
                const w = Number(svgGlobalWidth);
                const h = Number(svgGlobalHeight);
                if (w > 0 && h > 0) {
                    setSvgGlobalRatio(w / h);
                }
            }
            return next;
        });
    };

    const handleResizeDimensionChange = (axis, rawValue) => {
        const parsed = parseInt(rawValue, 10);
        if (axis === 'width') {
            setResizeWidth(rawValue);
            if (resizeLocked && Number.isFinite(parsed) && parsed > 0) {
                setResizeHeight(String(clampSvgDim(Math.round(parsed / (resizeRatio || 1)), parsed)));
            }
            return;
        }
        setResizeHeight(rawValue);
        if (resizeLocked && Number.isFinite(parsed) && parsed > 0) {
            setResizeWidth(String(clampSvgDim(Math.round(parsed * (resizeRatio || 1)), parsed)));
        }
    };

    const handleResizeToggleLock = () => {
        setResizeLocked((prev) => {
            const next = !prev;
            if (next) {
                const w = Number(resizeWidth);
                const h = Number(resizeHeight);
                if (w > 0 && h > 0) {
                    setResizeRatio(w / h);
                }
            }
            return next;
        });
    };

    const handleSvgCardDraftChange = (itemId, axis, rawValue) => {
        setItems((prev) =>
            prev.map((row) => {
                if (row.id !== itemId) return row;
                const sw = Math.max(1, row.sourceWidth || row.result?.width || 512);
                const sh = Math.max(1, row.sourceHeight || row.result?.height || 512);
                const ratio = row.lockedRatio || sw / sh;
                const parsed = parseInt(rawValue, 10);

                if (axis === 'width') {
                    const nextH =
                        row.aspectLocked && Number.isFinite(parsed) && parsed > 0
                            ? String(clampSvgDim(Math.round(parsed / ratio), parsed))
                            : row.draftHeight;
                    return { ...row, draftWidth: rawValue, draftHeight: nextH };
                }

                const nextW =
                    row.aspectLocked && Number.isFinite(parsed) && parsed > 0
                        ? String(clampSvgDim(Math.round(parsed * ratio), parsed))
                        : row.draftWidth;
                return { ...row, draftWidth: nextW, draftHeight: rawValue };
            })
        );
    };

    const handleSvgCardToggleLock = (itemId) => {
        setItems((prev) =>
            prev.map((row) => {
                if (row.id !== itemId) return row;
                const nextLocked = !row.aspectLocked;
                let lockedRatio = row.lockedRatio;
                if (nextLocked) {
                    const dw = parseInt(row.draftWidth, 10);
                    const dh = parseInt(row.draftHeight, 10);
                    if (dw > 0 && dh > 0) {
                        lockedRatio = dw / dh;
                    }
                }
                return { ...row, aspectLocked: nextLocked, lockedRatio };
            })
        );
    };

    const handleSvgCardApplyDimensions = async (itemId) => {
        const item = items.find((r) => r.id === itemId);
        if (!item || item.status === 'converting') return;
        const w = clampSvgDim(item.draftWidth, item.sourceWidth || 512);
        const h = clampSvgDim(item.draftHeight, item.sourceHeight || 512);

        setItems((prev) =>
            prev.map((row) =>
                row.id === itemId
                    ? {
                        ...row,
                        draftWidth: String(w),
                        draftHeight: String(h),
                        targetWidth: w,
                        targetHeight: h,
                        isCustomSize: true,
                        status: 'converting',
                        progress: 15,
                        error: null,
                    }
                    : row
            )
        );

        try {
            const res = await convertImageFile(item.file, {
                mode: tool.mode,
                targetMime: tool.targetMime,
                targetExt: tool.targetExt,
                quality: 1,
                targetWidth: w,
                targetHeight: h,
                fitMode: svgSizeMode === 'custom' ? svgFitMode : 'contain',
                onProgress: (pct) => {
                    setItems((prev) =>
                        prev.map((row) => (row.id === itemId ? { ...row, progress: pct } : row))
                    );
                },
            });

            setItems((prev) =>
                prev.map((row) => {
                    if (row.id !== itemId) return row;
                    if (row.result?.url) URL.revokeObjectURL(row.result.url);
                    return {
                        ...row,
                        status: 'done',
                        progress: 100,
                        result: res,
                        error: null,
                    };
                })
            );

            trackToolEvent({
                slug: tool.slug,
                eventType: 'convert',
                filesCount: 1,
                inputBytes: item.file.size || 0,
                outputBytes: res.size || 0,
            });
        } catch (err) {
            setItems((prev) =>
                prev.map((row) =>
                    row.id === itemId
                        ? { ...row, status: 'error', progress: 0, error: err?.message || 'Conversion failed' }
                        : row
                )
            );
        }
    };

    const handleDownloadAllZip = async () => {
        const ready = items.filter((i) => i.status === 'done' && i.result?.blob);
        if (!ready.length) return;
        setZipping(true);
        try {
            const zipEntries = [];
            const usedFolders = new Set();

            ready.forEach((item, idx) => {
                if (item.result.isIcoBundle && Array.isArray(item.result.icoEntries)) {
                    const rawBase = stripExtension(item.name || `icon-${idx + 1}`) || `icon-${idx + 1}`;
                    let folder = rawBase;
                    let n = 2;
                    while (usedFolders.has(folder.toLowerCase())) {
                        folder = `${rawBase}-${n++}`;
                    }
                    usedFolders.add(folder.toLowerCase());

                    item.result.icoEntries.forEach((entry) => {
                        const tagged = appendDomainToFilename(entry.filename, websiteInfo);
                        zipEntries.push({
                            filename: ready.length > 1 ? `${folder}/${tagged}` : tagged,
                            blob: entry.blob,
                        });
                    });
                } else {
                    zipEntries.push({
                        filename: appendDomainToFilename(item.result.filename, websiteInfo),
                        blob: item.result.blob,
                    });
                }
            });

            const zipBlob = await buildZipBlob(zipEntries);
            const url = URL.createObjectURL(zipBlob);
            const a = document.createElement('a');
            a.href = url;
            a.download = appendDomainToFilename(`${tool.slug}-batch.zip`, websiteInfo);
            a.click();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
            toast.success(`Downloaded ${zipEntries.length} file${zipEntries.length === 1 ? '' : 's'} in ZIP`);
        } catch {
            toast.error('Failed to build ZIP archive');
        } finally {
            setZipping(false);
        }
    };

    const clearQueue = () => {
        activeRunIdRef.current += 1;
        batchCtrl.stop();
        items.forEach((item) => {
            if (item.sourcePreviewUrl) URL.revokeObjectURL(item.sourcePreviewUrl);
            if (item.result?.url) URL.revokeObjectURL(item.result.url);
            item.result?.icoEntries?.forEach((entry) => entry?.url && URL.revokeObjectURL(entry.url));
        });
        setItems([]);
        setProcessing(false);
    };

    const jsonLdSchemas = useMemo(() => {
        const appSchema = {
            '@context': 'https://schema.org',
            '@type': 'WebApplication',
            name: tool.title,
            url: `${baseUrl}${tool.url || `/tools/${tool.slug}`}`,
            applicationCategory: 'MultimediaApplication',
            operatingSystem: 'Any',
            offers: {
                '@type': 'Offer',
                price: '0',
                priceCurrency: 'USD',
            },
            description: tool.seoDescription,
        };

        const faqSchema =
            Array.isArray(tool.faqs) && tool.faqs.length > 0
                ? {
                    '@context': 'https://schema.org',
                    '@type': 'FAQPage',
                    mainEntity: tool.faqs.map((f) => ({
                        '@type': 'Question',
                        name: f.q,
                        acceptedAnswer: {
                            '@type': 'Answer',
                            text: f.a,
                        },
                    })),
                }
                : null;

        return faqSchema ? [appSchema, faqSchema] : [appSchema];
    }, [tool, baseUrl]);

    const readyCount = items.filter((i) => i.status === 'done').length;
    const hasPendingOrActive = items.some((i) => i.status === 'pending' || i.status === 'converting');
    const overallProgress = items.length
        ? Math.round(
            items.reduce(
                (sum, item) => sum + (item.status === 'done' || item.status === 'error' ? 100 : (item.progress || 0)),
                0
            ) / items.length
        )
        : 0;

    return (
        <div className="min-h-screen bg-background text-foreground flex flex-col">
            <Head>
                <title>{seo.title || `${tool.title} - ${siteName}`}</title>
                <meta name="description" content={seo.description || tool.seoDescription} />
                {baseUrl && <link rel="canonical" href={`${baseUrl}${tool.url || `/tools/${tool.slug}`}`} />}
                {jsonLdSchemas.map((schema, i) => (
                    <script key={i} type="application/ld+json">
                        {JSON.stringify(schema)}
                    </script>
                ))}
            </Head>

            <Header />

            <main className="flex-1 w-full px-6 sm:px-10 md:px-16 py-8 md:py-12 space-y-12">
                {/* Breadcrumb & Flip Direction Header */}
                <div className="space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2 text-xs font-bold text-foreground/60">
                            <Link
                                href="/tools"
                                className="inline-flex items-center gap-1.5 hover:text-blue-500 transition-colors"
                            >
                                <ArrowLeft className="w-4 h-4" />
                                <span>All Tools</span>
                            </Link>
                            {(() => {
                                const categoryCrumb = {
                                    converters: { label: 'Converters', href: '/tools/convert' },
                                    utilities: { label: 'Image Utilities', href: '/tools/utilities' },
                                    developer: { label: 'Developer Tools', href: '/tools/devtools' },
                                }[tool.category];
                                if (!categoryCrumb) return null;
                                return (
                                    <>
                                        <span className="text-foreground/30">/</span>
                                        <Link
                                            href={categoryCrumb.href}
                                            className="hover:text-blue-500 transition-colors"
                                        >
                                            {categoryCrumb.label}
                                        </Link>
                                    </>
                                );
                            })()}
                        </div>

                        {tool.reverseAvailable && (
                            <Link
                                href={tool.reverseUrl || `/tools/convert/${tool.reverseSlug}`}
                                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-card-bg border border-card-border hover:border-blue-500/45 text-xs font-bold text-foreground/85 hover:text-blue-500 transition-all shadow-sm"
                            >
                                <ArrowLeftRight className="w-3.5 h-3.5 text-blue-500" />
                                <span>Switch to {tool.reverseTitle}</span>
                            </Link>
                        )}
                    </div>

                    <div className="text-center max-w-3xl mx-auto space-y-3">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/25 text-blue-500 dark:text-blue-400 text-xs font-bold font-mono">
                            <span>{tool.fromFormat}</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                            <span>{tool.toFormat}</span>
                        </div>
                        <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-foreground">
                            {tool.title}
                        </h1>
                        <p className="text-sm text-foreground/65 leading-relaxed">
                            {tool.shortDesc}
                        </p>
                    </div>
                </div>

                {/* Browser AVIF warning if needed */}
                {tool.targetMime === 'image/avif' && !avifSupported && (
                    <div className="w-full p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3 text-xs text-amber-500 dark:text-amber-300">
                        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                        <span>
                            Your browser does not support native AVIF encoding or WebAssembly. Please use a modern browser or convert to WebP instead.
                        </span>
                    </div>
                )}

                {/* WORKSPACE: Dedicated Studio Modes vs Background Remover vs Batch Converter/Resizer Mode */}
                {isPackMode ? (
                    <PackGeneratorStudio tool={tool} preloadAsset={preloadAsset} onTrackEvent={trackToolEvent} />
                ) : isEditStudioMode ? (
                    <ImageEditStudios tool={tool} preloadAsset={preloadAsset} onTrackEvent={trackToolEvent} />
                ) : isCompressResizeMode ? (
                    <CompressResizeStudio
                        tool={tool}
                        avifSupported={avifSupported}
                        preloadAsset={preloadAsset}
                        onTrackEvent={trackToolEvent}
                    />
                ) : isDevStudioMode ? (
                    <DevToolsStudios tool={tool} preloadAsset={preloadAsset} onTrackEvent={trackToolEvent} />
                ) : isBgRemover ? (
                    <BgRemoverStudio tool={tool} preloadAsset={preloadAsset} onTrackEvent={trackToolEvent} />
                ) : (
                    <section className="w-full space-y-6">
                        {/* Drag & Drop Zone */}
                        <div
                            onDragOver={(e) => {
                                e.preventDefault();
                                setIsDragging(true);
                            }}
                            onDragLeave={() => setIsDragging(false)}
                            onDrop={(e) => {
                                e.preventDefault();
                                setIsDragging(false);
                                enqueueFiles(e.dataTransfer.files);
                            }}
                            onClick={() => fileInputRef.current?.click()}
                            className={`border-2 border-dashed rounded-2xl p-10 sm:p-12 text-center cursor-pointer transition-all space-y-3 ${isDragging
                                    ? 'border-blue-500 bg-blue-500/10 scale-[1.01]'
                                    : 'border-card-border hover:border-blue-500/50 bg-card-bg'
                                }`}
                        >
                            <input
                                ref={fileInputRef}
                                type="file"
                                multiple
                                accept={tool.accept}
                                className="hidden"
                                onChange={(e) => {
                                    enqueueFiles(e.target.files);
                                    e.target.value = '';
                                }}
                            />
                            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/25 flex items-center justify-center text-blue-500 mx-auto">
                                <UploadCloud className="w-6 h-6" />
                            </div>
                            <div className="text-base sm:text-lg font-bold text-foreground">
                                Drop your {tool.fromFormat} files here, or click to select
                            </div>
                            <p className="text-xs text-foreground/55">
                                Batch upload supported · Instant conversion inside your browser
                            </p>
                        </div>

                        {/* Global SVG Output Dimension Controls */}
                        {isSvgMode && (
                            <SvgGlobalSizeBar
                                sizeMode={svgSizeMode}
                                onSizeModeChange={setSvgSizeMode}
                                scale={svgScale}
                                onScaleChange={setSvgScale}
                                targetWidth={svgTargetWidth}
                                onTargetWidthChange={setSvgTargetWidth}
                                globalWidth={svgGlobalWidth}
                                globalHeight={svgGlobalHeight}
                                globalLocked={svgGlobalLocked}
                                onGlobalDimensionChange={handleGlobalSvgDimensionChange}
                                onGlobalPresetSquare={handleGlobalSvgPresetSquare}
                                onGlobalToggleLock={handleGlobalSvgToggleLock}
                                fitMode={svgFitMode}
                                onFitModeChange={setSvgFitMode}
                                queueCount={items.length}
                                processing={processing}
                                onApplyToAll={applyGlobalSvgDimensionsToAll}
                            />
                        )}

                        {/* Output Settings (only shown for utility tools; converters keep default quality & uploaded size) */}
                        {!isConverterTool && (
                            <div className="bg-card-bg border border-card-border rounded-2xl p-5 shadow-lg space-y-5">
                                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-card-border">
                                    <div className="flex items-center gap-2 text-sm font-bold text-foreground">
                                        <Sliders className="w-4 h-4 text-blue-500" />
                                        <span>Output Settings</span>
                                    </div>

                                    {isLiveSettingsTool ? (
                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-background border border-card-border text-[11px] font-semibold text-foreground/65">
                                            <span
                                                className={`w-1.5 h-1.5 rounded-full ${
                                                    processing ? 'bg-blue-500 animate-pulse' : 'bg-emerald-500'
                                                }`}
                                            />
                                            <span>{processing ? 'Updating live...' : 'Live Auto-Apply'}</span>
                                        </span>
                                    ) : (
                                        items.length > 0 && (
                                            <button
                                                type="button"
                                                onClick={() => runConversionForItems(items)}
                                                disabled={processing}
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold cursor-pointer disabled:opacity-50"
                                            >
                                                <RefreshCw className={`w-3.5 h-3.5 ${processing ? 'animate-spin' : ''}`} />
                                                <span>Re-apply Settings to Queue</span>
                                            </button>
                                        )
                                    )}
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4 text-xs">
                                    {/* Format Picker for Compressor / Resizer */}
                                    {(isCompressor || isResizer) && (
                                        <div className="lg:col-span-3 p-3.5 rounded-xl bg-background border border-card-border space-y-2">
                                            <label className="font-bold text-foreground/75 block">Target Output Format</label>
                                            <StudioSelect
                                                aria-label="Target output format"
                                                value={`${outputMimeOverride}|${outputExtOverride}`}
                                                onChange={(e) => {
                                                    const [m, ext] = e.target.value.split('|');
                                                    setOutputMimeOverride(m);
                                                    setOutputExtOverride(ext);
                                                }}
                                                className="w-full"
                                            >
                                                {isCompressor && <option value="auto|auto">Keep Original Format (Auto)</option>}
                                                <option value="image/webp|webp">WebP (Smallest Web Size)</option>
                                                <option value="image/png|png">PNG (Lossless / Transparent)</option>
                                                <option value="image/jpeg|jpg">JPG (Photo Universal)</option>
                                                {avifSupported && <option value="image/avif|avif">AVIF (Next-Gen Ultra Small)</option>}
                                            </StudioSelect>
                                        </div>
                                    )}

                                    {/* Quality Slider */}
                                    {(tool.supportsQuality || isCompressor || isResizer) && (
                                        <div className="lg:col-span-4 p-3.5 rounded-xl bg-background border border-card-border space-y-2">
                                            <div className="flex justify-between font-bold">
                                                <span className="text-foreground/75">Output Quality</span>
                                                <span className="font-mono text-blue-500">{quality}%</span>
                                            </div>
                                            <input
                                                type="range"
                                                min={15}
                                                max={100}
                                                value={quality}
                                                onChange={(e) => setQuality(Number(e.target.value))}
                                                className="w-full accent-blue-500 cursor-pointer touch-none"
                                            />
                                            {(isCompressor || isResizer) &&
                                                (outputMimeOverride === 'image/png' ||
                                                    (outputMimeOverride === 'auto' &&
                                                        (items.length === 0 || items.some((i) => i.file?.type === 'image/png' || /\.png$/i.test(i.name || ''))))) && (
                                                    <p className="text-[10px] text-foreground/50 leading-snug">
                                                        {quality >= 98
                                                            ? '98–100% keeps lossless PNG. Lower below 98% for quantized PNG compression.'
                                                            : 'Smart PNG palette compression active · Lower quality uses fewer palette colors for smaller files.'}
                                                    </p>
                                                )}
                                        </div>
                                    )}

                                    {/* Background Fill for non-alpha formats (JPG) */}
                                    {!tool.supportsTransparency && (
                                        <div className="lg:col-span-4 p-3.5 rounded-xl bg-background border border-card-border space-y-2">
                                            <span className="font-bold text-foreground/75 block">Transparent Fill Color</span>
                                            <div className="flex items-center gap-2">
                                                {[
                                                    { label: 'White', hex: '#ffffff' },
                                                    { label: 'Black', hex: '#000000' },
                                                ].map((opt) => (
                                                    <button
                                                        key={opt.hex}
                                                        type="button"
                                                        onClick={() => setBgFillColor(opt.hex)}
                                                        className={`px-2.5 py-1.5 rounded-lg border font-semibold cursor-pointer ${bgFillColor === opt.hex
                                                                ? 'border-blue-500 bg-blue-500/15 text-blue-500'
                                                                : 'border-card-border text-foreground/70'
                                                            }`}
                                                    >
                                                        {opt.label}
                                                    </button>
                                                ))}
                                                <StudioColorPicker
                                                    value={bgFillColor}
                                                    onChange={setBgFillColor}
                                                    ariaLabel="Custom background fill color"
                                                    title="Custom background color"
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {/* Optional Dimensions / Resize */}
                                    {!isIcoMode && (
                                        <div className="md:col-span-2 lg:col-span-5 p-3.5 rounded-xl bg-background border border-card-border space-y-2">
                                            <label className="flex items-center justify-between font-bold text-foreground/75 cursor-pointer">
                                                <span>{isResizer ? 'Target Dimensions & Fit' : 'Custom Resize (Optional)'}</span>
                                                {!isResizer && (
                                                    <input
                                                        type="checkbox"
                                                        checked={resizeEnabled}
                                                        onChange={(e) => setResizeEnabled(e.target.checked)}
                                                        className="w-4 h-4 accent-blue-500"
                                                    />
                                                )}
                                            </label>

                                            {resizeEnabled && (
                                                <div className="space-y-3 pt-1">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <div className="flex items-center gap-1.5 w-full sm:w-auto min-w-[236px]">
                                                            <LockedPixelInput
                                                                value={resizeWidth}
                                                                onChange={(val) => handleResizeDimensionChange('width', val)}
                                                                onStep={(delta) =>
                                                                    handleResizeDimensionChange(
                                                                        'width',
                                                                        String(clampSvgDim((Number(resizeWidth) || 1080) + delta, 1))
                                                                    )
                                                                }
                                                                placeholder="Width"
                                                                ariaLabel="Resize width in pixels"
                                                            />
                                                            <AspectLockButton
                                                                compact
                                                                isLocked={resizeLocked}
                                                                onToggle={handleResizeToggleLock}
                                                            />
                                                            <LockedPixelInput
                                                                value={resizeHeight}
                                                                onChange={(val) => handleResizeDimensionChange('height', val)}
                                                                onStep={(delta) =>
                                                                    handleResizeDimensionChange(
                                                                        'height',
                                                                        String(clampSvgDim((Number(resizeHeight) || 1080) + delta, 1))
                                                                    )
                                                                }
                                                                placeholder="Height"
                                                                ariaLabel="Resize height in pixels"
                                                            />
                                                        </div>
                                                        <StudioSelect
                                                            aria-label="Resize fit mode"
                                                            value={fitMode}
                                                            onChange={(e) => setFitMode(e.target.value)}
                                                        >
                                                            <option value="contain">Fit: Contain (Keep Aspect)</option>
                                                            <option value="cover">Fit: Cover (Crop to Fill)</option>
                                                            <option value="stretch">Fit: Stretch Exact</option>
                                                        </StudioSelect>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Queue & Results List / Grid */}
                        {items.length > 0 && (
                            <div className="bg-card-bg border border-card-border rounded-2xl overflow-hidden shadow-xl">
                                <BatchProgressHeader
                                    title={`Converted Files (${readyCount}/${items.length})`}
                                    overallProgress={overallProgress}
                                    isProcessing={processing}
                                    isPaused={batchCtrl.isPaused}
                                    progressLabel={
                                        batchCtrl.isPaused
                                            ? `Paused (${readyCount} of ${items.length} done)`
                                            : processing
                                                ? `Processing batch (${readyCount} of ${items.length} done)`
                                                : readyCount < items.length
                                                    ? `${readyCount} of ${items.length} file(s) ready`
                                                    : `All ${readyCount} file(s) ready`
                                    }
                                    viewMode={queueViewMode}
                                    onViewModeChange={setQueueViewMode}
                                    showDownloadZip={items.length > 1}
                                    canDownloadZip={!processing && !batchCtrl.isPaused && !hasPendingOrActive && readyCount > 1}
                                    zipping={zipping}
                                    onDownloadZip={handleDownloadAllZip}
                                    onPauseToggle={batchCtrl.togglePause}
                                    onStop={batchCtrl.stop}
                                    onClear={clearQueue}
                                />

                                <div
                                    className={`overflow-y-auto ${
                                        queueViewMode === 'grid'
                                            ? isSvgMode
                                                ? 'max-h-[600px] p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'
                                                : isCompressor
                                                    ? 'max-h-[560px] p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4'
                                                    : 'max-h-[490px] p-5 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-3'
                                            : 'max-h-[490px] divide-y divide-card-border'
                                    }`}
                                >
                                    {items.map((item) => {
                                        const savedPct =
                                            item.result && item.size > 0
                                                ? Math.round(((item.size - item.result.size) / item.size) * 100)
                                                : null;
                                        const previewUrl =
                                            item.result?.url && !['image/x-icon', 'application/zip'].includes(item.result.actualMime)
                                                ? item.result.url
                                                : item.sourcePreviewUrl || null;
                                        const displayName = item.result?.filename || item.name;
                                        const downloadName = item.result?.filename
                                            ? appendDomainToFilename(item.result.filename, websiteInfo)
                                            : undefined;
                                        const itemProgress = item.status === 'done' ? 100 : (item.progress || 0);

                                        if (queueViewMode === 'grid') {
                                            return (
                                                <BatchAssetGridCard
                                                    key={item.id}
                                                    previewUrl={previewUrl}
                                                    status={item.status}
                                                    progress={itemProgress}
                                                    downloadUrl={item.status === 'done' ? item.result?.url : null}
                                                    downloadFilename={downloadName}
                                                    badgeText={
                                                        isCompressor
                                                            ? item.result
                                                                ? `${formatFileSize(item.size)} → ${formatFileSize(item.result.size)}`
                                                                : null
                                                            : isSvgMode
                                                                ? item.result
                                                                    ? `${item.result.width}×${item.result.height}`
                                                                    : null
                                                                : savedPct !== null
                                                                    ? savedPct >= 0
                                                                        ? `-${savedPct}%`
                                                                        : `+${Math.abs(savedPct)}%`
                                                                    : null
                                                    }
                                                    badgeTone={
                                                        isCompressor
                                                            ? 'info'
                                                            : isSvgMode
                                                                ? 'neutral'
                                                                : savedPct === null
                                                                    ? 'neutral'
                                                                    : savedPct >= 0
                                                                        ? 'success'
                                                                        : 'warning'
                                                    }
                                                    badgePlacement={isCompressor ? 'top-center' : 'top-left'}
                                                    badgeAlwaysVisible={isCompressor}
                                                    bottomBadgeText={
                                                        isCompressor && savedPct !== null
                                                            ? savedPct >= 0
                                                                ? `-${savedPct}%`
                                                                : `+${Math.abs(savedPct)}%`
                                                            : null
                                                    }
                                                    bottomBadgeTone={
                                                        savedPct === null
                                                            ? 'neutral'
                                                            : savedPct >= 0
                                                                ? 'success'
                                                                : 'warning'
                                                    }
                                                    footer={
                                                        isSvgMode ? (
                                                            <SvgCardDimensionEditor
                                                                variant="grid"
                                                                filename={displayName}
                                                                sourceWidth={item.sourceWidth}
                                                                sourceHeight={item.sourceHeight}
                                                                draftWidth={item.draftWidth ?? String(item.result?.width || item.sourceWidth || 512)}
                                                                draftHeight={item.draftHeight ?? String(item.result?.height || item.sourceHeight || 512)}
                                                                appliedWidth={item.result?.width ?? null}
                                                                appliedHeight={item.result?.height ?? null}
                                                                aspectLocked={item.aspectLocked ?? true}
                                                                isCustomSize={Boolean(item.isCustomSize)}
                                                                isBusy={item.status === 'converting'}
                                                                onDraftChange={(axis, val) => handleSvgCardDraftChange(item.id, axis, val)}
                                                                onToggleLock={() => handleSvgCardToggleLock(item.id)}
                                                                onApply={() => handleSvgCardApplyDimensions(item.id)}
                                                            />
                                                        ) : null
                                                    }
                                                />
                                            );
                                        }

                                        const isPending = item.status === 'pending';

                                        return (
                                            <div
                                                key={item.id}
                                                className={`p-4 flex flex-col ${
                                                    isSvgMode ? 'lg:flex-row lg:items-center' : 'sm:flex-row sm:items-center'
                                                } justify-between gap-4 transition-opacity duration-300 ${
                                                    isPending ? 'opacity-70' : ''
                                                }`}
                                            >
                                                <div className="flex items-center gap-3.5 min-w-0 flex-1">
                                                    <div className="w-12 h-12 rounded-xl border border-card-border bg-background flex items-center justify-center overflow-hidden shrink-0">
                                                        {previewUrl ? (
                                                            <img
                                                                src={previewUrl}
                                                                alt=""
                                                                className={`w-full h-full object-contain transition-all duration-300 ${
                                                                    isPending ? 'grayscale opacity-45' : ''
                                                                }`}
                                                            />
                                                        ) : (
                                                            <ImageIcon className="w-5 h-5 text-foreground/40" />
                                                        )}
                                                    </div>

                                                    <div className="min-w-0 flex-1 space-y-1.5">
                                                        <div className="font-bold text-sm text-foreground truncate">
                                                            {displayName}
                                                        </div>
                                                        <div className="flex flex-wrap items-center gap-1.5 text-xs text-foreground/60 font-mono">
                                                            <span>{formatFileSize(item.size)}</span>
                                                            {isSvgMode && item.sourceWidth && item.sourceHeight && (
                                                                <span className="px-1.5 py-0.5 rounded bg-background border border-card-border text-[10px] text-foreground/55">
                                                                    SVG {item.sourceWidth}&times;{item.sourceHeight}
                                                                </span>
                                                            )}
                                                            {item.result && (
                                                                <>
                                                                    <span>&rarr;</span>
                                                                    <span className="font-bold text-foreground">
                                                                        {formatFileSize(item.result.size)}
                                                                    </span>
                                                                    <span className="text-foreground/45">
                                                                        ({item.result.width}&times;{item.result.height})
                                                                    </span>
                                                                    {!isSvgMode && item.result.alreadyOptimal ? (
                                                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/15 text-blue-500">
                                                                            Already optimal · Original kept
                                                                        </span>
                                                                    ) : (
                                                                        !isSvgMode &&
                                                                        savedPct !== null && (
                                                                            <span
                                                                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${savedPct >= 0
                                                                                        ? 'bg-emerald-500/15 text-emerald-500'
                                                                                        : 'bg-amber-500/15 text-amber-500'
                                                                                    }`}
                                                                            >
                                                                                {savedPct >= 0 ? `-${savedPct}%` : `+${Math.abs(savedPct)}%`}
                                                                            </span>
                                                                        )
                                                                    )}
                                                                </>
                                                            )}
                                                        </div>
                                                        {/* Per-Item Slim Brand Spectrum Progress Bar */}
                                                        <div className="flex items-center gap-2 max-w-md">
                                                            <div className="flex-1">
                                                                <IosBrandProgressBar
                                                                    progress={itemProgress}
                                                                    isPending={isPending}
                                                                    isError={item.status === 'error'}
                                                                    size="sm"
                                                                />
                                                            </div>
                                                            <span className="text-[10px] font-mono text-foreground/50 w-10 text-right">
                                                                {item.status === 'error'
                                                                    ? 'Err'
                                                                    : isPending
                                                                        ? 'Wait'
                                                                        : `${itemProgress}%`}
                                                            </span>
                                                        </div>
                                                        {item.status === 'done' && item.result?.isIcoBundle && item.result.icoEntries?.length > 0 && (
                                                            <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                                                                {item.result.icoEntries.map((entry) => (
                                                                    <a
                                                                        key={entry.filename}
                                                                        href={entry.url}
                                                                        download={appendDomainToFilename(entry.filename, websiteInfo)}
                                                                        title={`Download ${appendDomainToFilename(entry.filename, websiteInfo)} (${formatFileSize(entry.sizeBytes)})`}
                                                                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-background border border-card-border hover:border-blue-500 text-[11px] font-mono text-foreground/80 hover:text-blue-500 transition-colors"
                                                                    >
                                                                        <Download className="w-2.5 h-2.5" />
                                                                        <span>{entry.label}</span>
                                                                    </a>
                                                                ))}
                                                            </div>
                                                        )}
                                                        {item.error && (
                                                            <div className="text-xs text-rose-500">{item.error}</div>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className={`flex flex-wrap items-center gap-2.5 shrink-0 ${isSvgMode ? 'self-end lg:self-center' : 'self-end sm:self-center'}`}>
                                                    {isSvgMode && (
                                                        <div className="px-2.5 py-1.5 rounded-xl bg-background border border-card-border">
                                                            <SvgCardDimensionEditor
                                                                variant="list"
                                                                filename={displayName}
                                                                sourceWidth={item.sourceWidth}
                                                                sourceHeight={item.sourceHeight}
                                                                draftWidth={item.draftWidth ?? String(item.result?.width || item.sourceWidth || 512)}
                                                                draftHeight={item.draftHeight ?? String(item.result?.height || item.sourceHeight || 512)}
                                                                appliedWidth={item.result?.width ?? null}
                                                                appliedHeight={item.result?.height ?? null}
                                                                aspectLocked={item.aspectLocked ?? true}
                                                                isCustomSize={Boolean(item.isCustomSize)}
                                                                isBusy={item.status === 'converting'}
                                                                onDraftChange={(axis, val) => handleSvgCardDraftChange(item.id, axis, val)}
                                                                onToggleLock={() => handleSvgCardToggleLock(item.id)}
                                                                onApply={() => handleSvgCardApplyDimensions(item.id)}
                                                            />
                                                        </div>
                                                    )}
                                                    {isPending && (
                                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-background border border-card-border text-[11px] font-semibold text-foreground/60">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                                                            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                                                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                                                            <span className="ml-0.5">Waiting</span>
                                                        </span>
                                                    )}
                                                    {item.status === 'converting' && (
                                                        <span className="text-xs text-blue-500 font-semibold">Converting...</span>
                                                    )}
                                                    {item.status === 'stopped' && (
                                                        <span className="px-2.5 py-1 rounded-full bg-background border border-card-border text-[11px] font-semibold text-foreground/55">
                                                            Stopped
                                                        </span>
                                                    )}
                                                    {item.status === 'done' && item.result && (
                                                        <a
                                                            href={item.result.url}
                                                            download={downloadName || item.result.filename}
                                                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-sm transition-colors"
                                                        >
                                                            {item.result.isIcoBundle ? (
                                                                <FileArchive className="w-3.5 h-3.5" />
                                                            ) : (
                                                                <Download className="w-3.5 h-3.5" />
                                                            )}
                                                            <span>{item.result.isIcoBundle ? 'Download ZIP' : 'Download'}</span>
                                                        </a>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </section>
                )}

                {/* SEO Content & Guides Section */}
                <section className="w-full space-y-12 pt-4">
                    {/* Asymmetric Two-Column Editorial Workflow (Card-free) */}
                    {Array.isArray(tool.howToSteps) && tool.howToSteps.length > 0 && (
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 pt-4 items-start">
                            <div className="lg:col-span-4 space-y-3 lg:sticky lg:top-24">
                                <div className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-blue-500">
                                    <span className="w-6 h-px bg-blue-500" />
                                    <span>Quick Workflow</span>
                                </div>
                                <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground leading-tight">
                                    How to use {tool.shortTitle || tool.title}
                                </h2>
                                <p className="text-sm text-foreground/60 leading-relaxed">
                                    Processed locally in browser memory in {tool.howToSteps.length} straightforward steps—no account or server upload needed.
                                </p>
                            </div>

                            <ol className="lg:col-span-8 divide-y divide-card-border border-t border-b border-card-border">
                                {tool.howToSteps.map((step, idx) => (
                                    <li
                                        key={idx}
                                        className="py-5 sm:py-6 flex items-baseline gap-5 sm:gap-8 group transition-colors hover:bg-blue-500/[0.025] px-2 -mx-2 rounded-lg"
                                    >
                                        <span className="font-mono text-2xl sm:text-3xl font-black tracking-tighter text-blue-500/80 dark:text-blue-400/85 tabular-nums w-10 sm:w-12 shrink-0 select-none">
                                            {String(idx + 1).padStart(2, '0')}
                                        </span>
                                        <div className="space-y-1 flex-1 min-w-0">
                                            <div className="text-[11px] font-bold uppercase tracking-widest text-foreground/45 group-hover:text-blue-500 transition-colors">
                                                Step {idx + 1}
                                            </div>
                                            <p className="text-sm sm:text-base font-medium text-foreground/85 leading-relaxed">
                                                {step}
                                            </p>
                                        </div>
                                    </li>
                                ))}
                            </ol>
                        </div>
                    )}

                    {/* FAQs Accordion */}
                    {Array.isArray(tool.faqs) && tool.faqs.length > 0 && (
                        <div className="space-y-4">
                            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 border-b border-card-border pb-3">
                                <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-foreground">
                                    Frequently Asked Questions
                                </h2>
                                <span className="text-xs text-foreground/50">
                                    {tool.faqs.length} answers
                                </span>
                            </div>

                            <div className="divide-y divide-card-border border-b border-card-border">
                                {tool.faqs.map((faq, idx) => {
                                    const isOpen = openFaqIndex === idx;
                                    return (
                                        <div key={idx} className="py-1">
                                            <button
                                                type="button"
                                                aria-expanded={isOpen}
                                                onClick={() => setOpenFaqIndex(isOpen ? -1 : idx)}
                                                className="w-full py-4 flex items-center justify-between gap-4 text-left cursor-pointer group"
                                            >
                                                <span className="font-bold text-sm sm:text-base text-foreground group-hover:text-blue-500 transition-colors">
                                                    {faq.q}
                                                </span>
                                                <ChevronDown
                                                    className={`w-4 h-4 shrink-0 text-foreground/50 group-hover:text-blue-500 transition-transform duration-200 ${isOpen ? 'rotate-180 text-blue-500' : ''
                                                        }`}
                                                />
                                            </button>
                                            {isOpen && (
                                                <div className="pb-4 pr-8 text-xs sm:text-sm text-foreground/70 leading-relaxed">
                                                    {faq.a}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Related Tools */}
                    {Array.isArray(tool.relatedTools) && tool.relatedTools.length > 0 && (
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                                    <Layers className="w-4 h-4 text-blue-500" />
                                    <span>Related Converter Tools</span>
                                </h2>
                                <Link href={tool.category === 'converters' ? '/tools/convert' : '/tools'} className="text-xs font-bold text-blue-500 hover:underline">
                                    View All &rarr;
                                </Link>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                                {tool.relatedTools.map((rel) => (
                                    <Link
                                        key={rel.slug}
                                        href={rel.url || `/tools/${rel.slug}`}
                                        className="p-4 rounded-xl bg-card-bg border border-card-border hover:border-blue-500/45 transition-all space-y-1.5"
                                    >
                                        <div className="text-[11px] font-bold font-mono text-blue-500">
                                            {rel.fromFormat} &rarr; {rel.toFormat}
                                        </div>
                                        <div className="text-sm font-bold text-foreground">{rel.shortTitle || rel.title}</div>
                                        <p className="text-xs text-foreground/60 line-clamp-2">{rel.shortDesc}</p>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Non-intrusive PNG catalog cross-link */}
                    <div className="p-5 rounded-2xl bg-card-bg border border-card-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="space-y-1">
                            <div className="text-sm font-bold text-foreground flex items-center gap-2">
                                <Sparkles className="w-4 h-4 text-blue-500" />
                                <span>Looking for ready-to-use transparent PNGs?</span>
                            </div>
                            <p className="text-xs text-foreground/60">
                                Browse high-resolution cutout assets across {siteName}.
                            </p>
                        </div>
                        <Link
                            href="/"
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shrink-0 self-start sm:self-auto"
                        >
                            <span>Explore PNG Catalog</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                    </div>
                </section>
            </main>
        </div>
    );
}
