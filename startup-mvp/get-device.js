const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const d = await prisma.biometricDevice.findFirst({ select: { id: true }});
  console.log("DeviceID:", d ? d.id : "none");
  process.exit(0);
}
main();
