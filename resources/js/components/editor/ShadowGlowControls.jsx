import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
    Sparkles,
    Sun,
    RotateCcw,
    Plus,
    Trash2,
    Eye,
    EyeOff,
    GripHorizontal,
    ChevronRight,
    ChevronDown,
    Pencil,
} from 'lucide-react';
import StudioColorPicker from '../tools/StudioColorPicker';
import StudioSelect from '../ui/StudioSelect';
import {
    BLEND_MODES,
    createGlowItem,
    createShadowItem,
    getBlendModeLabel,
    normalizeGlowConfig,
    normalizeShadowConfig,
    uid,
} from './editorHelpers';
import { useAnimatedPresence } from './useAnimatedPresence';
import { usePopoverDrag } from './useDraggablePanel';

const GLOW_SWATCHES = ['#3b82f6', '#8b5cf6', '#ec4899', '#10b981', '#f59e0b', '#ffffff'];

function EffectSliderRow({ label, value, min, max, step = 1, unit = 'px', testId, onPreview, onCommit }) {
    const safeVal = Number.isFinite(Number(value)) ? Number(value) : min;
    return (
        <div>
            <div className="flex items-center justify-between text-[11px] mb-1">
                <span className="text-slate-600 dark:text-slate-300 font-medium">{label}</span>
                <span className="font-mono text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                    {unit === '%' ? `${Math.round(safeVal * 100)}%` : `${Math.round(safeVal)}${unit}`}
                </span>
            </div>
            <input
                type="range"
                min={min}
                max={max}
                step={step}
                data-testid={testId}
                value={safeVal}
                onChange={(e) => onPreview(Number(e.target.value))}
                onPointerUp={(e) => onCommit(Number(e.currentTarget.value))}
                onKeyUp={(e) => onCommit(Number(e.currentTarget.value))}
                className="w-full cursor-pointer"
            />
        </div>
    );
}

function useEffectListUiState(open) {
    const [expandedIds, setExpandedIds] = useState(() => new Set());
    const [editingId, setEditingId] = useState(null);
    const [draftName, setDraftName] = useState('');

    useEffect(() => {
        if (open) {
            // Start all shadow/glow layers collapsed whenever the panel opens
            setExpandedIds(new Set());
            setEditingId(null);
            setDraftName('');
        }
    }, [open]);

    const toggleExpand = (id) => {
        setExpandedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const expandItem = (id) => {
        if (!id) return;
        setExpandedIds((prev) => {
            const next = new Set(prev);
            next.add(id);
            return next;
        });
    };

    const startRename = (id, currentLabel) => {
        setEditingId(id);
        setDraftName(currentLabel || '');
    };

    const cancelRename = () => {
        setEditingId(null);
        setDraftName('');
    };

    return {
        expandedIds,
        toggleExpand,
        expandItem,
        editingId,
        draftName,
        setDraftName,
        startRename,
        cancelRename,
    };
}

function useEffectPopover(open, setOpen, triggerRef, popRef, width = 296, fallbackHeight = 420) {
    const [pos, setPos] = useState({ top: 0, left: 0 });
    const presence = useAnimatedPresence(open, 180);
    const drag = usePopoverDrag({ open, panelRef: popRef });

    useLayoutEffect(() => {
        if (!open || !triggerRef.current) return undefined;
        const update = () => {
            if (!triggerRef.current) return;
            const rect = triggerRef.current.getBoundingClientRect();
            const measuredH = popRef.current?.offsetHeight || fallbackHeight;
            const left = Math.max(
                10,
                Math.min(window.innerWidth - width - 10, rect.left + rect.width / 2 - width / 2)
            );
            const fitsBelow = rect.bottom + 8 + measuredH <= window.innerHeight - 10;
            const top = fitsBelow
                ? rect.bottom + 8
                : Math.max(10, Math.min(window.innerHeight - measuredH - 10, rect.top - measuredH - 8));
            setPos({ top, left });
        };
        update();
        const raf = requestAnimationFrame(update);
        window.addEventListener('resize', update);
        window.addEventListener('scroll', update, true);
        return () => {
            cancelAnimationFrame(raf);
            window.removeEventListener('resize', update);
            window.removeEventListener('scroll', update, true);
        };
    }, [open, triggerRef, popRef, width, fallbackHeight]);

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
                e.target.closest?.('[data-effect-popover-trigger="true"]') ||
                e.target.closest?.('[role="dialog"][aria-label="Custom color picker"]') ||
                e.target.closest?.('[data-testid="editor-eyedropper-overlay"]') ||
                e.target.closest?.('[data-testid="studio-select-listbox"]') ||
                e.target.closest?.('[role="listbox"]')
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
    }, [open, setOpen, triggerRef, popRef]);

    return { pos, presence, drag };
}

function EffectBlendRow({ value, testId, ariaLabel, onChange }) {
    return (
        <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300">
                Blend Mode
            </span>
            <StudioSelect
                size="sm"
                data-testid={testId}
                aria-label={ariaLabel}
                value={value || 'source-over'}
                onChange={(e) => onChange(e.target.value)}
                className="min-w-[132px]"
            >
                {BLEND_MODES.map((m) => (
                    <option key={m.value} value={m.value}>
                        {m.label}
                    </option>
                ))}
            </StudioSelect>
        </div>
    );
}

function EffectItemCard({
    idx,
    item,
    itemKey,
    defaultLabel,
    summaryText,
    testIdPrefix,
    kind,
    expanded,
    onToggleExpand,
    editing,
    draftName,
    onDraftNameChange,
    onStartRename,
    onCommitRename,
    onCancelRename,
    onToggleMute,
    canRemove,
    onRemove,
    children,
}) {
    const displayName = item.name?.trim() || defaultLabel;
    const isMuted = item.enabled === false;

    const handleHeaderClick = (e) => {
        if (e.target.closest('button, input')) return;
        onToggleExpand(itemKey);
    };

    return (
        <div
            data-testid={`${testIdPrefix}-${kind}-item-${idx}`}
            data-expanded={expanded ? 'true' : 'false'}
            className="rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 overflow-hidden"
        >
            <div
                onClick={handleHeaderClick}
                className={`px-2.5 py-2 flex items-center justify-between gap-1.5 cursor-pointer hover:bg-slate-100/80 dark:hover:bg-slate-900/70 transition-colors ${isMuted ? 'opacity-65' : ''}`}
            >
                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                    <button
                        type="button"
                        data-testid={`${testIdPrefix}-${kind}-toggle-${idx}`}
                        aria-expanded={expanded}
                        onClick={(e) => {
                            e.stopPropagation();
                            onToggleExpand(itemKey);
                        }}
                        className="p-0.5 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer shrink-0"
                        title={expanded ? 'Collapse' : 'Expand'}
                    >
                        {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                    </button>
                    <span
                        className="w-2.5 h-2.5 rounded-full border border-slate-300 dark:border-slate-600 shrink-0"
                        style={{ backgroundColor: item.color || '#000000' }}
                    />
                    {editing ? (
                        <input
                            type="text"
                            autoFocus
                            data-testid={`${testIdPrefix}-${kind}-name-input-${idx}`}
                            value={draftName}
                            onChange={(e) => onDraftNameChange(e.target.value)}
                            onPointerDown={(e) => e.stopPropagation()}
                            onClick={(e) => e.stopPropagation()}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    onCommitRename();
                                } else if (e.key === 'Escape') {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    onCancelRename();
                                }
                            }}
                            onBlur={onCommitRename}
                            className="min-w-0 flex-1 px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 border border-blue-500 text-[11px] font-semibold text-slate-800 dark:text-slate-100 focus:outline-none"
                        />
                    ) : (
                        <>
                            <span
                                data-testid={`${testIdPrefix}-${kind}-name-${idx}`}
                                onDoubleClick={(e) => {
                                    e.stopPropagation();
                                    onStartRename(itemKey, displayName);
                                }}
                                title="Click row to expand · Double-click to rename"
                                className="text-[11px] font-semibold text-slate-700 dark:text-slate-200 truncate"
                            >
                                {displayName}
                            </span>
                            {!expanded && (
                                <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 shrink-0">
                                    {summaryText}
                                </span>
                            )}
                        </>
                    )}
                </div>

                <div className="flex items-center gap-0.5 shrink-0">
                    {!editing && (
                        <button
                            type="button"
                            data-testid={`${testIdPrefix}-${kind}-rename-${idx}`}
                            onClick={(e) => {
                                e.stopPropagation();
                                onStartRename(itemKey, displayName);
                            }}
                            title={`Rename ${kind}`}
                            className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/70 dark:hover:bg-slate-800 cursor-pointer"
                        >
                            <Pencil className="w-3 h-3" />
                        </button>
                    )}
                    <button
                        type="button"
                        data-testid={`${testIdPrefix}-${kind}-mute-${idx}`}
                        onClick={(e) => {
                            e.stopPropagation();
                            onToggleMute();
                        }}
                        title={isMuted ? 'Enable layer' : 'Mute layer'}
                        className={`p-1 rounded-md cursor-pointer ${isMuted
                            ? 'text-slate-400 hover:text-slate-600'
                            : 'text-blue-600 dark:text-blue-400 hover:bg-blue-500/10'
                            }`}
                    >
                        {isMuted ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                    {canRemove && (
                        <button
                            type="button"
                            data-testid={`${testIdPrefix}-${kind}-remove-${idx}`}
                            onClick={(e) => {
                                e.stopPropagation();
                                onRemove();
                            }}
                            title={`Remove ${kind}`}
                            className="p-1 rounded-md text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 cursor-pointer"
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>
            </div>

            {expanded && (
                <div
                    data-testid={`${testIdPrefix}-${kind}-body-${idx}`}
                    className="px-2.5 pb-2.5 pt-2 border-t border-slate-200/80 dark:border-slate-800 space-y-2.5"
                >
                    {children}
                </div>
            )}
        </div>
    );
}

export function ShadowEffectControl({
    shadowConfig,
    onUpdateShadow,
    testIdPrefix = 'floating',
    compact = false,
    className = '',
    open: controlledOpen,
    onOpenChange,
}) {
    const [internalOpen, setInternalOpen] = useState(false);
    const [draft, setDraft] = useState(null);
    const triggerRef = useRef(null);
    const popRef = useRef(null);

    const isControlled = controlledOpen !== undefined;
    const open = isControlled ? controlledOpen : internalOpen;

    const setOpenState = (next) => {
        const resolved = typeof next === 'function' ? next(open) : next;
        if (!isControlled) setInternalOpen(resolved);
        onOpenChange?.(resolved);
    };

    const normalized = normalizeShadowConfig(draft || shadowConfig);
    const items = normalized.items;
    const isEffectActive = normalized.enabled && items.some((it) => it.enabled !== false);

    const { pos, presence, drag } = useEffectPopover(open, setOpenState, triggerRef, popRef, 296, 440);
    const ui = useEffectListUiState(open);

    const commitFull = (nextCfg) => {
        const clean = normalizeShadowConfig(nextCfg);
        setDraft(null);
        onUpdateShadow?.(clean, true);
    };

    const previewItemPatch = (idx, patch) => {
        const baseItems = normalized.items.length > 0 ? [...normalized.items] : [createShadowItem()];
        baseItems[idx] = createShadowItem({ ...baseItems[idx], enabled: true, ...patch });
        const nextCfg = { enabled: true, items: baseItems };
        setDraft(nextCfg);
        onUpdateShadow?.(nextCfg, false);
    };

    const commitItemPatch = (idx, patch) => {
        const baseItems = normalized.items.length > 0 ? [...normalized.items] : [createShadowItem()];
        baseItems[idx] = createShadowItem({ ...baseItems[idx], ...patch });
        const nextCfg = {
            enabled: baseItems.some((it) => it.enabled !== false),
            items: baseItems,
        };
        commitFull(nextCfg);
    };

    const handleTriggerClick = () => {
        setOpenState(!open);
    };

    const handleAddItem = () => {
        const baseItems = [...normalized.items];
        const nextId = uid('sh');
        const nextItem =
            baseItems.length === 0
                ? createShadowItem({ id: nextId, enabled: true })
                : createShadowItem({
                      id: nextId,
                      enabled: true,
                      type: baseItems.length % 2 === 1 ? 'drop' : 'inner',
                      blur: 28,
                      offsetX: 0,
                      offsetY: baseItems.length * 6 + 6,
                      opacity: 0.35,
                  });
        commitFull({ enabled: true, items: [...baseItems, nextItem] });
        ui.expandItem(nextId);
    };

    const handleCommitRename = (idx, defaultLabel) => {
        const trimmed = ui.draftName.trim();
        commitItemPatch(idx, { name: trimmed === defaultLabel ? '' : trimmed });
        ui.cancelRename();
    };

    const handleRemoveItem = (idx) => {
        const filtered = normalized.items.filter((_, i) => i !== idx);
        if (filtered.length === 0) {
            commitFull({ enabled: false, items: [] });
        } else {
            commitFull({ enabled: filtered.some((it) => it.enabled !== false), items: filtered });
        }
    };

    const activeCount = normalized.items.filter((it) => it.enabled !== false).length;

    return (
        <>
            <button
                ref={triggerRef}
                type="button"
                data-testid={`${testIdPrefix}-shadow-trigger`}
                data-effect-popover-trigger="true"
                onClick={handleTriggerClick}
                aria-expanded={open}
                data-tooltip="Customize drop & inner shadows"
                className={
                    className ||
                    `inline-flex items-center gap-1 rounded-lg font-semibold cursor-pointer transition-colors ${compact ? 'px-2 py-1 text-[11px]' : 'px-2.5 py-1 text-xs'
                    } ${isEffectActive
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200'
                    }`
                }
            >
                <Sun className="w-3.5 h-3.5" />
                <span>Shadow</span>
                {isEffectActive && activeCount > 1 && (
                    <span className="px-1 rounded-full bg-white/25 text-[9px] font-bold leading-tight">
                        {activeCount}
                    </span>
                )}
            </button>

            {presence.rendered &&
                typeof document !== 'undefined' &&
                createPortal(
                    <div
                        ref={popRef}
                        data-testid={`${testIdPrefix}-shadow-popover`}
                        onPointerDown={(e) => e.stopPropagation()}
                        style={{ top: pos.top + drag.offset.y, left: pos.left + drag.offset.x }}
                        className={`fixed z-[118] w-[296px] rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xl p-3.5 text-xs text-slate-800 dark:text-slate-200 flex flex-col gap-3 transition-[opacity,transform] duration-150 origin-top ${presence.visible
                            ? 'opacity-100 scale-100 translate-y-0'
                            : 'opacity-0 scale-95 -translate-y-1 pointer-events-none'
                            }`}
                    >
                        <div
                            data-testid={`${testIdPrefix}-shadow-drag-handle`}
                            onPointerDown={drag.handleDragStart}
                            className="flex items-center justify-between gap-2 pb-2 border-b border-slate-200 dark:border-slate-800 cursor-grab active:cursor-grabbing select-none"
                        >
                            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                <GripHorizontal className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                Shadow Effects
                            </span>
                            <div className="flex items-center gap-1.5">
                                <button
                                    type="button"
                                    data-testid={`${testIdPrefix}-shadow-reset`}
                                    disabled={items.length === 0}
                                    onClick={() => commitFull({ enabled: true, items: [createShadowItem()] })}
                                    className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                                    title="Reset to default shadow"
                                >
                                    <RotateCcw className="w-3 h-3" />
                                </button>
                                <button
                                    type="button"
                                    data-testid={`${testIdPrefix}-shadow-enable-toggle`}
                                    disabled={items.length === 0}
                                    onClick={() => {
                                        if (items.length === 0) return;
                                        const nextEnabled = !normalized.enabled;
                                        const ensureItems = normalized.items.map((it, i) =>
                                            nextEnabled && i === 0 ? { ...it, enabled: true } : it
                                        );
                                        commitFull({ enabled: nextEnabled, items: ensureItems });
                                    }}
                                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${isEffectActive
                                        ? 'bg-blue-600 text-white hover:bg-blue-500'
                                        : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700'
                                        }`}
                                >
                                    {isEffectActive ? 'On' : 'Off'}
                                </button>
                            </div>
                        </div>

                        <div className="max-h-[50vh] overflow-y-auto pr-0.5 space-y-2">
                            {items.length === 0 ? (
                                <div
                                    data-testid={`${testIdPrefix}-shadow-empty`}
                                    className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-950/50 px-3 py-4 text-center text-[11px] text-slate-500 dark:text-slate-400"
                                >
                                    No shadows added yet.
                                </div>
                            ) : (
                                items.map((item, idx) => {
                                const itemKey = item.id || `sh-${idx}`;
                                const defaultLabel = `Shadow #${idx + 1}`;
                                const blendLabel = item.blendMode && item.blendMode !== 'source-over'
                                    ? ` · ${getBlendModeLabel(item.blendMode)}`
                                    : '';
                                const summaryText = `${(item.type || 'drop') === 'inner' ? 'Inner' : 'Drop'} · ${Math.round(item.blur ?? 0)}px${blendLabel}`;
                                return (
                                    <EffectItemCard
                                        key={itemKey}
                                        idx={idx}
                                        item={item}
                                        itemKey={itemKey}
                                        defaultLabel={defaultLabel}
                                        summaryText={summaryText}
                                        testIdPrefix={testIdPrefix}
                                        kind="shadow"
                                        expanded={ui.expandedIds.has(itemKey)}
                                        onToggleExpand={ui.toggleExpand}
                                        editing={ui.editingId === itemKey}
                                        draftName={ui.draftName}
                                        onDraftNameChange={ui.setDraftName}
                                        onStartRename={ui.startRename}
                                        onCommitRename={() => handleCommitRename(idx, defaultLabel)}
                                        onCancelRename={ui.cancelRename}
                                        onToggleMute={() => commitItemPatch(idx, { enabled: item.enabled === false })}
                                        canRemove={items.length > 0}
                                        onRemove={() => handleRemoveItem(idx)}
                                    >
                                        <div className="flex items-center justify-between gap-2">
                                            <div className="inline-flex p-0.5 rounded-lg bg-slate-200/80 dark:bg-slate-900 border border-slate-300/60 dark:border-slate-800">
                                                {[
                                                    { value: 'drop', label: 'Drop' },
                                                    { value: 'inner', label: 'Inner' },
                                                ].map((opt) => (
                                                    <button
                                                        key={opt.value}
                                                        type="button"
                                                        data-testid={`${testIdPrefix}-shadow-type-${opt.value}-${idx}`}
                                                        onClick={() => commitItemPatch(idx, { enabled: true, type: opt.value })}
                                                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold cursor-pointer transition-colors ${(item.type || 'drop') === opt.value
                                                            ? 'bg-blue-600 text-white shadow-sm'
                                                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                                            }`}
                                                    >
                                                        {opt.label}
                                                    </button>
                                                ))}
                                            </div>
                                            <StudioColorPicker
                                                value={item.color}
                                                onChange={(hex) => commitItemPatch(idx, { enabled: true, color: hex })}
                                                size="sm"
                                                title="Shadow color"
                                                customTooltip
                                            />
                                        </div>

                                        <EffectBlendRow
                                            value={item.blendMode}
                                            testId={idx === 0 ? `${testIdPrefix}-shadow-blend` : `${testIdPrefix}-shadow-blend-${idx}`}
                                            ariaLabel={`Shadow ${idx + 1} blend mode`}
                                            onChange={(blendMode) => commitItemPatch(idx, { enabled: true, blendMode })}
                                        />

                                        <EffectSliderRow
                                            label="Blur Radius"
                                            value={item.blur}
                                            min={0}
                                            max={150}
                                            testId={idx === 0 ? `${testIdPrefix}-shadow-blur` : `${testIdPrefix}-shadow-blur-${idx}`}
                                            onPreview={(v) => previewItemPatch(idx, { blur: v })}
                                            onCommit={(v) => commitItemPatch(idx, { enabled: true, blur: v })}
                                        />

                                        <EffectSliderRow
                                            label="Opacity"
                                            value={item.opacity}
                                            min={0}
                                            max={1}
                                            step={0.01}
                                            unit="%"
                                            testId={idx === 0 ? `${testIdPrefix}-shadow-opacity` : `${testIdPrefix}-shadow-opacity-${idx}`}
                                            onPreview={(v) => previewItemPatch(idx, { opacity: v })}
                                            onCommit={(v) => commitItemPatch(idx, { enabled: true, opacity: v })}
                                        />

                                        <div className="grid grid-cols-2 gap-2.5">
                                            <EffectSliderRow
                                                label="Offset X"
                                                value={item.offsetX}
                                                min={-120}
                                                max={120}
                                                testId={idx === 0 ? `${testIdPrefix}-shadow-offset-x` : `${testIdPrefix}-shadow-offset-x-${idx}`}
                                                onPreview={(v) => previewItemPatch(idx, { offsetX: v })}
                                                onCommit={(v) => commitItemPatch(idx, { enabled: true, offsetX: v })}
                                            />
                                            <EffectSliderRow
                                                label="Offset Y"
                                                value={item.offsetY}
                                                min={-120}
                                                max={120}
                                                testId={idx === 0 ? `${testIdPrefix}-shadow-offset-y` : `${testIdPrefix}-shadow-offset-y-${idx}`}
                                                onPreview={(v) => previewItemPatch(idx, { offsetY: v })}
                                                onCommit={(v) => commitItemPatch(idx, { enabled: true, offsetY: v })}
                                            />
                                        </div>
                                    </EffectItemCard>
                                );
                            })
                            )}
                        </div>

                        <button
                            type="button"
                            data-testid={`${testIdPrefix}-shadow-add-another`}
                            onClick={handleAddItem}
                            className="w-full py-2 rounded-xl bg-blue-600/10 hover:bg-blue-600/20 border border-blue-500/30 text-blue-600 dark:text-blue-400 text-[11px] font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                        >
                            <Plus className="w-3.5 h-3.5" />
                            <span>{items.length === 0 ? 'Add Shadow' : 'Add another shadow'}</span>
                        </button>
                    </div>,
                    document.body
                )}
        </>
    );
}

export function GlowEffectControl({
    glowConfig,
    isImage = false,
    onUpdateGlow,
    testIdPrefix = 'floating',
    compact = false,
    label = 'Glow',
    className = '',
    open: controlledOpen,
    onOpenChange,
}) {
    const [internalOpen, setInternalOpen] = useState(false);
    const [draft, setDraft] = useState(null);
    const triggerRef = useRef(null);
    const popRef = useRef(null);

    const isControlled = controlledOpen !== undefined;
    const open = isControlled ? controlledOpen : internalOpen;

    const setOpenState = (next) => {
        const resolved = typeof next === 'function' ? next(open) : next;
        if (!isControlled) setInternalOpen(resolved);
        onOpenChange?.(resolved);
    };

    const normalized = normalizeGlowConfig(draft || glowConfig);
    const items = normalized.items;
    const isEffectActive = normalized.enabled && items.some((it) => it.enabled !== false);

    const { pos, presence, drag } = useEffectPopover(open, setOpenState, triggerRef, popRef, 296, 440);
    const ui = useEffectListUiState(open);

    const commitFull = (nextCfg) => {
        const clean = normalizeGlowConfig(nextCfg);
        setDraft(null);
        onUpdateGlow?.(clean, true);
    };

    const previewItemPatch = (idx, patch) => {
        const baseItems = normalized.items.length > 0 ? [...normalized.items] : [createGlowItem()];
        baseItems[idx] = createGlowItem({ ...baseItems[idx], enabled: true, ...patch });
        const nextCfg = { enabled: true, items: baseItems };
        setDraft(nextCfg);
        onUpdateGlow?.(nextCfg, false);
    };

    const commitItemPatch = (idx, patch) => {
        const baseItems = normalized.items.length > 0 ? [...normalized.items] : [createGlowItem()];
        baseItems[idx] = createGlowItem({ ...baseItems[idx], ...patch });
        const nextCfg = {
            enabled: baseItems.some((it) => it.enabled !== false),
            items: baseItems,
        };
        commitFull(nextCfg);
    };

    const handleTriggerClick = () => {
        setOpenState(!open);
    };

    const handleAddItem = () => {
        const baseItems = [...normalized.items];
        const nextId = uid('gl');
        const nextItem =
            baseItems.length === 0
                ? createGlowItem({ id: nextId, enabled: true })
                : createGlowItem({
                      id: nextId,
                      enabled: true,
                      type: baseItems.length % 2 === 1 ? 'inner' : 'outer',
                      color: baseItems.length % 2 === 1 ? '#8b5cf6' : '#3b82f6',
                      blur: 32,
                      opacity: 0.75,
                      spread: 4,
                  });
        commitFull({ enabled: true, items: [...baseItems, nextItem] });
        ui.expandItem(nextId);
    };

    const handleCommitRename = (idx, defaultLabel) => {
        const trimmed = ui.draftName.trim();
        commitItemPatch(idx, { name: trimmed === defaultLabel ? '' : trimmed });
        ui.cancelRename();
    };

    const handleRemoveItem = (idx) => {
        const filtered = normalized.items.filter((_, i) => i !== idx);
        if (filtered.length === 0) {
            commitFull({ enabled: false, items: [] });
        } else {
            commitFull({ enabled: filtered.some((it) => it.enabled !== false), items: filtered });
        }
    };

    const activeCount = normalized.items.filter((it) => it.enabled !== false).length;

    return (
        <>
            <button
                ref={triggerRef}
                type="button"
                data-testid={`${testIdPrefix}-glow-trigger`}
                data-effect-popover-trigger="true"
                onClick={handleTriggerClick}
                aria-expanded={open}
                data-tooltip="Customize outer & inner glow"
                className={
                    className ||
                    `inline-flex items-center gap-1 rounded-lg font-semibold cursor-pointer transition-colors ${compact ? 'px-2 py-1 text-[11px]' : 'px-2.5 py-1 text-xs'
                    } ${isEffectActive
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200'
                    }`
                }
            >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{label}</span>
                {isEffectActive && activeCount > 1 && (
                    <span className="px-1 rounded-full bg-white/25 text-[9px] font-bold leading-tight">
                        {activeCount}
                    </span>
                )}
            </button>

            {presence.rendered &&
                typeof document !== 'undefined' &&
                createPortal(
                    <div
                        ref={popRef}
                        data-testid={`${testIdPrefix}-glow-popover`}
                        onPointerDown={(e) => e.stopPropagation()}
                        style={{ top: pos.top + drag.offset.y, left: pos.left + drag.offset.x }}
                        className={`fixed z-[118] w-[296px] rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xl p-3.5 text-xs text-slate-800 dark:text-slate-200 flex flex-col gap-3 transition-[opacity,transform] duration-150 origin-top ${presence.visible
                            ? 'opacity-100 scale-100 translate-y-0'
                            : 'opacity-0 scale-95 -translate-y-1 pointer-events-none'
                            }`}
                    >
                        <div
                            data-testid={`${testIdPrefix}-glow-drag-handle`}
                            onPointerDown={drag.handleDragStart}
                            className="flex items-center justify-between gap-2 pb-2 border-b border-slate-200 dark:border-slate-800 cursor-grab active:cursor-grabbing select-none"
                        >
                            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                <GripHorizontal className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                Glow Effects
                            </span>
                            <div className="flex items-center gap-1.5">
                                <button
                                    type="button"
                                    data-testid={`${testIdPrefix}-glow-reset`}
                                    disabled={items.length === 0}
                                    onClick={() => commitFull({ enabled: true, items: [createGlowItem()] })}
                                    className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                                    title="Reset to default glow"
                                >
                                    <RotateCcw className="w-3 h-3" />
                                </button>
                                <button
                                    type="button"
                                    data-testid={`${testIdPrefix}-glow-enable-toggle`}
                                    disabled={items.length === 0}
                                    onClick={() => {
                                        if (items.length === 0) return;
                                        const nextEnabled = !normalized.enabled;
                                        const ensureItems = normalized.items.map((it, i) =>
                                            nextEnabled && i === 0 ? { ...it, enabled: true } : it
                                        );
                                        commitFull({ enabled: nextEnabled, items: ensureItems });
                                    }}
                                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${isEffectActive
                                        ? 'bg-blue-600 text-white hover:bg-blue-500'
                                        : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700'
                                        }`}
                                >
                                    {isEffectActive ? 'On' : 'Off'}
                                </button>
                            </div>
                        </div>

                        <div className="max-h-[50vh] overflow-y-auto pr-0.5 space-y-2">
                            {items.length === 0 ? (
                                <div
                                    data-testid={`${testIdPrefix}-glow-empty`}
                                    className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-950/50 px-3 py-4 text-center text-[11px] text-slate-500 dark:text-slate-400"
                                >
                                    No glows added yet.
                                </div>
                            ) : (
                                items.map((item, idx) => {
                                const itemKey = item.id || `gl-${idx}`;
                                const defaultLabel = `Glow #${idx + 1}`;
                                const blendLabel = item.blendMode && item.blendMode !== 'source-over'
                                    ? ` · ${getBlendModeLabel(item.blendMode)}`
                                    : '';
                                const summaryText = `${(item.type || 'outer') === 'inner' ? 'Inner' : 'Outer'} · ${Math.round(item.blur ?? 0)}px${blendLabel}`;
                                return (
                                    <EffectItemCard
                                        key={itemKey}
                                        idx={idx}
                                        item={item}
                                        itemKey={itemKey}
                                        defaultLabel={defaultLabel}
                                        summaryText={summaryText}
                                        testIdPrefix={testIdPrefix}
                                        kind="glow"
                                        expanded={ui.expandedIds.has(itemKey)}
                                        onToggleExpand={ui.toggleExpand}
                                        editing={ui.editingId === itemKey}
                                        draftName={ui.draftName}
                                        onDraftNameChange={ui.setDraftName}
                                        onStartRename={ui.startRename}
                                        onCommitRename={() => handleCommitRename(idx, defaultLabel)}
                                        onCancelRename={ui.cancelRename}
                                        onToggleMute={() => commitItemPatch(idx, { enabled: item.enabled === false })}
                                        canRemove={items.length > 0}
                                        onRemove={() => handleRemoveItem(idx)}
                                    >
                                        <div className="flex items-center justify-between gap-2">
                                            <div className="inline-flex p-0.5 rounded-lg bg-slate-200/80 dark:bg-slate-900 border border-slate-300/60 dark:border-slate-800">
                                                {[
                                                    { value: 'outer', label: 'Outer' },
                                                    { value: 'inner', label: 'Inner' },
                                                ].map((opt) => (
                                                    <button
                                                        key={opt.value}
                                                        type="button"
                                                        data-testid={`${testIdPrefix}-glow-type-${opt.value}-${idx}`}
                                                        onClick={() => commitItemPatch(idx, { enabled: true, type: opt.value })}
                                                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold cursor-pointer transition-colors ${(item.type || 'outer') === opt.value
                                                            ? 'bg-blue-600 text-white shadow-sm'
                                                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                                            }`}
                                                    >
                                                        {opt.label}
                                                    </button>
                                                ))}
                                            </div>

                                            <div className="flex items-center gap-1">
                                                {GLOW_SWATCHES.map((swatch) => (
                                                    <button
                                                        key={swatch}
                                                        type="button"
                                                        onClick={() => commitItemPatch(idx, { enabled: true, color: swatch })}
                                                        aria-label={`Glow color ${swatch}`}
                                                        style={{ backgroundColor: swatch }}
                                                        className={`w-4 h-4 rounded-full border cursor-pointer transition-transform hover:scale-110 ${item.color?.toLowerCase() === swatch
                                                            ? 'border-blue-600 ring-2 ring-blue-500/40'
                                                            : 'border-slate-300 dark:border-slate-600'
                                                            }`}
                                                    />
                                                ))}
                                                <StudioColorPicker
                                                    value={item.color}
                                                    onChange={(hex) => commitItemPatch(idx, { enabled: true, color: hex })}
                                                    size="sm"
                                                    title="Custom glow color"
                                                    customTooltip
                                                />
                                            </div>
                                        </div>

                                        <EffectBlendRow
                                            value={item.blendMode}
                                            testId={idx === 0 ? `${testIdPrefix}-glow-blend` : `${testIdPrefix}-glow-blend-${idx}`}
                                            ariaLabel={`Glow ${idx + 1} blend mode`}
                                            onChange={(blendMode) => commitItemPatch(idx, { enabled: true, blendMode })}
                                        />

                                        <EffectSliderRow
                                            label="Glow Intensity (Blur)"
                                            value={item.blur}
                                            min={0}
                                            max={150}
                                            testId={idx === 0 ? `${testIdPrefix}-glow-blur` : `${testIdPrefix}-glow-blur-${idx}`}
                                            onPreview={(v) => previewItemPatch(idx, { blur: v })}
                                            onCommit={(v) => commitItemPatch(idx, { enabled: true, blur: v })}
                                        />

                                        <EffectSliderRow
                                            label="Opacity"
                                            value={item.opacity}
                                            min={0}
                                            max={1}
                                            step={0.01}
                                            unit="%"
                                            testId={idx === 0 ? `${testIdPrefix}-glow-opacity` : `${testIdPrefix}-glow-opacity-${idx}`}
                                            onPreview={(v) => previewItemPatch(idx, { opacity: v })}
                                            onCommit={(v) => commitItemPatch(idx, { enabled: true, opacity: v })}
                                        />

                                        <EffectSliderRow
                                            label={isImage && item.type !== 'inner' ? 'Halo / Sticker Spread' : 'Glow Spread'}
                                            value={item.spread}
                                            min={0}
                                            max={40}
                                            testId={idx === 0 ? `${testIdPrefix}-glow-spread` : `${testIdPrefix}-glow-spread-${idx}`}
                                            onPreview={(v) => previewItemPatch(idx, { spread: v })}
                                            onCommit={(v) => commitItemPatch(idx, { enabled: true, spread: v })}
                                        />
                                    </EffectItemCard>
                                );
                            })
                            )}
                        </div>

                        <button
                            type="button"
                            data-testid={`${testIdPrefix}-glow-add-another`}
                            onClick={handleAddItem}
                            className="w-full py-2 rounded-xl bg-blue-600/10 hover:bg-blue-600/20 border border-blue-500/30 text-blue-600 dark:text-blue-400 text-[11px] font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                        >
                            <Plus className="w-3.5 h-3.5" />
                            <span>{items.length === 0 ? 'Add Glow' : 'Add another glow'}</span>
                        </button>
                    </div>,
                    document.body
                )}
        </>
    );
}
