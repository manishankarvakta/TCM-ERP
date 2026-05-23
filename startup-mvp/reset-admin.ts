import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    try {
        const password = await bcrypt.hash('12345678', 12);
        
        const result = await prisma.user.updateMany({
            where: { role: 'admin' },
            data: { password: password }
        });
        
        console.log(`Successfully reset password to 12345678 for ${result.count} admin users.`);
    } catch (error) {
        console.error('Error resetting password:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
