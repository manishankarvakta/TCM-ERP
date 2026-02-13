"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logItemCreated, logItemUpdated } from "@/lib/user-log";
import { revalidateBothPaths } from "@/lib/route-utils-server";

/**
 * Minimal Activity Types:
 * - call
 * - meeting
 * - email
 * - note
 * - task
 */

/**
 * Create a new activity
 */
export async function createActivity(input: {
  type: "call" | "meeting" | "email" | "note" | "task" | "update" | "created";
  subject: string;
  description?: string;
  contactId?: string;
  opportunityId?: string;
  leadId?: string;
  projectId?: string;
  issueId?: string;
  priority?: string;
  status?: string;
  assignedToId?: string;
  dueDate?: Date;
  completed?: boolean;
}) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

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
        contactId: input.contactId,
        opportunityId: input.opportunityId,
        leadId: input.leadId,
        projectId: input.projectId,
        issueId: input.issueId,
        priority: input.priority || "NORMAL",
        status: input.status || "TODO",
        dueDate: input.dueDate,
        completed: input.completed || false,
        ownerId: session.user.id,
        assignedToId: input.assignedToId,
      },
      include: {
        Contact: true,
        Opportunity: true,
        Lead: true,
        // @ts-ignore
        AssignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        }
      }
    });

    const mappedActivity = {
      ...activity,
      // @ts-ignore
      contact: activity.Contact,
      // @ts-ignore
      opportunity: activity.Opportunity,
      // @ts-ignore
      lead: activity.Lead,
      // @ts-ignore
      assignedTo: activity.AssignedTo,
      Contact: undefined,
      Opportunity: undefined,
      Lead: undefined,
      // @ts-ignore
      AssignedTo: undefined,
    };

    // Revalidate relevant paths
    revalidateBothPaths("crm/activities");
    if (input.opportunityId) revalidateBothPaths(`crm/opportunities/${input.opportunityId}`);
    if (input.leadId) revalidateBothPaths(`crm/leads/${input.leadId}`);

    return { success: true, activity: mappedActivity };
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
    contactId?: string | null;
    opportunityId?: string | null;
    leadId?: string | null;
    projectId?: string | null;
    issueId?: string | null;
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

    const activity = await prisma.activity.update({
      where: { id },
      data: input,
      include: {
        // @ts-ignore
        AssignedTo: {
            select: {
                id: true,
                name: true,
                email: true,
            }
        }
      }
    });

    revalidateBothPaths("crm/activities");
    if (input.opportunityId) revalidateBothPaths(`crm/opportunities/${input.opportunityId}`);
    if (input.leadId) revalidateBothPaths(`crm/leads/${input.leadId}`);

    return { 
      success: true, 
      activity: {
        ...activity,
        // @ts-ignore
        assignedTo: activity.AssignedTo,
        // @ts-ignore
        AssignedTo: undefined
      } 
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

    // Permission Check
    const { checkPermission } = await import("@/lib/permissions");
    if (!(await checkPermission(session.user.id, "crm.activities", "edit"))) {
      return { success: false, error: "Permission Denied: crm.activities.edit" };
    }

    const activity = await prisma.activity.update({
      where: { id: activityId },
      data: { completed: true },
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
  opportunityId?: string;
  contactId?: string;
}) {
  return createActivity({
    ...input,
    completed: false,
  });
}

/**
 * List activities for a specific contact
 */
export async function listActivitiesByContact(contactId: string) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized", activities: [] };

    // Permission Check
    const { checkPermission } = await import("@/lib/permissions");
    if (!(await checkPermission(session.user.id, "crm.activities", "view"))) {
      return { success: false, error: "Permission Denied: crm.activities.view", activities: [] };
    }

    const [activities, tasks, notes] = await Promise.all([
      prisma.activity.findMany({
        where: { contactId },
        orderBy: { createdAt: "desc" },
        include: {
          Opportunity: true,
          User: {
            select: { id: true, name: true, email: true }
          },
          AssignedTo: {
            select: { id: true, name: true, email: true }
          }
        }
      }),
      prisma.task.findMany({
        where: { contactId },
        orderBy: { createdAt: "desc" },
        include: {
          User: {
            select: { id: true, name: true, email: true }
          }
        }
      }),
      prisma.note.findMany({
        where: { contactId },
        orderBy: { createdAt: "desc" },
        include: {
          User: {
            select: { id: true, name: true, email: true }
          }
        }
      })
    ]);

    const mappedActivities = (activities as any[]).map(a => ({
      ...a,
      opportunity: a.Opportunity,
      assignedTo: a.AssignedTo,
      owner: a.User,
      Opportunity: undefined,
      AssignedTo: undefined
    }));

    const mappedTasks = tasks.map((t: any) => ({
        id: t.id,
        type: "task",
        subject: t.title,
        description: t.description,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
        dueDate: t.dueDate,
        completed: t.status === "completed",
        status: t.status,
        priority: t.priority,
        owner: t.User,
        ownerId: t.userId
    }));

    const mappedNotes = notes.map((n: any) => ({
        id: n.id,
        type: "note",
        subject: n.title,
        description: n.content,
        createdAt: n.createdAt,
        updatedAt: n.updatedAt,
        owner: n.User,
        ownerId: n.userId
    }));

    const allActivities = [
        ...mappedActivities,
        ...mappedTasks,
        ...mappedNotes
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return { success: true, activities: allActivities };
  } catch (error) {
    console.error("listActivitiesByContact error:", error);
    return { success: false, error: "Failed to fetch activities", activities: [] };
  }
}

/**
 * List activities for a specific lead
 */
export async function listActivitiesByLead(leadId: string) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized", activities: [] };

    // Permission Check
    const { checkPermission } = await import("@/lib/permissions");
    if (!(await checkPermission(session.user.id, "crm.activities", "view"))) {
      return { success: false, error: "Permission Denied: crm.activities.view", activities: [] };
    }

    const [activities, tasks, notes] = await Promise.all([
      prisma.activity.findMany({
        where: { leadId },
        orderBy: { createdAt: "desc" },
        include: {
          User: {
            select: { id: true, name: true, email: true }
          },
          AssignedTo: {
            select: { id: true, name: true, email: true }
          }
        }
      }),
      prisma.task.findMany({
        where: { leadId },
        orderBy: { createdAt: "desc" },
        include: {
          User: {
            select: { id: true, name: true, email: true }
          }
        }
      }),
      prisma.note.findMany({
        where: { leadId },
        orderBy: { createdAt: "desc" },
        include: {
          User: {
            select: { id: true, name: true, email: true }
          }
        }
      })
    ]);

    const mappedActivities = (activities as any[]).map(a => ({
        ...a,
        assignedTo: a.AssignedTo,
        owner: a.User,
        AssignedTo: undefined
    }));

    const mappedTasks = tasks.map((t: any) => ({
        id: t.id,
        type: "task",
        subject: t.title,
        description: t.description,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
        dueDate: t.dueDate,
        completed: t.status === "completed",
        status: t.status,
        priority: t.priority,
        owner: t.User,
        ownerId: t.userId
    }));

    const mappedNotes = notes.map((n: any) => ({
        id: n.id,
        type: "note",
        subject: n.title,
        description: n.content,
        createdAt: n.createdAt,
        updatedAt: n.updatedAt,
        owner: n.User,
        ownerId: n.userId
    }));

    const allActivities = [
        ...mappedActivities,
        ...mappedTasks,
        ...mappedNotes
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return { success: true, activities: allActivities };
  } catch (error) {
    console.error("listActivitiesByLead error:", error);
    return { success: false, error: "Failed to fetch activities", activities: [] };
  }
}

/**
 * List activities for a specific opportunity
 */
export async function listActivitiesByOpportunity(opportunityId: string) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized", activities: [] };

    // Permission Check
    const { checkPermission } = await import("@/lib/permissions");
    if (!(await checkPermission(session.user.id, "crm.activities", "view"))) {
      return { success: false, error: "Permission Denied: crm.activities.view", activities: [] };
    }

    const [activities, tasks, notes] = await Promise.all([
      prisma.activity.findMany({
        where: { opportunityId },
        orderBy: { createdAt: "desc" },
        include: {
          Contact: true,
          User: {
            select: { id: true, name: true, email: true }
          },
          AssignedTo: {
            select: { id: true, name: true, email: true }
          }
        }
      }),
      prisma.task.findMany({
        where: { opportunityId },
        orderBy: { createdAt: "desc" },
        include: {
          User: {
            select: { id: true, name: true, email: true }
          }
        }
      }),
      prisma.note.findMany({
        where: { opportunityId },
        orderBy: { createdAt: "desc" },
        include: {
          User: {
            select: { id: true, name: true, email: true }
          }
        }
      })
    ]);

    const mappedActivities = (activities as any[]).map(a => ({
      ...a,
      contact: a.Contact,
      assignedTo: a.AssignedTo,
      owner: a.User,
      Contact: undefined,
      AssignedTo: undefined
    }));

    const mappedTasks = tasks.map((t: any) => ({
        id: t.id,
        type: "task",
        subject: t.title,
        description: t.description,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
        dueDate: t.dueDate,
        completed: t.status === "completed",
        status: t.status,
        priority: t.priority,
        owner: t.User,
        ownerId: t.userId
    }));

    const mappedNotes = notes.map((n: any) => ({
        id: n.id,
        type: "note",
        subject: n.title,
        description: n.content,
        createdAt: n.createdAt,
        updatedAt: n.updatedAt,
        owner: n.User,
        ownerId: n.userId
    }));

    const allActivities = [
        ...mappedActivities,
        ...mappedTasks,
        ...mappedNotes
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return { success: true, activities: allActivities };
  } catch (error) {
    console.error("listActivitiesByOpportunity error:", error);
    return { success: false, error: "Failed to fetch activities", activities: [] };
  }
}

/**
 * Get all activities (paginated)
 */
export async function getActivities(page: number = 1, limit: number = 20) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized", activities: [] };

    // Permission Check
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
          Contact: true,
          Opportunity: true,
          Lead: true,
          User: {
            select: {
              id: true,
              name: true,
              email: true,
            }
          },
          // @ts-ignore
          AssignedTo: {
            select: {
              id: true,
              name: true,
              email: true,
            }
          }
        }
      })
    ]);

    const mappedActivities = activities.map((a: any) => ({
      ...a,
      dueDate: a.dueDate ? a.dueDate.toISOString() : null,
      createdAt: a.createdAt.toISOString(),
      updatedAt: a.updatedAt.toISOString(),
      contact: a.Contact,
      opportunity: a.Opportunity,
      lead: a.Lead,
      owner: a.User,
      assignedTo: a.AssignedTo,
      Contact: undefined,
      Opportunity: undefined,
      Lead: undefined,
      User: undefined,
      // @ts-ignore
      AssignedTo: undefined,
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
