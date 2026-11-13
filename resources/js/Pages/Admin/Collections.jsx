import React, { useState, useEffect, useMemo } from 'react';
import { Head, Link } from '@inertiajs/react';
import { toast } from 'sonner';
import { Plus, Search, Layers, Star, Trash2, Edit3, ExternalLink, Sparkles, X } from 'lucide-react';
import AdminLayout from '@/Layouts/AdminLayout';
import StatCard from '@/components/ui/StatCard';
import ConfirmDialog from '@/components/admin/ConfirmDialog';

export default function AdminCollections() {
    const [collections, setCollections] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterTab, setFilterTab] = useState('all');
    const [deleteTarget, setDeleteTarget] = useState(null);

    // Create/Edit modal
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCol, setEditingCol] = useState(null);
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [type, setType] = useState('smart_dynamic');
    const [tagRulesText, setTagRulesText] = useState('');
    const [ruleMatchMode, setRuleMatchMode] = useState('any');
    const [isFeatured, setIsFeatured] = useState(false);
    const [status, setStatus] = useState('published');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchCollections();
    }, []);

    const fetchCollections = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/collections?admin=1');
            if (res.ok) {
                const data = await res.json();
                setCollections(Array.isArray(data) ? data : data.collections || []);
            }
        } catch {
            toast.error('Failed to load collections');
        } finally {
            setLoading(false);
        }
    };

    const openCreateModal = () => {
        setEditingCol(null);
        setName('');
        setDescription('');
        setType('smart_dynamic');
        setTagRulesText('');
        setRuleMatchMode('any');
        setIsFeatured(false);
        setStatus('published');
        setIsModalOpen(true);
    };

    const openEditModal = (col) => {
        setEditingCol(col);
        setName(col.name || '');
        setDescription(col.description || '');
        setType(col.type || 'manual');
        setTagRulesText(Array.isArray(col.tagRules) ? col.tagRules.join(', ') : '');
        setRuleMatchMode(col.ruleMatchMode || 'any');
        setIsFeatured(Boolean(col.isFeatured));
        setStatus(col.status || 'published');
        setIsModalOpen(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (!name.trim()) return;
        setSaving(true);
        const tagRules = tagRulesText
            .split(',')
            .map(t => t.trim())
            .filter(Boolean);

        const payload = {
            name: name.trim(),
            description: description.trim() || null,
            type,
            tagRules: type === 'manual' ? null : tagRules,
            ruleMatchMode,
            isFeatured,
            status,
        };

        try {
            const url = editingCol ? `/api/collections/${editingCol.id}` : '/api/collections';
            const method = editingCol ? 'PUT' : 'POST';
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            if (res.ok) {
                toast.success(editingCol ? 'Collection updated' : 'Collection created');
                setIsModalOpen(false);
                fetchCollections();
            } else {
                const err = await res.json().catch(() => ({}));
                toast.error(err.error || 'Failed to save collection');
            }
        } catch {
            toast.error('Network error');
        } finally {
            setSaving(false);
        }
    };

    const handleToggleFeatured = async (col) => {
        try {
            const res = await fetch(`/api/collections/${col.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isFeatured: !col.isFeatured }),
            });
            if (res.ok) {
                toast.success(!col.isFeatured ? 'Marked as Featured' : 'Removed from Featured');
                setCollections(prev => prev.map(c => (c.id === col.id ? { ...c, isFeatured: !col.isFeatured } : c)));
            }
        } catch {
            toast.error('Failed to update');
        }
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        try {
            const res = await fetch(`/api/collections/${deleteTarget.id}`, { method: 'DELETE' });
            if (res.ok) {
                toast.success('Collection deleted');
                setCollections(prev => prev.filter(c => c.id !== deleteTarget.id));
            }
        } catch {
            toast.error('Failed to delete collection');
        }
        setDeleteTarget(null);
    };

    const filtered = useMemo(() => {
        return collections.filter(col => {
            if (filterTab === 'smart' && col.type === 'manual') return false;
            if (filterTab === 'manual' && col.type !== 'manual') return false;
            if (filterTab === 'featured' && !col.isFeatured) return false;
            if (filterTab === 'drafts' && col.status !== 'draft') return false;
            if (search.trim()) {
                const q = search.toLowerCase();
                return (
                    col.name.toLowerCase().includes(q) ||
                    (col.description && col.description.toLowerCase().includes(q))
                );
            }
            return true;
        });
    }, [collections, filterTab, search]);

    return (
        <AdminLayout>
            <Head title="Collections - Png101 Admin" />
            <div className="max-w-7xl mx-auto space-y-8">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h2 className="text-2xl font-bold text-foreground">Collections</h2>
                        <p className="text-sm text-foreground/60 mt-1">Manage curated PNG packs and smart tag-based collections</p>
                    </div>
                    <button
                        onClick={openCreateModal}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary-glow hover:bg-primary-glow/90 text-white font-semibold text-sm shadow-lg shadow-blue-500/20 cursor-pointer"
                    >
                        <Plus className="w-4 h-4" />
                        New Collection
                    </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                    <StatCard title="Total Collections" value={collections.length} icon={<Layers className="w-6 h-6" />} />
                    <StatCard title="Smart Collections" value={collections.filter(c => c.type !== 'manual').length} icon={<Sparkles className="w-6 h-6" />} />
                    <StatCard title="Featured Packs" value={collections.filter(c => c.isFeatured).length} icon={<Star className="w-6 h-6" />} />
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex flex-wrap gap-2">
                        {['all', 'smart', 'manual', 'featured', 'drafts'].map(tab => (
                            <button
                                key={tab}
                                onClick={() => setFilterTab(tab)}
                                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors cursor-pointer ${
                                    filterTab === tab
                                        ? 'bg-primary-glow text-white'
                                        : 'bg-card-bg border border-card-border text-foreground/70 hover:text-foreground'
                                }`}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>

                    <div className="relative w-full sm:w-72">
                        <Search className="w-4 h-4 text-foreground/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Search collections..."
                            className="w-full bg-card-bg border border-card-border rounded-xl pl-10 pr-4 py-2 text-sm text-foreground focus:outline-none focus:border-primary-glow"
                        />
                    </div>
                </div>

                {loading ? (
                    <div className="p-12 text-center text-foreground/50">Loading collections...</div>
                ) : filtered.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filtered.map(col => (
                            <div key={col.id} className="bg-card-bg border border-card-border rounded-2xl overflow-hidden shadow-lg flex flex-col">
                                <div className="p-5 flex-1 space-y-3">
                                    <div className="flex items-start justify-between gap-2">
                                        <div>
                                            <h3 className="font-bold text-foreground text-lg">{col.name}</h3>
                                            <span className="text-xs font-mono text-foreground/40">/{col.slug}</span>
                                        </div>
                                        <button
                                            onClick={() => handleToggleFeatured(col)}
                                            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                                col.isFeatured ? 'text-amber-400 bg-amber-500/10' : 'text-foreground/30 hover:text-foreground/60'
                                            }`}
                                            title="Toggle Featured"
                                        >
                                            <Star className="w-4 h-4" fill={col.isFeatured ? 'currentColor' : 'none'} />
                                        </button>
                                    </div>

                                    {col.description && (
                                        <p className="text-xs text-foreground/60 line-clamp-2">{col.description}</p>
                                    )}

                                    <div className="flex flex-wrap gap-2 pt-2">
                                        <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                            {col.imageCount ?? 0} PNGs
                                        </span>
                                        <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20">
                                            {col.type}
                                        </span>
                                        <span className={`px-2 py-0.5 rounded-md text-[11px] font-semibold ${col.status === 'published' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
                                            {col.status}
                                        </span>
                                    </div>
                                </div>

                                <div className="px-5 py-3 bg-foreground/[0.02] border-t border-card-border flex items-center justify-between">
                                    <Link
                                        href={`/collections/${col.slug}`}
                                        className="inline-flex items-center gap-1 text-xs font-semibold text-primary-glow hover:underline"
                                    >
                                        View <ExternalLink className="w-3 h-3" />
                                    </Link>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => openEditModal(col)}
                                            className="p-1.5 rounded-lg text-foreground/60 hover:text-blue-400 hover:bg-blue-500/10 cursor-pointer"
                                        >
                                            <Edit3 className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => setDeleteTarget(col)}
                                            className="p-1.5 rounded-lg text-foreground/60 hover:text-red-400 hover:bg-red-500/10 cursor-pointer"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="p-16 text-center text-foreground/50 bg-card-bg border border-card-border rounded-2xl">
                        No collections match your filter.
                    </div>
                )}

                {isModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        <div className="bg-card-bg border border-card-border rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
                            <div className="flex items-center justify-between border-b border-card-border pb-4">
                                <h3 className="text-lg font-bold text-foreground">
                                    {editingCol ? 'Edit Collection' : 'New Collection'}
                                </h3>
                                <button onClick={() => setIsModalOpen(false)} className="text-foreground/50 hover:text-foreground cursor-pointer">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <form onSubmit={handleSave} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-semibold text-foreground/70 mb-1.5">Collection Name *</label>
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={e => setName(e.target.value)}
                                        required
                                        className="w-full bg-background border border-card-border rounded-xl px-3.5 py-2.5 text-sm text-foreground"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-foreground/70 mb-1.5">Description</label>
                                    <textarea
                                        rows={2}
                                        value={description}
                                        onChange={e => setDescription(e.target.value)}
                                        className="w-full bg-background border border-card-border rounded-xl px-3.5 py-2.5 text-sm text-foreground"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-foreground/70 mb-1.5">Type</label>
                                        <select
                                            value={type}
                                            onChange={e => setType(e.target.value)}
                                            className="w-full bg-background border border-card-border rounded-xl px-3 py-2.5 text-sm text-foreground"
                                        >
                                            <option value="smart_dynamic">Smart (Dynamic Tags)</option>
                                            <option value="smart_snapshot">Smart (Snapshot)</option>
                                            <option value="manual">Manual</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-foreground/70 mb-1.5">Status</label>
                                        <select
                                            value={status}
                                            onChange={e => setStatus(e.target.value)}
                                            className="w-full bg-background border border-card-border rounded-xl px-3 py-2.5 text-sm text-foreground"
                                        >
                                            <option value="published">Published</option>
                                            <option value="draft">Draft</option>
                                        </select>
                                    </div>
                                </div>

                                {type !== 'manual' && (
                                    <div className="space-y-3 p-4 rounded-xl bg-background border border-card-border">
                                        <div>
                                            <label className="block text-xs font-semibold text-foreground/70 mb-1.5">Tag Rules (comma-separated)</label>
                                            <input
                                                type="text"
                                                value={tagRulesText}
                                                onChange={e => setTagRulesText(e.target.value)}
                                                placeholder="e.g., nature, tree, leaf"
                                                className="w-full bg-card-bg border border-card-border rounded-lg px-3 py-2 text-sm text-foreground"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-foreground/70 mb-1.5">Match Mode</label>
                                            <select
                                                value={ruleMatchMode}
                                                onChange={e => setRuleMatchMode(e.target.value)}
                                                className="w-full bg-card-bg border border-card-border rounded-lg px-3 py-2 text-sm text-foreground"
                                            >
                                                <option value="any">Match ANY tag</option>
                                                <option value="all">Match ALL tags</option>
                                            </select>
                                        </div>
                                    </div>
                                )}

                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={isFeatured}
                                        onChange={e => setIsFeatured(e.target.checked)}
                                        className="w-4 h-4 rounded text-primary-glow"
                                    />
                                    <span className="text-sm font-medium text-foreground">Featured on Homepage</span>
                                </label>

                                <div className="flex justify-end gap-3 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setIsModalOpen(false)}
                                        className="px-4 py-2 rounded-xl border border-card-border text-sm text-foreground/70 cursor-pointer"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={saving}
                                        className="px-5 py-2 rounded-xl bg-primary-glow text-white text-sm font-semibold cursor-pointer disabled:opacity-50"
                                    >
                                        {saving ? 'Saving...' : 'Save Collection'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                <ConfirmDialog
                    isOpen={Boolean(deleteTarget)}
                    onClose={() => setDeleteTarget(null)}
                    onConfirm={handleDelete}
                    title="Delete Collection"
                    message={`Are you sure you want to delete "${deleteTarget?.name}"?`}
                    confirmText="Delete"
                    type="danger"
                />
            </div>
        </AdminLayout>
    );
}

