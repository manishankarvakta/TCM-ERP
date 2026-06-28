import { reprocessUnmappedPunches } from './app/(dashboard)/dashboard/hr/biometric/devices/_actions/device-users.action';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function run() {
  const device = await prisma.biometricDevice.findUnique({ where: { serialNumber: 'UEED252100146' } });
  if (!device) return;

  // Insert a mock unknown punch
  await prisma.unmappedBiometricLog.create({
    data: {
      deviceSerialNumber: 'UEED252100146',
      deviceUserId: '8888',
      punchTime: new Date(),
      reason: 'EMPLOYEE_NOT_FOUND',
      status: 'UNRESOLVED'
    }
  });

  const emp = await prisma.employee.findFirst();
  if (!emp) return;

  // Clear existing mappings
  await prisma.employeeDeviceMap.deleteMany({ where: { employeeId: emp.id, deviceId: device.id } });

  await prisma.employeeDeviceMap.upsert({
    where: { deviceId_deviceUserId: { deviceId: device.id, deviceUserId: '8888' } },
    update: { employeeId: emp.id, isActive: true },
    create: { deviceId: device.id, deviceUserId: '8888', employeeId: emp.id, isActive: true }
  });

  console.log("PIN 8888 mapped. Running Reprocess...");

  // Run the reprocess action
  const res = await reprocessUnmappedPunches(device.id, device.serialNumber || '', '8888');
  console.log("Reprocess Result:", res);

  // Try duplicate reprocess
  const res2 = await reprocessUnmappedPunches(device.id, device.serialNumber || '', '8888');
  console.log("Duplicate Reprocess Result:", res2);

  process.exit(0);
}
run();
