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
 * Generate unique project number
 * Format: PROJ-YYYY-XXXX (e.g., PROJ-2026-0001)
 */
export async function generateProjectNumber(tx?: any): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `PROJ-${year}-`;

  const client = tx || prisma;
  const lastProject = await client.project.findFirst({
    where: {
      projectNumber: {
        startsWith: prefix,
      },
    },
    orderBy: {
      projectNumber: "desc",
    },
  });

  let nextNumber = 1;
  if (lastProject && lastProject.projectNumber) {
    const parts = lastProject.projectNumber.split("-");
    const lastNumStr = parts[parts.length - 1];
    const lastNumber = parseInt(lastNumStr || "0", 10);
    if (!isNaN(lastNumber)) {
      nextNumber = lastNumber + 1;
    }
  }

  return `${prefix}${nextNumber.toString().padStart(4, "0")}`;
}

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

    const projectNumber = await generateProjectNumber();

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
        projectNumber,
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
        teamMembers: { select: { id: true, name: true, image: true, email: true } },
        Milestones: {
          include: {
            Issues: {
              include: {
                Assignee: { select: { id: true, name: true, image: true } },
                Tasks: {
                  where: { parentId: null },
                  include: {
                    Assignee: { select: { id: true, name: true, image: true } },
                    Subtasks: {
                      include: {
                        Assignee: { select: { id: true, name: true, image: true } }
                      },
                      orderBy: { createdAt: "asc" }
                    }
                  },
                  orderBy: { createdAt: "asc" }
                }
              },
              orderBy: { createdAt: "asc" }
            }
          },
          orderBy: [
            { order: "asc" },
            { createdAt: "asc" }
          ]
        },
        _count: {
          select: { Tasks: true, Notes: true, Docs: true }
        }
      }
    });

    if (!project) return { success: false, error: "Project not found" };

    // Calculate total timesheet cost for project costing
    const timesheets = await prisma.timesheet.findMany({
      where: { projectId: id },
      include: {
        Employee: {
          include: {
            user: {
              select: {
                salary: true,
              },
            },
          },
        },
      },
    });

    let totalCost = 0;
    timesheets.forEach((ts) => {
      const salary = ts.Employee?.user?.salary
        ? Number(ts.Employee.user.salary)
        : (ts.Employee?.salary ? Number(ts.Employee.salary) : 0);
      const hourlyRate = salary > 0 ? salary / 208 : 0; // 26 working days * 8 hours = 208 hours
      totalCost += Number(ts.hours) * hourlyRate;
    });

    // Map to plain object
    const mappedProject = {
      ...project,
      budget: project.budget ? Number(project.budget) : null,
      totalCost: totalCost,
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
  startDate?: Date;
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
    startDate?: Date;
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
  startDate?: Date;
  dueDate?: Date;
}) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    if (!(await checkPermission(session.user.id, "projects.issues", "create"))) {
      return { success: false, error: "Permission Denied: projects.issues.create" };
    }

    const milestone = await prisma.milestone.findUnique({
      where: { id: input.milestoneId },
      select: { projectId: true, startDate: true, dueDate: true }
    });

    if (!milestone) return { success: false, error: "Milestone not found" };

    const startDate = input.startDate || milestone.startDate || undefined;
    const dueDate = input.dueDate || milestone.dueDate || undefined;

    const issue = await prisma.issue.create({
      data: {
        title: input.title,
        description: input.description,
        milestoneId: input.milestoneId,
        priority: input.priority,
        type: input.type,
        assigneeId: input.assigneeId,
        startDate: startDate,
        dueDate: dueDate,
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
    startDate?: Date;
    dueDate?: Date;
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

/**
 * Get all milestones across all projects with optional filtering
 */
export async function getAllMilestones(status?: string, search?: string) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    if (!(await checkPermission(session.user.id, "projects.milestones", "read"))) {
      return { success: false, error: "Permission Denied: projects.milestones.read" };
    }

    const where: any = {};
    if (status && status !== "all") {
      where.status = status;
    }
    if (search) {
      where.title = { contains: search, mode: "insensitive" };
    }

    const milestones = await prisma.milestone.findMany({
      where,
      include: {
        Project: {
          select: {
            id: true,
            title: true,
            status: true,
          }
        },
        Issues: true,
      },
      orderBy: [
        { dueDate: "asc" },
        { order: "asc" },
        { createdAt: "asc" }
      ],
    });

    return { success: true, milestones };
  } catch (error) {
    console.error("getAllMilestones error:", error);
    return { success: false, error: "Failed to fetch milestones" };
  }
}

/**
 * Get all issues across all projects with optional filtering
 */
export async function getAllIssues(status?: string, search?: string, priority?: string) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    if (!(await checkPermission(session.user.id, "projects.issues", "read"))) {
      return { success: false, error: "Permission Denied: projects.issues.read" };
    }

    const where: any = {};
    if (status && status !== "all") {
      where.status = status;
    }
    if (priority && priority !== "all") {
      where.priority = priority;
    }
    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { issueNumber: { contains: search, mode: "insensitive" } },
      ];
    }

    const issues = await prisma.issue.findMany({
      where,
      include: {
        Milestone: {
          include: {
            Project: {
              select: {
                id: true,
                title: true,
              }
            }
          }
        },
        Assignee: {
          select: {
            id: true,
            name: true,
            image: true,
          }
        },
        Reporter: {
          select: {
            id: true,
            name: true,
          }
        }
      },
      orderBy: { createdAt: "asc" },
    });

    return { success: true, issues };
  } catch (error) {
    console.error("getAllIssues error:", error);
    return { success: false, error: "Failed to fetch issues" };
  }
}

/**
 * Fetch project Gantt chart data (Milestones -> Issues -> Tasks -> Subtasks)
 */
export async function getProjectGanttData(projectId: string) {
  try {
    const session = await auth();
    if (!session?.user) {
      console.log("[DEBUG GANTT] No session user found");
      return { success: false, error: "Unauthorized" };
    }

    const hasPermissionResult = await checkPermission(session.user.id, "projects.timeline", "read");
    console.log(`[DEBUG GANTT] User: ${session.user.name} (${session.user.email}), ID: ${session.user.id}, Role: ${session.user.role}`);
    console.log(`[DEBUG GANTT] checkPermission("projects.timeline", "read") result: ${hasPermissionResult}`);

    if (!hasPermissionResult) {
      return { success: false, error: "Permission Denied: projects.timeline.read" };
    }

    const milestones = await prisma.milestone.findMany({
      where: { projectId },
      orderBy: [
        { order: "asc" },
        { createdAt: "asc" }
      ]
    });

    const milestoneIds = milestones.map(m => m.id);
    const issues = await prisma.issue.findMany({
      where: { milestoneId: { in: milestoneIds } },
      include: {
        Assignee: { select: { id: true, name: true, image: true } }
      },
      orderBy: { createdAt: "asc" }
    });

    const tasks = await prisma.task.findMany({
      where: { projectId },
      include: {
        Assignee: { select: { id: true, name: true, image: true } },
        BlockedBy: { select: { blockingTaskId: true } }
      },
      orderBy: { createdAt: "asc" }
    });

    // Group tasks
    const subtaskMap: Record<string, typeof tasks> = {};
    const rootTasksByIssueId: Record<string, typeof tasks> = {};

    tasks.forEach(task => {
      if (task.parentId) {
        if (!subtaskMap[task.parentId]) subtaskMap[task.parentId] = [];
        subtaskMap[task.parentId].push(task);
      } else if (task.issueId) {
        if (!rootTasksByIssueId[task.issueId]) rootTasksByIssueId[task.issueId] = [];
        rootTasksByIssueId[task.issueId].push(task);
      }
    });

    const mapSubtask = (st: typeof tasks[number]) => {
      const startDateVal = st.startDate || st.createdAt;
      const startDate = startDateVal.toISOString();
      const endDate = (st.dueDate || new Date(startDateVal.getTime() + 1 * 24 * 60 * 60 * 1000)).toISOString();

      let progress = 0;
      if (st.status === "COMPLETED" || st.status === "done" || st.status === "completed") {
        progress = 100;
      } else if (st.status === "in-progress" || st.status === "IN_PROGRESS") {
        progress = 50;
      }

      return {
        id: st.id,
        title: st.title,
        type: "subtask",
        startDate,
        endDate,
        progress,
        dependencies: st.BlockedBy.map((d: { blockingTaskId: string }) => d.blockingTaskId),
        children: [],
        isExpanded: false,
        assignee: st.Assignee ? { id: st.Assignee.id, name: st.Assignee.name, image: st.Assignee.image } : undefined,
        status: st.status,
        priority: st.priority,
        description: st.description
      };
    };

    const mapTask = (t: typeof tasks[number]) => {
      const children = (subtaskMap[t.id] || []).map(st => mapSubtask(st));
      const startDateVal = t.startDate || t.createdAt;
      const startDate = startDateVal.toISOString();
      const endDate = (t.dueDate || new Date(startDateVal.getTime() + 2 * 24 * 60 * 60 * 1000)).toISOString();

      let progress = 0;
      if (t.status === "COMPLETED" || t.status === "done" || t.status === "completed") {
        progress = 100;
      } else if (t.status === "in-progress" || t.status === "IN_PROGRESS") {
        progress = 50;
      }

      return {
        id: t.id,
        title: t.title,
        type: "task",
        startDate,
        endDate,
        progress,
        dependencies: t.BlockedBy.map((d: { blockingTaskId: string }) => d.blockingTaskId),
        children,
        isExpanded: false,
        assignee: t.Assignee ? { id: t.Assignee.id, name: t.Assignee.name, image: t.Assignee.image } : undefined,
        status: t.status,
        priority: t.priority,
        description: t.description
      };
    };

    const mapIssue = (issue: typeof issues[number]) => {
      const rootTasks = rootTasksByIssueId[issue.id] || [];
      const children = rootTasks.map(t => mapTask(t));

      let startDateVal = issue.startDate || issue.createdAt;
      let endDateVal = issue.dueDate || new Date(startDateVal.getTime() + 7 * 24 * 60 * 60 * 1000);

      if (children.length > 0) {
        const startTimes = children.map(c => new Date(c.startDate).getTime());
        const endTimes = children.map(c => new Date(c.endDate).getTime());
        startDateVal = new Date(Math.min(...startTimes));
        endDateVal = new Date(Math.max(...endTimes));
      }

      let progress = 0;
      if (issue.status === "COMPLETED") {
        progress = 100;
      } else if (children.length > 0) {
        const totalProgress = children.reduce((sum, c) => sum + c.progress, 0);
        progress = Math.round(totalProgress / children.length);
      } else if (issue.status === "IN_PROGRESS") {
        progress = 50;
      }

      return {
        id: issue.id,
        title: `Issue: ${issue.title}`,
        type: "issue",
        startDate: startDateVal.toISOString(),
        endDate: endDateVal.toISOString(),
        progress,
        dependencies: [],
        children,
        isExpanded: true,
        assignee: issue.Assignee ? { id: issue.Assignee.id, name: issue.Assignee.name, image: issue.Assignee.image } : undefined,
        status: issue.status,
        priority: issue.priority,
        description: issue.description
      };
    };

    const mappedData = milestones.map(m => {
      const milestoneIssues = issues.filter(i => i.milestoneId === m.id);
      const children = milestoneIssues.map(i => mapIssue(i));

      let startDateVal = m.startDate || m.createdAt;
      let endDateVal = m.dueDate || new Date(startDateVal.getTime() + 30 * 24 * 60 * 60 * 1000);

      if (children.length > 0) {
        const startTimes = children.map(c => new Date(c.startDate).getTime());
        const endTimes = children.map(c => new Date(c.endDate).getTime());
        if (!m.startDate) {
          startDateVal = new Date(Math.min(...startTimes));
        }
        if (!m.dueDate) {
          endDateVal = new Date(Math.max(...endTimes));
        }
      }

      let progress = 0;
      if (children.length > 0) {
        const totalProgress = children.reduce((sum, c) => sum + c.progress, 0);
        progress = Math.round(totalProgress / children.length);
      }

      return {
        id: m.id,
        title: `Milestone: ${m.title}`,
        type: "milestone",
        startDate: startDateVal.toISOString(),
        endDate: endDateVal.toISOString(),
        progress,
        dependencies: [],
        children,
        isExpanded: true,
        status: m.status,
        description: m.description
      };
    });

    return { success: true, data: mappedData };
  } catch (error) {
    console.error("getProjectGanttData error:", error);
    return { success: false, error: "Failed to fetch Gantt timeline data" };
  }
}

/**
 * Add a user manually to a project's team members list
 */
export async function addProjectMember(projectId: string, userId: string) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const project = await prisma.project.update({
      where: { id: projectId },
      data: {
        teamMembers: {
          connect: { id: userId }
        }
      }
    });

    revalidateBothPaths("projects");
    return { success: true, project };
  } catch (error: any) {
    console.error("addProjectMember error:", error);
    return { success: false, error: error.message || "Failed to add member" };
  }
}

/**
 * Remove a user manually from a project's team members list
 */
export async function removeProjectMember(projectId: string, userId: string) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const project = await prisma.project.update({
      where: { id: projectId },
      data: {
        teamMembers: {
          disconnect: { id: userId }
        }
      }
    });

    revalidateBothPaths("projects");
    return { success: true, project };
  } catch (error: any) {
    console.error("removeProjectMember error:", error);
    return { success: false, error: error.message || "Failed to remove member" };
  }
}

/**
 * Get all unique team members (contributors) associated with a project
 */
export async function getProjectTeam(projectId: string) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: {
        ownerId: true,
        projectManagerId: true,
        Owner: { select: { id: true, name: true, image: true, email: true } },
        ProjectManager: { select: { id: true, name: true, image: true, email: true } },
        teamMembers: { select: { id: true, name: true, image: true, email: true } },
        Tasks: {
          where: { assigneeId: { not: null } },
          select: {
            Assignee: { select: { id: true, name: true, image: true, email: true } }
          }
        }
      }
    });

    if (!project) return { success: false, error: "Project not found" };

    const memberMap = new Map<string, any>();

    // 1. Owner
    if (project.Owner) {
      memberMap.set(project.Owner.id, project.Owner);
    }

    // 2. Manager
    if (project.ProjectManager) {
      memberMap.set(project.ProjectManager.id, project.ProjectManager);
    }

    // 3. Team Members
    if (project.teamMembers) {
      project.teamMembers.forEach(member => {
        memberMap.set(member.id, member);
      });
    }

    // 4. Task Assignees
    if (project.Tasks) {
      project.Tasks.forEach(t => {
        if (t.Assignee) {
          memberMap.set(t.Assignee.id, t.Assignee);
        }
      });
    }

    return { success: true, users: Array.from(memberMap.values()) };
  } catch (error: any) {
    console.error("getProjectTeam error:", error);
    return { success: false, error: error.message || "Failed to fetch project team" };
  }
}
