import { prisma } from "../lib/prisma";

async function queryAttendance() {
  console.log("🔍 Fetching attendance records with break times...");
  try {
    const records = await prisma.attendance.findMany({
      where: {
        OR: [
          { breakCheckOut: { not: null } },
          { breakCheckIn: { not: null } }
        ]
      },
      include: {
        employee: {
          select: { name: true }
        },
        shift: true
      },
      orderBy: { date: "desc" },
      take: 5
    });

    console.log("Matching Attendance Records:");
    console.log(JSON.stringify(records.map(r => ({
      employeeName: r.employee.name,
      date: r.date.toISOString().split("T")[0],
      checkIn: r.checkIn,
      breakCheckOut: r.breakCheckOut,
      breakCheckIn: r.breakCheckIn,
      checkOut: r.checkOut,
      workHours: r.workHours,
      shift: r.shift ? {
        name: r.shift.name,
        startTime: r.shift.startTime,
        endTime: r.shift.endTime,
        breakStartTime: r.shift.breakStartTime,
        breakEndTime: r.shift.breakEndTime
      } : null
    })), null, 2));

    // Also let's query the raw logs for the first matched employee on that date
    if (records.length > 0) {
      const match = records[0];
      const startOfDay = new Date(match.date);
      startOfDay.setUTCHours(0, 0, 0, 0);
      const endOfDay = new Date(match.date);
      endOfDay.setUTCHours(23, 59, 59, 999);

      const logs = await prisma.attendanceLog.findMany({
        where: {
          employeeId: records[0].employeeId,
          timestamp: {
            gte: startOfDay,
            lte: endOfDay
          }
        },
        orderBy: { timestamp: "asc" }
      });
      console.log(`\nRaw Logs for ${match.employeeName} on ${match.date.toISOString().split("T")[0]}:`);
      console.log(JSON.stringify(logs.map(l => l.timestamp), null, 2));
    }
  } catch (error) {
    console.error("Error querying attendance:", error);
  }
}

queryAttendance();
