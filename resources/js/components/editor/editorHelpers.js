import {
    Rect,
    Circle,
    Triangle,
    Polygon,
    Path,
    Line,
    Textbox,
    FabricImage,
    FabricObject,
    InteractiveFabricObject,
    Control,
    controlsUtils,
    Gradient,
    Shadow,
    filters,
    StaticCanvas,
    Point,
} from 'fabric';
import { buildZipBlob, extractColorPalette } from '../../lib/imageConverter';
import { ensureGoogleFontCss } from './googleFontsHelper';
import { makeArtboardBackgroundFill } from './artboardHelpers';

export const CUSTOM_PROPS = [
    'layerId',
    'layerName',
    'lockedLayer',
    'artboardId',
    'layerRole',
    'isPersistentGroup',
    'assetId',
    'frameShape',
    'stickerOutlineColor',
    'stickerOutlineSize',
    'shadowConfig',
    'glowConfig',
    'globalCompositeOperation',
    'filterState',
    'bgMeta',
    'eraserPaths',
];

export function buildBezierSvgPath(anchors = [], closed = false) {
    if (!Array.isArray(anchors) || anchors.length === 0) return '';
    const fmt = (n) => Number(n || 0).toFixed(2);
    const cmds = [`M ${fmt(anchors[0].x)} ${fmt(anchors[0].y)}`];
    for (let i = 1; i < anchors.length; i++) {
        const prev = anchors[i - 1];
        const cur = anchors[i];
        const cp1x = prev.x + (prev.outX || 0);
        const cp1y = prev.y + (prev.outY || 0);
        const cp2x = cur.x + (cur.inX || 0);
        const cp2y = cur.y + (cur.inY || 0);
        const isLine =
            (prev.outX || 0) === 0 &&
            (prev.outY || 0) === 0 &&
            (cur.inX || 0) === 0 &&
            (cur.inY || 0) === 0;
        if (isLine) {
            cmds.push(`L ${fmt(cur.x)} ${fmt(cur.y)}`);
        } else {
            cmds.push(`C ${fmt(cp1x)} ${fmt(cp1y)} ${fmt(cp2x)} ${fmt(cp2y)} ${fmt(cur.x)} ${fmt(cur.y)}`);
        }
    }
    if (closed && anchors.length > 1) {
        const last = anchors[anchors.length - 1];
        const first = anchors[0];
        const hasCurve =
            (last.outX || 0) !== 0 ||
            (last.outY || 0) !== 0 ||
            (first.inX || 0) !== 0 ||
            (first.inY || 0) !== 0;
        if (hasCurve) {
            cmds.push(
                `C ${fmt(last.x + (last.outX || 0))} ${fmt(last.y + (last.outY || 0))} ${fmt(first.x + (first.inX || 0))} ${fmt(first.y + (first.inY || 0))} ${fmt(first.x)} ${fmt(first.y)}`
            );
        }
        cmds.push('Z');
    }
    return cmds.join(' ');
}

export function uid(prefix = 'id') {
    return `${prefix}-${Math.random().toString(36).slice(2, 9)}-${Date.now().toString(36)}`;
}

export function createShadowItem(overrides = {}) {
    return {
        id: overrides.id || uid('sh'),
        name: typeof overrides.name === 'string' ? overrides.name : '',
        enabled: overrides.enabled !== false,
        type: overrides.type === 'inner' ? 'inner' : 'drop',
        blendMode: normalizeBlendMode(overrides.blendMode),
        color: overrides.color || '#000000',
        opacity:
            overrides.opacity !== undefined && overrides.opacity !== null
                ? Math.max(0, Math.min(1, Number(overrides.opacity)))
                : 0.45,
        blur: Math.max(0, Number(overrides.blur ?? 18)),
        offsetX: Number(overrides.offsetX ?? 0),
        offsetY: Number(overrides.offsetY ?? 8),
        spread: Math.max(0, Number(overrides.spread ?? 0)),
    };
}

export function createGlowItem(overrides = {}) {
    return {
        id: overrides.id || uid('gl'),
        name: typeof overrides.name === 'string' ? overrides.name : '',
        enabled: overrides.enabled !== false,
        type: overrides.type === 'inner' ? 'inner' : 'outer',
        blendMode: normalizeBlendMode(overrides.blendMode),
        color: overrides.color || '#3b82f6',
        opacity:
            overrides.opacity !== undefined && overrides.opacity !== null
                ? Math.max(0, Math.min(1, Number(overrides.opacity)))
                : 0.85,
        blur: Math.max(0, Number(overrides.blur ?? 24)),
        spread: Math.max(0, Number(overrides.spread ?? 6)),
    };
}

export const DEFAULT_SHADOW_CONFIG = {
    enabled: false,
    items: [],
};

export const DEFAULT_GLOW_CONFIG = {
    enabled: false,
    items: [],
};

export function hexToRgba(hex = '#000000', alpha = 1) {
    const raw = String(hex || '#000000').trim();
    if (raw.startsWith('rgb')) return raw;
    const clean = raw.replace('#', '');
    const full =
        clean.length === 3
            ? clean
                  .split('')
                  .map((c) => c + c)
                  .join('')
            : clean.padEnd(6, '0').slice(0, 6);
    const r = parseInt(full.slice(0, 2), 16) || 0;
    const g = parseInt(full.slice(2, 4), 16) || 0;
    const b = parseInt(full.slice(4, 6), 16) || 0;
    const a = Math.max(0, Math.min(1, Number.isFinite(Number(alpha)) ? Number(alpha) : 1));
    return `rgba(${r},${g},${b},${Number(a.toFixed(2))})`;
}

export function rgbaToHexAndAlpha(colorStr = '#000000') {
    const raw = String(colorStr || '').trim();
    if (raw.startsWith('#')) {
        return { hex: raw.length === 4 ? `#${raw[1]}${raw[1]}${raw[2]}${raw[2]}${raw[3]}${raw[3]}` : raw.slice(0, 7), opacity: 1 };
    }
    const m = raw.match(/rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)/i);
    if (!m) return { hex: '#000000', opacity: 0.45 };
    const toHex = (n) => Math.max(0, Math.min(255, Math.round(Number(n)))).toString(16).padStart(2, '0');
    return {
        hex: `#${toHex(m[1])}${toHex(m[2])}${toHex(m[3])}`,
        opacity: m[4] !== undefined ? Math.max(0, Math.min(1, Number(m[4]))) : 1,
    };
}

export function normalizeShadowConfig(raw) {
    if (!raw || typeof raw !== 'object') return { enabled: false, items: [] };
    if (Array.isArray(raw.items)) {
        return {
            enabled: Boolean(raw.enabled),
            items: raw.items.map((it) => createShadowItem(it)),
        };
    }
    // Migrate legacy single-object shadowConfig
    return {
        enabled: Boolean(raw.enabled),
        items: [createShadowItem({ ...raw, enabled: true })],
    };
}

export function normalizeGlowConfig(raw) {
    if (!raw || typeof raw !== 'object') return { enabled: false, items: [] };
    if (Array.isArray(raw.items)) {
        return {
            enabled: Boolean(raw.enabled),
            items: raw.items.map((it) => createGlowItem(it)),
        };
    }
    // Migrate legacy single-object glowConfig
    return {
        enabled: Boolean(raw.enabled),
        items: [createGlowItem({ ...raw, enabled: true })],
    };
}

export function parseShadowMeta(obj) {
    if (!obj) return { enabled: false, items: [] };
    if (obj.shadowConfig && typeof obj.shadowConfig === 'object') {
        return normalizeShadowConfig(obj.shadowConfig);
    }
    if (obj.shadow) {
        const parsed = rgbaToHexAndAlpha(obj.shadow.color);
        const isZeroOffsetGlow =
            (obj.shadow.offsetX || 0) === 0 &&
            (obj.shadow.offsetY || 0) === 0 &&
            obj.glowConfig?.enabled;
        if (!isZeroOffsetGlow) {
            return {
                enabled: true,
                items: [
                    createShadowItem({
                        enabled: true,
                        type: 'drop',
                        color: parsed.hex,
                        opacity: parsed.opacity,
                        blur: Number(obj.shadow.blur ?? 18),
                        offsetX: Number(obj.shadow.offsetX ?? 0),
                        offsetY: Number(obj.shadow.offsetY ?? 8),
                    }),
                ],
            };
        }
    }
    return { enabled: false, items: [] };
}

export function parseGlowMeta(obj) {
    if (!obj) return { enabled: false, items: [] };
    if (obj.glowConfig && typeof obj.glowConfig === 'object') {
        return normalizeGlowConfig(obj.glowConfig);
    }
    if ((obj.stickerOutlineSize || 0) > 0) {
        return {
            enabled: true,
            items: [
                createGlowItem({
                    enabled: true,
                    type: 'outer',
                    color: obj.stickerOutlineColor || '#ffffff',
                    opacity: 0.9,
                    blur: 18,
                    spread: Number(obj.stickerOutlineSize || 6),
                }),
            ],
        };
    }
    return { enabled: false, items: [] };
}

export function applyEffectsToObject(obj, nextShadow, nextGlow) {
    if (!obj) return;
    const shadowCfg = normalizeShadowConfig(nextShadow !== undefined ? nextShadow : parseShadowMeta(obj));
    const glowCfg = normalizeGlowConfig(nextGlow !== undefined ? nextGlow : parseGlowMeta(obj));

    obj.set('shadowConfig', shadowCfg);
    obj.set('glowConfig', glowCfg);

    // Sync stickerOutlineSize metadata for image presets while letting installMultiEffectRenderer render all passes simultaneously
    const isImage = (obj.type || '').toLowerCase() === 'image';
    if (isImage) {
        const primaryOuterGlow = glowCfg.enabled
            ? glowCfg.items.find((it) => it.enabled !== false && it.type !== 'inner' && (it.spread || 0) > 0)
            : null;
        if (primaryOuterGlow) {
            obj.set('stickerOutlineColor', primaryOuterGlow.color);
            obj.set('stickerOutlineSize', primaryOuterGlow.spread);
        } else {
            obj.set('stickerOutlineSize', 0);
        }
    }

    // Clear Fabric's single-slot obj.shadow when managed by shadowConfig/glowConfig so shadow + glow + stacks render together
    obj.set('shadow', null);
    obj.__multiEffectCache = null;
    obj.set('dirty', true);
}

// ==================== SIMULTANEOUS MULTI-SHADOW & MULTI-GLOW RENDERER ====================
let scratchOutCanvas = null;
let scratchMaskCanvas = null;
let scratchInCanvas = null;
let scratchDilateCanvas = null;
let scratchDissolveCanvas = null;
let scratchBlendCanvas = null;

function ensureScratchCanvas(existing, width, height) {
    const w = Math.max(1, Math.min(4096, Math.ceil(width)));
    const h = Math.max(1, Math.min(4096, Math.ceil(height)));
    const c = existing || document.createElement('canvas');
    if (c.width < w) c.width = w;
    if (c.height < h) c.height = h;
    return { canvas: c, ctx: c.getContext('2d'), w, h };
}

function parseHexToRgb(color = '#000000') {
    const raw = String(color || '#000000').trim();
    if (raw.startsWith('#')) {
        const clean = raw.slice(1);
        const full =
            clean.length === 3
                ? clean
                      .split('')
                      .map((c) => c + c)
                      .join('')
                : clean.padEnd(6, '0').slice(0, 6);
        return {
            r: parseInt(full.slice(0, 2), 16) || 0,
            g: parseInt(full.slice(2, 4), 16) || 0,
            b: parseInt(full.slice(4, 6), 16) || 0,
        };
    }
    const m = raw.match(/rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/i);
    if (m) {
        return { r: Number(m[1]) || 0, g: Number(m[2]) || 0, b: Number(m[3]) || 0 };
    }
    return null;
}

/**
 * Deterministic spatial stochastic alpha dissolution matching Photoshop Dissolve without frame flicker.
 */
function applyDissolveToBuffer(bufCanvas, sx, sy, sw, sh, alphaScale = 1, fixedRgb = null) {
    const rw = Math.max(1, Math.min(4096, Math.ceil(sw)));
    const rh = Math.max(1, Math.min(4096, Math.ceil(sh)));
    const { canvas: dCanvas, ctx: dCtx } = ensureScratchCanvas(scratchDissolveCanvas, rw, rh);
    scratchDissolveCanvas = dCanvas;

    dCtx.save();
    dCtx.setTransform(1, 0, 0, 1, 0, 0);
    dCtx.clearRect(0, 0, rw, rh);
    dCtx.drawImage(bufCanvas, sx, sy, sw, sh, 0, 0, rw, rh);
    dCtx.restore();

    const imgData = dCtx.getImageData(0, 0, rw, rh);
    const data = imgData.data;
    const scale = Math.max(0, Math.min(1, Number(alphaScale) || 1));

    for (let y = 0; y < rh; y++) {
        for (let x = 0; x < rw; x++) {
            const idx = (y * rw + x) * 4;
            const alphaRaw = data[idx + 3];
            if (alphaRaw === 0) continue;

            const effA = (alphaRaw * scale) / 255;
            let hsh = (Math.imul(x + 17, 374761393) + Math.imul(y + 31, 668265263)) | 0;
            hsh = Math.imul(hsh ^ (hsh >>> 13), 1274126177);
            const threshold = ((hsh ^ (hsh >>> 16)) >>> 0) / 4294967296;

            if (effA > threshold) {
                if (fixedRgb) {
                    data[idx] = fixedRgb.r;
                    data[idx + 1] = fixedRgb.g;
                    data[idx + 2] = fixedRgb.b;
                }
                data[idx + 3] = 255;
            } else {
                data[idx + 3] = 0;
            }
        }
    }

    dCtx.putImageData(imgData, 0, 0);
    return { canvas: dCanvas, w: rw, h: rh };
}

/**
 * Pixel-accurate Photoshop Subtract blend mode (`max(0, Backdrop - Source)` with W3C Porter-Duff alpha).
 */
function compositeSubtractOntoCtx(ctx, bufCanvas, sx, sy, sw, sh, dx, dy, dw, dh) {
    const destCanvas = ctx.canvas;
    if (!destCanvas || destCanvas.width <= 0 || destCanvas.height <= 0) return;

    const m = typeof ctx.getTransform === 'function' ? ctx.getTransform() : null;
    let minX = dx;
    let minY = dy;
    let maxX = dx + dw;
    let maxY = dy + dh;

    if (m) {
        const corners = [
            [dx, dy],
            [dx + dw, dy],
            [dx + dw, dy + dh],
            [dx, dy + dh],
        ];
        minX = Infinity;
        minY = Infinity;
        maxX = -Infinity;
        maxY = -Infinity;
        for (let i = 0; i < corners.length; i++) {
            const px = m.a * corners[i][0] + m.c * corners[i][1] + m.e;
            const py = m.b * corners[i][0] + m.d * corners[i][1] + m.f;
            if (px < minX) minX = px;
            if (px > maxX) maxX = px;
            if (py < minY) minY = py;
            if (py > maxY) maxY = py;
        }
    }

    const ix0 = Math.max(0, Math.floor(minX));
    const iy0 = Math.max(0, Math.floor(minY));
    const ix1 = Math.min(destCanvas.width, Math.ceil(maxX));
    const iy1 = Math.min(destCanvas.height, Math.ceil(maxY));
    const rw = ix1 - ix0;
    const rh = iy1 - iy0;
    if (rw <= 0 || rh <= 0) return;

    const { canvas: alignedCanvas, ctx: aCtx } = ensureScratchCanvas(scratchBlendCanvas, rw, rh);
    scratchBlendCanvas = alignedCanvas;
    aCtx.save();
    aCtx.setTransform(1, 0, 0, 1, 0, 0);
    aCtx.clearRect(0, 0, rw, rh);
    aCtx.translate(-ix0, -iy0);
    if (m) aCtx.transform(m.a, m.b, m.c, m.d, m.e, m.f);
    aCtx.globalAlpha = ctx.globalAlpha ?? 1;
    aCtx.drawImage(bufCanvas, sx, sy, sw, sh, dx, dy, dw, dh);
    aCtx.restore();

    const srcData = aCtx.getImageData(0, 0, rw, rh).data;
    const dstImg = ctx.getImageData(ix0, iy0, rw, rh);
    const dstData = dstImg.data;
    const len = dstData.length;

    for (let i = 0; i < len; i += 4) {
        const sa255 = srcData[i + 3];
        if (sa255 === 0) continue;

        const sr = srcData[i];
        const sg = srcData[i + 1];
        const sb = srcData[i + 2];
        const ba255 = dstData[i + 3];

        if (ba255 === 0) {
            dstData[i] = sr;
            dstData[i + 1] = sg;
            dstData[i + 2] = sb;
            dstData[i + 3] = sa255;
            continue;
        }

        const br = dstData[i];
        const bg = dstData[i + 1];
        const bb = dstData[i + 2];
        const sa = sa255 / 255;
        const ba = ba255 / 255;

        const subR = br > sr ? br - sr : 0;
        const subG = bg > sg ? bg - sg : 0;
        const subB = bb > sb ? bb - sb : 0;

        const outA = sa + ba - sa * ba;
        const invSaBa = (1 - sa) * ba;
        const invBaSa = (1 - ba) * sa;
        const bothA = sa * ba;

        const outR = (invSaBa * br + invBaSa * sr + bothA * subR) / outA;
        const outG = (invSaBa * bg + invBaSa * sg + bothA * subG) / outA;
        const outB = (invSaBa * bb + invBaSa * sb + bothA * subB) / outA;

        dstData[i] = outR < 0 ? 0 : outR > 255 ? 255 : Math.round(outR);
        dstData[i + 1] = outG < 0 ? 0 : outG > 255 ? 255 : Math.round(outG);
        dstData[i + 2] = outB < 0 ? 0 : outB > 255 ? 255 : Math.round(outB);
        dstData[i + 3] = Math.round(outA * 255);
    }

    ctx.putImageData(dstImg, ix0, iy0);
}

function compositeBufferWithBlendMode(ctx, bufCanvas, sx, sy, sw, sh, dx, dy, dw, dh, blendMode = 'source-over', fixedRgb = null) {
    const mode = normalizeBlendMode(blendMode);
    if (mode === 'dissolve') {
        const dissolved = applyDissolveToBuffer(bufCanvas, sx, sy, sw, sh, ctx.globalAlpha ?? 1, fixedRgb);
        ctx.save();
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1;
        ctx.drawImage(dissolved.canvas, 0, 0, dissolved.w, dissolved.h, dx, dy, dw, dh);
        ctx.restore();
        return;
    }
    if (mode === 'subtract') {
        compositeSubtractOntoCtx(ctx, bufCanvas, sx, sy, sw, sh, dx, dy, dw, dh);
        return;
    }
    ctx.save();
    ctx.globalCompositeOperation = mode;
    ctx.drawImage(bufCanvas, sx, sy, sw, sh, dx, dy, dw, dh);
    ctx.restore();
}

function collectObjectEffects(obj) {
    const shCfg = obj.shadowConfig;
    const glCfg = obj.glowConfig;
    const outer = [];
    const inner = [];

    if (shCfg?.enabled && Array.isArray(shCfg.items)) {
        shCfg.items.forEach((item) => {
            if (!item || item.enabled === false) return;
            const op = Number(item.opacity ?? 0.45);
            if (!(op > 0)) return;
            const normalized = {
                kind: 'shadow',
                type: item.type === 'inner' ? 'inner' : 'drop',
                blendMode: normalizeBlendMode(item.blendMode),
                color: item.color || '#000000',
                opacity: Math.max(0, Math.min(1, op)),
                blur: Math.max(0, Number(item.blur ?? 18)),
                offsetX: Number(item.offsetX ?? 0),
                offsetY: Number(item.offsetY ?? 8),
                spread: Math.max(0, Number(item.spread ?? 0)),
            };
            if (normalized.type === 'inner') inner.push(normalized);
            else outer.push(normalized);
        });
    }

    if (glCfg?.enabled && Array.isArray(glCfg.items)) {
        glCfg.items.forEach((item) => {
            if (!item || item.enabled === false) return;
            const op = Number(item.opacity ?? 0.85);
            if (!(op > 0)) return;
            const normalized = {
                kind: 'glow',
                type: item.type === 'inner' ? 'inner' : 'outer',
                blendMode: normalizeBlendMode(item.blendMode),
                color: item.color || '#3b82f6',
                opacity: Math.max(0, Math.min(1, op)),
                blur: Math.max(0, Number(item.blur ?? 24)),
                offsetX: 0,
                offsetY: 0,
                spread: Math.max(0, Number(item.spread ?? 0)),
            };
            if (normalized.type === 'inner') inner.push(normalized);
            else outer.push(normalized);
        });
    }

    return { outer, inner };
}

function buildDilatedSilhouette(srcCanvas, spreadPx, color) {
    const srcW = srcCanvas.width;
    const srcH = srcCanvas.height;
    const r = Math.min(48, Math.max(0, spreadPx));
    const pad = Math.ceil(r) + 2;
    const { canvas, ctx, w, h } = ensureScratchCanvas(scratchDilateCanvas, srcW + pad * 2, srcH + pad * 2);
    scratchDilateCanvas = canvas;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, w, h);

    if (r > 0) {
        const rings = r > 8 ? [r * 0.5, r] : [r];
        const steps = r > 12 ? 16 : 12;
        rings.forEach((radius) => {
            for (let i = 0; i < steps; i++) {
                const theta = (i * Math.PI * 2) / steps;
                ctx.drawImage(srcCanvas, pad + Math.cos(theta) * radius, pad + Math.sin(theta) * radius);
            }
        });
    }
    ctx.drawImage(srcCanvas, pad, pad);
    ctx.globalCompositeOperation = 'source-in';
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
    return { canvas, pad, w, h };
}

function resolveEffectOffsetInCacheSpace(ctx, ef, obj) {
    const canvas = obj.canvas;
    const retina = typeof obj.getCanvasRetinaScaling === 'function' ? obj.getCanvasRetinaScaling() : 1;
    const vpt = canvas?.viewportTransform || [1, 0, 0, 1, 0, 0];
    const multX = (vpt[0] || 1) * retina;
    const multY = (vpt[3] || 1) * retina;
    const sDx = (ef.offsetX || 0) * multX;
    const sDy = (ef.offsetY || 0) * multY;

    if (sDx === 0 && sDy === 0) return { dx: 0, dy: 0 };

    const T = typeof ctx.getTransform === 'function' ? ctx.getTransform() : null;
    if (!T) return { dx: sDx, dy: sDy };
    const det = T.a * T.d - T.b * T.c;
    if (!det || Math.abs(det) < 1e-6) return { dx: sDx, dy: sDy };

    return {
        dx: (T.d * sDx - T.c * sDy) / det,
        dy: (-T.b * sDx + T.a * sDy) / det,
    };
}

function renderOuterEffectLayer(ctx, srcCanvas, destX, destY, ef, obj) {
    const srcW = srcCanvas.width;
    const srcH = srcCanvas.height;
    const retina = typeof obj.getCanvasRetinaScaling === 'function' ? obj.getCanvasRetinaScaling() : 1;
    const vpt = obj.canvas?.viewportTransform || [1, 0, 0, 1, 0, 0];
    const scaleAvg = (((vpt[0] || 1) + (vpt[3] || 1)) * 0.5) * retina;
    const blurPx = Math.max(0, Number(ef.blur) || 0) * scaleAvg;
    const spreadPx = Math.max(0, Number(ef.spread) || 0) * scaleAvg;
    const { dx: offX, dy: offY } = resolveEffectOffsetInCacheSpace(ctx, ef, obj);

    const padX = Math.min(260, Math.ceil(blurPx * 1.45 + Math.abs(offX) + spreadPx + 6));
    const padY = Math.min(260, Math.ceil(blurPx * 1.45 + Math.abs(offY) + spreadPx + 6));
    const { canvas: outCanvas, ctx: outCtx, w, h } = ensureScratchCanvas(
        scratchOutCanvas,
        srcW + padX * 2,
        srcH + padY * 2
    );
    scratchOutCanvas = outCanvas;

    outCtx.save();
    outCtx.setTransform(1, 0, 0, 1, 0, 0);
    outCtx.clearRect(0, 0, w, h);

    if (spreadPx > 0) {
        const dilated = buildDilatedSilhouette(srcCanvas, spreadPx, ef.color || '#ffffff');
        outCtx.shadowColor = hexToRgba(ef.color, ef.opacity);
        outCtx.shadowBlur = blurPx;
        outCtx.shadowOffsetX = offX;
        outCtx.shadowOffsetY = offY;
        outCtx.globalAlpha = ef.opacity;
        outCtx.drawImage(
            dilated.canvas,
            0,
            0,
            dilated.w,
            dilated.h,
            padX - dilated.pad,
            padY - dilated.pad,
            dilated.w,
            dilated.h
        );
    } else {
        outCtx.shadowColor = hexToRgba(ef.color, ef.opacity);
        outCtx.shadowBlur = blurPx;
        outCtx.shadowOffsetX = offX;
        outCtx.shadowOffsetY = offY;
        outCtx.drawImage(srcCanvas, padX, padY);
    }

    // Punch out original caster pixels so semi-transparent layers never double-tint behind fills
    outCtx.shadowColor = 'transparent';
    outCtx.shadowBlur = 0;
    outCtx.shadowOffsetX = 0;
    outCtx.shadowOffsetY = 0;
    outCtx.globalAlpha = 1;
    outCtx.globalCompositeOperation = 'destination-out';
    outCtx.drawImage(srcCanvas, padX, padY);
    outCtx.restore();

    compositeBufferWithBlendMode(
        ctx,
        outCanvas,
        0,
        0,
        w,
        h,
        destX - padX,
        destY - padY,
        w,
        h,
        ef.blendMode,
        parseHexToRgb(ef.color)
    );
}

function renderInnerEffectLayer(ctx, srcCanvas, destX, destY, ef, obj) {
    const srcW = srcCanvas.width;
    const srcH = srcCanvas.height;
    const retina = typeof obj.getCanvasRetinaScaling === 'function' ? obj.getCanvasRetinaScaling() : 1;
    const vpt = obj.canvas?.viewportTransform || [1, 0, 0, 1, 0, 0];
    const scaleAvg = (((vpt[0] || 1) + (vpt[3] || 1)) * 0.5) * retina;
    const blurPx = Math.max(0, Number(ef.blur) || 0) * scaleAvg;
    const spreadPx = Math.max(0, Number(ef.spread) || 0) * scaleAvg;
    const { dx: offX, dy: offY } = resolveEffectOffsetInCacheSpace(ctx, ef, obj);

    const borderPad = Math.max(4, Math.ceil(blurPx * 0.5 + Math.abs(offX) + Math.abs(offY) + spreadPx + 4));
    const maskW = srcW + borderPad * 2;
    const maskH = srcH + borderPad * 2;

    const { canvas: maskCanvas, ctx: mCtx, w: mw, h: mh } = ensureScratchCanvas(scratchMaskCanvas, maskW, maskH);
    scratchMaskCanvas = maskCanvas;
    mCtx.save();
    mCtx.setTransform(1, 0, 0, 1, 0, 0);
    mCtx.clearRect(0, 0, mw, mh);
    mCtx.fillStyle = hexToRgba(ef.color, 1);
    mCtx.fillRect(0, 0, mw, mh);
    mCtx.globalCompositeOperation = 'destination-out';
    mCtx.drawImage(srcCanvas, borderPad, borderPad);
    mCtx.restore();

    const { canvas: inCanvas, ctx: inCtx, w: iw, h: ih } = ensureScratchCanvas(scratchInCanvas, srcW, srcH);
    scratchInCanvas = inCanvas;
    inCtx.save();
    inCtx.setTransform(1, 0, 0, 1, 0, 0);
    inCtx.clearRect(0, 0, iw, ih);

    inCtx.shadowColor = hexToRgba(ef.color, 1);
    inCtx.shadowBlur = blurPx;
    inCtx.shadowOffsetX = offX;
    inCtx.shadowOffsetY = offY;
    inCtx.globalAlpha = ef.opacity;

    if (spreadPx > 0) {
        const r = Math.min(36, spreadPx);
        const steps = 8;
        for (let i = 0; i < steps; i++) {
            const theta = (i * Math.PI * 2) / steps;
            inCtx.drawImage(
                maskCanvas,
                0,
                0,
                mw,
                mh,
                -borderPad + Math.cos(theta) * r * 0.6,
                -borderPad + Math.sin(theta) * r * 0.6,
                mw,
                mh
            );
        }
    } else {
        inCtx.drawImage(maskCanvas, 0, 0, mw, mh, -borderPad, -borderPad, mw, mh);
    }

    // Clip strictly inside the object's alpha silhouette
    inCtx.shadowColor = 'transparent';
    inCtx.shadowBlur = 0;
    inCtx.shadowOffsetX = 0;
    inCtx.shadowOffsetY = 0;
    inCtx.globalAlpha = 1;
    inCtx.globalCompositeOperation = 'destination-in';
    inCtx.drawImage(srcCanvas, 0, 0);
    inCtx.restore();

    compositeBufferWithBlendMode(
        ctx,
        inCanvas,
        0,
        0,
        iw,
        ih,
        destX,
        destY,
        iw,
        ih,
        ef.blendMode,
        parseHexToRgb(ef.color)
    );
}

export function installMultiEffectRenderer() {
    if (typeof document === 'undefined' || !FabricObject?.prototype) return;
    if (FabricObject.prototype.__png101MultiEffectPatched) return;

    const origRender = FabricObject.prototype.render;
    const origNeedsOwnCache = FabricObject.prototype.needsItsOwnCache;
    const origDrawObject = FabricObject.prototype.drawObject;

    FabricObject.prototype.needsItsOwnCache = function () {
        if (Array.isArray(this.eraserPaths) && this.eraserPaths.length > 0) return true;
        const { outer, inner } = collectObjectEffects(this);
        if (outer.length > 0 || inner.length > 0) return true;
        const gco = normalizeBlendMode(this.globalCompositeOperation);
        if (gco === 'dissolve' || gco === 'subtract') return true;
        return origNeedsOwnCache.call(this);
    };

    FabricObject.prototype.drawObject = function (ctx, forClipping, context) {
        origDrawObject.call(this, ctx, forClipping, context);
        if (!forClipping && Array.isArray(this.eraserPaths) && this.eraserPaths.length > 0) {
            ctx.save();
            ctx.globalCompositeOperation = 'destination-out';
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.strokeStyle = 'rgba(0,0,0,1)';
            ctx.fillStyle = 'rgba(0,0,0,1)';
            for (const ep of this.eraserPaths) {
                const pts = ep?.points;
                if (!Array.isArray(pts) || pts.length === 0) continue;
                const w = Math.max(1, Number(ep.width || 20));
                if (pts.length === 1) {
                    ctx.beginPath();
                    ctx.arc(pts[0].x, pts[0].y, w / 2, 0, Math.PI * 2);
                    ctx.fill();
                } else {
                    ctx.lineWidth = w;
                    ctx.beginPath();
                    ctx.moveTo(pts[0].x, pts[0].y);
                    for (let i = 1; i < pts.length; i++) {
                        const prev = pts[i - 1];
                        const cur = pts[i];
                        ctx.quadraticCurveTo(prev.x, prev.y, (prev.x + cur.x) / 2, (prev.y + cur.y) / 2);
                    }
                    ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
                    ctx.stroke();
                }
            }
            ctx.restore();
        }
    };

    FabricObject.prototype.render = function (ctx) {
        const { outer, inner } = collectObjectEffects(this);
        const objBlend = normalizeBlendMode(this.globalCompositeOperation);
        const isCustomObjBlend = objBlend === 'dissolve' || objBlend === 'subtract';
        if (outer.length === 0 && inner.length === 0 && !isCustomObjBlend) {
            return origRender.call(this, ctx);
        }
        if (this.isNotVisible()) return;
        if (this.canvas && this.canvas.skipOffscreen && !this.group && !this.isOnScreen()) return;

        ctx.save();
        ctx.globalCompositeOperation = 'source-over';
        this.drawSelectionBackground(ctx);
        this.transform(ctx);
        this._setOpacity(ctx);

        this.renderCache();
        const srcCanvas = this._cacheCanvas;
        if (!srcCanvas) {
            ctx.globalCompositeOperation = isCustomObjBlend ? 'source-over' : objBlend;
            this.drawObject(ctx, false, {});
            this.dirty = false;
            ctx.restore();
            return;
        }

        const invZX = 1 / (this.zoomX || 1);
        const invZY = 1 / (this.zoomY || 1);
        const destX = -this.cacheTranslationX;
        const destY = -this.cacheTranslationY;

        ctx.save();
        ctx.scale(invZX, invZY);

        for (let i = outer.length - 1; i >= 0; i--) {
            renderOuterEffectLayer(ctx, srcCanvas, destX, destY, outer[i], this);
        }

        compositeBufferWithBlendMode(
            ctx,
            srcCanvas,
            0,
            0,
            srcCanvas.width,
            srcCanvas.height,
            destX,
            destY,
            srcCanvas.width,
            srcCanvas.height,
            objBlend,
            null
        );

        for (let i = 0; i < inner.length; i++) {
            renderInnerEffectLayer(ctx, srcCanvas, destX, destY, inner[i], this);
        }

        ctx.restore();
        this.dirty = false;
        ctx.restore();
    };

    FabricObject.prototype.__png101MultiEffectPatched = true;
}

installMultiEffectRenderer();

// ==================== INDEXEDDB AUTOSAVE & PROJECTS ====================
const IDB_NAME = 'png101_editor_studio';
const IDB_STORE = 'projects';
const IDB_KEY = 'active_autosave_v1';
const IDB_PROJECT_PREFIX = 'project:';
const IDB_LEGACY_FLAG = 'legacy_migrated_v1';

function openIdb() {
    return new Promise((resolve, reject) => {
        if (typeof indexedDB === 'undefined') {
            reject(new Error('IndexedDB unavailable'));
            return;
        }
        const req = indexedDB.open(IDB_NAME, 1);
        req.onupgradeneeded = () => {
            const db = req.result;
            if (!db.objectStoreNames.contains(IDB_STORE)) {
                db.createObjectStore(IDB_STORE);
            }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

function normalizeProjectRecord(payload) {
    if (!payload || typeof payload !== 'object') return null;
    const now = Date.now();
    const pages = Array.isArray(payload.pages) ? payload.pages : [];
    const activePageIdx = Math.min(Math.max(0, Number(payload.activePageIdx) || 0), Math.max(0, pages.length - 1));
    const activePage = pages[activePageIdx] || pages[0] || null;
    const id = String(payload.id || uid('proj'));
    const totalArtboards = pages.reduce(
        (sum, p) => sum + (Array.isArray(p?.artboards) && p.artboards.length > 0 ? p.artboards.length : 1),
        0
    );
    const artboardPreviews = Array.isArray(payload.artboardPreviews)
        ? payload.artboardPreviews.filter((a) => a && typeof a === 'object')
        : [];
    return {
        ...payload,
        id,
        title: String(payload.title || 'Untitled Design').trim() || 'Untitled Design',
        width: Number(payload.width || activePage?.width) || 1080,
        height: Number(payload.height || activePage?.height) || 1080,
        pageCount: pages.length || Number(payload.pageCount) || 1,
        artboardCount: Number(payload.artboardCount) || Math.max(1, totalArtboards),
        artboardPreviews,
        activePageIdx,
        pages,
        thumbnail: payload.thumbnail || null,
        createdAt: Number(payload.createdAt || payload.savedAt) || now,
        updatedAt: Number(payload.updatedAt || payload.savedAt) || now,
        savedAt: Number(payload.savedAt || payload.updatedAt) || now,
    };
}

const EMERGENCY_DRAFT_PREFIX = 'png101:editor:pendingDraft:v1:';

export function writePendingProjectDraftSync(payload) {
    try {
        if (!payload?.id || !Array.isArray(payload.pages) || typeof window === 'undefined' || !window.localStorage) {
            return false;
        }
        const compact = {
            ...normalizeProjectRecord({ ...payload, thumbnail: null, artboardPreviews: [] }),
            thumbnail: null,
            artboardPreviews: [],
        };
        window.localStorage.setItem(`${EMERGENCY_DRAFT_PREFIX}${compact.id}`, JSON.stringify(compact));
        return true;
    } catch {
        return false;
    }
}

export function readPendingProjectDraftSync(projectId) {
    try {
        if (!projectId || typeof window === 'undefined' || !window.localStorage) return null;
        const raw = window.localStorage.getItem(`${EMERGENCY_DRAFT_PREFIX}${projectId}`);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        return parsed && Array.isArray(parsed.pages) && parsed.pages.length > 0 ? parsed : null;
    } catch {
        return null;
    }
}

export function clearPendingProjectDraftSync(projectId) {
    try {
        if (!projectId || typeof window === 'undefined' || !window.localStorage) return;
        window.localStorage.removeItem(`${EMERGENCY_DRAFT_PREFIX}${projectId}`);
    } catch {
        // ignore storage errors
    }
}

function collectPendingDraftsFromStorage() {
    const out = [];
    try {
        if (typeof window === 'undefined' || !window.localStorage) return out;
        for (let i = 0; i < window.localStorage.length; i += 1) {
            const k = window.localStorage.key(i);
            if (!k || !k.startsWith(EMERGENCY_DRAFT_PREFIX)) continue;
            const raw = window.localStorage.getItem(k);
            if (!raw) continue;
            try {
                const parsed = JSON.parse(raw);
                if (parsed?.id && Array.isArray(parsed.pages) && parsed.pages.length > 0) {
                    out.push(parsed);
                }
            } catch {
                // ignore malformed entry
            }
        }
    } catch {
        // ignore storage errors
    }
    return out;
}

export async function saveProjectToIdb(payload) {
    try {
        const db = await openIdb();
        const normalized = payload?.id ? normalizeProjectRecord(payload) : null;
        await new Promise((resolve, reject) => {
            const tx = db.transaction(IDB_STORE, 'readwrite');
            const store = tx.objectStore(IDB_STORE);
            store.put(normalized || payload, IDB_KEY);
            if (normalized?.id) {
                store.put(normalized, `${IDB_PROJECT_PREFIX}${normalized.id}`);
                store.put(true, IDB_LEGACY_FLAG);
            }
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
        db.close();
        if (normalized?.id) {
            const pending = readPendingProjectDraftSync(normalized.id);
            if (!pending || (Number(normalized.updatedAt) || 0) >= (Number(pending.updatedAt) || 0)) {
                clearPendingProjectDraftSync(normalized.id);
            }
        }
        return true;
    } catch {
        // Ignore quota / private browsing errors gracefully
        return false;
    }
}

export async function loadProjectFromIdb() {
    try {
        const db = await openIdb();
        const res = await new Promise((resolve, reject) => {
            const tx = db.transaction(IDB_STORE, 'readonly');
            const req = tx.objectStore(IDB_STORE).get(IDB_KEY);
            req.onsuccess = () => resolve(req.result || null);
            req.onerror = () => reject(req.error);
        });
        db.close();
        return res;
    } catch {
        return null;
    }
}

export async function listSavedProjectsFromIdb() {
    try {
        const db = await openIdb();
        const projects = await new Promise((resolve, reject) => {
            const tx = db.transaction(IDB_STORE, 'readwrite');
            const store = tx.objectStore(IDB_STORE);
            const items = [];
            let legacyDraft = null;
            let legacyMigrated = false;

            const cursorReq = store.openCursor();
            cursorReq.onsuccess = (e) => {
                const cursor = e.target.result;
                if (cursor) {
                    const key = String(cursor.key || '');
                    const val = cursor.value;
                    if (key.startsWith(IDB_PROJECT_PREFIX) && val && Array.isArray(val.pages)) {
                        items.push(val);
                    } else if (key === IDB_KEY && val && Array.isArray(val.pages) && val.pages.length > 0) {
                        legacyDraft = val;
                    } else if (key === IDB_LEGACY_FLAG && val === true) {
                        legacyMigrated = true;
                    }
                    cursor.continue();
                    return;
                }

                // One-time migration from single active_autosave_v1 to multi-project list
                if (items.length === 0 && !legacyMigrated && legacyDraft) {
                    const migrated = normalizeProjectRecord(legacyDraft);
                    if (migrated) {
                        store.put(migrated, `${IDB_PROJECT_PREFIX}${migrated.id}`);
                        store.put(migrated, IDB_KEY);
                        store.put(true, IDB_LEGACY_FLAG);
                        items.push(migrated);
                    }
                }
            };
            tx.oncomplete = () => resolve(items);
            tx.onerror = () => reject(tx.error);
        });
        db.close();
        const byId = new Map(projects.map((p) => [p.id, p]));
        collectPendingDraftsFromStorage().forEach((draft) => {
            const existing = byId.get(draft.id);
            if (!existing || (Number(draft.updatedAt) || 0) > (Number(existing.updatedAt) || 0)) {
                byId.set(draft.id, { ...existing, ...draft, thumbnail: existing?.thumbnail || draft.thumbnail || null });
            }
        });
        return [...byId.values()].sort((a, b) => (b.updatedAt || b.savedAt || 0) - (a.updatedAt || a.savedAt || 0));
    } catch {
        return [];
    }
}

export async function getSavedProjectFromIdb(projectId) {
    if (!projectId) return null;
    try {
        const db = await openIdb();
        const res = await new Promise((resolve, reject) => {
            const tx = db.transaction(IDB_STORE, 'readonly');
            const req = tx.objectStore(IDB_STORE).get(`${IDB_PROJECT_PREFIX}${projectId}`);
            req.onsuccess = () => resolve(req.result || null);
            req.onerror = () => reject(req.error);
        });
        db.close();
        return res;
    } catch {
        return null;
    }
}

export async function deleteSavedProjectFromIdb(projectId) {
    if (!projectId) return false;
    clearPendingProjectDraftSync(projectId);
    try {
        const db = await openIdb();
        await new Promise((resolve, reject) => {
            const tx = db.transaction(IDB_STORE, 'readwrite');
            const store = tx.objectStore(IDB_STORE);
            store.delete(`${IDB_PROJECT_PREFIX}${projectId}`);
            store.put(true, IDB_LEGACY_FLAG);
            const activeReq = store.get(IDB_KEY);
            activeReq.onsuccess = () => {
                if (activeReq.result?.id === projectId) {
                    store.delete(IDB_KEY);
                }
            };
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
        db.close();
        return true;
    } catch {
        return false;
    }
}

export async function renameSavedProjectInIdb(projectId, nextTitle) {
    if (!projectId) return null;
    try {
        const existing = await getSavedProjectFromIdb(projectId);
        if (!existing) return null;
        const updated = normalizeProjectRecord({
            ...existing,
            title: String(nextTitle || '').trim() || 'Untitled Design',
            updatedAt: Date.now(),
            savedAt: Date.now(),
        });
        await saveProjectToIdb(updated);
        return updated;
    } catch {
        return null;
    }
}

export async function duplicateSavedProjectInIdb(projectId) {
    if (!projectId) return null;
    try {
        const existing = await getSavedProjectFromIdb(projectId);
        if (!existing) return null;
        const now = Date.now();
        const copy = normalizeProjectRecord({
            ...JSON.parse(JSON.stringify(existing)),
            id: uid('proj'),
            title: `${existing.title || 'Untitled Design'} Copy`,
            createdAt: now,
            updatedAt: now,
            savedAt: now,
        });
        await saveProjectToIdb(copy);
        return copy;
    } catch {
        return null;
    }
}

export async function clearProjectFromIdb() {
    try {
        const db = await openIdb();
        await new Promise((resolve, reject) => {
            const tx = db.transaction(IDB_STORE, 'readwrite');
            tx.objectStore(IDB_STORE).delete(IDB_KEY);
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
        db.close();
    } catch {
        // Ignore
    }
}

export function captureLightweightThumbnail(canvas, logicalW = null, logicalH = null, artboardX = 0, artboardY = 0) {
    if (!canvas) return null;
    try {
        return captureScopedArtboardDataUrl(canvas, 380, 260, { quality: 0.85 }, logicalW, logicalH, artboardX, artboardY);
    } catch {
        return null;
    }
}

// ==================== SHAPE & ELEMENT BUILDERS ====================
function starPoints(outerR = 110, innerR = 48, spikes = 5) {
    const pts = [];
    const step = Math.PI / spikes;
    for (let i = 0; i < spikes * 2; i++) {
        const r = i % 2 === 0 ? outerR : innerR;
        const angle = i * step - Math.PI / 2;
        pts.push({ x: Math.cos(angle) * r, y: Math.sin(angle) * r });
    }
    return pts;
}

function regularPolygonPoints(radius = 110, sides = 6) {
    const pts = [];
    for (let i = 0; i < sides; i++) {
        const angle = (i * 2 * Math.PI) / sides - Math.PI / 2;
        pts.push({ x: Math.cos(angle) * radius, y: Math.sin(angle) * radius });
    }
    return pts;
}

export function createElementObject(kind, centerX = 300, centerY = 300) {
    const base = {
        layerId: uid('layer'),
        originX: 'center',
        originY: 'center',
        left: centerX,
        top: centerY,
    };

    switch (kind) {
        case 'rect':
            return new Rect({ ...base, width: 240, height: 180, fill: '#3b82f6', rx: 0, ry: 0, layerName: 'Rectangle' });
        case 'rounded-rect':
            return new Rect({ ...base, width: 260, height: 160, fill: '#6366f1', rx: 28, ry: 28, layerName: 'Rounded Box' });
        case 'pill':
            return new Rect({ ...base, width: 280, height: 84, fill: '#10b981', rx: 42, ry: 42, layerName: 'Pill Badge' });
        case 'circle':
            return new Circle({ ...base, radius: 110, fill: '#8b5cf6', layerName: 'Circle' });
        case 'triangle':
            return new Triangle({ ...base, width: 220, height: 200, fill: '#f59e0b', layerName: 'Triangle' });
        case 'star':
            return new Polygon(starPoints(115, 50, 5), { ...base, fill: '#facc15', layerName: 'Star' });
        case 'badge-burst':
            return new Polygon(starPoints(115, 92, 12), { ...base, fill: '#ef4444', layerName: 'Promo Burst' });
        case 'hexagon':
            return new Polygon(regularPolygonPoints(110, 6), { ...base, fill: '#0ea5e9', layerName: 'Hexagon' });
        case 'diamond':
            return new Polygon(regularPolygonPoints(115, 4), { ...base, fill: '#ec4899', layerName: 'Diamond' });
        case 'heart':
            return new Path(
                'M 120 210 C 120 210 20 145 20 75 C 20 35 55 10 90 10 C 110 10 120 25 120 25 C 120 25 130 10 150 10 C 185 10 220 35 220 75 C 220 145 120 210 120 210 Z',
                { ...base, fill: '#e11d48', layerName: 'Heart' }
            );
        case 'arrow':
            return new Path(
                'M 0 36 L 150 36 L 150 10 L 220 55 L 150 100 L 150 74 L 0 74 Z',
                { ...base, fill: '#2563eb', layerName: 'Arrow' }
            );
        case 'speech':
            return new Path(
                'M 20 0 L 220 0 Q 240 0 240 20 L 240 120 Q 240 140 220 140 L 95 140 L 55 180 L 65 140 L 20 140 Q 0 140 0 120 L 0 20 Q 0 0 20 0 Z',
                { ...base, fill: '#ffffff', stroke: '#0f172a', strokeWidth: 4, layerName: 'Speech Bubble' }
            );
        case 'line':
            return new Line([-130, 0, 130, 0], {
                ...base,
                stroke: '#ffffff',
                strokeWidth: 6,
                strokeLineCap: 'round',
                layerName: 'Divider Line',
            });
        default:
            return new Rect({ ...base, width: 200, height: 200, fill: '#3b82f6', layerName: 'Shape' });
    }
}

// ==================== PHOTO FRAMES (CLIP PATH) ====================
export function applyFrameToImage(imgObj, frameKind = 'none') {
    if (!imgObj) return;
    const w = imgObj.width || 400;
    const h = imgObj.height || 400;
    const minSide = Math.min(w, h);

    let clip = undefined;
    if (frameKind === 'circle') {
        clip = new Circle({ radius: minSide / 2, originX: 'center', originY: 'center', left: 0, top: 0 });
    } else if (frameKind === 'rounded') {
        clip = new Rect({
            width: w * 0.96,
            height: h * 0.96,
            rx: minSide * 0.14,
            ry: minSide * 0.14,
            originX: 'center',
            originY: 'center',
            left: 0,
            top: 0,
        });
    } else if (frameKind === 'arch') {
        const hw = w * 0.45;
        const hh = h * 0.48;
        const r = hw;
        const d = `M ${-hw} ${hh} L ${-hw} ${-hh + r} A ${r} ${r} 0 0 1 ${hw} ${-hh + r} L ${hw} ${hh} Z`;
        clip = new Path(d, { originX: 'center', originY: 'center', left: 0, top: 0 });
    } else if (frameKind === 'hexagon') {
        clip = new Polygon(regularPolygonPoints(minSide * 0.49, 6), {
            originX: 'center',
            originY: 'center',
            left: 0,
            top: 0,
        });
    } else if (frameKind === 'star') {
        clip = new Polygon(starPoints(minSide * 0.5, minSide * 0.22, 5), {
            originX: 'center',
            originY: 'center',
            left: 0,
            top: 0,
        });
    } else if (frameKind === 'diamond') {
        clip = new Polygon(regularPolygonPoints(minSide * 0.5, 4), {
            originX: 'center',
            originY: 'center',
            left: 0,
            top: 0,
        });
    }

    imgObj.set({ clipPath: clip, frameShape: frameKind === 'none' ? undefined : frameKind, dirty: true });
}

// ==================== IMAGE FILTERS ====================
export const DEFAULT_FILTER_STATE = {
    brightness: 0, // -0.6 to 0.6
    contrast: 0, // -0.6 to 0.6
    saturation: 0, // -1 to 1
    blur: 0, // 0 to 0.4
    grayscale: false,
    sepia: false,
    tintColor: '',
    tintAlpha: 0,
};

export function applyImageFilters(imgObj, nextState) {
    if (!imgObj || imgObj.type?.toLowerCase() !== 'image') return;
    const state = { ...DEFAULT_FILTER_STATE, ...(nextState || {}) };
    const list = [];

    if (Math.abs(state.brightness) > 0.001) {
        list.push(new filters.Brightness({ brightness: state.brightness }));
    }
    if (Math.abs(state.contrast) > 0.001) {
        list.push(new filters.Contrast({ contrast: state.contrast }));
    }
    if (Math.abs(state.saturation) > 0.001) {
        list.push(new filters.Saturation({ saturation: state.saturation }));
    }
    if (state.blur > 0.001) {
        list.push(new filters.Blur({ blur: state.blur }));
    }
    if (state.grayscale) {
        list.push(new filters.Grayscale());
    }
    if (state.sepia) {
        list.push(new filters.Sepia());
    }
    if (state.tintColor && state.tintAlpha > 0) {
        list.push(new filters.BlendColor({ color: state.tintColor, mode: 'tint', alpha: state.tintAlpha }));
    }

    imgObj.filters = list;
    imgObj.set('filterState', state);
    imgObj.applyFilters();
}

// ==================== TEXT PAIRINGS ====================
export const TEXT_PAIRINGS = [
    {
        id: 'bold-promo',
        label: 'MEGA LAUNCH',
        sub: 'Drop any transparent PNG',
        previewBg: 'linear-gradient(135deg, #2563eb, #7c3aed)',
        items: [
            { text: 'MEGA LAUNCH', fontFamily: 'Bebas Neue', fontSize: 108, fontWeight: '700', fill: '#ffffff', dy: -32 },
            { text: 'LIMITED COLLECTION 2026', fontFamily: 'Inter', fontSize: 28, fontWeight: '700', fill: '#93c5fd', dy: 44 },
        ],
    },
    {
        id: 'luxury-serif',
        label: 'Editorial Vogue',
        sub: 'Curated Studio Look',
        previewBg: 'linear-gradient(135deg, #0f172a, #334155)',
        items: [
            { text: 'Pure Elegance', fontFamily: 'Playfair Display', fontSize: 78, fontWeight: '700', fill: '#f8fafc', dy: -24 },
            { text: 'HANDCRAFTED VISUALS', fontFamily: 'Montserrat', fontSize: 22, fontWeight: '600', fill: '#cbd5e1', dy: 40 },
        ],
    },
    {
        id: 'script-glow',
        label: 'Summer Vibes',
        sub: 'Fresh Handcrafted Art',
        previewBg: 'linear-gradient(135deg, #f97316, #ec4899)',
        items: [
            { text: 'Summer Vibes', fontFamily: 'Pacifico', fontSize: 76, fontWeight: '400', fill: '#fef08a', dy: -24 },
            { text: 'GOOD ENERGY ONLY', fontFamily: 'Poppins', fontSize: 24, fontWeight: '700', fill: '#ffffff', dy: 42 },
        ],
    },
    {
        id: 'tech-clean',
        label: 'NEXT GEN UI',
        sub: 'Modern geometric typography',
        previewBg: 'linear-gradient(135deg, #059669, #0284c7)',
        items: [
            { text: 'NEXT-GEN STUDIO', fontFamily: 'Space Grotesk', fontSize: 72, fontWeight: '700', fill: '#ffffff', dy: -22 },
            { text: 'Designed with crisp transparent layers', fontFamily: 'Inter', fontSize: 26, fontWeight: '500', fill: '#e2e8f0', dy: 38 },
        ],
    },
];

// ==================== FONT LOADING ====================
const loadedFontSet = new Set(['Arial', 'Helvetica', 'Georgia', 'Times New Roman', 'Courier New', 'sans-serif']);

export async function ensureFontLoaded(family, weight = null) {
    if (!family || typeof document === 'undefined' || !document.fonts) {
        return;
    }
    const cacheKey = weight ? `${family}::${weight}` : family;
    if (loadedFontSet.has(cacheKey)) {
        return;
    }
    try {
        await ensureGoogleFontCss(family);
        const loaders = [
            document.fonts.load(`400 32px "${family}"`),
            document.fonts.load(`700 32px "${family}"`),
        ];
        if (weight && !['400', '700', 'normal', 'bold'].includes(String(weight))) {
            loaders.push(document.fonts.load(`${weight} 32px "${family}"`));
        }
        await Promise.allSettled(loaders);
        loadedFontSet.add(cacheKey);
        loadedFontSet.add(family);
    } catch {
        // Font might not be loaded yet, Fabric still renders fallback gracefully
    }
}

// ==================== GRADIENT HELPER ====================
export function makeCanvasBackgroundGradient(width, height, { type = 'linear', angle = 135, from = '#1d4ed8', to = '#7c3aed' }) {
    if (type === 'radial') {
        const r = Math.max(width, height) / 2;
        return new Gradient({
            type: 'radial',
            coords: { x1: width / 2, y1: height / 2, r1: 0, x2: width / 2, y2: height / 2, r2: r },
            colorStops: [
                { offset: 0, color: from },
                { offset: 1, color: to },
            ],
        });
    }
    const rad = ((angle - 90) * Math.PI) / 180;
    const hw = width / 2;
    const hh = height / 2;
    return new Gradient({
        type: 'linear',
        coords: {
            x1: hw - Math.cos(rad) * hw,
            y1: hh - Math.sin(rad) * hh,
            x2: hw + Math.cos(rad) * hw,
            y2: hh + Math.sin(rad) * hh,
        },
        colorStops: [
            { offset: 0, color: from },
            { offset: 1, color: to },
        ],
    });
}

// ==================== SNAPPING ALIGNMENT GUIDES ====================
export const DEFAULT_SNAP_PREFS = {
    enabled: true,
    artboard: true,
    elements: true,
    points: true,
    grid: false,
    gridSize: 40,
};

export function attachSnappingGuides(canvas, logicalWRef, logicalHRef, onGuidesChange, snapPrefsRef = null) {
    const SNAP_THRESHOLD = 7;
    const POINT_THRESHOLD = 9;

    const getParentObj = (obj) =>
        obj?.parent || (obj?.group?.type !== 'activeselection' ? obj?.group : null) || null;

    const dirtyAncestors = (obj) => {
        let cur = getParentObj(obj);
        while (cur) {
            cur.set?.('dirty', true);
            cur = getParentObj(cur);
        }
    };

    const getObjectPoints = (obj, box) => {
        const coords = typeof obj?.getCoords === 'function' ? obj.getCoords() : null;
        const pts = Array.isArray(coords) && coords.length >= 4
            ? coords.slice(0, 4).map((p) => ({ x: p.x, y: p.y }))
            : [
                { x: box.left, y: box.top },
                { x: box.left + box.width, y: box.top },
                { x: box.left + box.width, y: box.top + box.height },
                { x: box.left, y: box.top + box.height },
            ];
        pts.push({ x: box.left + box.width / 2, y: box.top + box.height / 2 });
        return pts;
    };

    const collectExcludedSets = (target) => {
        const excluded = new Set();
        const ancestors = new Set();
        const activeList = canvas.getActiveObjects?.() || [];
        const seeds = activeList.length > 0 ? activeList : [target];

        const markDescendants = (obj) => {
            if (!obj || excluded.has(obj)) return;
            excluded.add(obj);
            if (typeof obj.getObjects === 'function') {
                obj.getObjects().forEach(markDescendants);
            }
        };

        seeds.forEach((item) => {
            markDescendants(item);
            let cur = getParentObj(item);
            while (cur) {
                ancestors.add(cur);
                cur = getParentObj(cur);
            }
        });
        markDescendants(target);
        return { excluded, ancestors };
    };

    const collectSnapCandidates = (target) => {
        const { excluded, ancestors } = collectExcludedSets(target);
        const candidates = [];

        const walk = (list) => {
            if (!Array.isArray(list)) return;
            for (const obj of list) {
                if (!obj || obj.visible === false || obj.excludeFromExport) continue;
                const isGroup = obj.type === 'group' || typeof obj.getObjects === 'function';
                if (!excluded.has(obj) && !ancestors.has(obj) && obj.type !== 'activeselection') {
                    const box = obj.getBoundingRect?.();
                    if (box && Number.isFinite(box.left) && Number.isFinite(box.top)) {
                        candidates.push({ obj, box, points: getObjectPoints(obj, box) });
                    }
                }
                if (isGroup && !excluded.has(obj) && typeof obj.getObjects === 'function') {
                    walk(obj.getObjects());
                }
            }
        };

        walk(canvas.getObjects?.() || []);
        return candidates;
    };

    const handleMoving = (e) => {
        const target = e.target;
        if (!target) return;

        // Refresh Fabric coordinates for the current pointer step before reading bounds/corners
        target.setCoords();

        const prefs = { ...DEFAULT_SNAP_PREFS, ...(snapPrefsRef?.current || {}) };
        if (!prefs.enabled || (!prefs.artboard && !prefs.elements && !prefs.points && !prefs.grid)) {
            onGuidesChange([]);
            return;
        }

        const w = logicalWRef.current || 1080;
        const h = logicalHRef.current || 1080;
        const gridSize = Math.max(8, Number(prefs.gridSize) || 40);
        const box = target.getBoundingRect();
        const mCx = box.left + box.width / 2;
        const mCy = box.top + box.height / 2;
        const mRight = box.left + box.width;
        const mBottom = box.top + box.height;

        const mXSlices = [box.left, mCx, mRight];
        const mYSlices = [box.top, mCy, mBottom];

        let bestX = null; // { abs, dx, pos, kind }
        let bestY = null; // { abs, dy, pos, kind }

        const considerX = (delta, pos, kind) => {
            const abs = Math.abs(delta);
            if (abs < SNAP_THRESHOLD && (!bestX || abs < bestX.abs)) {
                bestX = { abs, dx: delta, pos, kind };
            }
        };

        const considerY = (delta, pos, kind) => {
            const abs = Math.abs(delta);
            if (abs < SNAP_THRESHOLD && (!bestY || abs < bestY.abs)) {
                bestY = { abs, dy: delta, pos, kind };
            }
        };

        // 1. Artboard Center & Edge Snapping
        if (prefs.artboard) {
            for (const ax of [0, w / 2, w]) {
                for (const mx of mXSlices) considerX(ax - mx, ax, 'artboard');
            }
            for (const ay of [0, h / 2, h]) {
                for (const my of mYSlices) considerY(ay - my, ay, 'artboard');
            }
        }

        const candidates = (prefs.elements || prefs.points) ? collectSnapCandidates(target) : [];

        // 2. Element-to-Element Alignment Snapping
        if (prefs.elements && candidates.length > 0) {
            for (const c of candidates) {
                const cRight = c.box.left + c.box.width;
                const cBottom = c.box.top + c.box.height;
                const cX = [c.box.left, c.box.left + c.box.width / 2, cRight];
                const cY = [c.box.top, c.box.top + c.box.height / 2, cBottom];
                for (const tx of cX) {
                    for (const mx of mXSlices) considerX(tx - mx, tx, 'element');
                }
                for (const ty of cY) {
                    for (const my of mYSlices) considerY(ty - my, ty, 'element');
                }
            }
        }

        // 3. Grid Snapping (40px intervals matching canvas overlay grid)
        if (prefs.grid) {
            for (const mx of [box.left, mCx, mRight]) {
                const snappedG = Math.round(mx / gridSize) * gridSize;
                considerX(snappedG - mx, snappedG, 'grid');
            }
            for (const my of [box.top, mCy, mBottom]) {
                const snappedG = Math.round(my / gridSize) * gridSize;
                considerY(snappedG - my, snappedG, 'grid');
            }
        }

        // 4. Magnetic Point-to-Point Snapping (corners & centers)
        let bestPt = null;
        if (prefs.points) {
            const mPoints = getObjectPoints(target, box);
            const anchorPoints = [];

            for (const c of candidates) {
                anchorPoints.push(...c.points);
            }
            // Key artboard & safe-margin anchor points so Point Snap works even on a sparse canvas
            for (const ax of [0, 40, w / 2, Math.max(0, w - 40), w]) {
                for (const ay of [0, 40, h / 2, Math.max(0, h - 40), h]) {
                    anchorPoints.push({ x: ax, y: ay });
                }
            }

            for (const mp of mPoints) {
                for (const ap of anchorPoints) {
                    const dx = ap.x - mp.x;
                    const dy = ap.y - mp.y;
                    const dist = Math.hypot(dx, dy);
                    if (dist < POINT_THRESHOLD && (!bestPt || dist < bestPt.dist)) {
                        bestPt = { dist, dx, dy, ax: ap.x, ay: ap.y };
                    }
                }
            }
        }

        let finalDx = bestX ? bestX.dx : 0;
        let finalDy = bestY ? bestY.dy : 0;
        const guides = [];

        if (bestPt) {
            const axisCombinedAbs = Math.hypot(bestX ? bestX.abs : POINT_THRESHOLD, bestY ? bestY.abs : POINT_THRESHOLD);
            if ((!bestX && !bestY) || bestPt.dist <= axisCombinedAbs + 1.5) {
                finalDx = bestPt.dx;
                finalDy = bestPt.dy;
                guides.push({ type: 'point', x: bestPt.ax, y: bestPt.ay, kind: 'point' });
                if (bestX && Math.abs(bestX.dx - finalDx) < 1.5) {
                    guides.push({ type: 'v', pos: bestX.pos, kind: bestX.kind });
                }
                if (bestY && Math.abs(bestY.dy - finalDy) < 1.5) {
                    guides.push({ type: 'h', pos: bestY.pos, kind: bestY.kind });
                }
            }
        }

        if (guides.length === 0 || !bestPt) {
            if (bestX) guides.push({ type: 'v', pos: bestX.pos, kind: bestX.kind });
            if (bestY) guides.push({ type: 'h', pos: bestY.pos, kind: bestY.kind });
        }

        if (finalDx !== 0 || finalDy !== 0) {
            const pos = target.getXY();
            target.setXY(new Point(pos.x + finalDx, pos.y + finalDy));
            target.setCoords();
            dirtyAncestors(target);
        }

        onGuidesChange(guides);
    };

    const clearGuides = () => onGuidesChange([]);

    canvas.on('object:moving', handleMoving);
    canvas.on('mouse:up', clearGuides);
    canvas.on('object:modified', clearGuides);

    return () => {
        canvas.off('object:moving', handleMoving);
        canvas.off('mouse:up', clearGuides);
        canvas.off('object:modified', clearGuides);
    };
}

import { PASTEBOARD_PAD, OUTSIDE_CANVAS_MODES } from './outsideCanvasModes';

export { PASTEBOARD_PAD, OUTSIDE_CANVAS_MODES };

export function applyPasteboardOverlayEffect(
    canvas,
    artboardsOrW,
    modeOrH,
    modeOrScratch = 'grayscale-dim',
    scratchOrOpacity = null,
    maybeOpacity = null
) {
    const isArrayMode = Array.isArray(artboardsOrW);
    const artboards = isArrayMode
        ? artboardsOrW
        : [{ x: 0, y: 0, width: Number(artboardsOrW) || 1, height: Number(modeOrH) || 1, visible: true }];
    const mode = isArrayMode ? (modeOrH || 'grayscale-dim') : modeOrScratch;
    const scratchRef = isArrayMode ? modeOrScratch : scratchOrOpacity;
    const opacity = isArrayMode ? scratchOrOpacity : maybeOpacity;

    if (!canvas || mode === 'original') return;
    const el = canvas.lowerCanvasEl;
    const ctx = canvas.getContext?.();
    if (!el || !ctx || !el.width || !el.height) return;

    const v = canvas.viewportTransform || [1, 0, 0, 1, 0, 0];
    const canvasCssW = Math.max(1, canvas.getWidth?.() || el.width);
    const dpr = el.width / canvasCssW;
    const scaleX = v[0] || 1;
    const scaleY = v[3] || 1;

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.beginPath();
    ctx.rect(0, 0, el.width, el.height);
    for (const ab of artboards) {
        if (!ab || ab.visible === false) continue;
        const ax = Number(ab.x) || 0;
        const ay = Number(ab.y) || 0;
        const aw = Math.max(1, Number(ab.width) || 1);
        const ah = Math.max(1, Number(ab.height) || 1);
        const abPxLeft = (ax * scaleX + (v[4] || 0)) * dpr;
        const abPxTop = (ay * scaleY + (v[5] || 0)) * dpr;
        const abPxW = aw * scaleX * dpr;
        const abPxH = ah * scaleY * dpr;
        ctx.rect(abPxLeft, abPxTop, abPxW, abPxH);
    }
    ctx.clip('evenodd');

    if (mode === 'hidden') {
        ctx.clearRect(0, 0, el.width, el.height);
        ctx.restore();
        return;
    }

    let scratch = scratchRef?.current || null;
    if (!scratch && typeof document !== 'undefined') {
        scratch = document.createElement('canvas');
        if (scratchRef) scratchRef.current = scratch;
    }
    if (!scratch) {
        ctx.restore();
        return;
    }
    if (scratch.width !== el.width || scratch.height !== el.height) {
        scratch.width = el.width;
        scratch.height = el.height;
    }
    const sCtx = scratch.getContext('2d');
    sCtx.setTransform(1, 0, 0, 1, 0, 0);
    sCtx.clearRect(0, 0, scratch.width, scratch.height);
    sCtx.drawImage(el, 0, 0);

    const customAlpha = Number.isFinite(Number(opacity))
        ? Math.min(1, Math.max(0.05, Number(opacity)))
        : null;

    ctx.clearRect(0, 0, el.width, el.height);
    if (mode === 'grayscale') {
        ctx.filter = 'grayscale(100%)';
        ctx.globalAlpha = 0.9;
    } else if (mode === 'dimmed') {
        ctx.filter = 'none';
        ctx.globalAlpha = customAlpha ?? 0.42;
    } else {
        ctx.filter = 'grayscale(100%) contrast(0.92)';
        ctx.globalAlpha = customAlpha ?? 0.5;
    }
    ctx.drawImage(scratch, 0, 0);
    ctx.filter = 'none';
    ctx.restore();
}

function captureScopedArtboardDataUrl(
    canvas,
    maxW,
    maxH,
    opts = {},
    logicalW = null,
    logicalH = null,
    artboardX = 0,
    artboardY = 0
) {
    if (!canvas) return null;
    const prevVpt = [...(canvas.viewportTransform || [1, 0, 0, 1, 0, 0])];
    const prevW = canvas.getWidth?.() || 0;
    const prevH = canvas.getHeight?.() || 0;
    const prevZoom = prevVpt[0] || 1;
    const padX = prevVpt[4] || 0;
    const padY = prevVpt[5] || 0;
    const lw = Math.max(1, Number(logicalW) || Math.round((prevW - padX * 2) / prevZoom));
    const lh = Math.max(1, Number(logicalH) || Math.round((prevH - padY * 2) / prevZoom));
    if (lw <= 0 || lh <= 0) return null;
    const scale = Math.min(maxW / lw, maxH / lh, 1);
    const ax = Number(artboardX) || 0;
    const ay = Number(artboardY) || 0;

    canvas.__suppressPasteboardEffect = true;
    try {
        canvas.setViewportTransform([scale, 0, 0, scale, -ax * scale, -ay * scale]);
        canvas.setDimensions({
            width: Math.max(1, Math.round(lw * scale)),
            height: Math.max(1, Math.round(lh * scale)),
        });
        canvas.renderAll();
        return canvas.toDataURL({ format: 'png', ...opts });
    } finally {
        canvas.__suppressPasteboardEffect = false;
        canvas.setViewportTransform(prevVpt);
        canvas.setDimensions({ width: prevW, height: prevH });
        canvas.renderAll();
    }
}

export function generateArtboardThumbnails(canvas, artboards = []) {
    if (!canvas || !Array.isArray(artboards) || artboards.length === 0) return [];
    const prevVpt = [...(canvas.viewportTransform || [1, 0, 0, 1, 0, 0])];
    const prevW = canvas.getWidth?.() || 0;
    const prevH = canvas.getHeight?.() || 0;
    const previews = [];

    canvas.__suppressPasteboardEffect = true;
    try {
        for (const ab of artboards) {
            const lw = Math.max(1, Number(ab.width) || 1080);
            const lh = Math.max(1, Number(ab.height) || 1080);
            const scale = Math.min(360 / lw, 360 / lh, 1);
            const ax = Number(ab.x) || 0;
            const ay = Number(ab.y) || 0;
            canvas.setViewportTransform([scale, 0, 0, scale, -ax * scale, -ay * scale]);
            canvas.setDimensions({
                width: Math.max(1, Math.round(lw * scale)),
                height: Math.max(1, Math.round(lh * scale)),
            });
            canvas.renderAll();
            const thumb = canvas.toDataURL({ format: 'png', quality: 0.8 });
            previews.push({
                id: ab.id,
                name: ab.name || 'Artboard',
                width: lw,
                height: lh,
                thumbnail: thumb,
            });
        }
    } catch {
        // fallback gracefully
    } finally {
        canvas.__suppressPasteboardEffect = false;
        canvas.setViewportTransform(prevVpt);
        canvas.setDimensions({ width: prevW, height: prevH });
        canvas.renderAll();
    }
    return previews;
}

// ==================== PALETTE EXTRACTION FROM ACTIVE CANVAS ====================
export async function extractPaletteFromCanvas(canvas, logicalW = null, logicalH = null) {
    try {
        const dataUrl = captureScopedArtboardDataUrl(canvas, 320, 320, {}, logicalW, logicalH);
        if (!dataUrl) throw new Error('Empty canvas');

        const img = await new Promise((resolve, reject) => {
            const el = new Image();
            el.onload = () => resolve(el);
            el.onerror = reject;
            el.src = dataUrl;
        });

        return extractColorPalette(img, 8);
    } catch {
        return ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#0f172a', '#ffffff'];
    }
}

// ==================== EXPORT RENDERING ====================
export async function renderPageOffscreen(pageData, { format = 'png', quality = 0.92, multiplier = 1, transparent = true }) {
    const w = Number(pageData.width) || 1080;
    const h = Number(pageData.height) || 1080;

    const el = document.createElement('canvas');
    el.width = w;
    el.height = h;
    const sc = new StaticCanvas(el, { width: w, height: h });

    const jsonCopy = JSON.parse(JSON.stringify(pageData.fabricJson || { version: '6.0.0', objects: [] }));
    (jsonCopy.objects || []).forEach((o) => {
        if (!o.originX) o.originX = 'left';
        if (!o.originY) o.originY = 'top';
    });
    await sc.loadFromJSON(jsonCopy);

    if (format === 'jpeg' || (!transparent && !sc.backgroundColor)) {
        if (!sc.backgroundColor) {
            sc.backgroundColor = '#ffffff';
        }
    } else if (transparent && !pageData.background && (!pageData.bgMeta || pageData.bgMeta.mode === 'transparent')) {
        sc.backgroundColor = null;
    }

    sc.renderAll();

    if (format === 'svg') {
        const svgMarkup = sc.toSVG();
        sc.dispose();
        return new Blob([svgMarkup], { type: 'image/svg+xml;charset=utf-8' });
    }

    const mime = format === 'jpeg' ? 'image/jpeg' : format === 'webp' ? 'image/webp' : 'image/png';
    const dataUrl = sc.toDataURL({
        format: format === 'jpeg' ? 'jpeg' : format === 'webp' ? 'webp' : 'png',
        quality: Math.max(0.1, Math.min(1, quality)),
        multiplier,
    });
    sc.dispose();

    const resp = await fetch(dataUrl);
    return resp.blob();
}

export async function renderArtboardOffscreen(
    artboard,
    fabricJson,
    { format = 'png', quality = 0.92, multiplier = 1, transparent = true } = {},
    isPrimaryArtboard = false
) {
    const w = Math.max(1, Number(artboard?.width) || 1080);
    const h = Math.max(1, Number(artboard?.height) || 1080);
    const ax = Number(artboard?.x) || 0;
    const ay = Number(artboard?.y) || 0;

    const el = document.createElement('canvas');
    el.width = w;
    el.height = h;
    const sc = new StaticCanvas(el, { width: w, height: h });

    const jsonCopy = JSON.parse(JSON.stringify(fabricJson || { version: '6.0.0', objects: [] }));
    jsonCopy.objects = (jsonCopy.objects || [])
        .filter((o) => {
            if (!artboard?.id) return true;
            if (!o.artboardId) return isPrimaryArtboard;
            return o.artboardId === artboard.id;
        })
        .map((o) => ({
            ...o,
            originX: o.originX || 'left',
            originY: o.originY || 'top',
        }));

    delete jsonCopy.background;
    delete jsonCopy.backgroundColor;
    await sc.loadFromJSON(jsonCopy);

    const artboardBg = makeArtboardBackgroundFill(artboard, 0, 0);
    if (artboardBg) {
        sc.backgroundColor = artboardBg;
    } else if (format === 'jpeg' || (!transparent && (!artboard?.bgMeta || artboard.bgMeta.mode === 'transparent'))) {
        sc.backgroundColor = '#ffffff';
    } else {
        sc.backgroundColor = null;
    }

    sc.setViewportTransform([1, 0, 0, 1, -ax, -ay]);
    sc.renderAll();

    if (format === 'svg') {
        const svgMarkup = sc.toSVG();
        sc.dispose();
        return new Blob([svgMarkup], { type: 'image/svg+xml;charset=utf-8' });
    }

    const dataUrl = sc.toDataURL({
        format: format === 'jpeg' ? 'jpeg' : format === 'webp' ? 'webp' : 'png',
        quality: Math.max(0.1, Math.min(1, quality)),
        multiplier,
    });
    sc.dispose();

    const resp = await fetch(dataUrl);
    return resp.blob();
}

export async function exportArtboardsAsZip(artboards = [], fabricJson, safeTitle, exportOpts) {
    const files = [];
    const ext = exportOpts.format === 'jpeg' ? 'jpg' : exportOpts.format;
    for (let i = 0; i < artboards.length; i += 1) {
        const ab = artboards[i];
        const blob = await renderArtboardOffscreen(ab, fabricJson, exportOpts, i === 0);
        const bytes = new Uint8Array(await blob.arrayBuffer());
        const abSlug = String(ab.name || `artboard-${i + 1}`)
            .toLowerCase()
            .replace(/[^a-z0-9-_]+/g, '-');
        files.push({
            name: `${safeTitle}-${String(i + 1).padStart(2, '0')}-${abSlug}-${ab.width}x${ab.height}.${ext}`,
            data: bytes,
        });
    }
    return buildZipBlob(files);
}

export async function generateThumbnailDataUrl(canvas, logicalW, logicalH, artboardX = 0, artboardY = 0) {
    try {
        return captureScopedArtboardDataUrl(canvas, 400, 300, { quality: 0.85 }, logicalW, logicalH, artboardX, artboardY);
    } catch {
        return null;
    }
}

export async function exportPagesAsZip(pages, safeTitle, exportOpts) {
    const files = [];
    const ext = exportOpts.format === 'jpeg' ? 'jpg' : exportOpts.format;
    for (let i = 0; i < pages.length; i++) {
        const page = pages[i];
        const pageArtboards = Array.isArray(page.artboards) && page.artboards.length > 0 ? page.artboards : null;
        if (pageArtboards && pageArtboards.length > 1) {
            for (let j = 0; j < pageArtboards.length; j += 1) {
                const ab = pageArtboards[j];
                const blob = await renderArtboardOffscreen(ab, page.fabricJson, exportOpts, j === 0);
                const bytes = new Uint8Array(await blob.arrayBuffer());
                const abSlug = String(ab.name || `artboard-${j + 1}`)
                    .toLowerCase()
                    .replace(/[^a-z0-9-_]+/g, '-');
                files.push({
                    name: `${safeTitle}-p${i + 1}-${abSlug}-${ab.width}x${ab.height}.${ext}`,
                    data: bytes,
                });
            }
        } else {
            const blob = pageArtboards?.[0]
                ? await renderArtboardOffscreen(pageArtboards[0], page.fabricJson, exportOpts, true)
                : await renderPageOffscreen(page, exportOpts);
            const bytes = new Uint8Array(await blob.arrayBuffer());
            const pageName = String(page.name || `page-${i + 1}`)
                .toLowerCase()
                .replace(/[^a-z0-9-_]+/g, '-');
            files.push({
                name: `${safeTitle}-${String(i + 1).padStart(2, '0')}-${pageName}.${ext}`,
                data: bytes,
            });
        }
    }
    return buildZipBlob(files);
}

export function normalizeFabricLayerMetadata(obj) {
    if (!obj) return;
    if (!obj.layerId) obj.set('layerId', uid('layer'));
    if (!obj.layerName) {
        const t = (obj.type || 'Layer').toLowerCase();
        if (t.includes('text')) {
            obj.set('layerName', (obj.text || 'Text').slice(0, 24));
        } else if (t === 'image') {
            obj.set('layerName', obj.assetName || 'Image Layer');
        } else if (t === 'path') {
            obj.set('layerName', 'Brush / Path');
        } else if (t === 'group') {
            obj.set('layerName', 'Group');
        } else {
            obj.set('layerName', obj.type || 'Layer');
        }
    }
    if ((obj.type || '').toLowerCase() === 'group' && typeof obj.getObjects === 'function') {
        obj.getObjects().forEach(normalizeFabricLayerMetadata);
    }
}

export function assignFreshLayerIds(obj) {
    if (!obj) return;
    obj.set('layerId', uid('layer'));
    if ((obj.type || '').toLowerCase() === 'group' && typeof obj.getObjects === 'function') {
        obj.getObjects().forEach(assignFreshLayerIds);
    }
}

export function loadImageLayer(url, meta = {}) {
    return FabricImage.fromURL(url, { crossOrigin: 'anonymous' }).then((img) => {
        img.set({
            layerId: uid('layer'),
            layerName: meta.name || 'PNG Asset',
            assetId: meta.assetId || undefined,
            originX: 'center',
            originY: 'center',
        });
        return img;
    });
}

export const BLEND_MODES = [
    { value: 'source-over', label: 'Normal' },
    { value: 'dissolve', label: 'Dissolve' },
    { value: 'darken', label: 'Darken' },
    { value: 'multiply', label: 'Multiply' },
    { value: 'color-burn', label: 'Color Burn' },
    { value: 'lighten', label: 'Lighten' },
    { value: 'screen', label: 'Screen' },
    { value: 'color-dodge', label: 'Color Dodge' },
    { value: 'overlay', label: 'Overlay' },
    { value: 'soft-light', label: 'Soft Light' },
    { value: 'hard-light', label: 'Hard Light' },
    { value: 'difference', label: 'Difference' },
    { value: 'exclusion', label: 'Exclusion' },
    { value: 'subtract', label: 'Subtract' },
];

const VALID_BLEND_MODE_SET = new Set(BLEND_MODES.map((m) => m.value));

export function normalizeBlendMode(mode) {
    const clean = typeof mode === 'string' ? mode.trim().toLowerCase() : 'source-over';
    return VALID_BLEND_MODE_SET.has(clean) ? clean : 'source-over';
}

export function getBlendModeLabel(mode) {
    const norm = normalizeBlendMode(mode);
    return BLEND_MODES.find((m) => m.value === norm)?.label || 'Normal';
}

export const FRAME_OPTIONS = [
    { id: 'none', label: 'Original' },
    { id: 'circle', label: 'Circle' },
    { id: 'rounded', label: 'Rounded' },
    { id: 'arch', label: 'Arch' },
    { id: 'hexagon', label: 'Hexagon' },
    { id: 'star', label: 'Star' },
    { id: 'diamond', label: 'Diamond' },
];

export function createTextboxLayer(text, opts = {}) {
    return new Textbox(text, {
        layerId: uid('layer'),
        layerName: opts.layerName || text.slice(0, 22),
        fontFamily: opts.fontFamily || 'Inter',
        fontSize: opts.fontSize || 64,
        fontWeight: opts.fontWeight || '700',
        fill: opts.fill || '#ffffff',
        width: opts.width || 620,
        textAlign: opts.textAlign || 'center',
        originX: 'center',
        originY: 'center',
        left: opts.left ?? 540,
        top: opts.top ?? 540,
        lineHeight: opts.lineHeight || 1.15,
        charSpacing: opts.charSpacing || 0,
    });
}

function makeRotateCursor(deg = 0) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><g transform="rotate(${Math.round(deg)} 12 12)"><path d="M7.2 8.8A6 6 0 0 1 16.8 8.8" fill="none" stroke="#ffffff" stroke-width="3.6" stroke-linecap="round"/><path d="M7.2 8.8A6 6 0 0 1 16.8 8.8" fill="none" stroke="#0f172a" stroke-width="1.8" stroke-linecap="round"/><path d="M5.2 7.1L7 10.9L10.1 8.4Z" fill="#0f172a" stroke="#ffffff" stroke-width="1"/><path d="M18.8 7.1L17 10.9L13.9 8.4Z" fill="#0f172a" stroke="#ffffff" stroke-width="1"/></g></svg>`;
    return `url("data:image/svg+xml,${encodeURIComponent(svg)}") 12 12, grab`;
}

function renderCircleCornerControl(ctx, left, top, styleOverride, fabricObject) {
    const size = styleOverride?.cornerSize ?? fabricObject?.cornerSize ?? 11;
    const r = size / 2;
    ctx.save();
    ctx.shadowColor = 'rgba(15, 23, 42, 0.25)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetY = 1;
    ctx.beginPath();
    ctx.arc(left, top, r, 0, Math.PI * 2);
    ctx.fillStyle = styleOverride?.cornerColor || '#ffffff';
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.lineWidth = 1.8;
    ctx.strokeStyle = styleOverride?.cornerStrokeColor || '#7c3aed';
    ctx.stroke();
    ctx.restore();
}

function renderPillEdgeControl(isVertical) {
    return function (ctx, left, top, styleOverride, fabricObject) {
        const w = isVertical ? 5 : 16;
        const h = isVertical ? 16 : 5;
        const rad = 2.5;
        const angle = ((fabricObject?.getTotalAngle?.() || 0) * Math.PI) / 180;
        ctx.save();
        ctx.translate(left, top);
        ctx.rotate(angle);
        ctx.shadowColor = 'rgba(15, 23, 42, 0.24)';
        ctx.shadowBlur = 4;
        ctx.shadowOffsetY = 1;
        ctx.beginPath();
        if (typeof ctx.roundRect === 'function') {
            ctx.roundRect(-w / 2, -h / 2, w, h, rad);
        } else {
            ctx.rect(-w / 2, -h / 2, w, h);
        }
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.shadowColor = 'transparent';
        ctx.lineWidth = 1.6;
        ctx.strokeStyle = styleOverride?.cornerStrokeColor || '#7c3aed';
        ctx.stroke();
        ctx.restore();
    };
}

function renderCanvaRotateButton(ctx, left, top, styleOverride, fabricObject) {
    const isActiveRot = fabricObject?.__corner === 'mtr';
    const r = 11.5;
    ctx.save();
    ctx.shadowColor = 'rgba(15, 23, 42, 0.22)';
    ctx.shadowBlur = 6;
    ctx.shadowOffsetY = 2;
    ctx.beginPath();
    ctx.arc(left, top, r, 0, Math.PI * 2);
    ctx.fillStyle = isActiveRot ? '#7c3aed' : '#ffffff';
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.lineWidth = 1.4;
    ctx.strokeStyle = isActiveRot ? '#6d28d9' : '#cbd5e1';
    ctx.stroke();

    const iconColor = isActiveRot ? '#ffffff' : '#334155';
    ctx.strokeStyle = iconColor;
    ctx.fillStyle = iconColor;
    ctx.lineWidth = 1.5;
    ctx.lineCap = 'round';
    const ar = 4.8;
    ctx.beginPath();
    ctx.arc(left, top, ar, -Math.PI * 0.85, Math.PI * 0.05);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(left + ar + 2.1, top - 0.8);
    ctx.lineTo(left + ar - 1.9, top - 0.6);
    ctx.lineTo(left + ar + 0.5, top + 2.4);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.arc(left, top, ar, Math.PI * 0.15, Math.PI * 1.05);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(left - ar - 2.1, top + 0.8);
    ctx.lineTo(left - ar + 1.9, top + 0.6);
    ctx.lineTo(left - ar - 0.5, top - 2.4);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
}

function makeCornerRotateZone(x, y, offsetX, offsetY, baseDeg) {
    return new Control({
        x,
        y,
        offsetX,
        offsetY,
        sizeX: 22,
        sizeY: 22,
        touchSizeX: 28,
        touchSizeY: 28,
        actionHandler: controlsUtils.rotationWithSnapping,
        actionName: 'rotate',
        cursorStyleHandler: (_, __, fabricObject) =>
            makeRotateCursor((fabricObject?.getTotalAngle?.() || 0) + baseDeg),
        render: () => {},
    });
}

function buildStyledControlSet(baseControls = {}) {
    const styled = {
        // Put outer-corner rotation hit zones first so Fabric's reverse scan prioritizes corner resize on top of corners
        rot_tl: makeCornerRotateZone(-0.5, -0.5, -16, -16, -45),
        rot_tr: makeCornerRotateZone(0.5, -0.5, 16, -16, 45),
        rot_br: makeCornerRotateZone(0.5, 0.5, 16, 16, 135),
        rot_bl: makeCornerRotateZone(-0.5, 0.5, -16, 16, -135),
        ...baseControls,
    };

    ['tl', 'tr', 'bl', 'br'].forEach((k) => {
        if (styled[k]) {
            styled[k].render = renderCircleCornerControl;
            styled[k].sizeX = 14;
            styled[k].sizeY = 14;
            styled[k].touchSizeX = 22;
            styled[k].touchSizeY = 22;
        }
    });
    ['ml', 'mr'].forEach((k) => {
        if (styled[k]) {
            styled[k].render = renderPillEdgeControl(true);
            styled[k].sizeX = 10;
            styled[k].sizeY = 20;
        }
    });
    ['mt', 'mb'].forEach((k) => {
        if (styled[k]) {
            styled[k].render = renderPillEdgeControl(false);
            styled[k].sizeX = 20;
            styled[k].sizeY = 10;
        }
    });
    if (styled.mtr) {
        styled.mtr.withConnection = false;
        styled.mtr.x = 0;
        styled.mtr.y = 0.5;
        styled.mtr.offsetY = 28;
        styled.mtr.sizeX = 26;
        styled.mtr.sizeY = 26;
        styled.mtr.touchSizeX = 34;
        styled.mtr.touchSizeY = 34;
        styled.mtr.render = renderCanvaRotateButton;
        styled.mtr.cursorStyleHandler = (_, control, fabricObject) =>
            makeRotateCursor((fabricObject?.getTotalAngle?.() || 0) + (control.y > 0 ? 180 : 0));
    }
    return styled;
}

export function installCanvaFabricControls() {
    const themeDefaults = {
        borderColor: '#7c3aed',
        borderScaleFactor: 1.75,
        borderOpacityWhenMoving: 0.45,
        cornerColor: '#ffffff',
        cornerStrokeColor: '#7c3aed',
        cornerStyle: 'circle',
        cornerSize: 11,
        transparentCorners: false,
        padding: 0,
    };
    Object.assign(FabricObject.ownDefaults, themeDefaults);
    Object.assign(InteractiveFabricObject.ownDefaults, themeDefaults);
    if (Textbox.ownDefaults) {
        Object.assign(Textbox.ownDefaults, themeDefaults);
    }

    if (!InteractiveFabricObject._origCreateControls) {
        InteractiveFabricObject._origCreateControls = InteractiveFabricObject.createControls;
    }
    if (!Textbox._origCreateControls) {
        Textbox._origCreateControls = Textbox.createControls;
    }

    InteractiveFabricObject.createControls = function () {
        const res = InteractiveFabricObject._origCreateControls.call(this);
        return { controls: buildStyledControlSet(res?.controls || {}) };
    };
    Textbox.createControls = function () {
        const res = Textbox._origCreateControls.call(this);
        return { controls: buildStyledControlSet(res?.controls || {}) };
    };
}

export function syncRotationHandlePlacement(canvas, toolbarPlacement = 'above') {
    if (!canvas) return;
    const active = canvas.getActiveObject?.();
    if (!active || !active.controls?.mtr) return;
    const wantScreenTop = toolbarPlacement === 'below';
    const angleRad = ((active.getTotalAngle?.() || 0) * Math.PI) / 180;
    const upsideDown = Math.cos(angleRad) < 0;
    const putAtLocalTop = wantScreenTop ? !upsideDown : upsideDown;
    const nextY = putAtLocalTop ? -0.5 : 0.5;
    const nextOffsetY = putAtLocalTop ? -28 : 28;
    const mtr = active.controls.mtr;
    if (mtr.y !== nextY || mtr.offsetY !== nextOffsetY) {
        mtr.y = nextY;
        mtr.offsetY = nextOffsetY;
        active.setCoords?.();
        canvas.requestRenderAll?.();
    }
}
