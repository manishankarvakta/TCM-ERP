"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { revalidatePath } from "next/cache";
import { BonusStatus, Prisma } from "@prisma/client";

function revalidateBonuses() {
  revalidatePath("/dashboard/hr/bonuses");
  revalidatePath("/dashboard/hr/payroll");
}

function isUserAdmin(role?: string | null): boolean {
  if (!role) return false;
  const r = role.toLowerCase();
  return r === "admin" || r === "super admin" || r === "superadmin";
}

export async function getBonuses(
  page = 1,
  limit = 10,
  search = "",
  status?: BonusStatus | "ALL",
  tab = "all"
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized", bonuses: [], pagination: null };
    }

    const isAdmin = isUserAdmin(session.user.role);
    const canView = isAdmin || (await hasPermission(session.user.id, "hr.bonuses", "view"));
    if (!canView) {
      return { success: false, error: "Permission denied", bonuses: [], pagination: null };
    }

    const skip = (page - 1) * limit;
    const where: Prisma.EmployeeBonusWhereInput = {
      isTrash: tab === "trash",
    };

    if (status && status !== "ALL") {
      where.status = status;
    }

    if (search.trim()) {
      where.OR = [
        { reason: { contains: search, mode: "insensitive" } },
        { employee: { name: { contains: search, mode: "insensitive" } } },
        { employee: { employeeCode: { contains: search, mode: "insensitive" } } },
      ];
    }

    const total = await prisma.employeeBonus.count({ where });
    const bonuses = await prisma.employeeBonus.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        employee: {
          select: {
            id: true,
            name: true,
            employeeCode: true,
            designation: true,
            department: true,
            photo: true,
          },
        },
        creator: {
          select: {
            name: true,
          },
        },
        approver: {
          select: {
            name: true,
          },
        },
      },
    });

    const serializedBonuses = bonuses.map((b) => ({
      ...b,
      amount: Number(b.amount),
    }));

    return {
      success: true,
      bonuses: serializedBonuses,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  } catch (error) {
    console.error("getBonuses error:", error);
    const errMsg = error instanceof Error ? error.message : "Failed to fetch bonuses";
    return { success: false, error: errMsg, bonuses: [], pagination: null };
  }
}

export async function createBonus(data: {
  employeeId: string;
  amount: number;
  bonusDate: string;
  reason: string;
}) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized: Invalid session" };
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, role: true },
    });

    if (!dbUser) {
      return { success: false, error: "User profile not found in database." };
    }

    const isAdmin = isUserAdmin(session.user.role) || isUserAdmin(dbUser.role);
    const canCreate = isAdmin || (await hasPermission(session.user.id, "hr.bonuses", "create"));
    if (!canCreate) {
      return { success: false, error: "You do not have permission to add bonuses." };
    }

    if (!data.employeeId || !data.amount || data.amount <= 0 || !data.reason?.trim()) {
      return { success: false, error: "Please fill all required fields with valid values." };
    }

    const bonusDateObj = new Date(data.bonusDate);
    if (isNaN(bonusDateObj.getTime())) {
      return { success: false, error: "Invalid bonus date format." };
    }

    const employee = await prisma.employee.findUnique({
      where: { id: data.employeeId },
      select: { id: true },
    });

    if (!employee) {
      return { success: false, error: "Employee not found." };
    }

    const bonus = await prisma.employeeBonus.create({
      data: {
        employeeId: data.employeeId,
        amount: data.amount,
        bonusDate: bonusDateObj,
        reason: data.reason.trim(),
        status: "PENDING",
        createdBy: dbUser.id,
      },
    });

    revalidateBonuses();
    return { success: true, bonusId: bonus.id, message: "Bonus recorded successfully." };
  } catch (error) {
    console.error("createBonus error:", error);
    const errMsg = error instanceof Error ? error.message : "Failed to create bonus";
    return { success: false, error: errMsg };
  }
}

export async function updateBonus(
  id: string,
  data: {
    employeeId: string;
    amount: number;
    bonusDate: string;
    reason: string;
  }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, role: true },
    });

    const isAdmin = isUserAdmin(session.user.role) || isUserAdmin(dbUser?.role);
    const canEdit = isAdmin || (await hasPermission(session.user.id, "hr.bonuses", "edit"));
    if (!canEdit) {
      return { success: false, error: "You do not have permission to edit bonuses." };
    }

    if (!data.employeeId || !data.amount || data.amount <= 0 || !data.reason?.trim()) {
      return { success: false, error: "Please fill all required fields with valid values." };
    }

    const bonusDateObj = new Date(data.bonusDate);
    if (isNaN(bonusDateObj.getTime())) {
      return { success: false, error: "Invalid bonus date format." };
    }

    const bonus = await prisma.employeeBonus.findUnique({
      where: { id },
    });

    if (!bonus) {
      return { success: false, error: "Bonus record not found." };
    }

    if (bonus.status !== "PENDING") {
      return { success: false, error: "Cannot edit a bonus that has already been approved or applied to payroll." };
    }

    await prisma.employeeBonus.update({
      where: { id },
      data: {
        employeeId: data.employeeId,
        amount: data.amount,
        bonusDate: bonusDateObj,
        reason: data.reason.trim(),
      },
    });

    revalidateBonuses();
    return { success: true, message: "Bonus record updated successfully." };
  } catch (error) {
    console.error("updateBonus error:", error);
    const errMsg = error instanceof Error ? error.message : "Failed to update bonus record";
    return { success: false, error: errMsg };
  }
}

export async function updateBonusStatus(id: string, status: BonusStatus) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, role: true },
    });

    const isAdmin = isUserAdmin(session.user.role) || isUserAdmin(dbUser?.role);
    const canApprove =
      isAdmin ||
      (await hasPermission(session.user.id, "hr.bonuses", "approve")) ||
      (await hasPermission(session.user.id, "hr.bonuses", "edit"));

    if (!canApprove) {
      return { success: false, error: "Permission denied" };
    }

    const existingBonus = await prisma.employeeBonus.findUnique({
      where: { id },
    });

    if (!existingBonus) {
      return { success: false, error: "Bonus record not found" };
    }

    if (existingBonus.status === "APPLIED") {
      return { success: false, error: "Cannot modify status of a bonus already applied to a payroll." };
    }

    await prisma.employeeBonus.update({
      where: { id },
      data: {
        status,
        approvedBy: status === "APPROVED" ? session.user.id : existingBonus.approvedBy,
      },
    });

    revalidateBonuses();
    return { success: true, message: `Bonus status updated to ${status}.` };
  } catch (error) {
    console.error("updateBonusStatus error:", error);
    const errMsg = error instanceof Error ? error.message : "Failed to update bonus status";
    return { success: false, error: errMsg };
  }
}

export async function trashBonus(id: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };

    const dbUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });
    const isAdmin = isUserAdmin(session.user.role) || isUserAdmin(dbUser?.role);
    const canTrash = isAdmin || (await hasPermission(session.user.id, "hr.bonuses", "move-to-trash"));
    if (!canTrash) return { success: false, error: "Permission denied" };

    const bonus = await prisma.employeeBonus.findUnique({ where: { id } });
    if (!bonus) return { success: false, error: "Bonus record not found" };

    if (bonus.status === "APPLIED") {
      return { success: false, error: "Cannot trash a bonus that has already been applied to a payroll." };
    }

    await prisma.employeeBonus.update({
      where: { id },
      data: { isTrash: true },
    });

    revalidateBonuses();
    return { success: true, message: "Bonus moved to trash." };
  } catch (error) {
    console.error("trashBonus error:", error);
    const errMsg = error instanceof Error ? error.message : "Failed to trash bonus";
    return { success: false, error: errMsg };
  }
}

export async function restoreBonus(id: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };

    const dbUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });
    const isAdmin = isUserAdmin(session.user.role) || isUserAdmin(dbUser?.role);
    const canRestore = isAdmin || (await hasPermission(session.user.id, "hr.bonuses", "edit"));
    if (!canRestore) return { success: false, error: "Permission denied" };

    await prisma.employeeBonus.update({
      where: { id },
      data: { isTrash: false },
    });

    revalidateBonuses();
    return { success: true, message: "Bonus record restored." };
  } catch (error) {
    console.error("restoreBonus error:", error);
    const errMsg = error instanceof Error ? error.message : "Failed to restore bonus";
    return { success: false, error: errMsg };
  }
}

export async function deleteBonus(id: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });
    const isAdmin = isUserAdmin(session.user.role) || isUserAdmin(dbUser?.role);
    const canDelete = isAdmin || (await hasPermission(session.user.id, "hr.bonuses", "delete-permanently"));
    if (!canDelete) {
      return { success: false, error: "Permission denied" };
    }

    const bonus = await prisma.employeeBonus.findUnique({
      where: { id },
    });

    if (!bonus) {
      return { success: false, error: "Bonus record not found" };
    }

    if (bonus.status === "APPLIED") {
      return { success: false, error: "Cannot delete a bonus that has already been calculated in a payroll run." };
    }

    await prisma.employeeBonus.delete({
      where: { id },
    });

    revalidateBonuses();
    return { success: true, message: "Bonus record deleted permanently." };
  } catch (error) {
    console.error("deleteBonus error:", error);
    const errMsg = error instanceof Error ? error.message : "Failed to delete bonus";
    return { success: false, error: errMsg };
  }
}

// Bulk Actions
export async function bulkUpdateBonusStatus(ids: string[], status: BonusStatus) {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };

    const dbUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });
    const isAdmin = isUserAdmin(session.user.role) || isUserAdmin(dbUser?.role);
    const canApprove = isAdmin || (await hasPermission(session.user.id, "hr.bonuses", "approve"));
    if (!canApprove) return { success: false, error: "Permission denied" };

    await prisma.employeeBonus.updateMany({
      where: {
        id: { in: ids },
        status: { not: "APPLIED" },
        isTrash: false,
      },
      data: {
        status,
        approvedBy: status === "APPROVED" ? session.user.id : undefined,
      },
    });

    revalidateBonuses();
    return { success: true, message: `Updated status for ${ids.length} bonus(es).` };
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : "Failed to perform bulk status update";
    return { success: false, error: errMsg };
  }
}

export async function bulkTrashBonuses(ids: string[]) {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };

    const dbUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });
    const isAdmin = isUserAdmin(session.user.role) || isUserAdmin(dbUser?.role);
    const canTrash = isAdmin || (await hasPermission(session.user.id, "hr.bonuses", "move-to-trash"));
    if (!canTrash) return { success: false, error: "Permission denied" };

    await prisma.employeeBonus.updateMany({
      where: {
        id: { in: ids },
        status: { not: "APPLIED" },
      },
      data: { isTrash: true },
    });

    revalidateBonuses();
    return { success: true, message: `Moved ${ids.length} bonus(es) to trash.` };
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : "Failed to trash selected bonuses";
    return { success: false, error: errMsg };
  }
}

export async function bulkRestoreBonuses(ids: string[]) {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };

    await prisma.employeeBonus.updateMany({
      where: { id: { in: ids } },
      data: { isTrash: false },
    });

    revalidateBonuses();
    return { success: true, message: `Restored ${ids.length} bonus(es).` };
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : "Failed to restore selected bonuses";
    return { success: false, error: errMsg };
  }
}

export async function bulkDeleteBonuses(ids: string[]) {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };

    const dbUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });
    const isAdmin = isUserAdmin(session.user.role) || isUserAdmin(dbUser?.role);
    const canDelete = isAdmin || (await hasPermission(session.user.id, "hr.bonuses", "delete-permanently"));
    if (!canDelete) return { success: false, error: "Permission denied" };

    await prisma.employeeBonus.deleteMany({
      where: {
        id: { in: ids },
        isTrash: true,
        status: { not: "APPLIED" },
      },
    });

    revalidateBonuses();
    return { success: true, message: `Permanently deleted selected bonuses.` };
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : "Failed to delete selected bonuses";
    return { success: false, error: errMsg };
  }
}

export async function getActiveEmployeesSimple() {
  try {
    const employees = await prisma.employee.findMany({
      where: { status: "active" },
      select: {
        id: true,
        name: true,
        employeeCode: true,
        designation: true,
        department: true,
        photo: true,
      },
      orderBy: { name: "asc" },
    });
    return { success: true, employees };
  } catch (error) {
    return { success: false, employees: [] };
  }
}

/**
 * Get all bonuses matching filters for export (no pagination limit)
 */
export async function getAllBonusesForExport(
  search: string = "",
  status: BonusStatus | "ALL" = "ALL",
  tab: string = "all"
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Unauthorized", bonuses: [] };
    }

    const where: Prisma.EmployeeBonusWhereInput = {};

    if (tab === "trash") {
      where.isTrash = true;
    } else {
      where.isTrash = false;

      if (status !== "ALL") {
        where.status = status;
      }
    }

    if (search) {
      where.OR = [
        { reason: { contains: search, mode: "insensitive" } },
        {
          employee: {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { employeeCode: { contains: search, mode: "insensitive" } },
            ],
          },
        },
      ];
    }

    const bonuses = await prisma.employeeBonus.findMany({
      where,
      include: {
        employee: {
          select: {
            id: true,
            name: true,
            employeeCode: true,
            designation: true,
            department: true,
          },
        },
        approver: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const serializedBonuses = bonuses.map((b) => ({
      ...b,
      amount: Number(b.amount || 0),
    }));

    return { success: true, bonuses: serializedBonuses };
  } catch (error) {
    console.error("getAllBonusesForExport error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch bonuses for export",
      bonuses: [],
    };
  }
}

