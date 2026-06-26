"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logItemCreated, logItemUpdated, logItemDeleted } from "@/lib/user-log";
import { revalidateBothPaths } from "@/lib/route-utils-server";
import { type Prisma } from "@prisma/client";
import { hasPermission } from "@/lib/permissions";

export async function getEmployeeTypes(
  page: number = 1,
  limit: number = 10,
  search: string = "",
  status: "active" | "inactive" | "trash" | "all" = "all"
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Unauthorized", employeeTypes: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 0 } };
    }

    const skip = (page - 1) * limit;
    const where: Prisma.EmployeeTypeWhereInput = {};

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

    const total = await prisma.employeeType.count({ where });
    const employeeTypes = await prisma.employeeType.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
    });

    const totalPages = Math.ceil(total / limit);

    return {
      success: true,
      employeeTypes,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  } catch (error) {
    console.error("getEmployeeTypes error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch employee types",
      employeeTypes: [],
      pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
    };
  }
}

export async function createEmployeeType(input: {
  name: string;
  description?: string;
  status?: string;
}) {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Unauthorized", employeeType: null };
    }

    const canCreate = await hasPermission(session.user.id, "peoples.employees", "create") || session.user.role?.toLowerCase() === "admin";
    if (!canCreate) {
      return { success: false, error: "You don't have permission to create employee types", employeeType: null };
    }

    const employeeType = await prisma.employeeType.create({
      data: {
        name: input.name,
        description: input.description || null,
        status: input.status || "active",
        createdBy: session.user.id,
      },
    });

    await logItemCreated(session.user.id, "EmployeeType", employeeType.id, employeeType.name, employeeType);
    revalidateBothPaths("employees");

    return { success: true, employeeType };
  } catch (error) {
    console.error("createEmployeeType error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to create employee type", employeeType: null };
  }
}

export async function updateEmployeeType(id: string, input: {
  name?: string;
  description?: string;
  status?: string;
}) {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Unauthorized", employeeType: null };
    }

    const canEdit = await hasPermission(session.user.id, "peoples.employees", "edit") || session.user.role?.toLowerCase() === "admin";
    if (!canEdit) {
      return { success: false, error: "You don't have permission to edit employee types", employeeType: null };
    }

    const oldEmployeeType = await prisma.employeeType.findUnique({ where: { id } });
    if (!oldEmployeeType) {
      return { success: false, error: "Employee type not found", employeeType: null };
    }

    const employeeType = await prisma.employeeType.update({
      where: { id },
      data: {
        name: input.name,
        description: input.description !== undefined ? (input.description || null) : undefined,
        status: input.status,
      },
    });

    await logItemUpdated(session.user.id, "EmployeeType", employeeType.id, ["Updated EmployeeType"], oldEmployeeType as any, employeeType as any);
    revalidateBothPaths("employees");

    return { success: true, employeeType };
  } catch (error) {
    console.error("updateEmployeeType error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to update employee type", employeeType: null };
  }
}

export async function getEmployeeTypeById(id: string) {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Unauthorized", employeeType: null };
    }

    const employeeType = await prisma.employeeType.findUnique({
      where: { id },
    });

    if (!employeeType) {
      return { success: false, error: "Employee type not found", employeeType: null };
    }

    return { success: true, employeeType };
  } catch (error) {
    console.error("getEmployeeTypeById error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to fetch employee type", employeeType: null };
  }
}

export async function trashEmployeeType(id: string) {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Unauthorized" };
    }

    const canTrash = await hasPermission(session.user.id, "peoples.employees", "move-to-trash") || session.user.role?.toLowerCase() === "admin";
    if (!canTrash) {
      return { success: false, error: "You don't have permission to move employee types to trash" };
    }

    const oldEmployeeType = await prisma.employeeType.findUnique({ where: { id } });
    if (!oldEmployeeType) {
      return { success: false, error: "Employee type not found" };
    }

    // Check if any employee is currently using this type
    const employeeCount = await prisma.employee.count({
      where: { employeeTypeId: id, status: "active" },
    });
    if (employeeCount > 0) {
      return { success: false, error: `Cannot move to trash: ${employeeCount} active employees are currently assigned to this type.` };
    }

    const employeeType = await prisma.employeeType.update({
      where: { id },
      data: { isTrash: true, status: "trash" },
    });

    await logItemDeleted(session.user.id, "EmployeeType (Trash)", employeeType.id, employeeType.name);
    revalidateBothPaths("employees");

    return { success: true };
  } catch (error) {
    console.error("trashEmployeeType error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to move employee type to trash" };
  }
}

export async function bulkUpdateEmployeeTypeStatus(ids: string[], action: "trash" | "active" | "inactive" | "restore") {
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
      // Check if any employee is using any of these types
      const employeeCount = await prisma.employee.count({
        where: { employeeTypeId: { in: ids }, status: "active" },
      });
      if (employeeCount > 0) {
        return { success: false, error: `Cannot bulk delete: active employees are currently assigned to some of these types.` };
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

    await prisma.employeeType.updateMany({
      where: { id: { in: ids } },
      data,
    });

    revalidateBothPaths("employees");

    return { success: true };
  } catch (error) {
    console.error("bulkUpdateEmployeeTypeStatus error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to perform bulk action" };
  }
}
