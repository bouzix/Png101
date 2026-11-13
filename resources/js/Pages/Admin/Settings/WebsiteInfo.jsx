import React, { useState, useEffect } from 'react';
import { Head } from '@inertiajs/react';
import { toast } from 'sonner';
import { Sparkles, Save, RefreshCw } from 'lucide-react';
import AdminLayout from '@/Layouts/AdminLayout';
import SettingsNav from '@/components/admin/SettingsNav';

export default function WebsiteInfoAndSeoSettings() {
    const [seo, setSeo] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [generating, setGenerating] = useState(false);

    useEffect(() => {
        fetch('/api/admin/seo')
            .then(r => r.json())
            .then(data => {
                setSeo(data);
                setLoading(false);
            })
            .catch(() => {
                toast.error('Failed to load SEO settings');
                setLoading(false);
            });
    }, []);

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const res = await fetch('/api/admin/seo', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(seo),
            });
            if (res.ok) toast.success('SEO settings saved');
            else toast.error('Failed to save SEO settings');
        } catch {
            toast.error('Network error');
        } finally {
            setSaving(false);
        }
    };

    const handleGenerate = async () => {
        setGenerating(true);
        try {
            const res = await fetch('/api/admin/seo', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'generate', settings: seo }),
            });
            const data = await res.json();
            if (res.ok) {
                if (data.data) setSeo(data.data);
                toast.success('Sitemaps & robots.txt regenerated!');
            } else {
                toast.error('Failed to generate SEO files');
            }
        } catch {
            toast.error('Network error');
        } finally {
            setGenerating(false);
        }
    };

    return (
        <AdminLayout>
            <Head title="Website Info & SEO - Png101 Admin" />
            <div className="max-w-5xl mx-auto">
                <SettingsNav />

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">SEO &amp; Sitemap Generator</h1>
                        <p className="text-sm text-foreground/60">Manage automated sitemap generation, robots.txt, and search engine indexing.</p>
                    </div>
                    <button
                        type="button"
                        onClick={handleGenerate}
                        disabled={generating || loading}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold cursor-pointer disabled:opacity-50"
                    >
                        <RefreshCw className={`w-4 h-4 ${generating ? 'animate-spin' : ''}`} />
                        {generating ? 'Generating...' : 'Regenerate Sitemaps Now'}
                    </button>
                </div>

                {loading || !seo ? (
                    <div className="p-12 text-center text-foreground/50">Loading SEO settings...</div>
                ) : (
                    <form onSubmit={handleSave} className="bg-card-bg border border-card-border rounded-2xl p-6 space-y-5 shadow-lg">
                        <div className="flex items-center gap-2 font-bold text-foreground">
                            <Sparkles className="w-5 h-5 text-primary-glow" />
                            <span>Sitemap Configuration</span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-foreground/70 mb-1.5">Site URL</label>
                                <input
                                    type="url"
                                    value={seo.siteUrl || ''}
                                    onChange={e => setSeo({ ...seo, siteUrl: e.target.value })}
                                    className="w-full bg-background border border-card-border rounded-xl px-4 py-2.5 text-sm text-foreground"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-foreground/70 mb-1.5">Auto-Generate Schedule</label>
                                <select
                                    value={seo.schedule || 'daily'}
                                    onChange={e => setSeo({ ...seo, schedule: e.target.value })}
                                    className="w-full bg-background border border-card-border rounded-xl px-4 py-2.5 text-sm text-foreground"
                                >
                                    <option value="hourly">Hourly</option>
                                    <option value="daily">Daily</option>
                                    <option value="weekly">Weekly</option>
                                    <option value="manual">Manual Only</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-foreground/70 mb-1.5">Custom robots.txt Rules</label>
                            <textarea
                                rows={5}
                                value={seo.robotsTxt || ''}
                                onChange={e => setSeo({ ...seo, robotsTxt: e.target.value })}
                                className="w-full bg-background border border-card-border rounded-xl p-4 text-xs font-mono text-foreground"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={saving}
                            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary-glow text-white font-semibold text-sm cursor-pointer disabled:opacity-50"
                        >
                            <Save className="w-4 h-4" />
                            {saving ? 'Saving...' : 'Save SEO Settings'}
                        </button>
                    </form>
                )}
            </div>
        </AdminLayout>
    );
}

