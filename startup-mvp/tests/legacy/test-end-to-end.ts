import { prisma } from "../lib/prisma";

async function run() {
  console.log("1. Setting up Test Employee with Biometric ID '101'...");
  let emp = await prisma.employee.findFirst({ where: { biometricDeviceId: "101" } });
  if (!emp) {
    emp = await prisma.employee.create({
      data: {
        name: "Test Biometric User 101",
        biometricDeviceId: "101",
        status: "active",
      }
    });
    console.log("Created test employee.");
  } else {
    console.log("Found existing employee.");
  }

  const user = await prisma.user.findFirst();
  let device = await prisma.biometricDevice.findFirst({ where: { serialNumber: "SN-TEST-1234" } });
  if (!device) {
    device = await prisma.biometricDevice.create({
      data: {
        name: "Test ADMS Terminal",
        vendor: "ZKTeco",
        serialNumber: "SN-TEST-1234",
        createdBy: user ? user.id : "missing",
      }
    });
  }

  const rawData = [
    { EnrollNumber: "101", Date: "2026-06-16", Time: "09:15:00", DeviceID: "SN-TEST-1234" },
    { EnrollNumber: "101", Date: "2026-06-16", Time: "18:30:00", DeviceID: "SN-TEST-1234" }
  ];

  console.log("2. Simulating Device Push...");
  const { processNormalizedChunk } = await import("../lib/hr/biometric/sync-service");
  const { processBiometricAttendance } = await import("../lib/hr/biometric/processor");
  
  await processNormalizedChunk({
    vendor: "ZKTeco",
    rawData,
    deviceId: device.id
  });

  console.log("3. Processing Attendance...");
  const start = new Date("2026-06-16T00:00:00.000Z");
  const end = new Date("2026-06-16T23:59:59.000Z");
  await processBiometricAttendance(start, end, emp.id);

  console.log("\n4. Verifying Database Records...");
  const logs = await prisma.attendanceLog.findMany({
    where: { employeeId: emp.id },
    orderBy: { timestamp: "asc" }
  });
  
  console.log("--- RAW PUNCH LOGS SAVED ---");
  console.log(logs.map(l => `${l.source}: ${l.timestamp.toISOString()}`));

  const attendance = await prisma.attendance.findMany({
    where: { employeeId: emp.id },
    orderBy: { date: "desc" }
  });

  console.log("\n--- FINAL ATTENDANCE RECORD ---");
  console.log(attendance.map(a => ({
    date: a.date.toISOString().split("T")[0],
    checkIn: a.checkInTime ? a.checkInTime.toISOString().split("T")[1] : "Missing",
    checkOut: a.checkOutTime ? a.checkOutTime.toISOString().split("T")[1] : "Missing",
    status: a.status,
    totalHours: a.totalHours?.toString()
  })));

  process.exit(0);
}
run();
