import { prisma } from '../lib/prisma';

async function main() {
  console.log('Seeding leads...');
  try {
    const user = await prisma.user.findFirst();
    if (!user) {
      console.log('No user found, cannot seed leads.');
      return;
    }

    const lead1 = await prisma.lead.create({
      data: {
        name: 'John Doe',
        email: 'john' + Date.now() + '@example.com',
        // @ts-ignore
        leadNumber: 'LEAD-2026-0001',
        ownerId: user.id,
      }
    });
    // @ts-ignore
    console.log('Created lead 1:', lead1.id, lead1.leadNumber);

    const lead2 = await prisma.lead.create({
      data: {
        name: 'Jane Smith',
        email: 'jane' + Date.now() + '@example.com',
        // @ts-ignore
        leadNumber: 'LEAD-2026-0002',
        ownerId: user.id,
      }
    });
    // @ts-ignore
    console.log('Created lead 2:', lead2.id, lead2.leadNumber);

    console.log('Seed completed successfully.');
  } catch (err) {
    console.error('Seed error:', err);
    process.exit(1);
  }
}

main();
