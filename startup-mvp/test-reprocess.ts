import { reprocessUnmappedPunches } from './app/(dashboard)/dashboard/hr/biometric/devices/_actions/device-users.action';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function run() {
  const device = await prisma.biometricDevice.findUnique({ where: { serialNumber: 'UEED252100146' } });
  if (!device) return;

  const emp = await prisma.employee.findFirst();
  if (!emp) return;

  // Clear existing mappings for this employee on this device to avoid conflict
  await prisma.employeeDeviceMap.deleteMany({ where: { employeeId: emp.id, deviceId: device.id } });

  await prisma.employeeDeviceMap.upsert({
    where: { deviceId_deviceUserId: { deviceId: device.id, deviceUserId: '9999' } },
    update: { employeeId: emp.id, isActive: true },
    create: { deviceId: device.id, deviceUserId: '9999', employeeId: emp.id, isActive: true }
  });

  console.log("PIN 9999 mapped to Employee ID:", emp.id);

  // Run the reprocess action
  const res = await reprocessUnmappedPunches(device.id, device.serialNumber || '', '9999');
  console.log("Reprocess Result:", res);

  // Check AttendanceLog
  const logs = await prisma.attendanceLog.findMany({
    where: { employeeId: emp.id, deviceId: device.id },
    orderBy: { timestamp: 'desc' }
  });
  console.log("AttendanceLogs for Employee:", logs.length);
  
  // Try duplicate reprocess
  const res2 = await reprocessUnmappedPunches(device.id, device.serialNumber || '', '9999');
  console.log("Duplicate Reprocess Result:", res2);

  process.exit(0);
}
run();
