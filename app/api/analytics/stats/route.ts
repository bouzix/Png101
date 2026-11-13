import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getRangeDates } from '@/lib/analytics';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const range = searchParams.get('range') || '7d';
        const deviceType = searchParams.get('device');
        const country = searchParams.get('country');

        const { startDate: dateThreshold } = getRangeDates(range);

        const downloadWhere: any = {
            createdAt: {
                gte: dateThreshold,
            },
        };

        if (deviceType && deviceType !== 'all') {
            downloadWhere.deviceType = deviceType;
        }
        if (country && country !== 'all') {
            downloadWhere.country = country;
        }

        // Core counts & published images with categories and download counts
        const [
            totalImages,
            totalDownloads,
            publishedImages,
            draftImages,
            allPublishedImages,
            periodDownloadsRows,
            recentDownloadsRows,
            viewsCountAllTimeRows,
            viewsByImageRows,
            topSearchesRows,
            zeroResultSearchesRows,
        ] = await Promise.all([
            prisma.image.count(),
            prisma.download.count(),
            prisma.image.count({ where: { status: 'published' } }),
            prisma.image.count({ where: { status: 'draft' } }),
            prisma.image.findMany({
                where: { status: 'published' },
                include: {
                    categories: {
                        include: { category: true },
                    },
                    _count: {
                        select: {
                            downloads: true,
                        },
                    },
                },
            }),
            prisma.$queryRaw<any[]>`
                SELECT id, imageId, deviceType, country, countryName, isCustomSize, resolution, createdAt
                FROM Download
                WHERE createdAt >= ${dateThreshold}
            `.catch(() => [] as any[]),
            prisma.$queryRaw<any[]>`
                SELECT d.id, d.imageId, d.deviceType, d.country, d.countryName, d.isCustomSize, d.resolution, d.createdAt,
                       i.name as imageName, i.filename as imageFilename, i.path as imagePath
                FROM Download d
                LEFT JOIN Image i ON d.imageId = i.id
                ORDER BY d.createdAt DESC
                LIMIT 15
            `.catch(() => [] as any[]),
            prisma.$queryRaw<{ count: bigint }[]>`
                SELECT COUNT(*) as count FROM ImageView
            `.catch(() => [{ count: BigInt(0) }]),
            prisma.$queryRaw<{ imageId: string; count: bigint }[]>`
                SELECT imageId, COUNT(*) as count
                FROM ImageView
                WHERE createdAt >= ${dateThreshold}
                GROUP BY imageId
            `.catch(() => [] as { imageId: string; count: bigint }[]),
            prisma.$queryRaw<{ query: string; searches: bigint; avgResults: number }[]>`
                SELECT query, COUNT(*) as searches, AVG(resultsCount) as avgResults
                FROM SearchLog
                WHERE createdAt >= ${dateThreshold}
                GROUP BY query
                ORDER BY searches DESC
                LIMIT 10
            `.catch(() => [] as any[]),
            prisma.$queryRaw<{ query: string; searches: bigint; lastSearchedAt: Date }[]>`
                SELECT query, COUNT(*) as searches, MAX(createdAt) as lastSearchedAt
                FROM SearchLog
                WHERE resultsCount = 0 AND createdAt >= ${dateThreshold}
                GROUP BY query
                ORDER BY searches DESC, lastSearchedAt DESC
                LIMIT 10
            `.catch(() => [] as any[]),
        ]);

        const totalViews = Number(viewsCountAllTimeRows[0]?.count ?? 0);
        const viewsByImageMap = new Map<string, number>();
        let periodViews = 0;
        viewsByImageRows.forEach((r) => {
            const c = Number(r.count);
            viewsByImageMap.set(r.imageId, c);
            periodViews += c;
        });

        // Filter period downloads by deviceType and country if selected
        const filteredPeriodDownloads = periodDownloadsRows.filter((d) => {
            if (deviceType && deviceType !== 'all' && d.deviceType !== deviceType) return false;
            if (country && country !== 'all' && d.country !== country) return false;
            return true;
        });

        // Storage & Zero-Download Image Stats
        let totalStorageBytes = 0;
        let zeroDownloadImagesCount = 0;
        allPublishedImages.forEach((img) => {
            totalStorageBytes += img.size || 0;
            if ((img._count?.downloads || 0) === 0) {
                zeroDownloadImagesCount += 1;
            }
        });
        const avgImageSizeBytes =
            allPublishedImages.length > 0 ? Math.round(totalStorageBytes / allPublishedImages.length) : 0;

        // Device Breakdown (from period downloads)
        const deviceCounts: Record<string, number> = {
            desktop: 0,
            mobile: 0,
            tablet: 0,
        };
        const countryCounts = new Map<string, { country: string; countryName: string; count: number }>();
        const downloadsByImagePeriod = new Map<string, number>();
        let customResizeCount = 0;
        let originalSizeCount = 0;

        filteredPeriodDownloads.forEach((d) => {
            const dev = (d.deviceType || 'desktop').toLowerCase();
            if (dev in deviceCounts) {
                deviceCounts[dev] += 1;
            } else {
                deviceCounts.desktop += 1;
            }

            const code = d.country || 'XX';
            const name = d.countryName || 'Unknown';
            const existingCountry = countryCounts.get(code) || { country: code, countryName: name, count: 0 };
            existingCountry.count += 1;
            countryCounts.set(code, existingCountry);

            if (d.imageId) {
                downloadsByImagePeriod.set(d.imageId, (downloadsByImagePeriod.get(d.imageId) || 0) + 1);
            }

            if (Boolean(d.isCustomSize)) {
                customResizeCount += 1;
            } else {
                originalSizeCount += 1;
            }
        });

        const totalFilteredPeriod = filteredPeriodDownloads.length;
        const deviceBreakdown = Object.entries(deviceCounts).map(([device, count]) => {
            const pct = totalFilteredPeriod > 0 ? Math.round((count / totalFilteredPeriod) * 100) : 0;
            return {
                device,
                count,
                percent: pct,
                percentage: pct,
            };
        });

        const topCountries = Array.from(countryCounts.values())
            .sort((a, b) => b.count - a.count)
            .slice(0, 10)
            .map((c) => {
                const pct = totalFilteredPeriod > 0 ? Math.round((c.count / totalFilteredPeriod) * 100) : 0;
                return {
                    code: c.country,
                    name: c.countryName,
                    country: c.country,
                    countryName: c.countryName,
                    count: c.count,
                    percent: pct,
                    percentage: pct,
                };
            });

        // Top Tags & Top Categories Aggregation
        const tagStatsMap = new Map<string, { tag: string; downloads: number; imageCount: number }>();
        const categoryStatsMap = new Map<string, { id: string; name: string; slug: string; downloads: number; imageCount: number }>();

        allPublishedImages.forEach((img) => {
            const imgDownloads = downloadsByImagePeriod.get(img.id) ?? 0;
            const tags = Array.isArray(img.tags) ? (img.tags as string[]) : [];

            tags.forEach((rawTag) => {
                if (typeof rawTag !== 'string') return;
                const clean = rawTag.trim().toLowerCase();
                if (!clean) return;
                const entry = tagStatsMap.get(clean) || { tag: clean, downloads: 0, imageCount: 0 };
                entry.downloads += imgDownloads;
                entry.imageCount += 1;
                tagStatsMap.set(clean, entry);
            });

            img.categories?.forEach((ic) => {
                if (!ic.category) return;
                const entry = categoryStatsMap.get(ic.category.id) || {
                    id: ic.category.id,
                    name: ic.category.name,
                    slug: ic.category.slug,
                    downloads: 0,
                    imageCount: 0,
                };
                entry.downloads += imgDownloads;
                entry.imageCount += 1;
                categoryStatsMap.set(ic.category.id, entry);
            });
        });

        const topTags = Array.from(tagStatsMap.values())
            .sort((a, b) => b.downloads - a.downloads || b.imageCount - a.imageCount)
            .slice(0, 12);

        const topCategories = Array.from(categoryStatsMap.values())
            .sort((a, b) => b.downloads - a.downloads || b.imageCount - a.imageCount)
            .slice(0, 8);

        // Popular Images list (includes all published images with period downloads, views, and conversion rate)
        const popularImages = allPublishedImages
            .map((img) => {
                const dlCount = downloadsByImagePeriod.get(img.id) || 0;
                const vwCount = viewsByImageMap.get(img.id) || 0;
                const conv = vwCount > 0 ? Math.min(100, Math.round((dlCount / vwCount) * 100)) : 0;
                return {
                    id: img.id,
                    name: img.name || img.filename,
                    path: img.path,
                    downloads: dlCount,
                    allTimeDownloads: img._count?.downloads || 0,
                    views: vwCount,
                    conversionRate: conv,
                    size: img.size || 0,
                    tags: Array.isArray(img.tags) ? (img.tags as string[]) : [],
                    createdAt: img.createdAt.toISOString(),
                };
            })
            .filter((img) => img.downloads > 0 || img.views > 0)
            .sort((a, b) => b.downloads - a.downloads || b.views - a.views)
            .slice(0, 100);

        const recentDownloads = recentDownloadsRows.map((r) => ({
            id: r.id,
            imageId: r.imageId,
            imageName: r.imageName || r.imageFilename || 'PNG Image',
            imagePath: r.imagePath || '',
            device: r.deviceType || 'desktop',
            deviceType: r.deviceType || 'desktop',
            countryCode: r.country || 'XX',
            country: r.country || 'XX',
            countryName: r.countryName || 'Unknown',
            isCustomSize: Boolean(r.isCustomSize),
            resolution: r.resolution || '',
            createdAt: new Date(r.createdAt).toISOString(),
        }));

        const topSearches = topSearchesRows.map((s) => ({
            query: s.query,
            searches: Number(s.searches),
            avgResults: Math.round(Number(s.avgResults || 0)),
        }));

        const zeroResultSearches = zeroResultSearchesRows.map((s) => ({
            query: s.query,
            searches: Number(s.searches),
            lastSearchedAt: new Date(s.lastSearchedAt).toISOString(),
        }));

        const periodConversionRate =
            periodViews > 0 ? Math.min(100, Math.round((totalFilteredPeriod / periodViews) * 100)) : 0;

        const customPercent =
            totalFilteredPeriod > 0 ? Math.round((customResizeCount / totalFilteredPeriod) * 100) : 0;
        const originalPercent = totalFilteredPeriod > 0 ? 100 - customPercent : 100;

        return NextResponse.json({
            totalImages,
            totalDownloads,
            publishedImages,
            draftImages,
            totalViews,
            periodViews,
            periodDownloads: totalFilteredPeriod,
            periodConversionRate,
            totalStorageBytes,
            avgImageSizeBytes,
            zeroDownloadImagesCount,
            deviceBreakdown,
            topCountries,
            resizeBreakdown: {
                originalCount: originalSizeCount,
                customCount: customResizeCount,
                customPercent,
                originalPercent,
                customPercentage: customPercent,
            },
            topTags,
            topCategories,
            recentDownloads,
            topSearches,
            zeroResultSearches,
            popularImages,
        });
    } catch (error) {
        console.error('Stats error:', error);
        return NextResponse.json({
            totalImages: 0,
            totalDownloads: 0,
            publishedImages: 0,
            draftImages: 0,
            totalViews: 0,
            periodViews: 0,
            periodDownloads: 0,
            periodConversionRate: 0,
            totalStorageBytes: 0,
            avgImageSizeBytes: 0,
            zeroDownloadImagesCount: 0,
            deviceBreakdown: [],
            topCountries: [],
            resizeBreakdown: { originalCount: 0, customCount: 0, customPercentage: 0 },
            topTags: [],
            topCategories: [],
            recentDownloads: [],
            topSearches: [],
            zeroResultSearches: [],
            popularImages: [],
        });
    }
}
