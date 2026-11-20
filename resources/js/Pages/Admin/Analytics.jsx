import { useState, useEffect, useCallback } from 'react';
import { Head } from '@inertiajs/react';
import {
    ResponsiveContainer,
    AreaChart,
    Area,
    XAxis,
    YAxis,
    Tooltip,
    CartesianGrid,
    PieChart,
    Pie,
    Cell,
} from 'recharts';
import {
    Download,
    Image as ImageIcon,
    Eye,
    Sparkles,
    TrendingUp,
    TrendingDown,
    Search,
    Smartphone,
    Monitor,
    Tablet,
    Activity,
    Tag,
    FolderOpen,
    Globe,
    FileDown,
    RefreshCw,
    Maximize2,
    ExternalLink,
    AlertCircle,
} from 'lucide-react';
import AdminLayout from '../../Layouts/AdminLayout';
import { StatCard } from '../../components/ui/StatCard';
import { GlassCard } from '../../components/ui/GlassCard';
import { CountryFlag } from '../../components/ui/CountryFlag';
import { FilterSidebar } from '../../components/admin/analytics/FilterSidebar';
import Pagination from '../../components/ui/Pagination';
import ResponsiveTableWrapper from '../../components/admin/ResponsiveTableWrapper';

const TIME_RANGES = [
    { key: '1h', label: '1h' },
    { key: '24h', label: '24h' },
    { key: '7d', label: '7d' },
    { key: '30d', label: '30d' },
    { key: '90d', label: '90d' },
    { key: '1y', label: '1y' },
];

const DEVICE_COLORS = {
    desktop: '#3b82f6',
    mobile: '#a855f7',
    tablet: '#10b981',
    unknown: '#6b7280',
};

const DEFAULT_FILTERS = {
    deviceType: 'all',
    country: 'all',
    tags: [],
    sortBy: 'downloads_desc',
    minDownloads: 0,
};

function formatNumber(n) {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return n.toLocaleString();
}

function timeAgo(dateStr) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const secs = Math.floor(diff / 1000);
    if (secs < 60) return `${secs}s ago`;
    const mins = Math.floor(secs / 60);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
}

export default function AnalyticsPage() {
    const [chartTimeRange, setChartTimeRange] = useState('7d');
    const [popularTimeRange, setPopularTimeRange] = useState('7d');

    const [stats, setStats] = useState(null);
    const [chartData, setChartData] = useState(null);
    const [availableCountries, setAvailableCountries] = useState([]);

    const [filters, setFilters] = useState(DEFAULT_FILTERS);
    const [page, setPage] = useState(1);

    const [loadingStats, setLoadingStats] = useState(true);
    const [loadingChart, setLoadingChart] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const [isSuperAdmin, setIsSuperAdmin] = useState(true);
    const [userPermissions, setUserPermissions] = useState([]);

    useEffect(() => {
        fetch('/api/auth/me')
            .then((r) => (r.ok ? r.json() : null))
            .then((data) => {
                if (data) {
                    setIsSuperAdmin(Boolean(data.isSuperAdmin || data.role === 'super_admin'));
                    setUserPermissions(Array.isArray(data.permissions) ? data.permissions : []);
                }
            })
            .catch(() => {});
    }, []);

    const hasPermission = (perm) => isSuperAdmin || userPermissions.includes(perm);

    const fetchCountries = useCallback(async () => {
        try {
            const res = await fetch(`/api/analytics/countries?range=${popularTimeRange}`);
            const result = await res.json();
            if (Array.isArray(result)) {
                setAvailableCountries(result);
            }
        } catch (err) {
            console.error('Failed to load countries', err);
        }
    }, [popularTimeRange]);

    const fetchChart = useCallback(async () => {
        setLoadingChart(true);
        try {
            const res = await fetch(`/api/analytics/downloads?range=${chartTimeRange}`);
            const result = await res.json();
            if (result && !result.error) {
                setChartData(result);
            }
        } catch (err) {
            console.error('Failed to load chart data', err);
        } finally {
            setLoadingChart(false);
        }
    }, [chartTimeRange]);

    const fetchStats = useCallback(async () => {
        setLoadingStats(true);
        try {
            const params = new URLSearchParams();
            params.set('range', popularTimeRange);
            params.set('page', page.toString());
            params.set('limit', '10');
            params.set('sortBy', filters.sortBy);
            if (filters.deviceType !== 'all') params.set('device', filters.deviceType);
            if (filters.country !== 'all') params.set('country', filters.country);
            if (filters.tags.length > 0) params.set('tags', filters.tags.join(','));
            if (filters.minDownloads > 0) params.set('minDownloads', filters.minDownloads.toString());

            const res = await fetch(`/api/analytics/stats?${params.toString()}`);
            const result = await res.json();
            if (result && !result.error) {
                setStats(result);
            }
        } catch (err) {
            console.error('Failed to load stats', err);
        } finally {
            setLoadingStats(false);
        }
    }, [popularTimeRange, page, filters]);

    useEffect(() => {
        fetchChart();
    }, [fetchChart]);

    useEffect(() => {
        fetchStats();
        fetchCountries();
    }, [fetchStats, fetchCountries]);

    const handleRefreshAll = async () => {
        setIsRefreshing(true);
        await Promise.all([fetchChart(), fetchStats(), fetchCountries()]);
        setIsRefreshing(false);
    };

    const handleResetFilters = () => {
        setFilters(DEFAULT_FILTERS);
        setPage(1);
    };

    const handleFiltersChange = (newFilters) => {
        setFilters(newFilters);
        setPage(1);
    };

    const handleExportCSV = () => {
        if (!stats?.popularImages) return;
        const headers = [
            'Title',
            'Views',
            'Total Downloads',
            'Period Downloads',
            'Conversion Rate (%)',
            'Resolution',
            'Aspect Ratio',
            'Tags',
        ];
        const rows = stats.popularImages.map((img) => [
            `"${(img.title || img.name || '').replace(/"/g, '""')}"`,
            img.viewsCount,
            img.downloadsCount,
            img.filteredDownloads,
            img.conversionRate,
            `${img.width || 0}x${img.height || 0}`,
            img.aspectRatio || '',
            `"${img.tags.join(', ')}"`,
        ]);
        const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `png101-analytics-${popularTimeRange}-${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        URL.revokeObjectURL(url);
    };

    const kpis = stats?.kpis;
    const totalDeviceDownloads =
        stats?.deviceBreakdown.reduce((acc, d) => acc + d.count, 0) || 1;
    const totalCountryDownloads =
        stats?.topCountries.reduce((acc, c) => acc + c.count, 0) || 1;

    return (
        <AdminLayout>
            <Head title="Analytics & Telemetry - Png101 Admin" />
            <div className="space-y-8 animate-in fade-in duration-300">
                {/* Page Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                    <div>
                        <h1 className="text-xl sm:text-2xl xl:text-3xl font-bold text-foreground flex items-center gap-2.5 sm:gap-3">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor" className="w-6 h-6 sm:w-7 sm:h-7 text-primary-glow shrink-0">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
                            </svg>
                            <span>Analytics &amp; Telemetry</span>
                        </h1>
                        <p className="hidden xl:block text-sm text-foreground/55 mt-1">
                            Comprehensive tracking of asset downloads, views, search behavior, and audience insights.
                        </p>
                    </div>

                    <div className="flex items-center gap-1 p-1 bg-card-header-bg border border-card-border rounded-xl self-start sm:self-auto">
                        <button
                            onClick={handleRefreshAll}
                            disabled={isRefreshing}
                            title="Refresh"
                            aria-label="Refresh"
                            className="h-8 w-8 px-0 xl:w-auto xl:px-3 rounded-lg bg-card-bg hover:text-primary-glow text-xs font-bold text-foreground/80 shadow-sm inline-flex items-center justify-center xl:gap-1.5 transition-all cursor-pointer"
                        >
                            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-primary-glow' : ''}`} />
                            <span className="hidden xl:inline">Refresh</span>
                        </button>
                        {hasPermission('export_analytics') && (
                            <button
                                onClick={handleExportCSV}
                                disabled={!stats?.popularImages.length}
                                title="Export CSV"
                                aria-label="Export CSV"
                                className="h-8 w-8 px-0 xl:w-auto xl:px-3.5 rounded-lg bg-primary-glow hover:bg-blue-600 text-white text-xs font-bold shadow-sm inline-flex items-center justify-center xl:gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                            >
                                <FileDown className="w-3.5 h-3.5" />
                                <span className="hidden xl:inline">Export CSV</span>
                            </button>
                        )}
                    </div>
                </div>

                {/* ROW 1: KPI Cards Grid (Desktop / Laptop >= 1280px only) */}
                <div className="hidden xl:grid xl:grid-cols-6 gap-4">
                    <StatCard
                        title="Total Downloads"
                        value={kpis ? formatNumber(kpis.totalDownloads) : '—'}
                        subtitle={kpis ? `${kpis.periodDownloads.toLocaleString()} in period` : undefined}
                        icon={Download}
                        trend={kpis?.periodDownloadsTrend}
                        color="blue"
                    />
                    <StatCard
                        title="Image Views"
                        value={kpis ? formatNumber(kpis.totalViews) : '—'}
                        subtitle={kpis ? `${kpis.periodViews.toLocaleString()} in period` : undefined}
                        icon={Eye}
                        color="purple"
                    />
                    <StatCard
                        title="Conversion Rate"
                        value={kpis ? `${kpis.conversionRate}%` : '—'}
                        subtitle="Views -> Downloads"
                        icon={TrendingUp}
                        color="green"
                    />
                    <StatCard
                        title="Total Assets"
                        value={kpis ? kpis.totalImages.toLocaleString() : '—'}
                        subtitle={kpis ? `${kpis.publishedImages} Live • ${kpis.draftImages} Draft` : undefined}
                        icon={ImageIcon}
                        color="orange"
                    />
                    <StatCard
                        title="Zero-Result Searches"
                        value={kpis ? kpis.zeroResultSearches.toLocaleString() : '—'}
                        subtitle="Content opportunities"
                        icon={AlertCircle}
                        color="rose"
                    />
                    <StatCard
                        title="Custom Size Ratio"
                        value={kpis ? `${kpis.customSizeRatio}%` : '—'}
                        subtitle="Custom resized downloads"
                        icon={Maximize2}
                        color="teal"
                    />
                </div>

                {/* ROW 2: Interactive Growth Chart */}
                <GlassCard className="p-6 shadow-none">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                        <div>
                            <div className="flex items-center gap-3">
                                <h2 className="text-lg font-bold text-foreground">Download &amp; View Activity</h2>
                                {chartData && (
                                    <span
                                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                                            chartData.growthPercent >= 0
                                                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                                                : 'bg-rose-500/15 text-rose-400 border border-rose-500/20'
                                        }`}
                                    >
                                        {chartData.growthPercent >= 0 ? (
                                            <TrendingUp className="w-3.5 h-3.5" />
                                        ) : (
                                            <TrendingDown className="w-3.5 h-3.5" />
                                        )}
                                        {chartData.growthPercent >= 0 ? `+${chartData.growthPercent}%` : `${chartData.growthPercent}%`} vs prev
                                    </span>
                                )}
                            </div>
                            <p className="text-xs text-foreground/50 mt-1">
                                {chartData
                                    ? `${chartData.total.toLocaleString()} downloads • ${chartData.totalViews.toLocaleString()} views during selected interval`
                                    : 'Loading activity timeline...'}
                            </p>
                        </div>

                        {/* Time Range Pill Switcher */}
                        <div className="flex items-center gap-1 bg-card-header-bg border border-card-border p-1 rounded-xl self-start sm:self-auto">
                            {TIME_RANGES.map((tr) => (
                                <button
                                    key={tr.key}
                                    onClick={() => setChartTimeRange(tr.key)}
                                    className={`h-7 px-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                        chartTimeRange === tr.key
                                            ? 'bg-primary-glow text-white shadow-sm'
                                            : 'bg-card-bg text-foreground/70 hover:text-primary-glow shadow-sm'
                                    }`}
                                >
                                    {tr.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="h-[320px] w-full relative">
                        {loadingChart && !chartData ? (
                            <div className="w-full h-full flex items-center justify-center">
                                <div className="w-8 h-8 border-2 border-primary-glow border-t-transparent rounded-full animate-spin" />
                            </div>
                        ) : chartData?.data && chartData.data.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData.data} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="downloadsGradient" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.35} />
                                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                                        </linearGradient>
                                        <linearGradient id="viewsGradient" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#a855f7" stopOpacity={0.25} />
                                            <stop offset="95%" stopColor="#a855f7" stopOpacity={0.0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                                    <XAxis
                                        dataKey="date"
                                        stroke="rgba(255,255,255,0.35)"
                                        fontSize={11}
                                        tickLine={false}
                                        axisLine={false}
                                        minTickGap={25}
                                    />
                                    <YAxis
                                        stroke="rgba(255,255,255,0.35)"
                                        fontSize={11}
                                        tickLine={false}
                                        axisLine={false}
                                        allowDecimals={false}
                                    />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: 'rgba(15, 23, 42, 0.95)',
                                            borderColor: 'rgba(255,255,255,0.1)',
                                            borderRadius: '12px',
                                            fontSize: '12px',
                                            boxShadow: '0 10px 25px rgba(0,0,0,0.4)',
                                        }}
                                        itemStyle={{ color: '#fff', fontWeight: 600 }}
                                        labelStyle={{ color: 'rgba(255,255,255,0.6)', marginBottom: '4px' }}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="views"
                                        name="Views"
                                        stroke="#a855f7"
                                        strokeWidth={2}
                                        fillOpacity={1}
                                        fill="url(#viewsGradient)"
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="downloads"
                                        name="Downloads"
                                        stroke="#3b82f6"
                                        strokeWidth={2.5}
                                        fillOpacity={1}
                                        fill="url(#downloadsGradient)"
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center text-foreground/40 text-sm">
                                <Activity className="w-8 h-8 mb-2 opacity-30" />
                                No activity data recorded for this period.
                            </div>
                        )}
                    </div>
                </GlassCard>

                {/* ROW 3: Audience Intelligence (3 Columns) */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Device Breakdown */}
                    <GlassCard className="p-6 flex flex-col justify-between shadow-none">
                        <div>
                            <h3 className="text-base font-bold text-foreground flex items-center gap-2 mb-1">
                                <Smartphone className="w-4 h-4 text-purple-400" />
                                Device Breakdown
                            </h3>
                            <p className="text-xs text-foreground/45 mb-4">Downloads segmented by client device</p>
                        </div>

                        {stats?.deviceBreakdown && stats.deviceBreakdown.length > 0 ? (
                            <div className="flex flex-col sm:flex-row items-center gap-6 my-auto">
                                <div className="w-40 h-40 shrink-0">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={stats.deviceBreakdown}
                                                dataKey="count"
                                                nameKey="device"
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={42}
                                                outerRadius={68}
                                                paddingAngle={4}
                                                stroke="none"
                                            >
                                                {stats.deviceBreakdown.map((entry, idx) => (
                                                    <Cell
                                                        key={idx}
                                                        fill={DEVICE_COLORS[entry.device] || DEVICE_COLORS.unknown}
                                                    />
                                                ))}
                                            </Pie>
                                            <Tooltip
                                                contentStyle={{
                                                    backgroundColor: 'rgba(15, 23, 42, 0.95)',
                                                    borderColor: 'rgba(255,255,255,0.1)',
                                                    borderRadius: '10px',
                                                    fontSize: '12px',
                                                }}
                                            />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>

                                <div className="flex-1 w-full space-y-3">
                                    {stats.deviceBreakdown.map((d) => {
                                        const pct = Math.round((d.count / totalDeviceDownloads) * 100);
                                        const color = DEVICE_COLORS[d.device] || DEVICE_COLORS.unknown;
                                        const Icon =
                                            d.device === 'mobile'
                                                ? Smartphone
                                                : d.device === 'tablet'
                                                    ? Tablet
                                                    : Monitor;
                                        return (
                                            <div key={d.device} className="space-y-1">
                                                <div className="flex items-center justify-between text-xs">
                                                    <span className="flex items-center gap-2 font-medium capitalize text-foreground/85">
                                                        <Icon className="w-3.5 h-3.5" style={{ color }} />
                                                        {d.device}
                                                    </span>
                                                    <span className="text-foreground/60 font-mono">
                                                        {d.count} ({pct}%)
                                                    </span>
                                                </div>
                                                <div className="h-1.5 w-full bg-background rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full rounded-full transition-all duration-500"
                                                        style={{ width: `${pct}%`, backgroundColor: color }}
                                                    />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ) : (
                            <div className="py-12 text-center text-xs text-foreground/40">No device data yet</div>
                        )}
                    </GlassCard>

                    {/* Top Countries */}
                    <GlassCard className="p-6 flex flex-col shadow-none">
                        <div className="mb-4">
                            <h3 className="text-base font-bold text-foreground flex items-center gap-2 mb-1">
                                <Globe className="w-4 h-4 text-emerald-400" />
                                Top Countries
                            </h3>
                            <p className="text-xs text-foreground/45">Geographic download distribution</p>
                        </div>

                        {stats?.topCountries && stats.topCountries.length > 0 ? (
                            <div className="space-y-3.5 flex-1 overflow-y-auto pr-1 custom-scrollbar max-h-[220px]">
                                {stats.topCountries.map((c) => {
                                    const pct = Math.round((c.count / totalCountryDownloads) * 100);
                                    return (
                                        <div key={c.country} className="space-y-1.5">
                                            <div className="flex items-center justify-between text-xs">
                                                <span className="flex items-center gap-2 font-medium text-foreground/85 truncate">
                                                    <CountryFlag
                                                        code={c.country}
                                                        name={c.name}
                                                        fallback={c.flag}
                                                    />
                                                    <span className="truncate">{c.name}</span>
                                                </span>
                                                <span className="text-foreground/60 font-mono shrink-0 ml-2">
                                                    {c.count.toLocaleString()} ({pct}%)
                                                </span>
                                            </div>
                                            <div className="h-1.5 w-full bg-background rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                                                    style={{ width: `${pct}%` }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="py-12 text-center text-xs text-foreground/40 my-auto">
                                No geographic download data yet
                            </div>
                        )}
                    </GlassCard>

                    {/* Custom Size & Resolution Stats */}
                    <GlassCard className="p-6 flex flex-col justify-between shadow-none">
                        <div>
                            <h3 className="text-base font-bold text-foreground flex items-center gap-2 mb-1">
                                <Maximize2 className="w-4 h-4 text-teal-400" />
                                Resolution &amp; Conversion
                            </h3>
                            <p className="text-xs text-foreground/45 mb-4">Original vs dynamically resized downloads</p>
                        </div>

                        <div className="space-y-5 my-auto">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="p-3.5 rounded-xl bg-background/60 border border-card-border">
                                    <span className="text-[11px] uppercase tracking-wider text-foreground/45 block mb-1">
                                        Original Size
                                    </span>
                                    <span className="text-xl font-bold text-foreground">
                                        {kpis ? (kpis.totalDownloads - kpis.customDownloadsCount).toLocaleString() : '—'}
                                    </span>
                                    <span className="text-xs text-foreground/50 block mt-0.5">
                                        {kpis ? `${100 - kpis.customSizeRatio}% of total` : ''}
                                    </span>
                                </div>
                                <div className="p-3.5 rounded-xl bg-teal-500/5 border border-teal-500/20">
                                    <span className="text-[11px] uppercase tracking-wider text-teal-400/80 block mb-1">
                                        Custom Resize
                                    </span>
                                    <span className="text-xl font-bold text-teal-400">
                                        {kpis ? kpis.customDownloadsCount.toLocaleString() : '—'}
                                    </span>
                                    <span className="text-xs text-teal-400/70 block mt-0.5">
                                        {kpis ? `${kpis.customSizeRatio}% of total` : ''}
                                    </span>
                                </div>
                            </div>

                            {stats?.topCustomResolutions && stats.topCustomResolutions.length > 0 && (
                                <div>
                                    <span className="text-xs font-semibold text-foreground/60 block mb-2">
                                        Most Requested Sizes
                                    </span>
                                    <div className="flex flex-wrap gap-2">
                                        {stats.topCustomResolutions.map((r) => (
                                            <span
                                                key={r.resolution}
                                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-background border border-card-border text-xs font-mono text-foreground/80"
                                            >
                                                {r.resolution}
                                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-teal-500/15 text-teal-400">
                                                    {r.count}
                                                </span>
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </GlassCard>
                </div>

                {/* ROW 4: Content & Search Intelligence (2 Columns) */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Top Tags & Categories */}
                    <GlassCard className="p-6 shadow-none">
                        <div className="flex items-center justify-between mb-5">
                            <div>
                                <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                                    <Tag className="w-4 h-4 text-primary-glow" />
                                    Top Performing Tags &amp; Categories
                                </h3>
                                <p className="text-xs text-foreground/45 mt-0.5">
                                    Ranked by downloads in selected period (click a tag to filter)
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Tags Cloud List */}
                            <div className="space-y-2.5">
                                <span className="text-xs font-semibold uppercase tracking-wider text-foreground/50 block">
                                    Top Tags
                                </span>
                                {stats?.topTags && stats.topTags.length > 0 ? (
                                    <div className="flex flex-wrap gap-2">
                                        {stats.topTags.map((t) => {
                                            const isSelected = filters.tags.includes(t.tag);
                                            return (
                                                <button
                                                    key={t.tag}
                                                    onClick={() => {
                                                        if (isSelected) {
                                                            handleFiltersChange({
                                                                ...filters,
                                                                tags: filters.tags.filter((x) => x !== t.tag),
                                                            });
                                                        } else {
                                                            handleFiltersChange({
                                                                ...filters,
                                                                tags: [...filters.tags, t.tag],
                                                            });
                                                        }
                                                    }}
                                                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all cursor-pointer ${
                                                        isSelected
                                                            ? 'bg-primary-glow text-white border-primary-glow shadow-md shadow-primary-glow/20'
                                                            : 'bg-background/60 border-card-border text-foreground/80 hover:border-primary-glow/40'
                                                    }`}
                                                >
                                                    <span>#{t.tag}</span>
                                                    <span
                                                        className={`text-[10px] px-1.5 py-0.5 rounded-md font-mono ${
                                                            isSelected
                                                                ? 'bg-white/20 text-white'
                                                                : 'bg-foreground/10 text-foreground/60'
                                                        }`}
                                                    >
                                                        {t.downloads}
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <p className="text-xs text-foreground/40">No tag data available</p>
                                )}
                            </div>

                            {/* Categories List */}
                            <div className="space-y-2.5">
                                <span className="text-xs font-semibold uppercase tracking-wider text-foreground/50 block flex items-center gap-1.5">
                                    <FolderOpen className="w-3.5 h-3.5" />
                                    Top Categories
                                </span>
                                {stats?.topCategories && stats.topCategories.length > 0 ? (
                                    <div className="space-y-2">
                                        {stats.topCategories.slice(0, 6).map((cat) => (
                                            <div
                                                key={cat.name}
                                                className="flex items-center justify-between px-3 py-2 rounded-xl bg-background/50 border border-card-border text-xs"
                                            >
                                                <span className="font-medium text-foreground/85 truncate">{cat.name}</span>
                                                <div className="flex items-center gap-2 shrink-0">
                                                    <span className="text-foreground/40">{cat.imageCount} imgs</span>
                                                    <span className="px-2 py-0.5 rounded-md bg-blue-500/15 text-blue-400 font-mono font-bold">
                                                        {cat.downloads}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-xs text-foreground/40">No category data available</p>
                                )}
                            </div>
                        </div>
                    </GlassCard>

                    {/* Search Intelligence */}
                    <GlassCard className="p-6 shadow-none">
                        <div className="mb-5">
                            <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                                <Search className="w-4 h-4 text-amber-400" />
                                Search Intelligence
                            </h3>
                            <p className="text-xs text-foreground/45 mt-0.5">
                                What users search for vs missing asset opportunities
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Top Searches */}
                            <div>
                                <span className="text-xs font-semibold uppercase tracking-wider text-foreground/50 block mb-3">
                                    Popular Queries
                                </span>
                                {stats?.topSearches && stats.topSearches.length > 0 ? (
                                    <div className="space-y-2">
                                        {stats.topSearches.map((s) => (
                                            <div
                                                key={s.query}
                                                className="flex items-center justify-between px-3 py-2 rounded-xl bg-background/50 border border-card-border text-xs"
                                            >
                                                <span className="font-medium text-foreground/85 truncate">{s.query}</span>
                                                <span className="px-2 py-0.5 rounded-md bg-foreground/10 text-foreground/70 font-mono font-bold shrink-0">
                                                    {s.count}x
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-xs text-foreground/40 py-4">No search queries tracked yet</p>
                                )}
                            </div>

                            {/* Zero Result Searches */}
                            <div>
                                <span className="text-xs font-semibold uppercase tracking-wider text-rose-400/80 block mb-3 flex items-center gap-1.5">
                                    <Sparkles className="w-3.5 h-3.5" />
                                    Missed Opportunities (0 Results)
                                </span>
                                {stats?.zeroResultQueries && stats.zeroResultQueries.length > 0 ? (
                                    <div className="space-y-2">
                                        {stats.zeroResultQueries.map((s) => (
                                            <div
                                                key={s.query}
                                                className="flex items-center justify-between px-3 py-2 rounded-xl bg-rose-500/5 border border-rose-500/20 text-xs"
                                            >
                                                <span className="font-medium text-rose-300 truncate">{s.query}</span>
                                                <span className="px-2 py-0.5 rounded-md bg-rose-500/15 text-rose-400 font-mono font-bold shrink-0">
                                                    {s.count}x
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20 text-xs text-emerald-400">
                                        Great job! No unmet search terms in this interval.
                                    </div>
                                )}
                            </div>
                        </div>
                    </GlassCard>
                </div>

                {/* ROW 5: Live Recent Downloads Stream */}
                <GlassCard className="p-6 shadow-none">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                                <span className="relative flex h-2.5 w-2.5">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                                </span>
                                Recent Live Downloads
                            </h3>
                            <p className="text-xs text-foreground/45 mt-0.5">
                                Latest download telemetry across the platform
                            </p>
                        </div>
                    </div>

                    {stats?.recentDownloads && stats.recentDownloads.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
                            {stats.recentDownloads.map((item) => (
                                <div
                                    key={item.id}
                                    className="flex items-center gap-3 p-3 rounded-xl bg-background/60 border border-card-border hover:border-foreground/20 transition-colors"
                                >
                                    <div className="w-11 h-11 rounded-lg bg-white/5 border border-white/10 shrink-0 overflow-hidden flex items-center justify-center p-1">
                                        {item.imageUrl ? (
                                            <img
                                                src={item.imageUrl}
                                                alt={item.imageTitle}
                                                className="w-full h-full object-contain"
                                            />
                                        ) : (
                                            <ImageIcon className="w-5 h-5 text-foreground/30" />
                                        )}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-xs font-semibold text-foreground truncate" title={item.imageTitle}>
                                            {item.imageTitle}
                                        </p>
                                        <div className="flex items-center gap-1.5 text-[11px] text-foreground/50 mt-0.5 truncate">
                                            <CountryFlag
                                                code={item.countryCode}
                                                name={item.countryName}
                                                fallback={item.countryFlag}
                                                className="w-4 h-3"
                                            />
                                            <span className="truncate">{item.countryName || 'Unknown'}</span>
                                            <span className="text-foreground/30">·</span>
                                            <span className="capitalize shrink-0">{item.deviceType}</span>
                                            {item.isCustomSize && (
                                                <span className="px-1 py-0.2 rounded bg-teal-500/15 text-teal-400 text-[10px]">
                                                    {item.resolution || 'Custom'}
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-[10px] text-foreground/40 mt-0.5">{timeAgo(item.createdAt)}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="py-8 text-center text-xs text-foreground/40">No recent downloads recorded yet.</div>
                    )}
                </GlassCard>

                {/* ROW 6: Most Popular Images with Persistent Filter Sidebar */}
                <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <h2 className="text-xl font-bold text-foreground">Most Popular Images</h2>
                            <p className="text-xs text-foreground/50 mt-0.5">
                                {stats?.popularPagination
                                    ? `Showing ${stats.popularImages.length} of ${stats.popularPagination.totalItems} matching assets`
                                    : 'Detailed performance table with multi-dimensional filters'}
                            </p>
                        </div>

                        {/* Time Range Selector for Table & Stats */}
                        <div className="flex items-center gap-1 bg-card-header-bg border border-card-border p-1 rounded-xl w-fit">
                            {TIME_RANGES.map((tr) => (
                                <button
                                    key={tr.key}
                                    onClick={() => {
                                        setPopularTimeRange(tr.key);
                                        setPage(1);
                                    }}
                                    className={`h-7 px-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                        popularTimeRange === tr.key
                                            ? 'bg-primary-glow text-white shadow-sm'
                                            : 'bg-card-bg text-foreground/70 hover:text-primary-glow shadow-sm'
                                    }`}
                                >
                                    {tr.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex flex-col lg:flex-row gap-6 items-start">
                        {/* Persistent Filter Sidebar */}
                        <FilterSidebar
                            filters={filters}
                            onChange={handleFiltersChange}
                            onReset={handleResetFilters}
                            availableCountries={availableCountries}
                            availableTags={stats?.availableTags || []}
                            isLoading={loadingStats}
                        />

                        {/* Main Results Table */}
                        <GlassCard className="flex-1 w-full overflow-hidden shadow-none">
                            <ResponsiveTableWrapper>
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="border-b border-card-border bg-background/40 text-[11px] font-bold uppercase tracking-wider text-foreground/50">
                                            <th className="py-3.5 px-4 whitespace-nowrap">Asset</th>
                                            <th className="py-3.5 px-4 text-right whitespace-nowrap">Downloads ({popularTimeRange})</th>
                                            <th className="py-3.5 px-4 text-right whitespace-nowrap">Total Downloads</th>
                                            <th className="py-3.5 px-4 text-right whitespace-nowrap">Views</th>
                                            <th className="py-3.5 px-4 text-right whitespace-nowrap">Conv. Rate</th>
                                            <th className="py-3.5 px-4 hidden md:table-cell whitespace-nowrap">Resolution</th>
                                            <th className="py-3.5 px-4 text-right whitespace-nowrap">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-card-border text-sm">
                                        {loadingStats && !stats ? (
                                            <tr>
                                                <td colSpan={7} className="py-16 text-center text-foreground/40">
                                                    <div className="w-6 h-6 border-2 border-primary-glow border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                                                    Loading image analytics...
                                                </td>
                                            </tr>
                                        ) : stats?.popularImages && stats.popularImages.length > 0 ? (
                                            stats.popularImages.map((img) => (
                                                <tr
                                                    key={img.id}
                                                    className="hover:bg-foreground/[0.02] transition-colors group"
                                                >
                                                    <td className="py-3.5 px-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 p-1 shrink-0 flex items-center justify-center overflow-hidden">
                                                                <img
                                                                    src={img.url}
                                                                    alt={img.title || img.name}
                                                                    className="w-full h-full object-contain group-hover:scale-105 transition-transform"
                                                                />
                                                            </div>
                                                            <div className="min-w-0 max-w-[240px]">
                                                                <p className="font-semibold text-foreground truncate">
                                                                    {img.title || img.name}
                                                                </p>
                                                                <div className="flex flex-wrap gap-1 mt-1">
                                                                    {img.tags.slice(0, 3).map((t) => (
                                                                        <span
                                                                            key={t}
                                                                            className="text-[10px] px-1.5 py-0.5 rounded bg-foreground/5 text-foreground/55"
                                                                        >
                                                                            #{t}
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="py-3.5 px-4 text-right font-mono font-bold text-primary-glow">
                                                        {img.filteredDownloads.toLocaleString()}
                                                    </td>
                                                    <td className="py-3.5 px-4 text-right font-mono text-foreground/75">
                                                        {img.downloadsCount.toLocaleString()}
                                                    </td>
                                                    <td className="py-3.5 px-4 text-right font-mono text-foreground/65">
                                                        {img.viewsCount.toLocaleString()}
                                                    </td>
                                                    <td className="py-3.5 px-4 text-right">
                                                        <span
                                                            className={`inline-flex px-2 py-0.5 rounded-full text-xs font-mono font-semibold ${
                                                                img.conversionRate >= 25
                                                                    ? 'bg-emerald-500/15 text-emerald-400'
                                                                    : img.conversionRate >= 10
                                                                        ? 'bg-blue-500/15 text-blue-400'
                                                                        : 'bg-foreground/10 text-foreground/60'
                                                            }`}
                                                        >
                                                            {img.conversionRate}%
                                                        </span>
                                                    </td>
                                                    <td className="py-3.5 px-4 hidden md:table-cell text-xs font-mono text-foreground/55">
                                                        {img.width && img.height ? `${img.width}×${img.height}` : '—'}
                                                    </td>
                                                    <td className="py-3.5 px-4 text-right">
                                                        <a
                                                            href={`/images/${img.id}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-background border border-card-border text-xs font-medium text-foreground/70 hover:text-primary-glow hover:border-primary-glow/40 transition-colors"
                                                        >
                                                            View
                                                            <ExternalLink className="w-3 h-3" />
                                                        </a>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan={7} className="py-16 text-center text-foreground/45 text-sm">
                                                    No assets matched the selected filters.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </ResponsiveTableWrapper>

                            {/* Pagination Bar */}
                            {stats?.popularPagination && stats.popularPagination.totalPages > 1 && (
                                <div className="p-4 border-t border-card-border">
                                    <Pagination
                                        currentPage={stats.popularPagination.page}
                                        totalPages={stats.popularPagination.totalPages}
                                        totalItems={stats.popularPagination.totalItems}
                                        itemsPerPage={stats.popularPagination.limit || 10}
                                        onPageChange={(p) => setPage(p)}
                                    />
                                </div>
                            )}
                        </GlassCard>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}
