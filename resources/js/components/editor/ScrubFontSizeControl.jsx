import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { MoveHorizontal, GripHorizontal } from 'lucide-react';
import { useAnimatedPresence } from './useAnimatedPresence';
import { usePopoverDrag } from './useDraggablePanel';

const QUICK_SIZES = [12, 16, 20, 28, 36, 48, 64, 96, 128];

export default function ScrubFontSizeControl({
    value = 40,
    min = 8,
    max = 300,
    onPreview,
    onCommit,
    testIdPrefix = 'floating',
    compact = false,
    open: controlledOpen,
    onOpenChange,
}) {
    const [internalOpen, setInternalOpen] = useState(false);
    const isControlled = controlledOpen !== undefined;
    const open = isControlled ? controlledOpen : internalOpen;
    const setOpen = (next) => {
        const resolved = typeof next === 'function' ? next(open) : next;
        if (!isControlled) setInternalOpen(resolved);
        onOpenChange?.(resolved);
    };
    const [scrubVal, setScrubVal] = useState(null);
    const triggerRef = useRef(null);
    const popRef = useRef(null);
    const [popPos, setPopPos] = useState({ top: 0, left: 0 });
    const dragStateRef = useRef({
        active: false,
        moved: false,
        startX: 0,
        startVal: 40,
        lastVal: 40,
    });

    const displayVal = Math.round(scrubVal ?? Number(value || 40));
    const clampedDisplay = Math.max(min, Math.min(max, displayVal));
    const presence = useAnimatedPresence(open, 180);
    const drag = usePopoverDrag({ open, panelRef: popRef });

    useLayoutEffect(() => {
        if (!open || !triggerRef.current) return;
        const updatePos = () => {
            const rect = triggerRef.current.getBoundingClientRect();
            const width = 236;
            const left = Math.max(10, Math.min(window.innerWidth - width - 10, rect.left + rect.width / 2 - width / 2));
            const top =
                rect.bottom + 8 + 165 > window.innerHeight
                    ? Math.max(10, rect.top - 165 - 8)
                    : rect.bottom + 8;
            setPopPos({ top, left });
        };
        updatePos();
        window.addEventListener('resize', updatePos);
        window.addEventListener('scroll', updatePos, true);
        return () => {
            window.removeEventListener('resize', updatePos);
            window.removeEventListener('scroll', updatePos, true);
        };
    }, [open]);

    useEffect(() => {
        if (!open) return undefined;
        window.dispatchEvent(
            new CustomEvent('png101:effect-popover-open', { detail: { trigger: triggerRef.current } })
        );
        const onOtherOpen = (e) => {
            if (e.detail?.trigger !== triggerRef.current) {
                setOpen(false);
            }
        };
        const onPointerDown = (e) => {
            if (
                triggerRef.current?.contains(e.target) ||
                popRef.current?.contains(e.target) ||
                e.target.closest?.('[data-effect-popover-trigger="true"]')
            ) {
                return;
            }
            setOpen(false);
        };
        const onKeyDown = (e) => {
            if (e.key === 'Escape') setOpen(false);
        };
        window.addEventListener('png101:effect-popover-open', onOtherOpen);
        document.addEventListener('pointerdown', onPointerDown);
        document.addEventListener('keydown', onKeyDown);
        return () => {
            window.removeEventListener('png101:effect-popover-open', onOtherOpen);
            document.removeEventListener('pointerdown', onPointerDown);
            document.removeEventListener('keydown', onKeyDown);
        };
    }, [open]);

    const handleTriggerPointerDown = (e) => {
        if (e.button !== 0) return;
        e.preventDefault();
        const startVal = Math.max(min, Math.min(max, Math.round(Number(value || 40))));
        dragStateRef.current = {
            active: true,
            moved: false,
            startX: e.clientX,
            startVal,
            lastVal: startVal,
        };

        const onWindowMove = (moveEvent) => {
            const state = dragStateRef.current;
            if (!state.active) return;
            const dx = moveEvent.clientX - state.startX;
            if (!state.moved && Math.abs(dx) >= 3) {
                state.moved = true;
                document.body.style.cursor = 'ew-resize';
                setOpen(false);
            }
            if (!state.moved) return;
            const stepScale = moveEvent.shiftKey ? 1 : 2.2;
            const nextVal = Math.max(min, Math.min(max, Math.round(state.startVal + dx / stepScale)));
            if (nextVal !== state.lastVal) {
                state.lastVal = nextVal;
                setScrubVal(nextVal);
                onPreview?.(nextVal);
            }
        };

        const onWindowUp = () => {
            const state = dragStateRef.current;
            state.active = false;
            document.body.style.cursor = '';
            window.removeEventListener('pointermove', onWindowMove);
            window.removeEventListener('pointerup', onWindowUp);
            window.removeEventListener('pointercancel', onWindowUp);
            setScrubVal(null);
            if (state.moved) {
                onCommit?.(state.lastVal);
            } else {
                setOpen((prev) => !prev);
            }
        };

        window.addEventListener('pointermove', onWindowMove);
        window.addEventListener('pointerup', onWindowUp);
        window.addEventListener('pointercancel', onWindowUp);
    };

    const handleInputChange = (e) => {
        const parsed = parseInt(e.target.value, 10);
        if (Number.isNaN(parsed)) return;
        const clamped = Math.max(min, Math.min(max, parsed));
        onCommit?.(clamped);
    };

    return (
        <>
            <button
                ref={triggerRef}
                type="button"
                data-testid={`${testIdPrefix}-font-size-trigger`}
                data-effect-popover-trigger="true"
                onPointerDown={handleTriggerPointerDown}
                data-tooltip="Drag left/right to resize text, or click for slider"
                aria-expanded={open}
                className={`inline-flex items-center gap-1 rounded-lg border font-mono text-xs font-semibold transition-colors select-none cursor-ew-resize ${compact ? 'h-7 px-2' : 'h-7 px-2.5'
                    } ${open || scrubVal !== null
                        ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-400 dark:border-blue-600 text-blue-700 dark:text-blue-300'
                        : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-950 dark:hover:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white'
                    }`}
            >
                <MoveHorizontal className="w-3 h-3 text-slate-400 shrink-0" />
                <span>{clampedDisplay}</span>
                <span className="text-[10px] font-sans font-normal text-slate-400">px</span>
            </button>

            {presence.rendered &&
                typeof document !== 'undefined' &&
                createPortal(
                    <div
                        ref={popRef}
                        data-testid={`${testIdPrefix}-font-size-popover`}
                        onPointerDown={(e) => e.stopPropagation()}
                        style={{ top: popPos.top + drag.offset.y, left: popPos.left + drag.offset.x }}
                        className={`fixed z-[118] w-[236px] rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xl p-3 text-xs text-slate-800 dark:text-slate-200 transition-[opacity,transform] duration-150 origin-top ${presence.visible
                            ? 'opacity-100 scale-100 translate-y-0'
                            : 'opacity-0 scale-95 -translate-y-1 pointer-events-none'
                            }`}
                    >
                        <div
                            data-testid={`${testIdPrefix}-font-size-drag-handle`}
                            onPointerDown={drag.handleDragStart}
                            className="flex items-center justify-between gap-2 mb-2.5 cursor-grab active:cursor-grabbing select-none"
                        >
                            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                <GripHorizontal className="w-3.5 h-3.5 shrink-0" />
                                Font Size
                            </span>
                            <div className="flex items-center gap-1">
                                <input
                                    type="number"
                                    min={min}
                                    max={max}
                                    data-testid={`${testIdPrefix}-font-size-input`}
                                    value={clampedDisplay}
                                    onChange={handleInputChange}
                                    className="w-14 px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-right font-mono text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                                />
                                <span className="text-[10px] text-slate-400">px</span>
                            </div>
                        </div>

                        <input
                            type="range"
                            min={min}
                            max={max}
                            data-testid={`${testIdPrefix}-font-size-slider`}
                            value={clampedDisplay}
                            onChange={(e) => {
                                const next = Number(e.target.value);
                                setScrubVal(next);
                                onPreview?.(next);
                            }}
                            onPointerUp={(e) => {
                                const next = Number(e.currentTarget.value);
                                setScrubVal(null);
                                onCommit?.(next);
                            }}
                            onKeyUp={(e) => {
                                const next = Number(e.currentTarget.value);
                                setScrubVal(null);
                                onCommit?.(next);
                            }}
                            className="w-full studio-range mb-3"
                        />

                        <div className="flex flex-wrap gap-1">
                            {QUICK_SIZES.map((preset) => (
                                <button
                                    key={preset}
                                    type="button"
                                    onClick={() => onCommit?.(preset)}
                                    className={`px-1.5 py-0.5 rounded-md font-mono text-[10px] font-semibold cursor-pointer transition-colors ${clampedDisplay === preset
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'
                                        }`}
                                >
                                    {preset}
                                </button>
                            ))}
                        </div>
                    </div>,
                    document.body
                )}
        </>
    );
}
