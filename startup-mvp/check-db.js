const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const rawLogs = await prisma.biometricRawLog.findMany({
    where: { deviceSerialNumber: 'UEED252100146' }
  });
  console.log('BiometricRawLog count:', rawLogs.length);

  const unmappedLogs = await prisma.unmappedBiometricLog.findMany({
    where: { deviceSerialNumber: 'UEED252100146' }
  });
  console.log('UnmappedBiometricLog count:', unmappedLogs.length);
  
  process.exit(0);
}
check();
