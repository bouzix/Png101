import { NextResponse } from 'next/server';
import { previewTagMatches } from '@/lib/collections';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { tags = [], mode = 'any' } = body;

        const result = await previewTagMatches(tags, mode === 'all' ? 'all' : 'any');
        return NextResponse.json(result);
    } catch (error: any) {
        console.error('Failed to preview tag matches:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to preview tag matches' },
            { status: 500 }
        );
    }
}

