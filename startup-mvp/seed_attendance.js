const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("Seeding mock attendance data for Aug 20, 21, and 22, 2026...");

  const employees = [
    { id: 'cms1j5hl40006w4zs4ptvrsmu', name: 'John Doe', deviceUserId: '1', shiftId: 'cms1j5hko0004w4zs61blevqw' },
    { id: 'cms1j5hmd0008w4zsv4hwozpg', name: 'Ratul', deviceUserId: '1379', shiftId: 'cms1j5hko0004w4zs61blevqw' },
    { id: 'cms1j5hmv000cw4zsfs2rwmuc', name: 'Hasib Shah', deviceUserId: '1370', shiftId: 'cms1j5hko0004w4zs61blevqw' },
    { id: 'cms1j5hml000aw4zs590zrkx2', name: 'Rakib', deviceUserId: '1377', shiftId: 'cms1j5hko0004w4zs61blevqw' }
  ];

  const dates = [
    new Date("2026-08-20T00:00:00.000Z"),
    new Date("2026-08-21T00:00:00.000Z"),
    new Date("2026-08-22T00:00:00.000Z")
  ];

  // 1. Clean existing records for these dates
  console.log("Cleaning old records...");
  await prisma.attendance.deleteMany({
    where: {
      date: {
        in: dates
      }
    }
  });

  await prisma.attendanceLog.deleteMany({
    where: {
      timestamp: {
        gte: new Date("2026-08-20T00:00:00.000Z"),
        lte: new Date("2026-08-22T23:59:59.000Z")
      }
    }
  });

  // 2. Define punches for each day
  const data = [
    // --- Aug 20, 2026 ---
    {
      date: dates[0],
      punches: [
        { empIndex: 0, checkIn: "2026-08-20T09:55:00+06:00", checkOut: "2026-08-20T18:05:00+06:00", status: "PRESENT", wh: 8.17, ot: 0 },
        { empIndex: 1, checkIn: "2026-08-20T09:48:00+06:00", checkOut: "2026-08-20T19:15:00+06:00", status: "PRESENT", wh: 9.45, ot: 1.25 },
        { empIndex: 2, checkIn: "2026-08-20T10:25:00+06:00", checkOut: "2026-08-20T18:00:00+06:00", status: "LATE", wh: 7.58, ot: 0 },
        { empIndex: 3, checkIn: "2026-08-20T09:52:00+06:00", checkOut: "2026-08-20T18:10:00+06:00", status: "PRESENT", wh: 8.30, ot: 0 }
      ]
    },
    // --- Aug 21, 2026 ---
    {
      date: dates[1],
      punches: [
        { empIndex: 0, checkIn: "2026-08-21T10:10:00+06:00", checkOut: "2026-08-21T18:00:00+06:00", status: "PRESENT", wh: 7.83, ot: 0 },
        { empIndex: 1, checkIn: "2026-08-21T09:50:00+06:00", checkOut: "2026-08-21T18:05:00+06:00", status: "PRESENT", wh: 8.25, ot: 0 },
        { empIndex: 2, checkIn: "2026-08-21T12:15:00+06:00", checkOut: "2026-08-21T18:00:00+06:00", status: "HALF_DAY", wh: 5.75, ot: 0 },
        { empIndex: 3, checkIn: null, checkOut: null, status: "ABSENT", wh: 0, ot: 0 }
      ]
    },
    // --- Aug 22, 2026 ---
    {
      date: dates[2],
      punches: [
        { empIndex: 0, checkIn: "2026-08-22T09:52:00+06:00", checkOut: "2026-08-22T18:15:00+06:00", status: "PRESENT", wh: 8.38, ot: 0 },
        { empIndex: 1, checkIn: "2026-08-22T09:58:00+06:00", checkOut: "2026-08-22T19:05:00+06:00", status: "PRESENT", wh: 9.12, ot: 1.08 },
        { empIndex: 2, checkIn: "2026-08-22T10:35:00+06:00", checkOut: "2026-08-22T18:10:00+06:00", status: "LATE", wh: 7.58, ot: 0 },
        { empIndex: 3, checkIn: "2026-08-22T09:50:00+06:00", checkOut: "2026-08-22T18:45:00+06:00", status: "PRESENT", wh: 8.92, ot: 0.75 }
      ]
    }
  ];

  for (const day of data) {
    console.log(`Seeding for ${day.date.toISOString().split("T")[0]}...`);
    for (const punch of day.punches) {
      const emp = employees[punch.empIndex];
      const checkInDate = punch.checkIn ? new Date(punch.checkIn) : null;
      const checkOutDate = punch.checkOut ? new Date(punch.checkOut) : null;

      // 1. Create AttendanceLogs
      if (checkInDate) {
        await prisma.attendanceLog.create({
          data: {
            employeeId: emp.id,
            timestamp: checkInDate,
            source: "BIOMETRIC"
          }
        });
      }

      if (checkOutDate) {
        await prisma.attendanceLog.create({
          data: {
            employeeId: emp.id,
            timestamp: checkOutDate,
            source: "BIOMETRIC"
          }
        });
      }

      // 2. Create processed Attendance record
      await prisma.attendance.create({
        data: {
          employeeId: emp.id,
          date: day.date,
          shiftId: emp.shiftId,
          checkIn: checkInDate,
          checkOut: checkOutDate,
          workHours: punch.wh,
          otHours: punch.ot,
          status: punch.status,
          isManual: false
        }
      });
    }
  }

  console.log("Seeding complete! Check details:");
  const logsCount = await prisma.attendanceLog.count();
  const attCount = await prisma.attendance.count();
  console.log("Total AttendanceLogs in DB now:", logsCount);
  console.log("Total Attendance records in DB now:", attCount);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
