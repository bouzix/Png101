import React, { useEffect, useMemo, useState } from 'react';
import { Head } from '@inertiajs/react';
import {
    Wrench,
    Power,
    Save,
    ExternalLink,
    Globe,
    Map,
    Image as ImageIcon,
    ArrowLeftRight,
    ArrowRight,
    BarChart3,
    Search,
    CheckCircle2,
    XCircle,
    Sparkles,
    Eye,
    Zap,
} from 'lucide-react';
import { toast } from 'sonner';
import AdminLayout from '@/Layouts/AdminLayout';
import { StatCard } from '@/components/ui/StatCard';
import BgRemoverSettingsCard, { DEFAULT_BG_REMOVER_CONFIG } from '@/components/admin/BgRemoverSettingsCard';

function formatBytes(bytes) {
    if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
    const val = bytes / Math.pow(1024, i);
    return `${val >= 100 || i === 0 ? Math.round(val) : val.toFixed(1)} ${units[i]}`;
}

function ToggleSwitch({ checked, onChange, disabled = false, label }) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            aria-label={label}
            disabled={disabled}
            onClick={() => onChange(!checked)}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none disabled:opacity-45 disabled:cursor-not-allowed ${
                checked ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'
            }`}
        >
            <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ${
                    checked ? 'translate-x-5' : 'translate-x-0'
                }`}
            />
        </button>
    );
}

export default function AdminToolsPage() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [settings, setSettings] = useState({
        globalEnabled: true,
        includeInSitemap: true,
        showInPublicNav: false,
        enableCatalogHandoff: false,
        pairStates: {},
        bgRemover: DEFAULT_BG_REMOVER_CONFIG,
    });
    const [bgRemoverDiagnostics, setBgRemoverDiagnostics] = useState(null);
    const [groups, setGroups] = useState([]);
    const [analytics, setAnalytics] = useState({
        days: 30,
        totalViews: 0,
        totalConversions: 0,
        totalFilesConverted: 0,
        totalBytesSaved: 0,
        leaderboard: [],
    });

    const [filterCategory, setFilterCategory] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');

    const applyPayload = (data) => {
        if (data?.settings) setSettings(data.settings);
        if (data?.bgRemoverDiagnostics) setBgRemoverDiagnostics(data.bgRemoverDiagnostics);
        if (Array.isArray(data?.groups)) setGroups(data.groups);
        if (data?.analytics) setAnalytics(data.analytics);
    };

    useEffect(() => {
        fetch('/api/admin/tools')
            .then((res) => res.json())
            .then((data) => {
                if (data?.error) {
                    toast.error(data.error);
                    return;
                }
                applyPayload(data);
            })
            .catch(() => toast.error('Failed to load tools configuration'))
            .finally(() => setLoading(false));
    }, []);

    const persistSettings = async (nextSettings, successMessage = 'Tools configuration saved!') => {
        setSaving(true);
        try {
            const res = await fetch('/api/admin/tools', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(nextSettings),
            });
            const data = await res.json();
            if (!res.ok || data?.error) {
                toast.error(data?.error || 'Failed to save tools settings');
                return;
            }
            applyPayload(data);
            toast.success(successMessage);
        } catch {
            toast.error('Network error while saving tools settings');
        } finally {
            setSaving(false);
        }
    };

    const handleToggleGroup = (key, enabled) => {
        setSettings((prev) => ({
            ...prev,
            pairStates: {
                ...(prev.pairStates || {}),
                [key]: enabled,
            },
        }));
    };

    const handleSetAllGroups = (enabled) => {
        const nextPairStates = {};
        groups.forEach((g) => {
            nextPairStates[g.key] = enabled;
        });
        setSettings((prev) => ({
            ...prev,
            pairStates: {
                ...(prev.pairStates || {}),
                ...nextPairStates,
            },
        }));
    };

    const filteredGroups = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        return groups.filter((group) => {
            if (filterCategory !== 'all' && group.category !== filterCategory) return false;
            if (!q) return true;
            return (
                group.label.toLowerCase().includes(q) ||
                group.description.toLowerCase().includes(q) ||
                group.pages.some((p) => p.slug.includes(q) || p.title.toLowerCase().includes(q))
            );
        });
    }, [groups, filterCategory, searchQuery]);

    const activeGroupCount = useMemo(
        () => groups.filter((g) => Boolean(settings.pairStates?.[g.key])).length,
        [groups, settings.pairStates]
    );

    const activePageCount = useMemo(
        () =>
            settings.globalEnabled
                ? groups.reduce(
                      (sum, g) => sum + (settings.pairStates?.[g.key] ? g.pages.length : 0),
                      0
                  )
                : 0,
        [groups, settings.globalEnabled, settings.pairStates]
    );

    return (
        <AdminLayout>
            <Head title="Bonus Tools & Converters - Png101 Admin" />

            {loading ? (
                <div className="py-20 text-center space-y-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-glow mx-auto" />
                    <p className="text-sm text-foreground/60">Loading bonus tools controls...</p>
                </div>
            ) : (
                <div className="space-y-6 pb-24">
                    {/* Top Page Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-3 mb-1 flex-wrap">
                                <h1 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-3">
                                    <Wrench className="w-7 h-7 text-primary-glow shrink-0" />
                                    <span>Bonus Tools &amp; Converters</span>
                                </h1>
                                <span
                                    className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                                        settings.globalEnabled && activeGroupCount > 0
                                            ? 'bg-emerald-500/15 text-emerald-500 dark:text-emerald-400 border-emerald-500/30'
                                            : 'bg-rose-500/15 text-rose-500 dark:text-rose-400 border-rose-500/30'
                                    }`}
                                >
                                    {settings.globalEnabled && activeGroupCount > 0 ? 'Active' : 'Deactivated'}
                                </span>
                            </div>
                            <p className="text-foreground/60 text-sm">
                                Super Admin exclusive · Manage standalone <code className="text-xs font-mono">/tools</code> &amp; <code className="text-xs font-mono">/tools/convert</code> SEO tools and site integration.
                            </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-1 p-1 bg-card-header-bg border border-card-border rounded-xl self-start sm:self-auto">
                            {settings.globalEnabled && activeGroupCount > 0 && (
                                <a
                                    href="/tools"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="h-8 px-3 rounded-lg bg-card-bg hover:text-primary-glow text-xs font-bold text-foreground/85 shadow-sm inline-flex items-center gap-1.5 transition-all"
                                >
                                    <span>View /tools</span>
                                    <ExternalLink className="w-3.5 h-3.5 text-primary-glow" />
                                </a>
                            )}
                            <button
                                type="button"
                                onClick={() => persistSettings(settings)}
                                disabled={saving}
                                className="h-8 px-3.5 rounded-lg bg-primary-glow hover:bg-blue-500 text-white text-xs font-bold shadow-sm inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-all"
                            >
                                <Save className="w-3.5 h-3.5" />
                                <span>{saving ? 'Saving...' : 'Save Changes'}</span>
                            </button>
                        </div>
                    </div>

                    {/* KPI Stat Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                        <StatCard
                            title="Master Switch"
                            value={settings.globalEnabled ? 'Online' : 'Offline'}
                            subtitle={settings.globalEnabled ? 'Public /tools routes reachable' : 'All /tools URLs return 404'}
                            icon={<Power className="w-6 h-6" />}
                        />
                        <StatCard
                            title="Active Tool Groups"
                            value={`${activeGroupCount} / ${groups.length}`}
                            subtitle={`${activePageCount} live SEO tool page(s)`}
                            icon={<ArrowLeftRight className="w-6 h-6" />}
                        />
                        <StatCard
                            title="30-Day Conversions"
                            value={analytics.totalConversions}
                            subtitle={`${analytics.totalFilesConverted} file(s) · ${analytics.totalViews} view(s)`}
                            icon={<Zap className="w-6 h-6" />}
                        />
                        <StatCard
                            title="Data Saved (30d)"
                            value={formatBytes(analytics.totalBytesSaved)}
                            subtitle={
                                settings.showInPublicNav || settings.enableCatalogHandoff
                                    ? 'Linked to public UI'
                                    : 'Standalone mode'
                            }
                            icon={<Sparkles className="w-6 h-6" />}
                        />
                    </div>

                    {/* Master Kill Switch & Standalone Controls */}
                    <div className="bg-card-bg border border-card-border rounded-2xl overflow-hidden">
                        <div className="p-6 border-b border-card-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                                <h2 className="text-lg font-bold text-foreground">
                                    Global Master Switch &amp; Site Integration
                                </h2>
                                <p className="text-xs text-foreground/60">
                                    Keep bonus tools completely standalone or selectively surface them across your sitemap and public pages.
                                </p>
                            </div>
                            <div className="flex flex-wrap items-center gap-1 p-1 bg-card-header-bg border border-card-border rounded-xl self-start sm:self-auto">
                                <button
                                    type="button"
                                    onClick={() => handleSetAllGroups(true)}
                                    className="h-7 px-2.5 rounded-lg bg-card-bg hover:bg-emerald-500/20 text-emerald-500 dark:text-emerald-400 text-xs font-bold shadow-sm cursor-pointer transition-colors"
                                >
                                    Enable All Pairs
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleSetAllGroups(false)}
                                    className="h-7 px-2.5 rounded-lg bg-card-bg hover:bg-rose-500/20 text-rose-500 dark:text-rose-400 text-xs font-bold shadow-sm cursor-pointer transition-colors"
                                >
                                    Disable All Pairs
                                </button>
                            </div>
                        </div>

                        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Master Kill Switch */}
                            <div className="flex items-start justify-between gap-4 p-4 rounded-xl bg-background border border-card-border">
                                <div className="space-y-1">
                                    <div className="text-sm font-bold text-foreground flex items-center gap-2">
                                        <Power className="w-4 h-4 text-blue-500" />
                                        <span>Activate Bonus Tools Globally</span>
                                    </div>
                                    <p className="text-xs text-foreground/60">
                                        Turn OFF to deactivate <code>/tools</code> and all <code>/tools/*</code> routes instantly without losing your per-tool selections.
                                    </p>
                                </div>
                                <ToggleSwitch
                                    checked={Boolean(settings.globalEnabled)}
                                    onChange={(val) => setSettings((p) => ({ ...p, globalEnabled: val }))}
                                    label="Toggle all bonus tools"
                                />
                            </div>

                            {/* Sitemap Toggle */}
                            <div className="flex items-start justify-between gap-4 p-4 rounded-xl bg-background border border-card-border">
                                <div className="space-y-1">
                                    <div className="text-sm font-bold text-foreground flex items-center gap-2">
                                        <Map className="w-4 h-4 text-emerald-500" />
                                        <span>Include Active Tools in SEO Sitemap</span>
                                    </div>
                                    <p className="text-xs text-foreground/60">
                                        Automatically updates <code>sitemap-pages.xml</code> with enabled converter URLs whenever you save.
                                    </p>
                                </div>
                                <ToggleSwitch
                                    checked={Boolean(settings.includeInSitemap)}
                                    onChange={(val) => setSettings((p) => ({ ...p, includeInSitemap: val }))}
                                    label="Include in sitemap"
                                />
                            </div>

                            {/* Optional Public Nav Link */}
                            <div className="flex items-start justify-between gap-4 p-4 rounded-xl bg-background border border-card-border">
                                <div className="space-y-1">
                                    <div className="text-sm font-bold text-foreground flex items-center gap-2">
                                        <Globe className="w-4 h-4 text-purple-500" />
                                        <span>Show &ldquo;Tools&rdquo; Mega-Menu in Desktop Header</span>
                                    </div>
                                    <p className="text-xs text-foreground/60">
                                        Controls whether the desktop sticky navbar displays the hover &ldquo;Tools&rdquo; super-menu dropdown.
                                    </p>
                                </div>
                                <ToggleSwitch
                                    checked={Boolean(settings.showInPublicNav)}
                                    onChange={(val) => setSettings((p) => ({ ...p, showInPublicNav: val }))}
                                    label="Show in public navigation"
                                />
                            </div>

                            {/* Optional Catalog Handoff */}
                            <div className="flex items-start justify-between gap-4 p-4 rounded-xl bg-background border border-card-border">
                                <div className="space-y-1">
                                    <div className="text-sm font-bold text-foreground flex items-center gap-2">
                                        <ImageIcon className="w-4 h-4 text-amber-500" />
                                        <span>Show &ldquo;Open in Tools&rdquo; on PNG Asset Pages</span>
                                    </div>
                                    <p className="text-xs text-foreground/60">
                                        Leave OFF for standalone mode. Turn ON to add a shortcut on image pages that preloads the PNG into Resizer / ICO tools.
                                    </p>
                                </div>
                                <ToggleSwitch
                                    checked={Boolean(settings.enableCatalogHandoff)}
                                    onChange={(val) => setSettings((p) => ({ ...p, enableCatalogHandoff: val }))}
                                    label="Enable catalog handoff"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Background Remover AI & Cutout Engine Controls */}
                    <BgRemoverSettingsCard
                        value={settings.bgRemover || DEFAULT_BG_REMOVER_CONFIG}
                        onChange={(nextBg) => setSettings((p) => ({ ...p, bgRemover: nextBg }))}
                        diagnostics={bgRemoverDiagnostics}
                    />

                    {/* Bidirectional Pair & Individual Tool Toggles */}
                    <div className="bg-card-bg border border-card-border rounded-2xl overflow-hidden">
                        <div className="p-6 border-b border-card-border flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                                <h2 className="text-lg font-bold text-foreground">
                                    Tool &amp; Bidirectional Pair Controls
                                </h2>
                                <p className="text-xs text-foreground/60">
                                    Extension pairs (like PNG &harr; WebP) share one toggle that enables or disables both SEO pages together.
                                </p>
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                                <div className="w-full sm:w-56 p-1 bg-card-header-bg border border-card-border rounded-xl">
                                    <div className="relative h-7 rounded-lg bg-card-bg shadow-sm flex items-center px-2.5 gap-2 focus-within:ring-1 focus-within:ring-primary-glow/60 transition-all">
                                        <Search className="w-3.5 h-3.5 text-foreground/45 shrink-0 pointer-events-none" />
                                        <input
                                            type="text"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            placeholder="Search tools..."
                                            className="w-full h-full bg-transparent text-xs font-medium text-foreground placeholder:text-foreground/40 focus:outline-none"
                                        />
                                    </div>
                                </div>

                                <div className="flex items-center gap-1 p-1 bg-card-header-bg border border-card-border rounded-xl">
                                    {['all', 'converters', 'utilities', 'developer'].map((cat) => (
                                        <button
                                            key={cat}
                                            type="button"
                                            onClick={() => setFilterCategory(cat)}
                                            className={`h-7 px-2.5 rounded-lg text-xs font-bold capitalize cursor-pointer transition-all ${
                                                filterCategory === cat
                                                    ? 'bg-primary-glow text-white shadow-sm'
                                                    : 'bg-card-bg text-foreground/70 hover:text-primary-glow shadow-sm'
                                            }`}
                                        >
                                            {cat}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
                            {filteredGroups.map((group) => {
                                const groupEnabled = Boolean(settings.pairStates?.[group.key]);
                                const isLive = settings.globalEnabled && groupEnabled;

                                return (
                                    <div
                                        key={group.key}
                                        className={`p-4 rounded-xl border transition-all flex flex-col justify-between gap-4 ${
                                            isLive
                                                ? 'bg-background border-card-border'
                                                : 'bg-background/40 border-card-border/60 opacity-75'
                                        }`}
                                    >
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="space-y-1 min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="font-bold text-sm text-foreground">
                                                        {group.label}
                                                    </span>
                                                    {group.isPair && (
                                                        <span className="px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/25 text-blue-500 dark:text-blue-400 text-[10px] font-bold">
                                                            Paired (2 Pages)
                                                        </span>
                                                    )}
                                                    <span
                                                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                                            isLive
                                                                ? 'bg-emerald-500/10 text-emerald-500'
                                                                : 'bg-slate-500/15 text-foreground/50'
                                                        }`}
                                                    >
                                                        {isLive ? (
                                                            <CheckCircle2 className="w-3 h-3" />
                                                        ) : (
                                                            <XCircle className="w-3 h-3" />
                                                        )}
                                                        {isLive ? 'Live' : settings.globalEnabled ? 'Disabled' : 'Global Off'}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-foreground/60 leading-relaxed">
                                                    {group.description}
                                                </p>
                                            </div>

                                            <ToggleSwitch
                                                checked={groupEnabled}
                                                onChange={(val) => handleToggleGroup(group.key, val)}
                                                label={`Toggle ${group.label}`}
                                            />
                                        </div>

                                        {/* Linked SEO Pages controlled by this toggle */}
                                        <div className="space-y-1.5 pt-2 border-t border-card-border/60">
                                            {group.pages.map((page) => (
                                                <div
                                                    key={page.slug}
                                                    className="flex items-center justify-between gap-2 text-xs bg-card-bg/60 border border-card-border/60 rounded-lg px-3 py-1.5"
                                                >
                                                    <div className="flex items-center gap-2 min-w-0">
                                                        <span className="font-mono text-[11px] font-bold text-blue-500 shrink-0">
                                                            {page.fromFormat} &rarr; {page.toFormat}
                                                        </span>
                                                        <code className="text-[11px] text-foreground/65 truncate">
                                                            {page.url}
                                                        </code>
                                                    </div>

                                                    <div className="flex items-center gap-3 shrink-0 text-[11px] text-foreground/55">
                                                        <span className="inline-flex items-center gap-1" title="30-day page views">
                                                            <Eye className="w-3 h-3" />
                                                            {page.views}
                                                        </span>
                                                        <span className="inline-flex items-center gap-1 font-bold text-foreground/80" title="30-day conversions">
                                                            <Zap className="w-3 h-3 text-blue-500" />
                                                            {page.conversions}
                                                        </span>
                                                        {isLive && (
                                                            <a
                                                                href={page.url}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="text-blue-500 hover:text-blue-400"
                                                                title={`Open ${page.url}`}
                                                            >
                                                                <ExternalLink className="w-3.5 h-3.5" />
                                                            </a>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Tool Analytics Leaderboard */}
                    <div className="bg-card-bg border border-card-border rounded-2xl overflow-hidden">
                        <div className="p-6 border-b border-card-border flex items-center justify-between">
                            <div>
                                <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                                    <BarChart3 className="w-5 h-5 text-primary-glow" />
                                    <span>Tool Usage Intelligence (Last 30 Days)</span>
                                </h2>
                                <p className="text-xs text-foreground/60">
                                    Anonymous per-page view and conversion telemetry (no user images ever touch the server).
                                </p>
                            </div>
                        </div>

                        {Array.isArray(analytics.leaderboard) && analytics.leaderboard.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-background/70 text-foreground/55 uppercase tracking-wider border-b border-card-border">
                                        <tr>
                                            <th className="py-3 px-6">Tool Page</th>
                                            <th className="py-3 px-4 text-right">Views</th>
                                            <th className="py-3 px-4 text-right">Conversions</th>
                                            <th className="py-3 px-4 text-right">Files</th>
                                            <th className="py-3 px-6 text-right">Bytes Saved</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-card-border">
                                        {analytics.leaderboard.map((row) => (
                                            <tr key={row.slug} className="hover:bg-background/40">
                                                <td className="py-3 px-6">
                                                    <div className="font-bold text-foreground">{row.shortTitle || row.title}</div>
                                                    <div className="font-mono text-[11px] text-foreground/50">{row.url || `/tools/${row.slug}`}</div>
                                                </td>
                                                <td className="py-3 px-4 text-right font-mono">{row.views}</td>
                                                <td className="py-3 px-4 text-right font-mono font-bold text-blue-500">
                                                    {row.conversions}
                                                </td>
                                                <td className="py-3 px-4 text-right font-mono">{row.filesConverted}</td>
                                                <td className="py-3 px-6 text-right font-mono text-emerald-500 font-bold">
                                                    {formatBytes(row.bytesSaved)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="p-10 text-center text-xs text-foreground/55">
                                No tool usage recorded in the last 30 days yet. Stats will populate automatically as visitors convert images on <code>/tools/*</code>.
                            </div>
                        )}
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}
