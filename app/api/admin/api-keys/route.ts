import { NextResponse } from 'next/server';
import { listApiKeys, createApiKey } from '@/lib/api-keys';

export async function GET() {
    try {
        const apiKeys = await listApiKeys();
        return NextResponse.json(apiKeys);
    } catch (error) {
        console.error('Failed to fetch API keys:', error);
        return NextResponse.json({ error: 'Failed to fetch API keys' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { name, key, modelVersion, isActive } = body;

        if (!name || !name.trim() || !key || !key.trim()) {
            return NextResponse.json({ error: 'Name and API key are required' }, { status: 400 });
        }

        const newKey = await createApiKey({
            name,
            key,
            modelVersion,
            isActive: Boolean(isActive),
        });

        return NextResponse.json(newKey, { status: 201 });
    } catch (error) {
        console.error('Failed to create API key:', error);
        return NextResponse.json({ error: 'Failed to create API key' }, { status: 500 });
    }
}
