"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { TimesheetStatus } from "@prisma/client";

/**
 * Submits a new Timesheet for Manager Approval
 */
export async function submitTimesheet(input: {
    hours: number;
    date: string;
    projectId: string;
    taskId?: string;
    description?: string;
    isBillable?: boolean;
}) {
    try {
        const session = await auth();
        if (!session?.user?.id) throw new Error("Unauthorized");
        
        // Find the User's linked Employee Record
        const employee = await prisma.employee.findFirst({
            where: { userId: session.user.id }
        });

        if (!employee) {
            throw new Error("User is not linked to an Employee record");
        }

        // Prevent exceeding 24 hours in a single day
        const existingDaily = await prisma.timesheet.aggregate({
            where: { 
                employeeId: employee.id, 
                date: new Date(input.date) 
            },
            _sum: { hours: true }
        });

        const totalHours = Number(existingDaily._sum.hours || 0) + input.hours;
        if (totalHours > 24) {
            throw new Error(`Exceeds daily 24-hour limit. You have already logged ${existingDaily._sum.hours} hours today.`);
        }

        const timesheet = await prisma.timesheet.create({
// @ts-expect-error - Legacy compatibility
            data: {
                hours: input.hours,
                date: new Date(input.date),
                projectId: input.projectId,
                taskId: input.taskId,
                description: input.description,
                isBillable: input.isBillable ?? true,
                employeeId: employee.id,
                status: 'PENDING'
            }
        });

        return { success: true, timesheet };
    } catch (error: any) {
        return { success: false, error: error.message || "Failed to submit timesheet" };
    }
}

/**
 * Manager Approval Workflow
 */
export async function approveTimesheet(timesheetId: string, status: TimesheetStatus) {
    try {
        const session = await auth();
        if (!session?.user?.id) throw new Error("Unauthorized");
        if (!(await hasPermission(session.user.id, "hr.timesheets", "edit"))) {
            throw new Error("Permission Denied: Missing Manager Clearance");
        }

        if (status === 'PENDING') throw new Error("Invalid status transition");

        const timesheet = await prisma.timesheet.update({
            where: { id: timesheetId },
            data: {
                status,
                approvedById: session.user.id
            }
        });

        return { success: true, timesheet };
    } catch (error: any) {
        return { success: false, error: error.message || "Failed to process approval" };
    }
}

/**
 * Calculates Employee Utilization % by merging Timesheets and Attendance
 * Utilization = (Approved Logged Hours / Total Attendance Hours) * 100
 */
export async function getEmployeeUtilization(employeeId: string, startDate: Date, endDate: Date) {
    try {
        const session = await auth();
        if (!session?.user?.id) throw new Error("Unauthorized");
        if (!(await hasPermission(session.user.id, "hr.timesheets", "read"))) {
            throw new Error("Permission Denied");
        }

        // 1. Fetch Physical Attendance
        const attendance = await prisma.attendance.aggregate({
            where: {
                employeeId,
                date: { gte: startDate, lte: endDate },
                status: 'PRESENT'
            },
            _sum: {
                workHours: true,
                otHours: true
            }
        });

        const physicalHours = Number(attendance._sum.workHours || 0) + Number(attendance._sum.otHours || 0);

        // 2. Fetch Approved Timesheets
        const timesheets = await prisma.timesheet.aggregate({
            where: {
                employeeId,
                date: { gte: startDate, lte: endDate },
                status: 'APPROVED'
            },
            _sum: { hours: true }
        });

        const loggedHours = Number(timesheets._sum.hours || 0);

        // 3. Fetch Billable Ratio
        const billable = await prisma.timesheet.aggregate({
            where: {
                employeeId,
                date: { gte: startDate, lte: endDate },
                status: 'APPROVED',
                isBillable: true
            },
            _sum: { hours: true }
        });

        const billableHours = Number(billable._sum.hours || 0);

        const utilizationPercentage = physicalHours > 0 ? Math.round((loggedHours / physicalHours) * 100) : 0;
        const billablePercentage = loggedHours > 0 ? Math.round((billableHours / loggedHours) * 100) : 0;

        // Anti-surveillance check: Overtime is mathematically inferred, not tracked via software spy
        const inferredOvertime = Math.max(0, loggedHours - physicalHours);

        return {
            success: true,
            data: {
                physicalHours,
                loggedHours,
                billableHours,
                utilizationPercentage,
                billablePercentage,
                inferredOvertime
            }
        };

    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
