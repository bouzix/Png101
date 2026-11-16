import React, { useEffect } from 'react';
import { AlertTriangle, AlertCircle, Info, X } from 'lucide-react';
import { EDITOR_PANEL_TRANSITION, useAnimatedPresence } from './useAnimatedPresence';

const VARIANT_STYLES = {
    warning: {
        icon: AlertTriangle,
        badge: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
        confirmBtn: 'bg-amber-600 hover:bg-amber-500 text-white shadow-lg shadow-amber-600/25',
    },
    danger: {
        icon: AlertCircle,
        badge: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30',
        confirmBtn: 'bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/25',
    },
    info: {
        icon: Info,
        badge: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30',
        confirmBtn: 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/25',
    },
};

export default function EditorConfirmDialog({
    open = false,
    variant = 'warning',
    title = 'Confirm Action',
    message = '',
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    onConfirm,
    onCancel,
}) {
    const { rendered, visible } = useAnimatedPresence(open, 295);

    useEffect(() => {
        if (!open) return undefined;
        const onKeyDown = (e) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                e.stopPropagation();
                if (cancelLabel === null) {
                    onConfirm?.();
                } else {
                    onCancel?.();
                }
            }
        };
        document.addEventListener('keydown', onKeyDown, true);
        return () => document.removeEventListener('keydown', onKeyDown, true);
    }, [open, cancelLabel, onConfirm, onCancel]);

    if (!rendered) {
        return null;
    }

    const cfg = VARIANT_STYLES[variant] || VARIANT_STYLES.warning;
    const IconComp = cfg.icon;
    const isAlertOnly = cancelLabel === null;

    const handleBackdropDismiss = () => {
        if (isAlertOnly) {
            onConfirm?.();
        } else {
            onCancel?.();
        }
    };

    return (
        <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="editor-confirm-title"
            data-testid="editor-confirm-dialog"
            data-visible={visible ? 'true' : 'false'}
            onMouseDown={(e) => {
                if (e.target === e.currentTarget) handleBackdropDismiss();
            }}
            onPointerDown={(e) => e.stopPropagation()}
            className={`fixed inset-0 z-[110] bg-black/65 backdrop-blur-sm flex items-center justify-center p-4 transition-opacity duration-[280ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${
                visible ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
            }`}
        >
            <div
                data-testid="editor-confirm-card"
                onMouseDown={(e) => e.stopPropagation()}
                className={`w-full max-w-sm rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-700/90 shadow-2xl overflow-hidden text-slate-900 dark:text-slate-100 select-none origin-center ${EDITOR_PANEL_TRANSITION} ${
                    visible
                        ? 'opacity-100 translate-y-0 scale-100'
                        : 'opacity-0 translate-y-5 scale-75'
                }`}
            >
                <div className="p-5 flex items-start gap-3.5">
                    <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${cfg.badge}`}>
                        <IconComp className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                            <h3
                                id="editor-confirm-title"
                                className="text-sm font-bold text-slate-900 dark:text-white leading-snug"
                            >
                                {title}
                            </h3>
                            <button
                                type="button"
                                onClick={handleBackdropDismiss}
                                aria-label="Close dialog"
                                data-tooltip="Close"
                                className="p-1 -mt-1 -mr-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        {message && (
                            <p className="mt-1.5 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                                {message}
                            </p>
                        )}
                    </div>
                </div>

                <div className="px-5 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-950/60 flex items-center justify-end gap-2">
                    {!isAlertOnly && (
                        <button
                            type="button"
                            data-testid="editor-confirm-cancel"
                            onClick={() => onCancel?.()}
                            className="px-3.5 py-2 rounded-xl bg-slate-200/80 hover:bg-slate-300/80 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200 transition-colors cursor-pointer"
                        >
                            {cancelLabel}
                        </button>
                    )}
                    <button
                        type="button"
                        data-testid="editor-confirm-accept"
                        onClick={() => onConfirm?.()}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${cfg.confirmBtn}`}
                    >
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}
