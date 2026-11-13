import { useEffect, useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import { toast } from 'sonner';
import {
    Globe,
    Mail,
    Building2,
    Save,
    CheckCircle2,
    ExternalLink,
    Trash2,
    Activity,
    RefreshCw,
    AlertTriangle,
    XCircle,
    Zap,
    Settings,
} from 'lucide-react';
import AdminLayout from '../../../Layouts/AdminLayout';
import { StatCard } from '../../../components/ui/StatCard';

export default function SettingsPage() {
    const [formData, setFormData] = useState({
        websiteName: '',
        websiteUrl: '',
        tagline: '',
        contactEmail: '',
        dmcaEmail: '',
        companyName: '',
        country: '',
        address: '',
        foundedYear: '',
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [retentionDays, setRetentionDays] = useState(30);
    const [trashedCount, setTrashedCount] = useState(0);
    const [health, setHealth] = useState(null);
    const [healthLoading, setHealthLoading] = useState(false);
    const [backfilling, setBackfilling] = useState(false);

    const loadHealth = () => {
        setHealthLoading(true);
        fetch('/api/admin/system-health')
            .then((res) => res.json())
            .then((data) => {
                if (data?.checks) setHealth(data);
            })
            .catch(() => { })
            .finally(() => setHealthLoading(false));
    };

    useEffect(() => {
        Promise.all([
            fetch('/api/admin/website-info').then((res) => res.json()).catch(() => ({})),
            fetch('/api/admin/trash-settings').then((res) => res.json()).catch(() => ({ retentionDays: 30, trashedCount: 0 })),
        ])
            .then(([data, trashData]) => {
                setFormData({
                    websiteName: data.websiteName || '',
                    websiteUrl: data.websiteUrl || '',
                    tagline: data.tagline || '',
                    contactEmail: data.contactEmail || '',
                    dmcaEmail: data.dmcaEmail || '',
                    companyName: data.companyName || '',
                    country: data.country || '',
                    address: data.address || '',
                    foundedYear: data.foundedYear || '',
                });
                if (typeof trashData.retentionDays === 'number') {
                    setRetentionDays(trashData.retentionDays);
                }
                if (typeof trashData.trashedCount === 'number') {
                    setTrashedCount(trashData.trashedCount);
                }
                setLoading(false);
            })
            .catch((err) => {
                console.error('Error loading website info:', err);
                toast.error('Failed to load settings');
                setLoading(false);
            });

        loadHealth();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);

        try {
            const [res, trashRes] = await Promise.all([
                fetch('/api/admin/website-info', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(formData),
                }),
                fetch('/api/admin/trash-settings', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ retentionDays }),
                }),
            ]);

            if (res.ok && trashRes.ok) {
                const trashJson = await trashRes.json().catch(() => ({}));
                toast.success(
                    trashJson?.purgedNow > 0
                        ? `Settings saved (${trashJson.purgedNow} expired trashed image(s) cleaned up)`
                        : 'General settings & trash retention policy saved'
                );
                loadHealth();
            } else {
                toast.error('Failed to save settings');
            }
        } catch (error) {
            console.error('Error saving website info:', error);
            toast.error('An error occurred while saving');
        } finally {
            setSaving(false);
        }
    };

    const hasLegalEmails = Boolean(formData.contactEmail && formData.dmcaEmail);

    return (
        <AdminLayout>
            <Head title="General Settings - Png101 Admin" />
            {loading ? (
                <div className="py-16 text-center space-y-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-glow mx-auto"></div>
                    <p className="text-foreground/60 text-sm">Loading general website configuration...</p>
                </div>
            ) : (
                <div className="space-y-6 pb-24">
                    {/* Page Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-1 flex items-center gap-3">
                                <Settings className="w-7 h-7 text-primary-glow shrink-0" />
                                <span>General Settings</span>
                            </h1>
                            <p className="text-foreground/60 text-sm">
                                Configure global brand metadata, public contact gateways, and organization legal attributes.
                            </p>
                        </div>

                        {formData.websiteUrl && (
                            <a
                                href={formData.websiteUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-card-bg hover:bg-white/5 border border-card-border hover:border-primary-glow/50 text-xs font-bold text-foreground/80 hover:text-foreground transition-all shadow-lg self-start sm:self-auto"
                            >
                                <ExternalLink className="w-4 h-4 text-primary-glow" />
                                Visit Live Website
                            </a>
                        )}
                    </div>

                    {/* Primary Stat Cards Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        <StatCard
                            title="Brand Identity"
                            value={formData.websiteName || 'Png101'}
                            subtitle={formData.tagline ? 'Tagline & description active' : 'Default brand title in use'}
                            icon={<Globe className="w-6 h-6" />}
                        />
                        <StatCard
                            title="Canonical URL"
                            value={formData.websiteUrl ? 'Configured' : 'Missing'}
                            subtitle={formData.websiteUrl || 'Please specify base URL'}
                            icon={<CheckCircle2 className="w-6 h-6" />}
                        />
                        <StatCard
                            title="Legal & Contact Gateways"
                            value={hasLegalEmails ? 'Operational' : 'Incomplete'}
                            subtitle={
                                formData.contactEmail
                                    ? `${formData.contactEmail} · DMCA ready`
                                    : 'Contact & DMCA emails required'
                            }
                            icon={<Mail className="w-6 h-6" />}
                        />
                        <StatCard
                            title="Company Entity"
                            value={formData.companyName || 'Not Specified'}
                            subtitle={
                                formData.country
                                    ? `${formData.country}${formData.foundedYear ? ` · Est. ${formData.foundedYear}` : ''}`
                                    : 'Legal jurisdiction pending'
                            }
                            icon={<Building2 className="w-6 h-6" />}
                        />
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Brand & Identity Card */}
                        <div className="bg-card-bg border border-card-border rounded-xl overflow-hidden shadow-xl">
                            <div className="p-6 border-b border-card-border flex items-start gap-3">
                                <div className="p-2.5 rounded-lg bg-primary-glow/10 text-primary-glow border border-primary-glow/20 mt-0.5">
                                    <Globe className="w-5 h-5" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-foreground">Brand &amp; Website Identity</h2>
                                    <p className="text-xs text-foreground/60 mt-0.5">
                                        Core branding details displayed in the browser tab, header, hero, footer, and informational pages.
                                    </p>
                                </div>
                            </div>

                            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-xs font-bold text-foreground/70 uppercase tracking-wider mb-2">
                                        Website Name / Title *
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.websiteName}
                                        onChange={(e) => setFormData({ ...formData, websiteName: e.target.value })}
                                        required
                                        placeholder="e.g. Png101"
                                        className="w-full px-4 py-2.5 bg-background border border-card-border rounded-xl text-foreground text-sm focus:outline-none focus:border-primary-glow focus:ring-1 focus:ring-primary-glow/30 transition-all"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-foreground/70 uppercase tracking-wider mb-2">
                                        Website Canonical URL *
                                    </label>
                                    <input
                                        type="url"
                                        value={formData.websiteUrl}
                                        onChange={(e) => setFormData({ ...formData, websiteUrl: e.target.value })}
                                        required
                                        placeholder="e.g. https://png101.com"
                                        className="w-full px-4 py-2.5 bg-background border border-card-border rounded-xl text-foreground font-mono text-sm focus:outline-none focus:border-primary-glow focus:ring-1 focus:ring-primary-glow/30 transition-all"
                                    />
                                </div>

                                <div className="md:col-span-2">
                                    <label className="block text-xs font-bold text-foreground/70 uppercase tracking-wider mb-2">
                                        Website Tagline &amp; Short Overview
                                    </label>
                                    <textarea
                                        rows={3}
                                        value={formData.tagline}
                                        onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
                                        placeholder="Discover and download free, high-resolution transparent PNG images for creative, educational, and commercial designs."
                                        className="w-full px-4 py-2.5 bg-background border border-card-border rounded-xl text-foreground text-sm focus:outline-none focus:border-primary-glow focus:ring-1 focus:ring-primary-glow/30 transition-all resize-none leading-relaxed"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Contact & Support Emails Card */}
                        <div className="bg-card-bg border border-card-border rounded-xl overflow-hidden shadow-xl">
                            <div className="p-6 border-b border-card-border flex items-start gap-3">
                                <div className="p-2.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 mt-0.5">
                                    <Mail className="w-5 h-5" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-foreground">Contact &amp; Support Channels</h2>
                                    <p className="text-xs text-foreground/60 mt-0.5">
                                        Public and legal email addresses displayed across the Contact Us, DMCA Takedown, Privacy Policy, and Terms of Service documents.
                                    </p>
                                </div>
                            </div>

                            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-xs font-bold text-foreground/70 uppercase tracking-wider mb-2">
                                        General Support Email *
                                    </label>
                                    <input
                                        type="email"
                                        value={formData.contactEmail}
                                        onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                                        required
                                        placeholder="contact@png101.com"
                                        className="w-full px-4 py-2.5 bg-background border border-card-border rounded-xl text-foreground text-sm focus:outline-none focus:border-primary-glow focus:ring-1 focus:ring-primary-glow/30 transition-all"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-foreground/70 uppercase tracking-wider mb-2">
                                        DMCA / Copyright Officer Email *
                                    </label>
                                    <input
                                        type="email"
                                        value={formData.dmcaEmail}
                                        onChange={(e) => setFormData({ ...formData, dmcaEmail: e.target.value })}
                                        required
                                        placeholder="dmca@png101.com"
                                        className="w-full px-4 py-2.5 bg-background border border-card-border rounded-xl text-foreground text-sm focus:outline-none focus:border-primary-glow focus:ring-1 focus:ring-primary-glow/30 transition-all"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Organization & Legal Details Card */}
                        <div className="bg-card-bg border border-card-border rounded-xl overflow-hidden shadow-xl">
                            <div className="p-6 border-b border-card-border flex items-start gap-3">
                                <div className="p-2.5 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20 mt-0.5">
                                    <Building2 className="w-5 h-5" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-foreground">Organization &amp; Legal Entity</h2>
                                    <p className="text-xs text-foreground/60 mt-0.5">
                                        Legal entity information populated into dynamic policy disclaimers and footer rights.
                                    </p>
                                </div>
                            </div>

                            <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div>
                                    <label className="block text-xs font-bold text-foreground/70 uppercase tracking-wider mb-2">
                                        Company / Legal Name
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.companyName}
                                        onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                                        placeholder="e.g. Png101 LLC"
                                        className="w-full px-4 py-2.5 bg-background border border-card-border rounded-xl text-foreground text-sm focus:outline-none focus:border-primary-glow focus:ring-1 focus:ring-primary-glow/30 transition-all"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-foreground/70 uppercase tracking-wider mb-2">
                                        Country / Jurisdiction
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.country}
                                        onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                                        placeholder="e.g. United States"
                                        className="w-full px-4 py-2.5 bg-background border border-card-border rounded-xl text-foreground text-sm focus:outline-none focus:border-primary-glow focus:ring-1 focus:ring-primary-glow/30 transition-all"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-foreground/70 uppercase tracking-wider mb-2">
                                        Founded Year
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.foundedYear}
                                        onChange={(e) => setFormData({ ...formData, foundedYear: e.target.value })}
                                        placeholder="e.g. 2026"
                                        className="w-full px-4 py-2.5 bg-background border border-card-border rounded-xl text-foreground text-sm focus:outline-none focus:border-primary-glow focus:ring-1 focus:ring-primary-glow/30 transition-all"
                                    />
                                </div>

                                <div className="md:col-span-3">
                                    <label className="block text-xs font-bold text-foreground/70 uppercase tracking-wider mb-2">
                                        Physical / Mailing Notice Address (Optional)
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.address}
                                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                        placeholder="Optional mailing address for formal written notifications"
                                        className="w-full px-4 py-2.5 bg-background border border-card-border rounded-xl text-foreground text-sm focus:outline-none focus:border-primary-glow focus:ring-1 focus:ring-primary-glow/30 transition-all"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Trash Bin Retention Policy Card */}
                        <div className="bg-card-bg border border-card-border rounded-xl overflow-hidden shadow-xl">
                            <div className="p-6 border-b border-card-border flex items-start justify-between gap-4 flex-wrap">
                                <div className="flex items-start gap-3">
                                    <div className="p-2.5 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20 mt-0.5">
                                        <Trash2 className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-bold text-foreground">Trash Bin &amp; Auto-Purge Retention</h2>
                                        <p className="text-xs text-foreground/60 mt-0.5">
                                            Deleted PNG files move safely into the Trash Bin before being permanently removed from disk. Choose how long trashed files are kept.
                                        </p>
                                    </div>
                                </div>
                                <Link
                                    href="/admin/dashboard/files"
                                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary-glow hover:underline"
                                >
                                    <span>Open Files &amp; Trash ({trashedCount})</span>
                                    <ExternalLink className="w-3.5 h-3.5" />
                                </Link>
                            </div>

                            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                                <div>
                                    <label className="block text-xs font-bold text-foreground/70 uppercase tracking-wider mb-2">
                                        Auto-Delete Trashed Images After
                                    </label>
                                    <select
                                        value={retentionDays}
                                        onChange={(e) => setRetentionDays(Number(e.target.value))}
                                        className="w-full px-4 py-2.5 bg-background border border-card-border rounded-xl text-foreground text-sm focus:outline-none focus:border-primary-glow cursor-pointer"
                                    >
                                        <option value={7} className="bg-card-bg text-foreground">7 Days</option>
                                        <option value={14} className="bg-card-bg text-foreground">14 Days</option>
                                        <option value={30} className="bg-card-bg text-foreground">30 Days (Recommended)</option>
                                        <option value={60} className="bg-card-bg text-foreground">60 Days</option>
                                        <option value={90} className="bg-card-bg text-foreground">90 Days</option>
                                        <option value={180} className="bg-card-bg text-foreground">180 Days (6 Months)</option>
                                        <option value={365} className="bg-card-bg text-foreground">365 Days (1 Year)</option>
                                        <option value={0} className="bg-card-bg text-foreground">Keep Forever (Manual Empty Only)</option>
                                    </select>
                                </div>
                                <p className="text-xs text-foreground/60 leading-relaxed">
                                    {retentionDays === 0
                                        ? 'Trashed images remain recoverable indefinitely until an admin clicks "Delete Permanently" or "Empty Trash".'
                                        : `Images left in the Trash Bin for more than ${retentionDays} days are automatically purged along with their PNG/thumbnail files.`}
                                </p>
                            </div>
                        </div>

                        {/* Save Changes Bar */}
                        <div className="flex items-center justify-between p-4 rounded-xl bg-card-bg border border-card-border shadow-lg">
                            <p className="text-xs text-foreground/50">
                                Changes update automatically across header, footer, SEO metadata, and legal policies.
                            </p>
                            <button
                                type="submit"
                                disabled={saving}
                                className="inline-flex items-center gap-2 px-6 py-2.5 bg-primary-glow hover:bg-blue-600 text-white font-semibold text-sm rounded-xl shadow-lg shadow-primary-glow/20 transition-all hover:-translate-y-0.5 cursor-pointer disabled:opacity-50"
                            >
                                <Save className="w-4 h-4" />
                                <span>{saving ? 'Saving Changes...' : 'Save Changes'}</span>
                            </button>
                        </div>
                    </form>

                    {/* System Health Check Diagnostics Panel */}
                    <div className="bg-card-bg border border-card-border rounded-xl overflow-hidden shadow-xl">
                        <div className="p-6 border-b border-card-border flex items-start justify-between gap-4 flex-wrap">
                            <div className="flex items-start gap-3">
                                <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mt-0.5">
                                    <Activity className="w-5 h-5" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2.5 flex-wrap">
                                        <h2 className="text-lg font-bold text-foreground">System Health Check</h2>
                                        {health && (
                                            <span
                                                className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider border ${health.overall === 'ok'
                                                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                                        : health.overall === 'warn'
                                                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                                                            : 'bg-red-500/10 text-red-400 border-red-500/30'
                                                    }`}
                                            >
                                                {health.overall === 'ok' ? 'All Systems Healthy' : health.overall === 'warn' ? 'Warnings Detected' : 'Action Needed'}
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs text-foreground/60 mt-0.5">
                                        Live server diagnostics covering storage writability, database latency, PHP extensions, thumbnails, sitemaps, and security posture.
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    disabled={backfilling}
                                    onClick={async () => {
                                        setBackfilling(true);
                                        try {
                                            const r = await fetch('/api/images/backfill-thumbs', { method: 'POST' });
                                            const j = await r.json();
                                            if (r.ok && j.success) {
                                                toast.success(`Processed ${j.processed} images: ${j.generated} lightweight thumbnails created.`);
                                                loadHealth();
                                            } else {
                                                toast.error('Failed to backfill thumbnails');
                                            }
                                        } catch {
                                            toast.error('Network error while generating thumbnails');
                                        } finally {
                                            setBackfilling(false);
                                        }
                                    }}
                                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-background border border-card-border hover:border-primary-glow/50 text-foreground/80 hover:text-foreground transition-colors cursor-pointer disabled:opacity-50"
                                >
                                    <Zap className="w-3.5 h-3.5 text-amber-400" />
                                    <span>{backfilling ? 'Generating...' : 'Optimize Legacy Thumbs'}</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={loadHealth}
                                    disabled={healthLoading}
                                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-background border border-card-border hover:border-primary-glow/50 text-foreground/80 hover:text-foreground transition-colors cursor-pointer disabled:opacity-50"
                                >
                                    <RefreshCw className={`w-3.5 h-3.5 ${healthLoading ? 'animate-spin' : ''}`} />
                                    <span>Run Check</span>
                                </button>
                            </div>
                        </div>

                        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-3.5">
                            {health?.checks?.map((item) => (
                                <div
                                    key={item.id}
                                    className="flex items-start gap-3 p-3.5 rounded-xl bg-background/60 border border-card-border"
                                >
                                    {item.status === 'ok' ? (
                                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                                    ) : item.status === 'warn' ? (
                                        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                                    ) : (
                                        <XCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                                    )}
                                    <div className="min-w-0">
                                        <p className="text-xs font-bold text-foreground">{item.label}</p>
                                        <p className="text-[11px] text-foreground/60 mt-0.5 break-words">{item.detail}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}
