const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { getPayrollAttendanceWarnings } = require('./lib/hr/payroll/attendance-warnings');

async function run() {
  // Clear mock data
  await prisma.unmappedBiometricLog.deleteMany({ where: { deviceUserId: 'TEST_WARN' }});
  await prisma.biometricSyncLog.deleteMany({ where: { vendor: 'TEST_WARN' }});
  await prisma.leaveApplication.deleteMany({ where: { reason: 'TEST_WARN' }});

  // Payroll Period: June 2026
  const fromDate = new Date(Date.UTC(2026, 5, 1, 0, 0, 0));
  const toDate = new Date(Date.UTC(2026, 5, 30, 23, 59, 59));

  // 1. Inside Unmapped
  await prisma.unmappedBiometricLog.create({
    data: { deviceUserId: 'TEST_WARN', punchTime: new Date(Date.UTC(2026, 5, 15)), reason: 'EMPLOYEE_NOT_FOUND', status: 'UNRESOLVED' }
  });

  // 2. Outside Unmapped (July 2026)
  await prisma.unmappedBiometricLog.create({
    data: { deviceUserId: 'TEST_WARN', punchTime: new Date(Date.UTC(2026, 6, 15)), reason: 'EMPLOYEE_NOT_FOUND', status: 'UNRESOLVED' }
  });

  // 3. Pending leave inside period
  const emp = await prisma.employee.findFirst();
  const lt = await prisma.leaveType.findFirst();
  if (emp && lt) {
    await prisma.leaveApplication.create({
      data: {
        employeeId: emp.id,
        leaveTypeId: lt.id,
        startDate: new Date(Date.UTC(2026, 5, 10)),
        endDate: new Date(Date.UTC(2026, 5, 12)),
        totalDays: 3,
        reason: 'TEST_WARN',
        status: 'PENDING',
        createdBy: emp.userId || 'SYSTEM'
      }
    });
  }

  // 4. Failed sync inside period
  await prisma.biometricSyncLog.create({
    data: { vendor: 'TEST_WARN', syncTime: new Date(Date.UTC(2026, 5, 20)), status: 'FAILED' }
  });

  console.log("=== Testing June 2026 (WITH ISSUES) ===");
  const res1 = await getPayrollAttendanceWarnings({ fromDate, toDate });
  console.log(JSON.stringify(res1.counts, null, 2));

  console.log("=== Testing August 2026 (NO ISSUES) ===");
  const fromDateAug = new Date(Date.UTC(2026, 7, 1, 0, 0, 0));
  const toDateAug = new Date(Date.UTC(2026, 7, 31, 23, 59, 59));
  const res2 = await getPayrollAttendanceWarnings({ fromDate: fromDateAug, toDate: toDateAug });
  console.log(JSON.stringify(res2.counts, null, 2));

  // Cleanup
  await prisma.unmappedBiometricLog.deleteMany({ where: { deviceUserId: 'TEST_WARN' }});
  await prisma.biometricSyncLog.deleteMany({ where: { vendor: 'TEST_WARN' }});
  await prisma.leaveApplication.deleteMany({ where: { reason: 'TEST_WARN' }});

  process.exit(0);
}

run();
