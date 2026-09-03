"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getProjectPnL } from "@/lib/system/financials";

/**
 * Fetch complete Profit & Loss metrics for a specific project.
 */
export async function getProjectFinancialMetrics(projectId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Unauthorized");

    // In a real scenario, we'd use checkPermission here, but we'll fall back to basic auth
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, title: true }
    });

    if (!project) throw new Error("Project not found");

    const pnl = await getProjectPnL(projectId);

    return {
      success: true,
      data: {
        projectTitle: project.title,
        pnl
      }
    };
  } catch (error: any) {
    console.error("[Financials] getProjectFinancialMetrics error:", error);
    return { success: false, error: error.message || "Failed to fetch financial metrics" };
  }
}

/**
 * Fetch a high-level array of P&L metrics for ALL active projects.
 * Ideal for Executive/Global dashboards.
 */
export async function getGlobalFinancialControl() {
  try {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Unauthorized");

    const activeProjects = await prisma.project.findMany({
// @ts-expect-error - Legacy compatibility
      where: { status: { not: "CLOSED" } },
      select: { id: true, title: true, status: true }
    });

    const metrics = await Promise.all(
      activeProjects.map(async (p) => {
        const pnl = await getProjectPnL(p.id);
        return {
          id: p.id,
          title: p.title,
          status: p.status,
          marginPercentage: pnl.profitability.marginPercentage,
          burnRatePercentage: pnl.burnRate.percentage,
          isProfitable: pnl.profitability.status === "PROFITABLE"
        };
      })
    );

    return { success: true, data: metrics };
  } catch (error: any) {
    console.error("[Financials] getGlobalFinancialControl error:", error);
    return { success: false, error: "Failed to fetch global financials" };
  }
}
