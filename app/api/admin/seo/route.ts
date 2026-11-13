import { NextResponse } from 'next/server';
import {
    getSeoSettings,
    saveSeoSettings,
    generateAllSeoFiles,
    checkAndRunScheduledSeoGeneration,
} from '@/lib/seo-generator';

export async function GET() {
    try {
        await checkAndRunScheduledSeoGeneration();
        const settings = await getSeoSettings();
        return NextResponse.json(settings);
    } catch (error) {
        console.error('Failed to fetch SEO settings:', error);
        return NextResponse.json({ error: 'Failed to fetch SEO settings' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();

        if (body.action === 'generate') {
            if (body.settings) {
                await saveSeoSettings(body.settings);
            }
            const updated = await generateAllSeoFiles('manual');
            return NextResponse.json({ success: true, data: updated });
        }

        const saved = await saveSeoSettings(body);
        return NextResponse.json({ success: true, data: saved });
    } catch (error) {
        console.error('Failed to process SEO action:', error);
        return NextResponse.json({ error: 'Failed to process SEO request' }, { status: 500 });
    }
}

