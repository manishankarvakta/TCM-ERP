"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createActivityRecord } from "@/lib/system/activity-ledger";
import { broadcastUserEvent, broadcastProjectEvent, broadcastWorkManagementEvent } from "@/lib/system/realtime";

// Timezone offset for Asia/Dhaka (UTC+6)
const DHAKA_OFFSET = 6 * 60 * 60 * 1000;

/**
 * Helper to get today's date normalized to Asia/Dhaka midnight in UTC
 */
export async function getTodayDhakaDate(): Promise<Date> {
  const now = new Date();
  const dhakaTime = new Date(now.getTime() + DHAKA_OFFSET);
  const yyyy = dhakaTime.getUTCFullYear();
  const mm = String(dhakaTime.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(dhakaTime.getUTCDate()).padStart(2, '0');
  return new Date(`${yyyy}-${mm}-${dd}T00:00:00.000Z`);
}

/**
 * Starts a new work session for the authenticated user for today
 */
export async function startWorkSession(taskId?: string, projectId?: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    const userId = session.user.id;
    const today = await getTodayDhakaDate();

    // 1. Idempotency Check: Prevent duplicate sessions for the same day
    const existingSession = await prisma.workSession.findFirst({
      where: {
        userId,
        date: today,
      },
    });

    if (existingSession) {
      return { 
        success: false, 
        error: `A work session already exists for today. Current status: ${existingSession.status}` 
      };
    }

    // 2. Database transaction to create session and first log atomatically
    const newSession = await prisma.$transaction(async (tx) => {
      const ws = await tx.workSession.create({
        data: {
          userId,
          date: today,
          status: "ACTIVE",
          startTime: new Date(),
        },
      });

      await tx.workSessionLog.create({
        data: {
          sessionId: ws.id,
          actionType: "START",
          timestamp: new Date(),
          taskId: taskId || null,
          projectId: projectId || null,
        },
      });

      return ws;
    });

    // 3. Activity Ledger Hook
    await createActivityRecord({
      type: "WORK_SESSION_STARTED",
      actorId: userId,
      subject: `Started daily work session`,
      description: `User started their active work session.`,
      metadata: { sessionId: newSession.id, taskId, projectId },
    });

    // 4. Realtime Broadcast
    broadcastUserEvent(userId, "NOTIFICATION_RECEIVED", {
      type: "WORK_SESSION_STARTED",
      sessionId: newSession.id,
      timestamp: new Date().toISOString(),
    });

    broadcastWorkManagementEvent("WORK_SESSION_STARTED", {
      userId,
      sessionId: newSession.id,
      timestamp: new Date().toISOString(),
    });

    if (projectId) {
      broadcastProjectEvent(projectId, "PROJECT_UPDATED", {
        type: "WORK_SESSION_STARTED",
        userId,
        sessionId: newSession.id,
      } as any);
    }

    return { success: true, session: newSession };
  } catch (error: any) {
    console.error("[WorkSession] startWorkSession error:", error);
    return { success: false, error: error.message || "Failed to start work session" };
  }
}

/**
 * Pauses the active work session (takes a break)
 */
export async function breakWorkSession() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    const userId = session.user.id;
    const today = await getTodayDhakaDate();

    // 1. Fetch current session
    const ws = await prisma.workSession.findFirst({
      where: {
        userId,
        date: today,
      },
      include: {
        Logs: {
          orderBy: { timestamp: "desc" },
        },
      },
    });

    if (!ws) {
      return { success: false, error: "No work session found for today" };
    }

    if (ws.status !== "ACTIVE") {
      return { success: false, error: `Can only pause an ACTIVE session. Current status: ${ws.status}` };
    }

    const now = new Date();

    // 2. Find the last ACTIVE transition (START or RESUME) to calculate active time duration
    const lastActiveLog = ws.Logs.find(
      (log) => log.actionType === "START" || log.actionType === "RESUME"
    );

    let activeDurationMs = 0;
    if (lastActiveLog) {
      activeDurationMs = now.getTime() - new Date(lastActiveLog.timestamp).getTime();
    }

    const newActiveTotal = ws.totalActiveMs + Math.max(0, activeDurationMs);

    // 3. Update session and log event
    const updatedSession = await prisma.$transaction(async (tx) => {
      await tx.workSessionLog.create({
        data: {
          sessionId: ws.id,
          actionType: "BREAK",
          timestamp: now,
        },
      });

      return await tx.workSession.update({
        where: { id: ws.id },
        data: {
          status: "BREAK",
          totalActiveMs: newActiveTotal,
        },
      });
    });

    // 4. Ledger & Broadcast Hooks
    await createActivityRecord({
      type: "WORK_SESSION_BREAK",
      actorId: userId,
      subject: `Took a break`,
      metadata: { sessionId: ws.id, durationMs: activeDurationMs },
    });

    broadcastUserEvent(userId, "NOTIFICATION_RECEIVED", {
      type: "WORK_SESSION_BREAK",
      sessionId: ws.id,
      timestamp: now.toISOString(),
    });

    broadcastWorkManagementEvent("WORK_SESSION_BREAK", {
      userId,
      sessionId: ws.id,
      timestamp: now.toISOString(),
    });

    return { success: true, session: updatedSession };
  } catch (error: any) {
    console.error("[WorkSession] breakWorkSession error:", error);
    return { success: false, error: error.message || "Failed to pause work session" };
  }
}

/**
 * Resumes a paused work session
 */
export async function resumeWorkSession(taskId?: string, projectId?: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    const userId = session.user.id;
    const today = await getTodayDhakaDate();

    // 1. Fetch current session
    const ws = await prisma.workSession.findFirst({
      where: {
        userId,
        date: today,
      },
      include: {
        Logs: {
          orderBy: { timestamp: "desc" },
        },
      },
    });

    if (!ws) {
      return { success: false, error: "No work session found for today" };
    }

    if (ws.status !== "BREAK") {
      return { success: false, error: `Can only resume a paused (BREAK) session. Current status: ${ws.status}` };
    }

    const now = new Date();

    // 2. Find the last BREAK log to calculate break duration
    const lastBreakLog = ws.Logs.find((log) => log.actionType === "BREAK");
    let breakDurationMs = 0;
    if (lastBreakLog) {
      breakDurationMs = now.getTime() - new Date(lastBreakLog.timestamp).getTime();
    }

    const newBreakTotal = ws.totalBreakMs + Math.max(0, breakDurationMs);

    // 3. Update session and log event
    const updatedSession = await prisma.$transaction(async (tx) => {
      await tx.workSessionLog.create({
        data: {
          sessionId: ws.id,
          actionType: "RESUME",
          timestamp: now,
          taskId: taskId || null,
          projectId: projectId || null,
        },
      });

      return await tx.workSession.update({
        where: { id: ws.id },
        data: {
          status: "ACTIVE",
          totalBreakMs: newBreakTotal,
        },
      });
    });

    // 4. Ledger & Broadcast Hooks
    await createActivityRecord({
      type: "WORK_SESSION_RESUMED",
      actorId: userId,
      subject: `Resumed work session`,
      metadata: { sessionId: ws.id, breakDurationMs, taskId, projectId },
    });

    broadcastUserEvent(userId, "NOTIFICATION_RECEIVED", {
      type: "WORK_SESSION_RESUMED",
      sessionId: ws.id,
      timestamp: now.toISOString(),
    });

    broadcastWorkManagementEvent("WORK_SESSION_RESUMED", {
      userId,
      sessionId: ws.id,
      timestamp: now.toISOString(),
    });

    return { success: true, session: updatedSession };
  } catch (error: any) {
    console.error("[WorkSession] resumeWorkSession error:", error);
    return { success: false, error: error.message || "Failed to resume work session" };
  }
}

/**
 * Ends the day's work session
 */
export async function endWorkSession() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    const userId = session.user.id;
    const today = await getTodayDhakaDate();

    // 1. Fetch current session
    const ws = await prisma.workSession.findFirst({
      where: {
        userId,
        date: today,
      },
      include: {
        Logs: {
          orderBy: { timestamp: "desc" },
        },
      },
    });

    if (!ws) {
      return { success: false, error: "No work session found for today" };
    }

    if (ws.status === "COMPLETED") {
      return { success: false, error: "Work session is already completed" };
    }

    const now = new Date();
    let finalActiveMs = ws.totalActiveMs;
    let finalBreakMs = ws.totalBreakMs;

    // 2. Calculate outstanding duration since last transition
    const lastLog = ws.Logs[0]; // ordered desc, so this is the absolute last log
    if (lastLog) {
      const elapsed = now.getTime() - new Date(lastLog.timestamp).getTime();
      if (ws.status === "ACTIVE") {
        finalActiveMs += Math.max(0, elapsed);
      } else if (ws.status === "BREAK") {
        finalBreakMs += Math.max(0, elapsed);
      }
    }

    // 3. Finalize in database transaction
    const updatedSession = await prisma.$transaction(async (tx) => {
      await tx.workSessionLog.create({
        data: {
          sessionId: ws.id,
          actionType: "END",
          timestamp: now,
        },
      });

      return await tx.workSession.update({
        where: { id: ws.id },
        data: {
          status: "COMPLETED",
          endTime: now,
          totalActiveMs: finalActiveMs,
          totalBreakMs: finalBreakMs,
        },
      });
    });

    // 4. Ledger & Broadcast Hooks
    await createActivityRecord({
      type: "WORK_SESSION_ENDED",
      actorId: userId,
      subject: `Ended work session`,
      metadata: { sessionId: ws.id, totalActiveMs: finalActiveMs, totalBreakMs: finalBreakMs },
    });

    broadcastUserEvent(userId, "NOTIFICATION_RECEIVED", {
      type: "WORK_SESSION_ENDED",
      sessionId: ws.id,
      timestamp: now.toISOString(),
    });

    broadcastWorkManagementEvent("WORK_SESSION_ENDED", {
      userId,
      sessionId: ws.id,
      timestamp: now.toISOString(),
    });

    return { success: true, session: updatedSession };
  } catch (error: any) {
    console.error("[WorkSession] endWorkSession error:", error);
    return { success: false, error: error.message || "Failed to end work session" };
  }
}

/**
 * Gets the active/break session for today (if any)
 */
export async function getCurrentWorkSession() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized", session: null };
    }

    const userId = session.user.id;
    const today = await getTodayDhakaDate();

    const ws = await prisma.workSession.findFirst({
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

    return { success: true, session: ws };
  } catch (error: any) {
    console.error("[WorkSession] getCurrentWorkSession error:", error);
    return { success: false, error: error.message || "Failed to fetch current work session", session: null };
  }
}

/**
 * Gets today's work session status summary
 */
export async function getTodayWorkSession() {
  return await getCurrentWorkSession();
}

/**
 * Gets historical work sessions for the logged-in user
 */
export async function getWorkSessionHistory(limit: number = 30) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized", history: [] };
    }

    const userId = session.user.id;

    const history = await prisma.workSession.findMany({
      where: {
        userId,
      },
      orderBy: {
        date: "desc",
      },
      take: limit,
      include: {
        Logs: {
          orderBy: { timestamp: "asc" },
        },
      },
    });

    return { success: true, history };
  } catch (error: any) {
    console.error("[WorkSession] getWorkSessionHistory error:", error);
    return { success: false, error: error.message || "Failed to fetch work session history", history: [] };
  }
}

/**
 * Switch the currently working task on the active work session
 */
export async function switchWorkSessionTask(taskId: string | null, projectId: string | null) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    const userId = session.user.id;
    const today = await getTodayDhakaDate();

    // 1. Fetch current session
    const ws = await prisma.workSession.findFirst({
      where: {
        userId,
        date: today,
      },
    });

    if (!ws) {
      return { success: false, error: "No work session found for today" };
    }

    if (ws.status !== "ACTIVE") {
      return { success: false, error: "Work session is not actively running. Start or resume work session first." };
    }

    const now = new Date();
    await prisma.workSessionLog.create({
      data: {
        sessionId: ws.id,
        actionType: "RESUME", // Log task switch as RESUME log context
        timestamp: now,
        taskId: taskId || null,
        projectId: projectId || null,
      },
    });

    broadcastWorkManagementEvent("WORK_SESSION_RESUMED", {
      userId,
      sessionId: ws.id,
      taskId,
      projectId,
      timestamp: now.toISOString(),
    });

    return { success: true };
  } catch (error: any) {
    console.error("switchWorkSessionTask error:", error);
    return { success: false, error: error.message || "Failed to switch task context" };
  }
}

