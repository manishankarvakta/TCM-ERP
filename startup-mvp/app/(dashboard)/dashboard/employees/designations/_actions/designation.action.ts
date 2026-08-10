"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logItemCreated, logItemUpdated, logItemDeleted } from "@/lib/user-log";
import { revalidateBothPaths } from "@/lib/route-utils-server";
import { type Prisma } from "@prisma/client";
import { hasPermission } from "@/lib/permissions";

export async function getDesignations(
  page: number = 1,
  limit: number = 10,
  search: string = "",
  status: "active" | "inactive" | "trash" | "all" = "all"
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Unauthorized", designations: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 0 } };
    }

    const skip = (page - 1) * limit;
    const where: Prisma.DesignationWhereInput = {};

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

    const total = await prisma.designation.count({ where });
    const designations = await prisma.designation.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
    });

    const totalPages = Math.ceil(total / limit);

    return {
      success: true,
      designations,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  } catch (error) {
    console.error("getDesignations error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch designations",
      designations: [],
      pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
    };
  }
}

export async function createDesignation(input: {
  name: string;
  description?: string;
  status?: string;
}) {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Unauthorized", designation: null };
    }

    const canCreate = await hasPermission(session.user.id, "peoples.employees", "create") || session.user.role?.toLowerCase() === "admin";
    if (!canCreate) {
      return { success: false, error: "You don't have permission to create designations", designation: null };
    }

    // Check duplicate name
    const existing = await prisma.designation.findUnique({
      where: { name: input.name }
    });
    if (existing) {
      return { success: false, error: "Designation name already exists", designation: null };
    }

    const designation = await prisma.designation.create({
      data: {
        name: input.name,
        description: input.description || null,
        status: input.status || "active",
        createdBy: session.user.id,
      },
    });

    await logItemCreated(session.user.id, "Designation", designation.id, designation.name, designation);
    revalidateBothPaths("employees");

    return { success: true, designation };
  } catch (error) {
    console.error("createDesignation error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to create designation", designation: null };
  }
}

export async function updateDesignation(id: string, input: {
  name?: string;
  description?: string;
  status?: string;
}) {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Unauthorized", designation: null };
    }

    const canEdit = await hasPermission(session.user.id, "peoples.employees", "edit") || session.user.role?.toLowerCase() === "admin";
    if (!canEdit) {
      return { success: false, error: "You don't have permission to edit designations", designation: null };
    }

    const oldDesignation = await prisma.designation.findUnique({ where: { id } });
    if (!oldDesignation) {
      return { success: false, error: "Designation not found", designation: null };
    }

    // Check duplicate name if name changed
    if (input.name && input.name !== oldDesignation.name) {
      const existing = await prisma.designation.findUnique({
        where: { name: input.name }
      });
      if (existing) {
        return { success: false, error: "Designation name already exists", designation: null };
      }
    }

    const designation = await prisma.designation.update({
      where: { id },
      data: {
        name: input.name,
        description: input.description !== undefined ? (input.description || null) : undefined,
        status: input.status,
      },
    });

    await logItemUpdated(session.user.id, "Designation", designation.id, ["Updated Designation"], oldDesignation as any, designation as any);
    revalidateBothPaths("employees");

    return { success: true, designation };
  } catch (error) {
    console.error("updateDesignation error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to update designation", designation: null };
  }
}

export async function getDesignationById(id: string) {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Unauthorized", designation: null };
    }

    const designation = await prisma.designation.findUnique({
      where: { id },
    });

    if (!designation) {
      return { success: false, error: "Designation not found", designation: null };
    }

    return { success: true, designation };
  } catch (error) {
    console.error("getDesignationById error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to fetch designation", designation: null };
  }
}

export async function trashDesignation(id: string) {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Unauthorized" };
    }

    const canTrash = await hasPermission(session.user.id, "peoples.employees", "move-to-trash") || session.user.role?.toLowerCase() === "admin";
    if (!canTrash) {
      return { success: false, error: "You don't have permission to move designations to trash" };
    }

    const oldDesignation = await prisma.designation.findUnique({ where: { id } });
    if (!oldDesignation) {
      return { success: false, error: "Designation not found" };
    }

    // Check if any employee is currently using this designation
    const employeeCount = await prisma.employee.count({
      where: { designationId: id, status: "active" },
    });
    if (employeeCount > 0) {
      return { success: false, error: `Cannot move to trash: ${employeeCount} active employees are currently assigned to this designation.` };
    }

    const designation = await prisma.designation.update({
      where: { id },
      data: { isTrash: true, status: "trash" },
    });

    await logItemDeleted(session.user.id, "Designation (Trash)", designation.id, designation.name);
    revalidateBothPaths("employees");

    return { success: true };
  } catch (error) {
    console.error("trashDesignation error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to move designation to trash" };
  }
}

export async function bulkUpdateDesignationStatus(ids: string[], action: "trash" | "active" | "inactive" | "restore") {
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
      // Check if any employee is using any of these designations
      const employeeCount = await prisma.employee.count({
        where: { designationId: { in: ids }, status: "active" },
      });
      if (employeeCount > 0) {
        return { success: false, error: `Cannot bulk delete: active employees are currently assigned to some of these designations.` };
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

    await prisma.designation.updateMany({
      where: { id: { in: ids } },
      data,
    });

    revalidateBothPaths("employees");

    return { success: true };
  } catch (error) {
    console.error("bulkUpdateDesignationStatus error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to perform bulk action" };
  }
}
