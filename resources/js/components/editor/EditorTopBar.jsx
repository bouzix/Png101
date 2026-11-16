import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Link, usePage } from '@inertiajs/react';
import {
    Undo2,
    Redo2,
    Download,
    Maximize2,
    Lock,
    Unlock,
    FilePlus2,
    Save,
    ChevronDown,
    FileJson,
    Upload,
    Cloud,
    CloudUpload,
    CloudAlert,
    Grid3X3,
    SquareDashed,
    Layers,
    Check,
    SlidersHorizontal,
    Magnet,
    Frame,
    Boxes,
    Crosshair,
    Clock,
    X,
    GripHorizontal,
    Home,
    Pencil,
    Loader2,
    ArrowLeft,
    Eye,
} from 'lucide-react';
import ThemeToggle from '../ThemeToggle';
import StudioSelect from '../ui/StudioSelect';
import { OUTSIDE_CANVAS_MODES } from './editorHelpers';
import { AnimatedPopover, useAnimatedPresence } from './useAnimatedPresence';
import { usePopoverDrag } from './useDraggablePanel';

const AUTOSAVE_OPTIONS = [
    { value: '10', label: 'Every 10 sec' },
    { value: '30', label: 'Every 30 sec (Default)' },
    { value: '60', label: 'Every 1 min' },
    { value: '120', label: 'Every 2 min' },
    { value: '300', label: 'Every 5 min' },
    { value: '0', label: 'Off (Manual)' },
];

const SAVE_STATUS_CONFIG = {
    idle: {
        text: '',
        title: 'Project draft synced (click to save now)',
        textClass: 'text-slate-600 dark:text-slate-300',
    },
    saving: {
        text: 'Saving...',
        title: 'Saving project changes...',
        textClass: 'text-blue-600 dark:text-blue-300',
    },
    saved: {
        text: 'Saved',
        title: 'All changes saved (click to save now)',
        textClass: 'text-emerald-600 dark:text-emerald-300',
    },
    error: {
        text: 'Failed to save',
        title: 'Failed to save draft (click to retry)',
        textClass: 'text-rose-600 dark:text-rose-400',
    },
};

export default function EditorTopBar({
    isProjectOpen = true,
    onGoHome,
    projectTitle,
    onTitleChange,
    canvasWidth,
    canvasHeight,
    onResizeCanvas,
    presets = [],
    maxWidth = 4096,
    maxHeight = 4096,
    canUndo,
    canRedo,
    onUndo,
    onRedo,
    onNewBlank,
    onImportProjectJson,
    saveState = 'idle',
    showSaveText = false,
    hasUnsavedChanges = false,
    autosaveIntervalSec = 30,
    onChangeAutosaveInterval,
    onManualSave,
    showGrid = false,
    onToggleGrid,
    showSafeMargins = false,
    onToggleSafeMargins,
    snapPrefs,
    onToggleSnapPref,
    onUpdateSnapPrefs,
    outsideCanvasMode = 'grayscale-dim',
    onChangeOutsideCanvasMode,
    enableOutsideCanvasPasteboard = true,
    allowOutsideCanvasOverride = true,
    allowedOutsideCanvasModes = null,
    layersOpen = false,
    onToggleLayers,
    allowedFormats = ['png', 'jpeg', 'webp', 'svg'],
    defaultQuality = 92,
    enableSvgExport = true,
    pageCount = 1,
    artboards = [],
    activeArtboardName = 'Artboard 1',
    onExport,
    exporting = false,
    adminTemplateMode = null,
    adminTemplate = null,
    canManageEditor = false,
    onOpenAdminSaveModal,
    collectionHeroMode = null,
    onSaveCollectionHero,
    savingCollectionHero = false,
    onCancelCollectionHero,
}) {
    const { props: pageProps } = usePage();
    const auth = pageProps?.auth || {};
    const welcomeName = auth.role === 'team_member' && auth.name ? auth.name : 'Admin';
    const isStaffAuthenticated =
        Boolean(auth?.authenticated) && (auth?.role === 'super_admin' || auth?.role === 'team_member');
    const canSaveAsTemplate = Boolean(canManageEditor && isStaffAuthenticated);

    // 'file' | 'resize' | 'editing' | 'dimensions' | 'export' | null
    const [openMenu, setOpenMenu] = useState(null);
    const [resizeW, setResizeW] = useState(canvasWidth);
    const [resizeH, setResizeH] = useState(canvasHeight);
    const [resizeLock, setResizeLock] = useState(false);
    const [presetSearch, setPresetSearch] = useState('');

    const [exportFormat, setExportFormat] = useState(allowedFormats[0] || 'png');
    const [exportScale, setExportScale] = useState(1);
    const [exportQuality, setExportQuality] = useState(defaultQuality);
    const [exportTransparent, setExportTransparent] = useState(true);
    const [exportScope, setExportScope] = useState('current');
    const [selectedArtboardIds, setSelectedArtboardIds] = useState([]);

    const artboardCount = Array.isArray(artboards) ? artboards.length : 0;
    const totalMultiAssets = Math.max(pageCount, artboardCount);

    useEffect(() => {
        if (openMenu === 'export') {
            if (artboardCount > 1 || pageCount > 1) {
                setExportScope('all');
                setSelectedArtboardIds(artboards.map((a) => a.id));
            } else {
                setExportScope('current');
            }
        }
    }, [openMenu, artboardCount, pageCount, artboards]);

    const headerRef = useRef(null);
    const jsonImportRef = useRef(null);
    const hoverCloseTimerRef = useRef(null);
    const hoverOpenedMenuRef = useRef(null);
    const lastSaveLabelRef = useRef('Saved');
    const lastSaveTextClassRef = useRef('text-emerald-600 dark:text-emerald-400');
    const exportModalPresence = useAnimatedPresence(openMenu === 'export', 240);
    const prefDrag = usePopoverDrag({ open: openMenu === 'preferences' });
    const dimsDrag = usePopoverDrag({ open: openMenu === 'dimensions' });
    const exportDrag = usePopoverDrag({ open: openMenu === 'export' });

    useEffect(() => {
        return () => {
            if (hoverCloseTimerRef.current) clearTimeout(hoverCloseTimerRef.current);
        };
    }, []);

    useEffect(() => {
        if (!isProjectOpen) {
            setOpenMenu(null);
        }
    }, [isProjectOpen]);

    useEffect(() => {
        setResizeW(canvasWidth);
        setResizeH(canvasHeight);
    }, [canvasWidth, canvasHeight]);

    useEffect(() => {
        const handleOutside = (e) => {
            if (
                e.target.closest?.('[data-testid="topbar-export-modal"]') ||
                e.target.closest?.('[data-testid="studio-select-listbox"]') ||
                e.target.closest?.('[role="listbox"]')
            ) {
                return;
            }
            if (headerRef.current && !headerRef.current.contains(e.target)) {
                setOpenMenu(null);
            }
        };
        const handleEsc = (e) => {
            if (e.key === 'Escape') setOpenMenu(null);
        };
        document.addEventListener('pointerdown', handleOutside);
        document.addEventListener('keydown', handleEsc);
        return () => {
            document.removeEventListener('pointerdown', handleOutside);
            document.removeEventListener('keydown', handleEsc);
        };
    }, []);

    const clearHoverCloseTimer = () => {
        if (hoverCloseTimerRef.current) {
            clearTimeout(hoverCloseTimerRef.current);
            hoverCloseTimerRef.current = null;
        }
    };

    const openHoverMenu = (name) => {
        clearHoverCloseTimer();
        hoverOpenedMenuRef.current = name;
        setOpenMenu((prev) => (prev === 'dimensions' || prev === 'export' ? prev : name));
    };

    const scheduleHoverClose = (name) => {
        if (name === 'preferences' && (prefDrag.isDragging || prefDrag.offset.x !== 0 || prefDrag.offset.y !== 0)) {
            return;
        }
        clearHoverCloseTimer();
        hoverCloseTimerRef.current = setTimeout(() => {
            if (document.querySelector('[data-testid="studio-select-listbox"], [role="listbox"]')) {
                return;
            }
            hoverOpenedMenuRef.current = null;
            setOpenMenu((prev) => (prev === name ? null : prev));
        }, 160);
    };

    const toggleMenu = (name) => {
        clearHoverCloseTimer();
        if (hoverOpenedMenuRef.current === name) {
            hoverOpenedMenuRef.current = null;
            setOpenMenu(name);
            return;
        }
        setOpenMenu((prev) => (prev === name ? null : name));
    };

    const ratio = canvasWidth / Math.max(1, canvasHeight);
    const handleCustomWChange = (val) => {
        const w = Math.max(32, Math.min(maxWidth, Number(val) || 32));
        setResizeW(w);
        if (resizeLock) {
            setResizeH(Math.max(32, Math.min(maxHeight, Math.round(w / ratio))));
        }
    };
    const handleCustomHChange = (val) => {
        const h = Math.max(32, Math.min(maxHeight, Number(val) || 32));
        setResizeH(h);
        if (resizeLock) {
            setResizeW(Math.max(32, Math.min(maxWidth, Math.round(h * ratio))));
        }
    };

    const availableFormats = allowedFormats.filter((f) => f !== 'svg' || enableSvgExport);

    const filteredPresets = presets.filter((p) => {
        if (!presetSearch.trim()) return true;
        const q = presetSearch.toLowerCase();
        return p.name.toLowerCase().includes(q) || p.groupName.toLowerCase().includes(q) || `${p.width}x${p.height}`.includes(q);
    });

    const handleTriggerExport = async () => {
        await onExport({
            format: exportFormat,
            multiplier: exportFormat === 'svg' ? 1 : exportScale,
            quality: exportQuality / 100,
            transparent: exportTransparent,
            scope: totalMultiAssets > 1 ? exportScope : 'current',
            selectedArtboardIds:
                artboardCount > 1 && exportScope === 'all' && selectedArtboardIds.length > 0
                    ? selectedArtboardIds
                    : null,
        });
        setOpenMenu(null);
    };

    const cloudCfg = SAVE_STATUS_CONFIG[saveState] || SAVE_STATUS_CONFIG.idle;
    const showTransientLabel = Boolean(showSaveText && cloudCfg.text);
    if (cloudCfg.text) {
        lastSaveLabelRef.current = cloudCfg.text;
        lastSaveTextClassRef.current = cloudCfg.textClass;
    }

    return (
        <header
            ref={headerRef}
            className="h-14 shrink-0 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-800/90 px-3 sm:px-4 flex items-center justify-between gap-2 z-50 select-none transition-colors"
        >
            {/* Left Cluster */}
            <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
                {collectionHeroMode ? (
                    <button
                        type="button"
                        onClick={onCancelCollectionHero}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 cursor-pointer shrink-0 transition-colors"
                    >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        <span>Back to Collection</span>
                    </button>
                ) : (
                    <Link
                        href={adminTemplateMode ? '/admin/dashboard/editor/templates' : '/'}
                        data-testid="topbar-home-link"
                        aria-label={adminTemplateMode ? 'Back to Admin Templates' : 'Back to Homepage'}
                        data-tooltip={adminTemplateMode ? 'Back to Admin Templates' : 'Go to Homepage'}
                        className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-[0_0_15px_rgba(59,130,246,0.35)] hover:shadow-[0_0_22px_rgba(59,130,246,0.65)] hover:scale-105 transition-all duration-200 shrink-0"
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={2}
                            stroke="currentColor"
                            className="w-5 h-5 text-white"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z"
                            />
                        </svg>
                    </Link>
                )}

                {!isProjectOpen ? (
                    <div className="flex items-center gap-2.5 pl-1">
                        <div className="h-5 w-px bg-slate-200 dark:bg-slate-800 shrink-0" />
                        <span className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-200 tracking-tight whitespace-nowrap">
                            Studio Home
                        </span>
                        <div className="h-5 w-px bg-slate-200 dark:bg-slate-800 shrink-0" />
                        <span
                            data-testid="topbar-welcome-text"
                            className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap"
                        >
                            Welcome Back{' '}
                            <span className="font-semibold text-slate-800 dark:text-slate-100">
                                {welcomeName}
                            </span>
                        </span>
                    </div>
                ) : (
                    <>
                {/* Editor Homepage Icon Button (Same size as site logo, neutral/non-blue by default) */}
                <button
                    type="button"
                    data-testid="topbar-editor-home-button"
                    onClick={() => onGoHome?.()}
                    aria-label="Image Editor Homepage"
                    data-tooltip="Editor Homepage"
                    className="w-9 h-9 rounded-xl border flex items-center justify-center transition-all duration-200 cursor-pointer shrink-0 bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:scale-105"
                >
                    <Home className="w-[18px] h-[18px]" />
                </button>

                {/* Divider 1 */}
                <div className="h-5 w-px bg-slate-200 dark:bg-slate-800 shrink-0" />

                {/* Top Menus: File, Resize, Editing */}
                <nav className="flex items-center gap-0.5 shrink-0" aria-label="Editor menu">
                    {/* FILE MENU */}
                    <div
                        className="relative"
                        onMouseEnter={() => openHoverMenu('file')}
                        onMouseLeave={() => scheduleHoverClose('file')}
                    >
                        <button
                            type="button"
                            data-testid="topbar-menu-file"
                            onClick={() => toggleMenu('file')}
                            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${openMenu === 'file'
                                ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white'
                                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900 hover:text-slate-900 dark:hover:text-white'
                                }`}
                        >
                            File
                        </button>
                        <AnimatedPopover
                            open={openMenu === 'file'}
                            originClass="origin-top-left"
                            data-testid="topbar-dropdown-file"
                            className="absolute left-0 top-full mt-2 before:content-[''] before:absolute before:-top-2 before:left-0 before:right-0 before:h-2 w-56 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/90 shadow-2xl p-1.5 z-50 text-xs text-slate-800 dark:text-slate-200"
                        >
                            <button
                                type="button"
                                onClick={() => {
                                    setOpenMenu(null);
                                    onNewBlank?.();
                                }}
                                className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-left cursor-pointer"
                            >
                                <FilePlus2 className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                                <span className="font-medium">New Blank Design</span>
                            </button>
                            {!adminTemplateMode && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setOpenMenu(null);
                                        onManualSave?.();
                                    }}
                                    className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-left cursor-pointer"
                                >
                                    <CloudUpload className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" />
                                    <span className="font-medium">Save Draft Now</span>
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={() => {
                                    setOpenMenu(null);
                                    jsonImportRef.current?.click();
                                }}
                                className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-left cursor-pointer"
                            >
                                <Upload className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                                <span className="font-medium">Import Project (.json)</span>
                            </button>
                            <div className="h-px bg-slate-200 dark:bg-slate-800 my-1" />
                            <button
                                type="button"
                                onClick={() => {
                                    setOpenMenu(null);
                                    onExport?.({ format: 'json' });
                                }}
                                className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-left cursor-pointer"
                            >
                                <FileJson className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                                <span className="font-medium">Save Project File (.json)</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setOpenMenu('export')}
                                className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-left cursor-pointer text-blue-600 dark:text-blue-400 font-semibold"
                            >
                                <Download className="w-3.5 h-3.5" />
                                <span>Export Design...</span>
                            </button>
                        </AnimatedPopover>
                    </div>

                    {/* RESIZE MENU */}
                    <div
                        className="relative"
                        onMouseEnter={() => openHoverMenu('resize')}
                        onMouseLeave={() => scheduleHoverClose('resize')}
                    >
                        <button
                            type="button"
                            data-testid="topbar-menu-resize"
                            onClick={() => {
                                clearHoverCloseTimer();
                                if (openMenu === 'dimensions') {
                                    setOpenMenu(null);
                                    return;
                                }
                                toggleMenu('resize');
                            }}
                            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${openMenu === 'resize' || openMenu === 'dimensions'
                                ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white'
                                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900 hover:text-slate-900 dark:hover:text-white'
                                }`}
                        >
                            Resize
                        </button>
                        <AnimatedPopover
                            open={openMenu === 'resize'}
                            originClass="origin-top-left"
                            data-testid="topbar-dropdown-resize"
                            className="absolute left-0 top-full mt-2 before:content-[''] before:absolute before:-top-2 before:left-0 before:right-0 before:h-2 w-64 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/90 shadow-2xl p-1.5 z-50 text-xs text-slate-800 dark:text-slate-200"
                        >
                            <div className="px-2.5 py-1.5 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                <span>Quick Sizes</span>
                                <span className="font-mono text-blue-600 dark:text-blue-400">{canvasWidth}×{canvasHeight}</span>
                            </div>
                            <div className="max-h-52 overflow-y-auto space-y-0.5">
                                {presets.slice(0, 6).map((p) => (
                                    <button
                                        key={p.id}
                                        type="button"
                                        onClick={() => {
                                            onResizeCanvas?.(p.width, p.height, p.name);
                                            setOpenMenu(null);
                                        }}
                                        className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-left cursor-pointer"
                                    >
                                        <span className="font-medium truncate pr-2">{p.name}</span>
                                        <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 shrink-0">
                                            {p.width}×{p.height}
                                        </span>
                                    </button>
                                ))}
                            </div>
                            <div className="h-px bg-slate-200 dark:bg-slate-800 my-1" />
                            <button
                                type="button"
                                onClick={() => setOpenMenu('dimensions')}
                                className="w-full flex items-center justify-between px-2.5 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-left cursor-pointer text-blue-600 dark:text-blue-400 font-semibold"
                            >
                                <span className="inline-flex items-center gap-2">
                                    <Maximize2 className="w-3.5 h-3.5" />
                                    <span>Custom Size &amp; All Presets...</span>
                                </span>
                            </button>
                        </AnimatedPopover>

                        {/* Custom Dimensions & All Presets Popover (opened from Resize menu) */}
                        <AnimatedPopover
                            ref={dimsDrag.panelRef}
                            open={openMenu === 'dimensions'}
                            originClass="origin-top-left"
                            data-testid="topbar-dropdown-dimensions"
                            style={{ transform: `translate3d(${dimsDrag.offset.x}px, ${dimsDrag.offset.y}px, 0)` }}
                            className={`absolute left-0 top-full mt-2 w-80 sm:w-96 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 shadow-2xl p-4 z-50 space-y-3 text-slate-900 dark:text-slate-100 ${dimsDrag.isDragging ? '!transition-none' : ''}`}
                        >
                            <div
                                data-testid="topbar-dimensions-drag-handle"
                                onPointerDown={dimsDrag.handleDragStart}
                                className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800 cursor-grab active:cursor-grabbing select-none"
                            >
                                <span className="inline-flex items-center gap-1.5 text-xs font-bold">
                                    <GripHorizontal className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                    Canvas Dimensions &amp; Presets
                                </span>
                                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">Max {maxWidth}×{maxHeight}</span>
                            </div>

                            {/* Custom W x H */}
                            <div className="flex items-end gap-2 bg-slate-50 dark:bg-slate-950/70 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
                                <div className="flex-1">
                                    <label className="block text-[10px] text-slate-500 dark:text-slate-400 mb-1">Width (px)</label>
                                    <input
                                        type="number"
                                        min={32}
                                        max={maxWidth}
                                        value={resizeW}
                                        onChange={(e) => handleCustomWChange(e.target.value)}
                                        className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-white"
                                    />
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setResizeLock((l) => !l)}
                                    className={`p-2 rounded-lg border cursor-pointer ${resizeLock ? 'bg-blue-600/15 border-blue-500 text-blue-600 dark:text-blue-400' : 'border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                        }`}
                                    data-tooltip="Lock aspect ratio"
                                >
                                    {resizeLock ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                                </button>
                                <div className="flex-1">
                                    <label className="block text-[10px] text-slate-500 dark:text-slate-400 mb-1">Height (px)</label>
                                    <input
                                        type="number"
                                        min={32}
                                        max={maxHeight}
                                        value={resizeH}
                                        onChange={(e) => handleCustomHChange(e.target.value)}
                                        className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-white"
                                    />
                                </div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        onResizeCanvas(resizeW, resizeH, 'Custom Size');
                                        setOpenMenu(null);
                                    }}
                                    className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold cursor-pointer"
                                >
                                    Apply
                                </button>
                            </div>

                            {/* Preset Search */}
                            <input
                                type="text"
                                value={presetSearch}
                                onChange={(e) => setPresetSearch(e.target.value)}
                                placeholder="Search presets (YouTube, Story, Poster...)"
                                className="w-full px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500"
                            />

                            <div className="max-h-56 overflow-y-auto space-y-1 pr-1">
                                {filteredPresets.map((p) => (
                                    <button
                                        key={p.id}
                                        type="button"
                                        onClick={() => {
                                            onResizeCanvas(p.width, p.height, p.name);
                                            setOpenMenu(null);
                                        }}
                                        className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/90 text-left cursor-pointer transition-colors"
                                    >
                                        <div>
                                            <div className="text-xs font-semibold">{p.name}</div>
                                            <div className="text-[10px] text-slate-500 dark:text-slate-400">{p.groupName}</div>
                                        </div>
                                        <span className="text-[11px] font-mono text-blue-600 dark:text-blue-400">{p.width}×{p.height}</span>
                                    </button>
                                ))}
                            </div>
                        </AnimatedPopover>
                    </div>

                    {/* EDITING MENU */}
                    <div
                        className="relative"
                        onMouseEnter={() => openHoverMenu('editing')}
                        onMouseLeave={() => scheduleHoverClose('editing')}
                    >
                        <button
                            type="button"
                            data-testid="topbar-menu-editing"
                            onClick={() => toggleMenu('editing')}
                            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${openMenu === 'editing'
                                ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white'
                                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900 hover:text-slate-900 dark:hover:text-white'
                                }`}
                        >
                            Editing
                        </button>
                        <AnimatedPopover
                            open={openMenu === 'editing'}
                            originClass="origin-top-left"
                            data-testid="topbar-dropdown-editing"
                            className="absolute left-0 top-full mt-2 before:content-[''] before:absolute before:-top-2 before:left-0 before:right-0 before:h-2 w-60 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/90 shadow-2xl p-1.5 z-50 text-xs text-slate-800 dark:text-slate-200"
                        >
                            <button
                                type="button"
                                disabled={!canUndo}
                                onClick={() => {
                                    onUndo?.();
                                    setOpenMenu(null);
                                }}
                                className="w-full flex items-center justify-between px-2.5 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-left cursor-pointer disabled:opacity-40 disabled:cursor-default"
                            >
                                <span className="inline-flex items-center gap-2 font-medium">
                                    <Undo2 className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                                    <span>Undo</span>
                                </span>
                                <kbd className="text-[10px] font-mono text-slate-400">Ctrl+Z</kbd>
                            </button>
                            <button
                                type="button"
                                disabled={!canRedo}
                                onClick={() => {
                                    onRedo?.();
                                    setOpenMenu(null);
                                }}
                                className="w-full flex items-center justify-between px-2.5 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-left cursor-pointer disabled:opacity-40 disabled:cursor-default"
                            >
                                <span className="inline-flex items-center gap-2 font-medium">
                                    <Redo2 className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                                    <span>Redo</span>
                                </span>
                                <kbd className="text-[10px] font-mono text-slate-400">Ctrl+Shift+Z</kbd>
                            </button>
                            <div className="h-px bg-slate-200 dark:bg-slate-800 my-1" />
                            <button
                                type="button"
                                onClick={() => {
                                    onToggleGrid?.();
                                    setOpenMenu(null);
                                }}
                                className="w-full flex items-center justify-between px-2.5 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-left cursor-pointer"
                            >
                                <span className="inline-flex items-center gap-2 font-medium">
                                    <Grid3X3 className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                                    <span>Alignment Grid</span>
                                </span>
                                {showGrid && <Check className="w-3.5 h-3.5 text-blue-500" />}
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    onToggleSafeMargins?.();
                                    setOpenMenu(null);
                                }}
                                className="w-full flex items-center justify-between px-2.5 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-left cursor-pointer"
                            >
                                <span className="inline-flex items-center gap-2 font-medium">
                                    <SquareDashed className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                                    <span>Safe Print Margins</span>
                                </span>
                                {showSafeMargins && <Check className="w-3.5 h-3.5 text-amber-500" />}
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    onToggleLayers?.();
                                    setOpenMenu(null);
                                }}
                                className="w-full flex items-center justify-between px-2.5 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-left cursor-pointer"
                            >
                                <span className="inline-flex items-center gap-2 font-medium">
                                    <Layers className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                                    <span>Layers Panel</span>
                                </span>
                                <span className="inline-flex items-center gap-1.5">
                                    {layersOpen && <Check className="w-3.5 h-3.5 text-blue-500" />}
                                    <kbd className="text-[10px] font-mono text-slate-400">L</kbd>
                                </span>
                            </button>
                        </AnimatedPopover>
                    </div>

                    {/* Preferences (Snapping & Canvas Guides) */}
                    {snapPrefs && onToggleSnapPref && (
                        <div
                            className="relative"
                            onMouseEnter={() => openHoverMenu('preferences')}
                            onMouseLeave={() => scheduleHoverClose('preferences')}
                        >
                            <button
                                type="button"
                                data-testid="topbar-preferences-menu"
                                onClick={() => toggleMenu('preferences')}
                                aria-expanded={openMenu === 'preferences'}
                                data-tooltip="Snapping & Editor Preferences"
                                className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${openMenu === 'preferences'
                                    ? 'bg-slate-200/80 dark:bg-slate-800 text-slate-900 dark:text-white'
                                    : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900'
                                    }`}
                            >
                                <SlidersHorizontal className="w-3.5 h-3.5 text-blue-500" />
                                <span className="hidden lg:inline">Preferences</span>
                                <ChevronDown className="w-3 h-3 opacity-70" />
                            </button>

                            <AnimatedPopover
                                ref={prefDrag.panelRef}
                                open={openMenu === 'preferences'}
                                originClass="origin-top-left"
                                data-testid="topbar-preferences-popover"
                                style={{ transform: `translate3d(${prefDrag.offset.x}px, ${prefDrag.offset.y}px, 0)` }}
                                className={`absolute top-full left-0 mt-1.5 w-72 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-2.5 z-50 text-xs ${prefDrag.isDragging ? '!transition-none' : ''}`}
                            >
                                <div
                                    data-testid="topbar-preferences-drag-handle"
                                    onPointerDown={prefDrag.handleDragStart}
                                    className="px-2 py-1.5 mb-1 border-b border-slate-100 dark:border-slate-800 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 cursor-grab active:cursor-grabbing select-none"
                                >
                                    <GripHorizontal className="w-3.5 h-3.5 shrink-0" />
                                    <span>Snapping Preferences</span>
                                </div>
                                {[
                                    {
                                        key: 'enabled',
                                        testId: 'pref-snap-master',
                                        label: 'Enable Snapping',
                                        desc: 'Master magnet switch',
                                        active: Boolean(snapPrefs.enabled),
                                        Icon: Magnet,
                                    },
                                    {
                                        key: 'artboard',
                                        testId: 'pref-snap-artboard',
                                        label: 'Snap to Artboard',
                                        desc: 'Center & canvas edges',
                                        active: Boolean(snapPrefs.artboard),
                                        Icon: Frame,
                                    },
                                    {
                                        key: 'elements',
                                        testId: 'pref-snap-elements',
                                        label: 'Snap to Elements',
                                        desc: 'Align to other layers & groups',
                                        active: Boolean(snapPrefs.elements),
                                        Icon: Boxes,
                                    },
                                    {
                                        key: 'points',
                                        testId: 'pref-snap-points',
                                        label: 'Snap to Points',
                                        desc: 'Corner & center anchor magnets',
                                        active: Boolean(snapPrefs.points),
                                        Icon: Crosshair,
                                    },
                                    {
                                        key: 'grid',
                                        testId: 'pref-snap-grid',
                                        label: 'Snap to Grid',
                                        desc: `${snapPrefs.gridSize || 40}px grid intervals`,
                                        active: Boolean(snapPrefs.grid),
                                        Icon: Grid3X3,
                                    },
                                ].map((item) => {
                                    const Icon = item.Icon;
                                    const dimmed = item.key !== 'enabled' && !snapPrefs.enabled;
                                    return (
                                        <button
                                            key={item.key}
                                            type="button"
                                            data-testid={item.testId}
                                            aria-pressed={item.active}
                                            onClick={() => onToggleSnapPref(item.key)}
                                            className={`w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-left cursor-pointer transition-opacity ${dimmed ? 'opacity-55' : ''
                                                }`}
                                        >
                                            <span className="flex items-center gap-2 min-w-0">
                                                <span
                                                    className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 transition-colors ${item.active && (item.key === 'enabled' || snapPrefs.enabled)
                                                        ? 'bg-blue-600/15 text-blue-600 dark:text-blue-400'
                                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                                                        }`}
                                                >
                                                    <Icon className="w-3.5 h-3.5" />
                                                </span>
                                                <span className="min-w-0">
                                                    <span className="block font-semibold text-slate-800 dark:text-slate-100 truncate">
                                                        {item.label}
                                                    </span>
                                                    <span className="block text-[10px] text-slate-400 truncate">
                                                        {item.desc}
                                                    </span>
                                                </span>
                                            </span>
                                            <span
                                                className={`w-7 h-4 rounded-full p-0.5 transition-colors shrink-0 flex items-center ${item.active ? 'bg-blue-600 justify-end' : 'bg-slate-300 dark:bg-slate-700 justify-start'
                                                    }`}
                                            >
                                                <span className="w-3 h-3 rounded-full bg-white shadow-sm" />
                                            </span>
                                        </button>
                                    );
                                })}

                                {onUpdateSnapPrefs && (
                                    <div className="pt-1.5 mt-1 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between px-2 py-1">
                                        <button
                                            type="button"
                                            onClick={() =>
                                                onUpdateSnapPrefs({
                                                    enabled: true,
                                                    artboard: true,
                                                    elements: true,
                                                    points: true,
                                                    grid: true,
                                                })
                                            }
                                            className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                                        >
                                            Enable All
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => onUpdateSnapPrefs({ enabled: false })}
                                            className="text-[10px] font-semibold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 cursor-pointer"
                                        >
                                            Disable All
                                        </button>
                                    </div>
                                )}

                                {enableOutsideCanvasPasteboard && allowOutsideCanvasOverride && onChangeOutsideCanvasMode && (() => {
                                    const visibleModes = Array.isArray(allowedOutsideCanvasModes) && allowedOutsideCanvasModes.length
                                        ? OUTSIDE_CANVAS_MODES.filter((m) => allowedOutsideCanvasModes.includes(m.id))
                                        : OUTSIDE_CANVAS_MODES;
                                    const oddLast = visibleModes.length % 2 === 1;
                                    return (
                                        <div
                                            data-testid="pref-outside-canvas-section"
                                            className="pt-2.5 mt-2 border-t border-slate-200 dark:border-slate-800 px-2 pb-1 space-y-1.5"
                                        >
                                            <div className="flex items-center justify-between">
                                                <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                                    <Eye className="w-3 h-3 text-violet-500" />
                                                    <span>Outside Canvas</span>
                                                </span>
                                                <span className="text-[10px] text-slate-400">Not exported</span>
                                            </div>
                                            <div className="grid grid-cols-2 gap-1">
                                                {visibleModes.map((m, idx) => {
                                                    const active = outsideCanvasMode === m.id;
                                                    const spanTwo = oddLast && idx === visibleModes.length - 1;
                                                    return (
                                                        <button
                                                            key={m.id}
                                                            type="button"
                                                            data-testid={`pref-outside-${m.id}`}
                                                            aria-pressed={active}
                                                            title={m.desc}
                                                            onClick={() => onChangeOutsideCanvasMode(m.id)}
                                                            className={`px-2 py-1.5 rounded-lg text-left border transition-colors cursor-pointer ${
                                                                active
                                                                    ? 'bg-violet-600/15 border-violet-500/60 text-violet-700 dark:text-violet-300'
                                                                    : 'bg-slate-50 dark:bg-slate-950 border-slate-200/80 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                                                            } ${spanTwo ? 'col-span-2' : ''}`}
                                                        >
                                                            <span className="block text-[10px] font-bold leading-tight truncate">
                                                                {m.label}
                                                            </span>
                                                            <span className="block text-[9px] text-slate-400 truncate">
                                                                {m.desc}
                                                            </span>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })()}

                                {onChangeAutosaveInterval && (
                                    <div
                                        data-testid="pref-autosave-section"
                                        className="pt-2.5 mt-2 border-t border-slate-200 dark:border-slate-800 px-2 pb-1 space-y-1.5"
                                    >
                                        <div className="flex items-center justify-between">
                                            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                                <Clock className="w-3 h-3 text-blue-500" />
                                                <span>Auto-Save Timer</span>
                                            </span>
                                            <span className="text-[10px] text-slate-400">On edits only</span>
                                        </div>
                                        <StudioSelect
                                            value={String(autosaveIntervalSec)}
                                            onChange={(e) => {
                                                const raw = e && typeof e === 'object' && 'target' in e ? e.target.value : e;
                                                const parsed = Number(raw);
                                                if (Number.isFinite(parsed) && parsed >= 0) {
                                                    onChangeAutosaveInterval(parsed);
                                                }
                                            }}
                                            options={AUTOSAVE_OPTIONS}
                                            size="sm"
                                            testId="pref-autosave-select"
                                        />
                                    </div>
                                )}
                            </AnimatedPopover>
                        </div>
                    )}
                </nav>

                {/* Divider 2 */}
                <div className="h-5 w-px bg-slate-200 dark:bg-slate-800 shrink-0" />

                {/* Editable Project Name Input */}
                <label
                    data-tooltip="Project name — click to rename"
                    className="group inline-flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-slate-100/90 hover:bg-slate-100 focus-within:bg-white dark:bg-slate-900/90 dark:hover:bg-slate-800/80 dark:focus-within:bg-slate-950 border border-slate-300/90 hover:border-slate-400 dark:border-slate-700/90 dark:hover:border-slate-600 focus-within:border-blue-500 dark:focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20 shadow-xs w-40 sm:w-56 cursor-text transition-all"
                >
                    <span className="hidden md:inline-block text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 group-focus-within:text-blue-600 dark:group-focus-within:text-blue-400 pr-2 border-r border-slate-300/80 dark:border-slate-700 select-none shrink-0 transition-colors">
                        Project
                    </span>
                    <input
                        type="text"
                        data-testid="topbar-project-title"
                        value={projectTitle}
                        onChange={(e) => onTitleChange(e.target.value)}
                        placeholder="Project name..."
                        aria-label="Project name"
                        className="w-full min-w-0 bg-transparent border-0 p-0 text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none truncate"
                    />
                    <Pencil className="w-3 h-3 text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300 group-focus-within:text-blue-500 dark:group-focus-within:text-blue-400 shrink-0 transition-colors" />
                </label>

                {/* Undo / Redo */}
                <div className="flex items-center gap-1 pl-1 border-l border-slate-200 dark:border-slate-800">
                    <button
                        type="button"
                        disabled={!canUndo}
                        onClick={onUndo}
                        data-tooltip="Undo (Ctrl+Z)"
                        aria-label="Undo (Ctrl+Z)"
                        className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-30 cursor-pointer disabled:cursor-default"
                    >
                        <Undo2 className="w-4 h-4" />
                    </button>
                    <button
                        type="button"
                        disabled={!canRedo}
                        onClick={onRedo}
                        data-tooltip="Redo (Ctrl+Shift+Z)"
                        aria-label="Redo (Ctrl+Shift+Z)"
                        className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-30 cursor-pointer disabled:cursor-default"
                    >
                        <Redo2 className="w-4 h-4" />
                    </button>
                </div>
                    </>
                )}
            </div>

            {/* Right Cluster */}
            <div className="flex items-center gap-2 shrink-0">
                {!isProjectOpen ? (
                    <ThemeToggle size="sm" customTooltip />
                ) : (
                    <>
                <input
                    ref={jsonImportRef}
                    type="file"
                    accept=".json,application/json"
                    className="hidden"
                    onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file && onImportProjectJson) onImportProjectJson(file);
                        e.target.value = '';
                    }}
                />

                {/* Animated Pill Save Button (inspired by morphing spinner -> progress -> check pill) */}
                <button
                    type="button"
                    data-testid="topbar-cloud-save"
                    data-save-state={saveState}
                    data-dirty={hasUnsavedChanges ? 'true' : 'false'}
                    data-save-text-visible={showTransientLabel ? 'true' : 'false'}
                    onClick={() => onManualSave?.()}
                    data-tooltip={
                        hasUnsavedChanges && saveState === 'idle'
                            ? 'Unsaved edits (click to save now, or waits for auto-save)'
                            : cloudCfg.title
                    }
                    aria-label={cloudCfg.text ? `Save status: ${cloudCfg.text}` : cloudCfg.title}
                    className={`group relative inline-flex items-center rounded-full border transition-all duration-300 ease-out cursor-pointer shrink-0 overflow-hidden ${saveState === 'saving'
                        ? 'pl-1.5 pr-3 py-1 bg-blue-50 dark:bg-blue-950/60 border-blue-400/70 dark:border-blue-500/60 shadow-sm shadow-blue-500/15'
                        : saveState === 'saved'
                            ? 'pl-1.5 pr-3 py-1 bg-emerald-50 dark:bg-emerald-950/50 border-emerald-400/70 dark:border-emerald-500/60 shadow-sm shadow-emerald-500/15'
                            : saveState === 'error'
                                ? 'pl-1.5 pr-3 py-1 bg-rose-50 dark:bg-rose-950/50 border-rose-400/70 dark:border-rose-500/60'
                                : 'p-1.5 bg-slate-100/80 hover:bg-blue-50 dark:bg-slate-900 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-700'
                        }`}
                >
                    {/* Morphing Status Core Circle / Icon */}
                    <span
                        className={`relative w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-all duration-300 ${saveState === 'saving'
                            ? 'bg-blue-600 text-white shadow-inner'
                            : saveState === 'saved'
                                ? 'bg-emerald-500 text-white scale-105'
                                : saveState === 'error'
                                    ? 'bg-rose-500 text-white'
                                    : 'bg-transparent text-slate-500 dark:text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400'
                            }`}
                    >
                        {saveState === 'saving' ? (
                            <svg
                                viewBox="0 0 40 40"
                                className="w-4 h-4 studio-save-spinner"
                                aria-hidden="true"
                            >
                                <circle
                                    cx="20"
                                    cy="20"
                                    r="13"
                                    fill="none"
                                    stroke="rgba(255,255,255,0.28)"
                                    strokeWidth="3.5"
                                />
                                <path
                                    fill="none"
                                    stroke="#ffffff"
                                    strokeWidth="3.5"
                                    strokeLinecap="round"
                                    d="M20 7 A13 13 0 0 1 32 15"
                                />
                            </svg>
                        ) : saveState === 'saved' ? (
                            <svg
                                viewBox="0 0 24 24"
                                className="w-3.5 h-3.5 fill-current studio-save-check"
                                aria-hidden="true"
                            >
                                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                            </svg>
                        ) : saveState === 'error' ? (
                            <CloudAlert className="w-3.5 h-3.5" />
                        ) : (
                            <Cloud className="w-4 h-4 transition-transform duration-300 group-hover:-translate-y-0.5" />
                        )}

                        {hasUnsavedChanges && saveState === 'idle' && (
                            <span
                                data-testid="topbar-unsaved-dot"
                                className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-amber-400 ring-2 ring-white dark:ring-slate-900"
                            />
                        )}
                    </span>

                    {/* Expanding Progress Track + Label */}
                    <span
                        data-testid="topbar-cloud-save-text"
                        aria-hidden={!showTransientLabel}
                        className={`inline-flex items-center overflow-hidden whitespace-nowrap transition-all duration-300 ease-out ${showTransientLabel
                            ? 'max-w-[165px] pl-2 opacity-100 translate-x-0 scale-100 gap-2'
                            : 'max-w-0 pl-0 opacity-0 -translate-x-1 scale-95 pointer-events-none gap-0'
                            }`}
                    >
                        {saveState === 'saving' && (
                            <span className="relative w-12 h-1.5 rounded-full bg-blue-200 dark:bg-blue-900/80 overflow-hidden shrink-0">
                                <span className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-blue-600 to-emerald-400 studio-save-progress-bar" />
                            </span>
                        )}
                        <span
                            className={`text-[11px] font-bold tracking-tight ${showTransientLabel ? cloudCfg.textClass : lastSaveTextClassRef.current
                                }`}
                        >
                            {cloudCfg.text || lastSaveLabelRef.current}
                        </span>
                    </span>
                </button>

                <button
                    type="button"
                    onClick={() => jsonImportRef.current?.click()}
                    data-tooltip="Import Project JSON"
                    className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer"
                >
                    <Upload className="w-3.5 h-3.5" />
                    <span className="hidden xl:inline">Load JSON</span>
                </button>

                <button
                    type="button"
                    data-testid="topbar-new-button"
                    onClick={onNewBlank}
                    data-tooltip="Reset / New Blank Design"
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer"
                >
                    <FilePlus2 className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">New</span>
                </button>

                {/* Built-in Light / Dark Mode Toggle synced with website theme */}
                <ThemeToggle size="sm" customTooltip />

                {/* Collection Hero Cover Save CTA */}
                {collectionHeroMode && (
                    <button
                        type="button"
                        data-testid="topbar-save-collection-hero-button"
                        onClick={onSaveCollectionHero}
                        disabled={savingCollectionHero}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white text-xs font-bold shadow-lg shadow-emerald-600/30 cursor-pointer transition-all"
                    >
                        {savingCollectionHero ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                            <Save className="w-3.5 h-3.5" />
                        )}
                        <span>{savingCollectionHero ? 'Saving Cover...' : 'Save to Collection'}</span>
                    </button>
                )}

                {/* Admin Visual Template Publisher CTA */}
                {canSaveAsTemplate && !collectionHeroMode && (
                    <button
                        type="button"
                        data-testid="topbar-save-template-button"
                        onClick={onOpenAdminSaveModal}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-colors ${adminTemplateMode
                            ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/25'
                            : 'bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/35 text-indigo-700 dark:text-indigo-300'
                            }`}
                    >
                        <Save className="w-3.5 h-3.5" />
                        <span>{adminTemplate ? 'Update Template' : 'Save as Template'}</span>
                    </button>
                )}

                {/* Export Modal Trigger (No down-arrow icon; opens centered dialog over canvas) */}
                <button
                    type="button"
                    data-testid="topbar-export-button"
                    onClick={() => toggleMenu('export')}
                    aria-haspopup="dialog"
                    aria-expanded={openMenu === 'export'}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-blue-600/30 cursor-pointer transition-all"
                >
                    <Download className="w-3.5 h-3.5" />
                    <span>Export</span>
                </button>

                {exportModalPresence.rendered &&
                    typeof document !== 'undefined' &&
                    createPortal(
                        <div
                            data-testid="topbar-export-modal"
                            role="dialog"
                            aria-modal="true"
                            aria-label="Export Design"
                            onClick={() => setOpenMenu(null)}
                            className={`fixed inset-0 z-[115] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm transition-opacity duration-200 ${exportModalPresence.visible ? 'opacity-100' : 'opacity-0 pointer-events-none'
                                }`}
                        >
                            <div
                                ref={exportDrag.panelRef}
                                data-testid="topbar-dropdown-export"
                                onClick={(e) => e.stopPropagation()}
                                onPointerDown={(e) => e.stopPropagation()}
                                style={{ transform: `translate3d(${exportDrag.offset.x}px, ${exportDrag.offset.y}px, 0)` }}
                                className={`w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 shadow-2xl p-5 space-y-4 text-slate-900 dark:text-slate-100 ${exportDrag.isDragging ? '!transition-none' : 'transition-all duration-200'} ${exportModalPresence.visible
                                    ? 'opacity-100 scale-100 translate-y-0'
                                    : 'opacity-0 scale-95 translate-y-2'
                                    }`}
                            >
                                <div
                                    data-testid="topbar-export-drag-handle"
                                    onPointerDown={exportDrag.handleDragStart}
                                    className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3 cursor-grab active:cursor-grabbing select-none"
                                >
                                    <div className="flex items-center gap-2">
                                        <GripHorizontal className="w-4 h-4 text-slate-400 shrink-0" />
                                        <div>
                                            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                                                Export Design
                                            </h3>
                                            <p className="text-[11px] font-mono text-blue-600 dark:text-blue-400">
                                                {exportFormat === 'svg'
                                                    ? 'Vector SVG'
                                                    : `${canvasWidth * exportScale} × ${canvasHeight * exportScale} px`}
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        data-testid="topbar-export-modal-close"
                                        onClick={() => setOpenMenu(null)}
                                        aria-label="Close export modal"
                                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>

                                {/* Formats */}
                                <div>
                                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                                        File Format
                                    </label>
                                    <div className="grid grid-cols-4 gap-1.5">
                                        {availableFormats.map((fmt) => (
                                            <button
                                                key={fmt}
                                                type="button"
                                                onClick={() => setExportFormat(fmt)}
                                                className={`py-2 rounded-xl text-xs font-bold uppercase cursor-pointer border transition-colors ${exportFormat === fmt
                                                    ? 'bg-blue-600 text-white border-blue-500 shadow-sm'
                                                    : 'bg-slate-100 dark:bg-slate-950 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-600'
                                                    }`}
                                            >
                                                {fmt === 'jpeg' ? 'jpg' : fmt}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* DPI / Scale */}
                                {exportFormat !== 'svg' && (
                                    <div>
                                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                                            Resolution Multiplier
                                        </label>
                                        <div className="grid grid-cols-3 gap-1.5">
                                            {[1, 2, 3].map((scale) => (
                                                <button
                                                    key={scale}
                                                    type="button"
                                                    onClick={() => setExportScale(scale)}
                                                    className={`py-2 rounded-xl text-xs font-bold cursor-pointer border transition-colors ${exportScale === scale
                                                        ? 'bg-blue-600/15 text-blue-600 dark:text-blue-400 border-blue-500'
                                                        : 'bg-slate-100 dark:bg-slate-950 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800'
                                                        }`}
                                                >
                                                    {scale}x {scale === 2 ? '(HD)' : scale === 3 ? '(Ultra)' : ''}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Quality slider */}
                                {(exportFormat === 'jpeg' || exportFormat === 'webp') && (
                                    <div>
                                        <div className="flex justify-between text-[11px] text-slate-600 dark:text-slate-300 mb-1.5">
                                            <span>Quality</span>
                                            <span className="font-mono">{exportQuality}%</span>
                                        </div>
                                        <input
                                            type="range"
                                            min={10}
                                            max={100}
                                            value={exportQuality}
                                            onChange={(e) => setExportQuality(Number(e.target.value))}
                                            className="w-full studio-range"
                                        />
                                    </div>
                                )}

                                {/* Transparent Toggle */}
                                {(exportFormat === 'png' || exportFormat === 'webp') && (
                                    <label className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 cursor-pointer">
                                        <span className="text-xs font-semibold">Transparent background</span>
                                        <input
                                            type="checkbox"
                                            checked={exportTransparent}
                                            onChange={(e) => setExportTransparent(e.target.checked)}
                                            className="studio-checkbox"
                                        />
                                    </label>
                                )}

                                {/* Multi-Artboard / Multi-Page Scope */}
                                {totalMultiAssets > 1 && (
                                    <div className="space-y-2">
                                        <div className="grid grid-cols-2 gap-1.5">
                                            <button
                                                type="button"
                                                data-testid="export-scope-current"
                                                onClick={() => setExportScope('current')}
                                                className={`py-2 px-2 rounded-xl text-[11px] font-bold cursor-pointer border truncate ${exportScope === 'current'
                                                    ? 'bg-blue-600/15 text-blue-600 dark:text-blue-400 border-blue-500'
                                                    : 'bg-slate-100 dark:bg-slate-950 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800'
                                                    }`}
                                            >
                                                {artboardCount > 1 ? `Current (${activeArtboardName})` : 'Current Page'}
                                            </button>
                                            <button
                                                type="button"
                                                data-testid="export-scope-all"
                                                onClick={() => setExportScope('all')}
                                                className={`py-2 px-2 rounded-xl text-[11px] font-bold cursor-pointer border truncate ${exportScope === 'all'
                                                    ? 'bg-blue-600/15 text-blue-600 dark:text-blue-400 border-blue-500'
                                                    : 'bg-slate-100 dark:bg-slate-950 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800'
                                                    }`}
                                            >
                                                {artboardCount > 1
                                                    ? `All ${artboardCount} Artboards (.zip)`
                                                    : `All ${pageCount} Pages (.zip)`}
                                            </button>
                                        </div>

                                        {artboardCount > 1 && exportScope === 'all' && (
                                            <div
                                                data-testid="export-artboard-checklist"
                                                className="max-h-28 overflow-y-auto rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-2 space-y-1"
                                            >
                                                {artboards.map((ab) => {
                                                    const checked = selectedArtboardIds.includes(ab.id);
                                                    return (
                                                        <label
                                                            key={ab.id}
                                                            className="flex items-center justify-between gap-2 px-1.5 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-900 text-[11px] cursor-pointer"
                                                        >
                                                            <span className="inline-flex items-center gap-2 min-w-0">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={checked}
                                                                    onChange={() => {
                                                                        setSelectedArtboardIds((prev) => {
                                                                            const next = prev.includes(ab.id)
                                                                                ? prev.filter((id) => id !== ab.id)
                                                                                : [...prev, ab.id];
                                                                            return next.length > 0 ? next : prev;
                                                                        });
                                                                    }}
                                                                    className="studio-checkbox"
                                                                />
                                                                <span className="font-semibold truncate">{ab.name}</span>
                                                            </span>
                                                            <span className="font-mono text-[10px] text-slate-400 shrink-0">
                                                                {ab.width}×{ab.height}
                                                            </span>
                                                        </label>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                )}

                                <div className="space-y-2 pt-1">
                                    <button
                                        type="button"
                                        disabled={exporting}
                                        onClick={handleTriggerExport}
                                        className="w-full py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-blue-600/25 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        <Download className="w-4 h-4" />
                                        <span>
                                            {exporting
                                                ? 'Rendering...'
                                                : totalMultiAssets > 1 && exportScope === 'all'
                                                    ? artboardCount > 1
                                                        ? `Download ${selectedArtboardIds.length || artboardCount} Artboards (.zip)`
                                                        : `Download All Pages (.zip)`
                                                    : `Download ${exportFormat.toUpperCase()}`}
                                        </span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => {
                                            onExport({ format: 'json' });
                                            setOpenMenu(null);
                                        }}
                                        className="w-full py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-950 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-slate-700 dark:text-slate-300 cursor-pointer flex items-center justify-center gap-1.5"
                                    >
                                        <FileJson className="w-3.5 h-3.5" />
                                        <span>Save Project File (.json)</span>
                                    </button>
                                </div>
                            </div>
                        </div>,
                        document.body
                    )}
                    </>
                )}
            </div>
        </header>
    );
}
