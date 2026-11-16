import { Gradient } from 'fabric';

export const DEFAULT_ARTBOARD_GAP = 120;

export function createArtboardRecord({
    id,
    name = 'Artboard 1',
    x = 0,
    y = 0,
    width = 1080,
    height = 1080,
    visible = true,
    locked = false,
    transparent = true,
    bgMeta = null,
    background = null,
} = {}) {
    const resolvedBgMeta = bgMeta
        ? { ...bgMeta }
        : {
              mode: transparent ? 'transparent' : 'solid',
              color: background || '#ffffff',
              gradientType: 'linear',
              gradientAngle: 135,
              gradientFrom: '#4f46e5',
              gradientTo: '#7c3aed',
          };
    const resolvedBg =
        resolvedBgMeta.mode === 'solid'
            ? resolvedBgMeta.color || '#ffffff'
            : background || null;

    return {
        id: id || `ab-${Math.random().toString(36).slice(2, 9)}-${Date.now().toString(36)}`,
        name: String(name || 'Artboard 1').trim() || 'Artboard 1',
        x: Math.round(Number(x) || 0),
        y: Math.round(Number(y) || 0),
        width: Math.max(32, Math.round(Number(width) || 1080)),
        height: Math.max(32, Math.round(Number(height) || 1080)),
        visible: visible !== false,
        locked: Boolean(locked),
        bgMeta: resolvedBgMeta,
        background: resolvedBg,
    };
}

export function normalizeArtboardsForPage(page, fallbackW = 1080, fallbackH = 1080, fallbackTrans = true) {
    if (Array.isArray(page?.artboards) && page.artboards.length > 0) {
        return page.artboards.map((ab, idx) =>
            createArtboardRecord({
                id: ab?.id,
                name: ab?.name || `Artboard ${idx + 1}`,
                x: ab?.x ?? 0,
                y: ab?.y ?? 0,
                width: ab?.width || page?.width || fallbackW,
                height: ab?.height || page?.height || fallbackH,
                visible: ab?.visible !== false,
                locked: Boolean(ab?.locked),
                transparent: ab?.bgMeta ? ab.bgMeta.mode === 'transparent' : fallbackTrans,
                bgMeta: ab?.bgMeta || null,
                background: ab?.background ?? null,
            })
        );
    }

    const w = Math.max(32, Math.round(Number(page?.width) || fallbackW));
    const h = Math.max(32, Math.round(Number(page?.height) || fallbackH));
    const bgMeta = page?.bgMeta
        ? { ...page.bgMeta }
        : page?.background
          ? {
                mode: 'solid',
                color: page.background,
                gradientType: 'linear',
                gradientAngle: 135,
                gradientFrom: '#4f46e5',
                gradientTo: '#7c3aed',
            }
          : {
                mode: fallbackTrans ? 'transparent' : 'solid',
                color: '#ffffff',
                gradientType: 'linear',
                gradientAngle: 135,
                gradientFrom: '#4f46e5',
                gradientTo: '#7c3aed',
            };

    return [
        createArtboardRecord({
            id: page?.defaultArtboardId || 'artboard-1',
            name: 'Artboard 1',
            x: 0,
            y: 0,
            width: w,
            height: h,
            visible: true,
            locked: false,
            transparent: bgMeta.mode === 'transparent',
            bgMeta,
            background: page?.background ?? (bgMeta.mode === 'solid' ? bgMeta.color : null),
        }),
    ];
}

export function getArtboardWorkspaceBounds(artboards = [], fallbackW = 1080, fallbackH = 1080) {
    const list = Array.isArray(artboards) && artboards.length > 0
        ? artboards
        : [{ x: 0, y: 0, width: fallbackW, height: fallbackH }];
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const ab of list) {
        const x = Number(ab.x) || 0;
        const y = Number(ab.y) || 0;
        const w = Math.max(1, Number(ab.width) || fallbackW);
        const h = Math.max(1, Number(ab.height) || fallbackH);
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x + w > maxX) maxX = x + w;
        if (y + h > maxY) maxY = y + h;
    }
    if (!Number.isFinite(minX)) {
        return { minX: 0, minY: 0, maxX: fallbackW, maxY: fallbackH, totalW: fallbackW, totalH: fallbackH };
    }
    return {
        minX,
        minY,
        maxX,
        maxY,
        totalW: Math.max(1, maxX - minX),
        totalH: Math.max(1, maxY - minY),
    };
}

export function computeNextArtboardPosition(artboards = [], _newWidth = 1080, _newHeight = 1080, anchorArtboard = null) {
    if (!Array.isArray(artboards) || artboards.length === 0) {
        return { x: 0, y: 0 };
    }
    let maxRight = -Infinity;
    for (const ab of artboards) {
        const right = (Number(ab.x) || 0) + (Number(ab.width) || 1080);
        if (right > maxRight) maxRight = right;
    }
    const baseY = anchorArtboard ? Number(anchorArtboard.y) || 0 : Number(artboards[0].y) || 0;
    return {
        x: Math.round(maxRight + DEFAULT_ARTBOARD_GAP),
        y: Math.round(baseY),
    };
}

export function findArtboardContainingPoint(artboards = [], x = 0, y = 0) {
    if (!Array.isArray(artboards) || !artboards.length) return null;
    for (const ab of artboards) {
        const ax = Number(ab.x) || 0;
        const ay = Number(ab.y) || 0;
        const aw = Number(ab.width) || 0;
        const ah = Number(ab.height) || 0;
        if (x >= ax && x <= ax + aw && y >= ay && y <= ay + ah) {
            return ab;
        }
    }
    return null;
}

export function makeArtboardBackgroundFill(ab, originX = 0, originY = 0) {
    const bg = ab?.bgMeta;
    if (!bg || bg.mode === 'transparent') return null;
    if (bg.mode !== 'gradient') {
        return bg.color || ab.background || '#ffffff';
    }
    const w = Math.max(1, Number(ab.width) || 1080);
    const h = Math.max(1, Number(ab.height) || 1080);
    if (bg.gradientType === 'radial') {
        return new Gradient({
            type: 'radial',
            gradientUnits: 'pixels',
            coords: {
                x1: originX + w / 2,
                y1: originY + h / 2,
                r1: 0,
                x2: originX + w / 2,
                y2: originY + h / 2,
                r2: Math.max(w, h) * 0.65,
            },
            colorStops: [
                { offset: 0, color: bg.gradientFrom || '#4f46e5' },
                { offset: 1, color: bg.gradientTo || '#7c3aed' },
            ],
        });
    }
    const rad = (((Number(bg.gradientAngle) || 135) - 90) * Math.PI) / 180;
    const cx = originX + w / 2;
    const cy = originY + h / 2;
    const len = Math.max(w, h) * 0.65;
    return new Gradient({
        type: 'linear',
        gradientUnits: 'pixels',
        coords: {
            x1: cx - Math.cos(rad) * len,
            y1: cy - Math.sin(rad) * len,
            x2: cx + Math.cos(rad) * len,
            y2: cy + Math.sin(rad) * len,
        },
        colorStops: [
            { offset: 0, color: bg.gradientFrom || '#4f46e5' },
            { offset: 1, color: bg.gradientTo || '#7c3aed' },
        ],
    });
}
