"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logItemCreated, logItemUpdated, logItemDeleted } from "@/lib/user-log";
import { revalidateBothPaths } from "@/lib/route-utils-server";
import { type Prisma } from "@prisma/client";
import { hasPermission } from "@/lib/permissions";

export async function getFloors(
  page: number = 1,
  limit: number = 10,
  search: string = "",
  status: "active" | "inactive" | "trash" | "all" = "all"
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Unauthorized", floors: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 0 } };
    }

    const skip = (page - 1) * limit;
    const where: Prisma.FloorWhereInput = {};

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

    const total = await prisma.floor.count({ where });
    const floors = await prisma.floor.findMany({
      where,
      skip,
      take: limit,
      include: {
        _count: {
          select: { employees: true, lines: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const totalPages = Math.ceil(total / limit);

    return {
      success: true,
      floors,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  } catch (error) {
    console.error("getFloors error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch floors",
      floors: [],
      pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
    };
  }
}

export async function createFloor(input: {
  name: string;
  description?: string;
  status?: string;
}) {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Unauthorized", floor: null };
    }

    const canCreate = await hasPermission(session.user.id, "peoples.employees", "create") || session.user.role?.toLowerCase() === "admin";
    if (!canCreate) {
      return { success: false, error: "You don't have permission to create floors", floor: null };
    }

    const existing = await prisma.floor.findUnique({
      where: { name: input.name }
    });
    if (existing) {
      return { success: false, error: "Floor name already exists", floor: null };
    }

    const floor = await prisma.floor.create({
      data: {
        name: input.name,
        description: input.description || null,
        status: input.status || "active",
        createdBy: session.user.id,
      },
    });

    await logItemCreated(session.user.id, "Floor", floor.id, floor.name, floor);
    revalidateBothPaths("employees");

    return { success: true, floor };
  } catch (error) {
    console.error("createFloor error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to create floor", floor: null };
  }
}

export async function updateFloor(id: string, input: {
  name?: string;
  description?: string;
  status?: string;
}) {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Unauthorized", floor: null };
    }

    const canEdit = await hasPermission(session.user.id, "peoples.employees", "edit") || session.user.role?.toLowerCase() === "admin";
    if (!canEdit) {
      return { success: false, error: "You don't have permission to edit floors", floor: null };
    }

    const oldFloor = await prisma.floor.findUnique({ where: { id } });
    if (!oldFloor) {
      return { success: false, error: "Floor not found", floor: null };
    }

    if (input.name && input.name !== oldFloor.name) {
      const existing = await prisma.floor.findUnique({
        where: { name: input.name }
      });
      if (existing) {
        return { success: false, error: "Floor name already exists", floor: null };
      }
    }

    const floor = await prisma.floor.update({
      where: { id },
      data: {
        name: input.name,
        description: input.description !== undefined ? (input.description || null) : undefined,
        status: input.status,
      },
    });

    await logItemUpdated(session.user.id, "Floor", floor.id, ["Updated Floor"], oldFloor as any, floor as any);
    revalidateBothPaths("employees");

    return { success: true, floor };
  } catch (error) {
    console.error("updateFloor error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to update floor", floor: null };
  }
}

export async function getFloorById(id: string) {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Unauthorized", floor: null };
    }

    const floor = await prisma.floor.findUnique({
      where: { id },
      include: { lines: true },
    });

    if (!floor) {
      return { success: false, error: "Floor not found", floor: null };
    }

    return { success: true, floor };
  } catch (error) {
    console.error("getFloorById error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to fetch floor", floor: null };
  }
}

export async function trashFloor(id: string) {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Unauthorized" };
    }

    const canTrash = await hasPermission(session.user.id, "peoples.employees", "move-to-trash") || session.user.role?.toLowerCase() === "admin";
    if (!canTrash) {
      return { success: false, error: "You don't have permission to move floors to trash" };
    }

    const employeeCount = await prisma.employee.count({
      where: { floorId: id, status: "active" },
    });
    if (employeeCount > 0) {
      return { success: false, error: `Cannot move to trash: ${employeeCount} active employees are currently assigned to this floor.` };
    }

    const floor = await prisma.floor.update({
      where: { id },
      data: { isTrash: true, status: "trash" },
    });

    await logItemDeleted(session.user.id, "Floor (Trash)", floor.id, floor.name);
    revalidateBothPaths("employees");

    return { success: true };
  } catch (error) {
    console.error("trashFloor error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to move floor to trash" };
  }
}

export async function bulkUpdateFloorStatus(ids: string[], action: "trash" | "active" | "inactive" | "restore") {
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
        where: { floorId: { in: ids }, status: "active" },
      });
      if (employeeCount > 0) {
        return { success: false, error: `Cannot bulk delete: active employees are currently assigned to some of these floors.` };
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

    await prisma.floor.updateMany({
      where: { id: { in: ids } },
      data,
    });

    revalidateBothPaths("employees");

    return { success: true };
  } catch (error) {
    console.error("bulkUpdateFloorStatus error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to perform bulk action" };
  }
}
