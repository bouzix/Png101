const fs = require('fs');
const path = require('path');
const imageSize = require('image-size');
const sizeOf = imageSize.default || imageSize;

const DATA_FILE_PATH = path.join(process.cwd(), 'data', 'images.json');
const UPLOADS_DIR = path.join(process.cwd(), 'public');

async function backfillMetadata() {
    try {
        if (!fs.existsSync(DATA_FILE_PATH)) {
            console.error('images.json not found');
            return;
        }

        const content = fs.readFileSync(DATA_FILE_PATH, 'utf-8');
        let images = JSON.parse(content);
        let updatedCount = 0;

        for (let i = 0; i < images.length; i++) {
            const img = images[i];

            // Check if metadata is missing
            if (!img.width || !img.height || !img.size || !img.mimeType) {
                const imagePath = path.join(UPLOADS_DIR, img.path);

                if (fs.existsSync(imagePath)) {
                    try {
                        // Read file into buffer
                        const buffer = fs.readFileSync(imagePath);

                        // Get dimensions
                        const dimensions = sizeOf(buffer);

                        // Get file stats for size
                        const stats = fs.statSync(imagePath);

                        // Update image object
                        img.width = dimensions.width;
                        img.height = dimensions.height;
                        img.size = stats.size;
                        img.mimeType = 'image/' + dimensions.type; // e.g., image/png

                        console.log(`Updated metadata for ${img.filename}: ${img.width}x${img.height}, ${img.size} bytes`);
                        updatedCount++;
                    } catch (err) {
                        console.error(`Error processing ${img.filename}:`, err.message);
                    }
                } else {
                    console.warn(`File not found: ${imagePath}`);
                }
            }
        }

        if (updatedCount > 0) {
            fs.writeFileSync(DATA_FILE_PATH, JSON.stringify(images, null, 2));
            console.log(`Successfully updated ${updatedCount} images.`);
        } else {
            console.log('No images needed updating.');
        }

    } catch (error) {
        console.error('Backfill failed:', error);
    }
}

backfillMetadata();
