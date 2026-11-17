import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Head } from '@inertiajs/react';
import AdminLayout from '@/Layouts/AdminLayout';
import CollectionCarouselSlider, {
    DEFAULT_SLIDER_CONFIG,
    DEFAULT_TRENDING_SLIDER_CONFIG,
    DEFAULT_PART_OF_COLLECTIONS_SLIDER_CONFIG,
} from '@/components/collections/CollectionCarouselSlider';
import { HexColorPicker } from 'react-colorful';
import {
    parseHexOrRgbColor,
    useGlobalColorPickerDefaults,
    useSmallColorPickerViewport,
} from '@/lib/colorPickerConfig';
import {
    SlidersHorizontal,
    Save,
    RotateCcw,
    Monitor,
    Laptop,
    Tablet,
    Smartphone,
    Timer,
    Play,
    Pause,
    Repeat,
    Navigation,
    Layers,
    Loader2,
    Sparkles,
    FastForward,
    GripHorizontal,
    X,
    ChevronDown,
    ChevronUp,
    Pipette,
} from 'lucide-react';
import { toast } from 'sonner';
import EditorEyedropperOverlay from '@/components/editor/EditorEyedropperOverlay';

const DEFAULT_RELATED_COLLECTIONS = {
    id: 'related_collections',
    name: 'More Collections You May Like',
    location: 'Collection Detail Page (/collections/{slug})',
    ...DEFAULT_SLIDER_CONFIG,
};

const DEFAULT_TRENDING_COLLECTIONS = {
    ...DEFAULT_TRENDING_SLIDER_CONFIG,
};

const DEFAULT_PART_OF_COLLECTIONS = {
    ...DEFAULT_PART_OF_COLLECTIONS_SLIDER_CONFIG,
};

const BREAKPOINT_CARDS = [
    {
        id: 'desktop',
        label: 'Desktop (1280px+)',
        shortLabel: 'Desktop',
        widthHint: '100%',
        icon: Monitor,
        cardsField: 'cardsDesktop',
        stepField: 'stepDesktop',
        minCards: 1,
        maxCards: 12,
        defaultCards: 8,
    },
    {
        id: 'laptop',
        label: 'Laptop (1024px–1279px)',
        shortLabel: 'Laptop (1024px)',
        widthHint: '1024px',
        icon: Laptop,
        cardsField: 'cardsLaptop',
        stepField: 'stepLaptop',
        minCards: 1,
        maxCards: 10,
        defaultCards: 6,
    },
    {
        id: 'tablet',
        label: 'Tablet (768px–1023px)',
        shortLabel: 'Tablet (768px)',
        widthHint: '768px',
        icon: Tablet,
        cardsField: 'cardsTablet',
        stepField: 'stepTablet',
        minCards: 1,
        maxCards: 8,
        defaultCards: 4,
    },
    {
        id: 'small_tablet',
        label: 'Small Tablet (640px–767px)',
        shortLabel: 'Small Tablet (640px)',
        widthHint: '640px',
        icon: Tablet,
        cardsField: 'cardsSmallTablet',
        stepField: 'stepSmallTablet',
        minCards: 1,
        maxCards: 6,
        defaultCards: 3,
    },
    {
        id: 'mobile',
        label: 'Mobile (< 640px)',
        shortLabel: 'Mobile (390px)',
        widthHint: '390px',
        icon: Smartphone,
        cardsField: 'cardsMobile',
        stepField: 'stepMobile',
        minCards: 1,
        maxCards: 4,
        defaultCards: 2,
    },
];

const SAMPLE_COLLECTION_NAMES = [
    'Google Brand Logos',
    'Sports Cars & Supercars',
    'Winter Holiday Clipart',
    '3D Social Media Icons',
    'Watercolor Flowers',
    'Cyberpunk Neon Badges',
    'Vintage Retro Stickers',
    'Golden Luxury Frames',
    'Gaming Controller Pack',
    'Tropical Leaves & Palms',
    'Hand-Drawn Arrows',
    'Minimalist UI Shapes',
    'Festival Fireworks',
    'Coffee & Bakery Art',
    'Space & Galaxy Planets',
    'Halloween Spooky Set',
];

function DraggableMiniColorPicker({ label, value, fallback = '#0f172a', onChange }) {
    const [open, setOpen] = useState(false);
    const [isPicking, setIsPicking] = useState(false);
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const ref = useRef(null);
    const popupRef = useRef(null);
    const pickingRef = useRef(false);
    pickingRef.current = isPicking;
    const globalColorDefaults = useGlobalColorPickerDefaults();
    const isSmallViewport = useSmallColorPickerViewport();
    const pickerColor = value || globalColorDefaults.defaultColor;
    const isColorModified =
        parseHexOrRgbColor(pickerColor, '') !== globalColorDefaults.defaultColor;
    const dragRef = useRef({ active: false, startX: 0, startY: 0, initX: 0, initY: 0 });

    useEffect(() => {
        if (!open) {
            setIsPicking(false);
            return undefined;
        }
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
        const onDownOutside = (e) => {
            if (pickingRef.current) return;
            if (e.target?.closest?.('[data-testid="editor-eyedropper-overlay"]')) return;
            const insideTrigger = ref.current && ref.current.contains(e.target);
            const insidePopup = popupRef.current && popupRef.current.contains(e.target);
            if (!insideTrigger && !insidePopup) {
                setOpen(false);
            }
        };
        window.addEventListener('pointermove', onMove, { passive: false });
        window.addEventListener('pointerup', onUp);
        document.addEventListener('pointerdown', onDownOutside);
        return () => {
            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('pointerup', onUp);
            document.removeEventListener('pointerdown', onDownOutside);
        };
    }, [open]);

    return (
        <div className="space-y-1 relative" ref={ref}>
            <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-foreground/75">{label}</span>
                {value && (
                    <button
                        type="button"
                        onClick={() => onChange('')}
                        className="text-[10px] text-foreground/50 hover:text-foreground cursor-pointer"
                    >
                        Default
                    </button>
                )}
            </div>
            <button
                type="button"
                onClick={() => setOpen((p) => !p)}
                className={`w-full px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center justify-between gap-2 border ${
                    value
                        ? 'bg-blue-600 text-white border-blue-500 shadow-xs'
                        : 'bg-card-bg text-foreground/80 border-card-border hover:border-primary-glow/50'
                }`}
            >
                <span className="flex items-center gap-2">
                    <span
                        className="w-3.5 h-3.5 rounded-full border border-white/50 inline-block shrink-0"
                        style={{ backgroundColor: value || fallback }}
                    />
                    <span className="font-mono text-[11px]">
                        {value ? value.toUpperCase() : 'Theme Default'}
                    </span>
                </span>
            </button>

            {open && (() => {
                const pickerPopup = (
                    <div
                        ref={popupRef}
                        role="dialog"
                        aria-label={`${label} color picker`}
                        onPointerDown={(e) => {
                            e.stopPropagation();
                            if (e.target.closest('input, button, .react-colorful, [data-no-drag]')) return;
                            if (e.cancelable) e.preventDefault();
                            dragRef.current = {
                                active: true,
                                startX: e.clientX,
                                startY: e.clientY,
                                initX: offset.x,
                                initY: offset.y,
                            };
                        }}
                        style={{
                            transform: isSmallViewport
                                ? `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px))`
                                : `translate(${offset.x}px, ${offset.y}px)`,
                        }}
                        className={`${
                            isSmallViewport
                                ? 'fixed left-1/2 top-1/2 z-[120]'
                                : 'absolute left-0 bottom-full mb-2 z-50'
                        } p-3.5 bg-card-bg border border-card-border rounded-2xl shadow-2xl flex flex-col items-center gap-3 cursor-move select-none touch-none max-w-[calc(100vw-1.5rem)] ${
                            isPicking ? 'opacity-0 pointer-events-none' : ''
                        }`}
                    >
                        <div className="flex items-center justify-between w-full pb-1 border-b border-card-border/50 text-[11px] font-bold text-foreground/50">
                            <div className="flex items-center gap-1.5 pointer-events-none">
                                <GripHorizontal className="w-3.5 h-3.5 text-foreground/40" />
                                <span>{label}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                {isColorModified && (
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onChange(globalColorDefaults.defaultColor);
                                        }}
                                        className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-foreground/10 text-foreground/75 hover:text-foreground hover:bg-foreground/15 cursor-pointer"
                                        title={`Reset color to ${globalColorDefaults.defaultColor}`}
                                    >
                                        <RotateCcw className="w-2.5 h-2.5" />
                                        <span>Reset</span>
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={() => setOpen(false)}
                                    className="p-0.5 rounded-md text-foreground/50 hover:text-foreground cursor-pointer"
                                    aria-label="Close color picker"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>
                        <div className="cursor-default touch-none [&_.react-colorful]:touch-none" data-no-drag>
                            <HexColorPicker color={pickerColor} onChange={onChange} />
                        </div>
                        <div className="flex items-center gap-2 w-full" data-no-drag>
                            <span
                                className="w-5 h-5 rounded-md border border-card-border shrink-0"
                                style={{ backgroundColor: pickerColor }}
                            />
                            <input
                                type="text"
                                data-no-drag
                                value={pickerColor.toUpperCase()}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    if (val.startsWith('#') || val.length <= 7) onChange(val);
                                }}
                                className="min-w-0 flex-1 bg-input-bg border border-input-border text-foreground text-xs px-2 py-1 rounded font-mono uppercase focus:outline-none focus:border-blue-500 text-center"
                            />
                            <button
                                type="button"
                                data-testid="admin-slider-eyedropper"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setIsPicking(true);
                                }}
                                className="p-1.5 rounded-md border border-input-border bg-card-header-bg hover:bg-blue-500/15 hover:border-blue-500/40 text-foreground/75 hover:text-blue-400 transition-colors cursor-pointer shrink-0"
                                aria-label={`Pick ${label} from screen`}
                                title="Eyedropper"
                            >
                                <Pipette className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>
                );
                if (isSmallViewport && typeof document !== 'undefined') {
                    return createPortal(pickerPopup, document.body);
                }
                return pickerPopup;
            })()}
            <EditorEyedropperOverlay
                open={open && isPicking}
                initialColor={pickerColor}
                onPick={(hex) => {
                    onChange(hex);
                    setIsPicking(false);
                }}
                onCancel={() => setIsPicking(false)}
            />
        </div>
    );
}

export default function AdminSliderSettings({ initialSliders = {} }) {
    const [sliders, setSliders] = useState(() => ({
        related_collections: {
            ...DEFAULT_RELATED_COLLECTIONS,
            ...(initialSliders?.related_collections || {}),
        },
        trending_collections: {
            ...DEFAULT_TRENDING_COLLECTIONS,
            ...(initialSliders?.trending_collections || {}),
        },
        part_of_collections: {
            ...DEFAULT_PART_OF_COLLECTIONS,
            ...(initialSliders?.part_of_collections || {}),
        },
        ...initialSliders,
    }));
    const [activeKey, setActiveKey] = useState('related_collections');
    const [saving, setSaving] = useState(false);
    const [previewViewport, setPreviewViewport] = useState('desktop');
    const [isRegistryMinimized, setIsRegistryMinimized] = useState(true);
    const [isTestingGroundSticky, setIsTestingGroundSticky] = useState(false);
    const testingGroundRef = useRef(null);
    const [realCollections, setRealCollections] = useState([]);

    useEffect(() => {
        const checkSticky = () => {
            const el = testingGroundRef.current;
            if (!el) return;
            const rect = el.getBoundingClientRect();
            setIsTestingGroundSticky(rect.top <= 18 && window.scrollY > 10);
        };
        checkSticky();
        window.addEventListener('scroll', checkSticky, { passive: true });
        window.addEventListener('resize', checkSticky, { passive: true });
        return () => {
            window.removeEventListener('scroll', checkSticky);
            window.removeEventListener('resize', checkSticky);
        };
    }, []);

    useEffect(() => {
        fetch('/api/collections?limit=30')
            .then((r) => r.json())
            .then((data) => {
                if (Array.isArray(data)) {
                    setRealCollections(data);
                }
            })
            .catch(() => {});
    }, []);

    const defaultForActive =
        activeKey === 'trending_collections'
            ? DEFAULT_TRENDING_COLLECTIONS
            : activeKey === 'part_of_collections'
            ? DEFAULT_PART_OF_COLLECTIONS
            : DEFAULT_RELATED_COLLECTIONS;
    const activeSlider = sliders[activeKey] || defaultForActive;

    // Build live testing dataset with `maxTotalItems` cards (using real collections + sample cards)
    const previewCollections = useMemo(() => {
        const count = Math.max(4, Math.min(40, Number(activeSlider.maxTotalItems) || 24));
        const list = [];
        for (let i = 0; i < count; i++) {
            const real = realCollections[i];
            if (real) {
                list.push({
                    ...real,
                    id: `preview-${real.id}-${i}`,
                });
            } else {
                const refCol = realCollections[i % Math.max(1, realCollections.length)];
                list.push({
                    id: `sample-col-${i + 1}`,
                    name: SAMPLE_COLLECTION_NAMES[i % SAMPLE_COLLECTION_NAMES.length],
                    slug: `sample-pack-${i + 1}`,
                    description:
                        refCol?.description ||
                        'Curated collection of high-resolution transparent PNG graphics and vector-ready design assets.',
                    imageCount: 12 + ((i * 7) % 45),
                    coverImagePath: refCol?.coverImagePath || null,
                    cardBgImagePath: refCol?.cardBgImagePath || null,
                    cardBgColor: refCol?.cardBgColor || null,
                    cardTextColor: refCol?.cardTextColor || null,
                    previewImages: refCol?.previewImages || [],
                });
            }
        }
        return list;
    }, [realCollections, activeSlider.maxTotalItems]);

    const updateField = (field, value) => {
        setSliders((prev) => {
            const current = {
                ...(prev[activeKey] || defaultForActive),
                [field]: value,
            };
            for (const bp of BREAKPOINT_CARDS) {
                if (field === bp.cardsField) {
                    const maxVisible = Number(value) || 1;
                    if ((Number(current[bp.stepField]) || 1) > maxVisible) {
                        current[bp.stepField] = maxVisible;
                    }
                }
            }
            return {
                ...prev,
                [activeKey]: current,
            };
        });
    };

    const handleResetDefaults = () => {
        setSliders((prev) => ({
            ...prev,
            [activeKey]: { ...defaultForActive },
        }));
        toast.info('Reset slider configuration to defaults (click Save to apply)');
    };

    const handleSave = async (e) => {
        e?.preventDefault?.();
        setSaving(true);
        try {
            const res = await fetch('/api/admin/sliders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sliders }),
            });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || 'Failed to save slider settings');
            }
            if (data.sliders) {
                setSliders(data.sliders);
            }
            toast.success('Slider settings saved successfully!');
        } catch (err) {
            toast.error(err.message || 'Failed to save slider settings');
        } finally {
            setSaving(false);
        }
    };

    const sliderKeys = Object.keys(sliders);
    const activeBpMeta =
        BREAKPOINT_CARDS.find((b) => b.id === previewViewport) || BREAKPOINT_CARDS[0];

    return (
        <AdminLayout>
            <Head title="Sliders Settings - Admin" />

            <div className="space-y-6 pb-20">
                {/* Page Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center gap-2.5">
                            <SlidersHorizontal className="w-7 h-7 text-primary-glow" />
                            <span>Sliders & Carousels</span>
                        </h1>
                        <p className="text-sm text-foreground/60 mt-1">
                            Configure visible cards per screen size, per-device auto-scroll steps, side chevron button placement/size, and test everything live below.
                        </p>
                    </div>

                    <div className="flex items-center gap-1 p-1 bg-card-header-bg border border-card-border rounded-xl self-start sm:self-auto">
                        <button
                            type="button"
                            onClick={handleResetDefaults}
                            className="h-8 px-3 rounded-lg bg-card-bg hover:text-primary-glow text-xs font-bold text-foreground/80 shadow-sm inline-flex items-center gap-1.5 transition-all cursor-pointer"
                        >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Reset Defaults</span>
                        </button>

                        <button
                            type="button"
                            onClick={handleSave}
                            disabled={saving}
                            className="h-8 px-3.5 rounded-lg bg-primary-glow hover:bg-blue-500 text-white text-xs font-bold shadow-sm inline-flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                        >
                            {saving ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                                <Save className="w-3.5 h-3.5" />
                            )}
                            <span>{saving ? 'Saving...' : 'Save Slider Settings'}</span>
                        </button>
                    </div>
                </div>

                {/* Minimizable Registered Sliders Card (Minimized by Default) */}
                <div className="bg-card-bg border border-card-border rounded-xl p-4">
                    <div
                        onClick={() => setIsRegistryMinimized((prev) => !prev)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                setIsRegistryMinimized((prev) => !prev);
                            }
                        }}
                        className="flex flex-wrap items-center justify-between gap-3 cursor-pointer select-none"
                    >
                        <div className="flex items-center gap-2.5">
                            <span className="text-xs font-bold uppercase tracking-wider text-foreground/60">
                                Registered Sliders ({sliderKeys.length})
                            </span>
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary-glow/10 text-primary-glow border border-primary-glow/25">
                                <span
                                    className={`w-2 h-2 rounded-full ${
                                        activeSlider.enabled ? 'bg-emerald-400' : 'bg-slate-500'
                                    }`}
                                />
                                <span>{activeSlider.name}</span>
                            </span>
                        </div>

                        <div className="flex items-center gap-2">
                            <span className="text-[11px] text-foreground/45 hidden sm:inline">
                                {isRegistryMinimized ? 'Click to expand' : 'Click to minimize'}
                            </span>
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setIsRegistryMinimized((prev) => !prev);
                                }}
                                aria-label={
                                    isRegistryMinimized
                                        ? 'Expand Registered Sliders'
                                        : 'Minimize Registered Sliders'
                                }
                                className="w-7 h-7 rounded-lg bg-background border border-card-border flex items-center justify-center text-foreground/65 hover:text-foreground transition-colors cursor-pointer"
                            >
                                {isRegistryMinimized ? (
                                    <ChevronDown className="w-4 h-4" />
                                ) : (
                                    <ChevronUp className="w-4 h-4" />
                                )}
                            </button>
                        </div>
                    </div>

                    {!isRegistryMinimized && (
                        <div className="flex flex-wrap gap-2 pt-3.5 mt-3 border-t border-card-border animate-in fade-in duration-150">
                            {sliderKeys.map((key) => {
                                const item = sliders[key];
                                const isActive = key === activeKey;
                                return (
                                    <button
                                        key={key}
                                        type="button"
                                        onClick={() => setActiveKey(key)}
                                        className={`px-4 py-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-3 ${
                                            isActive
                                                ? 'bg-primary-glow/10 border-primary-glow text-foreground shadow-sm'
                                                : 'bg-background border-card-border text-foreground/70 hover:text-foreground hover:border-primary-glow/40'
                                        }`}
                                    >
                                        <div
                                            className={`w-2.5 h-2.5 rounded-full ${
                                                item.enabled ? 'bg-emerald-400' : 'bg-slate-500'
                                            }`}
                                        />
                                        <div>
                                            <div className="text-xs font-bold">{item.name}</div>
                                            <div className="text-[10px] text-foreground/50">
                                                {item.location}
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Interactive Multi-Viewport Live Testing Ground (Sticky with scroll-activated shadow) */}
                <div
                    ref={testingGroundRef}
                    className={`sticky top-4 z-30 bg-card-bg/95 backdrop-blur-md border border-card-border rounded-xl p-5 space-y-4 transition-shadow duration-200 ${
                        isTestingGroundSticky ? 'shadow-xl shadow-black/25' : 'shadow-none'
                    }`}
                >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-card-border pb-3.5">
                        <div>
                            <div className="flex items-center gap-2">
                                <Sparkles className="w-4 h-4 text-primary-glow" />
                                <h3 className="text-base font-bold text-foreground">
                                    Interactive Live Slider Testing Ground
                                </h3>
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                                    Live Sandbox
                                </span>
                            </div>
                            <p className="text-xs text-foreground/55 mt-0.5">
                                Test auto-scrolling, drag physics, exact card-index snapping, and side chevron button placement across different screen sizes before saving.
                            </p>
                        </div>

                        {/* Viewport Simulator Switcher Buttons (Icons Only with Tooltip, Coherent Toolbar Style) */}
                        <div className="flex items-center gap-1 p-1 bg-card-header-bg border border-card-border rounded-xl self-start md:self-auto">
                            {BREAKPOINT_CARDS.map((bp) => {
                                const Icon = bp.icon;
                                const isSelected = previewViewport === bp.id;
                                const count = activeSlider[bp.cardsField];
                                const step = activeSlider[bp.stepField] || 1;
                                return (
                                    <button
                                        key={bp.id}
                                        type="button"
                                        onClick={() => setPreviewViewport(bp.id)}
                                        title={`${bp.label} — ${count} visible cards, ${step} step`}
                                        aria-label={bp.label}
                                        className={`w-7 h-7 rounded-lg transition-all cursor-pointer flex items-center justify-center ${
                                            isSelected
                                                ? 'bg-primary-glow text-white shadow-sm'
                                                : 'bg-card-bg text-foreground/65 hover:text-primary-glow shadow-sm'
                                        }`}
                                    >
                                        <Icon
                                            className={
                                                bp.id === 'small_tablet'
                                                    ? 'w-3.5 h-3.5 -rotate-90'
                                                    : 'w-4 h-4'
                                            }
                                        />
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Simulated Viewport Container */}
                    <div className="w-full bg-background/60 border border-dashed border-card-border rounded-2xl p-6 flex flex-col items-center overflow-x-auto">
                        <div className="text-[11px] font-mono text-foreground/50 mb-3 flex items-center gap-2">
                            <span>Simulating:</span>
                            <strong className="text-primary-glow">{activeBpMeta.label}</strong>
                            <span>·</span>
                            <span>
                                {activeSlider[activeBpMeta.cardsField]} visible cards, advancing by{' '}
                                {activeSlider[activeBpMeta.stepField] || 1} per tick
                            </span>
                        </div>

                        <div
                            style={{
                                width: '100%',
                                maxWidth:
                                    activeKey === 'part_of_collections' && previewViewport !== 'mobile'
                                        ? '384px'
                                        : activeBpMeta.widthHint,
                                transition: 'max-width 300ms cubic-bezier(0.22, 1, 0.36, 1)',
                            }}
                            className="px-4"
                        >
                            {activeKey === 'part_of_collections' ? (
                                <div className="bg-card-bg border border-card-border rounded-xl shadow-lg">
                                    <div className="bg-slate-100 dark:bg-card-header-bg px-4 py-3 border-b border-card-border rounded-t-xl flex items-center justify-between">
                                        <span className="font-semibold text-foreground text-sm">Part of Collections</span>
                                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-500">
                                            {previewCollections.length}
                                        </span>
                                    </div>
                                    <div className="px-4 py-3.5">
                                        <CollectionCarouselSlider
                                            collections={previewCollections}
                                            sliderConfig={activeSlider}
                                            variant="part_of_collections"
                                            forcedViewport={previewViewport}
                                            isPreview={true}
                                            hideHeader={true}
                                        />
                                    </div>
                                </div>
                            ) : (
                                <CollectionCarouselSlider
                                    collections={previewCollections}
                                    sliderConfig={activeSlider}
                                    forcedViewport={previewViewport}
                                    isPreview={true}
                                />
                            )}
                        </div>
                    </div>
                </div>

                {/* Active Slider Configuration Form */}
                <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Left Column: Responsive Cards Per Row + Auto-Scroll Step Per Breakpoint */}
                    <div className="lg:col-span-7 space-y-6">
                        <div className="bg-card-bg border border-card-border rounded-xl p-6 space-y-5">
                            <div className="flex items-center justify-between border-b border-card-border pb-4">
                                <div>
                                    <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                                        <Monitor className="w-4 h-4 text-primary-glow" />
                                        <span>Visible Cards Per Row & Auto-Scroll Step</span>
                                    </h2>
                                    <p className="text-xs text-foreground/55 mt-0.5">
                                        Set how many cards fit side-by-side and how many cards advance per auto-scroll tick on each screen size.
                                    </p>
                                </div>

                                <label className="inline-flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={Boolean(activeSlider.enabled)}
                                        onChange={(e) => updateField('enabled', e.target.checked)}
                                        className="w-4 h-4 rounded text-blue-600 border-card-border focus:ring-primary-glow"
                                    />
                                    <span className="text-xs font-bold text-foreground">
                                        Slider Enabled
                                    </span>
                                </label>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {BREAKPOINT_CARDS.map((bp) => {
                                    const Icon = bp.icon;
                                    const visibleCount =
                                        Number(activeSlider[bp.cardsField]) || bp.defaultCards;
                                    const stepCount = Math.min(
                                        visibleCount,
                                        Math.max(1, Number(activeSlider[bp.stepField]) || 1)
                                    );

                                    return (
                                        <div
                                            key={bp.cardsField}
                                            className="p-4 rounded-xl bg-background border border-card-border space-y-3.5"
                                        >
                                            <div className="space-y-1.5">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                                        <Icon className="w-3.5 h-3.5 text-primary-glow" />
                                                        {bp.label}
                                                    </span>
                                                    <span className="px-2 py-0.5 rounded-md bg-primary-glow/15 text-primary-glow text-xs font-extrabold">
                                                        {visibleCount}{' '}
                                                        {visibleCount === 1 ? 'card' : 'cards'}
                                                    </span>
                                                </div>
                                                <input
                                                    type="range"
                                                    min={bp.minCards}
                                                    max={bp.maxCards}
                                                    value={visibleCount}
                                                    onChange={(e) =>
                                                        updateField(
                                                            bp.cardsField,
                                                            Number(e.target.value)
                                                        )
                                                    }
                                                    className="w-full accent-blue-600 cursor-pointer"
                                                />
                                                <div className="flex justify-between text-[10px] text-foreground/45 font-mono">
                                                    <span>{bp.minCards}</span>
                                                    <span>
                                                        Default:{' '}
                                                        {defaultForActive[bp.cardsField] ||
                                                            bp.defaultCards}
                                                    </span>
                                                    <span>{bp.maxCards}</span>
                                                </div>
                                            </div>

                                            <div className="pt-2.5 border-t border-card-border/70 space-y-1.5">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[11px] font-semibold text-foreground/75 flex items-center gap-1">
                                                        <FastForward className="w-3 h-3 text-primary-glow" />
                                                        Auto-Scroll Step
                                                    </span>
                                                    <span className="text-[11px] font-bold text-primary-glow">
                                                        {stepCount}{' '}
                                                        {stepCount === 1 ? 'card' : 'cards'} / tick
                                                    </span>
                                                </div>

                                                <div className="flex flex-wrap gap-1">
                                                    {Array.from({ length: visibleCount }).map(
                                                        (_, i) => {
                                                            const n = i + 1;
                                                            const isSelected = stepCount === n;
                                                            return (
                                                                <button
                                                                    key={n}
                                                                    type="button"
                                                                    onClick={() =>
                                                                        updateField(bp.stepField, n)
                                                                    }
                                                                    className={`px-2 py-1 rounded-md text-[11px] font-bold border transition-all cursor-pointer ${
                                                                        isSelected
                                                                            ? 'bg-primary-glow text-white border-primary-glow shadow-xs'
                                                                            : 'bg-card-bg border-card-border text-foreground/65 hover:text-foreground hover:border-primary-glow/40'
                                                                    }`}
                                                                >
                                                                    {n}
                                                                </button>
                                                            );
                                                        }
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}

                                {/* Max Total Items Loaded in Track */}
                                <div className="p-4 rounded-xl bg-background border border-card-border space-y-2 flex flex-col justify-between">
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                                <Layers className="w-3.5 h-3.5 text-primary-glow" />
                                                Total Items in Track
                                            </span>
                                            <span className="px-2 py-0.5 rounded-md bg-primary-glow/15 text-primary-glow text-xs font-extrabold">
                                                {activeSlider.maxTotalItems} items
                                            </span>
                                        </div>
                                        <input
                                            type="range"
                                            min={4}
                                            max={60}
                                            value={activeSlider.maxTotalItems}
                                            onChange={(e) =>
                                                updateField('maxTotalItems', Number(e.target.value))
                                            }
                                            className="w-full accent-blue-600 cursor-pointer"
                                        />
                                        <div className="flex justify-between text-[10px] text-foreground/45 font-mono">
                                            <span>4 items</span>
                                            <span>Default: {defaultForActive.maxTotalItems || 24}</span>
                                            <span>60 items</span>
                                        </div>
                                    </div>
                                    <p className="text-[11px] text-foreground/50 pt-2 border-t border-card-border/70">
                                        Maximum collections loaded into the horizontal slider track.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Side Chevron Button Customizer & Auto-Scroll Timer */}
                    <div className="lg:col-span-5 space-y-6">
                        {/* Side Chevron Buttons Customization Card */}
                        <div className="bg-card-bg border border-card-border rounded-xl p-6 space-y-4">
                            <div className="flex items-center justify-between border-b border-card-border pb-3.5">
                                <div>
                                    <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                                        <Navigation className="w-4 h-4 text-primary-glow" />
                                        <span>Side Chevron Buttons</span>
                                    </h2>
                                    <p className="text-xs text-foreground/55 mt-0.5">
                                        Customize size, edge placement, shape, and colors of the side arrows.
                                    </p>
                                </div>

                                <input
                                    type="checkbox"
                                    checked={Boolean(activeSlider.showArrows)}
                                    onChange={(e) => updateField('showArrows', e.target.checked)}
                                    className="w-4 h-4 rounded text-blue-600 border-card-border focus:ring-primary-glow cursor-pointer"
                                    title="Enable side chevron buttons"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                {/* Button Size */}
                                <div className="p-3 rounded-xl bg-background border border-card-border space-y-1.5">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[11px] font-bold text-foreground">
                                            Button Size
                                        </span>
                                        <span className="text-[11px] font-mono font-bold text-primary-glow">
                                            {activeSlider.arrowSize ?? 28}px
                                        </span>
                                    </div>
                                    <input
                                        type="range"
                                        min={20}
                                        max={52}
                                        value={activeSlider.arrowSize ?? 28}
                                        onChange={(e) =>
                                            updateField('arrowSize', Number(e.target.value))
                                        }
                                        className="w-full accent-blue-600 cursor-pointer"
                                    />
                                </div>

                                {/* Icon Size */}
                                <div className="p-3 rounded-xl bg-background border border-card-border space-y-1.5">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[11px] font-bold text-foreground">
                                            Chevron Icon Size
                                        </span>
                                        <span className="text-[11px] font-mono font-bold text-primary-glow">
                                            {activeSlider.arrowIconSize ?? 14}px
                                        </span>
                                    </div>
                                    <input
                                        type="range"
                                        min={10}
                                        max={28}
                                        value={activeSlider.arrowIconSize ?? 14}
                                        onChange={(e) =>
                                            updateField('arrowIconSize', Number(e.target.value))
                                        }
                                        className="w-full accent-blue-600 cursor-pointer"
                                    />
                                </div>

                                {/* Horizontal Edge Offset (X) */}
                                <div className="p-3 rounded-xl bg-background border border-card-border space-y-1.5">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[11px] font-bold text-foreground">
                                            Edge X Offset
                                        </span>
                                        <span className="text-[11px] font-mono font-bold text-primary-glow">
                                            {activeSlider.arrowOffsetX ?? 0}px
                                        </span>
                                    </div>
                                    <input
                                        type="range"
                                        min={-28}
                                        max={28}
                                        value={activeSlider.arrowOffsetX ?? 0}
                                        onChange={(e) =>
                                            updateField('arrowOffsetX', Number(e.target.value))
                                        }
                                        className="w-full accent-blue-600 cursor-pointer"
                                    />
                                    <div className="flex justify-between text-[9px] text-foreground/45">
                                        <span>Outward</span>
                                        <button
                                            type="button"
                                            onClick={() => updateField('arrowOffsetX', 0)}
                                            className="hover:text-primary-glow underline cursor-pointer"
                                        >
                                            0px (On Edge)
                                        </button>
                                        <span>Inward</span>
                                    </div>
                                </div>

                                {/* Vertical Offset (Y) */}
                                <div className="p-3 rounded-xl bg-background border border-card-border space-y-1.5">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[11px] font-bold text-foreground">
                                            Vertical Y Offset
                                        </span>
                                        <span className="text-[11px] font-mono font-bold text-primary-glow">
                                            {activeSlider.arrowOffsetY ?? 0}px
                                        </span>
                                    </div>
                                    <input
                                        type="range"
                                        min={-36}
                                        max={36}
                                        value={activeSlider.arrowOffsetY ?? 0}
                                        onChange={(e) =>
                                            updateField('arrowOffsetY', Number(e.target.value))
                                        }
                                        className="w-full accent-blue-600 cursor-pointer"
                                    />
                                    <div className="flex justify-between text-[9px] text-foreground/45">
                                        <span>Up</span>
                                        <button
                                            type="button"
                                            onClick={() => updateField('arrowOffsetY', 0)}
                                            className="hover:text-primary-glow underline cursor-pointer"
                                        >
                                            0px (Middle)
                                        </button>
                                        <span>Down</span>
                                    </div>
                                </div>
                            </div>

                            {/* Button Shape Selector */}
                            <div className="space-y-1.5">
                                <span className="text-[11px] font-bold text-foreground/75">
                                    Button Shape
                                </span>
                                <div className="grid grid-cols-3 gap-2">
                                    {[
                                        { id: 'circle', label: 'Circle' },
                                        { id: 'rounded', label: 'Rounded' },
                                        { id: 'square', label: 'Square' },
                                    ].map((sh) => (
                                        <button
                                            key={sh.id}
                                            type="button"
                                            onClick={() => updateField('arrowShape', sh.id)}
                                            className={`py-1.5 px-3 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                                                (activeSlider.arrowShape || 'circle') === sh.id
                                                    ? 'bg-primary-glow text-white border-primary-glow'
                                                    : 'bg-background border-card-border text-foreground/70 hover:text-foreground'
                                            }`}
                                        >
                                            {sh.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Custom Colors for Arrow Buttons */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                                <DraggableMiniColorPicker
                                    label="Button BG"
                                    value={activeSlider.arrowBgColor || ''}
                                    fallback="#0f172a"
                                    onChange={(val) => updateField('arrowBgColor', val)}
                                />
                                <DraggableMiniColorPicker
                                    label="Icon Color"
                                    value={activeSlider.arrowIconColor || ''}
                                    fallback="#ffffff"
                                    onChange={(val) => updateField('arrowIconColor', val)}
                                />
                                <DraggableMiniColorPicker
                                    label="Border"
                                    value={activeSlider.arrowBorderColor || ''}
                                    fallback="#334155"
                                    onChange={(val) => updateField('arrowBorderColor', val)}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-2 pt-1">
                                <label className="flex items-center justify-between p-2.5 rounded-xl bg-background border border-card-border cursor-pointer">
                                    <span className="text-[11px] font-semibold text-foreground">
                                        Edge Gradient Fade
                                    </span>
                                    <input
                                        type="checkbox"
                                        checked={activeSlider.showEdgeFade !== false}
                                        onChange={(e) =>
                                            updateField('showEdgeFade', e.target.checked)
                                        }
                                        className="w-4 h-4 rounded text-blue-600 border-card-border"
                                    />
                                </label>
                                <label className="flex items-center justify-between p-2.5 rounded-xl bg-background border border-card-border cursor-pointer">
                                    <span className="text-[11px] font-semibold text-foreground">
                                        Extra Header Arrows
                                    </span>
                                    <input
                                        type="checkbox"
                                        checked={Boolean(activeSlider.showHeaderArrows)}
                                        onChange={(e) =>
                                            updateField('showHeaderArrows', e.target.checked)
                                        }
                                        className="w-4 h-4 rounded text-blue-600 border-card-border"
                                    />
                                </label>
                            </div>
                        </div>

                        {/* Auto-Scroll Timer Card */}
                        <div className="bg-card-bg border border-card-border rounded-xl p-6 space-y-4">
                            <div className="border-b border-card-border pb-3.5">
                                <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                                    <Timer className="w-4 h-4 text-primary-glow" />
                                    <span>Auto-Scroll Timer & Behavior</span>
                                </h2>
                            </div>

                            <div className="flex items-center justify-between p-3 rounded-xl bg-background border border-card-border">
                                <div className="flex items-center gap-2.5">
                                    {activeSlider.autoScroll ? (
                                        <Play className="w-4 h-4 text-emerald-400" />
                                    ) : (
                                        <Pause className="w-4 h-4 text-foreground/40" />
                                    )}
                                    <div>
                                        <div className="text-xs font-bold text-foreground">
                                            Auto-Scroll on Timer
                                        </div>
                                        <div className="text-[11px] text-foreground/50">
                                            Snaps cleanly to exact card boundaries
                                        </div>
                                    </div>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={Boolean(activeSlider.autoScroll)}
                                    onChange={(e) => updateField('autoScroll', e.target.checked)}
                                    className="w-4 h-4 rounded text-blue-600 border-card-border focus:ring-primary-glow cursor-pointer"
                                />
                            </div>

                            <div className="p-3.5 rounded-xl bg-background border border-card-border space-y-1.5">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-foreground">
                                        Timer Interval
                                    </span>
                                    <span className="px-2 py-0.5 rounded-md bg-primary-glow/15 text-primary-glow text-xs font-mono font-bold">
                                        {(activeSlider.autoScrollIntervalMs / 1000).toFixed(1)}s
                                    </span>
                                </div>
                                <input
                                    type="range"
                                    min={1000}
                                    max={15000}
                                    step={500}
                                    value={activeSlider.autoScrollIntervalMs}
                                    onChange={(e) =>
                                        updateField('autoScrollIntervalMs', Number(e.target.value))
                                    }
                                    disabled={!activeSlider.autoScroll}
                                    className="w-full accent-blue-600 cursor-pointer disabled:opacity-40"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="flex items-center justify-between p-2.5 rounded-xl bg-background border border-card-border cursor-pointer">
                                    <span className="text-xs font-semibold text-foreground flex items-center gap-2">
                                        <Pause className="w-3.5 h-3.5 text-primary-glow" />
                                        Pause Auto-Scroll on Hover or Drag
                                    </span>
                                    <input
                                        type="checkbox"
                                        checked={Boolean(activeSlider.pauseOnHover)}
                                        onChange={(e) =>
                                            updateField('pauseOnHover', e.target.checked)
                                        }
                                        className="w-4 h-4 rounded text-blue-600 border-card-border"
                                    />
                                </label>

                                <label className="flex items-center justify-between p-2.5 rounded-xl bg-background border border-card-border cursor-pointer">
                                    <span className="text-xs font-semibold text-foreground flex items-center gap-2">
                                        <Repeat className="w-3.5 h-3.5 text-primary-glow" />
                                        Loop Back to Start When Reaching the End
                                    </span>
                                    <input
                                        type="checkbox"
                                        checked={Boolean(activeSlider.loop)}
                                        onChange={(e) => updateField('loop', e.target.checked)}
                                        className="w-4 h-4 rounded text-blue-600 border-card-border"
                                    />
                                </label>

                                <label className="flex items-center justify-between p-2.5 rounded-xl bg-background border border-card-border cursor-pointer">
                                    <span className="text-xs font-semibold text-foreground flex items-center gap-2">
                                        <Sparkles className="w-3.5 h-3.5 text-primary-glow" />
                                        Show Interactive Progress Dots
                                    </span>
                                    <input
                                        type="checkbox"
                                        checked={Boolean(activeSlider.showProgressDots)}
                                        onChange={(e) =>
                                            updateField('showProgressDots', e.target.checked)
                                        }
                                        className="w-4 h-4 rounded text-blue-600 border-card-border"
                                    />
                                </label>
                            </div>
                        </div>
                    </div>
                </form>
            </div>
        </AdminLayout>
    );
}
