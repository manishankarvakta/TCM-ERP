"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";

/**
 * Enterprise Performance Engine
 * Mathematically infers workload limits and predicts burnout without surveillance.
 */
export async function getEmployeePerformanceMetrics(employeeId: string) {
    try {
        const session = await auth();
        if (!session?.user?.id) throw new Error("Unauthorized");
        if (!(await hasPermission(session.user.id, "hr.timesheets", "read"))) {
            throw new Error("Permission Denied");
        }

        const employee = await prisma.employee.findUnique({
            where: { id: employeeId },
// @ts-expect-error - Legacy compatibility
            select: { userId: true, firstName: true, lastName: true }
        });

        if (!employee || !employee.userId) throw new Error("Invalid Employee");

        // 1. Fetch Completed Tasks (for Accuracy Metrics)
        const completedTasks = await prisma.task.findMany({
            where: { 
                assigneeId: employee.userId, 
                status: { in: ['done', 'completed'] },
                estimatedHours: { not: null }
            },
            include: { Timesheets: { where: { status: 'APPROVED' } } }
        });

        let totalEstimated = 0;
        let totalActual = 0;
        let metDeadlineCount = 0;

        completedTasks.forEach(task => {
            const actualHours = task.Timesheets.reduce((sum, ts) => sum + Number(ts.hours), 0);
            const estimated = Number(task.estimatedHours) || 0;
            
            totalEstimated += estimated;
            totalActual += actualHours;

            // Deadline check (assuming updated timestamp is rough completion time if no dedicated closedAt exists)
            if (task.dueDate && new Date(task.updatedAt) <= new Date(task.dueDate)) {
                metDeadlineCount++;
            }
        });

        // ALGORITHM A: Estimation Accuracy (The Drift Score)
        // 100% means perfect estimation. Lower means tasks take much longer or much shorter than planned.
        let estimationAccuracy = 100;
        if (totalEstimated > 0) {
            const drift = Math.abs(totalActual - totalEstimated) / totalEstimated;
            estimationAccuracy = Math.max(0, Math.round((1 - drift) * 100));
        }

        // ALGORITHM B: Deadline Accuracy
        const deadlineAccuracy = completedTasks.length > 0 
            ? Math.round((metDeadlineCount / completedTasks.length) * 100) 
            : 100;

        // 2. Fetch Active Assigned Tasks (for Workload Pressure)
        const activeTasks = await prisma.task.findMany({
            where: {
                assigneeId: employee.userId,
                status: { notIn: ['done', 'completed', 'archived'] }
            }
        });

        const activeEstimatedWorkload = activeTasks.reduce((sum, task) => sum + (Number(task.estimatedHours) || 0), 0);

        // Standard Weekly Capacity = 40 hours.
        // We calculate how many hours they've already logged this week to see remaining capacity.
        const startOfWeek = new Date();
        startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
        
        const thisWeekTimesheets = await prisma.timesheet.aggregate({
            where: {
                employeeId: employeeId,
                date: { gte: startOfWeek },
                status: 'APPROVED'
            },
            _sum: { hours: true }
        });

        const hoursLoggedThisWeek = Number(thisWeekTimesheets._sum.hours || 0);
        const remainingCapacity = Math.max(1, 40 - hoursLoggedThisWeek); // Floor at 1 to prevent division by zero

        // ALGORITHM C: Workload Pressure
        // > 1.0 means they have more active work assigned than hours remaining in the week.
        const workloadPressure = Number((activeEstimatedWorkload / remainingCapacity).toFixed(2));

        // ALGORITHM D: Burnout Risk Flag
        // Triggered mathematically if pressure is insanely high OR estimation drift is catastrophic
        let burnoutRisk: "LOW" | "MODERATE" | "HIGH" | "CRITICAL" = "LOW";
        if (workloadPressure > 2.0 || (workloadPressure > 1.5 && estimationAccuracy < 50)) {
            burnoutRisk = "CRITICAL";
        } else if (workloadPressure > 1.5 || estimationAccuracy < 60) {
            burnoutRisk = "HIGH";
        } else if (workloadPressure > 1.0) {
            burnoutRisk = "MODERATE";
        }

        return {
            success: true,
            data: {
                estimationAccuracy,
                deadlineAccuracy,
                workloadPressure,
                burnoutRisk,
                activeTaskCount: activeTasks.length,
                activeEstimatedWorkload
            }
        };

    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
