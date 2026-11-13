import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getActiveApiKey } from '@/lib/api-keys';
import { previewTagMatches, slugify } from '@/lib/collections';
import { getCurrentAdminSession } from '@/lib/team';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
    try {
        const session = await getCurrentAdminSession();
        if (
            !session.authenticated ||
            (session.role !== 'super_admin' &&
                !session.permissions.includes('*') &&
                !session.permissions.includes('manage_collections'))
        ) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const body = await request.json();
        const { prompt } = body;

        if (!prompt || !prompt.trim()) {
            return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
        }

        const activeKeyRecord = await getActiveApiKey();
        if (!activeKeyRecord?.key) {
            return NextResponse.json(
                { error: 'No active Gemini API key found. Please configure an API key in Settings > API Keys.' },
                { status: 400 }
            );
        }

        let modelVersion = activeKeyRecord.modelVersion || '2.5';
        let resolvedModel = 'gemini-2.5-flash';
        if (modelVersion === '3.8') resolvedModel = 'gemini-3-flash-preview';
        else if (modelVersion === '3.0') resolvedModel = 'gemini-3.1-pro-preview';

        const genAI = new GoogleGenerativeAI(activeKeyRecord.key);
        const model = genAI.getGenerativeModel({
            model: resolvedModel,
            generationConfig: {
                responseMimeType: 'application/json',
            },
        });

        const systemPrompt = `You are a creative curator and SEO specialist for a high-quality transparent PNG graphic asset library.
Given a collection topic or concept, generate a structured collection profile.

Output JSON Format:
{
  "name": "Catchy, professional, and SEO-friendly collection title",
  "slug": "url-friendly-slug",
  "description": "Engaging 1-2 sentence description highlighting the transparent PNG assets in this collection.",
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5", "tag6", "tag7", "tag8"]
}

Ensure tags are single-word or short lowercase tags (e.g. "christmas", "xmas", "santa", "winter", "holiday").
`;

        const result = await model.generateContent([
            systemPrompt,
            `User concept: "${prompt.trim()}"`,
        ]);

        const responseText = result.response.text();
        const parsed = JSON.parse(responseText);

        const tags = Array.isArray(parsed.tags) ? parsed.tags.map((t: string) => t.toLowerCase().trim()) : [];
        const preview = await previewTagMatches(tags, 'any');

        return NextResponse.json({
            name: parsed.name || prompt.trim(),
            slug: slugify(parsed.slug || parsed.name || prompt.trim()),
            description: parsed.description || '',
            tags,
            matchCount: preview.count,
            sampleImages: preview.sampleImages,
        });
    } catch (error: any) {
        console.error('Failed to generate collection with AI:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to generate collection with AI' },
            { status: 500 }
        );
    }
}

