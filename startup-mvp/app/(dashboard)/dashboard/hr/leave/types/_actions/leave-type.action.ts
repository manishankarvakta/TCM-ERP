"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logItemCreated, logItemUpdated, logItemDeleted } from "@/lib/user-log";
import { revalidateBothPaths } from "@/lib/route-utils-server";
import { type Prisma, LeaveCategory } from "@prisma/client";
import { hasPermission } from "@/lib/permissions";

export async function getLeaveTypes(
  page: number = 1,
  limit: number = 10,
  search: string = "",
  status: "active" | "inactive" | "trash" | "all" = "all"
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Unauthorized", leaveTypes: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 0 } };
    }

    const skip = (page - 1) * limit;
    const where: Prisma.LeaveTypeWhereInput = {};

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

    const total = await prisma.leaveType.count({ where });
    const leaveTypes = await prisma.leaveType.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
    });

    const totalPages = Math.ceil(total / limit);

    return {
      success: true,
      leaveTypes,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  } catch (error) {
    console.error("getLeaveTypes error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch leave types",
      leaveTypes: [],
      pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
    };
  }
}

export async function createLeaveType(input: {
  name: string;
  category: LeaveCategory;
  defaultDays: number;
  isPaid: boolean;
  status?: string;
}) {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Unauthorized", leaveType: null };
    }

    // Checking hr.leave permission since we didn't define hr.leave_types separately
    const canCreate = await hasPermission(session.user.id, "hr.leave", "create");
    if (!canCreate) {
      return { success: false, error: "You don't have permission to create leave types", leaveType: null };
    }

    const leaveType = await prisma.leaveType.create({
      data: {
        name: input.name,
        category: input.category,
        defaultDays: input.defaultDays,
        isPaid: input.isPaid,
        status: input.status || "active",
        createdBy: session.user.id,
      },
    });

    await logItemCreated(session.user.id, "LeaveType", leaveType.id, leaveType.name, leaveType);
    revalidateBothPaths("hr/leave/types");
    revalidateBothPaths("hr/leave/apply"); // In case it's used there

    return { success: true, leaveType };
  } catch (error) {
    console.error("createLeaveType error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to create leave type", leaveType: null };
  }
}

export async function updateLeaveType(id: string, input: {
  name?: string;
  category?: LeaveCategory;
  defaultDays?: number;
  isPaid?: boolean;
  status?: string;
}) {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Unauthorized", leaveType: null };
    }

    const canEdit = await hasPermission(session.user.id, "hr.leave", "edit");
    if (!canEdit) {
      return { success: false, error: "You don't have permission to edit leave types", leaveType: null };
    }

    const oldLeaveType = await prisma.leaveType.findUnique({ where: { id } });
    if (!oldLeaveType) {
      return { success: false, error: "Leave type not found", leaveType: null };
    }

    const leaveType = await prisma.leaveType.update({
      where: { id },
      data: {
        name: input.name,
        category: input.category,
        defaultDays: input.defaultDays,
        isPaid: input.isPaid,
        status: input.status,
      },
    });

    await logItemUpdated(session.user.id, "LeaveType", leaveType.id, ["Updated LeaveType"], oldLeaveType as any, leaveType as any);
    revalidateBothPaths("hr/leave/types");
    revalidateBothPaths("hr/leave/apply");

    return { success: true, leaveType };
  } catch (error) {
    console.error("updateLeaveType error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to update leave type", leaveType: null };
  }
}

export async function getLeaveTypeById(id: string) {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Unauthorized", leaveType: null };
    }

    const leaveType = await prisma.leaveType.findUnique({
      where: { id },
    });

    if (!leaveType) {
      return { success: false, error: "Leave type not found", leaveType: null };
    }

    return { success: true, leaveType };
  } catch (error) {
    console.error("getLeaveTypeById error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to fetch leave type", leaveType: null };
  }
}

export async function trashLeaveType(id: string) {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Unauthorized" };
    }

    const canTrash = await hasPermission(session.user.id, "hr.leave", "move-to-trash");
    if (!canTrash) {
      return { success: false, error: "You don't have permission to move leave types to trash" };
    }

    const oldLeaveType = await prisma.leaveType.findUnique({ where: { id } });
    if (!oldLeaveType) {
      return { success: false, error: "Leave type not found" };
    }

    const leaveType = await prisma.leaveType.update({
      where: { id },
      data: { isTrash: true, status: "trash" },
    });

    await logItemDeleted(session.user.id, "LeaveType (Trash)", leaveType.id, leaveType.name);
    revalidateBothPaths("hr/leave/types");

    return { success: true };
  } catch (error) {
    console.error("trashLeaveType error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to move leave type to trash" };
  }
}

export async function bulkUpdateLeaveTypeStatus(ids: string[], action: "trash" | "active" | "inactive" | "restore") {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Unauthorized" };
    }

    let requiredPermission = "edit";
    if (action === "trash") requiredPermission = "move-to-trash";
    
    const hasPerm = await hasPermission(session.user.id, "hr.leave", requiredPermission as any);
    if (!hasPerm) {
      return { success: false, error: `You don't have permission to perform bulk ${action}` };
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

    await prisma.leaveType.updateMany({
      where: { id: { in: ids } },
      data,
    });

    revalidateBothPaths("hr/leave/types");

    return { success: true };
  } catch (error) {
    console.error("bulkUpdateLeaveTypeStatus error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to perform bulk action" };
  }
}
