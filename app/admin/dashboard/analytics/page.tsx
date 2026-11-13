'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell
} from 'recharts';
import {
    Image as ImageIcon,
    Download,
    CheckCircle2,
    TrendingUp,
    TrendingDown,
    Eye,
    HardDrive,
    AlertTriangle,
    Monitor,
    Smartphone,
    Tablet,
    Globe,
    Maximize2,
    Tag,
    Folder,
    Search,
    Activity,
    FileSpreadsheet,
    ArrowUpRight,
    Clock,
    Sparkles,
    Layers
} from 'lucide-react';
import StatCard from '@/components/ui/StatCard';
import Link from 'next/link';
import FilterSidebar, { CountryOption } from './components/FilterSidebar';
import Pagination from './components/Pagination';

type TimeRange = '1h' | '24h' | '7d' | '30d' | '90d' | '1y';

interface DownloadData {
    date: string;
    downloads: number;
    views?: number;
}

interface PopularImage {
    id: string;
    name: string;
    path: string;
    downloads: number;
    allTimeDownloads?: number;
    views?: number;
    conversionRate?: number;
    tags?: string[];
    size?: number;
    createdAt?: string;
}

interface DeviceStat {
    device: string;
    count: number;
    percent: number;
    [key: string]: any;
}

interface CountryStat {
    code: string;
    name: string;
    count: number;
    percent: number;
}

interface ResizeStat {
    customCount: number;
    originalCount: number;
    customPercent: number;
    originalPercent: number;
}

interface TagStat {
    tag: string;
    downloads: number;
    imageCount: number;
}

interface CategoryStat {
    id: string;
    name: string;
    slug: string;
    downloads: number;
    imageCount: number;
}

interface RecentDownloadItem {
    id: string;
    imageId: string;
    imageName: string;
    imagePath: string;
    device: string;
    countryCode: string;
    countryName: string;
    isCustomSize: boolean;
    resolution: string;
    createdAt: string;
}

interface SearchQueryStat {
    query: string;
    searches: number;
    avgResults?: number;
    lastSearchedAt?: string;
}

interface Stats {
    totalImages: number;
    totalDownloads: number;
    totalViews: number;
    periodViews: number;
    periodDownloads: number;
    periodConversionRate: number;
    publishedImages: number;
    draftImages: number;
    totalStorageBytes: number;
    avgImageSizeBytes: number;
    zeroDownloadImagesCount: number;
    deviceBreakdown: DeviceStat[];
    topCountries: CountryStat[];
    resizeBreakdown: ResizeStat;
    topTags: TagStat[];
    topCategories: CategoryStat[];
    recentDownloads: RecentDownloadItem[];
    topSearches: SearchQueryStat[];
    zeroResultSearches: SearchQueryStat[];
    popularImages: PopularImage[];
}

function formatBytes(bytes: number): string {
    if (!bytes || bytes <= 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

function formatRelativeTime(isoString: string): string {
    if (!isoString) return '';
    const diffMs = Date.now() - new Date(isoString).getTime();
    const diffSec = Math.max(1, Math.floor(diffMs / 1000));
    if (diffSec < 60) return `${diffSec}s ago`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    const diffDays = Math.floor(diffHr / 24);
    return `${diffDays}d ago`;
}

const DEVICE_COLORS: Record<string, string> = {
    desktop: '#3b82f6',
    mobile: '#a855f7',
    tablet: '#10b981'
};

export default function AnalyticsPage() {
    const [timeRange, setTimeRange] = useState<TimeRange>('7d');
    const [popularTimeRange, setPopularTimeRange] = useState<TimeRange>('7d');
    const [data, setData] = useState<DownloadData[]>([]);
    const [loading, setLoading] = useState(true);
    const [totalDownloadsInPeriod, setTotalDownloadsInPeriod] = useState(0);
    const [totalViewsInPeriod, setTotalViewsInPeriod] = useState(0);
    const [growthPercent, setGrowthPercent] = useState<number>(0);
    const [previousTotal, setPreviousTotal] = useState<number>(0);
    const [stats, setStats] = useState<Stats | null>(null);

    // Tab states for combined cards
    const [contentTab, setContentTab] = useState<'tags' | 'categories'>('tags');
    const [searchTab, setSearchTab] = useState<'top' | 'missed'>('top');
    const [permissions, setPermissions] = useState<string[]>(['*']);

    // Filter states for Popular Images
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [sortBy, setSortBy] = useState('downloads_desc');
    const [minDownloads, setMinDownloads] = useState(0);
    const [deviceType, setDeviceType] = useState<'all' | 'mobile' | 'desktop' | 'tablet'>('all');
    const [selectedCountry, setSelectedCountry] = useState('all');
    const [availableCountries, setAvailableCountries] = useState<CountryOption[]>([]);

    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    useEffect(() => {
        fetchDownloadData();
        fetchCountries();
    }, [timeRange]);

    useEffect(() => {
        fetch('/api/auth/me')
            .then((res) => res.json())
            .then((d) => {
                if (Array.isArray(d.permissions)) {
                    setPermissions(d.permissions);
                }
            })
            .catch(() => {});
    }, []);

    const canExportCSV = permissions.includes('*') || permissions.includes('export_analytics');

    useEffect(() => {
        fetchStats();
    }, [popularTimeRange, deviceType, selectedCountry]);

    const fetchCountries = async () => {
        try {
            const res = await fetch('/api/analytics/countries');
            const result = await res.json();
            if (Array.isArray(result)) {
                setAvailableCountries(result);
            }
        } catch (error) {
            console.error('Failed to fetch countries:', error);
        }
    };

    const fetchStats = async () => {
        try {
            const params = new URLSearchParams({
                range: popularTimeRange,
                device: deviceType,
                country: selectedCountry
            });

            const res = await fetch(`/api/analytics/stats?${params.toString()}`);
            const result = await res.json();
            setStats(result);
        } catch (error) {
            console.error('Failed to fetch stats:', error);
        }
    };

    const fetchDownloadData = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/analytics/downloads?range=${timeRange}`);
            const result = await res.json();

            if (result.data) {
                setData(result.data);
                setTotalDownloadsInPeriod(result.total || 0);
                setTotalViewsInPeriod(result.totalViews || 0);
                setGrowthPercent(result.growthPercent || 0);
                setPreviousTotal(result.previousTotal || 0);
            }
        } catch (error) {
            console.error('Failed to fetch analytics data:', error);
        } finally {
            setLoading(false);
        }
    };

    // Get all available tags from images
    const availableTags = useMemo(() => {
        if (!stats?.popularImages) return [];
        const tagsSet = new Set<string>();
        stats.popularImages.forEach(img => {
            if (img.tags && Array.isArray(img.tags)) {
                img.tags.forEach(tag => tagsSet.add(tag));
            }
        });
        return Array.from(tagsSet).sort();
    }, [stats?.popularImages]);

    // Filter and sort images
    const filteredAndSortedImages = useMemo(() => {
        if (!stats?.popularImages) return [];

        let filtered = [...stats.popularImages];

        // Apply tag filter
        if (selectedTags.length > 0) {
            filtered = filtered.filter(img =>
                img.tags && img.tags.some(tag => selectedTags.includes(tag))
            );
        }

        // Apply minimum downloads filter
        if (minDownloads > 0) {
            filtered = filtered.filter(img => img.downloads >= minDownloads);
        }

        // Apply sorting
        filtered.sort((a, b) => {
            switch (sortBy) {
                case 'downloads_desc':
                    return b.downloads - a.downloads;
                case 'downloads_asc':
                    return a.downloads - b.downloads;
                case 'views_desc':
                    return (b.views || 0) - (a.views || 0);
                case 'conversion_desc':
                    return (b.conversionRate || 0) - (a.conversionRate || 0);
                case 'recent':
                    return (b.createdAt || '').localeCompare(a.createdAt || '');
                case 'name_asc':
                    return (a.name || '').localeCompare(b.name || '');
                case 'name_desc':
                    return (b.name || '').localeCompare(a.name || '');
                default:
                    return 0;
            }
        });

        return filtered;
    }, [stats?.popularImages, selectedTags, minDownloads, sortBy]);

    // Paginate images
    const paginatedImages = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        return filteredAndSortedImages.slice(startIndex, endIndex);
    }, [filteredAndSortedImages, currentPage]);

    const totalPages = Math.ceil(filteredAndSortedImages.length / itemsPerPage);

    // Reset pagination when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [selectedTags, minDownloads, sortBy, popularTimeRange, deviceType, selectedCountry]);

    const handleResetFilters = () => {
        setSelectedTags([]);
        setSortBy('downloads_desc');
        setMinDownloads(0);
        setDeviceType('all');
        setSelectedCountry('all');
        setCurrentPage(1);
    };

    // Export CSV handler
    const handleExportCSV = () => {
        if (!stats) return;

        const headers = [
            'Rank',
            'Image ID',
            'Title',
            'Period Downloads',
            'Period Views',
            'Conversion Rate (%)',
            'All-Time Downloads',
            'File Size',
            'Tags',
            'Created At'
        ];

        const escapeCSV = (val: string | number | undefined) => {
            const str = String(val ?? '');
            if (str.includes(',') || str.includes('"') || str.includes('\n')) {
                return `"${str.replace(/"/g, '""')}"`;
            }
            return str;
        };

        const rows = filteredAndSortedImages.map((img, idx) => [
            idx + 1,
            img.id,
            img.name,
            img.downloads,
            img.views || 0,
            img.conversionRate || 0,
            img.allTimeDownloads || img.downloads,
            formatBytes(img.size || 0),
            (img.tags || []).join('; '),
            img.createdAt ? new Date(img.createdAt).toISOString().split('T')[0] : ''
        ]);

        const csvContent = [
            headers.map(escapeCSV).join(','),
            ...rows.map(row => row.map(escapeCSV).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `png-finder-analytics-${popularTimeRange}-${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const timeRangeButtons: { value: TimeRange; label: string }[] = [
        { value: '1h', label: '1H' },
        { value: '24h', label: '24H' },
        { value: '7d', label: '7D' },
        { value: '30d', label: '30D' },
        { value: '90d', label: '90D' },
        { value: '1y', label: '1Y' },
    ];

    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            const point = payload[0].payload;
            return (
                <div className="bg-card-bg border border-card-border rounded-xl p-3.5 shadow-xl space-y-1.5">
                    <p className="text-foreground/60 text-xs font-medium">{point.date}</p>
                    <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                        <p className="text-foreground font-bold text-sm">
                            {(point.downloads || 0).toLocaleString()} downloads
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-purple-500"></span>
                        <p className="text-foreground/80 font-semibold text-sm">
                            {(point.views || 0).toLocaleString()} views
                        </p>
                    </div>
                </div>
            );
        }
        return null;
    };

    const getDeviceIcon = (device?: string) => {
        switch ((device || 'desktop').toLowerCase()) {
            case 'mobile':
                return <Smartphone className="w-4 h-4 text-purple-400" />;
            case 'tablet':
                return <Tablet className="w-4 h-4 text-emerald-400" />;
            default:
                return <Monitor className="w-4 h-4 text-blue-400" />;
        }
    };

    const totalDeviceCount = useMemo(() => {
        if (!stats?.deviceBreakdown) return 0;
        return stats.deviceBreakdown.reduce((sum, d) => sum + d.count, 0);
    }, [stats?.deviceBreakdown]);

    return (
        <div className="space-y-6">
            {/* Page Header with Export Button */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-foreground mb-1">Analytics</h1>
                    <p className="text-foreground/60 text-sm">
                        Track downloads, page views, audience devices, search demand, and catalog performance.
                    </p>
                </div>

                {canExportCSV && (
                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleExportCSV}
                            disabled={!stats}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-card-bg hover:bg-white/5 text-foreground font-semibold text-sm border border-card-border hover:border-primary-glow/50 transition-all shadow-lg cursor-pointer disabled:opacity-50"
                            title="Export filtered image analytics to CSV"
                        >
                            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                            Export CSV
                        </button>
                    </div>
                )}
            </div>

            {/* Primary Stat Cards Grid (6 Cards across 2 rows on lg, 3 cols on md, or 6 cols on 2xl) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <StatCard
                    title="Total Images"
                    value={stats?.totalImages || 0}
                    subtitle={`${stats?.publishedImages || 0} published · ${stats?.draftImages || 0} drafts`}
                    icon={<ImageIcon className="w-6 h-6" />}
                />
                <StatCard
                    title="Total Downloads"
                    value={stats?.totalDownloads?.toLocaleString() || '0'}
                    subtitle={`${stats && stats.totalImages > 0 ? Math.round(stats.totalDownloads / stats.totalImages) : 0} avg per image (all-time)`}
                    icon={<Download className="w-6 h-6" />}
                />
                <StatCard
                    title="Views & Conversion"
                    value={`${stats?.periodConversionRate ?? 0}%`}
                    subtitle={`${(stats?.periodViews || 0).toLocaleString()} views → ${(stats?.periodDownloads || 0).toLocaleString()} downloads (${popularTimeRange.toUpperCase()})`}
                    icon={<Eye className="w-6 h-6" />}
                />
                <StatCard
                    title="Disk Storage Used"
                    value={formatBytes(stats?.totalStorageBytes || 0)}
                    subtitle={`${formatBytes(stats?.avgImageSizeBytes || 0)} avg file size`}
                    icon={<HardDrive className="w-6 h-6" />}
                />
                <StatCard
                    title="Zero-Download Images"
                    value={stats?.zeroDownloadImagesCount ?? 0}
                    subtitle={
                        stats && stats.publishedImages > 0
                            ? `${Math.round(((stats.zeroDownloadImagesCount || 0) / stats.publishedImages) * 100)}% of published catalog needs attention`
                            : 'Published images with 0 downloads'
                    }
                    icon={<AlertTriangle className="w-6 h-6" />}
                />
                <StatCard
                    title="Custom Size Usage"
                    value={`${stats?.resizeBreakdown?.customPercent ?? 0}%`}
                    subtitle={`${stats?.resizeBreakdown?.customCount || 0} custom vs ${stats?.resizeBreakdown?.originalCount || 0} original (${popularTimeRange.toUpperCase()})`}
                    icon={<Maximize2 className="w-6 h-6" />}
                />
            </div>

            {/* Downloads & Views Over Time Chart Card */}
            <div className="bg-card-bg border border-card-border rounded-xl overflow-hidden shadow-xl">
                {/* Card Header */}
                <div className="p-6 border-b border-card-border flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                    <div className="flex items-start gap-3">
                        <div className="p-2.5 rounded-lg bg-primary-glow/10 text-primary-glow border border-primary-glow/20 mt-0.5">
                            <TrendingUp className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="flex flex-wrap items-center gap-3">
                                <h2 className="text-lg font-bold text-foreground">Downloads & Views Over Time</h2>
                                {!loading && (
                                    <span
                                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                                            growthPercent > 0
                                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                                : growthPercent < 0
                                                ? 'bg-red-500/10 text-red-400 border-red-500/30'
                                                : 'bg-white/5 text-foreground/60 border-white/10'
                                        }`}
                                        title={`Previous ${timeRange} period had ${previousTotal.toLocaleString()} downloads`}
                                    >
                                        {growthPercent >= 0 ? (
                                            <TrendingUp className="w-3.5 h-3.5" />
                                        ) : (
                                            <TrendingDown className="w-3.5 h-3.5" />
                                        )}
                                        {growthPercent > 0 ? `+${growthPercent}%` : `${growthPercent}%`} vs prev {timeRange.toUpperCase()}
                                    </span>
                                )}
                            </div>
                            <div className="flex flex-wrap items-center gap-6 mt-2">
                                <div className="flex items-baseline gap-2">
                                    <span className="text-2xl font-bold text-primary-glow">
                                        {loading ? '...' : totalDownloadsInPeriod.toLocaleString()}
                                    </span>
                                    <span className="text-xs text-foreground/60 font-medium">downloads</span>
                                </div>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-2xl font-bold text-purple-400">
                                        {loading ? '...' : totalViewsInPeriod.toLocaleString()}
                                    </span>
                                    <span className="text-xs text-foreground/60 font-medium">page views</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Legend + Time Range Buttons */}
                    <div className="flex flex-wrap items-center gap-4">
                        <div className="hidden sm:flex items-center gap-4 text-xs text-foreground/60">
                            <span className="flex items-center gap-1.5">
                                <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                                Downloads
                            </span>
                            <span className="flex items-center gap-1.5">
                                <span className="w-2.5 h-2.5 rounded-full bg-purple-500"></span>
                                Page Views
                            </span>
                        </div>

                        <div className="flex gap-1.5 bg-background rounded-lg p-1 border border-card-border">
                            {timeRangeButtons.map((btn) => (
                                <button
                                    key={btn.value}
                                    onClick={() => {
                                        setTimeRange(btn.value);
                                        setPopularTimeRange(btn.value);
                                    }}
                                    className={`px-3.5 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                                        timeRange === btn.value
                                            ? 'bg-primary-glow text-white shadow-lg shadow-primary-glow/20'
                                            : 'text-foreground/60 hover:text-foreground hover:bg-card-bg'
                                    }`}
                                >
                                    {btn.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Chart */}
                <div className="p-6">
                    {loading ? (
                        <div className="h-80 flex items-center justify-center">
                            <div className="text-foreground/40 animate-pulse">Loading chart data...</div>
                        </div>
                    ) : data.length === 0 ? (
                        <div className="h-80 flex items-center justify-center">
                            <div className="text-center">
                                <TrendingUp className="w-12 h-12 mx-auto text-foreground/20 mb-3" />
                                <p className="text-foreground/40">No download data available for this period</p>
                            </div>
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height={320}>
                            <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorDownloads" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.35} />
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#a855f7" stopOpacity={0.25} />
                                        <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(59, 130, 246, 0.1)" />
                                <XAxis
                                    dataKey="date"
                                    stroke="rgba(248, 250, 252, 0.3)"
                                    tick={{ fill: 'rgba(248, 250, 252, 0.8)', fontSize: 12 }}
                                />
                                <YAxis
                                    stroke="rgba(248, 250, 252, 0.3)"
                                    tick={{ fill: 'rgba(248, 250, 252, 0.8)', fontSize: 12 }}
                                />
                                <Tooltip content={<CustomTooltip />} />
                                <Area
                                    type="monotone"
                                    dataKey="views"
                                    stroke="#a855f7"
                                    strokeWidth={2}
                                    fill="url(#colorViews)"
                                    animationDuration={500}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="downloads"
                                    stroke="#3b82f6"
                                    strokeWidth={3}
                                    fill="url(#colorDownloads)"
                                    animationDuration={500}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </div>

            {/* 3-Column Audience & Format Breakdown Row: Device Breakdown | Top Countries | Resolution Choice */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* 1. Device Breakdown Card */}
                <div className="bg-card-bg border border-card-border rounded-xl overflow-hidden shadow-xl flex flex-col">
                    <div className="p-5 border-b border-card-border flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                <Monitor className="w-5 h-5" />
                            </div>
                            <div>
                                <h2 className="text-base font-bold text-foreground">Device Breakdown</h2>
                                <p className="text-xs text-foreground/60">Downloads by user device ({popularTimeRange.toUpperCase()})</p>
                            </div>
                        </div>
                    </div>

                    <div className="p-5 flex-1 flex flex-col justify-between">
                        {totalDeviceCount > 0 ? (
                            <>
                                <div className="h-44 w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={stats?.deviceBreakdown || []}
                                                dataKey="count"
                                                nameKey="device"
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={45}
                                                outerRadius={70}
                                                paddingAngle={4}
                                            >
                                                {(stats?.deviceBreakdown || []).map((entry) => (
                                                    <Cell
                                                        key={entry.device}
                                                        fill={DEVICE_COLORS[entry.device] || '#3b82f6'}
                                                    />
                                                ))}
                                            </Pie>
                                            <Tooltip
                                                formatter={(value: any, name: any) => [
                                                    `${value} downloads`,
                                                    String(name).charAt(0).toUpperCase() + String(name).slice(1)
                                                ]}
                                                contentStyle={{
                                                    backgroundColor: '#0f172a',
                                                    borderColor: 'rgba(255,255,255,0.1)',
                                                    borderRadius: '0.75rem',
                                                    color: '#f8fafc'
                                                }}
                                            />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>

                                <div className="space-y-3 mt-2">
                                    {(stats?.deviceBreakdown || []).map((item) => {
                                        const devName = item.device || 'desktop';
                                        const pct = item.percent ?? (item as any).percentage ?? 0;
                                        const label = devName.charAt(0).toUpperCase() + devName.slice(1);
                                        const barColor =
                                            devName === 'mobile'
                                                ? 'bg-purple-500'
                                                : devName === 'tablet'
                                                ? 'bg-emerald-500'
                                                : 'bg-blue-500';
                                        return (
                                            <div
                                                key={devName}
                                                onClick={() =>
                                                    setDeviceType(
                                                        deviceType === devName ? 'all' : (devName as any)
                                                    )
                                                }
                                                className={`p-2.5 rounded-lg border transition-all cursor-pointer ${
                                                    deviceType === devName
                                                        ? 'bg-primary-glow/10 border-primary-glow/40'
                                                        : 'bg-background/50 border-card-border hover:border-white/20'
                                                }`}
                                                title="Click to filter popular images by this device"
                                            >
                                                <div className="flex items-center justify-between text-xs mb-1.5">
                                                    <span className="flex items-center gap-2 font-semibold text-foreground">
                                                        {getDeviceIcon(devName)}
                                                        {label}
                                                    </span>
                                                    <span className="text-foreground/70 font-medium">
                                                        {item.count.toLocaleString()} ({pct}%)
                                                    </span>
                                                </div>
                                                <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full ${barColor} rounded-full transition-all duration-500`}
                                                        style={{ width: `${pct}%` }}
                                                    />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </>
                        ) : (
                            <div className="h-60 flex flex-col items-center justify-center text-center">
                                <Monitor className="w-10 h-10 text-foreground/20 mb-2" />
                                <p className="text-sm text-foreground/40">No device data recorded in this period</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* 2. Top Countries Leaderboard Card */}
                <div className="bg-card-bg border border-card-border rounded-xl overflow-hidden shadow-xl flex flex-col">
                    <div className="p-5 border-b border-card-border flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                <Globe className="w-5 h-5" />
                            </div>
                            <div>
                                <h2 className="text-base font-bold text-foreground">Top Countries</h2>
                                <p className="text-xs text-foreground/60">Geographic distribution ({popularTimeRange.toUpperCase()})</p>
                            </div>
                        </div>
                        {selectedCountry !== 'all' && (
                            <button
                                onClick={() => setSelectedCountry('all')}
                                className="text-xs text-primary-glow hover:underline cursor-pointer"
                            >
                                Clear ({selectedCountry})
                            </button>
                        )}
                    </div>

                    <div className="p-5 flex-1 overflow-y-auto max-h-[380px] space-y-2.5">
                        {stats?.topCountries && stats.topCountries.length > 0 ? (
                            stats.topCountries.map((country, idx) => {
                                const code = country.code || (country as any).country || 'XX';
                                const name = country.name || (country as any).countryName || 'Unknown';
                                const pct = country.percent ?? (country as any).percentage ?? 0;
                                return (
                                    <div
                                        key={code}
                                        onClick={() =>
                                            setSelectedCountry(selectedCountry === code ? 'all' : code)
                                        }
                                        className={`p-2.5 rounded-lg border transition-all cursor-pointer ${
                                            selectedCountry === code
                                                ? 'bg-primary-glow/10 border-primary-glow/40'
                                                : 'bg-background/50 border-card-border hover:border-white/20'
                                        }`}
                                        title="Click to filter popular images by this country"
                                    >
                                        <div className="flex items-center justify-between text-xs mb-1.5">
                                            <div className="flex items-center gap-2 truncate">
                                                <span className="text-foreground/40 font-mono w-4">#{idx + 1}</span>
                                                <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 font-mono text-[10px] font-bold text-foreground/80">
                                                    {code}
                                                </span>
                                                <span className="font-semibold text-foreground truncate">{name}</span>
                                            </div>
                                            <span className="text-foreground/70 font-medium shrink-0 ml-2">
                                                {country.count.toLocaleString()} ({pct}%)
                                            </span>
                                        </div>
                                        <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                                                style={{ width: `${pct}%` }}
                                            />
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <div className="h-60 flex flex-col items-center justify-center text-center">
                                <Globe className="w-10 h-10 text-foreground/20 mb-2" />
                                <p className="text-sm text-foreground/40">No country data recorded in this period</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* 3. Custom Resized vs. Original Downloads & Funnel Card */}
                <div className="bg-card-bg border border-card-border rounded-xl overflow-hidden shadow-xl flex flex-col">
                    <div className="p-5 border-b border-card-border flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
                                <Maximize2 className="w-5 h-5" />
                            </div>
                            <div>
                                <h2 className="text-base font-bold text-foreground">Resolution & Conversion</h2>
                                <p className="text-xs text-foreground/60">Original vs. Custom Resize ({popularTimeRange.toUpperCase()})</p>
                            </div>
                        </div>
                    </div>

                    <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                        {/* Resolution Split */}
                        <div className="space-y-3">
                            <div className="p-3.5 rounded-xl bg-background/60 border border-card-border">
                                <div className="flex items-center justify-between mb-1.5">
                                    <span className="text-xs font-bold text-foreground flex items-center gap-2">
                                        <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                                        Original Resolution
                                    </span>
                                    <span className="text-xs font-bold text-blue-400">
                                        {stats?.resizeBreakdown?.originalCount || 0} ({stats?.resizeBreakdown?.originalPercent ?? 100}%)
                                    </span>
                                </div>
                                <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-blue-500 rounded-full transition-all duration-500"
                                        style={{ width: `${stats?.resizeBreakdown?.originalPercent ?? 100}%` }}
                                    />
                                </div>
                            </div>

                            <div className="p-3.5 rounded-xl bg-background/60 border border-card-border">
                                <div className="flex items-center justify-between mb-1.5">
                                    <span className="text-xs font-bold text-foreground flex items-center gap-2">
                                        <span className="w-2.5 h-2.5 rounded-full bg-purple-500"></span>
                                        Custom Resized PNG
                                    </span>
                                    <span className="text-xs font-bold text-purple-400">
                                        {stats?.resizeBreakdown?.customCount || 0} ({stats?.resizeBreakdown?.customPercent ?? 0}%)
                                    </span>
                                </div>
                                <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-purple-500 rounded-full transition-all duration-500"
                                        style={{ width: `${stats?.resizeBreakdown?.customPercent ?? 0}%` }}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* View-to-Download Funnel Box */}
                        <div className="p-4 rounded-xl bg-gradient-to-br from-primary-glow/10 via-purple-500/5 to-transparent border border-primary-glow/20 space-y-2.5">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold uppercase tracking-wider text-foreground/60">
                                    View → Download Funnel
                                </span>
                                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-primary-glow/20 text-primary-glow border border-primary-glow/30">
                                    {stats?.periodConversionRate ?? 0}% Conv.
                                </span>
                            </div>
                            <div className="grid grid-cols-2 gap-3 pt-1">
                                <div className="bg-background/60 rounded-lg p-2.5 border border-card-border">
                                    <p className="text-[11px] text-foreground/50">Period Page Views</p>
                                    <p className="text-lg font-bold text-foreground">
                                        {(stats?.periodViews || 0).toLocaleString()}
                                    </p>
                                </div>
                                <div className="bg-background/60 rounded-lg p-2.5 border border-card-border">
                                    <p className="text-[11px] text-foreground/50">Period Downloads</p>
                                    <p className="text-lg font-bold text-primary-glow">
                                        {(stats?.periodDownloads || 0).toLocaleString()}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* 2-Column Content & Search Intelligence Row: Top Tags/Categories | Search Queries & Missed Opportunities */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* 4. Top Performing Tags & Categories Card */}
                <div className="bg-card-bg border border-card-border rounded-xl overflow-hidden shadow-xl flex flex-col">
                    <div className="p-5 border-b border-card-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                <Tag className="w-5 h-5" />
                            </div>
                            <div>
                                <h2 className="text-base font-bold text-foreground">Top Performing Tags & Categories</h2>
                                <p className="text-xs text-foreground/60">Ranked by total downloads ({popularTimeRange.toUpperCase()})</p>
                            </div>
                        </div>

                        <div className="flex bg-background rounded-lg p-1 border border-card-border">
                            <button
                                onClick={() => setContentTab('tags')}
                                className={`px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                                    contentTab === 'tags'
                                        ? 'bg-primary-glow text-white shadow'
                                        : 'text-foreground/60 hover:text-foreground'
                                }`}
                            >
                                <Tag className="w-3.5 h-3.5" />
                                Top Tags ({stats?.topTags?.length || 0})
                            </button>
                            <button
                                onClick={() => setContentTab('categories')}
                                className={`px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                                    contentTab === 'categories'
                                        ? 'bg-primary-glow text-white shadow'
                                        : 'text-foreground/60 hover:text-foreground'
                                }`}
                            >
                                <Folder className="w-3.5 h-3.5" />
                                Categories ({stats?.topCategories?.length || 0})
                            </button>
                        </div>
                    </div>

                    <div className="p-5 flex-1 max-h-[360px] overflow-y-auto">
                        {contentTab === 'tags' ? (
                            stats?.topTags && stats.topTags.length > 0 ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                    {stats.topTags.map((t, idx) => {
                                        const isSelected = selectedTags.includes(t.tag);
                                        return (
                                            <button
                                                key={t.tag}
                                                onClick={() => {
                                                    if (isSelected) {
                                                        setSelectedTags(selectedTags.filter(x => x !== t.tag));
                                                    } else {
                                                        setSelectedTags([...selectedTags, t.tag]);
                                                    }
                                                }}
                                                className={`p-3 rounded-lg border text-left transition-all cursor-pointer flex items-center justify-between ${
                                                    isSelected
                                                        ? 'bg-primary-glow/15 border-primary-glow text-foreground'
                                                        : 'bg-background/50 border-card-border hover:border-white/20'
                                                }`}
                                                title="Click to filter Most Popular Images by this tag"
                                            >
                                                <div className="flex items-center gap-2.5 truncate">
                                                    <span className="text-xs font-mono text-foreground/40">#{idx + 1}</span>
                                                    <div className="truncate">
                                                        <p className="text-sm font-semibold text-foreground truncate">
                                                            #{t.tag}
                                                        </p>
                                                        <p className="text-[11px] text-foreground/50">
                                                            {t.imageCount} {t.imageCount === 1 ? 'image' : 'images'}
                                                        </p>
                                                    </div>
                                                </div>
                                                <span className="px-2.5 py-1 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-bold shrink-0">
                                                    {t.downloads.toLocaleString()} DL
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="h-52 flex flex-col items-center justify-center text-center">
                                    <Tag className="w-10 h-10 text-foreground/20 mb-2" />
                                    <p className="text-sm text-foreground/40">No tag download activity in this period</p>
                                </div>
                            )
                        ) : stats?.topCategories && stats.topCategories.length > 0 ? (
                            <div className="space-y-2.5">
                                {stats.topCategories.map((cat, idx) => (
                                    <div
                                        key={cat.id}
                                        className="p-3 rounded-lg bg-background/50 border border-card-border flex items-center justify-between"
                                    >
                                        <div className="flex items-center gap-3">
                                            <span className="text-xs font-mono text-foreground/40 w-5">#{idx + 1}</span>
                                            <div>
                                                <p className="text-sm font-semibold text-foreground">{cat.name}</p>
                                                <p className="text-xs text-foreground/50">
                                                    {cat.imageCount} published {cat.imageCount === 1 ? 'asset' : 'assets'} · /{cat.slug}
                                                </p>
                                            </div>
                                        </div>
                                        <span className="px-3 py-1 rounded-md bg-primary-glow/10 text-primary-glow border border-primary-glow/20 text-xs font-bold">
                                            {cat.downloads.toLocaleString()} downloads
                                        </span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="h-52 flex flex-col items-center justify-center text-center">
                                <Folder className="w-10 h-10 text-foreground/20 mb-2" />
                                <p className="text-sm text-foreground/40">No categories found</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* 5. Search Queries & "Zero-Result Searches" Tracker Card */}
                <div className="bg-card-bg border border-card-border rounded-xl overflow-hidden shadow-xl flex flex-col">
                    <div className="p-5 border-b border-card-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                                <Search className="w-5 h-5" />
                            </div>
                            <div>
                                <h2 className="text-base font-bold text-foreground">Search Intelligence</h2>
                                <p className="text-xs text-foreground/60">What visitors search for & missed opportunities</p>
                            </div>
                        </div>

                        <div className="flex bg-background rounded-lg p-1 border border-card-border">
                            <button
                                onClick={() => setSearchTab('top')}
                                className={`px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                                    searchTab === 'top'
                                        ? 'bg-primary-glow text-white shadow'
                                        : 'text-foreground/60 hover:text-foreground'
                                }`}
                            >
                                <Sparkles className="w-3.5 h-3.5" />
                                Top Searches ({stats?.topSearches?.length || 0})
                            </button>
                            <button
                                onClick={() => setSearchTab('missed')}
                                className={`px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                                    searchTab === 'missed'
                                        ? 'bg-amber-500 text-white shadow'
                                        : 'text-foreground/60 hover:text-foreground'
                                }`}
                            >
                                <AlertTriangle className="w-3.5 h-3.5" />
                                0-Result ({stats?.zeroResultSearches?.length || 0})
                            </button>
                        </div>
                    </div>

                    <div className="p-5 flex-1 max-h-[360px] overflow-y-auto">
                        {searchTab === 'top' ? (
                            stats?.topSearches && stats.topSearches.length > 0 ? (
                                <div className="space-y-2.5">
                                    {stats.topSearches.map((s, idx) => (
                                        <div
                                            key={s.query}
                                            className="p-3 rounded-lg bg-background/50 border border-card-border flex items-center justify-between"
                                        >
                                            <div className="flex items-center gap-3 truncate">
                                                <span className="text-xs font-mono text-foreground/40 w-5">#{idx + 1}</span>
                                                <div className="truncate">
                                                    <p className="text-sm font-semibold text-foreground truncate">
                                                        &ldquo;{s.query}&rdquo;
                                                    </p>
                                                    <p className="text-xs text-foreground/50">
                                                        Avg {s.avgResults ?? 0} matching PNGs
                                                    </p>
                                                </div>
                                            </div>
                                            <span className="px-2.5 py-1 rounded-md bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-xs font-bold shrink-0">
                                                {s.searches.toLocaleString()} {s.searches === 1 ? 'search' : 'searches'}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="h-52 flex flex-col items-center justify-center text-center">
                                    <Search className="w-10 h-10 text-foreground/20 mb-2" />
                                    <p className="text-sm text-foreground/40">
                                        No search queries recorded yet in this period
                                    </p>
                                    <p className="text-xs text-foreground/30 mt-1">
                                        Searches on /search are automatically logged here
                                    </p>
                                </div>
                            )
                        ) : stats?.zeroResultSearches && stats.zeroResultSearches.length > 0 ? (
                            <div className="space-y-2.5">
                                {stats.zeroResultSearches.map((s, idx) => (
                                    <div
                                        key={s.query}
                                        className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/20 flex items-center justify-between"
                                    >
                                        <div className="flex items-center gap-3 truncate">
                                            <span className="text-xs font-mono text-amber-400/70 w-5">#{idx + 1}</span>
                                            <div className="truncate">
                                                <p className="text-sm font-semibold text-foreground truncate">
                                                    &ldquo;{s.query}&rdquo;
                                                </p>
                                                <p className="text-xs text-amber-400/80">
                                                    0 matching images found — upload opportunity!
                                                </p>
                                            </div>
                                        </div>
                                        <span className="px-2.5 py-1 rounded-md bg-amber-500/15 text-amber-400 border border-amber-500/30 text-xs font-bold shrink-0">
                                            {s.searches} {s.searches === 1 ? 'try' : 'tries'}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="h-52 flex flex-col items-center justify-center text-center">
                                <CheckCircle2 className="w-10 h-10 text-emerald-400/30 mb-2" />
                                <p className="text-sm text-foreground/40">
                                    Zero missed searches in this period!
                                </p>
                                <p className="text-xs text-foreground/30 mt-1">
                                    Keywords that return 0 results will appear here so you know what to upload next.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Live / Recent Downloads Activity Feed Card */}
            <div className="bg-card-bg border border-card-border rounded-xl overflow-hidden shadow-xl">
                <div className="p-6 border-b border-card-border flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <Activity className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2.5">
                                <h2 className="text-lg font-bold text-foreground">Recent Downloads Activity Feed</h2>
                                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                                    Live
                                </span>
                            </div>
                            <p className="text-xs text-foreground/60 mt-0.5">
                                Latest 15 downloads across your catalog with device, location, and resolution details
                            </p>
                        </div>
                    </div>
                </div>

                <div className="p-6">
                    {stats?.recentDownloads && stats.recentDownloads.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {stats.recentDownloads.map((item) => {
                                const dev = item.device || (item as any).deviceType || 'desktop';
                                const cCode = item.countryCode || (item as any).country || 'XX';
                                return (
                                    <Link
                                        key={item.id}
                                        href={`/images/${item.imageId}`}
                                        className="p-3 rounded-xl bg-background/50 hover:bg-background border border-card-border hover:border-primary-glow/40 transition-all flex items-center gap-3 group"
                                    >
                                        <div className="w-12 h-12 rounded-lg bg-card-bg border border-card-border p-1.5 flex items-center justify-center shrink-0">
                                            {item.imagePath ? (
                                                <img
                                                    src={item.imagePath}
                                                    alt={item.imageName}
                                                    className="max-w-full max-h-full object-contain"
                                                />
                                            ) : (
                                                <ImageIcon className="w-5 h-5 text-foreground/30" />
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold text-foreground truncate group-hover:text-primary-glow transition-colors">
                                                {item.imageName}
                                            </p>
                                            <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-white/5 text-[10px] text-foreground/70 font-medium">
                                                    {getDeviceIcon(dev)}
                                                    {dev}
                                                </span>
                                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-white/5 text-[10px] text-foreground/70 font-mono">
                                                    {cCode}
                                                </span>
                                                <span
                                                    className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                                        item.isCustomSize
                                                            ? 'bg-purple-500/15 text-purple-400 border border-purple-500/30'
                                                            : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                                                    }`}
                                                >
                                                    {item.isCustomSize
                                                        ? `Custom ${item.resolution || ''}`.trim()
                                                        : `Orig ${item.resolution || ''}`.trim()}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <span className="text-[11px] text-foreground/40 flex items-center gap-1">
                                                <Clock className="w-3 h-3" />
                                                {formatRelativeTime(item.createdAt)}
                                            </span>
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="py-12 text-center">
                            <Activity className="w-10 h-10 text-foreground/20 mx-auto mb-2" />
                            <p className="text-sm text-foreground/40">No recent downloads recorded yet</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Most Popular Images Card with Filters */}
            {stats && (
                <div className="bg-card-bg border border-card-border rounded-xl overflow-hidden shadow-xl">
                    {/* Card Header with Time Range */}
                    <div className="p-6 border-b border-card-border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-lg bg-primary-glow/10 text-primary-glow border border-primary-glow/20">
                                <Layers className="w-5 h-5" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-foreground">Most Popular Images</h2>
                                <p className="text-foreground/60 text-sm mt-0.5">
                                    Top performing images with page views, downloads, and conversion rate
                                </p>
                            </div>
                        </div>

                        {/* Time Range Buttons */}
                        <div className="flex gap-1.5 bg-background rounded-lg p-1 border border-card-border">
                            {timeRangeButtons.map((btn) => (
                                <button
                                    key={btn.value}
                                    onClick={() => setPopularTimeRange(btn.value)}
                                    className={`px-3.5 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                                        popularTimeRange === btn.value
                                            ? 'bg-primary-glow text-white shadow-lg shadow-primary-glow/20'
                                            : 'text-foreground/60 hover:text-foreground hover:bg-card-bg'
                                    }`}
                                >
                                    {btn.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Sidebar + Image List Layout */}
                    <div className="flex flex-col md:flex-row">
                        {/* Filter Sidebar */}
                        <div className="p-6 border-b md:border-b-0 md:border-r border-card-border">
                            <FilterSidebar
                                selectedTags={selectedTags}
                                sortBy={sortBy}
                                minDownloads={minDownloads}
                                deviceType={deviceType}
                                selectedCountry={selectedCountry}
                                availableTags={availableTags}
                                availableCountries={availableCountries}
                                onTagsChange={setSelectedTags}
                                onSortChange={setSortBy}
                                onMinDownloadsChange={setMinDownloads}
                                onDeviceTypeChange={setDeviceType}
                                onCountryChange={setSelectedCountry}
                                onResetFilters={handleResetFilters}
                            />
                        </div>

                        {/* Image List */}
                        <div className="flex-1 p-6">
                            {paginatedImages.length > 0 ? (
                                <>
                                    <div className="space-y-3 mb-6">
                                        {paginatedImages.map((image, index) => {
                                            const globalIndex = (currentPage - 1) * itemsPerPage + index;
                                            return (
                                                <Link key={image.id} href={`/images/${image.id}`}>
                                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-background/50 border border-card-border hover:border-primary-glow/40 rounded-xl hover:bg-background transition-all cursor-pointer gap-4 mb-3">
                                                        <div className="flex items-center gap-4 flex-1 min-w-0">
                                                            <div className="w-13 h-13 bg-card-bg border border-card-border rounded-lg p-2 flex items-center justify-center shrink-0">
                                                                <img
                                                                    src={image.path}
                                                                    alt={image.name}
                                                                    className="max-w-full max-h-full object-contain"
                                                                />
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-foreground font-semibold truncate">
                                                                    {image.name}
                                                                </p>
                                                                <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-foreground/60">
                                                                    <span className="inline-flex items-center gap-1 text-primary-glow font-bold">
                                                                        <Download className="w-3.5 h-3.5" />
                                                                        {image.downloads.toLocaleString()} downloads
                                                                    </span>
                                                                    <span className="inline-flex items-center gap-1 text-purple-400 font-medium">
                                                                        <Eye className="w-3.5 h-3.5" />
                                                                        {(image.views || 0).toLocaleString()} views
                                                                    </span>
                                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
                                                                        {image.conversionRate ?? 0}% conv.
                                                                    </span>
                                                                    {image.size ? (
                                                                        <span className="text-foreground/40">
                                                                            {formatBytes(image.size)}
                                                                        </span>
                                                                    ) : null}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center justify-end gap-3 shrink-0">
                                                            <span className="px-3 py-1 rounded-lg bg-primary-glow/10 border border-primary-glow/20 text-primary-glow font-bold text-sm">
                                                                #{globalIndex + 1}
                                                            </span>
                                                            <ArrowUpRight className="w-4 h-4 text-foreground/40" />
                                                        </div>
                                                    </div>
                                                </Link>
                                            );
                                        })}
                                    </div>

                                    {/* Pagination */}
                                    <Pagination
                                        currentPage={currentPage}
                                        totalPages={totalPages}
                                        totalItems={filteredAndSortedImages.length}
                                        itemsPerPage={itemsPerPage}
                                        onPageChange={setCurrentPage}
                                    />
                                </>
                            ) : (
                                <div className="h-64 flex items-center justify-center">
                                    <div className="text-center">
                                        <p className="text-foreground/40">No images match your filters</p>
                                        <button
                                            onClick={handleResetFilters}
                                            className="mt-4 px-4 py-2 bg-primary-glow text-white rounded-lg hover:shadow-lg hover:shadow-primary-glow/20 transition-all cursor-pointer"
                                        >
                                            Reset Filters
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
