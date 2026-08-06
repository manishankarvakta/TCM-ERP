import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { getPayrollSettings, isConfiguredWeekend } from "@/lib/payroll-settings";
import {
  calculateLateMinutes,
  formatBusinessDateKey,
  ShiftPolicy,
  HR_BUSINESS_TIMEZONE,
  syncTimezoneFromDb,
  calculateBreakLateMinutes,
  determineAttendanceStatus,
  calculateWorkHoursWithBreak,
  calculateOTHours,
  getShiftWindow
} from "@/lib/hr/shift-utils";
import {
  calculateOvertimePreview,
  calculateTiffinPreview,
  calculateNightBillPreview,
  calculateHolidayBillPreview,
} from "@/lib/hr-payroll/policy-calculation";

// Helper to convert any input safely to a JS number
function toNumber(val: any, fallback = 0): number {
  if (val === null || val === undefined) return fallback;
  const num = Number(val);
  return isNaN(num) ? fallback : num;
}

/**
 * 1. calculateDailyAttendancePolicyValues
 * Pure calculation logic mapping attendance data and policies to daily payouts.
 */
export interface DailyAttendancePolicyInput {
  attendance: {
    checkIn: Date | string | null;
    checkOut: Date | string | null;
    breakCheckIn?: Date | string | null;
    breakCheckOut?: Date | string | null;
    workHours?: any;
    otHours: any;
    status: string;
    date: Date;
  };
  employee: {
    id: string;
    name: string;
    salary: any;
  };
  employeeTypePolicies: {
    name: string;
    salaryStructurePolicy?: any;
    attendancePolicy?: any;
    latePolicy?: any;
    overtimePolicy?: any;
    tiffinBillPolicy?: any;
    nightBillPolicy?: any;
    holidayBillPolicy?: any;
  };
  shift: {
    startTime: string;
    endTime: string;
    graceMinutes: number;
    lateAfter: number;
    halfDayAfter: number;
    otStartAfter: number;
    breakStartTime?: string | null;
    breakEndTime?: string | null;
    breakGraceMinutes?: number;
    breakLateAfter?: number;
    breakType?: string | null;
    breakDuration?: number;
  } | null;
  isWeekend: boolean;
  isPublicHoliday: boolean;
  workedOnHoliday: boolean;
  grossSalary: number;
}

export interface DailyAttendancePolicyOutput {
  status: string;
  workHours: number;
  otHours: number;
  lateMinutes: number;
  lateCountValue: number;
  breakLateMinutes: number;
  breakLateCountValue: number;
  tiffinBillAmount: number;
  nightBillAmount: number;
  holidayBillAmount: number;
  calculatedOvertimeAmount: number;
  policyCalculationNote: string;
}

export function calculateDailyAttendancePolicyValues(input: DailyAttendancePolicyInput): DailyAttendancePolicyOutput {
  const { attendance, employeeTypePolicies, shift, isWeekend, isPublicHoliday, workedOnHoliday, grossSalary } = input;
  
  let resolvedStatus = attendance.status;
  let workHours = (attendance as any).workHours ? Number((attendance as any).workHours) : 0;
  let otHours = attendance.otHours ? Number(attendance.otHours) : 0;
  let lateMinutes = 0;
  let lateCountValue = 0;
  let breakLateMinutes = 0;
  let breakLateCountValue = 0;
  let tiffinBillAmount = 0;
  let nightBillAmount = 0;
  let holidayBillAmount = 0;
  let calculatedOvertimeAmount = 0;
  const notes: string[] = [];

  // A. Late minutes and late count
  if (attendance.checkIn && shift) {
    const shiftPolicy: ShiftPolicy = {
      startTime: shift.startTime,
      endTime: shift.endTime,
      graceMinutes: shift.graceMinutes,
      lateAfter: shift.lateAfter,
      halfDayAfter: shift.halfDayAfter,
      otStartAfter: shift.otStartAfter,
      breakStartTime: shift.breakStartTime,
      breakEndTime: shift.breakEndTime,
      breakGraceMinutes: shift.breakGraceMinutes,
      breakLateAfter: shift.breakLateAfter,
      breakType: shift.breakType,
      breakDuration: shift.breakDuration
    };

    resolvedStatus = determineAttendanceStatus(
      new Date(attendance.checkIn),
      new Date(attendance.date),
      shiftPolicy,
      attendance.breakCheckIn ? new Date(attendance.breakCheckIn) : null
    );

    // Calculate work hours and OT hours dynamically based on new shift definitions
    if (attendance.checkOut) {
      let breakDurationMins = 0;
      if (shiftPolicy.breakType === "FIXED") {
        breakDurationMins = shiftPolicy.breakDuration ?? 0;
      } else if (shiftPolicy.breakType === "TRACKED" || !shiftPolicy.breakType) {
        if (shiftPolicy.breakStartTime && shiftPolicy.breakEndTime) {
          const { breakStartDateTime, breakEndDateTime } = getShiftWindow(new Date(attendance.date), shiftPolicy);
          if (breakStartDateTime && breakEndDateTime) {
            breakDurationMins = Math.max(0, Math.round((new Date(breakEndDateTime).getTime() - new Date(breakStartDateTime).getTime()) / 60000));
          } else {
            breakDurationMins = shiftPolicy.breakDuration ?? 60;
          }
        } else {
          breakDurationMins = shiftPolicy.breakDuration ?? 0;
        }
      }

      workHours = calculateWorkHoursWithBreak(
        new Date(attendance.checkIn),
        new Date(attendance.checkOut),
        (attendance as any).breakCheckOut ? new Date((attendance as any).breakCheckOut) : null,
        attendance.breakCheckIn ? new Date(attendance.breakCheckIn) : null,
        breakDurationMins,
        shiftPolicy.breakType || "NONE"
      );

      otHours = calculateOTHours(
        new Date(attendance.checkOut),
        new Date(attendance.date),
        shiftPolicy,
        workHours
      );
    }

    const isWorkedDay = 
      resolvedStatus === "PRESENT" || 
      resolvedStatus === "LATE" || 
      resolvedStatus === "HALF_DAY" || 
      (!!attendance.checkIn && !!attendance.checkOut);

    if (isWorkedDay) {
      lateMinutes = calculateLateMinutes(new Date(attendance.checkIn), new Date(attendance.date), shiftPolicy);
      
      if (resolvedStatus === "LATE") {
        if (lateMinutes > 0) {
          lateCountValue = 1;
        }
      } else if (resolvedStatus === "HALF_DAY") {
        if (lateMinutes > 0) {
          lateCountValue = 1;
        }
      }

      if (attendance.breakCheckIn && shiftPolicy.breakEndTime) {
        const breakLateRes = calculateBreakLateMinutes(
          new Date(attendance.breakCheckIn),
          new Date(attendance.date),
          shiftPolicy
        );
        breakLateMinutes = breakLateRes.lateMinutes;
        breakLateCountValue = breakLateRes.lateCountValue;

        if (breakLateMinutes > 0) {
          notes.push(`Late after break: ${breakLateMinutes} mins`);
        }
      }
    }
  }

  // B. Overtime
  if (employeeTypePolicies.overtimePolicy?.isEligible && attendance.otHours !== null) {
    let shiftHours = 8;
    if (shift) {
      // Calculate shift duration
      const [shStart, smStart] = shift.startTime.split(":").map(Number);
      const [shEnd, smEnd] = shift.endTime.split(":").map(Number);
      let diffMins = (shEnd * 60 + smEnd) - (shStart * 60 + smStart);
      if (diffMins <= 0) {
        diffMins += 24 * 60; // crossed midnight
      }
      shiftHours = Number((diffMins / 60).toFixed(2));
    }

    const otRes = calculateOvertimePreview({
      grossSalary,
      overtimePolicy: employeeTypePolicies.overtimePolicy,
      shiftHours,
      otHours: toNumber(otHours),
    });
    calculatedOvertimeAmount = otRes.otAmount;
  } else {
    if (!employeeTypePolicies.overtimePolicy?.isEligible) {
      notes.push("OT not eligible");
    }
  }

  // C. Tiffin Bill
  if (employeeTypePolicies.tiffinBillPolicy?.isEligible && attendance.checkOut) {
    const tiffinRes = calculateTiffinPreview({
      tiffinPolicy: employeeTypePolicies.tiffinBillPolicy,
      checkoutDateTime: attendance.checkOut,
      attendanceDate: attendance.date,
      timezone: HR_BUSINESS_TIMEZONE,
    });
    tiffinBillAmount = tiffinRes.amount;
    if (tiffinRes.allowed) {
      notes.push("Tiffin bill granted");
    }
  }

  // D. Night Bill
  if (employeeTypePolicies.nightBillPolicy?.isEligible && attendance.checkOut) {
    const nightRes = calculateNightBillPreview({
      nightBillPolicy: employeeTypePolicies.nightBillPolicy,
      checkoutDateTime: attendance.checkOut,
      attendanceDate: attendance.date,
      timezone: HR_BUSINESS_TIMEZONE,
    });
    nightBillAmount = nightRes.amount;
    if (nightRes.allowed) {
      notes.push("Night bill granted" + (nightRes.overnightApplied ? " (overnight)" : ""));
    }
  }

  // E. Holiday Bill
  if (employeeTypePolicies.holidayBillPolicy?.isEligible && workedOnHoliday) {
    const holidayRes = calculateHolidayBillPreview({
      grossSalary,
      holidayBillPolicy: employeeTypePolicies.holidayBillPolicy,
      isWeekend,
      isPublicHoliday,
      workedOnHoliday,
      otAmount: calculatedOvertimeAmount,
    });
    holidayBillAmount = holidayRes.amount;
    if (holidayRes.allowed) {
      notes.push(`Holiday premium (${holidayRes.calculationType})`);
    }
  }

  if (notes.length === 0) {
    notes.push("Calculated successfully");
  }

  return {
    status: resolvedStatus,
    workHours,
    otHours,
    lateMinutes,
    lateCountValue,
    breakLateMinutes,
    breakLateCountValue,
    tiffinBillAmount,
    nightBillAmount,
    holidayBillAmount,
    calculatedOvertimeAmount,
    policyCalculationNote: notes.join("; "),
  };
}

/**
 * 2. applyDailyAttendancePolicyValues
 * Loads a single attendance row, evaluates policy calculation, and updates policy columns.
 */
export async function applyDailyAttendancePolicyValues(
  attendanceId: string,
  options: { force?: boolean } = {}
) {
  try {
    await syncTimezoneFromDb();
    
    const attendance = await prisma.attendance.findUnique({
      where: { id: attendanceId },
      include: {
        employee: {
          include: {
            employeeType: {
              include: {
                salaryStructurePolicy: true,
                attendancePolicy: true,
                latePolicy: true,
                overtimePolicy: true,
                tiffinBillPolicy: true,
                nightBillPolicy: true,
                holidayBillPolicy: true,
              }
            },
            shift: true,
          }
        },
        shift: true,
      }
    });

    if (!attendance) {
      return { success: false, error: "Attendance record not found" };
    }

    if (attendance.isLocked && !options.force) {
      return { success: true, skipped: true, reason: "Attendance record is locked" };
    }

    const payrollSettings = await getPayrollSettings();
    const weekends = payrollSettings?.calculation?.weekends || [0, 6];

    // Determine weekend / public holiday
    const isWeekendDay = isConfiguredWeekend(attendance.date, weekends);
    
    // Check if public holiday exists
    const holiday = await prisma.holiday.findFirst({
      where: {
        date: attendance.date,
        status: "active",
        isTrash: false,
        OR: [
          { warehouseId: null },
          { warehouseId: attendance.employee.warehouseId }
        ]
      }
    });
    const isPublicHoliday = !!holiday;
    const workedOnHoliday = (isWeekendDay || isPublicHoliday) && !!attendance.checkIn && !!attendance.checkOut;

    const policies = attendance.employee.employeeType || {
      name: "No Employee Type",
      salaryStructurePolicy: null,
      attendancePolicy: null,
      latePolicy: null,
      overtimePolicy: null,
      tiffinBillPolicy: null,
      nightBillPolicy: null,
      holidayBillPolicy: null,
    };

    const grossSalary = attendance.employee.salary ? Number(attendance.employee.salary) : 0;
    const activeShift = attendance.shift || attendance.employee.shift;

    const result = calculateDailyAttendancePolicyValues({
      attendance,
      employee: attendance.employee,
      employeeTypePolicies: policies,
      shift: activeShift ? {
        startTime: activeShift.startTime,
        endTime: activeShift.endTime,
        graceMinutes: activeShift.graceMinutes,
        lateAfter: activeShift.lateAfter,
        halfDayAfter: activeShift.halfDayAfter,
        otStartAfter: activeShift.otStartAfter,
        breakStartTime: activeShift.breakStartTime,
        breakEndTime: activeShift.breakEndTime,
        breakGraceMinutes: activeShift.breakGraceMinutes,
        breakLateAfter: activeShift.breakLateAfter,
        breakType: activeShift.breakType,
        breakDuration: activeShift.breakDuration,
      } : null,
      isWeekend: isWeekendDay,
      isPublicHoliday,
      workedOnHoliday,
      grossSalary,
    });

    // Update attendance row policy calculation fields only
    const updated = await prisma.attendance.update({
      where: { id: attendanceId },
      data: {
        status: result.status as any,
        workHours: new Prisma.Decimal(result.workHours),
        otHours: new Prisma.Decimal(result.otHours),
        lateMinutes: result.lateMinutes,
        lateCountValue: new Prisma.Decimal(result.lateCountValue),
        breakLateMinutes: result.breakLateMinutes,
        breakLateCountValue: new Prisma.Decimal(result.breakLateCountValue),
        tiffinBillAmount: new Prisma.Decimal(result.tiffinBillAmount),
        nightBillAmount: new Prisma.Decimal(result.nightBillAmount),
        holidayBillAmount: new Prisma.Decimal(result.holidayBillAmount),
        calculatedOvertimeAmount: new Prisma.Decimal(result.calculatedOvertimeAmount),
        policyCalculationNote: result.policyCalculationNote,
      }
    });

    return { success: true, skipped: false, attendance: updated };

  } catch (error) {
    console.error(`applyDailyAttendancePolicyValues error for attendance ID ${attendanceId}:`, error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to apply policies" };
  }
}

/**
 * 3. reprocessAttendancePoliciesForDateRange
 * Finds matching attendance records, computes policy calculations, and batch updates fields.
 */
export async function reprocessAttendancePoliciesForDateRange(input: {
  fromDate: Date | string;
  toDate: Date | string;
  employeeId?: string;
  force?: boolean;
}) {
  const force = !!input.force;
  
  try {
    await syncTimezoneFromDb();
  } catch (e) {
    console.error("Failed to sync timezone in reprocessAttendancePoliciesForDateRange:", e);
  }
  
  const start = new Date(formatBusinessDateKey(new Date(input.fromDate)) + "T00:00:00.000Z");
  const end = new Date(formatBusinessDateKey(new Date(input.toDate)) + "T00:00:00.000Z");

  const payrollSettings = await getPayrollSettings();
  const weekends = payrollSettings?.calculation?.weekends || [0, 6];

  const summary = {
    totalFound: 0,
    processed: 0,
    skippedLocked: 0,
    skippedMissingEmployee: 0,
    skippedMissingShift: 0,
    errors: [] as string[],
    sampleResults: [] as any[],
  };

  try {
    const where: Prisma.AttendanceWhereInput = {
      date: {
        gte: start,
        lte: end,
      }
    };
    if (input.employeeId) {
      where.employeeId = input.employeeId;
    }

    const attendances = await prisma.attendance.findMany({
      where,
      include: {
        employee: {
          include: {
            employeeType: {
              include: {
                salaryStructurePolicy: true,
                attendancePolicy: true,
                latePolicy: true,
                overtimePolicy: true,
                tiffinBillPolicy: true,
                nightBillPolicy: true,
                holidayBillPolicy: true,
              }
            },
            shift: true,
          }
        },
        shift: true,
      },
      orderBy: { date: "asc" }
    });

    summary.totalFound = attendances.length;

    // Prefetch all active holidays within date bounds
    const holidays = await prisma.holiday.findMany({
      where: {
        date: {
          gte: start,
          lte: end,
        },
        status: "active",
        isTrash: false,
      }
    });

    for (const att of attendances) {
      if (!att.employee) {
        summary.skippedMissingEmployee++;
        continue;
      }

      if (att.isLocked && !force) {
        summary.skippedLocked++;
        continue;
      }

      const activeShift = att.shift || att.employee.shift;
      if (!activeShift) {
        // Record missing shift, update policy fields to 0, write warning note
        try {
          await prisma.attendance.update({
            where: { id: att.id },
            data: {
              lateMinutes: 0,
              lateCountValue: new Prisma.Decimal(0),
              tiffinBillAmount: new Prisma.Decimal(0),
              nightBillAmount: new Prisma.Decimal(0),
              holidayBillAmount: new Prisma.Decimal(0),
              calculatedOvertimeAmount: new Prisma.Decimal(0),
              policyCalculationNote: "Warning: Missing shift schedule. Calculations set to zero.",
            }
          });
          summary.skippedMissingShift++;
        } catch (e) {
          summary.errors.push(`Error on attendance ID ${att.id} missing shift update: ${e instanceof Error ? e.message : String(e)}`);
        }
        continue;
      }

      // Check holidays & weekends
      const isWeekendDay = isConfiguredWeekend(att.date, weekends);
      const isPublicHoliday = holidays.some(h => 
        formatBusinessDateKey(h.date) === formatBusinessDateKey(att.date) && 
        (h.warehouseId === null || h.warehouseId === att.employee.warehouseId)
      );
      const workedOnHoliday = (isWeekendDay || isPublicHoliday) && !!att.checkIn && !!att.checkOut;

      try {
        const policies = att.employee.employeeType || {
          name: "No Employee Type",
          salaryStructurePolicy: null,
          attendancePolicy: null,
          latePolicy: null,
          overtimePolicy: null,
          tiffinBillPolicy: null,
          nightBillPolicy: null,
          holidayBillPolicy: null,
        };

        const grossSalary = att.employee.salary ? Number(att.employee.salary) : 0;

        const result = calculateDailyAttendancePolicyValues({
          attendance: att,
          employee: att.employee,
          employeeTypePolicies: policies,
          shift: {
            startTime: activeShift.startTime,
            endTime: activeShift.endTime,
            graceMinutes: activeShift.graceMinutes,
            lateAfter: activeShift.lateAfter,
            halfDayAfter: activeShift.halfDayAfter,
            otStartAfter: activeShift.otStartAfter,
            breakStartTime: activeShift.breakStartTime,
            breakEndTime: activeShift.breakEndTime,
            breakGraceMinutes: activeShift.breakGraceMinutes,
            breakLateAfter: activeShift.breakLateAfter,
            breakType: activeShift.breakType,
            breakDuration: activeShift.breakDuration,
          },
          isWeekend: isWeekendDay,
          isPublicHoliday,
          workedOnHoliday,
          grossSalary,
        });

        // Update database row
        await prisma.attendance.update({
          where: { id: att.id },
          data: {
            status: result.status as any,
            workHours: new Prisma.Decimal(result.workHours),
            otHours: new Prisma.Decimal(result.otHours),
            lateMinutes: result.lateMinutes,
            lateCountValue: new Prisma.Decimal(result.lateCountValue),
            breakLateMinutes: result.breakLateMinutes,
            breakLateCountValue: new Prisma.Decimal(result.breakLateCountValue),
            tiffinBillAmount: new Prisma.Decimal(result.tiffinBillAmount),
            nightBillAmount: new Prisma.Decimal(result.nightBillAmount),
            holidayBillAmount: new Prisma.Decimal(result.holidayBillAmount),
            calculatedOvertimeAmount: new Prisma.Decimal(result.calculatedOvertimeAmount),
            policyCalculationNote: result.policyCalculationNote,
          }
        });

        summary.processed++;

        if (summary.sampleResults.length < 5) {
          summary.sampleResults.push({
            attendanceId: att.id,
            employeeName: att.employee.name,
            date: formatBusinessDateKey(att.date),
            lateMinutes: result.lateMinutes,
            otAmount: result.calculatedOvertimeAmount,
            tiffin: result.tiffinBillAmount,
            night: result.nightBillAmount,
            holiday: result.holidayBillAmount,
          });
        }

      } catch (err) {
        summary.errors.push(`Error calculating attendance ID ${att.id}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

  } catch (error) {
    summary.errors.push(`Fatal reprocess error: ${error instanceof Error ? error.message : String(error)}`);
  }

  return summary;
}
