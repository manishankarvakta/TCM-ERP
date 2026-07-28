import { prisma } from "../lib/prisma";
import { reprocessAttendancePoliciesForDateRange } from "../lib/hr-payroll/attendance-policy-service";

async function reprocessPolicyOnly() {
  const dateStr = "2026-07-28";
  console.log(`🚀 Reprocessing attendance policies for date ${dateStr}...`);
  try {
    const result = await reprocessAttendancePoliciesForDateRange({
      fromDate: dateStr,
      toDate: dateStr,
      force: true
    });
    console.log("Reprocess policy result:", JSON.stringify(result, null, 2));

    // Retrieve and show all updated records for 2026-07-28
    const start = new Date(`${dateStr}T00:00:00.000Z`);
    const end = new Date(`${dateStr}T23:59:59.999Z`);
    const records = await prisma.attendance.findMany({
      where: { date: { gte: start, lte: end } },
      include: {
        employee: { select: { name: true } },
        shift: { select: { name: true, startTime: true, endTime: true } }
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
    console.error("Failed to reprocess policy:", error);
  }
}

reprocessPolicyOnly();
