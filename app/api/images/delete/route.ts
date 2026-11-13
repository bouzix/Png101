import { NextResponse } from 'next/server';
import { unlink } from 'fs/promises';
import path from 'path';
import fs from 'fs';
import prisma from '@/lib/db';
import { getCurrentAdminSession, hasPermission } from '@/lib/team';

export async function DELETE(request: Request) {
    const session = await getCurrentAdminSession();
    if (!hasPermission(session, 'delete_images')) {
        return NextResponse.json(
            { success: false, message: 'Forbidden: You do not have permission to delete images.' },
            { status: 403 }
        );
    }

    const body = await request.json();
    const { ids } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return NextResponse.json({ success: false, message: 'No IDs provided' }, { status: 400 });
    }

    try {
        // Find images to delete to get their paths
        const imagesToDelete = await prisma.image.findMany({
            where: { id: { in: ids } }
        });

        // Delete files from disk
        for (const img of imagesToDelete) {
            const filePath = path.join(process.cwd(), 'public', img.path);
            if (fs.existsSync(filePath)) {
                try {
                    await unlink(filePath);
                } catch (err) {
                    console.error(`Failed to delete file: ${filePath}`, err);
                }
            }
            if (img.previewPath) {
                const previewFilePath = path.join(process.cwd(), 'public', img.previewPath);
                if (fs.existsSync(previewFilePath)) {
                    try {
                        await unlink(previewFilePath);
                    } catch (err) {
                        console.error(`Failed to delete preview file: ${previewFilePath}`, err);
                    }
                }
            }
        }

        // Delete from DB
        await prisma.image.deleteMany({
            where: { id: { in: ids } }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Delete error:', error);
        return NextResponse.json({ success: false, message: 'Failed to delete images' }, { status: 500 });
    }
}
