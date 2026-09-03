"use server";

import { CostCategory } from "@prisma/client";
import { calculateProjectProfitability } from "@/lib/profitability/profitability-engine";
import prisma from "@/lib/prisma";

// Helper to get active user & org (Simulated or via session)
async function getAuthContext() {
  const user = await prisma.user.findFirst({ where: { role: "admin" }, select: { id: true } });
  const org = await prisma.organization.findFirst({ where: { status: "active" }, select: { id: true } });
  if (!user || !org) {
    throw new Error("Unauthorized or missing organization context.");
  }
  return { userId: user.id, organizationId: org.id };
}

export async function getProjectProfitabilityAction(projectId: string) {
  try {
    const { userId, organizationId } = await getAuthContext();
    const metrics = await calculateProjectProfitability(projectId, organizationId, userId);
    return { success: true, data: metrics };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to calculate project profitability." };
  }
}

export async function createProfitabilitySnapshotAction(projectId: string, notes?: string) {
  try {
    const { userId, organizationId } = await getAuthContext();

    // Run profitability calculation and snapshot creation inside a transaction
    const snapshot = await prisma.$transaction(async (tx) => {
      const metrics = await calculateProjectProfitability(projectId, organizationId, userId, tx);

      // Get latest version number for this project
      const latestSnapshot = await tx.projectProfitabilitySnapshot.findFirst({
        where: { organizationId, projectId },
        orderBy: { version: "desc" }
      });
      const nextVersion = (latestSnapshot?.version || 0) + 1;

      return tx.projectProfitabilitySnapshot.create({
        data: {
          organizationId,
          projectId,
          version: nextVersion,
          calculatedAt: new Date(),
          contractValue: metrics.contractValue,
          billableAmount: metrics.billableAmount,
          invoicedAmount: metrics.invoicedAmount,
          recognizedRevenue: metrics.recognizedRevenue,
          collectedAmount: metrics.collectedAmount,
          actualLaborCost: metrics.actualLaborCost,
          actualDirectCost: metrics.actualDirectCost,
          totalActualCost: metrics.totalActualCost,
          committedCost: metrics.committedCost,
          projectedRemainingCost: metrics.projectedRemainingCost,
          projectedFinalCost: metrics.projectedFinalCost,
          grossProfit: metrics.grossProfit,
          projectedProfit: metrics.projectedProfit,
          grossMarginPercent: metrics.grossMarginPercent,
          projectedMarginPercent: metrics.projectedMarginPercent,
          status: metrics.status,
          isComplete: metrics.isComplete,
          missingCostSourceCount: metrics.missingCostSourceCount,
          missingLaborCostCount: metrics.missingLaborCostCount,
          warnings: metrics.warnings,
          laborCostingHoursSnapshot: metrics.laborCostingHoursSnapshot,
          healthyMarginThresholdSnapshot: metrics.healthyMarginThresholdSnapshot,
          atRiskMarginThresholdSnapshot: metrics.atRiskMarginThresholdSnapshot,
          notes,
          createdById: userId
        }
      });
    });

    return { success: true, data: snapshot };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to create profitability snapshot." };
  }
}

export async function getProfitabilitySnapshotsAction(projectId: string) {
  try {
    const { organizationId } = await getAuthContext();
    const snapshots = await prisma.projectProfitabilitySnapshot.findMany({
      where: { organizationId, projectId },
      orderBy: { version: "desc" },
      include: {
        CreatedBy: { select: { id: true, email: true, role: true } }
      }
    });
    return { success: true, data: snapshots };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to fetch profitability snapshots." };
  }
}

export async function createCostAllocationAction(data: {
  projectId: string;
  category: CostCategory;
  sourceType: string;
  sourceId: string;
  amount: number;
  allocationMethod: string;
  notes?: string;
}) {
  try {
    const { userId, organizationId } = await getAuthContext();

    // Verify project belongs to tenant
    const project = await prisma.project.findFirst({
      where: { id: data.projectId, organizationId }
    });
    if (!project) {
      throw new Error("Project not found or cross-tenant access denied.");
    }

    const allocation = await prisma.projectCostAllocation.create({
      data: {
        organizationId,
        projectId: data.projectId,
        category: data.category,
        sourceType: data.sourceType,
        sourceId: data.sourceId,
        amount: data.amount,
        allocationMethod: data.allocationMethod,
        notes: data.notes,
        createdById: userId
      }
    });

    return { success: true, data: allocation };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to create cost allocation." };
  }
}
