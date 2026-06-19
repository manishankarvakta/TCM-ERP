const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const rawLogs = await prisma.biometricRawLog.findMany({
    where: { deviceSerialNumber: 'UEED252100146' },
    orderBy: { createdAt: 'desc' },
    take: 5
  });
  console.log('BiometricRawLog recent:', rawLogs);

  const unmappedLogs = await prisma.unmappedBiometricLog.findMany({
    where: { deviceSerialNumber: 'UEED252100146' },
    orderBy: { createdAt: 'desc' },
    take: 5
  });
  console.log('UnmappedBiometricLog recent:', unmappedLogs);
  
  process.exit(0);
}
check();
