import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { getCodeInjection, saveCodeInjection } from '@/lib/code-injection';

export async function GET() {
    try {
        const data = await getCodeInjection();
        return NextResponse.json(data);
    } catch (error) {
        console.error('Failed to fetch code injection settings:', error);
        return NextResponse.json({ error: 'Failed to fetch code injection settings' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const saved = await saveCodeInjection({
            headCode: body.headCode ?? '',
            bodyCode: body.bodyCode ?? '',
            footerCode: body.footerCode ?? '',
        });

        revalidatePath('/', 'layout');

        return NextResponse.json({ success: true, data: saved });
    } catch (error) {
        console.error('Failed to save code injection settings:', error);
        return NextResponse.json({ error: 'Failed to save code injection settings' }, { status: 500 });
    }
}

