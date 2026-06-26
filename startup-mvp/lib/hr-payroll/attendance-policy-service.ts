import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { isWeekend } from "date-fns";
import {
  calculateLateMinutes,
  formatBusinessDateKey,
  ShiftPolicy,
  HR_BUSINESS_TIMEZONE,
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
  } | null;
  isWeekend: boolean;
  isPublicHoliday: boolean;
  workedOnHoliday: boolean;
  grossSalary: number;
}

export interface DailyAttendancePolicyOutput {
  lateMinutes: number;
  lateCountValue: number;
  tiffinBillAmount: number;
  nightBillAmount: number;
  holidayBillAmount: number;
  calculatedOvertimeAmount: number;
  policyCalculationNote: string;
}

export function calculateDailyAttendancePolicyValues(input: DailyAttendancePolicyInput): DailyAttendancePolicyOutput {
  const { attendance, employeeTypePolicies, shift, isWeekend, isPublicHoliday, workedOnHoliday, grossSalary } = input;
  
  let lateMinutes = 0;
  let lateCountValue = 0;
  let tiffinBillAmount = 0;
  let nightBillAmount = 0;
  let holidayBillAmount = 0;
  let calculatedOvertimeAmount = 0;
  const notes: string[] = [];

  // A. Late minutes and late count
  if (attendance.checkIn && shift) {
    const isWorkedDay = 
      attendance.status === "PRESENT" || 
      attendance.status === "LATE" || 
      attendance.status === "HALF_DAY" || 
      (!!attendance.checkIn && !!attendance.checkOut);

    if (isWorkedDay) {
      const shiftPolicy: ShiftPolicy = {
        startTime: shift.startTime,
        endTime: shift.endTime,
        graceMinutes: shift.graceMinutes,
        lateAfter: shift.lateAfter,
        halfDayAfter: shift.halfDayAfter,
        otStartAfter: shift.otStartAfter,
      };
      
      lateMinutes = calculateLateMinutes(new Date(attendance.checkIn), new Date(attendance.date), shiftPolicy);
      
      if (attendance.status === "LATE") {
        lateCountValue = 1;
      } else if (attendance.status === "HALF_DAY") {
        if (lateMinutes > 0) {
          lateCountValue = 1;
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
      otHours: toNumber(attendance.otHours),
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
    lateMinutes,
    lateCountValue,
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

    // Determine weekend / public holiday
    const isWeekendDay = isWeekend(attendance.date);
    
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
        lateMinutes: result.lateMinutes,
        lateCountValue: new Prisma.Decimal(result.lateCountValue),
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
  const start = new Date(formatBusinessDateKey(new Date(input.fromDate)) + "T00:00:00.000Z");
  const end = new Date(formatBusinessDateKey(new Date(input.toDate)) + "T00:00:00.000Z");

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
      const isWeekendDay = isWeekend(att.date);
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
            lateMinutes: result.lateMinutes,
            lateCountValue: new Prisma.Decimal(result.lateCountValue),
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
