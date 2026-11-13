import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import prisma from '@/lib/db';
import { getCurrentAdminSession, hasPermission } from '@/lib/team';

export async function PATCH(request: Request) {
    const session = await getCurrentAdminSession();
    if (!hasPermission(session, 'edit_images') && !hasPermission(session, 'upload_images')) {
        return NextResponse.json(
            { success: false, message: 'Forbidden: You do not have permission to edit images.' },
            { status: 403 }
        );
    }

    const body = await request.json();
    const { id, name, tags, status, categoryIds } = body;

    if (!id) {
        return NextResponse.json({ success: false, message: 'Image ID is required' }, { status: 400 });
    }

    try {
        const image = await prisma.image.findUnique({ where: { id } });

        if (!image) {
            return NextResponse.json({ success: false, message: 'Image not found' }, { status: 404 });
        }

        let updateData: any = {};
        if (tags !== undefined) updateData.tags = tags;
        if (status !== undefined) updateData.status = status;
        if (body.altText !== undefined) updateData.altText = body.altText;
        if (body.description !== undefined) updateData.description = body.description;
        if (body.contrastBgDark !== undefined) updateData.contrastBgDark = body.contrastBgDark;
        if (body.contrastBgLight !== undefined) updateData.contrastBgLight = body.contrastBgLight;

        // Handle many-to-many category relationship
        if (categoryIds !== undefined) {
            // Delete existing category associations
            await prisma.imageCategory.deleteMany({
                where: { imageId: id }
            });

            // Create new category associations
            if (categoryIds.length > 0) {
                await prisma.imageCategory.createMany({
                    data: categoryIds.map((categoryId: string) => ({
                        imageId: id,
                        categoryId
                    }))
                });
            }
        }

        let renamed = false;
        let oldPathForRollback = '';
        let newPathForRollback = '';

        // Update fields if provided
        if (name !== undefined && name !== image.name) {
            updateData.name = name;

            // Renaming logic
            const oldPath = path.join(process.cwd(), 'public', image.path);

            if (fs.existsSync(oldPath)) {
                const extension = path.extname(image.filename);
                const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
                const uniqueId = Math.random().toString(36).substring(2, 9);
                const newFilename = `${slug}-${uniqueId}${extension}`;

                const dir = path.dirname(oldPath);
                const newPath = path.join(dir, newFilename);

                try {
                    await fs.promises.rename(oldPath, newPath);
                    renamed = true;
                    oldPathForRollback = oldPath;
                    newPathForRollback = newPath;

                    // Update DB fields
                    updateData.filename = newFilename;
                    const relativeDir = path.dirname(image.path);
                    // Ensure forward slashes for web path
                    updateData.path = `${relativeDir}/${newFilename}`.replace(/\\/g, '/');
                } catch (err) {
                    console.error("Failed to rename file", err);
                    // If rename fails, we just don't update the filename/path in DB, but we continue with other updates
                }
            }
        }

        try {
            const updatedImage = await prisma.image.update({
                where: { id },
                data: updateData
            });
            return NextResponse.json({ success: true, image: updatedImage });
        } catch (dbError) {
            // Rollback file rename if DB update fails
            if (renamed && oldPathForRollback && newPathForRollback) {
                try {
                    console.log("Rolling back file rename due to DB error...");
                    await fs.promises.rename(newPathForRollback, oldPathForRollback);
                } catch (rollbackError) {
                    console.error("Failed to rollback file rename", rollbackError);
                }
            }
            throw dbError;
        }

    } catch (error) {
        console.error('Update error:', error);
        return NextResponse.json({ success: false, message: 'Failed to update image' }, { status: 500 });
    }
}
