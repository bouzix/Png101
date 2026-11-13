import prisma from './db';

export interface CollectionSummary {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    coverImageId: string | null;
    coverImagePath: string | null;
    type: 'manual' | 'smart_dynamic' | 'smart_snapshot';
    tagRules: string[] | null;
    ruleMatchMode: 'any' | 'all';
    isFeatured: boolean;
    status: 'published' | 'draft';
    order: number;
    viewsCount: number;
    downloadsCount: number;
    imageCount: number;
    previewImages: {
        id: string;
        filename: string;
        path: string;
        previewPath?: string | null;
        name?: string | null;
        luminance?: string | null;
        contrastBgDark?: string | null;
        contrastBgLight?: string | null;
    }[];
    createdAt: Date;
    updatedAt: Date;
}

/**
 * Generate a clean, URL-safe slug from a string.
 */
export function slugify(text: string): string {
    return text
        .toString()
        .toLowerCase()
        .trim()
        .replace(/[\s\W-]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

/**
 * Ensure the generated slug is unique by appending -1, -2 if needed.
 */
export async function getUniqueSlug(baseName: string, excludeId?: string): Promise<string> {
    const baseSlug = slugify(baseName) || 'collection';
    let slug = baseSlug;
    let counter = 1;

    while (true) {
        const existing = await prisma.collection.findFirst({
            where: {
                slug,
                ...(excludeId ? { id: { not: excludeId } } : {}),
            },
            select: { id: true },
        });

        if (!existing) {
            return slug;
        }

        counter++;
        slug = `${baseSlug}-${counter}`;
    }
}

/**
 * Normalize an array of raw tag strings (lowercase, trimmed, deduplicated)
 */
export function normalizeTags(tags: any): string[] {
    if (!Array.isArray(tags)) return [];
    const set = new Set<string>();
    for (const t of tags) {
        if (typeof t === 'string') {
            const clean = t.trim().toLowerCase();
            if (clean) set.add(clean);
        }
    }
    return Array.from(set);
}

/**
 * Matches an image's tags against rule tags based on mode ('any' | 'all')
 */
export function matchesTagRules(imageTags: string[], ruleTags: string[], mode: 'any' | 'all' = 'any'): boolean {
    if (!ruleTags || ruleTags.length === 0) return false;
    const imgSet = new Set(imageTags.map((t) => t.toLowerCase()));

    if (mode === 'all') {
        return ruleTags.every((ruleTag) => imgSet.has(ruleTag.toLowerCase()));
    } else {
        return ruleTags.some((ruleTag) => imgSet.has(ruleTag.toLowerCase()));
    }
}

/**
 * Preview how many published images match a given set of tags and mode.
 */
export async function previewTagMatches(ruleTags: string[], mode: 'any' | 'all' = 'any'): Promise<{
    count: number;
    sampleImages: { id: string; name: string | null; filename: string; path: string; tags: any }[];
}> {
    const cleanRules = normalizeTags(ruleTags);
    if (cleanRules.length === 0) {
        return { count: 0, sampleImages: [] };
    }

    const allPublished = await prisma.image.findMany({
        where: { status: 'published' },
        select: {
            id: true,
            name: true,
            filename: true,
            path: true,
            tags: true,
        },
    });

    const matching = allPublished.filter((img) => {
        const imgTags = normalizeTags(img.tags);
        return matchesTagRules(imgTags, cleanRules, mode);
    });

    return {
        count: matching.length,
        sampleImages: matching.slice(0, 8),
    };
}

/**
 * Get all collections with count & preview thumbnails
 */
export async function listCollections(options?: {
    status?: 'published' | 'draft';
    isFeatured?: boolean;
    search?: string;
    includeDrafts?: boolean;
    sortBy?: 'trending' | 'recent' | 'popular' | 'order';
    limit?: number;
    days?: number;
}): Promise<CollectionSummary[]> {
    const where: any = {};

    if (options?.status) {
        where.status = options.status;
    } else if (!options?.includeDrafts) {
        where.status = 'published';
    }

    if (options?.isFeatured !== undefined) {
        where.isFeatured = options.isFeatured;
    }

    if (options?.search) {
        where.OR = [
            { name: { contains: options.search } },
            { description: { contains: options.search } },
            { slug: { contains: options.search } },
        ];
    }

    let orderBy: any[] = [{ isFeatured: 'desc' }, { order: 'asc' }, { createdAt: 'desc' }];
    if (options?.sortBy === 'trending') {
        orderBy = [
            { isFeatured: 'desc' },
            { viewsCount: 'desc' },
            { downloadsCount: 'desc' },
            { updatedAt: 'desc' },
            { createdAt: 'desc' },
        ];
    } else if (options?.sortBy === 'recent') {
        orderBy = [{ createdAt: 'desc' }];
    } else if (options?.sortBy === 'popular') {
        orderBy = [{ viewsCount: 'desc' }, { downloadsCount: 'desc' }, { createdAt: 'desc' }];
    }

    const collections = await prisma.collection.findMany({
        where,
        take: options?.limit && options.limit > 0 ? options.limit : undefined,
        include: {
            images: {
                where: { isExcluded: false },
                orderBy: [{ isPinned: 'desc' }, { position: 'asc' }, { createdAt: 'desc' }],
                include: {
                    image: {
                        select: {
                            id: true,
                            filename: true,
                            path: true,
                            previewPath: true,
                            name: true,
                            tags: true,
                            luminance: true,
                            contrastBgDark: true,
                            contrastBgLight: true,
                            status: true,
                        },
                    },
                },
            },
        },
        orderBy,
    });

    // If there are smart dynamic collections, we compute their live count and sample previews
    const publishedImages = await prisma.image.findMany({
        where: { status: 'published' },
        select: {
            id: true,
            filename: true,
            path: true,
            previewPath: true,
            name: true,
            tags: true,
            luminance: true,
            contrastBgDark: true,
            contrastBgLight: true,
            createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
    });

    return collections.map((col) => {
        const tagRules = normalizeTags(col.tagRules);
        let finalImages: any[] = [];

        if (col.type === 'smart_dynamic' && tagRules.length > 0) {
            const excludedIds = new Set(
                col.images.filter((ci) => ci.isExcluded).map((ci) => ci.imageId)
            );
            const pinnedImages = col.images
                .filter((ci) => ci.isPinned && !ci.isExcluded && ci.image?.status === 'published')
                .map((ci) => ci.image);
            const pinnedIds = new Set(pinnedImages.map((img) => img.id));

            const dynamicMatches = publishedImages.filter((img) => {
                if (excludedIds.has(img.id) || pinnedIds.has(img.id)) return false;
                const imgTags = normalizeTags(img.tags);
                return matchesTagRules(imgTags, tagRules, (col.ruleMatchMode as 'any' | 'all') || 'any');
            });

            finalImages = [...pinnedImages, ...dynamicMatches];
        } else {
            // Manual or Snapshot: use junction images
            finalImages = col.images
                .filter((ci) => ci.image && ci.image.status === 'published')
                .map((ci) => ci.image);
        }

        // Cover image fallback
        let coverPath = col.coverImagePath;
        if (!coverPath && finalImages.length > 0) {
            coverPath = finalImages[0].path;
        }

        return {
            id: col.id,
            name: col.name,
            slug: col.slug,
            description: col.description,
            coverImageId: col.coverImageId,
            coverImagePath: coverPath,
            type: col.type as any,
            tagRules,
            ruleMatchMode: (col.ruleMatchMode as any) || 'any',
            isFeatured: col.isFeatured,
            status: col.status as any,
            order: col.order,
            viewsCount: col.viewsCount,
            downloadsCount: col.downloadsCount,
            imageCount: finalImages.length,
            previewImages: finalImages.slice(0, 4),
            createdAt: col.createdAt,
            updatedAt: col.updatedAt,
        };
    });
}

/**
 * Get single collection by slug or ID with paginated images
 */
export async function getCollectionWithImages(
    identifier: { slug?: string; id?: string },
    options?: { page?: number; limit?: number; includeDrafts?: boolean }
) {
    const where: any = {};
    if (identifier.slug) where.slug = identifier.slug;
    if (identifier.id) where.id = identifier.id;

    if (!options?.includeDrafts) {
        where.status = 'published';
    }

    const collection = await prisma.collection.findFirst({
        where,
        include: {
            images: {
                orderBy: [{ isPinned: 'desc' }, { position: 'asc' }, { createdAt: 'desc' }],
                include: {
                    image: {
                        select: {
                            id: true,
                            filename: true,
                            path: true,
                            previewPath: true,
                            name: true,
                            tags: true,
                            altText: true,
                            description: true,
                            width: true,
                            height: true,
                            size: true,
                            luminance: true,
                            contrastBgDark: true,
                            contrastBgLight: true,
                            status: true,
                            createdAt: true,
                        },
                    },
                },
            },
        },
    });

    if (!collection) return null;

    const page = Math.max(1, options?.page || 1);
    const limit = Math.max(1, options?.limit || 30);
    const skip = (page - 1) * limit;

    const tagRules = normalizeTags(collection.tagRules);
    let resolvedImages: any[] = [];

    if (collection.type === 'smart_dynamic' && tagRules.length > 0) {
        const excludedIds = new Set(
            collection.images.filter((ci) => ci.isExcluded).map((ci) => ci.imageId)
        );
        const pinnedImages = collection.images
            .filter((ci) => ci.isPinned && !ci.isExcluded && ci.image?.status === 'published')
            .map((ci) => ({ ...ci.image, isPinned: true }));
        const pinnedIds = new Set(pinnedImages.map((img) => img.id));

        const allPublished = await prisma.image.findMany({
            where: { status: 'published' },
            select: {
                id: true,
                filename: true,
                path: true,
                previewPath: true,
                name: true,
                tags: true,
                altText: true,
                description: true,
                width: true,
                height: true,
                size: true,
                luminance: true,
                contrastBgDark: true,
                contrastBgLight: true,
                status: true,
                createdAt: true,
            },
            orderBy: { createdAt: 'desc' },
        });

        const dynamicMatches = allPublished.filter((img) => {
            if (excludedIds.has(img.id) || pinnedIds.has(img.id)) return false;
            const imgTags = normalizeTags(img.tags);
            return matchesTagRules(imgTags, tagRules, (collection.ruleMatchMode as 'any' | 'all') || 'any');
        });

        resolvedImages = [...pinnedImages, ...dynamicMatches];
    } else {
        // Manual or Snapshot: use junction images
        resolvedImages = collection.images
            .filter((ci) => ci.image && ci.image.status === 'published' && !ci.isExcluded)
            .map((ci) => ({
                ...ci.image,
                isPinned: ci.isPinned,
                position: ci.position,
            }));
    }

    const total = resolvedImages.length;
    const paginatedImages = resolvedImages.slice(skip, skip + limit);

    let coverPath = collection.coverImagePath;
    if (!coverPath && resolvedImages.length > 0) {
        coverPath = resolvedImages[0].path;
    }

    return {
        collection: {
            id: collection.id,
            name: collection.name,
            slug: collection.slug,
            description: collection.description,
            coverImageId: collection.coverImageId,
            coverImagePath: coverPath,
            type: collection.type,
            tagRules,
            ruleMatchMode: collection.ruleMatchMode,
            isFeatured: collection.isFeatured,
            status: collection.status,
            order: collection.order,
            viewsCount: collection.viewsCount,
            downloadsCount: collection.downloadsCount,
            createdAt: collection.createdAt,
            updatedAt: collection.updatedAt,
        },
        images: paginatedImages,
        total,
        page,
        limit,
        hasMore: skip + paginatedImages.length < total,
    };
}

/**
 * Increment view count for a collection
 */
export async function trackCollectionView(id: string) {
    try {
        await prisma.collection.update({
            where: { id },
            data: { viewsCount: { increment: 1 } },
        });
    } catch {}
}

/**
 * Find which collections an image belongs to
 */
export async function getCollectionsForImage(imageId: string, imageTags?: string[]): Promise<{
    id: string;
    name: string;
    slug: string;
    coverImagePath: string | null;
}[]> {
    // 1. Direct manual collections
    const directCollections = await prisma.collection.findMany({
        where: {
            status: 'published',
            images: {
                some: {
                    imageId,
                    isExcluded: false,
                },
            },
        },
        select: {
            id: true,
            name: true,
            slug: true,
            coverImagePath: true,
        },
    });

    const results = new Map<string, { id: string; name: string; slug: string; coverImagePath: string | null }>();
    for (const c of directCollections) {
        results.set(c.id, c);
    }

    // 2. Smart dynamic collections matching image's tags
    const normalizedImgTags = normalizeTags(imageTags);
    if (normalizedImgTags.length > 0) {
        const smartCollections = await prisma.collection.findMany({
            where: {
                status: 'published',
                type: 'smart_dynamic',
            },
            include: {
                images: {
                    where: { imageId },
                },
            },
        });

        for (const sc of smartCollections) {
            // Check if explicitly excluded
            if (sc.images.some((ci) => ci.isExcluded)) continue;

            const rules = normalizeTags(sc.tagRules);
            if (matchesTagRules(normalizedImgTags, rules, (sc.ruleMatchMode as 'any' | 'all') || 'any')) {
                results.set(sc.id, {
                    id: sc.id,
                    name: sc.name,
                    slug: sc.slug,
                    coverImagePath: sc.coverImagePath,
                });
            }
        }
    }

    return Array.from(results.values());
}

