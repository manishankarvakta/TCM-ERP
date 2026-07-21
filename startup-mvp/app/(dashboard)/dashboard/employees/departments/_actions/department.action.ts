"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logItemCreated, logItemUpdated, logItemDeleted } from "@/lib/user-log";
import { revalidateBothPaths } from "@/lib/route-utils-server";
import { type Prisma } from "@prisma/client";
import { hasPermission } from "@/lib/permissions";

export async function getDepartments(
  page: number = 1,
  limit: number = 10,
  search: string = "",
  status: "active" | "inactive" | "trash" | "all" = "all"
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Unauthorized", departments: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 0 } };
    }

    const skip = (page - 1) * limit;
    const where: Prisma.DepartmentWhereInput = {};

    if (search) {
      where.name = { contains: search, mode: "insensitive" };
    }

    if (status === "trash") {
      where.isTrash = true;
    } else if (status === "active") {
      where.isTrash = false;
      where.status = "active";
    } else if (status === "inactive") {
      where.isTrash = false;
      where.status = "inactive";
    } else if (status === "all") {
      where.isTrash = false;
    }

    const total = await prisma.department.count({ where });
    const departments = await prisma.department.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
    });

    const totalPages = Math.ceil(total / limit);

    return {
      success: true,
      departments,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  } catch (error) {
    console.error("getDepartments error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch departments",
      departments: [],
      pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
    };
  }
}

export async function createDepartment(input: {
  name: string;
  description?: string;
  status?: string;
}) {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Unauthorized", department: null };
    }

    const canCreate = await hasPermission(session.user.id, "peoples.employees", "create") || session.user.role?.toLowerCase() === "admin";
    if (!canCreate) {
      return { success: false, error: "You don't have permission to create departments", department: null };
    }

    // Check duplicate name
    const existing = await prisma.department.findUnique({
      where: { name: input.name }
    });
    if (existing) {
      return { success: false, error: "Department name already exists", department: null };
    }

    const department = await prisma.department.create({
      data: {
        name: input.name,
        description: input.description || null,
        status: input.status || "active",
        createdBy: session.user.id,
      },
    });

    await logItemCreated(session.user.id, "Department", department.id, department.name, department);
    revalidateBothPaths("employees");

    return { success: true, department };
  } catch (error) {
    console.error("createDepartment error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to create department", department: null };
  }
}

export async function updateDepartment(id: string, input: {
  name?: string;
  description?: string;
  status?: string;
}) {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Unauthorized", department: null };
    }

    const canEdit = await hasPermission(session.user.id, "peoples.employees", "edit") || session.user.role?.toLowerCase() === "admin";
    if (!canEdit) {
      return { success: false, error: "You don't have permission to edit departments", department: null };
    }

    const oldDepartment = await prisma.department.findUnique({ where: { id } });
    if (!oldDepartment) {
      return { success: false, error: "Department not found", department: null };
    }

    // Check duplicate name if name changed
    if (input.name && input.name !== oldDepartment.name) {
      const existing = await prisma.department.findUnique({
        where: { name: input.name }
      });
      if (existing) {
        return { success: false, error: "Department name already exists", department: null };
      }
    }

    const department = await prisma.department.update({
      where: { id },
      data: {
        name: input.name,
        description: input.description !== undefined ? (input.description || null) : undefined,
        status: input.status,
      },
    });

    await logItemUpdated(session.user.id, "Department", department.id, ["Updated Department"], oldDepartment as any, department as any);
    revalidateBothPaths("employees");

    return { success: true, department };
  } catch (error) {
    console.error("updateDepartment error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to update department", department: null };
  }
}

export async function getDepartmentById(id: string) {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Unauthorized", department: null };
    }

    const department = await prisma.department.findUnique({
      where: { id },
    });

    if (!department) {
      return { success: false, error: "Department not found", department: null };
    }

    return { success: true, department };
  } catch (error) {
    console.error("getDepartmentById error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to fetch department", department: null };
  }
}

export async function trashDepartment(id: string) {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Unauthorized" };
    }

    const canTrash = await hasPermission(session.user.id, "peoples.employees", "move-to-trash") || session.user.role?.toLowerCase() === "admin";
    if (!canTrash) {
      return { success: false, error: "You don't have permission to move departments to trash" };
    }

    const oldDepartment = await prisma.department.findUnique({ where: { id } });
    if (!oldDepartment) {
      return { success: false, error: "Department not found" };
    }

    // Check if any employee is currently using this department
    const employeeCount = await prisma.employee.count({
      where: { departmentId: id, status: "active" },
    });
    if (employeeCount > 0) {
      return { success: false, error: `Cannot move to trash: ${employeeCount} active employees are currently assigned to this department.` };
    }

    const department = await prisma.department.update({
      where: { id },
      data: { isTrash: true, status: "trash" },
    });

    await logItemDeleted(session.user.id, "Department (Trash)", department.id, department.name);
    revalidateBothPaths("employees");

    return { success: true };
  } catch (error) {
    console.error("trashDepartment error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to move department to trash" };
  }
}

export async function bulkUpdateDepartmentStatus(ids: string[], action: "trash" | "active" | "inactive" | "restore") {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Unauthorized" };
    }

    let requiredPermission = "edit";
    if (action === "trash") requiredPermission = "move-to-trash";
    
    const hasPerm = await hasPermission(session.user.id, "peoples.employees", requiredPermission as any) || session.user.role?.toLowerCase() === "admin";
    if (!hasPerm) {
      return { success: false, error: `You don't have permission to perform bulk ${action}` };
    }

    if (action === "trash") {
      // Check if any employee is using any of these departments
      const employeeCount = await prisma.employee.count({
        where: { departmentId: { in: ids }, status: "active" },
      });
      if (employeeCount > 0) {
        return { success: false, error: `Cannot bulk delete: active employees are currently assigned to some of these departments.` };
      }
    }

    const data: any = {};
    if (action === "trash") {
      data.isTrash = true;
      data.status = "trash";
    } else if (action === "restore") {
      data.isTrash = false;
      data.status = "active";
    } else {
      data.isTrash = false;
      data.status = action;
    }

    await prisma.department.updateMany({
      where: { id: { in: ids } },
      data,
    });

    revalidateBothPaths("employees");

    return { success: true };
  } catch (error) {
    console.error("bulkUpdateDepartmentStatus error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to perform bulk action" };
  }
}
