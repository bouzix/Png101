import React, { useEffect, useState, useCallback } from 'react';
import { Link } from '@inertiajs/react';
import {
    Rocket,
    X,
    CheckCircle2,
    AlertTriangle,
    XCircle,
    Database,
    GitCommitHorizontal,
    Sparkles,
    Terminal,
    ShieldCheck,
    ExternalLink,
    Loader2,
} from 'lucide-react';
import { toast } from 'sonner';

export default function GlobalUpdateNotifier({ session, pathname }) {
    const isSuperAdmin = session?.role === 'super_admin';

    const [isLocal, setIsLocal] = useState(false);
    const [appVersion, setAppVersion] = useState('1.0.0');
    const [diagnostics, setDiagnostics] = useState(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [runningUpdate, setRunningUpdate] = useState(false);
    const [updateResult, setUpdateResult] = useState(null);

    const [options, setOptions] = useState({
        pull_git: false,
        run_migrations: true,
        refresh_caches: true,
        regen_seo: true,
        maintenance_mode: false,
    });

    const fetchUpdateStatus = useCallback(async () => {
        if (!isSuperAdmin) {
            setDiagnostics(null);
            return;
        }
        try {
            const res = await fetch('/api/admin/update-app/status');
            if (!res.ok) return;
            const data = await res.json();
            if (data?.ok) {
                setIsLocal(Boolean(data.isLocal));
                setAppVersion(data.appVersion || '1.0.0');
                setDiagnostics(data.diagnostics || null);
            }
        } catch {
            // Silently ignore transient fetch issues in global notifier
        }
    }, [isSuperAdmin]);

    useEffect(() => {
        if (!isSuperAdmin) return undefined;
        fetchUpdateStatus();
    }, [isSuperAdmin, pathname, fetchUpdateStatus]);

    useEffect(() => {
        const handleExternalUpdate = () => {
            fetchUpdateStatus();
        };
        window.addEventListener('png101:update-applied', handleExternalUpdate);
        return () => window.removeEventListener('png101:update-applied', handleExternalUpdate);
    }, [fetchUpdateStatus]);

    const handleApplyUpdate = async () => {
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
        } catch {
            toast.error('Network error while running update');
        } finally {
            setRunningUpdate(false);
        }
    };

    const hasPendingUpdates = Boolean(diagnostics?.has_pending_updates);

    // Never show the pill unless the user is Super Admin and an update actually needs applying
    if (!isSuperAdmin || (!hasPendingUpdates && !modalOpen)) {
        return null;
    }

    const pendingMigrations = diagnostics?.pending_migrations || [];
    const releaseChanges = diagnostics?.release_changes || [];
    const recentCommits = diagnostics?.recent_commits || [];
    const targetVersion = diagnostics?.app_version || appVersion;
    const currentVersion = diagnostics?.installed_version || targetVersion;
    const shortCommit = diagnostics?.git?.short_commit;
    const recordedShortCommit = diagnostics?.recorded_short_commit;

    const pillSubtitle = diagnostics?.version_changed
        ? `v${targetVersion}`
        : pendingMigrations.length > 0
        ? `${pendingMigrations.length} migration${pendingMigrations.length > 1 ? 's' : ''}`
        : shortCommit || `v${targetVersion}`;

    return (
        <>
            {/* Floating Global Pill Notification Button (only shown when updates are pending) */}
            {hasPendingUpdates && (
                <div className="fixed top-5 right-6 z-40 flex justify-end pointer-events-none">
                    <button
                        type="button"
                        onClick={() => {
                            setUpdateResult(null);
                            setModalOpen(true);
                        }}
                        className="pointer-events-auto inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-blue-600/95 hover:bg-blue-500 text-white text-xs font-bold border border-blue-400/50 shadow-lg shadow-blue-600/30 backdrop-blur-md transition-all duration-200 hover:scale-[1.02] cursor-pointer"
                        title="Click to inspect update details and apply updates"
                    >
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75" />
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
                        </span>
                        <Rocket className={`w-3.5 h-3.5 ${runningUpdate ? 'animate-bounce' : ''}`} />
                        <span>{runningUpdate ? 'Applying Update...' : 'Update Available'}</span>
                        <span className="px-2 py-0.5 rounded-full bg-white/15 border border-white/20 text-[10px] font-mono">
                            {pillSubtitle}
                        </span>
                    </button>
                </div>
            )}

            {/* Update Info & Apply Modal */}
            {modalOpen && (
                <div
                    className="fixed inset-0 z-50 bg-black/65 backdrop-blur-sm flex items-center justify-center p-4"
                    onClick={() => !runningUpdate && setModalOpen(false)}
                >
                    <div
                        className="w-full max-w-2xl bg-card-bg border border-card-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div className="px-6 py-4 border-b border-card-border bg-slate-100/70 dark:bg-slate-900/60 flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="p-2.5 rounded-xl bg-blue-600/15 text-blue-500 dark:text-blue-400 border border-blue-500/30 shrink-0">
                                    <Rocket className="w-5 h-5" />
                                </div>
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <h2 className="text-base sm:text-lg font-bold text-foreground">
                                            {hasPendingUpdates ? 'App Update Available' : 'Application Up to Date'}
                                        </h2>
                                        <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-500/15 text-blue-500 dark:text-blue-300 border border-blue-500/30 font-mono">
                                            v{targetVersion}
                                        </span>
                                    </div>
                                    <p className="text-xs text-foreground/60 truncate">
                                        {diagnostics?.version_changed
                                            ? `Installed v${currentVersion} → Code v${targetVersion}`
                                            : `Current code version v${targetVersion}${diagnostics?.released_at ? ` (${diagnostics.released_at})` : ''}`}
                                    </p>
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={() => !runningUpdate && setModalOpen(false)}
                                disabled={runningUpdate}
                                className="p-1.5 rounded-lg text-foreground/50 hover:text-foreground hover:bg-card-header-bg transition-colors cursor-pointer disabled:opacity-40"
                                aria-label="Close update modal"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Modal Scrollable Body */}
                        <div className="p-6 space-y-5 overflow-y-auto">
                            {/* Version / Commit / Migrations Strip */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div className="p-3 rounded-xl bg-background border border-card-border">
                                    <div className="text-[11px] font-semibold uppercase tracking-wider text-foreground/50">
                                        Version
                                    </div>
                                    <div className="mt-1 text-sm font-bold text-foreground font-mono">
                                        v{currentVersion} &rarr; v{targetVersion}
                                    </div>
                                </div>

                                <div className="p-3 rounded-xl bg-background border border-card-border">
                                    <div className="text-[11px] font-semibold uppercase tracking-wider text-foreground/50 flex items-center gap-1">
                                        <GitCommitHorizontal className="w-3.5 h-3.5" />
                                        Commit
                                    </div>
                                    <div className="mt-1 text-sm font-bold text-foreground font-mono truncate">
                                        {recordedShortCommit || 'initial'} &rarr; {shortCommit || 'local'}
                                    </div>
                                </div>

                                <div className="p-3 rounded-xl bg-background border border-card-border">
                                    <div className="text-[11px] font-semibold uppercase tracking-wider text-foreground/50 flex items-center gap-1">
                                        <Database className="w-3.5 h-3.5" />
                                        Migrations
                                    </div>
                                    <div className="mt-1 text-sm font-bold text-foreground">
                                        {pendingMigrations.length > 0
                                            ? `${pendingMigrations.length} pending`
                                            : 'Schema ready'}
                                    </div>
                                </div>
                            </div>

                            {/* Local Dev Notice */}
                            {isLocal && (
                                <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3.5 flex items-start gap-3">
                                    <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                                    <p className="text-xs text-foreground/80">
                                        Running on local development. Apply updates directly from your live hosting admin dashboard so local files and database state stay untouched.
                                    </p>
                                </div>
                            )}

                            {/* Changes / Release Notes */}
                            <div className="space-y-3">
                                <div className="text-xs font-bold uppercase tracking-wider text-foreground/60 flex items-center gap-1.5">
                                    <Sparkles className="w-3.5 h-3.5 text-primary-glow" />
                                    What Changed in This Update
                                </div>

                                {releaseChanges.length > 0 && (
                                    <ul className="space-y-1.5 p-3.5 rounded-xl bg-background border border-card-border text-xs text-foreground/85">
                                        {releaseChanges.map((item, idx) => (
                                            <li key={idx} className="flex items-start gap-2">
                                                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                                                <span>{item}</span>
                                            </li>
                                        ))}
                                    </ul>
                                )}

                                {recentCommits.length > 0 && (
                                    <div className="space-y-1.5">
                                        <div className="text-[11px] font-semibold text-foreground/50">
                                            Recent Commits Included:
                                        </div>
                                        <div className="max-h-40 overflow-y-auto space-y-1.5 p-3 rounded-xl bg-background border border-card-border">
                                            {recentCommits.map((commit, idx) => (
                                                <div
                                                    key={`${commit.hash}-${idx}`}
                                                    className="flex items-start justify-between gap-2 text-xs"
                                                >
                                                    <div className="flex items-start gap-2 min-w-0">
                                                        {commit.hash && (
                                                            <code className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-500 dark:text-blue-300 font-mono text-[10px] shrink-0">
                                                                {commit.hash}
                                                            </code>
                                                        )}
                                                        <span className="text-foreground/85 break-words">
                                                            {commit.message}
                                                        </span>
                                                    </div>
                                                    {commit.date && (
                                                        <span className="text-[10px] text-foreground/45 shrink-0 whitespace-nowrap">
                                                            {commit.date}
                                                        </span>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {pendingMigrations.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5">
                                        {pendingMigrations.map((m) => (
                                            <span
                                                key={m}
                                                className="px-2 py-1 rounded-lg bg-amber-500/10 border border-amber-500/25 font-mono text-[11px] text-amber-500 dark:text-amber-300"
                                            >
                                                {m}
                                            </span>
                                        ))}
                                    </div>
                                )}

                                {releaseChanges.length === 0 && recentCommits.length === 0 && pendingMigrations.length === 0 && (
                                    <div className="p-3 rounded-xl bg-background border border-card-border text-xs text-foreground/65">
                                        New deployment code detected on this server. Apply the update below to synchronize migrations, caches, and sitemaps.
                                    </div>
                                )}
                            </div>

                            {/* Compact Apply Options */}
                            {hasPendingUpdates && (
                                <div className="space-y-2">
                                    <div className="text-xs font-bold uppercase tracking-wider text-foreground/60">
                                        Update Actions
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                                        {diagnostics?.can_shell_git && (
                                            <label className="flex items-center gap-2.5 p-2.5 rounded-xl bg-background border border-card-border cursor-pointer sm:col-span-2">
                                                <input
                                                    type="checkbox"
                                                    checked={options.pull_git}
                                                    disabled={isLocal || runningUpdate}
                                                    onChange={(e) => setOptions((p) => ({ ...p, pull_git: e.target.checked }))}
                                                    className="w-4 h-4 accent-blue-500"
                                                />
                                                <span className="font-medium text-foreground">
                                                    Pull latest commits from GitHub (<code className="font-mono">git pull --ff-only</code>)
                                                </span>
                                            </label>
                                        )}

                                        <label className="flex items-center gap-2.5 p-2.5 rounded-xl bg-background border border-card-border cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={options.run_migrations}
                                                disabled={isLocal || runningUpdate}
                                                onChange={(e) => setOptions((p) => ({ ...p, run_migrations: e.target.checked }))}
                                                className="w-4 h-4 accent-blue-500"
                                            />
                                            <span className="font-medium text-foreground">Run DB Migrations</span>
                                        </label>

                                        <label className="flex items-center gap-2.5 p-2.5 rounded-xl bg-background border border-card-border cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={options.refresh_caches}
                                                disabled={isLocal || runningUpdate}
                                                onChange={(e) => setOptions((p) => ({ ...p, refresh_caches: e.target.checked }))}
                                                className="w-4 h-4 accent-blue-500"
                                            />
                                            <span className="font-medium text-foreground">Refresh Caches</span>
                                        </label>

                                        <label className="flex items-center gap-2.5 p-2.5 rounded-xl bg-background border border-card-border cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={options.regen_seo}
                                                disabled={isLocal || runningUpdate}
                                                onChange={(e) => setOptions((p) => ({ ...p, regen_seo: e.target.checked }))}
                                                className="w-4 h-4 accent-blue-500"
                                            />
                                            <span className="font-medium text-foreground">Regenerate SEO & Sitemaps</span>
                                        </label>

                                        <label className="flex items-center gap-2.5 p-2.5 rounded-xl bg-background border border-card-border cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={options.maintenance_mode}
                                                disabled={isLocal || runningUpdate}
                                                onChange={(e) => setOptions((p) => ({ ...p, maintenance_mode: e.target.checked }))}
                                                className="w-4 h-4 accent-blue-500"
                                            />
                                            <span className="font-medium text-foreground">Brief Maintenance Mode</span>
                                        </label>
                                    </div>
                                </div>
                            )}

                            {/* Live Applying Update Animation */}
                            {runningUpdate && (
                                <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/30 space-y-3 animate-in fade-in duration-200">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-lg bg-blue-600 text-white shadow-sm">
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="text-xs font-bold text-foreground">
                                                Applying Update to v{targetVersion}...
                                            </div>
                                            <div className="text-[11px] text-foreground/65 mt-0.5">
                                                Synchronizing database migrations, refreshing caches, and rebuilding sitemaps.
                                            </div>
                                        </div>
                                    </div>
                                    <div className="w-full h-2 rounded-full bg-background border border-card-border overflow-hidden">
                                        <div className="h-full w-2/3 rounded-full bg-gradient-to-r from-blue-600 via-primary-glow to-emerald-400 animate-pulse" />
                                    </div>
                                </div>
                            )}

                            {/* Execution Output */}
                            {updateResult && (
                                <div className="pt-3 border-t border-card-border space-y-2.5">
                                    <div
                                        className={`p-3 rounded-xl border text-xs font-bold flex items-center gap-2 ${
                                            updateResult.ok
                                                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500 dark:text-emerald-400'
                                                : 'bg-rose-500/10 border-rose-500/30 text-rose-500 dark:text-rose-400'
                                        }`}
                                    >
                                        {updateResult.ok ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <XCircle className="w-4 h-4 shrink-0" />}
                                        <span>{updateResult.message}</span>
                                    </div>

                                    {Array.isArray(updateResult.steps) && updateResult.steps.length > 0 && (
                                        <div className="space-y-1.5">
                                            <div className="text-[11px] font-bold uppercase tracking-wider text-foreground/55 flex items-center gap-1.5">
                                                <Terminal className="w-3.5 h-3.5" />
                                                Step Log
                                            </div>
                                            {updateResult.steps.map((step, idx) => (
                                                <div
                                                    key={idx}
                                                    className="p-2.5 rounded-xl bg-background border border-card-border flex items-start gap-2 text-xs"
                                                >
                                                    {step.status === 'ok' ? (
                                                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                                                    ) : step.status === 'warn' ? (
                                                        <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                                                    ) : (
                                                        <XCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                                                    )}
                                                    <div className="min-w-0">
                                                        <div className="font-bold text-foreground">{step.step}</div>
                                                        <div className="text-foreground/60 whitespace-pre-wrap break-words">{step.detail}</div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="px-6 py-4 border-t border-card-border bg-slate-100/50 dark:bg-slate-900/40 flex flex-wrap items-center justify-between gap-3">
                            <Link
                                href="/admin/dashboard/settings/update-app"
                                onClick={() => setModalOpen(false)}
                                className="inline-flex items-center gap-1.5 text-xs font-semibold text-foreground/60 hover:text-primary-glow transition-colors"
                            >
                                <span>Full Update App Page</span>
                                <ExternalLink className="w-3.5 h-3.5" />
                            </Link>

                            <div className="flex items-center gap-2.5">
                                <button
                                    type="button"
                                    onClick={() => setModalOpen(false)}
                                    disabled={runningUpdate}
                                    className="px-4 py-2 rounded-xl border border-card-border bg-background hover:bg-card-header-bg text-xs font-bold text-foreground/80 transition-colors cursor-pointer disabled:opacity-50"
                                >
                                    Close
                                </button>

                                {hasPendingUpdates && (
                                    <button
                                        type="button"
                                        onClick={handleApplyUpdate}
                                        disabled={runningUpdate || isLocal}
                                        className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-600/25 transition-all cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed"
                                    >
                                        {runningUpdate ? (
                                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        ) : (
                                            <Rocket className="w-3.5 h-3.5" />
                                        )}
                                        {runningUpdate
                                            ? 'Applying Updates...'
                                            : isLocal
                                            ? 'Hosting Only'
                                            : 'Apply Updates Now'}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

