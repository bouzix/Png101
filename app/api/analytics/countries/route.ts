import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getCountryFlag } from '@/lib/geo-detector';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        // Get all downloads grouped by country with counts
        const countryStats = await prisma.download.groupBy({
            by: ['country', 'countryName'],
            _count: {
                id: true
            },
            orderBy: {
                _count: {
                    id: 'desc'
                }
            },
            take: 30  // Top 30 countries
        });

        // Format the response with flags
        const countries = countryStats
            .filter(stat => stat.country) // Keep all valid country codes including UNKNOWN
            .map(stat => ({
                code: stat.country,
                name: stat.country === 'UNKNOWN' ? 'Unknown Location' : (stat.countryName || stat.country),
                downloads: stat._count.id,
                flag: getCountryFlag(stat.country || '')
            }));

        return NextResponse.json(countries);
    } catch (error) {
        console.error('Countries endpoint error:', error);
        return NextResponse.json([]);
    }
}
