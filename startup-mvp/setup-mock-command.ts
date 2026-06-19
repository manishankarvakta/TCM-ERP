import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function run() {
  const device = await prisma.biometricDevice.findUnique({ where: { serialNumber: 'UEED252100146' } });
  if (!device) {
    console.log("Device not found!");
    process.exit(1);
  }

  // Clear existing pending mock commands
  await prisma.biometricCommand.deleteMany({
    where: { deviceSerialNumber: 'UEED252100146', commandType: 'DATA QUERY USERINFO' }
  });

  // Queue a safe command
  await prisma.biometricCommand.create({
    data: {
      deviceId: device.id,
      deviceSerialNumber: 'UEED252100146',
      commandType: 'DATA QUERY USERINFO',
      commandText: 'DATA QUERY USERINFO PIN=1001',
      status: 'QUEUED',
      priority: 5,
    }
  });

  console.log("Safe command queued successfully.");
  process.exit(0);
}

run();
