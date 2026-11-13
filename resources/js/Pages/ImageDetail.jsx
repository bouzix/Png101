import React, { useState, useRef, useEffect } from 'react';
import { Head, Link, usePage } from '@inertiajs/react';
import { HexColorPicker } from 'react-colorful';
import { GripHorizontal } from 'lucide-react';
import { toast } from 'sonner';
import Header from '@/components/Header';
import ImageDetails from '@/components/ImageDetails';
import RelatedImages from '@/components/RelatedImages';

const GRADIENT_PRESETS = [
    { name: 'Sunset', from: '#ff7e5f', to: '#feb47b', angle: 135 },
    { name: 'Ocean', from: '#2b5876', to: '#4e4376', angle: 135 },
    { name: 'Cyber', from: '#00f2fe', to: '#4facfe', angle: 135 },
    { name: 'Emerald', from: '#11998e', to: '#38ef7d', angle: 135 },
    { name: 'Royal', from: '#141e30', to: '#243b55', angle: 135 },
    { name: 'Peach', from: '#ffecd2', to: '#fcb69f', angle: 135 },
    { name: 'Berry', from: '#8e2de2', to: '#4a00e0', angle: 135 },
    { name: 'Midnight', from: '#0f0c29', to: '#302b63', angle: 135 },
    { name: 'Cotton', from: '#a18cd1', to: '#fbc2eb', angle: 135 },
    { name: 'Gold', from: '#f6d365', to: '#fda085', angle: 135 },
    { name: 'Mint', from: '#d4fc79', to: '#96e6a1', angle: 135 },
    { name: 'Rose', from: '#ff9a9e', to: '#fecfef', angle: 135 },
];

export default function ImageDetail({
    image,
    relatedImages = [],
    totalRelatedImages = 0,
    collections = [],
}) {
    const { props } = usePage();
    const websiteInfo = props?.websiteInfo || {};
    const siteName = websiteInfo?.websiteName || websiteInfo?.siteName || 'Png101';

    const originalWidth = image.width || 800;
    const originalHeight = image.height || 600;
    const imageSrc = image.path || image.filePath;
    const imageTitle = image.name || image.title || 'TRANSPARENT PNG IMAGE';

    const [downloadWidth, setDownloadWidth] = useState(originalWidth);
    const [downloadHeight, setDownloadHeight] = useState(originalHeight);
    const [downloadFormat, setDownloadFormat] = useState('png');

    // Interactive background preview state
    const [bgMode, setBgMode] = useState('checker');
    const [customBgColor, setCustomBgColor] = useState('#3b82f6');
    const [showColorPicker, setShowColorPicker] = useState(false);
    const pickerRef = useRef(null);

    // Gradient builder state
    const [gradientFrom, setGradientFrom] = useState('#3b82f6');
    const [gradientTo, setGradientTo] = useState('#9333ea');
    const [gradientType, setGradientType] = useState('linear');
    const [gradientAngle, setGradientAngle] = useState(135);
    const [activeGradientStop, setActiveGradientStop] = useState('from');
    const [showGradientPicker, setShowGradientPicker] = useState(false);
    const gradientPickerRef = useRef(null);

    // Draggable popover offset state
    const [customPickerOffset, setCustomPickerOffset] = useState({ x: 0, y: 0 });
    const [gradientPickerOffset, setGradientPickerOffset] = useState({ x: 0, y: 0 });
    const dragInfoRef = useRef({
        active: null,
        startX: 0,
        startY: 0,
        initialOffsetX: 0,
        initialOffsetY: 0,
    });

    const handleStartDrag = (e, type) => {
        const target = e.target;
        if (target.closest('input, button, select, .react-colorful, [data-no-drag]')) return;
        e.preventDefault();
        const currentOffset = type === 'custom' ? customPickerOffset : gradientPickerOffset;
        dragInfoRef.current = {
            active: type,
            startX: e.clientX,
            startY: e.clientY,
            initialOffsetX: currentOffset.x,
            initialOffsetY: currentOffset.y,
        };
    };

    useEffect(() => {
        const handlePointerMove = (e) => {
            const { active, startX, startY, initialOffsetX, initialOffsetY } = dragInfoRef.current;
            if (!active) return;
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            if (active === 'custom') {
                setCustomPickerOffset({ x: initialOffsetX + dx, y: initialOffsetY + dy });
            } else if (active === 'gradient') {
                setGradientPickerOffset({ x: initialOffsetX + dx, y: initialOffsetY + dy });
            }
        };
        const handlePointerUp = () => {
            dragInfoRef.current.active = null;
        };
        window.addEventListener('pointermove', handlePointerMove);
        window.addEventListener('pointerup', handlePointerUp);
        return () => {
            window.removeEventListener('pointermove', handlePointerMove);
            window.removeEventListener('pointerup', handlePointerUp);
        };
    }, []);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (pickerRef.current && !pickerRef.current.contains(e.target)) {
                setShowColorPicker(false);
            }
            if (gradientPickerRef.current && !gradientPickerRef.current.contains(e.target)) {
                setShowGradientPicker(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const [isClient, setIsClient] = useState(false);
    useEffect(() => {
        setIsClient(true);
    }, []);

    const handleResizeApply = (newWidth, newHeight) => {
        setDownloadWidth(newWidth);
        setDownloadHeight(newHeight);
    };

    const getGradientCss = () => {
        if (gradientType === 'radial') {
            return `radial-gradient(circle, ${gradientFrom}, ${gradientTo})`;
        }
        return `linear-gradient(${gradientAngle}deg, ${gradientFrom}, ${gradientTo})`;
    };

    const applyCanvasBackground = (ctx, width, height) => {
        if (bgMode === 'dark') {
            ctx.fillStyle = '#1e293b';
            ctx.fillRect(0, 0, width, height);
        } else if (bgMode === 'black') {
            ctx.fillStyle = '#000000';
            ctx.fillRect(0, 0, width, height);
        } else if (bgMode === 'custom') {
            ctx.fillStyle = customBgColor;
            ctx.fillRect(0, 0, width, height);
        } else if (bgMode === 'gradient') {
            let gradient;
            if (gradientType === 'radial') {
                const centerX = width / 2;
                const centerY = height / 2;
                const radius = Math.max(width, height) / 2;
                gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
            } else {
                const angleRad = (gradientAngle - 90) * (Math.PI / 180);
                const halfW = width / 2;
                const halfH = height / 2;
                const x0 = halfW - Math.cos(angleRad) * halfW;
                const y0 = halfH - Math.sin(angleRad) * halfH;
                const x1 = halfW + Math.cos(angleRad) * halfW;
                const y1 = halfH + Math.sin(angleRad) * halfH;
                gradient = ctx.createLinearGradient(x0, y0, x1, y1);
            }
            gradient.addColorStop(0, gradientFrom);
            gradient.addColorStop(1, gradientTo);
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, width, height);
        } else {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, width, height);
        }
    };

    const getJpgBackground = () => {
        switch (bgMode) {
            case 'dark':
                return { color: '#1e293b', label: 'Dark BG', isGradient: false };
            case 'black':
                return { color: '#000000', label: 'Black BG', isGradient: false };
            case 'custom':
                return { color: customBgColor, label: 'Custom BG', isGradient: false };
            case 'gradient':
                return { color: gradientFrom, label: 'Gradient BG', isGradient: true };
            case 'white':
            case 'checker':
            default:
                return { color: '#ffffff', label: 'White BG', isGradient: false };
        }
    };

    const jpgBgInfo = getJpgBackground();

    const handleDownload = async () => {
        const ext = downloadFormat === 'jpeg' ? 'jpg' : downloadFormat;
        const formatLabel = downloadFormat.toUpperCase();
        toast.success(`Preparing ${formatLabel} (${downloadWidth}x${downloadHeight})...`);

        const isCustomSize = downloadWidth !== originalWidth || downloadHeight !== originalHeight;
        try {
            await fetch('/api/analytics/track', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    imageId: image.id,
                    isCustomSize,
                    resolution: `${downloadWidth}x${downloadHeight}`,
                }),
            });
        } catch (error) {
            console.error('Failed to track download:', error);
        }

        const safeName = imageTitle ? imageTitle.trim().replace(/\s+/g, '-') : 'image';
        const filename = `${safeName}-${downloadWidth}x${downloadHeight}-png101-com.${ext}`;

        if (downloadFormat === 'png' && downloadWidth === originalWidth && downloadHeight === originalHeight) {
            const a = document.createElement('a');
            a.href = `${imageSrc}?download=1`;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            return;
        }

        const canvas = document.createElement('canvas');
        canvas.width = downloadWidth;
        canvas.height = downloadHeight;
        const ctx = canvas.getContext('2d');

        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = imageSrc;

        img.onload = () => {
            if (!ctx) return;
            if (downloadFormat === 'jpeg') {
                applyCanvasBackground(ctx, downloadWidth, downloadHeight);
            } else {
                ctx.clearRect(0, 0, downloadWidth, downloadHeight);
            }

            ctx.drawImage(img, 0, 0, downloadWidth, downloadHeight);

            const mime =
                downloadFormat === 'jpeg'
                    ? 'image/jpeg'
                    : downloadFormat === 'webp'
                    ? 'image/webp'
                    : 'image/png';
            const quality = downloadFormat === 'jpeg' || downloadFormat === 'webp' ? 0.95 : undefined;

            canvas.toBlob((blob) => {
                if (blob) {
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = filename;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                }
            }, mime, quality);
        };
    };

    const displaySrc = isClient ? imageSrc : (image.previewPath || imageSrc);

    const getPreviewBgStyle = () => {
        switch (bgMode) {
            case 'white':
                return { backgroundColor: '#ffffff' };
            case 'dark':
                return { backgroundColor: '#1e293b' };
            case 'black':
                return { backgroundColor: '#000000' };
            case 'custom':
                return { backgroundColor: customBgColor };
            case 'gradient':
                return { backgroundImage: getGradientCss() };
            case 'checker':
            default:
                return {
                    backgroundImage: `
                        linear-gradient(45deg, #334155 25%, transparent 25%),
                        linear-gradient(-45deg, #334155 25%, transparent 25%),
                        linear-gradient(45deg, transparent 75%, #334155 75%),
                        linear-gradient(-45deg, transparent 75%, #334155 75%)
                    `,
                    backgroundSize: '20px 20px',
                    backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
                };
        }
    };

    const is4K = (image.width && image.width >= 3840) || (image.height && image.height >= 2160);
    const isHD = (image.width && image.width >= 1920) || (image.height && image.height >= 1080);

    return (
        <div className="min-h-screen bg-background text-foreground font-sans selection:bg-blue-500/30">
            <Head title={`${imageTitle} - Free Transparent PNG | ${siteName}`} />
            <Header />

            <main className="container mx-auto px-4 py-8 max-w-7xl">
                {/* Breadcrumbs */}
                <nav aria-label="Breadcrumb" className="mb-4 text-xs text-foreground/50 flex items-center gap-1.5 flex-wrap">
                    <Link href="/" className="hover:text-primary-glow transition-colors">Home</Link>
                    <span>/</span>
                    <Link href="/latest" className="hover:text-primary-glow transition-colors">Images</Link>
                    <span>/</span>
                    <span className="text-foreground/80 font-medium truncate max-w-xs">{imageTitle}</span>
                </nav>

                <div className="text-center mb-6">
                    <h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground uppercase">
                        {imageTitle}
                    </h1>

                    {/* Spec Badges */}
                    <div className="flex items-center justify-center gap-2 mt-3 flex-wrap text-xs">
                        {is4K ? (
                            <span className="px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-bold uppercase tracking-wider">
                                4K Ultra HD
                            </span>
                        ) : isHD ? (
                            <span className="px-2.5 py-1 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/30 font-semibold uppercase tracking-wider">
                                Full HD
                            </span>
                        ) : (
                            <span className="px-2.5 py-1 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/30 font-semibold uppercase tracking-wider">
                                High Res
                            </span>
                        )}
                        <span className="px-2.5 py-1 rounded-full bg-primary-glow/15 text-primary-glow border border-primary-glow/30 font-medium">
                            Transparent PNG
                        </span>
                        {image.width && image.height && (
                            <span className="px-2.5 py-1 rounded-full bg-card-bg text-foreground/70 border border-card-border font-mono">
                                {image.width} &times; {image.height} px
                            </span>
                        )}
                    </div>
                </div>

                <div className="flex flex-col lg:flex-row gap-8 justify-center items-start">
                    {/* Left Column */}
                    <div className="flex-1 w-full max-w-3xl flex flex-col gap-6">
                        <div className="bg-card-bg border border-slate-300/40 rounded-2xl p-6 sm:p-10 flex items-center justify-center relative overflow-hidden shadow-2xl min-h-[500px]">
                            {bgMode === 'checker' && (
                                <div className="absolute inset-0 bg-white z-0 pointer-events-none" />
                            )}

                            {image.luminance === 'dark' && image.contrastBgDark !== 'none' && (
                                <div
                                    className="contrast-stage-dark absolute inset-0 z-0 pointer-events-none"
                                    style={image.contrastBgDark ? { backgroundColor: image.contrastBgDark } : undefined}
                                />
                            )}

                            {image.luminance === 'light' && image.contrastBgLight !== 'none' && (
                                <div
                                    className="absolute inset-0 z-0 pointer-events-none opacity-50"
                                    style={{
                                        backgroundColor: image.contrastBgLight || '#cbd5e1',
                                        opacity: 0.5,
                                    }}
                                />
                            )}

                            <div
                                className={`absolute inset-0 z-0 transition-colors duration-200 ${bgMode === 'checker' ? 'opacity-20' : 'opacity-100'}`}
                                style={getPreviewBgStyle()}
                            />

                            {(bgMode === 'checker' || bgMode === 'dark' || bgMode === 'black') && (
                                <div className="absolute inset-0 bg-blue-500/5 blur-3xl rounded-full transform scale-75 z-0" />
                            )}

                            {displaySrc ? (
                                <img
                                    src={displaySrc}
                                    alt={image.altText || imageTitle}
                                    draggable={false}
                                    onContextMenu={(e) => e.preventDefault()}
                                    className="relative z-10 max-w-full max-h-[600px] object-contain select-none"
                                />
                            ) : (
                                <div className="relative z-10 w-full h-[400px] flex items-center justify-center">
                                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
                                </div>
                            )}
                        </div>

                        {/* Interactive Background Preview Switcher */}
                        <div className="flex items-center justify-between p-3 rounded-xl bg-card-bg border border-card-border flex-wrap gap-3">
                            <span className="text-xs font-semibold text-foreground/70 uppercase tracking-wider flex items-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-primary-glow">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.098 19.902a3.75 3.75 0 0 0 5.304 0l6.401-6.402M6.75 21A3.75 3.75 0 0 1 3 17.25V4.125C3 3.504 3.504 3 4.125 3h5.25c.621 0 1.125.504 1.125 1.125v4.072M6.75 21a3.75 3.75 0 0 0 3.75-3.75V8.197M6.75 21h13.125c.621 0 1.125-.504 1.125-1.125v-5.25c0-.621-.504-1.125-1.125-1.125h-4.072M10.5 8.197l2.88-2.88c.438-.439 1.15-.439 1.59 0l3.712 3.713c.44.44.44 1.152 0 1.59l-2.879 2.88M6.75 17.25h.008v.008H6.75v-.008Z" />
                                </svg>
                                Test Background:
                            </span>
                            <div className="flex items-center gap-2 flex-wrap">
                                {[
                                    { key: 'checker', label: 'Checker', dotClass: 'border-slate-400 bg-slate-300' },
                                    { key: 'white', label: 'White', dotClass: 'border-slate-300 bg-white' },
                                    { key: 'dark', label: 'Slate', dotClass: 'border-slate-600 bg-slate-800' },
                                    { key: 'black', label: 'Black', dotClass: 'border-slate-800 bg-black' },
                                ].map((mode) => (
                                    <button
                                        key={mode.key}
                                        type="button"
                                        onClick={() => setBgMode(mode.key)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                                            bgMode === mode.key
                                                ? 'bg-blue-600 text-white shadow-sm'
                                                : 'bg-card-header-bg text-foreground/60 hover:text-foreground hover:bg-blue-200 dark:hover:bg-blue-500/30'
                                        }`}
                                    >
                                        <span className={`w-3 h-3 rounded-full border ${mode.dotClass} inline-block`} />
                                        {mode.label}
                                    </button>
                                ))}

                                {/* Custom Color Picker */}
                                <div className="relative flex items-center" ref={pickerRef}>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setBgMode('custom');
                                            setShowColorPicker((prev) => !prev);
                                        }}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                                            bgMode === 'custom'
                                                ? 'bg-blue-600 text-white shadow-sm'
                                                : 'bg-card-header-bg text-foreground/60 hover:text-foreground hover:bg-blue-200 dark:hover:bg-blue-500/30'
                                        }`}
                                    >
                                        <span
                                            className="w-3 h-3 rounded-full border border-white/60 inline-block shadow-inner"
                                            style={{ backgroundColor: customBgColor }}
                                        />
                                        <span>Custom</span>
                                    </button>

                                    {showColorPicker && (
                                        <div
                                            onPointerDown={(e) => handleStartDrag(e, 'custom')}
                                            style={{ transform: `translate(${customPickerOffset.x}px, ${customPickerOffset.y}px)` }}
                                            className="absolute right-0 bottom-full mb-3 z-50 p-3.5 bg-card-bg border border-card-border rounded-2xl shadow-2xl flex flex-col items-center gap-3 cursor-move select-none"
                                        >
                                            <div className="flex items-center justify-between w-full pb-1 border-b border-card-border/50 text-[11px] font-bold text-foreground/50">
                                                <div className="flex items-center gap-1.5 pointer-events-none">
                                                    <GripHorizontal className="w-3.5 h-3.5 text-foreground/40" />
                                                    <span>Custom Color</span>
                                                </div>
                                                {(customPickerOffset.x !== 0 || customPickerOffset.y !== 0) && (
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setCustomPickerOffset({ x: 0, y: 0 });
                                                        }}
                                                        className="text-[10px] text-foreground/40 hover:text-foreground hover:underline cursor-pointer"
                                                    >
                                                        Reset
                                                    </button>
                                                )}
                                            </div>

                                            <div className="cursor-default" data-no-drag>
                                                <HexColorPicker
                                                    color={customBgColor}
                                                    onChange={(newColor) => {
                                                        setCustomBgColor(newColor);
                                                        setBgMode('custom');
                                                    }}
                                                />
                                            </div>

                                            <div className="flex items-center gap-2 w-full cursor-default" data-no-drag>
                                                <span
                                                    className="w-5 h-5 rounded-md border border-card-border flex-shrink-0"
                                                    style={{ backgroundColor: customBgColor }}
                                                />
                                                <input
                                                    type="text"
                                                    value={customBgColor.toUpperCase()}
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        if (val.startsWith('#') || val.length <= 7) {
                                                            setCustomBgColor(val);
                                                            setBgMode('custom');
                                                        }
                                                    }}
                                                    className="w-full bg-input-bg border border-input-border text-foreground text-xs px-2 py-1 rounded font-mono uppercase focus:outline-none focus:border-blue-500 text-center cursor-text"
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Gradient Picker */}
                                <div className="relative flex items-center" ref={gradientPickerRef}>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setBgMode('gradient');
                                            setShowGradientPicker((prev) => !prev);
                                        }}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                                            bgMode === 'gradient'
                                                ? 'bg-blue-600 text-white shadow-sm'
                                                : 'bg-card-header-bg text-foreground/60 hover:text-foreground hover:bg-blue-200 dark:hover:bg-blue-500/30'
                                        }`}
                                    >
                                        <span
                                            className="w-3 h-3 rounded-full border border-white/60 inline-block shadow-inner"
                                            style={{ background: getGradientCss() }}
                                        />
                                        <span>Gradient</span>
                                    </button>

                                    {showGradientPicker && (
                                        <div
                                            onPointerDown={(e) => handleStartDrag(e, 'gradient')}
                                            style={{ transform: `translate(${gradientPickerOffset.x}px, ${gradientPickerOffset.y}px)` }}
                                            className="absolute right-0 bottom-full mb-3 z-50 p-4 bg-card-bg border border-card-border rounded-2xl shadow-2xl flex flex-col gap-3 w-72 sm:w-80 cursor-move select-none"
                                        >
                                            <div className="flex items-center justify-between w-full pb-1 border-b border-card-border/50 text-[11px] font-bold text-foreground/50">
                                                <div className="flex items-center gap-1.5 pointer-events-none">
                                                    <GripHorizontal className="w-3.5 h-3.5 text-foreground/40" />
                                                    <span>Gradient Builder</span>
                                                </div>
                                                {(gradientPickerOffset.x !== 0 || gradientPickerOffset.y !== 0) && (
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setGradientPickerOffset({ x: 0, y: 0 });
                                                        }}
                                                        className="text-[10px] text-foreground/40 hover:text-foreground hover:underline cursor-pointer"
                                                    >
                                                        Reset
                                                    </button>
                                                )}
                                            </div>

                                            <div
                                                className="w-full h-8 rounded-xl border border-card-border shadow-inner shrink-0 cursor-default"
                                                style={{ background: getGradientCss() }}
                                            />

                                            <div className="flex items-center gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => setActiveGradientStop('from')}
                                                    className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                                                        activeGradientStop === 'from'
                                                            ? 'border-blue-500 bg-blue-500/15 text-blue-400'
                                                            : 'border-card-border bg-card-header-bg text-foreground/60 hover:text-foreground'
                                                    }`}
                                                >
                                                    <span className="w-3.5 h-3.5 rounded-full border border-card-border inline-block" style={{ backgroundColor: gradientFrom }} />
                                                    <span>Color 1</span>
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setActiveGradientStop('to')}
                                                    className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                                                        activeGradientStop === 'to'
                                                            ? 'border-blue-500 bg-blue-500/15 text-blue-400'
                                                            : 'border-card-border bg-card-header-bg text-foreground/60 hover:text-foreground'
                                                    }`}
                                                >
                                                    <span className="w-3.5 h-3.5 rounded-full border border-card-border inline-block" style={{ backgroundColor: gradientTo }} />
                                                    <span>Color 2</span>
                                                </button>
                                            </div>

                                            <div className="flex justify-center" data-no-drag>
                                                <HexColorPicker
                                                    color={activeGradientStop === 'from' ? gradientFrom : gradientTo}
                                                    onChange={(newColor) => {
                                                        if (activeGradientStop === 'from') setGradientFrom(newColor);
                                                        else setGradientTo(newColor);
                                                        setBgMode('gradient');
                                                    }}
                                                />
                                            </div>

                                            <div className="flex items-center justify-between text-xs">
                                                <span className="font-semibold text-foreground/70">Type:</span>
                                                <div className="flex items-center gap-1.5">
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setGradientType('linear');
                                                            setBgMode('gradient');
                                                        }}
                                                        className={`px-2.5 py-1 rounded-md font-medium text-xs transition-all cursor-pointer ${
                                                            gradientType === 'linear' ? 'bg-blue-600 text-white' : 'bg-card-header-bg text-foreground/60'
                                                        }`}
                                                    >
                                                        Linear
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setGradientType('radial');
                                                            setBgMode('gradient');
                                                        }}
                                                        className={`px-2.5 py-1 rounded-md font-medium text-xs transition-all cursor-pointer ${
                                                            gradientType === 'radial' ? 'bg-blue-600 text-white' : 'bg-card-header-bg text-foreground/60'
                                                        }`}
                                                    >
                                                        Radial
                                                    </button>
                                                </div>
                                            </div>

                                            {gradientType === 'linear' && (
                                                <div className="flex items-center justify-between gap-3 text-xs">
                                                    <span className="font-semibold text-foreground/70">Angle:</span>
                                                    <input
                                                        type="range"
                                                        min={0}
                                                        max={360}
                                                        value={gradientAngle}
                                                        onChange={(e) => {
                                                            setGradientAngle(Number(e.target.value));
                                                            setBgMode('gradient');
                                                        }}
                                                        className="flex-1 accent-blue-500 cursor-pointer"
                                                    />
                                                    <span className="font-mono text-foreground/60 w-8 text-right">{gradientAngle}&deg;</span>
                                                </div>
                                            )}

                                            <div className="pt-2 border-t border-card-border/60">
                                                <span className="text-[10px] font-bold text-foreground/50 uppercase tracking-wider block mb-1.5">
                                                    Linear Presets (12):
                                                </span>
                                                <div className="grid grid-cols-6 gap-1.5">
                                                    {GRADIENT_PRESETS.map((preset) => (
                                                        <button
                                                            key={preset.name}
                                                            type="button"
                                                            onClick={() => {
                                                                setGradientFrom(preset.from);
                                                                setGradientTo(preset.to);
                                                                setGradientType('linear');
                                                                setGradientAngle(preset.angle);
                                                                setBgMode('gradient');
                                                            }}
                                                            className="w-full h-6 rounded-md border border-card-border hover:scale-110 transition-transform cursor-pointer shadow-sm"
                                                            style={{ background: `linear-gradient(${preset.angle}deg, ${preset.from}, ${preset.to})` }}
                                                            title={preset.name}
                                                        />
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Download Format & Button */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between p-3 rounded-xl bg-card-bg border border-card-border flex-wrap gap-2">
                                <span className="text-xs font-semibold text-foreground/70 uppercase tracking-wider">
                                    Download Format:
                                </span>
                                <div className="flex items-center gap-2 flex-wrap">
                                    <button
                                        type="button"
                                        onClick={() => setDownloadFormat('png')}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                            downloadFormat === 'png'
                                                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                                                : 'bg-card-header-bg text-foreground/60 hover:text-foreground hover:bg-blue-200 dark:hover:bg-blue-500/30'
                                        }`}
                                    >
                                        PNG (Lossless)
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setDownloadFormat('webp')}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                            downloadFormat === 'webp'
                                                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                                                : 'bg-card-header-bg text-foreground/60 hover:text-foreground hover:bg-blue-200 dark:hover:bg-blue-500/30'
                                        }`}
                                    >
                                        WebP (Fast)
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setDownloadFormat('jpeg')}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                                            downloadFormat === 'jpeg'
                                                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                                                : 'bg-card-header-bg text-foreground/60 hover:text-foreground hover:bg-blue-200 dark:hover:bg-blue-500/30'
                                        }`}
                                    >
                                        <span
                                            className="w-2.5 h-2.5 rounded-full border border-slate-400 inline-block"
                                            style={{ background: jpgBgInfo.isGradient ? getGradientCss() : jpgBgInfo.color }}
                                        />
                                        <span>JPG ({jpgBgInfo.label})</span>
                                    </button>
                                </div>
                            </div>

                            <button
                                onClick={handleDownload}
                                className="group relative overflow-hidden w-full bg-gradient-to-r from-blue-700 via-blue-500 to-indigo-600 animate-btn-shimmer active:scale-[0.99] text-white font-bold py-4 rounded-xl shadow-[0_0_20px_rgba(37,99,235,0.4)] hover:shadow-[0_0_35px_rgba(59,130,246,0.65)] transition-all duration-300 text-center tracking-wider uppercase flex items-center justify-center gap-2 cursor-pointer"
                            >
                                <div className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                    <div className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-white/25 to-transparent shimmer-sweep" />
                                </div>

                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 relative z-10 transform group-hover:translate-y-0.5 transition-transform">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
                                </svg>
                                <span className="relative z-10">
                                    Download {downloadFormat.toUpperCase()} ({downloadWidth}x{downloadHeight})
                                </span>
                            </button>
                        </div>
                    </div>

                    {/* Right Column: Sidebar */}
                    <div className="w-full lg:w-auto flex justify-center lg:block">
                        <ImageDetails
                            image={image}
                            onResizeApply={handleResizeApply}
                            collections={collections}
                        />
                    </div>
                </div>

                {/* Related Images */}
                <RelatedImages images={relatedImages} currentId={image.id} totalCount={totalRelatedImages} />
            </main>
        </div>
    );
}

