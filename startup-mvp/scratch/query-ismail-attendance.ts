import { prisma } from "../lib/prisma";

async function queryIsmail() {
  const pin = "1382";
  console.log(`🔍 Searching for employee with Biometric ID / PIN: ${pin}...`);
  try {
    const employee = await prisma.employee.findFirst({
      where: {
        OR: [
          { biometricDeviceId: pin },
          { employeeCode: { contains: pin } }
        ]
      },
      include: {
        shift: true,
        deviceMappings: true
      }
    });

    if (!employee) {
      console.log(`❌ No employee found with PIN/Code: ${pin}`);
      return;
    }

    console.log("Employee Profile:");
    console.log(JSON.stringify({
      id: employee.id,
      name: employee.name,
      code: employee.employeeCode,
      biometricDeviceId: employee.biometricDeviceId,
      shift: employee.shift ? {
        name: employee.shift.name,
        startTime: employee.shift.startTime,
        endTime: employee.shift.endTime
      } : null,
      deviceMaps: employee.deviceMappings
    }, null, 2));

    // Fetch raw attendance logs for Jul 27 and Jul 28
    const start = new Date("2026-07-27T00:00:00.000Z");
    const end = new Date("2026-07-28T23:59:59.999Z");

    const logs = await prisma.attendanceLog.findMany({
      where: {
        employeeId: employee.id,
        timestamp: { gte: start, lte: end }
      },
      orderBy: { timestamp: "asc" }
    });

    console.log("\nRaw AttendanceLogs in Database (UTC):");
    console.log(JSON.stringify(logs.map(l => ({
      id: l.id,
      timestamp: l.timestamp.toISOString(),
      localTimeDhaka: new Date(l.timestamp.getTime() + 6 * 60 * 60 * 1000).toISOString().replace("T", " ").replace("Z", ""),
      source: l.source
    })), null, 2));

    // Fetch attendance records in database
    const attendances = await prisma.attendance.findMany({
      where: {
        employeeId: employee.id,
        date: { gte: start, lte: end }
      },
      orderBy: { date: "asc" }
    });

    console.log("\nAttendance Records in Database:");
    console.log(JSON.stringify(attendances.map(a => ({
      id: a.id,
      date: a.date.toISOString().split("T")[0],
      checkIn: a.checkIn ? a.checkIn.toISOString() : null,
      checkInLocal: a.checkIn ? new Date(a.checkIn.getTime() + 6 * 60 * 60 * 1000).toISOString() : null,
      checkOut: a.checkOut ? a.checkOut.toISOString() : null,
      checkOutLocal: a.checkOut ? new Date(a.checkOut.getTime() + 6 * 60 * 60 * 1000).toISOString() : null,
      workHours: a.workHours,
      otHours: a.otHours,
      status: a.status,
      lateMinutes: a.lateMinutes
    })), null, 2));

  } catch (error) {
    console.error("Error querying database:", error);
  }
}

queryIsmail();
