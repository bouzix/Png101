import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function DELETE() {
    try {
        // Delete all records from the Image table
        await prisma.image.deleteMany();
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Clear DB error:', error);
        return NextResponse.json({ success: false }, { status: 500 });
    }
}
