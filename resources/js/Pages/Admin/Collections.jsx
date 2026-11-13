import React, { useState, useEffect } from 'react';
import { Head } from '@inertiajs/react';
import AdminLayout from '@/Layouts/AdminLayout';
import {
    Plus,
    Search,
    Tag,
    Hand,
    Layers,
    Star,
    Trash2,
    Edit3,
    ExternalLink,
    Loader2,
    LayoutGrid,
    List,
} from 'lucide-react';
import { toast } from 'sonner';
import StatCard from '@/components/ui/StatCard';
import CreateCollectionModal from '@/components/admin/collections/CreateCollectionModal';
import EditCollectionModal from '@/components/admin/collections/EditCollectionModal';
import ConfirmDialog from '@/components/admin/ConfirmDialog';

export default function AdminCollectionsPage() {
    const [collections, setCollections] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterTab, setFilterTab] = useState('all');
    const [viewMode, setViewMode] = useState('grid');

    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [editingCollectionId, setEditingCollectionId] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);

    useEffect(() => {
        fetchCollections();
    }, []);

    const fetchCollections = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/collections?admin=1');
            if (res.ok) {
                const data = await res.json();
                if (Array.isArray(data)) {
                    setCollections(data);
                }
            } else {
                toast.error('Failed to load collections');
            }
        } catch (e) {
            console.error('Failed to load collections:', e);
            toast.error('Failed to load collections');
        } finally {
            setLoading(false);
        }
    };

    const handleToggleFeatured = async (col) => {
        const nextVal = !col.isFeatured;
        try {
            const res = await fetch(`/api/collections/${col.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isFeatured: nextVal }),
            });
            if (res.ok) {
                toast.success(nextVal ? 'Collection marked as Featured' : 'Removed from Featured');
                setCollections((prev) =>
                    prev.map((c) => (c.id === col.id ? { ...c, isFeatured: nextVal } : c))
                );
            }
        } catch {
            toast.error('Failed to update featured status');
        }
    };

    const handleToggleStatus = async (col) => {
        const nextStatus = col.status === 'published' ? 'draft' : 'published';
        try {
            const res = await fetch(`/api/collections/${col.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: nextStatus }),
            });
            if (res.ok) {
                toast.success(`Collection set to ${nextStatus}`);
                setCollections((prev) =>
                    prev.map((c) => (c.id === col.id ? { ...c, status: nextStatus } : c))
                );
            }
        } catch {
            toast.error('Failed to update status');
        }
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        try {
            const res = await fetch(`/api/collections/${deleteTarget.id}`, {
                method: 'DELETE',
            });
            if (res.ok) {
                toast.success('Collection deleted successfully');
                setCollections((prev) => prev.filter((c) => c.id !== deleteTarget.id));
                setDeleteTarget(null);
            } else {
                toast.error('Failed to delete collection');
            }
        } catch {
            toast.error('Failed to delete collection');
        }
    };

    const filteredCollections = collections.filter((c) => {
        if (search.trim()) {
            const q = search.toLowerCase();
            const matchesName = c.name.toLowerCase().includes(q);
            const matchesSlug = c.slug.toLowerCase().includes(q);
            const matchesTags = Array.isArray(c.tagRules) && c.tagRules.some((t) => t.toLowerCase().includes(q));
            if (!matchesName && !matchesSlug && !matchesTags) return false;
        }

        if (filterTab === 'smart') return c.type === 'smart_dynamic' || c.type === 'smart_snapshot';
        if (filterTab === 'manual') return c.type === 'manual';
        if (filterTab === 'featured') return c.isFeatured;
        if (filterTab === 'drafts') return c.status === 'draft';

        return true;
    });

    const smartCount = collections.filter((c) => c.type === 'smart_dynamic' || c.type === 'smart_snapshot').length;
    const manualCount = collections.filter((c) => c.type === 'manual').length;
    const featuredCount = collections.filter((c) => c.isFeatured).length;
    const draftsCount = collections.filter((c) => c.status === 'draft').length;

    const totalImagesInCollections = collections.reduce((sum, c) => sum + (c.imageCount || 0), 0);

    return (
        <AdminLayout>
            <Head title="Collections - Admin" />
            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-foreground mb-1 flex items-center gap-2.5">
                            <Layers className="w-7 h-7 text-primary-glow" />
                            <span>Collections</span>
                        </h1>
                        <p className="text-foreground/60 text-sm">
                            Curate themed sets, seasonal packs, and automated smart collections driven by tags.
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <a
                            href="/collections"
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-card-bg hover:bg-white/5 text-foreground font-semibold text-sm border border-card-border hover:border-primary-glow/50 transition-all shadow-lg cursor-pointer"
                        >
                            <ExternalLink className="w-4 h-4 text-primary-glow" />
                            <span>Public Directory</span>
                        </a>

                        <button
                            onClick={() => setIsCreateOpen(true)}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm transition-all shadow-lg shadow-blue-600/30 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                        >
                            <Plus className="w-4 h-4 stroke-[2.5]" />
                            <span>Create Collection</span>
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    <StatCard
                        title="Total Collections"
                        value={collections.length}
                        subtitle={`${collections.length - draftsCount} published · ${draftsCount} drafts`}
                        icon={<Layers className="w-6 h-6" />}
                    />
                    <StatCard
                        title="Smart Rule Packs"
                        value={smartCount}
                        subtitle="Auto-updates live via tag rules"
                        icon={<Tag className="w-6 h-6" />}
                    />
                    <StatCard
                        title="Manual Curated"
                        value={manualCount}
                        subtitle="Hand-picked designer sets"
                        icon={<Hand className="w-6 h-6" />}
                    />
                    <StatCard
                        title="Featured Packs"
                        value={featuredCount}
                        subtitle={`${totalImagesInCollections} PNG graphics in collections`}
                        icon={<Star className="w-6 h-6" />}
                    />
                </div>

                <div className="bg-card-bg border border-card-border rounded-xl p-4 shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="relative w-full md:w-80">
                        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-foreground/40" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search by title, slug, or tag..."
                            className="w-full bg-input-bg border border-input-border rounded-xl pl-10 pr-3.5 py-2 text-sm text-foreground focus:outline-none focus:border-primary-glow transition-all"
                        />
                    </div>

                    <div className="flex flex-wrap items-center justify-between w-full md:w-auto gap-3">
                        <div className="flex items-center gap-1.5 p-1 bg-card-header-bg border border-card-border rounded-xl text-xs font-bold">
                            <button
                                onClick={() => setFilterTab('all')}
                                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                                    filterTab === 'all'
                                        ? 'bg-primary-glow text-white shadow-md shadow-primary-glow/30'
                                        : 'text-foreground/60 hover:text-foreground'
                                }`}
                            >
                                All ({collections.length})
                            </button>
                            <button
                                onClick={() => setFilterTab('smart')}
                                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                                    filterTab === 'smart'
                                        ? 'bg-primary-glow text-white shadow-md shadow-primary-glow/30'
                                        : 'text-foreground/60 hover:text-foreground'
                                }`}
                            >
                                Smart ({smartCount})
                            </button>
                            <button
                                onClick={() => setFilterTab('manual')}
                                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                                    filterTab === 'manual'
                                        ? 'bg-primary-glow text-white shadow-md shadow-primary-glow/30'
                                        : 'text-foreground/60 hover:text-foreground'
                                }`}
                            >
                                Manual ({manualCount})
                            </button>
                            <button
                                onClick={() => setFilterTab('featured')}
                                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                                    filterTab === 'featured'
                                        ? 'bg-amber-500 text-white shadow-md shadow-amber-500/30'
                                        : 'text-foreground/60 hover:text-foreground'
                                }`}
                            >
                                Featured ({featuredCount})
                            </button>
                            <button
                                onClick={() => setFilterTab('drafts')}
                                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                                    filterTab === 'drafts'
                                        ? 'bg-foreground text-background shadow-md'
                                        : 'text-foreground/60 hover:text-foreground'
                                }`}
                            >
                                Drafts ({draftsCount})
                            </button>
                        </div>

                        <div className="flex items-center gap-1 p-1 bg-card-header-bg border border-card-border rounded-xl">
                            <button
                                onClick={() => setViewMode('grid')}
                                className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                                    viewMode === 'grid'
                                        ? 'bg-card-bg text-primary-glow shadow-sm'
                                        : 'text-foreground/40 hover:text-foreground'
                                }`}
                                title="Grid View"
                            >
                                <LayoutGrid className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => setViewMode('table')}
                                className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                                    viewMode === 'table'
                                        ? 'bg-card-bg text-primary-glow shadow-sm'
                                        : 'text-foreground/40 hover:text-foreground'
                                }`}
                                title="Table View"
                            >
                                <List className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div className="bg-card-bg border border-card-border rounded-xl p-16 flex flex-col items-center justify-center gap-3 text-foreground/50 shadow-xl">
                        <Loader2 className="w-8 h-8 animate-spin text-primary-glow" />
                        <span className="text-sm font-medium">Loading collections catalog...</span>
                    </div>
                ) : filteredCollections.length === 0 ? (
                    <div className="bg-card-bg border border-card-border rounded-xl p-16 text-center shadow-xl">
                        <div className="w-16 h-16 rounded-2xl bg-primary-glow/10 text-primary-glow border border-primary-glow/20 flex items-center justify-center mx-auto mb-4">
                            <Layers className="w-8 h-8" />
                        </div>
                        <h3 className="text-lg font-bold text-foreground">No collections found</h3>
                        <p className="text-sm text-foreground/60 mt-1 max-w-sm mx-auto">
                            {search
                                ? `No collections match "${search}". Try refining your search query.`
                                : 'Create a collection to bundle transparent PNGs by theme, aesthetic, or automated tag rules.'}
                        </p>
                        <button
                            onClick={() => setIsCreateOpen(true)}
                            className="mt-5 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-blue-600/30 cursor-pointer hover:scale-[1.02]"
                        >
                            + Create First Collection
                        </button>
                    </div>
                ) : viewMode === 'grid' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredCollections.map((col) => {
                            const isSmart = col.type === 'smart_dynamic' || col.type === 'smart_snapshot';

                            return (
                                <div
                                    key={col.id}
                                    className={`group rounded-xl border bg-card-bg overflow-hidden shadow-xl transition-all duration-300 flex flex-col hover:border-primary-glow/50 hover:shadow-primary-glow/10 ${
                                        col.isFeatured ? 'border-amber-500/30' : 'border-card-border'
                                    }`}
                                >
                                    <div
                                        className="relative h-48 w-full bg-foreground/[0.02] border-b border-card-border p-3 overflow-hidden"
                                        style={{
                                            backgroundImage:
                                                'linear-gradient(45deg, #80808012 25%, transparent 25%), linear-gradient(-45deg, #80808012 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #80808012 75%), linear-gradient(-45deg, transparent 75%, #80808012 75%)',
                                            backgroundSize: '12px 12px',
                                            backgroundPosition: '0 0, 0 6px, 6px -6px, -6px 0px',
                                        }}
                                    >
                                        {col.previewImages && col.previewImages.length > 0 ? (
                                            <div className="h-full w-full grid grid-cols-2 gap-2">
                                                {col.previewImages.slice(0, 4).map((img, idx) => (
                                                    <div
                                                        key={img.id || idx}
                                                        className="relative h-full w-full rounded-lg bg-card-bg/80 backdrop-blur-sm border border-card-border/80 p-2 flex items-center justify-center overflow-hidden"
                                                    >
                                                        <img
                                                            src={img.path}
                                                            alt=""
                                                            className="max-h-full max-w-full object-contain pointer-events-none group-hover:scale-105 transition-transform duration-300"
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                        ) : col.coverImagePath ? (
                                            <div className="h-full w-full flex items-center justify-center p-3">
                                                <img
                                                    src={col.coverImagePath}
                                                    alt={col.name}
                                                    className="max-h-full max-w-full object-contain pointer-events-none group-hover:scale-105 transition-transform duration-300"
                                                />
                                            </div>
                                        ) : (
                                            <div className="h-full w-full flex flex-col items-center justify-center text-foreground/30">
                                                <Layers className="w-8 h-8 mb-1" />
                                                <span className="text-xs">No preview assets</span>
                                            </div>
                                        )}

                                        <div className="absolute top-3 left-3 flex items-center gap-1.5">
                                            <span
                                                className={`text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-full border shadow-sm ${
                                                    isSmart
                                                        ? 'bg-blue-500/10 text-primary-glow border-blue-500/30'
                                                        : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                                }`}
                                            >
                                                {col.type === 'smart_dynamic'
                                                    ? 'Smart (Live)'
                                                    : col.type === 'smart_snapshot'
                                                    ? 'Snapshot'
                                                    : 'Manual'}
                                            </span>

                                            <button
                                                type="button"
                                                onClick={() => handleToggleStatus(col)}
                                                className={`text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-full border shadow-sm transition-all cursor-pointer ${
                                                    col.status === 'published'
                                                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                                                        : 'bg-amber-500/10 text-amber-400 border-amber-500/30 hover:bg-amber-500/20'
                                                }`}
                                                title="Click to toggle Status"
                                            >
                                                {col.status}
                                            </button>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() => handleToggleFeatured(col)}
                                            className={`absolute top-3 right-3 p-2 rounded-xl backdrop-blur-md shadow-md transition-all cursor-pointer ${
                                                col.isFeatured
                                                    ? 'bg-amber-500 text-white shadow-amber-500/30'
                                                    : 'bg-card-bg/80 border border-card-border text-foreground/40 hover:text-amber-400'
                                            }`}
                                            title={col.isFeatured ? 'Featured pack' : 'Feature this pack'}
                                        >
                                            <Star className="w-4 h-4 fill-current" />
                                        </button>

                                        <div className="absolute bottom-3 right-3">
                                            <span className="px-2.5 py-1 rounded-lg bg-card-bg/90 border border-card-border backdrop-blur-md text-foreground text-xs font-bold shadow-md">
                                                {col.imageCount} PNG{col.imageCount === 1 ? '' : 's'}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                                        <div>
                                            <h3 className="text-base font-bold text-foreground group-hover:text-primary-glow transition-colors line-clamp-1">
                                                {col.name}
                                            </h3>
                                            <p className="text-xs font-mono text-foreground/50 mt-0.5">
                                                /collections/{col.slug}
                                            </p>

                                            {col.description && (
                                                <p className="text-xs text-foreground/70 mt-2 line-clamp-2 leading-relaxed">
                                                    {col.description}
                                                </p>
                                            )}

                                            {Array.isArray(col.tagRules) && col.tagRules.length > 0 && (
                                                <div className="flex flex-wrap gap-1.5 mt-3">
                                                    {col.tagRules.slice(0, 3).map((t) => (
                                                        <span
                                                            key={t}
                                                            className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-tag-bg text-tag-text border border-tag-border"
                                                        >
                                                            #{t}
                                                        </span>
                                                    ))}
                                                    {col.tagRules.length > 3 && (
                                                        <span className="text-[11px] font-medium px-1.5 py-0.5 text-foreground/40">
                                                            +{col.tagRules.length - 3}
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        <div className="pt-3 border-t border-card-border flex items-center justify-between gap-2">
                                            <div className="flex items-center gap-1.5">
                                                <a
                                                    href={`/collections/${col.slug}`}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="p-2 rounded-lg border border-card-border hover:border-primary-glow/50 text-foreground/60 hover:text-primary-glow transition-colors"
                                                    title="View public page"
                                                >
                                                    <ExternalLink className="w-4 h-4" />
                                                </a>

                                                <button
                                                    type="button"
                                                    onClick={() => setDeleteTarget(col)}
                                                    className="p-2 rounded-lg border border-card-border hover:border-red-500/50 text-foreground/60 hover:text-red-400 transition-colors cursor-pointer"
                                                    title="Delete collection"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>

                                            <button
                                                type="button"
                                                onClick={() => setEditingCollectionId(col.id)}
                                                className="px-3.5 py-1.5 rounded-xl bg-card-bg hover:bg-white/5 border border-card-border hover:border-primary-glow/50 text-foreground text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                                            >
                                                <Edit3 className="w-3.5 h-3.5 text-primary-glow" />
                                                <span>Manage Assets</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="bg-card-bg border border-card-border rounded-xl overflow-hidden shadow-xl">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead>
                                    <tr className="border-b border-card-border bg-card-header-bg text-foreground/60 text-xs font-semibold uppercase tracking-wider">
                                        <th className="py-3.5 px-5">Collection</th>
                                        <th className="py-3.5 px-4">Type</th>
                                        <th className="py-3.5 px-4">Rules / Tags</th>
                                        <th className="py-3.5 px-4 text-center">Images</th>
                                        <th className="py-3.5 px-4 text-center">Status</th>
                                        <th className="py-3.5 px-4 text-center">Featured</th>
                                        <th className="py-3.5 px-5 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-card-border">
                                    {filteredCollections.map((col) => {
                                        const isSmart = col.type === 'smart_dynamic' || col.type === 'smart_snapshot';

                                        return (
                                            <tr key={col.id} className="hover:bg-white/[0.02] transition-colors">
                                                <td className="py-3.5 px-5">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-lg bg-foreground/[0.03] border border-card-border p-1 flex items-center justify-center shrink-0 overflow-hidden">
                                                            {col.coverImagePath || (col.previewImages && col.previewImages[0]?.path) ? (
                                                                <img
                                                                    src={col.coverImagePath || col.previewImages[0].path}
                                                                    alt=""
                                                                    className="max-h-full max-w-full object-contain"
                                                                />
                                                            ) : (
                                                                <Layers className="w-5 h-5 text-foreground/30" />
                                                            )}
                                                        </div>
                                                        <div>
                                                            <h4 className="font-bold text-foreground text-sm line-clamp-1">
                                                                {col.name}
                                                            </h4>
                                                            <span className="text-[11px] font-mono text-foreground/50">
                                                                /collections/{col.slug}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </td>

                                                <td className="py-3.5 px-4">
                                                    <span
                                                        className={`inline-flex text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border ${
                                                            isSmart
                                                                ? 'bg-blue-500/10 text-primary-glow border-blue-500/30'
                                                                : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                                        }`}
                                                    >
                                                        {col.type === 'smart_dynamic'
                                                            ? 'Smart Live'
                                                            : col.type === 'smart_snapshot'
                                                            ? 'Snapshot'
                                                            : 'Manual'}
                                                    </span>
                                                </td>

                                                <td className="py-3.5 px-4">
                                                    {Array.isArray(col.tagRules) && col.tagRules.length > 0 ? (
                                                        <div className="flex flex-wrap gap-1 max-w-xs">
                                                            {col.tagRules.slice(0, 3).map((t) => (
                                                                <span
                                                                    key={t}
                                                                    className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-tag-bg text-tag-text border border-tag-border"
                                                                >
                                                                    #{t}
                                                                </span>
                                                            ))}
                                                            {col.tagRules.length > 3 && (
                                                                <span className="text-[10px] text-foreground/40">
                                                                    +{col.tagRules.length - 3}
                                                                </span>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <span className="text-xs text-foreground/40 italic">Manual selection</span>
                                                    )}
                                                </td>

                                                <td className="py-3.5 px-4 text-center font-bold text-foreground">
                                                    {col.imageCount}
                                                </td>

                                                <td className="py-3.5 px-4 text-center">
                                                    <button
                                                        onClick={() => handleToggleStatus(col)}
                                                        className={`inline-flex text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full border cursor-pointer transition-all ${
                                                            col.status === 'published'
                                                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                                                : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                                                        }`}
                                                    >
                                                        {col.status}
                                                    </button>
                                                </td>

                                                <td className="py-3.5 px-4 text-center">
                                                    <button
                                                        onClick={() => handleToggleFeatured(col)}
                                                        className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                                                            col.isFeatured
                                                                ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                                                                : 'text-foreground/30 border-card-border hover:text-amber-400'
                                                        }`}
                                                    >
                                                        <Star className="w-3.5 h-3.5 fill-current" />
                                                    </button>
                                                </td>

                                                <td className="py-3.5 px-5 text-right">
                                                    <div className="flex items-center justify-end gap-1.5">
                                                        <a
                                                            href={`/collections/${col.slug}`}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="p-1.5 rounded-lg border border-card-border hover:border-primary-glow/50 text-foreground/60 hover:text-primary-glow transition-colors"
                                                            title="View public"
                                                        >
                                                            <ExternalLink className="w-3.5 h-3.5" />
                                                        </a>

                                                        <button
                                                            onClick={() => setEditingCollectionId(col.id)}
                                                            className="p-1.5 rounded-lg border border-card-border hover:border-primary-glow/50 text-foreground/60 hover:text-primary-glow transition-colors cursor-pointer"
                                                            title="Manage assets"
                                                        >
                                                            <Edit3 className="w-3.5 h-3.5" />
                                                        </button>

                                                        <button
                                                            onClick={() => setDeleteTarget(col)}
                                                            className="p-1.5 rounded-lg border border-card-border hover:border-red-500/50 text-foreground/60 hover:text-red-400 transition-colors cursor-pointer"
                                                            title="Delete collection"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                <CreateCollectionModal
                    isOpen={isCreateOpen}
                    onClose={() => setIsCreateOpen(false)}
                    onSuccess={fetchCollections}
                />

                <EditCollectionModal
                    isOpen={Boolean(editingCollectionId)}
                    collectionId={editingCollectionId}
                    onClose={() => setEditingCollectionId(null)}
                    onSuccess={fetchCollections}
                />

                <ConfirmDialog
                    isOpen={Boolean(deleteTarget)}
                    title="Delete Collection"
                    message={`Are you sure you want to delete the collection "${deleteTarget?.name}"? The images in your library will NOT be deleted.`}
                    confirmText="Delete Collection"
                    onConfirm={handleDelete}
                    onClose={() => setDeleteTarget(null)}
                />
            </div>
        </AdminLayout>
    );
}
