import {
    FabricImage,
    Gradient,
    Group,
    IText,
    Path,
    Rect,
    loadSVGFromURL,
    util,
} from 'fabric';
import { createArtboardRecord } from './artboardHelpers';
import { assignFreshLayerIds, renderArtboardOffscreen, uid } from './editorHelpers';

const SHIELD_PATH_D =
    'M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z';

export const DEFAULT_BRAND_SUITE_SPECS = [
    {
        id: 'brand-logo',
        role: 'logo',
        name: 'Website Logo',
        width: 480,
        height: 120,
        format: 'svg',
        x: 0,
        y: 0,
    },
    {
        id: 'brand-icon',
        role: 'icon',
        name: 'Website Icon',
        width: 256,
        height: 256,
        format: 'svg',
        x: 600,
        y: 0,
    },
    {
        id: 'brand-favicon',
        role: 'favicon',
        name: 'Browser Favicon',
        width: 96,
        height: 96,
        format: 'png',
        x: 976,
        y: 0,
    },
];

function tagObjectTreeWithArtboard(obj, artboardId, layerName) {
    if (!obj) return;
    obj.set({
        artboardId,
        layerId: obj.layerId || uid('layer'),
        ...(layerName && !obj.layerName ? { layerName } : {}),
    });
    if ((obj.type || '').toLowerCase() === 'group' && typeof obj.getObjects === 'function') {
        obj.getObjects().forEach((child) => tagObjectTreeWithArtboard(child, artboardId, child.layerName));
    }
}

function buildBlueGradient(width, height) {
    return new Gradient({
        type: 'linear',
        gradientUnits: 'pixels',
        coords: { x1: 0, y1: 0, x2: width, y2: height },
        colorStops: [
            { offset: 0, color: '#3b82f6' },
            { offset: 0.5, color: '#2563eb' },
            { offset: 1, color: '#4f46e5' },
        ],
    });
}

function createShieldIconGroup(boxSize, artboardId, layerName) {
    const bgRect = new Rect({
        left: 0,
        top: 0,
        width: boxSize,
        height: boxSize,
        rx: Math.round(boxSize * 0.24),
        ry: Math.round(boxSize * 0.24),
        fill: buildBlueGradient(boxSize, boxSize),
        strokeWidth: 0,
        originX: 'left',
        originY: 'top',
    });

    const shieldPath = new Path(SHIELD_PATH_D, {
        fill: 'transparent',
        stroke: '#ffffff',
        strokeWidth: 2,
        strokeLineCap: 'round',
        strokeLineJoin: 'round',
        originX: 'center',
        originY: 'center',
    });
    const pathBounds = shieldPath.getBoundingRect();
    const targetShieldW = boxSize * 0.56;
    const shieldScale = targetShieldW / Math.max(1, pathBounds.width || 18);
    shieldPath.set({
        scaleX: shieldScale,
        scaleY: shieldScale,
        left: boxSize / 2,
        top: boxSize / 2,
    });

    const group = new Group([bgRect, shieldPath], {
        originX: 'center',
        originY: 'center',
        layerId: uid('layer'),
        layerName,
        artboardId,
    });
    tagObjectTreeWithArtboard(group, artboardId, layerName);
    return group;
}

function createDefaultIconLayer(artboard) {
    const padRatio = 0.82;
    const boxSize = Math.round(Math.min(artboard.width, artboard.height) * padRatio);
    const group = createShieldIconGroup(boxSize, artboard.id, `${artboard.name} Graphic`);
    group.set({
        left: artboard.x + artboard.width / 2,
        top: artboard.y + artboard.height / 2,
    });
    group.setCoords();
    return [group];
}

async function createDefaultLogoLayers(artboard, websiteName = 'Png101', customIconUrl = '') {
    const safeTitle = String(websiteName || 'Png101').trim() || 'Png101';
    const iconBoxSize = Math.round(artboard.height * 0.72);
    let iconLayer = null;
    if (customIconUrl) {
        try {
            const loaded = await loadExistingAssetIntoArtboard(
                { id: artboard.id, name: 'Logo Icon', x: 0, y: 0, width: iconBoxSize, height: iconBoxSize },
                customIconUrl
            );
            if (loaded?.[0]) {
                iconLayer = loaded[0];
                const boundsW = Math.max(1, (iconLayer.width || iconBoxSize) * (iconLayer.scaleX || 1));
                const boundsH = Math.max(1, (iconLayer.height || iconBoxSize) * (iconLayer.scaleY || 1));
                const fit = Math.min(iconBoxSize / boundsW, iconBoxSize / boundsH);
                iconLayer.set({
                    scaleX: (iconLayer.scaleX || 1) * fit,
                    scaleY: (iconLayer.scaleY || 1) * fit,
                    layerName: 'Logo Icon',
                    artboardId: artboard.id,
                });
            }
        } catch {
            iconLayer = null;
        }
    }
    const iconGroup = iconLayer || createShieldIconGroup(iconBoxSize, artboard.id, 'Logo Icon');

    const titleText = new IText(safeTitle, {
        fontFamily: 'Geist, Inter, system-ui, sans-serif',
        fontSize: Math.round(artboard.height * 0.44),
        fontWeight: '800',
        fill: '#3b82f6',
        originX: 'left',
        originY: 'center',
        layerId: uid('layer'),
        layerName: 'Brand Title',
        artboardId: artboard.id,
    });
    if (typeof titleText.initDimensions === 'function') {
        titleText.initDimensions();
    }

    // Center [Icon] + [Brand Title] cleanly inside the Website Logo artboard without any badge pill
    const renderedIconW = iconLayer
        ? Math.max(1, (iconLayer.width || iconBoxSize) * (iconLayer.scaleX || 1))
        : iconBoxSize;
    const titleWidth = Math.max(60, titleText.width || safeTitle.length * 32);
    const gap = Math.round(iconBoxSize * 0.24);
    const rawTotalW = renderedIconW + gap + titleWidth;
    const maxAllowedW = artboard.width * 0.9;
    const scale = Math.min(1, maxAllowedW / Math.max(1, rawTotalW));

    const startX = artboard.x + (artboard.width - rawTotalW * scale) / 2;
    const centerY = artboard.y + artboard.height / 2;

    iconGroup.set({
        scaleX: (iconLayer ? iconGroup.scaleX || 1 : 1) * scale,
        scaleY: (iconLayer ? iconGroup.scaleY || 1 : 1) * scale,
        left: startX + (renderedIconW * scale) / 2,
        top: centerY,
    });
    iconGroup.setCoords();

    titleText.set({
        scaleX: scale,
        scaleY: scale,
        left: startX + (renderedIconW + gap) * scale,
        top: centerY,
    });
    titleText.setCoords();

    tagObjectTreeWithArtboard(iconGroup, artboard.id, 'Logo Icon');
    tagObjectTreeWithArtboard(titleText, artboard.id, 'Brand Title');

    return [iconGroup, titleText];
}

async function loadExistingAssetIntoArtboard(artboard, assetUrl) {
    if (!assetUrl) return null;
    const cleanUrl = String(assetUrl).split('?')[0].toLowerCase();

    if (cleanUrl.endsWith('.svg')) {
        const res = await loadSVGFromURL(assetUrl);
        const objs = (res?.objects || []).filter(Boolean);
        if (!objs.length) return null;
        const grouped = util.groupSVGElements(objs, res?.options || {});
        const bw = Math.max(1, grouped.width || 100);
        const bh = Math.max(1, grouped.height || 100);
        // Avoid shrinking SVG logos on round-trip reloads when they already fit inside the artboard
        const fitsAsIs = bw <= artboard.width && bh <= artboard.height && (bw >= artboard.width * 0.45 || bh >= artboard.height * 0.45);
        const scale = fitsAsIs
            ? 1
            : Math.min((artboard.width * 0.92) / bw, (artboard.height * 0.92) / bh);
        grouped.set({
            originX: 'center',
            originY: 'center',
            scaleX: scale,
            scaleY: scale,
            left: artboard.x + artboard.width / 2,
            top: artboard.y + artboard.height / 2,
        });
        assignFreshLayerIds(grouped);
        tagObjectTreeWithArtboard(grouped, artboard.id, `Current ${artboard.name}`);
        grouped.setCoords();
        return [grouped];
    }

    const img = await FabricImage.fromURL(assetUrl, { crossOrigin: 'anonymous' });
    const iw = Math.max(1, img.width || artboard.width);
    const ih = Math.max(1, img.height || artboard.height);
    const scale = Math.min((artboard.width * 0.88) / iw, (artboard.height * 0.88) / ih);
    img.set({
        originX: 'center',
        originY: 'center',
        scaleX: scale,
        scaleY: scale,
        left: artboard.x + artboard.width / 2,
        top: artboard.y + artboard.height / 2,
        layerId: uid('layer'),
        layerName: `Current ${artboard.name}`,
        artboardId: artboard.id,
    });
    img.setCoords();
    return [img];
}

export function buildBrandSuitePage(brandSuiteMode) {
    const specs = Array.isArray(brandSuiteMode?.artboards) && brandSuiteMode.artboards.length
        ? brandSuiteMode.artboards
        : DEFAULT_BRAND_SUITE_SPECS;

    let cursorX = 0;
    const artboards = specs.map((spec, idx) => {
        const w = Math.max(32, Number(spec.width) || 256);
        const h = Math.max(32, Number(spec.height) || 256);
        const x = Number.isFinite(Number(spec.x)) ? Number(spec.x) : cursorX;
        cursorX = x + w + 120;
        return createArtboardRecord({
            id: spec.id || `brand-${spec.role || idx + 1}`,
            name: spec.name || `Artboard ${idx + 1}`,
            x,
            y: 0,
            width: w,
            height: h,
            transparent: true,
            bgMeta: {
                mode: 'transparent',
                color: '#ffffff',
                gradientType: 'linear',
                gradientAngle: 135,
                gradientFrom: '#1d4ed8',
                gradientTo: '#7c3aed',
            },
        });
    });

    const primary = artboards[0];
    return {
        id: uid('page'),
        width: primary.width,
        height: primary.height,
        presetLabel: 'Website Brand Suite',
        background: null,
        bgMeta: primary.bgMeta,
        artboards,
        fabricJson: { version: '6.0.0', objects: [] },
        thumbnail: null,
    };
}

export async function populateBrandSuiteCanvas(canvas, artboards = [], brandSuiteMode = {}) {
    if (!canvas || !artboards.length) return;
    const websiteName = brandSuiteMode?.websiteName || 'Png101';
    const specs = Array.isArray(brandSuiteMode?.artboards) && brandSuiteMode.artboards.length
        ? brandSuiteMode.artboards
        : DEFAULT_BRAND_SUITE_SPECS;

    for (let i = 0; i < artboards.length; i += 1) {
        const ab = artboards[i];
        const spec = specs.find((s) => s.id === ab.id) || specs[i] || {};
        const role = spec.role || (i === 0 ? 'logo' : i === 1 ? 'icon' : 'favicon');

        let loadedObjs = null;
        if (role === 'logo') {
            if (brandSuiteMode?.logoUrl) {
                try {
                    loadedObjs = await loadExistingAssetIntoArtboard(ab, brandSuiteMode.logoUrl);
                } catch {
                    loadedObjs = null;
                }
            }
            if (!loadedObjs) {
                loadedObjs = await createDefaultLogoLayers(ab, websiteName, brandSuiteMode?.iconUrl || '');
            }
        } else if (role === 'icon') {
            if (brandSuiteMode?.iconUrl) {
                try {
                    loadedObjs = await loadExistingAssetIntoArtboard(ab, brandSuiteMode.iconUrl);
                } catch {
                    loadedObjs = null;
                }
            }
            if (!loadedObjs) {
                loadedObjs = createDefaultIconLayer(ab);
            }
        } else if (role === 'favicon') {
            const favSrc = brandSuiteMode?.faviconUrl || brandSuiteMode?.iconUrl || '';
            if (favSrc) {
                try {
                    loadedObjs = await loadExistingAssetIntoArtboard(ab, favSrc);
                } catch {
                    loadedObjs = null;
                }
            }
            if (!loadedObjs) {
                loadedObjs = createDefaultIconLayer(ab);
            }
        }

        if (Array.isArray(loadedObjs)) {
            loadedObjs.forEach((obj) => canvas.add(obj));
        }
    }
}

async function inlineSvgRasterImages(svgBlob) {
    try {
        const text = await svgBlob.text();
        const matches = [...text.matchAll(/(xlink:href|href)=["'](\/[^"']+)["']/g)];
        if (!matches.length) return svgBlob;

        let next = text;
        const uniqueUrls = [...new Set(matches.map((m) => m[2]))];
        for (const relUrl of uniqueUrls) {
            try {
                const res = await fetch(relUrl);
                if (!res.ok) continue;
                const assetBlob = await res.blob();
                const dataUrl = await new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(typeof reader.result === 'string' ? reader.result : '');
                    reader.onerror = () => resolve('');
                    reader.readAsDataURL(assetBlob);
                });
                if (dataUrl) {
                    next = next.split(`"${relUrl}"`).join(`"${dataUrl}"`).split(`'${relUrl}'`).join(`'${dataUrl}'`);
                }
            } catch {
                // Keep original URL if fetch fails
            }
        }
        return new Blob([next], { type: 'image/svg+xml;charset=utf-8' });
    } catch {
        return svgBlob;
    }
}

export function computeBrandSuiteDigests(pageAbs = [], fabricJson = {}, brandSuiteMode = {}) {
    const specs = Array.isArray(brandSuiteMode?.artboards) && brandSuiteMode.artboards.length
        ? brandSuiteMode.artboards
        : DEFAULT_BRAND_SUITE_SPECS;
    const objects = Array.isArray(fabricJson?.objects) ? fabricJson.objects : [];
    const digests = {};
    specs.forEach((spec, idx) => {
        const ab = pageAbs.find((a) => a.id === spec.id) || pageAbs[idx];
        if (!ab) return;
        const abObjects = objects.filter((o) =>
            o?.artboardId ? o.artboardId === ab.id : pageAbs[0]?.id === ab.id
        );
        digests[spec.role] = JSON.stringify({
            w: ab.width,
            h: ab.height,
            bg: ab.bgMeta,
            objs: abObjects,
        });
    });
    return digests;
}

export async function renderBrandSuiteBlobs(pageAbs = [], fabricJson, brandSuiteMode = {}, rolesFilter = null) {
    const specs = Array.isArray(brandSuiteMode?.artboards) && brandSuiteMode.artboards.length
        ? brandSuiteMode.artboards
        : DEFAULT_BRAND_SUITE_SPECS;
    const allowedSet = Array.isArray(rolesFilter) ? new Set(rolesFilter) : null;

    const results = [];
    for (let i = 0; i < specs.length; i += 1) {
        const spec = specs[i];
        if (allowedSet && !allowedSet.has(spec.role)) continue;
        const targetAb =
            pageAbs.find((ab) => ab.id === spec.id) ||
            pageAbs.find((ab) => String(ab.name || '').toLowerCase() === String(spec.name || '').toLowerCase()) ||
            pageAbs[i];
        if (!targetAb) continue;

        const format = spec.format === 'svg' ? 'svg' : 'png';
        const isPrimary = pageAbs[0]?.id === targetAb.id;
        let blob = await renderArtboardOffscreen(
            targetAb,
            fabricJson,
            {
                format,
                quality: 1,
                multiplier: 1,
                transparent: !targetAb?.bgMeta || targetAb.bgMeta.mode === 'transparent',
            },
            isPrimary
        );
        if (format === 'svg') {
            blob = await inlineSvgRasterImages(blob);
        }
        results.push({
            role: spec.role,
            name: targetAb.name || spec.name,
            format,
            blob,
        });
    }
    return results;
}
