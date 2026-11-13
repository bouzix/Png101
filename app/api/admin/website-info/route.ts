import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { getWebsiteInfo, saveWebsiteInfo } from '@/lib/website-info';

export async function GET() {
    try {
        const info = await getWebsiteInfo();
        return NextResponse.json(info);
    } catch (error) {
        console.error('Failed to fetch website info:', error);
        return NextResponse.json({ error: 'Failed to fetch website info' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const saved = await saveWebsiteInfo(body);
        revalidatePath('/', 'layout');
        return NextResponse.json({ success: true, data: saved });
    } catch (error) {
        console.error('Failed to save website info:', error);
        return NextResponse.json({ error: 'Failed to save website info' }, { status: 500 });
    }
}

