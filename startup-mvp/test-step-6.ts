import { syncBiometricLogs } from './lib/hr/biometric/sync-service';
import { PrismaClient } from '@prisma/client';
import { getPayrollAttendanceWarnings } from './lib/hr/payroll/attendance-warnings';
const prisma = new PrismaClient();

async function run() {
  const device = await prisma.biometricDevice.findUnique({ where: { serialNumber: 'UEED252100146' } });
  if (!device) return;

  const emps = await prisma.employee.findMany({ take: 2 });
  if (emps.length < 2) return;
  const emp1 = emps[0];
  const emp2 = emps[1];

  // Cleanup old mappings and test logs
  await prisma.employeeDeviceMap.deleteMany({ where: { deviceId: device.id } });
  await prisma.attendanceLog.deleteMany({ where: { deviceId: device.id } });
  await prisma.unmappedBiometricLog.deleteMany({ where: { deviceSerialNumber: 'UEED252100146' } });

  // 1. Create Active Mapping for PIN 1111 (emp1)
  await prisma.employeeDeviceMap.create({
    data: { deviceId: device.id, deviceUserId: '1111', employeeId: emp1.id, isActive: true }
  });

  // 2. Create Disabled Mapping for PIN 2222 (emp2)
  await prisma.employeeDeviceMap.create({
    data: { deviceId: device.id, deviceUserId: '2222', employeeId: emp2.id, isActive: false }
  });

  const rawData = [
    { EnrollNumber: '1111', Date: '2026-06-20', Time: '08:00:00', PunchType: "0" }, // Should pass
    { EnrollNumber: '2222', Date: '2026-06-20', Time: '08:00:00', PunchType: "0" }, // Should be rejected/disabled
    { EnrollNumber: '3333', Date: '2026-06-20', Time: '08:00:00', PunchType: "0" }, // Should be unmapped
    { EnrollNumber: '2222', Date: '2026-06-20', Time: '08:00:00', PunchType: "0" }, // Duplicate disabled punch
  ];

  console.log("Running syncBiometricLogs...");
  await syncBiometricLogs({ vendor: 'ZKTeco', rawData, deviceId: device.id });

  // Wait 2 seconds for worker to process
  await new Promise(r => setTimeout(r, 2000));

  console.log("=== DB Verification ===");
  const attLogs = await prisma.attendanceLog.count({ where: { deviceId: device.id } });
  console.log("AttendanceLogs Created (Expected 1):", attLogs);

  const disabledPunches = await prisma.unmappedBiometricLog.count({ 
    where: { deviceSerialNumber: 'UEED252100146', reason: 'DISABLED_ACCESS' } 
  });
  console.log("Disabled Punches Logged (Expected 1 due to duplicate check):", disabledPunches);

  const unmappedPunches = await prisma.unmappedBiometricLog.count({ 
    where: { deviceSerialNumber: 'UEED252100146', reason: 'EMPLOYEE_NOT_FOUND' } 
  });
  console.log("Unmapped Punches Logged (Expected 1):", unmappedPunches);

  console.log("=== Payroll Warnings ===");
  const warnings = await getPayrollAttendanceWarnings({ 
    fromDate: new Date('2026-06-01T00:00:00Z'), 
    toDate: new Date('2026-06-30T23:59:59Z') 
  });
  console.log("Payroll Warnings Counts:", warnings.counts);

  process.exit(0);
}
run();
