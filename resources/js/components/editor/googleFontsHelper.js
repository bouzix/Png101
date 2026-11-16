import rawCatalog from './googleFontsCatalog.json';

export const FONT_CATEGORIES = [
    'All',
    'Brand',
    'Sans Serif',
    'Serif',
    'Display',
    'Handwriting',
    'Monospace',
];

export const SYSTEM_FONTS = [
    { family: 'Arial', category: 'Sans Serif', weights: '400;700', source: 'system' },
    { family: 'Helvetica', category: 'Sans Serif', weights: '400;700', source: 'system' },
    { family: 'Georgia', category: 'Serif', weights: '400;700', source: 'system' },
    { family: 'Times New Roman', category: 'Serif', weights: '400;700', source: 'system' },
    { family: 'Courier New', category: 'Monospace', weights: '400;700', source: 'system' },
];

export const ALL_GOOGLE_FONTS = rawCatalog.map(([family, category, weights]) => ({
    family,
    category: category || 'Sans Serif',
    weights: weights || '',
    source: 'google',
}));

export const GOOGLE_FONT_MAP = new Map(
    ALL_GOOGLE_FONTS.map((f) => [f.family.toLowerCase(), f])
);

const SYSTEM_FAMILY_SET = new Set([
    ...SYSTEM_FONTS.map((f) => f.family.toLowerCase()),
    'sans-serif',
    'serif',
    'monospace',
]);

const requestedFamilies = new Set();
const inflightMap = new Map();

function buildFamilyParam(entry) {
    const encoded = encodeURIComponent(entry.family).replace(/%20/g, '+');
    if (entry.weights && entry.weights.includes(';')) {
        return `family=${encoded}:wght@${entry.weights}`;
    }
    if (entry.weights && /^\d+$/.test(entry.weights) && entry.weights !== '400') {
        return `family=${encoded}:wght@${entry.weights}`;
    }
    return `family=${encoded}`;
}

/**
 * Loads one or more Google Font families by injecting batched Google Fonts CSS2
 * `<link rel="stylesheet">` tags into `<head>`.
 */
export async function loadGoogleFontsBatch(families = []) {
    if (typeof document === 'undefined' || !Array.isArray(families) || families.length === 0) {
        return;
    }

    const toFetch = [];
    const pendingPromises = [];

    for (const raw of families) {
        const clean = String(raw || '').trim();
        if (!clean) continue;
        const key = clean.toLowerCase();
        if (SYSTEM_FAMILY_SET.has(key)) continue;

        if (inflightMap.has(key)) {
            pendingPromises.push(inflightMap.get(key));
            continue;
        }
        if (requestedFamilies.has(key)) continue;

        const meta = GOOGLE_FONT_MAP.get(key);
        if (!meta) continue; // Custom uploaded font already served via /editor-fonts.css

        toFetch.push(meta);
    }

    const CHUNK_SIZE = 18;
    for (let i = 0; i < toFetch.length; i += CHUNK_SIZE) {
        const chunk = toFetch.slice(i, i + CHUNK_SIZE);
        const query = chunk.map(buildFamilyParam).join('&');
        const href = `https://fonts.googleapis.com/css2?${query}&display=swap`;

        const promise = new Promise((resolve) => {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = href;
            link.crossOrigin = 'anonymous';
            link.dataset.googleFontBatch = '1';

            const done = () => resolve();
            const timer = setTimeout(done, 2500);
            link.onload = () => {
                clearTimeout(timer);
                done();
            };
            link.onerror = () => {
                clearTimeout(timer);
                done();
            };
            document.head.appendChild(link);
        }).finally(() => {
            chunk.forEach((m) => {
                const k = m.family.toLowerCase();
                requestedFamilies.add(k);
                inflightMap.delete(k);
            });
        });

        chunk.forEach((m) => inflightMap.set(m.family.toLowerCase(), promise));
        pendingPromises.push(promise);
    }

    if (pendingPromises.length > 0) {
        await Promise.all(pendingPromises);
    }
}

export async function ensureGoogleFontCss(family) {
    if (!family) return;
    await loadGoogleFontsBatch([family]);
}

/**
 * Merges admin Brand/Custom fonts (pinned first) + System fonts + All Google Fonts,
 * removing duplicate families case-insensitively while preserving category tags.
 */
export function buildMergedFontCatalog(brandFonts = []) {
    const merged = [];
    const seen = new Set();

    for (const bf of brandFonts) {
        const fam = String(bf?.family || '').trim();
        if (!fam) continue;
        const key = fam.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        const gf = GOOGLE_FONT_MAP.get(key);
        merged.push({
            family: fam,
            category: gf?.category || 'Sans Serif',
            weights: gf?.weights || '400;700',
            isBrand: true,
            source: bf.source || 'google',
        });
    }

    for (const gf of ALL_GOOGLE_FONTS) {
        const key = gf.family.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        merged.push({
            ...gf,
            isBrand: false,
        });
    }

    for (const sf of SYSTEM_FONTS) {
        const key = sf.family.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        merged.push({
            ...sf,
            isBrand: false,
        });
    }

    return merged;
}
