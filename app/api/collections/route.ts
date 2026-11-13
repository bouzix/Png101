import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import {
    listCollections,
    getUniqueSlug,
    normalizeTags,
    previewTagMatches,
} from '@/lib/collections';
import { getCurrentAdminSession } from '@/lib/team';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const isAdmin = searchParams.get('admin') === '1';
        const isFeatured = searchParams.get('featured') === '1' ? true : undefined;
        const search = searchParams.get('q') || undefined;
        const status = searchParams.get('status') as 'published' | 'draft' | undefined;
        const sort = (searchParams.get('sort') as any) || undefined;
        const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : undefined;
        const days = searchParams.get('days') ? parseInt(searchParams.get('days')!, 10) : undefined;

        let includeDrafts = false;
        if (isAdmin) {
            const session = await getCurrentAdminSession();
            if (session.authenticated) {
                includeDrafts = true;
            }
        }

        const collections = await listCollections({
            status,
            isFeatured,
            search,
            includeDrafts,
            sortBy: sort,
            limit,
            days,
        });

        return NextResponse.json(collections);
    } catch (error: any) {
        console.error('Failed to list collections:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to list collections' },
            { status: 500 }
        );
    }
}

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
        const {
            name,
            slug: requestedSlug,
            description,
            type = 'manual',
            tagRules = [],
            ruleMatchMode = 'any',
            isFeatured = false,
            status = 'published',
            coverImageId,
            coverImagePath,
            imageIds = [],
        } = body;

        if (!name || !name.trim()) {
            return NextResponse.json({ error: 'Collection name is required' }, { status: 400 });
        }

        const cleanTags = normalizeTags(tagRules);
        const finalSlug = requestedSlug?.trim()
            ? await getUniqueSlug(requestedSlug.trim())
            : await getUniqueSlug(name.trim());

        // Create collection
        const collection = await prisma.collection.create({
            data: {
                name: name.trim(),
                slug: finalSlug,
                description: description?.trim() || null,
                type: type === 'smart_dynamic' || type === 'smart_snapshot' ? type : 'manual',
                tagRules: cleanTags.length > 0 ? cleanTags : undefined,
                ruleMatchMode: ruleMatchMode === 'all' ? 'all' : 'any',
                isFeatured: Boolean(isFeatured),
                status: status === 'draft' ? 'draft' : 'published',
                coverImageId: coverImageId || null,
                coverImagePath: coverImagePath || null,
            },
        });

        // If snapshot or manual with selected imageIds, populate CollectionImage junction
        let initialImageIds: string[] = [];

        if (type === 'smart_snapshot' && cleanTags.length > 0) {
            const matches = await previewTagMatches(cleanTags, ruleMatchMode);
            initialImageIds = matches.sampleImages.map((img) => img.id);
            // Also grab all matches, not just sample:
            const allPublished = await prisma.image.findMany({
                where: { status: 'published' },
                select: { id: true, tags: true },
            });
            initialImageIds = allPublished
                .filter((img) => {
                    const imgTags = normalizeTags(img.tags);
                    if (ruleMatchMode === 'all') {
                        return cleanTags.every((t) => imgTags.includes(t));
                    }
                    return cleanTags.some((t) => imgTags.includes(t));
                })
                .map((img) => img.id);
        } else if (Array.isArray(imageIds) && imageIds.length > 0) {
            initialImageIds = imageIds;
        }

        if (initialImageIds.length > 0) {
            // Deduplicate
            const uniqueIds = Array.from(new Set(initialImageIds));
            await prisma.collectionImage.createMany({
                data: uniqueIds.map((id, index) => ({
                    collectionId: collection.id,
                    imageId: id,
                    position: index,
                    isPinned: false,
                    isExcluded: false,
                })),
                skipDuplicates: true,
            });

            // Set cover image fallback if none selected
            if (!collection.coverImagePath) {
                const firstImg = await prisma.image.findUnique({
                    where: { id: uniqueIds[0] },
                    select: { id: true, path: true },
                });
                if (firstImg) {
                    await prisma.collection.update({
                        where: { id: collection.id },
                        data: {
                            coverImageId: firstImg.id,
                            coverImagePath: firstImg.path,
                        },
                    });
                }
            }
        }

        return NextResponse.json(collection);
    } catch (error: any) {
        console.error('Failed to create collection:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to create collection' },
            { status: 500 }
        );
    }
}
