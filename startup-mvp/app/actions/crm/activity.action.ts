"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidateBothPaths } from "@/lib/route-utils-server";

/**
 * Activity Types:
 * - call
 * - meeting
 * - email
 * - note
 * - task
 */

/**
 * Create a new activity with polymorphic entity relationship
 */
export async function createActivity(input: {
  type: "call" | "meeting" | "email" | "note" | "task" | "update" | "created";
  subject: string;
  description?: string;
  entityType?: string; // "lead", "opportunity", "contact", "project", "issue"
  entityId?: string;
  // Specific entity IDs for backward compatibility
  leadId?: string;
  opportunityId?: string;
  contactId?: string;
  // Subject IDs
  subjectType?: string;
  subjectId?: string;
  priority?: string;
  status?: string;
  assignedToId?: string;
  dueDate?: Date;
  completed?: boolean;
}) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    // Map entityId/Type from specific IDs if not provided
    const contextType = input.entityType || (input.leadId ? "lead" : input.opportunityId ? "opportunity" : input.contactId ? "contact" : undefined);
    const contextId = input.entityId || input.leadId || input.opportunityId || input.contactId;

    // Permission Check
    const { checkPermission } = await import("@/lib/permissions");
    if (!(await checkPermission(session.user.id, "crm.activities", "create"))) {
      return { success: false, error: "Permission Denied: crm.activities.create" };
    }

    const activity = await prisma.activity.create({
      data: {
        type: input.type,
        subject: input.subject,
        description: input.description,
        contextType: contextType,
        contextId: contextId,
        subjectType: input.subjectType,
        subjectId: input.subjectId,
        priority: input.priority || "NORMAL",
        status: input.status || "TODO",
        dueDate: input.dueDate,
        completed: input.completed || false,
        completedAt: input.completed ? new Date() : null,
        ownerId: session.user.id,
        assignedToId: input.assignedToId,
      } as any,
      include: {
        Owner: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        },
        AssignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        }
      } as any
    });

    // Revalidate relevant paths
    revalidateBothPaths("crm/activities");
    if (input.entityType && input.entityId) {
      revalidateBothPaths(`crm/${input.entityType}s/${input.entityId}`);
    }

    return { 
      success: true, 
      activity: {
        ...activity,
        entityType: (activity as any).contextType,
        entityId: (activity as any).contextId,
        owner: (activity as any).Owner,
        assignedTo: (activity as any).AssignedTo,
      } as any
    };
  } catch (error) {
    console.error("createActivity error:", error);
    return { success: false, error: "Failed to create activity" };
  }
}

/**
 * Update an existing activity
 */
export async function updateActivity(
  id: string,
  input: {
    type?: "call" | "meeting" | "email" | "note" | "task" | "update" | "created";
    subject?: string;
    description?: string;
    entityType?: string | null;
    entityId?: string | null;
    priority?: string;
    status?: string;
    assignedToId?: string | null;
    dueDate?: Date | null;
    completed?: boolean;
  }
) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const { checkPermission } = await import("@/lib/permissions");
    if (!(await checkPermission(session.user.id, "crm.activities", "edit"))) {
      return { success: false, error: "Permission Denied: crm.activities.edit" };
    }

    // Map legacy input names to new schema field names
    const updateData: any = {
      type: input.type,
      subject: input.subject,
      description: input.description,
      contextType: input.entityType,
      contextId: input.entityId,
      priority: input.priority,
      status: input.status,
      assignedToId: input.assignedToId,
      dueDate: input.dueDate,
      completed: input.completed,
    };

    if (input.completed === true) {
      updateData.completedAt = new Date();
    } else if (input.completed === false) {
      updateData.completedAt = null;
    }

    const activity = await prisma.activity.update({
      where: { id },
      data: updateData,
      include: {
        Owner: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        },
        AssignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        }
      } as any
    });

    revalidateBothPaths("crm/activities");
    if (input.entityType && input.entityId) {
      revalidateBothPaths(`crm/${input.entityType}s/${input.entityId}`);
    }

    return { 
      success: true, 
      activity: {
        ...activity,
        entityType: (activity as any).contextType,
        entityId: (activity as any).contextId,
        owner: (activity as any).Owner,
        assignedTo: (activity as any).AssignedTo,
      } as any
    };
  } catch (error) {
    console.error("updateActivity error:", error);
    return { success: false, error: "Failed to update activity" };
  }
}

/**
 * Mark an activity as completed
 */
export async function completeActivity(activityId: string) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const { checkPermission } = await import("@/lib/permissions");
    if (!(await checkPermission(session.user.id, "crm.activities", "edit"))) {
      return { success: false, error: "Permission Denied: crm.activities.edit" };
    }

    const activity = await prisma.activity.update({
      where: { id: activityId },
      data: { 
        completed: true,
        completedAt: new Date(),
      } as any,
    });

    revalidateBothPaths("crm/activities");
    return { success: true, activity };
  } catch (error) {
    console.error("completeActivity error:", error);
    return { success: false, error: "Failed to complete activity" };
  }
}

/**
 * Schedule a future activity
 */
export async function scheduleActivity(input: {
  type: "call" | "meeting" | "email" | "task";
  subject: string;
  dueDate: Date;
  entityType?: string;
  entityId?: string;
}) {
  return createActivity({
    ...input,
    completed: false,
  });
}

/**
 * List activities for any entity type (cursor-based pagination for timeline)
 * This replaces listActivitiesByContact, listActivitiesByLead, listActivitiesByOpportunity
 */
export async function listActivitiesByEntity(
  entityType: string,
  entityId: string,
  limit: number = 20,
  cursor?: string
) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized", activities: [], hasMore: false, nextCursor: null };

    const { checkPermission } = await import("@/lib/permissions");
    if (!(await checkPermission(session.user.id, "crm.activities", "view"))) {
      return { success: false, error: "Permission Denied: crm.activities.view", activities: [], hasMore: false, nextCursor: null };
    }

    // Fetch one extra to check if there's more
    const activities = await prisma.activity.findMany({
      where: { 
        contextType: entityType,
        contextId: entityId,
      } as any,
      take: limit + 1,
      ...(cursor && {
        cursor: { id: cursor },
        skip: 1,
      }),
      orderBy: { createdAt: "desc" },
      include: {
        Owner: {
          select: { id: true, name: true, email: true }
        },
        AssignedTo: {
          select: { id: true, name: true, email: true }
        }
      } as any
    });

    const hasMore = activities.length > limit;
    const items = hasMore ? activities.slice(0, -1) : activities;

    const mappedActivities = items.map(a => ({
      ...a,
      entityType: (a as any).contextType,
      entityId: (a as any).contextId,
      owner: (a as any).Owner,
      assignedTo: (a as any).AssignedTo,
    }));

    return { 
      success: true, 
      activities: mappedActivities,
      hasMore,
      nextCursor: hasMore ? items[items.length - 1].id : null,
    };
  } catch (error) {
    console.error("listActivitiesByEntity error:", error);
    return { success: false, error: "Failed to fetch activities", activities: [], hasMore: false, nextCursor: null };
  }
}

// Backward compatibility wrappers
export async function listActivitiesByContact(contactId: string, limit?: number, cursor?: string) {
  return listActivitiesByEntity("contact", contactId, limit, cursor);
}

export async function listActivitiesByLead(leadId: string, limit?: number, cursor?: string) {
  return listActivitiesByEntity("lead", leadId, limit, cursor);
}

export async function listActivitiesByOpportunity(opportunityId: string, limit?: number, cursor?: string) {
  return listActivitiesByEntity("opportunity", opportunityId, limit, cursor);
}

/**
 * Get all activities (paginated)
 */
export async function getActivities(page: number = 1, limit: number = 20) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized", activities: [] };

    const { checkPermission } = await import("@/lib/permissions");
    if (!(await checkPermission(session.user.id, "crm.activities", "view"))) {
      return { success: false, error: "Permission Denied: crm.activities.view", activities: [] };
    }

    const skip = (page - 1) * limit;

    const [total, activities] = await Promise.all([
      prisma.activity.count(),
      prisma.activity.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          Owner: {
            select: {
              id: true,
              name: true,
              email: true,
            }
          },
          AssignedTo: {
            select: {
              id: true,
              name: true,
              email: true,
            }
          }
        } as any
      })
    ]);

    const mappedActivities = activities.map((a: any) => ({
      ...a,
      dueDate: a.dueDate ? a.dueDate.toISOString() : null,
      createdAt: a.createdAt.toISOString(),
      updatedAt: a.updatedAt.toISOString(),
      completedAt: a.completedAt ? a.completedAt.toISOString() : null,
      owner: a.Owner,
      assignedTo: a.AssignedTo,
    }));

    return { 
      success: true, 
      activities: mappedActivities,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  } catch (error) {
    console.error("getActivities error:", error);
    return { success: false, error: "Failed to fetch activities", activities: [] };
  }
}

/**
 * Delete an activity
 */
export async function deleteActivity(id: string) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const { checkPermission } = await import("@/lib/permissions");
    if (!(await checkPermission(session.user.id, "crm.activities", "delete"))) {
      return { success: false, error: "Permission Denied: crm.activities.delete" };
    }

    await prisma.activity.delete({
      where: { id },
    });

    revalidateBothPaths("crm/activities");
    return { success: true };
  } catch (error) {
    console.error("deleteActivity error:", error);
    return { success: false, error: "Failed to delete activity" };
  }
}
