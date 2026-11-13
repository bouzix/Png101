import React from 'react';
import Header from '../components/Header';
import SearchImagesClient from './SearchImagesClient';
import prisma from '@/lib/db';
import { getWebsiteInfo } from '@/lib/website-info';
import { recordSearchQuery } from '@/lib/analytics';

export const dynamic = 'force-dynamic';

export default async function SearchPage({
    searchParams,
}: {
    searchParams: Promise<{ q: string }>;
}) {
    const { q } = await searchParams;
    const query = q ? q.toLowerCase().trim() : '';
    const websiteInfo = await getWebsiteInfo();

    let initialBatch: any[] = [];
    let total = 0;
    let hasMore = false;

    try {
        if (query) {
            const allImages = await prisma.image.findMany({
                where: {
                    status: 'published',
                },
                select: {
                    id: true,
                    name: true,
                    filename: true,
                    path: true,
                    tags: true,
                    luminance: true,
                    contrastBgDark: true,
                    contrastBgLight: true,
                    createdAt: true,
                },
                orderBy: {
                    createdAt: 'desc',
                },
            });

            const matchingImages = allImages.filter((img) => {
                if (img.name && img.name.toLowerCase().includes(query)) return true;
                if (img.filename && img.filename.toLowerCase().includes(query)) return true;
                const tags = (img.tags as string[]) || [];
                if (
                    Array.isArray(tags) &&
                    tags.some((tag: string) => typeof tag === 'string' && tag.toLowerCase().includes(query))
                ) {
                    return true;
                }
                return false;
            });

            total = matchingImages.length;
            initialBatch = matchingImages.slice(0, 30);
            hasMore = initialBatch.length < total;

            void recordSearchQuery(query, total);
        }
    } catch (error) {
        console.error('Error searching images:', error);
        initialBatch = [];
        total = 0;
        hasMore = false;
    }

    return (
        <div className="min-h-screen bg-background text-foreground font-sans selection:bg-blue-500/30">
            <Header initialQuery={q || ''} siteName={websiteInfo.websiteName} />

            <main className="container mx-auto px-4 py-8 max-w-7xl">
                <SearchImagesClient
                    key={query}
                    query={q || ''}
                    initialImages={initialBatch}
                    initialTotal={total}
                    initialHasMore={hasMore}
                />
            </main>
        </div>
    );
}

