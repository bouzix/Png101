import { NextResponse } from 'next/server';
import { updateApiKey, deleteApiKey } from '@/lib/api-keys';

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();
        const { name, key, modelVersion, isActive } = body;

        const updatedKey = await updateApiKey(id, {
            name,
            key,
            modelVersion,
            isActive,
        });

        return NextResponse.json(updatedKey);
    } catch (error) {
        console.error('Failed to update API key:', error);
        return NextResponse.json({ error: 'Failed to update API key' }, { status: 500 });
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        await deleteApiKey(id);
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Failed to delete API key:', error);
        return NextResponse.json({ error: 'Failed to delete API key' }, { status: 500 });
    }
}
