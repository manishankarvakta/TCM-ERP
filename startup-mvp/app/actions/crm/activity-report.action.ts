"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidateBothPaths } from "@/lib/route-utils-server";

/**
 * Submit daily activity report
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
      // If already approved, prevent changes unless admin
      if (existing.status === "APPROVED" && session.user.role?.toLowerCase() !== "admin") {
        return { success: false, error: "Approved reports cannot be resubmitted" };
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
        },
      });
    } else {
      report = await prisma.activityReport.create({
        data: {
          userId: session.user.id,
          reportDate,
          status: "SUBMITTED",
          comments: comments || "",
        },
      });
    }

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

    if (session.user.role?.toLowerCase() !== "admin") {
      return { success: false, error: "Permission Denied: Only Admin can review reports" };
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

    if (session.user.role?.toLowerCase() !== "admin") {
      return { success: false, error: "Permission Denied: Only Admin can list all reports", reports: [] };
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

    // Only allow self or admin to check reports
    if (session.user.id !== userId && session.user.role?.toLowerCase() !== "admin") {
      return { success: false, error: "Permission Denied", dailyData: {} };
    }

    const fromDate = new Date(fromDateStr + "T00:00:00.000Z");
    const toDate = new Date(toDateStr + "T23:59:59.999Z");

    // Fetch database range wider than local range to ensure no cutoff on timezone offsets
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

    // Initialize all dates in range with UTC midnight to avoid daylight saving shifts
    let curr = new Date(fromDateStr + "T00:00:00.000Z");
    const endLimit = new Date(toDateStr + "T00:00:00.000Z");
    while (curr <= endLimit) {
      const dateKey = curr.toISOString().split("T")[0];
      dailyData[dateKey] = { activities: [], report: null };
      curr.setUTCDate(curr.getUTCDate() + 1);
    }

    // Date formatter for the client's timezone
    const localDateFormatter = new Intl.DateTimeFormat("en-US", {
      timeZone: clientTimezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });

    // Group activities under local date string
    activities.forEach((act: any) => {
      let localDateStr = "";
      try {
        const parts = localDateFormatter.formatToParts(act.createdAt);
        const year = parts.find((p) => p.type === "year")?.value;
        const month = parts.find((p) => p.type === "month")?.value;
        const day = parts.find((p) => p.type === "day")?.value;
        localDateStr = `${year}-${month}-${day}`;
      } catch (err) {
        // Fallback to UTC
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

    // Attach reports (stored with UTC normalized date format)
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
