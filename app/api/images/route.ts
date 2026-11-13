import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { recordSearchQuery } from '@/lib/analytics';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const categoryId = searchParams.get('categoryId');
    const limitParam = searchParams.get('limit');
    const offsetParam = searchParams.get('offset');
    const paginated = searchParams.get('paginated') === '1';
    const qParam = searchParams.get('q')?.trim() || '';

    try {
        let where: any = {};

        if (status) {
            where.status = status;
        }

        if (categoryId) {
            // Find the category and all its descendants
            const categories = await prisma.category.findMany({
                where: {
                    OR: [
                        { id: categoryId },
                        { parentId: categoryId }
                    ]
                },
                select: { id: true }
            });

            const categoryIds = categories.map(c => c.id);

            where.categories = {
                some: {
                    categoryId: {
                        in: categoryIds
                    }
                }
            };
        }

        const take = limitParam ? Math.max(1, parseInt(limitParam, 10)) : undefined;
        const skip = offsetParam ? Math.max(0, parseInt(offsetParam, 10)) : undefined;

        if (paginated) {
            const pageSize = take || 30;
            const pageSkip = skip || 0;

            if (qParam) {
                const query = qParam.toLowerCase();
                const allMatching = await prisma.image.findMany({
                    where,
                    select: {
                        id: true,
                        name: true,
                        filename: true,
                        path: true,
                        tags: true,
                        createdAt: true,
                        luminance: true,
                        contrastBgDark: true,
                        contrastBgLight: true,
                    },
                    orderBy: { createdAt: 'desc' },
                });

                const filtered = allMatching.filter((img) => {
                    if (img.name && img.name.toLowerCase().includes(query)) return true;
                    if (img.filename && img.filename.toLowerCase().includes(query)) return true;
                    const tags = (img.tags as string[]) || [];
                    if (
                        Array.isArray(tags) &&
                        tags.some(
                            (t: string) => typeof t === 'string' && t.toLowerCase().includes(query)
                        )
                    ) {
                        return true;
                    }
                    return false;
                });

                const total = filtered.length;
                const images = filtered.slice(pageSkip, pageSkip + pageSize);

                if (pageSkip === 0 && qParam) {
                    void recordSearchQuery(qParam, total);
                }

                return NextResponse.json({
                    images,
                    total,
                    hasMore: pageSkip + images.length < total,
                });
            }

            const [images, total] = await Promise.all([
                prisma.image.findMany({
                    where,
                    select: {
                        id: true,
                        name: true,
                        filename: true,
                        path: true,
                        createdAt: true,
                        luminance: true,
                        contrastBgDark: true,
                        contrastBgLight: true,
                    },
                    orderBy: { createdAt: 'desc' },
                    take: pageSize,
                    skip: pageSkip,
                }),
                prisma.image.count({ where }),
            ]);

            return NextResponse.json({
                images,
                total,
                hasMore: pageSkip + images.length < total,
            });
        }

        const images = await prisma.image.findMany({
            where,
            include: {
                categories: {
                    include: {
                        category: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' },
            ...(take !== undefined ? { take } : {}),
            ...(skip !== undefined ? { skip } : {}),
        });

        return NextResponse.json(images);
    } catch (error) {
        console.error('Failed to fetch images:', error);
        return NextResponse.json(paginated ? { images: [], total: 0, hasMore: false } : []);
    }
}
