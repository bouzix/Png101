import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Pipette, X } from 'lucide-react';
import { EDITOR_PANEL_TRANSITION, useAnimatedPresence } from './useAnimatedPresence';

const GRID_RADIUS = 5;
const GRID_SIZE = GRID_RADIUS * 2 + 1; // 11x11 pixels
const LOUPE_CANVAS_PX = 88;
const CELL_PX = LOUPE_CANVAS_PX / GRID_SIZE; // 8px per sampled pixel

const imgCanvasCache = new WeakMap();

function rgbToHex(r, g, b) {
    return (
        '#' +
        [r, g, b]
            .map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0'))
            .join('')
    );
}

function parseCssColor(colorStr) {
    if (!colorStr || typeof colorStr !== 'string') return null;
    const m = colorStr.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?\s*\)/i);
    if (!m) return null;
    const alpha = m[4] === undefined ? 1 : Number(m[4]);
    if (alpha <= 0.01) return null;
    return [Number(m[1]), Number(m[2]), Number(m[3]), Math.round(alpha * 255)];
}

function getCachedImgCanvas(imgEl, width, height, objectFit) {
    const w = Math.max(1, Math.round(width));
    const h = Math.max(1, Math.round(height));
    const cached = imgCanvasCache.get(imgEl);
    if (
        cached &&
        cached.src === imgEl.currentSrc &&
        cached.w === w &&
        cached.h === h &&
        cached.fit === objectFit
    ) {
        return cached.canvas;
    }

    const offscreen = document.createElement('canvas');
    offscreen.width = w;
    offscreen.height = h;
    const ctx = offscreen.getContext('2d');
    if (!ctx) return null;

    const natW = imgEl.naturalWidth || w;
    const natH = imgEl.naturalHeight || h;

    try {
        if (objectFit === 'contain') {
            const scale = Math.min(w / natW, h / natH);
            const dw = natW * scale;
            const dh = natH * scale;
            ctx.drawImage(imgEl, (w - dw) / 2, (h - dh) / 2, dw, dh);
        } else if (objectFit === 'cover') {
            const scale = Math.max(w / natW, h / natH);
            const dw = natW * scale;
            const dh = natH * scale;
            ctx.drawImage(imgEl, (w - dw) / 2, (h - dh) / 2, dw, dh);
        } else {
            ctx.drawImage(imgEl, 0, 0, w, h);
        }
        imgCanvasCache.set(imgEl, {
            src: imgEl.currentSrc,
            w,
            h,
            fit: objectFit,
            canvas: offscreen,
        });
        return offscreen;
    } catch {
        return null;
    }
}

function readGridFromCanvas(sourceCanvas, cx, cy) {
    const ctx = sourceCanvas.getContext('2d');
    if (!ctx) return null;

    const grid = new Uint8ClampedArray(GRID_SIZE * GRID_SIZE * 4);
    const maxW = sourceCanvas.width;
    const maxH = sourceCanvas.height;

    const sx = cx - GRID_RADIUS;
    const sy = cy - GRID_RADIUS;
    const clippedLeft = Math.max(0, sx);
    const clippedTop = Math.max(0, sy);
    const clippedRight = Math.min(maxW, sx + GRID_SIZE);
    const clippedBottom = Math.min(maxH, sy + GRID_SIZE);

    if (clippedRight <= clippedLeft || clippedBottom <= clippedTop) {
        return { grid, center: [255, 255, 255, 0] };
    }

    try {
        const readW = clippedRight - clippedLeft;
        const readH = clippedBottom - clippedTop;
        const raw = ctx.getImageData(clippedLeft, clippedTop, readW, readH).data;

        for (let row = 0; row < readH; row += 1) {
            const dstY = row + (clippedTop - sy);
            for (let col = 0; col < readW; col += 1) {
                const dstX = col + (clippedLeft - sx);
                const srcIdx = (row * readW + col) * 4;
                const dstIdx = (dstY * GRID_SIZE + dstX) * 4;
                grid[dstIdx] = raw[srcIdx];
                grid[dstIdx + 1] = raw[srcIdx + 1];
                grid[dstIdx + 2] = raw[srcIdx + 2];
                grid[dstIdx + 3] = raw[srcIdx + 3];
            }
        }

        const cIdx = (GRID_RADIUS * GRID_SIZE + GRID_RADIUS) * 4;
        return {
            grid,
            center: [grid[cIdx], grid[cIdx + 1], grid[cIdx + 2], grid[cIdx + 3]],
        };
    } catch {
        return null;
    }
}

export function sampleEditorColorAtPoint(clientX, clientY) {
    if (typeof document === 'undefined') {
        return { hex: '#ffffff', grid: null, source: 'fallback' };
    }

    const stack = document.elementsFromPoint(clientX, clientY);
    const targetEls = stack.filter(
        (el) => !el.closest?.('[data-testid="editor-eyedropper-overlay"]')
    );

    for (const el of targetEls) {
        if (el.tagName === 'IMG' && el.complete && el.naturalWidth > 0) {
            const rect = el.getBoundingClientRect();
            if (rect.width > 0 && rect.height > 0) {
                const fit = window.getComputedStyle(el).objectFit || 'fill';
                const imgCanvas = getCachedImgCanvas(el, rect.width, rect.height, fit);
                if (imgCanvas) {
                    const px = Math.floor(clientX - rect.left);
                    const py = Math.floor(clientY - rect.top);
                    const sampled = readGridFromCanvas(imgCanvas, px, py);
                    if (sampled) {
                        const [r, g, b, a] = sampled.center;
                        const alphaNorm = a / 255;
                        const hex =
                            a === 0
                                ? '#ffffff'
                                : a === 255
                                  ? rgbToHex(r, g, b)
                                  : rgbToHex(
                                        r * alphaNorm + 255 * (1 - alphaNorm),
                                        g * alphaNorm + 255 * (1 - alphaNorm),
                                        b * alphaNorm + 255 * (1 - alphaNorm)
                                    );
                        return { hex, grid: sampled.grid, alpha: a, source: 'image' };
                    }
                }
            }
        }

        if (el.tagName === 'CANVAS') {
            let sampleCanvas = el;
            if (el.classList.contains('upper-canvas')) {
                const siblingLower = el.parentElement?.querySelector('canvas.lower-canvas');
                if (siblingLower) sampleCanvas = siblingLower;
            }
            const rect = sampleCanvas.getBoundingClientRect();
            if (rect.width > 0 && rect.height > 0) {
                const px = Math.floor(((clientX - rect.left) / rect.width) * sampleCanvas.width);
                const py = Math.floor(((clientY - rect.top) / rect.height) * sampleCanvas.height);
                const sampled = readGridFromCanvas(sampleCanvas, px, py);
                if (sampled) {
                    const [r, g, b, a] = sampled.center;
                    const alphaNorm = a / 255;
                    const hex =
                        a === 0
                            ? '#ffffff'
                            : a === 255
                              ? rgbToHex(r, g, b)
                              : rgbToHex(
                                    r * alphaNorm + 255 * (1 - alphaNorm),
                                    g * alphaNorm + 255 * (1 - alphaNorm),
                                    b * alphaNorm + 255 * (1 - alphaNorm)
                                );
                    return { hex, grid: sampled.grid, alpha: a, source: 'canvas' };
                }
            }
        }
    }

    // Fallback: inspect CSS backgroundColor of topmost DOM element under cursor
    for (const el of targetEls) {
        const parsed = parseCssColor(window.getComputedStyle(el).backgroundColor);
        if (parsed) {
            const [r, g, b] = parsed;
            const hex = rgbToHex(r, g, b);
            const grid = new Uint8ClampedArray(GRID_SIZE * GRID_SIZE * 4);
            for (let i = 0; i < grid.length; i += 4) {
                grid[i] = r;
                grid[i + 1] = g;
                grid[i + 2] = b;
                grid[i + 3] = 255;
            }
            return { hex, grid, alpha: 255, source: 'dom' };
        }
    }

    return { hex: '#ffffff', grid: null, alpha: 255, source: 'fallback' };
}

export default function EditorEyedropperOverlay({
    open = false,
    initialColor = '#ffffff',
    onPick,
    onCancel,
}) {
    const { rendered, visible } = useAnimatedPresence(open, 295);
    const loupeCanvasRef = useRef(null);
    const [pointerPos, setPointerPos] = useState(null);
    const [sample, setSample] = useState({ hex: initialColor, alpha: 255, source: 'init' });

    useEffect(() => {
        if (!open) {
            setPointerPos(null);
            return undefined;
        }
        setSample({ hex: initialColor, alpha: 255, source: 'init' });

        const onKeyDown = (e) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                e.stopPropagation();
                onCancel?.();
            }
        };
        document.addEventListener('keydown', onKeyDown, true);
        return () => document.removeEventListener('keydown', onKeyDown, true);
    }, [open, initialColor, onCancel]);

    const drawLoupe = (grid) => {
        const c = loupeCanvasRef.current;
        if (!c) return;
        const ctx = c.getContext('2d');
        if (!ctx) return;

        ctx.clearRect(0, 0, LOUPE_CANVAS_PX, LOUPE_CANVAS_PX);

        // Checkerboard backing for transparent canvas regions
        for (let row = 0; row < GRID_SIZE; row += 1) {
            for (let col = 0; col < GRID_SIZE; col += 1) {
                ctx.fillStyle = (row + col) % 2 === 0 ? '#e2e8f0' : '#ffffff';
                ctx.fillRect(col * CELL_PX, row * CELL_PX, CELL_PX, CELL_PX);

                if (grid) {
                    const idx = (row * GRID_SIZE + col) * 4;
                    const r = grid[idx];
                    const g = grid[idx + 1];
                    const b = grid[idx + 2];
                    const a = grid[idx + 3];
                    if (a > 0) {
                        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${a / 255})`;
                        ctx.fillRect(col * CELL_PX, row * CELL_PX, CELL_PX, CELL_PX);
                    }
                }
            }
        }

        // Hairline pixel grid
        ctx.strokeStyle = 'rgba(15, 23, 42, 0.14)';
        ctx.lineWidth = 0.75;
        for (let i = 1; i < GRID_SIZE; i += 1) {
            const pos = i * CELL_PX;
            ctx.beginPath();
            ctx.moveTo(pos, 0);
            ctx.lineTo(pos, LOUPE_CANVAS_PX);
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(0, pos);
            ctx.lineTo(LOUPE_CANVAS_PX, pos);
            ctx.stroke();
        }

        // Center target pixel box
        const centerXY = GRID_RADIUS * CELL_PX;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.strokeRect(centerXY, centerXY, CELL_PX, CELL_PX);
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 1;
        ctx.strokeRect(centerXY - 0.5, centerXY - 0.5, CELL_PX + 1, CELL_PX + 1);
    };

    const updateFromCoords = (clientX, clientY) => {
        const res = sampleEditorColorAtPoint(clientX, clientY);
        setPointerPos({ x: clientX, y: clientY });
        setSample(res);
        drawLoupe(res.grid);
        return res;
    };

    if (!rendered || typeof document === 'undefined') {
        return null;
    }

    const vw = typeof window !== 'undefined' ? window.innerWidth : 1280;
    const vh = typeof window !== 'undefined' ? window.innerHeight : 720;
    const loupeW = 104;
    const loupeH = 128;
    const loupeLeft = pointerPos
        ? Math.min(vw - loupeW - 12, Math.max(12, pointerPos.x + 18))
        : -9999;
    const loupeTop = pointerPos
        ? pointerPos.y + 18 + loupeH > vh - 12
            ? Math.max(12, pointerPos.y - loupeH - 14)
            : pointerPos.y + 18
        : -9999;

    return createPortal(
        <div
            data-testid="editor-eyedropper-overlay"
            data-visible={visible ? 'true' : 'false'}
            onMouseMove={(e) => updateFromCoords(e.clientX, e.clientY)}
            onPointerMove={(e) => updateFromCoords(e.clientX, e.clientY)}
            onPointerDown={(e) => {
                if (e.target.closest?.('[data-testid="eyedropper-cancel-btn"]')) return;
                e.preventDefault();
                e.stopPropagation();
                if (e.button === 2) {
                    onCancel?.();
                    return;
                }
                if (e.button !== 0) return;
                const picked = updateFromCoords(e.clientX, e.clientY);
                onPick?.(picked.hex);
            }}
            onContextMenu={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onCancel?.();
            }}
            className={`fixed inset-0 z-[145] cursor-crosshair select-none transition-opacity duration-[200ms] ${
                visible ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
            }`}
        >
            {/* Top floating instruction pill */}
            <div className="fixed top-4 left-1/2 -translate-x-1/2 pointer-events-auto">
                <div
                    data-testid="eyedropper-banner"
                    className={`inline-flex items-center gap-2.5 px-3.5 py-2 rounded-2xl bg-slate-900/95 dark:bg-slate-950/95 text-white border border-slate-700/80 shadow-2xl text-xs origin-top ${EDITOR_PANEL_TRANSITION} ${
                        visible
                            ? 'opacity-100 translate-y-0 scale-100'
                            : 'opacity-0 -translate-y-3 scale-75'
                    }`}
                >
                    <span className="w-6 h-6 rounded-lg bg-blue-600/25 border border-blue-400/40 text-blue-300 flex items-center justify-center shrink-0">
                        <Pipette className="w-3.5 h-3.5" />
                    </span>
                    <span className="font-medium">
                        Click any uploaded image or canvas pixel to pick its color
                    </span>
                    <span
                        className="w-4 h-4 rounded border border-white/30 shrink-0"
                        style={{ backgroundColor: sample.hex }}
                    />
                    <span className="font-mono font-bold text-[11px] uppercase text-slate-200 w-[62px]">
                        {sample.hex}
                    </span>
                    <button
                        type="button"
                        data-testid="eyedropper-cancel-btn"
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                            e.stopPropagation();
                            onCancel?.();
                        }}
                        className="ml-1 inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-semibold cursor-pointer"
                    >
                        <X className="w-3 h-3" />
                        <span>Esc</span>
                    </button>
                </div>
            </div>

            {/* Live Magnifier Loupe following cursor */}
            {pointerPos && (
                <div
                    data-testid="eyedropper-loupe"
                    style={{ left: `${loupeLeft}px`, top: `${loupeTop}px`, width: `${loupeW}px` }}
                    className="fixed pointer-events-none rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-700 shadow-2xl p-1.5 flex flex-col items-center gap-1.5"
                >
                    <canvas
                        ref={loupeCanvasRef}
                        width={LOUPE_CANVAS_PX}
                        height={LOUPE_CANVAS_PX}
                        className="rounded-xl border border-slate-300 dark:border-slate-700 block"
                        style={{ width: `${LOUPE_CANVAS_PX}px`, height: `${LOUPE_CANVAS_PX}px`, imageRendering: 'pixelated' }}
                    />
                    <div className="w-full px-1 flex items-center justify-between gap-1 text-[10px] font-mono font-bold text-slate-800 dark:text-slate-100">
                        <span
                            className="w-3.5 h-3.5 rounded-full border border-black/15 dark:border-white/20 shrink-0"
                            style={{ backgroundColor: sample.hex }}
                        />
                        <span className="uppercase tracking-tight">
                            {sample.alpha === 0 ? 'EMPTY' : sample.hex}
                        </span>
                    </div>
                </div>
            )}
        </div>,
        document.body
    );
}
