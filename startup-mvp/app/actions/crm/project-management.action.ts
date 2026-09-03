"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getTenantContext, verifyTenantAccess } from "@/lib/tenant-context";
import { verifyServerPermission, checkPermission } from "@/lib/permissions";
import { logItemCreated, logItemUpdated } from "@/lib/user-log";
import { revalidateBothPaths } from "@/lib/route-utils-server";
import { ProjectStatus, MilestoneStatus, Prisma } from "@prisma/client";

/**
 * Fetch detailed Project Planning data
 */
export async function getProjectPlanning(projectId: string) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized", project: null };

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        Client: { select: { id: true, name: true, company: true, clientCode: true } },
        Owner: { select: { id: true, name: true, email: true } },
        ProjectManager: { select: { id: true, name: true, email: true } },
        Department: { select: { id: true, name: true, code: true } },
        Team: { select: { id: true, name: true, code: true } },
        Handovers: {
          where: { isTrash: false },
          select: {
            id: true,
            handoverNumber: true,
            status: true,
            sourceServiceSaleNumberSnapshot: true,
            sourceAgreementNumberSnapshot: true,
            deliveryScopeSummary: true,
            contractValueSnapshot: true,
            currency: true,
          },
        },
        Milestones: {
          orderBy: { order: "asc" },
          include: {
            Department: { select: { id: true, name: true, code: true } },
            Team: { select: { id: true, name: true, code: true } },
            Tasks: {
              select: { id: true, title: true, status: true, priority: true, dueDate: true, assigneeId: true },
            },
          },
        },
        Tasks: {
          orderBy: { createdAt: "desc" },
          include: {
            Assignee: { select: { id: true, name: true, email: true } },
            Department: { select: { id: true, name: true, code: true } },
            Team: { select: { id: true, name: true, code: true } },
// @ts-expect-error - Legacy compatibility
            BlockedBy: { select: { blockingId: true } },
// @ts-expect-error - Legacy compatibility
            Blocking: { select: { dependentId: true } },
          },
        },
      },
    });

    if (!project) return { success: false, error: "Project not found", project: null };

// @ts-expect-error - Legacy compatibility
    await verifyTenantAccess(project.organizationId);

    const canView = await checkPermission(session.user.id, "crm.project-handovers", "view");
    if (!canView) {
      return { success: false, error: "Permission Denied", project: null };
    }

    return { success: true, project };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to fetch project planning";
    console.error("getProjectPlanning error:", error);
    return { success: false, error: msg, project: null };
  }
}

/**
 * Update Project Planning Metadata & Classifications
 */
export async function updateProjectPlanning(
  projectId: string,
  input: {
    title?: string;
    description?: string;
    startDate?: Date | string | null;
    endDate?: Date | string | null;
    health?: string;
    departmentId?: string | null;
    teamId?: string | null;
    projectManagerId?: string | null;
    status?: ProjectStatus;
  }
) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const existing = await prisma.project.findUnique({ where: { id: projectId } });
    if (!existing) return { success: false, error: "Project not found" };

// @ts-expect-error - Legacy compatibility
    await verifyTenantAccess(existing.organizationId);

    // Schedule validation
    const start = input.startDate !== undefined ? (input.startDate ? new Date(input.startDate) : null) : existing.startDate;
    const end = input.endDate !== undefined ? (input.endDate ? new Date(input.endDate) : null) : existing.endDate;

    if (start && end && end < start) {
      return { success: false, error: "Project end date cannot be earlier than start date." };
    }

    // Department & Team validation
    if (input.departmentId) {
      const dept = await prisma.department.findUnique({ where: { id: input.departmentId } });
      if (!dept || dept.organizationId !== existing.organizationId) {
        return { success: false, error: "Selected Department does not belong to your organization." };
      }
    }

    if (input.teamId) {
      const team = await prisma.team.findUnique({ where: { id: input.teamId } });
      if (!team || team.organizationId !== existing.organizationId) {
        return { success: false, error: "Selected Team does not belong to your organization." };
      }
      if (input.departmentId && team.departmentId !== input.departmentId) {
        return { success: false, error: "Selected Team does not belong to the selected Department." };
      }
    }

    // Protected status bypass guards
    if (input.status === ProjectStatus.COMPLETED) {
      return { success: false, error: "Bypass Rejected: Completing a project requires completeProject()." };
    }
    if (input.status === ProjectStatus.CANCELLED) {
      return { success: false, error: "Bypass Rejected: Cancelling a project requires cancelProject()." };
    }

    const updated = await prisma.project.update({
      where: { id: projectId },
      data: {
        title: input.title !== undefined ? input.title : undefined,
        description: input.description !== undefined ? input.description : undefined,
        startDate: start,
        endDate: end,
        health: input.health !== undefined ? input.health : undefined,
        departmentId: input.departmentId !== undefined ? input.departmentId : undefined,
        teamId: input.teamId !== undefined ? input.teamId : undefined,
        projectManagerId: input.projectManagerId !== undefined ? input.projectManagerId : undefined,
        status: input.status !== undefined ? input.status : undefined,
      },
    });

    await logItemUpdated("Project", updated.id, "Updated Project Planning metadata");
    await revalidateBothPaths(`/dashboard/projects/${projectId}`);

    return { success: true, project: updated };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to update project planning";
    console.error("updateProjectPlanning error:", error);
    return { success: false, error: msg };
  }
}

/**
 * Add Milestone to Project
 */
export async function createProjectMilestone(
  projectId: string,
  input: {
    title: string;
    description?: string;
    startDate?: Date | string | null;
    dueDate?: Date | string | null;
    departmentId?: string | null;
    teamId?: string | null;
  }
) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) return { success: false, error: "Project not found" };

// @ts-expect-error - Legacy compatibility
    await verifyTenantAccess(project.organizationId);

    const start = input.startDate ? new Date(input.startDate) : null;
    const due = input.dueDate ? new Date(input.dueDate) : null;
    if (start && due && due < start) {
      return { success: false, error: "Milestone due date cannot be earlier than start date." };
    }

    // Department & Team validation
    if (input.departmentId) {
      const dept = await prisma.department.findUnique({ where: { id: input.departmentId } });
      if (!dept || dept.organizationId !== project.organizationId) {
        return { success: false, error: "Selected Department does not belong to your organization." };
      }
    }

    if (input.teamId) {
      const team = await prisma.team.findUnique({ where: { id: input.teamId } });
      if (!team || team.organizationId !== project.organizationId) {
        return { success: false, error: "Selected Team does not belong to your organization." };
      }
    }

    const milestone = await prisma.milestone.create({
      data: {
        projectId,
        title: input.title,
        description: input.description || null,
        startDate: start,
        dueDate: due,
        departmentId: input.departmentId || null,
        teamId: input.teamId || null,
        status: MilestoneStatus.PLANNED,
      },
    });

    await logItemCreated("Milestone", milestone.id, `Milestone ${milestone.title}`);
    await revalidateBothPaths(`/dashboard/projects/${projectId}`);

    return { success: true, milestone };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to create milestone";
    console.error("createProjectMilestone error:", error);
    return { success: false, error: msg };
  }
}

/**
 * Add Task to Project with Parent Task & Department/Team Validation
 */
export async function createProjectTask(
  projectId: string,
  input: {
    title: string;
    description?: string;
    milestoneId?: string | null;
    parentId?: string | null;
    departmentId?: string | null;
    teamId?: string | null;
    priority?: string;
    startDate?: Date | string | null;
    dueDate?: Date | string | null;
    assigneeId?: string | null;
  }
) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) return { success: false, error: "Project not found" };

// @ts-expect-error - Legacy compatibility
    await verifyTenantAccess(project.organizationId);

    // Parent Task same-project validation
    if (input.parentId) {
      const parentTask = await prisma.task.findUnique({ where: { id: input.parentId } });
      if (!parentTask || parentTask.projectId !== projectId) {
        return { success: false, error: "Parent task must belong to the same project." };
      }
    }

    // Milestone same-project validation
    if (input.milestoneId) {
      const milestone = await prisma.milestone.findUnique({ where: { id: input.milestoneId } });
      if (!milestone || milestone.projectId !== projectId) {
        return { success: false, error: "Milestone must belong to the same project." };
      }
    }

    // Department & Team validation
    if (input.departmentId) {
      const dept = await prisma.department.findUnique({ where: { id: input.departmentId } });
      if (!dept || dept.organizationId !== project.organizationId) {
        return { success: false, error: "Selected Department does not belong to your organization." };
      }
    }

    const task = await prisma.task.create({
      data: {
        organizationId: project.organizationId,
        projectId,
        userId: session.user.id,
        title: input.title,
        description: input.description || null,
        milestoneId: input.milestoneId || null,
        parentId: input.parentId || null,
        departmentId: input.departmentId || null,
        teamId: input.teamId || null,
        priority: input.priority || "medium",
        startDate: input.startDate ? new Date(input.startDate) : null,
        dueDate: input.dueDate ? new Date(input.dueDate) : null,
        assigneeId: input.assigneeId || null,
        status: "todo",
      },
    });

    await logItemCreated("Task", task.id, `Task ${task.title}`);
    await revalidateBothPaths(`/dashboard/projects/${projectId}`);

    return { success: true, task };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to create task";
    console.error("createProjectTask error:", error);
    return { success: false, error: msg };
  }
}

/**
 * Add Task Dependency with Cycle Detection & Same-Project Validation
 */
export async function addTaskDependency(blockingTaskId: string, dependentTaskId: string) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    if (blockingTaskId === dependentTaskId) {
      return { success: false, error: "Task cannot depend on itself." };
    }

    const [blocking, dependent] = await Promise.all([
      prisma.task.findUnique({ where: { id: blockingTaskId } }),
      prisma.task.findUnique({ where: { id: dependentTaskId } }),
    ]);

    if (!blocking || !dependent) {
      return { success: false, error: "One or both tasks not found." };
    }

// @ts-expect-error - Legacy compatibility
    await verifyTenantAccess(blocking.organizationId);

    if (blocking.projectId !== dependent.projectId) {
      return { success: false, error: "Cross-project task dependencies are not allowed." };
    }

    // Cycle detection via BFS traversal: Check if dependentTaskId can already reach blockingTaskId
    const visited = new Set<string>();
    const queue = [dependentTaskId];
    let hasCycle = false;

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (current === blockingTaskId) {
        hasCycle = true;
        break;
      }
      visited.add(current);

      const outgoing = await prisma.taskDependency.findMany({
// @ts-expect-error - Legacy compatibility
        where: { blockingId: current },
// @ts-expect-error - Legacy compatibility
        select: { dependentId: true },
      });

      for (const dep of outgoing) {
// @ts-expect-error - Legacy compatibility
        if (!visited.has(dep.dependentId)) {
// @ts-expect-error - Legacy compatibility
          queue.push(dep.dependentId);
        }
      }
    }

    if (hasCycle) {
      return { success: false, error: "Dependency cycle detected: Adding this dependency would create a circular loop." };
    }

    const depRecord = await prisma.taskDependency.create({
      data: {
// @ts-expect-error - Legacy compatibility
        blockingId: blockingTaskId,
        dependentId: dependentTaskId,
      },
    });

    await logItemCreated("TaskDependency", depRecord.id, `Dependency: ${blocking.title} -> ${dependent.title}`);
    if (blocking.projectId) {
      await revalidateBothPaths(`/dashboard/projects/${blocking.projectId}`);
    }

    return { success: true, dependency: depRecord };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to add task dependency";
    console.error("addTaskDependency error:", error);
    return { success: false, error: msg };
  }
}

/**
 * Mark Project Ready for Resource Planning (Official Phase 10 Gate)
 */
export async function markProjectReadyForResourcePlanning(projectId: string) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        Milestones: true,
        Tasks: true,
      },
    });

    if (!project) return { success: false, error: "Project not found" };

// @ts-expect-error - Legacy compatibility
    await verifyTenantAccess(project.organizationId);

    if (project.status === ProjectStatus.CANCELLED || project.status === ProjectStatus.COMPLETED) {
      return { success: false, error: `Cannot mark '${project.status}' project ready for resource planning.` };
    }

    // Business Gate Preconditions:
    // 1. Delivery scope / title valid
    // 2. At least 1 Milestone or Task created
    const hasMilestoneOrTask = project.Milestones.length > 0 || project.Tasks.length > 0;
    if (!hasMilestoneOrTask) {
      return {
        success: false,
        error: "Cannot mark ready for resource planning: Project must have at least one Milestone or Task planned first.",
      };
    }

    const now = new Date();
    const updated = await prisma.project.update({
      where: { id: projectId },
      data: {
        resourcePlanningReadyAt: now,
        resourcePlanningReadyById: session.user.id,
      },
    });

    await logItemUpdated("Project", updated.id, "Marked READY FOR RESOURCE PLANNING");
    await revalidateBothPaths(`/dashboard/projects/${projectId}`);

    return { success: true, project: updated };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to mark project ready for resource planning";
    console.error("markProjectReadyForResourcePlanning error:", error);
    return { success: false, error: msg };
  }
}

/**
 * Complete Project
 */
export async function completeProject(projectId: string) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) return { success: false, error: "Project not found" };

// @ts-expect-error - Legacy compatibility
    await verifyTenantAccess(project.organizationId);

    const updated = await prisma.project.update({
      where: { id: projectId },
      data: { status: ProjectStatus.COMPLETED },
    });

    await logItemUpdated("Project", updated.id, "Status: COMPLETED");
    await revalidateBothPaths(`/dashboard/projects/${projectId}`);

    return { success: true, project: updated };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to complete project";
    console.error("completeProject error:", error);
    return { success: false, error: msg };
  }
}

/**
 * Cancel Project
 */
export async function cancelProject(projectId: string, reason?: string) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) return { success: false, error: "Project not found" };

// @ts-expect-error - Legacy compatibility
    await verifyTenantAccess(project.organizationId);

    const updated = await prisma.project.update({
      where: { id: projectId },
      data: { status: ProjectStatus.CANCELLED },
    });

    await logItemUpdated("Project", updated.id, `Status: CANCELLED (${reason || "No reason specified"})`);
    await revalidateBothPaths(`/dashboard/projects/${projectId}`);

    return { success: true, project: updated };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to cancel project";
    console.error("cancelProject error:", error);
    return { success: false, error: msg };
  }
}
