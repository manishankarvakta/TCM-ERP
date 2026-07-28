"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logItemCreated, logItemUpdated, logItemDeleted } from "@/lib/user-log";
import { revalidateBothPaths } from "@/lib/route-utils-server";
import { type Prisma } from "@prisma/client";
import { hasPermission } from "@/lib/permissions";

/**
 * Get paginated list of shifts
 */
export async function getShifts(
  page: number = 1,
  limit: number = 10,
  search: string = "",
  status: "active" | "inactive" | "trash" | "all" = "all"
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Unauthorized", shifts: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 0 } };
    }

    const skip = (page - 1) * limit;
    const where: Prisma.ShiftWhereInput = {};

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

    const total = await prisma.shift.count({ where });
    const shifts = await prisma.shift.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
    });

    const totalPages = Math.ceil(total / limit);

    return {
      success: true,
      shifts,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  } catch (error) {
    console.error("getShifts error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch shifts",
      shifts: [],
      pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
    };
  }
}

/**
 * Create a new shift
 */
export async function createShift(input: {
  name: string;
  startTime: string;
  endTime: string;
  breakStartTime?: string | null;
  breakEndTime?: string | null;
  breakGraceMinutes?: number;
  breakLateAfter?: number;
  breakType?: string;
  breakDuration?: number;
  graceMinutes?: number;
  lateAfter?: number;
  halfDayAfter?: number;
  otStartAfter?: number;
  status?: string;
}) {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Unauthorized", shift: null };
    }

    const canCreate = await hasPermission(session.user.id, "hr.shifts", "create");
    if (!canCreate) {
      return { success: false, error: "You don't have permission to create shifts", shift: null };
    }

    const shift = await prisma.shift.create({
      data: {
        name: input.name,
        startTime: input.startTime,
        endTime: input.endTime,
        breakStartTime: input.breakStartTime,
        breakEndTime: input.breakEndTime,
        breakGraceMinutes: input.breakGraceMinutes ?? 0,
        breakLateAfter: input.breakLateAfter ?? 15,
        breakType: input.breakType || "NONE",
        breakDuration: input.breakDuration ?? 0,
        graceMinutes: input.graceMinutes ?? 0,
        lateAfter: input.lateAfter ?? 15,
        halfDayAfter: input.halfDayAfter ?? 120,
        otStartAfter: input.otStartAfter ?? 30,
        status: input.status || "active",
        createdBy: session.user.id,
      },
    });

    await logItemCreated(session.user.id, "Shift", shift.id, shift.name, shift);
    revalidateBothPaths("hr/shifts");

    return { success: true, shift };
  } catch (error) {
    console.error("createShift error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to create shift", shift: null };
  }
}

/**
 * Update an existing shift
 */
export async function updateShift(id: string, input: {
  name?: string;
  startTime?: string;
  endTime?: string;
  breakStartTime?: string | null;
  breakEndTime?: string | null;
  breakGraceMinutes?: number;
  breakLateAfter?: number;
  breakType?: string;
  breakDuration?: number;
  graceMinutes?: number;
  lateAfter?: number;
  halfDayAfter?: number;
  otStartAfter?: number;
  status?: string;
}) {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Unauthorized", shift: null };
    }

    const canEdit = await hasPermission(session.user.id, "hr.shifts", "edit");
    if (!canEdit) {
      return { success: false, error: "You don't have permission to edit shifts", shift: null };
    }

    const oldShift = await prisma.shift.findUnique({ where: { id } });
    if (!oldShift) {
      return { success: false, error: "Shift not found", shift: null };
    }

    const shift = await prisma.shift.update({
      where: { id },
      data: {
        name: input.name,
        startTime: input.startTime,
        endTime: input.endTime,
        breakStartTime: input.breakStartTime,
        breakEndTime: input.breakEndTime,
        breakGraceMinutes: input.breakGraceMinutes,
        breakLateAfter: input.breakLateAfter,
        breakType: input.breakType,
        breakDuration: input.breakDuration,
        graceMinutes: input.graceMinutes,
        lateAfter: input.lateAfter,
        halfDayAfter: input.halfDayAfter,
        otStartAfter: input.otStartAfter,
        status: input.status,
      },
    });

    await logItemUpdated(session.user.id, "Shift", shift.id, ["Updated Shift"], oldShift as any, shift as any);
    revalidateBothPaths("hr/shifts");

    return { success: true, shift };
  } catch (error) {
    console.error("updateShift error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to update shift", shift: null };
  }
}

/**
 * Move shift to trash
 */
export async function trashShift(id: string) {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Unauthorized" };
    }

    const canTrash = await hasPermission(session.user.id, "hr.shifts", "move-to-trash");
    if (!canTrash) {
      return { success: false, error: "You don't have permission to move shifts to trash" };
    }

    const oldShift = await prisma.shift.findUnique({ where: { id } });
    if (!oldShift) {
      return { success: false, error: "Shift not found" };
    }

    const shift = await prisma.shift.update({
      where: { id },
      data: { isTrash: true, status: "trash" },
    });

    await logItemDeleted(session.user.id, "Shift (Trash)", shift.id, shift.name);
    revalidateBothPaths("hr/shifts");

    return { success: true };
  } catch (error) {
    console.error("trashShift error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to move shift to trash" };
  }
}

/**
 * Bulk action on shifts
 */
export async function bulkUpdateShiftStatus(ids: string[], action: "trash" | "active" | "inactive" | "restore") {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Unauthorized" };
    }

    let requiredPermission = "edit";
    if (action === "trash") requiredPermission = "move-to-trash";
    
    const hasPerm = await hasPermission(session.user.id, "hr.shifts", requiredPermission as any);
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

    await prisma.shift.updateMany({
      where: { id: { in: ids } },
      data,
    });

    revalidateBothPaths("hr/shifts");

    return { success: true };
  } catch (error) {
    console.error("bulkUpdateShiftStatus error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to perform bulk action" };
  }
}

/**
 * Get a single shift by ID
 */
export async function getShiftById(id: string) {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Unauthorized", shift: null };
    }

    const shift = await prisma.shift.findUnique({
      where: { id },
    });

    if (!shift) {
      return { success: false, error: "Shift not found", shift: null };
    }

    return { success: true, shift };
  } catch (error) {
    console.error("getShiftById error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to fetch shift", shift: null };
  }
}
