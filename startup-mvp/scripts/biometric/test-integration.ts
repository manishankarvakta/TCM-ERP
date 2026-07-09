import { prisma } from "../../lib/prisma";
import { processNormalizedChunk } from "../../lib/hr/biometric/sync-service";

async function main() {
  console.log("🧪 Starting Biometric Integration Test...");

  let testDevice: any = null;
  let testEmployee: any = null;

  try {
    // 1. Setup mock data
    console.log("\n1. Setting up test database records...");
    
    // Create a mock active device
    testDevice = await prisma.biometricDevice.create({
      data: {
        name: "Test Integration Terminal",
        serialNumber: "TEST-SN-999",
        vendor: "ZKTeco",
        createdBy: "system-test",
        isActive: true,
      }
    });
    console.log(`✅ Created Test Device: ID=${testDevice.id}, SN=${testDevice.serialNumber}`);

    // Create a mock active employee
    testEmployee = await prisma.employee.create({
      data: {
        name: "Integration Test User",
        biometricDeviceId: "9999", // Pin mapped on device
        status: "active",
      }
    });
    console.log(`✅ Created Test Employee: ID=${testEmployee.id}, PIN=${testEmployee.biometricDeviceId}`);

    // 2. Test Case A: ZKTeco format - Registered Employee Punch
    console.log("\n2. Running Test Case A (ZKTeco - Registered User Punch)...");
    const rawZKTecoPunch = [
      {
        EnrollNumber: "9999",
        Date: "2026-07-09",
        Time: "08:15:00",
        DeviceID: "TEST-SN-999"
      }
    ];

    const resultA = await processNormalizedChunk({
      vendor: "ZKTeco",
      rawData: rawZKTecoPunch,
      deviceId: testDevice.id
    });
    console.log("Result A:", resultA);

    // Verify database record
    const attendanceA = await prisma.attendanceLog.findFirst({
      where: { employeeId: testEmployee.id }
    });
    if (attendanceA) {
      console.log(`✅ Success: AttendanceLog created for employee ${attendanceA.employeeId} at ${attendanceA.timestamp.toISOString()}`);
    } else {
      console.error("❌ Failure: AttendanceLog was not created!");
    }

    // 3. Test Case B: ZKTeco format - Unmapped Employee Punch
    console.log("\n3. Running Test Case B (ZKTeco - Unregistered User Punch)...");
    const rawUnregisteredPunch = [
      {
        EnrollNumber: "8888", // Not in DB
        Date: "2026-07-09",
        Time: "09:30:00",
        DeviceID: "TEST-SN-999"
      }
    ];

    const resultB = await processNormalizedChunk({
      vendor: "ZKTeco",
      rawData: rawUnregisteredPunch,
      deviceId: testDevice.id
    });
    console.log("Result B:", resultB);

    // Verify unmapped database record
    const unmappedB = await prisma.unmappedBiometricLog.findFirst({
      where: { deviceUserId: "8888", deviceSerialNumber: "TEST-SN-999" }
    });
    if (unmappedB) {
      console.log(`✅ Success: UnmappedBiometricLog created for unregistered user 8888 (Reason: ${unmappedB.reason})`);
    } else {
      console.error("❌ Failure: UnmappedBiometricLog was not created!");
    }

    // 4. Test Case C: Hikvision format - Registered Employee Punch & Duplicate Check
    console.log("\n4. Running Test Case C (Hikvision - Registered Punch & Duplicate Prevention)...");
    const rawHikvisionPunches = [
      {
        employeeNoString: "9999",
        time: "2026-07-09T18:00:00.000Z", // Same employee punch out
        deviceId: "TEST-SN-999"
      },
      {
        employeeNoString: "9999",
        time: "2026-07-09T18:00:00.000Z", // DUPLICATE punch in same batch
        deviceId: "TEST-SN-999"
      }
    ];

    const resultC = await processNormalizedChunk({
      vendor: "Hikvision",
      rawData: rawHikvisionPunches,
      deviceId: testDevice.id
    });
    console.log("Result C:", resultC);

    // Check count of attendance logs
    const attendancesC = await prisma.attendanceLog.findMany({
      where: { 
        employeeId: testEmployee.id,
        timestamp: new Date("2026-07-09T18:00:00.000Z")
      }
    });
    console.log(`Count of matching logs: ${attendancesC.length}`);
    if (attendancesC.length === 1) {
      console.log("✅ Success: Duplicate punch prevented! Only 1 unique log written to database.");
    } else {
      console.error(`❌ Failure: Expected 1 log, found ${attendancesC.length}!`);
    }

  } catch (error) {
    console.error("❌ Test script crashed:", error);
  } finally {
    // 5. Cleanup database
    console.log("\n5. Cleaning up database test records...");
    
    if (testEmployee) {
      // Delete test attendance logs
      const delPunches = await prisma.attendanceLog.deleteMany({
        where: { employeeId: testEmployee.id }
      });
      console.log(`🧹 Deleted test AttendanceLog records: ${delPunches.count}`);

      // Delete test employee
      await prisma.employee.delete({
        where: { id: testEmployee.id }
      });
      console.log("🧹 Deleted test Employee record.");
    }

    if (testDevice) {
      // Delete test device
      await prisma.biometricDevice.delete({
        where: { id: testDevice.id }
      });
      console.log("🧹 Deleted test BiometricDevice record.");
    }

    // Delete test unmapped logs
    const delUnmapped = await prisma.unmappedBiometricLog.deleteMany({
      where: { deviceSerialNumber: "TEST-SN-999" }
    });
    console.log(`🧹 Deleted test UnmappedBiometricLog records: ${delUnmapped.count}`);

    console.log("\n🏁 Biometric Ingestion Test Completed Successfully.");
  }
}

main();
