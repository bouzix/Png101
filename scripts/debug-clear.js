const fs = require('fs');
const path = require('path');

async function debugClear() {
    // Using native fetch (Node 18+)

    console.log('--- Debugging Data Clearing ---');

    // 1. Check Initial State
    const dbPath = path.join(process.cwd(), 'data', 'images.json');
    const uploadDir = path.join(process.cwd(), 'public', 'uploads');

    console.log(`DB Path: ${dbPath}`);
    console.log(`Uploads Path: ${uploadDir}`);

    if (fs.existsSync(dbPath)) {
        const dbContent = fs.readFileSync(dbPath, 'utf-8');
        const count = JSON.parse(dbContent).length;
        console.log(`[Initial] DB Image Count: ${count}`);
    } else {
        console.log('[Initial] DB file does not exist.');
    }

    if (fs.existsSync(uploadDir)) {
        const files = fs.readdirSync(uploadDir, { recursive: true });
        console.log(`[Initial] Uploads File Count (recursive): ${files.length}`);
    } else {
        console.log('[Initial] Uploads directory does not exist.');
    }

    // 2. Call Clear DB API
    console.log('\nCalling DELETE /api/admin/clear-db...');
    try {
        const res = await fetch('http://localhost:3000/api/admin/clear-db', { method: 'DELETE' });
        const data = await res.json();
        console.log('Response:', data);
    } catch (e) {
        console.error('API Call Failed:', e.message);
    }

    // 3. Call Clear Uploads API
    console.log('\nCalling DELETE /api/admin/clear-uploads...');
    try {
        const res = await fetch('http://localhost:3000/api/admin/clear-uploads', { method: 'DELETE' });
        const data = await res.json();
        console.log('Response:', data);
    } catch (e) {
        console.error('API Call Failed:', e.message);
    }

    // 4. Check Final State
    console.log('\n--- Final State ---');
    if (fs.existsSync(dbPath)) {
        const dbContent = fs.readFileSync(dbPath, 'utf-8');
        const count = JSON.parse(dbContent).length;
        console.log(`[Final] DB Image Count: ${count}`);
    }

    if (fs.existsSync(uploadDir)) {
        const files = fs.readdirSync(uploadDir, { recursive: true });
        console.log(`[Final] Uploads File Count (recursive): ${files.length}`);
    }
}

debugClear();
