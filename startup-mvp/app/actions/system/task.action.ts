"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidateBothPaths } from "@/lib/route-utils-server";

/**
 * Create a new task
 */
export async function createTask(input: {
  title: string;
  description?: string;
  status?: string;
  priority?: string;
  dueDate?: Date;
  contactId?: string;
  opportunityId?: string;
  leadId?: string;
}) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const { checkPermission } = await import("@/lib/permissions");
    if (!(await checkPermission(session.user.id, "tasks", "create"))) {
      return { success: false, error: "Permission Denied: tasks.create" };
    }

    const task = await prisma.task.create({
      data: {
        ...input,
        userId: session.user.id,
      },
    });

    revalidateBothPaths("tasks");
    return { success: true, task };
  } catch (error) {
    console.error("createTask error:", error);
    return { success: false, error: "Failed to create task" };
  }
}

/**
 * Update an existing task
 */
export async function updateTask(
  id: string,
  input: {
    title?: string;
    description?: string;
    status?: string;
    priority?: string;
    dueDate?: Date | null;
    contactId?: string;
    opportunityId?: string;
    leadId?: string;
  }
) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const { checkPermission } = await import("@/lib/permissions");
    if (!(await checkPermission(session.user.id, "tasks", "edit"))) {
      return { success: false, error: "Permission Denied: tasks.edit" };
    }

    const task = await prisma.task.update({
      where: { id },
      data: input,
    });

    revalidateBothPaths("tasks");
    return { success: true, task };
  } catch (error) {
    console.error("updateTask error:", error);
    return { success: false, error: "Failed to update task" };
  }
}

/**
 * Delete a task
 */
export async function deleteTask(id: string) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const { checkPermission } = await import("@/lib/permissions");
    if (!(await checkPermission(session.user.id, "tasks", "delete-permanently"))) {
      return { success: false, error: "Permission Denied: tasks.delete-permanently" };
    }

    await prisma.task.delete({
      where: { id },
    });

    revalidateBothPaths("tasks");
    return { success: true };
  } catch (error) {
    console.error("deleteTask error:", error);
    return { success: false, error: "Failed to delete task" };
  }
}

/**
 * Get tasks (paginated)
 */
export async function getTasks(
  page: number = 1, 
  limit: number = 20,
  entityId?: string,
  entityType?: "lead" | "opportunity" | "contact"
) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized", tasks: [] };

    const { checkPermission } = await import("@/lib/permissions");
    if (!(await checkPermission(session.user.id, "tasks", "view"))) {
      return { success: false, error: "Permission Denied: tasks.view", tasks: [] };
    }

    const skip = (page - 1) * limit;

    const where: any = {};
    if (entityId && entityType) {
      if (entityType === "lead") where.leadId = entityId;
      else if (entityType === "opportunity") where.opportunityId = entityId;
      else if (entityType === "contact") where.contactId = entityId;
    }

    const [total, tasks] = await Promise.all([
      prisma.task.count({ where }),
      prisma.task.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          User: {
            select: {
              id: true,
              name: true,
              email: true,
            }
          }
        }
      })
    ]);

    return {
      success: true,
      tasks,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  } catch (error) {
    console.error("getTasks error:", error);
    return { success: false, error: "Failed to fetch tasks", tasks: [] };
  }
}

/**
 * Get a single task by ID
 */
export async function getTaskById(id: string) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const { checkPermission } = await import("@/lib/permissions");
    if (!(await checkPermission(session.user.id, "tasks", "view"))) {
      return { success: false, error: "Permission Denied: tasks.view" };
    }

    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        User: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        }
      }
    });

    if (!task) return { success: false, error: "Task not found" };

    return { success: true, task };
  } catch (error) {
    console.error("getTaskById error:", error);
    return { success: false, error: "Failed to fetch task" };
  }
}
