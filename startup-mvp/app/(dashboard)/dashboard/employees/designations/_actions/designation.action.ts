"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logItemCreated, logItemUpdated, logItemDeleted } from "@/lib/user-log";
import { revalidatePath } from "next/cache";

export async function getDesignations(
  page: number = 1,
  limit: number = 10,
  search: string = "",
  status: "active" | "inactive" | "trash" | "all" = "all",
  department?: string
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Unauthorized", data: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 0 } };
    }

    const skip = (page - 1) * limit;
    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { code: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    if (status === "trash") {
      where.status = "trash";
    } else if (status === "active") {
      where.status = "active";
    } else if (status === "inactive") {
      where.status = "inactive";
    }

    if (department && department !== "all") {
      where.AND = [
        ...(where.AND || []),
        {
          OR: [
            { departmentName: department },
            { Department: { name: department } },
            { departmentId: department },
          ],
        },
      ];
    }

    const total = await prisma.designation.count({ where }).catch(() => 0);
    const designations = await prisma.designation.findMany({
      where,
      skip,
      take: limit,
      include: {
        Department: { select: { id: true, name: true, code: true } },
      },
      orderBy: { createdAt: "desc" },
    }).catch(async (err) => {
      console.error("getDesignations findMany with Department error:", err);
      return await prisma.designation.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }).catch((fallbackErr) => {
        console.error("getDesignations fallback error:", fallbackErr);
        return [];
      });
    });

    const employeeCounts = await prisma.employee.groupBy({
      by: ["designation"],
      where: { status: { not: "trash" }, designation: { not: null } },
      _count: { id: true },
    }).catch(() => []);

    const countMap = new Map<string, number>();
    employeeCounts.forEach((item) => {
      if (item.designation) {
        countMap.set(item.designation, item._count.id);
      }
    });

    const dataWithCounts = designations.map((des: any) => ({
      ...des,
      employeeCount: countMap.get(des.name) || 0,
    }));

    return {
      success: true,
      data: dataWithCounts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to fetch designations", data: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 0 } };
  }
}

export async function createDesignation(input: {
  name: string;
  code?: string;
  description?: string;
  departmentId?: string;
  departmentName?: string;
  status?: string;
}) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    const existing = await prisma.designation.findFirst({
      where: { name: input.name },
    });

    if (existing) {
      return { success: false, error: "Designation name already exists" };
    }

    const createData: any = {
      name: input.name,
      code: input.code || input.name.toUpperCase().replace(/\s+/g, "_").slice(0, 10),
      description: input.description || null,
      departmentName: input.departmentName || null,
      status: input.status || "active",
      organizationId: "default-org",
    };
    if (input.departmentId) {
      createData.departmentId = input.departmentId;
    }

    let newDesignation;
    try {
      newDesignation = await prisma.designation.create({ data: createData });
    } catch (err: any) {
      if (err?.message?.includes("departmentId")) {
        delete createData.departmentId;
        newDesignation = await prisma.designation.create({ data: createData });
      } else {
        throw err;
      }
    }

    await logItemCreated(session.user.id, "Designation", newDesignation.id, newDesignation.name);
    revalidatePath("/dashboard/employees/designations");

    return { success: true, data: newDesignation };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to create designation" };
  }
}

export async function updateDesignation(
  id: string,
  input: {
    name?: string;
    code?: string;
    description?: string;
    departmentId?: string;
    departmentName?: string;
    status?: string;
  }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    const updateData: any = { ...input };
    let updated;
    try {
      updated = await prisma.designation.update({
        where: { id },
        data: updateData,
      });
    } catch (err: any) {
      if (err?.message?.includes("departmentId")) {
        delete updateData.departmentId;
        updated = await prisma.designation.update({
          where: { id },
          data: updateData,
        });
      } else {
        throw err;
      }
    }

    await logItemUpdated(session.user.id, "Designation", id, ["updated"], updated.name);
    revalidatePath("/dashboard/employees/designations");

    return { success: true, data: updated };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to update designation" };
  }
}

export async function trashDesignation(id: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    const trashed = await prisma.designation.update({
      where: { id },
      data: { status: "trash" },
    });

    await logItemDeleted(session.user.id, "Designation", id, trashed.name);
    revalidatePath("/dashboard/employees/designations");

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to move designation to trash" };
  }
}
