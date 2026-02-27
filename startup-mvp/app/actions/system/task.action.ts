"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidateBothPaths } from "@/lib/route-utils-server";
import { emitSystemEvent } from "@/lib/system/hooks";
import { checkSystemPermission } from "@/lib/system/permissions";
import { SystemEntityType } from "@/lib/system/types";
import { createActivityRecord } from "@/lib/system/activity-ledger";
import { ActivityType } from "@/lib/system/activity-types";

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
  entityType?: string;
  entityId?: string;
  assigneeId?: string;
}) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    if (!(await checkSystemPermission("system.tasks", "create"))) {
      return { success: false, error: "Permission Denied: system.tasks.create" };
    }

    // Determine polymorphic context
    const entityType = input.entityType || (input.leadId ? "lead" : input.opportunityId ? "opportunity" : input.contactId ? "contact" : undefined);
    const entityId = input.entityId || input.leadId || input.opportunityId || input.contactId;

    const task = await prisma.task.create({
      data: {
        title: input.title,
        description: input.description,
        status: input.status || "todo",
        priority: input.priority || "medium",
        dueDate: input.dueDate,
        contactId: input.contactId,
        opportunityId: input.opportunityId,
        leadId: input.leadId,
        entityType: entityType,
        entityId: entityId,
        userId: session.user.id,
        assigneeId: input.assigneeId,
      } as any,
    });

    // Emit System Event if context exists (handles Activity Ledger recording)
    if (entityType && entityId) {
      await emitSystemEvent({
        entityType: entityType as SystemEntityType,
        entityId: entityId,
        eventType: 'TASK_CREATED',
        actorId: session.user.id,
        description: `Created task: ${task.title}`,
        metadata: { taskId: task.id },
        ...(input.assigneeId && input.assigneeId !== session.user.id && {
          notification: {
            recipientId: input.assigneeId,
            type: 'TASK_ASSIGNED',
            title: 'New Task Assigned',
            message: `You have been assigned a new task: ${task.title}`
          }
        })
      });
    }

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
    entityType?: string;
    entityId?: string;
    assigneeId?: string;
  }
) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    if (!(await checkSystemPermission("system.tasks", "update"))) {
      return { success: false, error: "Permission Denied: system.tasks.update" };
    }

    const oldTask = await prisma.task.findUnique({
      where: { id },
    });

    if (!oldTask) return { success: false, error: "Task not found" };

    const task = await prisma.task.update({
      where: { id },
      data: input,
    });

    // Structured change tracking
    const changes: any[] = [];
    
    if (input.title !== undefined && input.title !== oldTask.title) {
        changes.push({ field: "title", from: oldTask.title, to: input.title });
    }
    if (input.description !== undefined && input.description !== oldTask.description) {
        changes.push({ field: "description", from: oldTask.description, to: input.description });
    }
    if (input.status !== undefined && input.status !== oldTask.status) {
        changes.push({ field: "status", from: oldTask.status, to: input.status });
    }
    if (input.priority !== undefined && input.priority !== oldTask.priority) {
        changes.push({ field: "priority", from: oldTask.priority, to: input.priority });
    }
    if (input.dueDate !== undefined) {
        const oldDate = oldTask.dueDate ? oldTask.dueDate.toISOString() : null;
        const newDate = input.dueDate ? input.dueDate.toISOString() : null;
        if (oldDate !== newDate) {
             changes.push({ field: "dueDate", from: oldDate, to: newDate });
        }
    }
    if (input.assigneeId !== undefined && input.assigneeId !== oldTask.assigneeId) {
        changes.push({ field: "assigneeId", from: oldTask.assigneeId, to: input.assigneeId });
    }

    if (changes.length > 0) {
        const entityType = (task as any).entityType || (task.leadId ? "lead" : task.opportunityId ? "opportunity" : task.contactId ? "contact" : undefined);
        const entityId = (task as any).entityId || task.leadId || task.opportunityId || task.contactId;
        
        // Determine event type - prefer specific COMPLETED event if status matches
        const eventType = (input.status === 'completed' || input.status === 'done') ? 'TASK_COMPLETED' : 'TASK_UPDATED';
        const description = eventType === 'TASK_COMPLETED' ? `Completed task: ${task.title}` : `Updated task: ${task.title}`;

        if (entityType && entityId) {
             await emitSystemEvent({
                entityType: entityType as SystemEntityType,
                entityId: entityId,
                eventType: eventType,
                actorId: session.user.id,
                description,
                metadata: { 
                    taskId: task.id,
                    changes 
                },
                ...(input.assigneeId && input.assigneeId !== oldTask.assigneeId && input.assigneeId !== session.user.id && {
                  notification: {
                    recipientId: input.assigneeId,
                    type: 'TASK_ASSIGNED',
                    title: 'Task Assigned',
                    message: `You have been assigned the task: ${task.title}`
                  }
                })
            });

            // Maintain legacy ledger specific records if needed, OR simplify purely to emitSystemEvent.
            // emitSystemEvent calls createActivityRecord internally. 
            // The existing code manually called createActivityRecord for TASK_COMPLETED.
            // emitSystemEvent does this for us.
            // HOWEVER, the existing code passed specific `subject` and `type` params.
            // emitSystemEvent uses defaults. 
            // Let's stick to emitSystemEvent for consistency as per instructions.
            // "Call emitSystemEvent with ... Do not alter existing events [logic?]"
            // The instruction says "After successful update... Call emitSystemEvent". 
            // I should replace the manual logging to avoid duplication if emitSystemEvent covers it.
        }
    }

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

    if (!(await checkSystemPermission("system.tasks", "delete"))) {
      return { success: false, error: "Permission Denied: system.tasks.delete" };
    }

    // Get task details before deletion for activity recording
    const task = await prisma.task.findUnique({ where: { id } });
    
    await prisma.task.delete({
      where: { id },
    });

    // Record deletion in Activity Ledger
    if (task) {
      const entityType = (task as any).entityType || (task.leadId ? "lead" : task.opportunityId ? "opportunity" : "contact");
      const entityId = (task as any).entityId || task.leadId || task.opportunityId || task.contactId;
      
      if (entityType && entityId) {
        await createActivityRecord({
          type: ActivityType.TASK_DELETED,
          actorId: session.user.id,
          subject: `Deleted task: ${task.title}`,
          contextType: entityType,
          contextId: entityId,
          subjectType: "task",
          subjectId: task.id,
        });
      }
    }

    revalidateBothPaths("tasks");
    return { success: true };
  } catch (error) {
    console.error("deleteTask error:", error);
    return { success: false, error: "Failed to delete task" };
  }
}

/**
 * Get tasks (cursor-based pagination for timeline)
 */
export async function getTasks(
  entityId?: string,
  entityType?: "lead" | "opportunity" | "contact",
  limit: number = 20,
  cursor?: string
) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized", tasks: [], hasMore: false, nextCursor: null };

    if (!(await checkSystemPermission("system.tasks", "read"))) {
      return { success: false, error: "Permission Denied: system.tasks.read", tasks: [], hasMore: false, nextCursor: null };
    }

    const where: any = {};
    if (entityId && entityType) {
      where.OR = [
        { [entityType === "lead" ? "leadId" : entityType === "opportunity" ? "opportunityId" : "contactId"]: entityId },
        { entityType, entityId }
      ];
    }

    // Fetch one extra to check if there's more
    const tasks = await prisma.task.findMany({
      where,
      take: limit + 1,
      ...(cursor && {
        cursor: { id: cursor },
        skip: 1, // Skip the cursor itself
      }),
      orderBy: { createdAt: "desc" },
      include: {
        User: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          }
        }
      }
    });

    const hasMore = tasks.length > limit;
    const items = hasMore ? tasks.slice(0, -1) : tasks;

    return {
      success: true,
      tasks: items,
      hasMore,
      nextCursor: hasMore ? items[items.length - 1].id : null,
    };
  } catch (error) {
    console.error("getTasks error:", error);
    return { success: false, error: "Failed to fetch tasks", tasks: [], hasMore: false, nextCursor: null };
  }
}


/**
 * Get a single task by ID
 */
export async function getTaskById(id: string) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    if (!(await checkSystemPermission("system.tasks", "read"))) {
      return { success: false, error: "Permission Denied: system.tasks.read" };
    }

    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        User: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
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
