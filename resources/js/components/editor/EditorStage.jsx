import React, { useState, useRef, useEffect } from 'react';
import {
    MousePointer2,
    Hand,
    Type,
    PenTool,
    Grid3X3,
    SquareDashed,
    Plus,
    Copy,
    Trash2,
    ZoomIn,
    ZoomOut,
    Maximize,
    Layers,
} from 'lucide-react';
import EditorFloatingToolbar from './EditorFloatingToolbar';
import EditorLayersPanel from './EditorLayersPanel';
import { AnimatedPopover } from './useAnimatedPresence';

function RightToolButton({
    label,
    shortcut,
    active = false,
    activeClass = 'bg-blue-600 text-white',
    badge = 0,
    onClick,
    testId,
    children,
}) {
    const [tipOpen, setTipOpen] = useState(false);
    const hideTimerRef = useRef(null);

    const clearHideTimer = () => {
        if (hideTimerRef.current) {
            clearTimeout(hideTimerRef.current);
            hideTimerRef.current = null;
        }
    };

    const showTip = () => {
        clearHideTimer();
        setTipOpen(true);
        hideTimerRef.current = setTimeout(() => {
            setTipOpen(false);
            hideTimerRef.current = null;
        }, 2500);
    };

    const hideTip = () => {
        clearHideTimer();
        setTipOpen(false);
    };

    useEffect(() => () => clearHideTimer(), []);

    return (
        <div className="relative flex items-center justify-center">
            <button
                type="button"
                data-testid={testId}
                onMouseEnter={showTip}
                onMouseLeave={hideTip}
                onFocus={(e) => {
                    if (e.currentTarget.matches?.(':focus-visible')) {
                        showTip();
                    }
                }}
                onBlur={hideTip}
                onPointerDown={hideTip}
                onClick={(e) => {
                    hideTip();
                    if (e.detail > 0) {
                        e.currentTarget.blur();
                    }
                    onClick?.(e);
                }}
                aria-label={shortcut ? `${label} (${shortcut})` : label}
                className={`relative p-2 rounded-xl cursor-pointer transition-colors ${
                    active
                        ? activeClass
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
            >
                {children}
                {badge > 0 && (
                    <span
                        className={`absolute -top-1 -right-1 min-w-[15px] h-[15px] px-1 rounded-full text-[9px] font-bold flex items-center justify-center leading-none ${
                            active ? 'bg-white text-blue-600' : 'bg-blue-600 text-white'
                        }`}
                    >
                        {badge}
                    </span>
                )}
            </button>
            <div
                role="tooltip"
                data-visible={tipOpen ? 'true' : 'false'}
                className={`pointer-events-none absolute right-full mr-2.5 top-1/2 -translate-y-1/2 z-50 whitespace-nowrap flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-[11px] font-semibold shadow-xl border border-white/10 dark:border-slate-200 transition-[opacity,translate,scale] duration-150 ease-out ${
                    tipOpen
                        ? 'opacity-100 translate-x-0 scale-100'
                        : 'opacity-0 translate-x-1.5 scale-95'
                }`}
            >
                <span>{label}</span>
                {shortcut && (
                    <kbd className="px-1 py-0.5 rounded bg-white/15 dark:bg-slate-900/10 text-[9px] font-mono leading-none">
                        {shortcut}
                    </kbd>
                )}
            </div>
        </div>
    );
}

export default function EditorStage({
    canvasElRef,
    viewportRef,
    canvasWidth,
    canvasHeight,
    zoom,
    onZoomChange,
    onFitZoom,
    panOffset,
    onPanChange,
    activeTool, // 'select' | 'pan' | 'text' | 'draw'
    onSelectTool,
    enableFreehandDraw = true,
    showGrid,
    onToggleGrid,
    showSafeMargins,
    onToggleSafeMargins,
    snapGuides = [],
    snapPrefs,
    onToggleSnapPref,
    isTransparentBg = true,
    onDropAssetOrFile,
    // Context menu & floating mini-toolbar
    selectedObject,
    selectionMeta,
    selectionBounds,
    isTransforming = false,
    fonts = [],
    enableBgRemover = true,
    removingBg = false,
    onUpdateProp,
    onUpdateFilter,
    onApplyFrame,
    onFitToCanvas,
    onAlign,
    onToggleShadow,
    onToggleStickerOutline,
    onUpdateShadow,
    onUpdateGlow,
    onRemoveBgSelected,
    onGroupSelected,
    onUngroupSelected,
    onDuplicate,
    onDelete,
    onZOrder,
    onFlip,
    onToggleLock,
    onContextMenuSelectTarget,
    // Layers side panel (right toolbar)
    layers = [],
    layersOpen: controlledLayersOpen,
    onToggleLayers,
    activeLayerIds = [],
    onSelectLayer,
    onToggleLayerVisible,
    onToggleLayerLock,
    onReorderLayer,
    onMoveLayerTree,
    onMoveLayersBatch,
    onRenameLayer,
    onDuplicateLayer,
    onBatchToggleVisible,
    onBatchToggleLock,
    onDeleteLayer,
    onDeleteLayerIds,
    canGroup = false,
    canUngroup = false,
    // Pages
    pages = [],
    activePageIdx = 0,
    maxPages = 12,
    onSwitchPage,
    onAddPage,
    onDuplicatePage,
    onDeletePage,
}) {
    const [isPanning, setIsPanning] = useState(false);
    const [spaceHeld, setSpaceHeld] = useState(false);
    const [contextMenu, setContextMenu] = useState(null);
    const lastContextMenuRef = useRef(null);
    if (contextMenu) {
        lastContextMenuRef.current = contextMenu;
    }
    const [internalLayersOpen, setInternalLayersOpen] = useState(false);
    const layersOpen = typeof controlledLayersOpen === 'boolean' ? controlledLayersOpen : internalLayersOpen;
    const setLayersOpen = onToggleLayers || setInternalLayersOpen;
    const panDragRef = useRef(null);
    const artboardRef = useRef(null);

    useEffect(() => {
        const down = (e) => {
            if (e.code === 'Space' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) {
                setSpaceHeld(true);
            }
        };
        const up = (e) => {
            if (e.code === 'Space') setSpaceHeld(false);
        };
        const closeCtx = () => setContextMenu(null);
        window.addEventListener('keydown', down);
        window.addEventListener('keyup', up);
        window.addEventListener('pointerdown', closeCtx);
        return () => {
            window.removeEventListener('keydown', down);
            window.removeEventListener('keyup', up);
            window.removeEventListener('pointerdown', closeCtx);
        };
    }, []);

    const effectivePan = activeTool === 'pan' || spaceHeld;

    const handleStagePointerDown = (e) => {
        if (effectivePan || e.button === 1) {
            e.preventDefault();
            setIsPanning(true);
            panDragRef.current = {
                startX: e.clientX,
                startY: e.clientY,
                origX: panOffset.x,
                origY: panOffset.y,
            };
        }
    };

    const handleStagePointerMove = (e) => {
        if (!panDragRef.current) return;
        const dx = e.clientX - panDragRef.current.startX;
        const dy = e.clientY - panDragRef.current.startY;
        onPanChange({
            x: panDragRef.current.origX + dx,
            y: panDragRef.current.origY + dy,
        });
    };

    const handleStagePointerUp = () => {
        panDragRef.current = null;
        setIsPanning(false);
    };

    const handleWheel = (e) => {
        if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            const delta = e.deltaY < 0 ? 0.08 : -0.08;
            onZoomChange(Math.max(0.15, Math.min(3, Number((zoom + delta).toFixed(2)))));
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        const assetData = e.dataTransfer?.getData('application/x-png101-asset');
        if (assetData) {
            try {
                const parsed = JSON.parse(assetData);
                onDropAssetOrFile({ type: 'asset', asset: parsed });
                return;
            } catch {
                // ignore
            }
        }
        if (e.dataTransfer?.files?.length) {
            onDropAssetOrFile({ type: 'files', files: e.dataTransfer.files });
        }
    };

    const displayW = Math.round(canvasWidth * zoom);
    const displayH = Math.round(canvasHeight * zoom);

    return (
        <div className="flex-1 flex flex-col min-w-0 bg-slate-200/75 dark:bg-slate-950 relative overflow-hidden transition-colors">
            {/* Workspace Viewport */}
            <div
                ref={viewportRef}
                onPointerDown={handleStagePointerDown}
                onPointerMove={handleStagePointerMove}
                onPointerUp={handleStagePointerUp}
                onPointerLeave={handleStagePointerUp}
                onWheel={handleWheel}
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onContextMenuCapture={(e) => {
                    e.preventDefault();
                    if (
                        e.target.closest?.(
                            'input, textarea, select, [data-testid="right-layers-panel"], [data-testid="left-floating-panel"], [data-testid="floating-toolbar"], [data-testid="layer-context-menu"]'
                        )
                    ) {
                        setContextMenu(null);
                        return;
                    }
                    const shouldOpen = onContextMenuSelectTarget
                        ? onContextMenuSelectTarget(e.nativeEvent)
                        : Boolean(selectedObject);
                    if (shouldOpen) {
                        const menuW = 200;
                        const menuH = 300;
                        const clampedX = Math.max(8, Math.min(window.innerWidth - menuW - 8, e.clientX));
                        const clampedY = Math.max(8, Math.min(window.innerHeight - menuH - 8, e.clientY));
                        setContextMenu({ x: clampedX, y: clampedY });
                    } else {
                        setContextMenu(null);
                    }
                }}
                className={`flex-1 relative overflow-hidden flex items-center justify-center bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] dark:bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:20px_20px] ${
                    effectivePan ? (isPanning ? 'cursor-grabbing' : 'cursor-grab') : ''
                }`}
            >
                {/* Vertical Right-Top Floating Tool Strip */}
                <div
                    className="absolute top-3 right-3 z-40 flex flex-col gap-1 p-1.5 rounded-2xl bg-white/95 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200 dark:border-slate-700/80 shadow-xl"
                    onPointerDown={(e) => e.stopPropagation()}
                >
                    <RightToolButton
                        label="Select / Move Tool"
                        shortcut="V"
                        active={activeTool === 'select'}
                        onClick={() => onSelectTool('select')}
                        testId="right-tool-select"
                    >
                        <MousePointer2 className="w-4 h-4" />
                    </RightToolButton>

                    <RightToolButton
                        label="Hand / Pan Tool (or hold Space)"
                        shortcut="H"
                        active={activeTool === 'pan'}
                        onClick={() => onSelectTool('pan')}
                        testId="right-tool-pan"
                    >
                        <Hand className="w-4 h-4" />
                    </RightToolButton>

                    <RightToolButton
                        label="Quick Add Text"
                        shortcut="T"
                        active={activeTool === 'text'}
                        onClick={() => onSelectTool('text')}
                        testId="right-tool-text"
                    >
                        <Type className="w-4 h-4" />
                    </RightToolButton>

                    {enableFreehandDraw && (
                        <RightToolButton
                            label="Freehand Draw"
                            shortcut="B"
                            active={activeTool === 'draw'}
                            activeClass="bg-emerald-600 text-white"
                            onClick={() => onSelectTool('draw')}
                            testId="right-tool-draw"
                        >
                            <PenTool className="w-4 h-4" />
                        </RightToolButton>
                    )}

                    <div className="h-px bg-slate-200 dark:bg-slate-800 my-0.5" />

                    <RightToolButton
                        label="Alignment Grid"
                        active={showGrid}
                        activeClass="bg-blue-600/15 text-blue-600 dark:text-blue-400"
                        onClick={onToggleGrid}
                        testId="right-tool-grid"
                    >
                        <Grid3X3 className="w-4 h-4" />
                    </RightToolButton>

                    <RightToolButton
                        label="Safe Print / Bleed Margins"
                        active={showSafeMargins}
                        activeClass="bg-blue-600/15 text-blue-600 dark:text-blue-400"
                        onClick={onToggleSafeMargins}
                        testId="right-tool-safe"
                    >
                        <SquareDashed className="w-4 h-4" />
                    </RightToolButton>

                    <div className="h-px bg-slate-200 dark:bg-slate-800 my-0.5" />

                    <RightToolButton
                        label="Layers Panel"
                        shortcut="L"
                        active={layersOpen}
                        activeClass="bg-blue-600 text-white"
                        badge={layers.length}
                        onClick={() => setLayersOpen((o) => !o)}
                        testId="right-tool-layers"
                    >
                        <Layers className="w-4 h-4" />
                    </RightToolButton>
                </div>

                {/* Animated Layers Side Panel */}
                <EditorLayersPanel
                    open={layersOpen}
                    onClose={() => setLayersOpen(false)}
                    layers={layers}
                    activeLayerIds={activeLayerIds}
                    onSelectLayer={onSelectLayer}
                    onToggleLayerVisible={onToggleLayerVisible}
                    onToggleLayerLock={onToggleLayerLock}
                    onReorderLayer={onReorderLayer}
                    onMoveLayerTree={onMoveLayerTree}
                    onMoveLayersBatch={onMoveLayersBatch}
                    onRenameLayer={onRenameLayer}
                    onDuplicate={onDuplicateLayer || onDuplicate}
                    onBatchToggleVisible={onBatchToggleVisible}
                    onBatchToggleLock={onBatchToggleLock}
                    onDeleteLayer={onDeleteLayer}
                    onDeleteSelected={onDeleteLayerIds || onDelete}
                    onGroupSelected={onGroupSelected}
                    onUngroupSelected={onUngroupSelected}
                    canGroup={canGroup}
                    canUngroup={canUngroup}
                />

                {/* Artboard Stage Container */}
                <div
                    ref={artboardRef}
                    style={{
                        transform: `translate(${panOffset.x}px, ${panOffset.y}px)`,
                        width: `${displayW}px`,
                        height: `${displayH}px`,
                    }}
                    className={`relative shadow-[0_18px_55px_rgba(15,23,42,0.22)] dark:shadow-[0_20px_70px_rgba(0,0,0,0.65)] ring-1 ring-slate-900/10 dark:ring-white/15 shrink-0 ${
                        isTransparentBg
                            ? 'bg-[conic-gradient(#e2e8f0_90deg,#ffffff_90deg_180deg,#e2e8f0_180deg_270deg,#ffffff_270deg)] dark:bg-[conic-gradient(#1e293b_90deg,#0f172a_90deg_180deg,#1e293b_180deg_270deg,#0f172a_270deg)] [background-size:20px_20px]'
                            : ''
                    }`}
                >
                    {/* Isolated Fabric Canvas Host: Fabric wraps <canvas> in .canvas-container, so it must stay isolated from conditional siblings */}
                    <div className="relative w-full h-full">
                        <canvas ref={canvasElRef} />
                    </div>

                    {/* Stage Overlays */}
                    <div className="absolute inset-0 pointer-events-none z-10">
                        {/* Subtle Grid Overlay */}
                        {showGrid && (
                            <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(56,189,248,0.18)_1px,transparent_1px),linear-gradient(to_bottom,rgba(56,189,248,0.18)_1px,transparent_1px)] [background-size:40px_40px]" />
                        )}

                        {/* Safe Print Margins Overlay */}
                        {showSafeMargins && (
                            <div className="absolute inset-4 sm:inset-6 border border-dashed border-amber-500/70 dark:border-amber-400/55 rounded-sm" />
                        )}

                        {/* Smart Alignment Snap Lines & Point Markers */}
                        {snapGuides.map((g, idx) => {
                            if (g.type === 'point') {
                                return (
                                    <div
                                        key={idx}
                                        data-testid="snap-point-marker"
                                        className="absolute w-3 h-3 -ml-1.5 -mt-1.5 rounded-full border-2 border-blue-500 bg-white shadow-[0_0_8px_rgba(37,99,235,0.85)]"
                                        style={{ left: `${g.x * zoom}px`, top: `${g.y * zoom}px` }}
                                    />
                                );
                            }
                            const guideColor =
                                g.kind === 'element'
                                    ? 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.85)]'
                                    : g.kind === 'grid'
                                        ? 'bg-sky-500 shadow-[0_0_6px_rgba(14,165,233,0.85)]'
                                        : 'bg-fuchsia-500 shadow-[0_0_6px_rgba(217,70,239,0.8)]';
                            return (
                                <div
                                    key={idx}
                                    data-testid="snap-guide-line"
                                    data-snap-kind={g.kind || 'artboard'}
                                    className={`absolute ${guideColor}`}
                                    style={
                                        g.type === 'v'
                                            ? { left: `${g.pos * zoom}px`, top: 0, bottom: 0, width: '1px' }
                                            : { top: `${g.pos * zoom}px`, left: 0, right: 0, height: '1px' }
                                    }
                                />
                            );
                        })}
                    </div>

                    {/* Pan blocker overlay when Panning / Spacebar held */}
                    {effectivePan && (
                        <div className="absolute inset-0 z-20" />
                    )}
                </div>

                {/* Floating Selection Mini-Toolbar anchored near selected canvas object */}
                <EditorFloatingToolbar
                    selectionMeta={selectionMeta}
                    selectionBounds={selectionBounds}
                    viewportRef={viewportRef}
                    artboardRef={artboardRef}
                    zoom={zoom}
                    panOffset={panOffset}
                    canvasWidth={canvasWidth}
                    canvasHeight={canvasHeight}
                    hidden={isTransforming || isPanning || activeTool === 'draw'}
                    fonts={fonts}
                    enableBgRemover={enableBgRemover}
                    removingBg={removingBg}
                    onUpdateProp={onUpdateProp}
                    onUpdateFilter={onUpdateFilter}
                    onApplyFrame={onApplyFrame}
                    onFitToCanvas={onFitToCanvas}
                    onFlip={onFlip}
                    onAlign={onAlign}
                    onZOrder={onZOrder}
                    onToggleShadow={onToggleShadow}
                    onToggleStickerOutline={onToggleStickerOutline}
                    onUpdateShadow={onUpdateShadow}
                    onUpdateGlow={onUpdateGlow}
                    onRemoveBgSelected={onRemoveBgSelected}
                    onDuplicate={onDuplicate}
                    onToggleLock={onToggleLock}
                    onDelete={onDelete}
                    onGroupSelected={onGroupSelected}
                    onUngroupSelected={onUngroupSelected}
                    snapPrefs={snapPrefs}
                    onToggleSnapPref={onToggleSnapPref}
                />

                {/* Right-Click Context Menu */}
                <AnimatedPopover
                    open={Boolean(contextMenu && selectedObject)}
                    originClass="origin-top-left"
                    data-testid="canvas-context-menu"
                    style={
                        lastContextMenuRef.current
                            ? { top: lastContextMenuRef.current.y, left: lastContextMenuRef.current.x }
                            : undefined
                    }
                    onPointerDown={(e) => e.stopPropagation()}
                    className="fixed z-50 w-48 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xl p-1.5 text-xs text-slate-800 dark:text-slate-200"
                >
                    {[
                        { label: 'Duplicate (Ctrl+D)', action: onDuplicate },
                        ...(canGroup ? [{ label: 'Group (Ctrl+G)', action: onGroupSelected }] : []),
                        ...(canUngroup ? [{ label: 'Ungroup (Ctrl+Shift+G)', action: onUngroupSelected }] : []),
                        { label: 'Bring to Front', action: () => onZOrder('front') },
                        { label: 'Bring Forward', action: () => onZOrder('forward') },
                        { label: 'Send Backward', action: () => onZOrder('backward') },
                        { label: 'Send to Back', action: () => onZOrder('back') },
                        { label: 'Flip Horizontal', action: () => onFlip('x') },
                        { label: 'Lock / Unlock', action: onToggleLock },
                    ].map((item) => (
                        <button
                            key={item.label}
                            type="button"
                            onClick={() => {
                                item.action();
                                setContextMenu(null);
                            }}
                            className="w-full text-left px-3 py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                        >
                            {item.label}
                        </button>
                    ))}
                    <div className="h-px bg-slate-200 dark:bg-slate-800 my-1" />
                    <button
                        type="button"
                        onClick={() => {
                            onDelete();
                            setContextMenu(null);
                        }}
                        className="w-full text-left px-3 py-1.5 rounded-xl hover:bg-rose-500/15 text-rose-500 dark:text-rose-400 font-semibold cursor-pointer"
                    >
                        Delete Layer
                    </button>
                </AnimatedPopover>
            </div>

            {/* Bottom Page Strip & Zoom Controls */}
            <footer className="h-11 shrink-0 bg-white/95 dark:bg-slate-900/95 border-t border-slate-200 dark:border-slate-800 px-3 flex items-center justify-between gap-3 select-none z-20 transition-colors">
                {/* Multi-Page Controls */}
                <div className="flex items-center gap-1.5 overflow-x-auto py-1">
                    {pages.map((p, idx) => (
                        <div
                            key={p.id}
                            className={`inline-flex items-center rounded-lg border text-[11px] font-bold transition-colors shrink-0 ${
                                idx === activePageIdx
                                    ? 'bg-blue-600/15 border-blue-500 text-blue-600 dark:text-blue-300'
                                    : 'bg-slate-100 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                            }`}
                        >
                            <button
                                type="button"
                                onClick={() => onSwitchPage(idx)}
                                className="px-2.5 py-1 cursor-pointer"
                            >
                                Page {idx + 1}
                            </button>
                            {idx === activePageIdx && pages.length < maxPages && (
                                <button
                                    type="button"
                                    onClick={() => onDuplicatePage(idx)}
                                    data-tooltip="Duplicate Page"
                                    aria-label="Duplicate Page"
                                    className="p-1 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                                >
                                    <Copy className="w-3 h-3" />
                                </button>
                            )}
                            {pages.length > 1 && (
                                <button
                                    type="button"
                                    onClick={() => onDeletePage(idx)}
                                    data-tooltip="Remove Page"
                                    aria-label="Remove Page"
                                    className="pr-1.5 py-1 hover:text-rose-500 dark:hover:text-rose-400 cursor-pointer"
                                >
                                    <Trash2 className="w-3 h-3" />
                                </button>
                            )}
                        </div>
                    ))}
                    {pages.length < maxPages && (
                        <button
                            type="button"
                            onClick={onAddPage}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-950 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-700 dark:text-slate-200 cursor-pointer shrink-0"
                        >
                            <Plus className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" />
                            <span>Add Page</span>
                        </button>
                    )}
                </div>

                {/* Zoom Controls */}
                <div className="flex items-center gap-1.5 shrink-0 text-xs text-slate-600 dark:text-slate-300">
                    <button
                        type="button"
                        onClick={() => onZoomChange(Math.max(0.15, Number((zoom - 0.1).toFixed(2))))}
                        className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                        data-tooltip="Zoom Out"
                        aria-label="Zoom Out"
                    >
                        <ZoomOut className="w-3.5 h-3.5" />
                    </button>
                    <input
                        type="range"
                        min={0.15}
                        max={2.5}
                        step={0.05}
                        value={zoom}
                        onChange={(e) => onZoomChange(Number(e.target.value))}
                        className="hidden sm:block w-24 accent-blue-500 cursor-pointer"
                    />
                    <span className="font-mono text-[11px] w-10 text-center">{Math.round(zoom * 100)}%</span>
                    <button
                        type="button"
                        onClick={() => onZoomChange(Math.min(2.5, Number((zoom + 0.1).toFixed(2))))}
                        className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                        data-tooltip="Zoom In"
                        aria-label="Zoom In"
                    >
                        <ZoomIn className="w-3.5 h-3.5" />
                    </button>
                    <button
                        type="button"
                        onClick={onFitZoom}
                        className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-950 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-[11px] font-semibold cursor-pointer inline-flex items-center gap-1"
                        data-tooltip="Fit to screen"
                        aria-label="Fit to screen"
                    >
                        <Maximize className="w-3 h-3" />
                        <span>Fit</span>
                    </button>
                </div>
            </footer>
        </div>
    );
}
