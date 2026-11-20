import { useState, useEffect, useMemo } from 'react';
import { Head, Link } from '@inertiajs/react';
import {
    Search,
    AlertTriangle,
    TrendingUp,
    Upload,
    FolderOpen,
    Copy,
    Download,
    RefreshCw,
    Lock,
    CheckCircle2,
    FileWarning,
    Tags,
    Clock,
    History,
    ShieldCheck,
    LayoutGrid,
    ChevronLeft,
    ChevronRight,
    X,
} from 'lucide-react';
import { toast } from 'sonner';
import AdminLayout from '@/Layouts/AdminLayout';
import { StatCard } from '@/components/ui/StatCard';
import ResponsiveTableWrapper from '@/components/admin/ResponsiveTableWrapper';

const PERMISSION_LABELS = {
    upload_images: 'Upload Images',
    edit_images: 'Edit Images & AI',
    delete_images: 'Delete Images',
    manage_collections: 'Collections & Categories',
    view_analytics: 'View Analytics',
    export_analytics: 'Export Analytics',
    manage_general_settings: 'General Settings',
    manage_api_keys: 'API Keys',
    manage_code_injection: 'Code Injection',
    manage_data_seo: 'Data & SEO',
};

const TIMEFRAMES = [
    { value: '7d', label: '7 Days', shortLabel: '7' },
    { value: '30d', label: '30 Days', shortLabel: '30' },
    { value: '90d', label: '90 Days', shortLabel: '90' },
    { value: 'all', label: 'All Time', shortLabel: null },
];

const ROWS_PER_PAGE = 10;

export default function TeamWorkspace() {
    const [session, setSession] = useState(null);
    const [workspace, setWorkspace] = useState(null);
    const [loading, setLoading] = useState(true);
    const [timeframe, setTimeframe] = useState('30d');
    const [queryFilter, setQueryFilter] = useState('');
    const [activeTab, setActiveTab] = useState('gaps');
    const [currentPage, setCurrentPage] = useState(1);

    useEffect(() => {
        fetch('/api/auth/me')
            .then((res) => res.json())
            .then((data) => setSession(data))
            .catch(() => {});
    }, []);

    const loadWorkspace = async (selectedRange = timeframe, searchTerm = queryFilter) => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ timeframe: selectedRange });
            if (searchTerm.trim()) {
                params.set('q', searchTerm.trim());
            }
            const res = await fetch(`/api/team/workspace?${params.toString()}`);
            if (res.ok) {
                const data = await res.json();
                setWorkspace(data);
            } else {
                toast.error('Failed to load workspace intelligence');
            }
        } catch {
            toast.error('Failed to load workspace intelligence');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            loadWorkspace(timeframe, queryFilter);
        }, 180);
        return () => clearTimeout(timer);
    }, [timeframe, queryFilter]);

    const permissions = session?.permissions || [];
    const isSuperAdmin = !session || session.role === 'super_admin' || permissions.includes('*');
    const hasPerm = (perm) => isSuperAdmin || permissions.includes(perm);

    const canUpload = hasPerm('upload_images');
    const canBrowseFiles = hasPerm('upload_images') || hasPerm('edit_images') || hasPerm('delete_images');

    const summary = workspace?.summary || {};
    const searchIntel = workspace?.searchIntelligence || {
        zeroResults: [],
        lowResults: [],
        topSearches: [],
    };
    const catalogQueue = workspace?.catalogQueue || {
        drafts: [],
        needsSeo: [],
        popularTags: [],
    };

    const currentRows = useMemo(() => {
        if (activeTab === 'gaps') return searchIntel.zeroResults || [];
        if (activeTab === 'low') return searchIntel.lowResults || [];
        if (activeTab === 'top') return searchIntel.topSearches || [];
        return [];
    }, [activeTab, searchIntel]);

    useEffect(() => {
        setCurrentPage(1);
    }, [activeTab, timeframe, queryFilter]);

    const totalPages = Math.max(1, Math.ceil(currentRows.length / ROWS_PER_PAGE));
    const safePage = Math.min(currentPage, totalPages);
    const paginatedRows = useMemo(() => {
        const start = (safePage - 1) * ROWS_PER_PAGE;
        return currentRows.slice(start, start + ROWS_PER_PAGE);
    }, [currentRows, safePage]);

    const copyKeyword = (text) => {
        navigator.clipboard.writeText(text);
        toast.success(`Copied "${text}"`);
    };

    const exportSearchCsv = () => {
        if (!currentRows.length) {
            toast.error('No search rows to export');
            return;
        }
        const headers = ['Keyword', 'Searches', 'Avg Results', 'Min Results', 'Max Results', 'Status', 'Last Searched'];
        const escapeCell = (val) => `"${String(val ?? '').replace(/"/g, '""')}"`;
        const lines = [
            headers.join(','),
            ...currentRows.map((row) =>
                [
                    escapeCell(row.query),
                    row.count,
                    row.avgResults,
                    row.minResults,
                    row.maxResults,
                    row.status,
                    escapeCell(row.lastSearchedAt || ''),
                ].join(',')
            ),
        ];

        const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `png101-search-intelligence-${activeTab}-${timeframe}.csv`;
        link.click();
        URL.revokeObjectURL(url);
        toast.success(`Exported ${currentRows.length} keywords to CSV`);
    };

    const formatRelativeTime = (isoOrSql) => {
        if (!isoOrSql) return '—';
        const d = new Date(isoOrSql);
        if (Number.isNaN(d.getTime())) return String(isoOrSql);
        const diffHours = Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60));
        if (diffHours < 1) return 'Just now';
        if (diffHours < 24) return `${diffHours}h ago`;
        const diffDays = Math.floor(diffHours / 24);
        if (diffDays < 30) return `${diffDays}d ago`;
        return d.toLocaleDateString();
    };

    const actionQueueTotal = (summary.draftImages || 0) + (summary.lowSeoImages || 0);

    return (
        <AdminLayout>
            <Head title="Dashboard & Search Intelligence - Png101 Admin" />
            <div className="space-y-6 pb-20">
                {/* Welcome Header */}
                <div className="bg-card-bg border border-card-border rounded-2xl p-6">
                    <div className="space-y-2">
                        <h1 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center gap-3">
                            <LayoutGrid className="w-7 h-7 text-primary-glow shrink-0" />
                            <span>Welcome back{session?.name ? `, ${session.name}` : ''}</span>
                        </h1>

                        {!isSuperAdmin && permissions.length > 0 && (
                            <div className="flex flex-wrap items-center gap-1.5 pt-1">
                                <span className="text-[11px] font-bold uppercase tracking-wider text-foreground/50 mr-1 flex items-center gap-1">
                                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                                    Your Access:
                                </span>
                                {permissions.map((perm) => (
                                    <span
                                        key={perm}
                                        className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                    >
                                        {PERMISSION_LABELS[perm] || perm}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Primary Stat Cards (Laptops & Desktops >= 1280px only; hidden on Mobile & Tablets in Portrait/Landscape) */}
                <div className="hidden xl:grid xl:grid-cols-4 gap-5">
                    <StatCard
                        title="Total Searches"
                        value={summary.totalSearches ?? 0}
                        subtitle={`${summary.uniqueQueries ?? 0} unique keywords (${timeframe})`}
                        icon={<Search className="w-6 h-6" />}
                    />
                    <StatCard
                        title="Content Gaps (0 Results)"
                        value={summary.zeroResultQueries ?? 0}
                        subtitle={`${summary.zeroResultShare ?? 0}% of searches found nothing`}
                        icon={<AlertTriangle className="w-6 h-6" />}
                    />
                    <StatCard
                        title="Under-Served (1-3 Results)"
                        value={summary.lowResultQueries ?? 0}
                        subtitle="Topics needing more PNG variety"
                        icon={<TrendingUp className="w-6 h-6" />}
                    />
                    <StatCard
                        title="Content Quality Queue"
                        value={actionQueueTotal}
                        subtitle={`${summary.draftImages ?? 0} drafts · ${summary.lowSeoImages ?? 0} low-SEO PNGs`}
                        icon={<FileWarning className="w-6 h-6" />}
                    />
                </div>

                {/* Extended Search Intelligence + Catalog Quality Workspace */}
                <div className="bg-card-bg border border-card-border rounded-2xl overflow-hidden">
                    {/* Toolbar */}
                    <div className="p-4 sm:p-5 border-b border-card-border space-y-4">
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 sm:gap-4">
                            <div>
                                <h2 className="text-sm sm:text-lg font-bold text-foreground flex items-center gap-1.5 sm:gap-2">
                                    <Search className="w-4 h-4 sm:w-5 sm:h-5 text-primary-glow shrink-0" />
                                    <span className="sm:hidden">Search Intelligence &amp; Queue</span>
                                    <span className="hidden sm:inline">Extended Search Intelligence &amp; Action Queue</span>
                                </h2>
                            </div>

                            <div className="flex flex-wrap items-center justify-between lg:justify-start w-full lg:w-auto gap-2">
                                <div className="order-2 lg:order-1 inline-flex items-center gap-1 p-1 bg-card-header-bg border border-card-border rounded-xl">
                                    {TIMEFRAMES.map((tf) => (
                                        <button
                                            key={tf.value}
                                            type="button"
                                            onClick={() => setTimeframe(tf.value)}
                                            title={tf.label}
                                            aria-label={tf.label}
                                            className={`h-7 w-7 px-0 xl:w-auto xl:px-2.5 rounded-lg text-xs font-bold inline-flex items-center justify-center transition-all cursor-pointer ${
                                                timeframe === tf.value
                                                    ? 'bg-primary-glow text-white shadow-sm'
                                                    : 'bg-card-bg text-foreground/70 hover:text-primary-glow shadow-sm'
                                            }`}
                                        >
                                            {tf.shortLabel ? (
                                                <span className="xl:hidden">{tf.shortLabel}</span>
                                            ) : (
                                                <History className="w-3.5 h-3.5 xl:hidden" />
                                            )}
                                            <span className="hidden xl:inline">{tf.label}</span>
                                        </button>
                                    ))}
                                </div>

                                <div className="order-1 lg:order-2 inline-flex items-center gap-1 p-1 bg-card-header-bg border border-card-border rounded-xl">
                                    <button
                                        type="button"
                                        onClick={() => loadWorkspace(timeframe, queryFilter)}
                                        className="h-7 w-7 px-0 xl:w-auto xl:px-2.5 rounded-lg bg-card-bg hover:text-primary-glow text-xs font-bold text-foreground/80 shadow-sm inline-flex items-center justify-center xl:gap-1.5 cursor-pointer transition-all"
                                        title="Refresh data"
                                        aria-label="Refresh"
                                    >
                                        <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-primary-glow' : ''}`} />
                                        <span className="hidden xl:inline">Refresh</span>
                                    </button>

                                    {activeTab !== 'queue' && (
                                        <button
                                            type="button"
                                            onClick={exportSearchCsv}
                                            disabled={!currentRows.length}
                                            className="h-7 w-7 px-0 xl:w-auto xl:px-2.5 rounded-lg bg-card-bg hover:bg-emerald-500/20 text-xs font-bold text-emerald-400 shadow-sm inline-flex items-center justify-center xl:gap-1.5 cursor-pointer disabled:opacity-40 transition-all"
                                            title="Export CSV"
                                            aria-label="Export CSV"
                                        >
                                            <Download className="w-3.5 h-3.5" />
                                            <span className="hidden xl:inline">Export CSV</span>
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Tabs + Filter Input */}
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                            <div className="flex items-center justify-between lg:justify-start w-full lg:w-auto gap-1 p-1 bg-card-header-bg border border-card-border rounded-xl self-start overflow-hidden">
                                <button
                                    type="button"
                                    onClick={() => setActiveTab('gaps')}
                                    title="Content Gaps (0 Results)"
                                    aria-label="Content Gaps (0 Results)"
                                    className={`h-7 px-2 sm:px-2.5 rounded-lg text-xs font-bold inline-flex items-center justify-center gap-1 sm:gap-1.5 cursor-pointer transition-all duration-300 ease-out ${
                                        activeTab === 'gaps'
                                            ? 'flex-1 min-w-0 lg:flex-initial bg-amber-500 text-slate-950 shadow-sm'
                                            : 'shrink-0 bg-card-bg text-foreground/70 hover:text-foreground shadow-sm'
                                    }`}
                                >
                                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                                    {activeTab === 'gaps' && (
                                        <>
                                            <span className="sm:hidden truncate">Gaps</span>
                                            <span className="hidden sm:inline xl:hidden truncate">
                                                Content Gaps (0 Results)
                                            </span>
                                        </>
                                    )}
                                    <span className="hidden xl:inline">Content Gaps (0 Results)</span>
                                    <span className="px-1.5 py-0.5 rounded-full bg-black/15 text-[10px] leading-none shrink-0">
                                        {searchIntel.zeroResults.length}
                                    </span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setActiveTab('low')}
                                    title="Under-Served (1-3 Results)"
                                    aria-label="Under-Served (1-3 Results)"
                                    className={`h-7 px-2 sm:px-2.5 rounded-lg text-xs font-bold inline-flex items-center justify-center gap-1 sm:gap-1.5 cursor-pointer transition-all duration-300 ease-out ${
                                        activeTab === 'low'
                                            ? 'flex-1 min-w-0 lg:flex-initial bg-primary-glow text-white shadow-sm'
                                            : 'shrink-0 bg-card-bg text-foreground/70 hover:text-foreground shadow-sm'
                                    }`}
                                >
                                    <TrendingUp className="w-3.5 h-3.5 shrink-0" />
                                    {activeTab === 'low' && (
                                        <>
                                            <span className="sm:hidden truncate">Low</span>
                                            <span className="hidden sm:inline xl:hidden truncate">
                                                Under-Served (1-3 Results)
                                            </span>
                                        </>
                                    )}
                                    <span className="hidden xl:inline">Under-Served (1-3 Results)</span>
                                    <span className="px-1.5 py-0.5 rounded-full bg-black/15 text-[10px] leading-none shrink-0">
                                        {searchIntel.lowResults.length}
                                    </span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setActiveTab('top')}
                                    title="All Top Searches"
                                    aria-label="All Top Searches"
                                    className={`h-7 px-2 sm:px-2.5 rounded-lg text-xs font-bold inline-flex items-center justify-center gap-1 sm:gap-1.5 cursor-pointer transition-all duration-300 ease-out ${
                                        activeTab === 'top'
                                            ? 'flex-1 min-w-0 lg:flex-initial bg-purple-600 text-white shadow-sm'
                                            : 'shrink-0 bg-card-bg text-foreground/70 hover:text-foreground shadow-sm'
                                    }`}
                                >
                                    <Search className="w-3.5 h-3.5 shrink-0" />
                                    {activeTab === 'top' && (
                                        <>
                                            <span className="sm:hidden truncate">Top</span>
                                            <span className="hidden sm:inline xl:hidden truncate">
                                                All Top Searches
                                            </span>
                                        </>
                                    )}
                                    <span className="hidden xl:inline">All Top Searches</span>
                                    <span className="px-1.5 py-0.5 rounded-full bg-black/15 text-[10px] leading-none shrink-0">
                                        {searchIntel.topSearches.length}
                                    </span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setActiveTab('queue')}
                                    title="Catalog Quality Queue"
                                    aria-label="Catalog Quality Queue"
                                    className={`h-7 px-2 sm:px-2.5 rounded-lg text-xs font-bold inline-flex items-center justify-center gap-1 sm:gap-1.5 cursor-pointer transition-all duration-300 ease-out ${
                                        activeTab === 'queue'
                                            ? 'flex-1 min-w-0 lg:flex-initial bg-emerald-600 text-white shadow-sm'
                                            : 'shrink-0 bg-card-bg text-foreground/70 hover:text-foreground shadow-sm'
                                    }`}
                                >
                                    <FileWarning className="w-3.5 h-3.5 shrink-0" />
                                    {activeTab === 'queue' && (
                                        <>
                                            <span className="sm:hidden truncate">Queue</span>
                                            <span className="hidden sm:inline xl:hidden truncate">
                                                Catalog Quality Queue
                                            </span>
                                        </>
                                    )}
                                    <span className="hidden xl:inline">Catalog Quality Queue</span>
                                    <span className="px-1.5 py-0.5 rounded-full bg-black/15 text-[10px] leading-none shrink-0">
                                        {actionQueueTotal}
                                    </span>
                                </button>
                            </div>

                            {activeTab !== 'queue' && (
                                <div className="w-full lg:w-56 xl:w-72 p-1 bg-card-header-bg border border-card-border rounded-xl">
                                    <div className="relative h-7 rounded-lg bg-card-bg shadow-sm flex items-center px-2.5 gap-2 focus-within:ring-1 focus-within:ring-primary-glow/60 transition-all">
                                        <Search className="w-3.5 h-3.5 text-foreground/45 shrink-0 pointer-events-none" />
                                        <input
                                            type="text"
                                            value={queryFilter}
                                            onChange={(e) => setQueryFilter(e.target.value)}
                                            placeholder="Filter keywords..."
                                            className="w-full h-full bg-transparent text-xs font-medium text-foreground placeholder:text-foreground/40 focus:outline-none"
                                        />
                                        {queryFilter && (
                                            <button
                                                type="button"
                                                onClick={() => setQueryFilter('')}
                                                title="Clear filter"
                                                className="p-0.5 rounded-md text-foreground/45 hover:text-foreground hover:bg-card-header-bg transition-colors cursor-pointer shrink-0"
                                            >
                                                <X className="w-3 h-3" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Tab Body */}
                    {activeTab !== 'queue' ? (
                        <div className="overflow-x-auto">
                            {loading && !workspace ? (
                                <div className="p-10 text-center text-sm text-foreground/50">
                                    Loading search intelligence...
                                </div>
                            ) : currentRows.length === 0 ? (
                                <div className="p-12 text-center space-y-2">
                                    <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto opacity-80" />
                                    <p className="text-sm font-semibold text-foreground">
                                        {queryFilter.trim()
                                            ? `No queries matching "${queryFilter.trim()}"`
                                            : activeTab === 'gaps'
                                            ? 'No zero-result search gaps in this timeframe!'
                                            : 'No matching search logs recorded yet.'}
                                    </p>
                                    <p className="text-xs text-foreground/50">
                                        Visitor searches on the public site automatically populate here.
                                    </p>
                                </div>
                            ) : (
                                <>
                                <ResponsiveTableWrapper>
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="border-b border-card-border text-[11px] uppercase tracking-wider text-foreground/50 bg-background/40">
                                            <th className="py-3 px-4 font-bold w-12">#</th>
                                            <th className="py-3 px-4 font-bold whitespace-nowrap">Keyword Query</th>
                                            <th className="py-3 px-4 font-bold whitespace-nowrap">Searches</th>
                                            <th className="py-3 px-4 font-bold whitespace-nowrap">Avg Results</th>
                                            <th className="py-3 px-4 font-bold whitespace-nowrap">Last Searched</th>
                                            <th className="py-3 px-4 font-bold text-right whitespace-nowrap">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-card-border/60 text-sm">
                                        {paginatedRows.map((row, idx) => (
                                            <tr key={`${row.normalizedQuery}-${idx}`} className="hover:bg-white/[0.02] transition-colors">
                                                <td className="py-3 px-4 text-xs font-mono text-foreground/40">
                                                    {(safePage - 1) * ROWS_PER_PAGE + idx + 1}
                                                </td>
                                                <td className="py-3 px-4 font-semibold text-foreground">
                                                    {row.query}
                                                </td>
                                                <td className="py-3 px-4 whitespace-nowrap">
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold whitespace-nowrap bg-primary-glow/10 text-primary-glow border border-primary-glow/20">
                                                        {row.count}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-4 whitespace-nowrap">
                                                    {row.status === 'gap' ? (
                                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold whitespace-nowrap bg-amber-500/15 text-amber-400 border border-amber-500/30">
                                                            0 results (Gap)
                                                        </span>
                                                    ) : row.status === 'low' ? (
                                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold whitespace-nowrap bg-blue-500/15 text-blue-400 border border-blue-500/30">
                                                            {row.avgResults} avg (Low)
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold whitespace-nowrap bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                                                            {row.avgResults} avg
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="py-3 px-4 text-xs text-foreground/60 whitespace-nowrap">
                                                    <span className="inline-flex items-center gap-1">
                                                        <Clock className="w-3.5 h-3.5 text-foreground/40" />
                                                        {formatRelativeTime(row.lastSearchedAt)}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-4 text-right">
                                                    <div className="inline-flex items-center justify-end gap-1.5 xl:gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => copyKeyword(row.query)}
                                                            className="inline-flex items-center justify-center w-7 h-7 p-0 xl:w-auto xl:h-auto xl:px-2.5 xl:py-1.5 xl:gap-1 rounded-lg bg-background hover:bg-white/10 border border-card-border text-xs font-semibold text-foreground/80 cursor-pointer"
                                                            title="Copy keyword"
                                                            aria-label="Copy keyword"
                                                        >
                                                            <Copy className="w-3.5 h-3.5 xl:w-3 xl:h-3 shrink-0" />
                                                            <span className="hidden xl:inline">Copy</span>
                                                        </button>

                                                        {canBrowseFiles && (
                                                            <Link
                                                                href={`/admin/dashboard/files?search=${encodeURIComponent(row.query)}`}
                                                                className="inline-flex items-center justify-center w-7 h-7 p-0 xl:w-auto xl:h-auto xl:px-2.5 xl:py-1.5 xl:gap-1 rounded-lg bg-background hover:bg-white/10 border border-card-border text-xs font-semibold text-foreground/80"
                                                                title="Search existing published files"
                                                                aria-label="Catalog"
                                                            >
                                                                <FolderOpen className="w-3.5 h-3.5 xl:w-3 xl:h-3 text-blue-400 shrink-0" />
                                                                <span className="hidden xl:inline">Catalog</span>
                                                            </Link>
                                                        )}

                                                        {canUpload ? (
                                                            <Link
                                                                href={`/admin/dashboard?keyword=${encodeURIComponent(row.query)}`}
                                                                className="inline-flex items-center justify-center w-7 h-7 p-0 xl:w-auto xl:h-auto xl:px-2.5 xl:py-1.5 xl:gap-1 rounded-lg bg-primary-glow/15 hover:bg-primary-glow/25 border border-primary-glow/30 text-xs font-bold text-primary-glow"
                                                                title="Upload PNG"
                                                                aria-label="Upload PNG"
                                                            >
                                                                <Upload className="w-3.5 h-3.5 xl:w-3 xl:h-3 shrink-0" />
                                                                <span className="hidden xl:inline">Upload PNG</span>
                                                            </Link>
                                                        ) : (
                                                            <span
                                                                title="Upload permission not granted"
                                                                className="inline-flex items-center justify-center w-7 h-7 p-0 xl:w-auto xl:h-auto xl:px-2.5 xl:py-1.5 xl:gap-1 rounded-lg bg-white/5 border border-card-border text-xs text-foreground/40 cursor-not-allowed"
                                                            >
                                                                <Lock className="w-3.5 h-3.5 xl:w-3 xl:h-3 shrink-0" />
                                                                <span className="hidden xl:inline">Upload</span>
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                </ResponsiveTableWrapper>

                                {totalPages > 1 && (
                                    <div className="px-4 py-3 border-t border-card-border bg-background/30 flex flex-col sm:flex-row items-center justify-between gap-3">
                                        <span className="text-xs text-foreground/55">
                                            Showing{' '}
                                            <strong className="text-foreground">
                                                {(safePage - 1) * ROWS_PER_PAGE + 1}
                                            </strong>
                                            –
                                            <strong className="text-foreground">
                                                {Math.min(safePage * ROWS_PER_PAGE, currentRows.length)}
                                            </strong>{' '}
                                            of <strong className="text-foreground">{currentRows.length}</strong> keywords
                                        </span>

                                        <div className="inline-flex items-center gap-1 p-1 bg-card-header-bg border border-card-border rounded-xl">
                                            <button
                                                type="button"
                                                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                                                disabled={safePage <= 1}
                                                aria-label="Previous page"
                                                className="h-7 w-7 rounded-lg bg-card-bg text-foreground/75 hover:text-primary-glow disabled:opacity-35 disabled:cursor-not-allowed inline-flex items-center justify-center shadow-sm cursor-pointer transition-all"
                                            >
                                                <ChevronLeft className="w-3.5 h-3.5" />
                                            </button>

                                            {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                                                <button
                                                    key={pageNum}
                                                    type="button"
                                                    onClick={() => setCurrentPage(pageNum)}
                                                    className={`h-7 min-w-7 px-2 rounded-lg text-xs font-bold inline-flex items-center justify-center transition-all cursor-pointer ${
                                                        safePage === pageNum
                                                            ? 'bg-primary-glow text-white shadow-sm'
                                                            : 'bg-card-bg text-foreground/70 hover:text-primary-glow shadow-sm'
                                                    }`}
                                                >
                                                    {pageNum}
                                                </button>
                                            ))}

                                            <button
                                                type="button"
                                                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                                                disabled={safePage >= totalPages}
                                                aria-label="Next page"
                                                className="h-7 w-7 rounded-lg bg-card-bg text-foreground/75 hover:text-primary-glow disabled:opacity-35 disabled:cursor-not-allowed inline-flex items-center justify-center shadow-sm cursor-pointer transition-all"
                                            >
                                                <ChevronRight className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                )}
                                </>
                            )}
                        </div>
                    ) : (
                        <div className="p-6 space-y-6">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Drafts Staging Queue */}
                                <div className="bg-background/60 border border-card-border rounded-xl overflow-hidden">
                                    <div className="px-4 py-3 border-b border-card-border flex items-center justify-between gap-2">
                                        <div className="min-w-0">
                                            <h3 className="text-sm font-bold text-foreground">
                                                Staged Drafts ({summary.draftImages ?? 0})
                                            </h3>
                                            <p className="text-[11px] text-foreground/50 truncate">
                                                <span className="xl:hidden">Pending metadata &amp; publish</span>
                                                <span className="hidden xl:inline">
                                                    Uploaded PNGs waiting for metadata &amp; publishing
                                                </span>
                                            </p>
                                        </div>
                                        {canUpload && (
                                            <Link
                                                href="/admin/upload"
                                                className="text-xs font-bold text-primary-glow hover:underline whitespace-nowrap shrink-0"
                                            >
                                                <span className="sm:hidden">Staging →</span>
                                                <span className="hidden sm:inline">Open Upload Staging →</span>
                                            </Link>
                                        )}
                                    </div>
                                    <div className="divide-y divide-card-border/50 max-h-80 overflow-y-auto">
                                        {catalogQueue.drafts.length === 0 ? (
                                            <div className="p-6 text-center text-xs text-foreground/50">
                                                No pending drafts right now.
                                            </div>
                                        ) : (
                                            catalogQueue.drafts.map((item) => (
                                                <div key={item.id} className="px-4 py-3 flex items-center justify-between gap-3">
                                                    <div className="flex items-center gap-3 min-w-0">
                                                        <img
                                                            src={item.previewPath || item.path}
                                                            alt={item.name}
                                                            className="w-10 h-10 rounded-lg object-contain bg-white/5 border border-card-border flex-shrink-0"
                                                        />
                                                        <div className="min-w-0">
                                                            <div className="text-xs font-bold text-foreground truncate">
                                                                {item.name}
                                                            </div>
                                                            <div className="text-[11px] text-foreground/50">
                                                                {item.tagsCount} tags · {formatRelativeTime(item.createdAt)}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    {canUpload && (
                                                        <Link
                                                            href="/admin/upload"
                                                            className="px-2.5 py-1 rounded-lg bg-primary-glow/15 text-primary-glow text-[11px] font-bold flex-shrink-0"
                                                        >
                                                            Resume
                                                        </Link>
                                                    )}
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>

                                {/* Needs SEO Metadata */}
                                <div className="bg-background/60 border border-card-border rounded-xl overflow-hidden">
                                    <div className="px-4 py-3 border-b border-card-border flex items-center justify-between gap-2">
                                        <div className="min-w-0">
                                            <h3 className="text-sm font-bold text-foreground">
                                                Low-SEO Published PNGs ({summary.lowSeoImages ?? 0})
                                            </h3>
                                            <p className="text-[11px] text-foreground/50 truncate">
                                                <span className="xl:hidden">Missing alt, desc, or &lt;5 tags</span>
                                                <span className="hidden xl:inline">
                                                    Missing alt text, description, or having fewer than 5 tags
                                                </span>
                                            </p>
                                        </div>
                                        {canBrowseFiles && (
                                            <Link
                                                href="/admin/dashboard/files"
                                                className="text-xs font-bold text-primary-glow hover:underline whitespace-nowrap shrink-0"
                                            >
                                                <span className="sm:hidden">All Files →</span>
                                                <span className="hidden sm:inline">Browse All Files →</span>
                                            </Link>
                                        )}
                                    </div>
                                    <div className="divide-y divide-card-border/50 max-h-80 overflow-y-auto">
                                        {catalogQueue.needsSeo.length === 0 ? (
                                            <div className="p-6 text-center text-xs text-emerald-400">
                                                All published PNGs have complete SEO metadata!
                                            </div>
                                        ) : (
                                            catalogQueue.needsSeo.map((item) => (
                                                <div key={item.id} className="px-4 py-3 flex items-center justify-between gap-3">
                                                    <div className="flex items-center gap-3 min-w-0">
                                                        <img
                                                            src={item.previewPath || item.path}
                                                            alt={item.name}
                                                            className="w-10 h-10 rounded-lg object-contain bg-white/5 border border-card-border flex-shrink-0"
                                                        />
                                                        <div className="min-w-0">
                                                            <div className="text-xs font-bold text-foreground truncate">
                                                                {item.name}
                                                            </div>
                                                            <div className="flex flex-wrap gap-1 mt-1">
                                                                {item.missingAlt && (
                                                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-500/15 text-rose-400">
                                                                        No Alt
                                                                    </span>
                                                                )}
                                                                {item.missingDescription && (
                                                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-400">
                                                                        No Desc
                                                                    </span>
                                                                )}
                                                                {item.tagsCount < 5 && (
                                                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-500/15 text-blue-400">
                                                                        {item.tagsCount} tags
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    {canBrowseFiles && (
                                                        <Link
                                                            href={`/admin/dashboard/files?search=${encodeURIComponent(item.name)}`}
                                                            className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-card-border text-xs font-semibold text-foreground/80 flex-shrink-0"
                                                        >
                                                            Fix
                                                        </Link>
                                                    )}
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Popular Catalog Tags */}
                            {catalogQueue.popularTags.length > 0 && (
                                <div className="bg-background/60 border border-card-border rounded-xl p-4">
                                    <div className="flex items-center justify-between mb-3">
                                        <h3 className="text-xs font-bold uppercase tracking-wider text-foreground/70 flex items-center gap-1.5">
                                            <Tags className="w-4 h-4 text-primary-glow" />
                                            Top Existing Tags (Click to copy for consistent tagging)
                                        </h3>
                                        <span className="text-[11px] text-foreground/50">
                                            {summary.uncategorizedImages ?? 0} published PNGs without category
                                        </span>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {catalogQueue.popularTags.map((t) => (
                                            <button
                                                key={t.tag}
                                                type="button"
                                                onClick={() => copyKeyword(t.tag)}
                                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-card-bg hover:bg-primary-glow/10 border border-card-border hover:border-primary-glow/30 text-xs text-foreground/80 cursor-pointer transition-all"
                                            >
                                                <span>#{t.tag}</span>
                                                <span className="text-[10px] text-foreground/40 font-mono">{t.count}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </AdminLayout>
    );
}

