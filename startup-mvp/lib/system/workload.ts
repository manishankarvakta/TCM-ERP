import { prisma } from "../prisma";
import { startOfWeek, endOfWeek, subMonths, subWeeks } from "date-fns";

/**
 * Team Performance & Workload Management Engine
 * STRICTLY SURVEILLANCE-FREE METRICS
 */

export async function getEmployeeCapacity(employeeId: string, start: Date = startOfWeek(new Date()), end: Date = endOfWeek(new Date())) {
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    select: { utilizationTarget: true, shiftId: true }
  });

  if (!employee) throw new Error("Employee not found");

  const target = (employee.utilizationTarget || 80.0) / 100.0;
  
  // Standard assumption: 5 days a week, 8 hours a day = 40 hours
  // In a real scenario, this would query the Shift model.
  const baseWeeklyHours = 40;

  // Subtract Approved Leaves overlapping this week
  const leaves = await prisma.leaveApplication.findMany({
    where: {
      employeeId,
      status: "APPROVED" as any,
      startDate: { lte: end },
      endDate: { gte: start }
    }
  });

  const leaveDaysThisWeek = leaves.reduce((total, leave) => {
    // Simplified overlapping logic for MVP
    return total + (leave.totalDays > 5 ? 5 : leave.totalDays);
  }, 0);

  const availableHours = Math.max(0, baseWeeklyHours - (leaveDaysThisWeek * 8));
  
  return {
    baseWeeklyHours,
    leaveDaysThisWeek,
    targetUtilization: target * 100,
    trueCapacityHours: availableHours * target // E.g., 40 * 0.8 = 32 hours
  };
}

export async function calculateCurrentWorkload(employeeId: string) {
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    select: { userId: true }
  });

  if (!employee?.userId) return { workloadRatio: 0, outstandingHours: 0 };

  // Calculate Capacity
  const capacity = await getEmployeeCapacity(employeeId);

  // Get In-Progress Issues
  const activeIssues = await prisma.issue.findMany({
    where: {
      assigneeId: employee.userId,
      status: "IN_PROGRESS" as any
    },
    select: { id: true, estimatedHours: true }
  });

  const outstandingHours = activeIssues.reduce((sum, issue) => {
    return sum + (issue.estimatedHours || 4); // Default to 4 if unestimated
  }, 0);

  const ratio = capacity.trueCapacityHours > 0 
    ? (outstandingHours / capacity.trueCapacityHours) * 100 
    : 0;

  return {
    outstandingHours,
    capacity: capacity.trueCapacityHours,
    workloadRatio: ratio,
    status: ratio > 90 ? "OVERLOADED" : ratio < 60 ? "UNDERUTILIZED" : "OPTIMAL"
  };
}

export async function getBurnoutIndicators(employeeId: string) {
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    select: { userId: true }
  });

  const indicators = [];

  // Indicator 1: Leave Deficit (No leave in 6 months)
  const sixMonthsAgo = subMonths(new Date(), 6);
  const recentLeaves = await prisma.leaveApplication.count({
    where: {
      employeeId,
      status: "APPROVED" as any,
      createdAt: { gte: sixMonthsAgo }
    }
  });

  if (recentLeaves === 0) {
    indicators.push({
      type: "LEAVE_DEFICIT",
      severity: "MEDIUM",
      message: "No leaves taken in the last 6 months. High risk of long-term fatigue."
    });
  }

  if (!employee?.userId) return indicators;

  // Indicator 2: Context Switch Overload
  const activeIssueCount = await prisma.issue.count({
    where: {
      assigneeId: employee.userId,
      status: "IN_PROGRESS" as any
    }
  });

  if (activeIssueCount > 5) {
    indicators.push({
      type: "CONTEXT_SWITCHING",
      severity: "HIGH",
      message: `Juggling ${activeIssueCount} active issues simultaneously. Delivery efficiency degrades.`
    });
  }

  // Indicator 3: Overtime Spikes
  const twoWeeksAgo = subWeeks(new Date(), 2);
  const recentTimesheets = await prisma.timesheet.findMany({
    where: {
      employeeId,
      date: { gte: twoWeeksAgo }
    }
  });

  const totalLoggedHours = recentTimesheets.reduce((sum, t) => sum + Number(t.hours), 0);
  if (totalLoggedHours > 100) { // Assuming 80 is normal for 2 weeks
    indicators.push({
      type: "OVERTIME_SPIKE",
      severity: "CRITICAL",
      message: `Logged ${totalLoggedHours} hours in the last two weeks (20+ hrs overtime).`
    });
  }

  return indicators;
}

export async function getEstimationAccuracy(employeeId: string) {
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    select: { userId: true }
  });

  if (!employee?.userId) return 100; // Perfect score if no data

  // Find recently DONE issues with estimates
  const completedIssues = await prisma.issue.findMany({
    where: {
      assigneeId: employee.userId,
      status: "DONE" as any,
      estimatedHours: { not: null },
      actualHours: { not: null }
    },
    take: 10,
    orderBy: { updatedAt: 'desc' }
  });

  if (completedIssues.length === 0) return null; // No baseline

  let totalEst = 0;
  let totalAct = 0;

  completedIssues.forEach(issue => {
    totalEst += (issue.estimatedHours || 0);
    totalAct += (issue.actualHours || 0);
  });

  if (totalAct === 0) return 100;
  
  // E.g. Estimated 10, Actual 12 = 83% accurate
  return Math.min(100, (totalEst / totalAct) * 100);
}
