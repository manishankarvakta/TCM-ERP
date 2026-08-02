"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logItemCreated, logItemUpdated } from "@/lib/user-log";
import { revalidateBothPaths } from "@/lib/route-utils-server";
import { type Prisma, ResignationStatus } from "@prisma/client";
import { hasPermission } from "@/lib/permissions";

/**
 * Get Paginated Resignation Applications
 */
export async function getResignations(
  page: number = 1,
  limit: number = 10,
  search: string = "",
  status: ResignationStatus | "ALL" | "TRASH" = "ALL",
  employeeId?: string
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Unauthorized", resignations: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 0 } };
    }

    const skip = (page - 1) * limit;
    const where: Prisma.ResignationWhereInput = {};

    if (search) {
      where.employee = {
        name: { contains: search, mode: "insensitive" }
      };
    }

    if (employeeId) {
      where.employeeId = employeeId;
    }

    if (status === "TRASH") {
      where.isTrash = true;
    } else {
      where.isTrash = false;
      if (status !== "ALL") {
        where.status = status;
      }
    }

    const total = await prisma.resignation.count({ where });
    const resignations = await prisma.resignation.findMany({
      where,
      skip,
      take: limit,
      include: {
        employee: { select: { id: true, name: true, employeeCode: true, designation: true } },
        manager: { select: { id: true, name: true } },
        admin: { select: { id: true, name: true } }
      },
      orderBy: { createdAt: "desc" },
    });

    const totalPages = Math.ceil(total / limit);

    return {
      success: true,
      resignations,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  } catch (error) {
    console.error("getResignations error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch resignation applications",
      resignations: [],
      pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
    };
  }
}

/**
 * Submit a Resignation Request
 */
export async function submitResignation(input: {
  employeeId: string;
  resignDate: string;
  effectiveDate: string;
  reason?: string;
}) {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Unauthorized" };
    }

    const canCreate = await hasPermission(session.user.id, "hr.resignation", "create");
    if (!canCreate) {
      return { success: false, error: "You don't have permission to submit a resignation" };
    }

    // Verify employee is active
    const employee = await prisma.employee.findUnique({
      where: { id: input.employeeId }
    });

    if (!employee) {
      return { success: false, error: "Employee not found" };
    }

    if (employee.status !== "active") {
      return { success: false, error: "Employee is already inactive or resigned" };
    }

    const resignation = await prisma.resignation.create({
      data: {
        employeeId: input.employeeId,
        resignDate: new Date(input.resignDate),
        effectiveDate: new Date(input.effectiveDate),
        reason: input.reason,
        status: "PENDING",
        createdBy: session.user.id,
      },
    });

    await logItemCreated(session.user.id, "Resignation", resignation.id, "Resignation Submitted", resignation);
    revalidateBothPaths("hr/resignation");

    return { success: true, resignation };
  } catch (error) {
    console.error("submitResignation error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to submit resignation" };
  }
}

/**
 * Update Resignation Application Status (Manager / Admin)
 */
export async function updateResignationStatus(id: string, newStatus: ResignationStatus) {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Unauthorized" };
    }

    // Require hr.resignation edit/approve permission
    const canApprove = await hasPermission(session.user.id, "hr.resignation", "approve");
    const canEdit = await hasPermission(session.user.id, "hr.resignation", "edit");
    if (!canApprove && !canEdit) {
      return { success: false, error: "You don't have permission to update resignation status" };
    }

    const oldResign = await prisma.resignation.findUnique({
      where: { id },
      include: { employee: true }
    });

    if (!oldResign) {
      return { success: false, error: "Resignation request not found" };
    }

    const result = await prisma.$transaction(async (tx) => {
      const updateData: any = { status: newStatus };

      if (newStatus === "MANAGER_APPROVED") {
        updateData.managerId = session.user.id;
      } else if (newStatus === "APPROVED") {
        updateData.adminId = session.user.id;
        
        // Update employee status to inactive upon Admin approval
        await tx.employee.update({
          where: { id: oldResign.employeeId },
          data: { status: "inactive" }
        });
      } else if (newStatus === "REJECTED" || newStatus === "CANCELLED" || newStatus === "PENDING") {
        // Rollback employee status to active if approved resignation is cancelled or rejected
        if (oldResign.status === "APPROVED") {
          await tx.employee.update({
            where: { id: oldResign.employeeId },
            data: { status: "active" }
          });
        }
      }

      const resignation = await tx.resignation.update({
        where: { id },
        data: updateData,
      });

      return resignation;
    });

    await logItemUpdated(
      session.user.id, 
      "Resignation", 
      result.id, 
      [`Status changed to ${newStatus}`], 
      oldResign as any, 
      result as any
    );

    revalidateBothPaths("hr/resignation");
    revalidateBothPaths("employees");

    return { 
      success: true, 
      resignation: result, 
      message: `Resignation request successfully updated to ${newStatus.toLowerCase()}.` 
    };
  } catch (error) {
    console.error("updateResignationStatus error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to update resignation status" };
  }
}

/**
 * Get a single resignation application by ID
 */
export async function getResignationById(id: string) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const resignation = await prisma.resignation.findUnique({
      where: { id },
      include: {
        employee: {
          select: {
            id: true,
            name: true,
            employeeCode: true,
            designation: true,
            department: true,
            photo: true,
            status: true
          }
        },
        manager: { select: { id: true, name: true } },
        admin: { select: { id: true, name: true } },
        creator: { select: { id: true, name: true } }
      }
    });

    if (!resignation) return { success: false, error: "Resignation application not found" };

    return { success: true, resignation };
  } catch (error) {
    console.error("getResignationById error:", error);
    return { success: false, error: "Failed to fetch resignation application details" };
  }
}

/**
 * Get all resignations matching filters for export (no pagination limit)
 */
export async function getAllResignationsForExport(
  search: string = "",
  status: ResignationStatus | "ALL" | "TRASH" = "ALL",
  employeeId?: string
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Unauthorized", resignations: [] };
    }

    const where: Prisma.ResignationWhereInput = {};

    if (search) {
      where.employee = {
        name: { contains: search, mode: "insensitive" }
      };
    }

    if (employeeId) {
      where.employeeId = employeeId;
    }

    if (status === "TRASH") {
      where.isTrash = true;
    } else {
      where.isTrash = false;
      if (status !== "ALL") {
        where.status = status;
      }
    }

    const resignations = await prisma.resignation.findMany({
      where,
      include: {
        employee: { select: { id: true, name: true, employeeCode: true, designation: true } },
        manager: { select: { id: true, name: true } },
        admin: { select: { id: true, name: true } }
      },
      orderBy: { createdAt: "desc" },
    });

    return { success: true, resignations };
  } catch (error) {
    console.error("getAllResignationsForExport error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch resignations for export",
      resignations: [],
    };
  }
}
