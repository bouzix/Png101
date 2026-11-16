// Pure client-side image conversion, ICO packing, ZIP bundling, and solid background removal

export const SOCIAL_RESIZE_PRESETS = [
    { id: 'ig-square', label: 'Instagram Post', width: 1080, height: 1080, category: 'Social' },
    { id: 'ig-portrait', label: 'Instagram Portrait', width: 1080, height: 1350, category: 'Social' },
    { id: 'ig-story', label: 'Story / Reel / TikTok', width: 1080, height: 1920, category: 'Social' },
    { id: 'yt-thumb', label: 'YouTube Thumbnail', width: 1280, height: 720, category: 'Video' },
    { id: 'og-card', label: 'OG / Facebook Share', width: 1200, height: 630, category: 'Web' },
    { id: 'x-header', label: 'X / Twitter Header', width: 1500, height: 500, category: 'Social' },
    { id: 'li-banner', label: 'LinkedIn Banner', width: 1584, height: 396, category: 'Social' },
    { id: 'shopify-sq', label: 'E-Commerce Product', width: 2048, height: 2048, category: 'Store' },
    { id: 'hd-1080', label: 'Full HD 16:9', width: 1920, height: 1080, category: 'Web' },
    { id: 'favicon-256', label: 'App Icon 512px', width: 512, height: 512, category: 'Web' },
];

export const DEFAULT_ICO_SIZES = [16, 24, 32, 48, 64, 128, 256];

export function formatFileSize(bytes) {
    if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
    const val = bytes / Math.pow(1024, i);
    return `${val >= 100 || i === 0 ? Math.round(val) : val.toFixed(1)} ${units[i]}`;
}

export function stripExtension(filename = 'image') {
    const idx = filename.lastIndexOf('.');
    return idx > 0 ? filename.slice(0, idx) : filename;
}

export function canvasToBlob(canvas, mimeType, quality = 0.9) {
    return new Promise((resolve, reject) => {
        try {
            canvas.toBlob(
                (blob) => {
                    if (!blob) {
                        reject(new Error(`Browser could not encode format ${mimeType}.`));
                        return;
                    }
                    resolve(blob);
                },
                mimeType,
                quality
            );
        } catch (err) {
            reject(err);
        }
    });
}

let cachedNativeAvifEncode = null;
async function hasNativeCanvasAvifEncode() {
    if (cachedNativeAvifEncode !== null) return cachedNativeAvifEncode;
    try {
        const canvas = document.createElement('canvas');
        canvas.width = 4;
        canvas.height = 4;
        const blob = await canvasToBlob(canvas, 'image/avif', 0.8);
        cachedNativeAvifEncode = Boolean(blob && blob.type === 'image/avif');
    } catch {
        cachedNativeAvifEncode = false;
    }
    return cachedNativeAvifEncode;
}

export async function encodeCanvasToTargetBlob(canvas, mimeType, quality = 0.9) {
    if (mimeType === 'image/avif') {
        if (await hasNativeCanvasAvifEncode()) {
            const nativeBlob = await canvasToBlob(canvas, 'image/avif', quality);
            if (nativeBlob && nativeBlob.type === 'image/avif') {
                return nativeBlob;
            }
        }
        const { encodeCanvasToAvifBlob } = await import('@/lib/avifCodec');
        return encodeCanvasToAvifBlob(canvas, quality);
    }
    return canvasToBlob(canvas, mimeType, quality);
}

export async function checkAvifEncodeSupport() {
    if (await hasNativeCanvasAvifEncode()) return true;
    return typeof WebAssembly === 'object' && typeof WebAssembly.compile === 'function';
}

async function isAvifSource(source) {
    if (typeof source === 'string') {
        return /\.avif(?:$|[?#])/i.test(source);
    }
    if (source?.type === 'image/avif' || /\.avif$/i.test(source?.name || '')) {
        return true;
    }
    try {
        const head = new Uint8Array(await source.slice(0, 32).arrayBuffer());
        const ascii = String.fromCharCode(...head);
        return ascii.includes('ftypavif') || ascii.includes('ftypavis');
    } catch {
        return false;
    }
}

function parseSvgLengthPx(raw) {
    if (raw == null) return null;
    const str = String(raw).trim().toLowerCase();
    if (!str || str.endsWith('%') || str.endsWith('em') || str.endsWith('rem') || str === 'auto') {
        return null;
    }
    const match = str.match(/^([\d.]+)\s*(px|pt|in|cm|mm|pc)?$/);
    if (!match) return null;
    const num = Number(match[1]);
    if (!Number.isFinite(num) || num <= 0) return null;
    const unit = match[2] || 'px';
    const factors = {
        px: 1,
        pt: 96 / 72,
        pc: 16,
        in: 96,
        cm: 96 / 2.54,
        mm: 96 / 25.4,
    };
    return Math.max(1, Math.round(num * (factors[unit] || 1)));
}

export function parseSvgInfo(svgText = '') {
    const text = String(svgText || '');
    let vbW = null;
    let vbH = null;
    let hasViewBox = false;
    let attrW = null;
    let attrH = null;

    const vbMatch = text.match(/\bviewBox\s*=\s*["']\s*[-+\d.eE]+[\s,]+[-+\d.eE]+[\s,]+([\d.eE]+)[\s,]+([\d.eE]+)\s*["']/i);
    if (vbMatch) {
        const w = Number(vbMatch[1]);
        const h = Number(vbMatch[2]);
        if (Number.isFinite(w) && w > 0 && Number.isFinite(h) && h > 0) {
            vbW = w;
            vbH = h;
            hasViewBox = true;
        }
    }

    const svgTagMatch = text.match(/<svg\b([^>]*)>/i);
    if (svgTagMatch) {
        const attrs = svgTagMatch[1];
        const wMatch = attrs.match(/(?:^|\s)width\s*=\s*["']([^"']+)["']/i);
        const hMatch = attrs.match(/(?:^|\s)height\s*=\s*["']([^"']+)["']/i);
        if (wMatch) attrW = parseSvgLengthPx(wMatch[1]);
        if (hMatch) attrH = parseSvgLengthPx(hMatch[1]);
    }

    let width = attrW || (vbW ? Math.max(1, Math.round(vbW)) : 512);
    let height = attrH || (vbH ? Math.max(1, Math.round(vbH)) : 512);

    if (!attrW && attrH && vbW && vbH) {
        width = Math.max(1, Math.round((vbW / vbH) * attrH));
    } else if (attrW && !attrH && vbW && vbH) {
        height = Math.max(1, Math.round((vbH / vbW) * attrW));
    }

    return { width, height, vbW, vbH, hasViewBox };
}

export async function inspectSvgFile(file) {
    try {
        const text = await file.text();
        const info = parseSvgInfo(text);
        return { width: info.width, height: info.height, svgText: text };
    } catch {
        return { width: 512, height: 512, svgText: '' };
    }
}

function createScaledSvgObjectUrl(svgText, drawWidth, drawHeight, info, stretch = false) {
    const w = Math.max(1, Math.round(drawWidth));
    const h = Math.max(1, Math.round(drawHeight));

    try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(svgText, 'image/svg+xml');
        const root = doc.documentElement;
        if (root && root.tagName.toLowerCase() === 'svg' && !doc.querySelector('parsererror')) {
            if (!root.getAttribute('viewBox')) {
                root.setAttribute('viewBox', `0 0 ${info.width} ${info.height}`);
            }
            root.setAttribute('width', String(w));
            root.setAttribute('height', String(h));
            if (stretch) {
                root.setAttribute('preserveAspectRatio', 'none');
            }
            const serialized = new XMLSerializer().serializeToString(root);
            return URL.createObjectURL(new Blob([serialized], { type: 'image/svg+xml;charset=utf-8' }));
        }
    } catch {
        // Fallback to regex attribute rewrite
    }

    const rewritten = svgText.replace(/<svg\b([^>]*)>/i, (_, rawAttrs) => {
        let attrs = rawAttrs
            .replace(/\swidth\s*=\s*["'][^"']*["']/gi, '')
            .replace(/\sheight\s*=\s*["'][^"']*["']/gi, '');
        if (!/\bviewBox\s*=/i.test(attrs)) {
            attrs += ` viewBox="0 0 ${info.width} ${info.height}"`;
        }
        if (stretch) {
            attrs = attrs.replace(/\spreserveAspectRatio\s*=\s*["'][^"']*["']/gi, '');
            attrs += ' preserveAspectRatio="none"';
        }
        return `<svg${attrs} width="${w}" height="${h}">`;
    });

    return URL.createObjectURL(new Blob([rewritten], { type: 'image/svg+xml;charset=utf-8' }));
}

export function loadImageElementFromUrl(url) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('Failed to decode image file. Your browser may not support this source format.'));
        img.src = url;
    });
}

export async function loadImageFromFileOrUrl(source) {
    if (typeof source === 'string') {
        try {
            const img = await loadImageElementFromUrl(source);
            return {
                img,
                width: img.naturalWidth || img.width || 512,
                height: img.naturalHeight || img.height || 512,
                revoke: () => { },
            };
        } catch (err) {
            if (await isAvifSource(source)) {
                const { decodeAvifToCanvas } = await import('@/lib/avifCodec');
                return decodeAvifToCanvas(source);
            }
            throw err;
        }
    }

    const objectUrl = URL.createObjectURL(source);
    try {
        const img = await loadImageElementFromUrl(objectUrl);
        let width = img.naturalWidth || img.width || 0;
        let height = img.naturalHeight || img.height || 0;

        // Fallback SVG viewBox dimensions if an SVG has no intrinsic px size
        if ((width === 0 || height === 0) && (source.type === 'image/svg+xml' || source.name?.toLowerCase().endsWith('.svg'))) {
            const text = await source.text().catch(() => '');
            const vb = text.match(/viewBox=["']\s*[\d.-]+\s+[\d.-]+\s+([\d.]+)\s+([\d.]+)/i);
            if (vb) {
                width = Math.max(1, Math.round(Number(vb[1])));
                height = Math.max(1, Math.round(Number(vb[2])));
            } else {
                width = 512;
                height = 512;
            }
        }

        return {
            img,
            width: width || 512,
            height: height || 512,
            revoke: () => URL.revokeObjectURL(objectUrl),
        };
    } catch (err) {
        URL.revokeObjectURL(objectUrl);
        if (await isAvifSource(source)) {
            const { decodeAvifToCanvas } = await import('@/lib/avifCodec');
            return decodeAvifToCanvas(source);
        }
        throw err;
    }
}

function normalizeSourceMime(sourceFile) {
    if (!sourceFile || typeof sourceFile === 'string') return 'image/png';
    const raw = String(sourceFile.type || '').toLowerCase();
    if (raw === 'image/jpg') return 'image/jpeg';
    if (raw.startsWith('image/')) return raw;
    const name = String(sourceFile.name || '').toLowerCase();
    if (/\.webp$/.test(name)) return 'image/webp';
    if (/\.jpe?g$/.test(name)) return 'image/jpeg';
    if (/\.avif$/.test(name)) return 'image/avif';
    return 'image/png';
}

function resolveAutoTargetMime(sourceFileOrMime = '') {
    const lower =
        typeof sourceFileOrMime === 'string'
            ? sourceFileOrMime.toLowerCase()
            : normalizeSourceMime(sourceFileOrMime);
    if (lower.includes('webp')) return { mime: 'image/webp', ext: 'webp' };
    if (lower.includes('jpeg') || lower.includes('jpg')) return { mime: 'image/jpeg', ext: 'jpg' };
    if (lower.includes('avif')) return { mime: 'image/avif', ext: 'avif' };
    return { mime: 'image/png', ext: 'png' };
}

function qualityToPngPaletteColors(quality = 0.8) {
    if (quality >= 0.98) return 0; // Lossless recompression
    const t = Math.max(0, Math.min(1, (quality - 0.15) / (0.97 - 0.15)));
    return Math.max(16, Math.min(256, Math.round(16 + t * 240)));
}

async function encodeCompressedPngBlob(canvas, quality = 0.8) {
    try {
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const { data } = imageData;
        const rgbaCopy = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);

        const upngMod = await import('upng-js');
        const UPNG = upngMod.default || upngMod;
        const cnum = qualityToPngPaletteColors(quality);
        const encoded = UPNG.encode([rgbaCopy], canvas.width, canvas.height, cnum);
        const upngBlob = new Blob([encoded], { type: 'image/png' });

        if (cnum === 0) {
            const nativeBlob = await canvasToBlob(canvas, 'image/png', 1);
            return nativeBlob.size < upngBlob.size ? nativeBlob : upngBlob;
        }
        return upngBlob;
    } catch {
        return canvasToBlob(canvas, 'image/png', quality);
    }
}

export function drawRoundedRectPath(ctx, x, y, w, h, r) {
    const radius = Math.max(0, Math.min(r, w / 2, h / 2));
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + w, y, x + w, y + h, radius);
    ctx.arcTo(x + w, y + h, x, y + h, radius);
    ctx.arcTo(x, y + h, x, y, radius);
    ctx.arcTo(x, y, x + w, y, radius);
    ctx.closePath();
}

export function renderStyledSquareCanvas(sourceImg, size, {
    paddingPct = 0,
    radiusPct = 0,
    backgroundColor = null,
} = {}) {
    const c = document.createElement('canvas');
    c.width = size;
    c.height = size;
    const ctx = c.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    const radiusPx = Math.round((size * Math.max(0, Math.min(50, Number(radiusPct) || 0))) / 100);
    if (radiusPx > 0) {
        ctx.save();
        drawRoundedRectPath(ctx, 0, 0, size, size, radiusPx);
        ctx.clip();
    }

    if (backgroundColor && backgroundColor !== 'transparent') {
        ctx.fillStyle = backgroundColor;
        ctx.fillRect(0, 0, size, size);
    }

    const pad = Math.round((size * Math.max(0, Math.min(40, Number(paddingPct) || 0))) / 100);
    const box = Math.max(1, size - pad * 2);
    const iw = sourceImg.naturalWidth || sourceImg.width || box;
    const ih = sourceImg.naturalHeight || sourceImg.height || box;
    const ratio = Math.min(box / iw, box / ih);
    const dw = iw * ratio;
    const dh = ih * ratio;

    ctx.drawImage(sourceImg, (size - dw) / 2, (size - dh) / 2, dw, dh);

    if (radiusPx > 0) {
        ctx.restore();
    }

    return c;
}

function normalizeIcoSizes(sizes = DEFAULT_ICO_SIZES) {
    const validSizes = [...new Set(sizes.map((s) => Math.max(16, Math.min(256, Number(s)))))]
        .filter((s) => Number.isFinite(s))
        .sort((a, b) => a - b);
    return validSizes.length > 0 ? validSizes : DEFAULT_ICO_SIZES;
}

async function renderIcoFrames(sourceImg, sizes = DEFAULT_ICO_SIZES, styleOptions = {}, onProgress = null) {
    const frameSizes = normalizeIcoSizes(sizes);
    const frames = [];
    for (let idx = 0; idx < frameSizes.length; idx++) {
        const size = frameSizes[idx];
        const c = renderStyledSquareCanvas(sourceImg, size, styleOptions);
        const pngBlob = await canvasToBlob(c, 'image/png', 1);
        const pngBytes = new Uint8Array(await pngBlob.arrayBuffer());
        frames.push({ size, bytes: pngBytes });
        onProgress?.(35 + Math.round(((idx + 1) / frameSizes.length) * 55));
    }
    return frames;
}

function packIcoFrames(frames) {
    const headerSize = 6;
    const dirEntrySize = 16;
    const totalDirSize = headerSize + frames.length * dirEntrySize;
    const totalBytes = totalDirSize + frames.reduce((sum, f) => sum + f.bytes.length, 0);

    const out = new Uint8Array(totalBytes);
    const view = new DataView(out.buffer);

    // ICONDIR header
    view.setUint16(0, 0, true); // reserved
    view.setUint16(2, 1, true); // type 1 = ICO
    view.setUint16(4, frames.length, true);

    let dataOffset = totalDirSize;
    frames.forEach((frame, idx) => {
        const dirOffset = headerSize + idx * dirEntrySize;
        const dimByte = frame.size >= 256 ? 0 : frame.size;
        out[dirOffset] = dimByte;
        out[dirOffset + 1] = dimByte;
        out[dirOffset + 2] = 0; // palette count
        out[dirOffset + 3] = 0; // reserved
        view.setUint16(dirOffset + 4, 1, true); // color planes
        view.setUint16(dirOffset + 6, 32, true); // bits per pixel
        view.setUint32(dirOffset + 8, frame.bytes.length, true);
        view.setUint32(dirOffset + 12, dataOffset, true);

        out.set(frame.bytes, dataOffset);
        dataOffset += frame.bytes.length;
    });

    return new Blob([out], { type: 'image/x-icon' });
}

/**
 * Multi-frame PNG-compressed ICO encoder (valid across Windows, macOS & browsers)
 */
export async function buildIcoBlob(sourceImg, sizes = DEFAULT_ICO_SIZES, styleOptions = {}, onProgress = null) {
    const frames = await renderIcoFrames(sourceImg, sizes, styleOptions, onProgress);
    return packIcoFrames(frames);
}

/**
 * Generates individual standard-size .ico files plus a multi-size .ico and bundles them into a ZIP.
 */
export async function buildIcoBundle(sourceImg, baseName = 'icon', sizes = DEFAULT_ICO_SIZES, onProgress = null) {
    const frames = await renderIcoFrames(sourceImg, sizes, {}, onProgress);
    const icoEntries = frames.map((frame) => {
        const blob = packIcoFrames([frame]);
        return {
            size: frame.size,
            label: `${frame.size}×${frame.size}`,
            filename: `${baseName}-${frame.size}x${frame.size}.ico`,
            blob,
            url: URL.createObjectURL(blob),
            sizeBytes: blob.size,
        };
    });

    const multiBlob = packIcoFrames(frames);
    icoEntries.push({
        size: null,
        label: 'Multi-Size',
        filename: `${baseName}.ico`,
        blob: multiBlob,
        url: URL.createObjectURL(multiBlob),
        sizeBytes: multiBlob.size,
    });

    onProgress?.(95);
    const zipBlob = await buildZipBlob(
        icoEntries.map((entry) => ({ filename: entry.filename, blob: entry.blob }))
    );
    const maxSize = frames[frames.length - 1]?.size || 256;

    return {
        blob: zipBlob,
        url: URL.createObjectURL(zipBlob),
        filename: `${baseName}-ico-pack.zip`,
        width: maxSize,
        height: maxSize,
        size: zipBlob.size,
        actualMime: 'application/zip',
        isIcoBundle: true,
        icoEntries,
    };
}

function computeOutputBox(srcW, srcH, { scale = 1, targetWidth = null, targetHeight = null, fitMode = 'contain' } = {}) {
    const safeSrcW = Math.max(1, srcW || 512);
    const safeSrcH = Math.max(1, srcH || 512);

    let outW = targetWidth && targetWidth > 0 ? Math.round(targetWidth) : Math.max(1, Math.round(safeSrcW * scale));
    let outH = targetHeight && targetHeight > 0 ? Math.round(targetHeight) : Math.max(1, Math.round(safeSrcH * scale));

    if (targetWidth && !targetHeight) {
        outH = Math.max(1, Math.round((safeSrcH / safeSrcW) * outW));
    } else if (!targetWidth && targetHeight) {
        outW = Math.max(1, Math.round((safeSrcW / safeSrcH) * outH));
    }

    outW = Math.max(1, Math.min(8192, outW));
    outH = Math.max(1, Math.min(8192, outH));

    let dw = outW;
    let dh = outH;
    if (fitMode !== 'stretch' && (targetWidth || targetHeight)) {
        const ratio =
            fitMode === 'cover'
                ? Math.max(outW / safeSrcW, outH / safeSrcH)
                : Math.min(outW / safeSrcW, outH / safeSrcH);
        dw = Math.max(1, Math.round(safeSrcW * ratio));
        dh = Math.max(1, Math.round(safeSrcH * ratio));
    }

    return { outW, outH, dw, dh };
}

async function renderDrawableToResult(drawable, {
    mode = 'convert',
    sourceFile = null,
    hasExplicitResize = false,
    outW,
    outH,
    dw,
    dh,
    resolvedAuto,
    backgroundColor,
    quality,
    sourceName,
    onProgress,
}) {
    const canvas = document.createElement('canvas');
    canvas.width = outW;
    canvas.height = outH;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    const needsOpaqueFill = resolvedAuto.mime === 'image/jpeg';
    if (needsOpaqueFill || backgroundColor) {
        ctx.fillStyle = backgroundColor || '#ffffff';
        ctx.fillRect(0, 0, outW, outH);
    }

    ctx.drawImage(drawable, Math.round((outW - dw) / 2), Math.round((outH - dh) / 2), dw, dh);
    onProgress?.(72);

    let outBlob =
        (mode === 'compress' || mode === 'resize') && resolvedAuto.mime === 'image/png'
            ? await encodeCompressedPngBlob(canvas, quality)
            : await encodeCanvasToTargetBlob(canvas, resolvedAuto.mime, quality);

    let alreadyOptimal = false;
    if (
        mode === 'compress' &&
        sourceFile instanceof Blob &&
        !hasExplicitResize &&
        normalizeSourceMime(sourceFile) === resolvedAuto.mime &&
        outBlob.size >= sourceFile.size
    ) {
        outBlob = sourceFile;
        alreadyOptimal = true;
    }

    onProgress?.(100);
    const baseName = stripExtension(sourceName || 'image');
    return {
        blob: outBlob,
        url: URL.createObjectURL(outBlob),
        filename: `${baseName}.${resolvedAuto.ext}`,
        width: outW,
        height: outH,
        size: outBlob.size,
        actualMime: outBlob.type || resolvedAuto.mime,
        alreadyOptimal,
    };
}

export async function convertImageFile(sourceFile, options = {}) {
    const {
        mode = 'convert',
        targetMime = 'image/webp',
        targetExt = 'webp',
        quality = 0.88,
        scale = 1,
        targetWidth = null,
        targetHeight = null,
        fitMode = 'contain',
        backgroundColor = null,
        icoSizes = DEFAULT_ICO_SIZES,
        onProgress = null,
    } = options;

    onProgress?.(12);
    const sourceName = typeof sourceFile === 'string' ? 'image' : sourceFile?.name || 'image';
    const hasExplicitResize = Boolean(targetWidth && targetWidth > 0) || Boolean(targetHeight && targetHeight > 0);
    const resolvedAuto =
        targetMime === 'auto'
            ? resolveAutoTargetMime(typeof sourceFile === 'string' ? 'image/png' : sourceFile)
            : { mime: targetMime, ext: targetExt };

    const isSvgFile =
        typeof sourceFile !== 'string' &&
        (sourceFile?.type === 'image/svg+xml' || /\.svg$/i.test(sourceFile?.name || ''));

    // For non-ICO SVG exports, rewrite SVG width/height to exact draw dimensions so vectors rasterize crisply
    if (isSvgFile && mode !== 'ico' && targetMime !== 'image/x-icon') {
        try {
            const svgText = await sourceFile.text();
            const svgInfo = parseSvgInfo(svgText);
            onProgress?.(35);

            const { outW, outH, dw, dh } = computeOutputBox(svgInfo.width, svgInfo.height, {
                scale,
                targetWidth,
                targetHeight,
                fitMode,
            });
            const scaledSvgUrl = createScaledSvgObjectUrl(svgText, dw, dh, svgInfo, fitMode === 'stretch');
            try {
                const svgImg = await loadImageElementFromUrl(scaledSvgUrl);
                return await renderDrawableToResult(svgImg, {
                    mode,
                    sourceFile,
                    hasExplicitResize,
                    outW,
                    outH,
                    dw,
                    dh,
                    resolvedAuto,
                    backgroundColor,
                    quality,
                    sourceName,
                    onProgress,
                });
            } finally {
                URL.revokeObjectURL(scaledSvgUrl);
            }
        } catch {
            // Fall through to generic image loading if custom SVG rewrite fails
        }
    }

    const loaded = await loadImageFromFileOrUrl(sourceFile);
    onProgress?.(35);

    try {
        if (mode === 'ico' || targetMime === 'image/x-icon') {
            const bundle = await buildIcoBundle(loaded.img, stripExtension(sourceName), icoSizes, onProgress);
            onProgress?.(100);
            return bundle;
        }

        const { outW, outH, dw, dh } = computeOutputBox(loaded.width, loaded.height, {
            scale,
            targetWidth,
            targetHeight,
            fitMode,
        });
        return await renderDrawableToResult(loaded.img, {
            mode,
            sourceFile,
            hasExplicitResize,
            outW,
            outH,
            dw,
            dh,
            resolvedAuto,
            backgroundColor,
            quality,
            sourceName,
            onProgress,
        });
    } finally {
        loaded.revoke();
    }
}

export function hexToRgb(hex) {
    const clean = String(hex || '#ffffff').replace('#', '');
    const full = clean.length === 3
        ? clean.split('').map((c) => c + c).join('')
        : clean.padEnd(6, 'f').slice(0, 6);
    const num = parseInt(full, 16);
    return {
        r: (num >> 16) & 255,
        g: (num >> 8) & 255,
        b: num & 255,
    };
}

/**
 * Remove solid background from an image element onto an offscreen canvas with flood-fill or global key
 */
export function renderSolidBgRemovalCanvas(img, {
    targetHex = '#ffffff',
    tolerance = 36,
    feather = 14,
    mode = 'contiguous',
    maxEdge = 2400,
} = {}) {
    const natW = img.naturalWidth || img.width || 512;
    const natH = img.naturalHeight || img.height || 512;
    const scale = Math.min(1, maxEdge / Math.max(natW, natH));
    const width = Math.max(1, Math.round(natW * scale));
    const height = Math.max(1, Math.round(natH * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, 0, 0, width, height);

    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    const target = hexToRgb(targetHex);
    const maxDist = tolerance * 1.732;
    const featherRange = Math.max(1, feather * 1.732);

    const colorDist = (idx) => {
        const dr = data[idx] - target.r;
        const dg = data[idx + 1] - target.g;
        const db = data[idx + 2] - target.b;
        return Math.sqrt(dr * dr + dg * dg + db * db);
    };

    if (mode === 'global') {
        for (let i = 0; i < data.length; i += 4) {
            if (data[i + 3] === 0) continue;
            const d = colorDist(i);
            if (d <= maxDist) {
                data[i + 3] = 0;
            } else if (feather > 0 && d <= maxDist + featherRange) {
                const factor = (d - maxDist) / featherRange;
                data[i + 3] = Math.round(data[i + 3] * factor);
            }
        }
    } else {
        // Contiguous BFS from all 4 outer borders
        const total = width * height;
        const visited = new Uint8Array(total);
        const queue = new Int32Array(total);
        let head = 0;
        let tail = 0;

        const enqueueIfMatch = (x, y) => {
            const p = y * width + x;
            if (visited[p]) return;
            const i = p * 4;
            if (data[i + 3] === 0 || colorDist(i) <= maxDist + featherRange) {
                visited[p] = 1;
                queue[tail++] = p;
            }
        };

        for (let x = 0; x < width; x++) {
            enqueueIfMatch(x, 0);
            enqueueIfMatch(x, height - 1);
        }
        for (let y = 1; y < height - 1; y++) {
            enqueueIfMatch(0, y);
            enqueueIfMatch(width - 1, y);
        }

        while (head < tail) {
            const p = queue[head++];
            const i = p * 4;
            const d = colorDist(i);
            if (d <= maxDist) {
                data[i + 3] = 0;
            } else if (d <= maxDist + featherRange) {
                const factor = (d - maxDist) / featherRange;
                data[i + 3] = Math.round(data[i + 3] * factor);
                continue; // Soft edge stops spreading inward past transition band
            }

            const x = p % width;
            const y = (p - x) / width;
            if (x > 0) enqueueIfMatch(x - 1, y);
            if (x + 1 < width) enqueueIfMatch(x + 1, y);
            if (y > 0) enqueueIfMatch(x, y - 1);
            if (y + 1 < height) enqueueIfMatch(x, y + 1);
        }
    }

    ctx.putImageData(imageData, 0, 0);
    return canvas;
}

// CRC-32 lookup table for pure-JS ZIP bundler
const CRC_TABLE = (() => {
    const table = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
        let c = n;
        for (let k = 0; k < 8; k++) {
            c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
        }
        table[n] = c >>> 0;
    }
    return table;
})();

function crc32(bytes) {
    let crc = 0xffffffff;
    for (let i = 0; i < bytes.length; i++) {
        crc = CRC_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
    }
    return (crc ^ 0xffffffff) >>> 0;
}

/**
 * Zero-dependency Store ZIP packager for batch image downloads
 */
export async function buildZipBlob(files) {
    const encoder = new TextEncoder();
    const localParts = [];
    const centralParts = [];
    let offset = 0;

    for (const item of files) {
        const nameBytes = encoder.encode(item.filename);
        const dataBytes = new Uint8Array(await item.blob.arrayBuffer());
        const crc = crc32(dataBytes);
        const size = dataBytes.length;

        const localHeader = new Uint8Array(30 + nameBytes.length);
        const lv = new DataView(localHeader.buffer);
        lv.setUint32(0, 0x04034b50, true);
        lv.setUint16(4, 20, true);
        lv.setUint16(6, 0x0800, true); // UTF-8 filename flag
        lv.setUint16(8, 0, true); // compression 0 = store
        lv.setUint16(10, 0, true);
        lv.setUint16(12, 0, true);
        lv.setUint32(14, crc, true);
        lv.setUint32(18, size, true);
        lv.setUint32(22, size, true);
        lv.setUint16(26, nameBytes.length, true);
        lv.setUint16(28, 0, true);
        localHeader.set(nameBytes, 30);

        const centralHeader = new Uint8Array(46 + nameBytes.length);
        const cv = new DataView(centralHeader.buffer);
        cv.setUint32(0, 0x02014b50, true);
        cv.setUint16(4, 20, true);
        cv.setUint16(6, 20, true);
        cv.setUint16(8, 0x0800, true);
        cv.setUint16(10, 0, true);
        cv.setUint16(12, 0, true);
        cv.setUint16(14, 0, true);
        cv.setUint32(16, crc, true);
        cv.setUint32(20, size, true);
        cv.setUint32(24, size, true);
        cv.setUint16(28, nameBytes.length, true);
        cv.setUint16(30, 0, true);
        cv.setUint16(32, 0, true);
        cv.setUint16(34, 0, true);
        cv.setUint16(36, 0, true);
        cv.setUint32(38, 0, true);
        cv.setUint32(42, offset, true);
        centralHeader.set(nameBytes, 46);

        localParts.push(localHeader, dataBytes);
        centralParts.push(centralHeader);
        offset += localHeader.length + dataBytes.length;
    }

    const centralSize = centralParts.reduce((s, p) => s + p.length, 0);
    const eocd = new Uint8Array(22);
    const ev = new DataView(eocd.buffer);
    ev.setUint32(0, 0x06054b50, true);
    ev.setUint16(4, 0, true);
    ev.setUint16(6, 0, true);
    ev.setUint16(8, files.length, true);
    ev.setUint16(10, files.length, true);
    ev.setUint32(12, centralSize, true);
    ev.setUint32(16, offset, true);
    ev.setUint16(20, 0, true);

    return new Blob([...localParts, ...centralParts, eocd], { type: 'application/zip' });
}

export async function generateFaviconPackZip(sourceImg, {
    appName = 'My Website',
    icoSizes = DEFAULT_ICO_SIZES,
    paddingPct = 0,
    radiusPct = 0,
    backgroundColor = 'transparent',
} = {}) {
    const style = { paddingPct, radiusPct, backgroundColor };
    const icoFrames = await renderIcoFrames(sourceImg, icoSizes, style);
    const icoBlob = packIcoFrames(icoFrames);
    const icoPreviews = icoFrames.map((frame) => {
        const pngBlob = new Blob([frame.bytes], { type: 'image/png' });
        return {
            size: frame.size,
            filename: `${frame.size}×${frame.size}`,
            label: `${frame.size}×${frame.size}`,
            sizeBytes: frame.bytes.byteLength,
            url: URL.createObjectURL(pngBlob),
        };
    });

    const pngTargets = [
        { filename: 'favicon-16x16.png', size: 16, label: 'Favicon 16×16', showInWebGrid: false },
        { filename: 'favicon-32x32.png', size: 32, label: 'Favicon 32×32', showInWebGrid: false },
        { filename: 'apple-touch-icon.png', size: 180, label: 'Apple Touch 180×180', showInWebGrid: true },
        { filename: 'android-chrome-192x192.png', size: 192, label: 'Android 192×192', showInWebGrid: true },
        { filename: 'android-chrome-512x512.png', size: 512, label: 'Android 512×512', showInWebGrid: true },
    ];

    const files = [{ filename: 'favicon.ico', blob: icoBlob }];
    const previews = [];

    for (const target of pngTargets) {
        const canvas = renderStyledSquareCanvas(sourceImg, target.size, style);
        const blob = await canvasToBlob(canvas, 'image/png', 1);
        files.push({ filename: target.filename, blob });
        if (target.showInWebGrid) {
            previews.push({ ...target, sizeBytes: blob.size, url: URL.createObjectURL(blob) });
        }
    }

    const manifestObj = {
        name: appName || 'My Website',
        short_name: appName || 'App',
        icons: [
            { src: '/android-chrome-192x192.png', sizes: '192x192', type: 'image/png' },
            { src: '/android-chrome-512x512.png', sizes: '512x512', type: 'image/png' },
        ],
        theme_color: backgroundColor !== 'transparent' ? backgroundColor : '#ffffff',
        background_color: backgroundColor !== 'transparent' ? backgroundColor : '#ffffff',
        display: 'standalone',
    };
    const manifestText = JSON.stringify(manifestObj, null, 2);
    files.push({
        filename: 'site.webmanifest',
        blob: new Blob([manifestText], { type: 'application/manifest+json' }),
    });

    const htmlSnippet = [
        '<link rel="icon" href="/favicon.ico" sizes="any">',
        '<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">',
        '<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">',
        '<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">',
        '<link rel="manifest" href="/site.webmanifest">',
    ].join('\n');

    const zipBlob = await buildZipBlob(files);
    return { zipBlob, icoBlob, icoPreviews, previews, manifestText, htmlSnippet, fileCount: files.length };
}

export async function generateAppIconPackZip(sourceImg, {
    includeIos = true,
    includeAndroid = true,
    includePwa = true,
    paddingPct = 0,
    radiusPct = 0,
    backgroundColor = 'transparent',
} = {}) {
    const style = { paddingPct, radiusPct, backgroundColor };
    const entries = [];

    if (includeIos) {
        const iosSizes = [1024, 180, 167, 152, 120, 87, 80, 76, 60, 58, 40, 29, 20];
        for (const size of iosSizes) {
            entries.push({ filename: `ios/icon-${size}x${size}.png`, size });
        }
    }
    if (includeAndroid) {
        const androidTargets = [
            { path: 'android/mipmap-mdpi/ic_launcher.png', size: 48 },
            { path: 'android/mipmap-hdpi/ic_launcher.png', size: 72 },
            { path: 'android/mipmap-xhdpi/ic_launcher.png', size: 96 },
            { path: 'android/mipmap-xxhdpi/ic_launcher.png', size: 144 },
            { path: 'android/mipmap-xxxhdpi/ic_launcher.png', size: 192 },
            { path: 'android/playstore-icon-512x512.png', size: 512 },
        ];
        for (const t of androidTargets) {
            entries.push({ filename: t.path, size: t.size });
        }
    }
    if (includePwa) {
        for (const size of [72, 96, 128, 144, 152, 192, 384, 512]) {
            entries.push({ filename: `pwa/icon-${size}x${size}.png`, size });
        }
    }

    const files = [];
    const previews = [];
    for (const entry of entries) {
        const canvas = renderStyledSquareCanvas(sourceImg, entry.size, style);
        const blob = await canvasToBlob(canvas, 'image/png', 1);
        files.push({ filename: entry.filename, blob });
        if (entry.size === 512 || entry.size === 192 || entry.size === 180 || entry.size === 1024) {
            if (!previews.some((p) => p.size === entry.size)) {
                previews.push({ filename: entry.filename, size: entry.size, url: URL.createObjectURL(blob) });
            }
        }
    }

    const manifestIcons = includePwa
        ? JSON.stringify(
            {
                icons: [72, 96, 128, 144, 152, 192, 384, 512].map((s) => ({
                    src: `/pwa/icon-${s}x${s}.png`,
                    sizes: `${s}x${s}`,
                    type: 'image/png',
                })),
            },
            null,
            2
        )
        : '';

    if (manifestIcons) {
        files.push({
            filename: 'pwa/manifest-icons.json',
            blob: new Blob([manifestIcons], { type: 'application/json' }),
        });
    }

    const zipBlob = await buildZipBlob(files);
    return { zipBlob, previews, manifestIcons, fileCount: files.length };
}

export function renderRoundedCornerCanvas(sourceImg, {
    isCircle = false,
    radiusPct = 18,
    borderWidth = 0,
    borderColor = '#3b82f6',
    outerBackground = 'transparent',
    targetWidth = null,
    targetHeight = null,
} = {}) {
    const iw = sourceImg.naturalWidth || sourceImg.width || 512;
    const ih = sourceImg.naturalHeight || sourceImg.height || 512;
    const defaultW = isCircle ? Math.min(iw, ih) : iw;
    const defaultH = isCircle ? Math.min(iw, ih) : ih;
    const parsedW = Math.round(Number(targetWidth));
    const parsedH = Math.round(Number(targetHeight));
    const w = Number.isFinite(parsedW) && parsedW > 0 ? Math.max(1, Math.min(8192, parsedW)) : defaultW;
    const h = Number.isFinite(parsedH) && parsedH > 0 ? Math.max(1, Math.min(8192, parsedH)) : defaultH;

    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const ctx = c.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    if (outerBackground && outerBackground !== 'transparent') {
        ctx.fillStyle = outerBackground;
        ctx.fillRect(0, 0, w, h);
    }

    const r = isCircle ? Math.min(w, h) / 2 : (Math.min(w, h) * Math.max(0, Math.min(50, Number(radiusPct) || 0))) / 100;

    ctx.save();
    ctx.beginPath();
    if (isCircle) {
        ctx.ellipse(w / 2, h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
        ctx.closePath();
    } else {
        drawRoundedRectPath(ctx, 0, 0, w, h, r);
    }
    ctx.clip();

    if (isCircle) {
        const targetRatio = w / h;
        const srcRatio = iw / ih;
        let sx = 0;
        let sy = 0;
        let sw = iw;
        let sh = ih;
        if (srcRatio > targetRatio) {
            sw = ih * targetRatio;
            sx = Math.max(0, (iw - sw) / 2);
        } else if (srcRatio < targetRatio) {
            sh = iw / targetRatio;
            sy = Math.max(0, (ih - sh) / 2);
        }
        ctx.drawImage(sourceImg, sx, sy, sw, sh, 0, 0, w, h);
    } else {
        ctx.drawImage(sourceImg, 0, 0, w, h);
    }
    ctx.restore();

    const rawBw = Math.max(0, Number(borderWidth) || 0);
    const bw = Math.min(rawBw, Math.min(w, h));
    if (bw > 0) {
        ctx.save();
        ctx.beginPath();
        if (isCircle) {
            ctx.ellipse(
                w / 2,
                h / 2,
                Math.max(0, w / 2 - bw / 2),
                Math.max(0, h / 2 - bw / 2),
                0,
                0,
                Math.PI * 2
            );
            ctx.closePath();
        } else {
            drawRoundedRectPath(ctx, bw / 2, bw / 2, Math.max(0, w - bw), Math.max(0, h - bw), Math.max(0, r - bw / 2));
        }
        ctx.lineWidth = bw;
        ctx.strokeStyle = borderColor || '#3b82f6';
        ctx.stroke();
        ctx.restore();
    }

    return c;
}

const WATERMARK_FONT_MAP = {
    sans: 'Inter, system-ui, -apple-system, sans-serif',
    serif: 'Georgia, Cambria, "Times New Roman", serif',
    mono: 'ui-monospace, SFMono-Regular, Menlo, monospace',
    display: 'Impact, "Arial Black", system-ui, sans-serif',
};

export function renderWatermarkedCanvas(baseImg, {
    watermarkType = 'logo',
    watermarkImg = null,
    watermarkText = '© My Brand',
    textColor = '#ffffff',
    fontFamily = 'sans',
    fontWeight = '700',
    shadowEnabled = true,
    position = 'bottom-right',
    opacity = 0.72,
    scalePct = 22,
    marginPx = null,
    marginPct = 4,
    rotationDeg = 0,
    offsetXPct = 0,
    offsetYPct = 0,
    tileGapPct = 34,
    backgroundColor = null,
    targetCanvas = null,
} = {}) {
    const w = baseImg.naturalWidth || baseImg.width || 512;
    const h = baseImg.naturalHeight || baseImg.height || 512;

    const canvas = targetCanvas || document.createElement('canvas');
    if (canvas.width !== w) canvas.width = w;
    if (canvas.height !== h) canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, w, h);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    if (backgroundColor) {
        ctx.fillStyle = backgroundColor;
        ctx.fillRect(0, 0, w, h);
    }
    ctx.drawImage(baseImg, 0, 0, w, h);

    ctx.save();
    const numericOpacity = Number(opacity);
    ctx.globalAlpha = Number.isFinite(numericOpacity) ? Math.max(0, Math.min(1, numericOpacity)) : 0.72;

    const minDim = Math.min(w, h);
    const resolvedMargin =
        marginPx !== null && marginPx !== undefined
            ? Math.max(0, Number(marginPx) || 0)
            : Math.round((minDim * Math.max(0, Math.min(25, Number(marginPct) || 0))) / 100);

    const resolvedFont = WATERMARK_FONT_MAP[fontFamily] || WATERMARK_FONT_MAP.sans;
    const resolvedWeight = ['500', '600', '700', '800', '900'].includes(String(fontWeight))
        ? String(fontWeight)
        : '700';

    const clampedScale = Math.max(5, Math.min(80, Number(scalePct) || 22));
    const lines = String(watermarkText || '').split(/\r?\n/);

    let stampW = Math.max(24, Math.round((w * clampedScale) / 100));
    let stampH = stampW;
    let fontSize = Math.max(14, Math.round((w * clampedScale) / 240));
    let lineHeight = Math.round(fontSize * 1.2);

    if (watermarkType === 'logo' && watermarkImg) {
        const wmW = watermarkImg.naturalWidth || watermarkImg.width || 100;
        const wmH = watermarkImg.naturalHeight || watermarkImg.height || 100;
        stampH = Math.max(12, Math.round((wmH / Math.max(1, wmW)) * stampW));
    } else {
        ctx.font = `${resolvedWeight} ${fontSize}px ${resolvedFont}`;
        const maxLineW = lines.reduce((m, line) => Math.max(m, ctx.measureText(line || ' ').width), 40);
        stampW = Math.max(40, Math.round(maxLineW));
        lineHeight = Math.round(fontSize * 1.22);
        stampH = Math.max(fontSize, Math.round(lineHeight * Math.max(1, lines.length)));
    }

    const drawStampAtOrigin = (cx, cy) => {
        if (shadowEnabled) {
            ctx.shadowColor = 'rgba(0,0,0,0.48)';
            ctx.shadowBlur = Math.max(4, Math.round(fontSize * 0.22));
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = Math.max(1, Math.round(fontSize * 0.06));
        } else {
            ctx.shadowColor = 'transparent';
            ctx.shadowBlur = 0;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 0;
        }

        if (watermarkType === 'logo' && watermarkImg) {
            ctx.drawImage(watermarkImg, cx, cy, stampW, stampH);
        } else if (lines.some((l) => l.length > 0)) {
            ctx.font = `${resolvedWeight} ${fontSize}px ${resolvedFont}`;
            ctx.textBaseline = 'middle';
            ctx.textAlign = 'center';
            ctx.fillStyle = textColor || '#ffffff';
            const totalTextH = lines.length * lineHeight;
            lines.forEach((line, idx) => {
                const ly = cy + stampH / 2 - totalTextH / 2 + lineHeight * (idx + 0.5);
                ctx.fillText(line, cx + stampW / 2, ly);
            });
        }
    };

    const rad = ((Number(rotationDeg) || 0) * Math.PI) / 180;

    if (position === 'tile') {
        const gapPx = Math.max(24, Math.round((minDim * Math.max(10, Math.min(90, Number(tileGapPct) || 34))) / 100));
        const stepX = Math.max(60, stampW + gapPx);
        const stepY = Math.max(50, stampH + gapPx);

        for (let y = -stepY; y < h + stepY; y += stepY) {
            const rowIndex = Math.round((y + stepY) / stepY);
            const stagger = rowIndex % 2 === 1 ? stepX * 0.45 : 0;
            for (let x = -stepX + stagger; x < w + stepX; x += stepX) {
                ctx.save();
                ctx.translate(x + stampW / 2, y + stampH / 2);
                if (rad !== 0) ctx.rotate(rad);
                drawStampAtOrigin(-stampW / 2, -stampH / 2);
                ctx.restore();
            }
        }
    } else {
        const [vPos, hPos] = String(position || 'bottom-right').split('-');
        let x = w - stampW - resolvedMargin;
        let y = h - stampH - resolvedMargin;
        if (position === 'center') {
            x = (w - stampW) / 2;
            y = (h - stampH) / 2;
        } else {
            if (hPos === 'left') x = resolvedMargin;
            else if (hPos === 'center') x = (w - stampW) / 2;
            else if (hPos === 'right') x = w - stampW - resolvedMargin;

            if (vPos === 'top') y = resolvedMargin;
            else if (vPos === 'center') y = (h - stampH) / 2;
            else if (vPos === 'bottom') y = h - stampH - resolvedMargin;
        }

        x += ((Number(offsetXPct) || 0) / 100) * w;
        y += ((Number(offsetYPct) || 0) / 100) * h;

        ctx.save();
        ctx.translate(x + stampW / 2, y + stampH / 2);
        if (rad !== 0) ctx.rotate(rad);
        drawStampAtOrigin(-stampW / 2, -stampH / 2);
        ctx.restore();
    }

    ctx.restore();
    return canvas;
}

function rgbToHex(r, g, b) {
    return (
        '#' +
        [r, g, b]
            .map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0'))
            .join('')
            .toUpperCase()
    );
}

function rgbToHsl(r, g, b) {
    const rn = r / 255;
    const gn = g / 255;
    const bn = b / 255;
    const max = Math.max(rn, gn, bn);
    const min = Math.min(rn, gn, bn);
    let h = 0;
    let s = 0;
    const l = (max + min) / 2;

    if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case rn:
                h = (gn - bn) / d + (gn < bn ? 6 : 0);
                break;
            case gn:
                h = (bn - rn) / d + 2;
                break;
            default:
                h = (rn - gn) / d + 4;
                break;
        }
        h /= 6;
    }

    return `hsl(${Math.round(h * 360)}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%)`;
}

function relativeLuminance(r, g, b) {
    const lin = [r, g, b].map((v) => {
        const c = v / 255;
        return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
}

export function extractColorPalette(sourceImg, count = 8) {
    const sampleMax = 96;
    const iw = sourceImg.naturalWidth || sourceImg.width || 96;
    const ih = sourceImg.naturalHeight || sourceImg.height || 96;
    const ratio = Math.min(1, sampleMax / Math.max(iw, ih));
    const w = Math.max(1, Math.round(iw * ratio));
    const h = Math.max(1, Math.round(ih * ratio));

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(sourceImg, 0, 0, w, h);

    const data = ctx.getImageData(0, 0, w, h).data;
    const buckets = new globalThis.Map();
    let totalSamples = 0;

    for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3] < 120) continue;
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const key = `${r >> 4}-${g >> 4}-${b >> 4}`;
        const existing = buckets.get(key);
        if (existing) {
            existing.r += r;
            existing.g += g;
            existing.b += b;
            existing.count += 1;
        } else {
            buckets.set(key, { r, g, b, count: 1 });
        }
        totalSamples += 1;
    }

    if (totalSamples === 0) return [];

    const sorted = [...buckets.values()]
        .map((b) => ({
            r: b.r / b.count,
            g: b.g / b.count,
            b: b.b / b.count,
            count: b.count,
        }))
        .sort((a, b) => b.count - a.count);

    const distinct = [];
    const minDistSq = 46 * 46;
    for (const candidate of sorted) {
        const tooClose = distinct.some((d) => {
            const dr = d.r - candidate.r;
            const dg = d.g - candidate.g;
            const db = d.b - candidate.b;
            return dr * dr + dg * dg + db * db < minDistSq;
        });
        if (!tooClose) {
            distinct.push(candidate);
        } else {
            // Add weight onto nearest bucket
            let best = distinct[0];
            let bestD = Infinity;
            for (const d of distinct) {
                const dist = (d.r - candidate.r) ** 2 + (d.g - candidate.g) ** 2 + (d.b - candidate.b) ** 2;
                if (dist < bestD) {
                    bestD = dist;
                    best = d;
                }
            }
            best.count += candidate.count;
        }
        if (distinct.length >= count) break;
    }

    return distinct
        .sort((a, b) => b.count - a.count)
        .map((c) => {
            const rr = Math.round(c.r);
            const gg = Math.round(c.g);
            const bb = Math.round(c.b);
            const lum = relativeLuminance(rr, gg, bb);
            return {
                hex: rgbToHex(rr, gg, bb),
                rgb: `rgb(${rr}, ${gg}, ${bb})`,
                hsl: rgbToHsl(rr, gg, bb),
                pct: Math.max(1, Math.round((c.count / totalSamples) * 100)),
                contrastWhite: ((1.05) / (lum + 0.05)).toFixed(1),
                contrastBlack: ((lum + 0.05) / 0.05).toFixed(1),
                isLight: lum > 0.45,
            };
        });
}

export function cleanSvgMarkup(rawSvg = '', {
    removeComments = true,
    removeMetadata = true,
    removeDimensions = false,
    collapseWhitespace = true,
    toJsx = false,
} = {}) {
    let svg = String(rawSvg || '').trim();
    if (!svg) return '';

    if (removeComments) {
        svg = svg.replace(/<!--[\s\S]*?-->/g, '');
    }
    svg = svg.replace(/<\?xml[\s\S]*?\?>/gi, '').replace(/<!DOCTYPE[\s\S]*?>/gi, '');

    if (removeMetadata) {
        svg = svg
            .replace(/<metadata[\s\S]*?<\/metadata>/gi, '')
            .replace(/<title[\s\S]*?<\/title>/gi, '')
            .replace(/<desc[\s\S]*?<\/desc>/gi, '')
            .replace(/\s+(xmlns:(xlink|sketch|inkscape|sodipodi|dc|cc|rdf)|sketch:type|inkscape:[^=]+|sodipodi:[^=]+|data-name)="[^"]*"/gi, '');
    }

    if (removeDimensions) {
        svg = svg.replace(/<svg\b([^>]*)>/i, (full, attrs) => {
            const stripped = attrs
                .replace(/\s+(width|height)="[^"]*"/gi, '');
            return `<svg${stripped}>`;
        });
    }

    if (collapseWhitespace) {
        svg = svg.replace(/>\s+</g, '><').replace(/\s{2,}/g, ' ').trim();
    }

    if (toJsx) {
        const jsxMap = {
            class: 'className',
            for: 'htmlFor',
            tabindex: 'tabIndex',
            'xml:space': 'xmlSpace',
            'xlink:href': 'xlinkHref',
        };
        svg = svg.replace(/\s([a-zA-Z]+[:-][a-zA-Z0-9-]+|class|for|tabindex)=/g, (match, attr) => {
            const lower = attr.toLowerCase();
            if (jsxMap[lower]) return ` ${jsxMap[lower]}=`;
            if (lower.startsWith('data-') || lower.startsWith('aria-')) return match;
            const camel = lower.replace(/[:-]([a-z])/g, (_, ch) => ch.toUpperCase());
            return ` ${camel}=`;
        });
        svg = svg.replace(/style="([^"]*)"/gi, (_, cssText) => {
            const pairs = cssText
                .split(';')
                .map((p) => p.trim())
                .filter(Boolean)
                .map((p) => {
                    const colon = p.indexOf(':');
                    if (colon < 0) return null;
                    const k = p.slice(0, colon).trim().replace(/-([a-z])/g, (__, ch) => ch.toUpperCase());
                    const v = p.slice(colon + 1).trim();
                    return `${k}: '${v}'`;
                })
                .filter(Boolean);
            return `style={{ ${pairs.join(', ')} }}`;
        });
    }

    return svg;
}

const EXIF_TAG_NAMES = {
    0x010f: 'Camera Make',
    0x0110: 'Camera Model',
    0x0112: 'Orientation',
    0x0131: 'Software',
    0x0132: 'Date / Time',
    0x013b: 'Artist / Author',
    0x8298: 'Copyright',
    0x8825: 'GPS Location Block',
    0x9003: 'Date Taken (Original)',
    0x9004: 'Date Digitized',
    0xa432: 'Lens Spec',
    0xa434: 'Lens Model',
};

function readAscii(view, offset, length) {
    let s = '';
    for (let i = 0; i < length && offset + i < view.byteLength; i++) {
        const code = view.getUint8(offset + i);
        if (code === 0) break;
        if (code >= 32 && code <= 126) s += String.fromCharCode(code);
    }
    return s.trim();
}

export async function inspectImageMetadata(file) {
    const buffer = await file.arrayBuffer();
    const view = new DataView(buffer);
    const findings = [];
    let hasGps = false;

    const pushTag = (name, value, sensitive = false) => {
        findings.push({ name, value: String(value || 'Present'), sensitive });
    };

    try {
        // JPEG inspection (SOI 0xFFD8)
        if (view.byteLength >= 4 && view.getUint16(0, false) === 0xffd8) {
            let offset = 2;
            while (offset + 4 < view.byteLength) {
                const marker = view.getUint16(offset, false);
                offset += 2;
                if (marker === 0xffda || marker === 0xffd9) break;
                if ((marker & 0xff00) !== 0xff00) break;
                const segLen = view.getUint16(offset, false);
                if (segLen < 2 || offset + segLen > view.byteLength) break;

                if (marker === 0xffe1 && segLen > 8 && readAscii(view, offset + 2, 4) === 'Exif') {
                    const tiffStart = offset + 8;
                    if (tiffStart + 8 < view.byteLength) {
                        const little = view.getUint16(tiffStart, false) === 0x4949;
                        const firstIfdOffset = view.getUint32(tiffStart + 4, little);
                        const parseIfd = (ifdRelOffset) => {
                            const ifdPos = tiffStart + ifdRelOffset;
                            if (ifdPos + 2 > view.byteLength) return;
                            const count = view.getUint16(ifdPos, little);
                            for (let i = 0; i < count; i++) {
                                const entry = ifdPos + 2 + i * 12;
                                if (entry + 12 > view.byteLength) break;
                                const tag = view.getUint16(entry, little);
                                const type = view.getUint16(entry + 2, little);
                                const num = view.getUint32(entry + 4, little);
                                const valOff = view.getUint32(entry + 8, little);

                                if (tag === 0x8825) {
                                    hasGps = true;
                                    pushTag('GPS Location Data', 'Embedded GPS coordinates present', true);
                                } else if (tag === 0x8769 && valOff > 0) {
                                    parseIfd(valOff);
                                } else if (EXIF_TAG_NAMES[tag]) {
                                    let val = valOff;
                                    if (type === 2) {
                                        const strPos = num <= 4 ? entry + 8 : tiffStart + valOff;
                                        val = readAscii(view, strPos, Math.min(num, 120));
                                    } else if (type === 3 && num === 1) {
                                        val = view.getUint16(entry + 8, little);
                                    }
                                    if (val !== '' && val !== undefined) {
                                        pushTag(EXIF_TAG_NAMES[tag], val, tag === 0x013b || tag === 0x9003);
                                    }
                                }
                            }
                        };
                        parseIfd(firstIfdOffset);
                    }
                } else if (marker === 0xffe1) {
                    const header = readAscii(view, offset + 2, 24);
                    if (header.includes('http://ns.adobe.com')) {
                        pushTag('XMP Metadata Packet', 'Adobe XMP data present', false);
                    }
                } else if (marker === 0xffed) {
                    pushTag('IPTC / Photoshop Block', 'Embedded IPTC tags present', false);
                }
                offset += segLen;
            }
        } else if (view.byteLength > 8 && view.getUint32(0, false) === 0x89504e47) {
            // PNG chunk inspection
            let offset = 8;
            while (offset + 12 <= view.byteLength) {
                const len = view.getUint32(offset, false);
                const chunkType = readAscii(view, offset + 4, 4);
                if (['tEXt', 'iTXt', 'zTXt', 'eXIf', 'pHYs'].includes(chunkType)) {
                    const preview = chunkType === 'tEXt' ? readAscii(view, offset + 8, Math.min(len, 60)) : `${len} bytes`;
                    pushTag(`PNG ${chunkType} Chunk`, preview, chunkType === 'eXIf');
                    if (chunkType === 'eXIf') hasGps = true;
                }
                offset += 12 + len;
                if (chunkType === 'IEND') break;
            }
        } else if (view.byteLength > 12 && readAscii(view, 0, 4) === 'RIFF' && readAscii(view, 8, 4) === 'WEBP') {
            let offset = 12;
            while (offset + 8 <= view.byteLength) {
                const fourCc = readAscii(view, offset, 4);
                const len = view.getUint32(offset + 4, true);
                if (fourCc === 'EXIF' || fourCc === 'XMP ') {
                    pushTag(`WebP ${fourCc.trim()} Chunk`, `${len} bytes`, fourCc === 'EXIF');
                }
                offset += 8 + len + (len % 2);
            }
        }
    } catch {
        // Ignore malformed segments safely
    }

    return {
        findings,
        hasMetadata: findings.length > 0,
        hasGps,
    };
}
