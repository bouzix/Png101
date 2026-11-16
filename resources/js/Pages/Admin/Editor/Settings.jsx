import React, { useState } from 'react';
import { Head } from '@inertiajs/react';
import { Settings, Save } from 'lucide-react';
import { toast } from 'sonner';
import AdminLayout from '../../../Layouts/AdminLayout';
import { GlassCard } from '../../../components/ui/GlassCard';

export default function EditorSettingsAdmin({ initialSettings = {} }) {
    const [form, setForm] = useState(initialSettings);
    const [saving, setSaving] = useState(false);

    const toggle = (key) => setForm((prev) => ({ ...prev, [key]: !prev[key] }));

    const toggleFormat = (fmt) => {
        setForm((prev) => {
            const list = Array.isArray(prev.allowedExportFormats) ? prev.allowedExportFormats : ['png'];
            const exists = list.includes(fmt);
            const next = exists ? list.filter((f) => f !== fmt) : [...list, fmt];
            return { ...prev, allowedExportFormats: next.length ? next : ['png'] };
        });
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const res = await fetch('/api/admin/editor/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to save settings');
            setForm(data.settings);
            toast.success('Editor settings saved');
        } catch (err) {
            toast.error(err.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <AdminLayout>
            <Head title="Editor Settings" />
            <form onSubmit={handleSave} className="w-full space-y-8 animate-in fade-in duration-300">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-3">
                            <Settings className="w-7 h-7 text-primary-glow shrink-0" />
                            <span>Image Editor Settings</span>
                        </h1>
                        <p className="text-sm text-foreground/55 mt-1">
                            Control public visibility, canvas limits, allowed export formats, studio features, and SEO metadata.
                        </p>
                    </div>
                    <div className="inline-flex items-center p-1 bg-card-header-bg border border-card-border rounded-xl">
                        <button
                            type="submit"
                            disabled={saving}
                            className="h-8 inline-flex items-center gap-2 px-4 rounded-lg bg-primary-glow hover:bg-blue-600 text-white text-xs font-bold shadow-sm cursor-pointer disabled:opacity-50 transition-all"
                        >
                            <Save className="w-3.5 h-3.5" />
                            <span>{saving ? 'Saving...' : 'Save Settings'}</span>
                        </button>
                    </div>
                </div>

                {/* Availability & Navigation */}
                <GlassCard className="p-5 space-y-4 shadow-none">
                    <div className="flex items-center justify-between gap-2">
                        <div>
                            <h2 className="text-sm font-bold text-foreground">Frontend Activation &amp; Menu Links</h2>
                            <p className="text-[11px] text-foreground/55">Activate `/image-editor` on the public website and choose which menus display the Editor link.</p>
                        </div>
                        <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${form.enabled ? 'bg-emerald-500/15 text-emerald-500' : 'bg-rose-500/15 text-rose-500'}`}>
                            {form.enabled ? 'Frontend Active' : 'Disabled for Visitors'}
                        </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {[
                            { key: 'enabled', label: 'Activate Frontend Image Editor (/image-editor)', desc: 'Make the studio accessible to public visitors on the frontend.' },
                            { key: 'showInPublicNav', label: 'Show Editor Link in Top Navbar', desc: 'Display the Editor link inside the public top navigation bar.' },
                            { key: 'showInFooter', label: 'Show Editor Link in Website Footer', desc: 'Display the Editor link inside the public website footer menus.' },
                            { key: 'showEditInStudioButton', label: 'Show "Edit in Studio" on PNG Pages', desc: 'Place a direct studio launcher button on every published PNG detail page.' },
                            { key: 'defaultTransparentBg', label: 'Transparent Canvas by Default', desc: 'Start blank designs on a transparent PNG artboard instead of solid white.' },
                        ].map((item) => {
                            const checked = Boolean(form[item.key]);
                            return (
                                <button
                                    key={item.key}
                                    type="button"
                                    onClick={() => toggle(item.key)}
                                    aria-pressed={checked}
                                    className="text-left flex items-start justify-between gap-4 p-3.5 rounded-xl bg-foreground/[0.025] hover:bg-foreground/[0.04] border border-card-border cursor-pointer transition-colors"
                                >
                                    <div>
                                        <div className="text-xs font-bold text-foreground">{item.label}</div>
                                        <div className="text-[11px] text-foreground/55 mt-0.5">{item.desc}</div>
                                    </div>
                                    <span className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors mt-0.5 ${checked ? 'bg-blue-600' : 'bg-slate-400/40 dark:bg-slate-700'}`}>
                                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition ${checked ? 'translate-x-4' : 'translate-x-0'}`} />
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-foreground/80 mb-1.5">Public Menu Link Label</label>
                        <input
                            type="text"
                            value={form.navLabel || ''}
                            onChange={(e) => setForm((p) => ({ ...p, navLabel: e.target.value }))}
                            className="w-full sm:w-72 px-3 py-2 rounded-xl bg-input-bg border border-input-border text-xs text-foreground"
                        />
                    </div>
                </GlassCard>

                {/* Canvas Limits & Export Defaults */}
                <GlassCard className="p-5 space-y-4 shadow-none">
                    <h2 className="text-sm font-bold text-foreground">Canvas Limits &amp; Export Rules</h2>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                        {[
                            { key: 'defaultWidth', label: 'Default Width (px)' },
                            { key: 'defaultHeight', label: 'Default Height (px)' },
                            { key: 'maxCanvasWidth', label: 'Max Width (px)' },
                            { key: 'maxCanvasHeight', label: 'Max Height (px)' },
                            { key: 'maxPagesPerProject', label: 'Max Pages' },
                        ].map((field) => (
                            <div key={field.key}>
                                <label className="block text-[11px] font-bold text-foreground/70 mb-1">{field.label}</label>
                                <input
                                    type="number"
                                    value={form[field.key] ?? ''}
                                    onChange={(e) => setForm((p) => ({ ...p, [field.key]: Number(e.target.value) }))}
                                    className="w-full px-3 py-2 rounded-xl bg-input-bg border border-input-border text-xs font-mono text-foreground"
                                />
                            </div>
                        ))}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                        <div>
                            <label className="block text-xs font-bold text-foreground/80 mb-2">Allowed Export Formats</label>
                            <div className="inline-flex flex-wrap items-center gap-1 p-1 bg-card-header-bg border border-card-border rounded-xl">
                                {['png', 'jpeg', 'webp', 'svg'].map((fmt) => {
                                    const active = (form.allowedExportFormats || []).includes(fmt);
                                    return (
                                        <button
                                            key={fmt}
                                            type="button"
                                            onClick={() => toggleFormat(fmt)}
                                            className={`h-7 px-3 rounded-lg text-xs font-bold uppercase cursor-pointer transition-all ${
                                                active
                                                    ? 'bg-primary-glow text-white shadow-sm'
                                                    : 'bg-card-bg text-foreground/60 hover:text-foreground shadow-sm'
                                            }`}
                                        >
                                            {fmt}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-foreground/80 mb-2">
                                Default Compression Quality ({form.defaultExportQuality ?? 92}%)
                            </label>
                            <input
                                type="range"
                                min={10}
                                max={100}
                                value={form.defaultExportQuality ?? 92}
                                onChange={(e) => setForm((p) => ({ ...p, defaultExportQuality: Number(e.target.value) }))}
                                className="w-full accent-blue-600 cursor-pointer"
                            />
                        </div>
                    </div>
                </GlassCard>

                {/* Studio Modules */}
                <GlassCard className="p-5 space-y-4 shadow-none">
                    <h2 className="text-sm font-bold text-foreground">Studio Feature Toggles</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {[
                            { key: 'enableBgRemover', label: '1-Click AI Background Remover (Uploads)' },
                            { key: 'enableFreehandDraw', label: 'Freehand Vector Drawing & Brush Tool' },
                            { key: 'enableSvgExport', label: 'Vector SVG Export' },
                            { key: 'enableAutosave', label: 'Browser IndexedDB Auto-Save' },
                        ].map((item) => (
                            <label key={item.key} className="flex items-center justify-between p-3 rounded-xl bg-foreground/[0.025] border border-card-border cursor-pointer">
                                <span className="text-xs font-semibold text-foreground">{item.label}</span>
                                <input
                                    type="checkbox"
                                    checked={Boolean(form[item.key])}
                                    onChange={() => toggle(item.key)}
                                    className="w-4 h-4 accent-blue-600 cursor-pointer"
                                />
                            </label>
                        ))}
                    </div>
                </GlassCard>

                {/* SEO */}
                <GlassCard className="p-5 space-y-3 shadow-none">
                    <h2 className="text-sm font-bold text-foreground">Editor Page SEO</h2>
                    <div>
                        <label className="block text-xs font-bold text-foreground/75 mb-1">SEO Page Title</label>
                        <input
                            type="text"
                            value={form.seoTitle || ''}
                            onChange={(e) => setForm((p) => ({ ...p, seoTitle: e.target.value }))}
                            className="w-full px-3 py-2 rounded-xl bg-input-bg border border-input-border text-xs text-foreground"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-foreground/75 mb-1">SEO Meta Description</label>
                        <textarea
                            rows={2}
                            value={form.seoDescription || ''}
                            onChange={(e) => setForm((p) => ({ ...p, seoDescription: e.target.value }))}
                            className="w-full px-3 py-2 rounded-xl bg-input-bg border border-input-border text-xs text-foreground"
                        />
                    </div>
                </GlassCard>
            </form>
        </AdminLayout>
    );
}
