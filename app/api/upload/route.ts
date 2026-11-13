import { NextResponse } from 'next/server';
import sizeOf from 'image-size';
import path from 'path';
import fs from 'fs';
import { writeFile } from 'fs/promises';
import prisma from '@/lib/db';
import sharp from 'sharp';
import { calculateImageLuminance } from '@/lib/luminance';

export async function POST(request: Request) {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File;
        const name = formData.get('name') as string;
        const tagsString = formData.get('tags') as string;

        if (!file) {
            return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());

        // Date-based directory structure
        const now = new Date();
        const year = now.getFullYear().toString();
        const month = now.toLocaleString('default', { month: 'long' }).toLowerCase();
        const day = now.getDate().toString().padStart(2, '0');

        const uploadDir = path.join(process.cwd(), 'public', 'uploads', year, month, day);

        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }

        // 1. Save Original File
        const filename = `${Date.now()}-${file.name.replace(/\s/g, '-')}`;
        const filepath = path.join(uploadDir, filename);
        await writeFile(filepath, buffer);

        // 2. Generate Preview with Checkerboard
        // We want a checkerboard pattern. We can generate a small tile and repeat it.
        // OR simpler: Create a composite with a raw checkerboard buffer.
        // Let's create a 20x20 px checkerboard pattern svg for tiling
        const checkerboardSvg = `
            <svg width="20" height="20" xmlns="http://www.w3.org/2000/svg">
                <rect width="200" height="200" fill="#ffffff"/>
                <rect width="10" height="10" fill="#e5e5e5"/>
                <rect x="10" y="10" width="10" height="10" fill="#e5e5e5"/>
            </svg>
        `;
        const checkboardBuffer = Buffer.from(checkerboardSvg);

        const previewFilename = `preview-${filename}.jpg`; // Use JPG to force flattening
        const previewFilepath = path.join(uploadDir, previewFilename);

        // Get dimensions first
        const dimensions = sizeOf(buffer);
        const width = dimensions.width || 800;
        const height = dimensions.height || 600;

        // Process with Sharp
        // Strategy: Create a tiled checkerboard background of the same size, then composite original on top.
        await sharp(checkboardBuffer)
            .resize({ width, height }) // Resize the 20x20 tile?? No, resize behavior for SVG?
            // Better approach for tiling:
            // Create a NEW image with the tiled pattern, then composite.
            // Sharp doesn't have direct "tile this buffer" easily without composite.
            // EASIEST: Flatten with a background color? No, we want checkerboard.
            // COMPOSITE APPROACH:
            // 1. Create a blank image of correct size with checkerboard pattern (tiled).
            //    Actually, simple CSS-style tiling is hard in backend sharp without creating a massive buffer.
            // ALTERNATIVE: Use a simple grey background? User asked for "checkered transparency pattern".
            // Let's try `extend` with `repeat`? No.
            // Let's valid approach:
            // Use `sharp({ create: ... })` to make big background? No.
            //
            // ROBUST APPROACH:
            // Use a 1000x1000 (or max size) static checkerboard image file? No.
            //
            // Let's use the SVG pattern approach but make the SVG big enough to cover likely image size?
            // SVG patterns repeat automatically if defined right!
            // Let's generate a dynamic SVG of the IMAGE SIZE with a pattern fill.
            .destroy(); // Just cleanup thought process

        const dynamicCheckerSvg = `
            <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <pattern id="checkers" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
                        <rect width="20" height="20" fill="#ffffff"/>
                        <rect width="10" height="10" fill="#e5e5e5"/>
                        <rect x="10" y="10" width="10" height="10" fill="#e5e5e5"/>
                    </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#checkers)"/>
            </svg>
        `;

        await sharp(Buffer.from(dynamicCheckerSvg))
            .composite([{ input: buffer }])
            .jpeg({ quality: 80 }) // Flatten validation happens here implicitly as JPEG doesn't support alpha? No, ensure alpha is removed/flattened.
            // Actually, composite puts the PNG over the SVG. The SVG is opaque.
            // Saving as JPEG discards any alpha that might remain (though there shouldn't be any).
            .toFile(previewFilepath);


        // Calculate luminance for smart contrast adaptation
        const { luminance } = await calculateImageLuminance(buffer);

        // Create in DB
        const newImage = await prisma.image.create({
            data: {
                filename: filename,
                path: `/uploads/${year}/${month}/${day}/${filename}`,
                previewPath: `/uploads/${year}/${month}/${day}/${previewFilename}`,
                name: name || filename,
                tags: tagsString ? JSON.parse(tagsString) : [],
                status: 'draft',
                width: dimensions.width,
                height: dimensions.height,
                size: file.size,
                mimeType: file.type,
                luminance: luminance
            }
        });

        return NextResponse.json({ success: true, image: newImage });
    } catch (error) {
        console.error('Upload error:', error);
        return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
    }
}
