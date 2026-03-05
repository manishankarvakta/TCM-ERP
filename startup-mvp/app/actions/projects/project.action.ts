"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidateBothPaths } from "@/lib/route-utils-server";
import { getActiveClients } from "@/app/actions/clients";
import { emitSystemEvent } from "@/lib/system/hooks";

import { checkPermission } from "@/lib/permissions";
import { checkSystemPermission } from "@/lib/system/permissions";
import { SystemEntityType, SystemEventType } from "@/lib/system/types";

/**
 * --- Project Actions ---
 */

/**
 * Create a new project
 */
export async function createProject(input: {
  title: string;
  description?: string;
  clientId: string;
  opportunityId?: string;
  orderId?: string;
  projectManagerId?: string;
  startDate?: Date;
  endDate?: Date;
  budget?: number;
  priority?: string;
}) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    if (!(await checkPermission(session.user.id, "projects.projects", "create"))) {
      return { success: false, error: "Permission Denied: projects.projects.create" };
    }

    const project = await prisma.project.create({
      data: {
        title: input.title,
        description: input.description,
        clientId: input.clientId,
        opportunityId: input.opportunityId,
        orderId: input.orderId,
        projectManagerId: input.projectManagerId,
        startDate: input.startDate,
        endDate: input.endDate,
        budget: input.budget,
        priority: input.priority || "NORMAL",
        ownerId: session.user.id,
      },
    });

    await emitSystemEvent({
      entityType: "project" as SystemEntityType,
      entityId: project.id,
      eventType: "PROJECT_CREATED" as SystemEventType,
      actorId: session.user.id,
      description: `Launched project: ${project.title}`,
      metadata: { projectId: project.id },
    });

    revalidateBothPaths("projects");
    return { success: true, project };
  } catch (error) {
    console.error("createProject error:", error);
    return { success: false, error: "Failed to create project" };
  }
}

/**
 * Update an existing project
 */
export async function updateProject(
  id: string,
  input: {
    title?: string;
    description?: string;
    status?: any; // ProjectStatus
    priority?: string;
    clientId?: string;
    opportunityId?: string;
    orderId?: string;
    projectManagerId?: string;
    startDate?: Date;
    endDate?: Date;
    budget?: number;
  }
) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    if (!(await checkSystemPermission("system.projects", "update"))) {
      return { success: false, error: "Permission Denied: system.projects.update" };
    }

    const oldProject = await prisma.project.findUnique({ where: { id } });
    if (!oldProject) return { success: false, error: "Project not found" };

    const project = await prisma.project.update({
      where: { id },
      data: input,
    });

    // Track changes
    const changes: any[] = [];
    if (input.title && input.title !== oldProject.title) changes.push({ field: "title", from: oldProject.title, to: input.title });
    if (input.status && input.status !== oldProject.status) changes.push({ field: "status", from: oldProject.status, to: input.status });
    
    if (changes.length > 0) {
        await emitSystemEvent({
          entityType: "project" as SystemEntityType,
          entityId: project.id,
          eventType: input.status === "COMPLETED" ? "PROJECT_COMPLETED" : ("PROJECT_UPDATED" as SystemEventType),
          actorId: session.user.id,
          description: `Updated project: ${project.title}`,
          metadata: { projectId: project.id, changes },
        });
    }

    revalidateBothPaths("projects");
    revalidateBothPaths(`projects/${id}`);
    return { success: true, project };
  } catch (error) {
    console.error("updateProject error:", error);
    return { success: false, error: "Failed to update project" };
  }
}

/**
 * List projects
 */
export async function getProjects(
  page: number = 1,
  limit: number = 10,
  search: string = "",
  status: string = "all",
  sortBy: string = "createdAt",
  sortOrder: "asc" | "desc" = "desc",
  dateFrom?: string,
  dateTo?: string
) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const skip = (page - 1) * limit;
    const where: any = {};

    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { Client: { name: { contains: search, mode: "insensitive" } } },
      ];
    }

    if (status && status !== "all") {
      where.status = status;
    }

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) {
        const start = new Date(dateFrom);
        if (!isNaN(start.getTime())) {
            start.setHours(0, 0, 0, 0);
            where.createdAt.gte = start;
        }
      }
      if (dateTo) {
        const end = new Date(dateTo);
        if (!isNaN(end.getTime())) {
            end.setHours(23, 59, 59, 999);
            where.createdAt.lte = end;
        }
      }
    }

    const orderBy: any = {};
    if (sortBy === "status") {
      orderBy.status = sortOrder;
    } else {
      orderBy.createdAt = sortOrder;
    }

    const [total, projects] = await Promise.all([
      prisma.project.count({ where }),
      prisma.project.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          Client: { select: { id: true, name: true, image: true } },
          Owner: { select: { id: true, name: true, image: true } },
          _count: {
              select: { Milestones: true, Tasks: true }
          }
        },
      }),
    ]);

    // Map to plain objects to avoid Decimal serialization issues in client components
    const mappedProjects = projects.map((p: any) => ({
        ...p,
        budget: p.budget ? Number(p.budget) : null,
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
        startDate: p.startDate?.toISOString(),
        endDate: p.endDate?.toISOString(),
    }));

    return { 
      success: true, 
      projects: mappedProjects,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  } catch (error) {
    console.error("getProjects error:", error);
    return { success: false, error: "Failed to fetch projects" };
  }
}

/**
 * Get a single project by ID with full details
 */
export async function getProjectById(id: string) {
    try {
      const session = await auth();
      if (!session?.user) return { success: false, error: "Unauthorized" };
  
      const project = await prisma.project.findUnique({
        where: { id },
        include: {
          Client: true,
          Owner: { select: { id: true, name: true, image: true, email: true } },
          Milestones: {
            include: {
                Issues: {
                    include: {
                        Assignee: { select: { id: true, name: true, image: true } }
                    }
                }
            },
            orderBy: { order: "asc" }
          },
          _count: {
              select: { Tasks: true, Notes: true, Docs: true }
          }
        }
      });
  
      if (!project) return { success: false, error: "Project not found" };
  
      // Map to plain object
      const mappedProject = {
          ...project,
          budget: project.budget ? Number(project.budget) : null,
          createdAt: project.createdAt.toISOString(),
          updatedAt: project.updatedAt.toISOString(),
          startDate: project.startDate?.toISOString(),
          endDate: project.endDate?.toISOString(),
      };
  
      return { success: true, project: mappedProject };
    } catch (error) {
      console.error("getProjectById error:", error);
      return { success: false, error: "Failed to fetch project" };
    }
  }

/**
 * --- Milestone Actions ---
 */

export async function createMilestone(input: {
  title: string;
  description?: string;
  projectId: string;
  dueDate?: Date;
  order?: number;
}) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const milestone = await prisma.milestone.create({
      data: input,
    });

    await emitSystemEvent({
      entityType: "project" as SystemEntityType, // Log context is project
      entityId: input.projectId,
      eventType: "MILESTONE_CREATED" as SystemEventType,
      actorId: session.user.id,
      description: `Added milestone: ${milestone.title}`,
      metadata: { milestoneId: milestone.id },
    });

    revalidateBothPaths(`projects/${input.projectId}`);
    return { success: true, milestone };
  } catch (error) {
    console.error("createMilestone error:", error);
    return { success: false, error: "Failed to create milestone" };
  }
}

/**
 * Update an existing milestone
 */
export async function updateMilestone(
  id: string,
  input: {
    title?: string;
    description?: string;
    status?: any; // MilestoneStatus
    dueDate?: Date;
    order?: number;
  }
) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const oldMilestone = await prisma.milestone.findUnique({
      where: { id },
      select: { projectId: true, title: true }
    });
    if (!oldMilestone) return { success: false, error: "Milestone not found" };

    const milestone = await prisma.milestone.update({
      where: { id },
      data: input,
    });

    await emitSystemEvent({
      entityType: "project" as SystemEntityType,
      entityId: oldMilestone.projectId,
      eventType: "MILESTONE_UPDATED" as SystemEventType,
      actorId: session.user.id,
      description: `Updated phase: ${milestone.title}`,
      metadata: { milestoneId: milestone.id },
    });

    revalidateBothPaths(`projects/${oldMilestone.projectId}`);
    return { success: true, milestone };
  } catch (error) {
    console.error("updateMilestone error:", error);
    return { success: false, error: "Failed to update milestone" };
  }
}

/**
 * Delete a milestone
 */
export async function deleteMilestone(id: string) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const milestone = await prisma.milestone.findUnique({
      where: { id },
      select: { projectId: true, title: true }
    });
    if (!milestone) return { success: false, error: "Milestone not found" };

    await prisma.milestone.delete({ where: { id } });

    await emitSystemEvent({
      entityType: "project" as SystemEntityType,
      entityId: milestone.projectId,
      eventType: "MILESTONE_DELETED" as SystemEventType,
      actorId: session.user.id,
      description: `Removed phase: ${milestone.title}`,
      metadata: { milestoneId: id },
    });

    revalidateBothPaths(`projects/${milestone.projectId}`);
    return { success: true };
  } catch (error) {
    console.error("deleteMilestone error:", error);
    return { success: false, error: "Failed to delete milestone" };
  }
}

/**
 * --- Issue Actions ---
 */

/**
 * Create a new issue
 */
export async function createIssue(input: {
  title: string;
  description?: string;
  milestoneId: string;
  priority?: string;
  type?: string;
  assigneeId?: string;
}) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    if (!(await checkPermission(session.user.id, "projects.issues", "create"))) {
      return { success: false, error: "Permission Denied: projects.issues.create" };
    }

    const milestone = await prisma.milestone.findUnique({
      where: { id: input.milestoneId },
      select: { projectId: true }
    });

    if (!milestone) return { success: false, error: "Milestone not found" };

    const issue = await prisma.issue.create({
      data: {
        ...input,
        reporterId: session.user.id,
      },
    });

    await emitSystemEvent({
      entityType: "project" as SystemEntityType,
      entityId: milestone.projectId,
      eventType: "ISSUE_CREATED" as SystemEventType,
      actorId: session.user.id,
      description: `Reported issue: ${issue.title}`,
      metadata: { issueId: issue.id, projectId: milestone.projectId },
      ...(input.assigneeId && {
          notification: {
              recipientId: input.assigneeId,
              type: "ISSUE_CREATED" as any,
              title: "New Issue Assigned",
              message: `Issue assigned: ${issue.title}`
          }
      })
    });

    revalidateBothPaths(`projects/${milestone.projectId}`);
    return { success: true, issue };
  } catch (error) {
    console.error("createIssue error:", error);
    return { success: false, error: "Failed to create issue" };
  }
}

/**
 * Update an existing issue
 */
export async function updateIssue(
  id: string,
  input: {
    title?: string;
    description?: string;
    status?: any; // IssueStatus
    priority?: string;
    type?: string;
    assigneeId?: string;
  }
) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const oldIssue = await prisma.issue.findUnique({
      where: { id },
      include: { Milestone: { select: { projectId: true } } }
    });
    if (!oldIssue) return { success: false, error: "Issue not found" };

    const issue = await prisma.issue.update({
      where: { id },
      data: input,
    });

    await emitSystemEvent({
      entityType: "project" as SystemEntityType,
      entityId: oldIssue.Milestone.projectId,
      eventType: "ISSUE_UPDATED" as SystemEventType,
      actorId: session.user.id,
      description: `Updated issue mission parameters: ${issue.title}`,
      metadata: { 
        issueId: issue.id, 
        projectId: oldIssue.Milestone.projectId,
        ...(input.assigneeId && input.assigneeId !== oldIssue.assigneeId && {
            assigneeChanged: true,
            from: oldIssue.assigneeId,
            to: input.assigneeId
        })
      },
      ...(input.assigneeId && input.assigneeId !== oldIssue.assigneeId && {
          notification: {
              recipientId: input.assigneeId,
              type: "ISSUE_ASSIGNED" as any,
              title: "Mission Re-assigned",
              message: `You have been assigned to: ${issue.title}`
          }
      })
    });

    revalidateBothPaths(`projects/${oldIssue.Milestone.projectId}`);
    return { success: true, issue };
  } catch (error) {
    console.error("updateIssue error:", error);
    return { success: false, error: "Failed to update issue" };
  }
}

/**
 * Delete an issue
 */
export async function deleteIssue(id: string) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const issue = await prisma.issue.findUnique({
      where: { id },
      include: { Milestone: { select: { projectId: true } } }
    });
    if (!issue) return { success: false, error: "Issue not found" };

    await prisma.issue.delete({ where: { id } });

    await emitSystemEvent({
      entityType: "project" as SystemEntityType,
      entityId: issue.Milestone.projectId,
      eventType: "ISSUE_DELETED" as SystemEventType,
      actorId: session.user.id,
      description: `De-commissioned issue: ${issue.title}`,
      metadata: { issueId: id },
    });

    revalidateBothPaths(`projects/${issue.Milestone.projectId}`);
    return { success: true };
  } catch (error) {
    console.error("deleteIssue error:", error);
    return { success: false, error: "Failed to delete issue" };
  }
}

/**
 * Reorder milestones for a project
 */
export async function reorderMilestones(projectId: string, sequence: { id: string; order: number }[]) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    if (!(await checkSystemPermission("system.projects", "update"))) {
      return { success: false, error: "Permission Denied: system.projects.update" };
    }

    // Bulk update within transaction
    await prisma.$transaction(
      sequence.map((item) =>
        prisma.milestone.update({
          where: { id: item.id },
          data: { order: item.order },
        })
      )
    );

    await emitSystemEvent({
      entityType: "project" as SystemEntityType,
      entityId: projectId,
      eventType: "PROJECT_UPDATED" as SystemEventType,
      actorId: session.user.id,
      description: "Mission roadmap sequence re-organized",
      metadata: { projectId, action: "REORDER_MILESTONES" },
    });

    revalidateBothPaths(`projects/${projectId}`);
    return { success: true };
  } catch (error) {
    console.error("reorderMilestones error:", error);
    return { success: false, error: "Failed to reorder milestones" };
  }
}
