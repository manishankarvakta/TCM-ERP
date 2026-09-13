"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logItemCreated, logItemUpdated, logItemDeleted } from "@/lib/user-log";
import { revalidatePath } from "next/cache";

export async function getEmployeeTypes(
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

    const total = await prisma.employeeType.count({ where }).catch(() => 0);
    const employeeTypes = await prisma.employeeType.findMany({
      where,
      skip,
      take: limit,
      include: {
        _count: { select: { employees: true } },
      },
      orderBy: { createdAt: "desc" },
    }).catch(() => []);

    return {
      success: true,
      data: employeeTypes,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to fetch employee types", data: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 0 } };
  }
}

export async function createEmployeeType(input: {
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

    const existing = await prisma.employeeType.findFirst({
      where: {
        OR: [{ name: input.name }, { code: input.code }],
      },
    });

    if (existing) {
      return { success: false, error: "Employee Type name or code already exists" };
    }

    const newType = await prisma.employeeType.create({
      data: {
        name: input.name,
        code: input.code,
        description: input.description || null,
        status: input.status || "active",
        organizationId: "default-org",
      },
    });

    await logItemCreated(session.user.id, "EmployeeType", newType.id, newType.name);
    revalidatePath("/dashboard/employees/types");

    return { success: true, data: newType };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to create employee type" };
  }
}

export async function updateEmployeeType(
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

    const updated = await prisma.employeeType.update({
      where: { id },
      data: input,
    });

    await logItemUpdated(session.user.id, "EmployeeType", id, ["updated"], updated.name);
    revalidatePath("/dashboard/employees/types");

    return { success: true, data: updated };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to update employee type" };
  }
}

export async function trashEmployeeType(id: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    const trashed = await prisma.employeeType.update({
      where: { id },
      data: { status: "trash" },
    });

    await logItemDeleted(session.user.id, "EmployeeType", id, trashed.name);
    revalidatePath("/dashboard/employees/types");

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to move employee type to trash" };
  }
}
