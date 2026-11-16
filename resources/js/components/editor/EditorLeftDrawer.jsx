import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
    LayoutTemplate,
    Image as ImageIcon,
    Shapes,
    Type,
    Upload,
    Palette,
    Search,
    X,
    Sparkles,
    Wand2,
    Plus,
    GripVertical,
    SlidersHorizontal,
    Star,
    MoreVertical,
} from 'lucide-react';
import StudioColorPicker from '../tools/StudioColorPicker';
import StudioSelect from '../ui/StudioSelect';
import { useDraggablePanel } from './useDraggablePanel';
import { AnimatedPopover } from './useAnimatedPresence';
import TemplateInfoPopover from './TemplateInfoPopover';
import { TEXT_PAIRINGS } from './editorHelpers';
import { ALL_GOOGLE_FONTS, loadGoogleFontsBatch } from './googleFontsHelper';

const TABS = [
    { id: 'templates', label: 'Templates', icon: LayoutTemplate },
    { id: 'assets', label: 'Assets', icon: ImageIcon },
    { id: 'elements', label: 'Elements', icon: Shapes },
    { id: 'text', label: 'Text', icon: Type },
    { id: 'uploads', label: 'Uploads', icon: Upload },
    { id: 'background', label: 'Background', icon: Palette },
];

const ASSET_TYPES = [
    { id: 'png', label: 'PNG Assets' },
    { id: 'svg', label: 'SVG' },
    { id: 'backgrounds', label: 'Backgrounds' },
];

const FAV_TEMPLATES_STORAGE_KEY = 'png101:editor:favTemplates:v1';

const GRADIENT_PRESETS = [
    { id: 'indigo-sky', label: 'Indigo Sky', type: 'linear', angle: 135, from: '#4f46e5', to: '#0ea5e9' },
    { id: 'sunset-coral', label: 'Sunset Coral', type: 'linear', angle: 135, from: '#f97316', to: '#ec4899' },
    { id: 'mint-emerald', label: 'Mint Emerald', type: 'linear', angle: 135, from: '#10b981', to: '#06b6d4' },
    { id: 'royal-violet', label: 'Royal Violet', type: 'linear', angle: 135, from: '#7c3aed', to: '#db2777' },
    { id: 'midnight-navy', label: 'Midnight Navy', type: 'linear', angle: 160, from: '#0f172a', to: '#1e3a8a' },
    { id: 'warm-amber', label: 'Warm Gold', type: 'linear', angle: 120, from: '#f59e0b', to: '#ef4444' },
    { id: 'peach-blossom', label: 'Peach Blossom', type: 'linear', angle: 135, from: '#fda4af', to: '#fdba74' },
    { id: 'arctic-frost', label: 'Arctic Frost', type: 'linear', angle: 135, from: '#e0f2fe', to: '#c7d2fe' },
    { id: 'cyber-neon', label: 'Cyber Neon', type: 'linear', angle: 135, from: '#06b6d4', to: '#9333ea' },
    { id: 'forest-sage', label: 'Forest Sage', type: 'linear', angle: 150, from: '#065f46', to: '#34d399' },
    { id: 'radial-spotlight', label: 'Blue Glow', type: 'radial', angle: 0, from: '#38bdf8', to: '#1e1b4b' },
    { id: 'radial-rose', label: 'Rose Aura', type: 'radial', angle: 0, from: '#fb7185', to: '#4c0519' },
];

const ELEMENT_SHAPES = [
    { kind: 'rect', label: 'Rectangle' },
    { kind: 'rounded-rect', label: 'Rounded Box' },
    { kind: 'pill', label: 'Pill Button' },
    { kind: 'circle', label: 'Circle' },
    { kind: 'triangle', label: 'Triangle' },
    { kind: 'star', label: '5-Point Star' },
    { kind: 'badge-burst', label: 'Promo Burst' },
    { kind: 'hexagon', label: 'Hexagon' },
    { kind: 'diamond', label: 'Diamond' },
    { kind: 'heart', label: 'Heart' },
    { kind: 'arrow', label: 'Arrow' },
    { kind: 'speech', label: 'Speech Bubble' },
    { kind: 'line', label: 'Divider Line' },
];

const FRAME_SHAPES = [
    { kind: 'none', label: 'Original' },
    { kind: 'circle', label: 'Circle Frame' },
    { kind: 'rounded', label: 'Rounded Card' },
    { kind: 'arch', label: 'Arch Window' },
    { kind: 'hexagon', label: 'Hexagon Mask' },
    { kind: 'star', label: 'Star Mask' },
    { kind: 'diamond', label: 'Diamond Mask' },
];

const SOLID_SWATCHES = [
    '#ffffff', '#f8fafc', '#0f172a', '#000000',
    '#1d4ed8', '#7c3aed', '#db2777', '#dc2626',
    '#ea580c', '#eab308', '#16a34a', '#0d9488',
];

export default function EditorLeftDrawer({
    activeTab,
    onTabChange,
    drawerOpen,
    onToggleDrawer,
    // Templates
    templateCategories = [],
    onApplyTemplate,
    // PNG Assets
    catalogCategories = [],
    catalogCollections = [],
    onInsertAsset,
    // Elements & Frames
    onAddElement,
    onApplyFrame,
    selectedIsImage = false,
    // Text
    fonts = [],
    onAddText,
    onAddTextPairing,
    // Uploads
    uploads = [],
    onUploadFiles,
    onInsertUpload,
    onRemoveBgUpload,
    removingUploadId = null,
    enableBgRemover = true,
    // Background
    bgMeta = { mode: 'transparent', color: '#ffffff', gradientType: 'linear', gradientAngle: 135, gradientFrom: '#1d4ed8', gradientTo: '#7c3aed' },
    onUpdateBackground,
    onUploadBgImage,
    extractedPalette = [],
    onExtractPalette,
    // Layers
    layers = [],
    activeLayerIds = [],
    onSelectLayer,
    onToggleLayerVisible,
    onToggleLayerLock,
    onMoveLayer,
    onDeleteLayer,
    onGroupSelected,
    onUngroupSelected,
    canGroup = false,
    canUngroup = false,
}) {
    // Templates state
    const [tplSearch, setTplSearch] = useState('');
    const [tplCat, setTplCat] = useState('');
    const [tplOrientation, setTplOrientation] = useState('all');
    const [tplFavOnly, setTplFavOnly] = useState(false);
    const [tplFiltersOpen, setTplFiltersOpen] = useState(false);
    const [favTemplateIds, setFavTemplateIds] = useState(() => {
        try {
            const raw = window.localStorage?.getItem(FAV_TEMPLATES_STORAGE_KEY);
            const parsed = raw ? JSON.parse(raw) : [];
            return Array.isArray(parsed) ? parsed.filter((id) => typeof id === 'string' || typeof id === 'number') : [];
        } catch {
            return [];
        }
    });
    const [openTplMenu, setOpenTplMenu] = useState(null); // { tpl, top, left }
    const lastFilterPosRef = useRef({ top: 120, left: 82, width: 288 });
    const [templates, setTemplates] = useState([]);
    const [tplLoading, setTplLoading] = useState(false);

    // Assets state
    const [assetType, setAssetType] = useState('png');
    const [assetSearch, setAssetSearch] = useState('');
    const [assetCat, setAssetCat] = useState('');
    const [assetCollection, setAssetCollection] = useState('');
    const [assetOrientation, setAssetOrientation] = useState('all');
    const [assetSort, setAssetSort] = useState('popular');
    const [assetFiltersOpen, setAssetFiltersOpen] = useState(false);
    const [assets, setAssets] = useState([]);
    const [assetsTotal, setAssetsTotal] = useState(0);
    const [assetsHasMore, setAssetsHasMore] = useState(false);
    const [assetsLoading, setAssetsLoading] = useState(false);

    // Google Fonts browser state (Text tab)
    const [gFontQuery, setGFontQuery] = useState('');
    const [gFontLimit, setGFontLimit] = useState(30);

    const filteredGoogleFonts = useMemo(() => {
        const q = gFontQuery.trim().toLowerCase();
        if (!q) return ALL_GOOGLE_FONTS;
        return ALL_GOOGLE_FONTS.filter((f) => f.family.toLowerCase().includes(q));
    }, [gFontQuery]);

    const visibleGoogleFonts = useMemo(
        () => filteredGoogleFonts.slice(0, gFontLimit),
        [filteredGoogleFonts, gFontLimit]
    );

    useEffect(() => {
        if (activeTab !== 'text') return;
        const fams = visibleGoogleFonts.map((f) => f.family);
        if (fams.length > 0) {
            loadGoogleFontsBatch(fams);
        }
    }, [activeTab, visibleGoogleFonts]);

    const uploadInputRef = useRef(null);
    const bgImageInputRef = useRef(null);
    const drawerScrollRef = useRef(null);
    const tplSearchWrapRef = useRef(null);
    const tplFilterPanelRef = useRef(null);
    const assetSearchWrapRef = useRef(null);
    const assetFilterPanelRef = useRef(null);
    const lastAssetFilterPosRef = useRef({ top: 150, left: 82, width: 288 });

    const activeAssetFilterCount =
        (assetCat ? 1 : 0) +
        (assetCollection ? 1 : 0) +
        (assetOrientation !== 'all' ? 1 : 0) +
        (assetSort !== 'popular' ? 1 : 0);

    // Spring-physics asset drag-and-drop state
    const [dragGhost, setDragGhost] = useState(null); // { asset, size, phase }
    const dragGhostElRef = useRef(null);
    const dragStateRef = useRef(null);
    const suppressAssetClickRef = useRef(false);
    const onInsertAssetRef = useRef(onInsertAsset);
    onInsertAssetRef.current = onInsertAsset;

    const favTemplateIdSet = useMemo(() => new Set(favTemplateIds), [favTemplateIds]);

    const toggleFavoriteTemplate = (tplId) => {
        if (!tplId) return;
        setFavTemplateIds((prev) => {
            const exists = prev.includes(tplId);
            const next = exists ? prev.filter((id) => id !== tplId) : [...prev, tplId];
            try {
                window.localStorage?.setItem(FAV_TEMPLATES_STORAGE_KEY, JSON.stringify(next));
            } catch {
                // ignore storage errors
            }
            return next;
        });
    };

    const activeTplFilterCount =
        (tplCat ? 1 : 0) + (tplOrientation !== 'all' ? 1 : 0) + (tplFavOnly ? 1 : 0);

    const filteredTemplates = useMemo(() => {
        return templates.filter((tpl) => {
            if (tplFavOnly && !favTemplateIdSet.has(tpl.id)) {
                return false;
            }
            if (tplOrientation !== 'all') {
                const w = Math.max(1, Number(tpl.width) || 1);
                const h = Math.max(1, Number(tpl.height) || 1);
                const isSquare = Math.abs(w - h) <= Math.max(w, h) * 0.12;
                if (tplOrientation === 'square' && !isSquare) return false;
                if (tplOrientation === 'landscape' && (isSquare || w <= h)) return false;
                if (tplOrientation === 'portrait' && (isSquare || h <= w)) return false;
            }
            return true;
        });
    }, [templates, tplFavOnly, tplOrientation, favTemplateIdSet]);

    useEffect(() => {
        if (!drawerOpen || activeTab !== 'templates') {
            setTplFiltersOpen(false);
            setOpenTplMenu(null);
        }
        if (!drawerOpen || activeTab !== 'assets') {
            setAssetFiltersOpen(false);
        }
    }, [drawerOpen, activeTab]);

    useEffect(() => {
        if (!tplFiltersOpen && !assetFiltersOpen) return undefined;
        const onPointerDown = (e) => {
            const target = e.target;
            if (target.closest?.('[data-testid="studio-select-listbox"], [role="listbox"]')) {
                return;
            }
            if (
                tplFiltersOpen &&
                !tplSearchWrapRef.current?.contains(target) &&
                !tplFilterPanelRef.current?.contains(target)
            ) {
                setTplFiltersOpen(false);
            }
            if (
                assetFiltersOpen &&
                !assetSearchWrapRef.current?.contains(target) &&
                !assetFilterPanelRef.current?.contains(target)
            ) {
                setAssetFiltersOpen(false);
            }
        };
        const onKeyDown = (e) => {
            if (e.key === 'Escape') {
                setTplFiltersOpen(false);
                setAssetFiltersOpen(false);
            }
        };
        const onScrollOrWheel = (e) => {
            const target = e.target;
            if (target.closest?.('[data-testid="studio-select-listbox"], [role="listbox"]')) {
                return;
            }
            if (tplFiltersOpen && !tplFilterPanelRef.current?.contains(target)) {
                setTplFiltersOpen(false);
            }
            if (assetFiltersOpen && !assetFilterPanelRef.current?.contains(target)) {
                setAssetFiltersOpen(false);
            }
        };
        document.addEventListener('pointerdown', onPointerDown, true);
        document.addEventListener('scroll', onScrollOrWheel, true);
        document.addEventListener('wheel', onScrollOrWheel, { capture: true, passive: true });
        document.addEventListener('keydown', onKeyDown);
        return () => {
            document.removeEventListener('pointerdown', onPointerDown, true);
            document.removeEventListener('scroll', onScrollOrWheel, true);
            document.removeEventListener('wheel', onScrollOrWheel, true);
            document.removeEventListener('keydown', onKeyDown);
        };
    }, [tplFiltersOpen, assetFiltersOpen]);

    // Spring-physics drag loop for Assets -> Canvas
    useEffect(() => {
        return () => {
            const st = dragStateRef.current;
            if (st?.rafId) cancelAnimationFrame(st.rafId);
            if (st?.cleanupListeners) st.cleanupListeners();
            const artboardEl = document.querySelector('[data-editor-artboard="true"]');
            artboardEl?.classList.remove('ring-2', 'ring-blue-500/80', 'shadow-[0_0_32px_rgba(59,130,246,0.28)]');
        };
    }, []);

    const startAssetPointerDown = (e, asset) => {
        if (e.button !== 0) return;
        if (e.target.closest?.('button')) return;
        const cardEl = e.currentTarget;
        const rect = cardEl.getBoundingClientRect();
        const prev = dragStateRef.current;
        if (prev?.rafId) cancelAnimationFrame(prev.rafId);
        if (prev?.cleanupListeners) prev.cleanupListeners();

        const startX = e.clientX;
        const startY = e.clientY;
        const size = Math.min(92, Math.max(72, Math.round(rect.width * 0.72)));

        const state = {
            asset,
            size,
            sourceX: rect.left + rect.width / 2,
            sourceY: rect.top + rect.height / 2,
            startX,
            startY,
            targetX: startX,
            targetY: startY,
            curX: startX,
            curY: startY,
            vx: 0,
            vy: 0,
            curAngle: 0,
            vAngle: 0,
            curScale: 0.96,
            vScale: 0,
            active: false,
            phase: 'idle', // 'idle' | 'dragging' | 'snapback' | 'dropping'
            overStage: false,
            rafId: 0,
            cleanupListeners: null,
        };
        dragStateRef.current = state;

        const updateArtboardHighlight = (clientX, clientY) => {
            const stageEl = document.querySelector('[data-editor-stage="true"]');
            const artboardEl = document.querySelector('[data-editor-artboard="true"]');
            let isOver = false;
            if (stageEl) {
                const sRect = stageEl.getBoundingClientRect();
                isOver =
                    clientX >= sRect.left &&
                    clientX <= sRect.right &&
                    clientY >= sRect.top &&
                    clientY <= sRect.bottom;
            }
            state.overStage = isOver;
            if (artboardEl) {
                artboardEl.classList.toggle('ring-2', isOver);
                artboardEl.classList.toggle('ring-blue-500/80', isOver);
                artboardEl.classList.toggle('shadow-[0_0_32px_rgba(59,130,246,0.28)]', isOver);
            }
        };

        const tickPhysics = () => {
            if (dragStateRef.current !== state) return;
            const stiffness = state.phase === 'snapback' ? 0.24 : 0.26;
            const damping = state.phase === 'snapback' ? 0.68 : 0.72;

            state.vx = (state.vx + (state.targetX - state.curX) * stiffness) * damping;
            state.vy = (state.vy + (state.targetY - state.curY) * stiffness) * damping;
            state.curX += state.vx;
            state.curY += state.vy;

            const speed = Math.hypot(state.vx, state.vy);
            const targetAngle =
                state.phase === 'dragging'
                    ? Math.max(-18, Math.min(18, state.vx * 0.75))
                    : 0;
            state.vAngle = (state.vAngle + (targetAngle - state.curAngle) * 0.22) * 0.7;
            state.curAngle += state.vAngle;

            const targetScale =
                state.phase === 'snapback'
                    ? 0.88
                    : state.phase === 'dropping'
                        ? 1.24
                        : Math.min(1.18, (state.overStage ? 1.12 : 1.06) + speed * 0.0025);
            state.vScale = (state.vScale + (targetScale - state.curScale) * 0.28) * 0.68;
            state.curScale += state.vScale;

            const el = dragGhostElRef.current;
            if (el) {
                const tx = state.curX - state.size / 2;
                const ty = state.curY - state.size / 2;
                el.style.transform = `translate3d(${tx.toFixed(1)}px, ${ty.toFixed(1)}px, 0) rotate(${state.curAngle.toFixed(2)}deg) scale(${state.curScale.toFixed(3)})`;
                if (state.phase === 'dropping') {
                    el.style.opacity = '0';
                }
            }

            if (state.phase === 'snapback') {
                const dist = Math.hypot(state.targetX - state.curX, state.targetY - state.curY);
                if (dist < 1.5 && speed < 0.8) {
                    setDragGhost(null);
                    dragStateRef.current = null;
                    return;
                }
            }

            if (state.phase === 'dropping') {
                return;
            }

            state.rafId = requestAnimationFrame(tickPhysics);
        };

        const finishDrag = (cancelled, clientX, clientY) => {
            if (state.cleanupListeners) state.cleanupListeners();
            const artboardEl = document.querySelector('[data-editor-artboard="true"]');
            artboardEl?.classList.remove('ring-2', 'ring-blue-500/80', 'shadow-[0_0_32px_rgba(59,130,246,0.28)]');

            if (!state.active) {
                dragStateRef.current = null;
                return;
            }

            suppressAssetClickRef.current = true;
            setTimeout(() => {
                suppressAssetClickRef.current = false;
            }, 140);

            const stageEl = document.querySelector('[data-editor-stage="true"]');
            const sRect = stageEl?.getBoundingClientRect();
            const droppedOnStage =
                !cancelled &&
                sRect &&
                clientX >= sRect.left &&
                clientX <= sRect.right &&
                clientY >= sRect.top &&
                clientY <= sRect.bottom;

            if (droppedOnStage) {
                const artRect = artboardEl?.getBoundingClientRect();
                const zoomVal = Math.max(0.05, Number(stageEl?.dataset?.zoom || 1));
                const dropCoords = artRect
                    ? {
                          x: (clientX - artRect.left) / zoomVal,
                          y: (clientY - artRect.top) / zoomVal,
                          fromDrag: true,
                          tilt: state.curAngle,
                      }
                    : { fromDrag: true, tilt: state.curAngle };

                onInsertAssetRef.current?.(state.asset, dropCoords);
                state.phase = 'dropping';
                setDragGhost((prevGhost) => (prevGhost ? { ...prevGhost, phase: 'dropping' } : null));
                setTimeout(() => {
                    if (dragStateRef.current === state) {
                        if (state.rafId) cancelAnimationFrame(state.rafId);
                        dragStateRef.current = null;
                    }
                    setDragGhost((prevGhost) => (prevGhost?.asset?.id === state.asset.id && prevGhost?.phase === 'dropping' ? null : prevGhost));
                }, 170);
                return;
            }

            // Spring snap-back to original grid card position
            state.phase = 'snapback';
            state.targetX = state.sourceX;
            state.targetY = state.sourceY;
            setDragGhost((prevGhost) => (prevGhost ? { ...prevGhost, phase: 'snapback' } : null));
            setTimeout(() => {
                if (dragStateRef.current === state) {
                    if (state.rafId) cancelAnimationFrame(state.rafId);
                    dragStateRef.current = null;
                    setDragGhost(null);
                }
            }, 450);
        };

        const onPointerMove = (ev) => {
            if (!state.active) {
                const moved = Math.hypot(ev.clientX - state.startX, ev.clientY - state.startY);
                if (moved < 6) return;
                state.active = true;
                state.phase = 'dragging';
                state.curX = state.sourceX;
                state.curY = state.sourceY;
                state.targetX = ev.clientX;
                state.targetY = ev.clientY;
                setDragGhost({ asset: state.asset, size: state.size, phase: 'dragging' });
                state.rafId = requestAnimationFrame(tickPhysics);
            }
            state.targetX = ev.clientX;
            state.targetY = ev.clientY;
            updateArtboardHighlight(ev.clientX, ev.clientY);
        };

        const onPointerUp = (ev) => finishDrag(false, ev.clientX, ev.clientY);
        const onKeyCancel = (ev) => {
            if (ev.key === 'Escape') finishDrag(true, 0, 0);
        };

        window.addEventListener('pointermove', onPointerMove);
        window.addEventListener('pointerup', onPointerUp);
        window.addEventListener('pointercancel', onPointerUp);
        window.addEventListener('keydown', onKeyCancel);
        state.cleanupListeners = () => {
            window.removeEventListener('pointermove', onPointerMove);
            window.removeEventListener('pointerup', onPointerUp);
            window.removeEventListener('pointercancel', onPointerUp);
            window.removeEventListener('keydown', onKeyCancel);
        };
    };

    // Fetch templates when tab active or filters change
    useEffect(() => {
        if (activeTab !== 'templates') return;
        let cancelled = false;
        const timer = setTimeout(async () => {
            setTplLoading(true);
            try {
                const params = new URLSearchParams();
                if (tplSearch.trim()) params.set('q', tplSearch.trim());
                if (tplCat) params.set('categoryId', tplCat);
                const res = await fetch(`/api/editor/templates?${params.toString()}`);
                const data = await res.json();
                if (!cancelled) setTemplates(data.templates || []);
            } catch {
                // ignore
            } finally {
                if (!cancelled) setTplLoading(false);
            }
        }, 180);
        return () => {
            cancelled = true;
            clearTimeout(timer);
        };
    }, [activeTab, tplSearch, tplCat]);

    // Fetch catalog assets when tab active or filters change
    const fetchAssets = async (offset = 0, append = false) => {
        setAssetsLoading(true);
        try {
            const params = new URLSearchParams({
                limit: '24',
                offset: String(offset),
                type: assetType,
                sort: assetSort,
                orientation: assetOrientation,
            });
            if (assetSearch.trim()) params.set('q', assetSearch.trim());
            if (assetCat) params.set('categoryId', assetCat);
            if (assetCollection) params.set('collectionId', assetCollection);
            const res = await fetch(`/api/editor/assets?${params.toString()}`);
            const data = await res.json();
            setAssets((prev) => (append ? [...prev, ...(data.assets || [])] : (data.assets || [])));
            setAssetsTotal(data.total || 0);
            setAssetsHasMore(Boolean(data.hasMore));
        } catch {
            // ignore
        } finally {
            setAssetsLoading(false);
        }
    };

    useEffect(() => {
        if (activeTab !== 'assets') return;
        const timer = setTimeout(() => {
            fetchAssets(0, false);
        }, 240);
        return () => clearTimeout(timer);
    }, [activeTab, assetSearch, assetCat, assetCollection, assetOrientation, assetSort, assetType]);

    const visibleTabs = TABS;
    const activeTabMeta = TABS.find((t) => t.id === activeTab);
    const ActiveTabIcon = activeTabMeta?.icon || LayoutTemplate;

    const [rendered, setRendered] = useState(drawerOpen);
    const [visible, setVisible] = useState(false);
    const [hoveredTooltip, setHoveredTooltip] = useState(null); // { label, left, top }
    const exitTimerRef = useRef(null);
    const {
        panelRef,
        offset: panelOffset,
        isDragging: isDraggingPanel,
        hasMoved: panelMoved,
        handleDragPointerDown,
        resetPosition: resetPanelPosition,
    } = useDraggablePanel(activeTab);

    useEffect(() => {
        if (exitTimerRef.current) {
            clearTimeout(exitTimerRef.current);
            exitTimerRef.current = null;
        }

        if (drawerOpen) {
            setRendered(true);
            let raf2 = 0;
            const raf1 = requestAnimationFrame(() => {
                raf2 = requestAnimationFrame(() => {
                    setVisible(true);
                });
            });
            return () => {
                cancelAnimationFrame(raf1);
                if (raf2) cancelAnimationFrame(raf2);
            };
        }

        setVisible(false);
        exitTimerRef.current = setTimeout(() => {
            setRendered(false);
        }, 295);

        return () => {
            if (exitTimerRef.current) clearTimeout(exitTimerRef.current);
        };
    }, [drawerOpen]);

    const showTabTooltip = (el, label) => {
        if (!el) return;
        const rect = el.getBoundingClientRect();
        setHoveredTooltip({
            label,
            left: Math.round(rect.right + 10),
            top: Math.round(rect.top + rect.height / 2),
        });
    };

    const stopEvent = (e) => e.stopPropagation();

    return (
        <aside className="relative flex shrink-0 bg-white dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800/90 z-30 select-none">
            {/* Compact Icon-Only Vertical Rail */}
            <div className="w-14 bg-slate-50 dark:bg-slate-950 py-2.5 flex flex-col items-center gap-1.5 overflow-y-auto">
                {visibleTabs.map((tab) => {
                    const Icon = tab.icon;
                    const active = drawerOpen && activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            type="button"
                            data-testid={`left-tool-${tab.id}`}
                            data-active={active ? 'true' : 'false'}
                            aria-label={tab.label}
                            onMouseEnter={(e) => showTabTooltip(e.currentTarget, tab.label)}
                            onMouseLeave={() => setHoveredTooltip(null)}
                            onFocus={(e) => showTabTooltip(e.currentTarget, tab.label)}
                            onBlur={() => setHoveredTooltip(null)}
                            onClick={() => {
                                setHoveredTooltip(null);
                                if (activeTab === tab.id && drawerOpen) {
                                    onToggleDrawer(false);
                                } else {
                                    onTabChange(tab.id);
                                    onToggleDrawer(true);
                                }
                            }}
                            className={`w-10 h-10 rounded-xl flex items-center justify-center cursor-pointer transition-all duration-150 shrink-0 ${
                                active
                                    ? 'bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600 text-white shadow-[0_4px_14px_rgba(37,99,235,0.4)] ring-1 ring-blue-400/40 scale-[1.03]'
                                    : 'text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-500/10 dark:hover:bg-blue-500/15 hover:scale-105 active:scale-95'
                            }`}
                        >
                            <Icon className="w-[18px] h-[18px]" />
                        </button>
                    );
                })}
            </div>

            {/* Custom Right-Side Tooltip Pill (matches Right Toolbar tooltips) */}
            {hoveredTooltip && (
                <div
                    role="tooltip"
                    data-testid="left-rail-tooltip"
                    style={{ left: `${hoveredTooltip.left}px`, top: `${hoveredTooltip.top}px` }}
                    className="fixed -translate-y-1/2 z-[75] pointer-events-none whitespace-nowrap flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-[11px] font-semibold shadow-xl border border-white/10 dark:border-slate-200"
                >
                    <span>{hoveredTooltip.label}</span>
                </div>
            )}

            {/* Animated Floating Side Panel (matches Layers Panel & Floating Toolbar animation) */}
            {rendered && (
                <div
                    ref={panelRef}
                    data-testid="left-floating-panel"
                    data-tab={activeTab}
                    data-visible={visible ? 'true' : 'false'}
                    data-moved={panelMoved ? 'true' : 'false'}
                    style={{
                        top: `${12 + panelOffset.y}px`,
                        left: `${68 + panelOffset.x}px`,
                    }}
                    onPointerDown={stopEvent}
                    onMouseDown={stopEvent}
                    onClick={stopEvent}
                    className={`absolute z-30 w-80 max-h-[calc(100%-68px)] rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-700/90 shadow-2xl flex flex-col overflow-hidden text-slate-800 dark:text-slate-100 select-none origin-top-left transition-[opacity,translate,scale,transform] duration-[280ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${
                        isDraggingPanel ? 'ring-2 ring-blue-500/40' : ''
                    } ${
                        visible
                            ? 'opacity-100 translate-x-0 translate-y-0 scale-100 pointer-events-auto'
                            : 'opacity-0 -translate-x-5 -translate-y-2 scale-75 pointer-events-none'
                    }`}
                >
                    <div
                        data-testid="left-floating-panel-drag-handle"
                        onPointerDown={handleDragPointerDown}
                        onDoubleClick={resetPanelPosition}
                        data-tooltip="Drag to move panel (double-click to reset)"
                        className={`px-3.5 py-2.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0 ${
                            isDraggingPanel ? 'cursor-grabbing' : 'cursor-grab'
                        }`}
                    >
                        <div className="flex items-center gap-1.5 pointer-events-none">
                            <GripVertical
                                className={`w-3.5 h-3.5 shrink-0 ${
                                    panelMoved ? 'text-blue-500 dark:text-blue-400' : 'text-slate-400'
                                }`}
                            />
                            <ActiveTabIcon className="w-4 h-4 text-blue-500 dark:text-blue-400" />
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                                {activeTabMeta?.label}
                            </span>
                        </div>
                        <button
                            type="button"
                            onClick={() => onToggleDrawer(false)}
                            aria-label="Close Panel"
                            data-tooltip="Close Panel"
                            data-testid="left-floating-panel-close"
                            className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                    </div>

                    <div ref={drawerScrollRef} className="flex-1 min-h-0 overflow-y-auto p-3.5 space-y-4">
                        {/* 1. TEMPLATES */}
                        {activeTab === 'templates' && (
                            <div className="space-y-3">
                                <div ref={tplSearchWrapRef} className="relative">
                                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                                    <input
                                        type="text"
                                        data-testid="templates-search-input"
                                        value={tplSearch}
                                        onChange={(e) => setTplSearch(e.target.value)}
                                        placeholder="Search templates..."
                                        className="w-full pl-8 pr-10 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-blue-500"
                                    />
                                    <button
                                        type="button"
                                        data-testid="templates-filter-button"
                                        aria-label="Filter templates"
                                        aria-expanded={tplFiltersOpen}
                                        onClick={() => {
                                            setOpenTplMenu(null);
                                            setTplFiltersOpen((o) => !o);
                                        }}
                                        data-tooltip="Filter templates"
                                        className={`absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-colors cursor-pointer ${
                                            tplFiltersOpen || activeTplFilterCount > 0
                                                ? 'bg-blue-600/15 text-blue-600 dark:text-blue-400 hover:bg-blue-600/25'
                                                : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/70 dark:hover:bg-slate-800'
                                        }`}
                                    >
                                        <SlidersHorizontal className="w-3.5 h-3.5" />
                                        {activeTplFilterCount > 0 && (
                                            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-blue-600 ring-2 ring-white dark:ring-slate-950" />
                                        )}
                                    </button>
                                </div>

                                {tplLoading ? (
                                    <div className="py-10 text-center text-xs text-slate-500 dark:text-slate-400">Loading templates...</div>
                                ) : filteredTemplates.length === 0 ? (
                                    <div className="py-10 text-center text-xs text-slate-500 dark:text-slate-400 space-y-2">
                                        <div>No matching templates found.</div>
                                        {activeTplFilterCount > 0 && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setTplCat('');
                                                    setTplOrientation('all');
                                                    setTplFavOnly(false);
                                                }}
                                                className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                                            >
                                                Reset filters
                                            </button>
                                        )}
                                    </div>
                                ) : (
                                    <div className="columns-2 gap-2.5 px-0.5 pt-0.5">
                                        {filteredTemplates.map((tpl) => {
                                            const ratioW = Math.max(1, Number(tpl.width) || 1);
                                            const ratioH = Math.max(1, Number(tpl.height) || 1);
                                            const clampedRatio = Math.max(0.45, Math.min(2.2, ratioW / ratioH));
                                            const isFav = favTemplateIdSet.has(tpl.id);
                                            const isMenuOpen = openTplMenu?.tpl?.id === tpl.id;
                                            return (
                                                <div
                                                    key={tpl.id}
                                                    data-testid={`template-card-${tpl.id}`}
                                                    style={{ aspectRatio: String(clampedRatio) }}
                                                    className="break-inside-avoid mb-2.5 group relative rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-500/70 overflow-hidden shadow-xs hover:shadow-md hover:scale-[1.02] transition-all duration-200"
                                                >
                                                    <button
                                                        type="button"
                                                        data-testid={`template-apply-${tpl.id}`}
                                                        onClick={() => onApplyTemplate(tpl)}
                                                        aria-label={`Use template ${tpl.title}`}
                                                        className="w-full h-full block cursor-pointer focus:outline-none"
                                                    >
                                                        {tpl.thumbnailPath ? (
                                                            <img
                                                                src={tpl.thumbnailPath}
                                                                alt={tpl.title}
                                                                loading="lazy"
                                                                className="w-full h-full object-cover"
                                                            />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center p-2 text-center text-[10px] font-medium text-slate-400">
                                                                {tpl.title}
                                                            </div>
                                                        )}
                                                    </button>

                                                    {/* Top-Left Favorite Star */}
                                                    <button
                                                        type="button"
                                                        data-testid={`template-fav-${tpl.id}`}
                                                        aria-label={isFav ? `Remove ${tpl.title} from favorites` : `Add ${tpl.title} to favorites`}
                                                        aria-pressed={isFav}
                                                        data-tooltip={isFav ? 'Remove from Favorites' : 'Add to Favorites'}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            toggleFavoriteTemplate(tpl.id);
                                                        }}
                                                        className={`absolute top-1.5 left-1.5 z-10 w-6 h-6 rounded-lg flex items-center justify-center backdrop-blur-md transition-all duration-200 ease-out cursor-pointer opacity-0 scale-90 -translate-y-0.5 pointer-events-none group-hover:opacity-100 group-hover:scale-100 group-hover:translate-y-0 group-hover:pointer-events-auto group-focus-within:opacity-100 group-focus-within:scale-100 group-focus-within:translate-y-0 group-focus-within:pointer-events-auto ${
                                                            isFav
                                                                ? 'bg-amber-500/95 text-white shadow-sm'
                                                                : 'bg-slate-900/55 hover:bg-slate-900/80 text-white/90'
                                                        }`}
                                                    >
                                                        <Star className={`w-3.5 h-3.5 ${isFav ? 'fill-current' : ''}`} />
                                                    </button>

                                                    {/* Top-Right 3-Dot Info Menu */}
                                                    <button
                                                        type="button"
                                                        data-template-more-btn="true"
                                                        data-testid={`template-more-${tpl.id}`}
                                                        aria-label={`Template details for ${tpl.title}`}
                                                        aria-expanded={isMenuOpen}
                                                        data-tooltip="Template info & keywords"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setTplFiltersOpen(false);
                                                            if (isMenuOpen) {
                                                                setOpenTplMenu(null);
                                                                return;
                                                            }
                                                            const rect = e.currentTarget.getBoundingClientRect();
                                                            setOpenTplMenu({
                                                                tpl,
                                                                top: rect.bottom + 6,
                                                                left: rect.left,
                                                            });
                                                        }}
                                                        className={`absolute top-1.5 right-1.5 z-10 w-6 h-6 rounded-lg flex items-center justify-center backdrop-blur-md transition-all duration-200 ease-out cursor-pointer ${
                                                            isMenuOpen
                                                                ? 'bg-blue-600 text-white shadow-sm opacity-100 scale-100 translate-y-0 pointer-events-auto'
                                                                : 'bg-slate-900/55 hover:bg-slate-900/80 text-white/90 opacity-0 scale-90 -translate-y-0.5 pointer-events-none group-hover:opacity-100 group-hover:scale-100 group-hover:translate-y-0 group-hover:pointer-events-auto group-focus-within:opacity-100 group-focus-within:scale-100 group-focus-within:translate-y-0 group-focus-within:pointer-events-auto'
                                                        }`}
                                                    >
                                                        <MoreVertical className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* 2. ASSETS (PNGs, SVGs, BACKGROUNDS & MORE) */}
                        {activeTab === 'assets' && (
                            <div className="space-y-3">
                                <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                                    {ASSET_TYPES.map((t) => {
                                        const isActive = assetType === t.id;
                                        return (
                                            <button
                                                key={t.id}
                                                type="button"
                                                data-testid={`assets-type-${t.id}`}
                                                onClick={() => {
                                                    if (assetType === t.id) return;
                                                    setAssetType(t.id);
                                                    setAssets([]);
                                                    setAssetsTotal(0);
                                                    setAssetsHasMore(false);
                                                }}
                                                className={`flex-1 py-1.5 px-2 rounded-lg text-[10px] font-bold transition-colors cursor-pointer truncate ${
                                                    isActive
                                                        ? 'bg-blue-600 text-white shadow-xs'
                                                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                                }`}
                                            >
                                                {t.label}
                                            </button>
                                        );
                                    })}
                                </div>

                                <div ref={assetSearchWrapRef} className="relative">
                                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                                    <input
                                        type="text"
                                        data-testid="assets-search-input"
                                        value={assetSearch}
                                        onChange={(e) => setAssetSearch(e.target.value)}
                                        placeholder={
                                            assetType === 'svg'
                                                ? 'Search SVG icons & vectors...'
                                                : assetType === 'backgrounds'
                                                    ? 'Search backgrounds & textures...'
                                                    : 'Search PNG assets (arrow, food, icon...)'
                                        }
                                        className="w-full pl-8 pr-10 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-blue-500"
                                    />
                                    <button
                                        type="button"
                                        data-testid="assets-filter-button"
                                        aria-label="Filter assets"
                                        aria-expanded={assetFiltersOpen}
                                        onClick={() => setAssetFiltersOpen((o) => !o)}
                                        data-tooltip="Filter assets"
                                        className={`absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-colors cursor-pointer ${
                                            assetFiltersOpen || activeAssetFilterCount > 0
                                                ? 'bg-blue-600/15 text-blue-600 dark:text-blue-400 hover:bg-blue-600/25'
                                                : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/70 dark:hover:bg-slate-800'
                                        }`}
                                    >
                                        <SlidersHorizontal className="w-3.5 h-3.5" />
                                        {activeAssetFilterCount > 0 && (
                                            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-blue-600 ring-2 ring-white dark:ring-slate-950" />
                                        )}
                                    </button>
                                </div>

                                <div className="text-[10px] text-slate-500 dark:text-slate-400 flex justify-between">
                                    <span>Click or drag onto canvas</span>
                                    <span>
                                        {assetsTotal}{' '}
                                        {assetType === 'svg' ? 'SVGs' : assetType === 'backgrounds' ? 'Backgrounds' : 'PNGs'}
                                    </span>
                                </div>

                                {assetsLoading && assets.length === 0 ? (
                                    <div className="py-10 text-center text-xs text-slate-500 dark:text-slate-400">
                                        Searching assets...
                                    </div>
                                ) : assets.length === 0 ? (
                                    <div className="py-10 text-center text-xs text-slate-500 dark:text-slate-400 px-2">
                                        {assetType === 'svg'
                                            ? 'No SVG icon assets in the catalog yet. Upload local SVGs in the Uploads tab.'
                                            : assetType === 'backgrounds'
                                                ? 'No background assets matched yet. Use the Background tab for solids, gradients & photos.'
                                                : 'No PNG assets matched. Try another keyword.'}
                                    </div>
                                ) : (
                                    <>
                                        <div className="grid grid-cols-2 gap-2">
                                            {assets.map((asset) => (
                                                <div
                                                    key={asset.id}
                                                    data-testid={`asset-card-${asset.id}`}
                                                    onPointerDown={(e) => startAssetPointerDown(e, asset)}
                                                    onDragStart={(e) => e.preventDefault()}
                                                    onClick={() => {
                                                        if (suppressAssetClickRef.current) return;
                                                        onInsertAsset(asset);
                                                    }}
                                                    className="group relative aspect-square rounded-xl bg-[conic-gradient(#e2e8f0_90deg,#ffffff_90deg_180deg,#e2e8f0_180deg_270deg,#ffffff_270deg)] dark:bg-[conic-gradient(#1e293b_90deg,#0f172a_90deg_180deg,#1e293b_180deg_270deg,#0f172a_270deg)] [background-size:14px_14px] border border-slate-200 dark:border-slate-800 hover:border-blue-500/70 p-2.5 flex items-center justify-center overflow-hidden cursor-grab active:cursor-grabbing shadow-xs hover:shadow-md transition-all touch-pan-y"
                                                    data-tooltip={`Click or drag "${asset.name}"`}
                                                >
                                                    <img
                                                        src={asset.thumbUrl || asset.url}
                                                        alt={asset.name}
                                                        loading="lazy"
                                                        draggable={false}
                                                        className="max-w-full max-h-full object-contain group-hover:scale-105 transition-transform duration-200 pointer-events-none"
                                                    />
                                                    <button
                                                        type="button"
                                                        data-testid={`asset-add-${asset.id}`}
                                                        aria-label={`Add ${asset.name} to canvas`}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            onInsertAsset(asset);
                                                        }}
                                                        className="opacity-0 scale-90 group-hover:opacity-100 group-hover:scale-100 group-focus-within:opacity-100 group-focus-within:scale-100 transition-all duration-200 ease-out absolute bottom-1.5 right-1.5 w-7 h-7 rounded-lg bg-blue-600 hover:bg-blue-500 text-white shadow-md flex items-center justify-center cursor-pointer"
                                                    >
                                                        <Plus className="w-4 h-4 stroke-[2.5]" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                        {assetsHasMore && (
                                            <button
                                                type="button"
                                                disabled={assetsLoading}
                                                onClick={() => fetchAssets(assets.length, true)}
                                                className="w-full py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 cursor-pointer"
                                            >
                                                {assetsLoading ? 'Loading...' : 'Load More Assets'}
                                            </button>
                                        )}
                                    </>
                                )}
                            </div>
                        )}

                        {/* 3. ELEMENTS & PHOTO FRAMES */}
                        {activeTab === 'elements' && (
                            <div className="space-y-5">
                                <div>
                                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                                        Shapes &amp; Badges
                                    </div>
                                    <div className="grid grid-cols-3 gap-2">
                                        {ELEMENT_SHAPES.map((item) => (
                                            <button
                                                key={item.kind}
                                                type="button"
                                                onClick={() => onAddElement(item.kind)}
                                                className="p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-950 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 hover:border-blue-500/50 text-center cursor-pointer transition-all"
                                            >
                                                <div className="text-[11px] font-semibold text-slate-700 dark:text-slate-200">{item.label}</div>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="pt-3 border-t border-slate-200 dark:border-slate-800">
                                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                                        Image Clip Frames
                                    </div>
                                    <p className="text-[10px] text-slate-500 mb-2">
                                        {selectedIsImage
                                            ? 'Click any frame to mask the selected PNG / photo.'
                                            : 'Select an image layer on the canvas first to apply a frame mask.'}
                                    </p>
                                    <div className="grid grid-cols-2 gap-2">
                                        {FRAME_SHAPES.map((fr) => (
                                            <button
                                                key={fr.kind}
                                                type="button"
                                                onClick={() => onApplyFrame(fr.kind)}
                                                className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-950 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 hover:border-violet-500/50 text-[11px] font-semibold text-slate-700 dark:text-slate-200 cursor-pointer"
                                            >
                                                {fr.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* 4. TEXT */}
                        {activeTab === 'text' && (
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <button
                                        type="button"
                                        onClick={() => onAddText({ text: 'Add a Heading', fontSize: 88, fontWeight: '800', layerName: 'Heading' })}
                                        className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-base text-left cursor-pointer shadow-md shadow-blue-600/20"
                                    >
                                        + Add a heading
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => onAddText({ text: 'Add a subheading', fontSize: 52, fontWeight: '700', layerName: 'Subheading' })}
                                        className="w-full py-2.5 px-4 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-950 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 font-bold text-sm text-left cursor-pointer"
                                    >
                                        + Add a subheading
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => onAddText({ text: 'Add body copy text here', fontSize: 32, fontWeight: '400', layerName: 'Body Text' })}
                                        className="w-full py-2 px-4 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-950 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 text-xs text-left cursor-pointer"
                                    >
                                        + Add body text
                                    </button>
                                </div>

                                <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-2">
                                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                        Font Combinations
                                    </div>
                                    <div className="grid grid-cols-1 gap-2">
                                        {TEXT_PAIRINGS.map((pair) => (
                                            <button
                                                key={pair.id}
                                                type="button"
                                                onClick={() => onAddTextPairing(pair)}
                                                style={{ background: pair.previewBg }}
                                                className="p-3.5 rounded-xl text-left text-white border border-black/10 dark:border-white/15 hover:scale-[1.01] transition-transform cursor-pointer"
                                            >
                                                <div className="text-sm font-extrabold tracking-tight">{pair.label}</div>
                                                <div className="text-[10px] opacity-85">{pair.sub}</div>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {fonts.length > 0 && (
                                    <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                                        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                                            Brand Fonts ({fonts.length})
                                        </div>
                                        <div className="flex flex-wrap gap-1.5">
                                            {fonts.map((f) => (
                                                <button
                                                    key={f.id}
                                                    type="button"
                                                    onClick={() => onAddText({ text: f.family, fontFamily: f.family, fontSize: 64, layerName: f.family })}
                                                    style={{ fontFamily: `'${f.family}', sans-serif` }}
                                                    className="px-2.5 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 dark:bg-slate-950 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-200 cursor-pointer"
                                                >
                                                    {f.family}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                            Google Fonts ({ALL_GOOGLE_FONTS.length.toLocaleString()})
                                        </span>
                                        <span className="text-[10px] text-slate-400">Click to add</span>
                                    </div>
                                    <div className="relative">
                                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                        <input
                                            type="text"
                                            value={gFontQuery}
                                            onChange={(e) => {
                                                setGFontQuery(e.target.value);
                                                setGFontLimit(30);
                                            }}
                                            placeholder="Search all Google Fonts..."
                                            className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-blue-500"
                                        />
                                    </div>
                                    <div className="grid grid-cols-1 gap-1.5 max-h-60 overflow-y-auto pr-0.5">
                                        {visibleGoogleFonts.map((gf) => (
                                            <button
                                                key={gf.family}
                                                type="button"
                                                onClick={() => onAddText({ text: gf.family, fontFamily: gf.family, fontSize: 64, layerName: gf.family })}
                                                className="px-3 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-950 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-left cursor-pointer"
                                            >
                                                <span
                                                    className="text-sm text-slate-800 dark:text-slate-100 truncate pr-2"
                                                    style={{ fontFamily: `'${gf.family}', sans-serif` }}
                                                >
                                                    {gf.family}
                                                </span>
                                                <span className="text-[9px] font-sans uppercase text-slate-400 shrink-0">
                                                    {gf.category}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                    {gFontLimit < filteredGoogleFonts.length && (
                                        <button
                                            type="button"
                                            onClick={() => setGFontLimit((n) => n + 30)}
                                            className="w-full py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-[11px] font-bold text-slate-700 dark:text-slate-200 cursor-pointer"
                                        >
                                            Load More Fonts ({filteredGoogleFonts.length - gFontLimit} more)
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* 5. UPLOADS */}
                        {activeTab === 'uploads' && (
                            <div className="space-y-4">
                                <input
                                    ref={uploadInputRef}
                                    type="file"
                                    multiple
                                    accept="image/png,image/jpeg,image/webp,image/svg+xml"
                                    className="hidden"
                                    onChange={(e) => {
                                        if (e.target.files?.length) onUploadFiles(e.target.files);
                                        e.target.value = '';
                                    }}
                                />
                                <button
                                    type="button"
                                    onClick={() => uploadInputRef.current?.click()}
                                    className="w-full py-3.5 px-4 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-500 bg-slate-50 dark:bg-slate-950/70 hover:bg-blue-500/5 text-center cursor-pointer transition-colors space-y-1"
                                >
                                    <Upload className="w-5 h-5 text-blue-500 dark:text-blue-400 mx-auto" />
                                    <div className="text-xs font-bold text-slate-900 dark:text-white">Upload Images</div>
                                    <div className="text-[10px] text-slate-500 dark:text-slate-400">PNG, JPG, WebP, or SVG</div>
                                </button>

                                {uploads.length === 0 ? (
                                    <div className="py-8 text-center text-xs text-slate-500">
                                        Uploaded local files stay in your browser and appear here.
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-2 gap-2">
                                        {uploads.map((item) => (
                                            <div key={item.id} className="rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 overflow-hidden">
                                                <button
                                                    type="button"
                                                    onClick={() => onInsertUpload(item)}
                                                    className="w-full aspect-square bg-[conic-gradient(#e2e8f0_90deg,#ffffff_90deg_180deg,#e2e8f0_180deg_270deg,#ffffff_270deg)] dark:bg-[conic-gradient(#1e293b_90deg,#0f172a_90deg_180deg,#1e293b_180deg_270deg,#0f172a_270deg)] [background-size:14px_14px] p-2 flex items-center justify-center cursor-pointer"
                                                >
                                                    <img src={item.url} alt={item.name} className="max-w-full max-h-full object-contain" />
                                                </button>
                                                <div className="p-1.5 flex items-center justify-between gap-1">
                                                    <span className="text-[10px] text-slate-700 dark:text-slate-300 truncate">{item.name}</span>
                                                    {enableBgRemover && (
                                                        <button
                                                            type="button"
                                                            disabled={removingUploadId === item.id}
                                                            onClick={() => onRemoveBgUpload(item)}
                                                            data-tooltip="AI Remove Background"
                                                            aria-label="AI Remove Background"
                                                            className="p-1 rounded bg-indigo-500/15 hover:bg-indigo-500/30 text-indigo-600 dark:bg-indigo-500/20 dark:hover:bg-indigo-500/35 dark:text-indigo-300 cursor-pointer shrink-0 disabled:opacity-50"
                                                        >
                                                            <Wand2 className="w-3 h-3" />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* 6. BACKGROUND */}
                        {activeTab === 'background' && (
                            <div className="space-y-4">
                                <div className="grid grid-cols-3 gap-1.5">
                                    {[
                                        { id: 'transparent', label: 'Transparent' },
                                        { id: 'solid', label: 'Solid Color' },
                                        { id: 'gradient', label: 'Gradient' },
                                    ].map((mode) => (
                                        <button
                                            key={mode.id}
                                            type="button"
                                            onClick={() => onUpdateBackground({ ...bgMeta, mode: mode.id })}
                                            className={`py-2 rounded-xl text-[11px] font-bold border cursor-pointer ${
                                                bgMeta.mode === mode.id
                                                    ? 'bg-blue-600 text-white border-blue-500'
                                                    : 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-950 dark:text-slate-300 dark:border-slate-800'
                                            }`}
                                        >
                                            {mode.label}
                                        </button>
                                    ))}
                                </div>

                                {bgMeta.mode === 'solid' && (
                                    <div className="space-y-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-semibold">Custom Solid Color</span>
                                            <StudioColorPicker
                                                value={bgMeta.color || '#ffffff'}
                                                onChange={(hex) => onUpdateBackground({ ...bgMeta, mode: 'solid', color: hex })}
                                                showHexLabel
                                                customTooltip
                                            />
                                        </div>
                                        <div className="grid grid-cols-6 gap-1.5">
                                            {SOLID_SWATCHES.map((hex) => (
                                                <button
                                                    key={hex}
                                                    type="button"
                                                    onClick={() => onUpdateBackground({ ...bgMeta, mode: 'solid', color: hex })}
                                                    style={{ backgroundColor: hex }}
                                                    className="w-7 h-7 mx-auto rounded-full border border-black/15 dark:border-white/20 cursor-pointer transition-transform hover:scale-110"
                                                />
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {bgMeta.mode === 'gradient' && (
                                    <div className="space-y-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                                        <div>
                                            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                                                Gradient Presets
                                            </div>
                                            <div className="grid grid-cols-4 gap-1.5" data-testid="gradient-presets-grid">
                                                {GRADIENT_PRESETS.map((preset) => {
                                                    const isActive =
                                                        (bgMeta.gradientType || 'linear') === preset.type &&
                                                        (bgMeta.gradientFrom || '').toLowerCase() === preset.from.toLowerCase() &&
                                                        (bgMeta.gradientTo || '').toLowerCase() === preset.to.toLowerCase();
                                                    const bgStyle =
                                                        preset.type === 'radial'
                                                            ? `radial-gradient(circle, ${preset.from}, ${preset.to})`
                                                            : `linear-gradient(${preset.angle}deg, ${preset.from}, ${preset.to})`;
                                                    return (
                                                        <button
                                                            key={preset.id}
                                                            type="button"
                                                            data-tooltip={preset.label}
                                                            aria-label={preset.label}
                                                            data-testid={`gradient-preset-${preset.id}`}
                                                            onClick={() =>
                                                                onUpdateBackground({
                                                                    ...bgMeta,
                                                                    mode: 'gradient',
                                                                    gradientType: preset.type,
                                                                    gradientAngle: preset.angle,
                                                                    gradientFrom: preset.from,
                                                                    gradientTo: preset.to,
                                                                })
                                                            }
                                                            style={{ background: bgStyle }}
                                                            className={`h-8 rounded-lg border transition-transform hover:scale-105 cursor-pointer ${
                                                                isActive
                                                                    ? 'border-blue-500 ring-2 ring-blue-500/40'
                                                                    : 'border-slate-200 dark:border-slate-700'
                                                            }`}
                                                        />
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-2">
                                            <button
                                                type="button"
                                                onClick={() => onUpdateBackground({ ...bgMeta, mode: 'gradient', gradientType: 'linear' })}
                                                className={`py-1.5 rounded-lg text-[11px] font-bold border cursor-pointer ${bgMeta.gradientType !== 'radial' ? 'bg-blue-600/15 border-blue-500 text-blue-600 dark:bg-blue-600/25 dark:text-blue-300' : 'border-slate-200 dark:border-slate-800'}`}
                                            >
                                                Linear
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => onUpdateBackground({ ...bgMeta, mode: 'gradient', gradientType: 'radial' })}
                                                className={`py-1.5 rounded-lg text-[11px] font-bold border cursor-pointer ${bgMeta.gradientType === 'radial' ? 'bg-blue-600/15 border-blue-500 text-blue-600 dark:bg-blue-600/25 dark:text-blue-300' : 'border-slate-200 dark:border-slate-800'}`}
                                            >
                                                Radial
                                            </button>
                                        </div>

                                        <div className="flex items-center justify-between gap-2">
                                            <div className="flex items-center gap-1.5">
                                                <StudioColorPicker
                                                    value={bgMeta.gradientFrom || '#1d4ed8'}
                                                    onChange={(hex) => onUpdateBackground({ ...bgMeta, mode: 'gradient', gradientFrom: hex })}
                                                    size="sm"
                                                    title="Start gradient color"
                                                    customTooltip
                                                />
                                                <span className="text-[11px]">Start</span>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <StudioColorPicker
                                                    value={bgMeta.gradientTo || '#7c3aed'}
                                                    onChange={(hex) => onUpdateBackground({ ...bgMeta, mode: 'gradient', gradientTo: hex })}
                                                    size="sm"
                                                    title="End gradient color"
                                                    customTooltip
                                                />
                                                <span className="text-[11px]">End</span>
                                            </div>
                                        </div>

                                        {bgMeta.gradientType !== 'radial' && (
                                            <div>
                                                <div className="flex justify-between text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                                                    <span>Angle</span>
                                                    <span className="font-mono">{bgMeta.gradientAngle ?? 135}°</span>
                                                </div>
                                                <input
                                                    type="range"
                                                    min={0}
                                                    max={360}
                                                    value={bgMeta.gradientAngle ?? 135}
                                                    onChange={(e) => onUpdateBackground({ ...bgMeta, mode: 'gradient', gradientAngle: Number(e.target.value) })}
                                                    className="w-full accent-blue-500"
                                                />
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Document Color Palette */}
                                <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                            Document Colors
                                        </span>
                                        <button
                                            type="button"
                                            onClick={onExtractPalette}
                                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                                        >
                                            <Sparkles className="w-3 h-3" />
                                            <span>Extract from Design</span>
                                        </button>
                                    </div>
                                    {extractedPalette.length > 0 && (
                                        <div className="grid grid-cols-6 gap-1.5">
                                            {extractedPalette.map((hex, idx) => (
                                                <button
                                                    key={idx}
                                                    type="button"
                                                    onClick={() => onUpdateBackground({ ...bgMeta, mode: 'solid', color: hex })}
                                                    style={{ backgroundColor: hex }}
                                                    data-tooltip={`Apply ${typeof hex === 'string' ? hex : ''} as background`}
                                                    aria-label={`Apply ${typeof hex === 'string' ? hex : ''} as background`}
                                                    className="w-7 h-7 mx-auto rounded-full border border-black/15 dark:border-white/20 cursor-pointer transition-transform hover:scale-110"
                                                />
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                                    <input
                                        ref={bgImageInputRef}
                                        type="file"
                                        accept="image/png,image/jpeg,image/webp"
                                        className="hidden"
                                        onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) onUploadBgImage(file);
                                            e.target.value = '';
                                        }}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => bgImageInputRef.current?.click()}
                                        className="w-full py-2 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-950 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-200 cursor-pointer"
                                    >
                                        Set Custom Background Image
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Portal: Assets Filter Popover */}
            {typeof document !== 'undefined' &&
                createPortal(
                    (() => {
                        if (assetFiltersOpen && assetSearchWrapRef.current) {
                            const rect = assetSearchWrapRef.current.getBoundingClientRect();
                            const panelW = Math.min(288, window.innerWidth - 20);
                            lastAssetFilterPosRef.current = {
                                width: panelW,
                                left: Math.max(10, Math.min(window.innerWidth - panelW - 10, rect.left)),
                                top: Math.max(10, Math.min(window.innerHeight - 330, rect.bottom + 8)),
                            };
                        }
                        const { top, left, width } = lastAssetFilterPosRef.current;
                        return (
                            <AnimatedPopover
                                ref={assetFilterPanelRef}
                                open={assetFiltersOpen}
                                originClass="origin-top-right"
                                data-testid="assets-filter-panel"
                                onPointerDown={stopEvent}
                                style={{ top: `${top}px`, left: `${left}px`, width: `${width}px` }}
                                className="fixed z-[115] rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xl p-3.5 text-xs text-slate-800 dark:text-slate-100 space-y-3 select-none"
                            >
                                <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                        Filter Assets
                                    </span>
                                    {activeAssetFilterCount > 0 && (
                                        <button
                                            type="button"
                                            data-testid="assets-filter-reset"
                                            onClick={() => {
                                                setAssetCat('');
                                                setAssetCollection('');
                                                setAssetOrientation('all');
                                                setAssetSort('popular');
                                            }}
                                            className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                                        >
                                            Reset
                                        </button>
                                    )}
                                </div>

                                <div className="space-y-1.5">
                                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                                        Category
                                    </div>
                                    <StudioSelect
                                        size="sm"
                                        aria-label="Filter by category"
                                        testId="assets-filter-category"
                                        value={assetCat}
                                        onChange={(e) => setAssetCat(e.target.value)}
                                        className="w-full"
                                    >
                                        <option value="">All Categories</option>
                                        {catalogCategories.map((c) => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                    </StudioSelect>
                                </div>

                                <div className="space-y-1.5">
                                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                                        Collection
                                    </div>
                                    <StudioSelect
                                        size="sm"
                                        aria-label="Filter by collection"
                                        testId="assets-filter-collection"
                                        value={assetCollection}
                                        onChange={(e) => setAssetCollection(e.target.value)}
                                        className="w-full"
                                    >
                                        <option value="">All Collections</option>
                                        {catalogCollections.map((c) => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                    </StudioSelect>
                                </div>

                                <div className="space-y-1.5">
                                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                                        Shape
                                    </div>
                                    <div className="grid grid-cols-4 gap-1">
                                        {[
                                            { id: 'all', label: 'Any' },
                                            { id: 'square', label: 'Square' },
                                            { id: 'landscape', label: 'Wide' },
                                            { id: 'portrait', label: 'Tall' },
                                        ].map((opt) => (
                                            <button
                                                key={opt.id}
                                                type="button"
                                                data-testid={`assets-filter-format-${opt.id}`}
                                                onClick={() => setAssetOrientation(opt.id)}
                                                className={`py-1 rounded-lg text-[10px] font-bold cursor-pointer transition-colors ${
                                                    assetOrientation === opt.id
                                                        ? 'bg-blue-600 text-white'
                                                        : 'bg-slate-100 dark:bg-slate-950 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'
                                                }`}
                                            >
                                                {opt.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                                        Sort By
                                    </div>
                                    <div className="grid grid-cols-2 gap-1.5">
                                        {[
                                            { id: 'popular', label: 'Popular' },
                                            { id: 'latest', label: 'Latest' },
                                        ].map((opt) => (
                                            <button
                                                key={opt.id}
                                                type="button"
                                                data-testid={`assets-filter-sort-${opt.id}`}
                                                onClick={() => setAssetSort(opt.id)}
                                                className={`py-1 rounded-lg text-[10px] font-bold cursor-pointer transition-colors ${
                                                    assetSort === opt.id
                                                        ? 'bg-blue-600 text-white'
                                                        : 'bg-slate-100 dark:bg-slate-950 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'
                                                }`}
                                            >
                                                {opt.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </AnimatedPopover>
                        );
                    })(),
                    document.body
                )}

            {/* Portal: Templates Filter Popover */}
            {typeof document !== 'undefined' &&
                createPortal(
                    (() => {
                        if (tplFiltersOpen && tplSearchWrapRef.current) {
                            const rect = tplSearchWrapRef.current.getBoundingClientRect();
                            const panelW = Math.min(288, window.innerWidth - 20);
                            lastFilterPosRef.current = {
                                width: panelW,
                                left: Math.max(10, Math.min(window.innerWidth - panelW - 10, rect.left)),
                                top: Math.max(10, Math.min(window.innerHeight - 310, rect.bottom + 8)),
                            };
                        }
                        const { top, left, width } = lastFilterPosRef.current;
                        return (
                            <AnimatedPopover
                                ref={tplFilterPanelRef}
                                open={tplFiltersOpen}
                                originClass="origin-top-right"
                                data-testid="templates-filter-panel"
                                onPointerDown={stopEvent}
                                style={{ top: `${top}px`, left: `${left}px`, width: `${width}px` }}
                                className="fixed z-[115] rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xl p-3.5 text-xs text-slate-800 dark:text-slate-100 space-y-3 select-none"
                            >
                                <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                        Filter Templates
                                    </span>
                                    {activeTplFilterCount > 0 && (
                                        <button
                                            type="button"
                                            data-testid="templates-filter-reset"
                                            onClick={() => {
                                                setTplCat('');
                                                setTplOrientation('all');
                                                setTplFavOnly(false);
                                            }}
                                            className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                                        >
                                            Reset
                                        </button>
                                    )}
                                </div>

                                <div>
                                    <button
                                        type="button"
                                        data-testid="templates-filter-favorites"
                                        aria-pressed={tplFavOnly}
                                        onClick={() => setTplFavOnly((v) => !v)}
                                        className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl border text-[11px] font-semibold cursor-pointer transition-colors ${
                                            tplFavOnly
                                                ? 'bg-amber-500/15 border-amber-500/60 text-amber-700 dark:text-amber-300'
                                                : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:border-slate-300 dark:hover:border-slate-700'
                                        }`}
                                    >
                                        <span className="inline-flex items-center gap-1.5">
                                            <Star className={`w-3.5 h-3.5 ${tplFavOnly ? 'fill-amber-400 text-amber-400' : 'text-amber-500'}`} />
                                            <span>Favorites Only</span>
                                        </span>
                                        <span className="font-mono text-[10px] opacity-80">{favTemplateIds.length}</span>
                                    </button>
                                </div>

                                <div className="space-y-1.5">
                                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                                        Category
                                    </div>
                                    <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pr-0.5">
                                        <button
                                            type="button"
                                            data-testid="templates-filter-cat-all"
                                            onClick={() => setTplCat('')}
                                            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold cursor-pointer transition-colors ${
                                                !tplCat
                                                    ? 'bg-blue-600 text-white'
                                                    : 'bg-slate-100 dark:bg-slate-950 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'
                                            }`}
                                        >
                                            All
                                        </button>
                                        {templateCategories.map((c) => (
                                            <button
                                                key={c.id}
                                                type="button"
                                                data-testid={`templates-filter-cat-${c.id}`}
                                                onClick={() => setTplCat(c.id)}
                                                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold cursor-pointer transition-colors ${
                                                    tplCat === c.id
                                                        ? 'bg-blue-600 text-white'
                                                        : 'bg-slate-100 dark:bg-slate-950 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'
                                                }`}
                                            >
                                                {c.name}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                                        Format
                                    </div>
                                    <div className="grid grid-cols-4 gap-1">
                                        {[
                                            { id: 'all', label: 'All' },
                                            { id: 'square', label: 'Square' },
                                            { id: 'landscape', label: 'Wide' },
                                            { id: 'portrait', label: 'Tall' },
                                        ].map((opt) => (
                                            <button
                                                key={opt.id}
                                                type="button"
                                                data-testid={`templates-filter-format-${opt.id}`}
                                                onClick={() => setTplOrientation(opt.id)}
                                                className={`py-1 rounded-lg text-[10px] font-bold cursor-pointer transition-colors ${
                                                    tplOrientation === opt.id
                                                        ? 'bg-blue-600 text-white'
                                                        : 'bg-slate-100 dark:bg-slate-950 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'
                                                }`}
                                            >
                                                {opt.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </AnimatedPopover>
                        );
                    })(),
                    document.body
                )}

            {/* Portal: Template 3-Dot Details & Keywords Popover */}
            <TemplateInfoPopover
                openMenu={openTplMenu}
                onClose={() => setOpenTplMenu(null)}
                testId="template-info-popover"
            />

            {/* Portal: Spring-Physics Floating Asset Drag Ghost */}
            {dragGhost?.asset &&
                typeof document !== 'undefined' &&
                createPortal(
                    <div
                        ref={dragGhostElRef}
                        data-testid="asset-drag-physics-ghost"
                        style={{
                            width: `${dragGhost.size}px`,
                            height: `${dragGhost.size}px`,
                            top: 0,
                            left: 0,
                            transform: `translate3d(${(dragStateRef.current?.curX || 0) - dragGhost.size / 2}px, ${(dragStateRef.current?.curY || 0) - dragGhost.size / 2}px, 0) scale(1.06)`,
                        }}
                        className="fixed z-[130] pointer-events-none rounded-2xl bg-white/95 dark:bg-slate-900/95 border-2 border-blue-500/80 shadow-[0_20px_45px_rgba(37,99,235,0.35)] p-2.5 flex items-center justify-center transition-opacity duration-150 will-change-transform"
                    >
                        <img
                            src={dragGhost.asset.thumbUrl || dragGhost.asset.url}
                            alt=""
                            draggable={false}
                            className="max-w-full max-h-full object-contain drop-shadow-md"
                        />
                    </div>,
                    document.body
                )}
        </aside>
    );
}
