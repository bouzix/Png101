import React from 'react';
import { notFound } from 'next/navigation';
import ImagePageContent from './ImagePageContent';
import prisma from '@/lib/db';
import { Prisma } from '@prisma/client';
import { getWebsiteInfo } from '@/lib/website-info';
import { recordImageView } from '@/lib/analytics';
import { getRankedRelatedImages } from '@/lib/related-images';
import { getCollectionsForImage } from '@/lib/collections';

export const dynamic = 'force-dynamic';

async function getImage(id: string) {
    try {
        const image = await prisma.image.findUnique({
            where: { id },
        });
        return image;
    } catch (error) {
        console.error('Error fetching image:', error);
        return null;
    }
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const imageId = id.substring(0, 36);
    const image = await getImage(imageId);

    const setting = await prisma.setting.findUnique({
        where: { key: 'websiteTitle' }
    });
    const siteTitle = setting?.value || "PNG Finder";

    if (!image) {
        return {
            title: 'Image Not Found',
        };
    }

    return {
        title: `${image.name} - ${siteTitle}`,
        description: image.description || `Download ${image.name} PNG image. Free high-quality PNG image.`,
        openGraph: {
            title: `${image.name} - ${siteTitle}`,
            description: image.description || `Download ${image.name} PNG image.`,
            images: [
                {
                    url: image.previewPath || image.path,
                    width: image.width || 800,
                    height: image.height || 600,
                    alt: image.altText || image.name || 'PNG Image',
                },
            ],
        },
        twitter: {
            card: 'summary_large_image',
            title: `${image.name} - ${siteTitle}`,
            description: image.description || `Download ${image.name} PNG image.`,
            images: [image.previewPath || image.path],
        },
    };
}

export default async function ImagePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    // Extract UUID (first 36 characters)
    const imageId = id.substring(0, 36);
    const image = await getImage(imageId);

    if (!image) {
        notFound();
    }

    // Record page view asynchronously
    void recordImageView(image.id);

    // Fetch related images using weighted subject -> brand -> category/concept hierarchy
    let relatedImages: any[] = [];
    let totalRelatedImages = 0;

    try {
        const result = await getRankedRelatedImages(imageId, { limit: 10, offset: 0 });
        relatedImages = result.images;
        totalRelatedImages = result.total;
    } catch (e) {
        console.error("Error fetching related images", e);
        relatedImages = [];
        totalRelatedImages = 0;
    }

    const websiteInfo = await getWebsiteInfo();
    const imageCollections = await getCollectionsForImage(image.id, (image.tags as string[]) || []);

    const jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'ImageObject',
        contentUrl: image.previewPath || image.path,
        license: 'https://creativecommons.org/licenses/by/4.0/', // Example license
        acquireLicensePage: `${websiteInfo.websiteUrl}/terms-of-service`,
        creditText: websiteInfo.websiteName,
        creator: {
            '@type': 'Organization',
            name: websiteInfo.companyName || websiteInfo.websiteName,
        },
        copyrightNotice: websiteInfo.companyName || websiteInfo.websiteName,
        name: image.name,
        description: image.description || `High-quality PNG image of ${image.name}`,
        width: image.width ? `${image.width} px` : undefined,
        height: image.height ? `${image.height} px` : undefined,
        encodingFormat: image.mimeType || 'image/png',
        fileFormat: image.mimeType || 'image/png',
        contentSize: image.size ? `${Math.round(image.size / 1024)} KB` : undefined,
        caption: image.altText || image.name,
    };

    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />
            <ImagePageContent
                image={image}
                relatedImages={relatedImages}
                totalRelatedImages={totalRelatedImages}
                siteName={websiteInfo.websiteName}
                collections={imageCollections}
            />
        </>
    );
}
