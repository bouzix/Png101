import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Frame, X, ArrowLeftRight, Plus } from 'lucide-react';
import { EDITOR_PANEL_TRANSITION, useAnimatedPresence } from './useAnimatedPresence';

const FALLBACK_PRESETS = [
    { id: 'sq', name: 'Instagram Square', width: 1080, height: 1080 },
    { id: 'story', name: 'Story / Reel', width: 1080, height: 1920 },
    { id: 'portrait', name: 'Portrait Post', width: 1080, height: 1350 },
    { id: 'yt', name: 'YouTube Thumb', width: 1280, height: 720 },
    { id: 'fb', name: 'Wide Banner', width: 1500, height: 500 },
    { id: 'badge', name: 'Logo Badge', width: 1000, height: 1000 },
];

export default function ArtboardModal({
    open = false,
    mode = 'create', // 'create' | 'edit'
    initialName = 'Artboard 2',
    initialWidth = 1080,
    initialHeight = 1080,
    initialBgMode = 'match', // 'match' | 'transparent' | 'white'
    presets = [],
    maxWidth = 4096,
    maxHeight = 4096,
    onClose,
    onSubmit,
}) {
    const presence = useAnimatedPresence(open, 220);
    const [name, setName] = useState(initialName);
    const [width, setWidth] = useState(initialWidth);
    const [height, setHeight] = useState(initialHeight);
    const [bgChoice, setBgChoice] = useState(initialBgMode);

    useEffect(() => {
        if (!open) return;
        setName(initialName);
        setWidth(initialWidth);
        setHeight(initialHeight);
        setBgChoice(initialBgMode);
    }, [open, initialName, initialWidth, initialHeight, initialBgMode]);

    useEffect(() => {
        if (!open) return undefined;
        const onEsc = (e) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                e.stopPropagation();
                onClose?.();
            }
        };
        window.addEventListener('keydown', onEsc, true);
        return () => window.removeEventListener('keydown', onEsc, true);
    }, [open, onClose]);

    const sizePresets = useMemo(() => {
        if (Array.isArray(presets) && presets.length > 0) {
            return presets.slice(0, 6);
        }
        return FALLBACK_PRESETS;
    }, [presets]);

    if (!presence.rendered || typeof document === 'undefined') return null;

    const handleFormSubmit = (e) => {
        e.preventDefault();
        const w = Math.max(32, Math.min(maxWidth, Math.round(Number(width) || initialWidth || 1080)));
        const h = Math.max(32, Math.min(maxHeight, Math.round(Number(height) || initialHeight || 1080)));
        onSubmit?.({
            name: String(name || initialName).trim() || initialName,
            width: w,
            height: h,
            bgChoice,
        });
        onClose?.();
    };

    return createPortal(
        <div
            data-testid="artboard-modal"
            role="dialog"
            aria-modal="true"
            aria-label={mode === 'edit' ? 'Resize Artboard' : 'New Artboard'}
            onClick={() => onClose?.()}
            className={`fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm transition-opacity duration-200 ${
                presence.visible ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
        >
            <form
                onSubmit={handleFormSubmit}
                onClick={(e) => e.stopPropagation()}
                data-testid="artboard-modal-form"
                className={`w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 shadow-2xl p-5 space-y-4 text-slate-900 dark:text-slate-100 ${EDITOR_PANEL_TRANSITION} ${
                    presence.visible ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-2'
                }`}
            >
                <div className="flex items-center justify-between pb-2.5 border-b border-slate-200 dark:border-slate-800">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Frame className="w-4 h-4 text-blue-500" />
                        <span>{mode === 'edit' ? 'Artboard Properties' : 'Add New Artboard'}</span>
                    </h3>
                    <button
                        type="button"
                        onClick={() => onClose?.()}
                        aria-label="Close artboard modal"
                        className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                        Artboard Name
                    </label>
                    <input
                        type="text"
                        data-testid="artboard-name-input"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Artboard 2"
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                    />
                </div>

                <div className="space-y-1.5">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        Presets (Current: {initialWidth}×{initialHeight})
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                        {sizePresets.map((preset) => {
                            const active = Number(width) === Number(preset.width) && Number(height) === Number(preset.height);
                            return (
                                <button
                                    key={preset.id}
                                    type="button"
                                    data-testid={`artboard-preset-${preset.id}`}
                                    onClick={() => {
                                        setWidth(preset.width);
                                        setHeight(preset.height);
                                    }}
                                    className={`px-2.5 py-2 rounded-xl border text-left cursor-pointer transition-colors ${
                                        active
                                            ? 'bg-blue-600/12 border-blue-500 text-blue-700 dark:text-blue-300'
                                            : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                                    }`}
                                >
                                    <div className="text-[11px] font-bold truncate">{preset.name}</div>
                                    <div className="text-[10px] font-mono text-slate-400">
                                        {preset.width}×{preset.height}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
                    <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                            Width (px)
                        </label>
                        <input
                            type="number"
                            data-testid="artboard-width-input"
                            min={32}
                            max={maxWidth}
                            value={width}
                            onChange={(e) => setWidth(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                        />
                    </div>
                    <button
                        type="button"
                        onClick={() => {
                            setWidth(height);
                            setHeight(width);
                        }}
                        title="Swap width and height"
                        aria-label="Swap dimensions"
                        className="mb-0.5 p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-300 cursor-pointer"
                    >
                        <ArrowLeftRight className="w-3.5 h-3.5" />
                    </button>
                    <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                            Height (px)
                        </label>
                        <input
                            type="number"
                            data-testid="artboard-height-input"
                            min={32}
                            max={maxHeight}
                            value={height}
                            onChange={(e) => setHeight(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                        />
                    </div>
                </div>

                {mode === 'create' && (
                    <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                            Background
                        </label>
                        <div className="grid grid-cols-3 gap-1.5">
                            {[
                                { id: 'match', label: 'Match Current' },
                                { id: 'transparent', label: 'Transparent' },
                                { id: 'white', label: 'White' },
                            ].map((opt) => (
                                <button
                                    key={opt.id}
                                    type="button"
                                    onClick={() => setBgChoice(opt.id)}
                                    className={`py-1.5 px-2 rounded-xl text-[11px] font-semibold border cursor-pointer transition-colors ${
                                        bgChoice === opt.id
                                            ? 'bg-blue-600/15 border-blue-500 text-blue-600 dark:text-blue-300'
                                            : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300'
                                    }`}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                    <button
                        type="button"
                        onClick={() => onClose?.()}
                        className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-semibold cursor-pointer"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        data-testid="artboard-modal-submit"
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-600/25 cursor-pointer"
                    >
                        <Plus className="w-3.5 h-3.5" />
                        <span>{mode === 'edit' ? 'Apply Size' : 'Add Artboard'}</span>
                    </button>
                </div>
            </form>
        </div>,
        document.body
    );
}
