import { NextResponse } from 'next/server';
import { getRankedRelatedImages } from '@/lib/related-images';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const limitParam = searchParams.get('limit');
    const offsetParam = searchParams.get('offset');

    if (!id) {
        return NextResponse.json({ images: [], total: 0, hasMore: false }, { status: 400 });
    }

    const pageSize = limitParam ? Math.max(1, parseInt(limitParam, 10)) : 30;
    const pageSkip = offsetParam ? Math.max(0, parseInt(offsetParam, 10)) : 0;

    try {
        const result = await getRankedRelatedImages(id, {
            limit: pageSize,
            offset: pageSkip,
        });

        return NextResponse.json(result);
    } catch (error) {
        console.error('Failed to fetch related images:', error);
        return NextResponse.json({ images: [], total: 0, hasMore: false }, { status: 500 });
    }
}
