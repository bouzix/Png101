import React, { useState, useMemo, useRef } from 'react';
import { Head } from '@inertiajs/react';
import {
    Plus,
    Search,
    Star,
    Copy,
    Trash2,
    Paintbrush,
    Download,
    Upload,
    Eye,
    LayoutTemplate,
    CheckCircle2,
    Clock,
    Archive,
} from 'lucide-react';
import { toast } from 'sonner';
import StudioSelect from '@/components/ui/StudioSelect';
import AdminLayout from '../../../Layouts/AdminLayout';
import { GlassCard } from '../../../components/ui/GlassCard';
import ConfirmDialog from '@/components/admin/ConfirmDialog';

export default function EditorTemplatesAdmin({
    initialTemplates = [],
    categories = [],
}) {
    const [templates, setTemplates] = useState(initialTemplates);
    const [searchQuery, setSearchQuery] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');
    const [busyId, setBusyId] = useState(null);
    const [pendingDeleteTpl, setPendingDeleteTpl] = useState(null);
    const importInputRef = useRef(null);

    const filtered = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        return templates.filter((t) => {
            if (categoryFilter !== 'all' && t.categoryId !== categoryFilter) return false;
            if (statusFilter !== 'all' && t.status !== statusFilter) return false;
            if (!q) return true;
            return (
                t.title?.toLowerCase().includes(q) ||
                t.description?.toLowerCase().includes(q) ||
                t.presetLabel?.toLowerCase().includes(q) ||
                (Array.isArray(t.tags) && t.tags.some((tag) => tag.toLowerCase().includes(q)))
            );
        });
    }, [templates, searchQuery, categoryFilter, statusFilter]);

    const patchTemplate = async (id, payload, successMsg) => {
        setBusyId(id);
        try {
            const res = await fetch(`/api/admin/editor/templates/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Update failed');
            setTemplates((prev) => prev.map((item) => (item.id === id ? data.template : item)));
            if (successMsg) toast.success(successMsg);
        } catch (err) {
            toast.error(err.message || 'Could not update template');
        } finally {
            setBusyId(null);
        }
    };

    const handleDuplicate = async (id) => {
        setBusyId(id);
        try {
            const res = await fetch(`/api/admin/editor/templates/${id}/duplicate`, { method: 'POST' });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Duplicate failed');
            setTemplates((prev) => [data.template, ...prev]);
            toast.success('Template duplicated as Draft');
        } catch (err) {
            toast.error(err.message);
        } finally {
            setBusyId(null);
        }
    };

    const handleDelete = (tpl) => {
        setPendingDeleteTpl(tpl);
    };

    const confirmDeleteTemplate = async () => {
        if (!pendingDeleteTpl) return;
        const tpl = pendingDeleteTpl;
        setBusyId(tpl.id);
        try {
            const res = await fetch(`/api/admin/editor/templates/${tpl.id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Delete failed');
            setTemplates((prev) => prev.filter((item) => item.id !== tpl.id));
            toast.success('Template deleted');
        } catch (err) {
            toast.error(err.message);
        } finally {
            setBusyId(null);
        }
    };

    const handleExportJson = (tpl) => {
        const blob = new Blob([JSON.stringify(tpl, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${tpl.slug || 'template'}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleImportJsonFile = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            const text = await file.text();
            const parsed = JSON.parse(text);
            const res = await fetch('/api/admin/editor/templates', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: parsed.title ? `${parsed.title} (Imported)` : 'Imported Template',
                    description: parsed.description || '',
                    categoryId: parsed.categoryId || null,
                    width: parsed.width || 1080,
                    height: parsed.height || 1080,
                    presetLabel: parsed.presetLabel || '',
                    pagesJson: parsed.pagesJson || [],
                    thumbnailPath: parsed.thumbnailPath || null,
                    tags: parsed.tags || [],
                    status: 'draft',
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Import failed');
            setTemplates((prev) => [data.template, ...prev]);
            toast.success(`Imported "${data.template.title}" as Draft`);
        } catch (err) {
            toast.error(err.message || 'Invalid template JSON file');
        } finally {
            e.target.value = '';
        }
    };

    return (
        <AdminLayout>
            <Head title="Editor Templates" />
            <div className="w-full space-y-8 animate-in fade-in duration-300">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-3">
                            <LayoutTemplate className="w-7 h-7 text-primary-glow shrink-0" />
                            <span>Editor Templates</span>
                        </h1>
                        <p className="text-sm text-foreground/55 mt-1">
                            Design visually in the live studio, manage published status, featured picks, or import/export template JSON.
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-1 p-1 bg-card-header-bg border border-card-border rounded-xl self-start md:self-auto">
                        <input
                            ref={importInputRef}
                            type="file"
                            accept=".json,application/json"
                            className="hidden"
                            onChange={handleImportJsonFile}
                        />
                        <button
                            type="button"
                            onClick={() => importInputRef.current?.click()}
                            className="h-8 px-3 rounded-lg bg-card-bg hover:text-primary-glow text-xs font-bold text-foreground/80 shadow-sm inline-flex items-center gap-1.5 cursor-pointer transition-all"
                        >
                            <Upload className="w-3.5 h-3.5 text-primary-glow" />
                            <span>Import JSON</span>
                        </button>
                        <a
                            href="/image-editor?adminTemplate=new"
                            className="h-8 px-3.5 rounded-lg bg-primary-glow hover:bg-blue-500 text-white text-xs font-bold shadow-sm inline-flex items-center gap-1.5 transition-all"
                        >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Create Template Visually</span>
                        </a>
                    </div>
                </div>

                {/* Filters */}
                <GlassCard className="px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-3 !shadow-none">
                    <div className="w-full sm:w-80 p-1 bg-card-header-bg border border-card-border rounded-xl">
                        <div className="relative h-7 rounded-lg bg-card-bg shadow-sm flex items-center px-2.5 gap-2 focus-within:ring-1 focus-within:ring-primary-glow/60 transition-all">
                            <Search className="w-3.5 h-3.5 text-foreground/45 shrink-0 pointer-events-none" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search templates by title, tag, or dimension..."
                                className="w-full h-full bg-transparent text-xs font-medium text-foreground placeholder:text-foreground/40 focus:outline-none"
                            />
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-1 p-1 bg-card-header-bg border border-card-border rounded-xl">
                        <StudioSelect
                            size="sm"
                            aria-label="Filter templates by category"
                            value={categoryFilter}
                            onChange={(e) => setCategoryFilter(e.target.value)}
                        >
                            <option value="all">All Categories</option>
                            {categories.map((c) => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </StudioSelect>
                        <StudioSelect
                            size="sm"
                            aria-label="Filter templates by status"
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                        >
                            <option value="all">All Statuses</option>
                            <option value="published">Published</option>
                            <option value="draft">Draft</option>
                            <option value="archived">Archived</option>
                        </StudioSelect>
                        <span className="h-7 px-2.5 rounded-lg bg-card-bg text-xs text-foreground/70 font-bold shadow-sm inline-flex items-center">
                            {filtered.length} template{filtered.length === 1 ? '' : 's'}
                        </span>
                    </div>
                </GlassCard>

                {/* Grid */}
                {filtered.length === 0 ? (
                    <GlassCard className="p-12 text-center space-y-3 shadow-none">
                        <LayoutTemplate className="w-10 h-10 text-foreground/30 mx-auto" />
                        <p className="text-sm font-semibold text-foreground/70">No templates match your filters</p>
                        <a
                            href="/image-editor?adminTemplate=new"
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold"
                        >
                            <Plus className="w-4 h-4" />
                            <span>Design Your First Template</span>
                        </a>
                    </GlassCard>
                ) : (
                    <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-5">
                        {filtered.map((tpl) => {
                            const ratioW = Math.max(1, Number(tpl.width) || 1);
                            const ratioH = Math.max(1, Number(tpl.height) || 1);
                            const clampedRatio = Math.max(0.45, Math.min(2.2, ratioW / ratioH));
                            const statusPillColor =
                                tpl.status === 'published'
                                    ? 'bg-emerald-500'
                                    : tpl.status === 'draft'
                                        ? 'bg-amber-400'
                                        : 'bg-slate-400';

                            return (
                                <div
                                    key={tpl.id}
                                    data-testid={`admin-template-card-${tpl.id}`}
                                    className="break-inside-avoid mb-5 group"
                                >
                                    <div
                                        style={{ aspectRatio: String(clampedRatio) }}
                                        className="relative w-full rounded-2xl bg-slate-900 border border-card-border hover:border-primary-glow/60 overflow-hidden shadow-xs hover:shadow-md transition-all"
                                    >
                                        <a
                                            href={`/image-editor?adminTemplate=${tpl.id}`}
                                            aria-label={`Edit template ${tpl.title}`}
                                            className="w-full h-full block focus:outline-none"
                                        >
                                            {tpl.thumbnailPath ? (
                                                <img
                                                    src={tpl.thumbnailPath}
                                                    alt={tpl.title}
                                                    loading="lazy"
                                                    className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-200"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center p-4 text-center text-xs font-medium text-slate-400">
                                                    {tpl.title}
                                                </div>
                                            )}
                                        </a>

                                        {/* Top-Left Textless Status Pill */}
                                        <span
                                            data-testid={`admin-tpl-status-pill-${tpl.id}`}
                                            title={`Status: ${tpl.status}`}
                                            aria-label={`Status: ${tpl.status}`}
                                            className={`absolute top-2.5 left-2.5 z-10 h-2.5 w-6 rounded-full shadow-sm ring-1 ring-white/40 pointer-events-none ${statusPillColor}`}
                                        />

                                        {/* Top-Right Featured Star */}
                                        <button
                                            type="button"
                                            disabled={busyId === tpl.id}
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                patchTemplate(
                                                    tpl.id,
                                                    { isFeatured: !tpl.isFeatured },
                                                    tpl.isFeatured ? 'Removed from Featured' : 'Marked as Featured'
                                                );
                                            }}
                                            title={tpl.isFeatured ? 'Featured template' : 'Feature template'}
                                            aria-label={tpl.isFeatured ? 'Remove from featured' : 'Feature template'}
                                            className={`absolute top-2 right-2 z-10 w-7 h-7 rounded-lg flex items-center justify-center backdrop-blur-md cursor-pointer transition-all duration-200 ${
                                                tpl.isFeatured
                                                    ? 'bg-amber-500 text-slate-950 opacity-100 shadow-sm'
                                                    : 'bg-slate-950/60 text-white/80 hover:text-white opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100'
                                            }`}
                                        >
                                            <Star className="w-3.5 h-3.5" fill={tpl.isFeatured ? 'currentColor' : 'none'} />
                                        </button>

                                        {/* Bottom Inside-Card Icon Actions Dock */}
                                        <div className="absolute bottom-2 left-2 right-2 z-10 flex items-center justify-center opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 transition-all duration-200 pointer-events-auto">
                                            <div className="inline-flex flex-wrap items-center justify-center gap-1 p-1 rounded-xl bg-slate-950/75 backdrop-blur-md border border-white/10 shadow-lg">
                                                <a
                                                    href={`/image-editor?adminTemplate=${tpl.id}`}
                                                    title="Edit Design"
                                                    aria-label="Edit Design"
                                                    className="w-7 h-7 rounded-lg bg-blue-600 hover:bg-blue-500 text-white inline-flex items-center justify-center transition-colors"
                                                >
                                                    <Paintbrush className="w-3.5 h-3.5" />
                                                </a>
                                                <a
                                                    href={`/image-editor?template=${tpl.slug}`}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    title="Preview in public editor"
                                                    aria-label="Preview in public editor"
                                                    className="w-7 h-7 rounded-lg hover:bg-white/15 text-white/85 hover:text-white inline-flex items-center justify-center transition-colors"
                                                >
                                                    <Eye className="w-3.5 h-3.5" />
                                                </a>
                                                {tpl.status !== 'published' ? (
                                                    <button
                                                        type="button"
                                                        disabled={busyId === tpl.id}
                                                        onClick={() => patchTemplate(tpl.id, { status: 'published' }, 'Template published')}
                                                        title="Publish"
                                                        aria-label="Publish template"
                                                        className="w-7 h-7 rounded-lg hover:bg-emerald-500/25 text-emerald-400 inline-flex items-center justify-center cursor-pointer transition-colors"
                                                    >
                                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                                    </button>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        disabled={busyId === tpl.id}
                                                        onClick={() => patchTemplate(tpl.id, { status: 'draft' }, 'Moved to Draft')}
                                                        title="Move to Draft"
                                                        aria-label="Move template to Draft"
                                                        className="w-7 h-7 rounded-lg hover:bg-amber-500/25 text-amber-400 inline-flex items-center justify-center cursor-pointer transition-colors"
                                                    >
                                                        <Clock className="w-3.5 h-3.5" />
                                                    </button>
                                                )}
                                                <button
                                                    type="button"
                                                    disabled={busyId === tpl.id}
                                                    onClick={() => handleDuplicate(tpl.id)}
                                                    title="Duplicate"
                                                    aria-label="Duplicate template"
                                                    className="w-7 h-7 rounded-lg hover:bg-white/15 text-white/85 hover:text-white inline-flex items-center justify-center cursor-pointer transition-colors"
                                                >
                                                    <Copy className="w-3.5 h-3.5" />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleExportJson(tpl)}
                                                    title="Export JSON"
                                                    aria-label="Export template JSON"
                                                    className="w-7 h-7 rounded-lg hover:bg-white/15 text-white/85 hover:text-white inline-flex items-center justify-center cursor-pointer transition-colors"
                                                >
                                                    <Download className="w-3.5 h-3.5" />
                                                </button>
                                                <button
                                                    type="button"
                                                    disabled={busyId === tpl.id}
                                                    onClick={() => handleDelete(tpl)}
                                                    title="Delete"
                                                    aria-label="Delete template"
                                                    className="w-7 h-7 rounded-lg hover:bg-rose-500/30 text-rose-400 hover:text-rose-300 inline-flex items-center justify-center cursor-pointer transition-colors"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Below-card Metadata: Title & Uses Count */}
                                    <div className="mt-2 px-0.5 flex items-center justify-between gap-2">
                                        <a
                                            href={`/image-editor?adminTemplate=${tpl.id}`}
                                            className="min-w-0 text-xs font-bold text-foreground hover:text-primary-glow truncate transition-colors"
                                        >
                                            {tpl.title}
                                        </a>
                                        <span className="text-[11px] font-semibold text-blue-500 shrink-0">
                                            {tpl.usageCount} uses
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            <ConfirmDialog
                isOpen={Boolean(pendingDeleteTpl)}
                onClose={() => setPendingDeleteTpl(null)}
                onConfirm={confirmDeleteTemplate}
                title="Delete Template"
                message={pendingDeleteTpl ? `Delete template "${pendingDeleteTpl.title}" permanently?` : ''}
                confirmText="Delete"
            />
        </AdminLayout>
    );
}
