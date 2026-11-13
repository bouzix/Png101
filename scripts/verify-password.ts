import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyAdminPassword() {
    try {
        const setting = await prisma.setting.findUnique({
            where: { key: 'admin_password' }
        });

        if (setting) {
            console.log('✓ Admin password exists in database');
            console.log('✓ Key:', setting.key);
            console.log('✓ Is bcrypt hash:', setting.value.startsWith('$2'));
            console.log('✓ Hash length:', setting.value.length);
        } else {
            console.log('✗ Admin password not found in database');
        }
    } catch (error) {
        console.error('Error verifying admin password:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

verifyAdminPassword();
