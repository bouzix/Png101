import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { slugify } from '@/lib/utils';

export async function GET(request: NextRequest) {
    const filePath = request.nextUrl.searchParams.get('path');

    if (!filePath) {
        return NextResponse.redirect(new URL('/', request.url));
    }

    try {
        const image = await prisma.image.findFirst({
            where: {
                OR: [
                    { previewPath: filePath },
                    { path: filePath },
                ],
            },
        });

        if (image) {
            const slug = slugify(image.name || image.filename || 'image');
            const targetPath = `/images/${image.id}${slug ? `-${slug}` : ''}`;
            return NextResponse.redirect(new URL(targetPath, request.url), 307);
        }
    } catch (error) {
        console.error('Error redirecting upload path to image page:', error);
    }

    return NextResponse.redirect(new URL('/', request.url));
}

