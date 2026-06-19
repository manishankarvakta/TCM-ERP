import { PrismaClient } from '@prisma/client';
import {
  reprocessRawLogsByDeviceAndDate,
  reprocessUnknownPunchesByDeviceAndDate,
  reprocessFailedSyncsByDeviceAndDate,
  queueTestAdmsHistoricalQuery
} from './lib/hr/biometric/reprocess-service';

const prisma = new PrismaClient();

async function run() {
  const device = await prisma.biometricDevice.findUnique({ where: { serialNumber: 'UEED252100146' } });
  if (!device) return console.log("Device not found");

  const emps = await prisma.employee.findMany({ take: 3 });
  if (emps.length < 3) return console.log("Need 3 employees");

  // Cleanup
  await prisma.attendanceLog.deleteMany({ where: { deviceId: device.id } });
  await prisma.biometricRawLog.deleteMany({ where: { deviceSerialNumber: 'UEED252100146' } });
  await prisma.unmappedBiometricLog.deleteMany({ where: { deviceSerialNumber: 'UEED252100146' } });
  await prisma.biometricSyncLog.deleteMany({ where: { deviceId: device.id } });
  await prisma.employeeDeviceMap.deleteMany({ where: { deviceId: device.id } });

  // Mappings
  await prisma.employeeDeviceMap.create({ data: { deviceId: device.id, deviceUserId: '100', employeeId: emps[0].id, isActive: true } });
  await prisma.employeeDeviceMap.create({ data: { deviceId: device.id, deviceUserId: '200', employeeId: emps[1].id, isActive: false } });

  const date = new Date('2026-06-20T08:00:00Z');

  // Seed Raw Logs
  await prisma.biometricRawLog.create({
    data: { deviceSerialNumber: 'UEED252100146', deviceUserId: '100', punchTime: date, syncStatus: 'PENDING', source: 'ADMS', rawData: JSON.stringify({ EnrollNumber: '100', Date: '2026-06-20', Time: '08:00:00' }) }
  });
  // We skip duplicate Raw Log insertion since Step 1's unique constraint correctly prevents it!

  // Seed Unknown Punches
  await prisma.unmappedBiometricLog.create({
    data: { deviceSerialNumber: 'UEED252100146', deviceUserId: '100', punchTime: new Date(date.getTime() + 1000), status: 'UNRESOLVED', reason: 'EMPLOYEE_NOT_FOUND' }
  }); // Should be processed to attendance
  await prisma.unmappedBiometricLog.create({
    data: { deviceSerialNumber: 'UEED252100146', deviceUserId: '200', punchTime: date, status: 'REJECTED', reason: 'DISABLED_ACCESS' }
  }); // Should stay disabled
  await prisma.unmappedBiometricLog.create({
    data: { deviceSerialNumber: 'UEED252100146', deviceUserId: '999', punchTime: date, status: 'UNRESOLVED', reason: 'EMPLOYEE_NOT_FOUND' }
  }); // Should stay unresolved (unmapped)

  // Seed Failed Sync
  await prisma.biometricSyncLog.create({
    data: { deviceId: device.id, status: 'FAILED', vendor: 'ZKTeco', recordsCount: 1, errorMessage: 'Network error', syncTime: date }
  });

  console.log("1. Testing Reprocess Raw Logs");
  const res1 = await reprocessRawLogsByDeviceAndDate(device.id, new Date('2026-06-01'), new Date('2026-06-30'));
  console.log("Raw Logs Reprocess:", res1);
  await new Promise(r => setTimeout(r, 2000));

  console.log("2. Testing Reprocess Unknown Punches");
  const res2 = await reprocessUnknownPunchesByDeviceAndDate(device.id, new Date('2026-06-01'), new Date('2026-06-30'));
  console.log("Unknown Punches Reprocess:", res2);
  await new Promise(r => setTimeout(r, 2000));

  console.log("3. Testing Reprocess Failed Syncs");
  const res3 = await reprocessFailedSyncsByDeviceAndDate(device.id, new Date('2026-06-01'), new Date('2026-06-30'));
  console.log("Failed Syncs Reprocess:", res3);

  console.log("4. Testing ADMS Historical Query Queue");
  const res4 = await queueTestAdmsHistoricalQuery(device.id);
  console.log("ADMS Query:", res4);

  console.log("=== DB Verification ===");
  const attLogs = await prisma.attendanceLog.count({ where: { deviceId: device.id } });
  console.log("AttendanceLogs (Expected 2):", attLogs);
  
  const unmappedLogs = await prisma.unmappedBiometricLog.findMany({ where: { deviceSerialNumber: 'UEED252100146' } });
  console.log("Unmapped logs statuses:");
  for (const log of unmappedLogs) {
    console.log(`- PIN ${log.deviceUserId}: ${log.status} (${log.reason})`);
  }
  
  const cmds = await prisma.biometricCommand.findMany({ where: { deviceId: device.id } });
  console.log("Commands:", cmds.map(c => c.commandText));

  process.exit(0);
}
run();
