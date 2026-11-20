import React, { useState } from 'react';
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
    BarChart,
    Bar,
} from 'recharts';
import {
    BarChart3,
    FileDown,
    Search,
    AlertTriangle,
    Download,
    Image as ImageIcon,
    Sparkles,
    Layers,
} from 'lucide-react';
import AdminLayout from '../../../Layouts/AdminLayout';
import { StatCard } from '../../../components/ui/StatCard';
import { GlassCard } from '../../../components/ui/GlassCard';

const CHART_COLORS = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ec4899'];

export default function EditorAnalyticsAdmin({ initialData = {}, initialDays = 30 }) {
    const [days, setDays] = useState(initialDays);
    const [data, setData] = useState(initialData);
    const [loading, setLoading] = useState(false);

    const kpis = data.kpis || {};
    const daily = data.daily || [];
    const formats = data.formats || [];
    const devices = data.devices || [];
    const topSizes = data.topSizes || [];
    const topSearches = data.topSearches || [];
    const zeroResultSearches = data.zeroResultSearches || [];
    const topAssets = data.topAssets || [];
    const topTemplates = data.topTemplates || [];

    const switchRange = async (nextDays) => {
        setDays(nextDays);
        setLoading(true);
        try {
            const res = await fetch(`/api/admin/editor/analytics?days=${nextDays}`);
            if (res.ok) {
                const payload = await res.json();
                setData(payload);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <AdminLayout>
            <Head title="Editor Analytics" />
            <div className="w-full space-y-8 animate-in fade-in duration-300">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                    <div>
                        <h1 className="text-xl sm:text-2xl xl:text-3xl font-bold text-foreground flex items-center gap-2.5 sm:gap-3">
                            <BarChart3 className="w-6 h-6 sm:w-7 sm:h-7 text-primary-glow shrink-0" />
                            <span>Editor Analytics &amp; Insights</span>
                        </h1>
                        <p className="hidden xl:block text-sm text-foreground/55 mt-1">
                            Track studio engagement, template conversions, exported formats, and PNG asset demand.
                        </p>
                    </div>
                    <div className="flex items-center gap-1 p-1 bg-card-header-bg border border-card-border rounded-xl self-start sm:self-auto">
                        {[7, 30, 90].map((d) => (
                            <button
                                key={d}
                                type="button"
                                onClick={() => switchRange(d)}
                                className={`h-7 px-2.5 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                                    days === d
                                        ? 'bg-primary-glow text-white shadow-sm'
                                        : 'bg-card-bg text-foreground/70 hover:text-primary-glow shadow-sm'
                                }`}
                            >
                                {d}d
                            </button>
                        ))}
                        <a
                            href={`/api/admin/editor/analytics/export?days=${days}`}
                            title="Export CSV"
                            aria-label="Export CSV"
                            className="h-7 w-7 px-0 xl:w-auto xl:px-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-sm inline-flex items-center justify-center xl:gap-1.5 transition-all"
                        >
                            <FileDown className="w-3.5 h-3.5" />
                            <span className="hidden xl:inline">Export CSV</span>
                        </a>
                    </div>
                </div>

                {/* Funnel KPIs (Desktop / Laptop >= 1280px only) */}
                <div className={`hidden xl:grid xl:grid-cols-4 gap-4 ${loading ? 'opacity-60' : ''}`}>
                    <StatCard title="Studio Sessions" value={(kpis.opens ?? 0).toLocaleString()} subtitle="Canvas opens" icon={<Sparkles className="w-5 h-5 text-blue-500" />} />
                    <StatCard title="Catalog PNG Inserts" value={(kpis.assetInserts ?? 0).toLocaleString()} subtitle={`${kpis.searches ?? 0} PNG searches`} icon={<ImageIcon className="w-5 h-5 text-violet-500" />} />
                    <StatCard title="Template Applies" value={(kpis.templateApplies ?? 0).toLocaleString()} subtitle="Starter & curated decks" icon={<Layers className="w-5 h-5 text-amber-500" />} />
                    <StatCard title="Designs Exported" value={(kpis.exports ?? 0).toLocaleString()} subtitle={`${kpis.exportRate ?? 0}% completion`} icon={<Download className="w-5 h-5 text-emerald-500" />} />
                </div>

                {/* Trend & Formats */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <GlassCard className="lg:col-span-2 p-5 space-y-3 shadow-none">
                        <h2 className="text-sm font-bold text-foreground">Daily Usage Funnel ({days} Days)</h2>
                        <div className="h-72">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={daily}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.18)" />
                                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} minTickGap={18} />
                                    <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} allowDecimals={false} />
                                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '12px', color: '#f8fafc', fontSize: '12px' }} />
                                    <Area type="monotone" dataKey="opens" name="Opens" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.2} />
                                    <Area type="monotone" dataKey="inserts" name="PNG Inserts" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.12} />
                                    <Area type="monotone" dataKey="exports" name="Exports" stroke="#10b981" fill="#10b981" fillOpacity={0.22} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </GlassCard>

                    <GlassCard className="p-5 space-y-4 shadow-none">
                        <h2 className="text-sm font-bold text-foreground">Export Formats</h2>
                        {formats.length === 0 ? (
                            <div className="py-16 text-center text-xs text-foreground/50">No exports in selected period.</div>
                        ) : (
                            <div className="h-52">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={formats} dataKey="count" nameKey="name" innerRadius={44} outerRadius={72} paddingAngle={4}>
                                            {formats.map((_, i) => (
                                                <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '12px', color: '#f8fafc', fontSize: '12px' }} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        )}
                        <div className="flex flex-wrap gap-2 justify-center">
                            {formats.map((f, i) => (
                                <span key={f.name} className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-foreground/80">
                                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                                    <span>{f.name}: {f.count}</span>
                                </span>
                            ))}
                        </div>
                    </GlassCard>
                </div>

                {/* Search Gaps + Devices + Top Dimensions */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <GlassCard className="p-5 space-y-3 shadow-none">
                        <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                            <Search className="w-4 h-4 text-blue-500" />
                            <span>Top Asset Searches</span>
                        </h2>
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                            {topSearches.length === 0 ? (
                                <p className="text-xs text-foreground/50 py-6 text-center">No search logs yet.</p>
                            ) : topSearches.map((s, idx) => (
                                <div key={idx} className="flex items-center justify-between text-xs p-2 rounded-lg bg-foreground/[0.03]">
                                    <span className="font-medium truncate">{s.query}</span>
                                    <span className="font-mono text-[11px] text-blue-500 shrink-0">{s.count}× ({s.avgResults} hits)</span>
                                </div>
                            ))}
                        </div>
                    </GlassCard>

                    <GlassCard className="p-5 space-y-3 shadow-none">
                        <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 text-amber-500" />
                            <span>Zero-Result Asset Gaps</span>
                        </h2>
                        <p className="text-[11px] text-foreground/55">Searches inside the editor that returned 0 PNG matches — upload these PNGs next.</p>
                        <div className="space-y-2 max-h-56 overflow-y-auto">
                            {zeroResultSearches.length === 0 ? (
                                <p className="text-xs text-foreground/50 py-6 text-center">No zero-result gaps detected.</p>
                            ) : zeroResultSearches.map((s, idx) => (
                                <div key={idx} className="flex items-center justify-between text-xs p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
                                    <span className="font-semibold text-amber-400 truncate">{s.query}</span>
                                    <span className="text-[11px] font-bold text-amber-500">{s.count} searches</span>
                                </div>
                            ))}
                        </div>
                    </GlassCard>

                    <GlassCard className="p-5 space-y-3 shadow-none">
                        <h2 className="text-sm font-bold text-foreground">Top Exported Dimensions &amp; Devices</h2>
                        <div className="space-y-2">
                            {topSizes.map((sz) => (
                                <div key={sz.size} className="flex items-center justify-between text-xs p-2 rounded-lg bg-foreground/[0.03]">
                                    <span className="font-mono font-semibold">{sz.size} px</span>
                                    <span className="font-bold text-emerald-500">{sz.count} exports</span>
                                </div>
                            ))}
                            {devices.length > 0 && (
                                <div className="pt-2 border-t border-card-border">
                                    <div className="text-[11px] font-bold uppercase tracking-wider text-foreground/50 mb-2">Device Breakdown</div>
                                    <div className="h-28">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={devices}>
                                                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                                                <YAxis hide />
                                                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '10px', color: '#f8fafc', fontSize: '12px' }} />
                                                <Bar dataKey="count" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            )}
                        </div>
                    </GlassCard>
                </div>

                {/* Top Assets & Top Templates */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <GlassCard className="p-5 space-y-3 shadow-none">
                        <h2 className="text-sm font-bold text-foreground">Most Used Site PNGs in Designs</h2>
                        <div className="space-y-2">
                            {topAssets.length === 0 ? (
                                <p className="text-xs text-foreground/50 py-6 text-center">No PNG inserts logged yet.</p>
                            ) : topAssets.map((a) => (
                                <div key={a.id} className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-foreground/[0.025]">
                                    <div className="flex items-center gap-3 min-w-0">
                                        {a.thumbUrl && <img src={a.thumbUrl} alt="" className="w-8 h-8 object-contain rounded bg-slate-900 p-0.5" />}
                                        <span className="text-xs font-semibold truncate">{a.name}</span>
                                    </div>
                                    <span className="text-xs font-bold text-violet-500 shrink-0">{a.inserts} inserts</span>
                                </div>
                            ))}
                        </div>
                    </GlassCard>

                    <GlassCard className="p-5 space-y-3 shadow-none">
                        <h2 className="text-sm font-bold text-foreground">Top Applied Templates</h2>
                        <div className="space-y-2">
                            {topTemplates.map((t) => (
                                <div key={t.id} className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-foreground/[0.025]">
                                    <div className="min-w-0">
                                        <div className="text-xs font-semibold truncate">{t.title}</div>
                                        <div className="text-[11px] text-foreground/50">{t.categoryName} · {t.width}×{t.height}</div>
                                    </div>
                                    <span className="text-xs font-bold text-blue-500 shrink-0">{t.usageCount} uses</span>
                                </div>
                            ))}
                        </div>
                    </GlassCard>
                </div>
            </div>
        </AdminLayout>
    );
}
