import { useEffect, useState } from 'react';
import { Head } from '@inertiajs/react';
import { toast } from 'sonner';
import {
    FileQuestion,
    ServerCrash,
    ShieldAlert,
    Wrench,
    Save,
    RefreshCw,
    Eye,
    Sparkles,
    Image as ImageIcon,
    Layers,
    Search,
    ExternalLink,
    Palette,
    X,
    Smartphone,
    Laptop,
} from 'lucide-react';
import AdminLayout from '../../../Layouts/AdminLayout';
import { StatCard } from '../../../components/ui/StatCard';

const DEFAULT_ERROR_PAGES = {
    p404: {
        title: 'Lost in Transparency?',
        subtitle: '404 - Page Not Found',
        message: 'The transparent PNG, collection, or page you were looking for seems to have faded away or never existed.',
        imagePath: '/assets/errors/404.svg',
        imageAlt: '404 Page Not Found Illustration',
        primaryButtonText: 'Back to Home',
        primaryButtonLink: '/',
        secondaryButtonText: 'Explore Collections',
        secondaryButtonLink: '/collections',
        showSearchBar: true,
        showSuggestedTags: true,
        suggestedTags: ['Christmas', 'Logos', 'Arrows', 'Icons', 'Borders', 'Nature'],
    },
    p500: {
        title: 'Something Glitched in the Pixels',
        subtitle: '500 - Internal Server Error',
        message: 'Our servers hit an unexpected bump while rendering this page. Our technical team has been notified.',
        imagePath: '/assets/errors/500.svg',
        imageAlt: '500 Server Error Illustration',
        primaryButtonText: 'Try Again',
        primaryButtonLink: '#reload',
        secondaryButtonText: 'Return to Homepage',
        secondaryButtonLink: '/',
        showSearchBar: false,
        showSuggestedTags: false,
    },
    p403: {
        title: 'Access Restricted',
        subtitle: '403 - Access Forbidden',
        message: "You don't have permission to access this area or resource.",
        imagePath: '/assets/errors/403.svg',
        imageAlt: '403 Forbidden Access Illustration',
        primaryButtonText: 'Back to Homepage',
        primaryButtonLink: '/',
        secondaryButtonText: 'Explore Collections',
        secondaryButtonLink: '/collections',
        showSearchBar: false,
    },
    maintenance: {
        enabled: false,
        title: 'Polishing Pixels & Upgrading Systems',
        subtitle: '503 - Scheduled Maintenance',
        message: 'We are performing scheduled maintenance and server performance upgrades. Everything will be back online shortly!',
        imagePath: '/assets/errors/503.svg',
        imageAlt: 'System Maintenance Illustration',
        primaryButtonText: 'Refresh Page',
        primaryButtonLink: '#reload',
        secondaryButtonText: 'Contact Support',
        secondaryButtonLink: '/contact-us',
        estimatedEndTime: '',
    },
};

export default function ErrorPagesSettingsPage() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [activeTab, setActiveTab] = useState('404');
    const [config, setConfig] = useState(DEFAULT_ERROR_PAGES);
    const [previewModalOpen, setPreviewModalOpen] = useState(false);
    const [previewTheme, setPreviewTheme] = useState('dark');
    const [previewDevice, setPreviewDevice] = useState('desktop');
    const [assetPickerOpen, setAssetPickerOpen] = useState(false);
    const [libraryImages, setLibraryImages] = useState([]);
    const [loadingLibrary, setLoadingLibrary] = useState(false);
    const [tagInput, setTagInput] = useState('');

    useEffect(() => {
        fetchConfig();
    }, []);

    const fetchConfig = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/admin/error-pages');
            if (res.ok) {
                const data = await res.json();
                setConfig(data);
            }
        } catch (error) {
            console.error('Failed to load error pages config', error);
            toast.error('Failed to load error pages configuration');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const res = await fetch('/api/admin/error-pages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(config),
            });

            if (res.ok) {
                const result = await res.json();
                if (result.data) {
                    setConfig(result.data);
                }
                toast.success('Error & system pages settings saved successfully!');
            } else {
                toast.error('Failed to save settings.');
            }
        } catch (error) {
            console.error('Error saving error pages config:', error);
            toast.error('An error occurred while saving.');
        } finally {
            setSaving(false);
        }
    };

    const openAssetPicker = async () => {
        setAssetPickerOpen(true);
        if (libraryImages.length === 0) {
            setLoadingLibrary(true);
            try {
                const res = await fetch('/api/images?limit=60');
                if (res.ok) {
                    const data = await res.json();
                    setLibraryImages(data.images || data || []);
                }
            } catch (err) {
                console.error('Failed to fetch library images', err);
            } finally {
                setLoadingLibrary(false);
            }
        }
    };

    const updateActiveField = (field, value) => {
        setConfig((prev) => {
            if (activeTab === '404') {
                return { ...prev, p404: { ...prev.p404, [field]: value } };
            } else if (activeTab === '500') {
                return { ...prev, p500: { ...prev.p500, [field]: value } };
            } else if (activeTab === '403') {
                return { ...prev, p403: { ...prev.p403, [field]: value } };
            } else {
                return { ...prev, maintenance: { ...prev.maintenance, [field]: value } };
            }
        });
    };

    const activeItem =
        activeTab === '404'
            ? config.p404
            : activeTab === '500'
                ? config.p500
                : activeTab === '403'
                    ? config.p403
                    : config.maintenance;

    const applySeasonalPreset = (presetName) => {
        if (presetName === 'christmas') {
            setConfig((prev) => ({
                ...prev,
                p404: {
                    ...prev.p404,
                    title: "Santa Couldn't Find This PNG!",
                    subtitle: '🎄 Holiday 404 - Not Found',
                    message: "Looks like this transparent asset got misplaced in the holiday snowstorm! Explore our seasonal Christmas collection below.",
                    imageAlt: 'Christmas Holiday 404 Mascot',
                    suggestedTags: ['Christmas', 'Santa', 'Snowman', 'Holiday', 'Gift', 'Winter'],
                },
            }));
            toast.success('Applied Christmas Holiday preset');
        } else if (presetName === 'halloween') {
            setConfig((prev) => ({
                ...prev,
                p404: {
                    ...prev.p404,
                    title: 'Spooky! This Page Vanished',
                    subtitle: '🎃 Spooky 404 - Ghosted Asset',
                    message: "A mischievous ghost seems to have carried away this transparent graphic! Check out our trending Halloween clipart below.",
                    imageAlt: 'Halloween Spooky 404 Ghost',
                    suggestedTags: ['Halloween', 'Ghost', 'Pumpkin', 'Bat', 'Spooky', 'Witch'],
                },
            }));
            toast.success('Applied Halloween Spooky preset');
        } else if (presetName === 'spring') {
            setConfig((prev) => ({
                ...prev,
                p404: {
                    ...prev.p404,
                    title: 'Lost in the Blossom',
                    subtitle: '🌸 Spring 404 - Page Missing',
                    message: 'This transparent asset is taking a sunny break. Explore our fresh spring graphics and trending vectors.',
                    imageAlt: 'Spring Blossom 404 Graphic',
                    suggestedTags: ['Spring', 'Flowers', 'Nature', 'Butterfly', 'Sun', 'Pastel'],
                },
            }));
            toast.success('Applied Spring Blossom preset');
        } else {
            setConfig((prev) => ({
                ...prev,
                p404: { ...DEFAULT_ERROR_PAGES.p404 },
            }));
            toast.success('Reset to Default Vector preset');
        }
    };

    const addTag = () => {
        if (!tagInput.trim() || activeTab !== '404') return;
        const currentTags = config.p404.suggestedTags || [];
        if (!currentTags.includes(tagInput.trim())) {
            updateActiveField('suggestedTags', [...currentTags, tagInput.trim()]);
        }
        setTagInput('');
    };

    const removeTag = (tagToRemove) => {
        if (activeTab !== '404') return;
        const currentTags = config.p404.suggestedTags || [];
        updateActiveField(
            'suggestedTags',
            currentTags.filter((t) => t !== tagToRemove)
        );
    };

    const tabs = [
        { key: '404', label: '404 Not Found', icon: <FileQuestion className="w-4 h-4" /> },
        { key: '500', label: '500 Server Error', icon: <ServerCrash className="w-4 h-4" /> },
        { key: '403', label: '403 Forbidden', icon: <ShieldAlert className="w-4 h-4" /> },
        { key: 'maintenance', label: '503 Maintenance', icon: <Wrench className="w-4 h-4" /> },
    ];

    return (
        <AdminLayout>
            <Head title="Error & System Pages - Png101 Admin" />
            {loading ? (
                <div className="p-12 flex items-center justify-center min-h-[400px]">
                    <div className="flex flex-col items-center gap-3 text-foreground/50">
                        <RefreshCw className="w-8 h-8 animate-spin text-primary-glow" />
                        <p className="text-sm font-medium">Loading error pages configuration...</p>
                    </div>
                </div>
            ) : (
                <div className="space-y-6">
                    {/* Page Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-1 flex items-center gap-3">
                                <ShieldAlert className="w-7 h-7 text-primary-glow shrink-0" />
                                <span>Error &amp; System Pages</span>
                            </h1>
                            <p className="text-foreground/60 text-sm">
                                Customize 404, 500, 403, and maintenance pages with seasonal graphics, helpful copy, and search fallbacks.
                            </p>
                        </div>

                        <div className="inline-flex items-center gap-1 p-1 bg-card-header-bg border border-card-border rounded-xl">
                            <button
                                type="button"
                                onClick={() => setPreviewModalOpen(true)}
                                className="h-8 flex items-center gap-2 px-3.5 rounded-lg bg-card-bg hover:bg-foreground/5 text-foreground font-bold text-xs transition-all shadow-sm cursor-pointer"
                                title="Open interactive page mockup"
                            >
                                <Eye className="w-3.5 h-3.5 text-primary-glow" />
                                <span>Live Preview</span>
                            </button>

                            <button
                                type="button"
                                onClick={handleSave}
                                disabled={saving}
                                className="h-8 flex items-center gap-2 px-4 rounded-lg bg-primary-glow hover:bg-blue-600 disabled:opacity-50 text-white font-bold text-xs shadow-sm transition-all cursor-pointer"
                            >
                                {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                                <span>{saving ? 'Saving...' : 'Save Changes'}</span>
                            </button>
                        </div>
                    </div>

                    {/* Top Stat Overview Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        <StatCard
                            title="404 Page Status"
                            value="Active"
                            subtitle={`${config.p404.showSearchBar !== false ? 'Search Bar Enabled' : 'Search Bar Off'} · ${config.p404.suggestedTags?.length || 0} suggested tags`}
                            icon={<FileQuestion className="w-6 h-6" />}
                        />
                        <StatCard
                            title="500 Error Page"
                            value="Ready"
                            subtitle="Auto-retry callback & technical digest logger"
                            icon={<ServerCrash className="w-6 h-6" />}
                        />
                        <StatCard
                            title="403 Access Vault"
                            value="Enforced"
                            subtitle="Safeguards restricted areas & guides users to homepage"
                            icon={<ShieldAlert className="w-6 h-6" />}
                        />
                        <StatCard
                            title="Maintenance Mode"
                            value={config.maintenance.enabled ? 'ON' : 'OFF'}
                            subtitle={
                                config.maintenance.enabled
                                    ? 'Visitors redirected to 503 maintenance page'
                                    : 'Site is live and accepting visitors'
                            }
                            icon={<Wrench className="w-6 h-6" />}
                        />
                    </div>

                    {/* Main Configuration Card */}
                    <div className="bg-card-bg border border-card-border rounded-xl overflow-hidden">
                        {/* Card Header with Tab Switcher */}
                        <div className="p-6 border-b border-card-border flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                            <div className="flex items-start gap-3">
                                <div className="p-2.5 rounded-lg bg-primary-glow/10 text-primary-glow border border-primary-glow/20 mt-0.5">
                                    {activeTab === '404' ? (
                                        <FileQuestion className="w-5 h-5" />
                                    ) : activeTab === '500' ? (
                                        <ServerCrash className="w-5 h-5 text-red-400" />
                                    ) : activeTab === '403' ? (
                                        <ShieldAlert className="w-5 h-5 text-purple-400" />
                                    ) : (
                                        <Wrench className="w-5 h-5 text-amber-400" />
                                    )}
                                </div>
                                <div>
                                    <div className="flex items-center gap-3">
                                        <h2 className="text-lg font-bold text-foreground">
                                            {activeTab === '404'
                                                ? '404 Not Found Page Configuration'
                                                : activeTab === '500'
                                                    ? '500 Internal Server Error Configuration'
                                                    : activeTab === '403'
                                                        ? '403 Access Forbidden Page Configuration'
                                                        : '503 Maintenance Mode Configuration'}
                                        </h2>
                                        <span
                                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                                                activeTab === '404'
                                                    ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                                                    : activeTab === '500'
                                                        ? 'bg-red-500/10 text-red-400 border-red-500/30'
                                                        : activeTab === '403'
                                                            ? 'bg-purple-500/10 text-purple-400 border-purple-500/30'
                                                            : config.maintenance.enabled
                                                                ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                                                                : 'bg-white/5 text-foreground/60 border-white/10'
                                            }`}
                                        >
                                            HTTP {activeTab === 'maintenance' ? '503' : activeTab}
                                        </span>
                                    </div>
                                    <p className="text-xs text-foreground/60 mt-1">
                                        Configure the visuals, headlines, description text, and quick-action buttons for this page.
                                    </p>
                                </div>
                            </div>

                            <div className="inline-flex gap-1 bg-card-header-bg rounded-xl p-1 border border-card-border self-stretch sm:self-auto overflow-x-auto">
                                {tabs.map((tab) => (
                                    <button
                                        key={tab.key}
                                        onClick={() => setActiveTab(tab.key)}
                                        className={`h-8 flex items-center gap-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 ${
                                            activeTab === tab.key
                                                ? 'bg-primary-glow text-white shadow-sm'
                                                : 'bg-card-bg text-foreground/60 hover:text-foreground shadow-sm'
                                        }`}
                                    >
                                        {tab.icon}
                                        <span>{tab.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Seasonal Quick-Preset Bar (for 404 Tab) */}
                        {activeTab === '404' && (
                            <div className="px-6 py-4 border-b border-card-border bg-background/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div className="flex items-center gap-2">
                                    <Sparkles className="w-4 h-4 text-primary-glow" />
                                    <span className="text-xs font-bold text-foreground">Seasonal Theme Presets:</span>
                                    <span className="text-xs text-foreground/50 hidden md:inline">
                                        Switch copy and suggested tags in one click for events and holidays
                                    </span>
                                </div>

                                <div className="flex flex-wrap items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => applySeasonalPreset('default')}
                                        className="px-3 py-1.5 rounded-lg bg-card-bg hover:bg-white/5 border border-card-border text-foreground text-xs font-semibold transition-all shadow-sm cursor-pointer"
                                    >
                                        ⚡ Default Vector
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => applySeasonalPreset('christmas')}
                                        className="px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 text-xs font-semibold transition-all shadow-sm cursor-pointer"
                                    >
                                        🎄 Christmas Holiday
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => applySeasonalPreset('halloween')}
                                        className="px-3 py-1.5 rounded-lg bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/30 text-orange-400 text-xs font-semibold transition-all shadow-sm cursor-pointer"
                                    >
                                        🎃 Halloween Spooky
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => applySeasonalPreset('spring')}
                                        className="px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-semibold transition-all shadow-sm cursor-pointer"
                                    >
                                        🌸 Spring Blossom
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Maintenance Toggle Card Banner */}
                        {activeTab === 'maintenance' && (
                            <div className="px-6 py-4 border-b border-card-border bg-amber-500/10 flex items-center justify-between gap-4">
                                <div className="flex items-center gap-3">
                                    <Wrench className="w-5 h-5 text-amber-400 shrink-0" />
                                    <div>
                                        <p className="text-sm font-bold text-foreground">Maintenance Mode Gatekeeper</p>
                                        <p className="text-xs text-foreground/60">
                                            When enabled, public visitors are served this 503 maintenance page. Signed-in administrators can still browse and manage normally.
                                        </p>
                                    </div>
                                </div>

                                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                                    <input
                                        type="checkbox"
                                        checked={config.maintenance.enabled}
                                        onChange={(e) => updateActiveField('enabled', e.target.checked)}
                                        className="sr-only peer"
                                    />
                                    <div className="w-11 h-6 bg-background border border-card-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                                </label>
                            </div>
                        )}

                        {/* Form Content: 12-Column Responsive Layout */}
                        <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-8">
                            {/* Left 7 Cols: Typography, Messaging & Button Actions */}
                            <div className="lg:col-span-7 space-y-6">
                                {/* Section 1: Titles & Description */}
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 pb-2 border-b border-card-border">
                                        <Palette className="w-4 h-4 text-primary-glow" />
                                        <h3 className="text-xs font-bold uppercase tracking-wider text-foreground/70">
                                            Headlines &amp; Narrative Copy
                                        </h3>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-xs font-semibold text-foreground/70 uppercase tracking-wider mb-2 block">
                                                Subtitle / Status Pill
                                            </label>
                                            <input
                                                type="text"
                                                value={activeItem.subtitle || ''}
                                                onChange={(e) => updateActiveField('subtitle', e.target.value)}
                                                placeholder="e.g. 404 - Page Not Found"
                                                className="w-full px-4 py-2.5 rounded-xl bg-background border border-card-border text-foreground text-sm focus:outline-none focus:border-primary-glow focus:ring-1 focus:ring-primary-glow/30 transition-all"
                                            />
                                        </div>

                                        <div>
                                            <label className="text-xs font-semibold text-foreground/70 uppercase tracking-wider mb-2 block">
                                                Main Page Headline
                                            </label>
                                            <input
                                                type="text"
                                                value={activeItem.title || ''}
                                                onChange={(e) => updateActiveField('title', e.target.value)}
                                                placeholder="e.g. Lost in Transparency?"
                                                className="w-full px-4 py-2.5 rounded-xl bg-background border border-card-border text-foreground text-sm focus:outline-none focus:border-primary-glow focus:ring-1 focus:ring-primary-glow/30 transition-all font-semibold"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-xs font-semibold text-foreground/70 uppercase tracking-wider mb-2 block">
                                            Explanation Message
                                        </label>
                                        <textarea
                                            rows={3}
                                            value={activeItem.message || ''}
                                            onChange={(e) => updateActiveField('message', e.target.value)}
                                            placeholder="Explain the situation in a friendly, helpful tone..."
                                            className="w-full px-4 py-2.5 rounded-xl bg-background border border-card-border text-foreground text-sm focus:outline-none focus:border-primary-glow focus:ring-1 focus:ring-primary-glow/30 transition-all leading-relaxed"
                                        />
                                    </div>

                                    {activeTab === 'maintenance' && (
                                        <div>
                                            <label className="text-xs font-semibold text-foreground/70 uppercase tracking-wider mb-2 block">
                                                Estimated Completion Notice (Optional)
                                            </label>
                                            <input
                                                type="text"
                                                value={activeItem.estimatedEndTime || ''}
                                                onChange={(e) => updateActiveField('estimatedEndTime', e.target.value)}
                                                placeholder="e.g. Back in 30 minutes (2:00 PM EST)"
                                                className="w-full px-4 py-2.5 rounded-xl bg-background border border-card-border text-foreground text-sm focus:outline-none focus:border-primary-glow focus:ring-1 focus:ring-primary-glow/30 transition-all"
                                            />
                                        </div>
                                    )}
                                </div>

                                {/* Section 2: Action Buttons */}
                                <div className="space-y-4 pt-4 border-t border-card-border">
                                    <div className="flex items-center gap-2 pb-2 border-b border-card-border">
                                        <ExternalLink className="w-4 h-4 text-primary-glow" />
                                        <h3 className="text-xs font-bold uppercase tracking-wider text-foreground/70">
                                            Navigation &amp; Button Destinations
                                        </h3>
                                    </div>

                                    {activeTab !== 'maintenance' ? (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-xs font-semibold text-foreground/70 uppercase tracking-wider mb-2 block">
                                                    Primary Button Text
                                                </label>
                                                <input
                                                    type="text"
                                                    value={activeItem.primaryButtonText || ''}
                                                    onChange={(e) => updateActiveField('primaryButtonText', e.target.value)}
                                                    placeholder="e.g. Back to Home"
                                                    className="w-full px-4 py-2.5 rounded-xl bg-background border border-card-border text-foreground text-sm focus:outline-none focus:border-primary-glow focus:ring-1 focus:ring-primary-glow/30 transition-all"
                                                />
                                            </div>

                                            <div>
                                                <label className="text-xs font-semibold text-foreground/70 uppercase tracking-wider mb-2 block">
                                                    Primary Button Destination URL
                                                </label>
                                                <input
                                                    type="text"
                                                    value={activeItem.primaryButtonLink || ''}
                                                    onChange={(e) => updateActiveField('primaryButtonLink', e.target.value)}
                                                    placeholder="e.g. /"
                                                    className="w-full px-4 py-2.5 rounded-xl bg-background border border-card-border text-foreground text-sm font-mono focus:outline-none focus:border-primary-glow focus:ring-1 focus:ring-primary-glow/30 transition-all"
                                                />
                                            </div>

                                            <div>
                                                <label className="text-xs font-semibold text-foreground/70 uppercase tracking-wider mb-2 block">
                                                    Secondary Button Text (Optional)
                                                </label>
                                                <input
                                                    type="text"
                                                    value={activeItem.secondaryButtonText || ''}
                                                    onChange={(e) => updateActiveField('secondaryButtonText', e.target.value)}
                                                    placeholder="e.g. Explore Collections"
                                                    className="w-full px-4 py-2.5 rounded-xl bg-background border border-card-border text-foreground text-sm focus:outline-none focus:border-primary-glow focus:ring-1 focus:ring-primary-glow/30 transition-all"
                                                />
                                            </div>

                                            <div>
                                                <label className="text-xs font-semibold text-foreground/70 uppercase tracking-wider mb-2 block">
                                                    Secondary Button Destination URL
                                                </label>
                                                <input
                                                    type="text"
                                                    value={activeItem.secondaryButtonLink || ''}
                                                    onChange={(e) => updateActiveField('secondaryButtonLink', e.target.value)}
                                                    placeholder="e.g. /collections"
                                                    className="w-full px-4 py-2.5 rounded-xl bg-background border border-card-border text-foreground text-sm font-mono focus:outline-none focus:border-primary-glow focus:ring-1 focus:ring-primary-glow/30 transition-all"
                                                />
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-xs font-semibold text-foreground/70 uppercase tracking-wider mb-2 block">
                                                    Reload Button Text
                                                </label>
                                                <input
                                                    type="text"
                                                    value={activeItem.primaryButtonText || ''}
                                                    onChange={(e) => updateActiveField('primaryButtonText', e.target.value)}
                                                    placeholder="e.g. Refresh Status"
                                                    className="w-full px-4 py-2.5 rounded-xl bg-background border border-card-border text-foreground text-sm focus:outline-none focus:border-primary-glow focus:ring-1 focus:ring-primary-glow/30 transition-all"
                                                />
                                                <p className="text-[11px] text-foreground/45 mt-1.5">
                                                    During maintenance, all public pages redirect to the 503 page. Clicking this button immediately reloads the site to check if maintenance has ended.
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Section 3: 404 Special Search & Keyword Suggestions */}
                                {activeTab === '404' && (
                                    <div className="space-y-4 pt-4 border-t border-card-border">
                                        <div className="flex items-center gap-2 pb-2 border-b border-card-border">
                                            <Search className="w-4 h-4 text-primary-glow" />
                                            <h3 className="text-xs font-bold uppercase tracking-wider text-foreground/70">
                                                404 Search Recovery Features
                                            </h3>
                                        </div>

                                        <div className="p-4 rounded-xl bg-background/40 border border-card-border space-y-4">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <p className="text-sm font-semibold text-foreground">
                                                        Embed Search Box on 404
                                                    </p>
                                                    <p className="text-xs text-foreground/60">
                                                        Allows visitors to immediately search transparent PNGs without navigating back to home.
                                                    </p>
                                                </div>
                                                <label className="relative inline-flex items-center cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={config.p404.showSearchBar !== false}
                                                        onChange={(e) => updateActiveField('showSearchBar', e.target.checked)}
                                                        className="sr-only peer"
                                                    />
                                                    <div className="w-11 h-6 bg-card-bg border border-card-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-glow"></div>
                                                </label>
                                            </div>

                                            <div className="pt-3 border-t border-card-border/60">
                                                <div className="flex items-center justify-between mb-3">
                                                    <div>
                                                        <p className="text-sm font-semibold text-foreground">
                                                            Suggested Keyword Chips
                                                        </p>
                                                        <p className="text-xs text-foreground/60">
                                                            Clickable tags guiding visitors to popular search queries.
                                                        </p>
                                                    </div>
                                                    <label className="relative inline-flex items-center cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            checked={config.p404.showSuggestedTags !== false}
                                                            onChange={(e) =>
                                                                updateActiveField('showSuggestedTags', e.target.checked)
                                                            }
                                                            className="sr-only peer"
                                                        />
                                                        <div className="w-11 h-6 bg-card-bg border border-card-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-glow"></div>
                                                    </label>
                                                </div>

                                                {config.p404.showSuggestedTags !== false && (
                                                    <div className="space-y-3 pt-1">
                                                        <div className="flex gap-2">
                                                            <input
                                                                type="text"
                                                                value={tagInput}
                                                                onChange={(e) => setTagInput(e.target.value)}
                                                                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                                                                placeholder="Type a suggested keyword (e.g. Logos, Clipart)..."
                                                                className="flex-1 px-3.5 py-2 rounded-xl bg-background border border-card-border text-foreground text-xs focus:outline-none focus:border-primary-glow"
                                                            />
                                                            <button
                                                                type="button"
                                                                onClick={addTag}
                                                                className="px-4 py-2 rounded-xl bg-primary-glow hover:bg-blue-600 text-white text-xs font-bold transition-all shadow-md shadow-primary-glow/20 cursor-pointer"
                                                            >
                                                                Add Tag
                                                            </button>
                                                        </div>

                                                        <div className="flex flex-wrap gap-1.5 pt-1">
                                                            {(config.p404.suggestedTags || []).map((tag, idx) => (
                                                                <span
                                                                    key={idx}
                                                                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-card-bg text-foreground/80 text-xs border border-card-border font-medium shadow-sm"
                                                                >
                                                                    <span>#{tag}</span>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => removeTag(tag)}
                                                                        className="text-foreground/40 hover:text-red-400 transition-colors cursor-pointer"
                                                                    >
                                                                        <X className="w-3 h-3" />
                                                                    </button>
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Right 5 Cols: Hero Graphic & Asset Picker */}
                            <div className="lg:col-span-5 space-y-5">
                                <div className="flex items-center justify-between pb-2 border-b border-card-border">
                                    <div className="flex items-center gap-2">
                                        <ImageIcon className="w-4 h-4 text-primary-glow" />
                                        <h3 className="text-xs font-bold uppercase tracking-wider text-foreground/70">
                                            Hero Graphic / PNG Image
                                        </h3>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={openAssetPicker}
                                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary-glow hover:underline cursor-pointer"
                                    >
                                        <Layers className="w-3.5 h-3.5" />
                                        <span>Choose Asset</span>
                                    </button>
                                </div>

                                {/* Interactive Checkerboard Stage */}
                                <div
                                    className="relative h-64 w-full rounded-2xl border border-card-border p-6 flex items-center justify-center overflow-hidden shadow-inner bg-card-bg/50 group"
                                    style={{
                                        backgroundImage:
                                            'linear-gradient(45deg, #80808012 25%, transparent 25%), linear-gradient(-45deg, #80808012 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #80808012 75%), linear-gradient(-45deg, transparent 75%, #80808012 75%)',
                                        backgroundSize: '14px 14px',
                                        backgroundPosition: '0 0, 0 7px, 7px -7px, -7px 0px',
                                    }}
                                >
                                    {activeItem.imagePath ? (
                                        <img
                                            src={activeItem.imagePath}
                                            alt={activeItem.imageAlt || 'Hero Graphic'}
                                            className="max-h-full max-w-full object-contain drop-shadow-xl group-hover:scale-105 transition-transform duration-300 pointer-events-none"
                                        />
                                    ) : (
                                        <div className="text-center text-foreground/40 space-y-2">
                                            <ImageIcon className="w-10 h-10 mx-auto text-foreground/30" />
                                            <p className="text-xs">No hero image configured</p>
                                        </div>
                                    )}

                                    <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between pointer-events-none">
                                        <span className="px-2.5 py-1 rounded-md bg-black/75 backdrop-blur-md text-white text-[11px] font-mono truncate max-w-[200px]">
                                            {activeItem.imagePath || 'No image'}
                                        </span>
                                        <span className="px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-400 border border-blue-500/30 text-[10px] font-bold">
                                            Transparent Stage
                                        </span>
                                    </div>
                                </div>

                                {/* Image Path URL */}
                                <div>
                                    <label className="text-xs font-semibold text-foreground/70 uppercase tracking-wider mb-2 block">
                                        Graphic File Path or URL
                                    </label>
                                    <input
                                        type="text"
                                        value={activeItem.imagePath || ''}
                                        onChange={(e) => updateActiveField('imagePath', e.target.value)}
                                        placeholder="e.g. /assets/errors/404.svg or /uploads/..."
                                        className="w-full px-4 py-2.5 rounded-xl bg-background border border-card-border text-foreground text-xs font-mono focus:outline-none focus:border-primary-glow focus:ring-1 focus:ring-primary-glow/30 transition-all"
                                    />
                                    <p className="text-[11px] text-foreground/40 mt-1">
                                        Point to any uploaded transparent PNG from your library or default SVG graphics.
                                    </p>
                                </div>

                                {/* Image Alt Text */}
                                <div>
                                    <label className="text-xs font-semibold text-foreground/70 uppercase tracking-wider mb-2 block">
                                        Graphic Alt Text (Accessibility)
                                    </label>
                                    <input
                                        type="text"
                                        value={activeItem.imageAlt || ''}
                                        onChange={(e) => updateActiveField('imageAlt', e.target.value)}
                                        placeholder="e.g. 404 Illustration"
                                        className="w-full px-4 py-2.5 rounded-xl bg-background border border-card-border text-foreground text-sm focus:outline-none focus:border-primary-glow focus:ring-1 focus:ring-primary-glow/30 transition-all"
                                    />
                                </div>

                                {/* Action Buttons */}
                                <div className="flex gap-2 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const defPath =
                                                activeTab === '404'
                                                    ? '/assets/errors/404.svg'
                                                    : activeTab === '500'
                                                        ? '/assets/errors/500.svg'
                                                        : activeTab === '403'
                                                            ? '/assets/errors/403.svg'
                                                            : '/assets/errors/503.svg';
                                            updateActiveField('imagePath', defPath);
                                            toast.info(`Reset to default ${activeTab} SVG illustration`);
                                        }}
                                        className="flex-1 py-2.5 rounded-xl bg-background hover:bg-white/5 border border-card-border text-foreground/80 hover:text-foreground text-xs font-semibold transition-all cursor-pointer"
                                    >
                                        Reset Default SVG
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setPreviewModalOpen(true)}
                                        className="flex-1 py-2.5 rounded-xl bg-card-bg hover:bg-white/5 border border-primary-glow/40 text-primary-glow text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
                                    >
                                        <Eye className="w-3.5 h-3.5" />
                                        <span>Preview Page</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Modal: Library Asset Picker */}
                    {assetPickerOpen && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
                            <div className="bg-card-bg border border-card-border rounded-2xl w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
                                <div className="p-5 border-b border-card-border flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-lg bg-primary-glow/10 text-primary-glow">
                                            <Layers className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h3 className="text-base font-bold text-foreground">
                                                Select Image from Uploaded Catalog
                                            </h3>
                                            <p className="text-xs text-foreground/60">
                                                Choose any published transparent PNG to use as the hero graphic.
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setAssetPickerOpen(false)}
                                        className="p-2 rounded-lg hover:bg-white/10 text-foreground/60 transition-colors cursor-pointer"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>

                                <div className="p-6 overflow-y-auto flex-1">
                                    {loadingLibrary ? (
                                        <div className="p-16 text-center text-foreground/50">
                                            <RefreshCw className="w-7 h-7 animate-spin mx-auto mb-3 text-primary-glow" />
                                            <p className="text-sm">Fetching catalog assets...</p>
                                        </div>
                                    ) : libraryImages.length > 0 ? (
                                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                                            {libraryImages.map((img) => (
                                                <button
                                                    key={img.id}
                                                    type="button"
                                                    onClick={() => {
                                                        updateActiveField('imagePath', img.path);
                                                        updateActiveField(
                                                            'imageAlt',
                                                            img.name || img.filename || 'Custom Hero Graphic'
                                                        );
                                                        setAssetPickerOpen(false);
                                                        toast.success('Selected image for error page');
                                                    }}
                                                    className="group relative h-32 rounded-xl border border-card-border p-2.5 flex flex-col items-center justify-between bg-card-bg hover:border-primary-glow hover:shadow-xl hover:scale-105 transition-all overflow-hidden cursor-pointer"
                                                    style={{
                                                        backgroundImage:
                                                            'linear-gradient(45deg, #80808012 25%, transparent 25%), linear-gradient(-45deg, #80808012 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #80808012 75%), linear-gradient(-45deg, transparent 75%, #80808012 75%)',
                                                        backgroundSize: '10px 10px',
                                                    }}
                                                >
                                                    <div className="flex-1 w-full flex items-center justify-center overflow-hidden">
                                                        <img
                                                            src={img.path}
                                                            alt={img.name || ''}
                                                            className="max-h-20 max-w-full object-contain pointer-events-none group-hover:scale-110 transition-transform duration-200"
                                                        />
                                                    </div>
                                                    <span className="text-[10px] text-foreground/70 truncate w-full mt-1.5 text-center font-medium block">
                                                        {img.name || img.filename}
                                                    </span>
                                                </button>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="p-16 text-center text-foreground/40 space-y-2">
                                            <ImageIcon className="w-10 h-10 mx-auto text-foreground/30" />
                                            <p className="text-sm">No uploaded images found in catalog.</p>
                                        </div>
                                    )}
                                </div>

                                <div className="p-4 border-t border-card-border bg-background/50 flex justify-between items-center text-xs text-foreground/50">
                                    <span>Showing up to 60 recent published assets</span>
                                    <button
                                        type="button"
                                        onClick={() => setAssetPickerOpen(false)}
                                        className="px-4 py-2 rounded-xl bg-card-bg hover:bg-white/10 text-foreground font-semibold border border-card-border cursor-pointer transition-colors"
                                    >
                                        Close
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Modal: Live Interactive Preview */}
                    {previewModalOpen && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
                            <div className="bg-card-bg border border-card-border rounded-2xl w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
                                <div className="p-4 border-b border-card-border flex items-center justify-between bg-card-bg">
                                    <div className="flex items-center gap-2.5">
                                        <div className="p-1.5 rounded-lg bg-primary-glow/10 text-primary-glow">
                                            <Eye className="w-4 h-4" />
                                        </div>
                                        <span className="font-bold text-sm text-foreground">
                                            Live Mockup Preview: HTTP {activeTab === 'maintenance' ? '503' : activeTab}
                                        </span>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <div className="flex rounded-lg border border-card-border p-0.5 bg-background">
                                            <button
                                                type="button"
                                                onClick={() => setPreviewDevice('desktop')}
                                                className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                                                    previewDevice === 'desktop'
                                                        ? 'bg-primary-glow text-white shadow-sm'
                                                        : 'text-foreground/60 hover:text-foreground'
                                                }`}
                                                title="Desktop View"
                                            >
                                                <Laptop className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setPreviewDevice('mobile')}
                                                className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                                                    previewDevice === 'mobile'
                                                        ? 'bg-primary-glow text-white shadow-sm'
                                                        : 'text-foreground/60 hover:text-foreground'
                                                }`}
                                                title="Mobile View"
                                            >
                                                <Smartphone className="w-3.5 h-3.5" />
                                            </button>
                                        </div>

                                        <div className="flex rounded-lg border border-card-border p-0.5 bg-background">
                                            <button
                                                type="button"
                                                onClick={() => setPreviewTheme('dark')}
                                                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors cursor-pointer ${
                                                    previewTheme === 'dark'
                                                        ? 'bg-primary-glow text-white'
                                                        : 'text-foreground/60'
                                                }`}
                                            >
                                                Dark
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setPreviewTheme('light')}
                                                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors cursor-pointer ${
                                                    previewTheme === 'light'
                                                        ? 'bg-primary-glow text-white'
                                                        : 'text-foreground/60'
                                                }`}
                                            >
                                                Light
                                            </button>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() => setPreviewModalOpen(false)}
                                            className="p-1.5 rounded-lg hover:bg-white/10 text-foreground/60 transition-colors cursor-pointer"
                                        >
                                            <X className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>

                                <div
                                    className={`p-8 md:p-12 overflow-y-auto flex-1 flex flex-col items-center justify-center text-center transition-colors ${
                                        previewTheme === 'dark' ? 'bg-[#0f172a] text-white' : 'bg-white text-[#0f172a]'
                                    }`}
                                >
                                    <div
                                        className={`w-full mx-auto space-y-6 transition-all ${
                                            previewDevice === 'mobile'
                                                ? 'max-w-xs border border-card-border/80 rounded-3xl p-6 shadow-2xl bg-card-bg/20'
                                                : 'max-w-xl'
                                        }`}
                                    >
                                        <div className="relative mx-auto w-52 h-44 flex items-center justify-center">
                                            <div
                                                className={`w-full h-full rounded-2xl border p-4 flex items-center justify-center overflow-hidden shadow-xl ${
                                                    previewTheme === 'dark'
                                                        ? 'bg-slate-900/60 border-slate-800'
                                                        : 'bg-slate-50 border-slate-200'
                                                }`}
                                                style={{
                                                    backgroundImage:
                                                        'linear-gradient(45deg, #80808012 25%, transparent 25%), linear-gradient(-45deg, #80808012 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #80808012 75%), linear-gradient(-45deg, transparent 75%, #80808012 75%)',
                                                    backgroundSize: '12px 12px',
                                                }}
                                            >
                                                <img
                                                    src={activeItem.imagePath || '/assets/errors/404.svg'}
                                                    alt=""
                                                    className="max-h-full max-w-full object-contain pointer-events-none drop-shadow-md"
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <span className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-blue-500/10 text-blue-500 border border-blue-500/20">
                                                {activeItem.subtitle || `${activeTab} Error`}
                                            </span>
                                            <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
                                                {activeItem.title}
                                            </h2>
                                            <p
                                                className={`text-xs sm:text-sm max-w-md mx-auto leading-relaxed ${
                                                    previewTheme === 'dark' ? 'text-slate-400' : 'text-slate-600'
                                                }`}
                                            >
                                                {activeItem.message}
                                            </p>
                                        </div>

                                        {activeTab === '404' && config.p404.showSearchBar !== false && (
                                            <div className="max-w-md mx-auto w-full">
                                                <div
                                                    className={`relative flex items-center rounded-xl border p-2 text-xs shadow-sm ${
                                                        previewTheme === 'dark'
                                                            ? 'bg-slate-900 border-slate-800 text-slate-400'
                                                            : 'bg-slate-100 border-slate-200 text-slate-500'
                                                    }`}
                                                >
                                                    <Search className="w-4 h-4 ml-1 mr-2" />
                                                    <span className="flex-1 text-left truncate">
                                                        Search transparent PNGs &amp; clipart...
                                                    </span>
                                                    <span className="px-2.5 py-1 rounded-md bg-blue-600 text-white font-bold text-[11px] shrink-0">
                                                        Search
                                                    </span>
                                                </div>
                                            </div>
                                        )}

                                        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                                            <span className="px-4 py-2 rounded-xl bg-blue-600 text-white font-semibold text-xs shadow-md shadow-blue-600/25">
                                                {activeItem.primaryButtonText}
                                            </span>
                                            {activeTab !== 'maintenance' && activeItem.secondaryButtonText && (
                                                <span
                                                    className={`px-4 py-2 rounded-xl border font-semibold text-xs ${
                                                        previewTheme === 'dark'
                                                            ? 'bg-slate-900 border-slate-800 text-slate-300'
                                                            : 'bg-slate-100 border-slate-300 text-slate-700'
                                                    }`}
                                                >
                                                    {activeItem.secondaryButtonText}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="p-4 border-t border-card-border bg-card-bg flex justify-between items-center text-xs text-foreground/50">
                                    <span>Interactive Mockup &bull; Renders live visitor experience</span>
                                    <button
                                        type="button"
                                        onClick={() => setPreviewModalOpen(false)}
                                        className="px-4 py-1.5 rounded-lg bg-primary-glow hover:bg-blue-600 text-white font-semibold cursor-pointer transition-colors shadow-md shadow-primary-glow/20"
                                    >
                                        Done
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </AdminLayout>
    );
}
