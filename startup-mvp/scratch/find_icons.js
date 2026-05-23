const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const files = await prisma.file.findMany({
      where: { name: 'icons.png' }
    });
    console.log(JSON.stringify(files, null, 2));
  } catch (error) {
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
