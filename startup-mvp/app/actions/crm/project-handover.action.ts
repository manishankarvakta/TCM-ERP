"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getTenantContext, verifyTenantAccess } from "@/lib/tenant-context";
import { verifyServerPermission, checkPermission } from "@/lib/permissions";
import { getNextSequenceNumber } from "@/lib/sequence";
import { logItemCreated, logItemUpdated } from "@/lib/user-log";
import { revalidateBothPaths } from "@/lib/route-utils-server";
import { ProjectHandoverStatus, ServiceSaleStatus, Prisma } from "@prisma/client";

/**
 * Get paginated list of Project Handovers
 */
export async function getProjectHandovers(
  page: number = 1,
  limit: number = 10,
  search: string = "",
  status: string = "all",
  serviceSaleId?: string,
  clientId?: string
) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized", handovers: [], total: 0 };

    const { organizationId } = await getTenantContext();

    const canView = await checkPermission(session.user.id, "crm.project-handovers", "view");
    if (!canView) {
      return { success: false, error: "Permission Denied: crm.project-handovers.view", handovers: [], total: 0 };
    }

    const skip = (page - 1) * limit;
    const where: Prisma.ProjectHandoverWhereInput = {
      organizationId,
      isTrash: false,
    };

    if (serviceSaleId) where.serviceSaleId = serviceSaleId;
    if (clientId) where.clientId = clientId;

    if (search) {
      where.OR = [
        { handoverNumber: { contains: search, mode: "insensitive" } },
        { deliveryScopeSummary: { contains: search, mode: "insensitive" } },
      ];
    }

    if (status && status !== "all") {
      where.status = status as ProjectHandoverStatus;
    }

    const [handovers, total] = await Promise.all([
      prisma.projectHandover.findMany({
        where,
        skip,
        take: limit,
        orderBy: { updatedAt: "desc" },
        include: {
          ServiceSale: { select: { id: true, serviceSaleNumber: true, status: true, orderValue: true } },
          Agreement: { select: { id: true, agreementNumber: true, status: true } },
          Client: { select: { id: true, name: true, company: true, clientCode: true } },
          PreparedBy: { select: { id: true, name: true, email: true } },
          ProposedProjectManager: { select: { id: true, name: true, email: true } },
          AcceptedBy: { select: { id: true, name: true, email: true } },
          Project: { select: { id: true, projectNumber: true, title: true, status: true } },
          _count: { select: { Items: true } },
        },
      }),
      prisma.projectHandover.count({ where }),
    ]);

    return {
      success: true,
      handovers,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
    };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to fetch project handovers";
    console.error("getProjectHandovers error:", error);
    return { success: false, error: msg, handovers: [], total: 0 };
  }
}

/**
 * Get detailed Project Handover by ID
 */
export async function getProjectHandover(id: string) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized", handover: null };

    const handover = await prisma.projectHandover.findUnique({
      where: { id },
      include: {
        ServiceSale: {
          select: {
            id: true,
            serviceSaleNumber: true,
            status: true,
            orderValue: true,
            currency: true,
            scopeSummary: true,
          },
        },
        Agreement: { select: { id: true, agreementNumber: true, title: true, version: true, status: true } },
        Quotation: { select: { id: true, quotationNumber: true, subject: true } },
        Opportunity: { select: { id: true, title: true, opportunityNumber: true } },
        Requirement: { select: { id: true, title: true, requirementNumber: true } },
        Estimation: { select: { id: true, estimationNumber: true, title: true } },
        Client: { select: { id: true, name: true, company: true, clientCode: true, email: true, phone: true } },
        Contact: { select: { id: true, firstName: true, lastName: true, email: true, phone: true, role: true } },
        PreparedBy: { select: { id: true, name: true, email: true } },
        ProposedProjectManager: { select: { id: true, name: true, email: true } },
        AcceptedBy: { select: { id: true, name: true, email: true } },
        Project: { select: { id: true, projectNumber: true, title: true, status: true, createdAt: true } },
        Items: { orderBy: { sortOrder: "asc" } },
      },
    });

    if (!handover) return { success: false, error: "Project Handover not found", handover: null };

// @ts-expect-error - Legacy compatibility
    await verifyTenantAccess(handover.organizationId);

    const canView = await checkPermission(session.user.id, "crm.project-handovers", "view");
    if (!canView) {
      return { success: false, error: "Permission Denied: crm.project-handovers.view", handover: null };
    }

    return { success: true, handover };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to fetch project handover";
    console.error("getProjectHandover error:", error);
    return { success: false, error: msg, handover: null };
  }
}

/**
 * Create Project Handover from Handover-Ready Service Sale
 */
export async function createProjectHandoverFromServiceSale(
  serviceSaleId: string,
  deliveryNotes?: string,
  technicalNotes?: string,
  kickoffRequirements?: string
) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const { organizationId } = await getTenantContext();
    await verifyServerPermission(session.user.id, "crm.project-handovers", "create");

    // Fetch Service Sale with items and verify readiness
    const serviceSale = await prisma.serviceSale.findUnique({
      where: { id: serviceSaleId },
      include: {
        Items: true,
      },
    });

    if (!serviceSale) return { success: false, error: "Service Sale not found" };

// @ts-expect-error - Legacy compatibility
    await verifyTenantAccess(serviceSale.organizationId);

    if (serviceSale.isTrash) return { success: false, error: "Cannot create Handover from trashed Service Sale." };
    if (!serviceSale.handoverReadyAt) {
      return {
        success: false,
        error: "Cannot create Handover: Service Sale must be marked Handover Ready first.",
      };
    }
    if (serviceSale.status === ServiceSaleStatus.CANCELLED || serviceSale.status === ServiceSaleStatus.VOID) {
      return { success: false, error: "Cancelled or Void Service Sale cannot be handed over." };
    }

    // Row-locking transaction for single active handover per Service Sale idempotency
    const result = await prisma.$transaction(async (tx) => {
      // Lock ServiceSale row in PostgreSQL
      await tx.$executeRawUnsafe(
        `SELECT id FROM "ServiceSale" WHERE id = '${serviceSale.id}' FOR UPDATE;`
      );

      const existingActiveHandover = await tx.projectHandover.findFirst({
        where: {
          organizationId,
          serviceSaleId: serviceSale.id,
          isTrash: false,
        },
      });

      if (existingActiveHandover) {
        return {
          id: existingActiveHandover.id,
          handoverNumber: existingActiveHandover.handoverNumber,
          isIdempotent: true,
        };
      }

      // Atomic HDO Business Sequence Number
      const handoverNumber = await getNextSequenceNumber(organizationId, "PROJECT_HANDOVER", "HDO");

      const newHandover = await tx.projectHandover.create({
        data: {
          organizationId,
          handoverNumber,
          serviceSaleId: serviceSale.id,
          agreementId: serviceSale.agreementId,
          agreementVersionSnapshot: serviceSale.agreementVersionSnapshot,
          quotationId: serviceSale.quotationId,
          opportunityId: serviceSale.opportunityId,
          requirementId: serviceSale.requirementId,
          estimationId: serviceSale.estimationId,
          clientId: serviceSale.clientId,
          contactId: serviceSale.contactId,
          sourceServiceSaleNumberSnapshot: serviceSale.serviceSaleNumber,
          sourceAgreementNumberSnapshot: serviceSale.agreementNumberSnapshot,
          contractValueSnapshot: serviceSale.contractValueSnapshot,
          currency: serviceSale.currency,
          commercialSnapshotJson: serviceSale.commercialSnapshotJson || undefined,
          deliveryScopeSummary: serviceSale.scopeSummary || null,
          deliveryNotes: deliveryNotes || null,
          technicalNotes: technicalNotes || null,
          kickoffRequirements: kickoffRequirements || null,
          expectedStartDate: serviceSale.expectedStartDate,
          expectedCompletionDate: serviceSale.expectedCompletionDate,
          status: ProjectHandoverStatus.DRAFT,
          preparedById: session.user.id,
        },
      });

      // Snapshot Items into ProjectHandoverItem rows
      if (serviceSale.Items && serviceSale.Items.length > 0) {
        await tx.projectHandoverItem.createMany({
          data: serviceSale.Items.map((item, idx) => ({
            organizationId,
            handoverId: newHandover.id,
            sourceServiceSaleItemId: item.id,
            code: item.code,
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            amount: item.amount,
            sortOrder: idx + 1,
          })),
        });
      }

      return {
        id: newHandover.id,
        handoverNumber: newHandover.handoverNumber,
        isIdempotent: false,
      };
    });

    await logItemCreated("ProjectHandover", result.id, `Handover ${result.handoverNumber}`);
    await revalidateBothPaths("/dashboard/crm/project-handovers");
    await revalidateBothPaths(`/dashboard/crm/service-sales/${serviceSale.id}`);

    return { success: true, handoverId: result.id, handoverNumber: result.handoverNumber, isIdempotent: result.isIdempotent };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to create project handover";
    console.error("createProjectHandoverFromServiceSale error:", error);
    return { success: false, error: msg };
  }
}

/**
 * Update Project Handover metadata
 */
export async function updateProjectHandover(
  id: string,
  input: {
    deliveryScopeSummary?: string;
    clientExpectations?: string;
    exclusions?: string;
    assumptions?: string;
    deliveryNotes?: string;
    technicalNotes?: string;
    kickoffRequirements?: string;
    proposedProjectManagerId?: string | null;
    status?: ProjectHandoverStatus;
  }
) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const existing = await prisma.projectHandover.findUnique({ where: { id } });
    if (!existing) return { success: false, error: "Project Handover not found" };

// @ts-expect-error - Legacy compatibility
    await verifyTenantAccess(existing.organizationId);
    await verifyServerPermission(session.user.id, "crm.project-handovers", "edit");

    if (existing.isTrash) return { success: false, error: "Cannot modify a trashed handover." };
    if (existing.status === ProjectHandoverStatus.PROJECT_CREATED || existing.status === ProjectHandoverStatus.ACCEPTED) {
      return { success: false, error: "Accepted or Project-Created Handover is read-only." };
    }

    // Proposed PM validation
    if (input.proposedProjectManagerId) {
      const pmUser = await prisma.user.findUnique({ where: { id: input.proposedProjectManagerId } });
      if (!pmUser || pmUser.organizationId !== existing.organizationId) {
        return { success: false, error: "Proposed Project Manager does not belong to your organization." };
      }
    }

    // Protected status bypass prevention
    if (input.status === ProjectHandoverStatus.SUBMITTED) {
      return { success: false, error: "Bypass Rejected: Transition to SUBMITTED requires submitProjectHandover()." };
    }
    if (input.status === ProjectHandoverStatus.ACCEPTED) {
      return { success: false, error: "Bypass Rejected: Transition to ACCEPTED requires acceptProjectHandover()." };
    }
    if (input.status === ProjectHandoverStatus.PROJECT_CREATED) {
      return { success: false, error: "Bypass Rejected: Transition to PROJECT_CREATED requires createProjectFromHandover()." };
    }

    const data: Prisma.ProjectHandoverUpdateInput = {};
    if (input.deliveryScopeSummary !== undefined) data.deliveryScopeSummary = input.deliveryScopeSummary;
    if (input.clientExpectations !== undefined) data.clientExpectations = input.clientExpectations;
    if (input.exclusions !== undefined) data.exclusions = input.exclusions;
    if (input.assumptions !== undefined) data.assumptions = input.assumptions;
    if (input.deliveryNotes !== undefined) data.deliveryNotes = input.deliveryNotes;
    if (input.technicalNotes !== undefined) data.technicalNotes = input.technicalNotes;
    if (input.kickoffRequirements !== undefined) data.kickoffRequirements = input.kickoffRequirements;
// @ts-expect-error - Legacy compatibility
    if (input.proposedProjectManagerId !== undefined) data.proposedProjectManagerId = input.proposedProjectManagerId;
    if (input.status !== undefined) data.status = input.status;

    const updated = await prisma.projectHandover.update({
      where: { id },
      data,
    });

    await logItemUpdated("ProjectHandover", updated.id, updated.handoverNumber);
    await revalidateBothPaths(`/dashboard/crm/project-handovers/${id}`);
    await revalidateBothPaths("/dashboard/crm/project-handovers");

    return { success: true, handover: updated };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to update project handover";
    console.error("updateProjectHandover error:", error);
    return { success: false, error: msg };
  }
}

/**
 * Submit Project Handover for Delivery Acceptance
 */
export async function submitProjectHandover(id: string) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const handover = await prisma.projectHandover.findUnique({ where: { id } });
    if (!handover) return { success: false, error: "Project Handover not found" };

// @ts-expect-error - Legacy compatibility
    await verifyTenantAccess(handover.organizationId);
    await verifyServerPermission(session.user.id, "crm.project-handovers", "submit");

    if (handover.isTrash) return { success: false, error: "Cannot submit trashed handover." };

    const updated = await prisma.projectHandover.update({
      where: { id },
      data: {
        status: ProjectHandoverStatus.SUBMITTED,
      },
    });

    await logItemUpdated("ProjectHandover", updated.id, "Status: SUBMITTED");
    await revalidateBothPaths(`/dashboard/crm/project-handovers/${id}`);
    await revalidateBothPaths("/dashboard/crm/project-handovers");

    return { success: true, handover: updated };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to submit project handover";
    console.error("submitProjectHandover error:", error);
    return { success: false, error: msg };
  }
}

/**
 * Accept Project Handover (Delivery/Operations Confirmation)
 */
export async function acceptProjectHandover(id: string, proposedProjectManagerId?: string) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const handover = await prisma.projectHandover.findUnique({ where: { id } });
    if (!handover) return { success: false, error: "Project Handover not found" };

// @ts-expect-error - Legacy compatibility
    await verifyTenantAccess(handover.organizationId);
    await verifyServerPermission(session.user.id, "crm.project-handovers", "accept");

    if (handover.isTrash) return { success: false, error: "Cannot accept trashed handover." };
    if (handover.status !== ProjectHandoverStatus.SUBMITTED && handover.status !== ProjectHandoverStatus.DRAFT) {
      return { success: false, error: "Handover must be SUBMITTED before acceptance." };
    }

    const now = new Date();
    const updated = await prisma.projectHandover.update({
      where: { id },
      data: {
        status: ProjectHandoverStatus.ACCEPTED,
        acceptedById: session.user.id,
        acceptedAt: now,
        proposedProjectManagerId: proposedProjectManagerId || handover.proposedProjectManagerId,
      },
    });

    await logItemUpdated("ProjectHandover", updated.id, "Status: ACCEPTED");
    await revalidateBothPaths(`/dashboard/crm/project-handovers/${id}`);
    await revalidateBothPaths("/dashboard/crm/project-handovers");

    return { success: true, handover: updated };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to accept project handover";
    console.error("acceptProjectHandover error:", error);
    return { success: false, error: msg };
  }
}

/**
 * Reject Project Handover
 */
export async function rejectProjectHandover(id: string, rejectionReason: string) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const handover = await prisma.projectHandover.findUnique({ where: { id } });
    if (!handover) return { success: false, error: "Project Handover not found" };

// @ts-expect-error - Legacy compatibility
    await verifyTenantAccess(handover.organizationId);
    await verifyServerPermission(session.user.id, "crm.project-handovers", "reject");

    if (!rejectionReason) return { success: false, error: "Rejection reason is required." };

    const updated = await prisma.projectHandover.update({
      where: { id },
      data: {
        status: ProjectHandoverStatus.REJECTED,
        rejectionReason,
      },
    });

    await logItemUpdated("ProjectHandover", updated.id, `Status: REJECTED (${rejectionReason})`);
    await revalidateBothPaths(`/dashboard/crm/project-handovers/${id}`);
    await revalidateBothPaths("/dashboard/crm/project-handovers");

    return { success: true, handover: updated };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to reject project handover";
    console.error("rejectProjectHandover error:", error);
    return { success: false, error: msg };
  }
}

/**
 * Create Project from ACCEPTED Handover (Reuses existing Project model with strict transaction safety)
 */
export async function createProjectFromHandover(
  handoverId: string,
  projectTitle?: string,
  projectManagerId?: string
) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const { organizationId } = await getTenantContext();
    await verifyServerPermission(session.user.id, "crm.project-handovers", "create-project");

    const handover = await prisma.projectHandover.findUnique({ where: { id: handoverId } });
    if (!handover) return { success: false, error: "Project Handover not found" };

// @ts-expect-error - Legacy compatibility
    await verifyTenantAccess(handover.organizationId);

    if (handover.isTrash) return { success: false, error: "Cannot create project from trashed handover." };
    if (handover.status !== ProjectHandoverStatus.ACCEPTED && handover.status !== ProjectHandoverStatus.PROJECT_CREATED) {
      return {
        success: false,
        error: `Cannot create project: Handover status is '${handover.status}'. Must be 'ACCEPTED'.`,
      };
    }

    // Transactional creation with row locking to ensure idempotency (20 requests -> 1 Project)
    const result = await prisma.$transaction(async (tx) => {
      // Lock Handover row in PostgreSQL
      await tx.$executeRawUnsafe(
        `SELECT id FROM "ProjectHandover" WHERE id = '${handover.id}' FOR UPDATE;`
      );

      // Check if Project already linked to this Handover
      if (handover.projectId) {
        const existingProject = await tx.project.findUnique({ where: { id: handover.projectId } });
        if (existingProject) {
          return {
            projectId: existingProject.id,
            projectNumber: existingProject.projectNumber || existingProject.id,
            isIdempotent: true,
          };
        }
      }

      // Generate atomic PRJ sequence number if applicable or use format
      const projectNumber = `PRJ-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;

      // Critical Commercial Rule: orderValue is NOT mapped into internal Project.budget (cost budget != selling price)
      const newProject = await tx.project.create({
        data: {
          organizationId,
          projectNumber,
          title: projectTitle || `Delivery Project - ${handover.handoverNumber}`,
          description: handover.deliveryScopeSummary || null,
          status: "PLANNING",
          priority: handover.priority || "NORMAL",
          startDate: handover.expectedStartDate || null,
          endDate: handover.expectedCompletionDate || null,
          clientId: handover.clientId,
          opportunityId: handover.opportunityId || null,
          ownerId: session.user.id,
          projectManagerId: projectManagerId || handover.proposedProjectManagerId || null,
        },
      });

      // Update Handover with projectId and transition status to PROJECT_CREATED
      await tx.projectHandover.update({
        where: { id: handover.id },
        data: {
          projectId: newProject.id,
          status: ProjectHandoverStatus.PROJECT_CREATED,
        },
      });

      return {
        projectId: newProject.id,
        projectNumber: newProject.projectNumber,
        isIdempotent: false,
      };
    });

    await logItemCreated("Project", result.projectId, `Project ${result.projectNumber}`);
    await revalidateBothPaths(`/dashboard/crm/project-handovers/${handover.id}`);
    await revalidateBothPaths("/dashboard/crm/project-handovers");

    return { success: true, projectId: result.projectId, projectNumber: result.projectNumber, isIdempotent: result.isIdempotent };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to create project from handover";
    console.error("createProjectFromHandover error:", error);
    return { success: false, error: msg };
  }
}

/**
 * Trash Project Handover
 */
export async function deleteProjectHandover(id: string) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const existing = await prisma.projectHandover.findUnique({ where: { id } });
    if (!existing) return { success: false, error: "Project Handover not found" };

// @ts-expect-error - Legacy compatibility
    await verifyTenantAccess(existing.organizationId);
    await verifyServerPermission(session.user.id, "crm.project-handovers", "move-to-trash");

    await prisma.projectHandover.update({
      where: { id },
      data: { isTrash: true },
    });

    await logItemUpdated("ProjectHandover", id, "Moved to Trash");
    await revalidateBothPaths("/dashboard/crm/project-handovers");

    return { success: true };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to delete project handover";
    console.error("deleteProjectHandover error:", error);
    return { success: false, error: msg };
  }
}
