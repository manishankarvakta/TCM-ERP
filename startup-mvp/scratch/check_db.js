const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const files = await prisma.file.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' }
    });
    console.log('--- Recent Files ---');
    console.log(JSON.stringify(files, null, 2));

    // Also check if there's a Backup model or similar
    // The previous session summary mentioned "Backup" as a table in MinIO to Local migration doc
    // But schema.prisma might have changed.
  } catch (error) {
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
