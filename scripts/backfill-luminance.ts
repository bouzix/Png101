import prisma from '../lib/db';
import { calculateImageLuminance } from '../lib/luminance';
import path from 'path';
import fs from 'fs';

async function backfillLuminance() {
    console.log('--- Starting Luminance Scan for Existing Images ---');
    const images = await prisma.image.findMany({
        select: {
            id: true,
            name: true,
            filename: true,
            path: true,
            luminance: true,
        },
    });

    console.log(`Found ${images.length} total images in database.\n`);

    let darkCount = 0;
    let lightCount = 0;
    let balancedCount = 0;
    let updatedCount = 0;
    let missingFiles = 0;

    for (let i = 0; i < images.length; i++) {
        const img = images[i];
        const fullPath = path.join(process.cwd(), 'public', img.path);

        if (!fs.existsSync(fullPath)) {
            console.warn(`[MISSING FILE] (${i + 1}/${images.length}) ${img.name || img.filename} at ${fullPath}`);
            missingFiles++;
            continue;
        }

        const { luminance, score } = await calculateImageLuminance(fullPath);

        await prisma.image.update({
            where: { id: img.id },
            data: { luminance },
        });

        updatedCount++;
        if (luminance === 'dark') darkCount++;
        else if (luminance === 'light') lightCount++;
        else balancedCount++;

        console.log(
            `[${i + 1}/${images.length}] ${luminance.toUpperCase().padEnd(8)} (score: ${String(score).padStart(3)}) : ${img.name || img.filename}`
        );
    }

    console.log('\n--- Scan Complete ---');
    console.log(`Updated images:  ${updatedCount}`);
    console.log(`Dark images:     ${darkCount} (need contrast in dark mode)`);
    console.log(`Light images:    ${lightCount} (need contrast in light mode)`);
    console.log(`Balanced images: ${balancedCount}`);
    if (missingFiles > 0) {
        console.log(`Missing files:   ${missingFiles}`);
    }
}

backfillLuminance()
    .catch((err) => {
        console.error('Error during backfill:', err);
    })
    .finally(() => prisma.$disconnect());

