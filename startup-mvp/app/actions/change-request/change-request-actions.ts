"use server";

import { PrismaClient, ChangeRequestStatus, ChangeRequestType, ChangeRequestSource, ApprovalSourceType, ApprovalRequestStatus, BillingMilestoneStatus, BillingMilestoneType } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";
import {
  generateNextCRNumber,
  resolveCommercialBaselineAuthority,
  checkMaterialStaleness,
  calculateRevisedContractAmount,
  calculateCommercialReductionEligibility
} from "@/lib/change-request/change-request-engine";

const prisma = new PrismaClient();

export async function createChangeRequestAction(data: {
  organizationId: string;
  projectId: string;
  actorUserId: string;
  title: string;
  description: string;
  changeType?: ChangeRequestType;
  source?: ChangeRequestSource;
  businessReason?: string;
  requestedScope?: string;
  clientId?: string;
  agreementId?: string;
  serviceSaleId?: string;
  billingPlanId?: string;
  supportTicketId?: string;
}) {
  try {
    const {
      organizationId,
      projectId,
      actorUserId,
      title,
      description,
      changeType = ChangeRequestType.SCOPE_MODIFY,
      source = ChangeRequestSource.INTERNAL,
      businessReason,
      requestedScope,
      clientId,
      agreementId,
      serviceSaleId,
      billingPlanId,
      supportTicketId
    } = data;

    // Validate project tenant boundary
    const project = await prisma.project.findFirst({
      where: { id: projectId, organizationId }
    });

    if (!project) {
      throw new Error("Project not found or tenant boundary violated.");
    }

    if (clientId) {
      const client = await prisma.client.findFirst({ where: { id: clientId, organizationId } });
      if (!client) throw new Error("Client not found or tenant boundary violated.");
    }

    if (agreementId) {
      const agreement = await prisma.agreement.findFirst({ where: { id: agreementId, organizationId } });
      if (!agreement) throw new Error("Agreement not found or tenant boundary violated.");
    }

    if (supportTicketId) {
      const ticket = await prisma.supportTicket.findFirst({ where: { id: supportTicketId, organizationId } });
      if (!ticket) throw new Error("SupportTicket not found or tenant boundary violated.");
    }

    const crNumber = await generateNextCRNumber(organizationId, prisma);

    const result = await prisma.$transaction(async (tx) => {
      const cr = await tx.changeRequest.create({
        data: {
          organizationId,
          changeRequestNumber: crNumber,
          projectId,
          clientId: clientId || project.clientId,
          agreementId,
          serviceSaleId,
          billingPlanId,
          supportTicketId,
          title,
          description,
          changeType,
          source,
          businessReason,
          requestedScope,
          status: ChangeRequestStatus.DRAFT,
          createdById: actorUserId
        }
      });

      await tx.changeRequestAuditLog.create({
        data: {
          organizationId,
          changeRequestId: cr.id,
          actorUserId,
          action: "CR_CREATED",
          details: { changeRequestNumber: crNumber, title, changeType }
        }
      });

      return cr;
    });

    return { success: true, data: result };
  } catch (error: unknown) {
    const err = error as Error;
    return { success: false, error: err.message };
  }
}

export async function updateChangeRequestDraftAction(data: {
  organizationId: string;
  changeRequestId: string;
  actorUserId: string;
  title?: string;
  description?: string;
  changeType?: ChangeRequestType;
  source?: ChangeRequestSource;
  businessReason?: string;
  requestedScope?: string;
}) {
  try {
    const { organizationId, changeRequestId, actorUserId, title, description, changeType, source, businessReason, requestedScope } = data;

    const result = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT id FROM "ChangeRequest" WHERE id = ${changeRequestId} FOR UPDATE`;

      const cr = await tx.changeRequest.findFirst({
        where: { id: changeRequestId, organizationId }
      });

      if (!cr) {
        throw new Error("ChangeRequest not found or tenant boundary violated.");
      }

      if (cr.status !== ChangeRequestStatus.DRAFT) {
        throw new Error(`Cannot edit ChangeRequest in status ${cr.status}. Only DRAFT requests can be edited.`);
      }

      const updated = await tx.changeRequest.update({
        where: { id: changeRequestId },
        data: {
          title: title ?? cr.title,
          description: description ?? cr.description,
          changeType: changeType ?? cr.changeType,
          source: source ?? cr.source,
          businessReason: businessReason ?? cr.businessReason,
          requestedScope: requestedScope ?? cr.requestedScope,
          updatedById: actorUserId
        }
      });

      await tx.changeRequestAuditLog.create({
        data: {
          organizationId,
          changeRequestId,
          actorUserId,
          action: "CR_EDITED",
          details: { title: updated.title, changeType: updated.changeType }
        }
      });

      return updated;
    });

    return { success: true, data: result };
  } catch (error: unknown) {
    const err = error as Error;
    return { success: false, error: err.message };
  }
}

export async function submitChangeRequestAction(data: {
  organizationId: string;
  changeRequestId: string;
  actorUserId: string;
}) {
  try {
    const { organizationId, changeRequestId, actorUserId } = data;

    const result = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT id FROM "ChangeRequest" WHERE id = ${changeRequestId} FOR UPDATE`;

      const cr = await tx.changeRequest.findFirst({
        where: { id: changeRequestId, organizationId }
      });

      if (!cr) {
        throw new Error("ChangeRequest not found or tenant boundary violated.");
      }

      if (cr.status !== ChangeRequestStatus.DRAFT) {
        throw new Error(`Cannot submit ChangeRequest in status ${cr.status}. Only DRAFT requests can be submitted.`);
      }

      // Resolve formal commercial baseline authority
      const baseline = await resolveCommercialBaselineAuthority(cr.projectId, organizationId, tx);

      const updated = await tx.changeRequest.update({
        where: { id: changeRequestId },
        data: {
          status: ChangeRequestStatus.SUBMITTED,
          submittedAt: new Date(),
          baselineSourceType: baseline.sourceType,
          baselineSourceId: baseline.sourceId,
          baselineVersion: baseline.sourceVersion,
          baselineContractAmount: baseline.contractAmount,
          baselinePlannedEndDate: baseline.plannedEndDate,
          agreementId: cr.agreementId || baseline.agreementId || null,
          serviceSaleId: cr.serviceSaleId || baseline.serviceSaleId || null,
          billingPlanId: cr.billingPlanId || baseline.billingPlanId || null,
          isStale: false,
          staleAt: null,
          staleReason: null,
          updatedById: actorUserId
        }
      });

      await tx.changeRequestAuditLog.create({
        data: {
          organizationId,
          changeRequestId,
          actorUserId,
          action: "CR_SUBMITTED",
          details: {
            baselineSourceType: baseline.sourceType,
            baselineSourceId: baseline.sourceId,
            baselineVersion: baseline.sourceVersion,
            baselineContractAmount: baseline.contractAmount.toString()
          }
        }
      });

      return updated;
    });

    return { success: true, data: result };
  } catch (error: unknown) {
    const err = error as Error;
    return { success: false, error: err.message };
  }
}

export async function analyzeChangeRequestAction(data: {
  organizationId: string;
  changeRequestId: string;
  actorUserId: string;
  deliveryImpact?: string;
  timelineImpactDays?: number;
  commercialImpactAmount?: number | Decimal;
  costImpactAmount?: number | Decimal;
  profitabilityImpactMargin?: number;
}) {
  try {
    const {
      organizationId,
      changeRequestId,
      actorUserId,
      deliveryImpact,
      timelineImpactDays = 0,
      commercialImpactAmount = 0,
      costImpactAmount = 0,
      profitabilityImpactMargin
    } = data;

    const commDec = new Decimal(commercialImpactAmount.toString());
    const costDec = new Decimal(costImpactAmount.toString());

    const result = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT id FROM "ChangeRequest" WHERE id = ${changeRequestId} FOR UPDATE`;

      const cr = await tx.changeRequest.findFirst({
        where: { id: changeRequestId, organizationId }
      });

      if (!cr) {
        throw new Error("ChangeRequest not found or tenant boundary violated.");
      }

      if (cr.status !== ChangeRequestStatus.SUBMITTED && cr.status !== ChangeRequestStatus.UNDER_ANALYSIS) {
        throw new Error(`Cannot analyze ChangeRequest in status ${cr.status}. Must be SUBMITTED or UNDER_ANALYSIS.`);
      }


      const baselineAmount = cr.baselineContractAmount || new Decimal(0);
      const revisedAmount = calculateRevisedContractAmount(baselineAmount, commDec);

      // Check material staleness against current live project baseline
      const staleness = await checkMaterialStaleness(changeRequestId, organizationId, tx);

      const updated = await tx.changeRequest.update({
        where: { id: changeRequestId },
        data: {
          status: ChangeRequestStatus.UNDER_ANALYSIS,
          analyzedAt: new Date(),
          deliveryImpact: deliveryImpact ?? cr.deliveryImpact,
          timelineImpactDays,
          commercialImpactAmount: commDec,
          costImpactAmount: costDec,
          profitabilityImpactMargin,
          revisedContractAmount: revisedAmount,
          isStale: staleness.isStale,
          staleAt: staleness.isStale ? new Date() : null,
          staleReason: staleness.reason || null,
          updatedById: actorUserId
        }
      });

      await tx.changeRequestAuditLog.create({
        data: {
          organizationId,
          changeRequestId,
          actorUserId,
          action: "CR_ANALYZED",
          details: {
            commercialImpactAmount: commDec.toString(),
            revisedContractAmount: revisedAmount.toString(),
            timelineImpactDays,
            isStale: staleness.isStale
          }
        }
      });

      return updated;
    });

    return { success: true, data: result };
  } catch (error: unknown) {
    const err = error as Error;
    return { success: false, error: err.message };
  }
}

export async function requestChangeRequestApprovalAction(data: {
  organizationId: string;
  changeRequestId: string;
  actorUserId: string;
}) {
  try {
    const { organizationId, changeRequestId, actorUserId } = data;

    const result = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT id FROM "ChangeRequest" WHERE id = ${changeRequestId} FOR UPDATE`;

      const cr = await tx.changeRequest.findFirst({
        where: { id: changeRequestId, organizationId }
      });

      if (!cr) {
        throw new Error("ChangeRequest not found or tenant boundary violated.");
      }

      if (cr.status !== ChangeRequestStatus.SUBMITTED && cr.status !== ChangeRequestStatus.UNDER_ANALYSIS) {
        throw new Error(`Cannot request approval for ChangeRequest in status ${cr.status}. Must be SUBMITTED or UNDER_ANALYSIS.`);
      }

      // Staleness check
      const staleness = await checkMaterialStaleness(changeRequestId, organizationId, tx);
      if (staleness.isStale) {
        throw new Error(`Cannot request approval: ChangeRequest is stale. ${staleness.reason}`);
      }

      // Check or create approval policy for CHANGE_REQUEST
      let policy = await tx.approvalPolicy.findFirst({
        where: { organizationId, sourceType: ApprovalSourceType.CHANGE_REQUEST, active: true }
      });

      if (!policy) {
        policy = await tx.approvalPolicy.create({
          data: {
            organizationId,
            name: "Default Change Request Approval Policy",
            code: `CR_POLICY_${organizationId.slice(0, 6)}_${Date.now()}`,
            sourceType: ApprovalSourceType.CHANGE_REQUEST,
            active: true
          }
        });

        await tx.approvalPolicyStep.create({
          data: {
            organizationId,
            policyId: policy.id,
            sequence: 1,
            name: "Manager Approval",
            minimumApprovals: 1
          }
        });
      }

      // Prevent duplicate active ApprovalRequests
      if (cr.approvalRequestId) {
        const existingApp = await tx.approvalRequest.findUnique({ where: { id: cr.approvalRequestId } });
        if (existingApp && (existingApp.status === ApprovalRequestStatus.PENDING || existingApp.status === ApprovalRequestStatus.IN_PROGRESS)) {
          return { success: true, data: cr, approvalRequestId: existingApp.id };
        }
      }

      const reqNumber = `AR-CR-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

      const approvalReq = await tx.approvalRequest.create({
        data: {
          organizationId,
          requestNumber: reqNumber,
          policyId: policy.id,
          sourceType: ApprovalSourceType.CHANGE_REQUEST,
          sourceId: changeRequestId,
          sourceVersion: cr.baselineVersion.toString(),
          title: `Approval for CR: ${cr.title}`,
          description: `Commercial Impact: ${cr.commercialImpactAmount}, Timeline: +${cr.timelineImpactDays} days`,
          status: ApprovalRequestStatus.PENDING,
          requestedById: actorUserId,
          requestedAt: new Date()
        }
      });

      const stepInst = await tx.approvalStepInstance.create({
        data: {
          organizationId,
          approvalRequestId: approvalReq.id,
          sequence: 1,
          nameSnapshot: "Manager Approval",
          status: "PENDING"
        }
      });

      await tx.approvalStepApprover.create({
        data: {
          organizationId,
          stepInstanceId: stepInst.id,
          approverUserId: actorUserId,
          approverRole: "COMMERCIAL_APPROVER"
        }
      });

      const updated = await tx.changeRequest.update({
        where: { id: changeRequestId },
        data: {
          approvalRequestId: approvalReq.id,
          status: ChangeRequestStatus.PENDING_APPROVAL,
          updatedById: actorUserId
        }
      });

      await tx.changeRequestAuditLog.create({
        data: {
          organizationId,
          changeRequestId,
          actorUserId,
          action: "CR_APPROVAL_REQUESTED",
          details: { approvalRequestId: approvalReq.id, requestNumber: reqNumber }
        }
      });

      return updated;
    });

    return { success: true, data: result };
  } catch (error: unknown) {
    const err = error as Error;
    return { success: false, error: err.message };
  }
}

export async function syncChangeRequestApprovalAction(data: {
  organizationId: string;
  changeRequestId: string;
  actorUserId: string;
}) {
  try {
    const { organizationId, changeRequestId, actorUserId } = data;

    const result = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT id FROM "ChangeRequest" WHERE id = ${changeRequestId} FOR UPDATE`;

      const cr = await tx.changeRequest.findFirst({
        where: { id: changeRequestId, organizationId },
        include: { ApprovalRequest: true }
      });

      if (!cr) throw new Error("ChangeRequest not found or tenant boundary violated.");

      if (!cr.ApprovalRequest) {
        throw new Error("No ApprovalRequest associated with this ChangeRequest.");
      }

      const appStatus = cr.ApprovalRequest.status;

      if (appStatus === ApprovalRequestStatus.APPROVED && cr.status !== ChangeRequestStatus.APPROVED && cr.status !== ChangeRequestStatus.APPLIED) {
        const updated = await tx.changeRequest.update({
          where: { id: changeRequestId },
          data: {
            status: ChangeRequestStatus.APPROVED,
            approvedAt: cr.ApprovalRequest.completedAt || new Date(),
            updatedById: actorUserId
          }
        });

        await tx.changeRequestAuditLog.create({
          data: {
            organizationId,
            changeRequestId,
            actorUserId,
            action: "CR_APPROVED",
            details: { approvalRequestId: cr.ApprovalRequest.id }
          }
        });

        return updated;
      } else if (appStatus === ApprovalRequestStatus.REJECTED && cr.status !== ChangeRequestStatus.REJECTED) {
        const updated = await tx.changeRequest.update({
          where: { id: changeRequestId },
          data: {
            status: ChangeRequestStatus.REJECTED,
            rejectedAt: cr.ApprovalRequest.completedAt || new Date(),
            rejectionReason: "Rejected by Phase 15 Central Approval Engine.",
            updatedById: actorUserId
          }
        });

        await tx.changeRequestAuditLog.create({
          data: {
            organizationId,
            changeRequestId,
            actorUserId,
            action: "CR_REJECTED",
            details: { approvalRequestId: cr.ApprovalRequest.id }
          }
        });

        return updated;
      }

      return cr;
    });

    return { success: true, data: result };
  } catch (error: unknown) {
    const err = error as Error;
    return { success: false, error: err.message };
  }
}

export async function applyChangeRequestAction(data: {
  organizationId: string;
  changeRequestId: string;
  actorUserId: string;
  forceNotificationFailure?: boolean;
}) {
  try {
    const { organizationId, changeRequestId, actorUserId, forceNotificationFailure } = data;

    const result = await prisma.$transaction(async (tx) => {
      const crObj = await tx.changeRequest.findFirst({ where: { id: changeRequestId, organizationId }, select: { projectId: true } });
      if (crObj) {
        await tx.$executeRaw`SELECT id FROM "Project" WHERE id = ${crObj.projectId} FOR UPDATE`;
      }
      await tx.$executeRaw`SELECT id FROM "ChangeRequest" WHERE id = ${changeRequestId} FOR UPDATE`;

      const cr = await tx.changeRequest.findFirst({
        where: { id: changeRequestId, organizationId },
        include: { ApprovalRequest: true, Project: true }
      });

      if (!cr || !cr.Project) {
        throw new Error("ChangeRequest or Project not found or tenant boundary violated.");
      }

      if (cr.status === ChangeRequestStatus.APPLIED) {
        // Idempotent return if already applied
        return { success: true, data: cr, unchanged: true };
      }

      if (cr.status !== ChangeRequestStatus.APPROVED) {
        throw new Error(`Cannot apply ChangeRequest in status ${cr.status}. Must be APPROVED.`);
      }

      if (!cr.ApprovalRequest || cr.ApprovalRequest.status !== ApprovalRequestStatus.APPROVED) {
        throw new Error("Cannot apply ChangeRequest: Canonical Phase 15 ApprovalRequest is not APPROVED.");
      }

      // Check material staleness
      const staleness = await checkMaterialStaleness(changeRequestId, organizationId, tx);
      if (staleness.isStale) {
        throw new Error(`Cannot apply ChangeRequest: Source baseline is stale. ${staleness.reason}`);
      }

      // If negative reduction, check reduction eligibility against eligible uninvoiced authority
      if (cr.commercialImpactAmount.lt(0)) {
        const reductionCheck = await calculateCommercialReductionEligibility(
          cr.projectId,
          organizationId,
          cr.commercialImpactAmount,
          cr.billingPlanId,
          tx
        );

        if (!reductionCheck.isEligible) {
          throw new Error(reductionCheck.reason || "Negative commercial reduction exceeds eligible uninvoiced authority.");
        }
      }

      // Resolve current commercial baseline authority
      const currentBaseline = await resolveCommercialBaselineAuthority(cr.projectId, organizationId, tx);

      // Compute commercial amendment version
      const latestAmendment = await tx.commercialAmendment.findFirst({
        where: { projectId: cr.projectId },
        orderBy: { versionNumber: "desc" }
      });

      const nextVersion = latestAmendment ? latestAmendment.versionNumber + 1 : 2;
      const prevContractAmount = currentBaseline.contractAmount;
      const contractDelta = cr.commercialImpactAmount;
      const newContractAmount = cr.revisedContractAmount || prevContractAmount.add(contractDelta);

      // Create CommercialAmendment
      const amendment = await tx.commercialAmendment.create({
        data: {
          organizationId,
          changeRequestId,
          projectId: cr.projectId,
          agreementId: cr.agreementId || currentBaseline.agreementId || null,
          billingPlanId: cr.billingPlanId || currentBaseline.billingPlanId || null,
          versionNumber: nextVersion,
          previousContractAmount: prevContractAmount,
          newContractAmount,
          contractDelta,
          previousPlannedEndDate: cr.Project.endDate,
          newPlannedEndDate: cr.timelineImpactDays > 0 && cr.Project.endDate
            ? new Date(cr.Project.endDate.getTime() + cr.timelineImpactDays * 86400000)
            : cr.Project.endDate,
          appliedById: actorUserId
        }
      });

      // Update Project budget & planned end date ONLY as a derived/subordinate value
      const projectUpdateData: { budget: Decimal; endDate?: Date } = { budget: newContractAmount };
      if (cr.timelineImpactDays > 0 && cr.Project.endDate) {
        projectUpdateData.endDate = new Date(cr.Project.endDate.getTime() + cr.timelineImpactDays * 86400000);
      }

      await tx.project.update({
        where: { id: cr.projectId },
        data: projectUpdateData
      });

      // Adjust future billing plan milestones if present
      const targetBillingPlanId = cr.billingPlanId || currentBaseline.billingPlanId;
      if (targetBillingPlanId) {
        const billingPlan = await tx.projectBillingPlan.findFirst({
          where: { id: targetBillingPlanId, organizationId },
          include: { Milestones: { orderBy: { sequence: "desc" } } }
        });

        if (billingPlan) {
          await tx.projectBillingPlan.update({
            where: { id: targetBillingPlanId },
            data: { contractAmountSnapshot: newContractAmount }
          });

          // Protect already invoiced milestones! Add new milestone for commercial delta
          if (contractDelta.gt(0)) {
            const nextSeq = (billingPlan.Milestones[0]?.sequence || 0) + 1;
            await tx.projectBillingMilestone.create({
              data: {
                organizationId,
                billingPlanId: targetBillingPlanId,
                projectId: cr.projectId,
                sequence: nextSeq,
                code: `MS-CR-${nextSeq}`,
                name: `Change Request ${cr.changeRequestNumber} Scope Add`,
                description: cr.title,
                billingType: BillingMilestoneType.FIXED_MILESTONE,
                fixedAmount: contractDelta,
                calculatedAmount: contractDelta,
                status: BillingMilestoneStatus.DRAFT
              }
            });
          }
        }
      }

      // Mark ChangeRequest as APPLIED
      const updatedCR = await tx.changeRequest.update({
        where: { id: changeRequestId },
        data: {
          status: ChangeRequestStatus.APPLIED,
          appliedAt: new Date(),
          updatedById: actorUserId
        }
      });

      await tx.changeRequestAuditLog.create({
        data: {
          organizationId,
          changeRequestId,
          actorUserId,
          action: "CR_APPLIED",
          details: { versionNumber: nextVersion, newContractAmount: newContractAmount.toString(), contractDelta: contractDelta.toString() }
        }
      });

      return { success: true, data: updatedCR, amendment };
    });

    // DB-Backed Idempotent Notification Emission with Failure Safety (Requirements 1 & 9)
    const resPayload = result as { success: boolean; data?: { changeRequestNumber: string }; unchanged?: boolean };
    if (resPayload.success && !resPayload.unchanged) {
      try {
        if (forceNotificationFailure) {
          throw new Error("NOTIFICATION_SERVICE_TIMEOUT: Simulated post-commit notification failure.");
        }

        const idempotencyKey = `CR_APPLIED:${changeRequestId}`;

        try {
          await prisma.notification.create({
            data: {
              userId: actorUserId,
              type: "CR_APPLIED",
              title: "Change Request Applied",
              message: `Change Request ${resPayload.data?.changeRequestNumber || changeRequestId} has been successfully applied to the commercial baseline.`,
              entityType: "ChangeRequest",
              entityId: changeRequestId,
              idempotencyKey,
              createdBy: actorUserId
            }
          });
        } catch (notifErr: unknown) {
          const nErr = notifErr as { message?: string; code?: string };
          // P2002: Unique constraint failed on idempotencyKey -> Safe duplicate ignore
          if (!nErr.message?.includes("idempotencyKey") && !nErr.code?.includes("P2002")) {
            throw notifErr;
          }
        }
      } catch (notifErr: unknown) {
        // Notification failure MUST NOT corrupt or roll back canonical database state
        const nErr = notifErr as Error;
        console.warn(`[Notification Safety] ${nErr.message}`);
      }
    }

    return result;
  } catch (error: unknown) {
    const err = error as Error;
    if (err.message?.includes("exceeds remaining eligible uninvoiced authority") || err.message?.includes("exceeds eligible uninvoiced authority") || err.message?.includes("Requested reduction of")) {
      try {
        await prisma.changeRequest.update({
          where: { id: data.changeRequestId },
          data: { isStale: true, staleAt: new Date(), staleReason: err.message }
        });
      } catch {}
    }
    return { success: false, error: err.message };
  }
}

export async function linkChangeRequestIssueAction(data: {
  organizationId: string;
  changeRequestId: string;
  issueId: string;
  actorUserId: string;
}) {
  try {
    const { organizationId, changeRequestId, issueId, actorUserId } = data;

    const cr = await prisma.changeRequest.findFirst({ where: { id: changeRequestId, organizationId } });
    if (!cr) throw new Error("ChangeRequest not found or tenant boundary violated.");

    const issue = await prisma.issue.findFirst({ where: { id: issueId, organizationId } });
    if (!issue) throw new Error("Issue not found or tenant boundary violated.");

    const existing = await prisma.changeRequestIssueLink.findUnique({
      where: { changeRequestId_issueId: { changeRequestId, issueId } }
    });

    if (existing) {
      return { success: true, data: existing, unchanged: true };
    }

    const link = await prisma.changeRequestIssueLink.create({
      data: {
        organizationId,
        changeRequestId,
        issueId,
        createdById: actorUserId
      }
    });

    await prisma.changeRequestAuditLog.create({
      data: {
        organizationId,
        changeRequestId,
        actorUserId,
        action: "ISSUE_LINKED",
        details: { issueId }
      }
    });

    return { success: true, data: link };
  } catch (error: unknown) {
    const err = error as Error;
    return { success: false, error: err.message };
  }
}

export async function linkChangeRequestTaskAction(data: {
  organizationId: string;
  changeRequestId: string;
  taskId: string;
  actorUserId: string;
}) {
  try {
    const { organizationId, changeRequestId, taskId, actorUserId } = data;

    const cr = await prisma.changeRequest.findFirst({ where: { id: changeRequestId, organizationId } });
    if (!cr) throw new Error("ChangeRequest not found or tenant boundary violated.");

    const task = await prisma.task.findFirst({ where: { id: taskId, organizationId } });
    if (!task) throw new Error("Task not found or tenant boundary violated.");

    const existing = await prisma.changeRequestTaskLink.findUnique({
      where: { changeRequestId_taskId: { changeRequestId, taskId } }
    });

    if (existing) {
      return { success: true, data: existing, unchanged: true };
    }

    const link = await prisma.changeRequestTaskLink.create({
      data: {
        organizationId,
        changeRequestId,
        taskId,
        createdById: actorUserId
      }
    });

    await prisma.changeRequestAuditLog.create({
      data: {
        organizationId,
        changeRequestId,
        actorUserId,
        action: "TASK_LINKED",
        details: { taskId }
      }
    });

    return { success: true, data: link };
  } catch (error: unknown) {
    const err = error as Error;
    return { success: false, error: err.message };
  }
}

export async function cancelChangeRequestAction(data: {
  organizationId: string;
  changeRequestId: string;
  actorUserId: string;
  reason?: string;
}) {
  try {
    const { organizationId, changeRequestId, actorUserId, reason } = data;

    const result = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT id FROM "ChangeRequest" WHERE id = ${changeRequestId} FOR UPDATE`;

      const cr = await tx.changeRequest.findFirst({
        where: { id: changeRequestId, organizationId }
      });

      if (!cr) throw new Error("ChangeRequest not found or tenant boundary violated.");

      if (cr.status === ChangeRequestStatus.APPLIED) {
        throw new Error("Cannot cancel ChangeRequest that has already been APPLIED.");
      }

      const updated = await tx.changeRequest.update({
        where: { id: changeRequestId },
        data: {
          status: ChangeRequestStatus.CANCELLED,
          cancelledAt: new Date(),
          rejectionReason: reason || "Cancelled by user",
          updatedById: actorUserId
        }
      });

      await tx.changeRequestAuditLog.create({
        data: {
          organizationId,
          changeRequestId,
          actorUserId,
          action: "CR_CANCELLED",
          details: { reason: reason || "Cancelled by user" }
        }
      });

      return updated;
    });

    return { success: true, data: result };
  } catch (error: unknown) {
    const err = error as Error;
    return { success: false, error: err.message };
  }
}
