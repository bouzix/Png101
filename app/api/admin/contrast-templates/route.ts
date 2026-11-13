import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export interface ContrastCustomTemplate {
    name: string;
    color: string;
}

function normalizeTemplates(raw: any[]): ContrastCustomTemplate[] {
    if (!Array.isArray(raw)) return [];
    return raw
        .map(item => {
            if (typeof item === 'string') {
                return { name: item.toUpperCase(), color: item.toLowerCase() };
            }
            if (item && typeof item === 'object' && item.color) {
                return {
                    name: String(item.name || item.color.toUpperCase()).trim(),
                    color: String(item.color).trim().toLowerCase(),
                };
            }
            return null;
        })
        .filter((item): item is ContrastCustomTemplate => Boolean(item && /^#[0-9a-f]{3,8}$/i.test(item.color)))
        .slice(0, 3);
}

export async function GET() {
    try {
        const settings = await prisma.setting.findMany({
            where: {
                key: {
                    in: ['custom_contrast_templates_light', 'custom_contrast_templates_dark'],
                },
            },
        });

        const lightSetting = settings.find(s => s.key === 'custom_contrast_templates_light');
        const darkSetting = settings.find(s => s.key === 'custom_contrast_templates_dark');

        let lightCustoms: ContrastCustomTemplate[] = [];
        let darkCustoms: ContrastCustomTemplate[] = [];

        if (lightSetting?.value) {
            try {
                lightCustoms = normalizeTemplates(JSON.parse(lightSetting.value));
            } catch {}
        }

        if (darkSetting?.value) {
            try {
                darkCustoms = normalizeTemplates(JSON.parse(darkSetting.value));
            } catch {}
        }

        return NextResponse.json({ lightCustoms, darkCustoms });
    } catch (error) {
        console.error('Failed to fetch contrast templates:', error);
        return NextResponse.json({ error: 'Failed to fetch contrast templates' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { type, action, color, name } = body;

        if (type !== 'light' && type !== 'dark') {
            return NextResponse.json({ error: 'Invalid type (must be light or dark)' }, { status: 400 });
        }

        const key = type === 'light' ? 'custom_contrast_templates_light' : 'custom_contrast_templates_dark';
        const setting = await prisma.setting.findUnique({ where: { key } });

        let list: ContrastCustomTemplate[] = [];
        if (setting?.value) {
            try {
                list = normalizeTemplates(JSON.parse(setting.value));
            } catch {}
        }

        const normalizedColor = String(color || '').trim().toLowerCase();

        if (action === 'add') {
            if (!/^#[0-9a-f]{3,8}$/i.test(normalizedColor)) {
                return NextResponse.json({ error: 'Invalid hex color' }, { status: 400 });
            }

            if (list.some(item => item.color === normalizedColor)) {
                return NextResponse.json({ error: 'A template with this color already exists', list }, { status: 400 });
            }

            if (list.length >= 3) {
                return NextResponse.json(
                    { error: 'Maximum of 3 custom templates allowed. Please delete one before adding a new template.' },
                    { status: 400 }
                );
            }

            const templateName = name && String(name).trim() ? String(name).trim().slice(0, 24) : normalizedColor.toUpperCase();
            list.push({ name: templateName, color: normalizedColor });
        } else if (action === 'delete') {
            list = list.filter(item => item.color !== normalizedColor);
        } else {
            return NextResponse.json({ error: 'Invalid action (must be add or delete)' }, { status: 400 });
        }

        // Limit to 3 items maximum
        list = list.slice(0, 3);

        await prisma.setting.upsert({
            where: { key },
            update: { value: JSON.stringify(list) },
            create: { key, value: JSON.stringify(list) },
        });

        return NextResponse.json({ success: true, list, type });
    } catch (error) {
        console.error('Failed to update contrast templates:', error);
        return NextResponse.json({ error: 'Failed to update contrast templates' }, { status: 500 });
    }
}
