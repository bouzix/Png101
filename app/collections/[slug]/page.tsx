import React from 'react';
import { notFound } from 'next/navigation';
import Header from '../../components/Header';
import CollectionDetailClient from './CollectionDetailClient';
import { getCollectionWithImages, listCollections, trackCollectionView } from '@/lib/collections';
import { getWebsiteInfo } from '@/lib/website-info';
import { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
    params,
}: {
    params: Promise<{ slug: string }>;
}): Promise<Metadata> {
    const { slug } = await params;
    const [data, websiteInfo] = await Promise.all([
        getCollectionWithImages({ slug }, { limit: 1 }),
        getWebsiteInfo(),
    ]);

    if (!data) {
        return {
            title: 'Collection Not Found',
        };
    }

    const { collection } = data;
    const title = `${collection.name} PNG Clipart & Graphics Pack - ${websiteInfo.websiteName}`;
    const desc =
        collection.description ||
        `Download free high-resolution transparent PNG images from the ${collection.name} collection on ${websiteInfo.websiteName}.`;

    return {
        title,
        description: desc,
        openGraph: {
            title,
            description: desc,
            type: 'website',
            images: collection.coverImagePath
                ? [
                      {
                          url: collection.coverImagePath,
                          alt: collection.name,
                      },
                  ]
                : [],
        },
    };
}

export default async function CollectionDetailPage({
    params,
}: {
    params: Promise<{ slug: string }>;
}) {
    const { slug } = await params;
    const [data, websiteInfo, allCollections] = await Promise.all([
        getCollectionWithImages({ slug }, { limit: 100 }),
        getWebsiteInfo(),
        listCollections({ status: 'published', includeDrafts: false }),
    ]);

    if (!data) {
        notFound();
    }

    const { collection, images, total } = data;

    // Track public view asynchronously
    void trackCollectionView(collection.id);

    // Other collections to suggest (exclude current)
    const relatedCollections = allCollections
        .filter((c) => c.id !== collection.id)
        .slice(0, 3);

    // Schema.org structured data
    const jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: collection.name,
        description: collection.description || `Curated transparent PNG collection: ${collection.name}`,
        url: `${websiteInfo.websiteUrl}/collections/${collection.slug}`,
        mainEntity: {
            '@type': 'ItemList',
            itemListElement: images.map((img: any, idx: number) => ({
                '@type': 'ListItem',
                position: idx + 1,
                item: {
                    '@type': 'ImageObject',
                    name: img.name || img.filename,
                    contentUrl: `${websiteInfo.websiteUrl}${img.path}`,
                },
            })),
        },
    };

    return (
        <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />

            <Header siteName={websiteInfo.websiteName} />

            <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8">
                <CollectionDetailClient
                    collection={{
                        ...collection,
                        createdAt: collection.createdAt.toISOString(),
                    }}
                    initialImages={images}
                    total={total}
                    relatedCollections={relatedCollections}
                />
            </main>
        </div>
    );
}
