"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logItemCreated, logItemUpdated, logItemDeleted } from "@/lib/user-log";
import { revalidatePath } from "next/cache";

export async function getDepartments(
  page: number = 1,
  limit: number = 10,
  search: string = "",
  status: "active" | "inactive" | "trash" | "all" = "all"
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

    const total = await prisma.department.count({ where }).catch(() => 0);
    const departments = await prisma.department.findMany({
      where,
      skip,
      take: limit,
      include: {
        _count: { select: { Employees: true } },
      },
      orderBy: { createdAt: "desc" },
    }).catch(() => []);

    return {
      success: true,
      data: departments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to fetch departments", data: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 0 } };
  }
}

export async function createDepartment(input: {
  name: string;
  code: string;
  description?: string;
  status?: string;
}) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    const existing = await prisma.department.findFirst({
      where: {
        OR: [{ name: input.name }, { code: input.code }],
      },
    });

    if (existing) {
      return { success: false, error: "Department name or code already exists" };
    }

    const newDept = await prisma.department.create({
      data: {
        name: input.name,
        code: input.code,
        description: input.description || null,
        status: input.status || "active",
        organizationId: "default-org",
      },
    });

    await logItemCreated(session.user.id, "Department", newDept.id, newDept.name);
    revalidatePath("/dashboard/employees/departments");

    return { success: true, data: newDept };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to create department" };
  }
}

export async function updateDepartment(
  id: string,
  input: {
    name?: string;
    code?: string;
    description?: string;
    status?: string;
  }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    const updated = await prisma.department.update({
      where: { id },
      data: input,
    });

    await logItemUpdated(session.user.id, "Department", id, ["updated"], updated.name);
    revalidatePath("/dashboard/employees/departments");

    return { success: true, data: updated };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to update department" };
  }
}

export async function trashDepartment(id: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    const trashed = await prisma.department.update({
      where: { id },
      data: { status: "trash" },
    });

    await logItemDeleted(session.user.id, "Department", id, trashed.name);
    revalidatePath("/dashboard/employees/departments");

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to move department to trash" };
  }
}
