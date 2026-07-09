import { prisma } from "../../lib/prisma";
import { processNormalizedChunk } from "../../lib/hr/biometric/sync-service";
import { getEmployeeDutyStatus } from "../../app/(dashboard)/dashboard/employees/_components/employees";

async function main() {
  console.log("🚀 Seeding Live Status Test Data...");

  try {
    // 1. Clear database logs
    console.log("🧹 Clearing existing biometric logs...");
    await prisma.attendanceLog.deleteMany({});
    await prisma.unmappedBiometricLog.deleteMany({});
    console.log("✅ Cleared log tables.");

    // 2. Fetch the real device
    const device = await prisma.biometricDevice.findUnique({
      where: { serialNumber: "UEED252100146" }
    });

    if (!device) {
      console.error("❌ Device 'FF Office' (SN: UEED252100146) not found!");
      return;
    }

    // Get current time details
    const now = new Date();
    console.log(`ℹ️ Current Server Time (UTC): ${now.toISOString()}`);

    // Build timestamps relative to now to ensure they fall within the 14-hour window
    const oneHourAgo = new Date(now.getTime() - 1 * 60 * 60 * 1000);
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
    const threeHoursAgo = new Date(now.getTime() - 3 * 60 * 60 * 1000);

    const rawPunches: any[] = [
      // ON DUTY: PIN 101, 103, 106 (Checked in 1 hour ago, no check-out)
      {
        EnrollNumber: "101",
        Date: oneHourAgo.toISOString().split("T")[0],
        Time: oneHourAgo.toISOString().split("T")[1].substring(0, 8),
        DeviceID: device.serialNumber
      },
      {
        EnrollNumber: "103",
        Date: oneHourAgo.toISOString().split("T")[0],
        Time: oneHourAgo.toISOString().split("T")[1].substring(0, 8),
        DeviceID: device.serialNumber
      },
      {
        EnrollNumber: "106",
        Date: oneHourAgo.toISOString().split("T")[0],
        Time: oneHourAgo.toISOString().split("T")[1].substring(0, 8),
        DeviceID: device.serialNumber
      },

      // OFF DUTY: PIN 102, 105 (Checked in 3 hours ago, checked out 1 hour ago)
      {
        EnrollNumber: "102",
        Date: threeHoursAgo.toISOString().split("T")[0],
        Time: threeHoursAgo.toISOString().split("T")[1].substring(0, 8),
        DeviceID: device.serialNumber
      },
      {
        EnrollNumber: "102",
        Date: oneHourAgo.toISOString().split("T")[0],
        Time: oneHourAgo.toISOString().split("T")[1].substring(0, 8),
        DeviceID: device.serialNumber
      },
      {
        EnrollNumber: "105",
        Date: threeHoursAgo.toISOString().split("T")[0],
        Time: threeHoursAgo.toISOString().split("T")[1].substring(0, 8),
        DeviceID: device.serialNumber
      },
      {
        EnrollNumber: "105",
        Date: oneHourAgo.toISOString().split("T")[0],
        Time: oneHourAgo.toISOString().split("T")[1].substring(0, 8),
        DeviceID: device.serialNumber
      }
    ];

    // 3. Process logs
    console.log("\n⚙️ Processing punch batch...");
    const result = await processNormalizedChunk({
      vendor: "ZKTeco",
      rawData: rawPunches,
      deviceId: device.id
    });
    console.log("   Processor result:", result);

    // 4. Verify outcomes
    console.log("\n🔍 Verifying computed employee statuses:");
    const mappings = await prisma.employeeDeviceMap.findMany({
      where: { deviceId: device.id },
      include: { employee: true }
    });

    for (const map of mappings) {
      // Query the logs exactly as the server action does (last 2 logs desc)
      const logs = await prisma.attendanceLog.findMany({
        where: { employeeId: map.employeeId },
        orderBy: { timestamp: "desc" },
        take: 2,
        select: { timestamp: true }
      });

      const isOnDuty = getEmployeeDutyStatus(logs);
      console.log(`   - Employee: '${map.employee?.name}' (PIN ${map.deviceUserId})`);
      console.log(`     Punches count (last 2): ${logs.length}`);
      if (logs.length > 0) {
        console.log(`     Latest punch timestamp: ${logs[0].timestamp.toISOString()}`);
      }
      console.log(`     Computed Status: ${isOnDuty ? "🟢 ON DUTY" : "⚪ OFF DUTY"}`);
    }

  } catch (error) {
    console.error("❌ Seeding crashed:", error);
  } finally {
    await prisma.$disconnect();
    console.log("\n🏁 Seeding Complete.");
  }
}

main();
