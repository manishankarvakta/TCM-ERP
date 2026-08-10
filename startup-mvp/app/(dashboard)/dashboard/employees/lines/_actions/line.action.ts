"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logItemCreated, logItemUpdated, logItemDeleted } from "@/lib/user-log";
import { revalidateBothPaths } from "@/lib/route-utils-server";
import { type Prisma } from "@prisma/client";
import { hasPermission } from "@/lib/permissions";

export async function getLines(
  page: number = 1,
  limit: number = 10,
  search: string = "",
  status: "active" | "inactive" | "trash" | "all" = "all",
  floorId?: string
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Unauthorized", lines: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 0 } };
    }

    const skip = (page - 1) * limit;
    const where: Prisma.LineWhereInput = {};

    if (search) {
      where.name = { contains: search, mode: "insensitive" };
    }

    if (floorId && floorId !== "all") {
      where.floorId = floorId;
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

    const total = await prisma.line.count({ where });
    const lines = await prisma.line.findMany({
      where,
      skip,
      take: limit,
      include: {
        floor: {
          select: { id: true, name: true },
        },
        _count: {
          select: { employees: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const totalPages = Math.ceil(total / limit);

    return {
      success: true,
      lines,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  } catch (error) {
    console.error("getLines error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch lines",
      lines: [],
      pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
    };
  }
}

export async function createLine(input: {
  name: string;
  description?: string;
  floorId?: string;
  status?: string;
}) {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Unauthorized", line: null };
    }

    const canCreate = await hasPermission(session.user.id, "peoples.employees", "create") || session.user.role?.toLowerCase() === "admin";
    if (!canCreate) {
      return { success: false, error: "You don't have permission to create lines", line: null };
    }

    const existing = await prisma.line.findUnique({
      where: { name: input.name }
    });
    if (existing) {
      return { success: false, error: "Line name already exists", line: null };
    }

    const line = await prisma.line.create({
      data: {
        name: input.name,
        description: input.description || null,
        floorId: input.floorId || null,
        status: input.status || "active",
        createdBy: session.user.id,
      },
    });

    await logItemCreated(session.user.id, "Line", line.id, line.name, line);
    revalidateBothPaths("employees");

    return { success: true, line };
  } catch (error) {
    console.error("createLine error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to create line", line: null };
  }
}

export async function updateLine(id: string, input: {
  name?: string;
  description?: string;
  floorId?: string;
  status?: string;
}) {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Unauthorized", line: null };
    }

    const canEdit = await hasPermission(session.user.id, "peoples.employees", "edit") || session.user.role?.toLowerCase() === "admin";
    if (!canEdit) {
      return { success: false, error: "You don't have permission to edit lines", line: null };
    }

    const oldLine = await prisma.line.findUnique({ where: { id } });
    if (!oldLine) {
      return { success: false, error: "Line not found", line: null };
    }

    if (input.name && input.name !== oldLine.name) {
      const existing = await prisma.line.findUnique({
        where: { name: input.name }
      });
      if (existing) {
        return { success: false, error: "Line name already exists", line: null };
      }
    }

    const line = await prisma.line.update({
      where: { id },
      data: {
        name: input.name,
        description: input.description !== undefined ? (input.description || null) : undefined,
        floorId: input.floorId !== undefined ? (input.floorId || null) : undefined,
        status: input.status,
      },
    });

    await logItemUpdated(session.user.id, "Line", line.id, ["Updated Line"], oldLine as any, line as any);
    revalidateBothPaths("employees");

    return { success: true, line };
  } catch (error) {
    console.error("updateLine error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to update line", line: null };
  }
}

export async function getLineById(id: string) {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Unauthorized", line: null };
    }

    const line = await prisma.line.findUnique({
      where: { id },
      include: { floor: true },
    });

    if (!line) {
      return { success: false, error: "Line not found", line: null };
    }

    return { success: true, line };
  } catch (error) {
    console.error("getLineById error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to fetch line", line: null };
  }
}

export async function trashLine(id: string) {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Unauthorized" };
    }

    const canTrash = await hasPermission(session.user.id, "peoples.employees", "move-to-trash") || session.user.role?.toLowerCase() === "admin";
    if (!canTrash) {
      return { success: false, error: "You don't have permission to move lines to trash" };
    }

    const employeeCount = await prisma.employee.count({
      where: { lineId: id, status: "active" },
    });
    if (employeeCount > 0) {
      return { success: false, error: `Cannot move to trash: ${employeeCount} active employees are currently assigned to this line.` };
    }

    const line = await prisma.line.update({
      where: { id },
      data: { isTrash: true, status: "trash" },
    });

    await logItemDeleted(session.user.id, "Line (Trash)", line.id, line.name);
    revalidateBothPaths("employees");

    return { success: true };
  } catch (error) {
    console.error("trashLine error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to move line to trash" };
  }
}

export async function bulkUpdateLineStatus(ids: string[], action: "trash" | "active" | "inactive" | "restore") {
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
      const employeeCount = await prisma.employee.count({
        where: { lineId: { in: ids }, status: "active" },
      });
      if (employeeCount > 0) {
        return { success: false, error: `Cannot bulk delete: active employees are currently assigned to some of these lines.` };
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

    await prisma.line.updateMany({
      where: { id: { in: ids } },
      data,
    });

    revalidateBothPaths("employees");

    return { success: true };
  } catch (error) {
    console.error("bulkUpdateLineStatus error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to perform bulk action" };
  }
}
