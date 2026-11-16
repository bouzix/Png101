import React, { useEffect, useState, useSyncExternalStore } from 'react';
import {
    CheckCircle2,
    AlertCircle,
    Info,
    AlertTriangle,
    Loader2,
    X,
} from 'lucide-react';

const MAX_TOASTS = 5;
const EXIT_DURATION_MS = 295;

const DEFAULT_DURATIONS = {
    success: 3600,
    info: 3800,
    warning: 4500,
    error: 5200,
    loading: 0, // sticky until updated or dismissed
};

const VARIANT_CONFIG = {
    success: {
        label: 'Success',
        icon: CheckCircle2,
        role: 'status',
        ringClass: 'border-emerald-500/30 dark:border-emerald-400/25',
        badgeClass: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/25',
        barClass: 'bg-emerald-500',
    },
    error: {
        label: 'Error',
        icon: AlertCircle,
        role: 'alert',
        ringClass: 'border-rose-500/35 dark:border-rose-400/30',
        badgeClass: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/25',
        barClass: 'bg-rose-500',
    },
    warning: {
        label: 'Notice',
        icon: AlertTriangle,
        role: 'alert',
        ringClass: 'border-amber-500/35 dark:border-amber-400/30',
        badgeClass: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/25',
        barClass: 'bg-amber-500',
    },
    info: {
        label: 'Info',
        icon: Info,
        role: 'status',
        ringClass: 'border-blue-500/30 dark:border-blue-400/25',
        badgeClass: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/25',
        barClass: 'bg-blue-500',
    },
    loading: {
        label: 'Working',
        icon: Loader2,
        role: 'status',
        ringClass: 'border-indigo-500/30 dark:border-indigo-400/25',
        badgeClass: 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/25',
        barClass: 'bg-indigo-500',
    },
};

let toastsState = [];
let seqCounter = 0;
const listeners = new Set();
const autoTimers = new Map();
const exitTimers = new Map();
const timerMeta = new Map();

function emitChange() {
    for (const listener of listeners) {
        listener();
    }
}

function subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

function getSnapshot() {
    return toastsState;
}

function clearAutoTimer(id) {
    const t = autoTimers.get(id);
    if (t) {
        clearTimeout(t);
        autoTimers.delete(id);
    }
}

function clearExitTimer(id) {
    const t = exitTimers.get(id);
    if (t) {
        clearTimeout(t);
        exitTimers.delete(id);
    }
}

function scheduleAutoDismiss(id, durationMs) {
    clearAutoTimer(id);
    if (!durationMs || durationMs <= 0) {
        timerMeta.delete(id);
        return;
    }
    timerMeta.set(id, { remaining: durationMs, startedAt: Date.now(), total: durationMs });
    const handle = setTimeout(() => {
        dismissToast(id);
    }, durationMs);
    autoTimers.set(id, handle);
}

function pauseAutoDismiss(id) {
    const meta = timerMeta.get(id);
    if (!meta) return;
    clearAutoTimer(id);
    const elapsed = Date.now() - meta.startedAt;
    meta.remaining = Math.max(150, meta.remaining - elapsed);
}

function resumeAutoDismiss(id) {
    const meta = timerMeta.get(id);
    if (!meta) return;
    const item = toastsState.find((t) => t.id === id);
    if (!item || item.closing) return;
    meta.startedAt = Date.now();
    clearAutoTimer(id);
    const handle = setTimeout(() => {
        dismissToast(id);
    }, meta.remaining);
    autoTimers.set(id, handle);
}

export function dismissToast(id) {
    if (!id) {
        toastsState.forEach((t) => dismissToast(t.id));
        return;
    }

    clearAutoTimer(id);
    timerMeta.delete(id);

    const existing = toastsState.find((t) => t.id === id);
    if (!existing || existing.closing) return;

    toastsState = toastsState.map((t) => (t.id === id ? { ...t, closing: true } : t));
    emitChange();

    clearExitTimer(id);
    const handle = setTimeout(() => {
        exitTimers.delete(id);
        toastsState = toastsState.filter((t) => t.id !== id);
        emitChange();
    }, EXIT_DURATION_MS);
    exitTimers.set(id, handle);
}

export function clearAllEditorToasts() {
    for (const id of autoTimers.keys()) clearAutoTimer(id);
    for (const id of exitTimers.keys()) clearExitTimer(id);
    timerMeta.clear();
    toastsState = [];
    emitChange();
}

function pushToast(variant, message, options = {}) {
    const id = options.id || `ed-toast-${++seqCounter}`;
    const resolvedVariant = VARIANT_CONFIG[variant] ? variant : 'info';
    const duration =
        typeof options.duration === 'number'
            ? options.duration
            : DEFAULT_DURATIONS[resolvedVariant];

    clearExitTimer(id);

    const existingIdx = toastsState.findIndex((t) => t.id === id);
    if (existingIdx !== -1) {
        toastsState = toastsState.map((t) =>
            t.id === id
                ? {
                      ...t,
                      variant: resolvedVariant,
                      message: String(message ?? ''),
                      description: options.description ? String(options.description) : '',
                      duration,
                      closing: false,
                      updatedAt: Date.now(),
                  }
                : t
        );
    } else {
        const nextToast = {
            id,
            variant: resolvedVariant,
            message: String(message ?? ''),
            description: options.description ? String(options.description) : '',
            duration,
            closing: false,
            createdAt: Date.now(),
            updatedAt: Date.now(),
        };
        toastsState = [...toastsState, nextToast];

        const active = toastsState.filter((t) => !t.closing);
        if (active.length > MAX_TOASTS) {
            const oldestDismissible = active.find((t) => t.variant !== 'loading' && t.id !== id) || active[0];
            if (oldestDismissible && oldestDismissible.id !== id) {
                dismissToast(oldestDismissible.id);
            }
        }
    }

    emitChange();
    scheduleAutoDismiss(id, duration);
    return id;
}

export const editorToast = Object.assign(
    (message, options) => pushToast('info', message, options),
    {
        success: (message, options) => pushToast('success', message, options),
        error: (message, options) => pushToast('error', message, options),
        info: (message, options) => pushToast('info', message, options),
        warning: (message, options) => pushToast('warning', message, options),
        loading: (message, options) => pushToast('loading', message, options),
        dismiss: (id) => dismissToast(id),
        clear: () => clearAllEditorToasts(),
    }
);

function EditorToastCard({ item }) {
    const [entered, setEntered] = useState(false);
    const [hovered, setHovered] = useState(false);

    useEffect(() => {
        let raf2 = 0;
        const raf1 = requestAnimationFrame(() => {
            raf2 = requestAnimationFrame(() => {
                setEntered(true);
            });
        });
        return () => {
            cancelAnimationFrame(raf1);
            if (raf2) cancelAnimationFrame(raf2);
        };
    }, []);

    const isShown = entered && !item.closing;
    const cfg = VARIANT_CONFIG[item.variant] || VARIANT_CONFIG.info;
    const IconComp = cfg.icon;

    return (
        <div
            role={cfg.role}
            data-testid="editor-toast-item"
            data-toast-id={item.id}
            data-variant={item.variant}
            data-visible={isShown ? 'true' : 'false'}
            onMouseEnter={() => {
                setHovered(true);
                pauseAutoDismiss(item.id);
            }}
            onMouseLeave={() => {
                setHovered(false);
                resumeAutoDismiss(item.id);
            }}
            className={`relative overflow-hidden w-80 max-w-[calc(100vw-2rem)] rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border ${cfg.ringClass} shadow-2xl px-3.5 py-2.5 flex items-start gap-2.5 text-xs text-slate-800 dark:text-slate-100 select-none origin-bottom-right transition-[opacity,translate,scale,transform] duration-[280ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${
                isShown
                    ? 'opacity-100 translate-y-0 scale-100 pointer-events-auto'
                    : 'opacity-0 translate-y-5 scale-75 pointer-events-none'
            }`}
        >
            <div className={`w-7 h-7 rounded-xl border flex items-center justify-center shrink-0 mt-0.5 ${cfg.badgeClass}`}>
                <IconComp className={`w-4 h-4 ${item.variant === 'loading' ? 'animate-spin' : ''}`} />
            </div>

            <div className="flex-1 min-w-0 py-0.5">
                <div className="font-semibold text-[12px] leading-snug text-slate-900 dark:text-slate-100 break-words">
                    {item.message}
                </div>
                {item.description && (
                    <div className="mt-0.5 text-[11px] leading-snug text-slate-500 dark:text-slate-400 break-words">
                        {item.description}
                    </div>
                )}
            </div>

            <button
                type="button"
                onClick={() => dismissToast(item.id)}
                aria-label="Dismiss alert"
                data-testid="editor-toast-dismiss"
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
            >
                <X className="w-3.5 h-3.5" />
            </button>

            {item.duration > 0 && !item.closing && (
                <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-slate-200/70 dark:bg-slate-800/80 overflow-hidden">
                    <div
                        key={`${item.id}-${item.updatedAt}`}
                        className={`h-full w-full origin-left ${cfg.barClass}`}
                        style={{
                            animation: `editorToastShrink ${item.duration}ms linear forwards`,
                            animationPlayState: hovered ? 'paused' : 'running',
                        }}
                    />
                </div>
            )}
        </div>
    );
}

export default function EditorToaster() {
    const toasts = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

    useEffect(() => {
        return () => clearAllEditorToasts();
    }, []);

    if (toasts.length === 0) {
        return null;
    }

    return (
        <div
            data-testid="editor-toaster-region"
            aria-live="polite"
            className="fixed bottom-14 right-4 z-[70] flex flex-col items-end gap-2 pointer-events-none"
        >
            <style>{`
                @keyframes editorToastShrink {
                    from { transform: scaleX(1); }
                    to { transform: scaleX(0); }
                }
            `}</style>
            {toasts.map((item) => (
                <EditorToastCard key={item.id} item={item} />
            ))}
        </div>
    );
}
