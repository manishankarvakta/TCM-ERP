"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getTenantContext, verifyTenantAccess } from "@/lib/tenant-context";
import { verifyServerPermission, checkPermission } from "@/lib/permissions";
import { getNextSequenceNumber } from "@/lib/sequence";
import { logItemCreated, logItemUpdated } from "@/lib/user-log";
import { revalidateBothPaths } from "@/lib/route-utils-server";
import { toDecimal, roundMoney } from "@/lib/financial-decimal";
import { AgreementStatus, AgreementType, AcceptanceMethod, Prisma } from "@prisma/client";

/**
 * Get paginated list of Agreements
 */
export async function getAgreements(
  page: number = 1,
  limit: number = 10,
  search: string = "",
  status: string = "all",
  quotationId?: string,
  clientId?: string
) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized", agreements: [], total: 0 };

    const { organizationId } = await getTenantContext();

    const canView = await checkPermission(session.user.id, "crm.agreements", "view");
    if (!canView) {
      return { success: false, error: "Permission Denied: crm.agreements.view", agreements: [], total: 0 };
    }

    const skip = (page - 1) * limit;
    const where: Prisma.AgreementWhereInput = {
      organizationId,
      isTrash: false,
    };

    if (quotationId) where.quotationId = quotationId;
    if (clientId) where.clientId = clientId;

    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { agreementNumber: { contains: search, mode: "insensitive" } },
      ];
    }

    if (status && status !== "all") {
      where.status = status as AgreementStatus;
    }

    const [agreements, total] = await Promise.all([
      prisma.agreement.findMany({
        where,
        skip,
        take: limit,
        orderBy: { updatedAt: "desc" },
        include: {
          Quotation: { select: { id: true, quotationNumber: true, grandTotal: true, currency: true, status: true } },
          Client: { select: { id: true, name: true, company: true, clientCode: true } },
          PreparedBy: { select: { id: true, name: true, email: true } },
          _count: {
            select: {
              Sections: true,
              PaymentSchedules: true,
              SnapshotItems: true,
            },
          },
        },
      }),
      prisma.agreement.count({ where }),
    ]);

    return {
      success: true,
      agreements,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
    };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to fetch agreements";
    console.error("getAgreements error:", error);
    return { success: false, error: msg, agreements: [], total: 0 };
  }
}

/**
 * Get detailed Agreement by ID
 */
export async function getAgreement(id: string) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized", agreement: null };

    const agreement = await prisma.agreement.findUnique({
      where: { id },
      include: {
        Quotation: {
          select: {
            id: true,
            quotationNumber: true,
            subject: true,
            grandTotal: true,
            currency: true,
            status: true,
            date: true,
          },
        },
        Opportunity: { select: { id: true, title: true, opportunityNumber: true } },
        Requirement: { select: { id: true, title: true, requirementNumber: true } },
        Estimation: { select: { id: true, estimationNumber: true, title: true, version: true } },
        Client: { select: { id: true, name: true, company: true, clientCode: true, email: true, phone: true } },
        Contact: { select: { id: true, firstName: true, lastName: true, email: true, phone: true, role: true } },
        PreparedBy: { select: { id: true, name: true, email: true } },
        ReviewedBy: { select: { id: true, name: true, email: true } },
        ApprovedBy: { select: { id: true, name: true, email: true } },
        SignedFile: { select: { id: true, name: true, path: true, size: true, mimeType: true } },
        Sections: { orderBy: { sortOrder: "asc" } },
        PaymentSchedules: { orderBy: { sortOrder: "asc" } },
        SnapshotItems: { orderBy: { sortOrder: "asc" } },
        Revisions: {
          select: { id: true, agreementNumber: true, version: true, status: true, contractValue: true, createdAt: true },
          orderBy: { version: "asc" },
        },
      },
    });

    if (!agreement) return { success: false, error: "Agreement not found", agreement: null };

// @ts-expect-error - Legacy compatibility
    await verifyTenantAccess(agreement.organizationId);

    const canView = await checkPermission(session.user.id, "crm.agreements", "view");
    if (!canView) {
      return { success: false, error: "Permission Denied: crm.agreements.view", agreement: null };
    }

    return { success: true, agreement };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to fetch agreement";
    console.error("getAgreement error:", error);
    return { success: false, error: msg, agreement: null };
  }
}

/**
 * Create Agreement from Accepted / Approved Commercial Quotation with Immutable Commercial Snapshot
 */
export async function createAgreementFromQuotation(quotationId: string, title?: string, agreementType?: AgreementType) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const { organizationId } = await getTenantContext();
    await verifyServerPermission(session.user.id, "crm.agreements", "create");

    // Fetch Quotation with items and sections
    const quotation = await prisma.quotation.findUnique({
      where: { id: quotationId },
      include: {
        Section: {
          include: {
            QuotationItem: true,
          },
        },
        Opportunity: {
          select: {
            id: true,
            clientId: true,
            contactId: true,
            Requirement: { select: { id: true, Estimations: { select: { id: true }, orderBy: { updatedAt: "desc" }, take: 1 } } },
          },
        },
        Client: { select: { id: true } },
      },
    });

    if (!quotation) return { success: false, error: "Quotation not found" };

// @ts-expect-error - Legacy compatibility
    await verifyTenantAccess(quotation.organizationId);

    if (quotation.isTrash) return { success: false, error: "Cannot create agreement from trashed quotation." };

    if (quotation.status !== "ACCEPTED" && quotation.status !== "APPROVED" && quotation.status !== "SENT") {
      return {
        success: false,
        error: `Cannot create agreement: Quotation status is '${quotation.status}'. Must be 'ACCEPTED' or 'APPROVED'.`,
      };
    }

    // Atomic Business Sequence Number
    const agreementNumber = await getNextSequenceNumber(organizationId, "AGREEMENT", "AGR");

    // Versioning calculation
    const existingCount = await prisma.agreement.count({
      where: { organizationId, quotationId: quotation.id },
    });
    const version = existingCount + 1;

    // Derived parent references
    const opportunityId = quotation.opportunityId || null;
    const requirementId = quotation.Opportunity?.Requirement?.[0]?.id || null;
    const estimationId = quotation.Opportunity?.Requirement?.[0]?.Estimations?.[0]?.id || null;
    const contactId = quotation.Opportunity?.contactId || null;

    // Server-Authoritative Contract Value calculation from Quotation
    const contractValue = roundMoney(toDecimal(quotation.grandTotal || quotation.total || 0));

    // Construct Immutable Commercial Snapshot JSON
    const itemsSnapshot: Array<{ code: string | null; description: string; quantity: string; unitPrice: string; amount: string }> = [];
    if (quotation.Section && quotation.Section.length > 0) {
      for (const sec of quotation.Section) {
        if (sec.QuotationItem) {
          for (const item of sec.QuotationItem) {
            itemsSnapshot.push({
              code: item.code || null,
              description: item.description || "Service Item",
              quantity: item.quantity ? item.quantity.toString() : "1.00",
              unitPrice: item.unitPrice ? item.unitPrice.toString() : "0.00",
              amount: item.amount ? item.amount.toString() : "0.00",
            });
          }
        }
      }
    }

    const commercialSnapshotJson = {
      quotationId: quotation.id,
      quotationNumber: quotation.quotationNumber,
      subject: quotation.subject,
      currency: quotation.currency || "TK",
      subtotal: quotation.total ? quotation.total.toString() : contractValue.toString(),
      discount: quotation.discount ? quotation.discount.toString() : "0.00",
      grandTotal: contractValue.toString(),
      items: itemsSnapshot,
      snapshotAt: new Date().toISOString(),
    };

    const agreement = await prisma.agreement.create({
      data: {
        organizationId,
        agreementNumber,
        quotationId: quotation.id,
        opportunityId,
        requirementId,
        estimationId,
        clientId: quotation.clientId,
        contactId,
        title: title || `Service Agreement - ${quotation.quotationNumber}`,
        agreementType: agreementType || AgreementType.PROJECT,
        version,
        status: AgreementStatus.DRAFT,
        currency: quotation.currency || "TK",
        contractValue,
        preparedById: session.user.id,
        scopeSummary: quotation.subject || null,
        paymentTerms: "50% Advance upon signing, 50% upon final delivery/handover.",
        commercialSnapshotJson: commercialSnapshotJson as unknown as Prisma.InputJsonValue,
      },
    });

    // Populate relational AgreementSnapshotItem rows for relational auditing
    if (itemsSnapshot.length > 0) {
      await prisma.agreementSnapshotItem.createMany({
        data: itemsSnapshot.map((item, idx) => ({
          organizationId,
          agreementId: agreement.id,
          code: item.code,
          description: item.description,
          quantity: toDecimal(item.quantity),
          unitPrice: toDecimal(item.unitPrice),
          amount: toDecimal(item.amount),
          sortOrder: idx + 1,
        })),
      });
    }

    await logItemCreated("Agreement", agreement.id, agreement.title);
    await revalidateBothPaths("/dashboard/crm/agreements");
    await revalidateBothPaths(`/dashboard/crm/quotations/${quotation.id}`);

    return { success: true, agreementId: agreement.id, agreementNumber };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to create agreement";
    console.error("createAgreementFromQuotation error:", error);
    return { success: false, error: msg };
  }
}

/**
 * Update Agreement metadata and terms
 */
export async function updateAgreement(
  id: string,
  input: {
    title?: string;
    agreementType?: AgreementType;
    contactId?: string | null;
    effectiveDate?: Date | null;
    startDate?: Date | null;
    endDate?: Date | null;
    paymentTerms?: string;
    deliveryTerms?: string;
    clientResponsibilities?: string;
    companyResponsibilities?: string;
    terminationTerms?: string;
    renewalTerms?: string;
    scopeSummary?: string;
    specialConditions?: string;
    internalNotes?: string;
    status?: AgreementStatus;
  }
) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const existing = await prisma.agreement.findUnique({ where: { id } });
    if (!existing) return { success: false, error: "Agreement not found" };

// @ts-expect-error - Legacy compatibility
    await verifyTenantAccess(existing.organizationId);
    await verifyServerPermission(session.user.id, "crm.agreements", "edit");

    if (existing.isTrash) return { success: false, error: "Cannot modify a trashed agreement." };
    if (
      existing.status === AgreementStatus.SIGNED ||
      existing.status === AgreementStatus.ACTIVE ||
      existing.status === AgreementStatus.TERMINATED
    ) {
      return { success: false, error: "Signed, Active, or Terminated agreement is read-only. Create an amendment/revision." };
    }

    // Contact-to-Client consistency validation
    if (input.contactId) {
      const contact = await prisma.contact.findUnique({ where: { id: input.contactId } });
      if (!contact || contact.organizationId !== existing.organizationId || contact.clientId !== existing.clientId) {
        return { success: false, error: "Selected contact does not belong to the agreement client or organization." };
      }
    }

    // Generic status bypass prevention
// @ts-expect-error - Legacy compatibility
    if (input.status === AgreementStatus.APPROVED) {
      return { success: false, error: "Bypass Rejected: Transition to APPROVED requires approveAgreement()." };
    }
    if (input.status === AgreementStatus.ACCEPTED) {
      return { success: false, error: "Bypass Rejected: Transition to ACCEPTED requires recordClientAcceptance()." };
    }
    if (input.status === AgreementStatus.SIGNED) {
      return { success: false, error: "Bypass Rejected: Transition to SIGNED requires markAgreementSigned()." };
    }
    if (input.status === AgreementStatus.ACTIVE) {
      return { success: false, error: "Bypass Rejected: Transition to ACTIVE requires activateAgreement()." };
    }

    // Date Validation
    if (input.startDate && input.endDate && input.endDate < input.startDate) {
      return { success: false, error: "End date cannot precede start date." };
    }

    const data: Prisma.AgreementUpdateInput = {};
    if (input.title !== undefined) data.title = input.title;
    if (input.agreementType !== undefined) data.agreementType = input.agreementType;
// @ts-expect-error - Legacy compatibility
    if (input.contactId !== undefined) data.contactId = input.contactId;
    if (input.effectiveDate !== undefined) data.effectiveDate = input.effectiveDate;
    if (input.startDate !== undefined) data.startDate = input.startDate;
    if (input.endDate !== undefined) data.endDate = input.endDate;
    if (input.paymentTerms !== undefined) data.paymentTerms = input.paymentTerms;
    if (input.deliveryTerms !== undefined) data.deliveryTerms = input.deliveryTerms;
    if (input.clientResponsibilities !== undefined) data.clientResponsibilities = input.clientResponsibilities;
    if (input.companyResponsibilities !== undefined) data.companyResponsibilities = input.companyResponsibilities;
    if (input.terminationTerms !== undefined) data.terminationTerms = input.terminationTerms;
    if (input.renewalTerms !== undefined) data.renewalTerms = input.renewalTerms;
    if (input.scopeSummary !== undefined) data.scopeSummary = input.scopeSummary;
    if (input.specialConditions !== undefined) data.specialConditions = input.specialConditions;
    if (input.internalNotes !== undefined) data.internalNotes = input.internalNotes;
    if (input.status !== undefined) data.status = input.status;

    const updated = await prisma.agreement.update({
      where: { id },
      data,
    });

    await logItemUpdated("Agreement", updated.id, updated.title);
    await revalidateBothPaths(`/dashboard/crm/agreements/${id}`);
    await revalidateBothPaths("/dashboard/crm/agreements");

    return { success: true, agreement: updated };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to update agreement";
    console.error("updateAgreement error:", error);
    return { success: false, error: msg };
  }
}

/**
 * Approve Agreement (Dedicated Action)
 */
export async function approveAgreement(id: string) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const agreement = await prisma.agreement.findUnique({ where: { id } });
    if (!agreement) return { success: false, error: "Agreement not found" };

// @ts-expect-error - Legacy compatibility
    await verifyTenantAccess(agreement.organizationId);
    await verifyServerPermission(session.user.id, "crm.agreements", "approve");

    if (agreement.isTrash) return { success: false, error: "Cannot approve trashed agreement." };

    const updated = await prisma.agreement.update({
      where: { id },
      data: {
        status: AgreementStatus.READY_FOR_CLIENT,
        approvedById: session.user.id,
      },
    });

    await logItemUpdated("Agreement", updated.id, "Status: READY_FOR_CLIENT (Approved Internally)");
    await revalidateBothPaths(`/dashboard/crm/agreements/${id}`);
    await revalidateBothPaths("/dashboard/crm/agreements");

    return { success: true, agreement: updated };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to approve agreement";
    console.error("approveAgreement error:", error);
    return { success: false, error: msg };
  }
}

/**
 * Record Client Acceptance (Dedicated Action)
 */
export async function recordClientAcceptance(input: {
  id: string;
  acceptedByName: string;
  acceptedByContactId?: string;
  acceptanceMethod: AcceptanceMethod;
  acceptanceReference?: string;
}) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const agreement = await prisma.agreement.findUnique({ where: { id: input.id } });
    if (!agreement) return { success: false, error: "Agreement not found" };

// @ts-expect-error - Legacy compatibility
    await verifyTenantAccess(agreement.organizationId);
    await verifyServerPermission(session.user.id, "crm.agreements", "acceptance");

    if (agreement.isTrash) return { success: false, error: "Cannot record acceptance on trashed agreement." };

    if (input.acceptedByContactId) {
      const contact = await prisma.contact.findUnique({ where: { id: input.acceptedByContactId } });
      if (!contact || contact.organizationId !== agreement.organizationId || contact.clientId !== agreement.clientId) {
        return { success: false, error: "Accepted by contact does not belong to the agreement client." };
      }
    }

    const updated = await prisma.agreement.update({
      where: { id: input.id },
      data: {
        status: AgreementStatus.ACCEPTED,
        acceptedByName: input.acceptedByName,
        acceptedByContactId: input.acceptedByContactId || null,
        acceptanceMethod: input.acceptanceMethod,
        acceptanceReference: input.acceptanceReference || null,
        acceptedAt: new Date(),
      },
    });

    await logItemUpdated("Agreement", updated.id, `Accepted by Client: ${input.acceptedByName}`);
    await revalidateBothPaths(`/dashboard/crm/agreements/${input.id}`);
    await revalidateBothPaths("/dashboard/crm/agreements");

    return { success: true, agreement: updated };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to record client acceptance";
    console.error("recordClientAcceptance error:", error);
    return { success: false, error: msg };
  }
}

/**
 * Mark Agreement Signed (Dedicated Action)
 */
export async function markAgreementSigned(id: string, signedFileId?: string) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const agreement = await prisma.agreement.findUnique({ where: { id } });
    if (!agreement) return { success: false, error: "Agreement not found" };

// @ts-expect-error - Legacy compatibility
    await verifyTenantAccess(agreement.organizationId);
    await verifyServerPermission(session.user.id, "crm.agreements", "sign");

    if (agreement.isTrash) return { success: false, error: "Cannot sign trashed agreement." };

    if (signedFileId) {
      const file = await prisma.file.findUnique({ where: { id: signedFileId } });
      if (!file || file.organizationId !== agreement.organizationId) {
        return { success: false, error: "Signed file not found or organization mismatch." };
      }
    }

    const now = new Date();
    const updated = await prisma.agreement.update({
      where: { id },
      data: {
        status: AgreementStatus.SIGNED,
        signedAt: now,
        signedDate: now,
        signedFileId: signedFileId || agreement.signedFileId,
      },
    });

    await logItemUpdated("Agreement", updated.id, "Status: SIGNED (Contract Executed)");
    await revalidateBothPaths(`/dashboard/crm/agreements/${id}`);
    await revalidateBothPaths("/dashboard/crm/agreements");

    return { success: true, agreement: updated };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to mark agreement signed";
    console.error("markAgreementSigned error:", error);
    return { success: false, error: msg };
  }
}

/**
 * Activate Agreement (Dedicated Action)
 */
export async function activateAgreement(id: string) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const agreement = await prisma.agreement.findUnique({ where: { id } });
    if (!agreement) return { success: false, error: "Agreement not found" };

// @ts-expect-error - Legacy compatibility
    await verifyTenantAccess(agreement.organizationId);
    await verifyServerPermission(session.user.id, "crm.agreements", "activate");

    if (agreement.isTrash) return { success: false, error: "Cannot activate trashed agreement." };
    if (agreement.status === AgreementStatus.CANCELLED || agreement.status === AgreementStatus.TERMINATED) {
      return { success: false, error: "Cannot activate a cancelled or terminated agreement." };
    }

    if (agreement.status !== AgreementStatus.SIGNED && agreement.status !== AgreementStatus.ACCEPTED) {
      return { success: false, error: "Agreement must be SIGNED or ACCEPTED before activation." };
    }

    const now = new Date();
    const updated = await prisma.agreement.update({
      where: { id },
      data: {
        status: AgreementStatus.ACTIVE,
        effectiveDate: agreement.effectiveDate || now,
        readyForServiceSaleAt: now,
        readyForServiceSaleById: session.user.id,
      },
    });

    await logItemUpdated("Agreement", updated.id, "Status: ACTIVE (Commercially Effective)");
    await revalidateBothPaths(`/dashboard/crm/agreements/${id}`);
    await revalidateBothPaths("/dashboard/crm/agreements");

    return { success: true, agreement: updated };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to activate agreement";
    console.error("activateAgreement error:", error);
    return { success: false, error: msg };
  }
}

/**
 * Create Agreement Amendment / Revision (Concurrency-Safe with Row Locking Transaction)
 */
export async function createAgreementRevision(id: string) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const existing = await prisma.agreement.findUnique({ where: { id } });
    if (!existing) return { success: false, error: "Agreement not found" };

// @ts-expect-error - Legacy compatibility
    await verifyTenantAccess(existing.organizationId);
    await verifyServerPermission(session.user.id, "crm.agreements", "create");

    // PostgreSQL Row Locking transaction to prevent race conditions during concurrent revision creation
    const result = await prisma.$transaction(async (tx) => {
      // Lock all agreements in this quotation lineage using raw query
      await tx.$executeRawUnsafe(
        `SELECT id FROM "Agreement" WHERE "organizationId" = '${existing.organizationId}' AND "quotationId" = '${existing.quotationId}' FOR UPDATE;`
      );

      const versionCount = await tx.agreement.count({
        where: { organizationId: existing.organizationId, quotationId: existing.quotationId },
      });
      const newVersion = versionCount + 1;
      const agreementNumber = `${existing.agreementNumber}-V${newVersion}`;

      const newRevision = await tx.agreement.create({
        data: {
          organizationId: existing.organizationId,
          agreementNumber,
          quotationId: existing.quotationId,
          opportunityId: existing.opportunityId,
          requirementId: existing.requirementId,
          estimationId: existing.estimationId,
          clientId: existing.clientId,
          contactId: existing.contactId,
          title: `${existing.title} (Rev ${newVersion})`,
          agreementType: existing.agreementType,
          version: newVersion,
          status: AgreementStatus.DRAFT,
          currency: existing.currency,
          contractValue: existing.contractValue,
          paymentTerms: existing.paymentTerms,
          deliveryTerms: existing.deliveryTerms,
          scopeSummary: existing.scopeSummary,
          commercialSnapshotJson: existing.commercialSnapshotJson || undefined,
          preparedById: session.user.id,
          parentAgreementId: existing.id,
        },
      });

      if (existing.status === AgreementStatus.ACTIVE) {
        await tx.agreement.update({
          where: { id: existing.id },
          data: { status: AgreementStatus.SUPERSEDED },
        });
      }

      return newRevision;
    }, {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });

    await logItemCreated("AgreementRevision", result.id, result.title);
    await revalidateBothPaths(`/dashboard/crm/agreements/${id}`);
    await revalidateBothPaths("/dashboard/crm/agreements");

    return { success: true, agreementId: result.id, version: result.version };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to create agreement revision";
    console.error("createAgreementRevision error:", error);
    return { success: false, error: msg };
  }
}

/**
 * Add Clause Section to Agreement
 */
export async function addAgreementSection(input: {
  agreementId: string;
  title: string;
  content?: string;
  sortOrder?: number;
}) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const agreement = await prisma.agreement.findUnique({ where: { id: input.agreementId } });
    if (!agreement) return { success: false, error: "Agreement not found" };

// @ts-expect-error - Legacy compatibility
    await verifyTenantAccess(agreement.organizationId);
    await verifyServerPermission(session.user.id, "crm.agreements", "edit");

    if (agreement.isTrash || agreement.status === AgreementStatus.SIGNED || agreement.status === AgreementStatus.ACTIVE) {
      return { success: false, error: "Signed or Active agreement sections cannot be edited." };
    }

    const section = await prisma.agreementSection.create({
      data: {
        organizationId: agreement.organizationId,
        agreementId: agreement.id,
        title: input.title,
        content: input.content || null,
        sortOrder: input.sortOrder || 0,
      },
    });

    await revalidateBothPaths(`/dashboard/crm/agreements/${agreement.id}`);
    return { success: true, section };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to add section";
    console.error("addAgreementSection error:", error);
    return { success: false, error: msg };
  }
}

/**
 * Add Payment Schedule Milestone to Agreement
 */
export async function addAgreementPaymentSchedule(input: {
  agreementId: string;
  label: string;
  percentage?: number;
  amount: number;
  dueTriggerDescription?: string;
  sortOrder?: number;
}) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const agreement = await prisma.agreement.findUnique({ where: { id: input.agreementId } });
    if (!agreement) return { success: false, error: "Agreement not found" };

// @ts-expect-error - Legacy compatibility
    await verifyTenantAccess(agreement.organizationId);
    await verifyServerPermission(session.user.id, "crm.agreements", "edit");

    if (agreement.isTrash || agreement.status === AgreementStatus.SIGNED || agreement.status === AgreementStatus.ACTIVE) {
      return { success: false, error: "Signed or Active agreement payment schedule cannot be edited." };
    }

    if (input.amount < 0) return { success: false, error: "Payment amount cannot be negative." };

    const schedule = await prisma.agreementPaymentSchedule.create({
      data: {
        organizationId: agreement.organizationId,
        agreementId: agreement.id,
        label: input.label,
        percentage: input.percentage ? toDecimal(input.percentage) : null,
        amount: roundMoney(toDecimal(input.amount)),
        dueTriggerDescription: input.dueTriggerDescription || null,
        sortOrder: input.sortOrder || 0,
      },
    });

    await revalidateBothPaths(`/dashboard/crm/agreements/${agreement.id}`);
    return { success: true, schedule };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to add payment schedule";
    console.error("addAgreementPaymentSchedule error:", error);
    return { success: false, error: msg };
  }
}

/**
 * Trash Agreement
 */
export async function deleteAgreement(id: string) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const existing = await prisma.agreement.findUnique({ where: { id } });
    if (!existing) return { success: false, error: "Agreement not found" };

// @ts-expect-error - Legacy compatibility
    await verifyTenantAccess(existing.organizationId);
    await verifyServerPermission(session.user.id, "crm.agreements", "move-to-trash");

    await prisma.agreement.update({
      where: { id },
      data: { isTrash: true },
    });

    await logItemUpdated("Agreement", id, "Moved to Trash");
    await revalidateBothPaths("/dashboard/crm/agreements");

    return { success: true };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to delete agreement";
    console.error("deleteAgreement error:", error);
    return { success: false, error: msg };
  }
}
