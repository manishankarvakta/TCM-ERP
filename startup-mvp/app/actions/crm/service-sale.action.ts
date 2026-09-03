"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getTenantContext, verifyTenantAccess } from "@/lib/tenant-context";
import { verifyServerPermission, checkPermission } from "@/lib/permissions";
import { getNextSequenceNumber } from "@/lib/sequence";
import { logItemCreated, logItemUpdated } from "@/lib/user-log";
import { revalidateBothPaths } from "@/lib/route-utils-server";
import { toDecimal, roundMoney } from "@/lib/financial-decimal";
import { ServiceSaleStatus, FulfillmentStatus, AgreementStatus, AgreementType, Prisma } from "@prisma/client";

const MULTI_ORDER_AGREEMENT_TYPES: AgreementType[] = [
  AgreementType.MASTER_SERVICE,
  AgreementType.RETAINER,
  AgreementType.SUPPORT,
  AgreementType.SUBSCRIPTION,
  AgreementType.MAINTENANCE,
];

/**
 * Get paginated list of Service Sales
 */
export async function getServiceSales(
  page: number = 1,
  limit: number = 10,
  search: string = "",
  status: string = "all",
  agreementId?: string,
  clientId?: string
) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized", serviceSales: [], total: 0 };

    const { organizationId } = await getTenantContext();

    const canView = await checkPermission(session.user.id, "crm.service-sales", "view");
    if (!canView) {
      return { success: false, error: "Permission Denied: crm.service-sales.view", serviceSales: [], total: 0 };
    }

    const skip = (page - 1) * limit;
    const where: Prisma.ServiceSaleWhereInput = {
      organizationId,
      isTrash: false,
    };

    if (agreementId) where.agreementId = agreementId;
    if (clientId) where.clientId = clientId;

    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { serviceSaleNumber: { contains: search, mode: "insensitive" } },
      ];
    }

    if (status && status !== "all") {
      where.status = status as ServiceSaleStatus;
    }

    const [serviceSales, total] = await Promise.all([
      prisma.serviceSale.findMany({
        where,
        skip,
        take: limit,
        orderBy: { updatedAt: "desc" },
        include: {
          Agreement: { select: { id: true, agreementNumber: true, status: true, contractValue: true } },
          Client: { select: { id: true, name: true, company: true, clientCode: true } },
          PreparedBy: { select: { id: true, name: true, email: true } },
          _count: { select: { Items: true } },
        },
      }),
      prisma.serviceSale.count({ where }),
    ]);

    return {
      success: true,
      serviceSales,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
    };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to fetch service sales";
    console.error("getServiceSales error:", error);
    return { success: false, error: msg, serviceSales: [], total: 0 };
  }
}

/**
 * Get detailed Service Sale by ID
 */
export async function getServiceSale(id: string) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized", serviceSale: null };

    const serviceSale = await prisma.serviceSale.findUnique({
      where: { id },
      include: {
        Agreement: {
          select: {
            id: true,
            agreementNumber: true,
            title: true,
            version: true,
            status: true,
            contractValue: true,
            currency: true,
            effectiveDate: true,
          },
        },
        Quotation: { select: { id: true, quotationNumber: true, subject: true, grandTotal: true } },
        Opportunity: { select: { id: true, title: true, opportunityNumber: true } },
        Requirement: { select: { id: true, title: true, requirementNumber: true } },
        Estimation: { select: { id: true, estimationNumber: true, title: true } },
        Client: { select: { id: true, name: true, company: true, clientCode: true, email: true, phone: true } },
        Contact: { select: { id: true, firstName: true, lastName: true, email: true, phone: true, role: true } },
        PreparedBy: { select: { id: true, name: true, email: true } },
        ApprovedBy: { select: { id: true, name: true, email: true } },
        Items: { orderBy: { sortOrder: "asc" } },
      },
    });

    if (!serviceSale) return { success: false, error: "Service Sale not found", serviceSale: null };

// @ts-expect-error - Legacy compatibility
    await verifyTenantAccess(serviceSale.organizationId);

    const canView = await checkPermission(session.user.id, "crm.service-sales", "view");
    if (!canView) {
      return { success: false, error: "Permission Denied: crm.service-sales.view", serviceSale: null };
    }

    return { success: true, serviceSale };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to fetch service sale";
    console.error("getServiceSale error:", error);
    return { success: false, error: msg, serviceSale: null };
  }
}

/**
 * Create Service Sale from ACTIVE Agreement (Hardened with Multiplicity Policy, Multi-Order Idempotency & Concurrency Protection)
 */
export async function createServiceSaleFromAgreement(
  agreementId: string,
  title?: string,
  clientReference?: string
) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const { organizationId } = await getTenantContext();
    await verifyServerPermission(session.user.id, "crm.service-sales", "create");

    // Fetch Agreement with snapshot items and verify status
    const agreement = await prisma.agreement.findUnique({
      where: { id: agreementId },
      include: {
        SnapshotItems: true,
      },
    });

    if (!agreement) return { success: false, error: "Agreement not found" };

// @ts-expect-error - Legacy compatibility
    await verifyTenantAccess(agreement.organizationId);

    if (agreement.isTrash) return { success: false, error: "Cannot create Service Sale from trashed agreement." };
    if (agreement.status !== AgreementStatus.ACTIVE) {
      return {
        success: false,
        error: `Cannot create Service Sale: Agreement status is '${agreement.status}'. Must be 'ACTIVE'.`,
      };
    }

    // Row-locking transaction to handle concurrent creation safely
    const result = await prisma.$transaction(async (tx) => {
      // Lock agreement row in PostgreSQL
      await tx.$executeRawUnsafe(
        `SELECT id FROM "Agreement" WHERE id = '${agreement.id}' FOR UPDATE;`
      );

      // Check Agreement Type Multiplicity Policy
      const isMultiOrderAllowed = MULTI_ORDER_AGREEMENT_TYPES.includes(agreement.agreementType);

      if (!isMultiOrderAllowed) {
        const existingActiveSale = await tx.serviceSale.findFirst({
          where: {
            organizationId,
            agreementId: agreement.id,
            agreementVersionSnapshot: agreement.version,
            isTrash: false,
          },
        });

        if (existingActiveSale) {
          return {
            id: existingActiveSale.id,
            serviceSaleNumber: existingActiveSale.serviceSaleNumber,
            isIdempotent: true,
          };
        }
      } else {
        // Multi-Order Idempotency Protection: Check if a sale with same logical reference exists
        const targetRef = clientReference || title || null;
        if (targetRef) {
          const existingRefSale = await tx.serviceSale.findFirst({
            where: {
              organizationId,
              agreementId: agreement.id,
              agreementVersionSnapshot: agreement.version,
              isTrash: false,
              OR: [
                { clientReference: targetRef },
                { title: targetRef },
              ],
            },
          });

          if (existingRefSale) {
            return {
              id: existingRefSale.id,
              serviceSaleNumber: existingRefSale.serviceSaleNumber,
              isIdempotent: true,
            };
          }
        }
      }

      // Atomic SSO Business Sequence Number
      const serviceSaleNumber = await getNextSequenceNumber(organizationId, "SERVICE_SALE", "SSO");

      const contractValueSnapshot = roundMoney(toDecimal(agreement.contractValue));
      const orderValue = contractValueSnapshot; // Server-authoritative contract value derivation

      const newServiceSale = await tx.serviceSale.create({
        data: {
          organizationId,
          serviceSaleNumber,
          agreementId: agreement.id,
          agreementNumberSnapshot: agreement.agreementNumber,
          agreementVersionSnapshot: agreement.version,
          quotationId: agreement.quotationId,
          opportunityId: agreement.opportunityId,
          requirementId: agreement.requirementId,
          estimationId: agreement.estimationId,
          clientId: agreement.clientId,
          contactId: agreement.contactId,
          title: title || `Commercial Order - ${agreement.agreementNumber}`,
          clientReference: clientReference || undefined,
          currency: agreement.currency || "TK",
          contractValueSnapshot,
          orderValue,
          status: ServiceSaleStatus.DRAFT,
          fulfillmentStatus: FulfillmentStatus.NOT_STARTED,
          scopeSummary: agreement.scopeSummary || null,
          commercialSnapshotJson: agreement.commercialSnapshotJson || undefined,
          preparedById: session.user.id,
        },
      });

      // Snapshot Items into ServiceSaleItem rows
      if (agreement.SnapshotItems && agreement.SnapshotItems.length > 0) {
        await tx.serviceSaleItem.createMany({
          data: agreement.SnapshotItems.map((item, idx) => ({
            organizationId,
            serviceSaleId: newServiceSale.id,
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
        id: newServiceSale.id,
        serviceSaleNumber: newServiceSale.serviceSaleNumber,
        isIdempotent: false,
      };
    });

    await logItemCreated("ServiceSale", result.id, title || `Service Sale ${result.serviceSaleNumber}`);
    await revalidateBothPaths("/dashboard/crm/service-sales");
    await revalidateBothPaths(`/dashboard/crm/agreements/${agreement.id}`);

    return { success: true, serviceSaleId: result.id, serviceSaleNumber: result.serviceSaleNumber, isIdempotent: result.isIdempotent };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to create service sale";
    console.error("createServiceSaleFromAgreement error:", error);
    return { success: false, error: msg };
  }
}

/**
 * Update Service Sale metadata
 */
export async function updateServiceSale(
  id: string,
  input: {
    title?: string;
    contactId?: string | null;
    effectiveDate?: Date | null;
    expectedStartDate?: Date | null;
    expectedCompletionDate?: Date | null;
    clientReference?: string;
    internalReference?: string;
    scopeSummary?: string;
    status?: ServiceSaleStatus;
  }
) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const existing = await prisma.serviceSale.findUnique({ where: { id } });
    if (!existing) return { success: false, error: "Service Sale not found" };

// @ts-expect-error - Legacy compatibility
    await verifyTenantAccess(existing.organizationId);
    await verifyServerPermission(session.user.id, "crm.service-sales", "edit");

    if (existing.isTrash) return { success: false, error: "Cannot modify a trashed service sale." };
    if (existing.status === ServiceSaleStatus.FULFILLED || existing.status === ServiceSaleStatus.CLOSED) {
      return { success: false, error: "Fulfilled or Closed Service Sale is read-only." };
    }

    // Contact-to-Client consistency validation
    if (input.contactId) {
      const contact = await prisma.contact.findUnique({ where: { id: input.contactId } });
      if (!contact || contact.organizationId !== existing.organizationId || contact.clientId !== existing.clientId) {
        return { success: false, error: "Selected contact does not belong to the service sale client." };
      }
    }

    // Generic status bypass prevention
    if (input.status === ServiceSaleStatus.APPROVED) {
      return { success: false, error: "Bypass Rejected: Transition to APPROVED requires approveServiceSale()." };
    }
    if (input.status === ServiceSaleStatus.CONFIRMED) {
      return { success: false, error: "Bypass Rejected: Transition to CONFIRMED requires confirmServiceSale()." };
    }
    if (input.status === ServiceSaleStatus.IN_FULFILLMENT) {
      return { success: false, error: "Bypass Rejected: Transition to IN_FULFILLMENT requires markServiceSaleInFulfillment()." };
    }
    if (input.status === ServiceSaleStatus.FULFILLED) {
      return { success: false, error: "Bypass Rejected: Transition to FULFILLED requires markServiceSaleFulfilled()." };
    }

    const data: Prisma.ServiceSaleUpdateInput = {};
    if (input.title !== undefined) data.title = input.title;
// @ts-expect-error - Legacy compatibility
    if (input.contactId !== undefined) data.contactId = input.contactId;
    if (input.effectiveDate !== undefined) data.effectiveDate = input.effectiveDate;
    if (input.expectedStartDate !== undefined) data.expectedStartDate = input.expectedStartDate;
    if (input.expectedCompletionDate !== undefined) data.expectedCompletionDate = input.expectedCompletionDate;
    if (input.clientReference !== undefined) data.clientReference = input.clientReference;
    if (input.internalReference !== undefined) data.internalReference = input.internalReference;
    if (input.scopeSummary !== undefined) data.scopeSummary = input.scopeSummary;
    if (input.status !== undefined) data.status = input.status;

    const updated = await prisma.serviceSale.update({
      where: { id },
      data,
    });

    await logItemUpdated("ServiceSale", updated.id, updated.title);
    await revalidateBothPaths(`/dashboard/crm/service-sales/${id}`);
    await revalidateBothPaths("/dashboard/crm/service-sales");

    return { success: true, serviceSale: updated };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to update service sale";
    console.error("updateServiceSale error:", error);
    return { success: false, error: msg };
  }
}

/**
 * Approve Service Sale (Dedicated Action)
 */
export async function approveServiceSale(id: string) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const serviceSale = await prisma.serviceSale.findUnique({ where: { id } });
    if (!serviceSale) return { success: false, error: "Service Sale not found" };

// @ts-expect-error - Legacy compatibility
    await verifyTenantAccess(serviceSale.organizationId);
    await verifyServerPermission(session.user.id, "crm.service-sales", "approve");

    if (serviceSale.isTrash) return { success: false, error: "Cannot approve trashed service sale." };

    const updated = await prisma.serviceSale.update({
      where: { id },
      data: {
        status: ServiceSaleStatus.APPROVED,
        approvedById: session.user.id,
      },
    });

    await logItemUpdated("ServiceSale", updated.id, "Status: APPROVED");
    await revalidateBothPaths(`/dashboard/crm/service-sales/${id}`);
    await revalidateBothPaths("/dashboard/crm/service-sales");

    return { success: true, serviceSale: updated };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to approve service sale";
    console.error("approveServiceSale error:", error);
    return { success: false, error: msg };
  }
}

/**
 * Confirm Service Sale (Dedicated Action)
 */
export async function confirmServiceSale(id: string) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const serviceSale = await prisma.serviceSale.findUnique({ where: { id } });
    if (!serviceSale) return { success: false, error: "Service Sale not found" };

// @ts-expect-error - Legacy compatibility
    await verifyTenantAccess(serviceSale.organizationId);
    await verifyServerPermission(session.user.id, "crm.service-sales", "confirm");

    if (serviceSale.isTrash) return { success: false, error: "Cannot confirm trashed service sale." };

    const now = new Date();
    const updated = await prisma.serviceSale.update({
      where: { id },
      data: {
        status: ServiceSaleStatus.CONFIRMED,
        confirmedAt: now,
      },
    });

    await logItemUpdated("ServiceSale", updated.id, "Status: CONFIRMED");
    await revalidateBothPaths(`/dashboard/crm/service-sales/${id}`);
    await revalidateBothPaths("/dashboard/crm/service-sales");

    return { success: true, serviceSale: updated };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to confirm service sale";
    console.error("confirmServiceSale error:", error);
    return { success: false, error: msg };
  }
}

/**
 * Mark Service Sale in Fulfillment (Dedicated Action)
 */
export async function markServiceSaleInFulfillment(id: string) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const serviceSale = await prisma.serviceSale.findUnique({ where: { id } });
    if (!serviceSale) return { success: false, error: "Service Sale not found" };

// @ts-expect-error - Legacy compatibility
    await verifyTenantAccess(serviceSale.organizationId);
    await verifyServerPermission(session.user.id, "crm.service-sales", "fulfillment");

    if (serviceSale.isTrash) return { success: false, error: "Cannot fulfill trashed service sale." };

    const updated = await prisma.serviceSale.update({
      where: { id },
      data: {
        status: ServiceSaleStatus.IN_FULFILLMENT,
        fulfillmentStatus: FulfillmentStatus.IN_PROGRESS,
      },
    });

    await logItemUpdated("ServiceSale", updated.id, "Status: IN_FULFILLMENT");
    await revalidateBothPaths(`/dashboard/crm/service-sales/${id}`);
    await revalidateBothPaths("/dashboard/crm/service-sales");

    return { success: true, serviceSale: updated };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to mark in fulfillment";
    console.error("markServiceSaleInFulfillment error:", error);
    return { success: false, error: msg };
  }
}

/**
 * Mark Service Sale Fulfilled (Dedicated Action)
 */
export async function markServiceSaleFulfilled(id: string) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const serviceSale = await prisma.serviceSale.findUnique({ where: { id } });
    if (!serviceSale) return { success: false, error: "Service Sale not found" };

// @ts-expect-error - Legacy compatibility
    await verifyTenantAccess(serviceSale.organizationId);
    await verifyServerPermission(session.user.id, "crm.service-sales", "fulfillment");

    if (serviceSale.isTrash) return { success: false, error: "Cannot fulfill trashed service sale." };

    const updated = await prisma.serviceSale.update({
      where: { id },
      data: {
        status: ServiceSaleStatus.FULFILLED,
        fulfillmentStatus: FulfillmentStatus.FULLY_FULFILLED,
      },
    });

    await logItemUpdated("ServiceSale", updated.id, "Status: FULFILLED");
    await revalidateBothPaths(`/dashboard/crm/service-sales/${id}`);
    await revalidateBothPaths("/dashboard/crm/service-sales");

    return { success: true, serviceSale: updated };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to mark fulfilled";
    console.error("markServiceSaleFulfilled error:", error);
    return { success: false, error: msg };
  }
}

/**
 * Mark Service Sale Billing Eligible (Dedicated Gate Action with Strict Business Preconditions)
 */
export async function markServiceSaleBillingEligible(id: string) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const serviceSale = await prisma.serviceSale.findUnique({ where: { id } });
    if (!serviceSale) return { success: false, error: "Service Sale not found" };

// @ts-expect-error - Legacy compatibility
    await verifyTenantAccess(serviceSale.organizationId);
    await verifyServerPermission(session.user.id, "crm.service-sales", "billing-eligibility");

    if (serviceSale.isTrash) return { success: false, error: "Cannot mark trashed service sale." };
    if (serviceSale.status === ServiceSaleStatus.CANCELLED || serviceSale.status === ServiceSaleStatus.VOID) {
      return { success: false, error: "Cancelled or Void Service Sale cannot be marked billing eligible." };
    }
    if (
      serviceSale.status !== ServiceSaleStatus.CONFIRMED &&
      serviceSale.status !== ServiceSaleStatus.IN_FULFILLMENT &&
      serviceSale.status !== ServiceSaleStatus.FULFILLED
    ) {
      return {
        success: false,
        error: `Cannot mark billing eligible: Service Sale status '${serviceSale.status}' is not eligible (Must be CONFIRMED, IN_FULFILLMENT, or FULFILLED).`,
      };
    }

    if (!serviceSale.orderValue || Number(serviceSale.orderValue) <= 0) {
      return { success: false, error: "Cannot mark billing eligible: Order value must be greater than zero." };
    }

    const now = new Date();
    const updated = await prisma.serviceSale.update({
      where: { id },
      data: {
        billingEligibleAt: now,
        billingEligibleById: session.user.id,
      },
    });

    await logItemUpdated("ServiceSale", updated.id, "Marked Billing Eligible");
    await revalidateBothPaths(`/dashboard/crm/service-sales/${id}`);
    await revalidateBothPaths("/dashboard/crm/service-sales");

    return { success: true, serviceSale: updated };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to mark billing eligible";
    console.error("markServiceSaleBillingEligible error:", error);
    return { success: false, error: msg };
  }
}

/**
 * Mark Service Sale Handover Ready (Dedicated Gate Action with Strict Business Preconditions)
 */
export async function markServiceSaleHandoverReady(id: string) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const serviceSale = await prisma.serviceSale.findUnique({ where: { id } });
    if (!serviceSale) return { success: false, error: "Service Sale not found" };

// @ts-expect-error - Legacy compatibility
    await verifyTenantAccess(serviceSale.organizationId);
    await verifyServerPermission(session.user.id, "crm.service-sales", "handover-ready");

    if (serviceSale.isTrash) return { success: false, error: "Cannot mark trashed service sale." };
    if (serviceSale.status === ServiceSaleStatus.CANCELLED || serviceSale.status === ServiceSaleStatus.VOID) {
      return { success: false, error: "Cancelled or Void Service Sale cannot be marked handover ready." };
    }
    if (
      serviceSale.status !== ServiceSaleStatus.CONFIRMED &&
      serviceSale.status !== ServiceSaleStatus.IN_FULFILLMENT &&
      serviceSale.status !== ServiceSaleStatus.FULFILLED
    ) {
      return {
        success: false,
        error: `Cannot mark handover ready: Service Sale status '${serviceSale.status}' is not eligible (Must be CONFIRMED, IN_FULFILLMENT, or FULFILLED).`,
      };
    }

    if (!serviceSale.orderValue || Number(serviceSale.orderValue) <= 0) {
      return { success: false, error: "Cannot mark handover ready: Order value must be greater than zero." };
    }

    if (!serviceSale.clientId) {
      return { success: false, error: "Cannot mark handover ready: Valid Client reference required." };
    }

    const now = new Date();
    const updated = await prisma.serviceSale.update({
      where: { id },
      data: {
        handoverReadyAt: now,
        handoverReadyById: session.user.id,
      },
    });

    await logItemUpdated("ServiceSale", updated.id, "Marked Handover Ready");
    await revalidateBothPaths(`/dashboard/crm/service-sales/${id}`);
    await revalidateBothPaths("/dashboard/crm/service-sales");

    return { success: true, serviceSale: updated };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to mark handover ready";
    console.error("markServiceSaleHandoverReady error:", error);
    return { success: false, error: msg };
  }
}

/**
 * Trash Service Sale
 */
export async function deleteServiceSale(id: string) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const existing = await prisma.serviceSale.findUnique({ where: { id } });
    if (!existing) return { success: false, error: "Service Sale not found" };

// @ts-expect-error - Legacy compatibility
    await verifyTenantAccess(existing.organizationId);
    await verifyServerPermission(session.user.id, "crm.service-sales", "move-to-trash");

    await prisma.serviceSale.update({
      where: { id },
      data: { isTrash: true },
    });

    await logItemUpdated("ServiceSale", id, "Moved to Trash");
    await revalidateBothPaths("/dashboard/crm/service-sales");

    return { success: true };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to delete service sale";
    console.error("deleteServiceSale error:", error);
    return { success: false, error: msg };
  }
}
