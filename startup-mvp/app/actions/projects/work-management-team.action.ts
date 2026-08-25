"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getTodayDhakaDate } from "./work-session.action";
import { calculateCurrentWorkload, getBurnoutIndicators } from "@/lib/system/workload";

/**
 * Server action to fetch the work management summary of all active team members.
 */
export async function getTeamMembersWorkSummary() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    const today = await getTodayDhakaDate();
    const todayStart = new Date(today);
    const todayEnd = new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1);

    // 1. Fetch active employees
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

    // Auto-link employees to users on-the-fly if userId is null
    const users = await prisma.user.findMany({
      select: { id: true, name: true, email: true, image: true }
    });

    for (const emp of employees) {
      if (!emp.userId) {
        let matchingUser = users.find(
          (u) => u.email && emp.email && u.email.toLowerCase() === emp.email.toLowerCase()
        );
        if (!matchingUser) {
          matchingUser = users.find(
            (u) => u.name && emp.name && u.name.toLowerCase().includes(emp.name.toLowerCase())
          );
        }

        if (matchingUser) {
          await prisma.employee.update({
            where: { id: emp.id },
            data: { userId: matchingUser.id },
          });
          emp.userId = matchingUser.id;
          emp.user = matchingUser;
          console.log(`[Team Auto-Link] Linked employee "${emp.name}" to user "${matchingUser.name}"`);
        }
      }
    }

    const activeUserIds = employees.map((emp) => emp.userId).filter(Boolean) as string[];

    // 2. Fetch today's work sessions
    const workSessions = await prisma.workSession.findMany({
      where: {
        date: today,
        userId: { in: activeUserIds },
      },
      include: {
        Logs: true,
      },
    });

    // 3. Fetch all active tasks assigned to these users
    const activeTasks = await prisma.task.findMany({
      where: {
        assigneeId: { in: activeUserIds },
      },
    });

    // 4. Fetch daily updates (ActivityReport) for today
    const dailyReports = await prisma.activityReport.findMany({
      where: {
        reportDate: today,
        userId: { in: activeUserIds },
      },
    });

    // 5. Gather team summary
    const now = new Date();
    const teamData = await Promise.all(
      employees.map(async (emp) => {
        const sessionForUser = workSessions.find((ws) => ws.userId === emp.userId);
        let status: "WORKING" | "ON BREAK" | "NOT STARTED" | "COMPLETED" = "NOT STARTED";
        let activeTimeMs = 0;

        if (sessionForUser) {
          if (sessionForUser.status === "ACTIVE") {
            status = "WORKING";
          } else if (sessionForUser.status === "BREAK") {
            status = "ON BREAK";
          } else if (sessionForUser.status === "COMPLETED") {
            status = "COMPLETED";
          }

          activeTimeMs = sessionForUser.totalActiveMs;

          // Add outstanding elapsed time if currently working
          if (sessionForUser.status === "ACTIVE") {
            const activeLogs = sessionForUser.Logs.filter(
              (log) => log.actionType === "START" || log.actionType === "RESUME"
            );
            const lastActiveLog = activeLogs[activeLogs.length - 1];
            if (lastActiveLog) {
              activeTimeMs += now.getTime() - new Date(lastActiveLog.timestamp).getTime();
            }
          }
        }

        // Project count this employee is assigned to
        const projectsCount = await prisma.project.count({
          where: {
            status: "ACTIVE",
            teamMembers: {
              some: { id: emp.userId || "" },
            },
          },
        });

        // Tasks stats today
        const empTasks = activeTasks.filter((t) => t.assigneeId === emp.userId);
        const totalTasksCount = empTasks.length;
        const completedTasksCount = empTasks.filter(
          (t) =>
            (t.status === "completed" || t.status === "done") &&
            t.updatedAt >= todayStart &&
            t.updatedAt <= todayEnd
        ).length;
        const activeTasksCount = empTasks.filter(
          (t) =>
            t.status === "in_progress" ||
            t.status === "doing" ||
            t.status === "active" ||
            t.status === "review"
        ).length;
        const blockedTasksCount = empTasks.filter(
          (t) => t.status === "blocked" || t.status === "waiting"
        ).length;
        const overdueTasksCount = empTasks.filter(
          (t) =>
            t.status !== "completed" &&
            t.status !== "done" &&
            t.dueDate &&
            t.dueDate < todayStart
        ).length;

        // Fetch Workload calculation
        let workloadRatio = 0;
        try {
          const workload = await calculateCurrentWorkload(emp.id);
          workloadRatio = Math.round(workload.workloadRatio);
        } catch (e) {
          // fallback
        }

        // Daily report submission check
        const report = dailyReports.find((r) => r.userId === emp.userId);
        const hasSubmittedUpdate =
          report !== undefined &&
          (report.status === "SUBMITTED" || report.status === "APPROVED" || report.status === "REJECTED");

        return {
          id: emp.id,
          userId: emp.userId,
          name: emp.name,
          department: emp.department || "General",
          designation: emp.designation || "Team Member",
          photo: emp.photo || emp.user?.image || null,
          status,
          activeTimeMs: Math.max(0, activeTimeMs),
          projectsCount,
          tasksCount: totalTasksCount,
          completedCount: completedTasksCount,
          inProgressCount: activeTasksCount,
          blockedCount: blockedTasksCount,
          overdueCount: overdueTasksCount,
          workloadRatio,
          hasSubmittedUpdate,
        };
      })
    );

    return { success: true, team: teamData };
  } catch (error: any) {
    console.error("[TeamWorkSummary] Fetch error:", error);
    return { success: false, error: error.message || "Failed to load team summaries" };
  }
}

/**
 * Server action to fetch the complete work profile of a single employee.
 * Enforces RBAC access scopes.
 */
export async function getEmployeeWorkProfile(employeeId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized", profile: null };
    }

    const today = await getTodayDhakaDate();
    const todayStart = new Date(today);
    const todayEnd = new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1);

    // 1. Fetch employee metadata
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            role: true,
          },
        },
      },
    });

    if (!employee) {
      return { success: false, error: "Employee profile not found", profile: null };
    }

    // Auto-link employees to users on-the-fly if userId is null
    if (!employee.userId) {
      const users = await prisma.user.findMany({
        select: { id: true, name: true, email: true, image: true, role: true }
      });
      let matchingUser = users.find(
        (u) => u.email && employee.email && u.email.toLowerCase() === employee.email.toLowerCase()
      );
      if (!matchingUser) {
        matchingUser = users.find(
          (u) => u.name && employee.name && u.name.toLowerCase().includes(employee.name.toLowerCase())
        );
      }

      if (matchingUser) {
        await prisma.employee.update({
          where: { id: employee.id },
          data: { userId: matchingUser.id },
        });
        employee.userId = matchingUser.id;
        employee.user = matchingUser;
        console.log(`[Profile Auto-Link] Linked employee "${employee.name}" to user "${matchingUser.name}"`);
      }
    }

    const employeeUserId = employee.userId;

    // RBAC Check: Employees can only view their own profile; managers/admins can view everyone
    const isSelf = employeeUserId === session.user.id;
    const isManagerOrAdmin =
      session.user.role?.toLowerCase() === "admin" || session.user.role?.toLowerCase() === "manager";

    if (!isSelf && !isManagerOrAdmin) {
      return { success: false, error: "Permission Denied: Access scopes restricted", profile: null };
    }

    // 2. Fetch today's work session
    const workSession = await prisma.workSession.findFirst({
      where: {
        userId: employeeUserId || "",
        date: today,
      },
      include: {
        Logs: {
          orderBy: { timestamp: "asc" },
        },
      },
    });

    // 3. Fetch active projects assigned to this user
    const projects = await prisma.project.findMany({
      where: {
        status: "ACTIVE",
        teamMembers: {
          some: { id: employeeUserId || "" },
        },
      },
      include: {
        ProjectManager: {
          select: { id: true, name: true },
        },
      },
    });

    const activeProjectIds = projects.map((p) => p.id);

    // 4. Fetch all tasks assigned to the employee
    const tasks = await prisma.task.findMany({
      where: {
        assigneeId: employeeUserId || "",
      },
      include: {
        Project: {
          select: { id: true, title: true },
        },
      },
    });

    // 5. Fetch daily reports history (limit to last 30 days)
    const dailyUpdates = await prisma.activityReport.findMany({
      where: {
        userId: employeeUserId || "",
      },
      orderBy: {
        reportDate: "desc",
      },
      take: 30,
    });

    // 6. Fetch historical work sessions (last 30 days)
    const workSessionHistory = await prisma.workSession.findMany({
      where: {
        userId: employeeUserId || "",
      },
      orderBy: {
        date: "desc",
      },
      take: 30,
      include: {
        Logs: {
          orderBy: { timestamp: "asc" },
        },
      },
    });

    // 7. Fetch employee specific activity ledger logs
    const activities = await prisma.activity.findMany({
      where: {
        ownerId: employeeUserId || "",
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
    });

    // 8. Calculations for Overview & Status
    let currentWorkSessionState: "WORKING" | "ON BREAK" | "NOT STARTED" | "COMPLETED" = "NOT STARTED";
    let activeDurationMs = 0;
    let breakDurationMs = 0;
    let startTime: Date | null = null;
    let endTime: Date | null = null;
    let currentProjectTitle = "";
    let currentTaskTitle = "";

    const now = new Date();
    if (workSession) {
      startTime = workSession.startTime;
      endTime = workSession.endTime;
      activeDurationMs = workSession.totalActiveMs;
      breakDurationMs = workSession.totalBreakMs;

      if (workSession.status === "ACTIVE") {
        currentWorkSessionState = "WORKING";
        const activeLogs = workSession.Logs.filter(
          (log) => log.actionType === "START" || log.actionType === "RESUME"
        );
        const lastActiveLog = activeLogs[activeLogs.length - 1];
        if (lastActiveLog) {
          activeDurationMs += now.getTime() - new Date(lastActiveLog.timestamp).getTime();
        }
      } else if (workSession.status === "BREAK") {
        currentWorkSessionState = "ON BREAK";
        const breakLogs = workSession.Logs.filter((log) => log.actionType === "BREAK");
        const lastBreakLog = breakLogs[breakLogs.length - 1];
        if (lastBreakLog) {
          breakDurationMs += now.getTime() - new Date(lastBreakLog.timestamp).getTime();
        }
      } else if (workSession.status === "COMPLETED") {
        currentWorkSessionState = "COMPLETED";
      }

      // Find current focus task & project
      const activeLogs = workSession.Logs.filter(
        (log) => log.actionType === "START" || log.actionType === "RESUME"
      );
      const lastActiveLog = activeLogs[activeLogs.length - 1];
      if (lastActiveLog) {
        if (lastActiveLog.projectId) {
          const proj = projects.find((p) => p.id === lastActiveLog.projectId);
          currentProjectTitle = proj?.title || "";
        }
        if (lastActiveLog.taskId) {
          const tsk = tasks.find((t) => t.id === lastActiveLog.taskId);
          currentTaskTitle = tsk?.title || "";
        }
      }
    }

    // Fetch today's MyDay plan counts for the employee
    const employeeMyDayPlans = await prisma.myDayTask.findMany({
      where: {
        userId: employeeUserId || "",
        date: today,
      },
      include: {
        Task: { select: { status: true } },
      },
    });

    const myDayPlannedCount = employeeMyDayPlans.length;
    const myDayCompletedCount = employeeMyDayPlans.filter((p) => p.Task?.status === "completed" || p.Task?.status === "done").length;
    const myDayBlockedCount = employeeMyDayPlans.filter((p) => p.Task?.status === "blocked" || p.Task?.status === "waiting").length;

    // Workload calculation
    let workloadRatio = 0;
    try {
      const workload = await calculateCurrentWorkload(employeeId);
      workloadRatio = Math.round(workload.workloadRatio);
    } catch (e) {
      // fallback
    }

    // Task counts today
    const empCompletedTodayCount = tasks.filter(
      (t) =>
        (t.status === "completed" || t.status === "done") &&
        t.updatedAt >= todayStart &&
        t.updatedAt <= todayEnd
    ).length;

    const empInProgressCount = tasks.filter(
      (t) =>
        t.status === "in_progress" ||
        t.status === "doing" ||
        t.status === "active" ||
        t.status === "review"
    ).length;

    const empBlockedCount = tasks.filter((t) => t.status === "blocked" || t.status === "waiting").length;

    const empOverdueCount = tasks.filter(
      (t) =>
        t.status !== "completed" &&
        t.status !== "done" &&
        t.dueDate &&
        t.dueDate < todayStart
    ).length;

    // Today's update submission state
    const todayReport = dailyUpdates.find((r) => r.reportDate.toISOString().split("T")[0] === today.toISOString().split("T")[0]);
    const todayUpdateSubmitted =
      todayReport !== undefined &&
      (todayReport.status === "SUBMITTED" || todayReport.status === "APPROVED" || todayReport.status === "REJECTED");

    // Project progress details
    const projectsOverview = await Promise.all(
      projects.map(async (p) => {
        const projTasks = await prisma.task.findMany({
          where: { projectId: p.id },
        });

        const empProjTasks = tasks.filter((t) => t.projectId === p.id);

        const pmName = p.ProjectManager?.name || "Unassigned";
        const progressPercent =
          projTasks.length > 0
            ? Math.round(
                (projTasks.filter((t) => t.status === "completed" || t.status === "done").length /
                  projTasks.length) *
                  100
              )
            : 0;

        return {
          id: p.id,
          title: p.title,
          projectManager: pmName,
          status: p.status,
          progress: progressPercent,
          empActiveCount: empProjTasks.filter(
            (t) => t.status !== "completed" && t.status !== "done"
          ).length,
          empCompletedCount: empProjTasks.filter(
            (t) => t.status === "completed" || t.status === "done"
          ).length,
        };
      })
    );

    return {
      success: true,
      profile: {
        id: employee.id,
        userId: employee.userId,
        name: employee.name,
        email: employee.email,
        phone: employee.phone,
        department: employee.department || "General",
        designation: employee.designation || "Team Member",
        photo: employee.photo || employee.user?.image || null,
        status: employee.status,
        sessionState: {
          status: currentWorkSessionState,
          startTime: startTime ? startTime.toISOString() : null,
          endTime: endTime ? endTime.toISOString() : null,
          activeDurationMs,
          breakDurationMs,
          currentProject: currentProjectTitle || null,
          currentTask: currentTaskTitle || null,
        },
        workload: {
          ratio: workloadRatio,
        },
        taskStats: {
          total: tasks.length,
          completedToday: empCompletedTodayCount,
          inProgress: empInProgressCount,
          blocked: empBlockedCount,
          overdue: empOverdueCount,
          myDayPlanned: myDayPlannedCount,
          myDayCompleted: myDayCompletedCount,
          myDayBlocked: myDayBlockedCount,
        },
        todayUpdateSubmitted,
        todayReport: todayReport || null,
        projects: projectsOverview,
        tasks: tasks.map((t) => ({
          id: t.id,
          title: t.title,
          project: t.Project?.title || "General",
          priority: t.priority,
          status: t.status,
          dueDate: t.dueDate ? t.dueDate.toISOString().split("T")[0] : null,
        })),
        dailyUpdatesHistory: dailyUpdates.map((r) => ({
          id: r.id,
          date: r.reportDate.toISOString().split("T")[0],
          status: r.status,
          submittedAt: r.submittedAt ? r.submittedAt.toISOString() : null,
          completed: r.completed || "",
          pending: r.pending || "",
          blocked: r.blocked || "",
          summary: r.summary || "",
        })),
        workSessionHistory: workSessionHistory.map((s) => ({
          id: s.id,
          date: s.date.toISOString().split("T")[0],
          status: s.status,
          startTime: s.startTime.toISOString(),
          endTime: s.endTime ? s.endTime.toISOString() : null,
          activeDurationMs: s.totalActiveMs,
          breakDurationMs: s.totalBreakMs,
          logs: s.Logs.map((l) => ({
            id: l.id,
            actionType: l.actionType,
            timestamp: l.timestamp.toISOString(),
          })),
        })),
        recentActivity: activities.map((a) => ({
          id: a.id,
          timestamp: a.createdAt.toISOString(),
          subject: a.subject,
          description: a.description || "",
          type: a.type,
        })),
      },
    };
  } catch (error: any) {
    console.error("[EmployeeWorkProfile] Fetch error:", error);
    return { success: false, error: error.message || "Failed to load employee work profile", profile: null };
  }
}
