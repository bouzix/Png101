import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function migrate() {
    console.log('Starting migration...');
    const dbPath = path.join(process.cwd(), 'data', 'images.json');

    if (!fs.existsSync(dbPath)) {
        console.log('No images.json found. Skipping migration.');
        return;
    }

    const fileContent = fs.readFileSync(dbPath, 'utf-8');
    const images = JSON.parse(fileContent);

    console.log(`Found ${images.length} images to migrate.`);

    for (const img of images) {
        try {
            // Check if exists
            const existing = await prisma.image.findUnique({
                where: { id: img.id }
            });

            if (!existing) {
                await prisma.image.create({
                    data: {
                        id: img.id,
                        filename: img.filename,
                        path: img.path,
                        name: img.name || img.filename, // Fallback
                        tags: img.tags || [],
                        status: img.status || 'draft',
                        width: img.width || null,
                        height: img.height || null,
                        size: img.size || null,
                        mimeType: img.mimeType || null,
                        createdAt: img.createdAt ? new Date(img.createdAt) : new Date(),
                    }
                });
                console.log(`Migrated: ${img.id}`);
            } else {
                console.log(`Skipped (exists): ${img.id}`);
            }
        } catch (error) {
            console.error(`Failed to migrate ${img.id}:`, error);
        }
    }

    console.log('Migration complete.');
    await prisma.$disconnect();
}

migrate();
