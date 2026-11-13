import { useEffect, useState } from 'react';
import { Head } from '@inertiajs/react';
import { toast } from 'sonner';
import { Code2, Save, FileCode, Terminal, Sparkles } from 'lucide-react';
import AdminLayout from '../../../Layouts/AdminLayout';
import { StatCard } from '../../../components/ui/StatCard';

export default function CodeInjectionPage() {
    const [formData, setFormData] = useState({
        headCode: '',
        bodyCode: '',
        footerCode: '',
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetch('/api/admin/code-injection')
            .then((res) => res.json())
            .then((data) => {
                setFormData({
                    headCode: data.headCode || '',
                    bodyCode: data.bodyCode || '',
                    footerCode: data.footerCode || '',
                });
                setLoading(false);
            })
            .catch((err) => {
                console.error('Error loading code injection settings:', err);
                toast.error('Failed to load code injection settings');
                setLoading(false);
            });
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);

        try {
            const res = await fetch('/api/admin/code-injection', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            if (res.ok) {
                toast.success('Code injection settings saved successfully');
            } else {
                toast.error('Failed to save code injection settings');
            }
        } catch (error) {
            console.error('Error saving code injection settings:', error);
            toast.error('An error occurred while saving');
        } finally {
            setSaving(false);
        }
    };

    const activeHooksCount =
        (formData.headCode.trim() ? 1 : 0) +
        (formData.bodyCode.trim() ? 1 : 0) +
        (formData.footerCode.trim() ? 1 : 0);

    return (
        <AdminLayout>
            <Head title="Code Injection - Png101 Admin" />
            {loading ? (
                <div className="py-16 text-center space-y-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-glow mx-auto"></div>
                    <p className="text-foreground/60 text-sm">Loading code injection configurations...</p>
                </div>
            ) : (
                <div className="space-y-6 pb-24">
                    {/* Page Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <h1 className="text-3xl font-bold text-foreground mb-1">Code &amp; Script Injection</h1>
                            <p className="text-foreground/60 text-sm">
                                Embed custom HTML, tracking pixels, CSS overrides, or verification meta tags across your site without code deployments.
                            </p>
                        </div>
                    </div>

                    {/* Primary Stat Cards Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        <StatCard
                            title="<head> Injection"
                            value={formData.headCode.trim() ? 'Active' : 'Unset'}
                            subtitle={
                                formData.headCode.trim()
                                    ? `${formData.headCode.length.toLocaleString()} characters embedded`
                                    : 'Analytics & meta tags'
                            }
                            icon={<Code2 className="w-6 h-6" />}
                        />
                        <StatCard
                            title="<body> Top Injection"
                            value={formData.bodyCode.trim() ? 'Active' : 'Unset'}
                            subtitle={
                                formData.bodyCode.trim()
                                    ? `${formData.bodyCode.length.toLocaleString()} characters embedded`
                                    : 'GTM noscript or top bars'
                            }
                            icon={<FileCode className="w-6 h-6" />}
                        />
                        <StatCard
                            title="</body> Footer Scripts"
                            value={formData.footerCode.trim() ? 'Active' : 'Unset'}
                            subtitle={
                                formData.footerCode.trim()
                                    ? `${formData.footerCode.length.toLocaleString()} characters embedded`
                                    : 'Chat widgets & async tags'
                            }
                            icon={<Terminal className="w-6 h-6" />}
                        />
                        <StatCard
                            title="Total Script Hooks"
                            value={`${activeHooksCount} of 3`}
                            subtitle={activeHooksCount > 0 ? 'Live across all visitor pages' : 'No custom scripts injected'}
                            icon={<Sparkles className="w-6 h-6" />}
                        />
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Head Code Card */}
                        <div className="bg-card-bg border border-card-border rounded-xl overflow-hidden shadow-xl">
                            <div className="p-6 border-b border-card-border flex items-start justify-between gap-4">
                                <div className="flex items-start gap-3">
                                    <div className="p-2.5 rounded-lg bg-primary-glow/10 text-primary-glow border border-primary-glow/20 mt-0.5">
                                        <Code2 className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h2 className="text-lg font-bold text-foreground">Head Injection</h2>
                                            <code className="text-xs font-mono px-2 py-0.5 rounded-md bg-background border border-card-border text-primary-glow font-bold">
                                                &lt;head&gt;
                                            </code>
                                        </div>
                                        <p className="text-xs text-foreground/60 mt-1">
                                            Injected inside the HTML <code className="font-mono text-xs">&lt;head&gt;</code> element. Ideal for Google Analytics (GA4), Search Console verification meta tags, custom web fonts, and preconnect tags.
                                        </p>
                                    </div>
                                </div>

                                <span className="text-[11px] font-mono text-foreground/45 shrink-0 hidden sm:inline-block">
                                    {formData.headCode.length} chars
                                </span>
                            </div>

                            <div className="p-6">
                                <textarea
                                    rows={6}
                                    value={formData.headCode}
                                    onChange={(e) => setFormData({ ...formData, headCode: e.target.value })}
                                    spellCheck={false}
                                    placeholder='<!-- e.g. <meta name="google-site-verification" content="..." /> or <script async src="https://www.googletagmanager.com/gtag/js?id=G-..."></script> -->'
                                    className="w-full px-4 py-3 bg-background border border-card-border rounded-xl text-foreground font-mono text-xs sm:text-sm focus:outline-none focus:border-primary-glow focus:ring-1 focus:ring-primary-glow/30 transition-all resize-y leading-relaxed"
                                />
                            </div>
                        </div>

                        {/* Body Code Card */}
                        <div className="bg-card-bg border border-card-border rounded-xl overflow-hidden shadow-xl">
                            <div className="p-6 border-b border-card-border flex items-start justify-between gap-4">
                                <div className="flex items-start gap-3">
                                    <div className="p-2.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 mt-0.5">
                                        <FileCode className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h2 className="text-lg font-bold text-foreground">Body Start Injection</h2>
                                            <code className="text-xs font-mono px-2 py-0.5 rounded-md bg-background border border-card-border text-blue-400 font-bold">
                                                &lt;body&gt;
                                            </code>
                                        </div>
                                        <p className="text-xs text-foreground/60 mt-1">
                                            Injected right after the opening <code className="font-mono text-xs">&lt;body&gt;</code> tag. Useful for Google Tag Manager <code className="font-mono text-xs">&lt;noscript&gt;</code> iframes or top-of-page notifications.
                                        </p>
                                    </div>
                                </div>

                                <span className="text-[11px] font-mono text-foreground/45 shrink-0 hidden sm:inline-block">
                                    {formData.bodyCode.length} chars
                                </span>
                            </div>

                            <div className="p-6">
                                <textarea
                                    rows={6}
                                    value={formData.bodyCode}
                                    onChange={(e) => setFormData({ ...formData, bodyCode: e.target.value })}
                                    spellCheck={false}
                                    placeholder="<!-- Code injected immediately following the opening <body> tag -->"
                                    className="w-full px-4 py-3 bg-background border border-card-border rounded-xl text-foreground font-mono text-xs sm:text-sm focus:outline-none focus:border-primary-glow focus:ring-1 focus:ring-primary-glow/30 transition-all resize-y leading-relaxed"
                                />
                            </div>
                        </div>

                        {/* Footer Code Card */}
                        <div className="bg-card-bg border border-card-border rounded-xl overflow-hidden shadow-xl">
                            <div className="p-6 border-b border-card-border flex items-start justify-between gap-4">
                                <div className="flex items-start gap-3">
                                    <div className="p-2.5 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20 mt-0.5">
                                        <Terminal className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h2 className="text-lg font-bold text-foreground">Footer Script Injection</h2>
                                            <code className="text-xs font-mono px-2 py-0.5 rounded-md bg-background border border-card-border text-purple-400 font-bold">
                                                &lt;/body&gt;
                                            </code>
                                        </div>
                                        <p className="text-xs text-foreground/60 mt-1">
                                            Injected right before the closing <code className="font-mono text-xs">&lt;/body&gt;</code> tag. Ideal for customer chat widgets, heatmaps, remarketing pixels, and deferred JavaScript.
                                        </p>
                                    </div>
                                </div>

                                <span className="text-[11px] font-mono text-foreground/45 shrink-0 hidden sm:inline-block">
                                    {formData.footerCode.length} chars
                                </span>
                            </div>

                            <div className="p-6">
                                <textarea
                                    rows={6}
                                    value={formData.footerCode}
                                    onChange={(e) => setFormData({ ...formData, footerCode: e.target.value })}
                                    spellCheck={false}
                                    placeholder="<!-- Code injected immediately preceding the closing </body> tag -->"
                                    className="w-full px-4 py-3 bg-background border border-card-border rounded-xl text-foreground font-mono text-xs sm:text-sm focus:outline-none focus:border-primary-glow focus:ring-1 focus:ring-primary-glow/30 transition-all resize-y leading-relaxed"
                                />
                            </div>
                        </div>

                        {/* Save Bar */}
                        <div className="flex items-center justify-between p-4 rounded-xl bg-card-bg border border-card-border shadow-lg">
                            <p className="text-xs text-foreground/50">
                                Injected scripts take effect on all public website pages immediately upon saving.
                            </p>
                            <button
                                type="submit"
                                disabled={saving}
                                className="inline-flex items-center gap-2 px-6 py-2.5 bg-primary-glow hover:bg-blue-600 text-white font-semibold text-sm rounded-xl shadow-lg shadow-primary-glow/20 transition-all hover:-translate-y-0.5 cursor-pointer disabled:opacity-50"
                            >
                                <Save className="w-4 h-4" />
                                <span>{saving ? 'Saving...' : 'Save Script Settings'}</span>
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </AdminLayout>
    );
}
