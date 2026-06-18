"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logItemCreated, logItemUpdated, logItemDeleted } from "@/lib/user-log";
import { revalidateBothPaths } from "@/lib/route-utils-server";
import { type Prisma } from "@prisma/client";
import { hasPermission } from "@/lib/permissions";

export async function getHolidays(
  page: number = 1,
  limit: number = 10,
  search: string = "",
  status: "active" | "inactive" | "trash" | "all" = "all"
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Unauthorized", holidays: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 0 } };
    }

    const skip = (page - 1) * limit;
    const where: Prisma.HolidayWhereInput = {};

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

    const total = await prisma.holiday.count({ where });
    const holidays = await prisma.holiday.findMany({
      where,
      skip,
      take: limit,
      include: {
        warehouse: { select: { id: true, name: true } }
      },
      orderBy: { date: "desc" },
    });

    const totalPages = Math.ceil(total / limit);

    return {
      success: true,
      holidays,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  } catch (error) {
    console.error("getHolidays error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch holidays",
      holidays: [],
      pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
    };
  }
}

/**
 * Fetch all active holidays for a given year (for Calendar View)
 */
export async function getYearHolidays(year: number) {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Unauthorized", holidays: [] };
    }

    const yearStart = new Date(year, 0, 1);
    const yearEnd = new Date(year, 11, 31, 23, 59, 59);

    const holidays = await prisma.holiday.findMany({
      where: {
        isTrash: false,
        status: "active",
        date: { gte: yearStart, lte: yearEnd },
      },
      include: {
        warehouse: { select: { id: true, name: true } },
      },
      orderBy: { date: "asc" },
    });

    return { success: true, holidays };
  } catch (error) {
    console.error("getYearHolidays error:", error);
    return { success: false, error: "Failed to fetch holidays for calendar", holidays: [] };
  }
}


/**
 * Returns holiday statistics for the header info cards.
 */
export async function getHolidayStats() {
  try {
    const now   = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yearStart = new Date(now.getFullYear(), 0, 1);
    const yearEnd   = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const [totalThisYear, upcoming, thisMonth, nextHoliday] = await Promise.all([
      // Total active holidays this year
      prisma.holiday.count({
        where: { isTrash: false, status: "active", date: { gte: yearStart, lte: yearEnd } },
      }),
      // Upcoming (from today onwards, this year)
      prisma.holiday.count({
        where: { isTrash: false, status: "active", date: { gte: today, lte: yearEnd } },
      }),
      // This month
      prisma.holiday.count({
        where: { isTrash: false, status: "active", date: { gte: monthStart, lte: monthEnd } },
      }),
      // Next upcoming holiday
      prisma.holiday.findFirst({
        where: { isTrash: false, status: "active", date: { gte: today } },
        orderBy: { date: "asc" },
        select: { name: true, date: true },
      }),
    ]);

    const past = totalThisYear - upcoming;

    return {
      success: true,
      stats: {
        totalThisYear,
        upcoming,
        past,
        thisMonth,
        nextHoliday: nextHoliday
          ? { name: nextHoliday.name, date: nextHoliday.date }
          : null,
        currentYear: now.getFullYear(),
        currentMonth: now.toLocaleString("en-US", { month: "long" }),
      },
    };
  } catch (error) {
    console.error("getHolidayStats error:", error);
    return { success: false, stats: null };
  }
}

export async function createHoliday(input: {
  name: string;
  date: string;
  warehouseId?: string;
  status?: string;
}) {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Unauthorized", holiday: null };
    }

    const canCreate = await hasPermission(session.user.id, "hr.holidays", "create");
    if (!canCreate) {
      return { success: false, error: "You don't have permission to create holidays", holiday: null };
    }

    const holiday = await prisma.holiday.create({
      data: {
        name: input.name,
        date: new Date(input.date),
        warehouseId: input.warehouseId || null,
        status: input.status || "active",
        createdBy: session.user.id,
      },
    });

    await logItemCreated(session.user.id, "Holiday", holiday.id, holiday.name, holiday);
    revalidateBothPaths("hr/holidays");

    return { success: true, holiday };
  } catch (error) {
    console.error("createHoliday error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to create holiday", holiday: null };
  }
}

export async function updateHoliday(id: string, input: {
  name?: string;
  date?: string;
  warehouseId?: string | null;
  status?: string;
}) {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Unauthorized", holiday: null };
    }

    const canEdit = await hasPermission(session.user.id, "hr.holidays", "edit");
    if (!canEdit) {
      return { success: false, error: "You don't have permission to edit holidays", holiday: null };
    }

    const oldHoliday = await prisma.holiday.findUnique({ where: { id } });
    if (!oldHoliday) {
      return { success: false, error: "Holiday not found", holiday: null };
    }

    const holiday = await prisma.holiday.update({
      where: { id },
      data: {
        name: input.name,
        date: input.date ? new Date(input.date) : undefined,
        warehouseId: input.warehouseId === "" ? null : input.warehouseId,
        status: input.status,
      },
    });

    await logItemUpdated(session.user.id, "Holiday", holiday.id, ["Updated Holiday"], oldHoliday as any, holiday as any);
    revalidateBothPaths("hr/holidays");

    return { success: true, holiday };
  } catch (error) {
    console.error("updateHoliday error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to update holiday", holiday: null };
  }
}

export async function getHolidayById(id: string) {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Unauthorized", holiday: null };
    }

    const holiday = await prisma.holiday.findUnique({
      where: { id },
    });

    if (!holiday) {
      return { success: false, error: "Holiday not found", holiday: null };
    }

    return { success: true, holiday };
  } catch (error) {
    console.error("getHolidayById error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to fetch holiday", holiday: null };
  }
}

export async function trashHoliday(id: string) {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Unauthorized" };
    }

    const canTrash = await hasPermission(session.user.id, "hr.holidays", "move-to-trash");
    if (!canTrash) {
      return { success: false, error: "You don't have permission to move holidays to trash" };
    }

    const oldHoliday = await prisma.holiday.findUnique({ where: { id } });
    if (!oldHoliday) {
      return { success: false, error: "Holiday not found" };
    }

    const holiday = await prisma.holiday.update({
      where: { id },
      data: { isTrash: true, status: "trash" },
    });

    await logItemDeleted(session.user.id, "Holiday (Trash)", holiday.id, holiday.name);
    revalidateBothPaths("hr/holidays");

    return { success: true };
  } catch (error) {
    console.error("trashHoliday error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to move holiday to trash" };
  }
}

export async function bulkUpdateHolidayStatus(ids: string[], action: "trash" | "active" | "inactive" | "restore") {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Unauthorized" };
    }

    let requiredPermission = "edit";
    if (action === "trash") requiredPermission = "move-to-trash";
    
    const hasPerm = await hasPermission(session.user.id, "hr.holidays", requiredPermission as any);
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

    await prisma.holiday.updateMany({
      where: { id: { in: ids } },
      data,
    });

    revalidateBothPaths("hr/holidays");

    return { success: true };
  } catch (error) {
    console.error("bulkUpdateHolidayStatus error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to perform bulk action" };
  }
}
