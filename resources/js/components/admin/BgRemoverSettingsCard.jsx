import React, { useEffect, useState } from 'react';
import StudioSelect from '@/components/ui/StudioSelect';
import {
    BookOpen,
    Check,
    CheckCircle2,
    Copy,
    Cpu,
    Eraser,
    Eye,
    EyeOff,
    KeyRound,
    Play,
    RefreshCw,
    Save,
    Server,
    ShieldCheck,
    Sparkles,
    X,
    XCircle,
} from 'lucide-react';
import { toast } from 'sonner';

export const DEFAULT_BG_REMOVER_CONFIG = {
    engines: {
        solid: true,
        browser_ai: true,
        server_ai: false,
    },
    defaultEngine: 'browser_ai',
    browserAiModel: 'isnet_fp16',
    serverAiMode: 'cli',
    serverAiPythonPath: '',
    serverAiServiceUrl: 'http://127.0.0.1:8001/remove-background',
    serverAiApiKey: '',
    serverAiTimeout: 180,
    serverAiVerifySsl: true,
    serverAiModel: 'isnet-general-use',
    serverAiAlphaMatting: false,
    maxUploadMb: 15,
};

function generateSecretApiKey() {
    const bytes = new Uint8Array(24);
    if (typeof window !== 'undefined' && window.crypto?.getRandomValues) {
        window.crypto.getRandomValues(bytes);
    } else {
        for (let i = 0; i < bytes.length; i++) {
            bytes[i] = Math.floor(Math.random() * 256);
        }
    }
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
    return `png101_ai_${hex}`;
}

function deriveSubdomainInfo(rawUrl) {
    const fallbackUrl = 'https://ai.website.com/remove-background';
    const trimmed = String(rawUrl || '').trim();
    if (!trimmed) {
        return { host: 'ai.website.com', fullUrl: fallbackUrl, isLocal: false };
    }
    try {
        const parsed = new URL(trimmed.includes('://') ? trimmed : `https://${trimmed}`);
        const isLocal = ['127.0.0.1', 'localhost', '0.0.0.0'].includes(parsed.hostname);
        if (isLocal) {
            return { host: 'ai.website.com', fullUrl: fallbackUrl, isLocal: true };
        }
        return { host: parsed.hostname, fullUrl: trimmed, isLocal: false };
    } catch {
        return { host: 'ai.website.com', fullUrl: fallbackUrl, isLocal: false };
    }
}

function ToggleSwitch({ checked, onChange, disabled = false, label }) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            aria-label={label}
            disabled={disabled}
            onClick={() => onChange(!checked)}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none disabled:opacity-45 disabled:cursor-not-allowed ${
                checked ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'
            }`}
        >
            <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ${
                    checked ? 'translate-x-5' : 'translate-x-0'
                }`}
            />
        </button>
    );
}

export default function BgRemoverSettingsCard({
    value = null,
    onChange = null,
    diagnostics = null,
    showStandaloneSave = false,
}) {
    const [localConfig, setLocalConfig] = useState(value || DEFAULT_BG_REMOVER_CONFIG);
    const [localDiagnostics, setLocalDiagnostics] = useState(diagnostics);
    const [loading, setLoading] = useState(!value && showStandaloneSave);
    const [forbidden, setForbidden] = useState(false);
    const [saving, setSaving] = useState(false);
    const [testingServer, setTestingServer] = useState(false);
    const [testResult, setTestResult] = useState(null);
    const [showApiKey, setShowApiKey] = useState(false);
    const [showVpsGuide, setShowVpsGuide] = useState(false);
    const [copiedKey, setCopiedKey] = useState(null);

    const cfg = value || localConfig;

    useEffect(() => {
        if (!showVpsGuide) return;
        const onKey = (e) => {
            if (e.key === 'Escape') setShowVpsGuide(false);
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [showVpsGuide]);

    const handleCopy = async (text, id) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopiedKey(id);
            toast.success('Copied to clipboard');
            setTimeout(() => {
                setCopiedKey((prev) => (prev === id ? null : prev));
            }, 1800);
        } catch {
            toast.error('Could not copy automatically');
        }
    };

    useEffect(() => {
        if (value) {
            setLocalConfig(value);
        }
    }, [value]);

    useEffect(() => {
        if (diagnostics) {
            setLocalDiagnostics(diagnostics);
        }
    }, [diagnostics]);

    useEffect(() => {
        if (value || !showStandaloneSave) return;
        fetch('/api/admin/tools')
            .then((res) => {
                if (res.status === 403) {
                    setForbidden(true);
                    return null;
                }
                return res.json();
            })
            .then((data) => {
                if (data?.settings?.bgRemover) {
                    setLocalConfig(data.settings.bgRemover);
                }
                if (data?.bgRemoverDiagnostics) {
                    setLocalDiagnostics(data.bgRemoverDiagnostics);
                }
            })
            .catch(() => {})
            .finally(() => setLoading(false));
    }, [value, showStandaloneSave]);

    if (forbidden || loading) {
        if (loading) {
            return (
                <div className="bg-card-bg border border-card-border rounded-2xl p-6 text-xs text-foreground/60">
                    Loading Background Remover engine settings...
                </div>
            );
        }
        return null;
    }

    const updateConfig = (updater) => {
        const next = typeof updater === 'function' ? updater(cfg) : updater;
        if (onChange) {
            onChange(next);
        } else {
            setLocalConfig(next);
        }
    };

    const handleToggleEngine = (engineKey, enabled) => {
        const currentEngines = { ...DEFAULT_BG_REMOVER_CONFIG.engines, ...(cfg.engines || {}) };
        const nextEngines = { ...currentEngines, [engineKey]: enabled };

        const enabledList = ['browser_ai', 'server_ai', 'solid'].filter((k) => Boolean(nextEngines[k]));
        if (enabledList.length === 0) {
            toast.warning('Keep at least one Background Remover engine enabled.');
            return;
        }

        let nextDefault = cfg.defaultEngine;
        if (!nextEngines[nextDefault]) {
            nextDefault = enabledList[0];
        }

        updateConfig({
            ...cfg,
            engines: nextEngines,
            defaultEngine: nextDefault,
        });
    };

    const handleSetDefault = (engineKey) => {
        const nextEngines = {
            ...DEFAULT_BG_REMOVER_CONFIG.engines,
            ...(cfg.engines || {}),
            [engineKey]: true,
        };
        updateConfig({
            ...cfg,
            engines: nextEngines,
            defaultEngine: engineKey,
        });
    };

    const handleSaveStandalone = async () => {
        setSaving(true);
        try {
            const res = await fetch('/api/admin/tools', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ bgRemover: cfg }),
            });
            const data = await res.json();
            if (!res.ok || data?.error) {
                toast.error(data?.error || 'Failed to save Background Remover settings');
                return;
            }
            if (data?.settings?.bgRemover) {
                setLocalConfig(data.settings.bgRemover);
            }
            if (data?.bgRemoverDiagnostics) {
                setLocalDiagnostics(data.bgRemoverDiagnostics);
            }
            toast.success('Background Remover engine settings saved!');
        } catch {
            toast.error('Network error while saving Background Remover settings');
        } finally {
            setSaving(false);
        }
    };

    const handleTestServer = async () => {
        setTestingServer(true);
        setTestResult(null);
        try {
            const res = await fetch('/api/admin/tools/bg-remover/test-server', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ bgRemover: cfg }),
            });
            const data = await res.json();
            setTestResult(data);
            if (res.ok && data?.ok) {
                toast.success('Server Python AI is reachable and ready!');
            } else {
                toast.error(data?.error || 'Server Python AI check failed');
            }
        } catch {
            setTestResult({ ok: false, error: 'Network error contacting backend diagnostic endpoint.' });
            toast.error('Network error testing Server AI');
        } finally {
            setTestingServer(false);
        }
    };

    const engines = { ...DEFAULT_BG_REMOVER_CONFIG.engines, ...(cfg.engines || {}) };
    const enabledCount = ['browser_ai', 'server_ai', 'solid'].filter((k) => Boolean(engines[k])).length;

    return (
        <div id="bg-remover-engines" className="bg-card-bg border border-card-border rounded-2xl overflow-hidden shadow-xl">
            <div className="p-6 border-b border-card-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2.5 flex-wrap">
                        <Sparkles className="w-5 h-5 text-blue-500 shrink-0" />
                        <h2 className="text-lg font-bold text-foreground">
                            Background Remover Cutout Engines
                        </h2>
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-500/10 border border-blue-500/25 text-blue-500">
                            {enabledCount} Active on /tools/remove-background
                        </span>
                    </div>
                    <p className="text-xs text-foreground/60 mt-1">
                        Choose which background removal engines visitors can use on <code className="font-mono">/tools/remove-background</code> and set your default engine.
                    </p>
                </div>

                {showStandaloneSave && (
                    <button
                        type="button"
                        onClick={handleSaveStandalone}
                        disabled={saving}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-600/25 cursor-pointer disabled:opacity-50 shrink-0 transition-all"
                    >
                        <Save className="w-4 h-4" />
                        <span>{saving ? 'Saving...' : 'Save Engine Settings'}</span>
                    </button>
                )}
            </div>

            <div className="p-6 space-y-5">
                {/* 3 Engine Option Cards */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    {/* Option 1: Browser AI */}
                    <div className={`rounded-xl border p-4 space-y-3 transition-all ${
                        engines.browser_ai
                            ? 'bg-background border-card-border'
                            : 'bg-background/40 border-card-border/60 opacity-75'
                    }`}>
                        <div className="flex items-start justify-between gap-3">
                            <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                    <Cpu className="w-4 h-4 text-purple-500 shrink-0" />
                                    <span className="font-bold text-sm text-foreground">Option 1: Browser AI</span>
                                </div>
                                <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/10 text-purple-500 border border-purple-500/25">
                                    Client-Side WebGPU / WASM
                                </span>
                            </div>
                            <ToggleSwitch
                                checked={Boolean(engines.browser_ai)}
                                onChange={(val) => handleToggleEngine('browser_ai', val)}
                                label="Toggle Browser AI engine"
                            />
                        </div>

                        <p className="text-xs text-foreground/60 leading-relaxed">
                            Runs neural segmentation directly in the visitor&rsquo;s browser (zero server CPU cost, zero image uploads). Handles photos, people, products, and hair.
                        </p>

                        <div className="space-y-2 pt-2 border-t border-card-border/60">
                            <label className="text-[11px] font-semibold text-foreground/70 block">
                                Browser AI Model Precision
                            </label>
                            <StudioSelect
                                aria-label="Browser AI Model Precision"
                                value={cfg.browserAiModel || 'isnet_fp16'}
                                disabled={!engines.browser_ai}
                                onChange={(e) => updateConfig({ ...cfg, browserAiModel: e.target.value })}
                                className="w-full"
                            >
                                <option value="isnet_quint8">Fast (~40 MB quantized IS-Net)</option>
                                <option value="isnet_fp16">Balanced (~80 MB FP16 IS-Net)</option>
                                <option value="isnet">High Precision (~160 MB Full IS-Net)</option>
                            </StudioSelect>

                            <button
                                type="button"
                                onClick={() => handleSetDefault('browser_ai')}
                                className={`w-full py-1.5 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                                    cfg.defaultEngine === 'browser_ai'
                                        ? 'bg-blue-600 text-white border-blue-500'
                                        : 'bg-card-bg border-card-border text-foreground/70 hover:border-blue-500/40'
                                }`}
                            >
                                {cfg.defaultEngine === 'browser_ai' ? 'Default Engine' : 'Set as Default'}
                            </button>
                        </div>
                    </div>

                    {/* Option 2: Server Python AI */}
                    <div className={`rounded-xl border p-4 space-y-3 transition-all ${
                        engines.server_ai
                            ? 'bg-background border-card-border'
                            : 'bg-background/40 border-card-border/60 opacity-75'
                    }`}>
                        <div className="flex items-start justify-between gap-3">
                            <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                    <Server className="w-4 h-4 text-emerald-500 shrink-0" />
                                    <span className="font-bold text-sm text-foreground">Option 2: Server AI</span>
                                </div>
                                <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/25">
                                    Python rembg + ONNX
                                </span>
                            </div>
                            <ToggleSwitch
                                checked={Boolean(engines.server_ai)}
                                onChange={(val) => handleToggleEngine('server_ai', val)}
                                label="Toggle Server AI engine"
                            />
                        </div>

                        <p className="text-xs text-foreground/60 leading-relaxed">
                            Processes complex photos on your server via Python <code className="font-mono">rembg</code> without making visitors download 40–160 MB AI weights in their browser.
                        </p>

                        <div className="space-y-2 pt-2 border-t border-card-border/60">
                            <label className="text-[11px] font-semibold text-foreground/70 block">
                                Server AI Model
                            </label>
                            <StudioSelect
                                aria-label="Server AI Model"
                                value={cfg.serverAiModel || 'isnet-general-use'}
                                disabled={!engines.server_ai}
                                onChange={(e) => updateConfig({ ...cfg, serverAiModel: e.target.value })}
                                className="w-full"
                            >
                                <option value="isnet-general-use">IS-Net General Use (Sharp all-around)</option>
                                <option value="birefnet-general-lite">BiRefNet General Lite (Fine edges)</option>
                                <option value="birefnet-general">BiRefNet General (Best quality, heavy)</option>
                                <option value="u2net">U2-Net Standard (Classic general)</option>
                                <option value="u2netp">U2-Net Portable (Ultra-fast, light)</option>
                                <option value="u2net_human_seg">U2-Net Human Portraits</option>
                            </StudioSelect>

                            <button
                                type="button"
                                onClick={() => handleSetDefault('server_ai')}
                                className={`w-full py-1.5 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                                    cfg.defaultEngine === 'server_ai'
                                        ? 'bg-blue-600 text-white border-blue-500'
                                        : 'bg-card-bg border-card-border text-foreground/70 hover:border-blue-500/40'
                                }`}
                            >
                                {cfg.defaultEngine === 'server_ai' ? 'Default Engine' : 'Set as Default'}
                            </button>
                        </div>
                    </div>

                    {/* Existing: Solid Color Key */}
                    <div className={`rounded-xl border p-4 space-y-3 transition-all ${
                        engines.solid
                            ? 'bg-background border-card-border'
                            : 'bg-background/40 border-card-border/60 opacity-75'
                    }`}>
                        <div className="flex items-start justify-between gap-3">
                            <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                    <Eraser className="w-4 h-4 text-blue-500 shrink-0" />
                                    <span className="font-bold text-sm text-foreground">Solid Color Key</span>
                                </div>
                                <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-500 border border-blue-500/25">
                                    Existing Instant Canvas Mode
                                </span>
                            </div>
                            <ToggleSwitch
                                checked={Boolean(engines.solid)}
                                onChange={(val) => handleToggleEngine('solid', val)}
                                label="Toggle Solid Color Key engine"
                            />
                        </div>

                        <p className="text-xs text-foreground/60 leading-relaxed">
                            Instant zero-latency canvas flood-fill &amp; chroma keying with eyedropper, tolerance, and edge smoothness—best for logos, icons, and solid backdrops.
                        </p>

                        <div className="space-y-2 pt-2 border-t border-card-border/60">
                            <div className="text-[11px] text-foreground/55 py-1.5">
                                Zero external model downloads required. Always instant.
                            </div>
                            <button
                                type="button"
                                onClick={() => handleSetDefault('solid')}
                                className={`w-full py-1.5 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                                    cfg.defaultEngine === 'solid'
                                        ? 'bg-blue-600 text-white border-blue-500'
                                        : 'bg-card-bg border-card-border text-foreground/70 hover:border-blue-500/40'
                                }`}
                            >
                                {cfg.defaultEngine === 'solid' ? 'Default Engine' : 'Set as Default'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Server Python AI Advanced Configuration */}
                <div className="rounded-xl border border-card-border bg-background/70 p-4 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                            <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="text-sm font-bold text-foreground">
                                    Server Python AI &amp; Remote VPS Connection
                                </h3>
                                {!engines.server_ai && (
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/25">
                                        Currently Disabled for Visitors
                                    </span>
                                )}
                            </div>
                            <p className="text-xs text-foreground/60 mt-0.5">
                                Connect to a dedicated Python VPS subdomain (e.g. <code className="font-mono">https://ai.website.com/remove-background</code>) or run locally via CLI.
                            </p>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 flex-wrap">
                            <button
                                type="button"
                                onClick={() => setShowVpsGuide(true)}
                                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-500/10 hover:bg-blue-500/15 border border-blue-500/30 text-xs font-bold text-blue-600 dark:text-blue-400 cursor-pointer transition-colors"
                            >
                                <BookOpen className="w-3.5 h-3.5" />
                                <span>More Info: VPS Setup Guide</span>
                            </button>

                            <button
                                type="button"
                                onClick={handleTestServer}
                                disabled={testingServer}
                                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-card-bg hover:bg-card-header-bg border border-card-border text-xs font-bold text-foreground cursor-pointer disabled:opacity-50 transition-colors"
                            >
                                <Play className="w-3.5 h-3.5 text-emerald-500" />
                                <span>{testingServer ? 'Testing Connection...' : 'Test Server AI'}</span>
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                        <div className="space-y-1">
                            <label className="text-[11px] font-semibold text-foreground/75 block">
                                Execution Mode
                            </label>
                            <StudioSelect
                                aria-label="Server AI execution mode"
                                value={cfg.serverAiMode || 'cli'}
                                onChange={(e) => updateConfig({ ...cfg, serverAiMode: e.target.value })}
                                className="w-full"
                            >
                                <option value="http">Remote VPS / Persistent HTTP Service</option>
                                <option value="cli">Local Python CLI (Same Server)</option>
                            </StudioSelect>
                        </div>

                        {cfg.serverAiMode === 'http' ? (
                            <div className="space-y-1 md:col-span-2">
                                <label className="text-[11px] font-semibold text-foreground/75 block">
                                    AI Service Endpoint URL
                                </label>
                                <input
                                    type="text"
                                    value={cfg.serverAiServiceUrl || ''}
                                    onChange={(e) => updateConfig({ ...cfg, serverAiServiceUrl: e.target.value })}
                                    placeholder="https://ai.website.com/remove-background"
                                    className="w-full bg-card-bg border border-card-border rounded-lg px-3 py-2 text-xs font-mono text-foreground focus:outline-none focus:border-blue-500"
                                />
                            </div>
                        ) : (
                            <div className="space-y-1 md:col-span-2">
                                <label className="text-[11px] font-semibold text-foreground/75 block">
                                    Python Executable Path (blank = auto-detect venv)
                                </label>
                                <input
                                    type="text"
                                    value={cfg.serverAiPythonPath || ''}
                                    onChange={(e) => updateConfig({ ...cfg, serverAiPythonPath: e.target.value })}
                                    placeholder={localDiagnostics?.detectedPython || 'Auto-detect python-ai/.venv or system python'}
                                    className="w-full bg-card-bg border border-card-border rounded-lg px-3 py-2 text-xs font-mono text-foreground focus:outline-none focus:border-blue-500"
                                />
                            </div>
                        )}

                        <div className="space-y-1">
                            <label className="text-[11px] font-semibold text-foreground/75 block">
                                Max Upload Size (MB)
                            </label>
                            <input
                                type="number"
                                min={1}
                                max={50}
                                value={cfg.maxUploadMb ?? 15}
                                onChange={(e) => updateConfig({ ...cfg, maxUploadMb: Number(e.target.value) || 15 })}
                                className="w-full bg-card-bg border border-card-border rounded-lg px-3 py-2 text-xs font-mono text-foreground focus:outline-none focus:border-blue-500"
                            />
                        </div>
                    </div>

                    {/* API Key + Timeout Row */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                        <div className="md:col-span-9 space-y-1">
                            <div className="flex items-center justify-between gap-2">
                                <label className="text-[11px] font-semibold text-foreground/75 inline-flex items-center gap-1.5">
                                    <KeyRound className="w-3.5 h-3.5 text-blue-500" />
                                    <span>VPS Shared API Key (<code className="font-mono">X-API-Key</code> / <code className="font-mono">REMBG_API_KEY</code>)</span>
                                </label>
                                <span className="text-[10px] text-foreground/50">
                                    Private to server — never exposed to visitors
                                </span>
                            </div>
                            <div className="flex items-stretch gap-2">
                                <div className="relative flex-1 min-w-0">
                                    <input
                                        type={showApiKey ? 'text' : 'password'}
                                        value={cfg.serverAiApiKey || ''}
                                        onChange={(e) => updateConfig({ ...cfg, serverAiApiKey: e.target.value })}
                                        placeholder="Optional locally; recommended when connecting to ai.website.com"
                                        autoComplete="off"
                                        className="w-full bg-card-bg border border-card-border rounded-lg pl-3 pr-9 py-2 text-xs font-mono text-foreground focus:outline-none focus:border-blue-500"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowApiKey((v) => !v)}
                                        aria-label={showApiKey ? 'Hide API key' : 'Show API key'}
                                        title={showApiKey ? 'Hide key' : 'Show key'}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-foreground/55 hover:text-foreground cursor-pointer"
                                    >
                                        {showApiKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                    </button>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => {
                                        const nextKey = generateSecretApiKey();
                                        updateConfig({ ...cfg, serverAiApiKey: nextKey });
                                        setShowApiKey(true);
                                        toast.success('Generated new VPS API key (remember to Save)');
                                    }}
                                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-card-bg hover:bg-card-header-bg border border-card-border text-xs font-bold text-foreground cursor-pointer shrink-0 transition-colors"
                                >
                                    <RefreshCw className="w-3.5 h-3.5 text-blue-500" />
                                    <span>Generate</span>
                                </button>

                                <button
                                    type="button"
                                    disabled={!cfg.serverAiApiKey}
                                    onClick={() => handleCopy(cfg.serverAiApiKey || '', 'apikey')}
                                    title="Copy API key"
                                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-card-bg hover:bg-card-header-bg border border-card-border text-xs font-bold text-foreground cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shrink-0 transition-colors"
                                >
                                    {copiedKey === 'apikey' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                                    <span>{copiedKey === 'apikey' ? 'Copied' : 'Copy'}</span>
                                </button>
                            </div>
                        </div>

                        <div className="md:col-span-3 space-y-1">
                            <label className="text-[11px] font-semibold text-foreground/75 block">
                                Request Timeout (sec)
                            </label>
                            <input
                                type="number"
                                min={15}
                                max={600}
                                value={cfg.serverAiTimeout ?? 180}
                                onChange={(e) => updateConfig({ ...cfg, serverAiTimeout: Number(e.target.value) || 180 })}
                                className="w-full bg-card-bg border border-card-border rounded-lg px-3 py-2 text-xs font-mono text-foreground focus:outline-none focus:border-blue-500"
                            />
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                        <div className="flex flex-wrap items-center gap-4">
                            <label className="inline-flex items-center gap-2 text-xs text-foreground/80 cursor-pointer select-none">
                                <input
                                    type="checkbox"
                                    checked={Boolean(cfg.serverAiAlphaMatting)}
                                    onChange={(e) => updateConfig({ ...cfg, serverAiAlphaMatting: e.target.checked })}
                                    className="rounded border-card-border accent-blue-600"
                                />
                                <span>Enable Alpha Matting refinement (smoother fur/hair, slightly slower)</span>
                            </label>

                            {cfg.serverAiMode === 'http' && (
                                <label className="inline-flex items-center gap-2 text-xs text-foreground/80 cursor-pointer select-none">
                                    <input
                                        type="checkbox"
                                        checked={cfg.serverAiVerifySsl !== false}
                                        onChange={(e) => updateConfig({ ...cfg, serverAiVerifySsl: e.target.checked })}
                                        className="rounded border-card-border accent-blue-600"
                                    />
                                    <span className="inline-flex items-center gap-1">
                                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                                        Verify HTTPS SSL certificate
                                    </span>
                                </label>
                            )}
                        </div>

                        {localDiagnostics && cfg.serverAiMode !== 'http' && (
                            <span className="text-[11px] text-foreground/55 font-mono">
                                {localDiagnostics.hasLocalVenv ? 'Local python-ai/.venv detected' : `Resolved Python: ${localDiagnostics.detectedPython}`}
                            </span>
                        )}
                    </div>

                    {testResult && (
                        <div className={`rounded-xl border p-3 text-xs flex items-start gap-2.5 ${
                            testResult.ok
                                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                                : 'bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400'
                        }`}>
                            {testResult.ok ? (
                                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                            ) : (
                                <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
                            )}
                            <div className="space-y-1 min-w-0">
                                <div className="font-bold">
                                    {testResult.ok ? 'Server AI Check Passed' : 'Server AI Check Failed'}
                                </div>
                                {testResult.error ? (
                                    <p className="break-words">{testResult.error}</p>
                                ) : (
                                    <p className="font-mono text-[11px] break-all">
                                        {testResult.mode === 'http'
                                            ? `Reachable at ${testResult.target}${testResult.details?.authEnabled ? ' (API Key Verified)' : ''} • Cached models: ${(testResult.details?.cachedModels || []).join(', ') || 'none preloaded'}`
                                            : `Python ${testResult.details?.python || ''} • rembg ${testResult.details?.packages?.rembg || ''} • onnxruntime ${testResult.details?.packages?.onnxruntime || ''} • Cached models: ${(testResult.details?.cachedModels || []).length}`}
                                    </p>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* More Info: Remote VPS Setup Modal */}
            {showVpsGuide && (() => {
                const sub = deriveSubdomainInfo(cfg.serverAiServiceUrl);
                const sampleKey = cfg.serverAiApiKey?.trim() || 'REPLACE_WITH_YOUR_GENERATED_API_KEY';
                const activeModel = cfg.serverAiModel || 'isnet-general-use';
                const timeoutSec = Math.max(30, Number(cfg.serverAiTimeout) || 180);
                const maxMb = Math.max(1, Number(cfg.maxUploadMb) || 15);

                const installSnippet = `mkdir -p /opt/png101-bg-ai/models
cd /opt/png101-bg-ai
# Upload remove_bg.py, wsgi.py, and requirements.txt from python-ai/ into /opt/png101-bg-ai
python3 -m venv .venv
.venv/bin/pip install --upgrade pip
.venv/bin/pip install -r requirements.txt
# Pre-download model weights so first user request is fast:
.venv/bin/python remove_bg.py --download-models ${activeModel} --models-dir /opt/png101-bg-ai/models`;

                const systemdSnippet = `[Unit]
Description=Png101 Background Remover AI Service
After=network.target

[Service]
Type=simple
WorkingDirectory=/opt/png101-bg-ai
Environment="REMBG_API_KEY=${sampleKey}"
Environment="REMBG_DEFAULT_MODEL=${activeModel}"
Environment="REMBG_MODELS_DIR=/opt/png101-bg-ai/models"
Environment="REMBG_PRELOAD_MODELS=${activeModel}"
ExecStart=/opt/png101-bg-ai/.venv/bin/gunicorn -w 1 --threads 4 --timeout ${timeoutSec} -b 127.0.0.1:8001 wsgi:app
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target`;

                const nginxSnippet = `server {
    listen 80;
    server_name ${sub.host};

    client_max_body_size ${maxMb + 2}M;

    location / {
        proxy_pass http://127.0.0.1:8001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 30s;
        proxy_read_timeout ${timeoutSec}s;
        proxy_send_timeout ${timeoutSec}s;
    }
}`;

                const CopyBlock = ({ id, title, code }) => (
                    <div className="rounded-xl border border-card-border bg-background overflow-hidden">
                        <div className="px-3.5 py-2 border-b border-card-border flex items-center justify-between gap-2 bg-card-bg/60">
                            <span className="text-[11px] font-bold text-foreground/80">{title}</span>
                            <button
                                type="button"
                                onClick={() => handleCopy(code, id)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-card-bg hover:bg-card-header-bg border border-card-border text-[11px] font-bold text-foreground cursor-pointer transition-colors"
                            >
                                {copiedKey === id ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                                <span>{copiedKey === id ? 'Copied' : 'Copy'}</span>
                            </button>
                        </div>
                        <pre className="p-3.5 text-[11px] font-mono text-foreground/85 overflow-x-auto leading-relaxed whitespace-pre">
                            {code}
                        </pre>
                    </div>
                );

                return (
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-label="Remote VPS Setup Guide"
                        onClick={() => setShowVpsGuide(false)}
                        className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4"
                    >
                        <div
                            onClick={(e) => e.stopPropagation()}
                            className="w-full max-w-3xl max-h-[88vh] bg-card-bg border border-card-border rounded-2xl shadow-2xl flex flex-col overflow-hidden"
                        >
                            <div className="px-6 py-4 border-b border-card-border flex items-center justify-between gap-3 shrink-0">
                                <div className="flex items-center gap-2.5 min-w-0">
                                    <Server className="w-5 h-5 text-emerald-500 shrink-0" />
                                    <div className="min-w-0">
                                        <h3 className="font-bold text-sm sm:text-base text-foreground truncate">
                                            How to Host Server AI Models on a Remote VPS
                                        </h3>
                                        <p className="text-xs text-foreground/60 truncate">
                                            Recommended architecture: Main website stays on shared hosting; AI runs on <code className="font-mono">https://{sub.host}</code>
                                        </p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setShowVpsGuide(false)}
                                    aria-label="Close VPS setup guide"
                                    className="p-1.5 rounded-lg text-foreground/60 hover:text-foreground hover:bg-background cursor-pointer transition-colors"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            <div className="p-6 overflow-y-auto space-y-5 text-xs text-foreground/80 leading-relaxed">
                                <div className="rounded-xl bg-blue-500/10 border border-blue-500/25 p-3.5 space-y-1">
                                    <div className="font-bold text-blue-600 dark:text-blue-400">
                                        How the connection works
                                    </div>
                                    <p>
                                        Visitors upload images to your main website. Laravel forwards the image securely to <code className="font-mono">https://{sub.host}/remove-background</code> with your <code className="font-mono">X-API-Key</code> header, and streams the transparent PNG back. Visitors never see your VPS IP or API key.
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <h4 className="font-bold text-sm text-foreground">
                                        Step 1: Provision a VPS &amp; Point Your Subdomain
                                    </h4>
                                    <ul className="list-disc pl-5 space-y-1 text-foreground/75">
                                        <li>Recommended specs: Ubuntu 22.04/24.04 with <strong>2–4 GB RAM</strong> for <code className="font-mono">u2netp</code> / <code className="font-mono">isnet-general-use</code>, or <strong>4–8+ GB RAM</strong> for <code className="font-mono">birefnet-general</code>.</li>
                                        <li>In your DNS panel (Cloudflare / Registrar), create an <strong>A record</strong> for <code className="font-mono">{sub.host}</code> pointing to your VPS public IPv4 address. (Keep Cloudflare proxy orange-cloud OFF or ensure proxy timeout supports {timeoutSec}s.)</li>
                                    </ul>
                                </div>

                                <div className="space-y-2">
                                    <h4 className="font-bold text-sm text-foreground">
                                        Step 2: Install Python AI &amp; Pre-Download Model Weights
                                    </h4>
                                    <p className="text-foreground/70">
                                        Upload <code className="font-mono">python-ai/remove_bg.py</code>, <code className="font-mono">python-ai/wsgi.py</code>, and <code className="font-mono">python-ai/requirements.txt</code> to the VPS (do <strong>not</strong> upload the local Windows <code className="font-mono">.venv</code> folder):
                                    </p>
                                    <CopyBlock id="vps-install" title="Ubuntu / Debian Shell Setup" code={installSnippet} />
                                </div>

                                <div className="space-y-2">
                                    <h4 className="font-bold text-sm text-foreground">
                                        Step 3: Create the Background <code className="font-mono">systemd</code> Service (Gunicorn)
                                    </h4>
                                    <p className="text-foreground/70">
                                        Save to <code className="font-mono">/etc/systemd/system/png101-bg-ai.service</code>, then run <code className="font-mono">systemctl daemon-reload &amp;&amp; systemctl enable --now png101-bg-ai</code>. { !cfg.serverAiApiKey && 'Click Generate on the VPS Shared API Key field first so this snippet includes your real secret!' }
                                    </p>
                                    <CopyBlock id="vps-systemd" title="/etc/systemd/system/png101-bg-ai.service" code={systemdSnippet} />
                                </div>

                                <div className="space-y-2">
                                    <h4 className="font-bold text-sm text-foreground">
                                        Step 4: Nginx Reverse Proxy + Free SSL Certificate
                                    </h4>
                                    <p className="text-foreground/70">
                                        Save to <code className="font-mono">/etc/nginx/sites-available/{sub.host}</code>, symlink to <code className="font-mono">sites-enabled</code>, reload Nginx, then run <code className="font-mono">certbot --nginx -d {sub.host}</code>:
                                    </p>
                                    <CopyBlock id="vps-nginx" title={`/etc/nginx/sites-available/${sub.host}`} code={nginxSnippet} />
                                </div>

                                <div className="space-y-2">
                                    <h4 className="font-bold text-sm text-foreground">
                                        Step 5: Connect in Png101 Admin Settings
                                    </h4>
                                    <ol className="list-decimal pl-5 space-y-1 text-foreground/75">
                                        <li>Switch <strong>Execution Mode</strong> to <strong>Remote VPS / Persistent HTTP Service</strong>.</li>
                                        <li>Set <strong>AI Service Endpoint URL</strong> to <code className="font-mono">https://{sub.host}/remove-background</code>.</li>
                                        <li>Paste the same key into <strong>VPS Shared API Key</strong> (matching <code className="font-mono">REMBG_API_KEY</code> above).</li>
                                        <li>Click <strong>Test Server AI</strong> — you should see <code className="font-mono">Reachable ... (API Key Verified)</code>.</li>
                                        <li>Toggle <strong>Option 2: Server AI</strong> ON and click <strong>Save</strong>.</li>
                                    </ol>
                                </div>
                            </div>

                            <div className="px-6 py-3.5 border-t border-card-border flex items-center justify-end shrink-0 bg-background/50">
                                <button
                                    type="button"
                                    onClick={() => setShowVpsGuide(false)}
                                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold cursor-pointer transition-colors"
                                >
                                    Got it
                                </button>
                            </div>
                        </div>
                    </div>
                );
            })()}
        </div>
    );
}
