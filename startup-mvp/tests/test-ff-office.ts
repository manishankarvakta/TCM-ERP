import { prisma } from "../lib/prisma";
import { processNormalizedChunk } from "../lib/hr/biometric/sync-service";
import { processBiometricAttendance } from "../lib/hr/biometric/processor";

async function run() {
  console.log("1. Finding 'FF Office' device by IP 192.168.0.110...");
  let device = await prisma.biometricDevice.findFirst({
    where: { ipAddress: "192.168.0.110" }
  });

  if (!device) {
    console.log("Device not found! Creating mock FF Office device...");
    const user = await prisma.user.findFirst();
    device = await prisma.biometricDevice.create({
      data: {
        name: "FF Office",
        vendor: "ZKTeco",
        connectionType: "IP",
        ipAddress: "192.168.0.110",
        port: "4370",
        status: "active",
        createdBy: user ? user.id : "system",
      }
    });
  } else {
    console.log(`Found Device ID: ${device.id}`);
  }

  console.log("\n2. Setting up Employee with Biometric ID '102'...");
  let emp = await prisma.employee.findFirst({ where: { biometricDeviceId: "102" } });
  if (!emp) {
    emp = await prisma.employee.create({
      data: {
        name: "Employee 102 (FF Office)",
        biometricDeviceId: "102",
        status: "active",
      }
    });
    console.log("Created Employee 102.");
  } else {
    console.log(`Found existing Employee 102 (Database ID: ${emp.id})`);
  }

  console.log("\n3. Simulating punch from FF Office device for User 102...");
  const rawData = [
    { EnrollNumber: "102", Date: "2026-06-16", Time: "08:30:00", DeviceID: "FF Office" },
    { EnrollNumber: "102", Date: "2026-06-16", Time: "17:45:00", DeviceID: "FF Office" }
  ];

  const syncResult = await processNormalizedChunk({
    vendor: "ZKTeco",
    rawData,
    deviceId: device.id // Using the actual database ID for FF Office
  });
  console.log("Sync Result:", syncResult);

  console.log("\n4. Triggering auto-processing for the date range...");
  const start = new Date("2026-06-16T00:00:00.000Z");
  const end = new Date("2026-06-16T23:59:59.000Z");
  
  await processBiometricAttendance(start, end, emp.id);

  console.log("\n5. Verifying Database Records...");
  const logs = await prisma.attendanceLog.findMany({
    where: { employeeId: emp.id },
    orderBy: { timestamp: "asc" }
  });
  
  console.log("--- RAW PUNCH LOGS SAVED ---");
  console.log(logs.map(l => `${l.source} (Device ID: ${l.deviceId}) -> ${l.timestamp.toISOString()}`));

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
