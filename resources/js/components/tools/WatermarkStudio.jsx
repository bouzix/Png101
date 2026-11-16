import React, { useEffect, useMemo, useRef, useState } from 'react';
import { usePage } from '@inertiajs/react';
import {
    Blend,
    Crosshair,
    Download,
    Eye,
    FileArchive,
    Grid,
    Hand,
    Image as ImageIcon,
    Loader2,
    Move,
    Pipette,
    Plus,
    RotateCcw,
    RotateCw,
    Scaling,
    Sliders,
    Stamp,
    Trash2,
    Type,
    UploadCloud,
    X,
} from 'lucide-react';
import { toast } from 'sonner';
import {
    buildZipBlob,
    canvasToBlob,
    formatFileSize,
    loadImageFromFileOrUrl,
    renderWatermarkedCanvas,
    stripExtension,
} from '@/lib/imageConverter';
import { appendDomainToFilename, triggerSiteBlobDownload } from '@/lib/utils';
import { useBatchControl } from '@/lib/useBatchControl';
import IosBrandProgressBar from '@/components/tools/IosBrandProgressBar';
import StudioColorPicker from '@/components/tools/StudioColorPicker';
import StudioSelect from '@/components/ui/StudioSelect';
import {
    StudioBatchFilmstrip,
    StudioViewportStage,
    useStudioViewport,
} from '@/components/tools/StudioPopupShell';

const ANCHOR_POSITIONS = [
    { id: 'top-left', label: 'Top Left' },
    { id: 'top-center', label: 'Top Center' },
    { id: 'top-right', label: 'Top Right' },
    { id: 'center-left', label: 'Mid Left' },
    { id: 'center', label: 'Center' },
    { id: 'center-right', label: 'Mid Right' },
    { id: 'bottom-left', label: 'Bottom Left' },
    { id: 'bottom-center', label: 'Bottom Center' },
    { id: 'bottom-right', label: 'Bottom Right' },
];

const CANVAS_TOOLS = [
    {
        id: 'watermark',
        label: 'Move Mark',
        hint: 'Drag on image to reposition watermark',
        icon: Move,
        cursor: 'cursor-move',
        disabledInTile: true,
    },
    {
        id: 'pan',
        label: 'Pan View',
        hint: 'Drag anywhere to pan viewport',
        icon: Hand,
        cursor: 'cursor-grab',
    },
    {
        id: 'scale',
        label: 'Resize Mark',
        hint: 'Drag right or up to grow watermark, left or down to shrink',
        icon: Scaling,
        cursor: 'cursor-nesw-resize',
    },
    {
        id: 'rotate',
        label: 'Rotate Mark',
        hint: 'Drag horizontally on image to rotate watermark',
        icon: RotateCw,
        cursor: 'cursor-ew-resize',
    },
    {
        id: 'opacity',
        label: 'Opacity Scrub',
        hint: 'Drag right or up to increase opacity, left or down to fade',
        icon: Blend,
        cursor: 'cursor-ew-resize',
    },
    {
        id: 'eyedropper',
        label: 'Color Eyedropper',
        hint: 'Click or drag on image to sample text color',
        icon: Pipette,
        cursor: 'cursor-crosshair',
    },
];

const CHECKER_BG_STYLE = {
    backgroundImage:
        'linear-gradient(45deg, rgba(148,163,184,0.16) 25%, transparent 25%), linear-gradient(-45deg, rgba(148,163,184,0.16) 25%, transparent 25%), linear-gradient(45deg, transparent 75%, rgba(148,163,184,0.16) 75%), linear-gradient(-45deg, transparent 75%, rgba(148,163,184,0.16) 75%)',
    backgroundSize: '16px 16px',
    backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px',
};

export default function WatermarkStudio({ tool, preloadAsset = null, onTrackEvent }) {
    const { props } = usePage();
    const websiteInfo = props?.websiteInfo || {};
    const targetInputRef = useRef(null);
    const wmInputRef = useRef(null);
    const previewCanvasRef = useRef(null);
    const samplerCanvasRef = useRef(null);

    const activeDecodedRef = useRef(null); // { id, img, width, height, revoke }
    const wmDecodedRef = useRef(null); // { key, img, revoke }
    const wmPreviewUrlRef = useRef('');
    const dragRef = useRef(null);
    const studioDragDepthRef = useRef(0);
    const wmLogoDragDepthRef = useRef(0);
    const itemsRef = useRef([]);
    const activeIdRef = useRef(null);
    const batchRunRef = useRef(0);

    const [items, setItems] = useState([]);
    itemsRef.current = items;
    const [activeId, setActiveId] = useState(null);
    activeIdRef.current = activeId;
    const [studioOpen, setStudioOpen] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [isStudioDragging, setIsStudioDragging] = useState(false);
    const [isWmLogoDragging, setIsWmLogoDragging] = useState(false);
    const [showOriginal, setShowOriginal] = useState(false);
    const [activeDims, setActiveDims] = useState({ width: 0, height: 0 });
    const [previewTick, setPreviewTick] = useState(0);

    // Watermark settings
    const [watermarkType, setWatermarkType] = useState(preloadAsset?.path ? 'logo' : 'text');
    const [wmFileOrUrl, setWmFileOrUrl] = useState(preloadAsset?.path || null);
    const [wmName, setWmName] = useState(preloadAsset?.name || '');
    const [wmThumbUrl, setWmThumbUrl] = useState(preloadAsset?.path || '');
    const [watermarkText, setWatermarkText] = useState('© My Brand');
    const [fontFamily, setFontFamily] = useState('sans');
    const [fontWeight, setFontWeight] = useState('700');
    const [textColor, setTextColor] = useState('#ffffff');
    const [shadowEnabled, setShadowEnabled] = useState(true);

    // Placement & style settings
    const [position, setPosition] = useState('bottom-right');
    const [opacity, setOpacity] = useState(75);
    const [scalePct, setScalePct] = useState(22);
    const [marginPct, setMarginPct] = useState(4);
    const [rotationDeg, setRotationDeg] = useState(0);
    const [offsetXPct, setOffsetXPct] = useState(0);
    const [offsetYPct, setOffsetYPct] = useState(0);
    const [tileGapPct, setTileGapPct] = useState(34);

    // Export format settings
    const [exportFormat, setExportFormat] = useState('auto');
    const [exportQuality, setExportQuality] = useState(92);
    const [canvasToolMode, setCanvasToolMode] = useState('watermark'); // 'watermark' | 'pan' | 'scale' | 'rotate' | 'opacity' | 'eyedropper'
    const [dragHud, setDragHud] = useState(null);
    const viewport = useStudioViewport({ minZoom: 0.05, maxZoom: 8, initialZoom: 1 });

    // Batch export state
    const [exporting, setExporting] = useState(false);
    const [exportProgress, setExportProgress] = useState(0);
    const [exportDoneCount, setExportDoneCount] = useState(0);
    const batchCtrl = useBatchControl();

    const activeItem = items.find((it) => it.id === activeId) || items[0] || null;

    // Clean up all object URLs & decoded handles on unmount
    useEffect(() => {
        return () => {
            batchRunRef.current++;
            activeDecodedRef.current?.revoke?.();
            wmDecodedRef.current?.revoke?.();
            if (wmPreviewUrlRef.current) URL.revokeObjectURL(wmPreviewUrlRef.current);
            itemsRef.current.forEach((it) => {
                if (it.sourcePreviewUrl) URL.revokeObjectURL(it.sourcePreviewUrl);
                if (it.processedUrl) URL.revokeObjectURL(it.processedUrl);
            });
        };
    }, []);

    useEffect(() => {
        if (!studioOpen) return;
        const onKeyDown = (e) => {
            if (e.key === 'Escape' && !exporting) {
                setStudioOpen(false);
            }
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [studioOpen, exporting]);

    // Decode the selected image into memory whenever activeItem changes
    useEffect(() => {
        let cancelled = false;
        if (!activeItem) {
            activeDecodedRef.current?.revoke?.();
            activeDecodedRef.current = null;
            setActiveDims({ width: 0, height: 0 });
            return;
        }
        if (activeDecodedRef.current?.id === activeItem.id) {
            setPreviewTick((t) => t + 1);
            return;
        }
        loadImageFromFileOrUrl(activeItem.file)
            .then((loaded) => {
                if (cancelled) {
                    loaded.revoke?.();
                    return;
                }
                activeDecodedRef.current?.revoke?.();
                activeDecodedRef.current = {
                    id: activeItem.id,
                    img: loaded.img,
                    width: loaded.width,
                    height: loaded.height,
                    revoke: loaded.revoke,
                };
                setActiveDims({ width: loaded.width, height: loaded.height });
                setPreviewTick((t) => t + 1);
            })
            .catch(() => {
                if (!cancelled) toast.error(`Could not decode ${activeItem.name}`);
            });

        return () => {
            cancelled = true;
        };
    }, [activeItem?.id]);

    // Decode watermark logo whenever selected
    useEffect(() => {
        let cancelled = false;
        if (watermarkType !== 'logo' || !wmFileOrUrl) {
            wmDecodedRef.current?.revoke?.();
            wmDecodedRef.current = null;
            setPreviewTick((t) => t + 1);
            return;
        }
        loadImageFromFileOrUrl(wmFileOrUrl)
            .then((loaded) => {
                if (cancelled) {
                    loaded.revoke?.();
                    return;
                }
                wmDecodedRef.current?.revoke?.();
                wmDecodedRef.current = { img: loaded.img, revoke: loaded.revoke };
                setPreviewTick((t) => t + 1);
            })
            .catch(() => {
                if (!cancelled) toast.error('Could not decode watermark logo');
            });
        return () => {
            cancelled = true;
        };
    }, [watermarkType, wmFileOrUrl]);

    // Live real-time canvas render
    useEffect(() => {
        const canvas = previewCanvasRef.current;
        const decoded = activeDecodedRef.current;
        if (!canvas || !decoded?.img || !studioOpen) return;

        const raf = requestAnimationFrame(() => {
            if (showOriginal) {
                if (canvas.width !== decoded.width) canvas.width = decoded.width;
                if (canvas.height !== decoded.height) canvas.height = decoded.height;
                const ctx = canvas.getContext('2d');
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(decoded.img, 0, 0, decoded.width, decoded.height);
                return;
            }

            renderWatermarkedCanvas(decoded.img, {
                watermarkType,
                watermarkImg: wmDecodedRef.current?.img || null,
                watermarkText,
                textColor,
                fontFamily,
                fontWeight,
                shadowEnabled,
                position,
                opacity: opacity / 100,
                scalePct,
                marginPct,
                rotationDeg,
                offsetXPct,
                offsetYPct,
                tileGapPct,
                targetCanvas: canvas,
            });
        });

        return () => cancelAnimationFrame(raf);
    }, [
        studioOpen,
        previewTick,
        showOriginal,
        watermarkType,
        watermarkText,
        fontFamily,
        fontWeight,
        textColor,
        shadowEnabled,
        position,
        opacity,
        scalePct,
        marginPct,
        rotationDeg,
        offsetXPct,
        offsetYPct,
        tileGapPct,
    ]);

    const handleTargetFiles = (list) => {
        const valid = Array.from(list || []).filter((f) => f.type.startsWith('image/'));
        if (!valid.length) {
            toast.error('Please upload valid image files.');
            return;
        }
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
        }));
        const hadExisting = items.length > 0;
        setItems((prev) => [...prev, ...added]);
        setActiveId((prev) => prev || added[0].id);
        if (added.length === 1 || !studioOpen) {
            setActiveId(added[0].id);
        }
        setStudioOpen(true);
        if (hadExisting) {
            toast.success(`Added ${added.length} image(s) to studio`);
        }
    };

    const isFileDrag = (e) => {
        const types = e.dataTransfer?.types;
        return (types && Array.from(types).includes('Files')) || (e.dataTransfer?.files?.length || 0) > 0;
    };

    const handleStudioDragEnter = (e) => {
        if (!isFileDrag(e)) return;
        e.preventDefault();
        e.stopPropagation();
        studioDragDepthRef.current += 1;
        setIsStudioDragging(true);
    };

    const handleStudioDragOver = (e) => {
        if (!isFileDrag(e)) return;
        e.preventDefault();
        e.stopPropagation();
        if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
        if (!isStudioDragging) setIsStudioDragging(true);
    };

    const handleStudioDragLeave = (e) => {
        if (!isFileDrag(e)) return;
        e.preventDefault();
        e.stopPropagation();
        studioDragDepthRef.current = Math.max(0, studioDragDepthRef.current - 1);
        if (studioDragDepthRef.current === 0) {
            setIsStudioDragging(false);
        }
    };

    const handleStudioDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        studioDragDepthRef.current = 0;
        setIsStudioDragging(false);
        if (exporting) return;
        if (e.dataTransfer?.files?.length) {
            handleTargetFiles(e.dataTransfer.files);
        }
    };

    const handleWmLogoSelect = (file) => {
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            toast.error('Please choose a valid PNG, WebP, or SVG logo image.');
            return;
        }
        if (wmPreviewUrlRef.current) {
            URL.revokeObjectURL(wmPreviewUrlRef.current);
            wmPreviewUrlRef.current = '';
        }
        const preview = URL.createObjectURL(file);
        wmPreviewUrlRef.current = preview;
        setWatermarkType('logo');
        setWmFileOrUrl(file);
        setWmName(file.name);
        setWmThumbUrl(preview);
    };

    const handleWmLogoDragEnter = (e) => {
        if (!isFileDrag(e)) return;
        e.preventDefault();
        e.stopPropagation();
        wmLogoDragDepthRef.current += 1;
        setIsWmLogoDragging(true);
    };

    const handleWmLogoDragOver = (e) => {
        if (!isFileDrag(e)) return;
        e.preventDefault();
        e.stopPropagation();
        if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
        if (!isWmLogoDragging) setIsWmLogoDragging(true);
    };

    const handleWmLogoDragLeave = (e) => {
        if (!isFileDrag(e)) return;
        e.preventDefault();
        e.stopPropagation();
        wmLogoDragDepthRef.current = Math.max(0, wmLogoDragDepthRef.current - 1);
        if (wmLogoDragDepthRef.current === 0) {
            setIsWmLogoDragging(false);
        }
    };

    const handleWmLogoDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        wmLogoDragDepthRef.current = 0;
        setIsWmLogoDragging(false);
        studioDragDepthRef.current = 0;
        setIsStudioDragging(false);
        const file = e.dataTransfer?.files?.[0];
        if (file) {
            handleWmLogoSelect(file);
        }
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
        activeDecodedRef.current?.revoke?.();
        activeDecodedRef.current = null;
        setItems([]);
        setActiveId(null);
        setStudioOpen(false);
    };

    const handleSelectPosition = (nextPos) => {
        const wasTile = position === 'tile';
        const willBeTile = nextPos === 'tile';
        setPosition(nextPos);
        setOffsetXPct(0);
        setOffsetYPct(0);
        if (!wasTile && willBeTile) {
            if (rotationDeg === 0) setRotationDeg(-25);
            if (canvasToolMode === 'watermark') setCanvasToolMode('pan');
        } else if (wasTile && !willBeTile && rotationDeg === -25) {
            setRotationDeg(0);
        }
    };

    const handleResetStyle = () => {
        setPosition('bottom-right');
        setOpacity(75);
        setScalePct(22);
        setMarginPct(4);
        setRotationDeg(0);
        setOffsetXPct(0);
        setOffsetYPct(0);
        setTileGapPct(34);
        setFontFamily('sans');
        setFontWeight('700');
        setTextColor('#ffffff');
        setShadowEnabled(true);
    };

    const effectiveCanvasTool =
        position === 'tile' && canvasToolMode === 'watermark' ? 'pan' : canvasToolMode;
    const activeToolMeta =
        CANVAS_TOOLS.find((t) => t.id === effectiveCanvasTool) || CANVAS_TOOLS[0];
    const ActiveToolIcon = activeToolMeta.icon;

    const sampleImageHexAtPointer = (e) => {
        const canvas = previewCanvasRef.current;
        const decoded = activeDecodedRef.current;
        if (!canvas || !decoded?.img) return null;
        const rect = canvas.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) return null;
        const normX = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        const normY = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
        const imgW = decoded.width || decoded.img.naturalWidth || 1;
        const imgH = decoded.height || decoded.img.naturalHeight || 1;
        const px = Math.min(imgW - 1, Math.max(0, Math.floor(normX * imgW)));
        const py = Math.min(imgH - 1, Math.max(0, Math.floor(normY * imgH)));
        if (!samplerCanvasRef.current) {
            samplerCanvasRef.current = document.createElement('canvas');
            samplerCanvasRef.current.width = 1;
            samplerCanvasRef.current.height = 1;
        }
        const sctx = samplerCanvasRef.current.getContext('2d', { willReadFrequently: true });
        sctx.clearRect(0, 0, 1, 1);
        sctx.drawImage(decoded.img, px, py, 1, 1, 0, 0, 1, 1);
        const [r, g, b] = sctx.getImageData(0, 0, 1, 1).data;
        const hex = `#${[r, g, b].map((n) => n.toString(16).padStart(2, '0')).join('')}`;
        setTextColor(hex);
        if (watermarkType !== 'text') setWatermarkType('text');
        setDragHud({ label: 'Sampled Color', value: hex.toUpperCase(), swatch: hex });
        return hex;
    };

    // Interactive pointer manipulation on preview canvas for active toolbar tool
    const handleCanvasPointerDown = (e) => {
        if (effectiveCanvasTool === 'pan' || showOriginal || !previewCanvasRef.current) return;
        e.currentTarget.setPointerCapture?.(e.pointerId);
        if (effectiveCanvasTool === 'eyedropper') {
            dragRef.current = { tool: 'eyedropper' };
            sampleImageHexAtPointer(e);
            return;
        }
        const rect = previewCanvasRef.current.getBoundingClientRect();
        dragRef.current = {
            tool: effectiveCanvasTool,
            startX: e.clientX,
            startY: e.clientY,
            origOffX: offsetXPct,
            origOffY: offsetYPct,
            origScale: scalePct,
            origRot: rotationDeg,
            origOpacity: opacity,
            rectW: Math.max(1, rect.width),
            rectH: Math.max(1, rect.height),
        };
    };

    const handleCanvasPointerMove = (e) => {
        if (!dragRef.current) return;
        const {
            tool: dragTool,
            startX,
            startY,
            origOffX,
            origOffY,
            origScale,
            origRot,
            origOpacity,
            rectW,
            rectH,
        } = dragRef.current;

        if (dragTool === 'eyedropper') {
            sampleImageHexAtPointer(e);
            return;
        }
        if (dragTool === 'watermark') {
            const dxPct = ((e.clientX - startX) / rectW) * 100;
            const dyPct = ((e.clientY - startY) / rectH) * 100;
            const nextX = Math.round(Math.max(-50, Math.min(50, origOffX + dxPct)) * 10) / 10;
            const nextY = Math.round(Math.max(-50, Math.min(50, origOffY + dyPct)) * 10) / 10;
            setOffsetXPct(nextX);
            setOffsetYPct(nextY);
            setDragHud({
                label: 'Offset',
                value: `${nextX > 0 ? '+' : ''}${nextX}%, ${nextY > 0 ? '+' : ''}${nextY}%`,
            });
            return;
        }
        if (dragTool === 'scale') {
            const delta = ((e.clientX - startX) / Math.max(140, rectW) - (e.clientY - startY) / Math.max(140, rectH)) * 65;
            const next = Math.round(Math.max(5, Math.min(80, origScale + delta)));
            setScalePct(next);
            setDragHud({ label: 'Scale', value: `${next}%` });
            return;
        }
        if (dragTool === 'rotate') {
            let next = Math.round(origRot + ((e.clientX - startX) / Math.max(160, rectW)) * 360);
            while (next > 180) next -= 360;
            while (next < -180) next += 360;
            setRotationDeg(next);
            setDragHud({ label: 'Rotation', value: `${next}°` });
            return;
        }
        if (dragTool === 'opacity') {
            const delta = ((e.clientX - startX) / Math.max(140, rectW) - (e.clientY - startY) / Math.max(140, rectH)) * 90;
            const next = Math.round(Math.max(0, Math.min(100, origOpacity + delta)));
            setOpacity(next);
            setDragHud({ label: 'Opacity', value: `${next}%` });
        }
    };

    const handleCanvasPointerUp = () => {
        dragRef.current = null;
        setDragHud(null);
    };

    const resolveTargetOutput = (file) => {
        if (exportFormat === 'png') return { mime: 'image/png', ext: 'png', bg: null };
        if (exportFormat === 'webp') return { mime: 'image/webp', ext: 'webp', bg: null };
        if (exportFormat === 'jpg') return { mime: 'image/jpeg', ext: 'jpg', bg: '#ffffff' };
        const isJpg = file.type === 'image/jpeg';
        return {
            mime: isJpg ? 'image/jpeg' : 'image/png',
            ext: isJpg ? 'jpg' : 'png',
            bg: isJpg ? '#ffffff' : null,
        };
    };

    const renderSingleBlob = async (file, wmImg) => {
        const { mime, ext, bg } = resolveTargetOutput(file);
        const loaded = await loadImageFromFileOrUrl(file);
        try {
            const canvas = renderWatermarkedCanvas(loaded.img, {
                watermarkType,
                watermarkImg: wmImg,
                watermarkText,
                textColor,
                fontFamily,
                fontWeight,
                shadowEnabled,
                position,
                opacity: opacity / 100,
                scalePct,
                marginPct,
                rotationDeg,
                offsetXPct,
                offsetYPct,
                tileGapPct,
                backgroundColor: bg,
            });
            const blob = await canvasToBlob(canvas, mime, Math.max(0.5, Math.min(1, exportQuality / 100)));
            return { blob, filename: `${stripExtension(file.name)}-watermarked.${ext}` };
        } finally {
            loaded.revoke?.();
        }
    };

    const settingsSig = useMemo(
        () =>
            [
                watermarkType,
                wmName,
                watermarkText,
                fontFamily,
                fontWeight,
                textColor,
                shadowEnabled,
                position,
                opacity,
                scalePct,
                marginPct,
                rotationDeg,
                offsetXPct,
                offsetYPct,
                tileGapPct,
                exportFormat,
                exportQuality,
            ].join('|'),
        [
            watermarkType,
            wmName,
            watermarkText,
            fontFamily,
            fontWeight,
            textColor,
            shadowEnabled,
            position,
            opacity,
            scalePct,
            marginPct,
            rotationDeg,
            offsetXPct,
            offsetYPct,
            tileGapPct,
            exportFormat,
            exportQuality,
        ]
    );
    const itemIdsKey = items.map((i) => i.id).join('|');
    const doneCount = items.filter((it) => it.status === 'done' && it.settingsSig === settingsSig).length;
    const batchProcessing = items.length > 0 && doneCount < items.length;
    const batchProgressPct = items.length > 0 ? Math.round((doneCount / items.length) * 100) : 0;

    // Automatically pre-render all queued watermarked items in background
    useEffect(() => {
        if (!itemsRef.current.length) return undefined;

        const stale = itemsRef.current.filter(
            (it) => it.settingsSig !== settingsSig || it.status === 'pending' || it.status === 'processing'
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
            let wmLoaded = null;
            try {
                if (watermarkType === 'logo' && wmFileOrUrl) {
                    wmLoaded = await loadImageFromFileOrUrl(wmFileOrUrl);
                }
            } catch {
                wmLoaded = null;
            }
            if (batchRunRef.current !== runId) {
                wmLoaded?.revoke?.();
                return;
            }

            const processedInRun = new Set();
            try {
                while (batchRunRef.current === runId) {
                    const candidates = itemsRef.current.filter(
                        (it) =>
                            !processedInRun.has(it.id) &&
                            (staleSet.has(it.id) || it.settingsSig !== settingsSig || it.status === 'pending')
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
                        const res = await renderSingleBlob(nextRow.file, wmLoaded?.img || null);
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
                                    settingsSig,
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
            } finally {
                wmLoaded?.revoke?.();
            }
        }, 180);

        return () => clearTimeout(timer);
    }, [itemIdsKey, settingsSig, watermarkType, wmFileOrUrl]);

    const handleDownloadCurrent = async () => {
        if (!activeItem) return;
        if (watermarkType === 'logo' && !wmFileOrUrl) {
            toast.error('Upload a PNG logo watermark or switch to Text.');
            return;
        }
        setExporting(true);
        let wmLoaded = null;
        try {
            let res =
                activeItem.status === 'done' &&
                activeItem.settingsSig === settingsSig &&
                activeItem.result?.blob
                    ? activeItem.result
                    : null;
            if (!res) {
                if (watermarkType === 'logo' && wmFileOrUrl) {
                    wmLoaded = await loadImageFromFileOrUrl(wmFileOrUrl);
                }
                res = await renderSingleBlob(activeItem.file, wmLoaded?.img || null);
            }
            const { blob, filename } = res;
            triggerSiteBlobDownload(blob, filename, websiteInfo);
            onTrackEvent?.({
                slug: tool.slug,
                eventType: 'convert',
                filesCount: 1,
                inputBytes: activeItem.size,
                outputBytes: blob.size,
            });
            toast.success(`Downloaded ${filename}`);
        } catch {
            toast.error('Failed to export image');
        } finally {
            wmLoaded?.revoke?.();
            setExporting(false);
        }
    };

    const handleDownloadAllZip = async () => {
        if (!items.length) return;
        if (watermarkType === 'logo' && !wmFileOrUrl) {
            toast.error('Upload a PNG logo watermark or switch to Text.');
            return;
        }
        batchCtrl.reset();
        setExporting(true);
        setExportProgress(0);
        setExportDoneCount(0);

        let wmLoaded = null;
        try {
            const renderedEntries = [];
            const usedNames = new Map();
            let inSum = 0;
            let outSum = 0;

            for (let i = 0; i < items.length; i++) {
                if (await batchCtrl.waitIfPausedOrStopped()) {
                    toast.info(`Stopped after ${renderedEntries.length} image(s).`);
                    break;
                }
                const row = items[i];
                let res =
                    row.status === 'done' && row.settingsSig === settingsSig && row.result?.blob
                        ? row.result
                        : null;
                if (!res) {
                    if (watermarkType === 'logo' && wmFileOrUrl && !wmLoaded) {
                        wmLoaded = await loadImageFromFileOrUrl(wmFileOrUrl);
                    }
                    res = await renderSingleBlob(row.file, wmLoaded?.img || null);
                }
                const { blob, filename } = res;
                const tagged = appendDomainToFilename(filename, websiteInfo);
                const count = (usedNames.get(tagged) || 0) + 1;
                usedNames.set(tagged, count);
                const uniqueName = count === 1 ? tagged : tagged.replace(/(\.[^.]+)$/, `-${count}$1`);

                renderedEntries.push({ filename: uniqueName, blob });
                inSum += row.size;
                outSum += blob.size;
                setExportDoneCount(i + 1);
                setExportProgress(Math.round(((i + 1) / items.length) * 100));
                await new Promise((r) => requestAnimationFrame(r));
            }

            if (renderedEntries.length === 1 && items.length === 1) {
                triggerSiteBlobDownload(renderedEntries[0].blob, renderedEntries[0].filename, websiteInfo);
            } else if (renderedEntries.length > 0) {
                const zipBlob = await buildZipBlob(renderedEntries);
                triggerSiteBlobDownload(zipBlob, 'watermarked-images.zip', websiteInfo);
                onTrackEvent?.({
                    slug: tool.slug,
                    eventType: 'convert',
                    filesCount: renderedEntries.length,
                    inputBytes: inSum,
                    outputBytes: outSum,
                });
                toast.success(`Exported ${renderedEntries.length} watermarked image(s) as ZIP!`);
            }
        } catch {
            toast.error('Failed to export batch ZIP');
        } finally {
            wmLoaded?.revoke?.();
            setExporting(false);
        }
    };

    const showQualitySlider =
        exportFormat === 'jpg' ||
        exportFormat === 'webp' ||
        (exportFormat === 'auto' && activeItem?.file?.type === 'image/jpeg');

    return (
        <section className="w-full space-y-6">
            <input
                ref={targetInputRef}
                type="file"
                multiple
                accept={tool.accept}
                className="hidden"
                onChange={(e) => {
                    if (e.target.files?.length) handleTargetFiles(e.target.files);
                    e.target.value = '';
                }}
            />
            <input
                ref={wmInputRef}
                type="file"
                accept="image/png,image/webp,image/svg+xml,.png,.webp,.svg"
                className="hidden"
                onChange={(e) => {
                    if (e.target.files?.[0]) handleWmLogoSelect(e.target.files[0]);
                    e.target.value = '';
                }}
            />

            {/* Initial Drop Zone (disappears once images are queued) */}
            {items.length === 0 && (
                <div
                    onDragOver={(e) => {
                        e.preventDefault();
                        setIsDragging(true);
                    }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={(e) => {
                        e.preventDefault();
                        setIsDragging(false);
                        handleTargetFiles(e.dataTransfer.files);
                    }}
                    onClick={() => targetInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-2xl p-10 sm:p-14 text-center cursor-pointer transition-all space-y-3 ${
                        isDragging
                            ? 'border-blue-500 bg-blue-500/10 scale-[1.01]'
                            : 'border-card-border hover:border-blue-500/50 bg-card-bg'
                    }`}
                >
                    <div className="w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/25 flex items-center justify-center text-blue-500 mx-auto">
                        <Stamp className="w-7 h-7" />
                    </div>
                    <div className="text-base sm:text-lg font-bold text-foreground">
                        Drop one or more images here to open the live Watermark Studio
                    </div>
                    <p className="text-xs text-foreground/55">
                        PNG, JPG, WebP, or BMP · Real-time live preview &amp; batch export locally in your browser
                    </p>
                </div>
            )}

            {/* Compact Page Summary when user closes the popup editor */}
            {items.length > 0 && !studioOpen && (
                <div
                    onDragEnter={handleStudioDragEnter}
                    onDragOver={handleStudioDragOver}
                    onDragLeave={handleStudioDragLeave}
                    onDrop={handleStudioDrop}
                    className={`border rounded-2xl p-5 sm:p-6 shadow-xl flex flex-wrap items-center justify-between gap-4 transition-colors ${
                        isStudioDragging
                            ? 'bg-blue-500/10 border-blue-500 border-dashed'
                            : 'bg-card-bg border-card-border'
                    }`}
                >
                    <div className="flex items-center gap-3.5 min-w-0">
                        <div className="flex -space-x-2 shrink-0">
                            {items.slice(0, 3).map((it) => (
                                <img
                                    key={it.id}
                                    src={it.sourcePreviewUrl}
                                    alt={it.name}
                                    className="w-11 h-11 rounded-xl border-2 border-card-bg object-cover bg-background"
                                />
                            ))}
                        </div>
                        <div className="min-w-0">
                            <div className="text-sm font-bold text-foreground truncate max-w-[280px]">
                                {items.length === 1 ? items[0].name : `${items.length} images ready for watermark export`}
                            </div>
                            <div className="text-xs text-foreground/60 mt-0.5">
                                {watermarkType === 'text'
                                    ? `Text: "${watermarkText}"`
                                    : wmName
                                      ? `Logo: ${wmName}`
                                      : 'Logo watermark'}{' '}
                                · {position === 'tile' ? 'Tiled' : position} · {opacity}% opacity
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5">
                        <button
                            type="button"
                            onClick={() => targetInputRef.current?.click()}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-background hover:bg-card-header-bg border border-card-border hover:border-blue-500/40 text-xs font-bold text-foreground cursor-pointer transition-colors"
                        >
                            <Plus className="w-4 h-4 text-blue-500" />
                            <span>Add Images</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setStudioOpen(true)}
                            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-background hover:bg-card-header-bg border border-card-border hover:border-blue-500/40 text-xs font-bold text-foreground cursor-pointer transition-colors"
                        >
                            <Sliders className="w-4 h-4 text-blue-500" />
                            <span>Open Live Studio</span>
                        </button>

                        <button
                            type="button"
                            disabled={exporting}
                            onClick={items.length > 1 ? handleDownloadAllZip : handleDownloadCurrent}
                            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-600/25 cursor-pointer disabled:opacity-50 transition-colors"
                        >
                            {items.length > 1 ? <FileArchive className="w-4 h-4" /> : <Download className="w-4 h-4" />}
                            <span>{items.length > 1 ? `Download All (${items.length}) .zip` : 'Download Watermarked'}</span>
                        </button>

                        <button
                            type="button"
                            onClick={clearQueue}
                            aria-label="Clear images"
                            className="p-2.5 rounded-xl border border-card-border text-foreground/60 hover:text-rose-500 hover:border-rose-500/40 cursor-pointer transition-colors"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}

            {/* Full-Width Live Watermark Studio Popup */}
            {studioOpen && items.length > 0 && (
                <div
                    role="dialog"
                    aria-modal="true"
                    aria-label="Live Watermark Editor Studio"
                    onClick={() => !exporting && setStudioOpen(false)}
                    className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-2 sm:p-3"
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        className="relative w-full max-w-none h-[95vh] bg-card-bg border border-card-border rounded-2xl shadow-2xl flex flex-col overflow-hidden"
                    >
                        {/* Modal Header */}
                        <div className="px-4 sm:px-5 py-3 border-b border-card-border flex flex-wrap items-center justify-between gap-3 shrink-0">
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/25 flex items-center justify-center text-blue-500 shrink-0">
                                    <Stamp className="w-4 h-4" />
                                </div>
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <h3 className="font-bold text-sm text-foreground truncate max-w-[180px] sm:max-w-[280px]">
                                            {activeItem?.name || 'Watermark Studio'}
                                        </h3>
                                        {activeDims.width > 0 && (
                                            <span className="px-2 py-0.5 rounded-md bg-background border border-card-border font-mono text-[10px] text-foreground/65">
                                                {activeDims.width}×{activeDims.height}px
                                            </span>
                                        )}
                                        <span className="px-2 py-0.5 rounded-md bg-blue-500/10 border border-blue-500/25 font-mono text-[10px] font-bold text-blue-500">
                                            {Math.max(1, items.findIndex((i) => i.id === activeItem?.id) + 1)} / {items.length}
                                        </span>
                                    </div>
                                    <div className="text-[11px] text-foreground/55">
                                        {exporting
                                            ? `Exporting ${exportDoneCount} of ${items.length} (${exportProgress}%)...`
                                            : 'All changes preview live · Applied uniformly across your batch on export'}
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                                <button
                                    type="button"
                                    disabled={exporting}
                                    onClick={() => targetInputRef.current?.click()}
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
                                              : 'Download Watermarked'}
                                    </span>
                                </button>

                                <button
                                    type="button"
                                    disabled={exporting}
                                    onClick={() => setStudioOpen(false)}
                                    aria-label="Close studio"
                                    className="p-1.5 rounded-lg text-foreground/60 hover:text-foreground hover:bg-background cursor-pointer disabled:opacity-40 transition-colors"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {(exporting || batchProcessing) && (
                            <div className="px-5 py-2 border-b border-card-border bg-background/60 shrink-0 space-y-1">
                                <div className="flex items-center justify-between text-[11px] font-semibold text-foreground/70">
                                    <span>
                                        {exporting
                                            ? `Packing ZIP archive (${exportDoneCount} / ${items.length})...`
                                            : `Rendering watermarks in background (${doneCount} / ${items.length})...`}
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
                        )}

                        {/* 2-Column Live Workspace */}
                        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 overflow-y-auto lg:overflow-hidden">
                            {/* Left Sidebar: Live Controls */}
                            <div className="lg:col-span-4 xl:col-span-3 border-b lg:border-b-0 lg:border-r border-card-border bg-background/50 p-4 sm:p-5 space-y-4 lg:overflow-y-auto text-xs">
                                <div className="flex items-center justify-between gap-2 pb-2 border-b border-card-border">
                                    <div className="flex items-center gap-2 font-bold text-foreground">
                                        <Sliders className="w-4 h-4 text-blue-500" />
                                        <span>Live Watermark Controls</span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleResetStyle}
                                        className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-500 hover:underline cursor-pointer"
                                    >
                                        <RotateCcw className="w-3 h-3" />
                                        <span>Reset</span>
                                    </button>
                                </div>

                                {/* 1. Watermark Source */}
                                <div className="p-3.5 rounded-xl bg-card-bg border border-card-border space-y-3">
                                    <span className="font-bold text-foreground/85 block">Watermark Source</span>
                                    <div className="grid grid-cols-2 gap-1.5">
                                        <button
                                            type="button"
                                            onClick={() => setWatermarkType('text')}
                                            className={`py-2 rounded-lg border font-bold cursor-pointer inline-flex items-center justify-center gap-1.5 transition-colors ${
                                                watermarkType === 'text'
                                                    ? 'bg-blue-600 text-white border-blue-500'
                                                    : 'border-card-border text-foreground/70 hover:text-foreground'
                                            }`}
                                        >
                                            <Type className="w-3.5 h-3.5" />
                                            <span>Text</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setWatermarkType('logo')}
                                            className={`py-2 rounded-lg border font-bold cursor-pointer inline-flex items-center justify-center gap-1.5 transition-colors ${
                                                watermarkType === 'logo'
                                                    ? 'bg-blue-600 text-white border-blue-500'
                                                    : 'border-card-border text-foreground/70 hover:text-foreground'
                                            }`}
                                        >
                                            <ImageIcon className="w-3.5 h-3.5" />
                                            <span>PNG Logo</span>
                                        </button>
                                    </div>

                                    {watermarkType === 'text' ? (
                                        <div className="space-y-2.5 pt-1">
                                            <textarea
                                                rows={2}
                                                value={watermarkText}
                                                onChange={(e) => setWatermarkText(e.target.value)}
                                                placeholder="Enter watermark text (multi-line supported)"
                                                className="w-full bg-input-bg border border-input-border rounded-lg px-2.5 py-2 text-xs text-input-text focus:outline-none focus:border-blue-500 resize-none"
                                            />
                                            <div className="grid grid-cols-2 gap-2">
                                                <div>
                                                    <label className="text-[10px] font-bold text-foreground/60 block mb-1">
                                                        Font Style
                                                    </label>
                                                    <StudioSelect
                                                        size="sm"
                                                        aria-label="Watermark font style"
                                                        value={fontFamily}
                                                        onChange={(e) => setFontFamily(e.target.value)}
                                                        className="w-full"
                                                    >
                                                        <option value="sans">Modern Sans</option>
                                                        <option value="serif">Editorial Serif</option>
                                                        <option value="mono">Monospace</option>
                                                        <option value="display">Bold Display</option>
                                                    </StudioSelect>
                                                </div>
                                                <div>
                                                    <label className="text-[10px] font-bold text-foreground/60 block mb-1">
                                                        Weight
                                                    </label>
                                                    <StudioSelect
                                                        size="sm"
                                                        aria-label="Watermark font weight"
                                                        value={fontWeight}
                                                        onChange={(e) => setFontWeight(e.target.value)}
                                                        className="w-full"
                                                    >
                                                        <option value="600">SemiBold</option>
                                                        <option value="700">Bold</option>
                                                        <option value="900">Black</option>
                                                    </StudioSelect>
                                                </div>
                                            </div>
                                            <div className="flex items-center justify-between gap-2 pt-0.5">
                                                <StudioColorPicker
                                                    value={textColor}
                                                    onChange={setTextColor}
                                                    ariaLabel="Watermark text color"
                                                    showHexLabel
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShadowEnabled((v) => !v)}
                                                    className={`px-2.5 py-1 rounded-lg border font-bold cursor-pointer ${
                                                        shadowEnabled
                                                            ? 'border-blue-500 bg-blue-500/15 text-blue-500'
                                                            : 'border-card-border text-foreground/60'
                                                    }`}
                                                >
                                                    Shadow {shadowEnabled ? 'On' : 'Off'}
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div
                                            data-wm-logo-dropzone="true"
                                            onDragEnter={handleWmLogoDragEnter}
                                            onDragOver={handleWmLogoDragOver}
                                            onDragLeave={handleWmLogoDragLeave}
                                            onDrop={handleWmLogoDrop}
                                            className={`space-y-2 pt-1.5 rounded-xl transition-all ${
                                                isWmLogoDragging
                                                    ? 'p-2 bg-blue-500/10 border-2 border-dashed border-blue-500'
                                                    : ''
                                            }`}
                                        >
                                            {wmThumbUrl && (
                                                <div
                                                    className="h-16 rounded-lg border border-card-border flex items-center justify-center p-2 overflow-hidden"
                                                    style={CHECKER_BG_STYLE}
                                                >
                                                    <img
                                                        src={wmThumbUrl}
                                                        alt={wmName || 'Watermark logo'}
                                                        className="max-h-full max-w-full object-contain pointer-events-none"
                                                    />
                                                </div>
                                            )}
                                            <div className="flex items-center gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => wmInputRef.current?.click()}
                                                    className={`flex-1 py-2 px-3 rounded-lg border border-dashed font-bold truncate cursor-pointer inline-flex items-center justify-center gap-1.5 transition-colors ${
                                                        isWmLogoDragging
                                                            ? 'border-blue-500 text-blue-500 bg-blue-500/5'
                                                            : 'border-card-border hover:border-blue-500 text-foreground/85'
                                                    }`}
                                                >
                                                    <UploadCloud className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                                                    <span className="truncate">
                                                        {isWmLogoDragging
                                                            ? 'Drop PNG logo here'
                                                            : wmName
                                                              ? wmName
                                                              : 'Drop or Upload PNG Logo'}
                                                    </span>
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setShadowEnabled((v) => !v)}
                                                    className={`px-2.5 py-2 rounded-lg border font-bold cursor-pointer shrink-0 ${
                                                        shadowEnabled
                                                            ? 'border-blue-500 bg-blue-500/15 text-blue-500'
                                                            : 'border-card-border text-foreground/60'
                                                    }`}
                                                >
                                                    Shadow
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* 2. Size & Opacity */}
                                <div className="p-3.5 rounded-xl bg-card-bg border border-card-border space-y-3">
                                    <div className="space-y-1.5">
                                        <div className="flex justify-between font-bold">
                                            <span>Opacity</span>
                                            <span className="font-mono text-blue-500">{opacity}%</span>
                                        </div>
                                        <input
                                            type="range"
                                            min={0}
                                            max={100}
                                            value={opacity}
                                            aria-label="Watermark opacity"
                                            onChange={(e) => setOpacity(Number(e.target.value))}
                                            className="w-full accent-blue-500 cursor-pointer touch-none"
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <div className="flex justify-between font-bold">
                                            <span>Scale</span>
                                            <span className="font-mono text-blue-500">{scalePct}%</span>
                                        </div>
                                        <input
                                            type="range"
                                            min={5}
                                            max={80}
                                            value={scalePct}
                                            aria-label="Watermark scale"
                                            onChange={(e) => setScalePct(Number(e.target.value))}
                                            className="w-full accent-blue-500 cursor-pointer touch-none"
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <div className="flex items-center justify-between font-bold">
                                            <span>Rotation</span>
                                            <span className="font-mono text-blue-500">{rotationDeg}°</span>
                                        </div>
                                        <input
                                            type="range"
                                            min={-180}
                                            max={180}
                                            value={rotationDeg}
                                            aria-label="Watermark rotation"
                                            onChange={(e) => setRotationDeg(Number(e.target.value))}
                                            className="w-full accent-blue-500 cursor-pointer touch-none"
                                        />
                                        <div className="flex flex-wrap gap-1 pt-0.5">
                                            {[-45, -25, 0, 25, 45].map((deg) => (
                                                <button
                                                    key={deg}
                                                    type="button"
                                                    onClick={() => setRotationDeg(deg)}
                                                    className={`px-2 py-0.5 rounded border font-mono text-[10px] font-bold cursor-pointer ${
                                                        rotationDeg === deg
                                                            ? 'border-blue-500 bg-blue-500/15 text-blue-500'
                                                            : 'border-card-border text-foreground/65'
                                                    }`}
                                                >
                                                    {deg}°
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* 3. Placement & Tiling */}
                                <div className="p-3.5 rounded-xl bg-card-bg border border-card-border space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="font-bold text-foreground/85">Placement</span>
                                        <button
                                            type="button"
                                            onClick={() => handleSelectPosition(position === 'tile' ? 'bottom-right' : 'tile')}
                                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border font-bold cursor-pointer transition-colors ${
                                                position === 'tile'
                                                    ? 'bg-blue-600 text-white border-blue-500'
                                                    : 'border-card-border text-foreground/75 hover:border-blue-500/50'
                                            }`}
                                        >
                                            <Grid className="w-3 h-3" />
                                            <span>Diagonal Tile</span>
                                        </button>
                                    </div>

                                    {position !== 'tile' ? (
                                        <>
                                            <div className="grid grid-cols-3 gap-1.5 p-1.5 rounded-xl bg-background border border-card-border">
                                                {ANCHOR_POSITIONS.map((a) => {
                                                    const active = position === a.id;
                                                    return (
                                                        <button
                                                            key={a.id}
                                                            type="button"
                                                            title={a.label}
                                                            aria-label={a.label}
                                                            onClick={() => handleSelectPosition(a.id)}
                                                            className={`h-8 rounded-lg border flex items-center justify-center cursor-pointer transition-colors ${
                                                                active
                                                                    ? 'bg-blue-600 text-white border-blue-500 shadow-sm'
                                                                    : 'border-card-border/70 text-foreground/50 hover:border-blue-500/50 hover:text-foreground'
                                                            }`}
                                                        >
                                                            <span
                                                                className={`w-2 h-2 rounded-full ${
                                                                    active ? 'bg-white' : 'bg-current'
                                                                }`}
                                                            />
                                                        </button>
                                                    );
                                                })}
                                            </div>

                                            <div className="space-y-1.5">
                                                <div className="flex justify-between font-bold">
                                                    <span>Edge Margin</span>
                                                    <span className="font-mono text-blue-500">{marginPct}%</span>
                                                </div>
                                                <input
                                                    type="range"
                                                    min={0}
                                                    max={20}
                                                    value={marginPct}
                                                    onChange={(e) => setMarginPct(Number(e.target.value))}
                                                    className="w-full accent-blue-500 cursor-pointer touch-none"
                                                />
                                            </div>

                                            <div className="grid grid-cols-2 gap-2.5 pt-0.5">
                                                <div>
                                                    <div className="flex justify-between font-bold mb-1">
                                                        <span>Nudge X</span>
                                                        <span className="font-mono text-blue-500">{offsetXPct}%</span>
                                                    </div>
                                                    <input
                                                        type="range"
                                                        min={-50}
                                                        max={50}
                                                        value={offsetXPct}
                                                        onChange={(e) => setOffsetXPct(Number(e.target.value))}
                                                        className="w-full accent-blue-500 cursor-pointer touch-none"
                                                    />
                                                </div>
                                                <div>
                                                    <div className="flex justify-between font-bold mb-1">
                                                        <span>Nudge Y</span>
                                                        <span className="font-mono text-blue-500">{offsetYPct}%</span>
                                                    </div>
                                                    <input
                                                        type="range"
                                                        min={-50}
                                                        max={50}
                                                        value={offsetYPct}
                                                        onChange={(e) => setOffsetYPct(Number(e.target.value))}
                                                        className="w-full accent-blue-500 cursor-pointer touch-none"
                                                    />
                                                </div>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="space-y-1.5 pt-1">
                                            <div className="flex justify-between font-bold">
                                                <span>Tile Spacing</span>
                                                <span className="font-mono text-blue-500">{tileGapPct}%</span>
                                            </div>
                                            <input
                                                type="range"
                                                min={15}
                                                max={80}
                                                value={tileGapPct}
                                                onChange={(e) => setTileGapPct(Number(e.target.value))}
                                                className="w-full accent-blue-500 cursor-pointer touch-none"
                                            />
                                        </div>
                                    )}
                                </div>

                                {/* 4. Export Format */}
                                <div className="p-3.5 rounded-xl bg-card-bg border border-card-border space-y-2.5">
                                    <span className="font-bold text-foreground/85 block">Export Format</span>
                                    <div className="grid grid-cols-4 gap-1.5">
                                        {[
                                            { id: 'auto', label: 'ORIG' },
                                            { id: 'png', label: 'PNG' },
                                            { id: 'webp', label: 'WEBP' },
                                            { id: 'jpg', label: 'JPG' },
                                        ].map((fmt) => (
                                            <button
                                                key={fmt.id}
                                                type="button"
                                                onClick={() => setExportFormat(fmt.id)}
                                                className={`py-1.5 rounded-lg border font-mono text-[11px] font-extrabold cursor-pointer transition-colors ${
                                                    exportFormat === fmt.id
                                                        ? 'bg-blue-600 text-white border-blue-500'
                                                        : 'bg-background border-card-border text-foreground/75 hover:border-blue-500/40'
                                                }`}
                                            >
                                                {fmt.label}
                                            </button>
                                        ))}
                                    </div>
                                    {showQualitySlider && (
                                        <div className="space-y-1">
                                            <div className="flex justify-between font-bold">
                                                <span>Quality</span>
                                                <span className="font-mono text-blue-500">{exportQuality}%</span>
                                            </div>
                                            <input
                                                type="range"
                                                min={50}
                                                max={100}
                                                value={exportQuality}
                                                onChange={(e) => setExportQuality(Number(e.target.value))}
                                                className="w-full accent-blue-500 cursor-pointer touch-none"
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Right Panel: Real-time Canvas Stage + Batch Filmstrip (scoped batch image dropzone) */}
                            <div
                                data-wm-batch-dropzone="true"
                                onDragEnter={handleStudioDragEnter}
                                onDragOver={handleStudioDragOver}
                                onDragLeave={handleStudioDragLeave}
                                onDrop={handleStudioDrop}
                                className="relative lg:col-span-8 xl:col-span-9 flex flex-col min-h-0 bg-background/30"
                            >
                                {isStudioDragging && (
                                    <div className="pointer-events-none absolute inset-2 z-30 bg-blue-600/15 backdrop-blur-[2px] border-2 border-dashed border-blue-500 rounded-xl flex items-center justify-center p-6">
                                        <div className="bg-card-bg/95 border border-blue-500/40 rounded-2xl px-6 py-5 shadow-2xl text-center space-y-2 max-w-sm">
                                            <div className="w-12 h-12 rounded-2xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-500 mx-auto">
                                                <UploadCloud className="w-6 h-6" />
                                            </div>
                                            <div className="text-sm sm:text-base font-bold text-foreground">
                                                Drop images to add to studio
                                            </div>
                                            <p className="text-xs text-foreground/60">
                                                Added images will appear in your filmstrip with the current watermark applied
                                            </p>
                                        </div>
                                    </div>
                                )}
                                {/* Stage Top Bar */}
                                <div className="px-4 sm:px-6 py-2.5 border-b border-card-border flex flex-wrap items-center justify-between gap-2 text-xs shrink-0">
                                    <div className="flex items-center gap-2 text-foreground/65">
                                        <ActiveToolIcon className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                                        <span>
                                            <strong className="text-foreground/85">{activeToolMeta.label}</strong>
                                            {' — '}
                                            {activeToolMeta.hint}
                                        </span>
                                    </div>
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

                                {/* Live Canvas Area with Scroll-Wheel Zoom & Drag Pan */}
                                <StudioViewportStage
                                    viewport={viewport}
                                    contentWidth={activeDims.width}
                                    contentHeight={activeDims.height}
                                    autoFitKey={studioOpen && activeItem ? activeItem.id : null}
                                    footerHint={
                                        activeDims.width > 0
                                            ? `${activeDims.width}×${activeDims.height}px`
                                            : undefined
                                    }
                                    topLeftOverlay={
                                        dragHud && (
                                            <div className="pointer-events-none inline-flex items-center gap-2 px-2.5 py-1 rounded-lg bg-slate-950/85 text-white border border-white/10 shadow-lg text-[11px] font-bold backdrop-blur-md">
                                                {dragHud.swatch && (
                                                    <span
                                                        className="w-3 h-3 rounded-sm border border-white/40 shrink-0"
                                                        style={{ backgroundColor: dragHud.swatch }}
                                                    />
                                                )}
                                                <span className="text-white/70">{dragHud.label}:</span>
                                                <span className="font-mono text-blue-400">{dragHud.value}</span>
                                            </div>
                                        )
                                    }
                                    rightVerticalToolbar={
                                        <>
                                            {CANVAS_TOOLS.map((t) => {
                                                const Icon = t.icon;
                                                const disabled = Boolean(t.disabledInTile && position === 'tile');
                                                const isActive = effectiveCanvasTool === t.id;
                                                return (
                                                    <button
                                                        key={t.id}
                                                        type="button"
                                                        disabled={disabled}
                                                        onClick={() => setCanvasToolMode(t.id)}
                                                        title={
                                                            disabled
                                                                ? `${t.label} (disabled in Diagonal Tile mode)`
                                                                : `${t.label} — ${t.hint}`
                                                        }
                                                        aria-label={t.label}
                                                        aria-pressed={isActive}
                                                        className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                                                            disabled
                                                                ? 'text-foreground/25 cursor-not-allowed'
                                                                : isActive
                                                                  ? 'bg-blue-600 text-white shadow-sm cursor-pointer'
                                                                  : 'text-foreground/70 hover:text-foreground hover:bg-background cursor-pointer'
                                                        }`}
                                                    >
                                                        <Icon className="w-4 h-4" />
                                                    </button>
                                                );
                                            })}
                                            <div className="w-5 h-px bg-card-border my-0.5" />
                                            <button
                                                type="button"
                                                onClick={() => handleSelectPosition('center')}
                                                title="Center Watermark (reset offset)"
                                                aria-label="Center Watermark"
                                                className="w-8 h-8 rounded-lg flex items-center justify-center text-foreground/70 hover:text-foreground hover:bg-background cursor-pointer transition-colors"
                                            >
                                                <Crosshair className="w-4 h-4" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    handleSelectPosition(position === 'tile' ? 'bottom-right' : 'tile')
                                                }
                                                title={
                                                    position === 'tile'
                                                        ? 'Switch to Single Watermark'
                                                        : 'Toggle Diagonal Tile Grid'
                                                }
                                                aria-label="Toggle Diagonal Tile Grid"
                                                aria-pressed={position === 'tile'}
                                                className={`w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer transition-colors ${
                                                    position === 'tile'
                                                        ? 'bg-blue-500/15 text-blue-500'
                                                        : 'text-foreground/70 hover:text-foreground hover:bg-background'
                                                }`}
                                            >
                                                <Grid className="w-4 h-4" />
                                            </button>
                                        </>
                                    }
                                >
                                    <canvas
                                        ref={previewCanvasRef}
                                        data-no-pan={effectiveCanvasTool !== 'pan' ? 'true' : undefined}
                                        onPointerDown={
                                            effectiveCanvasTool !== 'pan'
                                                ? handleCanvasPointerDown
                                                : undefined
                                        }
                                        onPointerMove={
                                            effectiveCanvasTool !== 'pan'
                                                ? handleCanvasPointerMove
                                                : undefined
                                        }
                                        onPointerUp={
                                            effectiveCanvasTool !== 'pan'
                                                ? handleCanvasPointerUp
                                                : undefined
                                        }
                                        onPointerCancel={
                                            effectiveCanvasTool !== 'pan'
                                                ? handleCanvasPointerUp
                                                : undefined
                                        }
                                        style={
                                            activeDims.width > 0
                                                ? {
                                                      width: `${activeDims.width}px`,
                                                      height: `${activeDims.height}px`,
                                                      maxWidth: 'none',
                                                      maxHeight: 'none',
                                                  }
                                                : undefined
                                        }
                                        className={`block shrink-0 border border-card-border/70 touch-none ${
                                            effectiveCanvasTool !== 'pan'
                                                ? activeToolMeta.cursor
                                                : viewport.isPanning
                                                  ? 'cursor-grabbing'
                                                  : 'cursor-grab'
                                        }`}
                                    />
                                </StudioViewportStage>

                                <StudioBatchFilmstrip
                                    items={items}
                                    activeId={activeItem?.id}
                                    onSelect={setActiveId}
                                    onRemove={handleRemoveItem}
                                    onAddClick={() => targetInputRef.current?.click()}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
}
