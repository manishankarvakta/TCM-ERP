import { prisma } from "../lib/prisma";
import { determineAttendanceStatus, calculateLateMinutes, getShiftWindow } from "../lib/hr/shift-utils";

async function debugStatus() {
  const dateStr = "2026-07-28";
  const start = new Date(`${dateStr}T00:00:00.000Z`);
  const end = new Date(`${dateStr}T23:59:59.999Z`);

  const records = await prisma.attendance.findMany({
    where: { date: { gte: start, lte: end } },
    include: {
      employee: { select: { name: true } },
      shift: true
    }
  });

  for (const r of records) {
    console.log(`\n👤 Employee: ${r.employee.name}`);
    console.log(`- CheckIn (UTC):`, r.checkIn?.toISOString());
    console.log(`- Date (UTC):`, r.date.toISOString());
    
    if (r.shift) {
      const shiftPolicy = {
        startTime: r.shift.startTime,
        endTime: r.shift.endTime,
        graceMinutes: r.shift.graceMinutes,
        lateAfter: r.shift.lateAfter,
        halfDayAfter: r.shift.halfDayAfter,
        otStartAfter: r.shift.otStartAfter,
        breakStartTime: r.shift.breakStartTime,
        breakEndTime: r.shift.breakEndTime,
        breakGraceMinutes: r.shift.breakGraceMinutes,
        breakLateAfter: r.shift.breakLateAfter,
        breakType: r.shift.breakType,
        breakDuration: r.shift.breakDuration
      };

      const win = getShiftWindow(r.date, shiftPolicy);
      console.log(`- Shift times: ${shiftPolicy.startTime} - ${shiftPolicy.endTime}`);
      console.log(`- Shift start DateTime (UTC):`, win.shiftStartDateTime.toISOString());
      console.log(`- Shift graceMinutes:`, shiftPolicy.graceMinutes);
      console.log(`- Shift lateAfter:`, shiftPolicy.lateAfter);
      console.log(`- Shift halfDayAfter:`, shiftPolicy.halfDayAfter);

      if (r.checkIn) {
        const lateMins = calculateLateMinutes(r.checkIn, r.date, shiftPolicy);
        console.log(`- Calculated late minutes:`, lateMins);

        const status = determineAttendanceStatus(r.checkIn, r.date, shiftPolicy, r.breakCheckIn);
        console.log(`- determineAttendanceStatus returns:`, status);
        console.log(`- Current database status:`, r.status);
      }
    }
  }
}

debugStatus();
