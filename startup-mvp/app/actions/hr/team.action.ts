"use server";

import { prisma } from "@/lib/prisma";
import { getTenantContext, verifyTenantAccess, verifyParentTenantAccess } from "@/lib/tenant-context";
import { createUserLog, LogAction } from "@/lib/user-log";
import { revalidatePath } from "next/cache";

export async function getTeams(departmentId?: string, statusFilter: string = "all") {
  try {
    const tenant = await getTenantContext();
    const where: any = { organizationId: tenant.organizationId };

    if (departmentId) {
      where.departmentId = departmentId;
    }

    if (statusFilter && statusFilter !== "all") {
      where.status = statusFilter;
    }

    const teams = await prisma.team.findMany({
      where,
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: {
        Department: {
          select: { id: true, name: true, code: true },
        },
        Lead: {
          select: { id: true, name: true, employeeCode: true, designation: true },
        },
        _count: {
          select: { Employees: true },
        },
      },
    });

    return { success: true, teams };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to fetch teams", teams: [] };
  }
}

export async function createTeam(input: {
  departmentId: string;
  name: string;
  code: string;
  description?: string;
  leadEmployeeId?: string;
}) {
  try {
    const tenant = await getTenantContext();

    if (!input.departmentId || !input.name || !input.code) {
      return { success: false, error: "Department, team name, and code are required" };
    }

    // Validate department exists and belongs to tenant
    const department = await prisma.department.findUnique({
      where: { id: input.departmentId },
      select: { organizationId: true },
    });

    if (!department) return { success: false, error: "Target department not found" };
    verifyParentTenantAccess(tenant.organizationId, department.organizationId);

    const formattedCode = input.code.trim().toUpperCase();

    // Check unique code per department in organization
    const existing = await prisma.team.findFirst({
      where: {
        organizationId: tenant.organizationId,
        departmentId: input.departmentId,
        code: formattedCode,
      },
    });

    if (existing) {
      return { success: false, error: `Team code '${formattedCode}' already exists in this department` };
    }

    // Validate lead employee if provided
    if (input.leadEmployeeId) {
      const lead = await prisma.employee.findUnique({
        where: { id: input.leadEmployeeId },
        select: { organizationId: true },
      });
      if (!lead) return { success: false, error: "Team lead employee not found" };
      verifyParentTenantAccess(tenant.organizationId, lead.organizationId);
    }

    const team = await prisma.team.create({
      data: {
        organizationId: tenant.organizationId,
        departmentId: input.departmentId,
        name: input.name.trim(),
        code: formattedCode,
        description: input.description?.trim() || null,
        leadEmployeeId: input.leadEmployeeId || null,
        status: "active",
      },
    });

    await createUserLog({
      userId: tenant.userId,
// @ts-expect-error - Legacy compatibility
      action: LogAction.CREATE,
      entity: "Team",
      entityId: team.id,
// @ts-expect-error - Legacy compatibility
      details: { name: team.name, code: team.code, departmentId: team.departmentId },
    });

    revalidatePath("/dashboard/hr/teams");
    return { success: true, team };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to create team" };
  }
}

export async function updateTeam(
  teamId: string,
  input: {
    name?: string;
    code?: string;
    description?: string;
    leadEmployeeId?: string | null;
    status?: string;
  }
) {
  try {
    const tenant = await getTenantContext();

    const existing = await prisma.team.findFirst({
      where: {
        id: teamId,
        organizationId: tenant.organizationId,
      },
    });

    if (!existing) {
      return { success: false, error: "Team not found or unauthorized" };
    }

    if (input.leadEmployeeId) {
      const lead = await prisma.employee.findUnique({
        where: { id: input.leadEmployeeId },
        select: { organizationId: true },
      });
      if (!lead) return { success: false, error: "Team lead employee not found" };
      verifyParentTenantAccess(tenant.organizationId, lead.organizationId);
    }

    const updated = await prisma.team.update({
      where: { id: teamId },
      data: {
        name: input.name !== undefined ? input.name.trim() : existing.name,
        code: input.code !== undefined ? input.code.trim().toUpperCase() : existing.code,
        description: input.description !== undefined ? input.description?.trim() || null : existing.description,
        leadEmployeeId: input.leadEmployeeId !== undefined ? input.leadEmployeeId : existing.leadEmployeeId,
        status: input.status !== undefined ? input.status : existing.status,
      },
    });

    await createUserLog({
      userId: tenant.userId,
// @ts-expect-error - Legacy compatibility
      action: LogAction.UPDATE,
      entity: "Team",
      entityId: updated.id,
// @ts-expect-error - Legacy compatibility
      details: { changes: input },
    });

    revalidatePath("/dashboard/hr/teams");
    return { success: true, team: updated };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to update team" };
  }
}
