import { prisma } from "../../lib/prisma";

async function main() {
  console.log("🧹 Cleaning up biometric test records and employees...");

  try {
    // 1. Delete all device mapping entries
    const delMaps = await prisma.employeeDeviceMap.deleteMany({});
    console.log(`✅ Deleted EmployeeDeviceMap: ${delMaps.count} records removed.`);

    // 2. Delete all attendance log entries
    const delLogs = await prisma.attendanceLog.deleteMany({});
    console.log(`✅ Deleted AttendanceLog: ${delLogs.count} records removed.`);

    // 3. Delete all unmapped biometric logs
    const delUnmapped = await prisma.unmappedBiometricLog.deleteMany({});
    console.log(`✅ Deleted UnmappedBiometricLog: ${delUnmapped.count} records removed.`);

    // 4. Delete the "Test Suite Employee" accounts we created
    const delEmployees = await prisma.employee.deleteMany({
      where: {
        name: {
          startsWith: "Test Suite Employee"
        }
      }
    });
    console.log(`✅ Deleted Test Employees: ${delEmployees.count} records removed.`);

  } catch (error) {
    console.error("❌ Cleanup failed:", error);
  } finally {
    await prisma.$disconnect();
    console.log("🧹 Cleanup Complete.");
  }
}

main();
