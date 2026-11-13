import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import {
    getCollectionWithImages,
    getUniqueSlug,
    normalizeTags,
    trackCollectionView,
} from '@/lib/collections';
import { getCurrentAdminSession } from '@/lib/team';

export const dynamic = 'force-dynamic';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get('page') || '1', 10);
        const limit = parseInt(searchParams.get('limit') || '30', 10);
        const isAdmin = searchParams.get('admin') === '1';

        let includeDrafts = false;
        if (isAdmin) {
            const session = await getCurrentAdminSession();
            if (session.authenticated) {
                includeDrafts = true;
            }
        }

        const data = await getCollectionWithImages(
            { id },
            { page, limit, includeDrafts }
        );

        if (!data) {
            return NextResponse.json({ error: 'Collection not found' }, { status: 404 });
        }

        if (!isAdmin) {
            void trackCollectionView(id);
        }

        return NextResponse.json(data);
    } catch (error: any) {
        console.error('Failed to get collection:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to get collection' },
            { status: 500 }
        );
    }
}

export async function PUT(
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

        const { id } = await params;
        const body = await request.json();
        const {
            name,
            slug: requestedSlug,
            description,
            type,
            tagRules,
            ruleMatchMode,
            isFeatured,
            status,
            coverImageId,
            coverImagePath,
            order,
        } = body;

        const existing = await prisma.collection.findUnique({
            where: { id },
        });

        if (!existing) {
            return NextResponse.json({ error: 'Collection not found' }, { status: 404 });
        }

        const dataToUpdate: any = {};

        if (name !== undefined) dataToUpdate.name = name.trim();
        if (description !== undefined) dataToUpdate.description = description ? description.trim() : null;
        if (type !== undefined) dataToUpdate.type = type;
        if (tagRules !== undefined) dataToUpdate.tagRules = normalizeTags(tagRules);
        if (ruleMatchMode !== undefined) dataToUpdate.ruleMatchMode = ruleMatchMode;
        if (isFeatured !== undefined) dataToUpdate.isFeatured = Boolean(isFeatured);
        if (status !== undefined) dataToUpdate.status = status;
        if (coverImageId !== undefined) dataToUpdate.coverImageId = coverImageId;
        if (coverImagePath !== undefined) dataToUpdate.coverImagePath = coverImagePath;
        if (order !== undefined) dataToUpdate.order = Number(order) || 0;

        if (requestedSlug && requestedSlug.trim() && requestedSlug.trim() !== existing.slug) {
            dataToUpdate.slug = await getUniqueSlug(requestedSlug.trim(), id);
        }

        const updated = await prisma.collection.update({
            where: { id },
            data: dataToUpdate,
        });

        return NextResponse.json(updated);
    } catch (error: any) {
        console.error('Failed to update collection:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to update collection' },
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

        const { id } = await params;

        await prisma.collection.delete({
            where: { id },
        });

        return NextResponse.json({ success: true, message: 'Collection deleted successfully' });
    } catch (error: any) {
        console.error('Failed to delete collection:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to delete collection' },
            { status: 500 }
        );
    }
}

