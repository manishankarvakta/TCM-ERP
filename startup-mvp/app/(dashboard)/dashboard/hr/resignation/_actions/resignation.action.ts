"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidateBothPaths } from "@/lib/route-utils-server";
import { addDays } from "date-fns";

/**
 * Get paginated list of resignations
 */
export async function getResignations(page: number = 1, limit: number = 10, status: string = "ALL") {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized", resignations: [], pagination: null };

    const skip = (page - 1) * limit;
    const where: any = {};

    if (status !== "ALL") {
      where.status = status;
    }

    const total = await prisma.resignation.count({ where });
    const resignations = await prisma.resignation.findMany({
      where,
      skip,
      take: limit,
      include: {
        employee: { select: { id: true, name: true, employeeCode: true, designation: true, department: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return {
      success: true,
      resignations,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  } catch (error) {
    console.error("getResignations error:", error);
    return { success: false, error: "Failed to fetch resignations", resignations: [], pagination: null };
  }
}

/**
 * Submit a new resignation request
 */
export async function submitResignation(input: {
  employeeId: string;
  resignationDate: Date;
  noticePeriodDays?: number;
  reason?: string;
  organizationId?: string;
}) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const employee = await prisma.employee.findUnique({ where: { id: input.employeeId } });
    if (!employee) return { success: false, error: "Employee not found" };

    const noticeDays = input.noticePeriodDays ?? 30;
    const resDate = new Date(input.resignationDate);
    const expectedReleaseDate = addDays(resDate, noticeDays);

    const resignation = await prisma.resignation.create({
      data: {
        employeeId: input.employeeId,
        resignationDate: resDate,
        noticePeriodDays: noticeDays,
        expectedReleaseDate,
        reason: input.reason,
        status: "PENDING",
        createdBy: session.user.id,
        organizationId: input.organizationId || employee.organizationId || "default-org",
      },
    });

    revalidateBothPaths("/dashboard/hr/resignation");
    return { success: true, resignation };
  } catch (error) {
    console.error("submitResignation error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to submit resignation" };
  }
}

/**
 * Update resignation status (Approve / Reject)
 */
export async function updateResignationStatus(resignationId: string, newStatus: "APPROVED" | "REJECTED" | "MANAGER_APPROVED") {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const oldRes = await prisma.resignation.findUnique({ where: { id: resignationId } });
    if (!oldRes) return { success: false, error: "Resignation not found" };

    const resignation = await prisma.resignation.update({
      where: { id: resignationId },
      data: {
        status: newStatus,
        approvedBy: session.user.id,
      },
    });

    // If fully APPROVED, update employee status to inactive upon release date or immediately
    if (newStatus === "APPROVED") {
      await prisma.employee.update({
        where: { id: oldRes.employeeId },
        data: { status: "inactive" },
      });
    }

    revalidateBothPaths("/dashboard/hr/resignation");
    return { success: true, resignation };
  } catch (error) {
    console.error("updateResignationStatus error:", error);
    return { success: false, error: "Failed to update resignation status" };
  }
}
