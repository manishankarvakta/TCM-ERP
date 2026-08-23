"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidateBothPaths } from "@/lib/route-utils-server";
import { createActivityRecord } from "@/lib/system/activity-ledger";
import { broadcastUserEvent, broadcastWorkManagementEvent } from "@/lib/system/realtime";

/**
 * Submit daily activity report (Legacy Action kept for backward compatibility)
 */
export async function submitDailyReport(dateStr: string, comments?: string) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const reportDate = new Date(dateStr + "T00:00:00.000Z");

    // Check if report already exists
    const existing = await prisma.activityReport.findFirst({
      where: {
        userId: session.user.id,
        reportDate,
      },
    });

    let report;
    if (existing) {
      // If already submitted or approved, prevent changes unless admin
      if (
        (existing.status === "APPROVED" || existing.status === "SUBMITTED") &&
        session.user.role?.toLowerCase() !== "admin"
      ) {
        return { success: false, error: "Submitted or approved reports cannot be modified" };
      }

      report = await prisma.activityReport.update({
        where: { id: existing.id },
        data: {
          status: "SUBMITTED",
          submittedAt: new Date(),
          feedback: null, // clear feedback on resubmission
          reviewedAt: null,
          reviewedById: null,
          comments: comments || existing.comments,
          summary: comments || existing.summary, // maintain sync with new structured summary field
        },
      });
    } else {
      report = await prisma.activityReport.create({
        data: {
          userId: session.user.id,
          reportDate,
          status: "SUBMITTED",
          comments: comments || "",
          summary: comments || "",
        },
      });
    }

    // Record in Activity Ledger
    await createActivityRecord({
      type: "DAILY_UPDATE_SUBMITTED",
      actorId: session.user.id,
      subject: `Submitted daily activity report for ${dateStr}`,
      metadata: { reportId: report.id, dateStr },
    });

    // Realtime Broadcast
    broadcastWorkManagementEvent("DAILY_UPDATE_SUBMITTED", {
      userId: session.user.id,
      reportId: report.id,
      dateStr,
      timestamp: new Date().toISOString(),
    });

    revalidateBothPaths("crm/activities");
    return { success: true, report };
  } catch (error) {
    console.error("submitDailyReport error:", error);
    return { success: false, error: "Failed to submit report" };
  }
}

/**
 * Review daily activity report (Admin/Manager only)
 */
export async function reviewDailyReport(
  reportId: string,
  status: "APPROVED" | "REJECTED",
  feedback?: string
) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    if (session.user.role?.toLowerCase() !== "admin" && session.user.role?.toLowerCase() !== "manager") {
      return { success: false, error: "Permission Denied: Only Admins or Managers can review reports" };
    }

    const report = await prisma.activityReport.update({
      where: { id: reportId },
      data: {
        status,
        feedback: feedback || null,
        reviewedAt: new Date(),
        reviewedById: session.user.id,
      },
      include: {
        User: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Notify the user about their report status
    try {
      await (await import("@/lib/notification")).notifyUserAction({
        userId: report.userId,
        type: 'SYSTEM' as any,
        title: `Daily Activity Report ${status.charAt(0) + status.slice(1).toLowerCase()}`,
        message: `Your activity report for ${report.reportDate.toISOString().split("T")[0]} has been ${status.toLowerCase()}.${
          feedback ? ` Feedback: "${feedback}"` : ""
        }`,
        action: 'item_updated',
      });
    } catch (err) {
      console.error("Failed to notify user about report status:", err);
    }

    revalidateBothPaths("crm/activities");
    return { success: true, report };
  } catch (error) {
    console.error("reviewDailyReport error:", error);
    return { success: false, error: "Failed to review report" };
  }
}

/**
 * Get all submitted reports for admin review
 */
export async function getSubmittedReportsList() {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized", reports: [] };

    if (session.user.role?.toLowerCase() !== "admin" && session.user.role?.toLowerCase() !== "manager") {
      return { success: false, error: "Permission Denied: Only Admins or Managers can list all reports", reports: [] };
    }

    const reports = await prisma.activityReport.findMany({
      orderBy: {
        submittedAt: "desc",
      },
      include: {
        User: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    const mapped = reports.map((r) => ({
      ...r,
      reportDate: r.reportDate.toISOString(),
      submittedAt: r.submittedAt.toISOString(),
      reviewedAt: r.reviewedAt ? r.reviewedAt.toISOString() : null,
    }));

    return { success: true, reports: mapped };
  } catch (error) {
    console.error("getSubmittedReportsList error:", error);
    return { success: false, error: "Failed to fetch reports", reports: [] };
  }
}

/**
 * Get daily reports and activities for a user within a date range (timezone-aware)
 */
export async function getUserActivitiesForDateRange(
  userId: string,
  fromDateStr: string,
  toDateStr: string,
  clientTimezone: string = "UTC"
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Unauthorized", dailyData: {} };
    }

    // Only allow self or admin/manager to check reports
    if (
      session.user.id !== userId &&
      session.user.role?.toLowerCase() !== "admin" &&
      session.user.role?.toLowerCase() !== "manager"
    ) {
      return { success: false, error: "Permission Denied", dailyData: {} };
    }

    const fromDate = new Date(fromDateStr + "T00:00:00.000Z");
    const toDate = new Date(toDateStr + "T23:59:59.999Z");

    const dbStart = new Date(fromDate.getTime() - 24 * 60 * 60 * 1000);
    const dbEnd = new Date(toDate.getTime() + 48 * 60 * 60 * 1000);

    // Fetch activities
    const activities = await prisma.activity.findMany({
      where: {
        ownerId: userId,
        createdAt: {
          gte: dbStart,
          lte: dbEnd,
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      include: {
        Owner: {
          select: { id: true, name: true, email: true },
        },
        AssignedTo: {
          select: { id: true, name: true, email: true },
        },
      } as any,
    });

    // Fetch reports
    const reports = await prisma.activityReport.findMany({
      where: {
        userId,
        reportDate: {
          gte: fromDate,
          lte: toDate,
        },
      },
    });

    // Group activities by local day
    const dailyData: Record<string, { activities: any[]; report: any | null }> = {};

    let curr = new Date(fromDateStr + "T00:00:00.000Z");
    const endLimit = new Date(toDateStr + "T00:00:00.000Z");
    while (curr <= endLimit) {
      const dateKey = curr.toISOString().split("T")[0];
      dailyData[dateKey] = { activities: [], report: null };
      curr.setUTCDate(curr.getUTCDate() + 1);
    }

    const localDateFormatter = new Intl.DateTimeFormat("en-US", {
      timeZone: clientTimezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });

    activities.forEach((act: any) => {
      let localDateStr = "";
      try {
        const parts = localDateFormatter.formatToParts(act.createdAt);
        const year = parts.find((p) => p.type === "year")?.value;
        const month = parts.find((p) => p.type === "month")?.value;
        const day = parts.find((p) => p.type === "day")?.value;
        localDateStr = `${year}-${month}-${day}`;
      } catch (err) {
        localDateStr = act.createdAt.toISOString().split("T")[0];
      }

      if (dailyData[localDateStr]) {
        dailyData[localDateStr].activities.push({
          ...act,
          dueDate: act.dueDate ? act.dueDate.toISOString() : null,
          createdAt: act.createdAt.toISOString(),
          updatedAt: act.updatedAt.toISOString(),
          completedAt: act.completedAt ? act.completedAt.toISOString() : null,
          owner: act.Owner,
          assignedTo: act.AssignedTo,
        });
      }
    });

    reports.forEach((rep) => {
      const dateKey = rep.reportDate.toISOString().split("T")[0];
      if (dailyData[dateKey]) {
        dailyData[dateKey].report = {
          ...rep,
          reportDate: rep.reportDate.toISOString(),
          submittedAt: rep.submittedAt.toISOString(),
          reviewedAt: rep.reviewedAt ? rep.reviewedAt.toISOString() : null,
        };
      }
    });

    return { success: true, dailyData };
  } catch (error) {
    console.error("getUserActivitiesForDateRange error:", error);
    return { success: false, error: "Failed to fetch daily activity report", dailyData: {} };
  }
}

/**
 * Save daily update as a DRAFT (editable)
 */
export async function saveDailyUpdateDraft(
  dateStr: string,
  input: {
    completed?: string;
    pending?: string;
    blocked?: string;
    newWork?: string;
    summary?: string;
  }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    const userId = session.user.id;
    const reportDate = new Date(dateStr + "T00:00:00.000Z");

    const existing = await prisma.activityReport.findFirst({
      where: {
        userId,
        reportDate,
      },
    });

    let report;
    if (existing) {
      // Drafts can only edit if status is DRAFT (or not submitted/approved yet)
      if (existing.status !== "DRAFT") {
        return { success: false, error: `Cannot edit draft. Current status: ${existing.status}` };
      }

      report = await prisma.activityReport.update({
        where: { id: existing.id },
        data: {
          ...input,
          comments: input.summary || existing.comments, // sync comments legacy field
        },
      });
    } else {
      report = await prisma.activityReport.create({
        data: {
          userId,
          reportDate,
          status: "DRAFT",
          ...input,
          comments: input.summary || "",
        },
      });
    }

    revalidateBothPaths("crm/activities");
    return { success: true, report };
  } catch (error: any) {
    console.error("[DailyUpdate] saveDailyUpdateDraft error:", error);
    return { success: false, error: error.message || "Failed to save daily update draft" };
  }
}

/**
 * Submit daily update (locks it to SUBMITTED state permanently)
 */
export async function submitDailyUpdate(
  dateStr: string,
  input: {
    completed: string;
    pending: string;
    blocked: string;
    newWork: string;
    summary: string;
  }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    const userId = session.user.id;
    const reportDate = new Date(dateStr + "T00:00:00.000Z");

    const existing = await prisma.activityReport.findFirst({
      where: {
        userId,
        reportDate,
      },
    });

    let report;
    if (existing) {
      // Verify that status is DRAFT. SUBMITTED or APPROVED/REJECTED cannot be updated.
      if (existing.status !== "DRAFT") {
        return { success: false, error: `Report cannot be submitted. Current status: ${existing.status}` };
      }

      report = await prisma.activityReport.update({
        where: { id: existing.id },
        data: {
          ...input,
          comments: input.summary, // sync legacycomments
          status: "SUBMITTED",
          submittedAt: new Date(),
          feedback: null,
          reviewedAt: null,
          reviewedById: null,
        },
      });
    } else {
      report = await prisma.activityReport.create({
        data: {
          userId,
          reportDate,
          status: "SUBMITTED",
          submittedAt: new Date(),
          ...input,
          comments: input.summary,
        },
      });
    }

    // 1. Audit Ledger Hook
    await createActivityRecord({
      type: "DAILY_UPDATE_SUBMITTED",
      actorId: userId,
      subject: `Submitted daily work update for ${dateStr}`,
      metadata: { reportId: report.id, dateStr },
    });

    // 2. Realtime Broadcast
    broadcastUserEvent(userId, "NOTIFICATION_RECEIVED", {
      type: "DAILY_UPDATE_SUBMITTED",
      reportId: report.id,
      dateStr,
      timestamp: new Date().toISOString(),
    });

    broadcastWorkManagementEvent("DAILY_UPDATE_SUBMITTED", {
      userId,
      reportId: report.id,
      dateStr,
      timestamp: new Date().toISOString(),
    });

    revalidateBothPaths("crm/activities");
    return { success: true, report };
  } catch (error: any) {
    console.error("[DailyUpdate] submitDailyUpdate error:", error);
    return { success: false, error: error.message || "Failed to submit daily update" };
  }
}

/**
 * Fetches a single daily update for a specific user and date
 */
export async function getDailyUpdate(dateStr: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized", report: null };
    }

    const userId = session.user.id;
    const reportDate = new Date(dateStr + "T00:00:00.000Z");

    const report = await prisma.activityReport.findFirst({
      where: {
        userId,
        reportDate,
      },
    });

    return { success: true, report };
  } catch (error: any) {
    console.error("[DailyUpdate] getDailyUpdate error:", error);
    return { success: false, error: error.message || "Failed to fetch daily update", report: null };
  }
}

/**
 * Gets historical daily updates for the logged-in user
 */
export async function getDailyUpdateHistory(limit: number = 30) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized", history: [] };
    }

    const userId = session.user.id;

    const history = await prisma.activityReport.findMany({
      where: {
        userId,
      },
      orderBy: {
        reportDate: "desc",
      },
      take: limit,
    });

    return { success: true, history };
  } catch (error: any) {
    console.error("[DailyUpdate] getDailyUpdateHistory error:", error);
    return { success: false, error: error.message || "Failed to fetch history", history: [] };
  }
}
