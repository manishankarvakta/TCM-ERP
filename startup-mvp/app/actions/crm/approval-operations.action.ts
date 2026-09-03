"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { verifyTenantAccess } from "@/lib/tenant-context";
import { verifyServerPermission } from "@/lib/permissions";
import { logItemCreated, logItemUpdated } from "@/lib/user-log";
import { revalidateBothPaths } from "@/lib/route-utils-server";
import {
  ApprovalSourceType,
  ApprovalRequestStatus,
  ApprovalMode,
  ApprovalStepStatus,
  ApprovalDecisionType,
  Prisma,
} from "@prisma/client";
import { resolveApprovalSource } from "@/lib/approvals/source-resolvers";
import { freezePolicySnapshot, evaluateStepProgression, revalidateApprovalStaleness } from "@/lib/approvals/approval-engine";

/**
 * Creates a new tenant ApprovalPolicy with ordered policy steps
 */
export async function createApprovalPolicyAction(data: {
  name: string;
  code: string;
  sourceType: ApprovalSourceType;
  steps: { sequence: number; name: string; approvalMode?: ApprovalMode; minimumApprovals?: number }[];
}) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("UNAUTHORIZED: Session invalid");

// @ts-expect-error - Legacy compatibility
  const tenantContext = await verifyTenantAccess();
// @ts-expect-error - Legacy compatibility
  const organizationId = tenantContext.organizationId;

  await verifyServerPermission(session.user.id, "approval.policies", "create");

  if (!data.name || !data.code || !data.sourceType || !data.steps || data.steps.length === 0) {
    throw new Error("Invalid policy data: name, code, sourceType, and steps are required");
  }

  // Create policy and steps in transaction
  const policy = await prisma.$transaction(async (tx) => {
    const createdPolicy = await tx.approvalPolicy.create({
      data: {
        organizationId,
        name: data.name,
        code: data.code,
        sourceType: data.sourceType,
        active: true,
      },
    });

    for (const step of data.steps) {
      await tx.approvalPolicyStep.create({
        data: {
          organizationId,
          policyId: createdPolicy.id,
          sequence: step.sequence,
          name: step.name,
          approvalMode: step.approvalMode || ApprovalMode.ANY,
          minimumApprovals: step.minimumApprovals || 1,
        },
      });
    }

    return createdPolicy;
  });

  await logItemCreated("ApprovalPolicy", policy.id, policy.name, session.user.id, organizationId);
  revalidateBothPaths("/dashboard/settings/approval-policies");

  return policy;
}

/**
 * Creates a new ApprovalRequest for an authoritative ERP source
 */
export async function createApprovalRequestAction(data: {
  sourceType: ApprovalSourceType;
  sourceId: string;
  policyId?: string;
  title?: string;
  description?: string;
  approverUserIds?: string[];
}) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("UNAUTHORIZED: Session invalid");

// @ts-expect-error - Legacy compatibility
  const tenantContext = await verifyTenantAccess();
// @ts-expect-error - Legacy compatibility
  const organizationId = tenantContext.organizationId;

  await verifyServerPermission(session.user.id, "approvals", "create");

  if (!data.sourceType || !data.sourceId) {
    throw new Error("sourceType and sourceId are required");
  }

  // 1. Resolve source eligibility and calculate server fingerprint
  const sourceInfo = await resolveApprovalSource({
    organizationId,
    sourceType: data.sourceType,
    sourceId: data.sourceId,
  });

  if (!sourceInfo.eligible) {
    throw new Error(`Source eligibility check failed: ${sourceInfo.reason || "Source is not ready for approval"}`);
  }

  // 2. Prevent duplicate active approval requests for the same source
  const existingActive = await prisma.approvalRequest.findFirst({
    where: {
      organizationId,
      sourceType: data.sourceType,
      sourceId: data.sourceId,
      status: { in: [ApprovalRequestStatus.DRAFT, ApprovalRequestStatus.PENDING, ApprovalRequestStatus.IN_PROGRESS] },
    },
  });

  if (existingActive) {
    throw new Error(`An active approval request (${existingActive.requestNumber}) already exists for this source`);
  }

  // 3. Find policy
  let policyId = data.policyId;
  if (!policyId) {
    const activePolicy = await prisma.approvalPolicy.findFirst({
      where: { organizationId, sourceType: data.sourceType, active: true },
      orderBy: { createdAt: "desc" },
    });

    if (!activePolicy) {
      // Create a default single-step policy if none exists
      const defaultPolicy = await prisma.approvalPolicy.create({
        data: {
          organizationId,
          name: `Default ${data.sourceType} Policy`,
          code: `DEFAULT_${data.sourceType}_${Date.now()}`,
          sourceType: data.sourceType,
          active: true,
          Steps: {
            create: [
              {
                organizationId,
                sequence: 1,
                name: "Initial Management Sign-off",
                approvalMode: ApprovalMode.ANY,
                minimumApprovals: 1,
              },
            ],
          },
        },
      });
      policyId = defaultPolicy.id;
    } else {
      policyId = activePolicy.id;
    }
  }

  // Generate request number
  const count = await prisma.approvalRequest.count({ where: { organizationId } });
  const requestNumber = `APR-${(count + 1).toString().padStart(5, "0")}`;

  // 4. Create request and freeze policy snapshot inside transaction
  const request = await prisma.$transaction(async (tx) => {
    const createdRequest = await tx.approvalRequest.create({
      data: {
        organizationId,
        requestNumber,
        policyId: policyId!,
        sourceType: data.sourceType,
        sourceId: data.sourceId,
        sourceVersion: sourceInfo.sourceVersion,
        sourceFingerprint: sourceInfo.sourceFingerprint,
        title: data.title || sourceInfo.title,
        description: data.description || sourceInfo.description,
        status: ApprovalRequestStatus.IN_PROGRESS,
        requestedById: session.user.id,
        requestedAt: new Date(),
      },
    });

    await freezePolicySnapshot({
      approvalRequestId: createdRequest.id,
      policyId: policyId!,
      organizationId,
      approverUserIds: data.approverUserIds,
      tx,
    });

    return createdRequest;
  });

  await logItemCreated("ApprovalRequest", request.id, request.requestNumber, session.user.id, organizationId);
  revalidateBothPaths("/dashboard/approvals");

  return request;
}

/**
 * Submits an existing DRAFT approval request
 */
export async function submitApprovalRequestAction(requestId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("UNAUTHORIZED: Session invalid");

// @ts-expect-error - Legacy compatibility
  const tenantContext = await verifyTenantAccess();
// @ts-expect-error - Legacy compatibility
  const organizationId = tenantContext.organizationId;

  await verifyServerPermission(session.user.id, "approvals", "create");

  const request = await prisma.approvalRequest.findFirst({
    where: { id: requestId, organizationId },
  });

  if (!request) throw new Error("Approval request not found");
  if (request.status !== ApprovalRequestStatus.DRAFT) {
    throw new Error(`Cannot submit request in status ${request.status}`);
  }

  // Revalidate source staleness
  const sourceInfo = await resolveApprovalSource({
    organizationId,
    sourceType: request.sourceType,
    sourceId: request.sourceId,
  });

  if (!sourceInfo.eligible) {
    throw new Error(`Source is no longer eligible: ${sourceInfo.reason}`);
  }

  const updated = await prisma.approvalRequest.update({
    where: { id: requestId },
    data: {
      status: ApprovalRequestStatus.IN_PROGRESS,
      requestedAt: new Date(),
      sourceVersion: sourceInfo.sourceVersion,
      sourceFingerprint: sourceInfo.sourceFingerprint,
    },
  });

  await logItemUpdated("ApprovalRequest", updated.id, updated.requestNumber, session.user.id, organizationId);
  revalidateBothPaths("/dashboard/approvals");

  return updated;
}

/**
 * Approves an active ApprovalStepInstance
 */
export async function approveApprovalStepAction(stepInstanceId: string, comment?: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("UNAUTHORIZED: Session invalid");

// @ts-expect-error - Legacy compatibility
  const tenantContext = await verifyTenantAccess();
// @ts-expect-error - Legacy compatibility
  const organizationId = tenantContext.organizationId;

  await verifyServerPermission(session.user.id, "approvals", "approve");

  // 1. Verify step instance & tenant scoping
  const stepInstance = await prisma.approvalStepInstance.findFirst({
    where: { id: stepInstanceId, organizationId },
    include: {
      ApprovalRequest: true,
      Approvers: true,
      Decisions: true,
    },
  });

  if (!stepInstance) throw new Error("Approval step instance not found or access denied");

  if (stepInstance.status !== ApprovalStepStatus.IN_PROGRESS) {
    throw new Error(`Cannot approve step in status ${stepInstance.status}`);
  }

  // 2. Verify approver authority (strictly persisted approver list)
  const isDesignatedApprover = stepInstance.Approvers.some((a) => a.approverUserId === session.user.id);

  if (!isDesignatedApprover) {
    throw new Error("FORBIDDEN: User is not authorized as a persisted approver for this step");
  }

  // 3. Revalidate source staleness before applying decision
  const staleness = await revalidateApprovalStaleness({
    approvalRequestId: stepInstance.approvalRequestId,
    organizationId,
  });

  if (staleness.stale) {
    throw new Error(`Approval request is STALE: ${staleness.reason}`);
  }

  // 4. Record decision and evaluate step progression atomically inside transaction
  const result = await prisma.$transaction(async (tx) => {
    // Record immutable decision
    await tx.approvalDecision.create({
      data: {
        organizationId,
        approvalRequestId: stepInstance.approvalRequestId,
        stepInstanceId: stepInstance.id,
        approverUserId: session.user.id,
        decision: ApprovalDecisionType.APPROVED,
        comment,
      },
    });

    return await evaluateStepProgression({
      approvalRequestId: stepInstance.approvalRequestId,
      stepInstanceId: stepInstance.id,
      organizationId,
      tx,
    });
  });

  await logItemUpdated("ApprovalStepInstance", stepInstance.id, `APPROVED step ${stepInstance.sequence}`, session.user.id, organizationId);
  revalidateBothPaths("/dashboard/approvals");

  return result;
}

/**
 * Rejects an active ApprovalStepInstance
 */
export async function rejectApprovalStepAction(stepInstanceId: string, comment?: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("UNAUTHORIZED: Session invalid");

// @ts-expect-error - Legacy compatibility
  const tenantContext = await verifyTenantAccess();
// @ts-expect-error - Legacy compatibility
  const organizationId = tenantContext.organizationId;

  await verifyServerPermission(session.user.id, "approvals", "reject");

  const stepInstance = await prisma.approvalStepInstance.findFirst({
    where: { id: stepInstanceId, organizationId },
    include: {
      ApprovalRequest: true,
      Approvers: true,
    },
  });

  if (!stepInstance) throw new Error("Approval step instance not found or access denied");

  if (stepInstance.status !== ApprovalStepStatus.IN_PROGRESS) {
    throw new Error(`Cannot reject step in status ${stepInstance.status}`);
  }

  const isDesignatedApprover = stepInstance.Approvers.some((a) => a.approverUserId === session.user.id);

  if (!isDesignatedApprover) {
    throw new Error("FORBIDDEN: User is not authorized as a persisted approver for this step");
  }

  const result = await prisma.$transaction(async (tx) => {
    await tx.approvalDecision.create({
      data: {
        organizationId,
        approvalRequestId: stepInstance.approvalRequestId,
        stepInstanceId: stepInstance.id,
        approverUserId: session.user.id,
        decision: ApprovalDecisionType.REJECTED,
        comment,
      },
    });

    return await evaluateStepProgression({
      approvalRequestId: stepInstance.approvalRequestId,
      stepInstanceId: stepInstance.id,
      organizationId,
      tx,
    });
  });

  await logItemUpdated("ApprovalStepInstance", stepInstance.id, `REJECTED step ${stepInstance.sequence}`, session.user.id, organizationId);
  revalidateBothPaths("/dashboard/approvals");

  return result;
}

/**
 * Cancels an active ApprovalRequest
 */
export async function cancelApprovalRequestAction(requestId: string, reason?: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("UNAUTHORIZED: Session invalid");

// @ts-expect-error - Legacy compatibility
  const tenantContext = await verifyTenantAccess();
// @ts-expect-error - Legacy compatibility
  const organizationId = tenantContext.organizationId;

  await verifyServerPermission(session.user.id, "approvals", "update");

  const request = await prisma.approvalRequest.findFirst({
    where: { id: requestId, organizationId },
  });

  if (!request) throw new Error("Approval request not found");

  const updated = await prisma.approvalRequest.update({
    where: { id: requestId },
    data: {
      status: ApprovalRequestStatus.CANCELLED,
      cancelledAt: new Date(),
      staleReason: reason || "Cancelled by user",
    },
  });

  await logItemUpdated("ApprovalRequest", updated.id, updated.requestNumber, session.user.id, organizationId);
  revalidateBothPaths("/dashboard/approvals");

  return updated;
}

/**
 * Checks and invalidates downstream approvals if source data changed
 */
export async function checkAndInvalidateStaleApprovalsAction(sourceType: ApprovalSourceType, sourceId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("UNAUTHORIZED: Session invalid");

// @ts-expect-error - Legacy compatibility
  const tenantContext = await verifyTenantAccess();
// @ts-expect-error - Legacy compatibility
  const organizationId = tenantContext.organizationId;

  const requests = await prisma.approvalRequest.findMany({
    where: {
      organizationId,
      sourceType,
      sourceId,
      status: { in: [ApprovalRequestStatus.APPROVED, ApprovalRequestStatus.IN_PROGRESS, ApprovalRequestStatus.PENDING] },
    },
  });

  let invalidatedCount = 0;
  for (const req of requests) {
    const res = await revalidateApprovalStaleness({
      approvalRequestId: req.id,
      organizationId,
    });
    if (res.stale) invalidatedCount++;
  }

  return { checkedCount: requests.length, invalidatedCount };
}

/**
 * Fetches a single ApprovalRequest with sanitized DTO (excludes confidential financial/payroll fields)
 */
export async function getApprovalRequestAction(requestId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("UNAUTHORIZED: Session invalid");

// @ts-expect-error - Legacy compatibility
  const tenantContext = await verifyTenantAccess();
// @ts-expect-error - Legacy compatibility
  const organizationId = tenantContext.organizationId;

  await verifyServerPermission(session.user.id, "approvals", "view");

  const request = await prisma.approvalRequest.findFirst({
    where: { id: requestId, organizationId },
    include: {
      Policy: true,
      RequestedBy: {
        select: { id: true, name: true, email: true, role: true }, // Confidential fields excluded
      },
      StepInstances: {
        orderBy: { sequence: "asc" },
        include: {
          Approvers: {
            include: {
              ApproverUser: { select: { id: true, name: true, email: true } },
            },
          },
          Decisions: {
            include: {
              ApproverUser: { select: { id: true, name: true, email: true } },
            },
          },
        },
      },
    },
  });

  if (!request) return null;

  // Revalidate staleness on fetch
  const staleness = await revalidateApprovalStaleness({
    approvalRequestId: request.id,
    organizationId,
  });

  if (staleness.stale) {
    return { ...request, status: ApprovalRequestStatus.STALE, staleReason: staleness.reason };
  }

  return request;
}

/**
 * Lists ApprovalRequests for the current tenant
 */
export async function listApprovalRequestsAction(filters?: {
  status?: ApprovalRequestStatus;
  sourceType?: ApprovalSourceType;
}) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("UNAUTHORIZED: Session invalid");

// @ts-expect-error - Legacy compatibility
  const tenantContext = await verifyTenantAccess();
// @ts-expect-error - Legacy compatibility
  const organizationId = tenantContext.organizationId;

  await verifyServerPermission(session.user.id, "approvals", "view");

  const whereClause: Prisma.ApprovalRequestWhereInput = {
    organizationId,
  };

  if (filters?.status) whereClause.status = filters.status;
  if (filters?.sourceType) whereClause.sourceType = filters.sourceType;

  return await prisma.approvalRequest.findMany({
    where: whereClause,
    orderBy: { createdAt: "desc" },
    include: {
      RequestedBy: { select: { id: true, name: true, email: true } },
      StepInstances: {
        orderBy: { sequence: "asc" },
        include: {
          Decisions: { select: { id: true, decision: true, decidedAt: true } },
        },
      },
    },
  });
}
