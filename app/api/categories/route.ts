import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET() {
    try {
        const categories = await prisma.category.findMany({
            include: {
                _count: {
                    select: { images: true }
                },
                children: {
                    include: {
                        _count: {
                            select: { images: true }
                        }
                    }
                }
            },
            orderBy: {
                name: 'asc'
            }
        });
        return NextResponse.json(categories);
    } catch (error) {
        console.error('Failed to fetch categories:', error);
        return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { name, slug, description, parentId } = body;

        if (!name || !slug) {
            return NextResponse.json({ error: 'Name and slug are required' }, { status: 400 });
        }

        const category = await prisma.category.create({
            data: {
                name,
                slug,
                description,
                parentId: parentId || null
            }
        });

        return NextResponse.json(category);
    } catch (error: any) {
        console.error('Failed to create category:', error);
        if (error.code === 'P2002') {
            return NextResponse.json({ error: 'A category with this name/slug already exists' }, { status: 409 });
        }
        return NextResponse.json({ error: 'Failed to create category' }, { status: 500 });
    }
}
