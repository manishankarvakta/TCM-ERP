import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function run() {
  const device = await prisma.biometricDevice.findUnique({ where: { serialNumber: 'UEED252100146' } });
  if (!device) return;

  // Insert a mock unknown punch
  await prisma.unmappedBiometricLog.create({
    data: {
      deviceSerialNumber: 'UEED252100146',
      deviceUserId: '9999',
      punchTime: new Date(),
      reason: 'EMPLOYEE_NOT_FOUND',
      status: 'UNRESOLVED'
    }
  });

  console.log("Mock unknown punch created for 9999.");
  process.exit(0);
}
run();
