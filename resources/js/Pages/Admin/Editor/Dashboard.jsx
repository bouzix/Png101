import React from 'react';
import { Head, Link } from '@inertiajs/react';
import {
    ResponsiveContainer,
    AreaChart,
    Area,
    XAxis,
    YAxis,
    Tooltip,
    CartesianGrid,
} from 'recharts';
import {
    Paintbrush,
    LayoutTemplate,
    Download,
    Image as ImageIcon,
    Sparkles,
    Plus,
    ExternalLink,
    Settings,
    BarChart3,
    FolderTree,
    Type,
    Search,
    TrendingUp,
} from 'lucide-react';
import AdminLayout from '../../../Layouts/AdminLayout';
import { StatCard } from '../../../components/ui/StatCard';
import { GlassCard } from '../../../components/ui/GlassCard';

export default function EditorDashboard({ initialData = {}, settings = {} }) {
    const kpis = initialData.kpis || {};
    const daily = initialData.daily || [];
    const topTemplates = initialData.topTemplates || [];
    const topAssets = initialData.topAssets || [];
    const topSearches = initialData.topSearches || [];

    return (
        <AdminLayout>
            <Head title="Editor Dashboard" />
            <div className="w-full space-y-8 animate-in fade-in duration-300">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-3 flex-wrap">
                            <h1 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-3">
                                <Paintbrush className="w-7 h-7 text-primary-glow shrink-0" />
                                <span>Image Editor Studio</span>
                            </h1>
                            <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                                settings.enabled
                                    ? 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/25'
                                    : 'bg-amber-500/15 text-amber-500 border border-amber-500/25'
                            }`}>
                                {settings.enabled ? 'Live Public' : 'Admin Only'}
                            </span>
                        </div>
                        <p className="text-sm text-foreground/55 mt-1">
                            Overview of your Canva-style editor templates, PNG catalog usage, and exports over the last 30 days.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-1 p-1 bg-card-header-bg border border-card-border rounded-xl self-start md:self-auto">
                        <a
                            href="/image-editor"
                            target="_blank"
                            rel="noreferrer"
                            className="h-8 px-3 rounded-lg bg-card-bg hover:text-primary-glow text-xs font-bold text-foreground/80 shadow-sm inline-flex items-center gap-1.5 transition-all"
                        >
                            <ExternalLink className="w-3.5 h-3.5 text-primary-glow" />
                            <span>Open Live Studio</span>
                        </a>
                        <a
                            href="/image-editor?adminTemplate=new"
                            className="h-8 px-3.5 rounded-lg bg-primary-glow hover:bg-blue-500 text-white text-xs font-bold shadow-sm inline-flex items-center gap-1.5 transition-all"
                        >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Design New Template</span>
                        </a>
                    </div>
                </div>

                {/* KPI Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard
                        title="Editor Opens (30d)"
                        value={(kpis.opens ?? 0).toLocaleString()}
                        subtitle={`${kpis.searches ?? 0} PNG asset searches`}
                        icon={<Sparkles className="w-5 h-5 text-blue-500" />}
                    />
                    <StatCard
                        title="Exports Completed"
                        value={(kpis.exports ?? 0).toLocaleString()}
                        subtitle={`${kpis.exportRate ?? 0}% open-to-export conversion`}
                        icon={<Download className="w-5 h-5 text-emerald-500" />}
                    />
                    <StatCard
                        title="Catalog PNGs Placed"
                        value={(kpis.assetInserts ?? 0).toLocaleString()}
                        subtitle={`${kpis.templateApplies ?? 0} template applications`}
                        icon={<ImageIcon className="w-5 h-5 text-violet-500" />}
                    />
                    <StatCard
                        title="Published Templates"
                        value={`${kpis.publishedTemplates ?? 0} / ${kpis.totalTemplates ?? 0}`}
                        subtitle={`${kpis.activePresets ?? 0} presets · ${kpis.activeFonts ?? 0} active fonts`}
                        icon={<LayoutTemplate className="w-5 h-5 text-amber-500" />}
                    />
                </div>

                {/* Quick Navigation Strip */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                        { label: 'Templates Library', desc: 'Publish & edit designs', href: '/admin/dashboard/editor/templates', icon: <LayoutTemplate className="w-4 h-4 text-blue-500" /> },
                        { label: 'Categories & Presets', desc: `${kpis.activeCategories ?? 0} groups configured`, href: '/admin/dashboard/editor/categories', icon: <FolderTree className="w-4 h-4 text-indigo-500" /> },
                        { label: 'Fonts & Brand', desc: `${kpis.activeFonts ?? 0} web & custom fonts`, href: '/admin/dashboard/editor/fonts', icon: <Type className="w-4 h-4 text-violet-500" /> },
                        { label: 'Studio Settings', desc: 'Limits, formats & toggles', href: '/admin/dashboard/editor/settings', icon: <Settings className="w-4 h-4 text-emerald-500" /> },
                    ].map((card) => (
                        <Link
                            key={card.href}
                            href={card.href}
                            className="p-3.5 rounded-2xl bg-card-bg border border-card-border hover:border-blue-500/40 transition-all flex items-center gap-3 group"
                        >
                            <div className="p-2.5 rounded-xl bg-foreground/5 group-hover:bg-blue-500/10 transition-colors shrink-0">
                                {card.icon}
                            </div>
                            <div className="min-w-0">
                                <div className="text-xs font-bold text-foreground group-hover:text-blue-500 truncate">{card.label}</div>
                                <div className="text-[11px] text-foreground/55 truncate">{card.desc}</div>
                            </div>
                        </Link>
                    ))}
                </div>

                {/* Main Chart + Top PNG Searches */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <GlassCard className="lg:col-span-2 p-5 space-y-4 shadow-none">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                                    <TrendingUp className="w-4 h-4 text-blue-500" />
                                    <span>Studio Activity (Last 30 Days)</span>
                                </h2>
                                <p className="text-xs text-foreground/55">Daily editor sessions, catalog PNG placements, and completed exports</p>
                            </div>
                            <Link href="/admin/dashboard/editor/analytics" className="text-xs font-semibold text-blue-500 hover:underline flex items-center gap-1">
                                <BarChart3 className="w-3.5 h-3.5" />
                                <span>Full Analytics</span>
                            </Link>
                        </div>

                        <div className="h-72 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={daily}>
                                    <defs>
                                        <linearGradient id="edOpensGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.35} />
                                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="edExportsGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.18)" />
                                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} minTickGap={24} />
                                    <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} allowDecimals={false} />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: '#0f172a',
                                            borderColor: '#1e293b',
                                            borderRadius: '12px',
                                            color: '#f8fafc',
                                            fontSize: '12px',
                                        }}
                                    />
                                    <Area type="monotone" dataKey="opens" name="Editor Opens" stroke="#3b82f6" strokeWidth={2} fill="url(#edOpensGrad)" />
                                    <Area type="monotone" dataKey="inserts" name="PNG Inserts" stroke="#8b5cf6" strokeWidth={2} fillOpacity={0} />
                                    <Area type="monotone" dataKey="exports" name="Exports" stroke="#10b981" strokeWidth={2} fill="url(#edExportsGrad)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </GlassCard>

                    {/* Top Searched PNG Terms */}
                    <GlassCard className="p-5 space-y-4 shadow-none">
                        <div className="flex items-center justify-between">
                            <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                                <Search className="w-4 h-4 text-blue-500" />
                                <span>Top PNG Searches Inside Editor</span>
                            </h2>
                        </div>
                        {topSearches.length === 0 ? (
                            <div className="py-12 text-center text-xs text-foreground/50">
                                No PNG asset searches recorded yet. Users searching inside the PNG Assets rail will appear here.
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {topSearches.slice(0, 7).map((item, idx) => (
                                    <div key={idx} className="flex items-center justify-between px-3 py-2 rounded-xl bg-foreground/[0.03] border border-card-border/60">
                                        <div className="min-w-0">
                                            <div className="text-xs font-semibold text-foreground truncate">{item.query}</div>
                                            <div className="text-[10px] text-foreground/50">~{item.avgResults} avg matches</div>
                                        </div>
                                        <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500 text-[11px] font-bold">
                                            {item.count}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </GlassCard>
                </div>

                {/* Top Templates & Top Catalog PNGs */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <GlassCard className="p-5 space-y-4 shadow-none">
                        <div className="flex items-center justify-between">
                            <h2 className="text-sm font-bold text-foreground">Top Performing Templates</h2>
                            <Link href="/admin/dashboard/editor/templates" className="text-xs font-semibold text-blue-500 hover:underline">
                                View All
                            </Link>
                        </div>
                        <div className="space-y-2.5">
                            {topTemplates.slice(0, 5).map((tpl) => (
                                <div key={tpl.id} className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-foreground/[0.025] border border-card-border">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="w-12 h-9 rounded-lg overflow-hidden bg-slate-900 border border-card-border shrink-0 flex items-center justify-center">
                                            {tpl.thumbnailPath ? (
                                                <img src={tpl.thumbnailPath} alt={tpl.title} className="w-full h-full object-cover" />
                                            ) : (
                                                <LayoutTemplate className="w-4 h-4 text-foreground/40" />
                                            )}
                                        </div>
                                        <div className="min-w-0">
                                            <div className="text-xs font-bold text-foreground truncate">{tpl.title}</div>
                                            <div className="text-[11px] text-foreground/55">{tpl.categoryName} · {tpl.width}×{tpl.height}</div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <span className="text-xs font-bold text-blue-500">{tpl.usageCount} uses</span>
                                        <a
                                            href={`/image-editor?adminTemplate=${tpl.id}`}
                                            className="px-2.5 py-1 rounded-lg bg-foreground/5 hover:bg-blue-500/15 text-[11px] font-semibold text-foreground hover:text-blue-500"
                                        >
                                            Edit
                                        </a>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </GlassCard>

                    <GlassCard className="p-5 space-y-4 shadow-none">
                        <div className="flex items-center justify-between">
                            <h2 className="text-sm font-bold text-foreground">Most Inserted Site PNG Assets</h2>
                            <Link href="/admin/dashboard/editor/analytics" className="text-xs font-semibold text-blue-500 hover:underline">
                                Analytics
                            </Link>
                        </div>
                        {topAssets.length === 0 ? (
                            <div className="py-12 text-center text-xs text-foreground/50">
                                No catalog PNG placements logged yet.
                            </div>
                        ) : (
                            <div className="space-y-2.5">
                                {topAssets.slice(0, 5).map((asset) => (
                                    <div key={asset.id} className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-foreground/[0.025] border border-card-border">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-900 border border-card-border p-1 shrink-0 flex items-center justify-center">
                                                {asset.thumbUrl ? (
                                                    <img src={asset.thumbUrl} alt={asset.name} className="max-w-full max-h-full object-contain" />
                                                ) : (
                                                    <ImageIcon className="w-4 h-4 text-foreground/40" />
                                                )}
                                            </div>
                                            <div className="min-w-0">
                                                <div className="text-xs font-bold text-foreground truncate">{asset.name}</div>
                                                <div className="text-[11px] text-foreground/50 font-mono truncate">{asset.id}</div>
                                            </div>
                                        </div>
                                        <span className="px-2.5 py-1 rounded-full bg-violet-500/15 text-violet-500 text-[11px] font-bold shrink-0">
                                            {asset.inserts} inserts
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </GlassCard>
                </div>
            </div>
        </AdminLayout>
    );
}
