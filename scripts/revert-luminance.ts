import prisma from '../lib/db';

async function revertLuminance() {
    console.log('--- Reverting all luminance data ---');
    const result = await prisma.image.updateMany({
        data: {
            luminance: null,
        },
    });
    console.log(`Cleared luminance field on ${result.count} images.`);
}

revertLuminance()
    .catch(console.error)
    .finally(() => prisma.$disconnect());

