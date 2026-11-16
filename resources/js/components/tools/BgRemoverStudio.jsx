import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePage } from '@inertiajs/react';
import {
    AlertTriangle,
    Cpu,
    Download,
    Eraser,
    Loader2,
    MoveHorizontal,
    Pipette,
    RefreshCw,
    RotateCcw,
    Server,
    Sparkles,
    UploadCloud,
    ZoomIn,
    ZoomOut,
} from 'lucide-react';
import { toast } from 'sonner';
import {
    canvasToBlob,
    formatFileSize,
    loadImageFromFileOrUrl,
    renderSolidBgRemovalCanvas,
    stripExtension,
} from '@/lib/imageConverter';
import { appendDomainToFilename } from '@/lib/utils';
import StudioColorPicker from '@/components/tools/StudioColorPicker';
import {
    CHECKER_BG_STYLE,
    StudioClosedSummaryBar,
    StudioInitialDropZone,
    StudioModalFrame,
    useStudioViewport,
} from '@/components/tools/StudioPopupShell';

const ENGINE_META = {
    browser_ai: {
        id: 'browser_ai',
        label: 'Browser AI',
        badge: 'On-Device AI',
        icon: Cpu,
        desc: 'Runs neural segmentation right in your browser (WebGPU/WASM) with zero server uploads.',
    },
    server_ai: {
        id: 'server_ai',
        label: 'Server AI',
        badge: 'Python AI',
        icon: Server,
        desc: 'Runs Python rembg ONNX segmentation on the server—instant start with no browser weight download.',
    },
    solid: {
        id: 'solid',
        label: 'Solid Color Key',
        badge: 'Instant Canvas',
        icon: Eraser,
        desc: 'Instant edge flood-fill and chroma keying for logos, icons, and flat-color backgrounds.',
    },
};

function formatProgressStage(key) {
    if (!key) return 'Preparing AI model...';
    const lower = String(key).toLowerCase();
    if (lower.includes('fetch') || lower.includes('download')) {
        return 'Downloading AI model (cached after first use)...';
    }
    if (lower.includes('compute') || lower.includes('infer')) {
        return 'Removing background...';
    }
    return 'Processing image...';
}

export default function BgRemoverStudio({ tool, preloadAsset = null, onTrackEvent }) {
    const { props } = usePage();
    const websiteInfo = props?.websiteInfo || {};

    const bgConfig = useMemo(() => {
        const raw = tool?.bgRemoverConfig || {};
        return {
            engines: {
                solid: raw?.engines?.solid ?? true,
                browser_ai: raw?.engines?.browser_ai ?? true,
                server_ai: raw?.engines?.server_ai ?? false,
            },
            defaultEngine: raw?.defaultEngine || 'browser_ai',
            browserAiModel: raw?.browserAiModel || 'isnet_fp16',
            maxUploadMb: Number(raw?.maxUploadMb || 15),
        };
    }, [tool?.bgRemoverConfig]);

    const availableEngines = useMemo(() => {
        const order = ['browser_ai', 'server_ai', 'solid'];
        const enabled = order.filter((key) => Boolean(bgConfig.engines?.[key]));
        return enabled.length > 0 ? enabled : ['solid'];
    }, [bgConfig.engines]);

    const resolvedDefaultEngine = useMemo(() => {
        if (availableEngines.includes(bgConfig.defaultEngine)) {
            return bgConfig.defaultEngine;
        }
        return availableEngines[0];
    }, [availableEngines, bgConfig.defaultEngine]);

    const [activeEngine, setActiveEngine] = useState(resolvedDefaultEngine);
    useEffect(() => {
        if (!availableEngines.includes(activeEngine)) {
            setActiveEngine(resolvedDefaultEngine);
        }
    }, [availableEngines, resolvedDefaultEngine]);

    const [studioOpen, setStudioOpen] = useState(false);
    const [stageBackdrop, setStageBackdrop] = useState('checker'); // 'checker' | 'light' | 'dark'
    const [sourceFile, setSourceFile] = useState(null);
    const [sourceInfo, setSourceInfo] = useState({ width: 0, height: 0, name: '', size: 0 });
    const [originalUrl, setOriginalUrl] = useState('');
    const [splitPos, setSplitPos] = useState(50);
    const [isDraggingSplit, setIsDraggingSplit] = useState(false);

    // Canvas viewport tools (zoom, pan)
    const viewport = useStudioViewport({ minZoom: 0.05, maxZoom: 8, initialZoom: 1 });
    const {
        stageRef,
        stageEl,
        zoom,
        pan,
        isPanning,
        panMovedRef,
        zoomIn,
        zoomOut,
        setActualSize,
        fitToContent,
        resetView,
        handleStagePointerDown,
    } = viewport;

    // Solid color-key controls
    const [targetHex, setTargetHex] = useState('#ffffff');
    const [tolerance, setTolerance] = useState(34);
    const [feather, setFeather] = useState(14);
    const [solidMode, setSolidMode] = useState('contiguous');

    // AI / Cutout readiness state
    const [isResultReady, setIsResultReady] = useState(false);
    const [aiBusy, setAiBusy] = useState(false);
    const [aiProgress, setAiProgress] = useState(0);
    const [aiStatusText, setAiStatusText] = useState('');
    const [aiError, setAiError] = useState('');

    const fileInputRef = useRef(null);
    const canvasRef = useRef(null);
    const compareBoxRef = useRef(null);
    const loadedImgRef = useRef(null);
    const aiCacheRef = useRef(new Map());
    const resultBlobRef = useRef(null);
    const runSeqRef = useRef(0);
    const abortCtrlRef = useRef(null);
    const lastFittedKeyRef = useRef(null);

    // Auto-fit images larger than the stage while opening smaller images at crisp 100%
    const bgFitKey = studioOpen && sourceFile && sourceInfo.width > 0
        ? `${sourceFile.name}-${sourceFile.size}-${sourceInfo.width}x${sourceInfo.height}`
        : null;

    useEffect(() => {
        if (!bgFitKey || !stageEl || !sourceInfo.width || !sourceInfo.height) {
            if (!bgFitKey) lastFittedKeyRef.current = null;
            return undefined;
        }
        if (lastFittedKeyRef.current === bgFitKey) return undefined;

        let raf2 = 0;
        const raf1 = requestAnimationFrame(() => {
            raf2 = requestAnimationFrame(() => {
                if (fitToContent(sourceInfo.width, sourceInfo.height, { allowUpscale: false })) {
                    lastFittedKeyRef.current = bgFitKey;
                }
            });
        });
        return () => {
            cancelAnimationFrame(raf1);
            if (raf2) cancelAnimationFrame(raf2);
        };
    }, [bgFitKey, stageEl, sourceInfo.width, sourceInfo.height, fitToContent]);

    const drawImageToPreviewCanvas = useCallback((img) => {
        const canvas = canvasRef.current;
        if (!canvas || !img) return;
        const w = img.naturalWidth || img.width || 512;
        const h = img.naturalHeight || img.height || 512;
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);
    }, []);

    // Cleanup object URLs and inflight requests on unmount
    useEffect(() => {
        return () => {
            abortCtrlRef.current?.abort();
            if (originalUrl) URL.revokeObjectURL(originalUrl);
        };
    }, []);

    const redrawSolidMode = useCallback(() => {
        if (activeEngine !== 'solid' || !loadedImgRef.current || !canvasRef.current) return;
        const processed = renderSolidBgRemovalCanvas(loadedImgRef.current, {
            targetHex,
            tolerance,
            feather,
            mode: solidMode,
        });
        const dest = canvasRef.current;
        dest.width = processed.width;
        dest.height = processed.height;
        const ctx = dest.getContext('2d');
        ctx.clearRect(0, 0, dest.width, dest.height);
        ctx.drawImage(processed, 0, 0);
        resultBlobRef.current = null;
        setIsResultReady(true);
    }, [activeEngine, targetHex, tolerance, feather, solidMode]);

    const applyAiResultBlob = useCallback(async (blob) => {
        const url = URL.createObjectURL(blob);
        try {
            const loaded = await loadImageFromFileOrUrl(url);
            resultBlobRef.current = blob;
            drawImageToPreviewCanvas(loaded.img);
            setIsResultReady(true);
        } finally {
            URL.revokeObjectURL(url);
        }
    }, [drawImageToPreviewCanvas]);

    // Re-sync canvas whenever studio opens, switches back to solid, or sliders change
    useEffect(() => {
        if (!studioOpen) return;
        if (activeEngine === 'solid' && loadedImgRef.current) {
            redrawSolidMode();
        } else if (activeEngine !== 'solid' && resultBlobRef.current && canvasRef.current) {
            applyAiResultBlob(resultBlobRef.current);
        } else if (loadedImgRef.current && canvasRef.current && !isResultReady) {
            drawImageToPreviewCanvas(loadedImgRef.current);
        }
    }, [studioOpen, activeEngine, redrawSolidMode, sourceFile, applyAiResultBlob, drawImageToPreviewCanvas, isResultReady]);

    const runAiEngine = useCallback(async (file, engineKey, forceRerun = false) => {
        if (!file || engineKey === 'solid') return;

        const cacheKey = `${engineKey}:${engineKey === 'browser_ai' ? bgConfig.browserAiModel : 'server'}`;
        if (!forceRerun && aiCacheRef.current.has(cacheKey)) {
            const cached = aiCacheRef.current.get(cacheKey);
            setAiError('');
            setAiBusy(false);
            await applyAiResultBlob(cached.blob);
            return;
        }

        abortCtrlRef.current?.abort();
        const runId = ++runSeqRef.current;

        setIsResultReady(false);
        setAiBusy(true);
        setAiError('');
        setAiProgress(engineKey === 'browser_ai' ? 5 : 25);
        setAiStatusText(
            engineKey === 'browser_ai'
                ? 'Loading browser AI segmentation model...'
                : 'Uploading to server Python AI...'
        );

        try {
            let outBlob = null;

            if (engineKey === 'browser_ai') {
                const { removeBackground } = await import('@imgly/background-removal');
                if (runId !== runSeqRef.current) return;

                outBlob = await removeBackground(file, {
                    model: bgConfig.browserAiModel || 'isnet_fp16',
                    output: { format: 'image/png', quality: 1 },
                    progress: (key, current, total) => {
                        if (runId !== runSeqRef.current) return;
                        setAiStatusText(formatProgressStage(key));
                        if (Number.isFinite(total) && total > 0) {
                            const pct = Math.max(5, Math.min(98, Math.round((current / total) * 100)));
                            setAiProgress(pct);
                        }
                    },
                });
            } else if (engineKey === 'server_ai') {
                const maxBytes = bgConfig.maxUploadMb * 1024 * 1024;
                if (file.size > maxBytes) {
                    throw new Error(`File exceeds the ${bgConfig.maxUploadMb} MB server upload limit.`);
                }

                const controller = new AbortController();
                abortCtrlRef.current = controller;
                const formData = new FormData();
                formData.append('image', file);

                setAiStatusText('Running Python rembg AI segmentation on server...');
                setAiProgress(55);

                const res = await fetch('/api/tools/remove-background', {
                    method: 'POST',
                    body: formData,
                    signal: controller.signal,
                });

                if (!res.ok) {
                    const errPayload = await res.json().catch(() => null);
                    throw new Error(errPayload?.error || `Server AI failed (HTTP ${res.status})`);
                }

                outBlob = await res.blob();
            }

            if (runId !== runSeqRef.current || !outBlob) return;

            aiCacheRef.current.set(cacheKey, { blob: outBlob });
            await applyAiResultBlob(outBlob);
            setAiProgress(100);

            onTrackEvent?.({
                slug: tool.slug,
                eventType: 'convert',
                filesCount: 1,
                inputBytes: file.size || 0,
                outputBytes: outBlob.size || 0,
            });
        } catch (err) {
            if (err?.name === 'AbortError' || runId !== runSeqRef.current) return;
            const message = err?.message || 'AI background removal failed';
            setAiError(message);
            toast.error(message);
            if (loadedImgRef.current) {
                drawImageToPreviewCanvas(loadedImgRef.current);
            }
        } finally {
            if (runId === runSeqRef.current) {
                setAiBusy(false);
            }
        }
    }, [applyAiResultBlob, bgConfig.browserAiModel, bgConfig.maxUploadMb, drawImageToPreviewCanvas, onTrackEvent, tool.slug]);

    const loadFile = useCallback(async (file, engineOverride = null) => {
        if (!file) return;
        const targetEngine = engineOverride || activeEngine;

        abortCtrlRef.current?.abort();
        runSeqRef.current++;
        aiCacheRef.current.clear();
        resultBlobRef.current = null;
        setIsResultReady(false);
        setAiError('');
        setSplitPos(50);
        resetView();
        setStudioOpen(true);

        try {
            const loaded = await loadImageFromFileOrUrl(file);
            loadedImgRef.current = loaded.img;

            if (originalUrl) URL.revokeObjectURL(originalUrl);
            const nextOrigUrl = URL.createObjectURL(file);
            setOriginalUrl(nextOrigUrl);

            setSourceFile(file);
            setSourceInfo({
                width: loaded.width,
                height: loaded.height,
                name: file.name,
                size: file.size || 0,
            });

            // Sample top-left source corner pixel accurately for Solid Color Key mode
            const probe = document.createElement('canvas');
            probe.width = 1;
            probe.height = 1;
            const pctx = probe.getContext('2d');
            pctx.drawImage(loaded.img, 0, 0, 1, 1, 0, 0, 1, 1);
            const px = pctx.getImageData(0, 0, 1, 1).data;
            const hex =
                '#' +
                [px[0], px[1], px[2]]
                    .map((n) => n.toString(16).padStart(2, '0'))
                    .join('');
            setTargetHex(hex);

            if (targetEngine === 'solid') {
                setTimeout(() => redrawSolidMode(), 10);
            } else {
                setTimeout(() => runAiEngine(file, targetEngine), 10);
            }
        } catch (err) {
            toast.error(err?.message || 'Could not load image file');
        }
    }, [activeEngine, originalUrl, redrawSolidMode, runAiEngine]);

    // Preload catalog asset (?asset=/uploads/...) if handed off
    useEffect(() => {
        if (!preloadAsset?.path) return;
        let cancelled = false;

        fetch(preloadAsset.path)
            .then((res) => (res.ok ? res.blob() : Promise.reject(new Error('Could not load asset'))))
            .then((blob) => {
                if (cancelled) return;
                const ext = (blob.type?.split('/')[1] || 'png').replace('jpeg', 'jpg');
                const file = new File([blob], `${preloadAsset.name || 'asset'}.${ext}`, {
                    type: blob.type || 'image/png',
                });
                loadFile(file);
            })
            .catch(() => { });

        return () => {
            cancelled = true;
        };
    }, [preloadAsset?.path]);

    const handleSwitchEngine = (nextEngine) => {
        if (nextEngine === activeEngine || !availableEngines.includes(nextEngine)) return;
        setActiveEngine(nextEngine);
        setAiError('');

        if (!sourceFile) return;
        if (nextEngine === 'solid') {
            abortCtrlRef.current?.abort();
            runSeqRef.current++;
            setAiBusy(false);
        } else {
            runAiEngine(sourceFile, nextEngine);
        }
    };

    const updateSplitFromClientX = useCallback((clientX) => {
        const box = compareBoxRef.current;
        if (!box) return;
        const rect = box.getBoundingClientRect();
        if (rect.width <= 0) return;
        const pct = ((clientX - rect.left) / rect.width) * 100;
        setSplitPos(Math.max(0, Math.min(100, pct)));
    }, []);

    const handleCanvasEyedropper = (e) => {
        if (panMovedRef.current) {
            panMovedRef.current = false;
            return;
        }
        if (activeEngine !== 'solid' || !loadedImgRef.current || !canvasRef.current) return;
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        const x = Math.max(0, Math.min(canvas.width - 1, Math.floor(((e.clientX - rect.left) / rect.width) * canvas.width)));
        const y = Math.max(0, Math.min(canvas.height - 1, Math.floor(((e.clientY - rect.top) / rect.height) * canvas.height)));

        const temp = document.createElement('canvas');
        temp.width = canvas.width;
        temp.height = canvas.height;
        const tctx = temp.getContext('2d');
        tctx.drawImage(loadedImgRef.current, 0, 0, canvas.width, canvas.height);
        const px = tctx.getImageData(x, y, 1, 1).data;
        const hex =
            '#' +
            [px[0], px[1], px[2]]
                .map((n) => n.toString(16).padStart(2, '0'))
                .join('');
        setTargetHex(hex);
        toast.success(`Sampled color ${hex.toUpperCase()}`);
    };

    const handleDownload = async () => {
        if (!sourceFile || !canvasRef.current) return;
        try {
            const blob = resultBlobRef.current || (await canvasToBlob(canvasRef.current, 'image/png', 1));
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = appendDomainToFilename(`${stripExtension(sourceInfo.name)}-transparent.png`, websiteInfo);
            a.click();
            setTimeout(() => URL.revokeObjectURL(url), 1000);

            if (activeEngine === 'solid') {
                onTrackEvent?.({
                    slug: tool.slug,
                    eventType: 'convert',
                    filesCount: 1,
                    inputBytes: sourceFile.size || 0,
                    outputBytes: blob.size || 0,
                });
            }
            toast.success('Transparent PNG downloaded!');
        } catch {
            toast.error('Failed to export transparent PNG');
        }
    };

    const activeMeta = ENGINE_META[activeEngine] || ENGINE_META.solid;
    const canDownload = Boolean(sourceFile && isResultReady && !aiBusy && !aiError);

    const resetViewport = () => {
        if (sourceInfo.width > 0 && sourceInfo.height > 0) {
            fitToContent(sourceInfo.width, sourceInfo.height, { allowUpscale: false });
        } else {
            resetView();
        }
        setSplitPos(50);
    };

    const handleClearStudio = () => {
        abortCtrlRef.current?.abort();
        runSeqRef.current++;
        aiCacheRef.current.clear();
        resultBlobRef.current = null;
        loadedImgRef.current = null;
        if (originalUrl) URL.revokeObjectURL(originalUrl);
        setOriginalUrl('');
        setSourceFile(null);
        setSourceInfo({ width: 0, height: 0, name: '', size: 0 });
        setIsResultReady(false);
        setAiBusy(false);
        setAiError('');
        setStudioOpen(false);
    };

    return (
        <section className="w-full space-y-6">
            <input
                ref={fileInputRef}
                type="file"
                accept={tool.accept}
                className="hidden"
                onChange={(e) => {
                    if (e.target.files?.[0]) loadFile(e.target.files[0]);
                    e.target.value = '';
                }}
            />

            {/* Engine Switcher Bar (controlled by Admin Settings) */}
            <div className="bg-card-bg border border-card-border rounded-2xl p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="space-y-1">
                    <div className="text-xs font-bold uppercase tracking-wider text-foreground/55 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                        <span>Cutout Engine Mode</span>
                    </div>
                    <p className="text-xs text-foreground/65">{activeMeta.desc}</p>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                    {availableEngines.map((key) => {
                        const meta = ENGINE_META[key];
                        const Icon = meta.icon;
                        const isSelected = activeEngine === key;
                        return (
                            <button
                                key={key}
                                type="button"
                                onClick={() => handleSwitchEngine(key)}
                                className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${isSelected
                                    ? 'bg-blue-600 text-white border-blue-500 shadow-lg shadow-blue-600/20'
                                    : 'bg-background border-card-border text-foreground/75 hover:border-blue-500/40'
                                    }`}
                            >
                                <Icon className="w-3.5 h-3.5 shrink-0" />
                                <span>{meta.label}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Initial Drag & Drop Upload Box (hidden once an image is loaded) */}
            {!sourceFile && (
                <StudioInitialDropZone
                    icon={Eraser}
                    title="Drop any photo, product shot, or logo (or click to browse)"
                    subtitle={
                        activeEngine === 'solid'
                            ? 'Works cleanly for logos, stickers, icons, and product graphics on solid backgrounds.'
                            : 'AI cutout handles busy scenes, portraits, pets, hair, gradients, and complex product photos.'
                    }
                    onFiles={(files) => files?.[0] && loadFile(files[0])}
                    onClick={() => fileInputRef.current?.click()}
                />
            )}

            {/* Compact Queue Summary when closed */}
            {sourceFile && !studioOpen && (
                <StudioClosedSummaryBar
                    thumbs={originalUrl ? [{ id: 'src', url: originalUrl, name: sourceInfo.name }] : []}
                    fallbackIcon={Eraser}
                    title={sourceInfo.name}
                    subtitle={`${sourceInfo.width}×${sourceInfo.height} · ${formatFileSize(sourceInfo.size)} · Engine: ${activeMeta.label}`}
                    onAddClick={() => fileInputRef.current?.click()}
                    addLabel="Replace Image"
                    onOpenStudio={() => setStudioOpen(true)}
                    onPrimaryAction={handleDownload}
                    primaryLabel="Download PNG"
                    primaryDisabled={!canDownload}
                    onClear={handleClearStudio}
                    onFilesDrop={(files) => files?.[0] && loadFile(files[0])}
                />
            )}

            {/* Full-Width Live Background Remover Studio Popup */}
            <StudioModalFrame
                open={studioOpen && Boolean(sourceFile)}
                onClose={() => setStudioOpen(false)}
                busy={false}
                ariaLabel="Live Background Remover Studio"
                icon={Eraser}
                title={sourceInfo.name || 'Background Remover Studio'}
                subtitle={
                    activeEngine === 'solid'
                        ? 'Drag divider to compare · Click image to sample background color'
                        : 'Drag divider line to compare Original vs. Transparent Cutout'
                }
                badges={
                    <>
                        {sourceInfo.width > 0 && (
                            <span className="px-2 py-0.5 rounded-md bg-background border border-card-border font-mono text-[10px] text-foreground/65">
                                {sourceInfo.width}×{sourceInfo.height} · {formatFileSize(sourceInfo.size)}
                            </span>
                        )}
                        <span className="px-2 py-0.5 rounded-md bg-blue-500/10 border border-blue-500/25 font-mono text-[10px] font-bold text-blue-500">
                            {activeMeta.label}
                        </span>
                    </>
                }
                onFilesDrop={(files) => files?.[0] && loadFile(files[0])}
                dropOverlayTitle="Drop an image to remove its background"
                dropOverlaySubtitle={`Your active ${activeMeta.label} engine will process the new image right away`}
                headerActions={
                    <>
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-background hover:bg-card-header-bg border border-card-border hover:border-blue-500/40 text-xs font-bold text-foreground cursor-pointer transition-colors"
                        >
                            <UploadCloud className="w-3.5 h-3.5 text-blue-500" />
                            <span>Try Another Image</span>
                        </button>

                        <button
                            type="button"
                            disabled={!canDownload}
                            onClick={handleDownload}
                            title={canDownload ? 'Download transparent PNG' : 'Processing image...'}
                            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-gradient-to-r from-blue-700 via-blue-500 to-indigo-600 text-white text-xs font-bold shadow-md shadow-blue-600/25 hover:shadow-blue-500/40 transition-all cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed disabled:shadow-none"
                        >
                            <Download className="w-3.5 h-3.5" />
                            <span>Download PNG</span>
                        </button>
                    </>
                }
                leftSidebar={
                    <>
                        {/* Cutout Engine Switcher */}
                        <div className="space-y-2">
                            <span className="font-bold text-foreground/75 uppercase tracking-wider text-[11px] block">
                                Cutout Engine
                            </span>
                            <div className="space-y-1.5">
                                {availableEngines.map((key) => {
                                    const meta = ENGINE_META[key];
                                    const Icon = meta.icon;
                                    const isSelected = activeEngine === key;
                                    return (
                                        <button
                                            key={key}
                                            type="button"
                                            onClick={() => handleSwitchEngine(key)}
                                            className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl border text-left font-bold cursor-pointer transition-all ${isSelected
                                                ? 'bg-blue-600 text-white border-blue-500 shadow-sm'
                                                : 'bg-card-bg border-card-border text-foreground/75 hover:border-blue-500/40'
                                                }`}
                                        >
                                            <span className="inline-flex items-center gap-2">
                                                <Icon className="w-3.5 h-3.5 shrink-0" />
                                                <span>{meta.label}</span>
                                            </span>
                                            <span
                                                className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${isSelected ? 'bg-white/20 text-white' : 'bg-background text-foreground/55'
                                                    }`}
                                            >
                                                {meta.badge}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Stage Preview Backdrop */}
                        <div className="space-y-2 pt-2 border-t border-card-border">
                            <span className="font-bold text-foreground/75 uppercase tracking-wider text-[11px] block">
                                Preview Backdrop
                            </span>
                            <div className="grid grid-cols-3 gap-1.5">
                                {[
                                    { id: 'checker', label: 'Alpha' },
                                    { id: 'light', label: 'White' },
                                    { id: 'dark', label: 'Dark' },
                                ].map((b) => (
                                    <button
                                        key={b.id}
                                        type="button"
                                        onClick={() => setStageBackdrop(b.id)}
                                        className={`py-1.5 rounded-lg border font-bold cursor-pointer transition-all ${stageBackdrop === b.id
                                            ? 'bg-blue-600 text-white border-blue-500'
                                            : 'bg-card-bg border-card-border text-foreground/75 hover:border-blue-500/40'
                                            }`}
                                    >
                                        {b.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Color Key Controls (Solid Mode) */}
                        {activeEngine === 'solid' && (
                            <div className="space-y-4 pt-2 border-t border-card-border">
                                <div className="flex items-center justify-between gap-2">
                                    <span className="font-bold text-foreground/75 uppercase tracking-wider text-[11px]">
                                        Color Key Controls
                                    </span>
                                    <span className="text-[10px] text-blue-500 font-semibold inline-flex items-center gap-1">
                                        <Pipette className="w-3 h-3" />
                                        Click canvas
                                    </span>
                                </div>

                                <div className="flex items-center justify-between gap-3">
                                    <label className="font-bold text-foreground/75">Target Color</label>
                                    <StudioColorPicker
                                        value={targetHex}
                                        onChange={setTargetHex}
                                        ariaLabel="Target background color"
                                        showHexLabel
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <div className="flex justify-between font-bold">
                                        <span className="text-foreground/75">Color Tolerance</span>
                                        <span className="font-mono text-blue-500">{tolerance}</span>
                                    </div>
                                    <input
                                        type="range"
                                        min={5}
                                        max={120}
                                        value={tolerance}
                                        onChange={(e) => setTolerance(Number(e.target.value))}
                                        className="w-full accent-blue-500 cursor-pointer touch-none"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <div className="flex justify-between font-bold">
                                        <span className="text-foreground/75">Edge Smoothness</span>
                                        <span className="font-mono text-blue-500">{feather}</span>
                                    </div>
                                    <input
                                        type="range"
                                        min={0}
                                        max={45}
                                        value={feather}
                                        onChange={(e) => setFeather(Number(e.target.value))}
                                        className="w-full accent-blue-500 cursor-pointer touch-none"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="font-bold text-foreground/75 block">Removal Mode</label>
                                    <div className="grid grid-cols-2 gap-1.5">
                                        <button
                                            type="button"
                                            onClick={() => setSolidMode('contiguous')}
                                            className={`py-2 px-2 rounded-xl font-bold border cursor-pointer transition-all ${solidMode === 'contiguous'
                                                ? 'bg-blue-600 text-white border-blue-500'
                                                : 'bg-card-bg border-card-border text-foreground/70'
                                                }`}
                                        >
                                            Edge Flood-Fill
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setSolidMode('global')}
                                            className={`py-2 px-2 rounded-xl font-bold border cursor-pointer transition-all ${solidMode === 'global'
                                                ? 'bg-blue-600 text-white border-blue-500'
                                                : 'bg-card-bg border-card-border text-foreground/70'
                                                }`}
                                        >
                                            Global Color Key
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </>
                }
                topSubBar={
                    aiError &&
                    activeEngine !== 'solid' && (
                        <div className="mx-4 mt-3 rounded-xl bg-rose-500/10 border border-rose-500/30 px-3.5 py-2.5 text-xs text-rose-500 flex flex-wrap items-center justify-between gap-2 shrink-0">
                            <div className="flex items-start gap-2 min-w-0">
                                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                                <span className="break-words">{aiError}</span>
                            </div>
                            <button
                                type="button"
                                disabled={aiBusy}
                                onClick={() => runAiEngine(sourceFile, activeEngine, true)}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 font-bold text-rose-500 cursor-pointer disabled:opacity-50 shrink-0"
                            >
                                <RefreshCw className={`w-3.5 h-3.5 ${aiBusy ? 'animate-spin' : ''}`} />
                                <span>Retry</span>
                            </button>
                        </div>
                    )
                }
                rightStage={
                    <div
                        ref={stageRef}
                        data-studio-stage="true"
                        onPointerDown={(e) => handleStagePointerDown(e)}
                        style={{
                            ...(stageBackdrop === 'checker'
                                ? CHECKER_BG_STYLE
                                : stageBackdrop === 'light'
                                    ? { backgroundColor: '#ffffff' }
                                    : { backgroundColor: '#0f172a' }),
                            touchAction: 'none',
                        }}
                        className={`relative flex-1 min-h-[300px] p-4 sm:p-6 pb-16 flex items-center justify-center overflow-hidden select-none ${
                            isPanning ? 'cursor-grabbing' : 'cursor-grab'
                        }`}
                    >
                        <div
                            ref={compareBoxRef}
                            data-bg-preview="true"
                            style={{
                                width: sourceInfo.width > 0 ? `${sourceInfo.width}px` : 'auto',
                                height: sourceInfo.height > 0 ? `${sourceInfo.height}px` : 'auto',
                                transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom})`,
                                transformOrigin: 'center center',
                            }}
                            className={`relative shrink-0 inline-flex items-center justify-center overflow-hidden select-none ${
                                isPanning ? '' : 'transition-transform duration-100 ease-out'
                            }`}
                        >
                            <canvas
                                ref={canvasRef}
                                onClick={handleCanvasEyedropper}
                                style={
                                    sourceInfo.width > 0
                                        ? {
                                              width: `${sourceInfo.width}px`,
                                              height: `${sourceInfo.height}px`,
                                              maxWidth: 'none',
                                              maxHeight: 'none',
                                          }
                                        : undefined
                                }
                                className={`block shrink-0 ${
                                    isPanning
                                        ? 'cursor-grabbing'
                                        : activeEngine === 'solid'
                                            ? 'cursor-crosshair'
                                            : 'cursor-grab'
                                }`}
                                title={
                                    activeEngine === 'solid'
                                        ? 'Click to sample color · Drag to pan · Scroll to zoom'
                                        : 'Drag to pan · Scroll to zoom'
                                }
                            />

                            {originalUrl && (
                                <img
                                    src={originalUrl}
                                    alt={`${sourceInfo.name} original`}
                                    draggable={false}
                                    className="absolute inset-0 w-full h-full object-contain pointer-events-none select-none"
                                    style={{ clipPath: `inset(0 ${100 - splitPos}% 0 0)` }}
                                />
                            )}

                            {originalUrl && !aiBusy && (() => {
                                const invScale = 1 / Math.max(0.05, zoom || 1);
                                const showInFrameLabels = sourceInfo.width * (zoom || 1) >= 160;
                                return (
                                    <>
                                        {showInFrameLabels && splitPos > 12 && (
                                            <span
                                                style={{
                                                    top: `${10 * invScale}px`,
                                                    left: `${10 * invScale}px`,
                                                    transform: `scale(${invScale})`,
                                                    transformOrigin: 'top left',
                                                }}
                                                className="pointer-events-none absolute z-10 px-2.5 py-1 rounded-md bg-slate-950/80 backdrop-blur-sm text-[11px] font-bold uppercase tracking-wider text-white border border-white/15 whitespace-nowrap shadow"
                                            >
                                                Original
                                            </span>
                                        )}
                                        {showInFrameLabels && splitPos < 88 && (
                                            <span
                                                style={{
                                                    top: `${10 * invScale}px`,
                                                    right: `${10 * invScale}px`,
                                                    transform: `scale(${invScale})`,
                                                    transformOrigin: 'top right',
                                                }}
                                                className="pointer-events-none absolute z-10 px-2.5 py-1 rounded-md bg-blue-600/90 backdrop-blur-sm text-[11px] font-bold uppercase tracking-wider text-white border border-white/20 whitespace-nowrap shadow"
                                            >
                                                Removed
                                            </span>
                                        )}

                                        {/* Draggable Before/After Split Line & Handle */}
                                        <div
                                            role="slider"
                                            tabIndex={0}
                                            aria-label="Before and after comparison divider"
                                            aria-valuemin={0}
                                            aria-valuemax={100}
                                            aria-valuenow={Math.round(splitPos)}
                                            onClick={(e) => e.stopPropagation()}
                                            onDoubleClick={(e) => {
                                                e.stopPropagation();
                                                setSplitPos(50);
                                            }}
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
                                                setIsDraggingSplit(true);
                                                e.currentTarget.setPointerCapture?.(e.pointerId);
                                                updateSplitFromClientX(e.clientX);
                                            }}
                                            onPointerMove={(e) => {
                                                if (!isDraggingSplit) return;
                                                e.stopPropagation();
                                                updateSplitFromClientX(e.clientX);
                                            }}
                                            onPointerUp={(e) => {
                                                if (!isDraggingSplit) return;
                                                e.stopPropagation();
                                                setIsDraggingSplit(false);
                                                e.currentTarget.releasePointerCapture?.(e.pointerId);
                                            }}
                                            onPointerCancel={() => setIsDraggingSplit(false)}
                                            style={{
                                                left: `${splitPos}%`,
                                                width: `${Math.max(20, 28 * invScale)}px`,
                                                transform: 'translateX(-50%)',
                                            }}
                                            title="Drag left or right to compare (double-click to reset to 50%)"
                                            className="absolute inset-y-0 z-20 flex items-center justify-center cursor-ew-resize touch-none group focus:outline-none"
                                        >
                                            <div
                                                style={{ width: `${Math.max(1, 2 * invScale)}px` }}
                                                className="h-full bg-white shadow-[0_0_8px_rgba(0,0,0,0.65)] group-hover:bg-blue-400 transition-colors"
                                            />
                                            <div
                                                style={{ transform: `scale(${invScale})` }}
                                                className="absolute w-9 h-9 rounded-full bg-white text-blue-600 border-2 border-blue-500 shadow-lg flex items-center justify-center shrink-0 transition-transform"
                                            >
                                                <MoveHorizontal className="w-4 h-4" />
                                            </div>
                                        </div>
                                    </>
                                );
                            })()}
                        </div>

                        {aiBusy && (
                            <div className="absolute inset-0 z-20 bg-slate-950/70 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center space-y-3">
                                <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
                                <div className="text-sm font-bold text-white">
                                    {aiStatusText || 'Running AI cutout...'}
                                </div>
                                <div className="w-full max-w-xs h-2 rounded-full bg-white/15 overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-blue-500 to-indigo-400 transition-all duration-300"
                                        style={{ width: `${Math.max(8, aiProgress)}%` }}
                                    />
                                </div>
                                <div className="text-[11px] text-white/70 font-mono">
                                    {aiProgress}%
                                </div>
                            </div>
                        )}

                        {/* Floating Canvas Tools Toolbar */}
                        <div
                            data-canvas-tool="true"
                            onPointerDown={(e) => e.stopPropagation()}
                            className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1 px-2 py-1.5 rounded-full bg-slate-900/90 dark:bg-slate-950/90 text-white border border-white/15 shadow-xl backdrop-blur-md text-xs"
                        >
                            <button
                                type="button"
                                onClick={zoomOut}
                                disabled={zoom <= 0.05}
                                title="Zoom out"
                                aria-label="Zoom out"
                                className="p-1.5 rounded-full hover:bg-white/15 disabled:opacity-35 cursor-pointer disabled:cursor-not-allowed transition-colors"
                            >
                                <ZoomOut className="w-3.5 h-3.5" />
                            </button>

                            <button
                                type="button"
                                onClick={setActualSize}
                                title="View actual 100% pixels"
                                className="px-2 py-1 rounded-full hover:bg-white/15 font-mono text-[11px] font-bold min-w-[46px] text-center cursor-pointer transition-colors"
                            >
                                {Math.round(zoom * 100)}%
                            </button>

                            {sourceInfo.width > 0 && sourceInfo.height > 0 && (
                                <button
                                    type="button"
                                    onClick={() => fitToContent(sourceInfo.width, sourceInfo.height, { allowUpscale: true })}
                                    title="Fit image to canvas"
                                    className="px-2 py-1 rounded-full hover:bg-white/15 font-semibold text-[11px] cursor-pointer transition-colors"
                                >
                                    Fit
                                </button>
                            )}

                            <button
                                type="button"
                                onClick={zoomIn}
                                disabled={zoom >= 8}
                                title="Zoom in"
                                aria-label="Zoom in"
                                className="p-1.5 rounded-full hover:bg-white/15 disabled:opacity-35 cursor-pointer disabled:cursor-not-allowed transition-colors"
                            >
                                <ZoomIn className="w-3.5 h-3.5" />
                            </button>

                            <span className="h-4 w-px bg-white/15 mx-0.5" />

                            <button
                                type="button"
                                onClick={() => setSplitPos(50)}
                                title="Center split divider (50/50)"
                                className="px-2 py-1 rounded-full hover:bg-white/15 font-semibold text-[11px] cursor-pointer transition-colors whitespace-nowrap"
                            >
                                50 / 50
                            </button>

                            <button
                                type="button"
                                onClick={resetViewport}
                                title="Fit view & center divider"
                                aria-label="Reset view"
                                className="p-1.5 rounded-full hover:bg-white/15 cursor-pointer transition-colors"
                            >
                                <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>
                }
            />
        </section>
    );
}
