import React, { useState, useEffect, useRef } from 'react';
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
    Sparkles,
    Eye,
    EyeOff,
    Camera,
    ChevronDown,
    Filter,
    X,
} from 'lucide-react';
import { toast } from 'sonner';
import StatCard from '@/components/ui/StatCard';
import GlassCard from '@/components/ui/GlassCard';
import Pagination from '@/components/ui/Pagination';
import CreateCollectionModal from '@/components/admin/collections/CreateCollectionModal';
import EditCollectionModal from '@/components/admin/collections/EditCollectionModal';
import ConfirmDialog from '@/components/admin/ConfirmDialog';

const COLS_STORAGE_KEY = 'png101_admin_collections_cols';

const GRID_COLS_CLASS = {
    2: 'grid-cols-1 sm:grid-cols-2 gap-6',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6',
    4: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5',
    5: 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4',
    6: 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4',
    7: 'grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-7 gap-3.5',
    8: 'grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3',
};

export default function AdminCollectionsPage() {
    const [collections, setCollections] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterTab, setFilterTab] = useState('all');
    const [viewMode, setViewMode] = useState('grid');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(24);
    const [cardsPerRow, setCardsPerRow] = useState(() => {
        if (typeof window !== 'undefined') {
            try {
                const saved = Number(window.localStorage.getItem(COLS_STORAGE_KEY));
                if (saved >= 2 && saved <= 8) return saved;
            } catch {
                // Ignore storage errors
            }
        }
        return 6;
    });
    const [isColsMenuOpen, setIsColsMenuOpen] = useState(false);
    const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
    const [isPerPageMenuOpen, setIsPerPageMenuOpen] = useState(false);
    const colsMenuRef = useRef(null);
    const filterMenuRef = useRef(null);
    const perPageMenuRef = useRef(null);

    useEffect(() => {
        if (!isColsMenuOpen && !isFilterMenuOpen && !isPerPageMenuOpen) return undefined;
        const handleOutside = (e) => {
            if (colsMenuRef.current && !colsMenuRef.current.contains(e.target)) {
                setIsColsMenuOpen(false);
            }
            if (filterMenuRef.current && !filterMenuRef.current.contains(e.target)) {
                setIsFilterMenuOpen(false);
            }
            if (perPageMenuRef.current && !perPageMenuRef.current.contains(e.target)) {
                setIsPerPageMenuOpen(false);
            }
        };
        document.addEventListener('pointerdown', handleOutside);
        return () => document.removeEventListener('pointerdown', handleOutside);
    }, [isColsMenuOpen, isFilterMenuOpen, isPerPageMenuOpen]);

    const handleCardsPerRowChange = (val) => {
        const num = Math.max(2, Math.min(8, Number(val) || 6));
        setCardsPerRow(num);
        setIsColsMenuOpen(false);
        if (typeof window !== 'undefined') {
            try {
                window.localStorage.setItem(COLS_STORAGE_KEY, String(num));
            } catch {
                // Ignore storage errors
            }
        }
    };

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

    const filterOptions = [
        { id: 'all', label: 'All', count: collections.length, icon: Layers, activeClass: 'bg-primary-glow text-white' },
        { id: 'smart', label: 'Smart', count: smartCount, icon: Sparkles, activeClass: 'bg-primary-glow text-white' },
        { id: 'manual', label: 'Manual', count: manualCount, icon: Hand, activeClass: 'bg-primary-glow text-white' },
        { id: 'featured', label: 'Featured', count: featuredCount, icon: Star, activeClass: 'bg-amber-500 text-white' },
        { id: 'drafts', label: 'Drafts', count: draftsCount, icon: EyeOff, activeClass: 'bg-amber-500 text-slate-950' },
    ];
    const activeFilterMeta = filterOptions.find((f) => f.id === filterTab) || filterOptions[0];
    const ActiveFilterIcon = activeFilterMeta.icon;

    const totalPages = Math.max(1, Math.ceil(filteredCollections.length / itemsPerPage));
    const paginatedCollections = filteredCollections.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    useEffect(() => {
        setCurrentPage(1);
    }, [search, filterTab, itemsPerPage]);

    useEffect(() => {
        if (currentPage > totalPages) {
            setCurrentPage(totalPages);
        }
    }, [currentPage, totalPages]);

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

                <div className="bg-card-bg border border-card-border rounded-xl px-3.5 py-2.5 flex flex-col md:flex-row items-center justify-between gap-3">
                    <div className="w-full md:w-80 p-1 bg-card-header-bg border border-card-border rounded-xl">
                        <div className="relative h-7 rounded-lg bg-card-bg shadow-sm flex items-center px-2.5 gap-2 focus-within:ring-1 focus-within:ring-primary-glow/60 transition-all">
                            <Search className="w-3.5 h-3.5 text-foreground/45 shrink-0 pointer-events-none" />
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search by title, slug, or tag..."
                                className="w-full h-full bg-transparent text-xs font-medium text-foreground placeholder:text-foreground/40 focus:outline-none"
                            />
                            {search && (
                                <button
                                    type="button"
                                    onClick={() => setSearch('')}
                                    title="Clear search"
                                    aria-label="Clear search"
                                    className="p-0.5 rounded-md text-foreground/45 hover:text-foreground hover:bg-card-header-bg transition-colors cursor-pointer shrink-0"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-end w-full md:w-auto gap-2">
                        <div className="flex items-center gap-1 p-1 bg-card-header-bg border border-card-border rounded-xl">
                            {/* Per Page Dropdown (coherent with Filter & Row dropdowns) */}
                            <div className="relative" ref={perPageMenuRef}>
                                <button
                                    type="button"
                                    onClick={() => setIsPerPageMenuOpen((prev) => !prev)}
                                    title={`Items per page: ${itemsPerPage}`}
                                    className={`h-7 px-2.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                                        isPerPageMenuOpen
                                            ? 'bg-primary-glow text-white shadow-sm'
                                            : 'bg-card-bg text-foreground hover:text-primary-glow shadow-sm'
                                    }`}
                                >
                                    <span className="text-[11px] font-semibold opacity-60">
                                        Per page:
                                    </span>
                                    <span>{itemsPerPage}</span>
                                    <ChevronDown className="w-3 h-3 opacity-70" />
                                </button>

                                {isPerPageMenuOpen && (
                                    <div className="absolute right-0 top-full mt-2 z-40 p-1.5 bg-card-bg border border-card-border rounded-xl shadow-2xl flex flex-col gap-1 min-w-[110px] animate-in fade-in zoom-in-95 duration-150">
                                        {[12, 24, 48, 72, 96].map((n) => (
                                            <button
                                                key={n}
                                                type="button"
                                                onClick={() => {
                                                    setItemsPerPage(n);
                                                    setIsPerPageMenuOpen(false);
                                                }}
                                                className={`w-full px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center justify-between gap-2 transition-all cursor-pointer ${
                                                    itemsPerPage === n
                                                        ? 'bg-primary-glow text-white shadow-xs'
                                                        : 'text-foreground/75 hover:text-foreground hover:bg-card-header-bg'
                                                }`}
                                            >
                                                <span>{n}</span>
                                                <span className="text-[10px] opacity-70">
                                                    / page
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                            {/* Filter Dropdown (All, Smart, Manual, Featured, Drafts) */}
                            <div className="relative" ref={filterMenuRef}>
                                <button
                                    type="button"
                                    onClick={() => setIsFilterMenuOpen((prev) => !prev)}
                                    title={`Filter: ${activeFilterMeta.label} (${activeFilterMeta.count})`}
                                    className={`h-7 px-2.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                                        filterTab !== 'all' || isFilterMenuOpen
                                            ? 'bg-primary-glow text-white shadow-sm'
                                            : 'bg-card-bg text-foreground hover:text-primary-glow shadow-sm'
                                    }`}
                                >
                                    <ActiveFilterIcon className="w-3.5 h-3.5 shrink-0" />
                                    <span>{activeFilterMeta.label}</span>
                                    <span className="text-[10px] opacity-75">
                                        ({activeFilterMeta.count})
                                    </span>
                                    <ChevronDown className="w-3 h-3 opacity-70" />
                                </button>

                                {isFilterMenuOpen && (
                                    <div className="absolute right-0 top-full mt-2 z-40 p-1.5 bg-card-bg border border-card-border rounded-xl shadow-2xl flex flex-col gap-1 min-w-[165px] animate-in fade-in zoom-in-95 duration-150">
                                        {filterOptions.map((opt) => {
                                            const OptIcon = opt.icon;
                                            const isSelected = filterTab === opt.id;
                                            return (
                                                <button
                                                    key={opt.id}
                                                    type="button"
                                                    onClick={() => {
                                                        setFilterTab(opt.id);
                                                        setIsFilterMenuOpen(false);
                                                    }}
                                                    className={`w-full px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center justify-between gap-3 transition-all cursor-pointer ${
                                                        isSelected
                                                            ? opt.activeClass
                                                            : 'text-foreground/75 hover:text-foreground hover:bg-card-header-bg'
                                                    }`}
                                                >
                                                    <span className="flex items-center gap-2">
                                                        <OptIcon className="w-3.5 h-3.5 shrink-0" />
                                                        <span>{opt.label}</span>
                                                    </span>
                                                    <span className="text-[11px] font-mono opacity-80">
                                                        {opt.count}
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* Smoothly Animated Cards-Per-Row Selector (expands in Grid View, collapses in Table View) */}
                            <div
                                ref={colsMenuRef}
                                className={`relative transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                                    viewMode === 'grid'
                                        ? 'w-7 opacity-100 scale-100 translate-x-0 pointer-events-auto'
                                        : 'w-0 opacity-0 scale-75 translate-x-1 -ml-1 pointer-events-none overflow-hidden'
                                }`}
                            >
                                <button
                                    type="button"
                                    tabIndex={viewMode === 'grid' ? 0 : -1}
                                    onClick={() => setIsColsMenuOpen((prev) => !prev)}
                                    aria-label={`Cards per row: ${cardsPerRow}`}
                                    title={`Cards per row (${cardsPerRow})`}
                                    className={`w-7 h-7 rounded-lg text-xs font-extrabold flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                                        isColsMenuOpen
                                            ? 'bg-primary-glow text-white shadow-sm'
                                            : 'bg-card-bg text-primary-glow hover:bg-primary-glow/15 shadow-sm'
                                    }`}
                                >
                                    {cardsPerRow}
                                </button>

                                {isColsMenuOpen && viewMode === 'grid' && (
                                    <div className="absolute right-0 top-full mt-2 z-40 p-1.5 bg-card-bg border border-card-border rounded-xl shadow-2xl flex flex-col gap-1 min-w-[44px] animate-in fade-in zoom-in-95 duration-150">
                                        {[3, 4, 5, 6, 7, 8].map((n) => (
                                            <button
                                                key={n}
                                                type="button"
                                                onClick={() => handleCardsPerRowChange(n)}
                                                className={`w-8 h-7 rounded-lg text-xs font-bold flex items-center justify-center transition-all cursor-pointer ${
                                                    cardsPerRow === n
                                                        ? 'bg-primary-glow text-white shadow-xs'
                                                        : 'text-foreground/70 hover:text-foreground hover:bg-card-header-bg'
                                                }`}
                                            >
                                                {n}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

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
                                onClick={() => {
                                    setIsColsMenuOpen(false);
                                    setViewMode('table');
                                }}
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
                    <div className="bg-card-bg border border-card-border rounded-xl p-16 flex flex-col items-center justify-center gap-3 text-foreground/50">
                        <Loader2 className="w-8 h-8 animate-spin text-primary-glow" />
                        <span className="text-sm font-medium">Loading collections catalog...</span>
                    </div>
                ) : filteredCollections.length === 0 ? (
                    <div className="bg-card-bg border border-card-border rounded-xl p-16 text-center">
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
                    <>
                        <div className={`grid ${GRID_COLS_CLASS[cardsPerRow] || GRID_COLS_CLASS[6]}`}>
                            {paginatedCollections.map((col) => {
                            const isSmartDynamic = col.type === 'smart_dynamic';
                            const isSmartSnapshot = col.type === 'smart_snapshot';
                            const isSmart = isSmartDynamic || isSmartSnapshot;
                            const isDraft = col.status === 'draft';
                            const hasCustomSquareCard = Boolean(col.trendingCardImagePath);
                            const isCompactCard = cardsPerRow >= 6;
                            const btnSizeClass = isCompactCard ? 'w-7 h-7 rounded-lg' : 'w-8 h-8 rounded-xl';
                            const edgePosTopLeft = isCompactCard ? 'top-2 left-2' : 'top-3 left-3';
                            const edgePosTopRight = isCompactCard ? 'top-2 right-2' : 'top-3 right-3';
                            const edgePosBottomLeft = isCompactCard ? 'bottom-2 left-2' : 'bottom-3 left-3';
                            const edgePosBottomRight = isCompactCard ? 'bottom-2 right-2' : 'bottom-3 right-3';
                            const typeLabel = isSmartDynamic
                                ? 'Smart (Live)'
                                : isSmartSnapshot
                                ? 'Smart (Snapshot)'
                                : 'Manual';
                            const statusLabel =
                                col.status === 'published' ? 'Published' : 'Draft';

                            // Unique visual theme per collection type & state
                            const cardFrameClass = isDraft
                                ? 'border-2 border-dashed border-amber-500/75 bg-amber-500/[0.05] ring-1 ring-amber-500/20 group-hover:border-amber-400'
                                : col.isFeatured
                                ? 'border-2 border-amber-400/75 bg-gradient-to-br from-amber-500/[0.10] via-card-bg to-amber-500/[0.03] ring-1 ring-amber-400/30 group-hover:border-amber-300'
                                : isSmartDynamic
                                ? 'border-2 border-blue-500/55 bg-gradient-to-br from-blue-500/[0.08] via-card-bg to-indigo-500/[0.03] ring-1 ring-blue-500/15 group-hover:border-blue-400'
                                : isSmartSnapshot
                                ? 'border-2 border-purple-500/55 bg-gradient-to-br from-purple-500/[0.08] via-card-bg to-fuchsia-500/[0.03] ring-1 ring-purple-500/15 group-hover:border-purple-400'
                                : 'border-2 border-emerald-500/50 bg-gradient-to-br from-emerald-500/[0.07] via-card-bg to-teal-500/[0.03] ring-1 ring-emerald-500/15 group-hover:border-emerald-400';

                            const cardPatternStyle = isDraft
                                ? {
                                      backgroundImage:
                                          'repeating-linear-gradient(-45deg, rgba(245, 158, 11, 0.08) 0px, rgba(245, 158, 11, 0.08) 8px, transparent 8px, transparent 16px)',
                                  }
                                : isSmartDynamic
                                ? {
                                      backgroundImage:
                                          'radial-gradient(rgba(59, 130, 246, 0.16) 1.25px, transparent 1.25px)',
                                      backgroundSize: '12px 12px',
                                  }
                                : isSmartSnapshot
                                ? {
                                      backgroundImage:
                                          'radial-gradient(rgba(168, 85, 247, 0.16) 1.25px, transparent 1.25px)',
                                      backgroundSize: '12px 12px',
                                  }
                                : {
                                      backgroundImage:
                                          'linear-gradient(45deg, rgba(16, 185, 129, 0.06) 25%, transparent 25%), linear-gradient(-45deg, rgba(16, 185, 129, 0.06) 25%, transparent 25%), linear-gradient(45deg, transparent 75%, rgba(16, 185, 129, 0.06) 75%), linear-gradient(-45deg, transparent 75%, rgba(16, 185, 129, 0.06) 75%)',
                                      backgroundSize: '12px 12px',
                                      backgroundPosition: '0 0, 0 6px, 6px -6px, -6px 0px',
                                  };

                            const innerCellBorderClass = isDraft
                                ? 'border-amber-500/25'
                                : col.isFeatured
                                ? 'border-amber-400/30'
                                : isSmartDynamic
                                ? 'border-blue-500/25'
                                : isSmartSnapshot
                                ? 'border-purple-500/25'
                                : 'border-emerald-500/25';

                            const titleTextClass = isDraft
                                ? 'text-amber-400/90 group-hover:text-amber-300'
                                : col.isFeatured
                                ? 'text-foreground dark:text-amber-300 dark:group-hover:text-amber-200'
                                : isSmartDynamic
                                ? 'text-foreground group-hover:text-blue-400'
                                : isSmartSnapshot
                                ? 'text-foreground group-hover:text-purple-400'
                                : 'text-foreground group-hover:text-emerald-400';

                            return (
                                <div
                                    key={col.id}
                                    className="group flex flex-col"
                                >
                                    {/* 1:1 Square Visual Card */}
                                    <div
                                        className={`relative aspect-square w-full ${
                                            hasCustomSquareCard ? 'p-0' : isCompactCard ? 'p-2' : 'p-3'
                                        } rounded-2xl overflow-hidden transition-all duration-300 ${cardFrameClass}`}
                                        style={cardPatternStyle}
                                    >
                                        <div
                                            className={`w-full h-full transition-all duration-300 ${
                                                isDraft
                                                    ? 'opacity-55 grayscale-[40%] group-hover:opacity-85 group-hover:grayscale-0'
                                                    : ''
                                            }`}
                                        >
                                            {hasCustomSquareCard ? (
                                                <img
                                                    src={col.trendingCardImagePath}
                                                    alt={col.name}
                                                    className="w-full h-full object-cover pointer-events-none group-hover:scale-105 transition-transform duration-300"
                                                />
                                            ) : col.previewImages && col.previewImages.length > 0 ? (
                                                <div className="h-full w-full grid grid-cols-2 grid-rows-2 gap-1.5">
                                                    {col.previewImages.slice(0, 4).map((img, idx) => (
                                                        <div
                                                            key={img.id || idx}
                                                            className={`relative h-full w-full rounded-xl bg-card-bg/85 backdrop-blur-sm border ${innerCellBorderClass} p-1.5 flex items-center justify-center overflow-hidden`}
                                                        >
                                                            <img
                                                                src={img.thumbPath || img.path}
                                                                alt=""
                                                                className="max-h-full max-w-full object-contain pointer-events-none group-hover:scale-105 transition-transform duration-300"
                                                            />
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : col.coverImagePath ? (
                                                <div className="h-full w-full flex items-center justify-center p-2.5">
                                                    <img
                                                        src={col.coverImagePath}
                                                        alt={col.name}
                                                        className="max-h-full max-w-full object-contain pointer-events-none group-hover:scale-105 transition-transform duration-300"
                                                    />
                                                </div>
                                            ) : (
                                                <div className="h-full w-full flex flex-col items-center justify-center text-foreground/30">
                                                    <Layers className="w-7 h-7 mb-1" />
                                                    <span className="text-[11px]">No preview assets</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Prominent Center Draft Watermark Badge */}
                                        {isDraft && (
                                            <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
                                                <span className="px-2.5 py-1 rounded-full bg-amber-500/95 text-slate-950 text-[10px] font-black uppercase tracking-widest shadow-lg border border-amber-300/60 flex items-center gap-1">
                                                    <EyeOff className="w-3 h-3 stroke-[2.5]" />
                                                    <span>Draft</span>
                                                </span>
                                            </div>
                                        )}

                                        {/* Top-Left: Icon-Only Type & Status Pills with Hover Pill Tooltips */}
                                        <div className={`absolute ${edgePosTopLeft} z-20 flex items-center gap-1`}>
                                            {/* Collection Type Icon Pill */}
                                            <div className="relative group/type">
                                                <span
                                                    aria-label={typeLabel}
                                                    className={`${btnSizeClass} backdrop-blur-md border shadow-md flex items-center justify-center ${
                                                        isSmartDynamic
                                                            ? 'bg-blue-500/20 text-blue-400 border-blue-400/50'
                                                            : isSmartSnapshot
                                                            ? 'bg-purple-500/20 text-purple-400 border-purple-400/50'
                                                            : 'bg-emerald-500/20 text-emerald-400 border-emerald-400/50'
                                                    }`}
                                                >
                                                    {isSmartDynamic ? (
                                                        <Sparkles className="w-3.5 h-3.5" />
                                                    ) : isSmartSnapshot ? (
                                                        <Camera className="w-3.5 h-3.5" />
                                                    ) : (
                                                        <Hand className="w-3.5 h-3.5" />
                                                    )}
                                                </span>
                                                <span className="pointer-events-none absolute left-0 top-full mt-1.5 px-2.5 py-1 rounded-full bg-slate-900/95 text-white text-[10px] font-bold uppercase tracking-wider whitespace-nowrap border border-white/15 shadow-lg opacity-0 translate-y-0.5 group-hover/type:opacity-100 group-hover/type:translate-y-0 transition-all duration-150 z-30">
                                                    {typeLabel}
                                                </span>
                                            </div>

                                            {/* Published / Draft Status Icon Pill */}
                                            <div className="relative group/status">
                                                <button
                                                    type="button"
                                                    onClick={() => handleToggleStatus(col)}
                                                    aria-label={statusLabel}
                                                    className={`${btnSizeClass} backdrop-blur-md border shadow-md flex items-center justify-center transition-all cursor-pointer ${
                                                        col.status === 'published'
                                                            ? 'bg-card-bg/90 text-emerald-400 border-emerald-500/35 hover:bg-emerald-500/20'
                                                            : 'bg-amber-500/25 text-amber-300 border-amber-400/60 hover:bg-amber-500/35'
                                                    }`}
                                                >
                                                    {col.status === 'published' ? (
                                                        <Eye className="w-3.5 h-3.5" />
                                                    ) : (
                                                        <EyeOff className="w-3.5 h-3.5" />
                                                    )}
                                                </button>
                                                <span className="pointer-events-none absolute left-0 top-full mt-1.5 px-2.5 py-1 rounded-full bg-slate-900/95 text-white text-[10px] font-bold uppercase tracking-wider whitespace-nowrap border border-white/15 shadow-lg opacity-0 translate-y-0.5 group-hover/status:opacity-100 group-hover/status:translate-y-0 transition-all duration-150 z-30">
                                                    {statusLabel}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Top-Right: Feature This Pack Icon Button */}
                                        <div className={`absolute ${edgePosTopRight} z-20 group/feat`}>
                                            <button
                                                type="button"
                                                onClick={() => handleToggleFeatured(col)}
                                                aria-label={col.isFeatured ? 'Featured pack' : 'Feature this pack'}
                                                className={`${btnSizeClass} backdrop-blur-md shadow-md flex items-center justify-center transition-all cursor-pointer ${
                                                    col.isFeatured
                                                        ? 'bg-amber-500 text-white shadow-amber-500/30 ring-2 ring-amber-300/50'
                                                        : 'bg-card-bg/90 border border-card-border text-foreground/50 hover:text-amber-400'
                                                }`}
                                            >
                                                <Star className="w-3.5 h-3.5 fill-current" />
                                            </button>
                                            <span className="pointer-events-none absolute right-0 top-full mt-1.5 px-2.5 py-1 rounded-full bg-slate-900/95 text-white text-[10px] font-bold uppercase tracking-wider whitespace-nowrap border border-white/15 shadow-lg opacity-0 translate-y-0.5 group-hover/feat:opacity-100 group-hover/feat:translate-y-0 transition-all duration-150 z-30">
                                                {col.isFeatured ? 'Featured Pack' : 'Feature This Pack'}
                                            </span>
                                        </div>

                                        {/* Bottom-Left: View Public Page & Delete Collection Icons */}
                                        <div className={`absolute ${edgePosBottomLeft} z-20 flex items-center gap-1`}>
                                            <div className="relative group/view">
                                                <a
                                                    href={`/collections/${col.slug}`}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    aria-label="View public page"
                                                    className={`${btnSizeClass} bg-card-bg/90 backdrop-blur-md border border-card-border hover:border-primary-glow text-foreground/75 hover:text-primary-glow shadow-md flex items-center justify-center transition-all`}
                                                >
                                                    <ExternalLink className="w-3.5 h-3.5" />
                                                </a>
                                                <span className="pointer-events-none absolute left-0 bottom-full mb-1.5 px-2.5 py-1 rounded-full bg-slate-900/95 text-white text-[10px] font-bold uppercase tracking-wider whitespace-nowrap border border-white/15 shadow-lg opacity-0 -translate-y-0.5 group-hover/view:opacity-100 group-hover/view:translate-y-0 transition-all duration-150 z-30">
                                                    View Public Page
                                                </span>
                                            </div>

                                            <div className="relative group/del">
                                                <button
                                                    type="button"
                                                    onClick={() => setDeleteTarget(col)}
                                                    aria-label="Delete collection"
                                                    className={`${btnSizeClass} bg-card-bg/90 backdrop-blur-md border border-card-border hover:border-red-500/60 text-foreground/75 hover:text-red-400 shadow-md flex items-center justify-center transition-all cursor-pointer`}
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                                <span className="pointer-events-none absolute left-0 bottom-full mb-1.5 px-2.5 py-1 rounded-full bg-slate-900/95 text-white text-[10px] font-bold uppercase tracking-wider whitespace-nowrap border border-white/15 shadow-lg opacity-0 -translate-y-0.5 group-hover/del:opacity-100 group-hover/del:translate-y-0 transition-all duration-150 z-30">
                                                    Delete Collection
                                                </span>
                                            </div>
                                        </div>

                                        {/* Bottom-Right: Asset Count Pill & Manage Assets Icon */}
                                        <div className={`absolute ${edgePosBottomRight} z-20 flex items-center gap-1`}>
                                            <span
                                                className={`${
                                                    isCompactCard
                                                        ? 'h-7 px-2 rounded-lg text-[11px]'
                                                        : 'h-8 px-2.5 rounded-xl text-xs'
                                                } bg-card-bg/90 border border-card-border backdrop-blur-md text-foreground font-bold shadow-md inline-flex items-center`}
                                            >
                                                {col.imageCount} PNG{col.imageCount === 1 ? '' : 's'}
                                            </span>

                                            <div className="relative group/manage">
                                                <button
                                                    type="button"
                                                    onClick={() => setEditingCollectionId(col.id)}
                                                    aria-label="Manage Assets"
                                                    className={`${btnSizeClass} bg-card-bg/90 backdrop-blur-md border border-card-border hover:border-primary-glow text-primary-glow hover:bg-primary-glow hover:text-white shadow-md flex items-center justify-center transition-all cursor-pointer`}
                                                >
                                                    <Edit3 className="w-3.5 h-3.5" />
                                                </button>
                                                <span className="pointer-events-none absolute right-0 bottom-full mb-1.5 px-2.5 py-1 rounded-full bg-slate-900/95 text-white text-[10px] font-bold uppercase tracking-wider whitespace-nowrap border border-white/15 shadow-lg opacity-0 -translate-y-0.5 group-hover/manage:opacity-100 group-hover/manage:translate-y-0 transition-all duration-150 z-30">
                                                    Manage Assets
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Title & Type/State Pill Below the Square Card */}
                                    <div className="mt-2 px-1 flex items-center justify-between gap-1.5">
                                        <button
                                            type="button"
                                            onClick={() => setEditingCollectionId(col.id)}
                                            className={`${
                                                isCompactCard ? 'text-xs' : 'text-sm'
                                            } font-bold ${titleTextClass} transition-colors truncate text-left cursor-pointer`}
                                        >
                                            {col.name}
                                        </button>
                                        {isDraft ? (
                                            <span className="shrink-0 px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30 text-[9px] font-extrabold uppercase tracking-wider">
                                                Draft
                                            </span>
                                        ) : col.isFeatured ? (
                                            <span className="shrink-0 px-1.5 py-0.5 rounded bg-slate-900 text-amber-400 border border-slate-800 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-400/40 text-[9px] font-extrabold uppercase tracking-wider">
                                                Featured
                                            </span>
                                        ) : isSmartDynamic ? (
                                            <span className="shrink-0 px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-400 border border-blue-500/30 text-[9px] font-extrabold uppercase tracking-wider">
                                                Smart
                                            </span>
                                        ) : isSmartSnapshot ? (
                                            <span className="shrink-0 px-1.5 py-0.5 rounded bg-purple-500/15 text-purple-400 border border-purple-500/30 text-[9px] font-extrabold uppercase tracking-wider">
                                                Snapshot
                                            </span>
                                        ) : (
                                            <span className="shrink-0 px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[9px] font-extrabold uppercase tracking-wider">
                                                Manual
                                            </span>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                        </div>

                        <GlassCard className="px-4 py-2.5 !shadow-none">
                            <Pagination
                                currentPage={currentPage}
                                totalPages={totalPages}
                                totalItems={filteredCollections.length}
                                itemsPerPage={itemsPerPage}
                                itemLabel="collection"
                                onPageChange={(page) => {
                                    setCurrentPage(page);
                                    window.scrollTo({ top: 0, behavior: 'smooth' });
                                }}
                            />
                        </GlassCard>
                    </>
                ) : (
                    <>
                        <div className="bg-card-bg border border-card-border rounded-xl overflow-hidden">
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
                                        {paginatedCollections.map((col) => {
                                        const isSmart = col.type === 'smart_dynamic' || col.type === 'smart_snapshot';

                                        return (
                                            <tr key={col.id} className="hover:bg-white/[0.02] transition-colors">
                                                <td className="py-3.5 px-5">
                                                    <div className="flex items-center gap-3">
                                                        <div
                                                            className={`w-10 h-10 rounded-lg bg-foreground/[0.03] border border-card-border ${
                                                                col.trendingCardImagePath ? 'p-0' : 'p-1'
                                                            } flex items-center justify-center shrink-0 overflow-hidden`}
                                                        >
                                                            {col.trendingCardImagePath ? (
                                                                <img
                                                                    src={col.trendingCardImagePath}
                                                                    alt=""
                                                                    className="w-full h-full object-cover"
                                                                />
                                                            ) : col.coverImagePath || (col.previewImages && col.previewImages[0]?.path) ? (
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

                        <GlassCard className="px-4 py-2.5 !shadow-none">
                            <Pagination
                                currentPage={currentPage}
                                totalPages={totalPages}
                                totalItems={filteredCollections.length}
                                itemsPerPage={itemsPerPage}
                                itemLabel="collection"
                                onPageChange={(page) => {
                                    setCurrentPage(page);
                                    window.scrollTo({ top: 0, behavior: 'smooth' });
                                }}
                            />
                        </GlassCard>
                    </>
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
