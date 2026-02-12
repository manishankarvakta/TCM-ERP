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
  type: "call" | "meeting" | "email" | "note" | "task";
  subject: string;
  description?: string;
  contactId?: string;
  opportunityId?: string;
  leadId?: string;
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
        ...input,
        ownerId: session.user.id,
      },
      include: {
        Contact: true,
        Opportunity: true,
        Lead: true,
      }
    });

    const mappedActivity = {
      ...activity,
      contact: activity.Contact,
      opportunity: activity.Opportunity,
      lead: activity.Lead,
      Contact: undefined,
      Opportunity: undefined,
      Lead: undefined,
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
    type?: "call" | "meeting" | "email" | "note" | "task";
    subject?: string;
    description?: string;
    contactId?: string | null;
    opportunityId?: string | null;
    leadId?: string | null;
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
    });

    revalidateBothPaths("crm/activities");
    if (input.opportunityId) revalidateBothPaths(`crm/opportunities/${input.opportunityId}`);
    if (input.leadId) revalidateBothPaths(`crm/leads/${input.leadId}`);

    return { success: true, activity };
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

    const activities = await prisma.activity.findMany({
      where: { contactId },
      orderBy: { createdAt: "desc" },
      include: {
        // @ts-ignore
        Opportunity: true,
        User: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        }
      }
    });

    const mappedActivities = activities.map(a => ({
      ...a,
      // @ts-ignore
      opportunity: a.Opportunity,
      Opportunity: undefined,
    }));

    return { success: true, activities: mappedActivities };
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

    const activities = await prisma.activity.findMany({
      where: { leadId },
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
    });

    return { success: true, activities };
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

    const activities = await prisma.activity.findMany({
      where: { opportunityId },
      orderBy: { createdAt: "desc" },
      include: {
        // @ts-ignore
        Contact: true,
        User: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        }
      }
    });

    const mappedActivities = activities.map(a => ({
      ...a,
      // @ts-ignore
      contact: a.Contact,
      Contact: undefined,
    }));

    return { success: true, activities: mappedActivities };
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
          Contact: { select: { firstName: true, lastName: true, email: true } },
          Opportunity: { select: { title: true } },
          Lead: { select: { name: true } },
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

    const mappedActivities = activities.map((a: any) => ({
      ...a,
      dueDate: a.dueDate ? a.dueDate.toISOString() : null,
      createdAt: a.createdAt.toISOString(),
      updatedAt: a.updatedAt.toISOString(),
      contact: a.Contact ? {
        ...a.Contact,
        name: `${a.Contact.firstName} ${a.Contact.lastName}`.trim()
      } : null,
      opportunity: a.Opportunity,
      lead: a.Lead,
      Contact: undefined,
      Opportunity: undefined,
      Lead: undefined,
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
