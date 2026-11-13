import crypto from 'crypto';
import prisma from '@/lib/db';

export type TimeRange = '1h' | '24h' | '7d' | '30d' | '90d' | '1y';

export function getRangeDates(range: string): { startDate: Date; previousStartDate: Date } {
    const now = new Date();
    let durationMs = 7 * 24 * 60 * 60 * 1000;

    switch (range) {
        case '1h':
            durationMs = 60 * 60 * 1000;
            break;
        case '24h':
            durationMs = 24 * 60 * 60 * 1000;
            break;
        case '7d':
            durationMs = 7 * 24 * 60 * 60 * 1000;
            break;
        case '30d':
            durationMs = 30 * 24 * 60 * 60 * 1000;
            break;
        case '90d':
            durationMs = 90 * 24 * 60 * 60 * 1000;
            break;
        case '1y':
            durationMs = 365 * 24 * 60 * 60 * 1000;
            break;
    }

    const startDate = new Date(now.getTime() - durationMs);
    const previousStartDate = new Date(now.getTime() - durationMs * 2);
    return { startDate, previousStartDate };
}

export async function recordImageView(imageId: string): Promise<void> {
    if (!imageId) return;
    try {
        const id = crypto.randomUUID();
        const now = new Date();
        await prisma.$executeRaw`
            INSERT INTO ImageView (id, imageId, createdAt)
            VALUES (${id}, ${imageId}, ${now})
        `;
    } catch (error) {
        console.error('Failed to record image view:', error);
    }
}

export async function recordSearchQuery(query: string, resultsCount: number): Promise<void> {
    const cleaned = (query || '').trim().toLowerCase();
    if (!cleaned) return;
    try {
        const id = crypto.randomUUID();
        const now = new Date();
        await prisma.$executeRaw`
            INSERT INTO SearchLog (id, query, resultsCount, createdAt)
            VALUES (${id}, ${cleaned}, ${resultsCount}, ${now})
        `;
    } catch (error) {
        console.error('Failed to record search query:', error);
    }
}

export async function recordDownloadEvent(data: {
    imageId: string | null;
    deviceType: string;
    country: string;
    countryName: string;
    isCustomSize?: boolean;
    resolution?: string | null;
}): Promise<void> {
    const id = crypto.randomUUID();
    const now = new Date();
    const isCustom = data.isCustomSize ? 1 : 0;
    const resolution = data.resolution || null;

    try {
        await prisma.$executeRaw`
            INSERT INTO Download (id, imageId, deviceType, country, countryName, isCustomSize, resolution, createdAt)
            VALUES (${id}, ${data.imageId}, ${data.deviceType}, ${data.country}, ${data.countryName}, ${isCustom}, ${resolution}, ${now})
        `;
    } catch {
        // Fallback if columns are still migrating
        await prisma.download.create({
            data: {
                imageId: data.imageId,
                deviceType: data.deviceType,
                country: data.country,
                countryName: data.countryName,
            },
        });
    }
}

