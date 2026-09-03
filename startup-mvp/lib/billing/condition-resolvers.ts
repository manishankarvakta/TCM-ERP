import { prisma } from "@/lib/prisma";
import { BillingConditionType, BillingMilestoneStatus, Prisma } from "@prisma/client";

export interface ConditionEvaluationResult {
  satisfied: boolean;
  reason?: string;
}

/**
 * Evaluates a single BillingMilestoneCondition against authoritative module data
 */
export async function evaluateMilestoneCondition({
  organizationId,
  condition,
  tx,
}: {
  organizationId: string;
  condition: {
    id: string;
    conditionType: BillingConditionType;
    targetEntityId?: string | null;
    requiredDate?: Date | null;
    satisfied: boolean;
  };
  tx?: Prisma.TransactionClient;
}): Promise<ConditionEvaluationResult> {
  const db = tx || prisma;

  switch (condition.conditionType) {
    case BillingConditionType.PROJECT_STARTED: {
      if (!condition.targetEntityId) return { satisfied: false, reason: "Missing project ID target" };
      const project = await db.project.findFirst({
        where: { id: condition.targetEntityId, organizationId },
        select: { status: true },
      });
      if (!project) return { satisfied: false, reason: "Project not found" };
      const started = project.status !== "PLANNING" && project.status !== "CANCELLED";
      return { satisfied: started, reason: started ? undefined : `Project status is ${project.status}` };
    }

    case BillingConditionType.PROJECT_COMPLETED: {
      if (!condition.targetEntityId) return { satisfied: false, reason: "Missing project ID target" };
      const project = await db.project.findFirst({
        where: { id: condition.targetEntityId, organizationId },
        select: { status: true },
      });
      if (!project) return { satisfied: false, reason: "Project not found" };
      const completed = project.status === "COMPLETED";
      return { satisfied: completed, reason: completed ? undefined : `Project status is ${project.status}` };
    }

    case BillingConditionType.CREATIVE_COMPLETED: {
      if (!condition.targetEntityId) return { satisfied: false, reason: "Missing project ID target" };
      const project = await db.project.findFirst({
        where: { id: condition.targetEntityId, organizationId },
        select: { creativeCompletedAt: true, creativeWorkRequirement: true },
      });
      if (!project) return { satisfied: false, reason: "Project not found" };
      const completed = project.creativeCompletedAt !== null || project.creativeWorkRequirement === "NOT_REQUIRED";
      return { satisfied: completed, reason: completed ? undefined : "Creative completion pending" };
    }

    case BillingConditionType.MARKETING_COMPLETED: {
      if (!condition.targetEntityId) return { satisfied: false, reason: "Missing project ID target" };
      const project = await db.project.findFirst({
        where: { id: condition.targetEntityId, organizationId },
        select: { marketingCompletedAt: true, marketingWorkRequirement: true },
      });
      if (!project) return { satisfied: false, reason: "Project not found" };
      const completed = project.marketingCompletedAt !== null || project.marketingWorkRequirement === "NOT_REQUIRED";
      return { satisfied: completed, reason: completed ? undefined : "Marketing completion pending" };
    }

    case BillingConditionType.DEVELOPMENT_COMPLETED: {
      if (!condition.targetEntityId) return { satisfied: false, reason: "Missing project ID target" };
      const project = await db.project.findFirst({
        where: { id: condition.targetEntityId, organizationId },
        select: { developmentCompletedAt: true, developmentWorkRequirement: true },
      });
      if (!project) return { satisfied: false, reason: "Project not found" };
      const completed = project.developmentCompletedAt !== null || project.developmentWorkRequirement === "NOT_REQUIRED";
      return { satisfied: completed, reason: completed ? undefined : "Development completion pending" };
    }

    case BillingConditionType.QA_COMPLETED: {
      if (!condition.targetEntityId) return { satisfied: false, reason: "Missing project ID target" };
      const project = await db.project.findFirst({
        where: { id: condition.targetEntityId, organizationId },
        select: { qaCompletedAt: true, qaWorkRequirement: true },
      });
      if (!project) return { satisfied: false, reason: "Project not found" };
      const completed = project.qaCompletedAt !== null || project.qaWorkRequirement === "NOT_REQUIRED";
      return { satisfied: completed, reason: completed ? undefined : "QA completion pending or failing test execution" };
    }

    case BillingConditionType.CENTRAL_APPROVAL_APPROVED: {
      if (!condition.targetEntityId) return { satisfied: false, reason: "Missing approval request ID target" };
      const approval = await db.approvalRequest.findFirst({
        where: { id: condition.targetEntityId, organizationId },
        select: { status: true },
      });
      if (!approval) return { satisfied: false, reason: "Approval request not found" };
      const approved = approval.status === "APPROVED";
      return { satisfied: approved, reason: approved ? undefined : `Approval request is ${approval.status}` };
    }

    case BillingConditionType.DATE_REACHED: {
      if (!condition.requiredDate) return { satisfied: false, reason: "Missing required date" };
      const reached = new Date() >= new Date(condition.requiredDate);
      return { satisfied: reached, reason: reached ? undefined : `Target date ${condition.requiredDate} not reached` };
    }

    case BillingConditionType.MANUAL_INTERNAL_CONFIRMATION: {
      return { satisfied: condition.satisfied, reason: condition.satisfied ? undefined : "Manual confirmation pending" };
    }

    default:
      return { satisfied: false, reason: "Unknown condition type" };
  }
}

/**
 * Re-evaluates all conditions for a milestone and updates billability status atomically
 */
export async function evaluateBillingMilestoneEligibility(
  milestoneId: string,
  tx?: Prisma.TransactionClient
): Promise<{ status: BillingMilestoneStatus; billable: boolean; reason?: string }> {
  const db = tx || prisma;

  const milestone = await db.projectBillingMilestone.findUnique({
    where: { id: milestoneId },
    include: { Conditions: true },
  });

  if (!milestone) {
    throw new Error("Billing milestone not found");
  }

  let allSatisfied = true;
  let firstFailureReason: string | undefined;

  for (const cond of milestone.Conditions) {
    const res = await evaluateMilestoneCondition({
      organizationId: milestone.organizationId,
      condition: cond,
      tx: db,
    });

    if (cond.satisfied !== res.satisfied) {
      await db.billingMilestoneCondition.update({
        where: { id: cond.id },
        data: {
          satisfied: res.satisfied,
          satisfiedAt: res.satisfied ? new Date() : null,
        },
      });
    }

    if (!res.satisfied) {
      allSatisfied = false;
      if (!firstFailureReason) firstFailureReason = res.reason;
    }
  }

  const now = new Date();

  if (allSatisfied) {
    // All conditions satisfied -> Milestone is BILLABLE
    if (
      milestone.status === BillingMilestoneStatus.DRAFT ||
      milestone.status === BillingMilestoneStatus.PENDING ||
      milestone.status === BillingMilestoneStatus.BLOCKED ||
      milestone.status === BillingMilestoneStatus.STALE
    ) {
      const updated = await db.projectBillingMilestone.update({
        where: { id: milestoneId },
        data: {
          status: BillingMilestoneStatus.BILLABLE,
          billableAt: now,
          staleAt: null,
          staleReason: null,
        },
      });
      return { status: updated.status, billable: true };
    }
    return { status: milestone.status, billable: milestone.status === BillingMilestoneStatus.BILLABLE || milestone.status === BillingMilestoneStatus.PARTIALLY_INVOICED || milestone.status === BillingMilestoneStatus.INVOICED };
  } else {
    // Delivery condition failed / reopened
    if (
      milestone.status === BillingMilestoneStatus.BILLABLE ||
      milestone.status === BillingMilestoneStatus.ELIGIBLE
    ) {
      const updated = await db.projectBillingMilestone.update({
        where: { id: milestoneId },
        data: {
          status: BillingMilestoneStatus.STALE,
          staleAt: now,
          staleReason: firstFailureReason || "Source condition invalidated",
        },
      });
      return { status: updated.status, billable: false, reason: firstFailureReason };
    } else if (
      milestone.status === BillingMilestoneStatus.INVOICED ||
      milestone.status === BillingMilestoneStatus.PARTIALLY_INVOICED
    ) {
      // Invoiced milestone: PRESERVE canonical Invoice & accounting truth; mark exception state
      await db.projectBillingMilestone.update({
        where: { id: milestoneId },
        data: {
          staleAt: now,
          staleReason: `Authoritative delivery source invalidated post-invoicing: ${firstFailureReason || "Source delivery reopened"}`,
        },
      });
      return { status: milestone.status, billable: false, reason: firstFailureReason };
    }
    return { status: milestone.status, billable: false, reason: firstFailureReason };
  }
}
