import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function DELETE() {
    const uploadDir = path.join(process.cwd(), 'public', 'uploads');

    try {
        if (fs.existsSync(uploadDir)) {
            // Recursively delete contents but keep the directory
            fs.rmSync(uploadDir, { recursive: true, force: true });
            fs.mkdirSync(uploadDir);
        }
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Failed to clear uploads:', error);
        return NextResponse.json({ success: false, error: 'Failed to clear uploads' }, { status: 500 });
    }
}
