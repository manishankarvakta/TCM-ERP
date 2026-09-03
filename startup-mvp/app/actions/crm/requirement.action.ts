"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getTenantContext, verifyTenantAccess } from "@/lib/tenant-context";
import { verifyServerPermission, checkPermission } from "@/lib/permissions";
import { getNextSequenceNumber } from "@/lib/sequence";
import { logItemCreated, logItemUpdated } from "@/lib/user-log";
import { revalidateBothPaths } from "@/lib/route-utils-server";
import { RequirementStatus, RequirementPriority, RequirementItemType, ClarificationStatus, Prisma } from "@prisma/client";

/**
 * Get paginated list of Requirements with filtering
 */
export async function getRequirements(
  page: number = 1,
  limit: number = 10,
  search: string = "",
  status: string = "all",
  priority: string = "all",
  opportunityId?: string,
  clientId?: string
) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized", requirements: [], total: 0 };

    const { organizationId } = await getTenantContext();

    // Permission check
    const canView = await checkPermission(session.user.id, "crm.requirements", "view");
    if (!canView) {
      return { success: false, error: "Permission Denied: crm.requirements.view", requirements: [], total: 0 };
    }

    const skip = (page - 1) * limit;
    const where: Prisma.RequirementWhereInput = {
      organizationId,
      isTrash: false,
    };

    if (opportunityId) where.opportunityId = opportunityId;
    if (clientId) where.clientId = clientId;

    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { requirementNumber: { contains: search, mode: "insensitive" } },
        { summary: { contains: search, mode: "insensitive" } },
        { scopeOverview: { contains: search, mode: "insensitive" } },
      ];
    }

    if (status && status !== "all") {
      where.status = status as RequirementStatus;
    }

    if (priority && priority !== "all") {
      where.priority = priority as RequirementPriority;
    }

    const [requirements, total] = await Promise.all([
      prisma.requirement.findMany({
        where,
        skip,
        take: limit,
        orderBy: { updatedAt: "desc" },
        include: {
          Opportunity: { select: { id: true, title: true, opportunityNumber: true } },
          Client: { select: { id: true, name: true, company: true, clientCode: true } },
          Contact: { select: { id: true, firstName: true, lastName: true, email: true } },
          Owner: { select: { id: true, name: true, email: true } },
          PreparedBy: { select: { id: true, name: true, email: true } },
          _count: {
            select: {
              Sections: true,
              Items: { where: { isTrash: false } },
              Clarifications: { where: { status: "OPEN" } },
            },
          },
        },
      }),
      prisma.requirement.count({ where }),
    ]);

    return {
      success: true,
      requirements,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
    };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to fetch requirements";
    console.error("getRequirements error:", error);
    return { success: false, error: msg, requirements: [], total: 0 };
  }
}

/**
 * Get detailed Requirement by ID with Sections, Items, and Clarifications
 */
export async function getRequirement(id: string) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized", requirement: null };

    const requirement = await prisma.requirement.findUnique({
      where: { id },
      include: {
        Opportunity: { select: { id: true, title: true, opportunityNumber: true, stage: true } },
        Client: { select: { id: true, name: true, company: true, clientCode: true, email: true, phone: true } },
        Contact: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
        Owner: { select: { id: true, name: true, email: true } },
        PreparedBy: { select: { id: true, name: true, email: true } },
        Sections: {
          orderBy: { sortOrder: "asc" },
          include: {
            Items: {
              where: { isTrash: false },
              orderBy: { sortOrder: "asc" },
            },
          },
        },
        Items: {
          where: { isTrash: false, sectionId: null },
          orderBy: { sortOrder: "asc" },
        },
        Clarifications: {
          orderBy: { createdAt: "desc" },
          include: {
            AskedBy: { select: { id: true, name: true, email: true } },
            AnsweredBy: { select: { id: true, name: true, email: true } },
          },
        },
      },
    });

    if (!requirement) {
      return { success: false, error: "Requirement not found", requirement: null };
    }

    // Fail-Closed Tenant Context Verification
// @ts-expect-error - Legacy compatibility
    await verifyTenantAccess(requirement.organizationId);

    // Permission check
    const canView = await checkPermission(session.user.id, "crm.requirements", "view");
    if (!canView) {
      return { success: false, error: "Permission Denied: crm.requirements.view", requirement: null };
    }

    return { success: true, requirement };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to fetch requirement";
    console.error("getRequirement error:", error);
    return { success: false, error: msg, requirement: null };
  }
}

/**
 * Create a new Requirement package
 */
export async function createRequirement(input: {
  opportunityId: string;
  clientId?: string;
  contactId?: string;
  title: string;
  summary?: string;
  businessObjective?: string;
  scopeOverview?: string;
  priority?: RequirementPriority;
  source?: string;
  requestedStartDate?: Date | string;
  targetDeliveryDate?: Date | string;
  budgetExpectation?: number;
  currency?: string;
  ownerId?: string;
}) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const { organizationId } = await getTenantContext();

    // RBAC check
    await verifyServerPermission(session.user.id, "crm.requirements", "create");

    // Fetch opportunity to verify tenant and retrieve derived client/contact if omitted
    const opportunity = await prisma.opportunity.findUnique({
      where: { id: input.opportunityId },
      select: { id: true, organizationId: true, clientId: true, contactId: true },
    });

    if (!opportunity) {
      return { success: false, error: "Associated Opportunity not found" };
    }

    // Fail-Closed Parent Tenant Validation
// @ts-expect-error - Legacy compatibility
    await verifyTenantAccess(opportunity.organizationId);

    // Client Consistency Check: Ensure payload client matches Opportunity client or derive it
    const clientId = opportunity.clientId;
    if (input.clientId && input.clientId !== opportunity.clientId) {
      return { success: false, error: "Payload Client mismatch: Requirement must belong to Opportunity's Client" };
    }

    // Contact Consistency Check
    const contactId = input.contactId || opportunity.contactId || null;
    if (input.contactId) {
      const contact = await prisma.contact.findUnique({
        where: { id: input.contactId },
        select: { id: true, organizationId: true, clientId: true },
      });
      if (!contact || contact.organizationId !== organizationId || contact.clientId !== clientId) {
        return { success: false, error: "Selected Contact does not belong to client or organization" };
      }
    }

    // Owner Tenant Validation
    const ownerId = input.ownerId || session.user.id;
    if (input.ownerId) {
      const ownerUser = await prisma.user.findUnique({
        where: { id: input.ownerId },
        select: { id: true, organizationId: true },
      });
      if (!ownerUser || ownerUser.organizationId !== organizationId) {
        return { success: false, error: "Selected Owner does not belong to your organization" };
      }
    }

    // Generate atomic sequence number REQ-YYYY-XXXXXX
    const requirementNumber = await getNextSequenceNumber(organizationId, "REQUIREMENT", "REQ");

    const requirement = await prisma.requirement.create({
      data: {
        organizationId,
        requirementNumber,
        opportunityId: opportunity.id,
        clientId,
        contactId,
        title: input.title,
        summary: input.summary || null,
        businessObjective: input.businessObjective || null,
        scopeOverview: input.scopeOverview || null,
        priority: input.priority || RequirementPriority.MEDIUM,
        status: RequirementStatus.DRAFT,
        source: input.source || "Opportunity Discovery",
        requestedStartDate: input.requestedStartDate ? new Date(input.requestedStartDate) : null,
        targetDeliveryDate: input.targetDeliveryDate ? new Date(input.targetDeliveryDate) : null,
        budgetExpectation: input.budgetExpectation ? new Prisma.Decimal(input.budgetExpectation) : null,
        currency: input.currency || "TK",
        ownerId,
        preparedById: session.user.id,
      },
    });

    await logItemCreated("Requirement", requirement.id, requirement.title);
    await revalidateBothPaths("/dashboard/crm/requirements");
    await revalidateBothPaths(`/dashboard/crm/opportunities/${opportunity.id}`);

    return { success: true, requirementId: requirement.id, requirementNumber };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to create requirement";
    console.error("createRequirement error:", error);
    return { success: false, error: msg };
  }
}

/**
 * Update Requirement metadata
 */
export async function updateRequirement(
  id: string,
  input: {
    title?: string;
    summary?: string;
    businessObjective?: string;
    scopeOverview?: string;
    priority?: RequirementPriority;
    status?: RequirementStatus;
    requestedStartDate?: Date | string | null;
    targetDeliveryDate?: Date | string | null;
    budgetExpectation?: number | null;
    currency?: string;
    ownerId?: string;
    contactId?: string | null;
  }
) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const existing = await prisma.requirement.findUnique({ where: { id } });
    if (!existing) return { success: false, error: "Requirement not found" };

// @ts-expect-error - Legacy compatibility
    await verifyTenantAccess(existing.organizationId);
    await verifyServerPermission(session.user.id, "crm.requirements", "edit");

    if (existing.isTrash) {
      return { success: false, error: "Cannot modify a trashed requirement package." };
    }

    // Generic status update bypass prevention: READY_FOR_ESTIMATION can ONLY be set by markReadyForEstimation()
    if (input.status === RequirementStatus.READY_FOR_ESTIMATION) {
      return { success: false, error: "Bypass Rejected: Transition to READY_FOR_ESTIMATION requires markReadyForEstimation()." };
    }

    if (existing.status === RequirementStatus.CANCELLED && input.status && input.status !== RequirementStatus.CANCELLED) {
      return { success: false, error: "Cannot transition out of CANCELLED status directly." };
    }

    const data: Prisma.RequirementUpdateInput = {};
    if (input.title !== undefined) data.title = input.title;
    if (input.summary !== undefined) data.summary = input.summary;
    if (input.businessObjective !== undefined) data.businessObjective = input.businessObjective;
    if (input.scopeOverview !== undefined) data.scopeOverview = input.scopeOverview;
    if (input.priority !== undefined) data.priority = input.priority;
    if (input.status !== undefined) data.status = input.status;
    if (input.requestedStartDate !== undefined) data.requestedStartDate = input.requestedStartDate ? new Date(input.requestedStartDate) : null;
    if (input.targetDeliveryDate !== undefined) data.targetDeliveryDate = input.targetDeliveryDate ? new Date(input.targetDeliveryDate) : null;
    if (input.budgetExpectation !== undefined) data.budgetExpectation = input.budgetExpectation ? new Prisma.Decimal(input.budgetExpectation) : null;
    if (input.currency !== undefined) data.currency = input.currency;

    if (input.ownerId !== undefined) {
      const ownerUser = await prisma.user.findUnique({
        where: { id: input.ownerId },
        select: { id: true, organizationId: true },
      });
      if (!ownerUser || ownerUser.organizationId !== existing.organizationId) {
        return { success: false, error: "Selected Owner does not belong to your organization" };
      }
      data.Owner = { connect: { id: input.ownerId } };
    }

    if (input.contactId !== undefined) {
      if (input.contactId) data.Contact = { connect: { id: input.contactId } };
      else data.Contact = { disconnect: true };
    }

    const updated = await prisma.requirement.update({
      where: { id },
      data,
    });

    await logItemUpdated("Requirement", updated.id, updated.title);
    await revalidateBothPaths(`/dashboard/crm/requirements/${id}`);
    await revalidateBothPaths("/dashboard/crm/requirements");

    return { success: true, requirement: updated };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to update requirement";
    console.error("updateRequirement error:", error);
    return { success: false, error: msg };
  }
}

/**
 * Mark Requirement READY_FOR_ESTIMATION with validation
 */
export async function markReadyForEstimation(id: string) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const requirement = await prisma.requirement.findUnique({
      where: { id },
      include: {
        Items: { where: { isTrash: false } },
        Clarifications: { where: { status: "OPEN" } },
      },
    });

    if (!requirement) return { success: false, error: "Requirement not found" };

// @ts-expect-error - Legacy compatibility
    await verifyTenantAccess(requirement.organizationId);
    await verifyServerPermission(session.user.id, "crm.requirements", "ready-for-estimation");

    if (requirement.isTrash) {
      return { success: false, error: "Cannot mark trashed requirement package as ready for estimation." };
    }

    if (requirement.status === RequirementStatus.CANCELLED) {
      return { success: false, error: "Cannot mark cancelled requirement package as ready for estimation." };
    }

    // Validation 1: At least 1 requirement item must exist
    if (requirement.Items.length === 0) {
      return {
        success: false,
        error: "Cannot mark ready for estimation: Requirement must have at least one requirement item.",
      };
    }

    // Validation 2: No critical OPEN clarifications
    if (requirement.Clarifications.length > 0) {
      return {
        success: false,
        error: `Cannot mark ready for estimation: ${requirement.Clarifications.length} unresolved open clarification(s) remaining.`,
      };
    }

    const updated = await prisma.requirement.update({
      where: { id },
      data: {
        status: RequirementStatus.READY_FOR_ESTIMATION,
        readyForEstimationAt: new Date(),
        readyForEstimationById: session.user.id,
      },
    });

    await logItemUpdated("Requirement", updated.id, `Status: READY_FOR_ESTIMATION`);
    await revalidateBothPaths(`/dashboard/crm/requirements/${id}`);
    await revalidateBothPaths("/dashboard/crm/requirements");

    return { success: true, requirement: updated };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to mark ready for estimation";
    console.error("markReadyForEstimation error:", error);
    return { success: false, error: msg };
  }
}

/**
 * Requirement Section CRUD
 */
export async function addRequirementSection(input: {
  requirementId: string;
  title: string;
  description?: string;
  sortOrder?: number;
}) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const req = await prisma.requirement.findUnique({ where: { id: input.requirementId } });
    if (!req) return { success: false, error: "Requirement not found" };

// @ts-expect-error - Legacy compatibility
    await verifyTenantAccess(req.organizationId);
    await verifyServerPermission(session.user.id, "crm.requirements", "edit");

    if (req.isTrash) return { success: false, error: "Cannot add section to trashed requirement." };

    const section = await prisma.requirementSection.create({
      data: {
        organizationId: req.organizationId,
        requirementId: req.id,
        title: input.title,
        description: input.description || null,
        sortOrder: input.sortOrder || 0,
      },
    });

    await revalidateBothPaths(`/dashboard/crm/requirements/${req.id}`);
    return { success: true, section };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to add section";
    console.error("addRequirementSection error:", error);
    return { success: false, error: msg };
  }
}

export async function updateRequirementSection(
  sectionId: string,
  input: { title?: string; description?: string; sortOrder?: number }
) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const section = await prisma.requirementSection.findUnique({
      where: { id: sectionId },
      include: { Requirement: { select: { isTrash: true } } },
    });
    if (!section) return { success: false, error: "Section not found" };

// @ts-expect-error - Legacy compatibility
    await verifyTenantAccess(section.organizationId);
    await verifyServerPermission(session.user.id, "crm.requirements", "edit");

    if (section.Requirement.isTrash) return { success: false, error: "Cannot update section in trashed requirement." };

    const updated = await prisma.requirementSection.update({
      where: { id: sectionId },
      data: {
        ...(input.title !== undefined && { title: input.title }),
        ...(input.description !== undefined && { description: input.description }),
        ...(input.sortOrder !== undefined && { sortOrder: input.sortOrder }),
      },
    });

    await revalidateBothPaths(`/dashboard/crm/requirements/${section.requirementId}`);
    return { success: true, section: updated };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to update section";
    console.error("updateRequirementSection error:", error);
    return { success: false, error: msg };
  }
}

export async function removeRequirementSection(sectionId: string) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const section = await prisma.requirementSection.findUnique({ where: { id: sectionId } });
    if (!section) return { success: false, error: "Section not found" };

// @ts-expect-error - Legacy compatibility
    await verifyTenantAccess(section.organizationId);
    await verifyServerPermission(session.user.id, "crm.requirements", "edit");

    await prisma.requirementSection.delete({ where: { id: sectionId } });

    await revalidateBothPaths(`/dashboard/crm/requirements/${section.requirementId}`);
    return { success: true };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to remove section";
    console.error("removeRequirementSection error:", error);
    return { success: false, error: msg };
  }
}

/**
 * Requirement Item CRUD
 */
export async function addRequirementItem(input: {
  requirementId: string;
  sectionId?: string;
  title: string;
  description?: string;
  type?: RequirementItemType;
  priority?: RequirementPriority;
  acceptanceCriteria?: string;
  clientNotes?: string;
  internalNotes?: string;
  sortOrder?: number;
}) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const req = await prisma.requirement.findUnique({ where: { id: input.requirementId } });
    if (!req) return { success: false, error: "Requirement not found" };

// @ts-expect-error - Legacy compatibility
    await verifyTenantAccess(req.organizationId);
    await verifyServerPermission(session.user.id, "crm.requirements", "edit");

    if (req.isTrash) return { success: false, error: "Cannot add item to trashed requirement." };

    if (input.sectionId) {
      const section = await prisma.requirementSection.findUnique({ where: { id: input.sectionId } });
      if (!section || section.requirementId !== req.id || section.organizationId !== req.organizationId) {
        return { success: false, error: "Section does not belong to this requirement or organization" };
      }
    }

    const item = await prisma.requirementItem.create({
      data: {
        organizationId: req.organizationId,
        requirementId: req.id,
        sectionId: input.sectionId || null,
        title: input.title,
        description: input.description || null,
        type: input.type || RequirementItemType.FEATURE,
        priority: input.priority || RequirementPriority.MEDIUM,
        acceptanceCriteria: input.acceptanceCriteria || null,
        clientNotes: input.clientNotes || null,
        internalNotes: input.internalNotes || null,
        sortOrder: input.sortOrder || 0,
      },
    });

    await revalidateBothPaths(`/dashboard/crm/requirements/${req.id}`);
    return { success: true, item };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to add requirement item";
    console.error("addRequirementItem error:", error);
    return { success: false, error: msg };
  }
}

export async function updateRequirementItem(
  itemId: string,
  input: {
    sectionId?: string | null;
    title?: string;
    description?: string;
    type?: RequirementItemType;
    priority?: RequirementPriority;
    acceptanceCriteria?: string;
    clientNotes?: string;
    internalNotes?: string;
    sortOrder?: number;
  }
) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const item = await prisma.requirementItem.findUnique({
      where: { id: itemId },
      include: { Requirement: { select: { isTrash: true } } },
    });
    if (!item) return { success: false, error: "Requirement item not found" };

// @ts-expect-error - Legacy compatibility
    await verifyTenantAccess(item.organizationId);
    await verifyServerPermission(session.user.id, "crm.requirements", "edit");

    if (item.Requirement.isTrash) return { success: false, error: "Cannot update item in trashed requirement." };

    if (input.sectionId) {
      const section = await prisma.requirementSection.findUnique({ where: { id: input.sectionId } });
      if (!section || section.requirementId !== item.requirementId || section.organizationId !== item.organizationId) {
        return { success: false, error: "Section does not belong to this requirement or organization" };
      }
    }

    const updated = await prisma.requirementItem.update({
      where: { id: itemId },
      data: {
        ...(input.title !== undefined && { title: input.title }),
        ...(input.description !== undefined && { description: input.description }),
        ...(input.type !== undefined && { type: input.type }),
        ...(input.priority !== undefined && { priority: input.priority }),
        ...(input.acceptanceCriteria !== undefined && { acceptanceCriteria: input.acceptanceCriteria }),
        ...(input.clientNotes !== undefined && { clientNotes: input.clientNotes }),
        ...(input.internalNotes !== undefined && { internalNotes: input.internalNotes }),
        ...(input.sortOrder !== undefined && { sortOrder: input.sortOrder }),
        ...(input.sectionId !== undefined && { sectionId: input.sectionId }),
      },
    });

    await revalidateBothPaths(`/dashboard/crm/requirements/${item.requirementId}`);
    return { success: true, item: updated };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to update requirement item";
    console.error("updateRequirementItem error:", error);
    return { success: false, error: msg };
  }
}

export async function removeRequirementItem(itemId: string) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const item = await prisma.requirementItem.findUnique({ where: { id: itemId } });
    if (!item) return { success: false, error: "Requirement item not found" };

// @ts-expect-error - Legacy compatibility
    await verifyTenantAccess(item.organizationId);
    await verifyServerPermission(session.user.id, "crm.requirements", "edit");

    await prisma.requirementItem.update({
      where: { id: itemId },
      data: { isTrash: true },
    });

    await revalidateBothPaths(`/dashboard/crm/requirements/${item.requirementId}`);
    return { success: true };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to remove requirement item";
    console.error("removeRequirementItem error:", error);
    return { success: false, error: msg };
  }
}

/**
 * Requirement Clarification Q&A
 */
export async function addRequirementClarification(input: {
  requirementId: string;
  question: string;
}) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const req = await prisma.requirement.findUnique({ where: { id: input.requirementId } });
    if (!req) return { success: false, error: "Requirement not found" };

// @ts-expect-error - Legacy compatibility
    await verifyTenantAccess(req.organizationId);
    await verifyServerPermission(session.user.id, "crm.requirements", "edit");

    if (req.isTrash) return { success: false, error: "Cannot add clarification to trashed requirement." };

    const clarification = await prisma.requirementClarification.create({
      data: {
        organizationId: req.organizationId,
        requirementId: req.id,
        question: input.question,
        status: ClarificationStatus.OPEN,
        askedById: session.user.id,
      },
    });

    await revalidateBothPaths(`/dashboard/crm/requirements/${req.id}`);
    return { success: true, clarification };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to add clarification";
    console.error("addRequirementClarification error:", error);
    return { success: false, error: msg };
  }
}

export async function answerRequirementClarification(input: {
  clarificationId: string;
  answer: string;
  status?: ClarificationStatus;
}) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const clar = await prisma.requirementClarification.findUnique({
      where: { id: input.clarificationId },
      include: { Requirement: { select: { isTrash: true } } },
    });
    if (!clar) return { success: false, error: "Clarification question not found" };

// @ts-expect-error - Legacy compatibility
    await verifyTenantAccess(clar.organizationId);
    await verifyServerPermission(session.user.id, "crm.requirements", "edit");

    if (clar.Requirement.isTrash) return { success: false, error: "Cannot answer clarification in trashed requirement." };

    const updated = await prisma.requirementClarification.update({
      where: { id: input.clarificationId },
      data: {
        answer: input.answer,
        status: input.status || ClarificationStatus.ANSWERED,
        answeredById: session.user.id,
        answeredAt: new Date(),
      },
    });

    await revalidateBothPaths(`/dashboard/crm/requirements/${clar.requirementId}`);
    return { success: true, clarification: updated };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to answer clarification";
    console.error("answerRequirementClarification error:", error);
    return { success: false, error: msg };
  }
}

/**
 * Move Requirement to Trash
 */
export async function deleteRequirement(id: string) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const existing = await prisma.requirement.findUnique({ where: { id } });
    if (!existing) return { success: false, error: "Requirement not found" };

// @ts-expect-error - Legacy compatibility
    await verifyTenantAccess(existing.organizationId);
    await verifyServerPermission(session.user.id, "crm.requirements", "move-to-trash");

    await prisma.requirement.update({
      where: { id },
      data: { isTrash: true },
    });

    await logItemUpdated("Requirement", id, "Moved to Trash");
    await revalidateBothPaths("/dashboard/crm/requirements");

    return { success: true };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to delete requirement";
    console.error("deleteRequirement error:", error);
    return { success: false, error: msg };
  }
}
