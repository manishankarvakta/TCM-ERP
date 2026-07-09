import { prisma } from "../../lib/prisma";
import { POST as syncLogs } from "../../app/api/biometric/sync/route";
import { processNormalizedChunk } from "../../lib/hr/biometric/sync-service";

async function main() {
  console.log("🚀 Simulating local agent uploading punch logs for active employees...");

  const apiToken = process.env.BIOMETRIC_API_KEY || "default-secret-key";
  const targetDate = "2026-07-09";

  try {
    // 1. Find the real device
    const device = await prisma.biometricDevice.findUnique({
      where: { serialNumber: "UEED252100146" }
    });

    if (!device) {
      console.error("❌ Real device 'FF Office' (SN: UEED252100146) was not found in the database!");
      return;
    }
    console.log(`ℹ️ Found Real Device: '${device.name}' (ID: ${device.id})`);

    // 2. Fetch all mappings for this device
    const mappings = await prisma.employeeDeviceMap.findMany({
      where: { deviceId: device.id },
      include: { employee: { select: { name: true } } }
    });

    if (mappings.length === 0) {
      console.error("❌ No employee mappings found for this device!");
      return;
    }
    console.log(`ℹ️ Mapped Employees Found: ${mappings.length}`);

    // 3. Build Check-in (09:00:00) and Check-out (17:30:00) punches
    const rawData: any[] = [];
    for (const map of mappings) {
      console.log(`   - Employee: ${map.employee?.name} (PIN: ${map.deviceUserId})`);
      
      // Check-in (09:00:00)
      rawData.push({
        EnrollNumber: map.deviceUserId,
        Date: targetDate,
        Time: "09:00:00",
        DeviceID: device.serialNumber
      });

      // Check-out (17:30:00)
      rawData.push({
        EnrollNumber: map.deviceUserId,
        Date: targetDate,
        Time: "17:30:00",
        DeviceID: device.serialNumber
      });
    }

    // 4. Simulate API request to POST /api/biometric/sync
    console.log("\n📡 Sending POST request to /api/biometric/sync endpoint...");
    const syncReq = new Request("http://localhost/api/biometric/sync", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        vendor: "ZKTeco",
        deviceId: device.id,
        rawData: rawData
      })
    });
    
    const response = await syncLogs(syncReq);
    const resultJson = await response.json();
    console.log(`   Response Status: ${response.status}`);
    console.log(`   Response Payload:`, resultJson);

    if (response.status !== 200 || !resultJson.success) {
      console.error("❌ API Sync failed!");
      return;
    }

    // 5. Run the Ingestion Engine to write punches directly to AttendanceLog
    console.log("\n⚙️ Processing punches inside database...");
    const ingestResult = await processNormalizedChunk({
      vendor: "ZKTeco",
      rawData: rawData,
      deviceId: device.id
    });
    console.log("   Ingestion counts:", ingestResult);

    // 6. Verify AttendanceLog writes
    console.log("\n🔍 Verifying saved AttendanceLogs in database:");
    for (const map of mappings) {
      const logs = await prisma.attendanceLog.findMany({
        where: { employeeId: map.employeeId, timestamp: { gte: new Date(`${targetDate}T00:00:00.000Z`) } },
        orderBy: { timestamp: "asc" }
      });
      console.log(`   Employee '${map.employee?.name}' (PIN ${map.deviceUserId}): Found ${logs.length} punch records in database:`);
      for (const log of logs) {
        console.log(`     - Punch Time: ${log.timestamp.toISOString()} (Source: ${log.source})`);
      }
    }

  } catch (error) {
    console.error("❌ Script crashed:", error);
  } finally {
    await prisma.$disconnect();
    console.log("\n🏁 Simulation Complete.");
  }
}

main();
