import sharp from 'sharp';
import fs from 'fs';

export type LuminanceCategory = 'dark' | 'light' | 'balanced';

/**
 * Calculates perceived luminance of visible pixels in a transparent image.
 * Uses ITU-R BT.709 perceived luminance formula: Y = 0.2126*R + 0.7152*G + 0.0722*B
 * 
 * Returns:
 * - 'dark': for predominantly dark/black graphics (avg luminance < 55)
 * - 'light': for predominantly light/white graphics (avg luminance > 195)
 * - 'balanced': for standard colorful or mixed graphics
 */
export async function calculateImageLuminance(
    source: string | Buffer
): Promise<{ luminance: LuminanceCategory; score: number }> {
    try {
        let input: sharp.Sharp;
        if (typeof source === 'string') {
            if (!fs.existsSync(source)) {
                return { luminance: 'balanced', score: 128 };
            }
            input = sharp(source);
        } else {
            input = sharp(source);
        }

        // Downscale to 100x100 for fast analysis (sub-millisecond sampling)
        const { data, info } = await input
            .resize(100, 100, { fit: 'inside' })
            .ensureAlpha()
            .raw()
            .toBuffer({ resolveWithObject: true });

        let totalLuminance = 0;
        let visiblePixelCount = 0;

        for (let i = 0; i < data.length; i += 4) {
            const alpha = data[i + 3];
            // Only evaluate pixels that are visibly rendered (alpha > 25 / ~10% opacity)
            if (alpha > 25) {
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];
                // Perceived relative luminance
                const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
                totalLuminance += lum;
                visiblePixelCount++;
            }
        }

        if (visiblePixelCount === 0) {
            return { luminance: 'balanced', score: 128 };
        }

        const avgScore = Math.round(totalLuminance / visiblePixelCount);

        let luminance: LuminanceCategory = 'balanced';
        if (avgScore < 55) {
            luminance = 'dark';
        } else if (avgScore > 195) {
            luminance = 'light';
        }

        return { luminance, score: avgScore };
    } catch (err) {
        console.error('Failed to calculate luminance:', err);
        return { luminance: 'balanced', score: 128 };
    }
}

