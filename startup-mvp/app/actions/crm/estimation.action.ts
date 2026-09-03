"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getTenantContext, verifyTenantAccess } from "@/lib/tenant-context";
import { verifyServerPermission, checkPermission } from "@/lib/permissions";
import { getNextSequenceNumber } from "@/lib/sequence";
import { logItemCreated, logItemUpdated } from "@/lib/user-log";
import { revalidateBothPaths } from "@/lib/route-utils-server";
import { toDecimal, roundMoney } from "@/lib/financial-decimal";
import { EstimationStatus, CostingMethod, Prisma } from "@prisma/client";

/**
 * Confidential Data Firewall Serializer Helper
 * Strips internal cost and margin fields when caller lacks respective permissions
 */
export async function sanitizeEstimation<T extends Record<string, unknown>>(
  estimation: T,
  canViewCost: boolean,
  canViewMargin: boolean = true
): Promise<T> {
  const sanitized = { ...estimation };

  if (!canViewCost) {
    delete sanitized.baseInternalCost;
    delete sanitized.contingencyPercent;
    delete sanitized.contingencyAmount;
    delete sanitized.totalInternalCost;

    if (Array.isArray(sanitized.Items)) {
// @ts-expect-error - Legacy compatibility
      sanitized.Items = sanitized.Items.map((item: Record<string, unknown>) => {
        const copy = { ...item };
        delete copy.internalRate;
        delete copy.internalCost;
        return copy;
      }) as unknown as T[keyof T];
    }
  }

  if (!canViewMargin) {
    delete sanitized.targetMarginPercent;
    delete sanitized.minimumPrice;
    delete sanitized.projectedProfit;
    delete sanitized.projectedMarginPercent;
  }

  return sanitized;
}

/**
 * Recalculate Estimation Financial Totals using True Gross Margin Formula
 * Recommended Selling Price = Total Internal Cost / (1 - (Target Margin % / 100))
 */
export async function recalculateEstimationTotals(estimationId: string) {
  const estimation = await prisma.estimation.findUnique({
    where: { id: estimationId },
    include: { Items: true },
  });

  if (!estimation) return;

  // 1. Base Internal Cost = Sum of line item internal costs
  let baseInternalCost = toDecimal(0);
  let sumItemPrices = toDecimal(0);

  for (const item of estimation.Items) {
    baseInternalCost = baseInternalCost.add(toDecimal(item.internalCost));
    sumItemPrices = sumItemPrices.add(toDecimal(item.recommendedPrice));
  }

  // 2. Contingency Amount = Base Internal Cost * (contingencyPercent / 100)
  const contingencyPercent = toDecimal(estimation.contingencyPercent || 0);
  const contingencyAmount = roundMoney(baseInternalCost.mul(contingencyPercent).div(100));

  // 3. Total Internal Cost = Base Internal Cost + Contingency Amount
  const totalInternalCost = baseInternalCost.add(contingencyAmount);

  // 4. Recommended Selling Price (TRUE GROSS MARGIN FORMULA)
  const targetMarginPercent = toDecimal(estimation.targetMarginPercent || 20.00);
  let recommendedPrice = toDecimal(0);

  if (targetMarginPercent.gte(100)) {
    throw new Error("Target margin percentage cannot be 100% or greater");
  }

  if (targetMarginPercent.gt(0)) {
    const marginDecimal = targetMarginPercent.div(100);
    const divisor = toDecimal(1).sub(marginDecimal); // (1 - m)
    if (!divisor.isZero()) {
      recommendedPrice = roundMoney(totalInternalCost.div(divisor));
    }
  } else {
    recommendedPrice = totalInternalCost;
  }

  // If item prices were explicitly entered, use higher of calculated margin price or sum of item prices
  if (sumItemPrices.gt(recommendedPrice)) {
    recommendedPrice = sumItemPrices;
  }

  // 5. Effective Selling Price (Override vs Recommended)
  const finalPrice = estimation.priceOverride !== null ? toDecimal(estimation.priceOverride) : recommendedPrice;

  // 6. Projected Profit = Final Price - Total Internal Cost
  const projectedProfit = finalPrice.sub(totalInternalCost);

  // 7. Projected Margin % = (Projected Profit / Final Price) * 100
  let projectedMarginPercent = toDecimal(0);
  if (finalPrice.gt(0)) {
    projectedMarginPercent = roundMoney(projectedProfit.mul(100).div(finalPrice));
  }

  await prisma.estimation.update({
    where: { id: estimationId },
    data: {
      baseInternalCost: roundMoney(baseInternalCost),
      contingencyAmount,
      totalInternalCost: roundMoney(totalInternalCost),
      recommendedPrice: roundMoney(recommendedPrice),
      projectedProfit: roundMoney(projectedProfit),
      projectedMarginPercent,
    },
  });
}

/**
 * Get paginated list of Estimations
 */
export async function getEstimations(
  page: number = 1,
  limit: number = 10,
  search: string = "",
  status: string = "all",
  requirementId?: string,
  opportunityId?: string
) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized", estimations: [], total: 0 };

    const { organizationId } = await getTenantContext();

    const canView = await checkPermission(session.user.id, "crm.estimations", "view");
    if (!canView) {
      return { success: false, error: "Permission Denied: crm.estimations.view", estimations: [], total: 0 };
    }

    const canViewCost = await checkPermission(session.user.id, "crm.estimations", "view-cost");
    const canViewMargin = await checkPermission(session.user.id, "crm.estimations", "view-margin");

    const skip = (page - 1) * limit;
    const where: Prisma.EstimationWhereInput = {
      organizationId,
      isTrash: false,
    };

    if (requirementId) where.requirementId = requirementId;
    if (opportunityId) where.opportunityId = opportunityId;

    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { estimationNumber: { contains: search, mode: "insensitive" } },
      ];
    }

    if (status && status !== "all") {
      where.status = status as EstimationStatus;
    }

    const [estimations, total] = await Promise.all([
      prisma.estimation.findMany({
        where,
        skip,
        take: limit,
        orderBy: { updatedAt: "desc" },
        include: {
          Requirement: { select: { id: true, title: true, requirementNumber: true, status: true } },
          Opportunity: { select: { id: true, title: true, opportunityNumber: true } },
          Client: { select: { id: true, name: true, company: true, clientCode: true } },
          PreparedBy: { select: { id: true, name: true, email: true } },
          _count: {
            select: {
              Sections: true,
              Items: true,
            },
          },
        },
      }),
      prisma.estimation.count({ where }),
    ]);

    const sanitizedEstimations = await Promise.all(
      estimations.map((est) => sanitizeEstimation(est, canViewCost, canViewMargin))
    );

    return {
      success: true,
      estimations: sanitizedEstimations,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
    };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to fetch estimations";
    console.error("getEstimations error:", error);
    return { success: false, error: msg, estimations: [], total: 0 };
  }
}

/**
 * Get detailed Estimation by ID
 */
export async function getEstimation(id: string) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized", estimation: null };

    const estimation = await prisma.estimation.findUnique({
      where: { id },
      include: {
        Requirement: { select: { id: true, title: true, requirementNumber: true, status: true, updatedAt: true } },
        Opportunity: { select: { id: true, title: true, opportunityNumber: true, stage: true } },
        Client: { select: { id: true, name: true, company: true, clientCode: true, email: true, phone: true } },
        PreparedBy: { select: { id: true, name: true, email: true } },
        ReviewedBy: { select: { id: true, name: true, email: true } },
        ApprovedBy: { select: { id: true, name: true, email: true } },
        Sections: {
          orderBy: { sortOrder: "asc" },
          include: {
            Items: {
              orderBy: { sortOrder: "asc" },
              include: {
                RequirementItem: { select: { id: true, title: true, type: true, priority: true } },
                Department: { select: { id: true, name: true, code: true } },
                Team: { select: { id: true, name: true, code: true } },
              },
            },
          },
        },
        Items: {
          where: { sectionId: null },
          orderBy: { sortOrder: "asc" },
          include: {
            RequirementItem: { select: { id: true, title: true, type: true, priority: true } },
            Department: { select: { id: true, name: true, code: true } },
            Team: { select: { id: true, name: true, code: true } },
          },
        },
      },
    });

    if (!estimation) return { success: false, error: "Estimation not found", estimation: null };

// @ts-expect-error - Legacy compatibility
    await verifyTenantAccess(estimation.organizationId);

    const canView = await checkPermission(session.user.id, "crm.estimations", "view");
    if (!canView) {
      return { success: false, error: "Permission Denied: crm.estimations.view", estimation: null };
    }

    const canViewCost = await checkPermission(session.user.id, "crm.estimations", "view-cost");
    const canViewMargin = await checkPermission(session.user.id, "crm.estimations", "view-margin");
    const sanitized = await sanitizeEstimation(estimation, canViewCost, canViewMargin);

    return { success: true, estimation: sanitized };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to fetch estimation";
    console.error("getEstimation error:", error);
    return { success: false, error: msg, estimation: null };
  }
}

/**
 * Create new Internal Estimation
 */
export async function createEstimation(input: {
  requirementId: string;
  title: string;
  currency?: string;
  targetMarginPercent?: number;
  notes?: string;
  assumptions?: string;
  riskNotes?: string;
}) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const { organizationId } = await getTenantContext();

    await verifyServerPermission(session.user.id, "crm.estimations", "create");

    // Input Validation: Margin must be < 100% and >= 0%
    const targetMargin = input.targetMarginPercent ?? 20.0;
    if (targetMargin >= 100 || targetMargin < 0) {
      return { success: false, error: "Target margin percentage must be between 0% and 99.99%." };
    }

    // Fetch requirement and verify it exists & is READY_FOR_ESTIMATION
    const requirement = await prisma.requirement.findUnique({
      where: { id: input.requirementId },
      include: {
        Opportunity: { select: { id: true, clientId: true } },
      },
    });

    if (!requirement) return { success: false, error: "Requirement not found" };

// @ts-expect-error - Legacy compatibility
    await verifyTenantAccess(requirement.organizationId);

    if (requirement.isTrash) {
      return { success: false, error: "Cannot create estimation for a trashed requirement." };
    }

    if (requirement.status !== "READY_FOR_ESTIMATION") {
      return {
        success: false,
        error: `Cannot create estimation: Requirement status is '${requirement.status}'. Must be 'READY_FOR_ESTIMATION'.`,
      };
    }

    // Atomic Business Sequence Number
    const estimationNumber = await getNextSequenceNumber(organizationId, "ESTIMATION", "EST");

    // Versioning calculation: Count existing estimations for this requirement
    const existingCount = await prisma.estimation.count({
      where: { organizationId, requirementId: requirement.id },
    });
    const version = existingCount + 1;

    const estimation = await prisma.estimation.create({
      data: {
        organizationId,
        estimationNumber,
        requirementId: requirement.id,
        opportunityId: requirement.opportunityId,
        clientId: requirement.clientId,
        title: input.title,
        version,
        status: EstimationStatus.DRAFT,
        currency: input.currency || "TK",
        targetMarginPercent: toDecimal(targetMargin),
        notes: input.notes || null,
        assumptions: input.assumptions || null,
        riskNotes: input.riskNotes || null,
        preparedById: session.user.id,
      },
    });

    await logItemCreated("Estimation", estimation.id, estimation.title);
    await revalidateBothPaths("/dashboard/crm/estimations");
    await revalidateBothPaths(`/dashboard/crm/requirements/${requirement.id}`);

    return { success: true, estimationId: estimation.id, estimationNumber };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to create estimation";
    console.error("createEstimation error:", error);
    return { success: false, error: msg };
  }
}

/**
 * Update Estimation metadata
 */
export async function updateEstimation(
  id: string,
  input: {
    title?: string;
    currency?: string;
    contingencyPercent?: number;
    targetMarginPercent?: number;
    priceOverride?: number | null;
    notes?: string;
    assumptions?: string;
    riskNotes?: string;
    status?: EstimationStatus;
  }
) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const existing = await prisma.estimation.findUnique({ where: { id } });
    if (!existing) return { success: false, error: "Estimation not found" };

// @ts-expect-error - Legacy compatibility
    await verifyTenantAccess(existing.organizationId);
    await verifyServerPermission(session.user.id, "crm.estimations", "edit");

    if (existing.isTrash) return { success: false, error: "Cannot modify a trashed estimation." };
    if (existing.status === EstimationStatus.APPROVED || existing.status === EstimationStatus.READY_FOR_QUOTATION) {
      return { success: false, error: "Approved or Ready for Quotation estimation is read-only." };
    }

    if (input.targetMarginPercent !== undefined) {
      if (input.targetMarginPercent >= 100 || input.targetMarginPercent < 0) {
        return { success: false, error: "Target margin percentage must be between 0% and 99.99%." };
      }
    }

    if (input.contingencyPercent !== undefined && input.contingencyPercent < 0) {
      return { success: false, error: "Contingency percentage cannot be negative." };
    }

    // Generic status update bypass prevention
    if (input.status === EstimationStatus.APPROVED) {
      return { success: false, error: "Bypass Rejected: Transition to APPROVED requires approveEstimation()." };
    }
    if (input.status === EstimationStatus.READY_FOR_QUOTATION) {
      return { success: false, error: "Bypass Rejected: Transition to READY_FOR_QUOTATION requires markReadyForQuotation()." };
    }

    const data: Prisma.EstimationUpdateInput = {};
    if (input.title !== undefined) data.title = input.title;
    if (input.currency !== undefined) data.currency = input.currency;
    if (input.contingencyPercent !== undefined) data.contingencyPercent = toDecimal(input.contingencyPercent);
    if (input.targetMarginPercent !== undefined) data.targetMarginPercent = toDecimal(input.targetMarginPercent);
    if (input.priceOverride !== undefined) {
      data.priceOverride = input.priceOverride !== null ? toDecimal(input.priceOverride) : null;
    }
    if (input.notes !== undefined) data.notes = input.notes;
    if (input.assumptions !== undefined) data.assumptions = input.assumptions;
    if (input.riskNotes !== undefined) data.riskNotes = input.riskNotes;
    if (input.status !== undefined) data.status = input.status;

    const updated = await prisma.estimation.update({
      where: { id },
      data,
    });

    await recalculateEstimationTotals(id);

    await logItemUpdated("Estimation", updated.id, updated.title);
    await revalidateBothPaths(`/dashboard/crm/estimations/${id}`);
    await revalidateBothPaths("/dashboard/crm/estimations");

    return { success: true, estimation: updated };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to update estimation";
    console.error("updateEstimation error:", error);
    return { success: false, error: msg };
  }
}

/**
 * Approve Estimation (Dedicated RBAC Action)
 */
export async function approveEstimation(id: string) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const estimation = await prisma.estimation.findUnique({
      where: { id },
      include: { Items: true },
    });

    if (!estimation) return { success: false, error: "Estimation not found" };

// @ts-expect-error - Legacy compatibility
    await verifyTenantAccess(estimation.organizationId);
    await verifyServerPermission(session.user.id, "crm.estimations", "approve");

    if (estimation.isTrash) return { success: false, error: "Cannot approve trashed estimation." };
    if (estimation.Items.length === 0) return { success: false, error: "Cannot approve estimation with 0 line items." };

    const updated = await prisma.estimation.update({
      where: { id },
      data: {
        status: EstimationStatus.APPROVED,
        approvedById: session.user.id,
        approvedAt: new Date(),
      },
    });

    await logItemUpdated("Estimation", updated.id, "Status: APPROVED");
    await revalidateBothPaths(`/dashboard/crm/estimations/${id}`);
    await revalidateBothPaths("/dashboard/crm/estimations");

    return { success: true, estimation: updated };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to approve estimation";
    console.error("approveEstimation error:", error);
    return { success: false, error: msg };
  }
}

/**
 * Mark Estimation READY_FOR_QUOTATION (Dedicated RBAC Action)
 */
export async function markReadyForQuotation(id: string) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const estimation = await prisma.estimation.findUnique({
      where: { id },
      include: {
        Requirement: { select: { status: true, isTrash: true } },
        Items: true,
      },
    });

    if (!estimation) return { success: false, error: "Estimation not found" };

// @ts-expect-error - Legacy compatibility
    await verifyTenantAccess(estimation.organizationId);
    await verifyServerPermission(session.user.id, "crm.estimations", "ready-for-quotation");

    if (estimation.isTrash) return { success: false, error: "Cannot mark trashed estimation ready for quotation." };
    if (estimation.Requirement.isTrash || estimation.Requirement.status !== "READY_FOR_ESTIMATION") {
      return { success: false, error: "Parent Requirement must be non-trashed and READY_FOR_ESTIMATION." };
    }
    if (estimation.Items.length === 0) return { success: false, error: "Estimation must contain at least 1 estimation item." };
    if (estimation.status !== EstimationStatus.APPROVED && estimation.status !== EstimationStatus.READY_FOR_REVIEW) {
      return { success: false, error: "Estimation must be APPROVED or READY_FOR_REVIEW first." };
    }

    const updated = await prisma.estimation.update({
      where: { id },
      data: {
        status: EstimationStatus.READY_FOR_QUOTATION,
        readyForQuotationAt: new Date(),
        readyForQuotationById: session.user.id,
      },
    });

    await logItemUpdated("Estimation", updated.id, "Status: READY_FOR_QUOTATION");
    await revalidateBothPaths(`/dashboard/crm/estimations/${id}`);
    await revalidateBothPaths("/dashboard/crm/estimations");

    return { success: true, estimation: updated };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to mark ready for quotation";
    console.error("markReadyForQuotation error:", error);
    return { success: false, error: msg };
  }
}

/**
 * Section CRUD
 */
export async function addEstimationSection(input: {
  estimationId: string;
  title: string;
  description?: string;
  sortOrder?: number;
}) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const est = await prisma.estimation.findUnique({ where: { id: input.estimationId } });
    if (!est) return { success: false, error: "Estimation not found" };

// @ts-expect-error - Legacy compatibility
    await verifyTenantAccess(est.organizationId);
    await verifyServerPermission(session.user.id, "crm.estimations", "edit");

    if (est.isTrash) return { success: false, error: "Cannot modify trashed estimation." };
    if (est.status === EstimationStatus.APPROVED || est.status === EstimationStatus.READY_FOR_QUOTATION) {
      return { success: false, error: "Approved or Ready for Quotation estimation is read-only." };
    }

    const section = await prisma.estimationSection.create({
      data: {
        organizationId: est.organizationId,
        estimationId: est.id,
        title: input.title,
        description: input.description || null,
        sortOrder: input.sortOrder || 0,
      },
    });

    await revalidateBothPaths(`/dashboard/crm/estimations/${est.id}`);
    return { success: true, section };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to add section";
    console.error("addEstimationSection error:", error);
    return { success: false, error: msg };
  }
}

/**
 * Estimation Item CRUD with Gross Margin Calculations
 */
export async function addEstimationItem(input: {
  estimationId: string;
  sectionId?: string;
  requirementItemId?: string;
  departmentId?: string;
  teamId?: string;
  title: string;
  description?: string;
  costingMethod?: CostingMethod;
  quantity?: number;
  unit?: string;
  estimatedHours?: number;
  internalRate?: number;
  commercialRate?: number;
  notes?: string;
}) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const est = await prisma.estimation.findUnique({ where: { id: input.estimationId } });
    if (!est) return { success: false, error: "Estimation not found" };

// @ts-expect-error - Legacy compatibility
    await verifyTenantAccess(est.organizationId);
    await verifyServerPermission(session.user.id, "crm.estimations", "edit");

    if (est.isTrash) return { success: false, error: "Cannot modify trashed estimation." };
    if (est.status === EstimationStatus.APPROVED || est.status === EstimationStatus.READY_FOR_QUOTATION) {
      return { success: false, error: "Approved or Ready for Quotation estimation is read-only." };
    }

    // Input Validation: Reject negative values
    if ((input.quantity ?? 1) < 0) return { success: false, error: "Quantity cannot be negative" };
    if ((input.internalRate ?? 0) < 0) return { success: false, error: "Internal rate cannot be negative" };
    if (input.commercialRate !== undefined && input.commercialRate < 0) return { success: false, error: "Commercial rate cannot be negative" };

    // Parent scoping checks
    if (input.sectionId) {
      const sec = await prisma.estimationSection.findUnique({ where: { id: input.sectionId } });
      if (!sec || sec.estimationId !== est.id || sec.organizationId !== est.organizationId) {
        return { success: false, error: "Section does not belong to this estimation or organization" };
      }
    }

    if (input.requirementItemId) {
      const reqItem = await prisma.requirementItem.findUnique({ where: { id: input.requirementItemId } });
      if (!reqItem || reqItem.requirementId !== est.requirementId || reqItem.organizationId !== est.organizationId) {
        return { success: false, error: "Requirement item does not belong to parent requirement or organization" };
      }
    }

    if (input.departmentId) {
      const dept = await prisma.department.findUnique({ where: { id: input.departmentId } });
      if (!dept || dept.organizationId !== est.organizationId) {
        return { success: false, error: "Department does not belong to your organization" };
      }
    }

    if (input.teamId) {
      const team = await prisma.team.findUnique({ where: { id: input.teamId } });
      if (!team || team.organizationId !== est.organizationId) {
        return { success: false, error: "Team does not belong to your organization" };
      }
      if (input.departmentId && team.departmentId !== input.departmentId) {
        return { success: false, error: "Team does not belong to the selected department" };
      }
    }

    const qty = toDecimal(input.quantity ?? 1);
    const internalRate = toDecimal(input.internalRate ?? 0);
    const commercialRate = input.commercialRate !== undefined ? toDecimal(input.commercialRate) : null;

    // Financial Decimal calculations:
    // internalCost = qty * internalRate
    const internalCost = roundMoney(qty.mul(internalRate));

    // Item level price recommendation:
    // If commercialRate is supplied: price = qty * commercialRate
    // Else: price = internalCost / (1 - (targetMarginPercent / 100))
    let recommendedPrice = toDecimal(0);
    if (commercialRate !== null) {
      recommendedPrice = roundMoney(qty.mul(commercialRate));
    } else {
      const marginPercent = toDecimal(est.targetMarginPercent || 20.00);
      if (marginPercent.lt(100) && marginPercent.gt(0)) {
        const divisor = toDecimal(1).sub(marginPercent.div(100));
        recommendedPrice = roundMoney(internalCost.div(divisor));
      } else {
        recommendedPrice = internalCost;
      }
    }

    const item = await prisma.estimationItem.create({
      data: {
        organizationId: est.organizationId,
        estimationId: est.id,
        sectionId: input.sectionId || null,
        requirementItemId: input.requirementItemId || null,
        departmentId: input.departmentId || null,
        teamId: input.teamId || null,
        title: input.title,
        description: input.description || null,
        costingMethod: input.costingMethod || CostingMethod.HOURLY,
        quantity: qty,
        unit: input.unit || "Hours",
        estimatedHours: input.estimatedHours ? toDecimal(input.estimatedHours) : null,
        internalRate,
        internalCost,
        commercialRate,
        recommendedPrice,
        notes: input.notes || null,
      },
    });

    await recalculateEstimationTotals(est.id);
    await revalidateBothPaths(`/dashboard/crm/estimations/${est.id}`);

    return { success: true, item };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to add estimation item";
    console.error("addEstimationItem error:", error);
    return { success: false, error: msg };
  }
}

export async function removeEstimationItem(itemId: string) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const item = await prisma.estimationItem.findUnique({
      where: { id: itemId },
      include: { Estimation: { select: { status: true, isTrash: true } } },
    });
    if (!item) return { success: false, error: "Estimation item not found" };

// @ts-expect-error - Legacy compatibility
    await verifyTenantAccess(item.organizationId);
    await verifyServerPermission(session.user.id, "crm.estimations", "edit");

    if (item.Estimation.isTrash || item.Estimation.status === EstimationStatus.APPROVED || item.Estimation.status === EstimationStatus.READY_FOR_QUOTATION) {
      return { success: false, error: "Cannot modify line items on approved or trashed estimation." };
    }

    await prisma.estimationItem.delete({ where: { id: itemId } });
    await recalculateEstimationTotals(item.estimationId);

    await revalidateBothPaths(`/dashboard/crm/estimations/${item.estimationId}`);
    return { success: true };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to remove item";
    console.error("removeEstimationItem error:", error);
    return { success: false, error: msg };
  }
}

/**
 * Move Estimation to Trash
 */
export async function deleteEstimation(id: string) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const existing = await prisma.estimation.findUnique({ where: { id } });
    if (!existing) return { success: false, error: "Estimation not found" };

// @ts-expect-error - Legacy compatibility
    await verifyTenantAccess(existing.organizationId);
    await verifyServerPermission(session.user.id, "crm.estimations", "move-to-trash");

    await prisma.estimation.update({
      where: { id },
      data: { isTrash: true },
    });

    await logItemUpdated("Estimation", id, "Moved to Trash");
    await revalidateBothPaths("/dashboard/crm/estimations");

    return { success: true };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to delete estimation";
    console.error("deleteEstimation error:", error);
    return { success: false, error: msg };
  }
}
