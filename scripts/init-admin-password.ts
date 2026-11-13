import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function initAdminPassword() {
    try {
        // Check if admin password already exists
        const existing = await prisma.setting.findUnique({
            where: { key: 'admin_password' }
        });

        if (existing) {
            console.log('Admin password already exists in database. Skipping initialization.');
            console.log('To reset the password, delete the existing setting first.');
            return;
        }

        // Hash the default password
        const defaultPassword = 'admin123';
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(defaultPassword, saltRounds);

        // Store in database
        await prisma.setting.create({
            data: {
                key: 'admin_password',
                value: hashedPassword
            }
        });

        console.log('✓ Admin password initialized successfully!');
        console.log('✓ Default password: admin123');
        console.log('✓ Password is stored encrypted in the database');
    } catch (error) {
        console.error('Error initializing admin password:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

initAdminPassword();
