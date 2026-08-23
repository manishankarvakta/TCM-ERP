"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getTodayDhakaDate } from "./work-session.action";
import { calculateCurrentWorkload, getBurnoutIndicators } from "@/lib/system/workload";

/**
 * Main dashboard data query action for the Work Management Central Command Center.
 * Aggregates live team states, project status, task checklists, daily updates, and activity feeds.
 */
export async function getWorkManagementDashboardData() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    const today = await getTodayDhakaDate();
    const todayStart = new Date(today);
    const todayEnd = new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1);
    const tomorrowEnd = new Date(todayEnd.getTime() + 24 * 60 * 60 * 1000);

    // 1. Fetch active employees & users
    const employees = await prisma.employee.findMany({
      where: { status: "active" },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
    });
    // Fetch today's My Day plans for all active employees to optimize query performance
    const allMyDayTasks = await prisma.myDayTask.findMany({
      where: {
        date: today,
      },
      include: {
        Task: {
          select: { id: true, status: true },
        },
      },
    });


    const activeUserIds = employees.map((emp) => emp.userId).filter(Boolean) as string[];

    // 2. Fetch all active projects
    const activeProjects = await prisma.project.findMany({
      where: { status: "ACTIVE" },
      include: {
        ProjectManager: {
          select: { id: true, name: true },
        },
        Milestones: {
          select: { id: true, status: true },
        },
        Tasks: {
          select: { id: true, status: true, dueDate: true },
        },
      },
    });

    // 3. Fetch today's work sessions for active users
    const workSessions = await prisma.workSession.findMany({
      where: {
        date: today,
        userId: { in: activeUserIds },
      },
      include: {
        Logs: {
          orderBy: { timestamp: "asc" },
        },
      },
    });

    // 4. Fetch daily updates (ActivityReport) for today
    const dailyReports = await prisma.activityReport.findMany({
      where: {
        reportDate: today,
        userId: { in: activeUserIds },
      },
      include: {
        User: {
          select: { id: true, name: true },
        },
      },
    });

    // 5. Query today's tasks (polymorphic or direct tasks assigned to active users)
    const allActiveTasks = await prisma.task.findMany({
      where: {
        OR: [
          { assigneeId: { in: activeUserIds } },
          {
            AND: [
              { status: { notIn: ["completed", "done"] } },
              { projectId: { in: activeProjects.map((p) => p.id) } },
            ],
          },
        ],
      },
      include: {
        Assignee: {
          select: { id: true, name: true, image: true },
        },
        Project: {
          select: { id: true, title: true },
        },
      },
    });

    // 6. Calculate summary cards metrics
    const totalTeamMembers = employees.length;
    const activeProjectsCount = activeProjects.length;

    // Filter tasks for today's context
    const completedTasksToday = allActiveTasks.filter(
      (t) =>
        (t.status === "completed" || t.status === "done") &&
        t.updatedAt >= todayStart &&
        t.updatedAt <= todayEnd
    );

    const inProgressTasks = allActiveTasks.filter(
      (t) =>
        t.status === "in_progress" ||
        t.status === "doing" ||
        t.status === "active" ||
        t.status === "review"
    );

    const blockedTasks = allActiveTasks.filter((t) => t.status === "blocked" || t.status === "waiting");

    const overdueTasks = allActiveTasks.filter(
      (t) =>
        t.status !== "completed" &&
        t.status !== "done" &&
        t.dueDate &&
        t.dueDate < todayStart
    );

    // Today's relevant tasks: scheduled for today, due today, or active
    const todayTasksList = allActiveTasks.filter(
      (t) =>
        (t.dueDate && t.dueDate >= todayStart && t.dueDate <= todayEnd) ||
        (t.startDate && t.startDate >= todayStart && t.startDate <= todayEnd) ||
        (t.status !== "completed" && t.status !== "done" && t.assigneeId)
    );

    // Missing daily updates count
    const submittedUserIds = dailyReports
      .filter((r) => r.status === "SUBMITTED" || r.status === "APPROVED" || r.status === "REJECTED")
      .map((r) => r.userId);

    const missingUpdatesCount = employees.filter((emp) => emp.userId && !submittedUserIds.includes(emp.userId)).length;

    // 7. Needs Attention List Construction
    const needsAttentionBlocked = blockedTasks.map((t) => ({
      id: t.id,
      title: t.title,
      assignee: t.Assignee?.name || "Unassigned",
      assigneeImage: t.Assignee?.image || null,
      project: t.Project?.title || "General",
      status: t.status,
    }));

    const needsAttentionOverdue = overdueTasks.map((t) => ({
      id: t.id,
      title: t.title,
      assignee: t.Assignee?.name || "Unassigned",
      assigneeImage: t.Assignee?.image || null,
      project: t.Project?.title || "General",
      dueDate: t.dueDate ? t.dueDate.toISOString().split("T")[0] : "",
    }));

    const missingUpdatesList = employees
      .filter((emp) => emp.userId && !submittedUserIds.includes(emp.userId))
      .map((emp) => ({
        id: emp.id,
        name: emp.name,
        userId: emp.userId,
      }));

    const approachingDeadlines = allActiveTasks
      .filter(
        (t) =>
          t.status !== "completed" &&
          t.status !== "done" &&
          t.dueDate &&
          t.dueDate >= todayStart &&
          t.dueDate <= tomorrowEnd
      )
      .map((t) => ({
        id: t.id,
        title: t.title,
        dueDate: t.dueDate ? t.dueDate.toISOString().split("T")[0] : "",
        project: t.Project?.title || "General",
      }));

    // Calculate High Workloads (>80% ratio)
    const workloadList = await Promise.all(
      employees.map(async (emp) => {
        try {
          const workload = await calculateCurrentWorkload(emp.id);
          const burnout = await getBurnoutIndicators(emp.id);
          return {
            id: emp.id,
            name: emp.name,
            workloadRatio: Math.round(workload.workloadRatio),
            burnoutRisk: burnout.length > 0,
          };
        } catch (e) {
          return { id: emp.id, name: emp.name, workloadRatio: 0, burnoutRisk: false };
        }
      })
    );

    const highWorkload = workloadList.filter((w) => w.workloadRatio > 80);

    // 8. Team Live Status Construction
    const now = new Date();
    const teamLiveStatus = employees.map((emp) => {
      const session = workSessions.find((ws) => ws.userId === emp.userId);
      let status: "WORKING" | "ON BREAK" | "NOT STARTED" | "COMPLETED" = "NOT STARTED";
      let activeDurationMs = 0;
      let currentProjectName = "";
      let currentTaskTitle = "";

      if (session) {
        if (session.status === "ACTIVE") {
          status = "WORKING";
        } else if (session.status === "BREAK") {
          status = "ON BREAK";
        } else if (session.status === "COMPLETED") {
          status = "COMPLETED";
        }

        activeDurationMs = session.totalActiveMs;

        // If currently active, add the elapsed time since the last START or RESUME log
        if (session.status === "ACTIVE") {
          const activeLogs = session.Logs.filter(
            (log) => log.actionType === "START" || log.actionType === "RESUME"
          );
          const lastActiveLog = activeLogs[activeLogs.length - 1];
          if (lastActiveLog) {
            activeDurationMs += now.getTime() - new Date(lastActiveLog.timestamp).getTime();
          }
        }

        // Find the active project and task names from the last START or RESUME logs
        const logsWithContext = session.Logs.filter(
          (log) => log.actionType === "START" || log.actionType === "RESUME"
        );
        const lastLogWithContext = logsWithContext[logsWithContext.length - 1];
        if (lastLogWithContext) {
          if (lastLogWithContext.projectId) {
            const proj = activeProjects.find((p) => p.id === lastLogWithContext.projectId);
            currentProjectName = proj?.title || "";
          }
          if (lastLogWithContext.taskId) {
            const tsk = allActiveTasks.find((t) => t.id === lastLogWithContext.taskId);
            currentTaskTitle = tsk?.title || "";
          }
        }
      }

      // Completed/Remaining task counts for today
      const empCompletedCount = allActiveTasks.filter(
        (t) =>
          t.assigneeId === emp.userId &&
          (t.status === "completed" || t.status === "done") &&
          t.updatedAt >= todayStart &&
          t.updatedAt <= todayEnd
      ).length;

      const empRemainingCount = allActiveTasks.filter(
        (t) =>
          t.assigneeId === emp.userId &&
          t.status !== "completed" &&
          t.status !== "done"
      ).length;

      // Compute planned stats from in-memory My Day cache
      const empMyDayTasks = allMyDayTasks.filter((md) => md.userId === emp.userId);
      const totalPlanned = empMyDayTasks.length;
      const completedPlanned = empMyDayTasks.filter((md) => md.Task?.status === "completed" || md.Task?.status === "done").length;
      const blockedPlanned = empMyDayTasks.filter((md) => md.Task?.status === "blocked" || md.Task?.status === "waiting").length;

      return {
        id: emp.id,
        userId: emp.userId,
        name: emp.name,
        designation: emp.designation || "Team Member",
        photo: emp.photo || emp.user?.image || null,
        status,
        activeDurationMs: Math.max(0, activeDurationMs),
        completedTasksCount: empCompletedCount,
        remainingTasksCount: empRemainingCount,
        currentProject: currentProjectName || null,
        currentTask: currentTaskTitle || null,
        totalPlanned,
        completedPlanned,
        blockedPlanned,
      };
    });

    // 9. Today's Team Work List
    const todayTeamWork = todayTasksList.map((t) => ({
      id: t.id,
      title: t.title,
      employee: t.Assignee?.name || "Unassigned",
      employeeImage: t.Assignee?.image || null,
      project: t.Project?.title || "General",
      priority: t.priority,
      status: t.status,
      dueDate: t.dueDate ? t.dueDate.toISOString().split("T")[0] : null,
    }));

    // 10. Compact Project Overview
    const projectProgress = activeProjects.map((p) => {
      const pmName = p.ProjectManager?.name || "Unassigned";

      // Milestone aggregates
      const totalMilestones = p.Milestones.length;
      const completedMilestones = p.Milestones.filter((m) => m.status === "COMPLETED").length;

      // Tasks aggregates
      const projTasks = allActiveTasks.filter((t) => t.projectId === p.id);
      const totalTasks = projTasks.length;
      const completedTasks = projTasks.filter((t) => t.status === "completed" || t.status === "done").length;
      const activeTasks = projTasks.filter(
        (t) =>
          t.status === "in_progress" ||
          t.status === "doing" ||
          t.status === "active" ||
          t.status === "review"
      ).length;
      const blockedProjTasks = projTasks.filter((t) => t.status === "blocked" || t.status === "waiting").length;
      const overdueProjTasks = projTasks.filter(
        (t) =>
          t.status !== "completed" &&
          t.status !== "done" &&
          t.dueDate &&
          t.dueDate < todayStart
      ).length;

      // Completion progress percentage
      const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

      return {
        id: p.id,
        title: p.title,
        projectNumber: p.projectNumber || "N/A",
        projectManager: pmName,
        progress: progressPercent,
        activeTasksCount: activeTasks,
        completedTasksCount: completedTasks,
        blockedTasksCount: blockedProjTasks,
        overdueTasksCount: overdueProjTasks,
        milestonesSummary: `${completedMilestones} / ${totalMilestones}`,
      };
    });

    // 11. Daily Update status lists
    const dailyUpdateSubmissions = dailyReports.map((r) => ({
      id: r.id,
      name: r.User?.name || "Unknown",
      userId: r.userId,
      submittedAt: r.submittedAt ? r.submittedAt.toISOString() : null,
      status: r.status,
    }));

    const missingEmployeesList = employees
      .filter((emp) => emp.userId && !submittedUserIds.includes(emp.userId))
      .map((emp) => ({
        id: emp.id,
        name: emp.name,
        userId: emp.userId,
      }));

    // 12. Recent Activities from Activity Ledger
    const activities = await prisma.activity.findMany({
      where: {
        type: {
          in: [
            "DAILY_UPDATE_SUBMITTED",
            "WORK_SESSION_STARTED",
            "WORK_SESSION_BREAK",
            "WORK_SESSION_RESUMED",
            "WORK_SESSION_ENDED",
            "TASK_CREATED",
            "TASK_UPDATED",
            "TASK_COMPLETED",
          ] as any[],
        },
      },
      take: 20,
      orderBy: { createdAt: "desc" },
      include: {
        Owner: {
          select: { id: true, name: true },
        },
      },
    });

    const recentActivity = activities.map((act) => ({
      id: act.id,
      timestamp: act.createdAt.toISOString(),
      actorName: act.Owner?.name || "System",
      subject: act.subject,
      description: act.description || "",
      type: act.type,
    }));

    return {
      success: true,
      summary: {
        totalTeamMembers,
        activeProjects: activeProjectsCount,
        todayTasks: todayTasksList.length,
        completedToday: completedTasksToday.length,
        inProgress: inProgressTasks.length,
        blocked: blockedTasks.length,
        overdue: overdueTasks.length,
        missingUpdates: missingUpdatesCount,
      },
      needsAttention: {
        blockedTasks: needsAttentionBlocked,
        overdueTasks: needsAttentionOverdue,
        missingUpdates: missingUpdatesList,
        approachingDeadlines,
        highWorkload,
      },
      teamLiveStatus,
      todayTeamWork,
      projectProgress,
      dailyUpdateStatus: {
        submittedCount: dailyReports.length,
        totalCount: totalTeamMembers,
        submissions: dailyUpdateSubmissions,
        missing: missingEmployeesList,
      },
      recentActivity,
      businessDate: today.toISOString().split("T")[0],
    };
  } catch (error: any) {
    console.error("[WorkManagementDashboard] Fetch error:", error);
    return { success: false, error: error.message || "Failed to load dashboard data" };
  }
}
