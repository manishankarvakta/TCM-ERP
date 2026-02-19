import { prisma } from '../lib/prisma';
import bcrypt from 'bcryptjs';

async function main() {
  console.log('Force seeding...');
  try {
    const hashedPassword = await bcrypt.hash('Admin123', 10);
    let user = await prisma.user.findFirst({ where: { email: 'admin@example.com' } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          name: 'Admin User',
          email: 'admin@example.com',
          password: hashedPassword,
          role: 'ADMIN',
        }
      });
      console.log('Created admin user:', user.id);
    } else {
      console.log('User already exists:', user.id);
    }

    const lead1 = await prisma.lead.create({
      data: {
        name: 'John Doe',
        email: 'john' + Date.now() + '@example.com',
        leadNumber: 'LEAD-2026-0001',
        ownerId: user.id,
      }
    });
    console.log('Created lead 1:', lead1.id, lead1.leadNumber);

    const lead2 = await prisma.lead.create({
      data: {
        name: 'Jane Smith',
        email: 'jane' + Date.now() + '@example.com',
        leadNumber: 'LEAD-2026-0002',
        ownerId: user.id,
      }
    });
    console.log('Created lead 2:', lead2.id, lead2.leadNumber);

    console.log('Force seed completed successfully.');
  } catch (err) {
    console.error('Force seed error:', err);
    process.exit(1);
  }
}

main();
