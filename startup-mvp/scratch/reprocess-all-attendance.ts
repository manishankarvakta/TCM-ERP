import { prisma } from "../lib/prisma";
import { reprocessRawLogsByDeviceAndDate } from "../lib/hr/biometric/reprocess-service";

async function reprocessAll() {
  const deviceId = "cmrfy49dx005fpf0194sp8p3d";
  const dateStr = "2026-07-28";
  const start = new Date(`${dateStr}T00:00:00.000Z`);
  const end = new Date(`${dateStr}T23:59:59.999Z`);

  console.log(`🚀 Reprocessing all attendance logs for device ${deviceId} on date ${dateStr}...`);
  try {
    const result = await reprocessRawLogsByDeviceAndDate(deviceId, start, end);
    console.log("Reprocess trigger result:", JSON.stringify(result, null, 2));

    console.log("⏱️ Waiting 4 seconds for background BullMQ worker to finish recalculation...");
    await new Promise(resolve => setTimeout(resolve, 4000));

    // Retrieve and show all updated records for 2026-07-28
    const records = await prisma.attendance.findMany({
      where: { date: { gte: start, lte: end } },
      include: {
        employee: { select: { name: true } },
        shift: { select: { name: true, startTime: true, endTime: true, graceMinutes: true, lateAfter: true, halfDayAfter: true } }
      },
      orderBy: { employee: { name: "asc" } }
    });

    console.log("\nUpdated Attendance Records in Database:");
    console.log(JSON.stringify(records.map(r => ({
      employeeName: r.employee.name,
      shiftName: r.shift?.name,
      shiftTime: r.shift ? `${r.shift.startTime} - ${r.shift.endTime}` : null,
      checkIn: r.checkIn ? new Date(r.checkIn.getTime() + 6 * 60 * 60 * 1000).toISOString() : null,
      checkOut: r.checkOut ? new Date(r.checkOut.getTime() + 6 * 60 * 60 * 1000).toISOString() : null,
      lateMinutes: r.lateMinutes,
      status: r.status,
      workHours: r.workHours
    })), null, 2));

  } catch (error) {
    console.error("Failed to reprocess:", error);
  }
}

reprocessAll();
