import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function resetAdminPassword() {
    try {
        const newPassword = 'admin123';
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

        // Check if admin password exists
        const existing = await prisma.setting.findUnique({
            where: { key: 'admin_password' }
        });

        if (existing) {
            // Update existing password
            await prisma.setting.update({
                where: { key: 'admin_password' },
                data: {
                    value: hashedPassword
                }
            });
            console.log('✓ Admin password updated successfully!');
        } else {
            // Create new password entry
            await prisma.setting.create({
                data: {
                    key: 'admin_password',
                    value: hashedPassword
                }
            });
            console.log('✓ Admin password created successfully!');
        }

        console.log('✓ New password: admin123');
        console.log('✓ Password is stored encrypted in the database');
        console.log('✓ You can now log in with the new password');
    } catch (error) {
        console.error('Error resetting admin password:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

resetAdminPassword();
