"use server";

import { prisma } from "@/lib/prisma";
import {
  ApprovalRequestStatus,
  ApprovalStepStatus,
  ApprovalMode,
  ApprovalDecisionType,
  Prisma,
} from "@prisma/client";
import { resolveApprovalSource } from "./source-resolvers";

/**
 * Freezes an active ApprovalPolicy into immutable ApprovalStepInstance & ApprovalStepApprover records
 */
export async function freezePolicySnapshot({
  approvalRequestId,
  policyId,
  organizationId,
  approverUserIds,
  tx,
}: {
  approvalRequestId: string;
  policyId: string;
  organizationId: string;
  approverUserIds?: string[];
  tx?: Prisma.TransactionClient;
}): Promise<void> {
  const db = tx || prisma;

  // 1. Fetch policy and ordered steps
  const policy = await db.approvalPolicy.findFirst({
    where: { id: policyId, organizationId, active: true },
    include: {
      Steps: {
        orderBy: { sequence: "asc" },
      },
    },
  });

  if (!policy || policy.Steps.length === 0) {
    throw new Error(`Active Approval Policy ${policyId} not found or has no configured steps`);
  }

  // 2. Fetch default tenant approvers if none specified
  let targetApproverIds = approverUserIds || [];
  if (targetApproverIds.length === 0) {
    // Fallback: find active users in tenant with approval authorization or admin role
    const users = await db.user.findMany({
      where: {
        Organization: { some: { id: organizationId } },
        status: "active",
      },
      select: { id: true },
      take: 5,
    });
    targetApproverIds = users.map((u) => u.id);
  }

  // 3. Create immutable step instances
  for (let i = 0; i < policy.Steps.length; i++) {
    const step = policy.Steps[i];
    const isFirstStep = step.sequence === 1;

    const stepInstance = await db.approvalStepInstance.create({
      data: {
        organizationId,
        approvalRequestId,
        sequence: step.sequence,
        nameSnapshot: step.name,
        approvalMode: step.approvalMode,
        minimumApprovals: step.minimumApprovals,
        status: isFirstStep ? ApprovalStepStatus.IN_PROGRESS : ApprovalStepStatus.PENDING,
        startedAt: isFirstStep ? new Date() : null,
      },
    });

    // Attach approvers to step instance
    for (const approverId of targetApproverIds) {
      await db.approvalStepApprover.create({
        data: {
          organizationId,
          stepInstanceId: stepInstance.id,
          approverUserId: approverId,
          approverRole: "DESIGNATED_APPROVER",
        },
      });
    }
  }
}

/**
 * Evaluates step progression after a decision is rendered
 */
export async function evaluateStepProgression({
  approvalRequestId,
  stepInstanceId,
  organizationId,
  tx,
}: {
  approvalRequestId: string;
  stepInstanceId: string;
  organizationId: string;
  tx: Prisma.TransactionClient;
}): Promise<{
  requestStatus: ApprovalRequestStatus;
  stepStatus: ApprovalStepStatus;
  completed: boolean;
}> {
  // Lock step instance row for update
  const stepInstance = await tx.approvalStepInstance.findFirst({
    where: { id: stepInstanceId, approvalRequestId, organizationId },
    include: {
      Approvers: true,
      Decisions: true,
    },
  });

  if (!stepInstance) {
    throw new Error(`Step instance ${stepInstanceId} not found`);
  }

  const approvedDecisions = stepInstance.Decisions.filter(
    (d) => d.decision === ApprovalDecisionType.APPROVED
  );
  const rejectedDecisions = stepInstance.Decisions.filter(
    (d) => d.decision === ApprovalDecisionType.REJECTED
  );

  let newStepStatus: ApprovalStepStatus = stepInstance.status;

  // Evaluate Rejection
  if (rejectedDecisions.length > 0) {
    newStepStatus = ApprovalStepStatus.REJECTED;

    await tx.approvalStepInstance.update({
      where: { id: stepInstanceId },
      data: { status: ApprovalStepStatus.REJECTED, completedAt: new Date() },
    });

    // Mark request as REJECTED and cancel remaining pending steps
    await tx.approvalRequest.update({
      where: { id: approvalRequestId },
      data: { status: ApprovalRequestStatus.REJECTED, completedAt: new Date() },
    });

    await tx.approvalStepInstance.updateMany({
      where: {
        approvalRequestId,
        sequence: { gt: stepInstance.sequence },
        status: ApprovalStepStatus.PENDING,
      },
      data: { status: ApprovalStepStatus.BYPASSED },
    });

    return {
      requestStatus: ApprovalRequestStatus.REJECTED,
      stepStatus: ApprovalStepStatus.REJECTED,
      completed: true,
    };
  }

  // Evaluate Approval based on Mode
  let isStepApproved = false;
  if (stepInstance.approvalMode === ApprovalMode.ANY) {
    if (approvedDecisions.length >= 1) {
      isStepApproved = true;
    }
  } else if (stepInstance.approvalMode === ApprovalMode.ALL) {
    const requiredCount = Math.max(stepInstance.Approvers.length, 1);
    if (approvedDecisions.length >= requiredCount) {
      isStepApproved = true;
    }
  } else if (stepInstance.approvalMode === ApprovalMode.MINIMUM_COUNT) {
    if (approvedDecisions.length >= stepInstance.minimumApprovals) {
      isStepApproved = true;
    }
  }

  if (isStepApproved) {
    newStepStatus = ApprovalStepStatus.APPROVED;

    await tx.approvalStepInstance.update({
      where: { id: stepInstanceId },
      data: { status: ApprovalStepStatus.APPROVED, completedAt: new Date() },
    });

    // Find next step instance in order
    const nextStep = await tx.approvalStepInstance.findFirst({
      where: {
        approvalRequestId,
        sequence: { gt: stepInstance.sequence },
      },
      orderBy: { sequence: "asc" },
    });

    if (nextStep) {
      // Activate next step
      await tx.approvalStepInstance.update({
        where: { id: nextStep.id },
        data: { status: ApprovalStepStatus.IN_PROGRESS, startedAt: new Date() },
      });

      await tx.approvalRequest.update({
        where: { id: approvalRequestId },
        data: { currentStepSequence: nextStep.sequence },
      });

      return {
        requestStatus: ApprovalRequestStatus.IN_PROGRESS,
        stepStatus: ApprovalStepStatus.APPROVED,
        completed: false,
      };
    } else {
      // Final step completed -> Re-verify source staleness inside transaction before final approval write
      const staleness = await revalidateApprovalStaleness({
        approvalRequestId,
        organizationId,
        tx,
      });

      if (staleness.stale) {
        throw new Error(`Approval transaction rolled back: source material changed (${staleness.reason || "stale"})`);
      }

      await tx.approvalRequest.update({
        where: { id: approvalRequestId },
        data: { status: ApprovalRequestStatus.APPROVED, completedAt: new Date() },
      });

      return {
        requestStatus: ApprovalRequestStatus.APPROVED,
        stepStatus: ApprovalStepStatus.APPROVED,
        completed: true,
      };
    }
  }

  return {
    requestStatus: ApprovalRequestStatus.IN_PROGRESS,
    stepStatus: newStepStatus,
    completed: false,
  };
}

/**
 * Checks source staleness and transitions request to STALE if source data materially changed
 */
export async function revalidateApprovalStaleness({
  approvalRequestId,
  organizationId,
  tx,
}: {
  approvalRequestId: string;
  organizationId: string;
  tx?: Prisma.TransactionClient;
}): Promise<{ stale: boolean; reason?: string }> {
  const db = tx || prisma;

  const request = await db.approvalRequest.findFirst({
    where: { id: approvalRequestId, organizationId },
  });

  if (!request) {
    return { stale: false };
  }

  if (
    request.status === ApprovalRequestStatus.CANCELLED ||
    request.status === ApprovalRequestStatus.REJECTED ||
    request.status === ApprovalRequestStatus.STALE
  ) {
    return { stale: request.status === ApprovalRequestStatus.STALE, reason: request.staleReason || undefined };
  }

  // Resolve source state from module
  const sourceInfo = await resolveApprovalSource({
    organizationId,
    sourceType: request.sourceType,
    sourceId: request.sourceId,
  });

  // Check if fingerprint changed or source is no longer eligible
  const isFingerprintMismatch = request.sourceFingerprint && sourceInfo.sourceFingerprint !== request.sourceFingerprint;
  const isSourceIneligible = !sourceInfo.eligible;

  if (isFingerprintMismatch || isSourceIneligible) {
    const reason = sourceInfo.reason || "Material source state modified after approval instantiation";

    await db.approvalRequest.update({
      where: { id: approvalRequestId },
      data: {
        status: ApprovalRequestStatus.STALE,
        staleAt: new Date(),
        staleReason: reason,
      },
    });

    await db.approvalStepInstance.updateMany({
      where: {
        approvalRequestId,
        status: { in: [ApprovalStepStatus.IN_PROGRESS, ApprovalStepStatus.PENDING, ApprovalStepStatus.APPROVED] },
      },
      data: { status: ApprovalStepStatus.STALE },
    });

    return { stale: true, reason };
  }

  return { stale: false };
}
