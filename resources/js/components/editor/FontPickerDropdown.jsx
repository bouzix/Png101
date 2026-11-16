import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ChevronDown, Search, Check, X, GripHorizontal } from 'lucide-react';
import {
    FONT_CATEGORIES,
    buildMergedFontCatalog,
    loadGoogleFontsBatch,
} from './googleFontsHelper';
import { EDITOR_PANEL_TRANSITION, useAnimatedPresence } from './useAnimatedPresence';
import { usePopoverDrag } from './useDraggablePanel';

const INITIAL_VISIBLE_LIMIT = 60;

export default function FontPickerDropdown({
    value = 'Inter',
    brandFonts = [],
    onChange,
    compact = false,
}) {
    const [open, setOpen] = useState(false);
    const { rendered, visible } = useAnimatedPresence(open, 295);
    const drag = usePopoverDrag({ open });
    const [query, setQuery] = useState('');
    const [category, setCategory] = useState('All');
    const [visibleLimit, setVisibleLimit] = useState(INITIAL_VISIBLE_LIMIT);
    const [tick, setTick] = useState(0); // nudges preview repaint after font stylesheets finish

    const rootRef = useRef(null);
    const searchInputRef = useRef(null);
    const listRef = useRef(null);
    const queuedFamiliesRef = useRef(new Set());
    const flushTimerRef = useRef(null);
    const observerRef = useRef(null);

    const catalog = useMemo(() => buildMergedFontCatalog(brandFonts), [brandFonts]);

    const filteredFonts = useMemo(() => {
        const q = query.trim().toLowerCase();
        return catalog.filter((f) => {
            if (category === 'Brand' && !f.isBrand) return false;
            if (category !== 'All' && category !== 'Brand' && f.category !== category) return false;
            if (q && !f.family.toLowerCase().includes(q)) return false;
            return true;
        });
    }, [catalog, query, category]);

    const visibleFonts = useMemo(
        () => filteredFonts.slice(0, visibleLimit),
        [filteredFonts, visibleLimit]
    );

    const queueFontPreviewLoad = (family) => {
        if (!family) return;
        queuedFamiliesRef.current.add(family);
        if (flushTimerRef.current) return;
        flushTimerRef.current = setTimeout(async () => {
            flushTimerRef.current = null;
            const batch = Array.from(queuedFamiliesRef.current);
            queuedFamiliesRef.current.clear();
            if (batch.length > 0) {
                await loadGoogleFontsBatch(batch);
                setTick((t) => t + 1);
            }
        }, 70);
    };

    // Close on outside click or Escape
    useEffect(() => {
        if (!open) return;
        const handleDown = (e) => {
            if (rootRef.current && !rootRef.current.contains(e.target)) {
                setOpen(false);
            }
        };
        const handleKey = (e) => {
            if (e.key === 'Escape') setOpen(false);
        };
        window.addEventListener('mousedown', handleDown);
        window.addEventListener('keydown', handleKey);
        return () => {
            window.removeEventListener('mousedown', handleDown);
            window.removeEventListener('keydown', handleKey);
        };
    }, [open]);

    // Auto-focus search & reset scroll slice when opening or changing filters
    useEffect(() => {
        if (open) {
            setTimeout(() => searchInputRef.current?.focus(), 20);
        } else {
            setQuery('');
            setVisibleLimit(INITIAL_VISIBLE_LIMIT);
        }
    }, [open]);

    useEffect(() => {
        setVisibleLimit(INITIAL_VISIBLE_LIMIT);
        if (listRef.current) listRef.current.scrollTop = 0;
    }, [query, category]);

    // Preload top visible batch immediately when open or filter changes
    useEffect(() => {
        if (!open) return;
        const firstBatch = visibleFonts.slice(0, 18).map((f) => f.family);
        if (firstBatch.length > 0) {
            loadGoogleFontsBatch(firstBatch).then(() => setTick((t) => t + 1));
        }
    }, [open, query, category]);

    // IntersectionObserver inside the dropdown list so scrolling dynamically loads visible fonts
    useEffect(() => {
        if (!open || !rendered || !listRef.current) return;
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        const fam = entry.target.getAttribute('data-font-family');
                        if (fam) queueFontPreviewLoad(fam);
                    }
                });
            },
            {
                root: listRef.current,
                rootMargin: '140px 0px',
                threshold: 0.01,
            }
        );
        observerRef.current = observer;

        const items = listRef.current.querySelectorAll('[data-font-family]');
        items.forEach((el) => observer.observe(el));

        return () => {
            observer.disconnect();
            observerRef.current = null;
        };
    }, [open, rendered, visibleFonts.length, query, category]);

    useEffect(() => {
        return () => {
            if (flushTimerRef.current) clearTimeout(flushTimerRef.current);
        };
    }, []);

    const handleListScroll = (e) => {
        const el = e.currentTarget;
        if (el.scrollHeight - el.scrollTop - el.clientHeight < 140) {
            if (visibleLimit < filteredFonts.length) {
                setVisibleLimit((prev) => Math.min(filteredFonts.length, prev + 60));
            }
        }
    };

    return (
        <div
            ref={rootRef}
            className="relative"
            data-preview-tick={tick}
            onPointerDown={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
        >
            <button
                type="button"
                onClick={() => setOpen((o) => !o)}
                aria-haspopup="listbox"
                aria-expanded={open}
                data-tooltip={`Font: ${value} (Click to browse ${catalog.length}+ fonts)`}
                className={`inline-flex items-center justify-between gap-1.5 px-2 py-1 rounded-lg border text-xs cursor-pointer transition-colors ${
                    compact ? 'min-w-[110px] max-w-[148px]' : 'min-w-[140px] max-w-[190px] px-2.5 gap-2'
                } ${
                    open
                        ? 'bg-blue-600/15 border-blue-500 text-blue-700 dark:text-blue-300'
                        : 'bg-slate-100 dark:bg-slate-950 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white hover:bg-slate-200/70 dark:hover:bg-slate-800'
                }`}
            >
                <span
                    className="truncate font-medium"
                    style={{ fontFamily: `'${value}', sans-serif` }}
                >
                    {value}
                </span>
                <ChevronDown className={`w-3.5 h-3.5 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>

            {rendered && (
                <div
                    ref={drag.panelRef}
                    role="listbox"
                    data-testid="font-picker-listbox"
                    data-visible={visible ? 'true' : 'false'}
                    style={{ transform: `translate3d(${drag.offset.x}px, ${drag.offset.y}px, 0)` }}
                    className={`absolute left-0 top-full mt-2 w-80 sm:w-[344px] rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xl z-50 overflow-hidden text-slate-800 dark:text-slate-100 origin-top-left ${EDITOR_PANEL_TRANSITION} ${drag.isDragging ? '!transition-none' : ''} ${
                        visible
                            ? 'opacity-100 translate-y-0 scale-100 pointer-events-auto'
                            : 'opacity-0 -translate-y-2 scale-75 pointer-events-none'
                    }`}
                >
                    <div
                        data-testid="font-picker-drag-handle"
                        onPointerDown={drag.handleDragStart}
                        className="px-3 py-1.5 bg-slate-100/90 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 cursor-grab active:cursor-grabbing select-none"
                    >
                        <span className="inline-flex items-center gap-1.5">
                            <GripHorizontal className="w-3.5 h-3.5 shrink-0" />
                            Font Picker
                        </span>
                        <span className="text-[9px] font-medium normal-case text-slate-400">Drag to move</span>
                    </div>
                    {/* Search + Categories Header */}
                    <div className="p-3 border-b border-slate-200 dark:border-slate-800 space-y-2.5 bg-slate-50/60 dark:bg-slate-900">
                        <div className="relative">
                            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                            <input
                                ref={searchInputRef}
                                type="text"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder={`Search ${catalog.length.toLocaleString()} fonts...`}
                                className="w-full pl-8 pr-7 py-1.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-blue-500"
                            />
                            {query && (
                                <button
                                    type="button"
                                    onClick={() => setQuery('')}
                                    className="p-0.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            )}
                        </div>

                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-0.5">
                                <span>Filter by style</span>
                                <span className="font-mono normal-case text-slate-500 dark:text-slate-400">
                                    {filteredFonts.length.toLocaleString()} fonts
                                </span>
                            </div>
                            <div
                                data-testid="font-picker-categories"
                                className="flex flex-wrap gap-1.5"
                            >
                                {FONT_CATEGORIES.map((cat) => (
                                    <button
                                        key={cat}
                                        type="button"
                                        data-testid={`font-category-${cat.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
                                        onClick={() => setCategory(cat)}
                                        className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border cursor-pointer transition-all ${
                                            category === cat
                                                ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                                                : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-100 dark:bg-slate-950 dark:text-slate-300 dark:border-slate-800 dark:hover:bg-slate-800 dark:hover:text-white'
                                        }`}
                                    >
                                        {cat}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Scrollable Font Preview List */}
                    <div
                        ref={listRef}
                        onScroll={handleListScroll}
                        className="max-h-72 overflow-y-auto p-1.5 space-y-0.5"
                    >
                        {visibleFonts.length === 0 ? (
                            <div className="py-8 text-center text-xs text-slate-500">
                                No fonts matched "{query}"
                            </div>
                        ) : (
                            visibleFonts.map((font) => {
                                const isSelected =
                                    font.family.toLowerCase() === String(value || '').toLowerCase();
                                return (
                                    <button
                                        key={font.family}
                                        type="button"
                                        role="option"
                                        aria-selected={isSelected}
                                        data-font-family={font.family}
                                        onClick={() => {
                                            onChange(font.family);
                                            setOpen(false);
                                        }}
                                        className={`w-full px-2.5 py-2 rounded-xl flex items-center justify-between gap-2 text-left cursor-pointer transition-colors ${
                                            isSelected
                                                ? 'bg-blue-600/15 text-blue-700 dark:bg-blue-600/20 dark:text-blue-300'
                                                : 'hover:bg-slate-100 dark:hover:bg-slate-800/80'
                                        }`}
                                    >
                                        <div className="min-w-0 flex-1">
                                            <div
                                                className="text-sm leading-snug truncate text-slate-900 dark:text-slate-100"
                                                style={{ fontFamily: `'${font.family}', sans-serif` }}
                                            >
                                                {font.family}
                                            </div>
                                            <div className="flex items-center gap-1.5 mt-0.5">
                                                <span className="text-[9px] uppercase tracking-wide text-slate-500 dark:text-slate-400 font-sans">
                                                    {font.category}
                                                </span>
                                                {font.isBrand && (
                                                    <span className="px-1 py-px rounded bg-blue-500/15 text-blue-600 dark:text-blue-400 text-[9px] font-bold font-sans">
                                                        Brand
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 shrink-0">
                                            <span
                                                className="text-sm text-slate-500 dark:text-slate-400"
                                                style={{ fontFamily: `'${font.family}', sans-serif` }}
                                            >
                                                AaBb
                                            </span>
                                            {isSelected && <Check className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />}
                                        </div>
                                    </button>
                                );
                            })
                        )}

                        {visibleLimit < filteredFonts.length && (
                            <button
                                type="button"
                                onClick={() => setVisibleLimit((prev) => Math.min(filteredFonts.length, prev + 80))}
                                className="w-full py-2 mt-1 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-950 dark:hover:bg-slate-800 text-[11px] font-bold text-slate-700 dark:text-slate-300 cursor-pointer"
                            >
                                Load more ({filteredFonts.length - visibleLimit} remaining)
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
