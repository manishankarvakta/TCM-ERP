import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function run() {
  const device = await prisma.biometricDevice.findUnique({ where: { serialNumber: 'UEED252100146' } });
  
  await prisma.biometricCommand.create({
    data: {
      deviceId: device?.id || "",
      deviceSerialNumber: 'UEED252100146',
      commandType: 'CLEAR DATA',
      commandText: 'CLEAR DATA',
      status: 'QUEUED',
      priority: 5,
    }
  });

  console.log("Dangerous command queued.");
  process.exit(0);
}
run();
