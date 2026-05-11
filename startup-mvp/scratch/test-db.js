const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    await prisma.$connect();
    console.log('Successfully connected to the database');
    const userCount = await prisma.user.count();
    console.log('User count:', userCount);
  } catch (e) {
    console.error('Failed to connect to the database:', e);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
