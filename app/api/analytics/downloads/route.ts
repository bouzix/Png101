import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getRangeDates, TimeRange } from '@/lib/analytics';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const range = (searchParams.get('range') as TimeRange) || '7d';

    try {
        const { startDate, previousStartDate } = getRangeDates(range);

        // Fetch downloads in current range and previous range, plus views in current range
        const [downloads, previousDownloadsCount, viewsRows] = await Promise.all([
            prisma.download.findMany({
                where: { createdAt: { gte: startDate } },
                orderBy: { createdAt: 'asc' },
            }),
            prisma.download.count({
                where: {
                    createdAt: {
                        gte: previousStartDate,
                        lt: startDate,
                    },
                },
            }),
            prisma.$queryRaw<{ createdAt: Date }[]>`
                SELECT createdAt FROM ImageView
                WHERE createdAt >= ${startDate}
                ORDER BY createdAt ASC
            `.catch(() => [] as { createdAt: Date }[]),
        ]);

        const formatKey = (d: Date) => {
            if (range === '1h' || range === '24h') {
                return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric' });
            }
            return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        };

        const groupedMap = new Map<string, { downloads: number; views: number }>();

        downloads.forEach((download) => {
            const key = formatKey(new Date(download.createdAt));
            const entry = groupedMap.get(key) || { downloads: 0, views: 0 };
            entry.downloads += 1;
            groupedMap.set(key, entry);
        });

        viewsRows.forEach((view) => {
            const key = formatKey(new Date(view.createdAt));
            const entry = groupedMap.get(key) || { downloads: 0, views: 0 };
            entry.views += 1;
            groupedMap.set(key, entry);
        });

        const data = Array.from(groupedMap.entries()).map(([date, counts]) => ({
            date,
            downloads: counts.downloads,
            views: counts.views,
        }));

        const currentTotal = downloads.length;
        let growthPercent: number | null = null;
        if (previousDownloadsCount > 0) {
            growthPercent = Math.round(((currentTotal - previousDownloadsCount) / previousDownloadsCount) * 100);
        } else if (currentTotal > 0) {
            growthPercent = 100;
        } else {
            growthPercent = 0;
        }

        return NextResponse.json({
            data,
            total: currentTotal,
            totalViews: viewsRows.length,
            previousTotal: previousDownloadsCount,
            growthPercent,
        });
    } catch (error) {
        console.error('Analytics downloads error:', error);
        return NextResponse.json({
            data: [],
            total: 0,
            totalViews: 0,
            previousTotal: 0,
            growthPercent: 0,
        });
    }
}
