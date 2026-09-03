import { PrismaClient } from "@prisma/client";
import { processBiometricAttendance } from "../lib/hr/biometric/processor";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding Today's Biometric Attendance logs...");

  // 1. Find or create a default user for creator tracking
  const user = await prisma.user.findFirst();
  if (!user) {
    throw new Error("No users found in database. Please run seed-users first.");
  }

  const org = await prisma.organization.findFirst();
  if (!org) {
    throw new Error("No organization found in database.");
  }

  // 2. Find or create the Biometric Device matching the IP '192.168.0.111'
  const device = await prisma.biometricDevice.upsert({
    where: { serialNumber: "ZK-192.168.0.111" },
    update: {
      connectionStatus: "online",
      lastSyncAt: new Date(),
    },
    create: {
      name: "Dhaka Office Entrance",
      vendor: "ZKTeco",
      connectionType: "IP",
      ipAddress: "192.168.0.111",
      port: 4370,
      serialNumber: "ZK-192.168.0.111",
      location: "Main Gate",
      status: "active",
      connectionStatus: "online",
      createdBy: user.id,
    },
  });
  console.log(`Device resolved: ${device.name} (${device.ipAddress})`);

  // 3. Find or create Salaries Payable Account
  let salaryPayableCOA = await prisma.chartOfAccount.findFirst({
    where: {
      name: { contains: "Salaries Payable", mode: "insensitive" },
    },
  });

  if (!salaryPayableCOA) {
    salaryPayableCOA = await prisma.chartOfAccount.create({
      data: {
        code: "2110-099",
        name: "Salaries Payable",
        type: "LIABILITY",
        status: "active",
        createdBy: user.id,
      },
    });
  }

  // 4. Find or create a Shift
  let shift = await prisma.shift.findFirst();
  if (!shift) {
    shift = await prisma.shift.create({
      data: {
        name: "Regular Office Shift",
        startTime: "09:00",
        endTime: "18:00",
        graceMinutes: 10,
        lateAfter: 15,
        halfDayAfter: 120,
        otStartAfter: 30,
        createdBy: user.id,
      },
    });
  }
  console.log(`Shift resolved: ${shift.name} (${shift.startTime} - ${shift.endTime})`);

  // 5. Create employees with deviceUserId '1', '2', '101', '102'
  const employeesData = [
    { deviceUserId: "1", name: "John Doe", employeeCode: "EMP-0001" },
    { deviceUserId: "2", name: "Jane Smith", employeeCode: "EMP-0002" },
    { deviceUserId: "101", name: "Bob Johnson", employeeCode: "EMP-0101" },
    { deviceUserId: "102", name: "Alice Williams", employeeCode: "EMP-0102" },
  ];

  const employeeMap = new Map<string, string>();

  for (const emp of employeesData) {
    const created = await prisma.employee.upsert({
      where: { deviceUserId: emp.deviceUserId },
      update: {
        shiftId: shift.id,
        salaryPayableAccountId: salaryPayableCOA.id,
      },
      create: {
        name: emp.name,
        employeeCode: emp.employeeCode,
        deviceUserId: emp.deviceUserId,
        status: "active",
        shiftId: shift.id,
        salaryPayableAccountId: salaryPayableCOA.id,
        organizationId: org.id,
      },
    });
    employeeMap.set(emp.deviceUserId, created.id);
    console.log(`Employee resolved: ${created.name} (deviceUserId: ${created.deviceUserId})`);
  }

  // 6. Create Today's punches in AttendanceLog
  const punches = [
    { deviceUserId: "1", timestamp: new Date("2026-07-26T07:46:21.000Z") },
    { deviceUserId: "101", timestamp: new Date("2026-07-26T08:28:42.000Z") },
    { deviceUserId: "2", timestamp: new Date("2026-07-26T08:29:10.000Z") },
    { deviceUserId: "102", timestamp: new Date("2026-07-26T08:31:31.000Z") },
    { deviceUserId: "1", timestamp: new Date("2026-07-26T09:19:12.000Z") },
  ];

  let rawLogsCreated = 0;
  for (const punch of punches) {
    const employeeId = employeeMap.get(punch.deviceUserId);
    if (!employeeId) continue;

    await prisma.attendanceLog.upsert({
      where: {
        employeeId_timestamp: {
          employeeId,
          timestamp: punch.timestamp,
        },
      },
      update: {},
      create: {
        employeeId,
        timestamp: punch.timestamp,
        source: "BIOMETRIC",
        deviceId: device.id,
      },
    });
    rawLogsCreated++;
  }
  console.log(`Successfully seeded ${rawLogsCreated} raw biometric punches.`);

  // 7. Compile the punches into Daily Attendance records
  console.log("Compiling raw logs into Daily Attendance records for 2026-07-26...");
  const dateToProcess = new Date("2026-07-26");
  const compileResult = await processBiometricAttendance(dateToProcess, dateToProcess);
  console.log(`Compilation complete: ${compileResult.processedCount} attendance rows compiled/updated.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
