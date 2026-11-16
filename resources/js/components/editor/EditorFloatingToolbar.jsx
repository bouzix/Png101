import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
    AlignLeft,
    AlignCenter,
    AlignRight,
    RotateCw,
    FlipHorizontal2,
    FlipVertical2,
    Sparkles,
    Wand2,
    Copy,
    Trash2,
    Lock,
    Unlock,
    Group as GroupIcon,
    Ungroup as UngroupIcon,
    ArrowUpToLine,
    ArrowDownToLine,
    GripVertical,
    Italic,
    Underline,
    Strikethrough,
    CaseUpper,
    Maximize2,
    Minimize2,
} from 'lucide-react';
import FontPickerDropdown from './FontPickerDropdown';
import SnapToggleButtons from './SnapToggleButtons';
import ScrubFontSizeControl from './ScrubFontSizeControl';
import { ShadowEffectControl, GlowEffectControl } from './ShadowGlowControls';
import StudioColorPicker from '../tools/StudioColorPicker';
import StudioSelect from '../ui/StudioSelect';
import { BLEND_MODES, DEFAULT_FILTER_STATE, FRAME_OPTIONS } from './editorHelpers';
import { EDITOR_PANEL_TRANSITION, useAnimatedPresence } from './useAnimatedPresence';

const WEIGHT_OPTIONS = [
    { value: '300', label: 'Light' },
    { value: '400', label: 'Regular' },
    { value: '500', label: 'Medium' },
    { value: '600', label: 'SemiBold' },
    { value: '700', label: 'Bold' },
    { value: '800', label: 'ExtraBold' },
    { value: '900', label: 'Black' },
];

function normalizeWeightValue(w) {
    const s = String(w ?? '400').toLowerCase();
    if (s === 'normal') return '400';
    if (s === 'bold') return '700';
    return ['300', '400', '500', '600', '700', '800', '900'].includes(s) ? s : '400';
}

export default function EditorFloatingToolbar({
    selectionMeta: incomingMeta,
    selectionBounds,
    viewportRef,
    artboardRef,
    zoom,
    panOffset,
    canvasWidth,
    canvasHeight,
    hidden = false,
    fonts = [],
    enableBgRemover = true,
    removingBg = false,
    onUpdateProp,
    onUpdateFilter,
    onApplyFrame,
    onFitToCanvas,
    onFlip,
    onAlign,
    onZOrder,
    onToggleShadow,
    onToggleStickerOutline,
    onUpdateShadow,
    onUpdateGlow,
    onRemoveBgSelected,
    onDuplicate,
    onToggleLock,
    onDelete,
    onGroupSelected,
    onUngroupSelected,
    snapPrefs,
    onToggleSnapPref,
    onPlacementChange,
}) {
    const barRef = useRef(null);
    const lastMetaRef = useRef(null);
    const exitTimerRef = useRef(null);
    const dragStateRef = useRef(null);
    const movedLayerIdRef = useRef(null);

    const shouldShow = Boolean(!hidden && incomingMeta && selectionBounds);
    const isTemporarilyHidden = Boolean(hidden && incomingMeta && selectionBounds);
    if ((shouldShow || isTemporarilyHidden) && incomingMeta) {
        lastMetaRef.current = incomingMeta;
    }
    const selectionMeta = (shouldShow || isTemporarilyHidden) ? incomingMeta : lastMetaRef.current;

    const [rendered, setRendered] = useState(shouldShow);
    const [visible, setVisible] = useState(false);
    const [coords, setCoords] = useState(null);
    const [customCoords, setCustomCoords] = useState(null);
    const [placement, setPlacement] = useState('above');
    const [isDraggingBar, setIsDraggingBar] = useState(false);
    const [expanded, setExpanded] = useState(false);
    const [activeEffectPanel, setActiveEffectPanel] = useState(null);
    const { rendered: expandedRendered, visible: expandedVisible } = useAnimatedPresence(
        Boolean(shouldShow && expanded && !selectionMeta?.lockedLayer),
        295
    );
    const isLocked = Boolean(selectionMeta?.lockedLayer);
    const fullControlsContentRef = useRef(null);
    const lockAnimTimerRef = useRef(null);
    const prevLockedRef = useRef(isLocked);
    const [lockAnim, setLockAnim] = useState(() => ({
        collapsed: isLocked,
        transitioning: false,
        maxW: isLocked ? 0 : null,
    }));

    useEffect(() => {
        if (!shouldShow && !isTemporarilyHidden) {
            if (lockAnimTimerRef.current) {
                clearTimeout(lockAnimTimerRef.current);
                lockAnimTimerRef.current = null;
            }
            prevLockedRef.current = isLocked;
            setLockAnim({ collapsed: isLocked, transitioning: false, maxW: isLocked ? 0 : null });
            return undefined;
        }
        if (prevLockedRef.current === isLocked) {
            return undefined;
        }
        prevLockedRef.current = isLocked;
        if (lockAnimTimerRef.current) {
            clearTimeout(lockAnimTimerRef.current);
            lockAnimTimerRef.current = null;
        }
        const measuredW = Math.max(220, fullControlsContentRef.current?.scrollWidth || 640);
        if (!isLocked) {
            // Smoothly expand from locked (0px) -> full normal floating toolbar
            setLockAnim({ collapsed: true, transitioning: true, maxW: 0 });
            const raf = requestAnimationFrame(() => {
                setLockAnim({ collapsed: false, transitioning: true, maxW: measuredW });
            });
            lockAnimTimerRef.current = setTimeout(() => {
                setLockAnim({ collapsed: false, transitioning: false, maxW: null });
            }, 320);
            return () => cancelAnimationFrame(raf);
        } else {
            // Smoothly collapse to locked floating toolbar
            setExpanded(false);
            setActiveEffectPanel(null);
            setLockAnim({ collapsed: false, transitioning: true, maxW: measuredW });
            const raf = requestAnimationFrame(() => {
                setLockAnim({ collapsed: true, transitioning: true, maxW: 0 });
            });
            lockAnimTimerRef.current = setTimeout(() => {
                setLockAnim({ collapsed: true, transitioning: false, maxW: 0 });
            }, 320);
            return () => cancelAnimationFrame(raf);
        }
    }, [isLocked, shouldShow, isTemporarilyHidden]);

    useEffect(() => {
        return () => {
            if (lockAnimTimerRef.current) clearTimeout(lockAnimTimerRef.current);
        };
    }, []);

    // Reset manual toolbar position & open sub-panels when switching to another element; preserve moved position while fading out on deselect
    const activeLayerId = incomingMeta?.selectionKey || incomingMeta?.layerId || incomingMeta?.type || null;
    const prevActiveLayerIdRef = useRef(activeLayerId);
    useEffect(() => {
        const prev = prevActiveLayerIdRef.current;
        if (prev !== activeLayerId) {
            prevActiveLayerIdRef.current = activeLayerId;
            setActiveEffectPanel(null);
            setExpanded(false);
            if (activeLayerId && prev && activeLayerId !== prev) {
                setCustomCoords(null);
                movedLayerIdRef.current = null;
            }
        }
    }, [activeLayerId]);

    // Coordinate enter (emerge from object small->full) and exit (reverse shrink back)
    useEffect(() => {
        if (exitTimerRef.current) {
            clearTimeout(exitTimerRef.current);
            exitTimerRef.current = null;
        }

        if (shouldShow) {
            setRendered(true);
            let raf2 = 0;
            const raf1 = requestAnimationFrame(() => {
                raf2 = requestAnimationFrame(() => {
                    setVisible(true);
                });
            });
            return () => {
                cancelAnimationFrame(raf1);
                if (raf2) cancelAnimationFrame(raf2);
            };
        }

        setVisible(false);
        // When temporarily hidden (e.g. moving/transforming the selected element), keep toolbar & panel states/positions mounted!
        if (isTemporarilyHidden) {
            return undefined;
        }

        exitTimerRef.current = setTimeout(() => {
            setRendered(false);
            setCoords(null);
            setCustomCoords(null);
            setExpanded(false);
            setActiveEffectPanel(null);
            movedLayerIdRef.current = null;
            lastMetaRef.current = null;
        }, 295);

        return () => {
            if (exitTimerRef.current) clearTimeout(exitTimerRef.current);
        };
    }, [shouldShow, isTemporarilyHidden]);

    useLayoutEffect(() => {
        if (!shouldShow || !viewportRef?.current || !artboardRef?.current) {
            return;
        }

        const updatePosition = () => {
            if (!viewportRef.current || !artboardRef.current) return;
            const vpRect = viewportRef.current.getBoundingClientRect();
            const artRect = artboardRef.current.getBoundingClientRect();
            if (!vpRect.width || !vpRect.height) return;

            const artLeft = artRect.left - vpRect.left;
            const artTop = artRect.top - vpRect.top;

            const objLeft = artLeft + selectionBounds.left * zoom;
            const objTop = artTop + selectionBounds.top * zoom;
            const objWidth = selectionBounds.width * zoom;
            const objBottom = objTop + selectionBounds.height * zoom;
            const objCenterX = objLeft + objWidth / 2;

            const barW = barRef.current?.offsetWidth || 440;
            const barH = barRef.current?.offsetHeight || 42;

            // Leave right margin (58px) clear of the vertical floating tool strip
            const maxLeft = Math.max(12, vpRect.width - barW - 58);
            const left = Math.max(12, Math.min(maxLeft, objCenterX - barW / 2));

            // Prefer sitting cleanly above element; flip below object if near viewport top
            const aboveTop = objTop - barH - 14;
            const belowTop = objBottom + 16;
            let nextPlacement = 'above';
            let top = aboveTop;
            if (aboveTop < 10) {
                if (belowTop + barH <= vpRect.height - 10) {
                    top = belowTop;
                    nextPlacement = 'below';
                } else {
                    top = Math.max(10, Math.min(vpRect.height - barH - 10, aboveTop));
                }
            }

            if (customCoords) {
                const objMidY = (objTop + objBottom) / 2;
                const customMidY = customCoords.top + barH / 2;
                onPlacementChange?.(customMidY > objMidY ? 'below' : 'above');
            } else {
                onPlacementChange?.(nextPlacement);
            }

            setPlacement(nextPlacement);
            setCoords({ left: Math.round(left), top: Math.round(top) });
        };

        updatePosition();
        const raf = requestAnimationFrame(updatePosition);
        let ro = null;
        if (typeof ResizeObserver !== 'undefined' && barRef.current) {
            ro = new ResizeObserver(() => updatePosition());
            ro.observe(barRef.current);
        }
        return () => {
            cancelAnimationFrame(raf);
            if (ro) ro.disconnect();
        };
    }, [shouldShow, incomingMeta, selectionBounds, viewportRef, artboardRef, zoom, panOffset, canvasWidth, canvasHeight, expanded, isLocked, customCoords, onPlacementChange]);

    // Global drag listeners while moving the floating mini-toolbar
    useEffect(() => {
        if (!isDraggingBar) return;

        const handlePointerMove = (e) => {
            const st = dragStateRef.current;
            if (!st || !viewportRef?.current) return;
            const vpRect = viewportRef.current.getBoundingClientRect();
            const barW = barRef.current?.offsetWidth || 440;
            const barH = barRef.current?.offsetHeight || 42;

            const dx = e.clientX - st.startX;
            const dy = e.clientY - st.startY;
            const nextLeft = Math.max(8, Math.min(vpRect.width - barW - 8, st.origLeft + dx));
            const nextTop = Math.max(8, Math.min(vpRect.height - barH - 8, st.origTop + dy));

            setCustomCoords({ left: Math.round(nextLeft), top: Math.round(nextTop) });
        };

        const handlePointerUp = () => {
            dragStateRef.current = null;
            setIsDraggingBar(false);
        };

        window.addEventListener('pointermove', handlePointerMove);
        window.addEventListener('pointerup', handlePointerUp);
        window.addEventListener('pointercancel', handlePointerUp);
        return () => {
            window.removeEventListener('pointermove', handlePointerMove);
            window.removeEventListener('pointerup', handlePointerUp);
            window.removeEventListener('pointercancel', handlePointerUp);
        };
    }, [isDraggingBar, viewportRef]);

    if (!rendered || !selectionMeta) {
        return null;
    }

    const type = (selectionMeta.type || '').toLowerCase();
    const isText = type.includes('text');
    const isImage = type === 'image';
    const isRect = type === 'rect';
    const isMulti = type === 'activeselection';
    const isGroup = type === 'group';
    const isShape = !isText && !isImage && !isMulti && !isGroup;
    const filters = { ...DEFAULT_FILTER_STATE, ...(selectionMeta.filterState || {}) };

    const currentAngle = Math.round(selectionMeta.angle || 0);
    const rotateClockwise90 = () => {
        const nextAngle = ((currentAngle + 90) % 360 + 360) % 360;
        onUpdateProp('angle', nextAngle);
    };

    const activeCoords = customCoords || coords;
    const isShown = visible && Boolean(activeCoords);

    const startToolbarDrag = (e) => {
        e.stopPropagation();
        if (e.button !== 0 || !activeCoords) return;
        e.preventDefault();
        movedLayerIdRef.current = selectionMeta?.layerId || selectionMeta?.type || null;
        dragStateRef.current = {
            startX: e.clientX,
            startY: e.clientY,
            origLeft: activeCoords.left,
            origTop: activeCoords.top,
        };
        setIsDraggingBar(true);
    };

    const handleToolbarPointerDown = (e) => {
        e.stopPropagation();
        // Portaled popups (color picker, shadow/glow popovers, dropdowns) bubble through React's tree
        if (!barRef.current?.contains(e.target)) return;
        if (!e.target.closest('button, input, select, textarea, a, [role="listbox"], [role="option"], [role="dialog"]')) {
            startToolbarDrag(e);
        }
    };

    const resetToolbarPosition = (e) => {
        e.stopPropagation();
        setCustomCoords(null);
        movedLayerIdRef.current = null;
    };

    const stopEvent = (e) => {
        e.stopPropagation();
    };

    const originClass = placement === 'below' ? 'origin-top' : 'origin-bottom';
    const hiddenTransformClass = placement === 'below'
        ? 'opacity-0 -translate-y-5 scale-75 pointer-events-none'
        : 'opacity-0 translate-y-5 scale-75 pointer-events-none';

    return (
        <div
            ref={barRef}
            onPointerDown={handleToolbarPointerDown}
            onMouseDown={stopEvent}
            onClick={stopEvent}
            style={
                activeCoords
                    ? { left: `${activeCoords.left}px`, top: `${activeCoords.top}px` }
                    : { left: '-9999px', top: '-9999px' }
            }
            data-testid="floating-selection-toolbar"
            data-visible={isShown ? 'true' : 'false'}
            data-locked={isLocked ? 'true' : 'false'}
            data-expanded={expanded ? 'true' : 'false'}
            data-moved={customCoords ? 'true' : 'false'}
            className={`absolute z-30 max-w-[calc(100%-76px)] rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-700/90 shadow-2xl px-2 py-1.5 flex flex-col text-xs text-slate-700 dark:text-slate-200 select-none ${originClass} ${
                isDraggingBar
                    ? 'cursor-grabbing ring-2 ring-blue-500/40'
                    : 'transition-[opacity,translate,scale,transform] duration-[280ms] ease-[cubic-bezier(0.22,1,0.36,1)]'
            } ${
                isShown
                    ? 'opacity-100 translate-y-0 scale-100 pointer-events-auto'
                    : hiddenTransformClass
            }`}
        >
            {/* COMPACT MINI-TOOLBAR ROW */}
            <div className={`flex items-center ${lockAnim.collapsed ? 'gap-0.5' : 'gap-1.5'} ${!lockAnim.collapsed && !lockAnim.transitioning ? 'flex-wrap' : 'flex-nowrap'}`}>
                {/* Drag Grip Handle to reposition mini-toolbar anywhere on workspace */}
            <button
                type="button"
                data-testid="floating-toolbar-drag-handle"
                onPointerDown={startToolbarDrag}
                onDoubleClick={resetToolbarPosition}
                data-tooltip="Drag to move toolbar (double-click to snap back)"
                className={`p-1 -ml-0.5 rounded-lg border-r border-slate-200/80 dark:border-slate-800 pr-1.5 mr-0.5 cursor-grab active:cursor-grabbing ${
                    customCoords
                        ? 'text-blue-600 dark:text-blue-400'
                        : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
            >
                <GripVertical className="w-3.5 h-3.5" />
            </button>

            <div
                data-testid="floating-toolbar-unlocked-controls"
                style={{
                    maxWidth: lockAnim.maxW === null ? undefined : `${lockAnim.maxW}px`,
                    opacity: lockAnim.collapsed ? 0 : 1,
                    overflow: lockAnim.collapsed || lockAnim.transitioning ? 'hidden' : 'visible',
                    pointerEvents: lockAnim.collapsed ? 'none' : 'auto',
                    transition: lockAnim.transitioning
                        ? 'max-width 300ms cubic-bezier(0.22, 1, 0.36, 1), opacity 240ms ease'
                        : undefined,
                }}
                aria-hidden={lockAnim.collapsed}
            >
                <div ref={fullControlsContentRef} className="flex items-center gap-1.5 w-max">
            {/* TEXT MINI-TOOLBAR */}
            {isText && (
                <>
                    <FontPickerDropdown
                        value={selectionMeta.fontFamily || 'Inter'}
                        brandFonts={fonts}
                        compact
                        open={activeEffectPanel === 'font-picker'}
                        onOpenChange={(next) => setActiveEffectPanel(next ? 'font-picker' : null)}
                        temporarilyHidden={isTemporarilyHidden}
                        sessionKey={activeLayerId}
                        onChange={(family) => onUpdateProp('fontFamily', family)}
                    />

                    <StudioSelect
                        size="sm"
                        aria-label="Font weight"
                        data-tooltip="Font Weight"
                        value={normalizeWeightValue(selectionMeta.fontWeight)}
                        onChange={(e) => onUpdateProp('fontWeight', e.target.value)}
                        className="font-semibold"
                    >
                        {WEIGHT_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </StudioSelect>

                    <ScrubFontSizeControl
                        value={selectionMeta.fontSize || 40}
                        onPreview={(next) => onUpdateProp('fontSize', next, false)}
                        onCommit={(next) => onUpdateProp('fontSize', next, true)}
                        testIdPrefix="floating"
                        compact
                        open={activeEffectPanel === 'font-size'}
                        onOpenChange={(next) => setActiveEffectPanel(next ? 'font-size' : null)}
                        temporarilyHidden={isTemporarilyHidden}
                        sessionKey={activeLayerId}
                    />

                    <StudioColorPicker
                        value={typeof selectionMeta.fill === 'string' ? selectionMeta.fill : '#ffffff'}
                        onChange={(hex) => onUpdateProp('fill', hex)}
                        size="sm"
                        title="Text color"
                        customTooltip
                        open={activeEffectPanel === 'color-text'}
                        onOpenChange={(next) => setActiveEffectPanel(next ? 'color-text' : null)}
                        temporarilyHidden={isTemporarilyHidden}
                        sessionKey={activeLayerId}
                    />

                    {/* Text Alignment & Orientation */}
                    <div className="flex items-center gap-0.5 pl-1 border-l border-slate-200 dark:border-slate-800">
                        {[
                            { val: 'left', icon: <AlignLeft className="w-3.5 h-3.5" />, label: 'Align Left' },
                            { val: 'center', icon: <AlignCenter className="w-3.5 h-3.5" />, label: 'Align Center' },
                            { val: 'right', icon: <AlignRight className="w-3.5 h-3.5" />, label: 'Align Right' },
                        ].map((a) => (
                            <button
                                key={a.val}
                                type="button"
                                onClick={() => onUpdateProp('textAlign', a.val)}
                                data-tooltip={a.label}
                                className={`p-1.5 rounded-lg cursor-pointer ${
                                    selectionMeta.textAlign === a.val
                                        ? 'bg-blue-600 text-white'
                                        : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                                }`}
                            >
                                {a.icon}
                            </button>
                        ))}
                        <button
                            type="button"
                            onClick={rotateClockwise90}
                            data-tooltip={`Rotate orientation 90° (${currentAngle}°)`}
                            className={`inline-flex items-center gap-1 px-1.5 py-1 rounded-lg cursor-pointer ${
                                currentAngle % 360 !== 0
                                    ? 'bg-blue-600/15 text-blue-600 dark:text-blue-300 font-semibold'
                                    : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                            }`}
                        >
                            <RotateCw className="w-3.5 h-3.5" />
                            {currentAngle % 360 !== 0 && (
                                <span className="font-mono text-[10px]">{currentAngle}°</span>
                            )}
                        </button>
                    </div>

                    <div className="flex items-center gap-1 pl-1 border-l border-slate-200 dark:border-slate-800">
                        <ShadowEffectControl
                            shadowConfig={selectionMeta.shadowConfig}
                            onUpdateShadow={onUpdateShadow}
                            testIdPrefix="floating-text"
                            compact
                            open={activeEffectPanel === 'shadow'}
                            onOpenChange={(next) => setActiveEffectPanel(next ? 'shadow' : null)}
                            temporarilyHidden={isTemporarilyHidden}
                            sessionKey={activeLayerId}
                        />
                        <GlowEffectControl
                            glowConfig={selectionMeta.glowConfig}
                            isImage={false}
                            onUpdateGlow={onUpdateGlow}
                            testIdPrefix="floating-text"
                            compact
                            open={activeEffectPanel === 'glow'}
                            onOpenChange={(next) => setActiveEffectPanel(next ? 'glow' : null)}
                            temporarilyHidden={isTemporarilyHidden}
                            sessionKey={activeLayerId}
                        />
                    </div>
                </>
            )}

            {/* IMAGE / PNG MINI-TOOLBAR */}
            {isImage && (
                <>
                    {enableBgRemover && (
                        <button
                            type="button"
                            disabled={removingBg}
                            onClick={onRemoveBgSelected}
                            data-tooltip="AI Remove Background"
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/35 text-indigo-700 dark:text-indigo-300 text-[11px] font-semibold cursor-pointer disabled:opacity-50"
                        >
                            <Wand2 className="w-3.5 h-3.5" />
                            <span>{removingBg ? 'Removing...' : 'Remove BG'}</span>
                        </button>
                    )}

                    <GlowEffectControl
                        glowConfig={selectionMeta.glowConfig}
                        isImage
                        onUpdateGlow={onUpdateGlow}
                        testIdPrefix="floating"
                        compact
                        label="Glow"
                        open={activeEffectPanel === 'glow'}
                        onOpenChange={(next) => setActiveEffectPanel(next ? 'glow' : null)}
                        temporarilyHidden={isTemporarilyHidden}
                        sessionKey={activeLayerId}
                    />

                    <div className="flex items-center gap-0.5 pl-1 border-l border-slate-200 dark:border-slate-800">
                        <button
                            type="button"
                            onClick={() => onFlip('x')}
                            data-tooltip="Flip Horizontal"
                            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 cursor-pointer"
                        >
                            <FlipHorizontal2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                            type="button"
                            onClick={() => onFlip('y')}
                            data-tooltip="Flip Vertical"
                            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 cursor-pointer"
                        >
                            <FlipVertical2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                            type="button"
                            onClick={rotateClockwise90}
                            data-tooltip={`Rotate 90° (${currentAngle}°)`}
                            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 cursor-pointer"
                        >
                            <RotateCw className="w-3.5 h-3.5" />
                        </button>
                        <ShadowEffectControl
                            shadowConfig={selectionMeta.shadowConfig}
                            onUpdateShadow={onUpdateShadow}
                            testIdPrefix="floating-image"
                            compact
                            open={activeEffectPanel === 'shadow'}
                            onOpenChange={(next) => setActiveEffectPanel(next ? 'shadow' : null)}
                            temporarilyHidden={isTemporarilyHidden}
                            sessionKey={activeLayerId}
                        />
                        <button
                            type="button"
                            onClick={() => onZOrder('front')}
                            data-tooltip="Bring to Front"
                            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 cursor-pointer"
                        >
                            <ArrowUpToLine className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </>
            )}

            {/* SHAPE / VECTOR MINI-TOOLBAR */}
            {isShape && (
                <>
                    <div className="flex items-center gap-1">
                        <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">Fill</span>
                        <StudioColorPicker
                            value={typeof selectionMeta.fill === 'string' ? selectionMeta.fill : '#3b82f6'}
                            onChange={(hex) => onUpdateProp('fill', hex)}
                            size="sm"
                            title="Shape fill color"
                            customTooltip
                            open={activeEffectPanel === 'color-shape-fill'}
                            onOpenChange={(next) => setActiveEffectPanel(next ? 'color-shape-fill' : null)}
                            temporarilyHidden={isTemporarilyHidden}
                            sessionKey={activeLayerId}
                        />
                    </div>

                    <div className="flex items-center gap-1 pl-1 border-l border-slate-200 dark:border-slate-800">
                        <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">Stroke</span>
                        <StudioColorPicker
                            value={typeof selectionMeta.stroke === 'string' ? selectionMeta.stroke : '#ffffff'}
                            onChange={(hex) => onUpdateProp('stroke', hex)}
                            size="sm"
                            title="Stroke color"
                            customTooltip
                            open={activeEffectPanel === 'color-shape-stroke'}
                            onOpenChange={(next) => setActiveEffectPanel(next ? 'color-shape-stroke' : null)}
                            temporarilyHidden={isTemporarilyHidden}
                            sessionKey={activeLayerId}
                        />
                        <input
                            type="number"
                            min={0}
                            max={40}
                            aria-label="Stroke width"
                            value={selectionMeta.strokeWidth || 0}
                            onChange={(e) => onUpdateProp('strokeWidth', Number(e.target.value))}
                            className="w-10 px-1 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 font-mono text-[11px] text-slate-900 dark:text-white"
                        />
                    </div>

                    {isRect && (
                        <div className="flex items-center gap-1 pl-1 border-l border-slate-200 dark:border-slate-800">
                            <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">Radius</span>
                            <input
                                type="number"
                                min={0}
                                max={200}
                                aria-label="Corner radius"
                                value={Math.round(selectionMeta.rx || 0)}
                                onChange={(e) => {
                                    const r = Number(e.target.value) || 0;
                                    onUpdateProp('rx', r);
                                    onUpdateProp('ry', r);
                                }}
                                className="w-10 px-1 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 font-mono text-[11px] text-slate-900 dark:text-white"
                            />
                        </div>
                    )}

                    <div className="flex items-center gap-0.5 pl-1 border-l border-slate-200 dark:border-slate-800">
                        <button
                            type="button"
                            onClick={rotateClockwise90}
                            data-tooltip={`Rotate 90° (${currentAngle}°)`}
                            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 cursor-pointer"
                        >
                            <RotateCw className="w-3.5 h-3.5" />
                        </button>
                        <ShadowEffectControl
                            shadowConfig={selectionMeta.shadowConfig}
                            onUpdateShadow={onUpdateShadow}
                            testIdPrefix="floating-shape"
                            compact
                            open={activeEffectPanel === 'shadow'}
                            onOpenChange={(next) => setActiveEffectPanel(next ? 'shadow' : null)}
                            temporarilyHidden={isTemporarilyHidden}
                            sessionKey={activeLayerId}
                        />
                        <GlowEffectControl
                            glowConfig={selectionMeta.glowConfig}
                            isImage={false}
                            onUpdateGlow={onUpdateGlow}
                            testIdPrefix="floating-shape"
                            compact
                            open={activeEffectPanel === 'glow'}
                            onOpenChange={(next) => setActiveEffectPanel(next ? 'glow' : null)}
                            temporarilyHidden={isTemporarilyHidden}
                            sessionKey={activeLayerId}
                        />
                    </div>
                </>
            )}

            {/* MULTI-SELECTION / GROUP MINI-TOOLBAR */}
            {(isMulti || isGroup) && (
                <div className="flex items-center gap-1">
                    {selectionMeta.hasTextChildren && (
                        <StudioColorPicker
                            value={typeof selectionMeta.fill === 'string' ? selectionMeta.fill : '#ffffff'}
                            onChange={(hex) => onUpdateProp('textFill', hex)}
                            size="sm"
                            data-testid="floating-multi-color-trigger"
                            ariaLabel={`Change color of ${selectionMeta.textChildrenCount || 'selected'} text layers`}
                            title={`Text Color (${selectionMeta.textChildrenCount || 1} text${(selectionMeta.textChildrenCount || 1) > 1 ? 's' : ''})`}
                            customTooltip
                            open={activeEffectPanel === 'color-multi-text'}
                            onOpenChange={(next) => setActiveEffectPanel(next ? 'color-multi-text' : null)}
                            temporarilyHidden={isTemporarilyHidden}
                            sessionKey={activeLayerId}
                        />
                    )}
                    {isMulti && (
                        <button
                            type="button"
                            onClick={onGroupSelected}
                            data-tooltip="Group Selected (Ctrl+G)"
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-bold cursor-pointer"
                        >
                            <GroupIcon className="w-3.5 h-3.5" />
                            <span>Group</span>
                        </button>
                    )}
                    {isGroup && (
                        <button
                            type="button"
                            onClick={onUngroupSelected}
                            data-tooltip="Ungroup (Ctrl+Shift+G)"
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-950 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-700 text-[11px] font-bold cursor-pointer"
                        >
                            <UngroupIcon className="w-3.5 h-3.5" />
                            <span>Ungroup</span>
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={() => onAlign('center-h')}
                        data-tooltip="Center Horizontally"
                        className="px-2 py-1 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-[10px] font-bold cursor-pointer"
                    >
                        Center H
                    </button>
                    <button
                        type="button"
                        onClick={() => onAlign('center-v')}
                        data-tooltip="Center Vertically"
                        className="px-2 py-1 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-[10px] font-bold cursor-pointer"
                    >
                        Center V
                    </button>
                    <button
                        type="button"
                        onClick={rotateClockwise90}
                        data-tooltip={`Rotate 90° (${currentAngle}°)`}
                        className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 cursor-pointer"
                    >
                        <RotateCw className="w-3.5 h-3.5" />
                    </button>
                    <ShadowEffectControl
                        shadowConfig={selectionMeta.shadowConfig}
                        onUpdateShadow={onUpdateShadow}
                        testIdPrefix="floating-group"
                        compact
                        open={activeEffectPanel === 'shadow'}
                        onOpenChange={(next) => setActiveEffectPanel(next ? 'shadow' : null)}
                        temporarilyHidden={isTemporarilyHidden}
                        sessionKey={activeLayerId}
                    />
                    <GlowEffectControl
                        glowConfig={selectionMeta.glowConfig}
                        isImage={false}
                        onUpdateGlow={onUpdateGlow}
                        testIdPrefix="floating-group"
                        compact
                        open={activeEffectPanel === 'glow'}
                        onOpenChange={(next) => setActiveEffectPanel(next ? 'glow' : null)}
                        temporarilyHidden={isTemporarilyHidden}
                        sessionKey={activeLayerId}
                    />
                </div>
            )}
                </div>
            </div>

            {/* COMMON QUICK ACTIONS ON RIGHT EDGE */}
            <div className={`flex items-center gap-0.5 ${isLocked ? '' : 'pl-1 border-l border-slate-200 dark:border-slate-800'}`}>
                <button
                    type="button"
                    data-testid="floating-toolbar-duplicate"
                    onClick={onDuplicate}
                    data-tooltip="Duplicate (Ctrl+D)"
                    className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 cursor-pointer"
                >
                    <Copy className="w-3.5 h-3.5" />
                </button>
                <button
                    type="button"
                    data-testid="floating-toolbar-lock"
                    onClick={onToggleLock}
                    data-tooltip={selectionMeta.lockedLayer ? 'Unlock Layer' : 'Lock Layer'}
                    className={`p-1.5 rounded-lg cursor-pointer ${
                        selectionMeta.lockedLayer
                            ? 'bg-amber-500/20 text-amber-500 dark:text-amber-400 hover:bg-amber-500/30'
                            : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                >
                    {selectionMeta.lockedLayer ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                </button>
                <button
                    type="button"
                    data-testid="floating-toolbar-delete"
                    disabled={isLocked}
                    aria-disabled={isLocked}
                    onClick={isLocked ? undefined : onDelete}
                    data-tooltip={isLocked ? 'Unlock layer to delete' : 'Delete (Del)'}
                    className={`p-1.5 rounded-lg ${
                        isLocked
                            ? 'text-rose-400/50 dark:text-rose-500/40 opacity-50 cursor-not-allowed'
                            : 'hover:bg-rose-500/15 dark:hover:bg-rose-500/20 text-rose-500 dark:text-rose-400 cursor-pointer'
                    }`}
                >
                    <Trash2 className="w-3.5 h-3.5" />
                </button>
                {!isLocked && (
                    <button
                        type="button"
                        data-testid="floating-toolbar-expand"
                        aria-expanded={expanded}
                        aria-label={expanded ? 'Collapse parameters' : 'Expand more parameters'}
                        data-tooltip={expanded ? 'Collapse parameters' : 'Expand more parameters'}
                        onClick={() => setExpanded((prev) => !prev)}
                        className={`p-1.5 rounded-lg cursor-pointer transition-colors ${
                            expanded
                                ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30'
                                : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300'
                        }`}
                    >
                        {expanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                    </button>
                )}
            </div>
            </div>

            {/* EXPANDABLE MORE PARAMETERS DRAWER */}
            {expandedRendered && (
                <div
                    data-testid="floating-toolbar-expanded"
                    data-visible={expandedVisible ? 'true' : 'false'}
                    className={`grid transition-[grid-template-rows,opacity] duration-[280ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${
                        expandedVisible ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                    }`}
                >
                    <div className="overflow-hidden">
                        <div
                            className={`mt-2 pt-2 border-t border-slate-200/80 dark:border-slate-800 space-y-2.5 text-[11px] origin-top ${EDITOR_PANEL_TRANSITION} ${
                                expandedVisible ? 'scale-100 translate-y-0' : 'scale-95 -translate-y-1.5'
                            }`}
                        >
                            {/* EXPANDED TEXT PARAMETERS */}
                            {isText && (
                                <>
                                    <div className="flex flex-wrap items-center gap-1.5">
                                        <button
                                            type="button"
                                            onClick={() =>
                                                onUpdateProp(
                                                    'fontStyle',
                                                    selectionMeta.fontStyle === 'italic' ? 'normal' : 'italic'
                                                )
                                            }
                                            data-tooltip="Italic"
                                            className={`p-1.5 rounded-lg cursor-pointer ${
                                                selectionMeta.fontStyle === 'italic'
                                                    ? 'bg-blue-600 text-white'
                                                    : 'bg-slate-100 dark:bg-slate-950 hover:bg-slate-200 dark:hover:bg-slate-800'
                                            }`}
                                        >
                                            <Italic className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => onUpdateProp('underline', !selectionMeta.underline)}
                                            data-tooltip="Underline"
                                            className={`p-1.5 rounded-lg cursor-pointer ${
                                                selectionMeta.underline
                                                    ? 'bg-blue-600 text-white'
                                                    : 'bg-slate-100 dark:bg-slate-950 hover:bg-slate-200 dark:hover:bg-slate-800'
                                            }`}
                                        >
                                            <Underline className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => onUpdateProp('linethrough', !selectionMeta.linethrough)}
                                            data-tooltip="Strikethrough"
                                            className={`p-1.5 rounded-lg cursor-pointer ${
                                                selectionMeta.linethrough
                                                    ? 'bg-blue-600 text-white'
                                                    : 'bg-slate-100 dark:bg-slate-950 hover:bg-slate-200 dark:hover:bg-slate-800'
                                            }`}
                                        >
                                            <Strikethrough className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const txt = selectionMeta.text || '';
                                                const next =
                                                    txt === txt.toUpperCase() ? txt.toLowerCase() : txt.toUpperCase();
                                                onUpdateProp('text', next);
                                            }}
                                            data-tooltip="Toggle UPPERCASE / lowercase"
                                            className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-950 hover:bg-slate-200 dark:hover:bg-slate-800 cursor-pointer"
                                        >
                                            <CaseUpper className="w-3.5 h-3.5" />
                                        </button>
                                        <ShadowEffectControl
                                            shadowConfig={selectionMeta.shadowConfig}
                                            onUpdateShadow={onUpdateShadow}
                                            testIdPrefix="floating-text-exp"
                                            compact
                                            open={activeEffectPanel === 'shadow-exp'}
                                            onOpenChange={(next) => setActiveEffectPanel(next ? 'shadow-exp' : null)}
                                            temporarilyHidden={isTemporarilyHidden}
                                            sessionKey={activeLayerId}
                                        />
                                        <GlowEffectControl
                                            glowConfig={selectionMeta.glowConfig}
                                            isImage={false}
                                            onUpdateGlow={onUpdateGlow}
                                            testIdPrefix="floating-text-exp"
                                            compact
                                            open={activeEffectPanel === 'glow-exp'}
                                            onOpenChange={(next) => setActiveEffectPanel(next ? 'glow-exp' : null)}
                                            temporarilyHidden={isTemporarilyHidden}
                                            sessionKey={activeLayerId}
                                        />
                                        <div className="flex items-center gap-1.5 ml-auto">
                                            <span className="text-[10px] text-slate-500 dark:text-slate-400">
                                                Outline
                                            </span>
                                            <StudioColorPicker
                                                value={selectionMeta.stroke || '#000000'}
                                                onChange={(hex) => onUpdateProp('stroke', hex)}
                                                size="sm"
                                                title="Text outline color"
                                                customTooltip
                                                open={activeEffectPanel === 'color-text-outline'}
                                                onOpenChange={(next) => setActiveEffectPanel(next ? 'color-text-outline' : null)}
                                                temporarilyHidden={isTemporarilyHidden}
                                                sessionKey={activeLayerId}
                                            />
                                            <input
                                                type="number"
                                                aria-label="Text outline width"
                                                min={0}
                                                max={20}
                                                value={selectionMeta.strokeWidth || 0}
                                                onChange={(e) =>
                                                    onUpdateProp('strokeWidth', Number(e.target.value) || 0)
                                                }
                                                className="w-11 px-1.5 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 font-mono text-[11px] text-slate-900 dark:text-white"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <div className="flex justify-between text-[10px] text-slate-500 dark:text-slate-400 mb-0.5">
                                                <span>Line Height</span>
                                                <span className="font-mono text-slate-700 dark:text-slate-200">
                                                    {Number(selectionMeta.lineHeight || 1.15).toFixed(2)}
                                                </span>
                                            </div>
                                            <input
                                                type="range"
                                                aria-label="Line height"
                                                min={0.7}
                                                max={2.5}
                                                step={0.05}
                                                value={selectionMeta.lineHeight || 1.15}
                                                onChange={(e) => onUpdateProp('lineHeight', Number(e.target.value))}
                                                className="w-full accent-blue-500 cursor-pointer"
                                            />
                                        </div>
                                        <div>
                                            <div className="flex justify-between text-[10px] text-slate-500 dark:text-slate-400 mb-0.5">
                                                <span>Letter Spacing</span>
                                                <span className="font-mono text-slate-700 dark:text-slate-200">
                                                    {selectionMeta.charSpacing || 0}
                                                </span>
                                            </div>
                                            <input
                                                type="range"
                                                aria-label="Letter spacing"
                                                min={-80}
                                                max={600}
                                                step={10}
                                                value={selectionMeta.charSpacing || 0}
                                                onChange={(e) => onUpdateProp('charSpacing', Number(e.target.value))}
                                                className="w-full accent-blue-500 cursor-pointer"
                                            />
                                        </div>
                                    </div>
                                </>
                            )}

                            {/* EXPANDED IMAGE PARAMETERS */}
                            {isImage && (
                                <>
                                    <div className="grid grid-cols-2 gap-x-3 gap-y-2">
                                        {[
                                            { key: 'brightness', label: 'Brightness', min: -0.5, max: 0.5, step: 0.02 },
                                            { key: 'contrast', label: 'Contrast', min: -0.5, max: 0.5, step: 0.02 },
                                            { key: 'saturation', label: 'Saturation', min: -1, max: 1, step: 0.05 },
                                            { key: 'blur', label: 'Blur', min: 0, max: 0.35, step: 0.01 },
                                        ].map((f) => (
                                            <div key={f.key}>
                                                <div className="flex justify-between text-[10px] text-slate-500 dark:text-slate-400 mb-0.5">
                                                    <span>{f.label}</span>
                                                    <span className="font-mono text-slate-700 dark:text-slate-200">
                                                        {Math.round((filters[f.key] || 0) * 100)}%
                                                    </span>
                                                </div>
                                                <input
                                                    type="range"
                                                    aria-label={f.label}
                                                    min={f.min}
                                                    max={f.max}
                                                    step={f.step}
                                                    value={filters[f.key] || 0}
                                                    onChange={(e) =>
                                                        onUpdateFilter?.({
                                                            ...filters,
                                                            [f.key]: Number(e.target.value),
                                                        })
                                                    }
                                                    className="w-full accent-blue-500 cursor-pointer"
                                                />
                                            </div>
                                        ))}
                                    </div>

                                    <div className="flex flex-wrap items-center gap-1.5">
                                        <button
                                            type="button"
                                            onClick={() =>
                                                onUpdateFilter?.({ ...filters, grayscale: !filters.grayscale })
                                            }
                                            className={`px-2 py-1 rounded-lg text-[10px] font-bold border cursor-pointer ${
                                                filters.grayscale
                                                    ? 'bg-blue-600 text-white border-blue-500'
                                                    : 'bg-slate-100 dark:bg-slate-950 border-slate-300 dark:border-slate-700'
                                            }`}
                                        >
                                            B&amp;W
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => onUpdateFilter?.({ ...filters, sepia: !filters.sepia })}
                                            className={`px-2 py-1 rounded-lg text-[10px] font-bold border cursor-pointer ${
                                                filters.sepia
                                                    ? 'bg-blue-600 text-white border-blue-500'
                                                    : 'bg-slate-100 dark:bg-slate-950 border-slate-300 dark:border-slate-700'
                                            }`}
                                        >
                                            Sepia
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => onUpdateFilter?.(DEFAULT_FILTER_STATE)}
                                            className="px-2 py-1 rounded-lg text-[10px] font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-500/10 cursor-pointer"
                                        >
                                            Reset Filters
                                        </button>
                                        {onFitToCanvas && (
                                            <button
                                                type="button"
                                                onClick={onFitToCanvas}
                                                className="ml-auto px-2 py-1 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-[10px] font-semibold cursor-pointer"
                                            >
                                                Fit Stage
                                            </button>
                                        )}
                                    </div>

                                    {onApplyFrame && (
                                        <div>
                                            <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                                                Frame Shape
                                            </div>
                                            <div className="flex flex-wrap gap-1">
                                                {FRAME_OPTIONS.map((fr) => (
                                                    <button
                                                        key={fr.id}
                                                        type="button"
                                                        onClick={() => onApplyFrame(fr.id)}
                                                        className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold border cursor-pointer ${
                                                            (selectionMeta.frameShape || 'none') === fr.id
                                                                ? 'bg-blue-600 text-white border-blue-500'
                                                                : 'bg-slate-100 dark:bg-slate-950 border-slate-200 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-600'
                                                        }`}
                                                    >
                                                        {fr.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}

                            {/* EXPANDED SHAPE / MULTI / GROUP PARAMETERS */}
                            {(isShape || isMulti || isGroup) && (
                                <div className="flex flex-wrap items-center gap-1.5">
                                    <button
                                        type="button"
                                        onClick={() => onFlip('x')}
                                        data-tooltip="Flip Horizontal"
                                        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-950 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 cursor-pointer"
                                    >
                                        <FlipHorizontal2 className="w-3.5 h-3.5" />
                                        <span>Flip H</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => onFlip('y')}
                                        data-tooltip="Flip Vertical"
                                        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-950 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 cursor-pointer"
                                    >
                                        <FlipVertical2 className="w-3.5 h-3.5" />
                                        <span>Flip V</span>
                                    </button>
                                    {(isMulti || isGroup) && (
                                        <div className="flex items-center gap-1.5">
                                            <ShadowEffectControl
                                                shadowConfig={selectionMeta.shadowConfig}
                                                onUpdateShadow={onUpdateShadow}
                                                testIdPrefix="floating-group-exp"
                                                compact
                                                open={activeEffectPanel === 'shadow-exp'}
                                                onOpenChange={(next) => setActiveEffectPanel(next ? 'shadow-exp' : null)}
                                                temporarilyHidden={isTemporarilyHidden}
                                                sessionKey={activeLayerId}
                                            />
                                            <GlowEffectControl
                                                glowConfig={selectionMeta.glowConfig}
                                                isImage={false}
                                                onUpdateGlow={onUpdateGlow}
                                                testIdPrefix="floating-group-exp"
                                                compact
                                                open={activeEffectPanel === 'glow-exp'}
                                                onOpenChange={(next) => setActiveEffectPanel(next ? 'glow-exp' : null)}
                                                temporarilyHidden={isTemporarilyHidden}
                                                sessionKey={activeLayerId}
                                            />
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* SHARED UNIVERSAL PARAMETERS: Opacity, Blend, Angle, Order & Align */}
                            <div className="pt-2 border-t border-slate-200/70 dark:border-slate-800/80 space-y-2">
                                <div className="flex flex-wrap items-center gap-2.5">
                                    <div className="flex items-center gap-1.5 flex-1 min-w-[140px]">
                                        <span className="text-[10px] text-slate-500 dark:text-slate-400">
                                            Opacity
                                        </span>
                                        <input
                                            type="range"
                                            aria-label="Layer opacity"
                                            min={0}
                                            max={1}
                                            step={0.01}
                                            value={selectionMeta.opacity ?? 1}
                                            onChange={(e) => onUpdateProp('opacity', Number(e.target.value))}
                                            className="flex-1 accent-blue-500 cursor-pointer"
                                        />
                                        <span className="font-mono text-[10px] w-8 text-right">
                                            {Math.round((selectionMeta.opacity ?? 1) * 100)}%
                                        </span>
                                    </div>

                                    <StudioSelect
                                        size="sm"
                                        aria-label="Blend mode"
                                        data-tooltip="Blend mode"
                                        value={selectionMeta.globalCompositeOperation || 'source-over'}
                                        onChange={(e) =>
                                            onUpdateProp('globalCompositeOperation', e.target.value)
                                        }
                                    >
                                        {BLEND_MODES.map((m) => (
                                            <option key={m.value} value={m.value}>
                                                {m.label}
                                            </option>
                                        ))}
                                    </StudioSelect>

                                    <div className="flex items-center gap-1">
                                        <span className="text-[10px] text-slate-500 dark:text-slate-400">
                                            Angle°
                                        </span>
                                        <input
                                            type="number"
                                            aria-label="Rotation angle"
                                            value={currentAngle}
                                            onChange={(e) =>
                                                onUpdateProp('angle', Number(e.target.value) || 0)
                                            }
                                            className="w-12 px-1.5 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 font-mono text-[11px] text-slate-900 dark:text-white"
                                        />
                                    </div>
                                </div>

                                <div className="flex flex-wrap items-center justify-between gap-1.5">
                                    <div className="flex items-center gap-1">
                                        <button
                                            type="button"
                                            onClick={() => onZOrder('front')}
                                            data-tooltip="Bring to Front"
                                            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-950 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-[10px] font-semibold cursor-pointer"
                                        >
                                            <ArrowUpToLine className="w-3 h-3" />
                                            <span>Front</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => onZOrder('forward')}
                                            className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-950 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-[10px] font-semibold cursor-pointer"
                                        >
                                            Fwd
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => onZOrder('backward')}
                                            className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-950 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-[10px] font-semibold cursor-pointer"
                                        >
                                            Bwd
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => onZOrder('back')}
                                            data-tooltip="Send to Back"
                                            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-950 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-[10px] font-semibold cursor-pointer"
                                        >
                                            <ArrowDownToLine className="w-3 h-3" />
                                            <span>Back</span>
                                        </button>
                                    </div>

                                    <div className="flex items-center gap-1">
                                        {[
                                            { dir: 'left', label: 'L' },
                                            { dir: 'center-h', label: 'CH' },
                                            { dir: 'right', label: 'R' },
                                            { dir: 'top', label: 'T' },
                                            { dir: 'center-v', label: 'CV' },
                                            { dir: 'bottom', label: 'B' },
                                        ].map((al) => (
                                            <button
                                                key={al.dir}
                                                type="button"
                                                onClick={() => onAlign(al.dir)}
                                                data-tooltip={`Align ${al.dir}`}
                                                className="px-1.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-950 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-[10px] font-bold uppercase cursor-pointer"
                                            >
                                                {al.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {snapPrefs && onToggleSnapPref && (
                                    <div
                                        data-testid="floating-snap-controls"
                                        className="flex items-center justify-between gap-2 pt-1.5 border-t border-slate-200/70 dark:border-slate-800/80"
                                    >
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                            Snapping
                                        </span>
                                        <SnapToggleButtons
                                            snapPrefs={snapPrefs}
                                            onToggleSnapPref={onToggleSnapPref}
                                            testIdPrefix="floating-snap"
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
