"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getTodayDhakaDate } from "./work-session.action";
import { broadcastWorkManagementEvent } from "@/lib/system/realtime";

/**
 * Fetch personal My Day workspace data for the authenticated employee.
 */
export async function getMyDayData(dateStr?: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    const userId = session.user.id;
    const today = dateStr ? new Date(`${dateStr}T00:00:00.000Z`) : await getTodayDhakaDate();
    const todayStart = new Date(today);
    const todayEnd = new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1);

    // 1. Fetch user's planned tasks for today
    const myDayPlans = await prisma.myDayTask.findMany({
      where: {
        userId,
        date: today,
      },
      orderBy: {
        order: "asc",
      },
      include: {
        Task: {
          include: {
            Project: {
              select: { id: true, title: true },
            },
          },
        },
      },
    });

    const plannedTaskIds = myDayPlans.map((p) => p.taskId);

    // 2. Fetch all outstanding active tasks assigned to this user (not completed/done)
    const assignedTasks = await prisma.task.findMany({
      where: {
        assigneeId: userId,
        status: { notIn: ["completed", "done"] },
      },
      include: {
        Project: {
          select: { id: true, title: true },
        },
      },
    });

    // Filter assigned tasks that are not yet added to today's My Day plan
    const availableToPlan = assignedTasks.filter((t) => !plannedTaskIds.includes(t.id));

    // 3. Fetch "New Work Arrived Today"
    // Tasks created or assigned to this user today, which are not yet in their My Day plan
    const newWorkToday = await prisma.task.findMany({
      where: {
        assigneeId: userId,
        createdAt: {
          gte: todayStart,
          lte: todayEnd,
        },
        id: {
          notIn: plannedTaskIds,
        },
      },
      include: {
        Project: {
          select: { id: true, title: true },
        },
      },
    });

    // 4. Fetch user's today work session context
    const workSession = await prisma.workSession.findFirst({
      where: {
        userId,
        date: today,
      },
      include: {
        Logs: {
          orderBy: { timestamp: "asc" },
        },
      },
    });

    // 5. Compute stats and categories
    const plannedTasksMapped = myDayPlans.map((plan) => {
      const t = plan.Task;
      return {
        id: t.id,
        title: t.title,
        description: t.description || "",
        status: t.status,
        priority: t.priority,
        dueDate: t.dueDate ? t.dueDate.toISOString().split("T")[0] : null,
        projectId: t.projectId,
        projectName: t.Project?.title || "General Work",
        order: plan.order,
        planTaskId: plan.id,
      };
    });

    const completedToday = plannedTasksMapped.filter(
      (t) => t.status === "completed" || t.status === "done"
    );

    const inProgressToday = plannedTasksMapped.filter(
      (t) =>
        t.status === "in_progress" ||
        t.status === "doing" ||
        t.status === "active" ||
        t.status === "review"
    );

    const blockedToday = plannedTasksMapped.filter(
      (t) => t.status === "blocked" || t.status === "waiting"
    );

    const pendingToday = plannedTasksMapped.filter(
      (t) => t.status !== "completed" && t.status !== "done"
    );

    // Carry over: incomplete tasks planned today
    const carryOver = pendingToday;

    return {
      success: true,
      dateStr: today.toISOString().split("T")[0],
      plannedTasks: plannedTasksMapped,
      availableToPlan: availableToPlan.map((t) => ({
        id: t.id,
        title: t.title,
        status: t.status,
        priority: t.priority,
        projectName: t.Project?.title || "General Work",
        dueDate: t.dueDate ? t.dueDate.toISOString().split("T")[0] : null,
      })),
      newWorkToday: newWorkToday.map((t) => ({
        id: t.id,
        title: t.title,
        status: t.status,
        priority: t.priority,
        projectName: t.Project?.title || "General Work",
        dueDate: t.dueDate ? t.dueDate.toISOString().split("T")[0] : null,
      })),
      stats: {
        totalPlanned: plannedTasksMapped.length,
        completed: completedToday.length,
        inProgress: inProgressToday.length,
        pending: pendingToday.length,
        blocked: blockedToday.length,
      },
      workSession: workSession
        ? {
            id: workSession.id,
            status: workSession.status,
            totalActiveMs: workSession.totalActiveMs,
            totalBreakMs: workSession.totalBreakMs,
            startTime: workSession.startTime.toISOString(),
            endTime: workSession.endTime ? workSession.endTime.toISOString() : null,
            logs: workSession.Logs.map((l) => ({
              id: l.id,
              actionType: l.actionType,
              timestamp: l.timestamp.toISOString(),
              taskId: l.taskId,
              projectId: l.projectId,
            })),
          }
        : null,
    };
  } catch (error: any) {
    console.error("[MyDayData] Fetch error:", error);
    return { success: false, error: error.message || "Failed to load My Day data" };
  }
}

/**
 * Add a task to My Day plan for a specific date.
 */
export async function addTaskToMyDay(taskId: string, dateStr?: string, targetUserId?: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    let userId = session.user.id;
    if (targetUserId && targetUserId !== userId) {
      const role = session.user.role?.toLowerCase();
      if (role !== "admin" && role !== "manager") {
        return { success: false, error: "Permission Denied: Only managers and admins can manage other users' plans." };
      }
      userId = targetUserId;
    }
    const today = dateStr ? new Date(`${dateStr}T00:00:00.000Z`) : await getTodayDhakaDate();

    // Fetch the task to confirm access permissions
    const task = await prisma.task.findUnique({
      where: { id: taskId },
    });

    if (!task) {
      return { success: false, error: "Task not found" };
    }

    // Duplicate check protection
    const existing = await prisma.myDayTask.findUnique({
      where: {
        userId_date_taskId: {
          userId,
          date: today,
          taskId,
        },
      },
    });

    if (existing) {
      return { success: true, message: "Task is already planned for today" };
    }

    // Determine current max order to append task to end of plan
    const maxOrder = await prisma.myDayTask.aggregate({
      where: {
        userId,
        date: today,
      },
      _max: {
        order: true,
      },
    });

    const nextOrder = (maxOrder._max.order || 0) + 1;

    // Create the planning join item
    await prisma.myDayTask.create({
      data: {
        userId,
        date: today,
        taskId,
        order: nextOrder,
      },
    });

    broadcastWorkManagementEvent("MY_DAY_TASK_ADDED", {
      userId,
      taskId,
      date: today.toISOString().split("T")[0],
    });

    return { success: true };
  } catch (error: any) {
    console.error("addTaskToMyDay error:", error);
    return { success: false, error: error.message || "Failed to add task to daily plan" };
  }
}

/**
 * Remove a task from today's My Day plan.
 */
export async function removeTaskFromMyDay(taskId: string, dateStr?: string, targetUserId?: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    let userId = session.user.id;
    if (targetUserId && targetUserId !== userId) {
      const role = session.user.role?.toLowerCase();
      if (role !== "admin" && role !== "manager") {
        return { success: false, error: "Permission Denied: Only managers and admins can manage other users' plans." };
      }
      userId = targetUserId;
    }
    const today = dateStr ? new Date(`${dateStr}T00:00:00.000Z`) : await getTodayDhakaDate();

    // Delete plan item
    await prisma.myDayTask.delete({
      where: {
        userId_date_taskId: {
          userId,
          date: today,
          taskId,
        },
      },
    });

    broadcastWorkManagementEvent("MY_DAY_TASK_REMOVED", {
      userId,
      taskId,
      date: today.toISOString().split("T")[0],
    });

    return { success: true };
  } catch (error: any) {
    console.error("removeTaskFromMyDay error:", error);
    return { success: false, error: error.message || "Failed to remove task from daily plan" };
  }
}

/**
 * Update priority ordering of tasks in today's My Day plan.
 */
export async function reorderMyDayTasks(taskIds: string[], dateStr?: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    const userId = session.user.id;
    const today = dateStr ? new Date(`${dateStr}T00:00:00.000Z`) : await getTodayDhakaDate();

    // Perform transaction to rewrite order indexes
    await prisma.$transaction(
      taskIds.map((taskId, index) =>
        prisma.myDayTask.update({
          where: {
            userId_date_taskId: {
              userId,
              date: today,
              taskId,
            },
          },
          data: {
            order: index + 1,
          },
        })
      )
    );

    broadcastWorkManagementEvent("MY_DAY_TASK_REORDERED", {
      userId,
      taskIds,
      date: today.toISOString().split("T")[0],
    });

    return { success: true };
  } catch (error: any) {
    console.error("reorderMyDayTasks error:", error);
    return { success: false, error: error.message || "Failed to save daily task order" };
  }
}

/**
 * Generate suggestions prefill text blocks for the Daily Update form based on today's My Day status.
 */
export async function generateDailyUpdateDraftText(dateStr?: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    const today = dateStr ? new Date(`${dateStr}T00:00:00.000Z`) : await getTodayDhakaDate();

    const plans = await prisma.myDayTask.findMany({
      where: {
        userId: session.user.id,
        date: today,
      },
      orderBy: { order: "asc" },
      include: {
        Task: true,
      },
    });

    const completed = plans
      .filter((p) => p.Task.status === "completed" || p.Task.status === "done")
      .map((p) => `- ${p.Task.title}`)
      .join("\n");

    const pending = plans
      .filter((p) => p.Task.status !== "completed" && p.Task.status !== "done" && p.Task.status !== "blocked" && p.Task.status !== "waiting")
      .map((p) => `- ${p.Task.title}`)
      .join("\n");

    const blocked = plans
      .filter((p) => p.Task.status === "blocked" || p.Task.status === "waiting")
      .map((p) => `- ${p.Task.title}`)
      .join("\n");

    return {
      success: true,
      draft: {
        completed: completed || "- No completed tasks",
        pending: pending || "- No pending tasks",
        blocked: blocked || "- No blocked tasks",
        newWork: "- None",
        summary: `Completed today's planned focus tasks. Outstanding items carried forward.`,
      },
    };
  } catch (error: any) {
    console.error("generateDailyUpdateDraftText error:", error);
    return { success: false, error: error.message || "Failed to generate daily update suggestion" };
  }
}

/**
 * Read-only view of a team member's My Day plan for managers.
 */
export async function getEmployeeMyDayData(employeeId: string, dateStr?: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    const isManager =
      session.user.role?.toLowerCase() === "admin" || session.user.role?.toLowerCase() === "manager";

    if (!isManager) {
      return { success: false, error: "Permission Denied: Managers only" };
    }

    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      select: { userId: true, name: true },
    });

    if (!employee || !employee.userId) {
      return { success: false, error: "Employee profile or user account not found" };
    }

    const employeeUserId = employee.userId;
    const today = dateStr ? new Date(`${dateStr}T00:00:00.000Z`) : await getTodayDhakaDate();

    // Fetch planned tasks
    const plans = await prisma.myDayTask.findMany({
      where: {
        userId: employeeUserId,
        date: today,
      },
      orderBy: { order: "asc" },
      include: {
        Task: {
          include: {
            Project: { select: { title: true } },
          },
        },
      },
    });

    // Fetch work session
    const workSession = await prisma.workSession.findFirst({
      where: {
        userId: employeeUserId,
        date: today,
      },
      include: {
        Logs: { orderBy: { timestamp: "asc" } },
      },
    });

    const plannedTasksMapped = plans.map((p) => {
      const t = p.Task;
      return {
        id: t.id,
        title: t.title,
        status: t.status,
        priority: t.priority,
        projectName: t.Project?.title || "General Work",
        dueDate: t.dueDate ? t.dueDate.toISOString().split("T")[0] : null,
        order: p.order,
      };
    });

    return {
      success: true,
      employeeName: employee.name,
      plannedTasks: plannedTasksMapped,
      workSession: workSession
        ? {
            status: workSession.status,
            totalActiveMs: workSession.totalActiveMs,
            totalBreakMs: workSession.totalBreakMs,
            startTime: workSession.startTime.toISOString(),
            endTime: workSession.endTime ? workSession.endTime.toISOString() : null,
          }
        : null,
    };
  } catch (error: any) {
    console.error("getEmployeeMyDayData error:", error);
    return { success: false, error: error.message || "Failed to load employee daily plan" };
  }
}
