"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { revalidatePath } from "next/cache";
import { FineStatus, Prisma } from "@prisma/client";

function revalidateFines() {
  revalidatePath("/dashboard/hr/fines");
  revalidatePath("/dashboard/hr/payroll");
}

export async function getFines(
  page = 1,
  limit = 10,
  search = "",
  status?: FineStatus | "ALL",
  tab = "all"
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Unauthorized", fines: [], pagination: null };
    }

    const canView = await hasPermission(session.user.id, "hr.fines", "view");
    if (!canView) {
      return { success: false, error: "Permission denied", fines: [], pagination: null };
    }

    const skip = (page - 1) * limit;
    const where: Prisma.EmployeeFineWhereInput = {
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

    const total = await prisma.employeeFine.count({ where });
    const fines = await prisma.employeeFine.findMany({
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

    const serializedFines = fines.map((f) => ({
      ...f,
      amount: Number(f.amount),
    }));

    return {
      success: true,
      fines: serializedFines,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  } catch (error) {
    console.error("getFines error:", error);
    return { success: false, error: "Failed to fetch fines", fines: [], pagination: null };
  }
}

export async function createFine(data: {
  employeeId: string;
  amount: number;
  fineDate: string;
  reason: string;
}) {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Unauthorized" };
    }

    const canCreate = await hasPermission(session.user.id, "hr.fines", "create");
    if (!canCreate) {
      return { success: false, error: "You do not have permission to add fines" };
    }

    if (!data.employeeId || !data.amount || data.amount <= 0 || !data.reason.trim()) {
      return { success: false, error: "Please fill all required fields with valid values." };
    }

    const employee = await prisma.employee.findUnique({
      where: { id: data.employeeId },
    });

    if (!employee) {
      return { success: false, error: "Employee not found." };
    }

    const fine = await prisma.employeeFine.create({
      data: {
        employeeId: data.employeeId,
        amount: data.amount,
        fineDate: new Date(data.fineDate),
        reason: data.reason.trim(),
        status: "PENDING",
        createdBy: session.user.id,
      },
    });

    revalidateFines();
    return { success: true, fineId: fine.id, message: "Fine recorded successfully." };
  } catch (error) {
    console.error("createFine error:", error);
    return { success: false, error: "Failed to create fine" };
  }
}

export async function updateFine(
  id: string,
  data: {
    employeeId: string;
    amount: number;
    fineDate: string;
    reason: string;
  }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Unauthorized" };
    }

    const isAdmin =
      session.user.role?.toLowerCase() === "admin" ||
      session.user.role?.toLowerCase() === "super admin" ||
      session.user.role?.toLowerCase() === "superadmin";

    const canEdit =
      isAdmin || (await hasPermission(session.user.id, "hr.fines", "edit"));
    if (!canEdit) {
      return { success: false, error: "You do not have permission to edit fines" };
    }

    if (!data.employeeId || !data.amount || data.amount <= 0 || !data.reason.trim()) {
      return { success: false, error: "Please fill all required fields with valid values." };
    }

    const fine = await prisma.employeeFine.findUnique({
      where: { id },
    });

    if (!fine) {
      return { success: false, error: "Fine record not found." };
    }

    if (fine.status !== "PENDING") {
      return { success: false, error: "Cannot edit a fine that has already been approved or applied to payroll." };
    }

    await prisma.employeeFine.update({
      where: { id },
      data: {
        employeeId: data.employeeId,
        amount: data.amount,
        fineDate: new Date(data.fineDate),
        reason: data.reason.trim(),
      },
    });

    revalidateFines();
    return { success: true, message: "Fine record updated successfully." };
  } catch (error) {
    console.error("updateFine error:", error);
    return { success: false, error: "Failed to update fine record" };
  }
}

export async function updateFineStatus(id: string, status: FineStatus) {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Unauthorized" };
    }

    const canApprove = await hasPermission(session.user.id, "hr.fines", "approve") || await hasPermission(session.user.id, "hr.fines", "edit");
    if (!canApprove) {
      return { success: false, error: "Permission denied" };
    }

    const existingFine = await prisma.employeeFine.findUnique({
      where: { id },
    });

    if (!existingFine) {
      return { success: false, error: "Fine record not found" };
    }

    if (existingFine.status === "APPLIED") {
      return { success: false, error: "Cannot modify status of a fine already applied to a payroll." };
    }

    await prisma.employeeFine.update({
      where: { id },
      data: {
        status,
        approvedBy: status === "APPROVED" ? session.user.id : existingFine.approvedBy,
      },
    });

    revalidateFines();
    return { success: true, message: `Fine status updated to ${status}.` };
  } catch (error) {
    console.error("updateFineStatus error:", error);
    return { success: false, error: "Failed to update fine status" };
  }
}

export async function trashFine(id: string) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const canTrash = await hasPermission(session.user.id, "hr.fines", "move-to-trash");
    if (!canTrash) return { success: false, error: "Permission denied" };

    const fine = await prisma.employeeFine.findUnique({ where: { id } });
    if (!fine) return { success: false, error: "Fine record not found" };

    if (fine.status === "APPLIED") {
      return { success: false, error: "Cannot trash a fine that has already been applied to a payroll." };
    }

    await prisma.employeeFine.update({
      where: { id },
      data: { isTrash: true },
    });

    revalidateFines();
    return { success: true, message: "Fine moved to trash." };
  } catch (error) {
    console.error("trashFine error:", error);
    return { success: false, error: "Failed to trash fine" };
  }
}

export async function restoreFine(id: string) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const canRestore = await hasPermission(session.user.id, "hr.fines", "edit");
    if (!canRestore) return { success: false, error: "Permission denied" };

    await prisma.employeeFine.update({
      where: { id },
      data: { isTrash: false },
    });

    revalidateFines();
    return { success: true, message: "Fine record restored." };
  } catch (error) {
    console.error("restoreFine error:", error);
    return { success: false, error: "Failed to restore fine" };
  }
}

export async function deleteFine(id: string) {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Unauthorized" };
    }

    const canDelete = await hasPermission(session.user.id, "hr.fines", "delete-permanently");
    if (!canDelete) {
      return { success: false, error: "Permission denied" };
    }

    const fine = await prisma.employeeFine.findUnique({
      where: { id },
    });

    if (!fine) {
      return { success: false, error: "Fine record not found" };
    }

    if (fine.status === "APPLIED") {
      return { success: false, error: "Cannot delete a fine that has already been calculated in a payroll run." };
    }

    await prisma.employeeFine.delete({
      where: { id },
    });

    revalidateFines();
    return { success: true, message: "Fine record deleted permanently." };
  } catch (error) {
    console.error("deleteFine error:", error);
    return { success: false, error: "Failed to delete fine" };
  }
}

// Bulk Actions
export async function bulkUpdateFineStatus(ids: string[], status: FineStatus) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const canApprove = await hasPermission(session.user.id, "hr.fines", "approve");
    if (!canApprove) return { success: false, error: "Permission denied" };

    await prisma.employeeFine.updateMany({
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

    revalidateFines();
    return { success: true, message: `Updated status for ${ids.length} fine(s).` };
  } catch (error) {
    return { success: false, error: "Failed to perform bulk status update" };
  }
}

export async function bulkTrashFines(ids: string[]) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const canTrash = await hasPermission(session.user.id, "hr.fines", "move-to-trash");
    if (!canTrash) return { success: false, error: "Permission denied" };

    await prisma.employeeFine.updateMany({
      where: {
        id: { in: ids },
        status: { not: "APPLIED" },
      },
      data: { isTrash: true },
    });

    revalidateFines();
    return { success: true, message: `Moved ${ids.length} fine(s) to trash.` };
  } catch (error) {
    return { success: false, error: "Failed to trash selected fines" };
  }
}

export async function bulkRestoreFines(ids: string[]) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    await prisma.employeeFine.updateMany({
      where: { id: { in: ids } },
      data: { isTrash: false },
    });

    revalidateFines();
    return { success: true, message: `Restored ${ids.length} fine(s).` };
  } catch (error) {
    return { success: false, error: "Failed to restore selected fines" };
  }
}

export async function bulkDeleteFines(ids: string[]) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const canDelete = await hasPermission(session.user.id, "hr.fines", "delete-permanently");
    if (!canDelete) return { success: false, error: "Permission denied" };

    await prisma.employeeFine.deleteMany({
      where: {
        id: { in: ids },
        isTrash: true,
        status: { not: "APPLIED" },
      },
    });

    revalidateFines();
    return { success: true, message: `Permanently deleted selected fines.` };
  } catch (error) {
    return { success: false, error: "Failed to delete selected fines" };
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
