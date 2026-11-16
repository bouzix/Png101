import { useEffect, useState } from 'react';
import { Head } from '@inertiajs/react';
import { toast } from 'sonner';
import AdminLayout from '../../../Layouts/AdminLayout';
import ConfirmDialog from '../../../components/admin/ConfirmDialog';
import StudioSelect from '@/components/ui/StudioSelect';
import {
    Database,
    FolderX,
    Trash2,
    Globe,
    RefreshCw,
    Clock,
    FileCode2,
    ExternalLink,
    Save,
    CheckCircle2,
    Sparkles,
    Layers,
} from 'lucide-react';
import { StatCard } from '../../../components/ui/StatCard';

const DAYS_OF_WEEK = [
    { value: 0, label: 'Sunday' },
    { value: 1, label: 'Monday' },
    { value: 2, label: 'Tuesday' },
    { value: 3, label: 'Wednesday' },
    { value: 4, label: 'Thursday' },
    { value: 5, label: 'Friday' },
    { value: 6, label: 'Saturday' },
];

export default function DataManagementPage() {
    const [loadingAction, setLoadingAction] = useState(null);
    const [confirmDialog, setConfirmDialog] = useState({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => {},
    });

    const [seoLoading, setSeoLoading] = useState(true);
    const [generatingSeo, setGeneratingSeo] = useState(false);
    const [savingSeo, setSavingSeo] = useState(false);
    const [seoSettings, setSeoSettings] = useState({
        autoRegenerate: true,
        scheduleFrequency: 'daily',
        scheduleTime: '00:00',
        scheduleDayOfWeek: 1,
        scheduleDayOfMonth: 1,
        disallowAdminInRobots: true,
        includeImageXml: true,
        includeLlmsTxt: true,
        includeManifest: true,
        customRobotsRules: '',
        lastGeneratedAt: null,
        lastGeneratedTrigger: null,
        lastStats: null,
        nextScheduledAt: null,
    });

    useEffect(() => {
        fetch('/api/admin/seo')
            .then((res) => res.json())
            .then((data) => {
                if (data && !data.error) {
                    setSeoSettings({
                        autoRegenerate: data.autoRegenerate ?? true,
                        scheduleFrequency: data.scheduleFrequency || 'daily',
                        scheduleTime: data.scheduleTime || '00:00',
                        scheduleDayOfWeek: Number(data.scheduleDayOfWeek ?? 1),
                        scheduleDayOfMonth: Number(data.scheduleDayOfMonth ?? 1),
                        disallowAdminInRobots: data.disallowAdminInRobots ?? true,
                        includeImageXml: data.includeImageXml ?? true,
                        includeLlmsTxt: data.includeLlmsTxt ?? true,
                        includeManifest: data.includeManifest ?? true,
                        customRobotsRules: data.customRobotsRules || '',
                        lastGeneratedAt: data.lastGeneratedAt || null,
                        lastGeneratedTrigger: data.lastGeneratedTrigger || null,
                        lastStats: data.lastStats || null,
                        nextScheduledAt: data.nextScheduledAt || null,
                    });
                }
                setSeoLoading(false);
            })
            .catch((err) => {
                console.error('Error fetching SEO settings:', err);
                toast.error('Failed to load SEO settings');
                setSeoLoading(false);
            });
    }, []);

    const handleClearDatabase = async () => {
        setLoadingAction('db');
        try {
            const res = await fetch('/api/admin/data/clear-database', {
                method: 'POST',
            });
            const data = await res.json();
            if (res.ok) {
                toast.success(data.message || 'Database images cleared successfully.');
            } else {
                toast.error(data.error || 'Failed to clear database images.');
            }
        } catch (error) {
            console.error('Error clearing database:', error);
            toast.error('An error occurred.');
        } finally {
            setLoadingAction(null);
        }
    };

    const handleClearUploads = async () => {
        setLoadingAction('uploads');
        try {
            const res = await fetch('/api/admin/data/clear-uploads', {
                method: 'POST',
            });
            const data = await res.json();
            if (res.ok) {
                toast.success(data.message || 'Upload directory cleared successfully.');
            } else {
                toast.error(data.error || 'Failed to clear uploads directory.');
            }
        } catch (error) {
            console.error('Error clearing uploads:', error);
            toast.error('An error occurred.');
        } finally {
            setLoadingAction(null);
        }
    };

    const handleGenerateNow = async () => {
        setGeneratingSeo(true);
        try {
            const res = await fetch('/api/admin/seo', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'generate',
                    settings: seoSettings,
                }),
            });
            const result = await res.json();
            if (res.ok && result.data) {
                setSeoSettings((prev) => ({
                    ...prev,
                    ...result.data,
                }));
                toast.success('All sitemaps, robots.txt, and SEO files generated successfully!');
            } else {
                toast.error('Failed to generate SEO files.');
            }
        } catch (error) {
            console.error('Error generating SEO files:', error);
            toast.error('An error occurred while generating SEO files.');
        } finally {
            setGeneratingSeo(false);
        }
    };

    const handleSaveSeoSettings = async (e) => {
        e.preventDefault();
        setSavingSeo(true);
        try {
            const res = await fetch('/api/admin/seo', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(seoSettings),
            });
            const result = await res.json();
            if (res.ok && result.data) {
                setSeoSettings((prev) => ({
                    ...prev,
                    ...result.data,
                }));
                toast.success('SEO & Sitemap schedule settings saved!');
            } else {
                toast.error('Failed to save SEO settings.');
            }
        } catch (error) {
            console.error('Error saving SEO settings:', error);
            toast.error('An error occurred while saving SEO settings.');
        } finally {
            setSavingSeo(false);
        }
    };

    const seoFileCards = [
        {
            file: '/sitemap.xml',
            label: 'Master Sitemap Index',
            badge: '4 Sub-Sitemaps',
            desc: 'Links search engines to all specialized sub-sitemaps.',
        },
        {
            file: '/sitemap-pages.xml',
            label: 'Website Pages Sitemap',
            badge: `${seoSettings.lastStats?.pagesCount ?? 6} Pages`,
            desc: 'Home, About Us, Contact Us, Terms, Privacy, and DMCA pages.',
        },
        {
            file: '/sitemap-images.xml',
            label: 'Images Sitemap',
            badge: `${seoSettings.lastStats?.imagesCount ?? 0} Images`,
            desc: 'All published PNG pages with Google Image XML metadata.',
        },
        {
            file: '/sitemap-collections.xml',
            label: 'Collections Sitemap',
            badge: `${seoSettings.lastStats?.collectionsCount ?? 0} Collections`,
            desc: 'Curated PNG collections and themed pack landing pages.',
        },
        {
            file: '/sitemap-tags.xml',
            label: 'Tags & Keywords Sitemap',
            badge: `${seoSettings.lastStats?.tagsCount ?? 0} Tags`,
            desc: 'Long-tail keyword search URLs extracted from image tags.',
        },
        {
            file: '/robots.txt',
            label: 'robots.txt',
            badge: 'Crawler Directives',
            desc: 'Directs search crawlers and declares all sitemap URLs.',
        },
        ...(seoSettings.includeLlmsTxt
            ? [
                  {
                      file: '/llms.txt',
                      label: 'llms.txt',
                      badge: 'AI Search Engine SEO',
                      desc: 'Structured index for AI search engines (ChatGPT, Perplexity, Gemini).',
                  },
              ]
            : []),
        ...(seoSettings.includeManifest
            ? [
                  {
                      file: '/manifest.webmanifest',
                      label: 'manifest.webmanifest',
                      badge: 'Web App Manifest',
                      desc: 'Metadata for mobile browsers and technical SEO audits.',
                  },
              ]
            : []),
    ];

    return (
        <AdminLayout>
            <Head title="Data & SEO Management - Png101 Admin" />
            <div className="space-y-6 pb-24">
                {/* Page Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-1 flex items-center gap-3">
                            <Database className="w-7 h-7 text-primary-glow shrink-0" />
                            <span>Data &amp; SEO Management</span>
                        </h1>
                        <p className="text-foreground/60 text-sm">
                            Purge catalog records, inspect upload storage, and automate multi-file XML sitemap generation.
                        </p>
                    </div>

                    <div className="inline-flex items-center p-1 bg-card-header-bg border border-card-border rounded-xl self-start sm:self-auto flex-shrink-0">
                        <button
                            type="button"
                            onClick={handleGenerateNow}
                            disabled={generatingSeo || seoLoading}
                            className="h-8 inline-flex items-center gap-2 px-3.5 bg-primary-glow text-white font-bold text-xs rounded-lg hover:bg-blue-600 shadow-sm transition-all disabled:opacity-50 cursor-pointer"
                        >
                            <RefreshCw className={`w-3.5 h-3.5 ${generatingSeo ? 'animate-spin' : ''}`} />
                            <span>{generatingSeo ? 'Generating Files...' : 'Regenerate All Sitemaps'}</span>
                        </button>
                    </div>
                </div>

                {/* Primary Stat Cards Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    <StatCard
                        title="Indexed SEO Files"
                        value={`${seoFileCards.length} Files`}
                        subtitle="Master index, pages, images, collections, tags"
                        icon={<Globe className="w-6 h-6" />}
                    />
                    <StatCard
                        title="Indexed Images"
                        value={seoSettings.lastStats?.imagesCount?.toLocaleString() ?? '0'}
                        subtitle="Google Image XML metadata enabled"
                        icon={<FileCode2 className="w-6 h-6" />}
                    />
                    <StatCard
                        title="Collections Indexed"
                        value={seoSettings.lastStats?.collectionsCount?.toLocaleString() ?? '0'}
                        subtitle="Curated themed sitemap /sitemap-collections.xml"
                        icon={<Layers className="w-6 h-6" />}
                    />
                    <StatCard
                        title="Auto-Regeneration"
                        value={seoSettings.autoRegenerate ? seoSettings.scheduleFrequency.toUpperCase() : 'Manual'}
                        subtitle={
                            seoSettings.autoRegenerate
                                ? `Scheduled at ${seoSettings.scheduleTime}`
                                : 'On-demand generation only'
                        }
                        icon={<Clock className="w-6 h-6" />}
                    />
                </div>

                {/* Card 1: Data Purge & Catalog Management */}
                <div className="bg-card-bg border border-card-border rounded-xl overflow-hidden">
                    <div className="p-6 border-b border-card-border flex items-start gap-3">
                        <div className="p-2.5 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 mt-0.5">
                            <Database className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-foreground">Catalog &amp; Storage Maintenance</h2>
                            <p className="text-xs text-foreground/60 mt-0.5">
                                Destructive administrative tools to purge database records or storage files. Exercise caution.
                            </p>
                        </div>
                    </div>

                    <div className="p-6 space-y-4">
                        {/* Clear Database Images Row */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-background border border-card-border rounded-xl">
                            <div className="flex items-start gap-3">
                                <div className="p-2 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 mt-0.5">
                                    <Trash2 className="w-4 h-4" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-foreground">Clear Database Images</h3>
                                    <p className="text-xs text-foreground/50 mt-0.5">
                                        Deletes all image rows and tags from MySQL. The physical image files on disk are preserved.
                                    </p>
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={() =>
                                    setConfirmDialog({
                                        isOpen: true,
                                        title: 'Clear Database Images',
                                        message:
                                            'Are you sure you want to delete ALL images from the database? Physical files will remain on disk.',
                                        onConfirm: handleClearDatabase,
                                    })
                                }
                                disabled={loadingAction !== null}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 rounded-xl text-xs font-semibold transition-all disabled:opacity-50 cursor-pointer self-start sm:self-auto"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>{loadingAction === 'db' ? 'Processing...' : 'Clear Database'}</span>
                            </button>
                        </div>

                        {/* Clear Upload Storage Row */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-background border border-card-border rounded-xl">
                            <div className="flex items-start gap-3">
                                <div className="p-2 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 mt-0.5">
                                    <FolderX className="w-4 h-4" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-foreground">Clear Upload Directory</h3>
                                    <p className="text-xs text-foreground/50 mt-0.5">
                                        Permanently deletes all files inside the <code className="font-mono text-xs">/public/uploads</code> directory.
                                    </p>
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={() =>
                                    setConfirmDialog({
                                        isOpen: true,
                                        title: 'Clear Upload Directory',
                                        message:
                                            'Are you sure you want to delete ALL uploaded files from the disk? This action is irreversible.',
                                        onConfirm: handleClearUploads,
                                    })
                                }
                                disabled={loadingAction !== null}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 rounded-xl text-xs font-semibold transition-all disabled:opacity-50 cursor-pointer self-start sm:self-auto"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>{loadingAction === 'uploads' ? 'Processing...' : 'Delete Files'}</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Card 2: SEO & Sitemap Generator */}
                <div className="bg-card-bg border border-card-border rounded-xl overflow-hidden">
                    <div className="p-6 border-b border-card-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-start gap-3">
                            <div className="p-2.5 rounded-lg bg-primary-glow/10 text-primary-glow border border-primary-glow/20 mt-0.5">
                                <Globe className="w-5 h-5" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-foreground">SEO &amp; Sitemap Generator</h2>
                                <p className="text-xs text-foreground/60 mt-0.5">
                                    Multi-file XML sitemaps, <code className="font-mono text-xs">robots.txt</code>, and AI crawler indexing.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="p-6 space-y-6">
                        {/* Status Overview Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="p-4 rounded-xl bg-background border border-card-border flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                    <CheckCircle2 className="w-4 h-4" />
                                </div>
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-wider text-foreground/50">
                                        Last Generated
                                    </p>
                                    <p className="text-xs font-semibold text-foreground mt-0.5">
                                        {seoSettings.lastGeneratedAt
                                            ? new Date(seoSettings.lastGeneratedAt).toLocaleString()
                                            : 'Not generated yet'}
                                    </p>
                                </div>
                            </div>

                            <div className="p-4 rounded-xl bg-background border border-card-border flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-primary-glow/10 text-primary-glow border border-primary-glow/20">
                                    <Sparkles className="w-4 h-4" />
                                </div>
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-wider text-foreground/50">
                                        Last Trigger Source
                                    </p>
                                    <p className="text-xs font-semibold text-foreground mt-0.5">
                                        {seoSettings.lastGeneratedTrigger === 'manual'
                                            ? 'Manual Dashboard Trigger'
                                            : seoSettings.lastGeneratedTrigger === 'auto-schedule'
                                                ? 'Automatic Background Schedule'
                                                : '—'}
                                    </p>
                                </div>
                            </div>

                            <div className="p-4 rounded-xl bg-background border border-card-border flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                    <Clock className="w-4 h-4" />
                                </div>
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-wider text-foreground/50">
                                        Next Auto-Regeneration
                                    </p>
                                    <p className="text-xs font-semibold text-foreground mt-0.5">
                                        {seoSettings.autoRegenerate && seoSettings.nextScheduledAt
                                            ? new Date(seoSettings.nextScheduledAt).toLocaleString()
                                            : 'Auto-Schedule Disabled'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Generated SEO Files Grid */}
                        <div>
                            <h3 className="text-xs font-bold uppercase tracking-wider text-foreground/70 mb-3">
                                Generated SEO &amp; Sitemap Files ({seoFileCards.length})
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                {seoFileCards.map((item) => (
                                    <div
                                        key={item.file}
                                        className="p-4 rounded-xl bg-background border border-card-border flex flex-col justify-between gap-3 hover:border-primary-glow/40 transition-all hover:-translate-y-0.5 shadow-sm"
                                    >
                                        <div className="space-y-1.5">
                                            <div className="flex items-center justify-between gap-2">
                                                <span className="inline-flex items-center gap-1.5 font-mono text-xs font-bold text-primary-glow">
                                                    <FileCode2 className="w-3.5 h-3.5" />
                                                    {item.file}
                                                </span>
                                                <a
                                                    href={item.file}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-foreground/40 hover:text-primary-glow transition-colors"
                                                    title={`Open ${item.file}`}
                                                >
                                                    <ExternalLink className="w-3.5 h-3.5" />
                                                </a>
                                            </div>
                                            <p className="text-sm font-bold text-foreground">{item.label}</p>
                                            <p className="text-xs text-foreground/50 leading-relaxed">{item.desc}</p>
                                        </div>
                                        <div>
                                            <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-primary-glow/10 text-primary-glow border border-primary-glow/20">
                                                {item.badge}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Schedule & SEO Configuration Form */}
                        <form onSubmit={handleSaveSeoSettings} className="space-y-6 pt-4 border-t border-card-border">
                            {/* Schedule Section */}
                            <div className="space-y-4">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                    <div>
                                        <h3 className="text-base font-bold text-foreground">
                                            Automatic Regeneration Schedule
                                        </h3>
                                        <p className="text-xs text-foreground/60 mt-0.5">
                                            Keep search indexes fresh by scheduling automatic updates.
                                        </p>
                                    </div>
                                    <label className="inline-flex items-center gap-2.5 cursor-pointer select-none">
                                        <input
                                            type="checkbox"
                                            checked={seoSettings.autoRegenerate}
                                            onChange={(e) =>
                                                setSeoSettings({ ...seoSettings, autoRegenerate: e.target.checked })
                                            }
                                            className="w-4 h-4 text-primary-glow bg-background border-card-border rounded accent-blue-500 cursor-pointer"
                                        />
                                        <span className="text-xs font-semibold text-foreground">
                                            Enable Auto-Regeneration
                                        </span>
                                    </label>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-xl bg-background border border-card-border">
                                    <div>
                                        <label className="block text-xs font-bold text-foreground/70 uppercase tracking-wider mb-2">
                                            Schedule Frequency
                                        </label>
                                        <StudioSelect
                                            aria-label="Schedule Frequency"
                                            value={seoSettings.scheduleFrequency}
                                            onChange={(e) =>
                                                setSeoSettings({
                                                    ...seoSettings,
                                                    scheduleFrequency: e.target.value,
                                                })
                                            }
                                            disabled={!seoSettings.autoRegenerate}
                                            className="w-full"
                                        >
                                            <option value="hourly">Every Hour</option>
                                            <option value="daily">Every Day (Daily)</option>
                                            <option value="weekly">Every Week (Weekly)</option>
                                            <option value="monthly">Every Month (Monthly)</option>
                                        </StudioSelect>
                                    </div>

                                    {seoSettings.scheduleFrequency === 'weekly' && (
                                        <div>
                                            <label className="block text-xs font-bold text-foreground/70 uppercase tracking-wider mb-2">
                                                Day of the Week
                                            </label>
                                            <StudioSelect
                                                aria-label="Day of the Week"
                                                value={seoSettings.scheduleDayOfWeek}
                                                onChange={(e) =>
                                                    setSeoSettings({
                                                        ...seoSettings,
                                                        scheduleDayOfWeek: Number(e.target.value),
                                                    })
                                                }
                                                disabled={!seoSettings.autoRegenerate}
                                                className="w-full"
                                            >
                                                {DAYS_OF_WEEK.map((d) => (
                                                    <option key={d.value} value={d.value}>
                                                        {d.label}
                                                    </option>
                                                ))}
                                            </StudioSelect>
                                        </div>
                                    )}

                                    {seoSettings.scheduleFrequency === 'monthly' && (
                                        <div>
                                            <label className="block text-xs font-bold text-foreground/70 uppercase tracking-wider mb-2">
                                                Day of the Month
                                            </label>
                                            <StudioSelect
                                                aria-label="Day of the Month"
                                                value={seoSettings.scheduleDayOfMonth}
                                                onChange={(e) =>
                                                    setSeoSettings({
                                                        ...seoSettings,
                                                        scheduleDayOfMonth: Number(e.target.value),
                                                    })
                                                }
                                                disabled={!seoSettings.autoRegenerate}
                                                className="w-full"
                                            >
                                                {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
                                                    <option key={day} value={day}>
                                                        Day {day} of the Month
                                                    </option>
                                                ))}
                                            </StudioSelect>
                                        </div>
                                    )}

                                    <div>
                                        <label className="block text-xs font-bold text-foreground/70 uppercase tracking-wider mb-2">
                                            {seoSettings.scheduleFrequency === 'hourly'
                                                ? 'Minute of the Hour (HH:mm)'
                                                : 'Time of Day (24h)'}
                                        </label>
                                        <input
                                            type="time"
                                            value={seoSettings.scheduleTime}
                                            onChange={(e) =>
                                                setSeoSettings({ ...seoSettings, scheduleTime: e.target.value })
                                            }
                                            disabled={!seoSettings.autoRegenerate}
                                            className="w-full px-4 py-2.5 bg-card-bg border border-card-border rounded-xl text-foreground text-sm focus:outline-none focus:border-primary-glow disabled:opacity-50"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Additional SEO Enhancements */}
                            <div className="space-y-4">
                                <h3 className="text-base font-bold text-foreground">
                                    Crawler Directives &amp; Metadata Enhancements
                                </h3>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <label className="flex items-start gap-3 p-4 rounded-xl bg-background border border-card-border cursor-pointer select-none hover:border-white/20 transition-colors">
                                        <input
                                            type="checkbox"
                                            checked={seoSettings.includeImageXml}
                                            onChange={(e) =>
                                                setSeoSettings({ ...seoSettings, includeImageXml: e.target.checked })
                                            }
                                            className="mt-1 w-4 h-4 text-primary-glow bg-card-bg border-card-border rounded accent-blue-500"
                                        />
                                        <div>
                                            <p className="text-sm font-bold text-foreground">
                                                Google Image XML Extension (<code className="font-mono text-xs">&lt;image:image&gt;</code>)
                                            </p>
                                            <p className="text-xs text-foreground/50 mt-0.5 leading-relaxed">
                                                Embeds direct PNG URLs, image titles, and captions inside <code className="font-mono text-xs">sitemap-images.xml</code> for Google Images rank.
                                            </p>
                                        </div>
                                    </label>

                                    <label className="flex items-start gap-3 p-4 rounded-xl bg-background border border-card-border cursor-pointer select-none hover:border-white/20 transition-colors">
                                        <input
                                            type="checkbox"
                                            checked={seoSettings.disallowAdminInRobots}
                                            onChange={(e) =>
                                                setSeoSettings({
                                                    ...seoSettings,
                                                    disallowAdminInRobots: e.target.checked,
                                                })
                                            }
                                            className="mt-1 w-4 h-4 text-primary-glow bg-card-bg border-card-border rounded accent-blue-500"
                                        />
                                        <div>
                                            <p className="text-sm font-bold text-foreground">
                                                Block <code className="font-mono text-xs">/admin</code> &amp; <code className="font-mono text-xs">/api/</code> in <code className="font-mono text-xs">robots.txt</code>
                                            </p>
                                            <p className="text-xs text-foreground/50 mt-0.5 leading-relaxed">
                                                Prevents search engine bots from crawling private administrator routes and internal API endpoints.
                                            </p>
                                        </div>
                                    </label>

                                    <label className="flex items-start gap-3 p-4 rounded-xl bg-background border border-card-border cursor-pointer select-none hover:border-white/20 transition-colors">
                                        <input
                                            type="checkbox"
                                            checked={seoSettings.includeLlmsTxt}
                                            onChange={(e) =>
                                                setSeoSettings({ ...seoSettings, includeLlmsTxt: e.target.checked })
                                            }
                                            className="mt-1 w-4 h-4 text-primary-glow bg-card-bg border-card-border rounded accent-blue-500"
                                        />
                                        <div>
                                            <p className="text-sm font-bold text-foreground">
                                                Generate <code className="font-mono text-xs">/llms.txt</code> for AI Search
                                            </p>
                                            <p className="text-xs text-foreground/50 mt-0.5 leading-relaxed">
                                                Creates a structured markdown index of your site, collections, and top tags for AI search engines.
                                            </p>
                                        </div>
                                    </label>

                                    <label className="flex items-start gap-3 p-4 rounded-xl bg-background border border-card-border cursor-pointer select-none hover:border-white/20 transition-colors">
                                        <input
                                            type="checkbox"
                                            checked={seoSettings.includeManifest}
                                            onChange={(e) =>
                                                setSeoSettings({ ...seoSettings, includeManifest: e.target.checked })
                                            }
                                            className="mt-1 w-4 h-4 text-primary-glow bg-card-bg border-card-border rounded accent-blue-500"
                                        />
                                        <div>
                                            <p className="text-sm font-bold text-foreground">
                                                Generate <code className="font-mono text-xs">/manifest.webmanifest</code>
                                            </p>
                                            <p className="text-xs text-foreground/50 mt-0.5 leading-relaxed">
                                                Generates a progressive web app manifest with dynamic brand name, descriptions, and icon themes.
                                            </p>
                                        </div>
                                    </label>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-foreground/70 uppercase tracking-wider mb-2">
                                        Custom <code className="font-mono">robots.txt</code> Directives (Optional)
                                    </label>
                                    <textarea
                                        rows={3}
                                        value={seoSettings.customRobotsRules}
                                        onChange={(e) =>
                                            setSeoSettings({ ...seoSettings, customRobotsRules: e.target.value })
                                        }
                                        spellCheck={false}
                                        placeholder="# e.g. Crawl-delay: 10 or custom disallow rules"
                                        className="w-full px-4 py-2.5 bg-background border border-card-border rounded-xl text-foreground font-mono text-sm focus:outline-none focus:border-primary-glow resize-y"
                                    />
                                </div>
                            </div>

                            {/* Save Actions Bar */}
                            <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-card-border">
                                <p className="text-xs text-foreground/50">
                                    Sitemaps link automatically to Google, Bing, and major search engine webmaster tools.
                                </p>
                                <div className="flex flex-wrap items-center gap-3">
                                    <button
                                        type="submit"
                                        disabled={savingSeo}
                                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-background border border-card-border hover:border-primary-glow/50 text-foreground font-semibold text-xs rounded-xl transition-all disabled:opacity-50 cursor-pointer"
                                    >
                                        <Save className="w-3.5 h-3.5 text-primary-glow" />
                                        <span>{savingSeo ? 'Saving...' : 'Save Schedule Settings'}</span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={handleGenerateNow}
                                        disabled={generatingSeo}
                                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary-glow hover:bg-blue-600 text-white font-semibold text-xs rounded-xl shadow-lg shadow-primary-glow/20 transition-all hover:-translate-y-0.5 disabled:opacity-50 cursor-pointer"
                                    >
                                        <RefreshCw className={`w-3.5 h-3.5 ${generatingSeo ? 'animate-spin' : ''}`} />
                                        <span>{generatingSeo ? 'Generating...' : 'Save & Regenerate All'}</span>
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>

                <ConfirmDialog
                    isOpen={confirmDialog.isOpen}
                    onClose={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
                    onConfirm={confirmDialog.onConfirm}
                    title={confirmDialog.title}
                    message={confirmDialog.message}
                    confirmText="Yes, Delete"
                    cancelText="Cancel"
                    type="danger"
                />
            </div>
        </AdminLayout>
    );
}
