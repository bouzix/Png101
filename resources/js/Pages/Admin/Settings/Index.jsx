import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Head, Link, router } from '@inertiajs/react';
import StudioSelect from '@/components/ui/StudioSelect';
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
    LayoutGrid,
    Palette,
    RotateCcw,
    Upload,
    Image as ImageIcon,
    Sparkles,
    X,
} from 'lucide-react';
import AdminLayout from '../../../Layouts/AdminLayout';
import { StatCard } from '../../../components/ui/StatCard';
import { BrandIcon, BrandLogo } from '../../../components/BrandMark';
import BgRemoverSettingsCard from '../../../components/admin/BgRemoverSettingsCard';
import StudioColorPicker from '../../../components/tools/StudioColorPicker';
import {
    DEFAULT_COLOR_PICKER_CONFIG,
    broadcastColorPickerDefaults,
    sanitizeColorPickerDefaults,
} from '../../../lib/colorPickerConfig';

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
        logoUrl: '',
        iconUrl: '',
        faviconUrl: '',
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploadingBrandSlot, setUploadingBrandSlot] = useState(null);
    const [brandStudioTarget, setBrandStudioTarget] = useState(null); // null | 'all' | 'logo' | 'icon' | 'favicon'

    useEffect(() => {
        if (!brandStudioTarget || typeof window === 'undefined') return undefined;
        const onMessage = (event) => {
            if (event.origin !== window.location.origin) return;
            const data = event.data;
            if (!data || typeof data !== 'object') return;
            if (data.type === 'PNG101_BRAND_SUITE_SAVED') {
                const updatedLabel =
                    brandStudioTarget === 'logo'
                        ? 'Website Logo updated!'
                        : brandStudioTarget === 'icon'
                        ? 'Website Icon updated!'
                        : brandStudioTarget === 'favicon'
                        ? 'Browser Favicon updated!'
                        : 'Website Logo (SVG), Icon (SVG) & Favicon (PNG) updated!';
                setFormData((prev) => ({
                    ...prev,
                    logoUrl: data.logoUrl ?? prev.logoUrl,
                    iconUrl: data.iconUrl ?? prev.iconUrl,
                    faviconUrl: data.faviconUrl ?? prev.faviconUrl,
                }));
                setBrandStudioTarget(null);
                toast.success(updatedLabel);
                router.reload({ only: ['websiteInfo'], preserveScroll: true });
            } else if (data.type === 'PNG101_BRAND_SUITE_CLOSE') {
                setBrandStudioTarget(null);
            }
        };
        window.addEventListener('message', onMessage);
        return () => window.removeEventListener('message', onMessage);
    }, [brandStudioTarget]);
    const [retentionDays, setRetentionDays] = useState(30);
    const [trashedCount, setTrashedCount] = useState(0);
    const [collectionsGridColumns, setCollectionsGridColumns] = useState({
        mobile: 1,
        smallTablet: 2,
        tablet: 3,
        desktop: 6,
    });
    const [colorPickerDefaults, setColorPickerDefaults] = useState(DEFAULT_COLOR_PICKER_CONFIG);
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
            fetch('/api/admin/settings').then((res) => res.json()).catch(() => ({})),
        ])
            .then(([data, trashData, allSettings]) => {
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
                    logoUrl: data.logoUrl || '',
                    iconUrl: data.iconUrl || '',
                    faviconUrl: data.faviconUrl || '',
                });
                if (typeof trashData.retentionDays === 'number') {
                    setRetentionDays(trashData.retentionDays);
                }
                if (typeof trashData.trashedCount === 'number') {
                    setTrashedCount(trashData.trashedCount);
                }
                if (allSettings?.collections_grid_columns) {
                    try {
                        const parsed = JSON.parse(allSettings.collections_grid_columns);
                        if (parsed && typeof parsed === 'object') {
                            setCollectionsGridColumns({
                                mobile: Number(parsed.mobile) || 1,
                                smallTablet: Number(parsed.smallTablet) || 2,
                                tablet: Number(parsed.tablet) || 3,
                                desktop: Number(parsed.desktop) || 6,
                            });
                        }
                    } catch {
                        // Ignore malformed JSON and keep defaults
                    }
                }
                if (allSettings?.color_picker_defaults) {
                    setColorPickerDefaults(sanitizeColorPickerDefaults(allSettings.color_picker_defaults));
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
            const [res, trashRes, gridRes] = await Promise.all([
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
                fetch('/api/admin/settings', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        collections_grid_columns: JSON.stringify(collectionsGridColumns),
                        color_picker_defaults: JSON.stringify(sanitizeColorPickerDefaults(colorPickerDefaults)),
                    }),
                }),
            ]);

            if (res.ok && trashRes.ok && gridRes.ok) {
                const trashJson = await trashRes.json().catch(() => ({}));
                toast.success(
                    trashJson?.purgedNow > 0
                        ? `Settings saved (${trashJson.purgedNow} expired trashed image(s) cleaned up)`
                        : 'General settings & trash retention policy saved'
                );
                loadHealth();
                broadcastColorPickerDefaults(sanitizeColorPickerDefaults(colorPickerDefaults));
                router.reload({ only: ['websiteInfo', 'colorPickerDefaults'], preserveScroll: true });
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

    const persistBrandFields = async (partial, successMessage) => {
        setFormData((prev) => ({ ...prev, ...partial }));
        try {
            const res = await fetch('/api/admin/website-info', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(partial),
            });
            if (res.ok) {
                if (successMessage) toast.success(successMessage);
                router.reload({ only: ['websiteInfo'], preserveScroll: true });
            } else {
                toast.error('Failed to update branding settings');
            }
        } catch {
            toast.error('Failed to update branding settings');
        }
    };

    const handleBrandAssetUpload = async (type, file) => {
        if (!file) return;
        setUploadingBrandSlot(type);
        try {
            const payload = new FormData();
            payload.append('file', file);
            payload.append('type', type);
            const res = await fetch('/api/admin/branding/upload', {
                method: 'POST',
                body: payload,
            });
            const json = await res.json().catch(() => ({}));
            if (!res.ok || !json?.success || !json?.path) {
                toast.error(json?.error || `Failed to upload ${type}`);
                return;
            }
            const fieldMap = { logo: 'logoUrl', icon: 'iconUrl', favicon: 'faviconUrl' };
            const fieldKey = fieldMap[type];
            if (fieldKey) {
                const label = type.charAt(0).toUpperCase() + type.slice(1);
                await persistBrandFields({ [fieldKey]: json.path }, `${label} updated across the site!`);
            }
        } catch {
            toast.error(`Failed to upload ${type}`);
        } finally {
            setUploadingBrandSlot(null);
        }
    };

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
                            <div className="inline-flex items-center p-1 bg-card-header-bg border border-card-border rounded-xl self-start sm:self-auto">
                                <a
                                    href={formData.websiteUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="h-8 inline-flex items-center gap-2 px-3.5 rounded-lg bg-card-bg hover:bg-foreground/5 text-xs font-bold text-foreground/85 hover:text-foreground transition-all shadow-sm"
                                >
                                    <ExternalLink className="w-3.5 h-3.5 text-primary-glow" />
                                    Visit Live Website
                                </a>
                            </div>
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
                        <div className="bg-card-bg border border-card-border rounded-xl overflow-hidden">
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

                                {/* Brand Logo, Icon & Favicon Settings */}
                                <div className="md:col-span-2 pt-4 border-t border-card-border space-y-4">
                                    <div className="flex items-start justify-between gap-3 flex-wrap">
                                        <div>
                                            <h3 className="text-sm font-bold text-foreground">
                                                Logo, Icon &amp; Favicon
                                            </h3>
                                            <p className="text-xs text-foreground/60 mt-0.5">
                                                Customize the site logo (sticky header, homepage above search bar &amp; footer), brand icon (navigation menu, admin sidebar &amp; image editor), and browser favicon. Leave blank to keep the built-in defaults.
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2 flex-wrap shrink-0">
                                            <button
                                                type="button"
                                                data-testid="reset-all-branding"
                                                disabled={!formData.logoUrl && !formData.iconUrl && !formData.faviconUrl}
                                                onClick={() =>
                                                    persistBrandFields(
                                                        { logoUrl: '', iconUrl: '', faviconUrl: '' },
                                                        'All branding assets reset to default.'
                                                    )
                                                }
                                                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-card-border bg-foreground/[0.03] hover:bg-foreground/[0.08] disabled:opacity-45 disabled:pointer-events-none text-xs font-semibold text-foreground/80 transition-colors cursor-pointer"
                                            >
                                                <RotateCcw className="w-3.5 h-3.5" />
                                                <span>Reset All</span>
                                            </button>
                                            <button
                                                type="button"
                                                data-testid="open-brand-suite-studio"
                                                onClick={() => setBrandStudioTarget('all')}
                                                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:brightness-110 text-white text-xs font-bold shadow-md shadow-blue-600/25 transition-all cursor-pointer"
                                            >
                                                <Sparkles className="w-3.5 h-3.5" />
                                                <span>Design All 3 in Studio</span>
                                            </button>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                                        {/* Website Logo */}
                                        <div className="rounded-xl border border-card-border bg-foreground/[0.02] p-4 flex flex-col justify-between gap-3">
                                            <div className="space-y-2.5">
                                                <div className="flex items-center justify-between gap-2">
                                                    <span className="text-xs font-bold text-foreground uppercase tracking-wider">
                                                        Website Logo
                                                    </span>
                                                    <button
                                                        type="button"
                                                        data-testid="reset-brand-logo"
                                                        disabled={!formData.logoUrl}
                                                        onClick={() => persistBrandFields({ logoUrl: '' }, 'Website Logo reset to default (synced with Icon + Title).')}
                                                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border border-card-border bg-background/70 text-[11px] font-semibold text-foreground/70 hover:text-foreground disabled:opacity-45 disabled:pointer-events-none cursor-pointer transition-colors"
                                                    >
                                                        <RotateCcw className="w-3 h-3" />
                                                        <span>Reset</span>
                                                    </button>
                                                </div>
                                                <div className="h-16 rounded-lg border border-card-border bg-background/80 px-3 flex items-center justify-center overflow-hidden">
                                                    <BrandLogo websiteInfo={formData} size="footer" />
                                                </div>
                                                <p className="text-[11px] text-foreground/55 leading-snug">
                                                    {formData.logoUrl
                                                        ? 'Custom logo active across sticky menu, hero & footer.'
                                                        : 'Using default logo (automatically displays your Website Icon + Website Name).'}
                                                </p>
                                                <div className="rounded-lg bg-foreground/[0.03] border border-card-border/70 px-2.5 py-2 text-[10.5px] leading-relaxed text-foreground/65 space-y-0.5">
                                                    <p>
                                                        <strong className="text-foreground/85">Max recommended size:</strong> 480&times;120 px (up to 960&times;240 px, 4:1 ratio, max 5 MB)
                                                    </p>
                                                    <p>
                                                        <strong className="text-foreground/85">Recommended formats:</strong> SVG (best), transparent PNG, or WebP
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                <label
                                                    data-testid="upload-brand-logo"
                                                    className={`inline-flex items-center justify-center gap-1.5 w-full px-2.5 py-2 rounded-lg border border-card-border bg-background hover:border-primary-glow/60 text-xs font-semibold text-foreground transition-colors cursor-pointer ${
                                                        uploadingBrandSlot === 'logo' ? 'opacity-60 pointer-events-none' : ''
                                                    }`}
                                                >
                                                    <Upload className="w-3.5 h-3.5 text-primary-glow shrink-0" />
                                                    <span className="truncate">{uploadingBrandSlot === 'logo' ? 'Uploading...' : 'Upload Logo'}</span>
                                                    <input
                                                        type="file"
                                                        accept=".png,.jpg,.jpeg,.webp,.svg,.gif"
                                                        className="hidden"
                                                        onChange={(e) => {
                                                            const file = e.target.files?.[0];
                                                            e.target.value = '';
                                                            handleBrandAssetUpload('logo', file);
                                                        }}
                                                    />
                                                </label>
                                                <button
                                                    type="button"
                                                    data-testid="studio-brand-logo"
                                                    onClick={() => setBrandStudioTarget('logo')}
                                                    className="inline-flex items-center justify-center gap-1.5 w-full px-2.5 py-2 rounded-lg border border-blue-500/35 bg-blue-500/10 hover:bg-blue-500/20 text-xs font-semibold text-blue-600 dark:text-blue-300 transition-colors cursor-pointer"
                                                >
                                                    <Sparkles className="w-3.5 h-3.5 shrink-0" />
                                                    <span className="truncate">Design in Studio</span>
                                                </button>
                                            </div>
                                        </div>

                                        {/* Website Icon */}
                                        <div className="rounded-xl border border-card-border bg-foreground/[0.02] p-4 flex flex-col justify-between gap-3">
                                            <div className="space-y-2.5">
                                                <div className="flex items-center justify-between gap-2">
                                                    <span className="text-xs font-bold text-foreground uppercase tracking-wider">
                                                        Website Icon
                                                    </span>
                                                    <button
                                                        type="button"
                                                        data-testid="reset-brand-icon"
                                                        disabled={!formData.iconUrl}
                                                        onClick={() => persistBrandFields({ iconUrl: '' }, 'Website Icon reset to default blue shield.')}
                                                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border border-card-border bg-background/70 text-[11px] font-semibold text-foreground/70 hover:text-foreground disabled:opacity-45 disabled:pointer-events-none cursor-pointer transition-colors"
                                                    >
                                                        <RotateCcw className="w-3 h-3" />
                                                        <span>Reset</span>
                                                    </button>
                                                </div>
                                                <div className="h-16 rounded-lg border border-card-border bg-background/80 px-3 flex items-center justify-center gap-2.5">
                                                    <BrandIcon
                                                        iconUrl={formData.iconUrl}
                                                        alt={`${formData.websiteName || 'Png101'} icon preview`}
                                                        sizeClass="w-10 h-10"
                                                    />
                                                    <span className="text-[11px] text-foreground/60">
                                                        {formData.iconUrl ? 'Custom Icon' : 'Default Blue Shield'}
                                                    </span>
                                                </div>
                                                <p className="text-[11px] text-foreground/55 leading-snug">
                                                    Used in navigation menu, admin sidebar, and image editor top bar.
                                                </p>
                                                <div className="rounded-lg bg-foreground/[0.03] border border-card-border/70 px-2.5 py-2 text-[10.5px] leading-relaxed text-foreground/65 space-y-0.5">
                                                    <p>
                                                        <strong className="text-foreground/85">Max recommended size:</strong> 256&times;256 px square (up to 512&times;512 px, max 5 MB)
                                                    </p>
                                                    <p>
                                                        <strong className="text-foreground/85">Recommended formats:</strong> SVG (best), transparent PNG, or WebP
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                <label
                                                    data-testid="upload-brand-icon"
                                                    className={`inline-flex items-center justify-center gap-1.5 w-full px-2.5 py-2 rounded-lg border border-card-border bg-background hover:border-primary-glow/60 text-xs font-semibold text-foreground transition-colors cursor-pointer ${
                                                        uploadingBrandSlot === 'icon' ? 'opacity-60 pointer-events-none' : ''
                                                    }`}
                                                >
                                                    <Upload className="w-3.5 h-3.5 text-primary-glow shrink-0" />
                                                    <span className="truncate">{uploadingBrandSlot === 'icon' ? 'Uploading...' : 'Upload Icon'}</span>
                                                    <input
                                                        type="file"
                                                        accept=".png,.jpg,.jpeg,.webp,.svg,.gif,.ico"
                                                        className="hidden"
                                                        onChange={(e) => {
                                                            const file = e.target.files?.[0];
                                                            e.target.value = '';
                                                            handleBrandAssetUpload('icon', file);
                                                        }}
                                                    />
                                                </label>
                                                <button
                                                    type="button"
                                                    data-testid="studio-brand-icon"
                                                    onClick={() => setBrandStudioTarget('icon')}
                                                    className="inline-flex items-center justify-center gap-1.5 w-full px-2.5 py-2 rounded-lg border border-blue-500/35 bg-blue-500/10 hover:bg-blue-500/20 text-xs font-semibold text-blue-600 dark:text-blue-300 transition-colors cursor-pointer"
                                                >
                                                    <Sparkles className="w-3.5 h-3.5 shrink-0" />
                                                    <span className="truncate">Design in Studio</span>
                                                </button>
                                            </div>
                                        </div>

                                        {/* Browser Favicon */}
                                        <div className="rounded-xl border border-card-border bg-foreground/[0.02] p-4 flex flex-col justify-between gap-3">
                                            <div className="space-y-2.5">
                                                <div className="flex items-center justify-between gap-2">
                                                    <span className="text-xs font-bold text-foreground uppercase tracking-wider">
                                                        Browser Favicon
                                                    </span>
                                                    <button
                                                        type="button"
                                                        data-testid="reset-brand-favicon"
                                                        disabled={!formData.faviconUrl}
                                                        onClick={() => persistBrandFields({ faviconUrl: '' }, 'Browser Favicon reset to default.')}
                                                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border border-card-border bg-background/70 text-[11px] font-semibold text-foreground/70 hover:text-foreground disabled:opacity-45 disabled:pointer-events-none cursor-pointer transition-colors"
                                                    >
                                                        <RotateCcw className="w-3 h-3" />
                                                        <span>Reset</span>
                                                    </button>
                                                </div>
                                                <div className="h-16 rounded-lg border border-card-border bg-background/80 px-3 flex items-center justify-center">
                                                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-foreground/[0.05] border border-card-border max-w-full">
                                                        <img
                                                            src={formData.faviconUrl || formData.iconUrl || '/favicon.svg'}
                                                            alt="Favicon preview"
                                                            className="w-4 h-4 object-contain shrink-0"
                                                        />
                                                        <span className="text-xs font-medium text-foreground/80 truncate max-w-[140px]">
                                                            {formData.websiteName || 'Png101'}
                                                        </span>
                                                    </div>
                                                </div>
                                                <p className="text-[11px] text-foreground/55 leading-snug">
                                                    {formData.faviconUrl
                                                        ? 'Custom browser favicon active.'
                                                        : formData.iconUrl
                                                        ? 'Using Website Icon as browser favicon (upload or design a custom favicon to override).'
                                                        : 'Shown in browser tabs, bookmarks & shortcuts.'}
                                                </p>
                                                <div className="rounded-lg bg-foreground/[0.03] border border-card-border/70 px-2.5 py-2 text-[10.5px] leading-relaxed text-foreground/65 space-y-0.5">
                                                    <p>
                                                        <strong className="text-foreground/85">Max recommended size:</strong> 96&times;96 px square (up to 256&times;256 px, max 5 MB)
                                                    </p>
                                                    <p>
                                                        <strong className="text-foreground/85">Recommended formats:</strong> ICO or PNG (best compatibility); SVG also supported
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                <label
                                                    data-testid="upload-brand-favicon"
                                                    className={`inline-flex items-center justify-center gap-1.5 w-full px-2.5 py-2 rounded-lg border border-card-border bg-background hover:border-primary-glow/60 text-xs font-semibold text-foreground transition-colors cursor-pointer ${
                                                        uploadingBrandSlot === 'favicon' ? 'opacity-60 pointer-events-none' : ''
                                                    }`}
                                                >
                                                    <Upload className="w-3.5 h-3.5 text-primary-glow shrink-0" />
                                                    <span className="truncate">{uploadingBrandSlot === 'favicon' ? 'Uploading...' : 'Upload Favicon'}</span>
                                                    <input
                                                        type="file"
                                                        accept=".ico,.png,.svg,.webp,.jpg,.jpeg,.gif"
                                                        className="hidden"
                                                        onChange={(e) => {
                                                            const file = e.target.files?.[0];
                                                            e.target.value = '';
                                                            handleBrandAssetUpload('favicon', file);
                                                        }}
                                                    />
                                                </label>
                                                <button
                                                    type="button"
                                                    data-testid="studio-brand-favicon"
                                                    onClick={() => setBrandStudioTarget('favicon')}
                                                    className="inline-flex items-center justify-center gap-1.5 w-full px-2.5 py-2 rounded-lg border border-blue-500/35 bg-blue-500/10 hover:bg-blue-500/20 text-xs font-semibold text-blue-600 dark:text-blue-300 transition-colors cursor-pointer"
                                                >
                                                    <Sparkles className="w-3.5 h-3.5 shrink-0" />
                                                    <span className="truncate">Design in Studio</span>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Contact & Support Emails Card */}
                        <div className="bg-card-bg border border-card-border rounded-xl overflow-hidden">
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
                        <div className="bg-card-bg border border-card-border rounded-xl overflow-hidden">
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
                        <div className="bg-card-bg border border-card-border rounded-xl overflow-hidden">
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
                                    <StudioSelect
                                        aria-label="Auto-Delete Trashed Images After"
                                        value={retentionDays}
                                        onChange={(e) => setRetentionDays(Number(e.target.value))}
                                        className="w-full"
                                    >
                                        <option value={7}>7 Days</option>
                                        <option value={14}>14 Days</option>
                                        <option value={30}>30 Days (Recommended)</option>
                                        <option value={60}>60 Days</option>
                                        <option value={90}>90 Days</option>
                                        <option value={180}>180 Days (6 Months)</option>
                                        <option value={365}>365 Days (1 Year)</option>
                                        <option value={0}>Keep Forever (Manual Empty Only)</option>
                                    </StudioSelect>
                                </div>
                                <p className="text-xs text-foreground/60 leading-relaxed">
                                    {retentionDays === 0
                                        ? 'Trashed images remain recoverable indefinitely until an admin clicks "Delete Permanently" or "Empty Trash".'
                                        : `Images left in the Trash Bin for more than ${retentionDays} days are automatically purged along with their PNG/thumbnail files.`}
                                </p>
                            </div>
                        </div>

                        {/* Collections Page Grid Layout Card */}
                        <div className="bg-card-bg border border-card-border rounded-xl overflow-hidden">
                            <div className="p-6 border-b border-card-border flex items-start justify-between gap-4 flex-wrap">
                                <div className="flex items-start gap-3">
                                    <div className="p-2.5 rounded-lg bg-primary-glow/10 text-primary-glow border border-primary-glow/20 mt-0.5">
                                        <LayoutGrid className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-bold text-foreground">Collections Page Grid Layout</h2>
                                        <p className="text-xs text-foreground/60 mt-0.5">
                                            Choose how many collection cards appear per row on the public <span className="font-mono text-foreground/80">/collections</span> page for each screen size.
                                        </p>
                                    </div>
                                </div>
                                <a
                                    href="/collections"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary-glow hover:underline"
                                >
                                    <span>View /collections</span>
                                    <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                            </div>

                            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-foreground/70 uppercase tracking-wider mb-2">
                                        Mobile (&lt; 640px)
                                    </label>
                                    <StudioSelect
                                        aria-label="Mobile collections per row"
                                        value={collectionsGridColumns.mobile}
                                        onChange={(e) =>
                                            setCollectionsGridColumns((prev) => ({
                                                ...prev,
                                                mobile: Number(e.target.value),
                                            }))
                                        }
                                        className="w-full"
                                    >
                                        {[1, 2, 3, 4].map((n) => (
                                            <option key={n} value={n}>
                                                {n} {n === 1 ? 'column' : 'columns'}
                                            </option>
                                        ))}
                                    </StudioSelect>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-foreground/70 uppercase tracking-wider mb-2">
                                        Small Tablet (640px+)
                                    </label>
                                    <StudioSelect
                                        aria-label="Small Tablet collections per row"
                                        value={collectionsGridColumns.smallTablet}
                                        onChange={(e) =>
                                            setCollectionsGridColumns((prev) => ({
                                                ...prev,
                                                smallTablet: Number(e.target.value),
                                            }))
                                        }
                                        className="w-full"
                                    >
                                        {[1, 2, 3, 4, 5, 6].map((n) => (
                                            <option key={n} value={n}>
                                                {n} {n === 1 ? 'column' : 'columns'}
                                            </option>
                                        ))}
                                    </StudioSelect>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-foreground/70 uppercase tracking-wider mb-2">
                                        Tablet (768px+)
                                    </label>
                                    <StudioSelect
                                        aria-label="Tablet collections per row"
                                        value={collectionsGridColumns.tablet}
                                        onChange={(e) =>
                                            setCollectionsGridColumns((prev) => ({
                                                ...prev,
                                                tablet: Number(e.target.value),
                                            }))
                                        }
                                        className="w-full"
                                    >
                                        {[1, 2, 3, 4, 5, 6].map((n) => (
                                            <option key={n} value={n}>
                                                {n} {n === 1 ? 'column' : 'columns'}
                                            </option>
                                        ))}
                                    </StudioSelect>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-foreground/70 uppercase tracking-wider mb-2">
                                        Desktop (1024px+)
                                    </label>
                                    <StudioSelect
                                        aria-label="Desktop collections per row"
                                        value={collectionsGridColumns.desktop}
                                        onChange={(e) =>
                                            setCollectionsGridColumns((prev) => ({
                                                ...prev,
                                                desktop: Number(e.target.value),
                                            }))
                                        }
                                        className="w-full"
                                    >
                                        {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                                            <option key={n} value={n}>
                                                {n} {n === 1 ? 'column' : 'columns'}
                                            </option>
                                        ))}
                                    </StudioSelect>
                                </div>
                            </div>
                        </div>

                        {/* Global Color Picker Defaults */}
                        <div className="bg-card-bg border border-card-border rounded-xl p-6 space-y-5">
                            <div className="flex items-start justify-between gap-3 flex-wrap">
                                <div className="flex items-start gap-3">
                                    <div className="p-2.5 rounded-lg bg-pink-500/10 text-pink-400 border border-pink-500/20 mt-0.5">
                                        <Palette className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-bold text-foreground">Color Picker Defaults</h2>
                                        <p className="text-sm text-foreground/60">
                                            Configure the global default solid color and default gradient used across all color pickers in the frontend, admin dashboard, and image editor. Changing a color shows a Reset button in every picker to return to these defaults.
                                        </p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setColorPickerDefaults(DEFAULT_COLOR_PICKER_CONFIG)}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-card-border bg-foreground/[0.03] hover:bg-foreground/[0.08] text-xs font-semibold text-foreground/75 transition-colors cursor-pointer"
                                >
                                    <RotateCcw className="w-3.5 h-3.5" />
                                    Restore Factory Defaults
                                </button>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Default Solid Color */}
                                <div className="rounded-xl border border-card-border bg-foreground/[0.02] p-4 space-y-3">
                                    <div className="flex items-center justify-between gap-2">
                                        <div>
                                            <h3 className="text-sm font-bold text-foreground">Default Solid Color</h3>
                                            <p className="text-xs text-foreground/55">
                                                Initial custom color &amp; reset target for solid color pickers.
                                            </p>
                                        </div>
                                        <span className="text-xs font-mono uppercase px-2 py-1 rounded bg-foreground/[0.06] text-foreground/80">
                                            {colorPickerDefaults.defaultColor}
                                        </span>
                                    </div>
                                    <StudioColorPicker
                                        value={colorPickerDefaults.defaultColor}
                                        onChange={(next) =>
                                            setColorPickerDefaults((prev) => ({
                                                ...prev,
                                                defaultColor: next,
                                            }))
                                        }
                                        defaultColor={DEFAULT_COLOR_PICKER_CONFIG.defaultColor}
                                        ariaLabel="Default Solid Color"
                                        title="Default Solid Color"
                                        popoverTitle="Default Solid Color"
                                        showHexLabel={true}
                                        enableEyedropper={true}
                                    />
                                </div>

                                {/* Default Gradient */}
                                <div className="rounded-xl border border-card-border bg-foreground/[0.02] p-4 space-y-3">
                                    <div className="flex items-center justify-between gap-2">
                                        <div>
                                            <h3 className="text-sm font-bold text-foreground">Default Custom Gradient</h3>
                                            <p className="text-xs text-foreground/55">
                                                Initial gradient preset &amp; reset target for gradient pickers.
                                            </p>
                                        </div>
                                        <div
                                            className="w-12 h-6 rounded-md border border-card-border shadow-inner shrink-0"
                                            style={{
                                                background:
                                                    colorPickerDefaults.defaultGradientType === 'radial'
                                                        ? `radial-gradient(circle, ${colorPickerDefaults.defaultGradientFrom}, ${colorPickerDefaults.defaultGradientTo})`
                                                        : `linear-gradient(${colorPickerDefaults.defaultGradientAngle}deg, ${colorPickerDefaults.defaultGradientFrom}, ${colorPickerDefaults.defaultGradientTo})`,
                                            }}
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div className="space-y-1.5">
                                            <label className="block text-[11px] font-bold text-foreground/65 uppercase tracking-wider">
                                                Color 1 (Start)
                                            </label>
                                            <StudioColorPicker
                                                value={colorPickerDefaults.defaultGradientFrom}
                                                onChange={(next) =>
                                                    setColorPickerDefaults((prev) => ({
                                                        ...prev,
                                                        defaultGradientFrom: next,
                                                    }))
                                                }
                                                defaultColor={DEFAULT_COLOR_PICKER_CONFIG.defaultGradientFrom}
                                                ariaLabel="Default Gradient Start Color"
                                                title="Gradient Start Color"
                                                popoverTitle="Gradient Start"
                                                showHexLabel={true}
                                                enableEyedropper={true}
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="block text-[11px] font-bold text-foreground/65 uppercase tracking-wider">
                                                Color 2 (End)
                                            </label>
                                            <StudioColorPicker
                                                value={colorPickerDefaults.defaultGradientTo}
                                                onChange={(next) =>
                                                    setColorPickerDefaults((prev) => ({
                                                        ...prev,
                                                        defaultGradientTo: next,
                                                    }))
                                                }
                                                defaultColor={DEFAULT_COLOR_PICKER_CONFIG.defaultGradientTo}
                                                ariaLabel="Default Gradient End Color"
                                                title="Gradient End Color"
                                                popoverTitle="Gradient End"
                                                showHexLabel={true}
                                                enableEyedropper={true}
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3 pt-1">
                                        <div className="space-y-1.5">
                                            <label className="block text-[11px] font-bold text-foreground/65 uppercase tracking-wider">
                                                Type
                                            </label>
                                            <div className="flex rounded-lg bg-foreground/5 p-0.5 border border-card-border">
                                                {['linear', 'radial'].map((gType) => (
                                                    <button
                                                        key={gType}
                                                        type="button"
                                                        onClick={() =>
                                                            setColorPickerDefaults((prev) => ({
                                                                ...prev,
                                                                defaultGradientType: gType,
                                                            }))
                                                        }
                                                        className={`flex-1 py-1 text-[11px] font-bold rounded-md capitalize transition-all cursor-pointer ${
                                                            colorPickerDefaults.defaultGradientType === gType
                                                                ? 'bg-primary-glow text-white shadow-sm'
                                                                : 'text-foreground/60 hover:text-foreground'
                                                        }`}
                                                    >
                                                        {gType}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="block text-[11px] font-bold text-foreground/65 uppercase tracking-wider">
                                                Angle ({colorPickerDefaults.defaultGradientAngle}°)
                                            </label>
                                            <input
                                                type="range"
                                                min="0"
                                                max="360"
                                                value={colorPickerDefaults.defaultGradientAngle}
                                                disabled={colorPickerDefaults.defaultGradientType === 'radial'}
                                                onChange={(e) =>
                                                    setColorPickerDefaults((prev) => ({
                                                        ...prev,
                                                        defaultGradientAngle: Number(e.target.value),
                                                    }))
                                                }
                                                className="w-full accent-primary-glow mt-2 disabled:opacity-40"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Save Changes Bar */}
                        <div className="flex items-center justify-between p-4 rounded-xl bg-card-bg border border-card-border">
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

                    {/* Background Remover Engine Settings (Synced with Bonus Tools) */}
                    <BgRemoverSettingsCard showStandaloneSave />

                    {/* System Health Check Diagnostics Panel */}
                    <div className="bg-card-bg border border-card-border rounded-xl overflow-hidden">
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

            {brandStudioTarget &&
                typeof document !== 'undefined' &&
                createPortal(
                    <div
                        data-testid="brand-suite-studio-modal"
                        className="fixed inset-0 z-[150] bg-slate-950/85 backdrop-blur-sm flex flex-col"
                    >
                        <div className="h-11 px-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-xs text-slate-200 shrink-0">
                            <span className="font-bold flex items-center gap-2">
                                <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                                <span>
                                    {brandStudioTarget === 'logo'
                                        ? 'Website Logo Studio — SVG (480×120)'
                                        : brandStudioTarget === 'icon'
                                        ? 'Website Icon Studio — SVG (256×256)'
                                        : brandStudioTarget === 'favicon'
                                        ? 'Browser Favicon Studio — PNG (96×96)'
                                        : 'Brand Suite Studio — Website Logo (SVG 480×120), Icon (SVG 256×256) & Favicon (PNG 96×96)'}
                                </span>
                            </span>
                            <button
                                type="button"
                                data-testid="close-brand-suite-modal"
                                onClick={() => setBrandStudioTarget(null)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold cursor-pointer"
                            >
                                <X className="w-3.5 h-3.5" />
                                <span>Close Studio</span>
                            </button>
                        </div>
                        <iframe
                            data-testid="brand-suite-studio-iframe"
                            src={
                                brandStudioTarget === 'all'
                                    ? '/image-editor?mode=brand-suite'
                                    : `/image-editor?mode=brand-suite&asset=${encodeURIComponent(brandStudioTarget)}`
                            }
                            title="Website Brand Suite Designer"
                            className="flex-1 w-full h-full border-0 bg-slate-950"
                        />
                    </div>,
                    document.body
                )}
        </AdminLayout>
    );
}
