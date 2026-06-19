import { prisma } from "@/lib/prisma";

export async function getPayrollAttendanceWarnings(input: { fromDate: Date, toDate: Date }) {
  const { fromDate, toDate } = input;
  const warnings: Array<{
    type: string;
    severity: "info" | "warning" | "critical";
    count: number;
    message: string;
    href?: string;
  }> = [];

  // 1. Unknown Punches
  const unknownPunches = await prisma.unmappedBiometricLog.count({
    where: {
      status: "UNRESOLVED",
      punchTime: {
        gte: fromDate,
        lte: toDate,
      }
    }
  });

  if (unknownPunches > 0) {
    warnings.push({
      type: "unknown_punches",
      severity: "critical",
      count: unknownPunches,
      message: "Some biometric punches are not mapped to employees. Please resolve them before generating payroll to ensure accurate attendance.",
      href: "/dashboard/hr/biometric/devices"
    });
  }

  // 1b. Disabled Access Punches
  const disabledPunches = await prisma.unmappedBiometricLog.count({
    where: {
      reason: "DISABLED_ACCESS",
      status: "REJECTED",
      punchTime: {
        gte: fromDate,
        lte: toDate,
      }
    }
  });

  if (disabledPunches > 0) {
    warnings.push({
      type: "disabled_access",
      severity: "warning",
      count: disabledPunches,
      message: "There are rejected punch attempts from locally disabled biometric users in this period.",
      href: "/dashboard/hr/biometric/devices"
    });
  }

  // 2. Unprocessed Raw Logs
  const unprocessedRawLogs = await prisma.biometricRawLog.count({
    where: {
      syncStatus: "PENDING",
      punchTime: {
        gte: fromDate,
        lte: toDate,
      }
    }
  });

  if (unprocessedRawLogs > 0) {
    warnings.push({
      type: "unprocessed_raw_logs",
      severity: "warning",
      count: unprocessedRawLogs,
      message: "There are raw biometric logs that have not been processed into attendance records.",
      href: "/dashboard/hr/biometric/devices"
    });
  }

  // 3. Failed Syncs
  const failedSyncs = await prisma.biometricSyncLog.count({
    where: {
      status: "FAILED",
      syncTime: {
        gte: fromDate,
        lte: toDate,
      }
    }
  });

  if (failedSyncs > 0) {
    warnings.push({
      type: "failed_syncs",
      severity: "warning",
      count: failedSyncs,
      message: "There were failed biometric sync operations during this period. Data might be incomplete.",
      href: "/dashboard/hr/biometric/devices"
    });
  }

  // 4. Missing Attendance (Basic check)
  const activeEmployees = await prisma.employee.count({
    where: {
      status: "active",
    }
  });
  
  const employeesWithAttendance = await prisma.attendance.groupBy({
    by: ['employeeId'],
    where: {
      date: {
        gte: fromDate,
        lte: toDate,
      }
    }
  });
  
  const missingAttendance = Math.max(0, activeEmployees - employeesWithAttendance.length);

  if (missingAttendance > 0) {
    warnings.push({
      type: "missing_attendance",
      severity: "info",
      count: missingAttendance,
      message: `There are active employees with ZERO attendance records in this period. Ensure logs are synced.`,
      href: "/dashboard/hr/attendance"
    });
  }

  // 5. Pending Leave Approvals
  const pendingLeaves = await prisma.leaveApplication.count({
    where: {
      status: "PENDING",
      isTrash: false,
      OR: [
        { startDate: { lte: toDate, gte: fromDate } },
        { endDate: { lte: toDate, gte: fromDate } },
        { startDate: { lte: fromDate }, endDate: { gte: toDate } }
      ]
    }
  });

  if (pendingLeaves > 0) {
    warnings.push({
      type: "pending_leaves",
      severity: "warning",
      count: pendingLeaves,
      message: "There are pending leave applications overlapping this payroll period. Approve or reject them.",
      href: "/dashboard/hr/leave"
    });
  }

  return {
    period: {
      fromDate: fromDate.toISOString(),
      toDate: toDate.toISOString(),
    },
    counts: {
      unknownPunches,
      disabledAccessPunches: disabledPunches,
      unprocessedRawLogs,
      failedSyncs,
      missingAttendance,
      pendingLeaveApprovals: pendingLeaves,
    },
    warnings,
    canGeneratePayroll: true,
  };
}
