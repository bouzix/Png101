import React, { useEffect, useRef, useState } from 'react';
import {
    Bold,
    Italic,
    Underline,
    Strikethrough,
    AlignLeft,
    AlignCenter,
    AlignRight,
    FlipHorizontal2,
    FlipVertical2,
    Trash2,
    Copy,
    Lock,
    Unlock,
    Layers,
    Sliders,
    Wand2,
    Sparkles,
    Frame,
    ArrowUpToLine,
    ArrowDownToLine,
    CaseUpper,
    GripHorizontal,
} from 'lucide-react';
import StudioColorPicker from '../tools/StudioColorPicker';
import StudioSelect from '../ui/StudioSelect';
import FontPickerDropdown from './FontPickerDropdown';
import SnapToggleButtons from './SnapToggleButtons';
import ScrubFontSizeControl from './ScrubFontSizeControl';
import { ShadowEffectControl, GlowEffectControl } from './ShadowGlowControls';
import { BLEND_MODES, DEFAULT_FILTER_STATE, FRAME_OPTIONS } from './editorHelpers';
import { AnimatedPopover } from './useAnimatedPresence';
import { usePopoverDrag } from './useDraggablePanel';

function PopoverDragHeader({ title, testId, onPointerDown, right = null }) {
    return (
        <div
            data-testid={testId}
            onPointerDown={onPointerDown}
            className="flex items-center justify-between gap-2 pb-2 border-b border-slate-200 dark:border-slate-800 cursor-grab active:cursor-grabbing select-none"
        >
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <GripHorizontal className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                {title}
            </span>
            {right}
        </div>
    );
}

export default function EditorContextBar({
    selectedObject,
    selectionMeta,
    fonts = [],
    enableBgRemover = true,
    removingBg = false,
    onUpdateProp,
    onUpdateFilter,
    onApplyFrame,
    onToggleShadow,
    onToggleStickerOutline,
    onUpdateShadow,
    onUpdateGlow,
    onFlip,
    onAlign,
    onZOrder,
    onDuplicate,
    onDelete,
    onToggleLock,
    onRemoveBgSelected,
    onFitToCanvas,
    onOpenBgPanel,
    snapPrefs,
    onToggleSnapPref,
    canvasWidth,
    canvasHeight,
}) {
    const [openPopover, setOpenPopover] = useState(null); // 'adjust' | 'frame' | 'position' | 'spacing' | null
    const barRef = useRef(null);
    const spacingDrag = usePopoverDrag({ open: openPopover === 'spacing' });
    const adjustDrag = usePopoverDrag({ open: openPopover === 'adjust' });
    const frameDrag = usePopoverDrag({ open: openPopover === 'frame' });
    const positionDrag = usePopoverDrag({ open: openPopover === 'position' });

    const togglePop = (name) => setOpenPopover((p) => (p === name ? null : name));

    useEffect(() => {
        if (!openPopover) return undefined;
        const onPointerDown = (e) => {
            if (
                e.target.closest?.('[role="dialog"][aria-label="Custom color picker"]') ||
                e.target.closest?.('[data-testid="editor-eyedropper-overlay"]') ||
                e.target.closest?.('[data-testid="studio-select-listbox"]') ||
                e.target.closest?.('[role="listbox"]') ||
                e.target.closest?.('[data-testid="context-font-size-popover"]') ||
                e.target.closest?.('[data-testid="context-shadow-popover"]') ||
                e.target.closest?.('[data-testid="context-glow-popover"]') ||
                e.target.closest?.('[data-testid="floating-font-size-popover"]') ||
                e.target.closest?.('[data-testid^="floating-"][data-testid$="-popover"]')
            ) {
                return;
            }
            if (barRef.current && !barRef.current.contains(e.target)) {
                setOpenPopover(null);
            }
        };
        const onKeyDown = (e) => {
            if (e.key === 'Escape') setOpenPopover(null);
        };
        document.addEventListener('pointerdown', onPointerDown);
        document.addEventListener('keydown', onKeyDown);
        return () => {
            document.removeEventListener('pointerdown', onPointerDown);
            document.removeEventListener('keydown', onKeyDown);
        };
    }, [openPopover]);

    if (!selectedObject || !selectionMeta) {
        return (
            <div className="h-11 shrink-0 bg-white dark:bg-slate-900/95 border-b border-slate-200 dark:border-slate-800 px-3 sm:px-4 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 select-none">
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={onOpenBgPanel}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold cursor-pointer"
                    >
                        <span className="w-3.5 h-3.5 rounded bg-gradient-to-br from-blue-500 to-purple-500 border border-black/10 dark:border-white/20" />
                        <span>Canvas Background</span>
                    </button>
                    <span className="hidden sm:inline text-slate-500 dark:text-slate-500">
                        Tip: Click any layer, drag a PNG from the left rail, or press <kbd className="px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300 font-mono text-[10px]">T</kbd> for text
                    </span>
                </div>
                <span className="font-mono text-[11px] text-slate-500">
                    Artboard: {canvasWidth} × {canvasHeight} px
                </span>
            </div>
        );
    }

    const type = (selectionMeta.type || '').toLowerCase();
    const isText = type.includes('text');
    const isImage = type === 'image';
    const isRect = type === 'rect';
    const isShape = !isText && !isImage && type !== 'activeselection';
    const filters = { ...DEFAULT_FILTER_STATE, ...(selectionMeta.filterState || {}) };

    return (
        <div
            ref={barRef}
            className="min-h-11 shrink-0 bg-white dark:bg-slate-900/95 border-b border-slate-200 dark:border-slate-800 px-3 py-1.5 flex flex-wrap items-center gap-1.5 text-xs text-slate-700 dark:text-slate-200 select-none relative z-40"
        >
            {/* TEXT CONTROLS */}
            {isText && (
                <>
                    <FontPickerDropdown
                        value={selectionMeta.fontFamily || 'Inter'}
                        brandFonts={fonts}
                        onChange={(family) => onUpdateProp('fontFamily', family)}
                    />

                    <ScrubFontSizeControl
                        value={selectionMeta.fontSize || 40}
                        onPreview={(next) => onUpdateProp('fontSize', next, false)}
                        onCommit={(next) => onUpdateProp('fontSize', next, true)}
                        testIdPrefix="context"
                        open={openPopover === 'font-size'}
                        onOpenChange={(next) => setOpenPopover(next ? 'font-size' : null)}
                    />

                    <StudioColorPicker
                        value={typeof selectionMeta.fill === 'string' ? selectionMeta.fill : '#ffffff'}
                        onChange={(hex) => onUpdateProp('fill', hex)}
                        size="sm"
                        title="Text color"
                        customTooltip
                    />

                    <div className="flex items-center gap-0.5 pl-1 border-l border-slate-200 dark:border-slate-800">
                        <button
                            type="button"
                            onClick={() => onUpdateProp('fontWeight', selectionMeta.fontWeight === 'bold' || selectionMeta.fontWeight === '700' || selectionMeta.fontWeight === '800' ? '400' : '700')}
                            className={`p-1.5 rounded-lg cursor-pointer ${['bold', '700', '800', '900'].includes(String(selectionMeta.fontWeight)) ? 'bg-blue-600 text-white' : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'}`}
                            data-tooltip="Bold"
                        >
                            <Bold className="w-3.5 h-3.5" />
                        </button>
                        <button
                            type="button"
                            onClick={() => onUpdateProp('fontStyle', selectionMeta.fontStyle === 'italic' ? 'normal' : 'italic')}
                            className={`p-1.5 rounded-lg cursor-pointer ${selectionMeta.fontStyle === 'italic' ? 'bg-blue-600 text-white' : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'}`}
                            data-tooltip="Italic"
                        >
                            <Italic className="w-3.5 h-3.5" />
                        </button>
                        <button
                            type="button"
                            onClick={() => onUpdateProp('underline', !selectionMeta.underline)}
                            className={`p-1.5 rounded-lg cursor-pointer ${selectionMeta.underline ? 'bg-blue-600 text-white' : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'}`}
                            data-tooltip="Underline"
                        >
                            <Underline className="w-3.5 h-3.5" />
                        </button>
                        <button
                            type="button"
                            onClick={() => onUpdateProp('linethrough', !selectionMeta.linethrough)}
                            className={`p-1.5 rounded-lg cursor-pointer ${selectionMeta.linethrough ? 'bg-blue-600 text-white' : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'}`}
                            data-tooltip="Strikethrough"
                        >
                            <Strikethrough className="w-3.5 h-3.5" />
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                const txt = selectionMeta.text || '';
                                const next = txt === txt.toUpperCase() ? txt.toLowerCase() : txt.toUpperCase();
                                onUpdateProp('text', next);
                            }}
                            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 cursor-pointer"
                            data-tooltip="Toggle UPPERCASE / lowercase"
                        >
                            <CaseUpper className="w-3.5 h-3.5" />
                        </button>
                    </div>

                    <div className="flex items-center gap-0.5 pl-1 border-l border-slate-200 dark:border-slate-800">
                        {[
                            { val: 'left', icon: <AlignLeft className="w-3.5 h-3.5" /> },
                            { val: 'center', icon: <AlignCenter className="w-3.5 h-3.5" /> },
                            { val: 'right', icon: <AlignRight className="w-3.5 h-3.5" /> },
                        ].map((a) => (
                            <button
                                key={a.val}
                                type="button"
                                onClick={() => onUpdateProp('textAlign', a.val)}
                                className={`p-1.5 rounded-lg cursor-pointer ${selectionMeta.textAlign === a.val ? 'bg-blue-600 text-white' : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'}`}
                                data-tooltip={`Align ${a.val}`}
                            >
                                {a.icon}
                            </button>
                        ))}
                    </div>

                    {/* Text Spacing & Outline Popover */}
                    <div className="relative">
                        <button
                            type="button"
                            onClick={() => togglePop('spacing')}
                            className={`px-2 py-1 rounded-lg border text-[11px] font-semibold cursor-pointer ${openPopover === 'spacing' ? 'bg-blue-600/15 border-blue-500 text-blue-600 dark:bg-blue-600/20 dark:text-blue-300' : 'border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                        >
                            Spacing &amp; Stroke
                        </button>
                        <AnimatedPopover
                            ref={spacingDrag.panelRef}
                            open={openPopover === 'spacing'}
                            originClass="origin-top-left"
                            data-testid="context-popover-spacing"
                            style={{ transform: `translate3d(${spacingDrag.offset.x}px, ${spacingDrag.offset.y}px, 0)` }}
                            className={`absolute left-0 top-full mt-2 w-64 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-3.5 shadow-2xl z-50 space-y-3 text-slate-700 dark:text-slate-200 ${spacingDrag.isDragging ? '!transition-none' : ''}`}
                        >
                            <PopoverDragHeader
                                title="Spacing & Stroke"
                                testId="context-popover-spacing-drag-handle"
                                onPointerDown={spacingDrag.handleDragStart}
                            />
                            <div>
                                <div className="flex justify-between text-[11px] mb-1">
                                    <span>Line Height</span>
                                    <span className="font-mono">{Number(selectionMeta.lineHeight || 1.15).toFixed(2)}</span>
                                </div>
                                <input
                                    type="range"
                                    min={0.7}
                                    max={2.5}
                                    step={0.05}
                                    value={selectionMeta.lineHeight || 1.15}
                                    onChange={(e) => onUpdateProp('lineHeight', Number(e.target.value))}
                                    className="w-full accent-blue-500"
                                />
                            </div>
                            <div>
                                <div className="flex justify-between text-[11px] mb-1">
                                    <span>Letter Spacing</span>
                                    <span className="font-mono">{selectionMeta.charSpacing || 0}</span>
                                </div>
                                <input
                                    type="range"
                                    min={-80}
                                    max={600}
                                    step={10}
                                    value={selectionMeta.charSpacing || 0}
                                    onChange={(e) => onUpdateProp('charSpacing', Number(e.target.value))}
                                    className="w-full accent-blue-500"
                                />
                            </div>
                            <div className="flex items-center justify-between pt-1 border-t border-slate-200 dark:border-slate-800">
                                <span className="text-[11px]">Text Outline</span>
                                <div className="flex items-center gap-2">
                                    <StudioColorPicker
                                        value={selectionMeta.stroke || '#000000'}
                                        onChange={(hex) => onUpdateProp('stroke', hex)}
                                        size="sm"
                                        title="Outline color"
                                        customTooltip
                                    />
                                    <input
                                        type="number"
                                        min={0}
                                        max={20}
                                        value={selectionMeta.strokeWidth || 0}
                                        onChange={(e) => onUpdateProp('strokeWidth', Number(e.target.value))}
                                        className="w-12 px-1.5 py-1 rounded bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-white"
                                    />
                                </div>
                            </div>
                        </AnimatedPopover>
                    </div>
                </>
            )}

            {/* IMAGE / PNG CONTROLS */}
            {isImage && (
                <>
                    {/* Adjust Filters Popover */}
                    <div className="relative">
                        <button
                            type="button"
                            onClick={() => togglePop('adjust')}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border font-semibold cursor-pointer ${openPopover === 'adjust' ? 'bg-blue-600/15 border-blue-500 text-blue-600 dark:bg-blue-600/20 dark:text-blue-300' : 'border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                        >
                            <Sliders className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" />
                            <span>Adjust</span>
                        </button>
                        <AnimatedPopover
                            ref={adjustDrag.panelRef}
                            open={openPopover === 'adjust'}
                            originClass="origin-top-left"
                            data-testid="context-popover-adjust"
                            style={{ transform: `translate3d(${adjustDrag.offset.x}px, ${adjustDrag.offset.y}px, 0)` }}
                            className={`absolute left-0 top-full mt-2 w-72 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-4 shadow-2xl z-50 space-y-3 text-slate-700 dark:text-slate-200 ${adjustDrag.isDragging ? '!transition-none' : ''}`}
                        >
                            <PopoverDragHeader
                                title="Image Filters"
                                testId="context-popover-adjust-drag-handle"
                                onPointerDown={adjustDrag.handleDragStart}
                                right={
                                    <button
                                        type="button"
                                        onClick={() => onUpdateFilter(DEFAULT_FILTER_STATE)}
                                        className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                                    >
                                        Reset
                                    </button>
                                }
                            />
                            {[
                                { key: 'brightness', label: 'Brightness', min: -0.5, max: 0.5, step: 0.02 },
                                { key: 'contrast', label: 'Contrast', min: -0.5, max: 0.5, step: 0.02 },
                                { key: 'saturation', label: 'Saturation', min: -1, max: 1, step: 0.05 },
                                { key: 'blur', label: 'Blur', min: 0, max: 0.35, step: 0.01 },
                            ].map((f) => (
                                <div key={f.key}>
                                    <div className="flex justify-between text-[11px] text-slate-600 dark:text-slate-300 mb-0.5">
                                        <span>{f.label}</span>
                                        <span className="font-mono">{Math.round((filters[f.key] || 0) * 100)}%</span>
                                    </div>
                                    <input
                                        type="range"
                                        min={f.min}
                                        max={f.max}
                                        step={f.step}
                                        value={filters[f.key] || 0}
                                        onChange={(e) => onUpdateFilter({ ...filters, [f.key]: Number(e.target.value) })}
                                        className="w-full accent-blue-500"
                                    />
                                </div>
                            ))}
                            <div className="flex items-center gap-2 pt-1">
                                <button
                                    type="button"
                                    onClick={() => onUpdateFilter({ ...filters, grayscale: !filters.grayscale })}
                                    className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold border cursor-pointer ${filters.grayscale ? 'bg-blue-600 text-white border-blue-500' : 'border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-950'}`}
                                >
                                    B&amp;W
                                </button>
                                <button
                                    type="button"
                                    onClick={() => onUpdateFilter({ ...filters, sepia: !filters.sepia })}
                                    className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold border cursor-pointer ${filters.sepia ? 'bg-blue-600 text-white border-blue-500' : 'border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-950'}`}
                                >
                                    Sepia
                                </button>
                            </div>
                        </AnimatedPopover>
                    </div>

                    {/* Photo Frame Clip Mask Popover */}
                    <div className="relative">
                        <button
                            type="button"
                            onClick={() => togglePop('frame')}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border font-semibold cursor-pointer ${openPopover === 'frame' ? 'bg-blue-600/15 border-blue-500 text-blue-600 dark:bg-blue-600/20 dark:text-blue-300' : 'border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                        >
                            <Frame className="w-3.5 h-3.5 text-violet-500 dark:text-violet-400" />
                            <span>Frame</span>
                        </button>
                        <AnimatedPopover
                            ref={frameDrag.panelRef}
                            open={openPopover === 'frame'}
                            originClass="origin-top-left"
                            data-testid="context-popover-frame"
                            style={{ transform: `translate3d(${frameDrag.offset.x}px, ${frameDrag.offset.y}px, 0)` }}
                            className={`absolute left-0 top-full mt-2 w-64 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-3 shadow-2xl z-50 space-y-2.5 ${frameDrag.isDragging ? '!transition-none' : ''}`}
                        >
                            <PopoverDragHeader
                                title="Mask / Crop Shape"
                                testId="context-popover-frame-drag-handle"
                                onPointerDown={frameDrag.handleDragStart}
                            />
                            <div className="grid grid-cols-3 gap-1.5">
                                {FRAME_OPTIONS.map((fr) => (
                                    <button
                                        key={fr.id}
                                        type="button"
                                        onClick={() => {
                                            onApplyFrame(fr.id);
                                            setOpenPopover(null);
                                        }}
                                        className={`py-1.5 px-2 rounded-lg text-[11px] font-semibold border cursor-pointer ${
                                            (selectionMeta.frameShape || 'none') === fr.id
                                                ? 'bg-blue-600 text-white border-blue-500'
                                                : 'bg-slate-100 dark:bg-slate-950 border-slate-200 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-600'
                                        }`}
                                    >
                                        {fr.label}
                                    </button>
                                ))}
                            </div>
                        </AnimatedPopover>
                    </div>

                    <GlowEffectControl
                        glowConfig={selectionMeta.glowConfig}
                        isImage
                        onUpdateGlow={onUpdateGlow}
                        testIdPrefix="context"
                        label="Sticker Glow"
                        open={openPopover === 'glow'}
                        onOpenChange={(next) => setOpenPopover(next ? 'glow' : null)}
                    />

                    {enableBgRemover && (
                        <button
                            type="button"
                            disabled={removingBg}
                            onClick={onRemoveBgSelected}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-indigo-500/40 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-700 dark:bg-indigo-500/15 dark:hover:bg-indigo-500/25 dark:text-indigo-300 font-semibold cursor-pointer disabled:opacity-50"
                            data-tooltip="Remove background with AI in browser"
                        >
                            <Wand2 className="w-3.5 h-3.5" />
                            <span>{removingBg ? 'Removing...' : 'Remove BG'}</span>
                        </button>
                    )}

                    <button
                        type="button"
                        onClick={onFitToCanvas}
                        className="px-2 py-1 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-[11px] font-semibold cursor-pointer"
                        data-tooltip="Fit image inside canvas"
                    >
                        Fit Stage
                    </button>
                </>
            )}

            {/* SHAPE CONTROLS */}
            {isShape && (
                <>
                    <div className="flex items-center gap-1.5">
                        <span className="text-[11px] text-slate-500 dark:text-slate-400">Fill</span>
                        <StudioColorPicker
                            value={typeof selectionMeta.fill === 'string' ? selectionMeta.fill : '#3b82f6'}
                            onChange={(hex) => onUpdateProp('fill', hex)}
                            size="sm"
                            title="Fill color"
                            customTooltip
                        />
                    </div>
                    <div className="flex items-center gap-1.5 pl-1 border-l border-slate-200 dark:border-slate-800">
                        <span className="text-[11px] text-slate-500 dark:text-slate-400">Stroke</span>
                        <StudioColorPicker
                            value={typeof selectionMeta.stroke === 'string' ? selectionMeta.stroke : '#ffffff'}
                            onChange={(hex) => onUpdateProp('stroke', hex)}
                            size="sm"
                            title="Stroke color"
                            customTooltip
                        />
                        <input
                            type="number"
                            min={0}
                            max={40}
                            value={selectionMeta.strokeWidth || 0}
                            onChange={(e) => onUpdateProp('strokeWidth', Number(e.target.value))}
                            className="w-12 px-1.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 font-mono text-xs text-slate-900 dark:text-white"
                        />
                    </div>
                    {isRect && (
                        <div className="flex items-center gap-1.5 pl-1 border-l border-slate-200 dark:border-slate-800">
                            <span className="text-[11px] text-slate-500 dark:text-slate-400">Radius</span>
                            <input
                                type="number"
                                min={0}
                                max={200}
                                value={Math.round(selectionMeta.rx || 0)}
                                onChange={(e) => {
                                    const r = Number(e.target.value) || 0;
                                    onUpdateProp('rx', r);
                                    onUpdateProp('ry', r);
                                }}
                                className="w-12 px-1.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 font-mono text-xs text-slate-900 dark:text-white"
                            />
                        </div>
                    )}
                </>
            )}

            {/* UNIVERSAL CONTROLS: Flip, Shadow, Opacity, Blend Mode, Position, Layer Actions */}
            <div className="flex items-center gap-1 pl-1 border-l border-slate-200 dark:border-slate-800">
                {!isText && selectionMeta.hasTextChildren && (
                    <StudioColorPicker
                        value={typeof selectionMeta.fill === 'string' ? selectionMeta.fill : '#ffffff'}
                        onChange={(hex) => onUpdateProp('textFill', hex)}
                        size="sm"
                        data-testid="context-multi-color-trigger"
                        ariaLabel={`Change color of ${selectionMeta.textChildrenCount || 'selected'} text layers`}
                        title={`Text Color (${selectionMeta.textChildrenCount || 1} text${(selectionMeta.textChildrenCount || 1) > 1 ? 's' : ''})`}
                        customTooltip
                    />
                )}
                <button
                    type="button"
                    onClick={() => onFlip('x')}
                    className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 cursor-pointer"
                    data-tooltip="Flip Horizontal"
                >
                    <FlipHorizontal2 className="w-3.5 h-3.5" />
                </button>
                <button
                    type="button"
                    onClick={() => onFlip('y')}
                    className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 cursor-pointer"
                    data-tooltip="Flip Vertical"
                >
                    <FlipVertical2 className="w-3.5 h-3.5" />
                </button>
                <ShadowEffectControl
                    shadowConfig={selectionMeta.shadowConfig}
                    onUpdateShadow={onUpdateShadow}
                    testIdPrefix="context"
                    open={openPopover === 'shadow'}
                    onOpenChange={(next) => setOpenPopover(next ? 'shadow' : null)}
                />
                {!isImage && (
                    <GlowEffectControl
                        glowConfig={selectionMeta.glowConfig}
                        isImage={false}
                        onUpdateGlow={onUpdateGlow}
                        testIdPrefix="context"
                        label="Glow"
                        open={openPopover === 'glow'}
                        onOpenChange={(next) => setOpenPopover(next ? 'glow' : null)}
                    />
                )}
            </div>

            <div className="flex items-center gap-1.5 pl-1 border-l border-slate-200 dark:border-slate-800">
                <span className="text-[11px] text-slate-500 dark:text-slate-400">Opacity</span>
                <input
                    type="range"
                    aria-label="Layer opacity"
                    min={0}
                    max={1}
                    step={0.01}
                    value={selectionMeta.opacity ?? 1}
                    onChange={(e) => onUpdateProp('opacity', Number(e.target.value))}
                    className="w-16 accent-blue-500 cursor-pointer"
                />
                <span className="font-mono text-[10px] w-7">{Math.round((selectionMeta.opacity ?? 1) * 100)}%</span>
            </div>

            <StudioSelect
                size="sm"
                value={selectionMeta.globalCompositeOperation || 'source-over'}
                onChange={(e) => onUpdateProp('globalCompositeOperation', e.target.value)}
                data-tooltip="Blend mode"
                aria-label="Blend mode"
            >
                {BLEND_MODES.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                ))}
            </StudioSelect>

            {/* Position & Align Popover */}
            <div className="relative">
                <button
                    type="button"
                    onClick={() => togglePop('position')}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border font-semibold cursor-pointer ${openPopover === 'position' ? 'bg-blue-600/15 border-blue-500 text-blue-600 dark:bg-blue-600/20 dark:text-blue-300' : 'border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Position</span>
                </button>
                <AnimatedPopover
                    ref={positionDrag.panelRef}
                    open={openPopover === 'position'}
                    originClass="origin-top-right"
                    data-testid="context-popover-position"
                    style={{ transform: `translate3d(${positionDrag.offset.x}px, ${positionDrag.offset.y}px, 0)` }}
                    className={`absolute right-0 top-full mt-2 w-72 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-3.5 shadow-2xl z-50 space-y-3 text-slate-700 dark:text-slate-200 ${positionDrag.isDragging ? '!transition-none' : ''}`}
                >
                    <PopoverDragHeader
                        title="Position & Align"
                        testId="context-popover-position-drag-handle"
                        onPointerDown={positionDrag.handleDragStart}
                    />
                    <div>
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">Layer Order</div>
                        <div className="grid grid-cols-2 gap-1.5">
                            <button type="button" onClick={() => onZOrder('forward')} className="py-1.5 px-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-950 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-[11px] font-semibold cursor-pointer">Bring Forward</button>
                            <button type="button" onClick={() => onZOrder('backward')} className="py-1.5 px-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-950 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-[11px] font-semibold cursor-pointer">Send Backward</button>
                            <button type="button" onClick={() => onZOrder('front')} className="py-1.5 px-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-950 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-[11px] font-semibold cursor-pointer flex items-center justify-center gap-1"><ArrowUpToLine className="w-3 h-3" />To Front</button>
                            <button type="button" onClick={() => onZOrder('back')} className="py-1.5 px-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-950 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-[11px] font-semibold cursor-pointer flex items-center justify-center gap-1"><ArrowDownToLine className="w-3 h-3" />To Back</button>
                        </div>
                    </div>

                    <div>
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">Align to Artboard</div>
                        <div className="grid grid-cols-3 gap-1.5">
                            {['left', 'center-h', 'right', 'top', 'center-v', 'bottom'].map((dir) => (
                                <button
                                    key={dir}
                                    type="button"
                                    onClick={() => onAlign(dir)}
                                    className="py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-950 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-[10px] font-bold uppercase cursor-pointer"
                                >
                                    {dir}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-200 dark:border-slate-800">
                        <div>
                            <label className="text-[10px] text-slate-500 dark:text-slate-400">X</label>
                            <input
                                type="number"
                                value={Math.round(selectionMeta.left || 0)}
                                onChange={(e) => onUpdateProp('left', Number(e.target.value) || 0)}
                                className="w-full px-2 py-1 rounded bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 font-mono text-xs text-slate-900 dark:text-white"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] text-slate-500 dark:text-slate-400">Y</label>
                            <input
                                type="number"
                                value={Math.round(selectionMeta.top || 0)}
                                onChange={(e) => onUpdateProp('top', Number(e.target.value) || 0)}
                                className="w-full px-2 py-1 rounded bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 font-mono text-xs text-slate-900 dark:text-white"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] text-slate-500 dark:text-slate-400">Rotate°</label>
                            <input
                                type="number"
                                value={Math.round(selectionMeta.angle || 0)}
                                onChange={(e) => onUpdateProp('angle', Number(e.target.value) || 0)}
                                className="w-full px-2 py-1 rounded bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 font-mono text-xs text-slate-900 dark:text-white"
                            />
                        </div>
                    </div>
                </AnimatedPopover>
            </div>

            {/* Quick actions right edge */}
            <div className="ml-auto flex items-center gap-1 shrink-0">
                {snapPrefs && onToggleSnapPref && (
                    <div
                        data-testid="context-snap-controls"
                        className="hidden md:flex items-center gap-1.5 pr-2 mr-1 border-r border-slate-200 dark:border-slate-800"
                    >
                        <SnapToggleButtons
                            snapPrefs={snapPrefs}
                            onToggleSnapPref={onToggleSnapPref}
                            testIdPrefix="context-snap"
                        />
                    </div>
                )}
                <button
                    type="button"
                    onClick={onDuplicate}
                    className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 cursor-pointer"
                    data-tooltip="Duplicate (Ctrl+D)"
                >
                    <Copy className="w-3.5 h-3.5" />
                </button>
                <button
                    type="button"
                    onClick={onToggleLock}
                    className={`p-1.5 rounded-lg cursor-pointer ${selectionMeta.lockedLayer ? 'bg-amber-500/20 text-amber-500 dark:text-amber-400' : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'}`}
                    data-tooltip={selectionMeta.lockedLayer ? 'Unlock Layer' : 'Lock Layer'}
                >
                    {selectionMeta.lockedLayer ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                </button>
                <button
                    type="button"
                    onClick={onDelete}
                    className="p-1.5 rounded-lg hover:bg-rose-500/15 dark:hover:bg-rose-500/20 text-rose-500 dark:text-rose-400 cursor-pointer"
                    data-tooltip="Delete (Del)"
                >
                    <Trash2 className="w-3.5 h-3.5" />
                </button>
            </div>
        </div>
    );
}
