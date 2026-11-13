import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function PUT(
    request: Request,
    props: { params: Promise<{ id: string }> }
) {
    try {
        const params = await props.params;
        console.log('PUT /api/categories/[id] hit', params.id);
        const body = await request.json();
        const { name, slug, description, parentId } = body;

        // Basic validation
        if (!name || !slug) {
            return NextResponse.json(
                { error: 'Name and slug are required' },
                { status: 400 }
            );
        }

        // Prevent setting parent to self
        if (parentId === params.id) {
            return NextResponse.json(
                { error: 'Category cannot be its own parent' },
                { status: 400 }
            );
        }

        const category = await prisma.category.update({
            where: { id: params.id },
            data: {
                name,
                slug,
                description,
                parentId: parentId || null
            }
        });

        return NextResponse.json(category);
    } catch (error: any) {
        console.error('Failed to update category:', error);
        if (error.code === 'P2002') {
            return NextResponse.json(
                { error: 'A category with this name/slug already exists' },
                { status: 409 }
            );
        }
        return NextResponse.json(
            { error: 'Failed to update category' },
            { status: 500 }
        );
    }
}

export async function DELETE(
    request: Request,
    props: { params: Promise<{ id: string }> }
) {
    try {
        const params = await props.params;
        console.log('DELETE /api/categories/[id] hit', params.id);
        await prisma.category.delete({
            where: { id: params.id }
        });

        return NextResponse.json({ message: 'Category deleted successfully' });
    } catch (error) {
        console.error('Failed to delete category:', error);
        return NextResponse.json(
            { error: 'Failed to delete category' },
            { status: 500 }
        );
    }
}
