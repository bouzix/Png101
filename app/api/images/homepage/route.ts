import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

const CACHE_KEY = 'homepage_weekly_popular_v1';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const POPULAR_LIMIT = 15;
const LATEST_LIMIT = 30;

interface PopularCachePayload {
    updatedAt: number;
    imageIds: string[];
}

export async function GET() {
    try {
        const now = Date.now();

        // 1. Fetch latest 30 published images + total count of published images
        const [latestImages, totalPublishedCount, cacheSetting] = await Promise.all([
            prisma.image.findMany({
                where: { status: 'published' },
                orderBy: { createdAt: 'desc' },
                take: LATEST_LIMIT,
                select: {
                    id: true,
                    name: true,
                    filename: true,
                    path: true,
                    createdAt: true,
                    luminance: true,
                    contrastBgDark: true,
                    contrastBgLight: true,
                },
            }),
            prisma.image.count({ where: { status: 'published' } }),
            prisma.setting.findUnique({ where: { key: CACHE_KEY } }).catch(() => null),
        ]);

        const targetPopularCount = Math.min(POPULAR_LIMIT, totalPublishedCount);
        let popularImages: { id: string; name: string | null; filename: string; path: string; luminance?: string | null; contrastBgDark?: string | null; contrastBgLight?: string | null }[] = [];
        let needsRefresh = true;

        // 2. Check if we have a valid 24-hour cache
        if (cacheSetting?.value) {
            try {
                const parsed: PopularCachePayload = JSON.parse(cacheSetting.value);
                const isFresh = now - (parsed.updatedAt || 0) < CACHE_TTL_MS;

                if (isFresh && Array.isArray(parsed.imageIds) && parsed.imageIds.length > 0) {
                    const cachedRecords = await prisma.image.findMany({
                        where: {
                            id: { in: parsed.imageIds },
                            status: 'published',
                        },
                        select: {
                            id: true,
                            name: true,
                            filename: true,
                            path: true,
                            luminance: true,
                            contrastBgDark: true,
                            contrastBgLight: true,
                        },
                    });

                    // Preserve exact cached ordering
                    const recordMap = new Map(cachedRecords.map((img) => [img.id, img]));
                    const ordered = parsed.imageIds
                        .map((id) => recordMap.get(id))
                        .filter((img): img is NonNullable<typeof img> => Boolean(img));

                    // Keep cache if all cached images still exist and count matches targetPopularCount
                    if (ordered.length === targetPopularCount) {
                        popularImages = ordered;
                        needsRefresh = false;
                    }
                }
            } catch {
                needsRefresh = true;
            }
        }

        // 3. Recompute 15 popular images if cache is expired, missing, or invalidated
        if (needsRefresh) {
            const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);

            // Top downloaded published images in the last 7 days
            const topDownloadedRows = await prisma.$queryRaw<{ imageId: string; dlCount: bigint }[]>`
                SELECT d.imageId, COUNT(*) as dlCount
                FROM Download d
                INNER JOIN Image i ON d.imageId = i.id
                WHERE d.createdAt >= ${sevenDaysAgo}
                  AND i.status = 'published'
                GROUP BY d.imageId
                ORDER BY dlCount DESC
                LIMIT ${POPULAR_LIMIT}
            `.catch(() => [] as { imageId: string; dlCount: bigint }[]);

            const topImageIds = topDownloadedRows.map((r) => r.imageId);

            // Fetch full image records for top downloaded
            const topImages =
                topImageIds.length > 0
                    ? await prisma.image.findMany({
                        where: { id: { in: topImageIds }, status: 'published' },
                        select: { id: true, name: true, filename: true, path: true, luminance: true, contrastBgDark: true, contrastBgLight: true },
                    })
                    : [];

            const topMap = new Map(topImages.map((img) => [img.id, img]));
            const orderedTop = topImageIds
                .map((id) => topMap.get(id))
                .filter((img): img is NonNullable<typeof img> => Boolean(img));

            // If we have fewer than 15, fill the rest with random published images
            const remainingNeeded = POPULAR_LIMIT - orderedTop.length;
            let fillerImages: { id: string; name: string | null; filename: string; path: string; luminance?: string | null; contrastBgDark?: string | null; contrastBgLight?: string | null }[] = [];

            if (remainingNeeded > 0) {
                const candidatePool = await prisma.image.findMany({
                    where: {
                        status: 'published',
                        ...(orderedTop.length > 0
                            ? { id: { notIn: orderedTop.map((img) => img.id) } }
                            : {}),
                    },
                    select: { id: true, name: true, filename: true, path: true, luminance: true, contrastBgDark: true, contrastBgLight: true },
                });

                // Fisher-Yates shuffle to pick random images
                for (let i = candidatePool.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [candidatePool[i], candidatePool[j]] = [candidatePool[j], candidatePool[i]];
                }

                fillerImages = candidatePool.slice(0, remainingNeeded);
            }

            popularImages = [...orderedTop, ...fillerImages].slice(0, POPULAR_LIMIT);

            // Save to Setting table for the next 24 hours
            const payload: PopularCachePayload = {
                updatedAt: now,
                imageIds: popularImages.map((img) => img.id),
            };

            await prisma.setting
                .upsert({
                    where: { key: CACHE_KEY },
                    update: { value: JSON.stringify(payload) },
                    create: { key: CACHE_KEY, value: JSON.stringify(payload) },
                })
                .catch((err) => console.error('Failed to save homepage popular cache:', err));
        }

        return NextResponse.json({
            popularImages,
            latestImages,
            totalPublishedCount,
        });
    } catch (error) {
        console.error('Failed to load homepage images:', error);
        return NextResponse.json(
            {
                popularImages: [],
                latestImages: [],
                totalPublishedCount: 0,
            },
            { status: 500 }
        );
    }
}

