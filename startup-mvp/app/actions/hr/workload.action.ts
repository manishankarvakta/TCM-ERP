"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { 
  getEmployeeCapacity, 
  calculateCurrentWorkload, 
  getBurnoutIndicators, 
  getEstimationAccuracy 
} from "@/lib/system/workload";

/**
 * Fetch workload metrics for the currently authenticated employee.
 * Strictly self-service for personal visibility.
 */
export async function getMyWorkloadMetrics() {
  try {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Unauthorized");

    const employee = await prisma.employee.findUnique({
      where: { userId: session.user.id },
      select: { id: true, name: true }
    });

    if (!employee) throw new Error("Employee profile not linked to user");

    const [capacity, workload, burnout, accuracy] = await Promise.all([
      getEmployeeCapacity(employee.id),
      calculateCurrentWorkload(employee.id),
      getBurnoutIndicators(employee.id),
      getEstimationAccuracy(employee.id)
    ]);

    return {
      success: true,
      data: {
        employeeName: employee.name,
        capacity,
        workload,
        burnout,
        accuracy
      }
    };
  } catch (error: any) {
    console.error("[Workload] getMyWorkloadMetrics error:", error);
    return { success: false, error: error.message || "Failed to fetch metrics" };
  }
}

/**
 * Fetch team workload for Managers.
 * (Future scope: Filter by department or direct reports)
 */
export async function getTeamWorkloadMetrics() {
  try {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Unauthorized");

    // Grab all active employees
    const employees = await prisma.employee.findMany({
      where: { status: "active" },
      select: { id: true, name: true, department: true }
    });

    const teamData = await Promise.all(
      employees.map(async (emp) => {
        const workload = await calculateCurrentWorkload(emp.id);
        const burnout = await getBurnoutIndicators(emp.id);
        return {
          id: emp.id,
          name: emp.name,
          department: emp.department,
          workloadRatio: workload.workloadRatio,
          status: workload.status,
          burnoutRisk: burnout.length > 0
        };
      })
    );

    return { success: true, data: teamData };
  } catch (error: any) {
    console.error("[Workload] getTeamWorkloadMetrics error:", error);
    return { success: false, error: "Failed to fetch team metrics" };
  }
}
