import React, { useState, useEffect } from 'react';
import { Head } from '@inertiajs/react';
import { toast } from 'sonner';
import { ShieldAlert, Save } from 'lucide-react';
import AdminLayout from '@/Layouts/AdminLayout';
import SettingsNav from '@/components/admin/SettingsNav';

export default function ErrorPagesSettings() {
    const [settings, setSettings] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetch('/api/admin/error-pages')
            .then(r => r.json())
            .then(data => {
                setSettings(data);
                setLoading(false);
            })
            .catch(() => {
                toast.error('Failed to load error page settings');
                setLoading(false);
            });
    }, []);

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const res = await fetch('/api/admin/error-pages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(settings),
            });
            if (res.ok) toast.success('Error pages & maintenance settings saved');
            else toast.error('Failed to save');
        } catch {
            toast.error('Network error');
        } finally {
            setSaving(false);
        }
    };

    const updateSection = (section, field, value) => {
        setSettings(prev => ({
            ...prev,
            [section]: {
                ...(prev?.[section] || {}),
                [field]: value,
            },
        }));
    };

    return (
        <AdminLayout>
            <Head title="Error Pages & Maintenance - Png101 Admin" />
            <div className="max-w-5xl mx-auto">
                <SettingsNav />

                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-foreground">Error Pages &amp; Maintenance Mode</h1>
                    <p className="text-sm text-foreground/60">Customize 404, 403, and Maintenance Mode pages.</p>
                </div>

                {loading || !settings ? (
                    <div className="p-12 text-center text-foreground/50">Loading...</div>
                ) : (
                    <form onSubmit={handleSave} className="space-y-6">
                        {/* Maintenance Mode */}
                        <div className="bg-card-bg border border-card-border rounded-2xl p-6 space-y-4 shadow-lg">
                            <div className="flex items-center justify-between">
                                <h2 className="font-bold text-foreground flex items-center gap-2">
                                    <ShieldAlert className="w-5 h-5 text-amber-400" />
                                    Maintenance Mode
                                </h2>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={Boolean(settings.maintenance?.enabled)}
                                        onChange={e => updateSection('maintenance', 'enabled', e.target.checked)}
                                        className="w-4 h-4 rounded text-primary-glow"
                                    />
                                    <span className="text-sm font-semibold text-foreground">Enable Maintenance Mode</span>
                                </label>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <input
                                    type="text"
                                    value={settings.maintenance?.title || ''}
                                    onChange={e => updateSection('maintenance', 'title', e.target.value)}
                                    placeholder="Page Title"
                                    className="bg-background border border-card-border rounded-xl px-4 py-2.5 text-sm text-foreground"
                                />
                                <input
                                    type="text"
                                    value={settings.maintenance?.heading || ''}
                                    onChange={e => updateSection('maintenance', 'heading', e.target.value)}
                                    placeholder="Main Heading"
                                    className="bg-background border border-card-border rounded-xl px-4 py-2.5 text-sm text-foreground"
                                />
                            </div>
                            <textarea
                                rows={2}
                                value={settings.maintenance?.message || ''}
                                onChange={e => updateSection('maintenance', 'message', e.target.value)}
                                placeholder="Maintenance message..."
                                className="w-full bg-background border border-card-border rounded-xl px-4 py-2.5 text-sm text-foreground"
                            />
                        </div>

                        {/* 404 Page */}
                        <div className="bg-card-bg border border-card-border rounded-2xl p-6 space-y-4 shadow-lg">
                            <h2 className="font-bold text-foreground">404 Not Found Page</h2>
                            <input
                                type="text"
                                value={settings.notFound?.title || ''}
                                onChange={e => updateSection('notFound', 'title', e.target.value)}
                                placeholder="404 Title"
                                className="w-full bg-background border border-card-border rounded-xl px-4 py-2.5 text-sm text-foreground"
                            />
                            <textarea
                                rows={2}
                                value={settings.notFound?.message || ''}
                                onChange={e => updateSection('notFound', 'message', e.target.value)}
                                placeholder="404 Message"
                                className="w-full bg-background border border-card-border rounded-xl px-4 py-2.5 text-sm text-foreground"
                            />
                        </div>

                        {/* 403 Page */}
                        <div className="bg-card-bg border border-card-border rounded-2xl p-6 space-y-4 shadow-lg">
                            <h2 className="font-bold text-foreground">403 Forbidden Page</h2>
                            <input
                                type="text"
                                value={settings.forbidden?.title || ''}
                                onChange={e => updateSection('forbidden', 'title', e.target.value)}
                                placeholder="403 Title"
                                className="w-full bg-background border border-card-border rounded-xl px-4 py-2.5 text-sm text-foreground"
                            />
                            <textarea
                                rows={2}
                                value={settings.forbidden?.message || ''}
                                onChange={e => updateSection('forbidden', 'message', e.target.value)}
                                placeholder="403 Message"
                                className="w-full bg-background border border-card-border rounded-xl px-4 py-2.5 text-sm text-foreground"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={saving}
                            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary-glow text-white font-semibold text-sm cursor-pointer disabled:opacity-50"
                        >
                            <Save className="w-4 h-4" />
                            {saving ? 'Saving...' : 'Save Error Page Settings'}
                        </button>
                    </form>
                )}
            </div>
        </AdminLayout>
    );
}

