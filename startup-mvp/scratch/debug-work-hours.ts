import { prisma } from "../lib/prisma";
import { getShiftWindow, calculateWorkHoursWithBreak, calculateOTHours } from "../lib/hr/shift-utils";
import { differenceInMinutes } from "date-fns";

async function debugWorkHours() {
  const dateStr = "2026-07-28";
  const start = new Date(`${dateStr}T00:00:00.000Z`);
  const end = new Date(`${dateStr}T23:59:59.999Z`);

  const records = await prisma.attendance.findMany({
    where: { date: { gte: start, lte: end } },
    include: {
      employee: { select: { name: true, salary: true } },
      shift: true
    }
  });

  for (const r of records) {
    console.log(`\n👤 Employee: ${r.employee.name}`);
    console.log(`- Base Salary (Gross):`, r.employee.salary?.toString());
    console.log(`- CheckIn (local):`, r.checkIn ? new Date(r.checkIn.getTime() + 6 * 60 * 60 * 1000).toISOString().replace("T", " ").replace("Z", "") : null);
    console.log(`- CheckOut (local):`, r.checkOut ? new Date(r.checkOut.getTime() + 6 * 60 * 60 * 1000).toISOString().replace("T", " ").replace("Z", "") : null);
    
    if (r.shift) {
      const win = getShiftWindow(r.date, {
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
      });

      console.log(`- Shift start time:`, win.shiftStartDateTime.toISOString());
      console.log(`- Shift end time:`, win.shiftEndDateTime.toISOString());
      console.log(`- Shift breakType:`, r.shift.breakType);
      console.log(`- Shift breakDuration:`, r.shift.breakDuration);

      if (r.checkIn && r.checkOut) {
        const totalElapsed = differenceInMinutes(r.checkOut, r.checkIn);
        console.log(`- Total elapsed minutes:`, totalElapsed, `(${totalElapsed / 60} hours)`);

        const workHours = calculateWorkHoursWithBreak(
          r.checkIn,
          r.checkOut,
          r.breakCheckOut,
          r.breakCheckIn,
          r.shift.breakDuration,
          r.shift.breakType
        );
        console.log(`- Calculated workHours:`, workHours);

        const otHours = calculateOTHours(r.checkOut, r.date, {
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
        });
        console.log(`- Calculated otHours:`, otHours);
        console.log(`- Database workHours field:`, r.workHours?.toString());
        console.log(`- Database otHours field:`, r.otHours?.toString());
        console.log(`- Database calculatedOvertimeAmount field:`, r.calculatedOvertimeAmount?.toString());
      }
    }
  }
}

debugWorkHours();
