import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    Download,
    Maximize2,
    Plus,
    RotateCcw,
    Sliders,
    Trash2,
    UploadCloud,
    X,
    ZoomIn,
    ZoomOut,
} from 'lucide-react';

export function inferImageFormatFromFile(file, avifSupported = false) {
    const type = String(file?.type || '').toLowerCase();
    const name = String(file?.name || '').toLowerCase();

    if (type === 'image/jpeg' || type === 'image/jpg' || /\.jpe?g$/i.test(name)) {
        return { mime: 'image/jpeg', ext: 'jpg' };
    }
    if (type === 'image/webp' || /\.webp$/i.test(name)) {
        return { mime: 'image/webp', ext: 'webp' };
    }
    if ((type === 'image/avif' || /\.avif$/i.test(name)) && avifSupported) {
        return { mime: 'image/avif', ext: 'avif' };
    }
    return { mime: 'image/png', ext: 'png' };
}

export function useStudioViewport({
    minZoom = 0.05,
    maxZoom = 8,
    initialZoom = 1,
    enablePan = true,
} = {}) {
    const stageElRef = useRef(null);
    const [stageEl, setStageEl] = useState(null);
    const stageRef = useCallback((node) => {
        stageElRef.current = node;
        setStageEl(node);
    }, []);
    const [zoom, setZoom] = useState(initialZoom);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [isPanning, setIsPanning] = useState(false);

    const zoomRef = useRef(initialZoom);
    const panRef = useRef({ x: 0, y: 0 });
    const panMovedRef = useRef(false);
    const panSessionRef = useRef({
        active: false,
        startX: 0,
        startY: 0,
        baseX: 0,
        baseY: 0,
    });

    zoomRef.current = zoom;
    panRef.current = pan;

    const clampZoom = useCallback(
        (z) => Math.max(minZoom, Math.min(maxZoom, Number(z.toFixed(3)))),
        [minZoom, maxZoom]
    );

    const zoomAroundClientPoint = useCallback(
        (nextZoomRaw, clientX = null, clientY = null) => {
            const prevZoom = zoomRef.current;
            const nextZoom = clampZoom(nextZoomRaw);
            if (nextZoom === prevZoom) return;

            const ratio = nextZoom / prevZoom;
            let mx = 0;
            let my = 0;
            if (clientX !== null && clientY !== null && stageElRef.current) {
                const rect = stageElRef.current.getBoundingClientRect();
                mx = clientX - (rect.left + rect.width / 2);
                my = clientY - (rect.top + rect.height / 2);
            }

            const prevPan = panRef.current;
            const nextPan = {
                x: mx - (mx - prevPan.x) * ratio,
                y: my - (my - prevPan.y) * ratio,
            };
            zoomRef.current = nextZoom;
            panRef.current = nextPan;
            setZoom(nextZoom);
            setPan(nextPan);
        },
        [clampZoom]
    );

    const zoomIn = useCallback(() => {
        zoomAroundClientPoint(zoomRef.current * 1.2);
    }, [zoomAroundClientPoint]);

    const zoomOut = useCallback(() => {
        zoomAroundClientPoint(zoomRef.current / 1.2);
    }, [zoomAroundClientPoint]);

    const resetView = useCallback(() => {
        zoomRef.current = initialZoom;
        panRef.current = { x: 0, y: 0 };
        setZoom(initialZoom);
        setPan({ x: 0, y: 0 });
    }, [initialZoom]);

    const setActualSize = useCallback(() => {
        zoomRef.current = 1;
        panRef.current = { x: 0, y: 0 };
        setZoom(1);
        setPan({ x: 0, y: 0 });
    }, []);

    const fitToContent = useCallback(
        (contentWidth, contentHeight, options = {}) => {
            const { padding = null, allowUpscale = true } =
                typeof options === 'number' ? { padding: options, allowUpscale: true } : options;
            if (!stageElRef.current || !contentWidth || !contentHeight) {
                resetView();
                return false;
            }
            const rect = stageElRef.current.getBoundingClientRect();
            if (rect.width < 20 || rect.height < 20) {
                return false;
            }
            const resolvedPadding = padding ?? (rect.height < 260 ? 24 : 48);
            const availW = Math.max(40, rect.width - resolvedPadding);
            const availH = Math.max(40, rect.height - resolvedPadding);
            const rawRatio = Math.min(availW / contentWidth, availH / contentHeight);
            const targetRatio = allowUpscale ? rawRatio : Math.min(1, rawRatio);
            const fit = clampZoom(targetRatio);
            zoomRef.current = fit;
            panRef.current = { x: 0, y: 0 };
            setZoom(fit);
            setPan({ x: 0, y: 0 });
            return true;
        },
        [clampZoom, resetView]
    );

    useEffect(() => {
        if (!stageEl) return undefined;

        const onWheel = (e) => {
            e.preventDefault();
            e.stopPropagation();
            const factor = Math.exp(-e.deltaY * 0.0016);
            zoomAroundClientPoint(zoomRef.current * factor, e.clientX, e.clientY);
        };

        stageEl.addEventListener('wheel', onWheel, { passive: false });
        return () => {
            stageEl.removeEventListener('wheel', onWheel);
        };
    }, [stageEl, zoomAroundClientPoint]);

    useEffect(() => {
        const handleMove = (e) => {
            if (!panSessionRef.current.active) return;
            const dx = e.clientX - panSessionRef.current.startX;
            const dy = e.clientY - panSessionRef.current.startY;
            if (Math.hypot(dx, dy) > 4) {
                panMovedRef.current = true;
            }
            const nextPan = {
                x: panSessionRef.current.baseX + dx,
                y: panSessionRef.current.baseY + dy,
            };
            panRef.current = nextPan;
            setPan(nextPan);
        };

        const handleUp = () => {
            if (!panSessionRef.current.active) return;
            panSessionRef.current.active = false;
            setIsPanning(false);
        };

        window.addEventListener('pointermove', handleMove);
        window.addEventListener('pointerup', handleUp);
        window.addEventListener('pointercancel', handleUp);
        return () => {
            window.removeEventListener('pointermove', handleMove);
            window.removeEventListener('pointerup', handleUp);
            window.removeEventListener('pointercancel', handleUp);
        };
    }, []);

    const handleStagePointerDown = useCallback(
        (e, options = {}) => {
            panMovedRef.current = false;
            const allowMiddle = e.button === 1;
            const forcePan = options.forcePan === true;
            if (!allowMiddle && e.button !== 0) return false;
            if (!allowMiddle && !enablePan && !forcePan) return false;

            const interactive = e.target?.closest?.(
                'button, a, input, select, textarea, [role="slider"], [data-canvas-tool="true"], [data-no-pan="true"]'
            );
            if (interactive && !allowMiddle) {
                return false;
            }

            if (e.cancelable) e.preventDefault();
            panSessionRef.current = {
                active: true,
                startX: e.clientX,
                startY: e.clientY,
                baseX: panRef.current.x,
                baseY: panRef.current.y,
            };
            setIsPanning(true);
            return true;
        },
        [enablePan]
    );

    return {
        stageRef,
        stageEl,
        stageElRef,
        zoom,
        setZoom: (z) => zoomAroundClientPoint(z),
        pan,
        setPan,
        isPanning,
        panMovedRef,
        zoomIn,
        zoomOut,
        resetView,
        setActualSize,
        fitToContent,
        handleStagePointerDown,
    };
}

export const CHECKER_BG_STYLE = {
    backgroundImage:
        'linear-gradient(45deg, rgba(148,163,184,0.16) 25%, transparent 25%), linear-gradient(-45deg, rgba(148,163,184,0.16) 25%, transparent 25%), linear-gradient(45deg, transparent 75%, rgba(148,163,184,0.16) 75%), linear-gradient(-45deg, transparent 75%, rgba(148,163,184,0.16) 75%)',
    backgroundSize: '18px 18px',
    backgroundPosition: '0 0, 0 9px, 9px -9px, -9px 0px',
};

function isFileDragEvent(e) {
    const types = e.dataTransfer?.types;
    return (types && Array.from(types).includes('Files')) || (e.dataTransfer?.files?.length || 0) > 0;
}

/**
 * Shared nested-safe drag-and-drop hook for studio overlays & summary cards.
 */
export function useStudioFileDrop({ disabled = false, onFiles } = {}) {
    const dragDepthRef = useRef(0);
    const [isFileDragging, setIsFileDragging] = useState(false);

    const reset = () => {
        dragDepthRef.current = 0;
        setIsFileDragging(false);
    };

    const dragProps = {
        onDragEnter: (e) => {
            if (disabled || !isFileDragEvent(e)) return;
            e.preventDefault();
            e.stopPropagation();
            dragDepthRef.current += 1;
            setIsFileDragging(true);
        },
        onDragOver: (e) => {
            if (disabled || !isFileDragEvent(e)) return;
            e.preventDefault();
            e.stopPropagation();
            if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
            if (!isFileDragging) setIsFileDragging(true);
        },
        onDragLeave: (e) => {
            if (!isFileDragEvent(e)) return;
            e.preventDefault();
            e.stopPropagation();
            dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
            if (dragDepthRef.current === 0) {
                setIsFileDragging(false);
            }
        },
        onDrop: (e) => {
            e.preventDefault();
            e.stopPropagation();
            reset();
            if (disabled) return;
            if (e.dataTransfer?.files?.length) {
                onFiles?.(e.dataTransfer.files);
            }
        },
    };

    return { isFileDragging, dragProps, resetDrag: reset };
}

/**
 * Initial dashed drop zone displayed before files are loaded.
 */
export function StudioInitialDropZone({
    icon: Icon = UploadCloud,
    title,
    subtitle,
    onFiles,
    onClick,
    extraActions = null,
}) {
    const [isDragging, setIsDragging] = useState(false);

    return (
        <div
            onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                if (e.dataTransfer?.files?.length) onFiles?.(e.dataTransfer.files);
            }}
            onClick={onClick}
            className={`border-2 border-dashed rounded-2xl p-10 sm:p-14 text-center cursor-pointer transition-all space-y-3 ${
                isDragging
                    ? 'border-blue-500 bg-blue-500/10 scale-[1.01]'
                    : 'border-card-border hover:border-blue-500/50 bg-card-bg'
            }`}
        >
            <div className="w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/25 flex items-center justify-center text-blue-500 mx-auto">
                <Icon className="w-7 h-7" />
            </div>
            <div className="text-base sm:text-lg font-bold text-foreground">{title}</div>
            {subtitle && <p className="text-xs text-foreground/55 max-w-xl mx-auto">{subtitle}</p>}
            {extraActions && (
                <div
                    onClick={(e) => e.stopPropagation()}
                    className="pt-2 flex flex-wrap items-center justify-center gap-2"
                >
                    {extraActions}
                </div>
            )}
        </div>
    );
}

/**
 * Compact queue/status card displayed on the page when the user closes the popup studio.
 * Also accepts dropped files directly to add/open the studio again.
 */
export function StudioClosedSummaryBar({
    thumbs = [],
    fallbackIcon: FallbackIcon = Sliders,
    title,
    subtitle,
    onAddClick,
    addLabel = 'Add Images',
    onOpenStudio,
    openLabel = 'Open Live Studio',
    onPrimaryAction,
    primaryLabel,
    primaryIcon: PrimaryIcon = Download,
    primaryDisabled = false,
    onClear,
    clearLabel = 'Clear studio',
    onFilesDrop,
}) {
    const { isFileDragging, dragProps } = useStudioFileDrop({
        onFiles: onFilesDrop,
    });

    return (
        <div
            {...(onFilesDrop ? dragProps : {})}
            className={`border rounded-2xl p-5 sm:p-6 shadow-xl flex flex-wrap items-center justify-between gap-4 transition-colors ${
                isFileDragging
                    ? 'bg-blue-500/10 border-blue-500 border-dashed'
                    : 'bg-card-bg border-card-border'
            }`}
        >
            <div className="flex items-center gap-3.5 min-w-0">
                {thumbs.length > 0 ? (
                    <div className="flex -space-x-2 shrink-0">
                        {thumbs.slice(0, 3).map((t, idx) => (
                            <img
                                key={t.id || idx}
                                src={t.url}
                                alt={t.name || ''}
                                className="w-11 h-11 rounded-xl border-2 border-card-bg object-cover bg-background"
                            />
                        ))}
                    </div>
                ) : (
                    <div className="w-11 h-11 rounded-xl bg-blue-500/10 border border-blue-500/25 flex items-center justify-center text-blue-500 shrink-0">
                        <FallbackIcon className="w-5 h-5" />
                    </div>
                )}

                <div className="min-w-0">
                    <div className="text-sm font-bold text-foreground truncate max-w-[300px] sm:max-w-[420px]">
                        {title}
                    </div>
                    {subtitle && (
                        <div className="text-xs text-foreground/60 mt-0.5 truncate max-w-[320px] sm:max-w-[480px]">
                            {subtitle}
                        </div>
                    )}
                </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
                {onAddClick && (
                    <button
                        type="button"
                        onClick={onAddClick}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-background hover:bg-card-header-bg border border-card-border hover:border-blue-500/40 text-xs font-bold text-foreground cursor-pointer transition-colors"
                    >
                        <Plus className="w-4 h-4 text-blue-500" />
                        <span>{addLabel}</span>
                    </button>
                )}

                {onOpenStudio && (
                    <button
                        type="button"
                        onClick={onOpenStudio}
                        className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-background hover:bg-card-header-bg border border-card-border hover:border-blue-500/40 text-xs font-bold text-foreground cursor-pointer transition-colors"
                    >
                        <Sliders className="w-4 h-4 text-blue-500" />
                        <span>{openLabel}</span>
                    </button>
                )}

                {onPrimaryAction && primaryLabel && (
                    <button
                        type="button"
                        disabled={primaryDisabled}
                        onClick={onPrimaryAction}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-600/25 cursor-pointer disabled:opacity-50 transition-colors"
                    >
                        <PrimaryIcon className="w-4 h-4" />
                        <span>{primaryLabel}</span>
                    </button>
                )}

                {onClear && (
                    <button
                        type="button"
                        onClick={onClear}
                        aria-label={clearLabel}
                        className="p-2.5 rounded-xl border border-card-border text-foreground/60 hover:text-rose-500 hover:border-rose-500/40 cursor-pointer transition-colors"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                )}
            </div>
        </div>
    );
}

/**
 * Full-width live editor popup modal frame shared across utility & dev studios.
 * Handles Escape-to-close, backdrop-click close, drag-and-drop file capture, and uniform header/2-col body.
 */
export function StudioModalFrame({
    open,
    onClose,
    busy = false,
    ariaLabel,
    icon: Icon = Sliders,
    title,
    badges = null,
    subtitle,
    headerActions = null,
    topSubBar = null,
    onFilesDrop,
    dropOverlayTitle = 'Drop files to add to studio',
    dropOverlaySubtitle = 'Your active studio settings will apply right away',
    leftSidebar = null,
    rightStage = null,
    singleColumnContent = null,
}) {
    const { isFileDragging, dragProps } = useStudioFileDrop({
        disabled: busy || !onFilesDrop,
        onFiles: onFilesDrop,
    });

    useEffect(() => {
        if (!open) return;
        const onKeyDown = (e) => {
            if (e.key === 'Escape' && !busy) {
                onClose?.();
            }
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [open, busy, onClose]);

    if (!open) return null;

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-label={ariaLabel}
            onClick={() => !busy && onClose?.()}
            {...(onFilesDrop ? dragProps : {})}
            className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-2 sm:p-3"
        >
            <div
                onClick={(e) => e.stopPropagation()}
                className="relative w-full max-w-none h-[95vh] bg-card-bg border border-card-border rounded-2xl shadow-2xl flex flex-col overflow-hidden"
            >
                {isFileDragging && onFilesDrop && (
                    <div className="pointer-events-none absolute inset-0 z-30 bg-blue-600/15 backdrop-blur-[2px] border-2 border-dashed border-blue-500 rounded-2xl flex items-center justify-center p-6">
                        <div className="bg-card-bg/95 border border-blue-500/40 rounded-2xl px-6 py-5 shadow-2xl text-center space-y-2 max-w-sm">
                            <div className="w-12 h-12 rounded-2xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-500 mx-auto">
                                <UploadCloud className="w-6 h-6" />
                            </div>
                            <div className="text-sm sm:text-base font-bold text-foreground">
                                {dropOverlayTitle}
                            </div>
                            {dropOverlaySubtitle && (
                                <p className="text-xs text-foreground/60">{dropOverlaySubtitle}</p>
                            )}
                        </div>
                    </div>
                )}

                {/* Modal Header */}
                <div className="px-4 sm:px-5 py-3 border-b border-card-border flex flex-wrap items-center justify-between gap-3 shrink-0">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/25 flex items-center justify-center text-blue-500 shrink-0">
                            <Icon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="font-bold text-sm text-foreground truncate max-w-[200px] sm:max-w-[300px]">
                                    {title}
                                </h3>
                                {badges}
                            </div>
                            {subtitle && (
                                <div className="text-[11px] text-foreground/55 truncate max-w-[520px]">
                                    {subtitle}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        {headerActions}
                        <button
                            type="button"
                            disabled={busy}
                            onClick={onClose}
                            aria-label="Close studio"
                            className="p-1.5 rounded-lg text-foreground/60 hover:text-foreground hover:bg-background cursor-pointer disabled:opacity-40 transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {topSubBar}

                {singleColumnContent ? (
                    <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
                        {singleColumnContent}
                    </div>
                ) : (
                    <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
                        {leftSidebar && (
                            <div className="lg:col-span-4 xl:col-span-3 border-b lg:border-b-0 lg:border-r border-card-border overflow-y-auto p-4 sm:p-5 space-y-5 text-xs bg-background/40">
                                {leftSidebar}
                            </div>
                        )}
                        <div
                            className={`${
                                leftSidebar ? 'lg:col-span-8 xl:col-span-9' : 'lg:col-span-12'
                            } flex flex-col min-h-0 bg-background/30 overflow-hidden`}
                        >
                            {rightStage}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

/**
 * Reusable bottom filmstrip for batch studios (Compress, Resize, Round Corners, Palette, Metadata).
 */
export function StudioBatchFilmstrip({
    items = [],
    activeId,
    onSelect,
    onRemove,
    onAddClick,
    renderBadge,
    addLabel = 'Add / Drop',
}) {
    return (
        <div className="px-4 py-3 border-t border-card-border bg-card-bg/95 flex items-center gap-2.5 overflow-x-auto shrink-0">
            {items.map((it) => {
                const isActive = it.id === activeId;
                const isPending = it.status === 'pending';
                const isProcessing = it.status === 'processing';
                const isError = it.status === 'error';
                const isDone = it.status === 'done';
                const clampedPct = isDone
                    ? 100
                    : Math.max(0, Math.min(100, Math.round(it.progress ?? 0)));
                const deg = isError ? 360 : clampedPct * 3.6;
                const thumbSrc =
                    isDone && it.processedUrl ? it.processedUrl : it.thumbUrl || it.sourcePreviewUrl;
                const badge = !isPending && !isProcessing && renderBadge ? renderBadge(it) : null;

                const ringBackground = isError
                    ? 'linear-gradient(135deg, #f43f5e, #e11d48)'
                    : isPending
                      ? 'repeating-conic-gradient(from 0deg, rgba(148,163,184,0.32) 0deg 15deg, rgba(59,130,246,0.28) 15deg 30deg)'
                      : `conic-gradient(from 0deg, transparent 0deg var(--card-deg), var(--card-border) var(--card-deg) 360deg), conic-gradient(from 0deg, #10b981, #06b6d4, #3b82f6, #6366f1, #8b5cf6, #ec4899, #10b981)`;

                return (
                    <div
                        key={it.id}
                        title={it.name}
                        onClick={() => onSelect?.(it.id)}
                        style={{
                            '--card-deg': `${deg}deg`,
                            backgroundImage: ringBackground,
                        }}
                        className={`batch-perimeter-ring relative group shrink-0 w-[74px] h-[74px] rounded-[14px] p-[5px] cursor-pointer transition-all ${
                            isPending ? 'batch-waiting-ring' : ''
                        } ${isProcessing ? 'shadow-[0_0_18px_rgba(59,130,246,0.4)]' : ''} ${
                            isDone ? 'batch-perimeter-ring--done' : ''
                        } ${
                            isActive
                                ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-card-bg opacity-100'
                                : 'opacity-90 hover:opacity-100'
                        }`}
                    >
                        <div className="relative w-full h-full rounded-[9px] bg-card-bg overflow-hidden">
                            <img
                                src={thumbSrc}
                                alt={it.name}
                                className={`w-full h-full object-cover block transition-all duration-300 ${
                                    isPending
                                        ? 'grayscale opacity-40 scale-95'
                                        : isProcessing
                                          ? 'grayscale-[30%] opacity-70'
                                          : 'opacity-100'
                                }`}
                            />

                            {/* Waiting / Queued Diagonal Frosted Sheen (matches converter grid view) */}
                            {isPending && (
                                <div
                                    aria-hidden="true"
                                    className="absolute inset-0 z-10 pointer-events-none overflow-hidden bg-slate-950/15 dark:bg-slate-950/35"
                                >
                                    <div className="batch-waiting-sheen absolute inset-y-0 w-1/2 bg-gradient-to-r from-transparent via-white/25 dark:via-blue-300/15 to-transparent" />
                                </div>
                            )}

                            {/* Active processing pill */}
                            {isProcessing && (
                                <span className="absolute top-1 left-1 z-20 px-1.5 py-0.5 rounded-full text-[9px] font-bold font-mono leading-none bg-blue-600/95 text-white shadow">
                                    {Math.max(5, clampedPct)}%
                                </span>
                            )}

                            {badge && (
                                <span
                                    className={`absolute top-1 left-1 z-20 px-1.5 py-0.5 rounded-full text-[9px] font-bold font-mono leading-none shadow-sm ${
                                        badge.tone === 'danger'
                                            ? 'bg-rose-600 text-white'
                                            : badge.tone === 'warning'
                                              ? 'bg-amber-500 text-slate-950'
                                              : badge.tone === 'success'
                                                ? 'bg-emerald-600 text-white'
                                                : 'bg-slate-950/80 text-white'
                                    }`}
                                >
                                    {badge.text}
                                </span>
                            )}

                            {onRemove && (
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onRemove(it.id);
                                    }}
                                    aria-label={`Remove ${it.name}`}
                                    className="absolute top-1 right-1 z-30 w-4 h-4 rounded-full bg-slate-950/75 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                                >
                                    <X className="w-2.5 h-2.5" />
                                </button>
                            )}
                        </div>
                    </div>
                );
            })}

            {onAddClick && (
                <button
                    type="button"
                    onClick={onAddClick}
                    title="Click or drop images anywhere in the studio to add"
                    className="shrink-0 w-[74px] h-[74px] rounded-[14px] border-2 border-dashed border-card-border hover:border-blue-500/60 bg-background/50 flex flex-col items-center justify-center gap-1 text-[10px] font-bold text-foreground/65 hover:text-blue-500 cursor-pointer transition-colors"
                >
                    <Plus className="w-4 h-4" />
                    <span>{addLabel}</span>
                </button>
            )}
        </div>
    );
}


export function StudioViewportStage({
    viewport: externalViewport = null,
    contentWidth = 0,
    contentHeight = 0,
    autoFitKey = null,
    enablePan = true,
    showBackdropToggle = true,
    initialBackdrop = 'checker',
    backdrop: controlledBackdrop,
    onBackdropChange,
    topLeftOverlay = null,
    extraToolbar = null,
    rightVerticalToolbar = null,
    footerHint = null,
    cursorClass = null,
    className = '',
    innerClassName = '',
    onStagePointerDown,
    children,
}) {
    const internalViewport = useStudioViewport({ enablePan });
    const vp = externalViewport || internalViewport;
    const [localBackdrop, setLocalBackdrop] = useState(initialBackdrop);
    const activeBackdrop = controlledBackdrop ?? localBackdrop;
    const setBackdrop = onBackdropChange || setLocalBackdrop;
    const appliedAutoFitRef = useRef(null);

    // Auto-fit images larger than canvas cleanly; keep smaller images crisp at 100% actual pixels
    useEffect(() => {
        if (!autoFitKey || !vp.stageEl || contentWidth <= 0 || contentHeight <= 0) {
            return undefined;
        }
        if (appliedAutoFitRef.current === autoFitKey) {
            return undefined;
        }
        const raf = requestAnimationFrame(() => {
            const fitted = vp.fitToContent(contentWidth, contentHeight, { allowUpscale: false });
            if (fitted) {
                appliedAutoFitRef.current = autoFitKey;
            }
        });
        return () => cancelAnimationFrame(raf);
    }, [autoFitKey, vp.stageEl, contentWidth, contentHeight, vp.fitToContent]);

    useEffect(() => {
        if (!autoFitKey) {
            appliedAutoFitRef.current = null;
        }
    }, [autoFitKey]);

    const stageStyle =
        activeBackdrop === 'light'
            ? { backgroundColor: '#f8fafc' }
            : activeBackdrop === 'dark'
              ? { backgroundColor: '#0f172a' }
              : CHECKER_BG_STYLE;

    const resolvedCursor =
        cursorClass ||
        (enablePan ? (vp.isPanning ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-default');

    const handlePointerDown = (e) => {
        if (onStagePointerDown) {
            const handled = onStagePointerDown(e, vp);
            if (handled === true) return;
        }
        vp.handleStagePointerDown(e);
    };

    return (
        <div
            ref={vp.stageRef}
            onPointerDown={handlePointerDown}
            data-studio-stage="true"
            className={`relative flex-1 min-h-0 overflow-hidden select-none flex items-center justify-center ${resolvedCursor} ${className}`}
            style={{ ...stageStyle, touchAction: 'none' }}
        >
            {topLeftOverlay && (
                <div
                    data-no-pan="true"
                    className="absolute top-3 left-3 z-20 flex flex-wrap items-center gap-1.5"
                >
                    {topLeftOverlay}
                </div>
            )}

            <div
                data-no-pan="true"
                className="pointer-events-none absolute top-3 right-3 z-20 flex flex-col items-end gap-2 max-w-[calc(100%-24px)]"
            >
                <div className="pointer-events-auto flex flex-wrap items-center gap-1 bg-card-bg/92 backdrop-blur-md border border-card-border rounded-xl p-1 shadow-lg text-[11px]">
                    {extraToolbar}

                    {showBackdropToggle && (
                        <div className="flex items-center gap-0.5 pr-1 mr-0.5 border-r border-card-border">
                            {[
                                { id: 'checker', label: 'Alpha', title: 'Checkerboard transparent backdrop' },
                                { id: 'light', label: 'White', title: 'White preview backdrop' },
                                { id: 'dark', label: 'Dark', title: 'Dark preview backdrop' },
                            ].map((opt) => (
                                <button
                                    key={opt.id}
                                    type="button"
                                    title={opt.title}
                                    onClick={() => setBackdrop(opt.id)}
                                    className={`px-2 py-1 rounded-lg font-semibold cursor-pointer transition-colors ${
                                        activeBackdrop === opt.id
                                            ? 'bg-blue-500/15 text-blue-500'
                                            : 'text-foreground/65 hover:text-foreground hover:bg-background/60'
                                    }`}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    )}

                    <button
                        type="button"
                        onClick={vp.zoomOut}
                        title="Zoom out"
                        aria-label="Zoom out"
                        className="p-1.5 rounded-lg text-foreground/75 hover:text-foreground hover:bg-background cursor-pointer"
                    >
                        <ZoomOut className="w-3.5 h-3.5" />
                    </button>
                    <button
                        type="button"
                        onClick={vp.setActualSize}
                        title="Reset to 100% actual zoom"
                        className="px-2 py-1 rounded-lg font-mono font-bold text-foreground/85 hover:bg-background cursor-pointer min-w-[46px] text-center"
                    >
                        {Math.round(vp.zoom * 100)}%
                    </button>
                    <button
                        type="button"
                        onClick={vp.zoomIn}
                        title="Zoom in"
                        aria-label="Zoom in"
                        className="p-1.5 rounded-lg text-foreground/75 hover:text-foreground hover:bg-background cursor-pointer"
                    >
                        <ZoomIn className="w-3.5 h-3.5" />
                    </button>

                    {contentWidth > 0 && contentHeight > 0 && (
                        <button
                            type="button"
                            onClick={() => vp.fitToContent(contentWidth, contentHeight, { allowUpscale: true })}
                            title="Fit image inside canvas"
                            className="px-2 py-1 rounded-lg font-semibold text-foreground/75 hover:text-foreground hover:bg-background cursor-pointer flex items-center gap-1"
                        >
                            <Maximize2 className="w-3 h-3" />
                            <span>Fit</span>
                        </button>
                    )}

                    {(Math.abs(vp.zoom - 1) > 0.01 || vp.pan.x !== 0 || vp.pan.y !== 0) && (
                        <button
                            type="button"
                            onClick={vp.resetView}
                            title="Reset to 100% actual size"
                            className="p-1.5 rounded-lg text-blue-500 hover:bg-blue-500/10 cursor-pointer"
                        >
                            <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>

                {rightVerticalToolbar && (
                    <div
                        role="toolbar"
                        aria-label="Canvas editing tools"
                        aria-orientation="vertical"
                        className="pointer-events-auto flex flex-col items-center gap-1 bg-card-bg/92 backdrop-blur-md border border-card-border rounded-xl p-1 shadow-lg"
                    >
                        {rightVerticalToolbar}
                    </div>
                )}
            </div>

            <div
                className={`shrink-0 flex items-center justify-center will-change-transform ${innerClassName}`}
                style={{
                    transform: `translate3d(${vp.pan.x}px, ${vp.pan.y}px, 0) scale(${vp.zoom})`,
                    transformOrigin: 'center center',
                }}
            >
                {children}
            </div>

            <div
                data-no-pan="true"
                className="pointer-events-none absolute bottom-3 left-3 z-20 px-2.5 py-1 rounded-lg bg-slate-950/75 text-white/90 text-[10px] font-medium backdrop-blur-sm flex items-center gap-2"
            >
                <span>Scroll to zoom · Drag to pan</span>
                {footerHint && (
                    <>
                        <span className="opacity-40">|</span>
                        <span>{footerHint}</span>
                    </>
                )}
            </div>
        </div>
    );
}
