import { prisma } from "../../lib/prisma";
import { processNormalizedChunk } from "../../lib/hr/biometric/sync-service";

async function main() {
  console.log("🚀 Starting Biometric 1-to-1 Mapping and Update Test...");

  let testDevice: any = null;
  const targetDate = "2026-07-09";

  try {
    // ==========================================
    // STEP 1: CLEAR MAPS AND ATTENDANCE LOGS
    // ==========================================
    console.log("\n==============================================");
    console.log("🧹 STEP 1: Clearing database map and logs...");
    await prisma.employeeDeviceMap.deleteMany({});
    await prisma.attendanceLog.deleteMany({});
    await prisma.unmappedBiometricLog.deleteMany({});
    console.log("✅ Cleared log and mapping tables.");

    // Ensure our test device exists
    testDevice = await prisma.biometricDevice.upsert({
      where: { serialNumber: "TEST-UPDATE-DEV" },
      update: { location: "test-gateway", isActive: true },
      create: {
        name: "Test Update Terminal",
        serialNumber: "TEST-UPDATE-DEV",
        vendor: "ZKTeco",
        location: "test-gateway",
        createdBy: "test-suite",
        isActive: true,
      }
    });

    // Ensure our employee "Manishankar Vakta" exists with initial pin 101
    let employee = await prisma.employee.findFirst({
      where: { name: "Manishankar Vakta" }
    });

    if (!employee) {
      employee = await prisma.employee.create({
        data: {
          name: "Manishankar Vakta",
          biometricDeviceId: "101",
          status: "active",
        }
      });
      console.log(`✅ Created Employee: ${employee.name}`);
    } else {
      // Reset pin to 101
      employee = await prisma.employee.update({
        where: { id: employee.id },
        data: { biometricDeviceId: "101" }
      });
      console.log(`ℹ️ Using Employee: ${employee.name}, reset biometricDeviceId to 101`);
    }

    // ==========================================
    // STEP 2: INGEST PUNCH FOR PIN 101 (AUTO-GENERATE)
    // ==========================================
    console.log("\n==============================================");
    console.log("⚙️ STEP 2: Ingesting first punch for PIN 101...");
    
    await processNormalizedChunk({
      vendor: "ZKTeco",
      rawData: [{ EnrollNumber: "101", Date: targetDate, Time: "09:00:00", DeviceID: "TEST-UPDATE-DEV" }],
      deviceId: testDevice.id
    });

    // Verify mapping was generated
    const mapAfter101 = await prisma.employeeDeviceMap.findMany({
      where: { employeeId: employee.id }
    });
    console.log(`🔍 Mapping records after PIN 101: Count = ${mapAfter101.length}`);
    if (mapAfter101.length === 1 && mapAfter101[0].deviceUserId === "101") {
      console.log(`   ✅ Success: EmployeeDeviceMap created for PIN 101.`);
    } else {
      console.error(`   ❌ Failure: Expected 1 mapping for PIN 101!`);
    }

    // ==========================================
    // STEP 3: UPDATE BIOMETRIC ID TO 102 & INGEST PUNCH
    // ==========================================
    console.log("\n==============================================");
    console.log("⚙️ STEP 3: Updating Employee Biometric ID to 102 and ingesting new punch...");
    
    // Simulate admin updating employee pin to 102 in ERP
    await prisma.employee.update({
      where: { id: employee.id },
      data: { biometricDeviceId: "102" }
    });
    console.log("ℹ️ Updated Manishankar Vakta biometricDeviceId in database to 102.");

    // Ingest punch for PIN 102
    await processNormalizedChunk({
      vendor: "ZKTeco",
      rawData: [{ EnrollNumber: "102", Date: targetDate, Time: "17:30:00", DeviceID: "TEST-UPDATE-DEV" }],
      deviceId: testDevice.id
    });

    // Verify mapping count remains 1 and is updated
    const mapAfter102 = await prisma.employeeDeviceMap.findMany({
      where: { employeeId: employee.id }
    });
    console.log(`🔍 Mapping records after PIN 102: Count = ${mapAfter102.length}`);
    if (mapAfter102.length === 1 && mapAfter102[0].deviceUserId === "102") {
      console.log(`   ✅ Success: Existing map entry was UPDATED to PIN 102! No duplicate mappings created.`);
    } else {
      console.error(`   ❌ Failure: Mapping was either not updated or duplicates were created!`, mapAfter102);
    }

    // Check attendance entries
    const attendanceLogs = await prisma.attendanceLog.findMany({
      where: { employeeId: employee.id }
    });
    console.log(`🔍 AttendanceLog entries: Count = ${attendanceLogs.length}`);
    if (attendanceLogs.length === 2) {
      console.log("   ✅ Success: Both check-in (101) and check-out (102) logged successfully.");
    } else {
      console.error("   ❌ Failure: Expected 2 attendance log entries!");
    }

  } catch (error) {
    console.error("❌ Test script crashed:", error);
  } finally {
    // ==========================================
    // STEP 4: CLEAR MAP AND ATTENDANCE DATA
    // ==========================================
    console.log("\n==============================================");
    console.log("🧹 STEP 4: Cleaning up maps and logs...");
    await prisma.employeeDeviceMap.deleteMany({});
    await prisma.attendanceLog.deleteMany({});
    await prisma.unmappedBiometricLog.deleteMany({});
    console.log("✅ Database mapping and logs cleaned successfully.");

    await prisma.$disconnect();
    console.log("\n🏁 Test Complete.");
  }
}

main();
