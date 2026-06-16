const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const unmapped = await prisma.unmappedBiometricLog.findMany();
  console.log("Unmapped logs:", unmapped.length);
  const raw = await prisma.biometricRawLog.findMany();
  console.log("Raw logs:", raw.length);
}
main().catch(console.error).finally(() => prisma.$disconnect());
