"use server";

import { prisma } from "@/lib/prisma";
import { getTenantContext, verifyTenantAccess, verifyParentTenantAccess } from "@/lib/tenant-context";
import { createUserLog, LogAction } from "@/lib/user-log";
import { revalidatePath } from "next/cache";

export async function getDepartments(statusFilter: string = "all") {
  try {
    const tenant = await getTenantContext();
    const where: any = { organizationId: tenant.organizationId };

    if (statusFilter && statusFilter !== "all") {
      where.status = statusFilter;
    }

    const departments = await prisma.department.findMany({
      where,
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: {
        Manager: {
          select: { id: true, name: true, employeeCode: true, designation: true },
        },
        _count: {
          select: { Employees: true, Teams: true },
        },
      },
    });

    return { success: true, departments };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to fetch departments", departments: [] };
  }
}

export async function createDepartment(input: {
  name: string;
  code: string;
  description?: string;
  managerEmployeeId?: string;
}) {
  try {
    const tenant = await getTenantContext();

    if (!input.name || !input.code) {
      return { success: false, error: "Department name and code are required" };
    }

    const formattedCode = input.code.trim().toUpperCase();

    // Check unique code per organization
    const existing = await prisma.department.findFirst({
      where: {
        organizationId: tenant.organizationId,
        code: formattedCode,
      },
    });

    if (existing) {
      return { success: false, error: `Department code '${formattedCode}' already exists in your organization` };
    }

    // Validate manager employee if provided
    if (input.managerEmployeeId) {
      const manager = await prisma.employee.findUnique({
        where: { id: input.managerEmployeeId },
        select: { organizationId: true },
      });
      if (!manager) return { success: false, error: "Manager employee not found" };
      verifyParentTenantAccess(tenant.organizationId, manager.organizationId);
    }

    const department = await prisma.department.create({
      data: {
        organizationId: tenant.organizationId,
        name: input.name.trim(),
        code: formattedCode,
        description: input.description?.trim() || null,
        managerEmployeeId: input.managerEmployeeId || null,
        status: "active",
      },
    });

    await createUserLog({
      userId: tenant.userId,
// @ts-expect-error - Legacy compatibility
      action: LogAction.CREATE,
      entity: "Department",
      entityId: department.id,
// @ts-expect-error - Legacy compatibility
      details: { name: department.name, code: department.code },
    });

    revalidatePath("/dashboard/hr/departments");
    return { success: true, department };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to create department" };
  }
}

export async function updateDepartment(
  departmentId: string,
  input: {
    name?: string;
    code?: string;
    description?: string;
    managerEmployeeId?: string | null;
    status?: string;
  }
) {
  try {
    const tenant = await getTenantContext();

    const existing = await prisma.department.findFirst({
      where: {
        id: departmentId,
        organizationId: tenant.organizationId,
      },
    });

    if (!existing) {
      return { success: false, error: "Department not found or unauthorized" };
    }

    // Validate manager if updating
    if (input.managerEmployeeId) {
      const manager = await prisma.employee.findUnique({
        where: { id: input.managerEmployeeId },
        select: { organizationId: true },
      });
      if (!manager) return { success: false, error: "Manager employee not found" };
      verifyParentTenantAccess(tenant.organizationId, manager.organizationId);
    }

    const updated = await prisma.department.update({
      where: { id: departmentId },
      data: {
        name: input.name !== undefined ? input.name.trim() : existing.name,
        code: input.code !== undefined ? input.code.trim().toUpperCase() : existing.code,
        description: input.description !== undefined ? input.description?.trim() || null : existing.description,
        managerEmployeeId: input.managerEmployeeId !== undefined ? input.managerEmployeeId : existing.managerEmployeeId,
        status: input.status !== undefined ? input.status : existing.status,
      },
    });

    await createUserLog({
      userId: tenant.userId,
// @ts-expect-error - Legacy compatibility
      action: LogAction.UPDATE,
      entity: "Department",
      entityId: updated.id,
// @ts-expect-error - Legacy compatibility
      details: { changes: input },
    });

    revalidatePath("/dashboard/hr/departments");
    return { success: true, department: updated };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to update department" };
  }
}
