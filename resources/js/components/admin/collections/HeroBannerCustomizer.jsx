import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { HexColorPicker } from 'react-colorful';
import {
    Palette,
    RotateCcw,
    Share2,
    Upload,
    Image as ImageIcon,
    Sparkles,
    X,
    Loader2,
    GripHorizontal,
    Layers,
    ChevronRight,
    ArrowRight,
} from 'lucide-react';
import { toast } from 'sonner';

const HERO_BG_PRESETS = [
    '#0f172a',
    '#1e1b4b',
    '#172554',
    '#064e3b',
    '#4c0519',
    '#451a03',
    '#f8fafc',
    '#fef3c7',
];

const HERO_TEXT_PRESETS = [
    '#ffffff',
    '#f8fafc',
    '#38bdf8',
    '#34d399',
    '#fbbf24',
    '#fb7185',
    '#0f172a',
    '#1e293b',
];

function DraggableColorPickerField({
    label,
    value,
    defaultFallback = '#0f172a',
    presets = HERO_BG_PRESETS,
    onChange,
    align = 'left',
}) {
    const [open, setOpen] = useState(false);
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const containerRef = useRef(null);
    const dragRef = useRef({
        active: false,
        startX: 0,
        startY: 0,
        initX: 0,
        initY: 0,
    });

    const handleStartDrag = (e) => {
        if (e.target.closest('input, button, select, .react-colorful, [data-no-drag]')) return;
        if (e.cancelable) e.preventDefault();
        dragRef.current = {
            active: true,
            startX: e.clientX,
            startY: e.clientY,
            initX: offset.x,
            initY: offset.y,
        };
    };

    useEffect(() => {
        if (!open) return undefined;
        const onMove = (e) => {
            if (!dragRef.current.active) return;
            if (e.cancelable) e.preventDefault();
            setOffset({
                x: dragRef.current.initX + (e.clientX - dragRef.current.startX),
                y: dragRef.current.initY + (e.clientY - dragRef.current.startY),
            });
        };
        const onUp = () => {
            dragRef.current.active = false;
        };
        window.addEventListener('pointermove', onMove, { passive: false });
        window.addEventListener('pointerup', onUp);
        window.addEventListener('pointercancel', onUp);
        return () => {
            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('pointerup', onUp);
            window.removeEventListener('pointercancel', onUp);
        };
    }, [open]);

    useEffect(() => {
        if (!open) return undefined;
        const onDown = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setOpen(false);
            }
        };
        document.addEventListener('pointerdown', onDown);
        return () => document.removeEventListener('pointerdown', onDown);
    }, [open]);

    return (
        <div className="space-y-1.5 relative" ref={containerRef}>
            <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-foreground/75 uppercase tracking-wider">
                    {label}
                </label>
                {value && (
                    <button
                        type="button"
                        onClick={() => onChange('')}
                        className="text-[10px] font-semibold text-foreground/50 hover:text-foreground cursor-pointer"
                    >
                        Default
                    </button>
                )}
            </div>

            <div className="flex items-center gap-2">
                <button
                    type="button"
                    onClick={() => setOpen((p) => !p)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center gap-2 border ${
                        value
                            ? 'bg-blue-600 text-white border-blue-500 shadow-sm'
                            : 'bg-card-header-bg text-foreground/80 border-card-border hover:text-foreground hover:border-primary-glow/50'
                    }`}
                >
                    <span
                        className="w-3.5 h-3.5 rounded-full border border-white/60 inline-block shadow-inner shrink-0"
                        style={{ backgroundColor: value || defaultFallback }}
                    />
                    <span className="font-mono">
                        {value ? value.toUpperCase() : 'Custom Color'}
                    </span>
                </button>
            </div>

            <div className="flex flex-wrap gap-1 pt-0.5">
                {presets.map((c) => (
                    <button
                        key={c}
                        type="button"
                        onClick={() => onChange(c)}
                        style={{ backgroundColor: c }}
                        title={c}
                        className={`w-4 h-4 rounded-full border cursor-pointer transition-transform hover:scale-110 ${
                            value === c
                                ? 'ring-2 ring-primary-glow border-primary-glow'
                                : 'border-slate-500/40'
                        }`}
                    />
                ))}
            </div>

            {open && (
                <div
                    onPointerDown={handleStartDrag}
                    style={{ transform: `translate(${offset.x}px, ${offset.y}px)` }}
                    className={`absolute ${
                        align === 'right' ? 'right-0' : 'left-0'
                    } bottom-full mb-2 z-50 p-3.5 bg-card-bg border border-card-border rounded-2xl shadow-2xl flex flex-col items-center gap-3 cursor-move select-none touch-none`}
                >
                    <div className="flex items-center justify-between w-full pb-1 border-b border-card-border/50 text-[11px] font-bold text-foreground/50">
                        <div className="flex items-center gap-1.5 pointer-events-none">
                            <GripHorizontal className="w-3.5 h-3.5 text-foreground/40" />
                            <span>{label}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            {(offset.x !== 0 || offset.y !== 0) && (
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setOffset({ x: 0, y: 0 });
                                    }}
                                    className="text-[10px] text-foreground/40 hover:text-foreground hover:underline cursor-pointer"
                                >
                                    Reset
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setOpen(false);
                                }}
                                className="p-0.5 rounded-md text-foreground/50 hover:text-foreground hover:bg-card-header-bg transition-colors cursor-pointer"
                                aria-label="Close color picker"
                                title="Close"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>

                    <div className="cursor-default touch-none [&_.react-colorful]:touch-none" data-no-drag>
                        <HexColorPicker
                            color={value || defaultFallback}
                            onChange={(newColor) => onChange(newColor)}
                        />
                    </div>

                    <div className="flex items-center gap-2 w-full cursor-default" data-no-drag>
                        <span
                            className="w-5 h-5 rounded-md border border-card-border flex-shrink-0"
                            style={{ backgroundColor: value || defaultFallback }}
                        />
                        <input
                            type="text"
                            value={(value || defaultFallback).toUpperCase()}
                            onChange={(e) => {
                                const val = e.target.value;
                                if (val.startsWith('#') || val.length <= 7) {
                                    onChange(val);
                                }
                            }}
                            className="w-full bg-input-bg border border-input-border text-foreground text-xs px-2 py-1 rounded font-mono uppercase focus:outline-none focus:border-blue-500 text-center cursor-text"
                        />
                    </div>
                </div>
            )}
        </div>
    );
}

export default function HeroBannerCustomizer({
    collectionId = null,
    collectionName = '',
    imageCount = 0,
    heroImagePath = '',
    setHeroImagePath,
    heroBgColor = '',
    setHeroBgColor,
    heroTextColor = '',
    setHeroTextColor,
    coverImagePath = '',
    setCoverImagePath,
    fallbackThumbnailPath = '',
    cardBgImagePath = '',
    setCardBgImagePath,
    cardBgColor = '',
    setCardBgColor,
    cardTextColor = '',
    setCardTextColor,
    trendingCardImagePath = '',
    setTrendingCardImagePath,
    previewImages = [],
    onOpenLibraryPicker,
    onStudioHeroSaved,
}) {
    const [activeSection, setActiveSection] = useState('hero'); // 'hero' | 'trending' | 'card'
    const [uploadingField, setUploadingField] = useState(null);
    const [studioSession, setStudioSession] = useState(null); // { width, height, targetField }

    const heroFileInputRef = useRef(null);
    const cardBgFileInputRef = useRef(null);
    const thumbFileInputRef = useRef(null);
    const trendingCardFileInputRef = useRef(null);

    // Listen for postMessage from the embedded /image-editor Studio instance
    useEffect(() => {
        if (!studioSession) return undefined;
        const handleMessage = (e) => {
            if (e.origin !== window.location.origin) return;
            const data = e.data;
            if (!data || typeof data !== 'object') return;

            if (data.type === 'PNG101_COLLECTION_HERO_SAVED' && data.path) {
                const field = data.targetField || studioSession.targetField || 'heroImagePath';
                if (field === 'cardBgImagePath') {
                    setCardBgImagePath?.(data.path);
                    toast.success('Custom card cover image created in Studio!');
                } else if (field === 'coverImagePath') {
                    setCoverImagePath?.(data.path);
                    toast.success('Custom card thumbnail created in Studio!');
                } else if (field === 'trendingCardImagePath') {
                    setTrendingCardImagePath?.(data.path);
                    toast.success('Custom square collection card image created in Studio!');
                } else {
                    setHeroImagePath?.(data.path);
                    toast.success('Custom hero cover image created in Studio!');
                }
                setStudioSession(null);
                onStudioHeroSaved?.(data.path, field);
            } else if (data.type === 'PNG101_COLLECTION_HERO_CLOSE') {
                setStudioSession(null);
            }
        };
        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, [
        studioSession,
        setHeroImagePath,
        setCardBgImagePath,
        setCoverImagePath,
        setTrendingCardImagePath,
        onStudioHeroSaved,
    ]);

    const handleFileUpload = async (e, targetField) => {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (!file) return;

        setUploadingField(targetField);
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('targetField', targetField);
            if (collectionId) {
                formData.append('collectionId', collectionId);
            }
            const res = await fetch('/api/collections/upload-hero', {
                method: 'POST',
                body: formData,
            });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || 'Failed to upload image');
            }
            if (targetField === 'cardBgImagePath') {
                setCardBgImagePath?.(data.path || '');
                toast.success('Card cover image uploaded');
            } else if (targetField === 'coverImagePath') {
                setCoverImagePath?.(data.path || '');
                toast.success('Card thumbnail uploaded');
            } else if (targetField === 'trendingCardImagePath') {
                setTrendingCardImagePath?.(data.path || '');
                toast.success('Square collection card image uploaded');
            } else {
                setHeroImagePath?.(data.path || '');
                toast.success('Hero cover photo uploaded');
            }
            onStudioHeroSaved?.(data.path, targetField);
        } catch (err) {
            toast.error(err.message || 'Failed to upload image');
        } finally {
            setUploadingField(null);
        }
    };

    const studioUrl = studioSession
        ? `/image-editor?mode=collection-hero&width=${studioSession.width}&height=${studioSession.height}&targetField=${encodeURIComponent(
              studioSession.targetField
          )}${collectionId ? `&collectionId=${encodeURIComponent(collectionId)}` : ''}${
              collectionName ? `&collectionName=${encodeURIComponent(collectionName)}` : ''
          }`
        : '';

    const hasHeroCustom = Boolean(heroImagePath || heroBgColor || heroTextColor);
    const hasTrendingCustom = Boolean(trendingCardImagePath);
    const hasCardCustom = Boolean(coverImagePath || cardBgImagePath || cardBgColor || cardTextColor);
    const effectiveThumb = coverImagePath || fallbackThumbnailPath;

    return (
        <div className="p-4 rounded-xl border border-card-border bg-card-header-bg/30 space-y-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="text-xs font-bold uppercase tracking-wider text-primary-glow flex items-center gap-1.5">
                    <Palette className="w-3.5 h-3.5" />
                    <span>Visual Appearance Customization (Optional)</span>
                </label>

                {activeSection === 'hero' && hasHeroCustom && (
                    <button
                        type="button"
                        onClick={() => {
                            setHeroImagePath?.('');
                            setHeroBgColor?.('');
                            setHeroTextColor?.('');
                        }}
                        className="text-[11px] font-semibold text-foreground/55 hover:text-rose-400 inline-flex items-center gap-1 cursor-pointer"
                    >
                        <RotateCcw className="w-3 h-3" />
                        <span>Reset Hero Default</span>
                    </button>
                )}

                {activeSection === 'trending' && hasTrendingCustom && (
                    <button
                        type="button"
                        onClick={() => {
                            setTrendingCardImagePath?.('');
                        }}
                        className="text-[11px] font-semibold text-foreground/55 hover:text-rose-400 inline-flex items-center gap-1 cursor-pointer"
                    >
                        <RotateCcw className="w-3 h-3" />
                        <span>Reset Square Card Default</span>
                    </button>
                )}

                {activeSection === 'card' && hasCardCustom && (
                    <button
                        type="button"
                        onClick={() => {
                            setCoverImagePath?.('');
                            setCardBgImagePath?.('');
                            setCardBgColor?.('');
                            setCardTextColor?.('');
                        }}
                        className="text-[11px] font-semibold text-foreground/55 hover:text-rose-400 inline-flex items-center gap-1 cursor-pointer"
                    >
                        <RotateCcw className="w-3 h-3" />
                        <span>Reset Card Default</span>
                    </button>
                )}
            </div>

            {/* Switcher between Page Hero Banner, Trending Square Card, and Recommendation Card */}
            <div className="grid grid-cols-3 gap-1 p-1 bg-card-header-bg border border-card-border rounded-xl text-[11px] font-bold">
                <button
                    type="button"
                    onClick={() => setActiveSection('hero')}
                    className={`py-1.5 px-2 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        activeSection === 'hero'
                            ? 'bg-primary-glow text-white shadow-sm'
                            : 'text-foreground/60 hover:text-foreground'
                    }`}
                >
                    <span className="truncate">Hero Banner</span>
                    {hasHeroCustom && (
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                    )}
                </button>
                <button
                    type="button"
                    onClick={() => setActiveSection('trending')}
                    className={`py-1.5 px-2 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        activeSection === 'trending'
                            ? 'bg-primary-glow text-white shadow-sm'
                            : 'text-foreground/60 hover:text-foreground'
                    }`}
                >
                    <span className="truncate">Square Card</span>
                    {hasTrendingCustom && (
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                    )}
                </button>
                <button
                    type="button"
                    onClick={() => setActiveSection('card')}
                    className={`py-1.5 px-2 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        activeSection === 'card'
                            ? 'bg-primary-glow text-white shadow-sm'
                            : 'text-foreground/60 hover:text-foreground'
                    }`}
                >
                    <span className="truncate">Related Card</span>
                    {hasCardCustom && (
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                    )}
                </button>
            </div>

            {activeSection === 'hero' ? (
                <div className="space-y-3.5">
                    {/* Live Preview of the Hero Card */}
                    <div
                        style={heroBgColor ? { backgroundColor: heroBgColor } : undefined}
                        className="relative h-[75px] flex items-center rounded-xl border border-card-border bg-card-bg px-4 overflow-hidden shadow-inner"
                    >
                        {heroImagePath && (
                            <div className="absolute inset-y-0 right-0 pointer-events-none select-none flex items-center justify-end">
                                <img
                                    src={heroImagePath}
                                    alt=""
                                    className="h-full w-auto max-w-none object-contain object-right shrink-0"
                                />
                            </div>
                        )}
                        <div className="relative z-10 w-full flex items-center justify-between gap-2">
                            <span
                                style={heroTextColor ? { color: heroTextColor } : undefined}
                                className="text-base sm:text-lg font-black uppercase text-foreground tracking-tight truncate"
                            >
                                {collectionName || 'COLLECTION TITLE'}
                            </span>
                            <span className="px-2.5 py-1 rounded-lg bg-card-bg/90 backdrop-blur-md border border-card-border text-foreground text-[10px] font-bold inline-flex items-center gap-1 shrink-0">
                                <Share2 className="w-2.5 h-2.5 text-primary-glow" />
                                Share Collection
                            </span>
                        </div>
                    </div>

                    {/* Right-Side Cover Photo Controls */}
                    <div className="space-y-1.5">
                        <label className="block text-[11px] font-bold text-foreground/75 uppercase tracking-wider">
                            Right-Side Hero Cover Photo (1200×300 px)
                        </label>
                        <input
                            ref={heroFileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleFileUpload(e, 'heroImagePath')}
                            className="hidden"
                        />
                        <div className="flex flex-wrap items-center gap-2">
                            <button
                                type="button"
                                onClick={() =>
                                    setStudioSession({
                                        width: 1200,
                                        height: 300,
                                        targetField: 'heroImagePath',
                                    })
                                }
                                className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold shadow-md shadow-blue-600/20 inline-flex items-center gap-1.5 cursor-pointer transition-all"
                            >
                                <Sparkles className="w-3.5 h-3.5" />
                                <span>Create in Studio</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => heroFileInputRef.current?.click()}
                                disabled={uploadingField === 'heroImagePath'}
                                className="px-3 py-1.5 rounded-lg bg-input-bg hover:bg-foreground/10 border border-input-border text-xs font-semibold text-foreground inline-flex items-center gap-1.5 cursor-pointer transition-colors"
                            >
                                {uploadingField === 'heroImagePath' ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin text-primary-glow" />
                                ) : (
                                    <Upload className="w-3.5 h-3.5 text-primary-glow" />
                                )}
                                <span>Upload Photo</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => onOpenLibraryPicker?.('heroImagePath')}
                                className="px-3 py-1.5 rounded-lg bg-input-bg hover:bg-foreground/10 border border-input-border text-xs font-semibold text-foreground inline-flex items-center gap-1.5 cursor-pointer transition-colors"
                            >
                                <ImageIcon className="w-3.5 h-3.5 text-primary-glow" />
                                <span>Pick from Library</span>
                            </button>

                            {heroImagePath && (
                                <button
                                    type="button"
                                    onClick={() => setHeroImagePath?.('')}
                                    className="px-2.5 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/25 text-xs font-semibold text-red-400 inline-flex items-center gap-1 cursor-pointer transition-colors"
                                >
                                    <X className="w-3 h-3" />
                                    <span>Remove</span>
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Hero Colors */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                        <DraggableColorPickerField
                            label="Card Background"
                            value={heroBgColor}
                            defaultFallback="#0f172a"
                            presets={HERO_BG_PRESETS}
                            onChange={setHeroBgColor}
                            align="left"
                        />
                        <DraggableColorPickerField
                            label="Title Text Color"
                            value={heroTextColor}
                            defaultFallback="#ffffff"
                            presets={HERO_TEXT_PRESETS}
                            onChange={setHeroTextColor}
                            align="right"
                        />
                    </div>
                </div>
            ) : activeSection === 'trending' ? (
                <div className="space-y-3.5">
                    {/* Live Preview of the 1:1 Square Collection Card (Homepage Trending & /collections) */}
                    <div className="flex flex-col sm:flex-row items-center gap-4 p-3.5 rounded-xl bg-background/70 border border-card-border">
                        <div className="w-36 shrink-0 flex flex-col">
                            <div
                                className={`relative aspect-square w-full ${
                                    trendingCardImagePath ? 'p-0' : 'p-2'
                                } rounded-2xl border border-card-border bg-card-bg overflow-hidden shadow-sm`}
                                style={{
                                    backgroundImage:
                                        'linear-gradient(45deg, #80808012 25%, transparent 25%), linear-gradient(-45deg, #80808012 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #80808012 75%), linear-gradient(-45deg, transparent 75%, #80808012 75%)',
                                    backgroundSize: '12px 12px',
                                    backgroundPosition: '0 0, 0 6px, 6px -6px, -6px 0px',
                                }}
                            >
                                {trendingCardImagePath ? (
                                    <img
                                        src={trendingCardImagePath}
                                        alt=""
                                        className="w-full h-full object-cover pointer-events-none"
                                    />
                                ) : previewImages && previewImages.length > 0 ? (
                                    <div className="h-full w-full grid grid-cols-2 grid-rows-2 gap-1.5">
                                        {previewImages.slice(0, 4).map((img, idx) => (
                                            <div
                                                key={img.id || idx}
                                                className="relative h-full w-full rounded-lg bg-card-bg/70 border border-card-border/60 p-1.5 flex items-center justify-center overflow-hidden"
                                            >
                                                <img
                                                    src={img.thumbPath || img.path}
                                                    alt=""
                                                    className="max-h-full max-w-full object-contain pointer-events-none"
                                                />
                                            </div>
                                        ))}
                                    </div>
                                ) : effectiveThumb ? (
                                    <div className="h-full w-full flex items-center justify-center p-2.5">
                                        <img
                                            src={effectiveThumb}
                                            alt=""
                                            className="max-h-full max-w-full object-contain pointer-events-none"
                                        />
                                    </div>
                                ) : (
                                    <div className="h-full w-full flex flex-col items-center justify-center text-foreground/30">
                                        <Layers className="w-6 h-6 mb-1" />
                                        <span className="text-[10px]">Collection</span>
                                    </div>
                                )}

                                <div className="absolute bottom-2 right-2 z-10">
                                    <span className="px-1.5 py-0.5 rounded-md bg-black/75 backdrop-blur-md text-white text-[9px] font-bold shadow-md">
                                        {imageCount} PNG{imageCount === 1 ? '' : 's'}
                                    </span>
                                </div>
                            </div>

                            <div className="mt-2 px-0.5 flex items-center justify-between gap-1.5">
                                <span className="text-xs font-bold text-foreground truncate">
                                    {collectionName || 'Collection Name'}
                                </span>
                                <ArrowRight className="w-3.5 h-3.5 shrink-0 text-foreground/55" />
                            </div>
                        </div>

                        <div className="flex-1 space-y-2 text-center sm:text-left">
                            <div>
                                <h5 className="text-xs font-bold text-foreground">
                                    1:1 Square Collection Card (800×800 px)
                                </h5>
                                <p className="text-[11px] text-foreground/55 mt-0.5 leading-relaxed">
                                    Used in Homepage <strong>Trending Collections</strong> and the <strong>/collections</strong> directory. Leave empty to display the automatic 2×2 PNG preview collage, or set a custom full-bleed square image.
                                </p>
                            </div>

                            <input
                                ref={trendingCardFileInputRef}
                                type="file"
                                accept="image/*"
                                onChange={(e) => handleFileUpload(e, 'trendingCardImagePath')}
                                className="hidden"
                            />

                            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                                <button
                                    type="button"
                                    onClick={() =>
                                        setStudioSession({
                                            width: 800,
                                            height: 800,
                                            targetField: 'trendingCardImagePath',
                                        })
                                    }
                                    className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold shadow-md shadow-blue-600/20 inline-flex items-center gap-1.5 cursor-pointer transition-all"
                                >
                                    <Sparkles className="w-3.5 h-3.5" />
                                    <span>Create in Studio</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => trendingCardFileInputRef.current?.click()}
                                    disabled={uploadingField === 'trendingCardImagePath'}
                                    className="px-3 py-1.5 rounded-lg bg-input-bg hover:bg-foreground/10 border border-input-border text-xs font-semibold text-foreground inline-flex items-center gap-1.5 cursor-pointer transition-colors"
                                >
                                    {uploadingField === 'trendingCardImagePath' ? (
                                        <Loader2 className="w-3.5 h-3.5 animate-spin text-primary-glow" />
                                    ) : (
                                        <Upload className="w-3.5 h-3.5 text-primary-glow" />
                                    )}
                                    <span>Upload Image</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => onOpenLibraryPicker?.('trendingCardImagePath')}
                                    className="px-3 py-1.5 rounded-lg bg-input-bg hover:bg-foreground/10 border border-input-border text-xs font-semibold text-foreground inline-flex items-center gap-1.5 cursor-pointer transition-colors"
                                >
                                    <ImageIcon className="w-3.5 h-3.5 text-primary-glow" />
                                    <span>Pick from Library</span>
                                </button>

                                {trendingCardImagePath && (
                                    <button
                                        type="button"
                                        onClick={() => setTrendingCardImagePath?.('')}
                                        className="px-2.5 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/25 text-xs font-semibold text-red-400 inline-flex items-center gap-1 cursor-pointer transition-colors"
                                    >
                                        <X className="w-3 h-3" />
                                        <span>Use 2×2 Collage</span>
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="space-y-3.5">
                    {/* Live Preview of the "More Collections You May Like" Recommendation Card */}
                    <div
                        style={cardBgColor ? { backgroundColor: cardBgColor } : undefined}
                        className="relative h-[96px] rounded-xl border border-card-border bg-card-bg p-4 flex items-center gap-4 overflow-hidden shadow-inner"
                    >
                        {cardBgImagePath && (
                            <div className="absolute inset-y-0 right-0 pointer-events-none select-none flex items-center justify-end">
                                <img
                                    src={cardBgImagePath}
                                    alt=""
                                    className="h-full w-auto max-w-none object-contain object-right shrink-0"
                                />
                            </div>
                        )}

                        <div
                            className="relative z-10 w-16 h-16 rounded-lg bg-card-bg/80 backdrop-blur-sm border border-card-border p-0 flex items-center justify-center shrink-0 overflow-hidden"
                            style={{
                                backgroundImage:
                                    'linear-gradient(45deg, #80808012 25%, transparent 25%), linear-gradient(-45deg, #80808012 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #80808012 75%), linear-gradient(-45deg, transparent 75%, #80808012 75%)',
                                backgroundSize: '10px 10px',
                                backgroundPosition: '0 0, 0 5px, 5px -5px, -5px 0px',
                            }}
                        >
                            {effectiveThumb ? (
                                <img
                                    src={effectiveThumb}
                                    alt=""
                                    className="w-full h-full object-cover pointer-events-none"
                                />
                            ) : (
                                <Layers className="w-6 h-6 text-foreground/30" />
                            )}
                        </div>

                        <div className="relative z-10 flex-1 min-w-0">
                            <h4
                                style={cardTextColor ? { color: cardTextColor } : undefined}
                                className="text-sm font-bold text-foreground truncate"
                            >
                                {collectionName || 'Collection Name'}
                            </h4>
                            <span
                                style={
                                    cardTextColor
                                        ? { color: cardTextColor, opacity: 0.72 }
                                        : undefined
                                }
                                className="text-xs text-foreground/50 mt-0.5 block"
                            >
                                {imageCount} PNG{imageCount === 1 ? '' : 's'}
                            </span>
                        </div>
                    </div>

                    {/* 1. Left Square Thumbnail (coverImagePath) Controls */}
                    <div className="space-y-1.5">
                        <label className="block text-[11px] font-bold text-foreground/75 uppercase tracking-wider">
                            Card Square Thumbnail (400×400 px)
                        </label>
                        <input
                            ref={thumbFileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleFileUpload(e, 'coverImagePath')}
                            className="hidden"
                        />
                        <div className="flex flex-wrap items-center gap-2">
                            <button
                                type="button"
                                onClick={() =>
                                    setStudioSession({
                                        width: 400,
                                        height: 400,
                                        targetField: 'coverImagePath',
                                    })
                                }
                                className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold shadow-md shadow-blue-600/20 inline-flex items-center gap-1.5 cursor-pointer transition-all"
                            >
                                <Sparkles className="w-3.5 h-3.5" />
                                <span>Create in Studio</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => thumbFileInputRef.current?.click()}
                                disabled={uploadingField === 'coverImagePath'}
                                className="px-3 py-1.5 rounded-lg bg-input-bg hover:bg-foreground/10 border border-input-border text-xs font-semibold text-foreground inline-flex items-center gap-1.5 cursor-pointer transition-colors"
                            >
                                {uploadingField === 'coverImagePath' ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin text-primary-glow" />
                                ) : (
                                    <Upload className="w-3.5 h-3.5 text-primary-glow" />
                                )}
                                <span>Upload Thumbnail</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => onOpenLibraryPicker?.('coverImagePath')}
                                className="px-3 py-1.5 rounded-lg bg-input-bg hover:bg-foreground/10 border border-input-border text-xs font-semibold text-foreground inline-flex items-center gap-1.5 cursor-pointer transition-colors"
                            >
                                <ImageIcon className="w-3.5 h-3.5 text-primary-glow" />
                                <span>Pick from Library</span>
                            </button>

                            {coverImagePath && (
                                <button
                                    type="button"
                                    onClick={() => setCoverImagePath?.('')}
                                    className="px-2.5 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/25 text-xs font-semibold text-red-400 inline-flex items-center gap-1 cursor-pointer transition-colors"
                                >
                                    <X className="w-3 h-3" />
                                    <span>Auto Thumbnail</span>
                                </button>
                            )}
                        </div>
                    </div>

                    {/* 2. Right-Side Card Cover Image (cardBgImagePath) Controls */}
                    <div className="space-y-1.5">
                        <label className="block text-[11px] font-bold text-foreground/75 uppercase tracking-wider">
                            Card Right-Side Cover Image (700×192 px)
                        </label>
                        <input
                            ref={cardBgFileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleFileUpload(e, 'cardBgImagePath')}
                            className="hidden"
                        />
                        <div className="flex flex-wrap items-center gap-2">
                            <button
                                type="button"
                                onClick={() =>
                                    setStudioSession({
                                        width: 700,
                                        height: 192,
                                        targetField: 'cardBgImagePath',
                                    })
                                }
                                className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold shadow-md shadow-blue-600/20 inline-flex items-center gap-1.5 cursor-pointer transition-all"
                            >
                                <Sparkles className="w-3.5 h-3.5" />
                                <span>Create in Studio</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => cardBgFileInputRef.current?.click()}
                                disabled={uploadingField === 'cardBgImagePath'}
                                className="px-3 py-1.5 rounded-lg bg-input-bg hover:bg-foreground/10 border border-input-border text-xs font-semibold text-foreground inline-flex items-center gap-1.5 cursor-pointer transition-colors"
                            >
                                {uploadingField === 'cardBgImagePath' ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin text-primary-glow" />
                                ) : (
                                    <Upload className="w-3.5 h-3.5 text-primary-glow" />
                                )}
                                <span>Upload Cover</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => onOpenLibraryPicker?.('cardBgImagePath')}
                                className="px-3 py-1.5 rounded-lg bg-input-bg hover:bg-foreground/10 border border-input-border text-xs font-semibold text-foreground inline-flex items-center gap-1.5 cursor-pointer transition-colors"
                            >
                                <ImageIcon className="w-3.5 h-3.5 text-primary-glow" />
                                <span>Pick from Library</span>
                            </button>

                            {cardBgImagePath && (
                                <button
                                    type="button"
                                    onClick={() => setCardBgImagePath?.('')}
                                    className="px-2.5 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/25 text-xs font-semibold text-red-400 inline-flex items-center gap-1 cursor-pointer transition-colors"
                                >
                                    <X className="w-3 h-3" />
                                    <span>Remove</span>
                                </button>
                            )}
                        </div>
                    </div>

                    {/* 3. Card Background & Text Colors */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                        <DraggableColorPickerField
                            label="Card Background"
                            value={cardBgColor}
                            defaultFallback="#0f172a"
                            presets={HERO_BG_PRESETS}
                            onChange={setCardBgColor}
                            align="left"
                        />
                        <DraggableColorPickerField
                            label="Card Text Color"
                            value={cardTextColor}
                            defaultFallback="#ffffff"
                            presets={HERO_TEXT_PRESETS}
                            onChange={setCardTextColor}
                            align="right"
                        />
                    </div>
                </div>
            )}

            {/* Embedded Full-Screen Studio Modal */}
            {studioSession &&
                typeof document !== 'undefined' &&
                createPortal(
                    <div className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-md flex flex-col p-2 sm:p-4 animate-in fade-in duration-200">
                        <div className="relative flex-1 w-full rounded-2xl overflow-hidden border border-card-border shadow-2xl bg-slate-950 flex flex-col">
                            <iframe
                                src={studioUrl}
                                title="Create Collection Cover in Studio"
                                className="w-full h-full border-0 flex-1"
                            />
                        </div>
                    </div>,
                    document.body
                )}
        </div>
    );
}
