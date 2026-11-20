import { useState, useEffect } from 'react';
import { Head } from '@inertiajs/react';
import {
    RefreshCw,
    GitBranch,
    Database,
    CheckCircle2,
    AlertTriangle,
    XCircle,
    Rocket,
    ShieldCheck,
    Layers,
    Sparkles,
    Terminal,
    Clock,
} from 'lucide-react';
import { toast } from 'sonner';
import AdminLayout from '../../../Layouts/AdminLayout';
import { StatCard } from '../../../components/ui/StatCard';

export default function UpdateAppPage() {
    const [loading, setLoading] = useState(true);
    const [isLocal, setIsLocal] = useState(false);
    const [appVersion, setAppVersion] = useState('1.0.0');
    const [diagnostics, setDiagnostics] = useState(null);

    const [checkingRemote, setCheckingRemote] = useState(false);
    const [remoteStatus, setRemoteStatus] = useState(null);

    const [runningUpdate, setRunningUpdate] = useState(false);
    const [updateResult, setUpdateResult] = useState(null);

    const [options, setOptions] = useState({
        pull_git: false,
        run_migrations: true,
        refresh_caches: true,
        regen_seo: true,
        maintenance_mode: false,
    });

    const loadStatus = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/admin/update-app/status');
            if (res.ok) {
                const data = await res.json();
                setIsLocal(Boolean(data.isLocal));
                setAppVersion(data.appVersion || '1.0.0');
                setDiagnostics(data.diagnostics || null);
            } else {
                const err = await res.json().catch(() => ({}));
                toast.error(err.error || 'Failed to load update diagnostics');
            }
        } catch {
            toast.error('Failed to load update diagnostics');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadStatus();
    }, []);

    const handleCheckRemote = async () => {
        setCheckingRemote(true);
        setRemoteStatus(null);
        try {
            const res = await fetch('/api/admin/update-app/check-remote', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
            });
            const data = await res.json();
            setRemoteStatus(data);
            if (data.ok) {
                toast.success(data.message || 'Checked GitHub remote');
            } else {
                toast.warning(data.message || 'Could not query Git remote');
            }
        } catch {
            toast.error('Failed to check GitHub remote');
        } finally {
            setCheckingRemote(false);
        }
    };

    const handleRunUpdate = async () => {
        if (isLocal) {
            toast.error('Deployment updates run on live hosting only.');
            return;
        }
        setRunningUpdate(true);
        setUpdateResult(null);
        try {
            const res = await fetch('/api/admin/update-app/run', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(options),
            });
            const data = await res.json();
            setUpdateResult(data);
            if (data.diagnostics) {
                setDiagnostics(data.diagnostics);
            }
            if (res.ok && data.ok) {
                toast.success(data.message || 'Application updated successfully!');
                window.dispatchEvent(new Event('png101:update-applied'));
            } else {
                toast.error(data.message || 'Update failed');
            }
        } catch (err) {
            toast.error('Network error while running update');
        } finally {
            setRunningUpdate(false);
        }
    };

    const pendingMigrations = diagnostics?.pending_migrations || [];

    return (
        <AdminLayout>
            <Head title="Update App - Png101 Admin" />
            <div className="space-y-6 pb-24">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                    <div>
                        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 mb-1">
                            <h1 className="text-xl sm:text-2xl xl:text-3xl font-bold text-foreground flex items-center gap-2.5 sm:gap-3">
                                <Rocket className="w-6 h-6 sm:w-7 sm:h-7 text-primary-glow shrink-0" />
                                <span>Update App</span>
                            </h1>
                            <span
                                className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                                    isLocal
                                        ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                                        : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                                }`}
                            >
                                {isLocal ? 'Local Development' : 'Production Hosting'}
                            </span>
                        </div>
                        <p className="hidden xl:block text-foreground/60 text-sm">
                            Check GitHub remote commits, run database migrations, refresh caches, and regenerate sitemaps safely as Super Admin.
                        </p>
                    </div>

                    <div className="inline-flex flex-wrap items-center gap-1 p-1 bg-card-header-bg border border-card-border rounded-xl self-start sm:self-auto">
                        <button
                            type="button"
                            onClick={loadStatus}
                            disabled={loading}
                            title="Refresh Status"
                            className="h-8 inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 rounded-lg bg-card-bg hover:bg-foreground/5 text-xs font-bold text-foreground/85 cursor-pointer disabled:opacity-50 transition-all shadow-sm"
                        >
                            <RefreshCw className={`w-3.5 h-3.5 text-primary-glow ${loading ? 'animate-spin' : ''}`} />
                            <span className="sm:hidden">Refresh</span>
                            <span className="hidden sm:inline">Refresh Status</span>
                        </button>
                        <button
                            type="button"
                            onClick={handleCheckRemote}
                            disabled={checkingRemote || loading}
                            title="Check GitHub Remote"
                            className="h-8 inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 rounded-lg bg-primary-glow hover:bg-blue-600 text-white text-xs font-bold cursor-pointer disabled:opacity-50 transition-all shadow-sm"
                        >
                            <GitBranch className={`w-3.5 h-3.5 ${checkingRemote ? 'animate-spin' : ''}`} />
                            <span className="sm:hidden">{checkingRemote ? '...' : 'Check Git'}</span>
                            <span className="hidden sm:inline">{checkingRemote ? 'Checking Remote...' : 'Check GitHub Remote'}</span>
                        </button>
                    </div>
                </div>

                {/* Local Dev Notice */}
                {isLocal && (
                    <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex items-start gap-3">
                        <ShieldCheck className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                        <div className="text-xs text-foreground/80 space-y-1">
                            <div className="font-bold text-amber-400 uppercase tracking-wider">
                                Local Development Guard Active
                            </div>
                            <p>
                                You can inspect diagnostics and check GitHub remote status here, while <strong>Apply Updates Now</strong> is restricted to your live Namecheap hosting so local files and database state are never overwritten.
                            </p>
                        </div>
                    </div>
                )}

                {/* Pending Updates Callout */}
                {diagnostics?.has_pending_updates && (
                    <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 flex items-start gap-3">
                        <Sparkles className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                        <div className="text-xs text-foreground/85 space-y-1">
                            <div className="font-bold text-blue-400 uppercase tracking-wider">
                                New Deployment Changes Detected
                            </div>
                            <p>
                                {diagnostics.new_commit_detected && (
                                    <span>
                                        Server commit <code className="text-blue-300">{diagnostics.git?.short_commit || '?'}</code> differs from last applied commit <code className="text-blue-300">{diagnostics.recorded_short_commit || 'initial'}</code>.{' '}
                                    </span>
                                )}
                                {pendingMigrations.length > 0 && (
                                    <span>
                                        Found <strong>{pendingMigrations.length}</strong> pending database migration(s).
                                    </span>
                                )}
                            </p>
                        </div>
                    </div>
                )}

                {/* Diagnostic Stat Cards (Desktop / Laptop >= 1280px only) */}
                <div className="hidden xl:grid xl:grid-cols-4 gap-5">
                    <StatCard
                        title="Code Version"
                        value={`v${diagnostics?.app_version || appVersion}`}
                        subtitle={
                            diagnostics?.installed_version
                                ? `Last applied: v${diagnostics.installed_version}${diagnostics.recorded_short_commit ? ` (${diagnostics.recorded_short_commit})` : ''}`
                                : 'No applied state recorded yet'
                        }
                        icon={<Layers className="w-6 h-6" />}
                    />
                    <StatCard
                        title="Git HEAD on Server"
                        value={
                            diagnostics?.git?.has_git
                                ? diagnostics.git.short_commit || 'Active'
                                : 'No .git'
                        }
                        subtitle={
                            diagnostics?.git?.has_git
                                ? `Branch: ${diagnostics.git.branch || 'main'}`
                                : 'Git directory not detected'
                        }
                        icon={<GitBranch className="w-6 h-6" />}
                    />
                    <StatCard
                        title="Pending Migrations"
                        value={pendingMigrations.length}
                        subtitle={pendingMigrations.length > 0 ? 'Schema updates ready to run' : 'Database schema up to date'}
                        icon={<Database className="w-6 h-6" />}
                    />
                    <StatCard
                        title="Frontend Build & DB"
                        value={
                            diagnostics
                                ? diagnostics.db_connected && diagnostics.build_manifest_ok
                                    ? 'Healthy'
                                    : 'Attention'
                                : '...'
                        }
                        subtitle={
                            diagnostics
                                ? `DB: ${diagnostics.db_connected ? 'OK' : 'Error'} · Vite: ${diagnostics.build_manifest_ok ? 'Ready' : 'Missing'}`
                                : 'Checking environment...'
                        }
                        icon={<CheckCircle2 className="w-6 h-6" />}
                    />
                </div>

                {/* Git Remote Check Result */}
                {remoteStatus && (
                    <div
                        className={`rounded-xl border p-4 text-xs space-y-2 ${
                            remoteStatus.ok
                                ? remoteStatus.commits_behind > 0
                                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                                    : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                                : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                        }`}
                    >
                        <div className="font-bold text-sm">{remoteStatus.message}</div>
                        {Array.isArray(remoteStatus.incoming_commits) && remoteStatus.incoming_commits.length > 0 && (
                            <ul className="space-y-1 font-mono text-[11px] bg-black/25 rounded-lg p-3 border border-white/10">
                                {remoteStatus.incoming_commits.map((line, i) => (
                                    <li key={i}>{line}</li>
                                ))}
                            </ul>
                        )}
                    </div>
                )}

                {/* Pending Migrations List */}
                {pendingMigrations.length > 0 && (
                    <div className="bg-card-bg border border-card-border rounded-xl p-4 text-xs space-y-2">
                        <div className="font-bold text-foreground">Pending Migration Files:</div>
                        <div className="flex flex-wrap gap-1.5">
                            {pendingMigrations.map((m) => (
                                <span
                                    key={m}
                                    className="px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 font-mono text-[11px] text-amber-300"
                                >
                                    {m}
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                {/* Apply Updates Controls */}
                <div className="bg-card-bg border border-card-border rounded-2xl overflow-hidden">
                    <div className="p-6 border-b border-card-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-xl bg-primary-glow/10 text-primary-glow border border-primary-glow/20">
                                <Rocket className="w-5 h-5" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-foreground">Apply Deployment Updates</h2>
                                <p className="text-xs text-foreground/60">
                                    Pull from Namecheap cPanel &rarr; Git Version Control (or use shell git pull if enabled), then click Apply Updates Now.
                                </p>
                            </div>
                        </div>

                        {diagnostics?.updated_at && (
                            <span className="inline-flex items-center gap-1.5 text-xs text-foreground/50">
                                <Clock className="w-3.5 h-3.5" />
                                Last update: {new Date(diagnostics.updated_at).toLocaleString()}
                            </span>
                        )}
                    </div>

                    <div className="p-6 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {diagnostics?.can_shell_git && (
                                <label className="flex items-start gap-3 p-3.5 rounded-xl bg-background border border-card-border cursor-pointer hover:border-primary-glow/30 transition-all">
                                    <input
                                        type="checkbox"
                                        checked={options.pull_git}
                                        disabled={isLocal}
                                        onChange={(e) => setOptions((p) => ({ ...p, pull_git: e.target.checked }))}
                                        className="w-4 h-4 mt-0.5 accent-blue-500"
                                    />
                                    <div>
                                        <div className="text-sm font-bold text-foreground">Pull latest code from GitHub</div>
                                        <div className="text-xs text-foreground/55">
                                            Runs <code>git pull --ff-only</code> automatically if you didn&apos;t pull from cPanel first.
                                        </div>
                                    </div>
                                </label>
                            )}

                            <label className="flex items-start gap-3 p-3.5 rounded-xl bg-background border border-card-border cursor-pointer hover:border-primary-glow/30 transition-all">
                                <input
                                    type="checkbox"
                                    checked={options.run_migrations}
                                    disabled={isLocal}
                                    onChange={(e) => setOptions((p) => ({ ...p, run_migrations: e.target.checked }))}
                                    className="w-4 h-4 mt-0.5 accent-blue-500"
                                />
                                <div>
                                    <div className="text-sm font-bold text-foreground">Run Database Migrations</div>
                                    <div className="text-xs text-foreground/55">
                                        Applies new schema migrations safely without deleting existing data.
                                    </div>
                                </div>
                            </label>

                            <label className="flex items-start gap-3 p-3.5 rounded-xl bg-background border border-card-border cursor-pointer hover:border-primary-glow/30 transition-all">
                                <input
                                    type="checkbox"
                                    checked={options.refresh_caches}
                                    disabled={isLocal}
                                    onChange={(e) => setOptions((p) => ({ ...p, refresh_caches: e.target.checked }))}
                                    className="w-4 h-4 mt-0.5 accent-blue-500"
                                />
                                <div>
                                    <div className="text-sm font-bold text-foreground">Clear & Refresh Caches</div>
                                    <div className="text-xs text-foreground/55">
                                        Flushes compiled config, routes, and Blade views after code changes.
                                    </div>
                                </div>
                            </label>

                            <label className="flex items-start gap-3 p-3.5 rounded-xl bg-background border border-card-border cursor-pointer hover:border-primary-glow/30 transition-all">
                                <input
                                    type="checkbox"
                                    checked={options.regen_seo}
                                    disabled={isLocal}
                                    onChange={(e) => setOptions((p) => ({ ...p, regen_seo: e.target.checked }))}
                                    className="w-4 h-4 mt-0.5 accent-blue-500"
                                />
                                <div>
                                    <div className="text-sm font-bold text-foreground">Regenerate Sitemaps & SEO</div>
                                    <div className="text-xs text-foreground/55">
                                        Rebuilds <code>sitemap*.xml</code>, <code>robots.txt</code>, and <code>llms.txt</code>.
                                    </div>
                                </div>
                            </label>

                            <label className="flex items-start gap-3 p-3.5 rounded-xl bg-background border border-card-border cursor-pointer hover:border-primary-glow/30 transition-all md:col-span-2">
                                <input
                                    type="checkbox"
                                    checked={options.maintenance_mode}
                                    disabled={isLocal}
                                    onChange={(e) => setOptions((p) => ({ ...p, maintenance_mode: e.target.checked }))}
                                    className="w-4 h-4 mt-0.5 accent-blue-500"
                                />
                                <div>
                                    <div className="text-sm font-bold text-foreground">Briefly Enable Maintenance Mode While Updating</div>
                                    <div className="text-xs text-foreground/55">
                                        Brings the site back online automatically as soon as update steps complete.
                                    </div>
                                </div>
                            </label>
                        </div>

                        <div className="pt-2 flex flex-wrap items-center justify-between gap-4">
                            <span className="text-xs text-foreground/50">
                                Super Admin exclusive · Public <code>/update</code> route is disabled for security.
                            </span>

                            <button
                                type="button"
                                onClick={handleRunUpdate}
                                disabled={runningUpdate || isLocal || loading}
                                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary-glow hover:bg-primary-glow/90 text-white text-sm font-bold shadow-lg shadow-primary-glow/25 cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed transition-all"
                            >
                                <Rocket className={`w-4 h-4 ${runningUpdate ? 'animate-bounce' : ''}`} />
                                {runningUpdate
                                    ? 'Applying Updates...'
                                    : isLocal
                                    ? 'Apply Updates (Hosting Only)'
                                    : 'Apply Updates Now'}
                            </button>
                        </div>

                        {/* Execution Step Log */}
                        {updateResult && (
                            <div className="pt-4 border-t border-card-border space-y-3">
                                <div
                                    className={`p-3.5 rounded-xl border text-xs font-bold flex items-center gap-2 ${
                                        updateResult.ok
                                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                                            : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                                    }`}
                                >
                                    {updateResult.ok ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                                    <span>{updateResult.message}</span>
                                </div>

                                {Array.isArray(updateResult.steps) && updateResult.steps.length > 0 && (
                                    <div className="space-y-2">
                                        <div className="text-xs font-bold uppercase tracking-wider text-foreground/60 flex items-center gap-1.5">
                                            <Terminal className="w-3.5 h-3.5" />
                                            Step Execution Log
                                        </div>
                                        {updateResult.steps.map((s, idx) => (
                                            <div
                                                key={idx}
                                                className="p-3 rounded-xl bg-background border border-card-border flex items-start gap-2.5 text-xs"
                                            >
                                                {s.status === 'ok' ? (
                                                    <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                                                ) : s.status === 'warn' ? (
                                                    <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                                                ) : (
                                                    <XCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                                                )}
                                                <div className="min-w-0">
                                                    <div className="font-bold text-foreground">{s.step}</div>
                                                    <div className="text-foreground/60 whitespace-pre-wrap break-words mt-0.5">
                                                        {s.detail}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}

