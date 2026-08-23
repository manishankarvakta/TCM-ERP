"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getTodayDhakaDate } from "./work-session.action";

export interface TaskCenterFilters {
  projectId?: string;
  assigneeId?: string;
  priority?: string;
  status?: string;
  dueDatePreset?: string;
  quickFilter?: string;
  searchQuery?: string;
}

/**
 * Server action to fetch work-management tasks matching specific query filters.
 */
export async function getCentralTaskCenterData(filters: TaskCenterFilters = {}) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized", tasks: [], employees: [], projects: [] };
    }

    const currentUserId = session.user.id;
    const today = await getTodayDhakaDate();
    const todayStart = new Date(today);
    const todayEnd = new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1);
    const tomorrowStart = new Date(today.getTime() + 24 * 60 * 60 * 1000);
    const tomorrowEnd = new Date(tomorrowStart.getTime() + 24 * 60 * 60 * 1000 - 1);
    
    // Get start of the current week (Sunday or Monday, let's assume Sunday for Dhaka BST)
    const currentWeekStart = new Date(todayStart);
    const dayOfWeek = currentWeekStart.getUTCDay();
    currentWeekStart.setUTCDate(currentWeekStart.getUTCDate() - dayOfWeek);
    const currentWeekEnd = new Date(currentWeekStart.getTime() + 7 * 24 * 60 * 60 * 1000 - 1);

    // 1. Build Prisma query where clause
    const where: any = {};

    // Filter by Project
    if (filters.projectId) {
      where.projectId = filters.projectId;
    }

    // Filter by Assignee
    if (filters.assigneeId) {
      where.assigneeId = filters.assigneeId;
    }

    // Filter by Priority
    if (filters.priority) {
      where.priority = filters.priority;
    }

    // Filter by Status
    if (filters.status) {
      where.status = filters.status;
    }

    // Filter by Due Date Presets
    if (filters.dueDatePreset) {
      switch (filters.dueDatePreset) {
        case "today":
          where.dueDate = {
            gte: todayStart,
            lte: todayEnd,
          };
          break;
        case "tomorrow":
          where.dueDate = {
            gte: tomorrowStart,
            lte: tomorrowEnd,
          };
          break;
        case "this_week":
          where.dueDate = {
            gte: currentWeekStart,
            lte: currentWeekEnd,
          };
          break;
        case "overdue":
          where.dueDate = {
            lt: todayStart,
          };
          where.status = {
            notIn: ["completed", "done"],
          };
          break;
        case "no_deadline":
          where.dueDate = null;
          break;
      }
    }

    // Handle Quick Filters
    if (filters.quickFilter) {
      switch (filters.quickFilter) {
        case "my_tasks":
          where.assigneeId = currentUserId;
          break;
        case "assigned_by_me":
          where.userId = currentUserId;
          where.assigneeId = { not: currentUserId };
          break;
        case "created_by_me":
          where.userId = currentUserId;
          break;
        case "unassigned":
          where.assigneeId = null;
          break;
        case "blocked":
          where.status = { in: ["blocked", "waiting"] };
          break;
        case "overdue":
          where.dueDate = { lt: todayStart };
          where.status = { notIn: ["completed", "done"] };
          break;
        case "due_today":
          where.dueDate = { gte: todayStart, lte: todayEnd };
          break;
        case "high_priority":
          where.priority = { in: ["high", "urgent"] };
          break;
      }
    }

    // Search query matches
    if (filters.searchQuery) {
      where.OR = [
        { title: { contains: filters.searchQuery, mode: "insensitive" } },
        { description: { contains: filters.searchQuery, mode: "insensitive" } },
      ];
    }

    // 2. Query matching tasks (limit to 150 for responsiveness)
    const tasks = await prisma.task.findMany({
      where,
      take: 150,
      orderBy: [
        {
          priority: "desc", // Default sorts urgent/high first
        },
        {
          dueDate: "asc",
        },
      ],
      include: {
        Assignee: {
          select: { id: true, name: true, image: true },
        },
        User: {
          select: { id: true, name: true },
        },
        Project: {
          select: { id: true, title: true },
        },
        Milestone: {
          select: { id: true, title: true },
        },
        BlockedBy: {
          include: {
            BlockingTask: {
              select: { id: true, title: true, status: true },
            },
          },
        },
      },
    });

    // 3. Fetch active employees & projects to populate client selector widgets
    const employees = await prisma.employee.findMany({
      where: { status: "active" },
      select: {
        id: true,
        name: true,
        userId: true,
      },
    });

    const activeProjects = await prisma.project.findMany({
      where: { status: "ACTIVE" },
      select: {
        id: true,
        title: true,
      },
    });

    return {
      success: true,
      tasks: tasks.map((t) => ({
        id: t.id,
        title: t.title,
        description: t.description || "",
        status: t.status,
        priority: t.priority,
        dueDate: t.dueDate ? t.dueDate.toISOString().split("T")[0] : null,
        assigneeName: t.Assignee?.name || "Unassigned",
        assigneeId: t.assigneeId,
        assigneeImage: t.Assignee?.image || null,
        creatorName: t.User?.name || "System",
        creatorId: t.userId,
        projectId: t.projectId,
        projectName: t.Project?.title || "General Work",
        milestoneId: t.milestoneId,
        milestoneName: t.Milestone?.title || null,
        isBlocked: t.status === "blocked" || t.status === "waiting",
        blockedByTasks: t.BlockedBy.map((dep) => ({
          id: dep.BlockingTask.id,
          title: dep.BlockingTask.title,
          status: dep.BlockingTask.status,
        })),
      })),
      employees,
      projects: activeProjects,
    };
  } catch (error: any) {
    console.error("[CentralTaskCenterData] Fetch error:", error);
    return { success: false, error: error.message || "Failed to load task center data", tasks: [], employees: [], projects: [] };
  }
}
