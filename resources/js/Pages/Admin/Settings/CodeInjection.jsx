import React, { useState, useEffect } from 'react';
import { Head } from '@inertiajs/react';
import { toast } from 'sonner';
import { Code, Save } from 'lucide-react';
import AdminLayout from '@/Layouts/AdminLayout';
import SettingsNav from '@/components/admin/SettingsNav';

export default function CodeInjectionSettings() {
    const [headCode, setHeadCode] = useState('');
    const [bodyStartCode, setBodyStartCode] = useState('');
    const [footerCode, setFooterCode] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetch('/api/admin/code-injection')
            .then(r => r.json())
            .then(data => {
                setHeadCode(data.headCode || '');
                setBodyStartCode(data.bodyStartCode || '');
                setFooterCode(data.footerCode || '');
                setLoading(false);
            })
            .catch(() => {
                toast.error('Failed to load code injection settings');
                setLoading(false);
            });
    }, []);

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const res = await fetch('/api/admin/code-injection', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ headCode, bodyStartCode, footerCode }),
            });
            if (res.ok) {
                toast.success('Code injection settings saved');
            } else {
                toast.error('Failed to save');
            }
        } catch {
            toast.error('Network error');
        } finally {
            setSaving(false);
        }
    };

    return (
        <AdminLayout>
            <Head title="Code Injection - Png101 Admin" />
            <div className="max-w-5xl mx-auto">
                <SettingsNav />

                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-foreground">Code Injection</h1>
                    <p className="text-sm text-foreground/60">Inject custom HTML, analytics scripts, or verification meta tags into your site.</p>
                </div>

                {loading ? (
                    <div className="p-12 text-center text-foreground/50">Loading...</div>
                ) : (
                    <form onSubmit={handleSave} className="space-y-6">
                        <div className="bg-card-bg border border-card-border rounded-2xl p-6 space-y-5 shadow-lg">
                            <div>
                                <label className="block text-xs font-bold text-foreground/70 uppercase tracking-wider mb-2">
                                    Header Code (&lt;head&gt;)
                                </label>
                                <textarea
                                    rows={5}
                                    value={headCode}
                                    onChange={e => setHeadCode(e.target.value)}
                                    placeholder="<!-- Google Analytics, Meta Tags, Custom CSS -->"
                                    className="w-full bg-background border border-card-border rounded-xl p-4 text-xs font-mono text-foreground"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-foreground/70 uppercase tracking-wider mb-2">
                                    Body Start Code (&lt;body&gt;)
                                </label>
                                <textarea
                                    rows={4}
                                    value={bodyStartCode}
                                    onChange={e => setBodyStartCode(e.target.value)}
                                    placeholder="<!-- Google Tag Manager (noscript), etc. -->"
                                    className="w-full bg-background border border-card-border rounded-xl p-4 text-xs font-mono text-foreground"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-foreground/70 uppercase tracking-wider mb-2">
                                    Footer Code (&lt;/body&gt;)
                                </label>
                                <textarea
                                    rows={4}
                                    value={footerCode}
                                    onChange={e => setFooterCode(e.target.value)}
                                    placeholder="<!-- Custom scripts before closing body tag -->"
                                    className="w-full bg-background border border-card-border rounded-xl p-4 text-xs font-mono text-foreground"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={saving}
                            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary-glow text-white font-semibold text-sm cursor-pointer disabled:opacity-50"
                        >
                            <Save className="w-4 h-4" />
                            {saving ? 'Saving...' : 'Save Code Injection'}
                        </button>
                    </form>
                )}
            </div>
        </AdminLayout>
    );
}

