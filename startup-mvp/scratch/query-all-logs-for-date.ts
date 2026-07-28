import { prisma } from "../lib/prisma";

async function queryAllLogs() {
  const targetDateStr = "2026-07-28";
  const start = new Date(`${targetDateStr}T00:00:00.000Z`);
  const end = new Date(`${targetDateStr}T23:59:59.999Z`);
  
  console.log(`🔍 Querying all logs (mapped and unmapped) for ${targetDateStr}...`);
  try {
    const mapped = await prisma.attendanceLog.findMany({
      where: { timestamp: { gte: start, lte: end } },
      include: {
        employee: { select: { name: true, employeeCode: true, biometricDeviceId: true } }
      },
      orderBy: { timestamp: "asc" }
    });

    const unmapped = await prisma.unmappedBiometricLog.findMany({
      where: { punchTime: { gte: start, lte: end } },
      orderBy: { punchTime: "asc" }
    });

    console.log(`\nMapped AttendanceLogs found (${mapped.length}):`);
    console.log(JSON.stringify(mapped.map(m => ({
      employeeName: m.employee.name,
      employeeCode: m.employee.employeeCode,
      biometricDeviceId: m.employee.biometricDeviceId,
      timestampUtc: m.timestamp.toISOString(),
      localTimeDhaka: new Date(m.timestamp.getTime() + 6 * 60 * 60 * 1000).toISOString().replace("T", " ").replace("Z", ""),
    })), null, 2));

    console.log(`\nUnmappedBiometricLogs found (${unmapped.length}):`);
    console.log(JSON.stringify(unmapped.map(u => ({
      deviceUserId: u.deviceUserId,
      punchTimeUtc: u.punchTime.toISOString(),
      localTimeDhaka: new Date(u.punchTime.getTime() + 6 * 60 * 60 * 1000).toISOString().replace("T", " ").replace("Z", ""),
      reason: u.reason,
      status: u.status
    })), null, 2));

  } catch (error) {
    console.error("Error querying logs:", error);
  }
}

queryAllLogs();
