"use server";

import { prisma } from "@/lib/prisma";
import { getTenantContext, verifyTenantAccess, verifyParentTenantAccess } from "@/lib/tenant-context";
import { createUserLog, LogAction } from "@/lib/user-log";
import { revalidatePath } from "next/cache";

/**
 * Helper to detect reporting manager cycles (e.g. A -> B -> A or A -> B -> C -> A)
 */
async function detectManagerCycle(
  employeeId: string,
  proposedManagerId: string,
  organizationId: string
): Promise<boolean> {
  let currentId: string | null = proposedManagerId;
  const visited = new Set<string>();

  while (currentId) {
    if (currentId === employeeId) {
      return true; // Cycle detected!
    }
    visited.add(currentId);

    const parent: { reportingManagerId: string | null } | null = await prisma.employee.findFirst({
      where: { id: currentId, organizationId },
      select: { reportingManagerId: true },
    });

    currentId = parent?.reportingManagerId || null;
    if (currentId && visited.has(currentId)) {
      break; // Safeguard against existing DB loops
    }
  }

  return false;
}

export async function assignEmployeeOrgStructure(input: {
  employeeId: string;
  departmentId?: string | null;
  teamId?: string | null;
  reportingManagerId?: string | null;
}) {
  try {
    const tenant = await getTenantContext();

    const employee = await prisma.employee.findFirst({
      where: {
        id: input.employeeId,
        organizationId: tenant.organizationId,
      },
    });

    if (!employee) {
      return { success: false, error: "Employee not found or unauthorized" };
    }

    let finalDepartmentId = input.departmentId !== undefined ? input.departmentId : employee.departmentId;
    let finalTeamId = input.teamId !== undefined ? input.teamId : employee.teamId;
    let finalManagerId = input.reportingManagerId !== undefined ? input.reportingManagerId : employee.reportingManagerId;

    // 1. Validate Department if provided
    if (finalDepartmentId) {
      const dept = await prisma.department.findUnique({
        where: { id: finalDepartmentId },
        select: { organizationId: true },
      });
      if (!dept) return { success: false, error: "Target department not found" };
      verifyParentTenantAccess(tenant.organizationId, dept.organizationId);
    }

    // 2. Validate Team & Department-Team Consistency
    if (finalTeamId) {
      const team = await prisma.team.findUnique({
        where: { id: finalTeamId },
        select: { organizationId: true, departmentId: true },
      });
      if (!team) return { success: false, error: "Target team not found" };
      verifyParentTenantAccess(tenant.organizationId, team.organizationId);

      // Auto-set department if team is assigned but department is empty
      if (!finalDepartmentId) {
        finalDepartmentId = team.departmentId;
      } else if (team.departmentId !== finalDepartmentId) {
        return {
          success: false,
          error: "Department-Team inconsistency: Selected team does not belong to the selected department",
        };
      }
    }

    // 3. Validate Reporting Manager
    if (finalManagerId) {
      if (finalManagerId === input.employeeId) {
        return { success: false, error: "Self-reporting manager assignment is forbidden" };
      }

      const manager = await prisma.employee.findFirst({
        where: { id: finalManagerId, organizationId: tenant.organizationId },
        select: { organizationId: true },
      });

      if (!manager) {
        return { success: false, error: "Reporting manager not found or belongs to another organization" };
      }

      // Check manager cycle
      const hasCycle = await detectManagerCycle(input.employeeId, finalManagerId, tenant.organizationId);
      if (hasCycle) {
        return { success: false, error: "Circular reporting manager assignment detected (A -> B -> A)" };
      }
    }

    // 4. Execute Update
    const updatedEmployee = await prisma.employee.update({
      where: { id: input.employeeId },
      data: {
        departmentId: finalDepartmentId,
        teamId: finalTeamId,
        reportingManagerId: finalManagerId,
      },
    });

    await createUserLog({
      userId: tenant.userId,
// @ts-expect-error - Legacy compatibility
      action: LogAction.UPDATE,
      entity: "EmployeeOrgStructure",
      entityId: employee.id,
// @ts-expect-error - Legacy compatibility
      details: {
        departmentId: finalDepartmentId,
        teamId: finalTeamId,
        reportingManagerId: finalManagerId,
      },
    });

    revalidatePath("/dashboard/hr/employees");
    return { success: true, employee: updatedEmployee };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to update employee organizational structure" };
  }
}
