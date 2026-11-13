'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { HexColorPicker } from 'react-colorful';
import Header from '../../components/Header';
import ImageDetails from '../../components/ImageDetails';
import RelatedImages from '../../components/RelatedImages';
import { toast } from 'sonner';
import { GripHorizontal } from 'lucide-react';

interface ImagePageContentProps {
    image: any;
    relatedImages: any[];
    totalRelatedImages?: number;
    siteName?: string;
    collections?: { id: string; name: string; slug: string; coverImagePath: string | null }[];
}

type BackgroundMode = 'checker' | 'white' | 'dark' | 'black' | 'custom' | 'gradient';
type DownloadFormat = 'png' | 'webp' | 'jpeg';
type GradientType = 'linear' | 'radial';

const GRADIENT_PRESETS = [
    { name: 'Ocean', from: '#3b82f6', to: '#06b6d4', type: 'linear' as const, angle: 135 },
    { name: 'Sunset', from: '#f43f5e', to: '#f59e0b', type: 'linear' as const, angle: 135 },
    { name: 'Purple Dream', from: '#8b5cf6', to: '#ec4899', type: 'linear' as const, angle: 135 },
    { name: 'Emerald', from: '#10b981', to: '#3b82f6', type: 'linear' as const, angle: 135 },
    { name: 'Neon Citrus', from: '#eab308', to: '#22c55e', type: 'linear' as const, angle: 135 },
    { name: 'Flamingo', from: '#ec4899', to: '#f43f5e', type: 'linear' as const, angle: 135 },
    { name: 'Royal Blue', from: '#2563eb', to: '#7c3aed', type: 'linear' as const, angle: 135 },
    { name: 'Warm Flame', from: '#ff6b6b', to: '#ffe66d', type: 'linear' as const, angle: 135 },
    { name: 'Cyberpunk', from: '#06b6d4', to: '#d946ef', type: 'linear' as const, angle: 135 },
    { name: 'Northern Lights', from: '#10b981', to: '#6366f1', type: 'linear' as const, angle: 135 },
    { name: 'Slate Mist', from: '#64748b', to: '#0f172a', type: 'linear' as const, angle: 135 },
    { name: 'Pure Velvet', from: '#1e1b4b', to: '#312e81', type: 'linear' as const, angle: 135 },
];

const ImagePageContent = ({
    image,
    relatedImages,
    totalRelatedImages = 0,
    siteName = 'PNG Finder',
    collections = [],
}: ImagePageContentProps) => {
    const originalWidth = image.width || 800;
    const originalHeight = image.height || 600;

    const [downloadWidth, setDownloadWidth] = useState(originalWidth);
    const [downloadHeight, setDownloadHeight] = useState(originalHeight);
    const [bgMode, setBgMode] = useState<BackgroundMode>('checker');
    const [customBgColor, setCustomBgColor] = useState('#3b82f6');
    const [showColorPicker, setShowColorPicker] = useState(false);

    // Gradient State
    const [showGradientPicker, setShowGradientPicker] = useState(false);
    const [gradientFrom, setGradientFrom] = useState('#3b82f6');
    const [gradientTo, setGradientTo] = useState('#9333ea');
    const [gradientType, setGradientType] = useState<GradientType>('linear');
    const [gradientAngle, setGradientAngle] = useState(135);
    const [activeGradientStop, setActiveGradientStop] = useState<'from' | 'to'>('from');

    const [downloadFormat, setDownloadFormat] = useState<DownloadFormat>('png');

    // Draggable Popover Offsets
    const [customPickerOffset, setCustomPickerOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
    const [gradientPickerOffset, setGradientPickerOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

    const handleStartDrag = (
        e: React.PointerEvent<HTMLDivElement>,
        type: 'custom' | 'gradient'
    ) => {
        // Prevent dragging when clicking interactive elements
        const target = e.target as HTMLElement;
        if (target.closest('button, input, select, textarea, .react-colorful, [data-no-drag]')) {
            return;
        }

        const currentOffset = type === 'custom' ? customPickerOffset : gradientPickerOffset;
        const startX = e.clientX - currentOffset.x;
        const startY = e.clientY - currentOffset.y;

        const onPointerMove = (moveEvent: PointerEvent) => {
            const nextX = moveEvent.clientX - startX;
            const nextY = moveEvent.clientY - startY;
            if (type === 'custom') {
                setCustomPickerOffset({ x: nextX, y: nextY });
            } else {
                setGradientPickerOffset({ x: nextX, y: nextY });
            }
        };

        const onPointerUp = () => {
            window.removeEventListener('pointermove', onPointerMove);
            window.removeEventListener('pointerup', onPointerUp);
        };

        window.addEventListener('pointermove', onPointerMove);
        window.addEventListener('pointerup', onPointerUp);
    };

    const pickerRef = useRef<HTMLDivElement | null>(null);
    const gradientPickerRef = useRef<HTMLDivElement | null>(null);

    // Close popovers on click outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
                setShowColorPicker(false);
            }
            if (gradientPickerRef.current && !gradientPickerRef.current.contains(e.target as Node)) {
                setShowGradientPicker(false);
            }
        };

        if (showColorPicker || showGradientPicker) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showColorPicker, showGradientPicker]);

    const handleResizeApply = (width: number, height: number) => {
        setDownloadWidth(width);
        setDownloadHeight(height);
    };

    // Build CSS Gradient string
    const getGradientCss = () => {
        if (gradientType === 'radial') {
            return `radial-gradient(circle at center, ${gradientFrom}, ${gradientTo})`;
        }
        return `linear-gradient(${gradientAngle}deg, ${gradientFrom}, ${gradientTo})`;
    };

    // Helper to paint background on Canvas for JPG downloads
    const applyCanvasBackground = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
        if (bgMode === 'white') {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, width, height);
        } else if (bgMode === 'dark') {
            ctx.fillStyle = '#1e293b';
            ctx.fillRect(0, 0, width, height);
        } else if (bgMode === 'black') {
            ctx.fillStyle = '#000000';
            ctx.fillRect(0, 0, width, height);
        } else if (bgMode === 'custom') {
            ctx.fillStyle = customBgColor;
            ctx.fillRect(0, 0, width, height);
        } else if (bgMode === 'gradient') {
            let gradient: CanvasGradient;
            if (gradientType === 'radial') {
                const centerX = width / 2;
                const centerY = height / 2;
                const radius = Math.max(width, height) / 2;
                gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
            } else {
                // Calculate linear angle endpoints
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
            // Checker default for JPG
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, width, height);
        }
    };

    // Determine background color and label for JPG downloads
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
                return { color: '#ffffff', label: 'White BG', isGradient: false };
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

        // Track download
        const isCustomSize = downloadWidth !== originalWidth || downloadHeight !== originalHeight;
        try {
            await fetch('/api/analytics/track', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    imageId: image.id,
                    isCustomSize,
                    resolution: `${downloadWidth}x${downloadHeight}`,
                })
            });
        } catch (error) {
            console.error('Failed to track download:', error);
        }

        const name = image.name ? image.name.trim().replace(/\s+/g, '-') : 'image';
        const filename = `${name}-${downloadWidth}x${downloadHeight}-png-finder-com.${ext}`;

        // Direct download only if downloading original dimensions as pure PNG
        if (downloadFormat === 'png' && downloadWidth === originalWidth && downloadHeight === originalHeight) {
            const a = document.createElement('a');
            a.href = `${image.path}?download=1`;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            return;
        }

        // Process via Canvas for resizing / format conversion (WebP, JPG with matching selected background, or resized PNG)
        const canvas = document.createElement('canvas');
        canvas.width = downloadWidth;
        canvas.height = downloadHeight;
        const ctx = canvas.getContext('2d');

        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = image.path;

        img.onload = () => {
            if (!ctx) return;

            if (downloadFormat === 'jpeg') {
                applyCanvasBackground(ctx, downloadWidth, downloadHeight);
            } else {
                ctx.clearRect(0, 0, downloadWidth, downloadHeight);
            }

            ctx.drawImage(img, 0, 0, downloadWidth, downloadHeight);

            const mime = downloadFormat === 'jpeg'
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

    // Render previewPath in SSR HTML for crawler protection, and swap to transparent PNG on client mount
    const [isClient, setIsClient] = useState(false);
    useEffect(() => {
        setIsClient(true);
    }, []);

    const displaySrc = isClient ? image.path : (image.previewPath || image.path);

    // Compute preview background styling based on bgMode
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
            <Header siteName={siteName} />

            <main className="container mx-auto px-4 py-8 max-w-7xl">
                {/* Breadcrumbs for SEO */}
                <nav aria-label="Breadcrumb" className="mb-4 text-xs text-foreground/50 flex items-center gap-1.5 flex-wrap">
                    <Link href="/" className="hover:text-primary-glow transition-colors">Home</Link>
                    <span>/</span>
                    <Link href="/latest" className="hover:text-primary-glow transition-colors">Images</Link>
                    <span>/</span>
                    <span className="text-foreground/80 font-medium truncate max-w-xs">{image.name || 'Image'}</span>
                </nav>

                <div className="text-center mb-6">
                    <h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground uppercase">
                        {image.name || 'TRANSPARENT PNG IMAGE'}
                    </h1>

                    {/* SEO Quality & Spec Badges */}
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
                                {image.width} × {image.height} px
                            </span>
                        )}
                    </div>
                </div>

                <div className="flex flex-col lg:flex-row gap-8 justify-center items-start">
                    {/* Left Column: Image & Download */}
                    <div className="flex-1 w-full max-w-3xl flex flex-col gap-6">
                        <div className="bg-card-bg border border-slate-300/40 rounded-2xl p-6 sm:p-10 flex items-center justify-center relative overflow-hidden shadow-2xl min-h-[500px]">
                            {/* Base Layer for Checker Mode: White background so the checkerboard is ALWAYS normal (not dark navy) */}
                            {bgMode === 'checker' && (
                                <div className="absolute inset-0 bg-white z-0 pointer-events-none" />
                            )}

                            {/* Contrast Background Stage for Theme-Clashing PNGs (Dark PNGs in Dark Mode) */}
                            {image.luminance === 'dark' && image.contrastBgDark !== 'none' && (
                                <div
                                    className="contrast-stage-dark absolute inset-0 z-0 pointer-events-none"
                                    style={image.contrastBgDark ? { backgroundColor: image.contrastBgDark } : undefined}
                                />
                            )}

                            {/* Contrast Background Stage for White/Light PNGs (at 50% opacity in both Light & Dark modes) */}
                            {image.luminance === 'light' && image.contrastBgLight !== 'none' && (
                                <div
                                    className="absolute inset-0 z-0 pointer-events-none opacity-50"
                                    style={{
                                        backgroundColor: image.contrastBgLight || '#cbd5e1',
                                        opacity: 0.5,
                                    }}
                                />
                            )}

                            {/* Interactive Background Canvas */}
                            <div
                                className={`absolute inset-0 z-0 transition-colors duration-200 ${bgMode === 'checker' ? 'opacity-20' : 'opacity-100'}`}
                                style={getPreviewBgStyle()}
                            ></div>

                            {/* Image Glow (only in checker or dark mode) */}
                            {(bgMode === 'checker' || bgMode === 'dark' || bgMode === 'black') && (
                                <div className="absolute inset-0 bg-blue-500/5 blur-3xl rounded-full transform scale-75 z-0"></div>
                            )}

                            {displaySrc ? (
                                <img
                                    src={displaySrc}
                                    alt={image.altText || image.name || 'PNG Image'}
                                    draggable={false}
                                    onContextMenu={(e) => e.preventDefault()}
                                    className="relative z-10 max-w-full max-h-[600px] object-contain select-none"
                                />
                            ) : (
                                <div className="relative z-10 w-full h-[400px] flex items-center justify-center">
                                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
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
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => setBgMode('checker')}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 ${bgMode === 'checker'
                                            ? 'bg-blue-600 text-white shadow-sm'
                                            : 'bg-card-header-bg text-foreground/60 hover:text-foreground hover:bg-blue-200 dark:hover:bg-blue-500/30'
                                        }`}
                                    title="Transparent Checkerboard"
                                >
                                    <span className="w-3 h-3 rounded-full border border-slate-400 bg-slate-300 inline-block" />
                                    Checker
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setBgMode('white')}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 ${bgMode === 'white'
                                            ? 'bg-blue-600 text-white shadow-sm'
                                            : 'bg-card-header-bg text-foreground/60 hover:text-foreground hover:bg-blue-200 dark:hover:bg-blue-500/30'
                                        }`}
                                    title="Pure White"
                                >
                                    <span className="w-3 h-3 rounded-full border border-slate-300 bg-white inline-block" />
                                    White
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setBgMode('dark')}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 ${bgMode === 'dark'
                                            ? 'bg-blue-600 text-white shadow-sm'
                                            : 'bg-card-header-bg text-foreground/60 hover:text-foreground hover:bg-blue-200 dark:hover:bg-blue-500/30'
                                        }`}
                                    title="Slate / Dark Mode"
                                >
                                    <span className="w-3 h-3 rounded-full border border-slate-600 bg-slate-800 inline-block" />
                                    Slate
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setBgMode('black')}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 ${bgMode === 'black'
                                            ? 'bg-blue-600 text-white shadow-sm'
                                            : 'bg-card-header-bg text-foreground/60 hover:text-foreground hover:bg-blue-200 dark:hover:bg-blue-500/30'
                                        }`}
                                    title="Pure Black"
                                >
                                    <span className="w-3 h-3 rounded-full border border-slate-800 bg-black inline-block" />
                                    Black
                                </button>
                                <div className="relative flex items-center" ref={pickerRef}>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setBgMode('custom');
                                            setShowColorPicker((prev) => !prev);
                                        }}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 ${bgMode === 'custom'
                                                ? 'bg-blue-600 text-white shadow-sm'
                                                : 'bg-card-header-bg text-foreground/60 hover:text-foreground hover:bg-blue-200 dark:hover:bg-blue-500/30'
                                            }`}
                                        title="Pick Custom Color"
                                    >
                                        <span
                                            className="w-3 h-3 rounded-full border border-white/60 inline-block shadow-inner"
                                            style={{ backgroundColor: customBgColor }}
                                        />
                                        <span>Custom</span>
                                    </button>

                                    {/* react-colorful popover */}
                                    {showColorPicker && (
                                        <div
                                            onPointerDown={(e) => handleStartDrag(e, 'custom')}
                                            style={{
                                                transform: `translate(${customPickerOffset.x}px, ${customPickerOffset.y}px)`,
                                            }}
                                            className="absolute right-0 bottom-full mb-3 z-50 p-3.5 bg-card-bg border border-card-border rounded-2xl shadow-2xl flex flex-col items-center gap-3 animate-in fade-in zoom-in-95 duration-150 cursor-move select-none"
                                            title="Drag to reposition popup"
                                        >
                                            {/* Drag Header Bar */}
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
                                                        title="Reset position"
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

                                {/* Gradient Button & Popover */}
                                <div className="relative flex items-center" ref={gradientPickerRef}>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setBgMode('gradient');
                                            setShowGradientPicker((prev) => !prev);
                                        }}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 ${bgMode === 'gradient'
                                                ? 'bg-blue-600 text-white shadow-sm'
                                                : 'bg-card-header-bg text-foreground/60 hover:text-foreground hover:bg-blue-200 dark:hover:bg-blue-500/30'
                                            }`}
                                        title="Create Custom Gradient"
                                    >
                                        <span
                                            className="w-3 h-3 rounded-full border border-white/60 inline-block shadow-inner"
                                            style={{ background: getGradientCss() }}
                                        />
                                        <span>Gradient</span>
                                    </button>

                                    {/* Gradient Popover */}
                                    {showGradientPicker && (
                                        <div
                                            onPointerDown={(e) => handleStartDrag(e, 'gradient')}
                                            style={{
                                                transform: `translate(${gradientPickerOffset.x}px, ${gradientPickerOffset.y}px)`,
                                            }}
                                            className="absolute right-0 bottom-full mb-3 z-50 p-4 bg-card-bg border border-card-border rounded-2xl shadow-2xl flex flex-col gap-3 w-72 sm:w-80 animate-in fade-in zoom-in-95 duration-150 cursor-move select-none"
                                            title="Drag to reposition popup"
                                        >
                                            {/* Drag Header Bar */}
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
                                                        title="Reset position"
                                                    >
                                                        Reset
                                                    </button>
                                                )}
                                            </div>

                                            {/* Live Gradient Preview Bar */}
                                            <div
                                                className="w-full h-8 rounded-xl border border-card-border shadow-inner shrink-0 cursor-default"
                                                style={{ background: getGradientCss() }}
                                            />

                                            {/* Stop Selectors (Color 1 vs Color 2) */}
                                            <div className="flex items-center gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => setActiveGradientStop('from')}
                                                    className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${activeGradientStop === 'from'
                                                            ? 'border-blue-500 bg-blue-500/15 text-blue-400'
                                                            : 'border-card-border bg-card-header-bg text-foreground/60 hover:text-foreground'
                                                        }`}
                                                >
                                                    <span
                                                        className="w-3.5 h-3.5 rounded-full border border-card-border inline-block"
                                                        style={{ backgroundColor: gradientFrom }}
                                                    />
                                                    <span>Color 1</span>
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setActiveGradientStop('to')}
                                                    className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${activeGradientStop === 'to'
                                                            ? 'border-blue-500 bg-blue-500/15 text-blue-400'
                                                            : 'border-card-border bg-card-header-bg text-foreground/60 hover:text-foreground'
                                                        }`}
                                                >
                                                    <span
                                                        className="w-3.5 h-3.5 rounded-full border border-card-border inline-block"
                                                        style={{ backgroundColor: gradientTo }}
                                                    />
                                                    <span>Color 2</span>
                                                </button>
                                            </div>

                                            {/* react-colorful for active stop */}
                                            <div className="flex justify-center">
                                                <HexColorPicker
                                                    color={activeGradientStop === 'from' ? gradientFrom : gradientTo}
                                                    onChange={(newColor) => {
                                                        if (activeGradientStop === 'from') {
                                                            setGradientFrom(newColor);
                                                        } else {
                                                            setGradientTo(newColor);
                                                        }
                                                        setBgMode('gradient');
                                                    }}
                                                />
                                            </div>

                                            {/* Gradient Type (Linear vs Radial) */}
                                            <div className="flex items-center justify-between text-xs">
                                                <span className="font-semibold text-foreground/70">Type:</span>
                                                <div className="flex items-center gap-1.5">
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setGradientType('linear');
                                                            setBgMode('gradient');
                                                        }}
                                                        className={`px-2.5 py-1 rounded-md font-medium text-xs transition-all cursor-pointer ${gradientType === 'linear'
                                                                ? 'bg-blue-600 text-white'
                                                                : 'bg-card-header-bg text-foreground/60 hover:text-foreground hover:bg-blue-200 dark:hover:bg-blue-500/30'
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
                                                        className={`px-2.5 py-1 rounded-md font-medium text-xs transition-all cursor-pointer ${gradientType === 'radial'
                                                                ? 'bg-blue-600 text-white'
                                                                : 'bg-card-header-bg text-foreground/60 hover:text-foreground hover:bg-blue-200 dark:hover:bg-blue-500/30'
                                                            }`}
                                                    >
                                                        Radial
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Angle Slider (only if linear) */}
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
                                                    <span className="font-mono text-foreground/60 w-8 text-right">
                                                        {gradientAngle}&deg;
                                                    </span>
                                                </div>
                                            )}

                                            {/* Quick Presets */}
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
                                                            style={{
                                                                background: `linear-gradient(${preset.angle}deg, ${preset.from}, ${preset.to})`,
                                                            }}
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

                        {/* Download Format Selector + Download Action Button */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between p-3 rounded-xl bg-card-bg border border-card-border">
                                <span className="text-xs font-semibold text-foreground/70 uppercase tracking-wider">
                                    Download Format:
                                </span>
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setDownloadFormat('png')}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${downloadFormat === 'png'
                                                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                                                : 'bg-card-header-bg text-foreground/60 hover:text-foreground hover:bg-blue-200 dark:hover:bg-blue-500/30'
                                            }`}
                                    >
                                        PNG (Lossless)
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setDownloadFormat('webp')}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${downloadFormat === 'webp'
                                                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                                                : 'bg-card-header-bg text-foreground/60 hover:text-foreground hover:bg-blue-200 dark:hover:bg-blue-500/30'
                                            }`}
                                        title="Best for websites (Smaller file size, transparent)"
                                    >
                                        WebP (Fast)
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setDownloadFormat('jpeg')}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${downloadFormat === 'jpeg'
                                                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                                                : 'bg-card-header-bg text-foreground/60 hover:text-foreground hover:bg-blue-200 dark:hover:bg-blue-500/30'
                                            }`}
                                        title={`JPEG with ${jpgBgInfo.label}`}
                                    >
                                        <span
                                            className="w-2.5 h-2.5 rounded-full border border-slate-400 inline-block"
                                            style={{
                                                background: jpgBgInfo.isGradient ? getGradientCss() : jpgBgInfo.color,
                                            }}
                                        />
                                        <span>JPG ({jpgBgInfo.label})</span>
                                    </button>
                                </div>
                            </div>

                            <button
                                onClick={handleDownload}
                                className="group relative overflow-hidden w-full bg-gradient-to-r from-blue-700 via-blue-500 to-indigo-600 animate-btn-shimmer active:scale-[0.99] text-white font-bold py-4 rounded-xl shadow-[0_0_20px_rgba(37,99,235,0.4)] hover:shadow-[0_0_35px_rgba(59,130,246,0.65)] transition-all duration-300 text-center tracking-wider uppercase flex items-center justify-center gap-2 cursor-pointer"
                            >
                                {/* Light Shimmer Sweep on Hover */}
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
};

export default ImagePageContent;
