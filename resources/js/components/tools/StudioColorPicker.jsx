import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { HexColorPicker } from 'react-colorful';
import { GripHorizontal, Pipette, X } from 'lucide-react';
import { EDITOR_PANEL_TRANSITION, useAnimatedPresence } from '../editor/useAnimatedPresence';
import EditorEyedropperOverlay from '../editor/EditorEyedropperOverlay';

const DEFAULT_QUICK_SWATCHES = [
    '#ffffff',
    '#000000',
    '#0f172a',
    '#3b82f6',
    '#10b981',
    '#f59e0b',
    '#ef4444',
    '#8b5cf6',
];

/**
 * Parse `#RGB`, `#RRGGBB`, `#RRGGBBAA`, or `rgb(...)`/`rgba(...)` into `#rrggbb`, or return null.
 */
function parseColorInput(input) {
    if (typeof input !== 'string') return null;
    const raw = input.trim().replace(/;+$/, '');
    const rgbMatch = raw.match(/^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})(?:\s*,\s*[\d.]+)?\s*\)$/i);
    if (rgbMatch) {
        const toHex = (n) => Math.max(0, Math.min(255, Number(n))).toString(16).padStart(2, '0');
        return `#${toHex(rgbMatch[1])}${toHex(rgbMatch[2])}${toHex(rgbMatch[3])}`;
    }
    const cleaned = raw.replace(/^#/, '');
    if (/^[0-9a-fA-F]{6}$/.test(cleaned)) {
        return `#${cleaned.toLowerCase()}`;
    }
    if (/^[0-9a-fA-F]{8}$/.test(cleaned)) {
        return `#${cleaned.slice(0, 6).toLowerCase()}`;
    }
    if (/^[0-9a-fA-F]{3}$/.test(cleaned)) {
        return `#${cleaned
            .split('')
            .map((c) => c + c)
            .join('')
            .toLowerCase()}`;
    }
    return null;
}

function normalizeHex(hex, fallback = '#ffffff') {
    return parseColorInput(hex) || fallback;
}

export default function StudioColorPicker({
    value = '#ffffff',
    onChange,
    ariaLabel = 'Choose color',
    title = 'Choose custom color',
    size = 'md',
    showHexLabel = false,
    quickSwatches = DEFAULT_QUICK_SWATCHES,
    className = '',
    customTooltip = false,
    enableEyedropper = customTooltip,
    triggerIcon = null,
    'data-testid': dataTestId,
    dataTestId: dataTestIdProp,
}) {
    const [open, setOpen] = useState(false);
    const [isPicking, setIsPicking] = useState(false);
    const { rendered, visible } = useAnimatedPresence(open, customTooltip ? 295 : 0);
    const isPortalRendered = customTooltip ? rendered : open;
    const isPortalVisible = (customTooltip ? visible : open) && !isPicking;
    const [anchorPos, setAnchorPos] = useState({ top: 120, left: 120 });
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [draftHex, setDraftHex] = useState(normalizeHex(value));

    const triggerRef = useRef(null);
    const popoverRef = useRef(null);
    const pickingRef = useRef(false);
    pickingRef.current = isPicking;
    const hexEditingRef = useRef(false);
    const draftHexRef = useRef(draftHex);
    draftHexRef.current = draftHex;
    const dragRef = useRef({ active: false, startX: 0, startY: 0, baseX: 0, baseY: 0 });

    const resolvedColor = normalizeHex(value);
    const liveParsedHex = hexEditingRef.current ? parseColorInput(draftHex) : null;
    const displayColor = liveParsedHex || resolvedColor;

    useEffect(() => {
        if (!hexEditingRef.current) {
            setDraftHex(resolvedColor);
        }
    }, [resolvedColor]);

    const computeAnchor = () => {
        if (!triggerRef.current) return;
        const rect = triggerRef.current.getBoundingClientRect();
        const popW = 248;
        const popH = 340;
        const vw = window.innerWidth;
        const vh = window.innerHeight;

        let left = rect.left;
        if (left + popW > vw - 12) {
            left = Math.max(12, vw - popW - 12);
        }
        let top = rect.bottom + 8;
        if (top + popH > vh - 12) {
            top = Math.max(12, rect.top - popH - 8);
        }
        setAnchorPos({ top, left });
    };

    const handleToggle = () => {
        if (!open) {
            computeAnchor();
            setDragOffset({ x: 0, y: 0 });
        }
        setOpen((prev) => !prev);
    };

    useEffect(() => {
        if (!open) {
            setIsPicking(false);
            hexEditingRef.current = false;
            return undefined;
        }

        const handlePointerDownOutside = (e) => {
            if (pickingRef.current) return;
            if (
                popoverRef.current?.contains(e.target) ||
                triggerRef.current?.contains(e.target) ||
                e.target.closest?.('[data-testid="editor-eyedropper-overlay"]')
            ) {
                return;
            }
            if (hexEditingRef.current) {
                hexEditingRef.current = false;
                const parsed = parseColorInput(draftHexRef.current);
                if (parsed) {
                    setDraftHex(parsed);
                    onChange?.(parsed);
                } else {
                    setDraftHex(resolvedColor);
                }
            }
            setOpen(false);
        };

        const handleEscape = (e) => {
            if (pickingRef.current) return;
            if (e.key === 'Escape') {
                setOpen(false);
            }
        };

        const handleReposition = () => computeAnchor();

        document.addEventListener('pointerdown', handlePointerDownOutside, true);
        document.addEventListener('keydown', handleEscape);
        window.addEventListener('resize', handleReposition);
        return () => {
            document.removeEventListener('pointerdown', handlePointerDownOutside, true);
            document.removeEventListener('keydown', handleEscape);
            window.removeEventListener('resize', handleReposition);
        };
    }, [open]);

    useEffect(() => {
        if (!open) return undefined;

        const handleMove = (e) => {
            if (!dragRef.current.active) return;
            setDragOffset({
                x: dragRef.current.baseX + (e.clientX - dragRef.current.startX),
                y: dragRef.current.baseY + (e.clientY - dragRef.current.startY),
            });
        };

        const handleUp = () => {
            if (!dragRef.current.active) return;
            dragRef.current.active = false;
            setIsDragging(false);
        };

        window.addEventListener('pointermove', handleMove);
        window.addEventListener('pointerup', handleUp);
        window.addEventListener('pointercancel', handleUp);
        return () => {
            window.removeEventListener('pointermove', handleMove);
            window.removeEventListener('pointerup', handleUp);
            window.removeEventListener('pointercancel', handleUp);
        };
    }, [open]);

    const commitDraftHex = (overrideRaw = null) => {
        const source = overrideRaw !== null ? overrideRaw : draftHexRef.current;
        const parsed = parseColorInput(String(source || ''));
        if (parsed) {
            setDraftHex(parsed);
            onChange?.(parsed);
        } else {
            setDraftHex(resolvedColor);
        }
    };

    const handleHexTextChange = (e) => {
        let raw = e.target.value;
        // Handle pasting #RRGGBB onto the end of existing #XXXXXX smoothly
        if ((raw.match(/#/g) || []).length > 1) {
            const tail = raw.split('#').pop().trim();
            if (/^[0-9a-fA-F]{3,8}$/.test(tail)) {
                raw = `#${tail}`;
            }
        }
        setDraftHex(raw);
        const parsed = parseColorInput(raw);
        if (parsed) {
            onChange?.(parsed);
        }
    };

    const handleHexBlur = () => {
        hexEditingRef.current = false;
        commitDraftHex();
    };

    const swatchSizeClass =
        size === 'sm' ? 'w-7 h-7 rounded-md' : 'w-8 h-8 rounded-lg';

    const resolvedTestId = dataTestId || dataTestIdProp;

    return (
        <div className={`inline-flex items-center gap-2 ${className}`}>
            {triggerIcon ? (
                <button
                    ref={triggerRef}
                    type="button"
                    data-testid={resolvedTestId}
                    aria-label={ariaLabel}
                    title={customTooltip ? undefined : title}
                    data-tooltip={customTooltip ? title : undefined}
                    onClick={handleToggle}
                    className={`inline-flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-100 hover:bg-slate-200 dark:bg-slate-950 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 shadow-sm shrink-0 cursor-pointer transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/50 ${
                        size === 'sm' ? 'px-2 py-1 text-[11px]' : 'px-2.5 py-1.5 text-xs'
                    }`}
                >
                    <span className="inline-flex items-center shrink-0">{triggerIcon}</span>
                    <span
                        className="w-3.5 h-3.5 rounded-sm border border-black/15 dark:border-white/25 shrink-0"
                        style={{ backgroundColor: displayColor }}
                    />
                </button>
            ) : (
                <button
                    ref={triggerRef}
                    type="button"
                    data-testid={resolvedTestId}
                    aria-label={ariaLabel}
                    title={customTooltip ? undefined : title}
                    data-tooltip={customTooltip ? title : undefined}
                    onClick={handleToggle}
                    className={`${swatchSizeClass} border border-card-border shadow-sm shrink-0 cursor-pointer transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500/50`}
                    style={{ backgroundColor: displayColor }}
                />
            )}
            {showHexLabel && (
                <button
                    type="button"
                    onClick={handleToggle}
                    className="font-mono text-[11px] uppercase text-foreground/80 hover:text-foreground cursor-pointer"
                >
                    {displayColor}
                </button>
            )}

            {isPortalRendered &&
                typeof document !== 'undefined' &&
                createPortal(
                    <div
                        ref={popoverRef}
                        role="dialog"
                        aria-label="Custom color picker"
                        data-visible={isPortalVisible ? 'true' : 'false'}
                        onPointerDown={(e) => e.stopPropagation()}
                        onMouseDown={(e) => e.stopPropagation()}
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => {
                            if (e.key !== 'Escape') e.stopPropagation();
                        }}
                        className={`fixed z-[120] w-[248px] bg-card-bg border border-card-border rounded-xl shadow-2xl p-3 flex flex-col gap-3 select-none ${
                            customTooltip
                                ? `origin-top-left ${EDITOR_PANEL_TRANSITION} ${
                                      isPortalVisible
                                          ? 'opacity-100 translate-y-0 scale-100 pointer-events-auto'
                                          : 'opacity-0 -translate-y-2 scale-75 pointer-events-none'
                                  }`
                                : ''
                        }`}
                        style={{
                            top: `${anchorPos.top + dragOffset.y}px`,
                            left: `${anchorPos.left + dragOffset.x}px`,
                        }}
                    >
                        <div
                            onPointerDown={(e) => {
                                if (e.target.closest('button')) return;
                                e.preventDefault();
                                dragRef.current = {
                                    active: true,
                                    startX: e.clientX,
                                    startY: e.clientY,
                                    baseX: dragOffset.x,
                                    baseY: dragOffset.y,
                                };
                                setIsDragging(true);
                            }}
                            className={`flex items-center justify-between -mx-3 -mt-3 px-3 py-2 border-b border-card-border/70 bg-foreground/[0.03] rounded-t-xl ${
                                isDragging ? 'cursor-grabbing' : 'cursor-grab'
                            }`}
                        >
                            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-foreground/55 pointer-events-none">
                                <GripHorizontal className="w-3.5 h-3.5" />
                                <span>Color Picker</span>
                            </div>
                            <div className="flex items-center gap-1">
                                {(dragOffset.x !== 0 || dragOffset.y !== 0) && (
                                    <button
                                        type="button"
                                        onClick={() => setDragOffset({ x: 0, y: 0 })}
                                        className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-foreground/10 hover:bg-foreground/15 text-foreground/75 cursor-pointer"
                                        title={customTooltip ? undefined : 'Reset picker position'}
                                        data-tooltip={customTooltip ? 'Reset picker position' : undefined}
                                    >
                                        Reset
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={() => setOpen(false)}
                                    className="p-0.5 rounded text-foreground/55 hover:text-foreground hover:bg-foreground/10 cursor-pointer"
                                    title={customTooltip ? undefined : 'Close color picker'}
                                    data-tooltip={customTooltip ? 'Close color picker' : undefined}
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>

                        <div className="touch-none">
                            <HexColorPicker
                                color={displayColor}
                                onChange={(next) => {
                                    hexEditingRef.current = false;
                                    const norm = normalizeHex(next, displayColor);
                                    setDraftHex(norm);
                                    onChange?.(norm);
                                }}
                                style={{ width: '100%', height: '164px' }}
                            />
                        </div>

                        {quickSwatches.length > 0 && (
                            <div className="flex flex-wrap items-center gap-1.5">
                                {quickSwatches.map((hex) => {
                                    const norm = normalizeHex(hex);
                                    const active = displayColor === norm;
                                    return (
                                        <button
                                            key={norm}
                                            type="button"
                                            onClick={() => {
                                                hexEditingRef.current = false;
                                                setDraftHex(norm);
                                                onChange?.(norm);
                                            }}
                                            title={customTooltip ? undefined : norm.toUpperCase()}
                                            data-tooltip={customTooltip ? norm.toUpperCase() : undefined}
                                            className={`w-5 h-5 rounded-md border cursor-pointer transition-transform hover:scale-110 ${
                                                active
                                                    ? 'border-blue-500 ring-2 ring-blue-500/40'
                                                    : 'border-card-border'
                                            }`}
                                            style={{ backgroundColor: norm }}
                                        />
                                    );
                                })}
                            </div>
                        )}

                        <div className="flex items-center gap-2">
                            <div
                                className="w-7 h-7 rounded-lg border border-card-border shrink-0"
                                style={{ backgroundColor: displayColor }}
                            />
                            <input
                                type="text"
                                value={draftHex}
                                onFocus={() => {
                                    hexEditingRef.current = true;
                                }}
                                onChange={handleHexTextChange}
                                onBlur={handleHexBlur}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        hexEditingRef.current = false;
                                        commitDraftHex(e.currentTarget.value);
                                        e.currentTarget.blur();
                                    }
                                }}
                                maxLength={24}
                                spellCheck={false}
                                aria-label="Hex color value"
                                className="w-full px-2.5 py-1.5 text-xs font-mono uppercase select-text rounded-lg border border-card-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                            />
                            {enableEyedropper && (
                                <button
                                    type="button"
                                    data-testid="color-picker-eyedropper"
                                    onClick={() => setIsPicking(true)}
                                    aria-label="Pick color from image or canvas"
                                    title={customTooltip ? undefined : 'Pick color from image or canvas'}
                                    data-tooltip={customTooltip ? 'Pick color from image or canvas' : undefined}
                                    className="w-7 h-7 rounded-lg border border-card-border bg-foreground/[0.04] hover:bg-blue-600/15 hover:border-blue-500/60 text-foreground/75 hover:text-blue-600 dark:hover:text-blue-400 flex items-center justify-center shrink-0 cursor-pointer transition-colors"
                                >
                                    <Pipette className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>
                    </div>,
                    document.body
                )}

            {enableEyedropper && (
                <EditorEyedropperOverlay
                    open={open && isPicking}
                    initialColor={resolvedColor}
                    onPick={(hex) => {
                        const norm = normalizeHex(hex, resolvedColor);
                        setDraftHex(norm);
                        onChange?.(norm);
                        setIsPicking(false);
                    }}
                    onCancel={() => setIsPicking(false)}
                />
            )}
        </div>
    );
}
