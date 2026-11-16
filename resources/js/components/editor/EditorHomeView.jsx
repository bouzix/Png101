import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
    Plus,
    FolderOpen,
    Sparkles,
    Search,
    Upload,
    Trash2,
    Copy,
    Pencil,
    Check,
    X,
    Maximize2,
    Clock,
    Layers,
    Flame,
    Star,
    SlidersHorizontal,
} from 'lucide-react';
import { EDITOR_PANEL_TRANSITION, useAnimatedPresence } from './useAnimatedPresence';

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

    const [customOpen, setCustomOpen] = useState(false);
    const customPresence = useAnimatedPresence(customOpen, 240);
    const [customTitle, setCustomTitle] = useState('');
    const [customW, setCustomW] = useState(defaultWidth);
    const [customH, setCustomH] = useState(defaultHeight);
    const [customTransparent, setCustomTransparent] = useState(defaultTransparent);

    const [templates, setTemplates] = useState([]);
    const [tplLoading, setTplLoading] = useState(true);
    const [tplSearch, setTplSearch] = useState('');
    const [tplCategory, setTplCategory] = useState('');

    const jsonInputRef = useRef(null);

    useEffect(() => {
        if (!customOpen) return undefined;
        const onEsc = (e) => {
            if (e.key === 'Escape') setCustomOpen(false);
        };
        window.addEventListener('keydown', onEsc);
        return () => window.removeEventListener('keydown', onEsc);
    }, [customOpen]);

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

    const filteredProjects = useMemo(() => {
        const q = projectSearch.trim().toLowerCase();
        if (!q) return savedProjects;
        return savedProjects.filter((p) => (p.title || '').toLowerCase().includes(q));
    }, [savedProjects, projectSearch]);

    const quickPresets = useMemo(() => {
        if (canvasPresets.length > 0) return canvasPresets.slice(0, 6);
        return [
            { id: 'sq', name: 'Square Canvas', groupName: 'Social', width: 1080, height: 1080 },
            { id: 'yt', name: 'YouTube Thumb', groupName: 'Video', width: 1280, height: 720 },
            { id: 'story', name: 'Story / Reel', groupName: 'Social', width: 1080, height: 1920 },
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
        setCustomOpen(false);
        onCreateProject?.({
            title: customTitle.trim() || 'Untitled Design',
            width: w,
            height: h,
            transparent: customTransparent,
            presetLabel: `${w}×${h}`,
        });
    };

    return (
        <main
            data-testid="editor-home-view"
            className="flex-1 min-h-0 w-full overflow-hidden flex flex-col lg:flex-row gap-4 p-4 sm:p-5 bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors"
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

            {/* LEFT COLUMN: Create New Project + Saved Projects */}
            <div className="lg:w-[57%] xl:w-[59%] min-w-0 flex-1 lg:flex-initial min-h-0 flex flex-col gap-4">
                {/* Compact Create New & Quick Start Bar */}
                <section className="shrink-0 relative overflow-hidden rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-sm p-4">
                    <div className="pointer-events-none absolute -top-20 -right-20 w-56 h-56 rounded-full bg-blue-500/10 blur-3xl" />

                    <div className="relative flex flex-wrap items-center justify-between gap-3">
                        <div className="min-w-0">
                            <div className="flex items-center gap-2">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-600/10 text-blue-600 dark:text-blue-400 text-[10px] font-bold uppercase tracking-wider">
                                    <Sparkles className="w-3 h-3" />
                                    Studio
                                </span>
                                <h1 className="text-base sm:text-lg font-extrabold tracking-tight text-slate-900 dark:text-white truncate">
                                    Create New Design
                                </h1>
                            </div>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                                Start a blank artboard, choose a preset size, or resume a saved project below.
                            </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 shrink-0">
                            <button
                                type="button"
                                data-testid="home-create-project-btn"
                                onClick={() =>
                                    onCreateProject?.({
                                        title: 'Untitled Design',
                                        width: defaultWidth,
                                        height: defaultHeight,
                                        transparent: defaultTransparent,
                                        presetLabel: `${defaultWidth}×${defaultHeight}`,
                                    })
                                }
                                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-600/25 cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.99]"
                            >
                                <Plus className="w-4 h-4" />
                                <span>Create New Project</span>
                            </button>

                            <button
                                type="button"
                                data-testid="home-custom-size-btn"
                                onClick={() => setCustomOpen(true)}
                                aria-expanded={customOpen}
                                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-950 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer transition-colors"
                            >
                                <SlidersHorizontal className="w-3.5 h-3.5 text-blue-500" />
                                <span>Custom Size</span>
                            </button>

                            <button
                                type="button"
                                data-testid="home-import-json-btn"
                                onClick={() => jsonInputRef.current?.click()}
                                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-950 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer transition-colors"
                            >
                                <Upload className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                                <span>Load JSON</span>
                            </button>
                        </div>
                    </div>

                    {/* Quick Start Sizes */}
                    <div className="mt-3 pt-3 border-t border-slate-200/80 dark:border-slate-800/90">
                        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-2">
                            {quickPresets.map((preset) => (
                                <button
                                    key={preset.id}
                                    type="button"
                                    onClick={() =>
                                        onCreateProject?.({
                                            title: preset.name,
                                            width: preset.width,
                                            height: preset.height,
                                            transparent: defaultTransparent,
                                            presetLabel: preset.name,
                                        })
                                    }
                                    className="group px-2.5 py-2 rounded-xl bg-slate-50 hover:bg-blue-50/70 dark:bg-slate-950/70 dark:hover:bg-blue-950/30 border border-slate-200 hover:border-blue-400/70 dark:border-slate-800 dark:hover:border-blue-600/60 text-left cursor-pointer transition-all"
                                >
                                    <div className="text-[11px] font-bold text-slate-800 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 truncate">
                                        {preset.name}
                                    </div>
                                    <div className="mt-0.5 flex items-center justify-between text-[10px] text-slate-400">
                                        <span className="inline-flex items-center gap-1 truncate pr-1">
                                            <Maximize2 className="w-2.5 h-2.5 text-blue-500/80 shrink-0" />
                                            <span className="truncate">{preset.groupName || 'Canvas'}</span>
                                        </span>
                                        <span className="font-mono font-semibold text-blue-600 dark:text-blue-400 shrink-0">
                                            {preset.width}×{preset.height}
                                        </span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Saved Projects Panel (Scrolls Internally Inside Column) */}
                <section
                    data-testid="home-saved-projects"
                    className="flex-1 min-h-0 flex flex-col rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-sm p-4"
                >
                    <div className="shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-slate-100 dark:border-slate-800/90">
                        <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-xl bg-blue-600/12 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                                <FolderOpen className="w-4 h-4" />
                            </div>
                            <div>
                                <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    <span>Saved Projects</span>
                                    <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[11px] font-bold text-slate-600 dark:text-slate-300">
                                        {savedProjects.length}
                                    </span>
                                </h2>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                    Pick up right where you left off
                                </p>
                            </div>
                        </div>

                        {savedProjects.length > 0 && (
                            <div className="relative w-full sm:w-56">
                                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                <input
                                    type="text"
                                    value={projectSearch}
                                    onChange={(e) => setProjectSearch(e.target.value)}
                                    placeholder="Filter saved projects..."
                                    className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
                                />
                            </div>
                        )}
                    </div>

                    <div className="flex-1 min-h-0 overflow-y-auto pt-3 pr-1">
                        {projectsLoading ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                                {[1, 2, 3].map((n) => (
                                    <div
                                        key={n}
                                        className="h-48 rounded-2xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 animate-pulse"
                                    />
                                ))}
                            </div>
                        ) : filteredProjects.length === 0 ? (
                            <div className="h-full min-h-[180px] rounded-2xl bg-slate-50/70 dark:bg-slate-950/60 border border-dashed border-slate-300 dark:border-slate-800 p-6 flex flex-col items-center justify-center text-center gap-2.5">
                                <div className="w-10 h-10 rounded-2xl bg-blue-600/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                                    <FolderOpen className="w-5 h-5" />
                                </div>
                                <div className="space-y-1">
                                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                                        {savedProjects.length === 0 ? 'No saved projects yet' : 'No matching saved projects'}
                                    </h3>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm">
                                        {savedProjects.length === 0
                                            ? 'Create a blank project or choose a popular template in the right column to get started.'
                                            : 'Try clearing your search query or creating a new design.'}
                                    </p>
                                </div>
                                {savedProjects.length === 0 && (
                                    <button
                                        type="button"
                                        onClick={() =>
                                            onCreateProject?.({
                                                title: 'Untitled Design',
                                                width: defaultWidth,
                                                height: defaultHeight,
                                                transparent: defaultTransparent,
                                                presetLabel: `${defaultWidth}×${defaultHeight}`,
                                            })
                                        }
                                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold cursor-pointer shadow-md shadow-blue-600/20"
                                    >
                                        <Plus className="w-3.5 h-3.5" />
                                        <span>Create Your First Project</span>
                                    </button>
                                )}
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 pb-1">
                                {filteredProjects.map((project) => {
                                    const isRenaming = editingId === project.id;
                                    return (
                                        <div
                                            key={project.id}
                                            data-testid={`saved-project-card-${project.id}`}
                                            className="group rounded-2xl bg-slate-50/70 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 hover:border-blue-500/60 dark:hover:border-blue-500/60 overflow-hidden shadow-sm hover:shadow-lg hover:shadow-blue-600/5 transition-all flex flex-col"
                                        >
                                            <button
                                                type="button"
                                                onClick={() => onOpenProject?.(project)}
                                                className="relative aspect-[16/10] w-full overflow-hidden bg-[conic-gradient(#e2e8f0_90deg,#ffffff_90deg_180deg,#e2e8f0_180deg_270deg,#ffffff_270deg)] dark:bg-[conic-gradient(#1e293b_90deg,#0f172a_90deg_180deg,#1e293b_180deg_270deg,#0f172a_270deg)] [background-size:16px_16px] cursor-pointer flex items-center justify-center p-2"
                                            >
                                                {project.thumbnail ? (
                                                    <img
                                                        src={project.thumbnail}
                                                        alt={project.title}
                                                        className="max-w-full max-h-full object-contain drop-shadow-md transition-transform duration-200 group-hover:scale-[1.03]"
                                                    />
                                                ) : (
                                                    <div className="flex flex-col items-center gap-1 text-slate-400">
                                                        <Layers className="w-6 h-6 opacity-60" />
                                                        <span className="text-[10px] font-semibold">
                                                            {project.width}×{project.height}
                                                        </span>
                                                    </div>
                                                )}

                                                <span className="absolute top-2 left-2 px-2 py-0.5 rounded-lg bg-slate-900/75 text-white text-[10px] font-mono backdrop-blur-sm">
                                                    {project.width}×{project.height}
                                                </span>
                                                {(project.pageCount || 1) > 1 && (
                                                    <span className="absolute top-2 right-2 px-2 py-0.5 rounded-lg bg-blue-600/90 text-white text-[10px] font-bold">
                                                        {project.pageCount} pages
                                                    </span>
                                                )}
                                            </button>

                                            <div className="p-2.5 flex-1 flex flex-col justify-between gap-2 border-t border-slate-200/80 dark:border-slate-800/90 bg-white dark:bg-slate-900/90">
                                                <div>
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
                                                        <div className="flex items-start justify-between gap-2">
                                                            <button
                                                                type="button"
                                                                onClick={() => onOpenProject?.(project)}
                                                                className="text-left text-xs font-bold text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 truncate cursor-pointer"
                                                            >
                                                                {project.title || 'Untitled Design'}
                                                            </button>
                                                            <span className="inline-flex items-center gap-1 text-[10px] text-slate-400 shrink-0 mt-0.5">
                                                                <Clock className="w-2.5 h-2.5" />
                                                                {formatRelativeTime(project.updatedAt || project.savedAt)}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="flex items-center justify-between gap-1 pt-0.5">
                                                    <button
                                                        type="button"
                                                        onClick={() => onOpenProject?.(project)}
                                                        className="flex-1 py-1.5 px-2 rounded-lg bg-blue-600/12 hover:bg-blue-600 text-blue-600 dark:text-blue-400 hover:text-white text-[11px] font-bold cursor-pointer transition-colors"
                                                    >
                                                        Open Project
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setEditingId(project.id);
                                                            setEditingTitle(project.title || 'Untitled Design');
                                                        }}
                                                        data-tooltip="Rename project"
                                                        aria-label="Rename project"
                                                        className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 cursor-pointer transition-colors"
                                                    >
                                                        <Pencil className="w-3 h-3" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => onDuplicateProject?.(project.id)}
                                                        data-tooltip="Duplicate project"
                                                        aria-label="Duplicate project"
                                                        className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 cursor-pointer transition-colors"
                                                    >
                                                        <Copy className="w-3 h-3" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => onDeleteProject?.(project)}
                                                        data-tooltip="Delete project"
                                                        aria-label="Delete project"
                                                        className="p-1.5 rounded-lg bg-slate-100 hover:bg-rose-500/15 dark:bg-slate-800 dark:hover:bg-rose-500/20 text-slate-500 hover:text-rose-500 cursor-pointer transition-colors"
                                                    >
                                                        <Trash2 className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </section>
            </div>

            {/* RIGHT COLUMN: Popular Templates & Template Search */}
            <section
                data-testid="home-popular-templates"
                className="lg:w-[43%] xl:w-[41%] min-w-0 flex-1 min-h-0 flex flex-col rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-sm p-4"
            >
                <div className="shrink-0 space-y-2.5 pb-3 border-b border-slate-100 dark:border-slate-800/90">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-xl bg-blue-600/12 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                                <Flame className="w-4 h-4" />
                            </div>
                            <div>
                                <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    <span>Popular Templates</span>
                                    <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[11px] font-bold text-slate-600 dark:text-slate-300">
                                        {templates.length}
                                    </span>
                                </h2>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                    Browse &amp; search ready-made designs
                                </p>
                            </div>
                        </div>

                        <div className="relative w-full sm:w-52">
                            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                                type="text"
                                data-testid="home-template-search"
                                value={tplSearch}
                                onChange={(e) => setTplSearch(e.target.value)}
                                placeholder="Search templates..."
                                className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
                            />
                        </div>
                    </div>

                    {templateCategories.length > 0 && (
                        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
                            <button
                                type="button"
                                onClick={() => setTplCategory('')}
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer shrink-0 transition-colors ${
                                    !tplCategory
                                        ? 'bg-blue-600 text-white shadow-sm'
                                        : 'bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                                }`}
                            >
                                All Templates
                            </button>
                            {templateCategories.map((cat) => (
                                <button
                                    key={cat.id}
                                    type="button"
                                    onClick={() => setTplCategory(cat.id)}
                                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer shrink-0 transition-colors ${
                                        tplCategory === cat.id
                                            ? 'bg-blue-600 text-white shadow-sm'
                                            : 'bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                                    }`}
                                >
                                    {cat.name}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <div className="flex-1 min-h-0 overflow-y-auto pt-3 pr-1">
                    {tplLoading ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {[1, 2, 3, 4].map((n) => (
                                <div
                                    key={n}
                                    className="h-48 rounded-2xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 animate-pulse"
                                />
                            ))}
                        </div>
                    ) : templates.length === 0 ? (
                        <div className="h-full min-h-[180px] rounded-2xl bg-slate-50/70 dark:bg-slate-950/60 border border-dashed border-slate-300 dark:border-slate-800 p-6 flex items-center justify-center text-center text-xs text-slate-500 dark:text-slate-400">
                            No templates found matching your search.
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-1">
                            {templates.map((tpl) => (
                                <button
                                    key={tpl.id}
                                    type="button"
                                    data-testid={`home-template-card-${tpl.id}`}
                                    onClick={() => onApplyTemplate?.(tpl)}
                                    className="group text-left rounded-2xl bg-slate-50/70 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 hover:border-blue-500/70 dark:hover:border-blue-500/70 overflow-hidden shadow-sm hover:shadow-lg hover:shadow-blue-600/5 cursor-pointer transition-all flex flex-col"
                                >
                                    <div className="relative aspect-[16/10] w-full bg-slate-100 dark:bg-slate-950 overflow-hidden flex items-center justify-center p-2">
                                        {tpl.thumbnailPath ? (
                                            <img
                                                src={tpl.thumbnailPath}
                                                alt={tpl.title}
                                                className="w-full h-full object-cover rounded-xl transition-transform duration-200 group-hover:scale-[1.03]"
                                            />
                                        ) : (
                                            <div className="flex flex-col items-center gap-1 text-slate-400">
                                                <Sparkles className="w-5 h-5 text-blue-500/70" />
                                                <span className="text-[10px] font-semibold">
                                                    {tpl.presetLabel || `${tpl.width}×${tpl.height}`}
                                                </span>
                                            </div>
                                        )}

                                        {tpl.isFeatured && (
                                            <span className="absolute top-2 left-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-500/90 text-white text-[10px] font-bold shadow">
                                                <Star className="w-2.5 h-2.5 fill-current" />
                                                Featured
                                            </span>
                                        )}
                                        <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded-lg bg-slate-900/75 text-white text-[10px] font-mono backdrop-blur-sm">
                                            {tpl.width}×{tpl.height}
                                        </span>
                                    </div>

                                    <div className="p-2.5 space-y-1 flex-1 flex flex-col justify-between bg-white dark:bg-slate-900/90 border-t border-slate-200/80 dark:border-slate-800/90">
                                        <div>
                                            <div className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 truncate">
                                                {tpl.title}
                                            </div>
                                            {tpl.description && (
                                                <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                                                    {tpl.description}
                                                </p>
                                            )}
                                        </div>

                                        <div className="flex items-center justify-between pt-1 text-[10px] text-slate-400">
                                            <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold truncate max-w-[58%]">
                                                {tpl.categoryName || 'Template'}
                                            </span>
                                            <span className="font-semibold text-blue-600 dark:text-blue-400 group-hover:underline">
                                                Use &rarr;
                                            </span>
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </section>

            {/* Custom Size Modal (keeps home dashboard strictly fixed & non-scrolling) */}
            {customPresence.rendered &&
                typeof document !== 'undefined' &&
                createPortal(
                    <div
                        data-testid="home-custom-size-modal"
                        role="dialog"
                        aria-modal="true"
                        aria-label="Custom Canvas Size"
                        onClick={() => setCustomOpen(false)}
                        className={`fixed inset-0 z-[115] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm transition-opacity duration-200 ${
                            customPresence.visible ? 'opacity-100' : 'opacity-0 pointer-events-none'
                        }`}
                    >
                        <form
                            onSubmit={handleCreateCustom}
                            onClick={(e) => e.stopPropagation()}
                            data-testid="home-custom-size-form"
                            className={`w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 shadow-2xl p-5 space-y-4 text-slate-900 dark:text-slate-100 ${EDITOR_PANEL_TRANSITION} ${
                                customPresence.visible
                                    ? 'opacity-100 scale-100 translate-y-0'
                                    : 'opacity-0 scale-95 translate-y-2'
                            }`}
                        >
                            <div className="flex items-center justify-between pb-2.5 border-b border-slate-200 dark:border-slate-800">
                                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    <SlidersHorizontal className="w-4 h-4 text-blue-500" />
                                    Create Custom Canvas
                                </h3>
                                <button
                                    type="button"
                                    onClick={() => setCustomOpen(false)}
                                    aria-label="Close custom size dialog"
                                    className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                                >
                                    <X className="w-4 h-4" />
                                </button>
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

                            <div className="flex items-center justify-end gap-2 pt-1">
                                <button
                                    type="button"
                                    onClick={() => setCustomOpen(false)}
                                    className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-semibold cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-600/25 cursor-pointer"
                                >
                                    Start Designing
                                </button>
                            </div>
                        </form>
                    </div>,
                    document.body
                )}
        </main>
    );
}
