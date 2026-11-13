import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getCurrentAdminSession } from '@/lib/team';

export const dynamic = 'force-dynamic';

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
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

        const { id: collectionId } = await params;
        const body = await request.json();
        const { action, imageIds, imageId, isPinned, isExcluded, position } = body;

        const collection = await prisma.collection.findUnique({
            where: { id: collectionId },
        });

        if (!collection) {
            return NextResponse.json({ error: 'Collection not found' }, { status: 404 });
        }

        // Action: Add multiple images
        if (action === 'add' && Array.isArray(imageIds) && imageIds.length > 0) {
            const currentCount = await prisma.collectionImage.count({
                where: { collectionId },
            });

            const createData = imageIds.map((imgId: string, idx: number) => ({
                collectionId,
                imageId: imgId,
                position: currentCount + idx,
                isPinned: false,
                isExcluded: false,
            }));

            await prisma.collectionImage.createMany({
                data: createData,
                skipDuplicates: true,
            });

            // Set cover if not set
            if (!collection.coverImagePath) {
                const firstImg = await prisma.image.findUnique({
                    where: { id: imageIds[0] },
                    select: { id: true, path: true },
                });
                if (firstImg) {
                    await prisma.collection.update({
                        where: { id: collectionId },
                        data: {
                            coverImageId: firstImg.id,
                            coverImagePath: firstImg.path,
                        },
                    });
                }
            }

            return NextResponse.json({ success: true, count: imageIds.length });
        }

        // Action: Update single image state (pin, exclude, reorder)
        if (action === 'update' && imageId) {
            const updateData: any = {};
            if (isPinned !== undefined) updateData.isPinned = Boolean(isPinned);
            if (isExcluded !== undefined) updateData.isExcluded = Boolean(isExcluded);
            if (position !== undefined) updateData.position = Number(position);

            const result = await prisma.collectionImage.upsert({
                where: {
                    collectionId_imageId: {
                        collectionId,
                        imageId,
                    },
                },
                update: updateData,
                create: {
                    collectionId,
                    imageId,
                    isPinned: isPinned ? true : false,
                    isExcluded: isExcluded ? true : false,
                    position: position ? Number(position) : 0,
                },
            });

            return NextResponse.json({ success: true, data: result });
        }

        // Action: Set cover image
        if (action === 'set_cover' && imageId) {
            const img = await prisma.image.findUnique({
                where: { id: imageId },
                select: { id: true, path: true },
            });
            if (!img) {
                return NextResponse.json({ error: 'Image not found' }, { status: 404 });
            }
            await prisma.collection.update({
                where: { id: collectionId },
                data: {
                    coverImageId: img.id,
                    coverImagePath: img.path,
                },
            });
            return NextResponse.json({ success: true, coverImagePath: img.path });
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    } catch (error: any) {
        console.error('Failed to update collection images:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to update collection images' },
            { status: 500 }
        );
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
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

        const { id: collectionId } = await params;
        const { searchParams } = new URL(request.url);
        const imageId = searchParams.get('imageId');

        if (!imageId) {
            return NextResponse.json({ error: 'Image ID is required' }, { status: 400 });
        }

        const collection = await prisma.collection.findUnique({
            where: { id: collectionId },
        });

        if (!collection) {
            return NextResponse.json({ error: 'Collection not found' }, { status: 404 });
        }

        if (collection.type === 'smart_dynamic') {
            // In smart dynamic collections, removing an image marks it as isExcluded: true
            await prisma.collectionImage.upsert({
                where: {
                    collectionId_imageId: {
                        collectionId,
                        imageId,
                    },
                },
                update: {
                    isExcluded: true,
                    isPinned: false,
                },
                create: {
                    collectionId,
                    imageId,
                    isExcluded: true,
                    isPinned: false,
                },
            });
        } else {
            // Manual: remove junction record
            await prisma.collectionImage.deleteMany({
                where: {
                    collectionId,
                    imageId,
                },
            });
        }

        return NextResponse.json({ success: true, message: 'Image removed from collection' });
    } catch (error: any) {
        console.error('Failed to remove image from collection:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to remove image from collection' },
            { status: 500 }
        );
    }
}

