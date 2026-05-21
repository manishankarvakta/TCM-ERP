"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { getGlobalFinancialControl } from "./financials.action";

/**
 * Enterprise Dashboard Macro Aggregator
 * Pulls global cross-project telemetry safely via Prisma aggregates.
 */
export async function getMacroProjectTelemetry() {
  try {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Unauthorized");

    // 1. RBAC Verification
    const canReadProjects = await hasPermission(session.user.id, "projects.projects", "read");
    if (!canReadProjects) throw new Error("Permission Denied: projects.projects.read");

    const canReadFinancials = await hasPermission(session.user.id, "projects.financials", "read");

    // 2. High-Performance Macro Queries
    const [
      projectCounts,
      activeProjects,
      taskAggregations,
      milestoneAggregations
    ] = await Promise.all([
      // Project statuses
      prisma.project.groupBy({
        by: ['status'],
        _count: { id: true }
      }),
      
      // Fast active project fetch for timeline calculations
      prisma.project.findMany({
        where: { status: "ACTIVE" },
        select: { id: true, title: true, endDate: true }
      }),

      // Task completion metrics across all active projects
      prisma.task.groupBy({
        by: ['status'],
        where: { entityType: "project" }, // Assuming tasks are polymorphic linked to projects
        _count: { id: true }
      }),

      // Milestone metrics
      prisma.milestone.aggregate({
        _count: { id: true },
        where: { status: { not: "COMPLETED" } }
      })
    ]);

    // Format Project Counts
    const projectsByStatus = {
      ACTIVE: projectCounts.find(p => p.status === "ACTIVE")?._count.id || 0,
      PLANNING: projectCounts.find(p => p.status === "PLANNING")?._count.id || 0,
      AT_RISK: 0, // Placeholder, usually requires a priority check
      TOTAL: projectCounts.reduce((acc, curr) => acc + curr._count.id, 0)
    };

    // Format Task Counts
    const tasksByStatus = {
      TODO: taskAggregations.find(t => t.status === "TODO")?._count.id || 0,
      IN_PROGRESS: taskAggregations.find(t => t.status === "IN_PROGRESS")?._count.id || 0,
      COMPLETED: taskAggregations.find(t => t.status === "COMPLETED")?._count.id || 0,
      TOTAL: taskAggregations.reduce((acc, curr) => acc + curr._count.id, 0)
    };

    // 3. Conditional Financial Telemetry
    let financials = null;
    if (canReadFinancials) {
      const financialRes = await getGlobalFinancialControl();
      if (financialRes.success) {
        financials = financialRes.data;
      }
    }

    // 4. Milestone Timeline (Next 5 Upcoming)
    const upcomingDeadlines = await prisma.milestone.findMany({
      where: { 
        status: { not: "COMPLETED" },
        endDate: { gte: new Date() }
      },
      orderBy: { endDate: 'asc' },
      take: 5,
      select: { id: true, title: true, endDate: true, Project: { select: { title: true } } }
    });

    return {
      success: true,
      data: {
        projects: projectsByStatus,
        tasks: tasksByStatus,
        activeMilestones: milestoneAggregations._count.id,
        upcomingDeadlines,
        financials,
        activeProjectsList: activeProjects
      }
    };

  } catch (error: any) {
    console.error("[MacroDashboard] Aggregation Error:", error);
    return { success: false, error: error.message || "Failed to fetch macro telemetry" };
  }
}
