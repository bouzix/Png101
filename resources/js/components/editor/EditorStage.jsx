import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
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
    Pencil,
    Brush,
    Highlighter,
    Eraser,
    Ban,
    SlidersHorizontal,
    GripHorizontal,
    Check,
    RotateCcw,
    X,
    Shapes,
    Minus,
    Square,
    RectangleHorizontal,
    Circle as CircleIcon,
    Triangle as TriangleIcon,
    Star,
    Sparkles,
    Hexagon,
    Diamond,
    Heart,
    ArrowRight,
    MessageSquare,
    Frame,
} from 'lucide-react';
import EditorFloatingToolbar from './EditorFloatingToolbar';
import EditorLayersPanel from './EditorLayersPanel';
import StudioColorPicker from '../tools/StudioColorPicker';
import { AnimatedPopover } from './useAnimatedPresence';
import { useDraggablePanel } from './useDraggablePanel';
import { buildBezierSvgPath } from './editorHelpers';
import { getArtboardWorkspaceBounds } from './artboardHelpers';

const RIGHT_SHAPE_TOOLS = [
    { kind: 'rect', label: 'Square / Rect', icon: Square },
    { kind: 'rounded-rect', label: 'Rounded Box', icon: RectangleHorizontal },
    { kind: 'pill', label: 'Pill', icon: RectangleHorizontal },
    { kind: 'circle', label: 'Circle', icon: CircleIcon },
    { kind: 'triangle', label: 'Triangle', icon: TriangleIcon },
    { kind: 'star', label: 'Star', icon: Star },
    { kind: 'badge-burst', label: 'Burst', icon: Sparkles },
    { kind: 'hexagon', label: 'Hexagon', icon: Hexagon },
    { kind: 'diamond', label: 'Diamond', icon: Diamond },
    { kind: 'heart', label: 'Heart', icon: Heart },
    { kind: 'arrow', label: 'Arrow', icon: ArrowRight },
    { kind: 'speech', label: 'Speech', icon: MessageSquare },
];

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
    activeTool, // 'select' | 'pan' | 'text' | 'shapes' | 'line' | 'draw' | 'pen' | 'eraser'
    onSelectTool,
    onAddElement,
    enableFreehandDraw = true,
    brushConfig = { kind: 'pencil', color: '#2563eb', width: 8, opacity: 1 },
    onChangeBrushConfig,
    penConfig = { fill: '#3b82f6', stroke: '#1e293b', strokeWidth: 3 },
    onChangePenConfig,
    onCommitPenPath,
    lineConfig = { stroke: '#1e293b', strokeWidth: 4, style: 'solid' },
    onChangeLineConfig,
    onCommitLine,
    eraserConfig = { size: 28 },
    eraserSelectionLocked = false,
    onChangeEraserConfig,
    onEraseStart,
    onEraseMove,
    onEraseEnd,
    showGrid,
    onToggleGrid,
    showSafeMargins,
    onToggleSafeMargins,
    snapGuides = [],
    snapPrefs,
    onToggleSnapPref,
    isTransparentBg = true,
    pasteboardPad = 640,
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
    onFloatingToolbarPlacementChange,
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
    // Artboards (same canvas)
    artboards = [],
    activeArtboardId = null,
    onSelectArtboard,
    onFocusArtboard,
    onOpenNewArtboardModal,
    onResizeArtboard,
    onDuplicateArtboard,
    onDeleteArtboard,
    onReorderArtboard,
    onCreateGroupLayer,
    onCreateEmptyLayer,
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
    const [drawSettingsOpen, setDrawSettingsOpen] = useState(false);
    const drawToolbarDrag = useDraggablePanel('right-draw');
    const drawSettingsDrag = useDraggablePanel('right-draw-settings');
    const penPanelDrag = useDraggablePanel('right-pen');
    const shapesPanelDrag = useDraggablePanel('right-shapes');
    const linePanelDrag = useDraggablePanel('right-line');
    const eraserPanelDrag = useDraggablePanel('right-eraser');
    const drawSettingsRef = drawSettingsDrag.panelRef;
    const [brushPreviewActive, setBrushPreviewActive] = useState(false);
    const brushPreviewTimerRef = useRef(null);
    const brushSliderDownRef = useRef(false);
    const [eraserPreviewActive, setEraserPreviewActive] = useState(false);
    const eraserPreviewTimerRef = useRef(null);
    const eraserSliderDownRef = useRef(false);
    const [penAnchors, setPenAnchors] = useState([]);
    const penAnchorsRef = useRef([]);
    const [penHoverPt, setPenHoverPt] = useState(null);
    const [penClosingPreview, setPenClosingPreview] = useState(false);
    const penDraggingRef = useRef(null);
    const [eraserCursor, setEraserCursor] = useState(null);
    const eraserActiveRef = useRef(false);
    const [lineDraft, setLineDraft] = useState(null);
    const lineDraftRef = useRef(null);
    const panDragRef = useRef(null);
    const artboardRef = useRef(null);
    const onZoomChangeRef = useRef(onZoomChange);
    onZoomChangeRef.current = onZoomChange;

    const updatePenAnchors = (updater) => {
        setPenAnchors((prev) => {
            const next = typeof updater === 'function' ? updater(prev) : updater;
            penAnchorsRef.current = next;
            return next;
        });
    };

    const showBrushSizePreview = (autoHideMs = 900) => {
        if (brushPreviewTimerRef.current) clearTimeout(brushPreviewTimerRef.current);
        setBrushPreviewActive(true);
        if (autoHideMs > 0 && !brushSliderDownRef.current) {
            brushPreviewTimerRef.current = setTimeout(() => setBrushPreviewActive(false), autoHideMs);
        }
    };

    const hideBrushSizePreviewSoon = (delay = 350) => {
        if (brushPreviewTimerRef.current) clearTimeout(brushPreviewTimerRef.current);
        brushPreviewTimerRef.current = setTimeout(() => setBrushPreviewActive(false), delay);
    };

    const showEraserSizePreview = (autoHideMs = 900) => {
        if (eraserPreviewTimerRef.current) clearTimeout(eraserPreviewTimerRef.current);
        setEraserPreviewActive(true);
        if (autoHideMs > 0 && !eraserSliderDownRef.current) {
            eraserPreviewTimerRef.current = setTimeout(() => setEraserPreviewActive(false), autoHideMs);
        }
    };

    const hideEraserSizePreviewSoon = (delay = 350) => {
        if (eraserPreviewTimerRef.current) clearTimeout(eraserPreviewTimerRef.current);
        eraserPreviewTimerRef.current = setTimeout(() => setEraserPreviewActive(false), delay);
    };

    const workspaceBounds = getArtboardWorkspaceBounds(artboards, canvasWidth, canvasHeight);
    const getArtboardCoords = (clientX, clientY) => {
        const rect = artboardRef.current?.getBoundingClientRect();
        if (!rect) return { x: 0, y: 0 };
        const safeZoom = Math.max(0.05, Number(zoom) || 1);
        return {
            x: workspaceBounds.minX + (clientX - rect.left) / safeZoom,
            y: workspaceBounds.minY + (clientY - rect.top) / safeZoom,
        };
    };

    const finishPenPath = (closed = false, customAnchors = null) => {
        const list = customAnchors || penAnchorsRef.current || penAnchors;
        if (!list || list.length < 2) {
            updatePenAnchors([]);
            setPenClosingPreview(false);
            penDraggingRef.current = null;
            return;
        }
        const d = buildBezierSvgPath(list, closed);
        if (d) {
            onCommitPenPath?.({
                d,
                closed,
                fill: penConfig.fill,
                stroke: penConfig.stroke,
                strokeWidth: penConfig.strokeWidth,
            });
        }
        updatePenAnchors([]);
        setPenHoverPt(null);
        setPenClosingPreview(false);
        penDraggingRef.current = null;
    };

    useEffect(() => {
        if (activeTool !== 'draw') {
            setDrawSettingsOpen(false);
            setBrushPreviewActive(false);
            brushSliderDownRef.current = false;
        }
        if (activeTool !== 'eraser') {
            setEraserPreviewActive(false);
            eraserSliderDownRef.current = false;
        }
        if (activeTool !== 'pen') {
            updatePenAnchors([]);
            setPenHoverPt(null);
            setPenClosingPreview(false);
            penDraggingRef.current = null;
        }
        if (activeTool !== 'eraser') {
            setEraserCursor(null);
            eraserActiveRef.current = false;
        }
        if (activeTool !== 'line') {
            setLineDraft(null);
            lineDraftRef.current = null;
        }
    }, [activeTool]);

    useEffect(() => {
        if (activeTool !== 'pen') return undefined;
        const onPenKeyDown = (e) => {
            if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) return;
            if (e.key === 'Enter') {
                if (penAnchors.length >= 2) {
                    e.preventDefault();
                    finishPenPath(false);
                }
            } else if (e.key === 'Backspace' && penAnchors.length > 0) {
                e.preventDefault();
                updatePenAnchors((prev) => prev.slice(0, -1));
            } else if (e.key === 'Escape') {
                e.preventDefault();
                if (penAnchors.length > 0) {
                    updatePenAnchors([]);
                    setPenClosingPreview(false);
                    penDraggingRef.current = null;
                } else {
                    onSelectTool?.('select');
                }
            }
        };
        window.addEventListener('keydown', onPenKeyDown);
        return () => window.removeEventListener('keydown', onPenKeyDown);
    }, [activeTool, penAnchors, penConfig]);

    useEffect(() => {
        return () => {
            if (brushPreviewTimerRef.current) clearTimeout(brushPreviewTimerRef.current);
            if (eraserPreviewTimerRef.current) clearTimeout(eraserPreviewTimerRef.current);
        };
    }, []);

    const rawBrushWidth = Math.max(1, Number(brushConfig.width) || 8);
    const effectiveBrushDiameter =
        brushConfig.kind === 'highlighter'
            ? Math.max(16, rawBrushWidth * 2)
            : brushConfig.kind === 'marker'
            ? Math.max(10, rawBrushWidth * 1.4)
            : rawBrushWidth;
    const effectiveBrushOpacity =
        brushConfig.kind === 'highlighter'
            ? Math.max(0.08, (brushConfig.opacity ?? 1) * 0.35)
            : Math.max(0.08, brushConfig.opacity ?? 1);

    const renderActiveBrushIcon = () => {
        switch (brushConfig.kind) {
            case 'marker':
                return <Brush className="w-4 h-4" />;
            case 'highlighter':
                return <Highlighter className="w-4 h-4" />;
            case 'pencil':
            default:
                return <Pencil className="w-4 h-4" />;
        }
    };

    const rightPanelStyle = (drag) => ({
        top: `${12 + drag.offset.y}px`,
        right: `${66 - drag.offset.x}px`,
    });

    const [toolObstacleRects, setToolObstacleRects] = useState([]);

    useLayoutEffect(() => {
        const vp = viewportRef?.current;
        if (!vp) {
            setToolObstacleRects([]);
            return undefined;
        }
        const getLayoutRect = (el) => {
            if (!el) return null;
            let left = 0;
            let top = 0;
            let cur = el;
            while (cur && cur !== vp) {
                left += cur.offsetLeft || 0;
                top += cur.offsetTop || 0;
                cur = cur.offsetParent;
            }
            if (cur !== vp || !el.offsetWidth || !el.offsetHeight) return null;
            return {
                left,
                top,
                right: left + el.offsetWidth,
                bottom: top + el.offsetHeight,
            };
        };

        const measure = () => {
            const rects = [];
            const activeRef =
                activeTool === 'draw'
                    ? drawToolbarDrag.panelRef
                    : activeTool === 'pen'
                    ? penPanelDrag.panelRef
                    : activeTool === 'shapes'
                    ? shapesPanelDrag.panelRef
                    : activeTool === 'line'
                    ? linePanelDrag.panelRef
                    : activeTool === 'eraser'
                    ? eraserPanelDrag.panelRef
                    : null;
            const mainRect = getLayoutRect(activeRef?.current);
            if (mainRect) rects.push(mainRect);
            if (activeTool === 'draw' && drawSettingsOpen) {
                const subRect = getLayoutRect(drawSettingsDrag.panelRef?.current);
                if (subRect) rects.push(subRect);
            }
            setToolObstacleRects((prev) => {
                if (
                    prev.length === rects.length &&
                    prev.every(
                        (p, i) =>
                            p.left === rects[i].left &&
                            p.top === rects[i].top &&
                            p.right === rects[i].right &&
                            p.bottom === rects[i].bottom
                    )
                ) {
                    return prev;
                }
                return rects;
            });
        };

        measure();
        const raf = requestAnimationFrame(measure);
        let ro = null;
        if (typeof ResizeObserver !== 'undefined') {
            ro = new ResizeObserver(measure);
            ro.observe(vp);
        }
        return () => {
            cancelAnimationFrame(raf);
            if (ro) ro.disconnect();
        };
    }, [
        viewportRef,
        activeTool,
        drawSettingsOpen,
        layersOpen,
        drawToolbarDrag.offset.x,
        drawToolbarDrag.offset.y,
        drawSettingsDrag.offset.x,
        drawSettingsDrag.offset.y,
        penPanelDrag.offset.x,
        penPanelDrag.offset.y,
        shapesPanelDrag.offset.x,
        shapesPanelDrag.offset.y,
        linePanelDrag.offset.x,
        linePanelDrag.offset.y,
        eraserPanelDrag.offset.x,
        eraserPanelDrag.offset.y,
    ]);

    useEffect(() => {
        if (!drawSettingsOpen) return undefined;
        const onPointerDown = (e) => {
            if (
                drawSettingsRef.current?.contains(e.target) ||
                e.target.closest?.('[data-testid="draw-settings-trigger"]')
            ) {
                return;
            }
            setDrawSettingsOpen(false);
        };
        const onKeyDown = (e) => {
            if (e.key === 'Escape') setDrawSettingsOpen(false);
        };
        document.addEventListener('pointerdown', onPointerDown, true);
        document.addEventListener('keydown', onKeyDown);
        return () => {
            document.removeEventListener('pointerdown', onPointerDown, true);
            document.removeEventListener('keydown', onKeyDown);
        };
    }, [drawSettingsOpen]);

    useEffect(() => {
        const el = viewportRef?.current;
        if (!el) return undefined;
        const onNativeWheel = (e) => {
            if (
                e.target?.closest?.(
                    '[data-testid="right-layers-panel"], [data-testid="floating-toolbar"], [data-testid="left-floating-panel"], [data-testid="right-draw-toolbar"], [data-testid="right-pen-toolbar"], [data-testid="right-shapes-toolbar"], [data-testid="right-line-toolbar"], [data-testid="right-eraser-toolbar"], [data-testid="draw-settings-popover"], [data-testid="canvas-context-menu"], [data-testid="layer-context-menu"], [role="dialog"], [role="listbox"]'
                )
            ) {
                return;
            }
            if (!e.deltaY) return;
            e.preventDefault();
            const step = Math.min(0.16, Math.max(0.05, Math.abs(e.deltaY) * 0.001));
            const dir = e.deltaY < 0 ? 1 : -1;
            onZoomChangeRef.current?.((prev) =>
                Math.max(0.15, Math.min(3, Number(((Number(prev) || 1) + dir * step).toFixed(2))))
            );
        };
        el.addEventListener('wheel', onNativeWheel, { passive: false });
        return () => el.removeEventListener('wheel', onNativeWheel);
    }, [viewportRef]);

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

    const handleDrop = (e) => {
        e.preventDefault();
        let dropCoords = null;
        if (artboardRef.current) {
            const rect = artboardRef.current.getBoundingClientRect();
            const safeZoom = Math.max(0.05, Number(zoom) || 1);
            const x = workspaceBounds.minX + (e.clientX - rect.left) / safeZoom;
            const y = workspaceBounds.minY + (e.clientY - rect.top) / safeZoom;
            if (Number.isFinite(x) && Number.isFinite(y)) {
                dropCoords = { x, y };
            }
        }
        const assetData = e.dataTransfer?.getData('application/x-png101-asset');
        if (assetData) {
            try {
                const parsed = JSON.parse(assetData);
                onDropAssetOrFile({ type: 'asset', asset: parsed, dropCoords });
                return;
            } catch {
                // ignore
            }
        }
        if (e.dataTransfer?.files?.length) {
            onDropAssetOrFile({ type: 'files', files: e.dataTransfer.files, dropCoords });
        }
    };

    const displayW = Math.round(workspaceBounds.totalW * zoom);
    const displayH = Math.round(workspaceBounds.totalH * zoom);
    const stageArtboards =
        Array.isArray(artboards) && artboards.length > 0
            ? artboards
            : [{ id: 'artboard-1', name: 'Artboard 1', x: 0, y: 0, width: canvasWidth, height: canvasHeight, visible: true, bgMeta: { mode: isTransparentBg ? 'transparent' : 'solid' } }];

    return (
        <div className="flex-1 flex flex-col min-w-0 bg-slate-200/75 dark:bg-slate-950 relative overflow-hidden transition-colors">
            {/* Workspace Viewport */}
            <div
                ref={viewportRef}
                data-editor-stage="true"
                data-zoom={zoom}
                onPointerDown={handleStagePointerDown}
                onPointerMove={handleStagePointerMove}
                onPointerUp={handleStagePointerUp}
                onPointerLeave={handleStagePointerUp}
                onDragOver={(e) => {
                    e.preventDefault();
                    if (e.dataTransfer) {
                        e.dataTransfer.dropEffect = 'copy';
                    }
                }}
                onDrop={handleDrop}
                onContextMenuCapture={(e) => {
                    e.preventDefault();
                    if (
                        e.target.closest?.(
                            'input, textarea, select, [data-testid="right-layers-panel"], [data-testid="left-floating-panel"], [data-testid="floating-toolbar"], [data-testid="right-draw-toolbar"], [data-testid="right-pen-toolbar"], [data-testid="right-eraser-toolbar"], [data-testid="right-shapes-toolbar"], [data-testid="right-line-toolbar"], [data-testid="draw-settings-popover"], [data-testid="layer-context-menu"]'
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
                        label="Text Tool (Click canvas to add or edit)"
                        shortcut="T"
                        active={activeTool === 'text'}
                        onClick={() => onSelectTool('text')}
                        testId="right-tool-text"
                    >
                        <Type className="w-4 h-4" />
                    </RightToolButton>

                    <RightToolButton
                        label="Shapes"
                        shortcut="U"
                        active={activeTool === 'shapes'}
                        activeClass="bg-amber-500 text-white"
                        onClick={() => onSelectTool('shapes')}
                        testId="right-tool-shapes"
                    >
                        <Shapes className="w-4 h-4" />
                    </RightToolButton>

                    <RightToolButton
                        label="Line Tool (Drag on canvas to draw)"
                        active={activeTool === 'line'}
                        activeClass="bg-cyan-600 text-white"
                        onClick={() => onSelectTool('line')}
                        testId="right-tool-line"
                    >
                        <Minus className="w-4 h-4 -rotate-45" />
                    </RightToolButton>

                    <RightToolButton
                        label="Pen Tool (Vector Path)"
                        shortcut="P"
                        active={activeTool === 'pen'}
                        activeClass="bg-indigo-600 text-white"
                        onClick={() => onSelectTool('pen')}
                        testId="right-tool-pen"
                    >
                        <PenTool className="w-4 h-4" />
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
                            {renderActiveBrushIcon()}
                        </RightToolButton>
                    )}

                    <RightToolButton
                        label="Eraser Tool"
                        shortcut="E"
                        active={activeTool === 'eraser'}
                        activeClass="bg-rose-600 text-white"
                        onClick={() => onSelectTool('eraser')}
                        testId="right-tool-eraser"
                    >
                        <Eraser className="w-4 h-4" />
                    </RightToolButton>

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
                        label="Add New Artboard"
                        onClick={() => onOpenNewArtboardModal?.()}
                        testId="right-tool-artboard"
                    >
                        <Frame className="w-4 h-4" />
                    </RightToolButton>

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

                {/* Vertical Draw Sub-Toolbar (opens when Draw tool is active) */}
                {enableFreehandDraw && (
                    <AnimatedPopover
                        ref={drawToolbarDrag.panelRef}
                        open={activeTool === 'draw'}
                        originClass="origin-top-right"
                        data-testid="right-draw-toolbar"
                        data-moved={drawToolbarDrag.hasMoved ? 'true' : 'false'}
                        style={rightPanelStyle(drawToolbarDrag)}
                        onPointerDown={(e) => e.stopPropagation()}
                        className={`absolute z-40 flex flex-col gap-1 p-1.5 rounded-2xl bg-white/95 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200 dark:border-slate-700/80 shadow-xl ${
                            drawToolbarDrag.isDragging ? 'ring-2 ring-blue-500/40' : ''
                        }`}
                    >
                        <div
                            role="button"
                            tabIndex={0}
                            aria-label="Drag Draw Toolbar"
                            data-testid="draw-toolbar-drag-handle"
                            onPointerDown={drawToolbarDrag.handleDragPointerDown}
                            onDoubleClick={drawToolbarDrag.resetPosition}
                            data-tooltip="Drag to move (double-click to reset)"
                            className={`flex items-center justify-center py-0.5 border-b border-slate-200/80 dark:border-slate-800/80 mb-0.5 select-none ${
                                drawToolbarDrag.isDragging ? 'cursor-grabbing' : 'cursor-grab'
                            }`}
                        >
                            <GripHorizontal
                                className={`w-3.5 h-3.5 ${
                                    drawToolbarDrag.hasMoved ? 'text-blue-500' : 'text-slate-400'
                                }`}
                            />
                        </div>

                        <RightToolButton
                            label="Pencil Brush"
                            active={(brushConfig.kind || 'pencil') === 'pencil'}
                            activeClass="bg-emerald-600 text-white"
                            onClick={() => onChangeBrushConfig?.({ ...brushConfig, kind: 'pencil' })}
                            testId="draw-tool-pencil"
                        >
                            <Pencil className="w-4 h-4" />
                        </RightToolButton>

                        <RightToolButton
                            label="Marker Brush"
                            active={brushConfig.kind === 'marker'}
                            activeClass="bg-emerald-600 text-white"
                            onClick={() => onChangeBrushConfig?.({ ...brushConfig, kind: 'marker' })}
                            testId="draw-tool-marker"
                        >
                            <Brush className="w-4 h-4" />
                        </RightToolButton>

                        <RightToolButton
                            label="Highlighter"
                            active={brushConfig.kind === 'highlighter'}
                            activeClass="bg-emerald-600 text-white"
                            onClick={() => onChangeBrushConfig?.({ ...brushConfig, kind: 'highlighter' })}
                            testId="draw-tool-highlighter"
                        >
                            <Highlighter className="w-4 h-4" />
                        </RightToolButton>

                        <div className="h-px bg-slate-200 dark:bg-slate-800 my-0.5" />

                        {/* Brush Color Rounded Square Swatch (directly above Settings) */}
                        <div className="relative flex items-center justify-center py-0.5">
                            <StudioColorPicker
                                value={brushConfig.color || '#2563eb'}
                                onChange={(hex) => onChangeBrushConfig?.({ ...brushConfig, color: hex })}
                                size="tile"
                                customTooltip
                                title="Brush Color"
                                ariaLabel="Brush Color"
                                data-testid="draw-color-trigger"
                            />
                        </div>

                        {/* Bottom Settings Icon -> opens Weight & Transparency popover */}
                        <div className="relative flex items-center justify-center">
                            <RightToolButton
                                label="Brush Settings (Weight & Transparency)"
                                active={drawSettingsOpen}
                                activeClass="bg-blue-600 text-white"
                                onClick={() => setDrawSettingsOpen((o) => !o)}
                                testId="draw-settings-trigger"
                            >
                                <SlidersHorizontal className="w-4 h-4" />
                            </RightToolButton>

                            <AnimatedPopover
                                ref={drawSettingsDrag.panelRef}
                                open={activeTool === 'draw' && drawSettingsOpen}
                                originClass="origin-bottom-right"
                                data-testid="draw-settings-popover"
                                data-moved={drawSettingsDrag.hasMoved ? 'true' : 'false'}
                                style={{
                                    bottom: `${-drawSettingsDrag.offset.y}px`,
                                    right: `calc(100% + ${10 - drawSettingsDrag.offset.x}px)`,
                                }}
                                onPointerDown={(e) => e.stopPropagation()}
                                className={`absolute w-60 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xl p-3.5 text-xs text-slate-800 dark:text-slate-100 space-y-3 select-none z-50 ${
                                    drawSettingsDrag.isDragging ? 'ring-2 ring-blue-500/40' : ''
                                }`}
                            >
                                <div
                                    data-testid="draw-settings-drag-handle"
                                    onPointerDown={drawSettingsDrag.handleDragPointerDown}
                                    onDoubleClick={drawSettingsDrag.resetPosition}
                                    data-tooltip="Drag to move (double-click to reset)"
                                    className={`flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800 ${
                                        drawSettingsDrag.isDragging ? 'cursor-grabbing' : 'cursor-grab'
                                    }`}
                                >
                                    <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                        <GripHorizontal
                                            className={`w-3.5 h-3.5 shrink-0 ${
                                                drawSettingsDrag.hasMoved ? 'text-blue-500' : 'text-slate-400'
                                            }`}
                                        />
                                        Brush Settings
                                    </span>
                                    <span className="text-[10px] font-semibold capitalize text-emerald-600 dark:text-emerald-400">
                                        {brushConfig.kind === 'spray' ? 'pencil' : brushConfig.kind || 'pencil'}
                                    </span>
                                </div>

                                <div>
                                    <div className="flex items-center justify-between text-[11px] mb-1">
                                        <span className="text-slate-600 dark:text-slate-300 font-medium">Weight</span>
                                        <span className="font-mono text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                                            {brushConfig.width}px
                                        </span>
                                    </div>
                                    <input
                                        type="range"
                                        min={1}
                                        max={80}
                                        data-testid="draw-weight-slider"
                                        value={brushConfig.width}
                                        onPointerDown={() => {
                                            brushSliderDownRef.current = true;
                                            showBrushSizePreview(0);
                                        }}
                                        onPointerUp={() => {
                                            brushSliderDownRef.current = false;
                                            hideBrushSizePreviewSoon(350);
                                        }}
                                        onPointerCancel={() => {
                                            brushSliderDownRef.current = false;
                                            hideBrushSizePreviewSoon(350);
                                        }}
                                        onBlur={() => {
                                            brushSliderDownRef.current = false;
                                            setBrushPreviewActive(false);
                                        }}
                                        onChange={(e) => {
                                            onChangeBrushConfig?.({ ...brushConfig, width: Number(e.target.value) });
                                            showBrushSizePreview(900);
                                        }}
                                        className="w-full accent-blue-500 cursor-pointer"
                                    />
                                </div>

                                <div>
                                    <div className="flex items-center justify-between text-[11px] mb-1">
                                        <span className="text-slate-600 dark:text-slate-300 font-medium">Transparency</span>
                                        <span className="font-mono text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                                            {Math.round((brushConfig.opacity ?? 1) * 100)}%
                                        </span>
                                    </div>
                                    <input
                                        type="range"
                                        min={0}
                                        max={1}
                                        step={0.01}
                                        data-testid="draw-opacity-slider"
                                        value={brushConfig.opacity ?? 1}
                                        onPointerDown={() => {
                                            brushSliderDownRef.current = true;
                                            showBrushSizePreview(0);
                                        }}
                                        onPointerUp={() => {
                                            brushSliderDownRef.current = false;
                                            hideBrushSizePreviewSoon(350);
                                        }}
                                        onPointerCancel={() => {
                                            brushSliderDownRef.current = false;
                                            hideBrushSizePreviewSoon(350);
                                        }}
                                        onBlur={() => {
                                            brushSliderDownRef.current = false;
                                            setBrushPreviewActive(false);
                                        }}
                                        onChange={(e) => {
                                            onChangeBrushConfig?.({ ...brushConfig, opacity: Number(e.target.value) });
                                            showBrushSizePreview(900);
                                        }}
                                        className="w-full accent-blue-500 cursor-pointer"
                                    />
                                </div>
                            </AnimatedPopover>
                        </div>
                    </AnimatedPopover>
                )}

                {/* Vertical Pen Tool Panel (opens when Vector Pen Tool is active) */}
                <AnimatedPopover
                    ref={penPanelDrag.panelRef}
                    open={activeTool === 'pen'}
                    originClass="origin-top-right"
                    data-testid="right-pen-toolbar"
                    data-moved={penPanelDrag.hasMoved ? 'true' : 'false'}
                    style={rightPanelStyle(penPanelDrag)}
                    onPointerDown={(e) => e.stopPropagation()}
                    className={`absolute z-40 w-48 rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-700/80 shadow-xl p-3 text-xs text-slate-800 dark:text-slate-100 space-y-2.5 select-none ${
                        penPanelDrag.isDragging ? 'ring-2 ring-blue-500/40' : ''
                    }`}
                >
                    <div
                        data-testid="pen-toolbar-drag-handle"
                        onPointerDown={penPanelDrag.handleDragPointerDown}
                        onDoubleClick={penPanelDrag.resetPosition}
                        data-tooltip="Drag to move (double-click to reset)"
                        className={`flex items-center justify-between pb-1.5 border-b border-slate-200 dark:border-slate-800 ${
                            penPanelDrag.isDragging ? 'cursor-grabbing' : 'cursor-grab'
                        }`}
                    >
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            <GripHorizontal
                                className={`w-3.5 h-3.5 shrink-0 ${
                                    penPanelDrag.hasMoved ? 'text-blue-500' : 'text-slate-400'
                                }`}
                            />
                            Pen Tool
                        </span>
                        <span className="font-mono text-[10px] text-indigo-600 dark:text-indigo-400">
                            {penAnchors.length} pts
                        </span>
                    </div>

                    <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] text-slate-600 dark:text-slate-300">Fill</span>
                        <StudioColorPicker
                            value={penConfig.fill}
                            onChange={(hex) => onChangePenConfig?.({ ...penConfig, fill: hex })}
                            size="tile"
                            customTooltip
                            title="Vector Fill Color"
                            ariaLabel="Vector Fill Color"
                            data-testid="pen-fill-trigger"
                        />
                    </div>

                    <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] text-slate-600 dark:text-slate-300">Stroke</span>
                        <StudioColorPicker
                            value={penConfig.stroke}
                            onChange={(hex) => onChangePenConfig?.({ ...penConfig, stroke: hex })}
                            size="tile"
                            customTooltip
                            title="Vector Stroke Color"
                            ariaLabel="Vector Stroke Color"
                            data-testid="pen-stroke-trigger"
                        />
                    </div>

                    <div>
                        <div className="flex items-center justify-between text-[11px] mb-1">
                            <span className="text-slate-600 dark:text-slate-300">Stroke Width</span>
                            <span className="font-mono text-[10px] text-slate-500">{penConfig.strokeWidth}px</span>
                        </div>
                        <input
                            type="range"
                            min={0}
                            max={24}
                            data-testid="pen-stroke-width-slider"
                            value={penConfig.strokeWidth}
                            onChange={(e) =>
                                onChangePenConfig?.({ ...penConfig, strokeWidth: Number(e.target.value) })
                            }
                            className="w-full accent-indigo-500 cursor-pointer"
                        />
                    </div>

                    <div className="text-[10px] leading-snug text-slate-400 dark:text-slate-500">
                        Click for corner · Drag for Bezier curve · Click start point to close
                    </div>

                    <div className="grid grid-cols-2 gap-1.5 pt-1">
                        <button
                            type="button"
                            disabled={penAnchors.length < 2}
                            data-testid="pen-close-shape"
                            onClick={() => finishPenPath(true)}
                            className="py-1.5 px-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-[10px] font-bold inline-flex items-center justify-center gap-1 cursor-pointer disabled:cursor-not-allowed"
                        >
                            <Check className="w-3 h-3" />
                            <span>Close</span>
                        </button>
                        <button
                            type="button"
                            disabled={penAnchors.length < 2}
                            data-testid="pen-finish-path"
                            onClick={() => finishPenPath(false)}
                            className="py-1.5 px-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 disabled:opacity-40 text-slate-700 dark:text-slate-200 text-[10px] font-bold cursor-pointer disabled:cursor-not-allowed"
                        >
                            Finish Open
                        </button>
                        <button
                            type="button"
                            disabled={penAnchors.length === 0}
                            data-testid="pen-undo-point"
                            onClick={() => updatePenAnchors((prev) => prev.slice(0, -1))}
                            className="py-1.5 px-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 disabled:opacity-40 text-slate-600 dark:text-slate-300 text-[10px] font-semibold inline-flex items-center justify-center gap-1 cursor-pointer disabled:cursor-not-allowed"
                        >
                            <RotateCcw className="w-3 h-3" />
                            <span>Undo Pt</span>
                        </button>
                        <button
                            type="button"
                            data-testid="pen-cancel"
                            onClick={() => {
                                updatePenAnchors([]);
                                setPenHoverPt(null);
                                setPenClosingPreview(false);
                                penDraggingRef.current = null;
                                onSelectTool?.('select');
                            }}
                            className="py-1.5 px-2 rounded-lg bg-slate-100 hover:bg-rose-500/15 dark:bg-slate-800 hover:text-rose-500 text-slate-600 dark:text-slate-300 text-[10px] font-semibold inline-flex items-center justify-center gap-1 cursor-pointer"
                        >
                            <X className="w-3 h-3" />
                            <span>Cancel</span>
                        </button>
                    </div>
                </AnimatedPopover>

                {/* Vertical Shapes Picker Sub-Panel (opens when Shapes tool is active) */}
                <AnimatedPopover
                    ref={shapesPanelDrag.panelRef}
                    open={activeTool === 'shapes'}
                    originClass="origin-top-right"
                    data-testid="right-shapes-toolbar"
                    data-moved={shapesPanelDrag.hasMoved ? 'true' : 'false'}
                    style={rightPanelStyle(shapesPanelDrag)}
                    onPointerDown={(e) => e.stopPropagation()}
                    className={`absolute z-40 w-60 rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-700/80 shadow-xl p-3 text-xs text-slate-800 dark:text-slate-100 space-y-2.5 select-none ${
                        shapesPanelDrag.isDragging ? 'ring-2 ring-blue-500/40' : ''
                    }`}
                >
                    <div
                        data-testid="shapes-toolbar-drag-handle"
                        onPointerDown={shapesPanelDrag.handleDragPointerDown}
                        onDoubleClick={shapesPanelDrag.resetPosition}
                        data-tooltip="Drag to move (double-click to reset)"
                        className={`flex items-center justify-between pb-1.5 border-b border-slate-200 dark:border-slate-800 ${
                            shapesPanelDrag.isDragging ? 'cursor-grabbing' : 'cursor-grab'
                        }`}
                    >
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            <GripHorizontal
                                className={`w-3.5 h-3.5 shrink-0 ${
                                    shapesPanelDrag.hasMoved ? 'text-blue-500' : 'text-slate-400'
                                }`}
                            />
                            Shapes
                        </span>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500">Click to add</span>
                    </div>

                    <div className="grid grid-cols-3 gap-1.5">
                        {RIGHT_SHAPE_TOOLS.map((item) => {
                            const Icon = item.icon;
                            return (
                                <button
                                    key={item.kind}
                                    type="button"
                                    data-testid={`shape-tool-${item.kind}`}
                                    onClick={() => onAddElement?.(item.kind)}
                                    className="flex flex-col items-center justify-center gap-1 rounded-xl border border-slate-200/80 dark:border-slate-700/70 bg-slate-50/70 dark:bg-slate-800/50 hover:bg-amber-50 dark:hover:bg-amber-500/15 hover:border-amber-400/60 dark:hover:border-amber-400/50 py-2 px-1 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
                                >
                                    <Icon className="w-4 h-4 shrink-0" />
                                    <span className="text-[10px] font-medium leading-tight truncate max-w-full">
                                        {item.label}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </AnimatedPopover>

                {/* Vertical Line Tool Sub-Panel (opens when Line tool is active) */}
                <AnimatedPopover
                    ref={linePanelDrag.panelRef}
                    open={activeTool === 'line'}
                    originClass="origin-top-right"
                    data-testid="right-line-toolbar"
                    data-moved={linePanelDrag.hasMoved ? 'true' : 'false'}
                    style={rightPanelStyle(linePanelDrag)}
                    onPointerDown={(e) => e.stopPropagation()}
                    className={`absolute z-40 w-48 rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-700/80 shadow-xl p-3 text-xs text-slate-800 dark:text-slate-100 space-y-2.5 select-none ${
                        linePanelDrag.isDragging ? 'ring-2 ring-blue-500/40' : ''
                    }`}
                >
                    <div
                        data-testid="line-toolbar-drag-handle"
                        onPointerDown={linePanelDrag.handleDragPointerDown}
                        onDoubleClick={linePanelDrag.resetPosition}
                        data-tooltip="Drag to move (double-click to reset)"
                        className={`flex items-center justify-between pb-1.5 border-b border-slate-200 dark:border-slate-800 ${
                            linePanelDrag.isDragging ? 'cursor-grabbing' : 'cursor-grab'
                        }`}
                    >
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            <GripHorizontal
                                className={`w-3.5 h-3.5 shrink-0 ${
                                    linePanelDrag.hasMoved ? 'text-blue-500' : 'text-slate-400'
                                }`}
                            />
                            Line Tool
                        </span>
                        <span className="font-mono text-[10px] text-cyan-600 dark:text-cyan-400">
                            {lineConfig.strokeWidth}px
                        </span>
                    </div>

                    <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] text-slate-600 dark:text-slate-300">Color</span>
                        <StudioColorPicker
                            value={lineConfig.stroke || '#1e293b'}
                            onChange={(hex) => onChangeLineConfig?.({ ...lineConfig, stroke: hex })}
                            size="tile"
                            customTooltip
                            title="Line Color"
                            ariaLabel="Line Color"
                            data-testid="line-stroke-trigger"
                        />
                    </div>

                    <div>
                        <div className="flex items-center justify-between text-[11px] mb-1">
                            <span className="text-slate-600 dark:text-slate-300">Weight</span>
                            <span className="font-mono text-[10px] text-slate-500">{lineConfig.strokeWidth}px</span>
                        </div>
                        <input
                            type="range"
                            min={1}
                            max={32}
                            data-testid="line-stroke-width-slider"
                            value={lineConfig.strokeWidth}
                            onChange={(e) =>
                                onChangeLineConfig?.({ ...lineConfig, strokeWidth: Number(e.target.value) })
                            }
                            className="w-full accent-cyan-500 cursor-pointer"
                        />
                    </div>

                    <div className="grid grid-cols-3 gap-1">
                        {[
                            { id: 'solid', label: 'Solid' },
                            { id: 'dashed', label: 'Dashed' },
                            { id: 'dotted', label: 'Dotted' },
                        ].map((st) => (
                            <button
                                key={st.id}
                                type="button"
                                data-testid={`line-style-${st.id}`}
                                onClick={() => onChangeLineConfig?.({ ...lineConfig, style: st.id })}
                                className={`py-1 rounded-lg text-[10px] font-bold cursor-pointer transition-colors ${
                                    (lineConfig.style || 'solid') === st.id
                                        ? 'bg-cyan-600 text-white'
                                        : 'bg-slate-100 dark:bg-slate-950 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'
                                }`}
                            >
                                {st.label}
                            </button>
                        ))}
                    </div>

                    <button
                        type="button"
                        data-testid="line-quick-insert"
                        onClick={() =>
                            onCommitLine?.({
                                x1: canvasWidth / 2 - 140,
                                y1: canvasHeight / 2,
                                x2: canvasWidth / 2 + 140,
                                y2: canvasHeight / 2,
                                stroke: lineConfig.stroke || '#1e293b',
                                strokeWidth: lineConfig.strokeWidth || 4,
                                style: lineConfig.style || 'solid',
                            })
                        }
                        className="w-full py-1.5 px-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-[10px] font-bold cursor-pointer transition-colors"
                    >
                        Insert Centered Line
                    </button>

                    <div className="text-[10px] leading-snug text-slate-400 dark:text-slate-500">
                        Click &amp; drag on canvas to draw · Hold Shift for 45° snap
                    </div>
                </AnimatedPopover>

                {/* Vertical Eraser Sub-Panel (opens when Eraser Tool is active) */}
                <AnimatedPopover
                    ref={eraserPanelDrag.panelRef}
                    open={activeTool === 'eraser'}
                    originClass="origin-top-right"
                    data-testid="right-eraser-toolbar"
                    data-moved={eraserPanelDrag.hasMoved ? 'true' : 'false'}
                    style={rightPanelStyle(eraserPanelDrag)}
                    onPointerDown={(e) => e.stopPropagation()}
                    className={`absolute z-40 w-48 rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-700/80 shadow-xl p-3 text-xs text-slate-800 dark:text-slate-100 space-y-2.5 select-none ${
                        eraserPanelDrag.isDragging ? 'ring-2 ring-blue-500/40' : ''
                    }`}
                >
                    <div
                        data-testid="eraser-toolbar-drag-handle"
                        onPointerDown={eraserPanelDrag.handleDragPointerDown}
                        onDoubleClick={eraserPanelDrag.resetPosition}
                        data-tooltip="Drag to move (double-click to reset)"
                        className={`flex items-center justify-between pb-1.5 border-b border-slate-200 dark:border-slate-800 ${
                            eraserPanelDrag.isDragging ? 'cursor-grabbing' : 'cursor-grab'
                        }`}
                    >
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            <GripHorizontal
                                className={`w-3.5 h-3.5 shrink-0 ${
                                    eraserPanelDrag.hasMoved ? 'text-blue-500' : 'text-slate-400'
                                }`}
                            />
                            Eraser
                        </span>
                        <span className="font-mono text-[10px] font-semibold text-rose-600 dark:text-rose-400">
                            {eraserConfig.size}px
                        </span>
                    </div>

                    <div>
                        <input
                            type="range"
                            min={4}
                            max={120}
                            data-testid="eraser-size-slider"
                            value={eraserConfig.size}
                            onPointerDown={() => {
                                eraserSliderDownRef.current = true;
                                showEraserSizePreview(0);
                            }}
                            onPointerUp={() => {
                                eraserSliderDownRef.current = false;
                                hideEraserSizePreviewSoon(350);
                            }}
                            onPointerCancel={() => {
                                eraserSliderDownRef.current = false;
                                hideEraserSizePreviewSoon(350);
                            }}
                            onBlur={() => {
                                eraserSliderDownRef.current = false;
                                setEraserPreviewActive(false);
                            }}
                            onChange={(e) => {
                                onChangeEraserConfig?.({ ...eraserConfig, size: Number(e.target.value) });
                                showEraserSizePreview(900);
                            }}
                            className="w-full accent-rose-500 cursor-pointer"
                        />
                    </div>

                    <div className="grid grid-cols-3 gap-1">
                        {[12, 28, 56].map((sz) => (
                            <button
                                key={sz}
                                type="button"
                                data-testid={`eraser-preset-${sz}`}
                                onClick={() => {
                                    onChangeEraserConfig?.({ ...eraserConfig, size: sz });
                                    showEraserSizePreview(900);
                                }}
                                className={`py-1 rounded-lg text-[10px] font-bold cursor-pointer transition-colors ${
                                    eraserConfig.size === sz
                                        ? 'bg-rose-600 text-white'
                                        : 'bg-slate-100 dark:bg-slate-950 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'
                                }`}
                            >
                                {sz}px
                            </button>
                        ))}
                    </div>

                    {activeLayerIds.length === 0 ? (
                        <div
                            data-testid="eraser-no-layer-hint"
                            className="text-[10px] leading-snug font-medium text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/25 rounded-lg px-2 py-1.5"
                        >
                            Select a layer on the canvas or in Layers to erase from it.
                        </div>
                    ) : eraserSelectionLocked ? (
                        <div
                            data-testid="eraser-locked-hint"
                            className="text-[10px] leading-snug font-medium text-rose-600 dark:text-rose-400 bg-rose-500/10 border border-rose-500/25 rounded-lg px-2 py-1.5 flex items-center gap-1.5"
                        >
                            <Ban className="w-3.5 h-3.5 shrink-0" />
                            <span>Layer is locked — unlock it first to erase from it.</span>
                        </div>
                    ) : (
                        <div className="text-[10px] leading-snug text-slate-400 dark:text-slate-500">
                            {activeLayerIds.length === 1
                                ? 'Erasing selected layer only · Ctrl+Z to undo'
                                : `Erasing ${activeLayerIds.length} selected layers · Ctrl+Z to undo`}
                        </div>
                    )}
                </AnimatedPopover>

                {/* Animated Layers Side Panel */}
                <EditorLayersPanel
                    open={layersOpen}
                    onClose={() => setLayersOpen(false)}
                    layers={layers}
                    obstacleRects={toolObstacleRects}
                    viewportRef={viewportRef}
                    activeLayerIds={activeLayerIds}
                    activeArtboardId={activeArtboardId}
                    onSelectArtboard={onSelectArtboard}
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
                    onOpenNewArtboardModal={onOpenNewArtboardModal}
                    onResizeArtboard={onResizeArtboard}
                    onDuplicateArtboard={onDuplicateArtboard}
                    onReorderArtboard={onReorderArtboard}
                    onCreateGroupLayer={onCreateGroupLayer}
                    onCreateEmptyLayer={onCreateEmptyLayer}
                    canGroup={canGroup}
                    canUngroup={canUngroup}
                />

                {/* Workspace & Artboards Stage Container */}
                <div
                    ref={artboardRef}
                    data-editor-workspace="true"
                    style={{
                        transform: `translate(${panOffset.x}px, ${panOffset.y}px)`,
                        width: `${displayW}px`,
                        height: `${displayH}px`,
                    }}
                    className="relative z-0 shrink-0"
                >
                    {/* Per-Artboard Checkerboard & Shadow Backdrops */}
                    {stageArtboards.map((ab) => {
                        if (ab.visible === false) return null;
                        const abLeft = (ab.x - workspaceBounds.minX) * zoom;
                        const abTop = (ab.y - workspaceBounds.minY) * zoom;
                        const abW = ab.width * zoom;
                        const abH = ab.height * zoom;
                        const isAbTrans = !ab.bgMeta || ab.bgMeta.mode === 'transparent';
                        const isAbActive = ab.id === activeArtboardId;
                        return (
                            <div
                                key={ab.id}
                                data-editor-artboard="true"
                                data-artboard-id={ab.id}
                                data-artboard-active={isAbActive ? 'true' : 'false'}
                                style={{
                                    left: `${abLeft}px`,
                                    top: `${abTop}px`,
                                    width: `${abW}px`,
                                    height: `${abH}px`,
                                }}
                                className={`absolute pointer-events-none z-0 shadow-[0_18px_55px_rgba(15,23,42,0.22)] dark:shadow-[0_20px_70px_rgba(0,0,0,0.65)] ${
                                    isAbTrans
                                        ? 'bg-[conic-gradient(#e2e8f0_90deg,#ffffff_90deg_180deg,#e2e8f0_180deg_270deg,#ffffff_270deg)] dark:bg-[conic-gradient(#1e293b_90deg,#0f172a_90deg_180deg,#1e293b_180deg_270deg,#0f172a_270deg)] [background-size:20px_20px]'
                                        : ''
                                }`}
                            />
                        );
                    })}

                    {/* Isolated Fabric Canvas Host with oversized pasteboard margin for off-canvas artwork & controls */}
                    <div
                        data-editor-pasteboard="true"
                        style={{
                            position: 'absolute',
                            left: `${-pasteboardPad}px`,
                            top: `${-pasteboardPad}px`,
                            width: `${displayW + pasteboardPad * 2}px`,
                            height: `${displayH + pasteboardPad * 2}px`,
                        }}
                    >
                        <canvas ref={canvasElRef} />
                    </div>

                    {/* Per-Artboard Crop Rings, Grid/Safe Margins & Clickable Header Pills */}
                    {stageArtboards.map((ab) => {
                        if (ab.visible === false) return null;
                        const abLeft = (ab.x - workspaceBounds.minX) * zoom;
                        const abTop = (ab.y - workspaceBounds.minY) * zoom;
                        const abW = ab.width * zoom;
                        const abH = ab.height * zoom;
                        const isAbActive = ab.id === activeArtboardId;
                        return (
                            <div
                                key={`overlay-${ab.id}`}
                                style={{
                                    left: `${abLeft}px`,
                                    top: `${abTop}px`,
                                    width: `${abW}px`,
                                    height: `${abH}px`,
                                }}
                                className={`absolute pointer-events-none z-10 transition-shadow ${
                                    isAbActive && stageArtboards.length > 1
                                        ? 'ring-2 ring-blue-500/80'
                                        : 'ring-1 ring-slate-900/15 dark:ring-white/20'
                                }`}
                            >
                                <button
                                    type="button"
                                    data-testid={`artboard-stage-label-${ab.id}`}
                                    onPointerDown={(e) => e.stopPropagation()}
                                    onClick={() => onSelectArtboard?.(ab.id)}
                                    onDoubleClick={() => onResizeArtboard?.(ab.id)}
                                    title="Click to activate artboard · Double-click to resize"
                                    style={{ bottom: '100%', left: 0, marginBottom: '6px' }}
                                    className={`pointer-events-auto absolute inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[10px] font-bold shadow-xs backdrop-blur-md border cursor-pointer transition-colors whitespace-nowrap ${
                                        isAbActive
                                            ? 'bg-blue-600 text-white border-blue-500'
                                            : 'bg-white/90 dark:bg-slate-900/90 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:text-blue-600 dark:hover:text-blue-300'
                                    }`}
                                >
                                    <span>{ab.name}</span>
                                    <span className="opacity-75 font-mono text-[9px]">
                                        {ab.width}×{ab.height}
                                    </span>
                                </button>

                                {showGrid && isAbActive && (
                                    <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(56,189,248,0.18)_1px,transparent_1px),linear-gradient(to_bottom,rgba(56,189,248,0.18)_1px,transparent_1px)] [background-size:40px_40px]" />
                                )}

                                {showSafeMargins && isAbActive && (
                                    <div className="absolute inset-4 sm:inset-6 border border-dashed border-amber-500/70 dark:border-amber-400/55 rounded-sm" />
                                )}
                            </div>
                        );
                    })}

                    {/* Smart Alignment Snap Lines & Point Markers */}
                    <div className="absolute inset-0 pointer-events-none z-10">
                        {snapGuides.map((g, idx) => {
                            if (g.type === 'point') {
                                return (
                                    <div
                                        key={idx}
                                        data-testid="snap-point-marker"
                                        className="absolute w-3 h-3 -ml-1.5 -mt-1.5 rounded-full border-2 border-blue-500 bg-white shadow-[0_0_8px_rgba(37,99,235,0.85)]"
                                        style={{
                                            left: `${(g.x - workspaceBounds.minX) * zoom}px`,
                                            top: `${(g.y - workspaceBounds.minY) * zoom}px`,
                                        }}
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
                                            ? { left: `${(g.pos - workspaceBounds.minX) * zoom}px`, top: 0, bottom: 0, width: '1px' }
                                            : { top: `${(g.pos - workspaceBounds.minY) * zoom}px`, left: 0, right: 0, height: '1px' }
                                    }
                                />
                            );
                        })}
                    </div>

                    {/* Vector Pen Tool Interactive Canvas Overlay */}
                    {activeTool === 'pen' && !effectivePan && (
                        <div
                            data-testid="pen-canvas-overlay"
                            onPointerDown={(e) => {
                                if (e.button !== 0) return;
                                e.stopPropagation();
                                const pt = getArtboardCoords(e.clientX, e.clientY);
                                const closeDist = 12 / Math.max(0.2, zoom);
                                const currentAnchors = penAnchorsRef.current;
                                if (
                                    currentAnchors.length >= 2 &&
                                    Math.hypot(pt.x - currentAnchors[0].x, pt.y - currentAnchors[0].y) <= closeDist
                                ) {
                                    setPenClosingPreview(true);
                                    penDraggingRef.current = {
                                        idx: 0,
                                        closing: true,
                                        startX: currentAnchors[0].x,
                                        startY: currentAnchors[0].y,
                                        origInX: currentAnchors[0].inX || 0,
                                        origInY: currentAnchors[0].inY || 0,
                                    };
                                    e.currentTarget.setPointerCapture?.(e.pointerId);
                                    return;
                                }
                                const nextIdx = currentAnchors.length;
                                updatePenAnchors((prev) => [
                                    ...prev,
                                    { x: pt.x, y: pt.y, inX: 0, inY: 0, outX: 0, outY: 0 },
                                ]);
                                penDraggingRef.current = { idx: nextIdx, closing: false, startX: pt.x, startY: pt.y };
                                e.currentTarget.setPointerCapture?.(e.pointerId);
                            }}
                            onPointerMove={(e) => {
                                const pt = getArtboardCoords(e.clientX, e.clientY);
                                setPenHoverPt(pt);
                                const drag = penDraggingRef.current;
                                if (!drag) return;
                                const dx = pt.x - drag.startX;
                                const dy = pt.y - drag.startY;
                                const threshold = 2 / Math.max(0.2, zoom);
                                if (drag.closing) {
                                    const moved = Math.hypot(dx, dy) >= threshold;
                                    updatePenAnchors((prev) =>
                                        prev.map((a, i) =>
                                            i === 0
                                                ? {
                                                      ...a,
                                                      inX: moved ? -dx : drag.origInX,
                                                      inY: moved ? -dy : drag.origInY,
                                                  }
                                                : a
                                        )
                                    );
                                    return;
                                }
                                if (Math.hypot(dx, dy) < threshold) return;
                                updatePenAnchors((prev) =>
                                    prev.map((a, i) =>
                                        i === drag.idx
                                            ? {
                                                  ...a,
                                                  outX: dx,
                                                  outY: dy,
                                                  inX: e.altKey ? a.inX : -dx,
                                                  inY: e.altKey ? a.inY : -dy,
                                              }
                                            : a
                                    )
                                );
                            }}
                            onPointerUp={(e) => {
                                const drag = penDraggingRef.current;
                                if (drag) {
                                    penDraggingRef.current = null;
                                    try {
                                        e.currentTarget.releasePointerCapture?.(e.pointerId);
                                    } catch {
                                        // ignore
                                    }
                                    if (drag.closing) {
                                        finishPenPath(true, penAnchorsRef.current);
                                    }
                                }
                            }}
                            onPointerCancel={() => {
                                penDraggingRef.current = null;
                                setPenClosingPreview(false);
                            }}
                            onDoubleClick={(e) => {
                                e.stopPropagation();
                                let cleanAnchors = [...penAnchorsRef.current];
                                if (cleanAnchors.length >= 3) {
                                    const last = cleanAnchors[cleanAnchors.length - 1];
                                    const prev = cleanAnchors[cleanAnchors.length - 2];
                                    if (Math.hypot(last.x - prev.x, last.y - prev.y) < 4 / Math.max(0.2, zoom)) {
                                        cleanAnchors = cleanAnchors.slice(0, -1);
                                    }
                                }
                                finishPenPath(false, cleanAnchors);
                            }}
                            className="absolute inset-0 z-20 cursor-crosshair select-none"
                        >
                            <svg
                                viewBox={`${workspaceBounds.minX} ${workspaceBounds.minY} ${workspaceBounds.totalW} ${workspaceBounds.totalH}`}
                                className="w-full h-full overflow-visible pointer-events-none"
                            >
                                {penAnchors.length >= 2 && (
                                    <path
                                        d={buildBezierSvgPath(penAnchors, penClosingPreview)}
                                        fill={
                                            penClosingPreview && penConfig.fill && penConfig.fill !== 'transparent'
                                                ? penConfig.fill
                                                : 'none'
                                        }
                                        fillOpacity={penClosingPreview ? 0.25 : 1}
                                        stroke={penConfig.stroke || '#3b82f6'}
                                        strokeWidth={Math.max(1.5, penConfig.strokeWidth || 2) / Math.max(0.25, zoom * 0.7)}
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    />
                                )}
                                {penAnchors.length >= 1 && penHoverPt && !penDraggingRef.current && !penClosingPreview && (
                                    <path
                                        d={buildBezierSvgPath(
                                            [
                                                penAnchors[penAnchors.length - 1],
                                                { x: penHoverPt.x, y: penHoverPt.y, inX: 0, inY: 0, outX: 0, outY: 0 },
                                            ],
                                            false
                                        )}
                                        fill="none"
                                        stroke="#6366f1"
                                        strokeWidth={1.5 / Math.max(0.25, zoom)}
                                        strokeDasharray={`${5 / Math.max(0.25, zoom)} ${4 / Math.max(0.25, zoom)}`}
                                    />
                                )}
                                {penAnchors.map((a, idx) => {
                                    const zInv = 1 / Math.max(0.25, zoom);
                                    const isCloseTarget =
                                        idx === 0 &&
                                        penAnchors.length >= 2 &&
                                        penHoverPt &&
                                        Math.hypot(penHoverPt.x - a.x, penHoverPt.y - a.y) <= 12 * zInv;
                                    const hasIn = (a.inX || 0) !== 0 || (a.inY || 0) !== 0;
                                    const hasOut = (a.outX || 0) !== 0 || (a.outY || 0) !== 0;
                                    return (
                                        <g key={idx}>
                                            {hasIn && (
                                                <>
                                                    <line
                                                        x1={a.x}
                                                        y1={a.y}
                                                        x2={a.x + a.inX}
                                                        y2={a.y + a.inY}
                                                        stroke="#6366f1"
                                                        strokeWidth={1.25 * zInv}
                                                    />
                                                    <circle
                                                        cx={a.x + a.inX}
                                                        cy={a.y + a.inY}
                                                        r={3.5 * zInv}
                                                        fill="#ffffff"
                                                        stroke="#6366f1"
                                                        strokeWidth={1.5 * zInv}
                                                    />
                                                </>
                                            )}
                                            {hasOut && (
                                                <>
                                                    <line
                                                        x1={a.x}
                                                        y1={a.y}
                                                        x2={a.x + a.outX}
                                                        y2={a.y + a.outY}
                                                        stroke="#6366f1"
                                                        strokeWidth={1.25 * zInv}
                                                    />
                                                    <circle
                                                        cx={a.x + a.outX}
                                                        cy={a.y + a.outY}
                                                        r={3.5 * zInv}
                                                        fill="#ffffff"
                                                        stroke="#6366f1"
                                                        strokeWidth={1.5 * zInv}
                                                    />
                                                </>
                                            )}
                                            {penClosingPreview && idx === 0 && hasIn && (
                                                <>
                                                    <line
                                                        x1={a.x}
                                                        y1={a.y}
                                                        x2={a.x - a.inX}
                                                        y2={a.y - a.inY}
                                                        stroke="#10b981"
                                                        strokeWidth={1.25 * zInv}
                                                        strokeDasharray={`${3 * zInv} ${2 * zInv}`}
                                                    />
                                                    <circle
                                                        cx={a.x - a.inX}
                                                        cy={a.y - a.inY}
                                                        r={3.5 * zInv}
                                                        fill="#10b981"
                                                        stroke="#ffffff"
                                                        strokeWidth={1.25 * zInv}
                                                    />
                                                </>
                                            )}
                                            {isCloseTarget && (
                                                <circle
                                                    cx={a.x}
                                                    cy={a.y}
                                                    r={9 * zInv}
                                                    fill="rgba(16,185,129,0.22)"
                                                    stroke="#10b981"
                                                    strokeWidth={2 * zInv}
                                                />
                                            )}
                                            <rect
                                                x={a.x - 4 * zInv}
                                                y={a.y - 4 * zInv}
                                                width={8 * zInv}
                                                height={8 * zInv}
                                                fill={idx === 0 ? '#10b981' : '#ffffff'}
                                                stroke={idx === 0 ? '#065f46' : '#4f46e5'}
                                                strokeWidth={1.5 * zInv}
                                            />
                                        </g>
                                    );
                                })}
                            </svg>
                        </div>
                    )}

                    {/* Line Tool Interactive Canvas Overlay */}
                    {activeTool === 'line' && !effectivePan && (
                        <div
                            data-testid="line-canvas-overlay"
                            onPointerDown={(e) => {
                                if (e.button !== 0) return;
                                e.stopPropagation();
                                const pt = getArtboardCoords(e.clientX, e.clientY);
                                const next = { x1: pt.x, y1: pt.y, x2: pt.x, y2: pt.y };
                                lineDraftRef.current = next;
                                setLineDraft(next);
                                e.currentTarget.setPointerCapture?.(e.pointerId);
                            }}
                            onPointerMove={(e) => {
                                const draft = lineDraftRef.current;
                                if (!draft) return;
                                const rawPt = getArtboardCoords(e.clientX, e.clientY);
                                let x2 = rawPt.x;
                                let y2 = rawPt.y;
                                if (e.shiftKey) {
                                    const dx = x2 - draft.x1;
                                    const dy = y2 - draft.y1;
                                    const len = Math.hypot(dx, dy);
                                    const snappedAngle = Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) * (Math.PI / 4);
                                    x2 = draft.x1 + Math.cos(snappedAngle) * len;
                                    y2 = draft.y1 + Math.sin(snappedAngle) * len;
                                }
                                const updated = { ...draft, x2, y2 };
                                lineDraftRef.current = updated;
                                setLineDraft(updated);
                            }}
                            onPointerUp={(e) => {
                                const draft = lineDraftRef.current;
                                lineDraftRef.current = null;
                                setLineDraft(null);
                                try {
                                    e.currentTarget.releasePointerCapture?.(e.pointerId);
                                } catch {
                                    // ignore
                                }
                                if (draft && Math.hypot(draft.x2 - draft.x1, draft.y2 - draft.y1) >= 4) {
                                    onCommitLine?.({
                                        ...draft,
                                        stroke: lineConfig.stroke || '#1e293b',
                                        strokeWidth: lineConfig.strokeWidth || 4,
                                        style: lineConfig.style || 'solid',
                                    });
                                }
                            }}
                            onPointerCancel={() => {
                                lineDraftRef.current = null;
                                setLineDraft(null);
                            }}
                            className="absolute inset-0 z-20 cursor-crosshair select-none"
                        >
                            {lineDraft && (
                                <svg
                                    viewBox={`${workspaceBounds.minX} ${workspaceBounds.minY} ${workspaceBounds.totalW} ${workspaceBounds.totalH}`}
                                    className="w-full h-full overflow-visible pointer-events-none"
                                >
                                    <line
                                        x1={lineDraft.x1}
                                        y1={lineDraft.y1}
                                        x2={lineDraft.x2}
                                        y2={lineDraft.y2}
                                        stroke={lineConfig.stroke || '#1e293b'}
                                        strokeWidth={Math.max(1.5, lineConfig.strokeWidth || 4)}
                                        strokeLinecap="round"
                                        strokeDasharray={
                                            lineConfig.style === 'dashed'
                                                ? `${Math.max(8, (lineConfig.strokeWidth || 4) * 3)} ${Math.max(6, (lineConfig.strokeWidth || 4) * 2)}`
                                                : lineConfig.style === 'dotted'
                                                ? `${Math.max(1.5, lineConfig.strokeWidth || 4)} ${Math.max(4, (lineConfig.strokeWidth || 4) * 1.8)}`
                                                : undefined
                                        }
                                    />
                                    <circle
                                        cx={lineDraft.x1}
                                        cy={lineDraft.y1}
                                        r={4 / Math.max(0.25, zoom)}
                                        fill="#06b6d4"
                                        stroke="#ffffff"
                                        strokeWidth={1.5 / Math.max(0.25, zoom)}
                                    />
                                    <circle
                                        cx={lineDraft.x2}
                                        cy={lineDraft.y2}
                                        r={4 / Math.max(0.25, zoom)}
                                        fill="#06b6d4"
                                        stroke="#ffffff"
                                        strokeWidth={1.5 / Math.max(0.25, zoom)}
                                    />
                                </svg>
                            )}
                        </div>
                    )}

                    {/* Eraser Tool Interactive Canvas Overlay */}
                    {activeTool === 'eraser' && !effectivePan && (
                        <div
                            data-testid="eraser-canvas-overlay"
                            onPointerDown={(e) => {
                                if (e.button !== 0) return;
                                e.stopPropagation();
                                eraserActiveRef.current = true;
                                const pt = getArtboardCoords(e.clientX, e.clientY);
                                setEraserCursor(pt);
                                onEraseStart?.(pt.x, pt.y);
                                e.currentTarget.setPointerCapture?.(e.pointerId);
                            }}
                            onPointerMove={(e) => {
                                const pt = getArtboardCoords(e.clientX, e.clientY);
                                setEraserCursor(pt);
                                if (eraserActiveRef.current) {
                                    onEraseMove?.(pt.x, pt.y);
                                }
                            }}
                            onPointerUp={(e) => {
                                if (eraserActiveRef.current) {
                                    eraserActiveRef.current = false;
                                    onEraseEnd?.();
                                    try {
                                        e.currentTarget.releasePointerCapture?.(e.pointerId);
                                    } catch {
                                        // ignore
                                    }
                                }
                            }}
                            onPointerLeave={() => {
                                if (!eraserActiveRef.current) setEraserCursor(null);
                            }}
                            onPointerCancel={() => {
                                if (eraserActiveRef.current) {
                                    eraserActiveRef.current = false;
                                    onEraseEnd?.();
                                }
                                setEraserCursor(null);
                            }}
                            style={{
                                top: `${-pasteboardPad}px`,
                                left: `${-pasteboardPad}px`,
                                width: `${displayW + pasteboardPad * 2}px`,
                                height: `${displayH + pasteboardPad * 2}px`,
                            }}
                            className={`absolute z-20 ${
                                eraserSelectionLocked ? 'cursor-not-allowed' : 'cursor-none'
                            } select-none overflow-hidden`}
                        >
                            {eraserCursor && (
                                <div
                                    data-testid="eraser-cursor-ring"
                                    data-locked={eraserSelectionLocked ? 'true' : 'false'}
                                    style={{
                                        width: `${Math.max(eraserSelectionLocked ? 22 : 8, eraserConfig.size * zoom)}px`,
                                        height: `${Math.max(eraserSelectionLocked ? 22 : 8, eraserConfig.size * zoom)}px`,
                                        left: `${(eraserCursor.x - workspaceBounds.minX) * zoom + pasteboardPad}px`,
                                        top: `${(eraserCursor.y - workspaceBounds.minY) * zoom + pasteboardPad}px`,
                                    }}
                                    className={`pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2 flex items-center justify-center ${
                                        eraserSelectionLocked
                                            ? 'border-red-600 bg-red-500/20 shadow-[0_0_0_1px_rgba(255,255,255,0.9)]'
                                            : 'border-rose-500 bg-rose-500/15 shadow-[0_0_0_1px_rgba(255,255,255,0.85)]'
                                    }`}
                                >
                                    {eraserSelectionLocked && (
                                        <Ban
                                            data-testid="eraser-locked-icon"
                                            style={{
                                                width: `${Math.max(12, Math.min(28, eraserConfig.size * zoom * 0.55))}px`,
                                                height: `${Math.max(12, Math.min(28, eraserConfig.size * zoom * 0.55))}px`,
                                            }}
                                            className="text-red-600 drop-shadow-[0_1px_1px_rgba(255,255,255,0.9)]"
                                        />
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Centered Canvas Size Preview Circles while adjusting Brush Weight or Eraser Size */}
                    {activeTool === 'draw' && brushPreviewActive && (
                        <div
                            data-testid="draw-weight-preview-circle"
                            className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-30 rounded-full transition-[width,height] duration-75"
                            style={{
                                width: `${Math.max(4, effectiveBrushDiameter * zoom)}px`,
                                height: `${Math.max(4, effectiveBrushDiameter * zoom)}px`,
                                backgroundColor: brushConfig.color || '#2563eb',
                                opacity: effectiveBrushOpacity,
                                boxShadow: '0 0 0 1.5px rgba(255,255,255,0.92), 0 0 0 2.5px rgba(15,23,42,0.35)',
                            }}
                        />
                    )}

                    {activeTool === 'eraser' && eraserPreviewActive && (
                        <div
                            data-testid="eraser-size-preview-circle"
                            className={`pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-30 rounded-full border-2 flex items-center justify-center transition-[width,height] duration-75 ${
                                eraserSelectionLocked
                                    ? 'border-red-600 bg-red-500/20 shadow-[0_0_0_1px_rgba(255,255,255,0.9)]'
                                    : 'border-rose-500 bg-rose-500/15 shadow-[0_0_0_1px_rgba(255,255,255,0.85)]'
                            }`}
                            style={{
                                width: `${Math.max(eraserSelectionLocked ? 22 : 8, eraserConfig.size * zoom)}px`,
                                height: `${Math.max(eraserSelectionLocked ? 22 : 8, eraserConfig.size * zoom)}px`,
                            }}
                        >
                            {eraserSelectionLocked && (
                                <Ban
                                    style={{
                                        width: `${Math.max(12, Math.min(28, eraserConfig.size * zoom * 0.55))}px`,
                                        height: `${Math.max(12, Math.min(28, eraserConfig.size * zoom * 0.55))}px`,
                                    }}
                                    className="text-red-600 drop-shadow-[0_1px_1px_rgba(255,255,255,0.9)]"
                                />
                            )}
                        </div>
                    )}

                    {/* Pan blocker overlay when Panning / Spacebar held */}
                    {effectivePan && (
                        <div
                            className="absolute z-20"
                            style={{
                                top: `${-pasteboardPad}px`,
                                left: `${-pasteboardPad}px`,
                                width: `${displayW + pasteboardPad * 2}px`,
                                height: `${displayH + pasteboardPad * 2}px`,
                            }}
                        />
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
                    hidden={
                        isTransforming ||
                        isPanning ||
                        activeTool === 'draw' ||
                        activeTool === 'eraser' ||
                        activeTool === 'pen' ||
                        activeTool === 'line'
                    }
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
                    onPlacementChange={onFloatingToolbarPlacementChange}
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

            {/* Bottom Artboards & Page Strip + Zoom Controls */}
            <footer className="h-11 shrink-0 bg-white/95 dark:bg-slate-900/95 border-t border-slate-200 dark:border-slate-800 px-3 flex items-center justify-between gap-3 select-none z-20 transition-colors">
                {/* Multi-Artboard Controls (Same Canvas) */}
                <div className="flex items-center gap-1.5 overflow-x-auto py-1">
                    {stageArtboards.map((ab) => {
                        const isActive = ab.id === activeArtboardId;
                        return (
                            <div
                                key={ab.id}
                                data-testid={`footer-artboard-chip-${ab.id}`}
                                className={`inline-flex items-center rounded-lg border text-[11px] font-bold transition-colors shrink-0 ${
                                    isActive
                                        ? 'bg-blue-600/15 border-blue-500 text-blue-600 dark:text-blue-300'
                                        : 'bg-slate-100 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                }`}
                            >
                                <button
                                    type="button"
                                    onClick={() => onFocusArtboard?.(ab.id) ?? onSelectArtboard?.(ab.id)}
                                    onDoubleClick={() => onResizeArtboard?.(ab.id)}
                                    className="px-2.5 py-1 cursor-pointer inline-flex items-center gap-1.5"
                                >
                                    <Frame className="w-3 h-3 shrink-0 opacity-75" />
                                    <span>{ab.name}</span>
                                    <span className="text-[9px] font-mono opacity-65">
                                        {ab.width}×{ab.height}
                                    </span>
                                </button>
                                {isActive && (
                                    <button
                                        type="button"
                                        onClick={() => onDuplicateArtboard?.(ab.id)}
                                        data-tooltip="Duplicate Artboard"
                                        aria-label="Duplicate Artboard"
                                        className="p-1 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                                    >
                                        <Copy className="w-3 h-3" />
                                    </button>
                                )}
                                {stageArtboards.length > 1 && (
                                    <button
                                        type="button"
                                        onClick={() => onDeleteArtboard?.(ab.id)}
                                        data-tooltip="Remove Artboard"
                                        aria-label="Remove Artboard"
                                        className="pr-1.5 py-1 hover:text-rose-500 dark:hover:text-rose-400 cursor-pointer"
                                    >
                                        <Trash2 className="w-3 h-3" />
                                    </button>
                                )}
                            </div>
                        );
                    })}
                    <button
                        type="button"
                        data-testid="footer-add-artboard-btn"
                        onClick={() => onOpenNewArtboardModal?.()}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-950 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-700 dark:text-slate-200 cursor-pointer shrink-0"
                    >
                        <Plus className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" />
                        <span>Add Artboard</span>
                    </button>

                    {pages.length > 1 && (
                        <>
                            <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-1 shrink-0" />
                            {pages.map((p, idx) => (
                                <button
                                    key={p.id}
                                    type="button"
                                    onClick={() => onSwitchPage?.(idx)}
                                    className={`px-2 py-1 rounded-lg border text-[10px] font-bold cursor-pointer shrink-0 ${
                                        idx === activePageIdx
                                            ? 'bg-indigo-600/15 border-indigo-500 text-indigo-600 dark:text-indigo-300'
                                            : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-500'
                                    }`}
                                >
                                    P{idx + 1}
                                </button>
                            ))}
                        </>
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
