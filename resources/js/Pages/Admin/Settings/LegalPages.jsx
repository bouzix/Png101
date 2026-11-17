import React, { useState } from 'react';
import { Head } from '@inertiajs/react';
import { toast } from 'sonner';
import {
    FileText,
    Mail,
    Scale,
    ShieldCheck,
    ShieldAlert,
    Save,
    RotateCcw,
    ExternalLink,
    Plus,
    Trash2,
    ArrowUp,
    ArrowDown,
    Sparkles,
    Info,
} from 'lucide-react';
import AdminLayout from '../../../Layouts/AdminLayout';
import RichTextEditor from '../../../components/admin/RichTextEditor';
import StudioSelect from '../../../components/ui/StudioSelect';

const PAGE_TABS = [
    {
        key: 'aboutUs',
        label: 'About Us',
        href: '/about-us',
        icon: FileText,
        description: 'Mission story, 4 highlight cards, and CTA banner.',
    },
    {
        key: 'contactUs',
        label: 'Contact Us',
        href: '/contact-us',
        icon: Mail,
        description: 'Support & DMCA cards, organization info, and form copy.',
    },
    {
        key: 'termsOfService',
        label: 'Terms of Service',
        href: '/terms-of-service',
        icon: Scale,
        description: 'Header and numbered legal agreement sections.',
    },
    {
        key: 'privacyPolicy',
        label: 'Privacy Policy',
        href: '/privacy-policy',
        icon: ShieldCheck,
        description: 'Data collection, cookies, and privacy rights sections.',
    },
    {
        key: 'dmcaPolicy',
        label: 'DMCA Policy',
        href: '/dmca-policy',
        icon: ShieldAlert,
        description: 'Copyright compliance, takedown steps, and agent contact.',
    },
];

const HIGHLIGHT_ICON_OPTIONS = [
    { value: 'sparkles', label: 'Sparkles (Transparency)' },
    { value: 'search', label: 'Search (Fast Discovery)' },
    { value: 'download', label: 'Download (Instant Files)' },
    { value: 'shield-check', label: 'Shield Check (Quality & Care)' },
];

function InputField({ label, value, onChange, placeholder = '', hint = '' }) {
    return (
        <div>
            <label className="block text-xs font-semibold text-foreground/75 mb-1.5">
                {label}
            </label>
            <input
                type="text"
                value={value || ''}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-card-border text-sm text-foreground focus:outline-none focus:border-blue-500 transition-colors"
            />
            {hint && <p className="text-[11px] text-foreground/45 mt-1">{hint}</p>}
        </div>
    );
}

export default function LegalPagesSettingsPage({ initialConfig = {}, defaults = {} }) {
    const [config, setConfig] = useState(() => initialConfig);
    const [activeTab, setActiveTab] = useState('aboutUs');
    const [saving, setSaving] = useState(false);
    const [resetting, setResetting] = useState(false);
    const [confirmReset, setConfirmReset] = useState(false);

    const activeTabMeta = PAGE_TABS.find((t) => t.key === activeTab) || PAGE_TABS[0];
    const currentPage = config?.[activeTab] || defaults?.[activeTab] || {};

    const updatePageField = (pageKey, field, val) => {
        setConfig((prev) => ({
            ...prev,
            [pageKey]: {
                ...(prev[pageKey] || {}),
                [field]: val,
            },
        }));
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const res = await fetch('/api/admin/legal-pages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ legalPages: config }),
            });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data?.error || 'Failed to save legal pages');
            }
            if (data?.legalPages) {
                setConfig(data.legalPages);
            }
            toast.success(`${activeTabMeta.label} & legal pages saved cleanly!`);
        } catch (err) {
            toast.error(err?.message || 'Failed to save legal pages');
        } finally {
            setSaving(false);
        }
    };

    const handleResetPage = async () => {
        setResetting(true);
        try {
            const res = await fetch('/api/admin/legal-pages/reset', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pageKey: activeTab }),
            });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data?.error || 'Failed to reset page');
            }
            if (data?.legalPages) {
                setConfig(data.legalPages);
            } else if (defaults?.[activeTab]) {
                setConfig((prev) => ({ ...prev, [activeTab]: defaults[activeTab] }));
            }
            setConfirmReset(false);
            toast.success(`${activeTabMeta.label} restored to default text & formatting.`);
        } catch (err) {
            toast.error(err?.message || 'Failed to reset page');
        } finally {
            setResetting(false);
        }
    };

    // --- Section list helpers (Terms / Privacy / DMCA) ---
    const updateSection = (idx, field, val) => {
        const nextSections = [...(currentPage.sections || [])];
        nextSections[idx] = { ...nextSections[idx], [field]: val };
        updatePageField(activeTab, 'sections', nextSections);
    };

    const moveSection = (idx, dir) => {
        const list = [...(currentPage.sections || [])];
        const target = idx + dir;
        if (target < 0 || target >= list.length) return;
        [list[idx], list[target]] = [list[target], list[idx]];
        updatePageField(activeTab, 'sections', list);
    };

    const addSection = () => {
        const list = [...(currentPage.sections || [])];
        list.push({
            id: `section-${Date.now()}`,
            heading: `${list.length + 1}. New Section`,
            bodyHtml: '<p>Enter section details here...</p>',
        });
        updatePageField(activeTab, 'sections', list);
    };

    const removeSection = (idx) => {
        const list = [...(currentPage.sections || [])];
        if (list.length <= 1) {
            toast.error('At least one section is required.');
            return;
        }
        list.splice(idx, 1);
        updatePageField(activeTab, 'sections', list);
    };

    // --- Highlight card helpers (About Us) ---
    const updateHighlight = (idx, field, val) => {
        const list = [...(currentPage.highlights || [])];
        list[idx] = { ...list[idx], [field]: val };
        updatePageField('aboutUs', 'highlights', list);
    };

    const addHighlight = () => {
        const list = [...(currentPage.highlights || [])];
        list.push({
            id: `highlight-${Date.now()}`,
            icon: 'sparkles',
            title: 'New Feature Card',
            descriptionHtml: '<p>Describe this benefit here...</p>',
        });
        updatePageField('aboutUs', 'highlights', list);
    };

    const removeHighlight = (idx) => {
        const list = [...(currentPage.highlights || [])];
        if (list.length <= 1) {
            toast.error('Keep at least one highlight card.');
            return;
        }
        list.splice(idx, 1);
        updatePageField('aboutUs', 'highlights', list);
    };

    const isDocumentStylePage =
        activeTab === 'termsOfService' ||
        activeTab === 'privacyPolicy' ||
        activeTab === 'dmcaPolicy';

    return (
        <AdminLayout>
            <Head title="Legal Pages Settings - Png101 Admin" />

            <div className="space-y-6 pb-24">
                {/* Page Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-1 flex items-center gap-3">
                            <Scale className="w-7 h-7 text-primary-glow shrink-0" />
                            <span>Legal &amp; Info Pages</span>
                        </h1>
                        <p className="text-foreground/60 text-sm">
                            Edit content across About Us, Contact Us, Terms of Service, Privacy Policy, and DMCA Policy while keeping bold, italic, links, and lists intact.
                        </p>
                    </div>

                    <div className="inline-flex flex-wrap items-center gap-1 p-1 bg-card-header-bg border border-card-border rounded-xl self-start sm:self-auto shrink-0">
                        <a
                            href={activeTabMeta.href}
                            target="_blank"
                            rel="noreferrer"
                            className="h-8 inline-flex items-center gap-2 px-3.5 rounded-lg bg-card-bg hover:bg-foreground/5 text-xs font-bold text-foreground/85 hover:text-foreground transition-all shadow-sm"
                        >
                            <ExternalLink className="w-3.5 h-3.5 text-primary-glow" />
                            <span>View {activeTabMeta.label}</span>
                        </a>

                        {confirmReset ? (
                            <div className="inline-flex items-center gap-1.5 px-2.5 h-8 rounded-lg bg-amber-500/15 border border-amber-500/30">
                                <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                                    Reset {activeTabMeta.label}?
                                </span>
                                <button
                                    type="button"
                                    disabled={resetting}
                                    onClick={handleResetPage}
                                    className="px-2 py-0.5 rounded bg-amber-500 text-white text-[11px] font-bold hover:bg-amber-600 cursor-pointer disabled:opacity-50"
                                >
                                    {resetting ? '...' : 'Confirm'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setConfirmReset(false)}
                                    className="px-2 py-0.5 rounded bg-background text-foreground/70 text-[11px] font-semibold hover:text-foreground cursor-pointer"
                                >
                                    Cancel
                                </button>
                            </div>
                        ) : (
                            <button
                                type="button"
                                onClick={() => setConfirmReset(true)}
                                className="h-8 inline-flex items-center gap-1.5 px-3.5 rounded-lg bg-card-bg hover:bg-foreground/5 text-xs font-bold text-foreground/80 hover:text-amber-500 transition-all shadow-sm cursor-pointer"
                            >
                                <RotateCcw className="w-3.5 h-3.5" />
                                <span>Reset Page</span>
                            </button>
                        )}

                        <button
                            type="button"
                            onClick={handleSave}
                            disabled={saving}
                            className="h-8 inline-flex items-center gap-2 px-4 rounded-lg bg-primary-glow hover:bg-blue-600 disabled:opacity-50 text-white font-bold text-xs shadow-sm transition-all cursor-pointer"
                        >
                            <Save className="w-3.5 h-3.5" />
                            <span>{saving ? 'Saving...' : 'Save Changes'}</span>
                        </button>
                    </div>
                </div>

                {/* Page Tabs */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                    {PAGE_TABS.map((tab) => {
                        const Icon = tab.icon;
                        const active = activeTab === tab.key;
                        return (
                            <button
                                key={tab.key}
                                type="button"
                                onClick={() => {
                                    setActiveTab(tab.key);
                                    setConfirmReset(false);
                                }}
                                className={`text-left p-3.5 rounded-xl border transition-all cursor-pointer ${
                                    active
                                        ? 'bg-blue-500/10 border-blue-500 text-foreground shadow-sm'
                                        : 'bg-card-bg border-card-border text-foreground/70 hover:border-blue-500/40 hover:text-foreground'
                                }`}
                            >
                                <div className="flex items-center gap-2 mb-1">
                                    <Icon
                                        className={`w-4 h-4 shrink-0 ${
                                            active ? 'text-blue-500' : 'text-foreground/50'
                                        }`}
                                    />
                                    <span className="text-xs font-bold truncate">{tab.label}</span>
                                </div>
                                <p className="text-[11px] text-foreground/50 line-clamp-2">
                                    {tab.description}
                                </p>
                            </button>
                        );
                    })}
                </div>

                {/* Safe Formatting Helper Notice */}
                <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-blue-500/5 border border-blue-500/20 text-xs text-foreground/75">
                    <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                        <p>
                            All existing <strong>bold</strong>, <em>italic</em>, bullet lists, numbered lists, and links are pre-loaded in the Visual Editor below so nothing gets overwritten. Use the toolbar buttons to style text or toggle <code className="px-1 py-0.5 rounded bg-background border border-card-border">&lt;/&gt; HTML</code> anytime.
                        </p>
                        <p className="text-[11px] text-foreground/55">
                            Dynamic placeholders like <code className="px-1 rounded bg-background">{'{{websiteName}}'}</code>, <code className="px-1 rounded bg-background">{'{{companyName}}'}</code>, <code className="px-1 rounded bg-background">{'{{contactEmail}}'}</code>, <code className="px-1 rounded bg-background">{'{{dmcaEmail}}'}</code>, and <code className="px-1 rounded bg-background">{'{{country}}'}</code> automatically pull live values from your General / Website Info settings.
                        </p>
                    </div>
                </div>

                {/* ACTIVE TAB FORMS */}
                {activeTab === 'aboutUs' && (
                    <div className="space-y-6">
                        {/* Hero Header Card */}
                        <div className="bg-card-bg border border-card-border rounded-2xl p-6 space-y-4">
                            <h2 className="text-base font-bold text-foreground">Hero Header</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <InputField
                                    label="Top Badge"
                                    value={currentPage.heroBadge}
                                    onChange={(v) => updatePageField('aboutUs', 'heroBadge', v)}
                                    placeholder="Established {{foundedYear}}"
                                />
                                <InputField
                                    label="Main Page Heading (H1)"
                                    value={currentPage.heroTitle}
                                    onChange={(v) => updatePageField('aboutUs', 'heroTitle', v)}
                                    placeholder="About {{websiteName}}"
                                />
                            </div>
                            <InputField
                                label="Hero Subtitle"
                                value={currentPage.heroSubtitle}
                                onChange={(v) => updatePageField('aboutUs', 'heroSubtitle', v)}
                                placeholder="{{tagline}}"
                            />
                        </div>

                        {/* Our Mission Card */}
                        <div className="bg-card-bg border border-card-border rounded-2xl p-6 space-y-4">
                            <InputField
                                label="Mission Card Heading"
                                value={currentPage.missionTitle}
                                onChange={(v) => updatePageField('aboutUs', 'missionTitle', v)}
                            />
                            <div>
                                <label className="block text-xs font-semibold text-foreground/75 mb-1.5">
                                    Mission Body Content (Rich Text)
                                </label>
                                <RichTextEditor
                                    value={currentPage.missionBodyHtml}
                                    onChange={(v) => updatePageField('aboutUs', 'missionBodyHtml', v)}
                                    minHeightClass="min-h-[160px]"
                                />
                            </div>
                        </div>

                        {/* Feature Highlights Grid */}
                        <div className="bg-card-bg border border-card-border rounded-2xl p-6 space-y-4">
                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    <h2 className="text-base font-bold text-foreground">
                                        Feature Cards ({(currentPage.highlights || []).length})
                                    </h2>
                                    <p className="text-xs text-foreground/55">
                                        Cards displayed in the 2-column feature grid on /about-us.
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={addHighlight}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-500 text-xs font-semibold hover:bg-blue-500/20 cursor-pointer"
                                >
                                    <Plus className="w-3.5 h-3.5" />
                                    <span>Add Card</span>
                                </button>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                                {(currentPage.highlights || []).map((item, idx) => (
                                    <div
                                        key={item.id || idx}
                                        className="rounded-xl border border-card-border bg-background/50 p-4 space-y-3"
                                    >
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="text-xs font-bold text-blue-500 flex items-center gap-1.5">
                                                <Sparkles className="w-3.5 h-3.5" />
                                                <span>Card #{idx + 1}</span>
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => removeHighlight(idx)}
                                                className="p-1.5 rounded-lg text-foreground/50 hover:text-red-500 hover:bg-red-500/10 cursor-pointer"
                                                title="Remove Card"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            <InputField
                                                label="Card Title"
                                                value={item.title}
                                                onChange={(v) => updateHighlight(idx, 'title', v)}
                                            />
                                            <div>
                                                <label className="block text-xs font-semibold text-foreground/75 mb-1.5">
                                                    Icon
                                                </label>
                                                <StudioSelect
                                                    value={item.icon || 'sparkles'}
                                                    onChange={(e) =>
                                                        updateHighlight(
                                                            idx,
                                                            'icon',
                                                            e?.target?.value ?? e
                                                        )
                                                    }
                                                    options={HIGHLIGHT_ICON_OPTIONS}
                                                    className="w-full h-[42px] rounded-xl bg-background border-card-border text-foreground"
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-semibold text-foreground/75 mb-1.5">
                                                Description
                                            </label>
                                            <RichTextEditor
                                                value={item.descriptionHtml}
                                                onChange={(v) => updateHighlight(idx, 'descriptionHtml', v)}
                                                minHeightClass="min-h-[100px]"
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* CTA Banner */}
                        <div className="bg-card-bg border border-card-border rounded-2xl p-6 space-y-4">
                            <h2 className="text-base font-bold text-foreground">Bottom CTA Banner</h2>
                            <InputField
                                label="CTA Heading"
                                value={currentPage.ctaTitle}
                                onChange={(v) => updatePageField('aboutUs', 'ctaTitle', v)}
                            />
                            <div>
                                <label className="block text-xs font-semibold text-foreground/75 mb-1.5">
                                    CTA Subtitle
                                </label>
                                <RichTextEditor
                                    value={currentPage.ctaSubtitleHtml}
                                    onChange={(v) => updatePageField('aboutUs', 'ctaSubtitleHtml', v)}
                                    minHeightClass="min-h-[90px]"
                                />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <InputField
                                    label="Primary Button Text"
                                    value={currentPage.ctaPrimaryText}
                                    onChange={(v) => updatePageField('aboutUs', 'ctaPrimaryText', v)}
                                />
                                <InputField
                                    label="Secondary Button Text"
                                    value={currentPage.ctaSecondaryText}
                                    onChange={(v) => updatePageField('aboutUs', 'ctaSecondaryText', v)}
                                />
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'contactUs' && (
                    <div className="space-y-6">
                        <div className="bg-card-bg border border-card-border rounded-2xl p-6 space-y-4">
                            <h2 className="text-base font-bold text-foreground">Hero Header</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <InputField
                                    label="Top Badge"
                                    value={currentPage.heroBadge}
                                    onChange={(v) => updatePageField('contactUs', 'heroBadge', v)}
                                />
                                <InputField
                                    label="Page Heading (H1)"
                                    value={currentPage.heroTitle}
                                    onChange={(v) => updatePageField('contactUs', 'heroTitle', v)}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-foreground/75 mb-1.5">
                                    Page Subtitle
                                </label>
                                <RichTextEditor
                                    value={currentPage.heroSubtitleHtml}
                                    onChange={(v) => updatePageField('contactUs', 'heroSubtitleHtml', v)}
                                    minHeightClass="min-h-[90px]"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                            <div className="bg-card-bg border border-card-border rounded-2xl p-5 space-y-4">
                                <InputField
                                    label="Support Card Title"
                                    value={currentPage.supportTitle}
                                    onChange={(v) => updatePageField('contactUs', 'supportTitle', v)}
                                />
                                <div>
                                    <label className="block text-xs font-semibold text-foreground/75 mb-1.5">
                                        Support Description
                                    </label>
                                    <RichTextEditor
                                        value={currentPage.supportDescriptionHtml}
                                        onChange={(v) => updatePageField('contactUs', 'supportDescriptionHtml', v)}
                                        minHeightClass="min-h-[100px]"
                                    />
                                </div>
                            </div>

                            <div className="bg-card-bg border border-card-border rounded-2xl p-5 space-y-4">
                                <InputField
                                    label="DMCA Card Title"
                                    value={currentPage.dmcaTitle}
                                    onChange={(v) => updatePageField('contactUs', 'dmcaTitle', v)}
                                />
                                <div>
                                    <label className="block text-xs font-semibold text-foreground/75 mb-1.5">
                                        DMCA Description
                                    </label>
                                    <RichTextEditor
                                        value={currentPage.dmcaDescriptionHtml}
                                        onChange={(v) => updatePageField('contactUs', 'dmcaDescriptionHtml', v)}
                                        minHeightClass="min-h-[100px]"
                                    />
                                </div>
                            </div>

                            <div className="bg-card-bg border border-card-border rounded-2xl p-5 space-y-4">
                                <InputField
                                    label="Organization Card Title"
                                    value={currentPage.orgTitle}
                                    onChange={(v) => updatePageField('contactUs', 'orgTitle', v)}
                                />
                                <div>
                                    <label className="block text-xs font-semibold text-foreground/75 mb-1.5">
                                        Optional Extra Note (below Company &amp; Location)
                                    </label>
                                    <RichTextEditor
                                        value={currentPage.orgNoteHtml}
                                        onChange={(v) => updatePageField('contactUs', 'orgNoteHtml', v)}
                                        minHeightClass="min-h-[100px]"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="bg-card-bg border border-card-border rounded-2xl p-6 space-y-4">
                            <h2 className="text-base font-bold text-foreground">Message Form Card</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <InputField
                                    label="Form Heading"
                                    value={currentPage.formTitle}
                                    onChange={(v) => updatePageField('contactUs', 'formTitle', v)}
                                />
                                <InputField
                                    label="Submit Button Text"
                                    value={currentPage.submitButtonText}
                                    onChange={(v) => updatePageField('contactUs', 'submitButtonText', v)}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-foreground/75 mb-1.5">
                                    Form Subtitle
                                </label>
                                <RichTextEditor
                                    value={currentPage.formSubtitleHtml}
                                    onChange={(v) => updatePageField('contactUs', 'formSubtitleHtml', v)}
                                    minHeightClass="min-h-[90px]"
                                />
                            </div>
                        </div>
                    </div>
                )}

                {isDocumentStylePage && (
                    <div className="space-y-6">
                        <div className="bg-card-bg border border-card-border rounded-2xl p-6 space-y-4">
                            <h2 className="text-base font-bold text-foreground">Page Header</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <InputField
                                    label="Badge Label"
                                    value={currentPage.badge}
                                    onChange={(v) => updatePageField(activeTab, 'badge', v)}
                                />
                                <InputField
                                    label="Page Heading (H1)"
                                    value={currentPage.title}
                                    onChange={(v) => updatePageField(activeTab, 'title', v)}
                                />
                            </div>
                            <InputField
                                label="Subtitle Line"
                                value={currentPage.subtitle}
                                onChange={(v) => updatePageField(activeTab, 'subtitle', v)}
                            />
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center justify-between gap-3">
                                <h2 className="text-base font-bold text-foreground">
                                    Sections ({(currentPage.sections || []).length})
                                </h2>
                                <button
                                    type="button"
                                    onClick={addSection}
                                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-500 text-xs font-bold hover:bg-blue-500/20 cursor-pointer"
                                >
                                    <Plus className="w-3.5 h-3.5" />
                                    <span>Add Section</span>
                                </button>
                            </div>

                            {(currentPage.sections || []).map((section, idx) => (
                                <div
                                    key={section.id || idx}
                                    className="bg-card-bg border border-card-border rounded-2xl p-5 space-y-4"
                                >
                                    <div className="flex items-center justify-between gap-3">
                                        <span className="text-xs font-bold uppercase tracking-wider text-blue-500">
                                            Section {idx + 1}
                                        </span>
                                        <div className="flex items-center gap-1.5">
                                            {activeTab === 'dmcaPolicy' && (
                                                <label className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-card-border bg-background text-[11px] font-semibold text-foreground/80 mr-2 cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={Boolean(section.showContactCard)}
                                                        onChange={(e) =>
                                                            updateSection(
                                                                idx,
                                                                'showContactCard',
                                                                e.target.checked
                                                            )
                                                        }
                                                        className="rounded accent-blue-500"
                                                    />
                                                    <span>Show DMCA Contact Box</span>
                                                </label>
                                            )}
                                            <button
                                                type="button"
                                                onClick={() => moveSection(idx, -1)}
                                                disabled={idx === 0}
                                                className="p-1.5 rounded-lg border border-card-border bg-background text-foreground/70 hover:text-foreground disabled:opacity-30 cursor-pointer"
                                                title="Move Up"
                                            >
                                                <ArrowUp className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => moveSection(idx, 1)}
                                                disabled={idx === (currentPage.sections || []).length - 1}
                                                className="p-1.5 rounded-lg border border-card-border bg-background text-foreground/70 hover:text-foreground disabled:opacity-30 cursor-pointer"
                                                title="Move Down"
                                            >
                                                <ArrowDown className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => removeSection(idx)}
                                                className="p-1.5 rounded-lg border border-card-border bg-background text-foreground/60 hover:text-red-500 hover:border-red-500/40 cursor-pointer"
                                                title="Delete Section"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>

                                    <InputField
                                        label="Section Heading"
                                        value={section.heading}
                                        onChange={(v) => updateSection(idx, 'heading', v)}
                                    />

                                    <div>
                                        <label className="block text-xs font-semibold text-foreground/75 mb-1.5">
                                            Section Content (Rich Text — Bold, Italic, Lists &amp; Links preserved)
                                        </label>
                                        <RichTextEditor
                                            value={section.bodyHtml}
                                            onChange={(v) => updateSection(idx, 'bodyHtml', v)}
                                            minHeightClass="min-h-[150px]"
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </AdminLayout>
    );
}
