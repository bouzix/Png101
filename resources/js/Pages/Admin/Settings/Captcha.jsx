import React, { useEffect, useState } from 'react';
import { Head } from '@inertiajs/react';
import AdminLayout from '@/Layouts/AdminLayout';
import { toast } from 'sonner';
import {
    ShieldCheck,
    Download,
    Lock,
    Users,
    KeyRound,
    ExternalLink,
    Eye,
    EyeOff,
    Save,
    Clock,
    AlertTriangle,
    CheckCircle2,
    BookOpen,
} from 'lucide-react';

export default function AdminCaptchaSettings() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [catalog, setCatalog] = useState([]);
    const [revealedSecrets, setRevealedSecrets] = useState({});
    const [activeGuideId, setActiveGuideId] = useState('turnstile');
    const [form, setForm] = useState({
        downloadProvider: 'builtin_math',
        downloadCountdownSeconds: 3,
        adminLoginProvider: 'none',
        teamLoginProvider: 'none',
        providers: {
            recaptcha_v2: { siteKey: '', secretKey: '' },
            recaptcha_v3: { siteKey: '', secretKey: '', minScore: 0.5 },
            turnstile: { siteKey: '', secretKey: '' },
            hcaptcha: { siteKey: '', secretKey: '' },
            friendly: { siteKey: '', secretKey: '' },
        },
    });

    useEffect(() => {
        fetch('/api/admin/captcha')
            .then((res) => res.json())
            .then((data) => {
                if (data?.settings) {
                    setForm(data.settings);
                }
                if (Array.isArray(data?.catalog)) {
                    setCatalog(data.catalog);
                }
            })
            .catch(() => toast.error('Failed to load captcha settings'))
            .finally(() => setLoading(false));
    }, []);

    const isProviderReady = (providerId) => {
        if (!providerId || providerId === 'none' || providerId === 'builtin_math') return true;
        const cfg = form.providers?.[providerId];
        return Boolean(cfg?.siteKey?.trim() && cfg?.secretKey?.trim());
    };

    const updateProviderField = (providerId, field, value) => {
        setForm((prev) => ({
            ...prev,
            providers: {
                ...prev.providers,
                [providerId]: {
                    ...(prev.providers?.[providerId] || {}),
                    [field]: value,
                },
            },
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const res = await fetch('/api/admin/captcha', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            });
            const data = await res.json();
            if (!res.ok || !data?.success) {
                toast.error(data?.error || 'Failed to save captcha configuration.');
                return;
            }
            if (data.settings) {
                setForm(data.settings);
            }
            toast.success('Captcha settings saved & applied live!');
        } catch {
            toast.error('Network error while saving captcha settings.');
        } finally {
            setSaving(false);
        }
    };

    const providerOptions = catalog.length > 0
        ? catalog
        : [
            { id: 'none', name: 'Disabled (No Captcha)' },
            { id: 'builtin_math', name: 'Built-in Anti-Bot Math Puzzle' },
            { id: 'turnstile', name: 'Cloudflare Turnstile' },
            { id: 'recaptcha_v2', name: 'Google reCAPTCHA v2' },
            { id: 'recaptcha_v3', name: 'Google reCAPTCHA v3' },
            { id: 'hcaptcha', name: 'hCaptcha' },
            { id: 'friendly', name: 'Friendly Captcha' },
        ];

    const keyConfigurableProviders = catalog.filter((p) => p.requiresKeys);

    return (
        <AdminLayout>
            <Head title="Captcha & Bot Protection - Settings" />

            {loading ? (
                <div className="py-16 text-center space-y-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-glow mx-auto"></div>
                    <p className="text-foreground/60 text-sm">Loading captcha protection settings...</p>
                </div>
            ) : (
                <div className="space-y-6 pb-24">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-1 flex items-center gap-3">
                                <ShieldCheck className="w-7 h-7 text-primary-glow shrink-0" />
                                <span>Captcha &amp; Bot Protection</span>
                            </h1>
                            <p className="text-foreground/60 text-sm">
                                Choose which CAPTCHA provider protects public PNG downloads, Super Admin login, and Team login, and configure your provider API keys.
                            </p>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                    {/* 1. Entry Point Assignments */}
                    <div className="bg-card-bg border border-card-border rounded-xl overflow-hidden shadow-xl">
                        <div className="p-6 border-b border-card-border flex items-start gap-3">
                            <div className="p-2.5 rounded-lg bg-primary-glow/10 text-primary-glow border border-primary-glow/20 mt-0.5">
                                <ShieldCheck className="w-5 h-5" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-foreground">Active Protection Rules</h2>
                                <p className="text-xs text-foreground/60 mt-0.5">
                                    Assign a different CAPTCHA provider independently for downloads, Super Admin login, and Team login.
                                </p>
                            </div>
                        </div>

                        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                            {/* Frontend Image Download */}
                            <div className="rounded-xl border border-card-border bg-background/50 p-4 space-y-4">
                                <div className="flex items-center gap-2.5">
                                    <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                                        <Download className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-bold text-foreground">Frontend Download Gate</h3>
                                        <p className="text-[11px] text-foreground/55">Image Detail Download Popup</p>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[11px] font-bold uppercase tracking-wider text-foreground/60 mb-1.5">
                                        Captcha Provider
                                    </label>
                                    <select
                                        value={form.downloadProvider}
                                        onChange={(e) => {
                                            setForm({ ...form, downloadProvider: e.target.value });
                                            if (e.target.value !== 'none' && e.target.value !== 'builtin_math') {
                                                setActiveGuideId(e.target.value);
                                            }
                                        }}
                                        className="w-full px-3 py-2.5 rounded-lg bg-card-bg border border-card-border text-sm text-foreground focus:outline-none focus:border-primary-glow cursor-pointer"
                                    >
                                        {providerOptions.map((opt) => (
                                            <option key={opt.id} value={opt.id} className="bg-card-bg text-foreground">
                                                {opt.name}
                                            </option>
                                        ))}
                                    </select>
                                    {!isProviderReady(form.downloadProvider) && (
                                        <p className="mt-1.5 text-[11px] text-amber-400 flex items-center gap-1">
                                            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                                            Fill Site Key &amp; Secret Key below before saving.
                                        </p>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-[11px] font-bold uppercase tracking-wider text-foreground/60 mb-1.5">
                                        Download Countdown (Seconds)
                                    </label>
                                    <div className="flex items-center gap-2">
                                        <Clock className="w-4 h-4 text-foreground/50 shrink-0" />
                                        <input
                                            type="number"
                                            min={0}
                                            max={30}
                                            value={form.downloadCountdownSeconds}
                                            onChange={(e) =>
                                                setForm({
                                                    ...form,
                                                    downloadCountdownSeconds: Math.max(0, Math.min(30, Number(e.target.value) || 0)),
                                                })
                                            }
                                            className="w-24 px-3 py-1.5 rounded-lg bg-card-bg border border-card-border text-sm font-mono text-foreground focus:outline-none focus:border-primary-glow"
                                        />
                                        <div className="flex gap-1">
                                            {[0, 3, 5, 10].map((sec) => (
                                                <button
                                                    key={sec}
                                                    type="button"
                                                    onClick={() => setForm({ ...form, downloadCountdownSeconds: sec })}
                                                    className={`px-2 py-1 rounded text-[11px] font-semibold border cursor-pointer transition-colors ${
                                                        Number(form.downloadCountdownSeconds) === sec
                                                            ? 'bg-primary-glow text-white border-primary-glow'
                                                            : 'bg-card-bg border-card-border text-foreground/65 hover:text-foreground'
                                                    }`}
                                                >
                                                    {sec}s
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Super Admin Login */}
                            <div className="rounded-xl border border-card-border bg-background/50 p-4 space-y-4">
                                <div className="flex items-center gap-2.5">
                                    <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
                                        <Lock className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-bold text-foreground">Super Admin Login</h3>
                                        <p className="text-[11px] text-foreground/55 font-mono">/admin</p>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[11px] font-bold uppercase tracking-wider text-foreground/60 mb-1.5">
                                        Captcha Provider
                                    </label>
                                    <select
                                        value={form.adminLoginProvider}
                                        onChange={(e) => {
                                            setForm({ ...form, adminLoginProvider: e.target.value });
                                            if (e.target.value !== 'none' && e.target.value !== 'builtin_math') {
                                                setActiveGuideId(e.target.value);
                                            }
                                        }}
                                        className="w-full px-3 py-2.5 rounded-lg bg-card-bg border border-card-border text-sm text-foreground focus:outline-none focus:border-primary-glow cursor-pointer"
                                    >
                                        {providerOptions.map((opt) => (
                                            <option key={opt.id} value={opt.id} className="bg-card-bg text-foreground">
                                                {opt.name}
                                            </option>
                                        ))}
                                    </select>
                                    {!isProviderReady(form.adminLoginProvider) && (
                                        <p className="mt-1.5 text-[11px] text-amber-400 flex items-center gap-1">
                                            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                                            Fill Site Key &amp; Secret Key below before saving.
                                        </p>
                                    )}
                                </div>

                                <p className="text-[11px] text-foreground/50 leading-relaxed">
                                    Tip: Built-in Math Puzzle works locally and offline with zero external keys so you never risk getting locked out if DNS fails.
                                </p>
                            </div>

                            {/* Team Member Login */}
                            <div className="rounded-xl border border-card-border bg-background/50 p-4 space-y-4">
                                <div className="flex items-center gap-2.5">
                                    <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
                                        <Users className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-bold text-foreground">Team Member Login</h3>
                                        <p className="text-[11px] text-foreground/55 font-mono">/team/login</p>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[11px] font-bold uppercase tracking-wider text-foreground/60 mb-1.5">
                                        Captcha Provider
                                    </label>
                                    <select
                                        value={form.teamLoginProvider}
                                        onChange={(e) => {
                                            setForm({ ...form, teamLoginProvider: e.target.value });
                                            if (e.target.value !== 'none' && e.target.value !== 'builtin_math') {
                                                setActiveGuideId(e.target.value);
                                            }
                                        }}
                                        className="w-full px-3 py-2.5 rounded-lg bg-card-bg border border-card-border text-sm text-foreground focus:outline-none focus:border-primary-glow cursor-pointer"
                                    >
                                        {providerOptions.map((opt) => (
                                            <option key={opt.id} value={opt.id} className="bg-card-bg text-foreground">
                                                {opt.name}
                                            </option>
                                        ))}
                                    </select>
                                    {!isProviderReady(form.teamLoginProvider) && (
                                        <p className="mt-1.5 text-[11px] text-amber-400 flex items-center gap-1">
                                            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                                            Fill Site Key &amp; Secret Key below before saving.
                                        </p>
                                    )}
                                </div>

                                <p className="text-[11px] text-foreground/50 leading-relaxed">
                                    All login endpoints are also rate-limited at 10 attempts/minute per IP regardless of captcha mode.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* 2. Third-Party Provider API Keys & Setup Instructions */}
                    <div className="bg-card-bg border border-card-border rounded-xl overflow-hidden shadow-xl">
                        <div className="p-6 border-b border-card-border flex items-start gap-3">
                            <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 mt-0.5">
                                <KeyRound className="w-5 h-5" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-foreground">Provider API Keys &amp; Setup Guides</h2>
                                <p className="text-xs text-foreground/60 mt-0.5">
                                    Select a provider tab to enter its keys and view step-by-step instructions on where to generate them.
                                </p>
                            </div>
                        </div>

                        {/* Provider Selector Tabs */}
                        <div className="px-6 pt-4 border-b border-card-border flex flex-wrap gap-2">
                            {keyConfigurableProviders.map((prov) => {
                                const configured = isProviderReady(prov.id);
                                const isActive = activeGuideId === prov.id;
                                return (
                                    <button
                                        key={prov.id}
                                        type="button"
                                        onClick={() => setActiveGuideId(prov.id)}
                                        className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs font-bold border border-b-0 transition-all cursor-pointer ${
                                            isActive
                                                ? 'bg-background text-foreground border-card-border'
                                                : 'bg-transparent text-foreground/60 border-transparent hover:text-foreground'
                                        }`}
                                    >
                                        <span>{prov.name}</span>
                                        {configured ? (
                                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                        ) : (
                                            <span className="w-2 h-2 rounded-full bg-foreground/25" />
                                        )}
                                    </button>
                                );
                            })}
                        </div>

                        {keyConfigurableProviders
                            .filter((prov) => prov.id === activeGuideId)
                            .map((prov) => {
                                const cfg = form.providers?.[prov.id] || { siteKey: '', secretKey: '' };
                                const showSecret = Boolean(revealedSecrets[prov.id]);
                                return (
                                    <div key={prov.id} className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 bg-background/30">
                                        {/* Key Inputs */}
                                        <div className="lg:col-span-6 space-y-4">
                                            <div className="flex items-center justify-between gap-2">
                                                <div>
                                                    <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-primary-glow/15 text-primary-glow">
                                                        {prov.badge}
                                                    </span>
                                                    <h3 className="text-base font-bold text-foreground mt-1.5">{prov.name}</h3>
                                                </div>
                                                {prov.setupUrl && (
                                                    <a
                                                        href={prov.setupUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-card-bg border border-card-border hover:border-primary-glow/50 text-xs font-semibold text-primary-glow transition-colors"
                                                    >
                                                        <span>Get Keys</span>
                                                        <ExternalLink className="w-3.5 h-3.5" />
                                                    </a>
                                                )}
                                            </div>

                                            <p className="text-xs text-foreground/65 leading-relaxed">{prov.summary}</p>

                                            <div>
                                                <label className="block text-xs font-bold text-foreground/70 uppercase tracking-wider mb-1.5">
                                                    Site Key (Public)
                                                </label>
                                                <input
                                                    type="text"
                                                    value={cfg.siteKey || ''}
                                                    onChange={(e) => updateProviderField(prov.id, 'siteKey', e.target.value)}
                                                    placeholder="Paste Site Key here..."
                                                    className="w-full px-3.5 py-2.5 rounded-xl bg-card-bg border border-card-border text-sm font-mono text-foreground focus:outline-none focus:border-primary-glow"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-xs font-bold text-foreground/70 uppercase tracking-wider mb-1.5">
                                                    Secret Key (Private)
                                                </label>
                                                <div className="relative">
                                                    <input
                                                        type={showSecret ? 'text' : 'password'}
                                                        value={cfg.secretKey || ''}
                                                        onChange={(e) => updateProviderField(prov.id, 'secretKey', e.target.value)}
                                                        placeholder="Paste Secret Key here..."
                                                        className="w-full pl-3.5 pr-10 py-2.5 rounded-xl bg-card-bg border border-card-border text-sm font-mono text-foreground focus:outline-none focus:border-primary-glow"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            setRevealedSecrets((prev) => ({
                                                                ...prev,
                                                                [prov.id]: !showSecret,
                                                            }))
                                                        }
                                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground/40 hover:text-foreground cursor-pointer"
                                                    >
                                                        {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                    </button>
                                                </div>
                                            </div>

                                            {prov.id === 'recaptcha_v3' && (
                                                <div>
                                                    <label className="block text-xs font-bold text-foreground/70 uppercase tracking-wider mb-1.5">
                                                        Minimum Passing Score (0.1 – 0.9)
                                                    </label>
                                                    <input
                                                        type="number"
                                                        step="0.1"
                                                        min="0.1"
                                                        max="0.9"
                                                        value={cfg.minScore ?? 0.5}
                                                        onChange={(e) => updateProviderField(prov.id, 'minScore', Number(e.target.value))}
                                                        className="w-32 px-3.5 py-2 rounded-xl bg-card-bg border border-card-border text-sm font-mono text-foreground focus:outline-none focus:border-primary-glow"
                                                    />
                                                    <p className="text-[11px] text-foreground/50 mt-1">
                                                        0.5 is recommended. Higher values (e.g. 0.7) are stricter against bots.
                                                    </p>
                                                </div>
                                            )}
                                        </div>

                                        {/* Step-by-Step Setup Instructions */}
                                        <div className="lg:col-span-6 rounded-xl border border-card-border bg-card-bg p-5 space-y-3">
                                            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary-glow">
                                                <BookOpen className="w-4 h-4" />
                                                <span>How to set up {prov.name}</span>
                                            </div>

                                            <ol className="space-y-2.5 text-xs text-foreground/80 list-decimal list-inside leading-relaxed">
                                                {(prov.steps || []).map((step, i) => (
                                                    <li key={i} className="pl-1">{step}</li>
                                                ))}
                                            </ol>

                                            <div className="mt-4 pt-3 border-t border-card-border text-[11px] text-foreground/55 space-y-1">
                                                <p>
                                                    <strong className="text-foreground/75">Domain Checklist:</strong> Always whitelist your live production domain (e.g. <code className="text-primary-glow">png101.com</code>) AND add <code className="text-primary-glow">localhost</code> / <code className="text-primary-glow">127.0.0.1</code> if you test locally.
                                                </p>
                                                <p>
                                                    <strong className="text-foreground/75">Firewall / Shared Hosting:</strong> Your server makes a small outbound HTTPS request to verify the captcha token. Built-in Math Puzzle needs zero outbound requests.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                    </div>

                    {/* Save Bar */}
                    <div className="flex items-center justify-between p-4 rounded-xl bg-card-bg border border-card-border shadow-lg">
                        <p className="text-xs text-foreground/55">
                            Changes apply immediately across Download Popups, Admin Login, and Team Login.
                        </p>
                        <button
                            type="submit"
                            disabled={saving}
                            className="inline-flex items-center gap-2 px-6 py-2.5 bg-primary-glow hover:bg-blue-600 text-white font-semibold text-sm rounded-xl shadow-lg shadow-primary-glow/20 transition-all hover:-translate-y-0.5 cursor-pointer disabled:opacity-50"
                        >
                            <Save className="w-4 h-4" />
                            <span>{saving ? 'Saving Captcha Rules...' : 'Save Captcha Settings'}</span>
                        </button>
                    </div>
                    </form>
                </div>
            )}
        </AdminLayout>
    );
}

