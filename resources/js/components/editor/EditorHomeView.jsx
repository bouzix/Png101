import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
    Plus,
    FolderOpen,
    Search,
    Upload,
    Trash2,
    Copy,
    Pencil,
    Check,
    X,
    Clock,
    Layers,
    LayoutTemplate,
    Frame,
    Star,
    SlidersHorizontal,
    MoreVertical,
} from 'lucide-react';
import { AnimatedPopover, EDITOR_PANEL_TRANSITION, useAnimatedPresence } from './useAnimatedPresence';
import TemplateInfoPopover from './TemplateInfoPopover';

const FAV_TEMPLATES_STORAGE_KEY = 'png101:editor:favTemplates:v1';

function MultiArtboardCardMedia({ previews = [], fallbackTitle = 'Untitled Design', staggerMs = 0 }) {
    const [activeIdx, setActiveIdx] = useState(0);
    const [paused, setPaused] = useState(false);

    useEffect(() => {
        if (previews.length <= 1 || paused) return undefined;
        let intervalId = null;
        const startTimer = setTimeout(() => {
            intervalId = setInterval(() => {
                setActiveIdx((prev) => (prev + 1) % previews.length);
            }, 2600);
        }, staggerMs);
        return () => {
            clearTimeout(startTimer);
            if (intervalId) clearInterval(intervalId);
        };
    }, [previews.length, paused, staggerMs]);

    const current = previews[activeIdx % previews.length] || previews[0];

    return (
        <div
            data-testid="multi-artboard-preview"
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
            className="relative w-full h-full overflow-hidden"
        >
            {previews.map((ab, idx) => {
                const isActive = idx === activeIdx % previews.length;
                return ab.thumbnail ? (
                    <img
                        key={ab.id || idx}
                        src={ab.thumbnail}
                        alt={ab.name || fallbackTitle}
                        className={`absolute inset-0 w-full h-full object-contain transition-opacity duration-700 ease-in-out ${
                            isActive ? 'opacity-100' : 'opacity-0 pointer-events-none'
                        }`}
                    />
                ) : null;
            })}

            {/* Artboard Pack Pill */}
            <span className="absolute top-1.5 left-1.5 z-10 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-blue-600/90 text-white text-[9px] font-bold backdrop-blur-md shadow-xs pointer-events-none max-w-[78%] truncate">
                <Frame className="w-2.5 h-2.5 shrink-0" />
                <span className="truncate">
                    {previews.length} Artboards{current?.name ? ` · ${current.name}` : ''}
                </span>
            </span>

            {/* Subtle Fade Slide Indicators */}
            <div className="absolute top-1.5 right-1.5 z-10 flex items-center gap-0.5 px-1.5 py-1 rounded-full bg-slate-950/55 backdrop-blur-sm pointer-events-none">
                {previews.slice(0, 6).map((ab, idx) => (
                    <span
                        key={ab.id || idx}
                        className={`h-1 rounded-full transition-all duration-300 ${
                            idx === activeIdx % previews.length ? 'w-2.5 bg-white' : 'w-1 bg-white/45'
                        }`}
                    />
                ))}
            </div>
        </div>
    );
}

function formatRelativeTime(ts) {
    const ms = Number(ts);
    if (!Number.isFinite(ms) || ms <= 0) return 'Recently';
    const diffSec = Math.max(0, Math.floor((Date.now() - ms) / 1000));
    if (diffSec < 45) return 'Just now';
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    if (diffSec < 604800) return `${Math.floor(diffSec / 86400)}d ago`;
    return new Date(ms).toLocaleDateString();
}

export default function EditorHomeView({
    savedProjects = [],
    projectsLoading = false,
    templateCategories = [],
    canvasPresets = [],
    defaultWidth = 1080,
    defaultHeight = 1080,
    defaultTransparent = true,
    maxWidth = 4096,
    maxHeight = 4096,
    onCreateProject,
    onOpenProject,
    onRenameProject,
    onDuplicateProject,
    onDeleteProject,
    onApplyTemplate,
    onImportProjectJson,
}) {
    const [projectSearch, setProjectSearch] = useState('');
    const [editingId, setEditingId] = useState(null);
    const [editingTitle, setEditingTitle] = useState('');

    // Unified Create New Project modal (Presets, Custom Size, Load JSON)
    const [createModalOpen, setCreateModalOpen] = useState(false);
    const createModalPresence = useAnimatedPresence(createModalOpen, 240);
    const [customTitle, setCustomTitle] = useState('');
    const [customW, setCustomW] = useState(defaultWidth);
    const [customH, setCustomH] = useState(defaultHeight);
    const [customTransparent, setCustomTransparent] = useState(defaultTransparent);

    // Start From a Template modal + floating filter popover + 3-dot info popover
    const [tplModalOpen, setTplModalOpen] = useState(false);
    const tplModalPresence = useAnimatedPresence(tplModalOpen, 240);
    const [templates, setTemplates] = useState([]);
    const [tplLoading, setTplLoading] = useState(true);
    const [tplSearch, setTplSearch] = useState('');
    const [tplCategory, setTplCategory] = useState('');
    const [tplOrientation, setTplOrientation] = useState('all');
    const [tplFavOnly, setTplFavOnly] = useState(false);
    const [tplFiltersOpen, setTplFiltersOpen] = useState(false);
    const [openTplMenu, setOpenTplMenu] = useState(null);

    const [favTemplateIds, setFavTemplateIds] = useState(() => {
        try {
            const raw = window.localStorage?.getItem(FAV_TEMPLATES_STORAGE_KEY);
            const parsed = raw ? JSON.parse(raw) : [];
            return Array.isArray(parsed) ? parsed.filter((id) => typeof id === 'string' || typeof id === 'number') : [];
        } catch {
            return [];
        }
    });
    const favTemplateIdSet = useMemo(() => new Set(favTemplateIds), [favTemplateIds]);
    const toggleFavoriteTemplate = (id) => {
        setFavTemplateIds((prev) => {
            const next = prev.includes(id) ? prev.filter((item) => item !== id) : [id, ...prev];
            try {
                window.localStorage?.setItem(FAV_TEMPLATES_STORAGE_KEY, JSON.stringify(next));
            } catch {
                // ignore storage errors
            }
            return next;
        });
    };

    const jsonInputRef = useRef(null);
    const tplSearchWrapRef = useRef(null);
    const tplFilterPanelRef = useRef(null);
    const lastFilterPosRef = useRef({ top: 120, left: 620, width: 288 });

    const activeTplFilterCount =
        (tplCategory ? 1 : 0) + (tplOrientation !== 'all' ? 1 : 0) + (tplFavOnly ? 1 : 0);

    useEffect(() => {
        if (!createModalOpen) return undefined;
        const onEsc = (e) => {
            if (e.key === 'Escape') setCreateModalOpen(false);
        };
        window.addEventListener('keydown', onEsc);
        return () => window.removeEventListener('keydown', onEsc);
    }, [createModalOpen]);

    useEffect(() => {
        if (!tplModalOpen) {
            setTplFiltersOpen(false);
            setOpenTplMenu(null);
            return undefined;
        }
        const onEsc = (e) => {
            if (e.key === 'Escape' && !tplFiltersOpen && !openTplMenu) {
                setTplModalOpen(false);
            }
        };
        window.addEventListener('keydown', onEsc);
        return () => window.removeEventListener('keydown', onEsc);
    }, [tplModalOpen, tplFiltersOpen, openTplMenu]);

    useEffect(() => {
        if (!tplFiltersOpen) return undefined;
        const onPointerDown = (e) => {
            const target = e.target;
            if (
                !tplSearchWrapRef.current?.contains(target) &&
                !tplFilterPanelRef.current?.contains(target)
            ) {
                setTplFiltersOpen(false);
            }
        };
        const onKeyDown = (e) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation?.();
                setTplFiltersOpen(false);
            }
        };
        const onScrollOrWheel = (e) => {
            if (!tplFilterPanelRef.current?.contains(e.target)) {
                setTplFiltersOpen(false);
            }
        };
        document.addEventListener('pointerdown', onPointerDown, true);
        document.addEventListener('scroll', onScrollOrWheel, true);
        document.addEventListener('wheel', onScrollOrWheel, { capture: true, passive: true });
        window.addEventListener('keydown', onKeyDown, true);
        return () => {
            document.removeEventListener('pointerdown', onPointerDown, true);
            document.removeEventListener('scroll', onScrollOrWheel, true);
            document.removeEventListener('wheel', onScrollOrWheel, true);
            window.removeEventListener('keydown', onKeyDown, true);
        };
    }, [tplFiltersOpen]);

    useEffect(() => {
        let cancelled = false;
        const timer = setTimeout(async () => {
            setTplLoading(true);
            try {
                const params = new URLSearchParams();
                if (tplSearch.trim()) params.set('q', tplSearch.trim());
                if (tplCategory) params.set('categoryId', tplCategory);
                const res = await fetch(`/api/editor/templates?${params.toString()}`);
                const data = await res.json();
                if (!cancelled) {
                    setTemplates(Array.isArray(data.templates) ? data.templates : []);
                }
            } catch {
                if (!cancelled) setTemplates([]);
            } finally {
                if (!cancelled) setTplLoading(false);
            }
        }, 120);
        return () => {
            cancelled = true;
            clearTimeout(timer);
        };
    }, [tplSearch, tplCategory]);

    const filteredTemplates = useMemo(() => {
        return templates.filter((tpl) => {
            if (tplFavOnly && !favTemplateIdSet.has(tpl.id)) return false;
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

    const filteredProjects = useMemo(() => {
        const q = projectSearch.trim().toLowerCase();
        if (!q) return savedProjects;
        return savedProjects.filter((p) => (p.title || '').toLowerCase().includes(q));
    }, [savedProjects, projectSearch]);

    const quickPresets = useMemo(() => {
        if (canvasPresets.length > 0) return canvasPresets.slice(0, 6);
        return [
            { id: 'sq', name: 'Instagram Square', groupName: 'Social', width: 1080, height: 1080 },
            { id: 'story', name: 'Story / Reel', groupName: 'Social', width: 1080, height: 1920 },
            { id: 'yt', name: 'YouTube Thumb', groupName: 'Video', width: 1280, height: 720 },
            { id: 'post', name: 'Portrait Post', groupName: 'Social', width: 1080, height: 1350 },
            { id: 'cover', name: 'Social Cover', groupName: 'Banner', width: 1500, height: 500 },
            { id: 'logo', name: 'PNG Logo Badge', groupName: 'Brand', width: 1000, height: 1000 },
        ];
    }, [canvasPresets]);

    const commitRename = async (projId) => {
        const trimmed = editingTitle.trim();
        setEditingId(null);
        if (!trimmed) return;
        await onRenameProject?.(projId, trimmed);
    };

    const handleCreateCustom = (e) => {
        e.preventDefault();
        const w = Math.max(32, Math.min(maxWidth, Number(customW) || defaultWidth));
        const h = Math.max(32, Math.min(maxHeight, Number(customH) || defaultHeight));
        setCreateModalOpen(false);
        onCreateProject?.({
            title: customTitle.trim() || 'Untitled Design',
            width: w,
            height: h,
            transparent: customTransparent,
            presetLabel: `${w}×${h}`,
        });
    };

    const openCreateDialog = () => {
        setCustomTitle('');
        setCustomW(defaultWidth);
        setCustomH(defaultHeight);
        setCustomTransparent(defaultTransparent);
        setCreateModalOpen(true);
    };

    return (
        <main
            data-testid="editor-home-view"
            className="flex-1 min-h-0 w-full overflow-hidden flex flex-col gap-4 p-4 sm:p-5 bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors"
        >
            <input
                ref={jsonInputRef}
                type="file"
                accept=".json,application/json"
                className="hidden"
                onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) onImportProjectJson?.(file);
                    e.target.value = '';
                }}
            />

            {/* Centered Two-Action Top Row */}
            <div className="shrink-0 flex flex-wrap items-center justify-center gap-3 pt-1">
                <button
                    type="button"
                    data-testid="home-create-project-btn"
                    onClick={openCreateDialog}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-600/20 cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.99]"
                >
                    <Plus className="w-4 h-4" />
                    <span>Create New Project</span>
                </button>

                <button
                    type="button"
                    data-testid="home-start-template-btn"
                    onClick={() => setTplModalOpen(true)}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-800 dark:text-slate-100 shadow-xs cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.99]"
                >
                    <LayoutTemplate className="w-4 h-4 text-blue-500" />
                    <span>Start From a Template</span>
                </button>
            </div>

            {/* Full-Width My Projects Card */}
            <section
                data-testid="home-saved-projects"
                className="flex-1 min-h-0 w-full flex flex-col rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-xs p-4"
            >
                <div className="shrink-0 flex items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800/90">
                    <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <FolderOpen className="w-4 h-4 text-blue-500 shrink-0" />
                        <span>My Projects</span>
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[11px] font-bold text-slate-600 dark:text-slate-300">
                            {savedProjects.length}
                        </span>
                    </h2>

                    {savedProjects.length > 0 && (
                        <div className="relative w-44 sm:w-64">
                            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                            <input
                                type="text"
                                data-testid="home-project-search"
                                value={projectSearch}
                                onChange={(e) => setProjectSearch(e.target.value)}
                                placeholder="Search my projects..."
                                className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-blue-500"
                            />
                        </div>
                    )}
                </div>

                <div className="flex-1 min-h-0 overflow-y-auto pt-3.5 pr-1">
                    {projectsLoading ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                            {[1, 2, 3, 4, 5, 6].map((n) => (
                                <div
                                    key={n}
                                    className="aspect-square rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 animate-pulse"
                                />
                            ))}
                        </div>
                    ) : filteredProjects.length === 0 ? (
                        <div className="h-full min-h-[220px] rounded-2xl bg-slate-50/70 dark:bg-slate-950/60 border border-dashed border-slate-300 dark:border-slate-800 p-6 flex flex-col items-center justify-center text-center gap-3">
                            <FolderOpen className="w-8 h-8 text-blue-500/70" />
                            <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                                {savedProjects.length === 0 ? 'No saved projects yet' : 'No matching saved projects'}
                            </p>
                            {savedProjects.length === 0 && (
                                <div className="flex flex-wrap items-center justify-center gap-2">
                                    <button
                                        type="button"
                                        onClick={openCreateDialog}
                                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold cursor-pointer shadow-sm"
                                    >
                                        <Plus className="w-3.5 h-3.5" />
                                        <span>Create New Project</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setTplModalOpen(true)}
                                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold cursor-pointer"
                                    >
                                        <LayoutTemplate className="w-3.5 h-3.5 text-blue-500" />
                                        <span>Browse Templates</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="columns-2 sm:columns-3 md:columns-4 lg:columns-5 xl:columns-6 gap-3 px-1 pb-1">
                            {filteredProjects.map((project, projIdx) => {
                                const isRenaming = editingId === project.id;
                                const previews = Array.isArray(project.artboardPreviews)
                                    ? project.artboardPreviews.filter((p) => p?.thumbnail)
                                    : [];
                                const isMultiArtboard = previews.length > 1 || (project.artboardCount || 1) > 1;
                                const ratioW = Math.max(1, Number(project.width) || 1);
                                const ratioH = Math.max(1, Number(project.height) || 1);
                                const clampedRatio = Math.max(0.45, Math.min(2.2, ratioW / ratioH));
                                return (
                                    <div
                                        key={project.id}
                                        data-testid={`saved-project-card-${project.id}`}
                                        data-multi-artboard={isMultiArtboard ? 'true' : 'false'}
                                        className="break-inside-avoid mb-3 group"
                                    >
                                        <div
                                            style={{ aspectRatio: String(clampedRatio) }}
                                            className={`relative w-full rounded-xl overflow-hidden bg-[conic-gradient(#e2e8f0_90deg,#ffffff_90deg_180deg,#e2e8f0_180deg_270deg,#ffffff_270deg)] dark:bg-[conic-gradient(#1e293b_90deg,#0f172a_90deg_180deg,#1e293b_180deg_270deg,#0f172a_270deg)] [background-size:14px_14px] border shadow-xs group-hover:shadow-md group-hover:scale-[1.02] transition-all duration-200 ${
                                                isMultiArtboard
                                                    ? 'border-blue-500/45 ring-1 ring-blue-500/20 group-hover:border-blue-500'
                                                    : 'border-slate-200 dark:border-slate-800 group-hover:border-blue-500/70 dark:group-hover:border-blue-500/70'
                                            }`}
                                        >
                                            <button
                                                type="button"
                                                onClick={() => onOpenProject?.(project)}
                                                aria-label={`Open project ${project.title || 'Untitled Design'}`}
                                                className="w-full h-full block cursor-pointer focus:outline-none"
                                            >
                                                {previews.length > 1 ? (
                                                    <MultiArtboardCardMedia
                                                        previews={previews}
                                                        fallbackTitle={project.title || 'Untitled Design'}
                                                        staggerMs={(projIdx % 5) * 450}
                                                    />
                                                ) : project.thumbnail ? (
                                                    <img
                                                        src={project.thumbnail}
                                                        alt={project.title}
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex flex-col items-center justify-center gap-1 text-slate-400">
                                                        <Layers className="w-5 h-5 opacity-60" />
                                                        <span className="text-[10px] font-medium truncate max-w-[100px] px-1">
                                                            {project.title || 'Untitled'}
                                                        </span>
                                                    </div>
                                                )}
                                            </button>

                                            {isMultiArtboard && previews.length <= 1 && (
                                                <span className="absolute top-1.5 left-1.5 z-10 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-blue-600/90 text-white text-[9px] font-bold backdrop-blur-sm pointer-events-none">
                                                    <Frame className="w-2.5 h-2.5" />
                                                    {project.artboardCount} Artboards
                                                </span>
                                            )}
                                            {!isMultiArtboard && (project.pageCount || 1) > 1 && (
                                                <span
                                                    title={`${project.pageCount} pages`}
                                                    className="absolute top-1.5 left-1.5 z-10 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-slate-900/75 text-white text-[10px] font-bold backdrop-blur-sm pointer-events-none"
                                                >
                                                    <Layers className="w-2.5 h-2.5" />
                                                    {project.pageCount}
                                                </span>
                                            )}

                                            {/* Inside-Card User Action Icons */}
                                            <div className="absolute bottom-1.5 left-1.5 right-1.5 z-10 flex items-center justify-center opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 transition-all duration-200">
                                                <div className="inline-flex items-center gap-0.5 p-1 rounded-xl bg-slate-950/75 backdrop-blur-md border border-white/10 shadow-lg">
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            onOpenProject?.(project);
                                                        }}
                                                        data-tooltip="Open project"
                                                        aria-label="Open project"
                                                        className="w-6 h-6 rounded-lg bg-blue-600 hover:bg-blue-500 text-white inline-flex items-center justify-center cursor-pointer transition-colors"
                                                    >
                                                        <FolderOpen className="w-3 h-3" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setEditingId(project.id);
                                                            setEditingTitle(project.title || 'Untitled Design');
                                                        }}
                                                        data-tooltip="Rename project"
                                                        aria-label="Rename project"
                                                        className="w-6 h-6 rounded-lg hover:bg-white/15 text-white/85 hover:text-white inline-flex items-center justify-center cursor-pointer transition-colors"
                                                    >
                                                        <Pencil className="w-3 h-3" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            onDuplicateProject?.(project.id);
                                                        }}
                                                        data-tooltip="Duplicate project"
                                                        aria-label="Duplicate project"
                                                        className="w-6 h-6 rounded-lg hover:bg-white/15 text-white/85 hover:text-white inline-flex items-center justify-center cursor-pointer transition-colors"
                                                    >
                                                        <Copy className="w-3 h-3" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            onDeleteProject?.(project);
                                                        }}
                                                        data-tooltip="Delete project"
                                                        aria-label="Delete project"
                                                        className="w-6 h-6 rounded-lg hover:bg-rose-500/30 text-rose-400 hover:text-rose-300 inline-flex items-center justify-center cursor-pointer transition-colors"
                                                    >
                                                        <Trash2 className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Below-Card Metadata */}
                                        <div className="mt-1.5 px-0.5">
                                            {isRenaming ? (
                                                <div className="flex items-center gap-1">
                                                    <input
                                                        type="text"
                                                        autoFocus
                                                        value={editingTitle}
                                                        onChange={(e) => setEditingTitle(e.target.value)}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') {
                                                                e.preventDefault();
                                                                commitRename(project.id);
                                                            } else if (e.key === 'Escape') {
                                                                setEditingId(null);
                                                            }
                                                        }}
                                                        className="flex-1 min-w-0 px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-950 border border-blue-500 text-xs font-bold text-slate-900 dark:text-white focus:outline-none"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => commitRename(project.id)}
                                                        aria-label="Save project name"
                                                        className="p-1 rounded-lg bg-blue-600 text-white cursor-pointer"
                                                    >
                                                        <Check className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setEditingId(null)}
                                                        aria-label="Cancel rename"
                                                        className="p-1 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 cursor-pointer"
                                                    >
                                                        <X className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="flex items-center justify-between gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => onOpenProject?.(project)}
                                                        className="min-w-0 text-left text-[11px] font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 truncate cursor-pointer transition-colors"
                                                    >
                                                        {project.title || 'Untitled Design'}
                                                    </button>
                                                    <span className="inline-flex items-center gap-0.5 text-[10px] text-slate-400 shrink-0">
                                                        <Clock className="w-2.5 h-2.5" />
                                                        {formatRelativeTime(project.updatedAt || project.savedAt)}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </section>

            {/* Modal 1: Start From a Template */}
            {tplModalPresence.rendered &&
                typeof document !== 'undefined' &&
                createPortal(
                    <div
                        data-testid="home-templates-modal"
                        role="dialog"
                        aria-modal="true"
                        aria-label="Start From a Template"
                        onClick={() => setTplModalOpen(false)}
                        className={`fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm transition-opacity duration-200 ${
                            tplModalPresence.visible ? 'opacity-100' : 'opacity-0 pointer-events-none'
                        }`}
                    >
                        <div
                            onClick={(e) => e.stopPropagation()}
                            className={`w-full max-w-4xl max-h-[85vh] rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 shadow-2xl p-5 flex flex-col text-slate-900 dark:text-slate-100 ${EDITOR_PANEL_TRANSITION} ${
                                tplModalPresence.visible
                                    ? 'opacity-100 scale-100 translate-y-0'
                                    : 'opacity-0 scale-95 translate-y-2'
                            }`}
                        >
                            {/* Modal Header with Search + Filter Button */}
                            <div className="shrink-0 flex flex-wrap items-center justify-between gap-3 pb-3.5 border-b border-slate-200 dark:border-slate-800">
                                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    <LayoutTemplate className="w-4 h-4 text-blue-500" />
                                    <span>Start From a Template</span>
                                    <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[11px] font-bold text-slate-600 dark:text-slate-300">
                                        {filteredTemplates.length}
                                    </span>
                                </h3>

                                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                                    <div ref={tplSearchWrapRef} className="relative flex-1 sm:w-64">
                                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                                        <input
                                            type="text"
                                            data-testid="home-template-search"
                                            value={tplSearch}
                                            onChange={(e) => setTplSearch(e.target.value)}
                                            placeholder="Search templates..."
                                            className="w-full pl-8 pr-9 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-blue-500"
                                        />
                                        <button
                                            type="button"
                                            data-testid="home-templates-filter-button"
                                            aria-label="Filter templates"
                                            aria-expanded={tplFiltersOpen}
                                            data-tooltip="Filter templates"
                                            onClick={() => {
                                                setOpenTplMenu(null);
                                                setTplFiltersOpen((o) => !o);
                                            }}
                                            className={`absolute right-1.5 top-1/2 -translate-y-1/2 p-1 rounded-lg transition-colors cursor-pointer ${
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

                                    <button
                                        type="button"
                                        onClick={() => setTplModalOpen(false)}
                                        aria-label="Close templates dialog"
                                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer shrink-0"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            {/* Modal Body: Proportional Masonry Grid */}
                            <div className="flex-1 min-h-0 overflow-y-auto pt-3.5 pr-1">
                                {tplLoading ? (
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                                        {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                                            <div
                                                key={n}
                                                className="aspect-square rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 animate-pulse"
                                            />
                                        ))}
                                    </div>
                                ) : filteredTemplates.length === 0 ? (
                                    <div className="min-h-[220px] rounded-2xl bg-slate-50/70 dark:bg-slate-950/60 border border-dashed border-slate-300 dark:border-slate-800 p-6 flex flex-col items-center justify-center text-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                                        <div>No templates found matching your filters.</div>
                                        {activeTplFilterCount > 0 && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setTplCategory('');
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
                                    <div className="columns-2 sm:columns-3 md:columns-4 gap-3 px-1 pb-1">
                                        {filteredTemplates.map((tpl) => {
                                            const ratioW = Math.max(1, Number(tpl.width) || 1);
                                            const ratioH = Math.max(1, Number(tpl.height) || 1);
                                            const clampedRatio = Math.max(0.45, Math.min(2.2, ratioW / ratioH));
                                            const isFav = favTemplateIdSet.has(tpl.id);
                                            const isMenuOpen = openTplMenu?.tpl?.id === tpl.id;
                                            return (
                                                <div
                                                    key={tpl.id}
                                                    data-testid={`home-template-card-${tpl.id}`}
                                                    style={{ aspectRatio: String(clampedRatio) }}
                                                    className="break-inside-avoid mb-3 group relative w-full rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 hover:border-blue-500/70 dark:hover:border-blue-500/70 overflow-hidden shadow-xs hover:shadow-md hover:scale-[1.02] transition-all duration-200"
                                                >
                                                    <button
                                                        type="button"
                                                        data-testid={`home-template-apply-${tpl.id}`}
                                                        onClick={() => {
                                                            setTplModalOpen(false);
                                                            onApplyTemplate?.(tpl);
                                                        }}
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
                                                        data-testid={`home-template-fav-${tpl.id}`}
                                                        aria-label={isFav ? `Remove ${tpl.title} from favorites` : `Add ${tpl.title} to favorites`}
                                                        aria-pressed={isFav}
                                                        data-tooltip={isFav ? 'Remove from Favorites' : 'Add to Favorites'}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            toggleFavoriteTemplate(tpl.id);
                                                        }}
                                                        className={`absolute top-1.5 left-1.5 z-10 w-6 h-6 rounded-lg flex items-center justify-center backdrop-blur-md transition-all duration-200 cursor-pointer ${
                                                            isFav
                                                                ? 'bg-amber-500/95 text-white opacity-100 shadow-sm'
                                                                : 'bg-slate-950/60 hover:bg-slate-950/80 text-white/90 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100'
                                                        }`}
                                                    >
                                                        <Star className={`w-3.5 h-3.5 ${isFav ? 'fill-current' : ''}`} />
                                                    </button>

                                                    {/* Top-Right 3-Dot Info Menu */}
                                                    <button
                                                        type="button"
                                                        data-template-more-btn="true"
                                                        data-testid={`home-template-more-${tpl.id}`}
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
                                                        className={`absolute top-1.5 right-1.5 z-10 w-6 h-6 rounded-lg flex items-center justify-center backdrop-blur-md transition-all duration-200 cursor-pointer ${
                                                            isMenuOpen
                                                                ? 'bg-blue-600 text-white shadow-sm opacity-100'
                                                                : 'bg-slate-950/60 hover:bg-slate-950/80 text-white/90 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100'
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
                        </div>
                    </div>,
                    document.body
                )}

            {/* Portal: Templates Filter Popover (Sibling so clicks don't bubble into modal) */}
            {typeof document !== 'undefined' &&
                createPortal(
                    (() => {
                        if (tplFiltersOpen && tplSearchWrapRef.current) {
                            const rect = tplSearchWrapRef.current.getBoundingClientRect();
                            const panelW = Math.min(288, window.innerWidth - 20);
                            lastFilterPosRef.current = {
                                width: panelW,
                                left: Math.max(10, Math.min(window.innerWidth - panelW - 10, rect.right - panelW)),
                                top: Math.max(10, Math.min(window.innerHeight - 310, rect.bottom + 8)),
                            };
                        }
                        const { top, left, width } = lastFilterPosRef.current;
                        return (
                            <AnimatedPopover
                                ref={tplFilterPanelRef}
                                open={tplFiltersOpen}
                                originClass="origin-top-right"
                                data-testid="home-templates-filter-panel"
                                onPointerDown={(e) => e.stopPropagation()}
                                style={{ top: `${top}px`, left: `${left}px`, width: `${width}px` }}
                                className="fixed z-[120] rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xl p-3.5 text-xs text-slate-800 dark:text-slate-100 space-y-3 select-none"
                            >
                                <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                        Filter Templates
                                    </span>
                                    {activeTplFilterCount > 0 && (
                                        <button
                                            type="button"
                                            data-testid="home-templates-filter-reset"
                                            onClick={() => {
                                                setTplCategory('');
                                                setTplOrientation('all');
                                                setTplFavOnly(false);
                                            }}
                                            className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                                        >
                                            Reset
                                        </button>
                                    )}
                                </div>

                                <button
                                    type="button"
                                    data-testid="home-templates-filter-favorites"
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

                                {templateCategories.length > 0 && (
                                    <div className="space-y-1.5">
                                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                                            Category
                                        </div>
                                        <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pr-0.5">
                                            <button
                                                type="button"
                                                onClick={() => setTplCategory('')}
                                                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold cursor-pointer transition-colors ${
                                                    !tplCategory
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
                                                    onClick={() => setTplCategory(c.id)}
                                                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold cursor-pointer transition-colors ${
                                                        tplCategory === c.id
                                                            ? 'bg-blue-600 text-white'
                                                            : 'bg-slate-100 dark:bg-slate-950 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'
                                                    }`}
                                                >
                                                    {c.name}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

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

            {/* Template 3-Dot Info & Keywords Popover */}
            <TemplateInfoPopover
                openMenu={openTplMenu}
                onClose={() => setOpenTplMenu(null)}
                testId="home-template-info-popover"
            />

            {/* Modal 2: Create New Project Popup Modal */}
            {createModalPresence.rendered &&
                typeof document !== 'undefined' &&
                createPortal(
                    <div
                        data-testid="home-create-project-modal"
                        role="dialog"
                        aria-modal="true"
                        aria-label="Create New Project"
                        onClick={() => setCreateModalOpen(false)}
                        className={`fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm transition-opacity duration-200 ${
                            createModalPresence.visible ? 'opacity-100' : 'opacity-0 pointer-events-none'
                        }`}
                    >
                        <form
                            onSubmit={handleCreateCustom}
                            onClick={(e) => e.stopPropagation()}
                            data-testid="home-custom-size-form"
                            className={`w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 shadow-2xl p-5 space-y-4 text-slate-900 dark:text-slate-100 ${EDITOR_PANEL_TRANSITION} ${
                                createModalPresence.visible
                                    ? 'opacity-100 scale-100 translate-y-0'
                                    : 'opacity-0 scale-95 translate-y-2'
                            }`}
                        >
                            <div className="flex items-center justify-between pb-2.5 border-b border-slate-200 dark:border-slate-800">
                                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    <Plus className="w-4 h-4 text-blue-500" />
                                    <span>Create New Project</span>
                                </h3>
                                <button
                                    type="button"
                                    onClick={() => setCreateModalOpen(false)}
                                    aria-label="Close create project dialog"
                                    className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Social & Standard Sizes */}
                            <div className="space-y-2">
                                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                    Standard &amp; Social Media Sizes
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                    {quickPresets.map((preset) => (
                                        <button
                                            key={preset.id}
                                            type="button"
                                            data-testid={`create-preset-${preset.id}`}
                                            onClick={() => {
                                                setCreateModalOpen(false);
                                                onCreateProject?.({
                                                    title: preset.name,
                                                    width: preset.width,
                                                    height: preset.height,
                                                    transparent: customTransparent,
                                                    presetLabel: preset.name,
                                                });
                                            }}
                                            className="group p-2.5 rounded-xl bg-slate-50 hover:bg-blue-50/80 dark:bg-slate-950/70 dark:hover:bg-blue-950/40 border border-slate-200 hover:border-blue-400/70 dark:border-slate-800 dark:hover:border-blue-500/70 text-left cursor-pointer transition-all"
                                        >
                                            <div className="text-xs font-bold text-slate-800 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 truncate">
                                                {preset.name}
                                            </div>
                                            <div className="mt-0.5 flex items-center justify-between text-[10px] text-slate-400">
                                                <span className="truncate">{preset.groupName || 'Canvas'}</span>
                                                <span className="font-mono font-semibold text-blue-600 dark:text-blue-400 shrink-0">
                                                    {preset.width}×{preset.height}
                                                </span>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Custom Size */}
                            <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-3">
                                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                                    <SlidersHorizontal className="w-3 h-3 text-blue-500" />
                                    <span>Custom Canvas</span>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                                        Project Name
                                    </label>
                                    <input
                                        type="text"
                                        value={customTitle}
                                        onChange={(e) => setCustomTitle(e.target.value)}
                                        placeholder="Untitled Design"
                                        className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                                            Width (px)
                                        </label>
                                        <input
                                            type="number"
                                            min={32}
                                            max={maxWidth}
                                            value={customW}
                                            onChange={(e) => setCustomW(Number(e.target.value))}
                                            className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                                            Height (px)
                                        </label>
                                        <input
                                            type="number"
                                            min={32}
                                            max={maxHeight}
                                            value={customH}
                                            onChange={(e) => setCustomH(Number(e.target.value))}
                                            className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                                        />
                                    </div>
                                </div>

                                <label className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-semibold cursor-pointer">
                                    <span>Transparent background</span>
                                    <input
                                        type="checkbox"
                                        checked={customTransparent}
                                        onChange={(e) => setCustomTransparent(e.target.checked)}
                                        className="studio-checkbox"
                                    />
                                </label>
                            </div>

                            {/* Modal Footer: Load JSON + Cancel / Create */}
                            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                                <button
                                    type="button"
                                    data-testid="home-import-json-btn"
                                    onClick={() => {
                                        setCreateModalOpen(false);
                                        jsonInputRef.current?.click();
                                    }}
                                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer transition-colors"
                                >
                                    <Upload className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                                    <span>Load JSON</span>
                                </button>

                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setCreateModalOpen(false)}
                                        className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-semibold cursor-pointer"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        data-testid="home-create-submit-btn"
                                        className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-600/25 cursor-pointer"
                                    >
                                        Start Designing
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>,
                    document.body
                )}
        </main>
    );
}
