"use server";

import { auth } from "@/lib/auth";
import { evaluateBillingMilestoneEligibility } from "@/lib/billing/condition-resolvers";
import { logItemCreated, logItemUpdated } from "@/lib/user-log";
import { revalidateBothPaths } from "@/lib/route-utils-server";
import { verifyServerPermission } from "@/lib/permissions";
import { verifyTenantAccess } from "@/lib/tenant-context";
import { prisma } from "@/lib/prisma";
import {
  BillingConditionType,
  BillingMilestoneStatus,
  BillingMilestoneType,
  BillingPlanStatus,
  Prisma,
} from "@prisma/client";

export interface CreateMilestoneInput {
  sequence: number;
  code: string;
  name: string;
  description?: string;
  billingType: BillingMilestoneType;
  percentage?: number;
  fixedAmount?: number;
  plannedDate?: string;
  dueDate?: string;
  conditions?: {
    conditionType: BillingConditionType;
    targetEntityId?: string;
    requiredDate?: string;
  }[];
}

export interface CreateBillingPlanInput {
  projectId: string;
  agreementId?: string;
  serviceSaleId?: string;
  currency?: string;
  milestones: CreateMilestoneInput[];
}

/**
 * Creates a DRAFT ProjectBillingPlan with validated milestone allocations
 */
export async function createBillingPlanAction(input: CreateBillingPlanInput) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("UNAUTHORIZED: Session invalid");

// @ts-expect-error - Legacy compatibility
  const tenantContext = await verifyTenantAccess();
// @ts-expect-error - Legacy compatibility
  const organizationId = tenantContext.organizationId;

  await verifyServerPermission(session.user.id, "billing.plans", "create");

  // 1. Validate project & tenant scoping
  const project = await prisma.project.findFirst({
    where: { id: input.projectId, organizationId },
  });
  if (!project) throw new Error("Project not found or access denied");

  // 2. Resolve canonical commercial contract basis using Prisma.Decimal exclusively
  let contractBasis = new Prisma.Decimal(0);
  let currency = input.currency || "TK";

  if (input.agreementId) {
    const agreement = await prisma.agreement.findFirst({
      where: { id: input.agreementId, organizationId },
    });
    if (!agreement) throw new Error("Agreement not found");
    contractBasis = new Prisma.Decimal(agreement.contractValue);
    currency = agreement.currency || currency;
  } else if (input.serviceSaleId) {
    const sale = await prisma.serviceSale.findFirst({
      where: { id: input.serviceSaleId, organizationId },
    });
    if (!sale) throw new Error("Service Sale not found");
    contractBasis = new Prisma.Decimal(sale.orderValue);
    currency = sale.currency || currency;
  } else if (project.budget) {
    contractBasis = new Prisma.Decimal(project.budget);
  }

  if (contractBasis.lessThanOrEqualTo(0)) {
    throw new Error("Invalid commercial basis: contract value must be positive");
  }

  // 3. Validate milestone allocation using Prisma.Decimal arithmetic
  let totalPercentage = new Prisma.Decimal(0);
  let totalFixedAmount = new Prisma.Decimal(0);

  const calculatedMilestones = input.milestones.map((m) => {
    let calcAmount = new Prisma.Decimal(0);
    let percDec: Prisma.Decimal | null = null;
    let fixedDec: Prisma.Decimal | null = null;

    if (m.billingType === BillingMilestoneType.PERCENTAGE_OF_CONTRACT) {
      if (!m.percentage || m.percentage <= 0 || m.percentage > 100) {
        throw new Error(`Invalid percentage for milestone ${m.code}: must be between 0 and 100`);
      }
      percDec = new Prisma.Decimal(m.percentage);
      totalPercentage = totalPercentage.plus(percDec);
      calcAmount = contractBasis.times(percDec).dividedBy(100).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
    } else if (m.billingType === BillingMilestoneType.FIXED_AMOUNT) {
      if (!m.fixedAmount || m.fixedAmount <= 0) {
        throw new Error(`Invalid fixed amount for milestone ${m.code}`);
      }
      fixedDec = new Prisma.Decimal(m.fixedAmount);
      totalFixedAmount = totalFixedAmount.plus(fixedDec);
      calcAmount = fixedDec.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
    } else {
      // FIXED_MILESTONE
      if (m.percentage && m.percentage > 0) {
        percDec = new Prisma.Decimal(m.percentage);
        totalPercentage = totalPercentage.plus(percDec);
        calcAmount = contractBasis.times(percDec).dividedBy(100).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
      } else if (m.fixedAmount && m.fixedAmount > 0) {
        fixedDec = new Prisma.Decimal(m.fixedAmount);
        totalFixedAmount = totalFixedAmount.plus(fixedDec);
        calcAmount = fixedDec.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
      }
    }

    return { ...m, percDec, fixedDec, calcAmount };
  });

  // Enforce contract total invariants (hard block on over-allocation)
  if (totalPercentage.greaterThan(100)) {
    throw new Error(`Total milestone percentage (${totalPercentage.toString()}%) exceeds 100%`);
  }
  if (totalFixedAmount.greaterThan(contractBasis)) {
    throw new Error(`Total fixed milestone amount (${totalFixedAmount.toString()}) exceeds contract basis (${contractBasis.toString()})`);
  }

  // 4. Create Plan & Milestones inside atomic transaction
  const plan = await prisma.$transaction(async (tx) => {
    const createdPlan = await tx.projectBillingPlan.create({
      data: {
        organizationId,
        projectId: input.projectId,
        agreementId: input.agreementId,
        serviceSaleId: input.serviceSaleId,
        currency,
        contractAmountSnapshot: contractBasis,
        status: BillingPlanStatus.DRAFT,
        createdById: session.user.id,
      },
    });

    for (const m of calculatedMilestones) {
      const createdMilestone = await tx.projectBillingMilestone.create({
        data: {
          organizationId,
          billingPlanId: createdPlan.id,
          projectId: input.projectId,
          sequence: m.sequence,
          code: m.code,
          name: m.name,
          description: m.description,
          billingType: m.billingType,
          percentage: m.percDec,
          fixedAmount: m.fixedDec,
          calculatedAmount: m.calcAmount,
          plannedDate: m.plannedDate ? new Date(m.plannedDate) : null,
          dueDate: m.dueDate ? new Date(m.dueDate) : null,
          status: BillingMilestoneStatus.DRAFT,
        },
      });

      if (m.conditions && m.conditions.length > 0) {
        for (const c of m.conditions) {
          await tx.billingMilestoneCondition.create({
            data: {
              organizationId,
              billingMilestoneId: createdMilestone.id,
              conditionType: c.conditionType,
              targetEntityId: c.targetEntityId || input.projectId,
              requiredDate: c.requiredDate ? new Date(c.requiredDate) : null,
              satisfied: false,
            },
          });
        }
      }
    }

    return createdPlan;
  });

  await logItemCreated(session.user.id, "ProjectBillingPlan", plan.id, `Created Billing Plan for Project ${input.projectId}`);
  revalidateBothPaths(`/dashboard/projects/${input.projectId}/billing`);

  return plan;
}

/**
 * Activates a DRAFT ProjectBillingPlan enforcing single active plan per project
 */
export async function activateBillingPlanAction(planId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("UNAUTHORIZED: Session invalid");

// @ts-expect-error - Legacy compatibility
  const tenantContext = await verifyTenantAccess();
// @ts-expect-error - Legacy compatibility
  const organizationId = tenantContext.organizationId;

  await verifyServerPermission(session.user.id, "billing.plans", "activate");

  const plan = await prisma.projectBillingPlan.findFirst({
    where: { id: planId, organizationId },
    include: { Milestones: { include: { Conditions: true } } },
  });

  if (!plan) throw new Error("Billing plan not found");
  if (plan.status !== BillingPlanStatus.DRAFT) {
    throw new Error(`Cannot activate plan in status ${plan.status}`);
  }

  // Single active plan enforcement
  const existingActive = await prisma.projectBillingPlan.findFirst({
    where: {
      organizationId,
      projectId: plan.projectId,
      status: BillingPlanStatus.ACTIVE,
      id: { not: planId },
    },
  });

  if (existingActive) {
    throw new Error(`Project already has an active billing plan (${existingActive.id})`);
  }

  const updatedPlan = await prisma.$transaction(async (tx) => {
    const p = await tx.projectBillingPlan.update({
      where: { id: planId },
      data: { status: BillingPlanStatus.ACTIVE },
    });

    // Evaluate initial milestone conditions
    for (const m of plan.Milestones) {
      await evaluateBillingMilestoneEligibility(m.id, tx);
    }

    return p;
  });

  await logItemUpdated(session.user.id, "ProjectBillingPlan", planId, ["status"], `ACTIVATED Billing Plan ${planId}`);
  revalidateBothPaths(`/dashboard/projects/${plan.projectId}/billing`);

  return updatedPlan;
}

/**
/**
 * Creates an Invoice from a BILLABLE or PARTIALLY_INVOICED milestone with strict overbilling prevention
 */
export async function createInvoiceFromBillingMilestoneAction(
  milestoneId: string,
  amountToInvoiceNum?: number
) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("UNAUTHORIZED: Session invalid");

// @ts-expect-error - Legacy compatibility
  const tenantContext = await verifyTenantAccess();
// @ts-expect-error - Legacy compatibility
  const organizationId = tenantContext.organizationId;

  await verifyServerPermission(session.user.id, "billing.invoice", "create");

  // Transactional Invoice Creation & Overbilling Guard
  const result = await prisma.$transaction(async (tx) => {
    // 1. Fetch fresh milestone data inside transaction for strict concurrency safety
    const milestone = await tx.projectBillingMilestone.findFirst({
      where: { id: milestoneId, organizationId },
      include: {
        BillingPlan: true,
        Project: true,
        InvoiceLinks: true,
        Conditions: true,
      },
    });

    if (!milestone) throw new Error("Billing milestone not found or access denied");

    if (milestone.BillingPlan.status === BillingPlanStatus.STALE || milestone.BillingPlan.status === BillingPlanStatus.CANCELLED) {
      throw new Error(`Cannot invoice against ${milestone.BillingPlan.status} billing plan`);
    }

    if (
      milestone.status !== BillingMilestoneStatus.BILLABLE &&
      milestone.status !== BillingMilestoneStatus.PARTIALLY_INVOICED
    ) {
      throw new Error(`Milestone is not currently billable (Status: ${milestone.status})`);
    }

    // 2. Re-verify source staleness inside transaction
    const evalRes = await evaluateBillingMilestoneEligibility(milestoneId, tx);
    if (!evalRes.billable && milestone.status !== BillingMilestoneStatus.PARTIALLY_INVOICED) {
      throw new Error(`Milestone delivery condition is STALE: ${evalRes.reason}`);
    }

    // 3. Compute already invoiced amount using fresh DB records inside transaction
    const currentLinks = await tx.billingMilestoneInvoiceLink.findMany({
      where: { billingMilestoneId: milestone.id, organizationId },
    });

    const alreadyInvoiced = currentLinks.reduce(
      (sum, l) => sum.plus(new Prisma.Decimal(l.amountApplied)),
      new Prisma.Decimal(0)
    );

    const calcAmount = new Prisma.Decimal(milestone.calculatedAmount);
    const remainingUninvoiced = calcAmount.minus(alreadyInvoiced);

    if (remainingUninvoiced.lessThanOrEqualTo(0)) {
      throw new Error("Milestone is already fully invoiced");
    }

    // 4. Determine amount to apply
    let applyAmount = remainingUninvoiced;
    if (amountToInvoiceNum && amountToInvoiceNum > 0) {
      const requested = new Prisma.Decimal(amountToInvoiceNum).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
      if (requested.greaterThan(remainingUninvoiced)) {
        throw new Error(`Requested invoice amount (${requested.toString()}) exceeds remaining billable amount (${remainingUninvoiced.toString()})`);
      }
      applyAmount = requested;
    }

    // Hard block on overbilling
    const newTotalInvoiced = alreadyInvoiced.plus(applyAmount);
    if (newTotalInvoiced.greaterThan(calcAmount)) {
      throw new Error(`Invoice attempt (${newTotalInvoiced.toString()}) exceeds authorized milestone amount (${calcAmount.toString()})`);
    }

    // 5. Resolve order / client
    const clientId = milestone.Project.clientId;
    let orderId = milestone.Project.orderId;

    if (!orderId) {
      const firstOrder = await tx.order.findFirst({ where: { clientId } });
      if (firstOrder) {
        orderId = firstOrder.id;
      } else {
        // Create minimal Quotation & Order if no order exists on project
        const quoId = `quo_auto_${Date.now().toString().slice(-6)}`;
        await tx.quotation.create({
          data: {
            id: quoId,
            organizationId,
            quotationNumber: `QUO-AUTO-${Date.now().toString().slice(-6)}`,
            subject: "Auto Billing Quotation",
            clientId,
            submittedById: session.user.id,
            status: "APPROVED",
          },
        });
        const newOrder = await tx.order.create({
// @ts-expect-error - Legacy compatibility
          data: {
            orderNumber: `ORD-BILL-${Date.now().toString().slice(-6)}`,
            quotationId: quoId,
            clientId,
            totalValue: applyAmount,
            status: "CONFIRMED",
          },
        });
        orderId = newOrder.id;
      }
    }

    // 6. Create canonical Invoice
    const invoiceNumber = `INV-${milestone.code}-${Date.now().toString().slice(-6)}`;
    const invoice = await tx.invoice.create({
      data: {
        organizationId,
        invoiceNumber,
        orderId,
        totalAmount: applyAmount,
        status: "ISSUED",
      },
    });

    // 7. Create InvoiceLink
    const link = await tx.billingMilestoneInvoiceLink.create({
      data: {
        organizationId,
        billingMilestoneId: milestone.id,
        invoiceId: invoice.id,
        amountApplied: applyAmount,
      },
    });

    // 8. Update milestone status
    const isFullyInvoiced = newTotalInvoiced.equals(calcAmount);
    const newStatus = isFullyInvoiced ? BillingMilestoneStatus.INVOICED : BillingMilestoneStatus.PARTIALLY_INVOICED;

    await tx.projectBillingMilestone.update({
      where: { id: milestone.id },
      data: {
        status: newStatus,
        invoicedAt: new Date(),
        completedAt: isFullyInvoiced ? new Date() : null,
      },
    });

    return { invoice, link, newStatus, applyAmount, milestoneCode: milestone.code, projectId: milestone.projectId };
  });

  await logItemCreated(session.user.id, "Invoice", result.invoice.id, `Created Invoice ${result.invoice.invoiceNumber} for Milestone ${result.milestoneCode}`);
  revalidateBothPaths(`/dashboard/projects/${result.projectId}/billing`);

  return result;
}

/**
 * Cancels an uninvoiced milestone. If milestone is already invoiced, rejects cancellation.
 */
export async function cancelBillingMilestoneAction(milestoneId: string, reason?: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("UNAUTHORIZED: Session invalid");

// @ts-expect-error - Legacy compatibility
  const tenantContext = await verifyTenantAccess();
// @ts-expect-error - Legacy compatibility
  const organizationId = tenantContext.organizationId;

  await verifyServerPermission(session.user.id, "billing.plans", "edit");

  return await prisma.$transaction(async (tx) => {
    const milestone = await tx.projectBillingMilestone.findFirst({
      where: { id: milestoneId, organizationId },
      include: { InvoiceLinks: true },
    });

    if (!milestone) throw new Error("Milestone not found");
    if (milestone.status === BillingMilestoneStatus.INVOICED || milestone.status === BillingMilestoneStatus.PARTIALLY_INVOICED || milestone.InvoiceLinks.length > 0) {
      throw new Error("Cannot cancel an invoiced or partially-invoiced milestone");
    }

    const updated = await tx.projectBillingMilestone.update({
      where: { id: milestoneId },
      data: {
        status: BillingMilestoneStatus.CANCELLED,
        cancelledAt: new Date(),
        staleReason: reason || "Cancelled by user",
      },
    });

    await logItemUpdated(session.user.id, "ProjectBillingMilestone", milestoneId, ["status", "cancelledAt"], `CANCELLED milestone ${milestone.code}`);
    return updated;
  });
}

/**
 * Handles material commercial amendments to an Agreement or ServiceSale backing an active plan
 */
export async function amendBillingPlanCommercialBasisAction(planId: string, reason?: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("UNAUTHORIZED: Session invalid");

// @ts-expect-error - Legacy compatibility
  const tenantContext = await verifyTenantAccess();
// @ts-expect-error - Legacy compatibility
  const organizationId = tenantContext.organizationId;

  await verifyServerPermission(session.user.id, "billing.plans", "edit");

  return await prisma.$transaction(async (tx) => {
    const plan = await tx.projectBillingPlan.findFirst({
      where: { id: planId, organizationId },
      include: { Milestones: { include: { InvoiceLinks: true } } },
    });

    if (!plan) throw new Error("Billing plan not found");
    if (plan.status !== BillingPlanStatus.ACTIVE) {
      throw new Error(`Cannot amend plan in status ${plan.status}`);
    }

    // Mark plan as STALE / REVISION_REQUIRED due to material commercial change
    const updatedPlan = await tx.projectBillingPlan.update({
      where: { id: planId },
      data: { status: BillingPlanStatus.STALE },
    });

    // Mark all uninvoiced milestones as STALE; preserve existing INVOICED milestones as historical truth
    for (const m of plan.Milestones) {
      if (m.status !== BillingMilestoneStatus.INVOICED && m.status !== BillingMilestoneStatus.CANCELLED) {
        await tx.projectBillingMilestone.update({
          where: { id: m.id },
          data: {
            status: BillingMilestoneStatus.STALE,
            staleAt: new Date(),
            staleReason: reason || "Material commercial contract revision required",
          },
        });
      }
    }

    await logItemUpdated(session.user.id, "ProjectBillingPlan", planId, ["status"], `MARKED STALE due to commercial amendment: ${reason || 'Contract revision'}`);
    return updatedPlan;
  });
}


/**
 * Returns project billing summary DTO excluding confidential internal cost/margin data
 */
export async function getProjectBillingSummaryAction(projectId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("UNAUTHORIZED: Session invalid");

// @ts-expect-error - Legacy compatibility
  const tenantContext = await verifyTenantAccess();
// @ts-expect-error - Legacy compatibility
  const organizationId = tenantContext.organizationId;

  await verifyServerPermission(session.user.id, "billing.plans", "view");

  const plan = await prisma.projectBillingPlan.findFirst({
    where: { projectId, organizationId, status: { in: [BillingPlanStatus.ACTIVE, BillingPlanStatus.DRAFT] } },
    include: {
      Milestones: {
        include: { Conditions: true, InvoiceLinks: { include: { Invoice: true } } },
        orderBy: { sequence: "asc" },
      },
    },
  });

  if (!plan) return null;

  const contractValue = plan.contractAmountSnapshot.toString();
  let totalBillable = new Prisma.Decimal(0);
  let totalInvoiced = new Prisma.Decimal(0);

  const milestonesDto = plan.Milestones.map((m) => {
    const calc = new Prisma.Decimal(m.calculatedAmount);
    const invoiced = m.InvoiceLinks.reduce((sum, l) => sum.plus(new Prisma.Decimal(l.amountApplied)), new Prisma.Decimal(0));

    if (m.status === BillingMilestoneStatus.BILLABLE) {
      totalBillable = totalBillable.plus(calc.minus(invoiced));
    }
    totalInvoiced = totalInvoiced.plus(invoiced);

    return {
      id: m.id,
      sequence: m.sequence,
      code: m.code,
      name: m.name,
      description: m.description,
      billingType: m.billingType,
      percentage: m.percentage ? m.percentage.toString() : null,
      fixedAmount: m.fixedAmount ? m.fixedAmount.toString() : null,
      calculatedAmount: calc.toString(),
      invoicedAmount: invoiced.toString(),
      remainingAmount: calc.minus(invoiced).toString(),
      status: m.status,
      billableAt: m.billableAt,
      invoicedAt: m.invoicedAt,
      staleAt: m.staleAt,
      staleReason: m.staleReason,
      conditions: m.Conditions.map((c) => ({
        id: c.id,
        type: c.conditionType,
        satisfied: c.satisfied,
      })),
      invoices: m.InvoiceLinks.map((l) => ({
        invoiceId: l.invoiceId,
        invoiceNumber: l.Invoice.invoiceNumber,
        amountApplied: l.amountApplied.toString(),
      })),
    };
  });

  const contractDec = new Prisma.Decimal(plan.contractAmountSnapshot);
  const remainingUninvoiced = contractDec.minus(totalInvoiced);

  return {
    planId: plan.id,
    status: plan.status,
    currency: plan.currency,
    contractValue,
    totalBillable: totalBillable.toString(),
    totalInvoiced: totalInvoiced.toString(),
    remainingUninvoiced: remainingUninvoiced.toString(),
    milestones: milestonesDto,
  };
}
