import { prisma } from "../../lib/prisma";
import { processNormalizedChunk } from "../../lib/hr/biometric/sync-service";

async function main() {
  console.log("🌱 Seeding Biometric Attendance Logs for Device Pins: 100, 101, 200, 1002, 1003...");

  const pins = ["100", "101", "200", "1002", "1003"];
  const targetDate = "2026-07-09";

  try {
    // 1. Ensure a test biometric device exists in the database
    let device = await prisma.biometricDevice.findUnique({
      where: { serialNumber: "SEED-DEV-999" }
    });

    if (!device) {
      device = await prisma.biometricDevice.create({
        data: {
          name: "Local Seed Device Terminal",
          serialNumber: "SEED-DEV-999",
          vendor: "ZKTeco",
          createdBy: "seed-script",
          isActive: true,
        }
      });
      console.log(`✅ Created Seed Device: ID=${device.id}, SN=${device.serialNumber}`);
    } else {
      console.log(`ℹ️ Using Existing Seed Device: ID=${device.id}, SN=${device.serialNumber}`);
    }

    // 2. Ensure mock employees exist for all target pins
    const employeesMap = new Map<string, any>();

    for (const pin of pins) {
      let employee = await prisma.employee.findFirst({
        where: { biometricDeviceId: pin }
      });

      if (!employee) {
        employee = await prisma.employee.create({
          data: {
            name: `Employee Pin ${pin}`,
            biometricDeviceId: pin,
            status: "active",
          }
        });
        console.log(`✅ Created Mock Employee: ID=${employee.id}, Name=${employee.name}, PIN=${pin}`);
      } else {
        console.log(`ℹ️ Employee Exists: ID=${employee.id}, Name=${employee.name}, PIN=${pin}`);
      }
      employeesMap.set(pin, employee);
    }

    // 3. Build ZKTeco raw punch data (Check-in and Check-out for all 5 employees)
    console.log("\n3. Building punch logs...");
    const rawPunches: any[] = [];

    for (const pin of pins) {
      // Check-in punch (09:00:00)
      rawPunches.push({
        EnrollNumber: pin,
        Date: targetDate,
        Time: "09:00:00",
        DeviceID: "SEED-DEV-999"
      });

      // Check-out punch (17:30:00)
      rawPunches.push({
        EnrollNumber: pin,
        Date: targetDate,
        Time: "17:30:00",
        DeviceID: "SEED-DEV-999"
      });
    }

    // 4. Ingest punches via sync processor
    console.log("\n4. Ingesting punch logs into database...");
    const result = await processNormalizedChunk({
      vendor: "ZKTeco",
      rawData: rawPunches,
      deviceId: device.id
    });
    console.log("Sync Processor Result:", result);

    // 5. Verify created logs in database
    console.log("\n5. Verifying written AttendanceLogs...");
    for (const pin of pins) {
      const emp = employeesMap.get(pin);
      const logs = await prisma.attendanceLog.findMany({
        where: { employeeId: emp.id },
        orderBy: { timestamp: "asc" }
      });

      console.log(`Employee PIN ${pin}: Found ${logs.length} punch logs:`);
      for (const log of logs) {
        console.log(`  - Timestamp: ${log.timestamp.toISOString()} (Source: ${log.source})`);
      }
    }

  } catch (error) {
    console.error("❌ Seeding failed:", error);
  } finally {
    await prisma.$disconnect();
    console.log("\n🌱 Seeding Complete.");
  }
}

main();
