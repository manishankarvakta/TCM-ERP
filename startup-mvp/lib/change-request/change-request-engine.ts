import { PrismaClient, Prisma } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";

const prisma = new PrismaClient();

export interface CommercialAuthorityResolution {
  sourceType: "BILLING_PLAN" | "AGREEMENT" | "SERVICE_SALE" | "PROJECT_BUDGET";
  sourceId: string;
  sourceVersion: number;
  contractAmount: Decimal;
  plannedEndDate: Date | null;
  agreementId?: string | null;
  serviceSaleId?: string | null;
  billingPlanId?: string | null;
}

export interface MaterialStalenessCheckResult {
  isStale: boolean;
  reason?: string;
}

export interface CommercialReductionEligibility {
  isEligible: boolean;
  canonicalContractAmount: Decimal;
  invoicedAmount: Decimal;
  eligibleUninvoicedAmount: Decimal;
  requestedReduction: Decimal;
  revisedContractAmount: Decimal;
  reason?: string;
}

type DbClient = PrismaClient | Prisma.TransactionClient;

/**
 * Resolves commercial baseline following formal precedence:
 * ProjectBillingPlan -> Agreement/ServiceSale -> Project.budget (fallback only)
 */
export async function resolveCommercialBaselineAuthority(
  projectId: string,
  organizationId: string,
  client?: DbClient
): Promise<CommercialAuthorityResolution> {
  const db = client || prisma;

  const project = await db.project.findFirst({
    where: { id: projectId, organizationId },
    include: {
      CommercialAmendments: {
        orderBy: { versionNumber: "desc" },
        take: 1
      },
      ProjectBillingPlans: {
        orderBy: { createdAt: "desc" },
        take: 1
      }
    }
  });

  if (!project) {
    throw new Error(`Project ${projectId} not found or tenant boundary violated.`);
  }

  const latestAmendment = project.CommercialAmendments[0];
  const version = latestAmendment ? latestAmendment.versionNumber : 1;

  // 1. Check ProjectBillingPlan
  const billingPlan = project.ProjectBillingPlans[0];
  if (billingPlan) {
    const contractAmount = latestAmendment ? latestAmendment.newContractAmount : billingPlan.contractAmountSnapshot;
    return {
      sourceType: "BILLING_PLAN",
      sourceId: billingPlan.id,
      sourceVersion: version,
      contractAmount,
      plannedEndDate: project.endDate,
      agreementId: billingPlan.agreementId,
      serviceSaleId: billingPlan.serviceSaleId,
      billingPlanId: billingPlan.id
    };
  }

  // 2. Check Agreement
  const agreement = await db.agreement.findFirst({
    where: { organizationId, ProjectBillingPlans: { some: { projectId } } }
  });

  if (agreement) {
    const contractAmount = latestAmendment ? latestAmendment.newContractAmount : agreement.contractValue;
    return {
      sourceType: "AGREEMENT",
      sourceId: agreement.id,
      sourceVersion: version,
      contractAmount,
      plannedEndDate: agreement.endDate || project.endDate,
      agreementId: agreement.id,
      serviceSaleId: null,
      billingPlanId: null
    };
  }

  // 3. Fallback: Project.budget ONLY when no formal commercial source exists
  const contractAmount = latestAmendment ? latestAmendment.newContractAmount : (project.budget || new Decimal(0));
  return {
    sourceType: "PROJECT_BUDGET",
    sourceId: project.id,
    sourceVersion: version,
    contractAmount,
    plannedEndDate: project.endDate,
    agreementId: null,
    serviceSaleId: null,
    billingPlanId: null
  };
}

/**
 * Calculates reduction eligibility ensuring reduction <= remaining eligible uninvoiced authority.
 */
export async function calculateCommercialReductionEligibility(
  projectId: string,
  organizationId: string,
  requestedReduction: Decimal,
  billingPlanId?: string | null,
  client?: DbClient
): Promise<CommercialReductionEligibility> {
  const db = client || prisma;

  const baseline = await resolveCommercialBaselineAuthority(projectId, organizationId, db);
  const canonicalContractAmount = baseline.contractAmount;

  const invoicedAggregate = await db.projectBillingMilestone.aggregate({
    where: { projectId, organizationId, invoicedAt: { not: null } },
    _sum: { calculatedAmount: true }
  });

  const invoicedAmount = invoicedAggregate._sum.calculatedAmount || new Decimal(0);
  const eligibleUninvoicedAmount = Decimal.max(new Decimal(0), canonicalContractAmount.sub(invoicedAmount));
  const absReduction = requestedReduction.abs();
  const revisedContractAmount = canonicalContractAmount.sub(absReduction);

  if (absReduction.gt(eligibleUninvoicedAmount)) {
    return {
      isEligible: false,
      canonicalContractAmount,
      invoicedAmount,
      eligibleUninvoicedAmount,
      requestedReduction: absReduction,
      revisedContractAmount,
      reason: `Requested reduction of ${absReduction} exceeds remaining eligible uninvoiced authority (${eligibleUninvoicedAmount}). Cannot invalidate already-invoiced historical authority (${invoicedAmount}).`
    };
  }

  if (revisedContractAmount.lt(invoicedAmount)) {
    return {
      isEligible: false,
      canonicalContractAmount,
      invoicedAmount,
      eligibleUninvoicedAmount,
      requestedReduction: absReduction,
      revisedContractAmount,
      reason: `Revised contract amount (${revisedContractAmount}) would fall below already-invoiced amount (${invoicedAmount}).`
    };
  }

  return {
    isEligible: true,
    canonicalContractAmount,
    invoicedAmount,
    eligibleUninvoicedAmount,
    requestedReduction: absReduction,
    revisedContractAmount
  };
}

/**
 * Server-side calculation of revised contract amount using Decimal arithmetic.
 */
export function calculateRevisedContractAmount(
  baselineAmount: Decimal,
  commercialImpactAmount: Decimal
): Decimal {
  const base = new Decimal(baselineAmount.toString());
  const impact = new Decimal(commercialImpactAmount.toString());
  return base.add(impact);
}

/**
 * Checks material staleness between ChangeRequest baseline snapshot and current live commercial state.
 */
export async function checkMaterialStaleness(
  changeRequestId: string,
  organizationId: string,
  client?: DbClient
): Promise<MaterialStalenessCheckResult> {
  const db = client || prisma;

  const cr = await db.changeRequest.findFirst({
    where: { id: changeRequestId, organizationId },
    select: {
      id: true,
      projectId: true,
      baselineVersion: true,
      baselineContractAmount: true,
      baselinePlannedEndDate: true,
      baselineSourceType: true,
      baselineSourceId: true
    }
  });

  if (!cr) {
    throw new Error(`ChangeRequest ${changeRequestId} not found.`);
  }

  const currentBaseline = await resolveCommercialBaselineAuthority(cr.projectId, organizationId, db);

  if (currentBaseline.sourceVersion !== cr.baselineVersion) {
    return {
      isStale: true,
      reason: `Project commercial version changed from V${cr.baselineVersion} to V${currentBaseline.sourceVersion}.`
    };
  }

  if (cr.baselineContractAmount && !currentBaseline.contractAmount.equals(cr.baselineContractAmount)) {
    return {
      isStale: true,
      reason: `Project contract value changed from ${cr.baselineContractAmount} to ${currentBaseline.contractAmount}.`
    };
  }

  if (cr.baselineSourceType && cr.baselineSourceType !== currentBaseline.sourceType) {
    return {
      isStale: true,
      reason: `Commercial source authority changed from ${cr.baselineSourceType} to ${currentBaseline.sourceType}.`
    };
  }

  return { isStale: false };
}

/**
 * Atomically generates next ChangeRequest sequence number (e.g. CR-2026-000001).
 */
export async function generateNextCRNumber(
  organizationId: string,
  client?: DbClient
): Promise<string> {
  const db = client || prisma;
  const year = new Date().getFullYear();

  // Find current max sequence for this year across DB to prevent global @unique collisions
  const latestCR = await db.changeRequest.findFirst({
    where: { changeRequestNumber: { startsWith: `CR-${year}-` } },
    orderBy: { changeRequestNumber: "desc" }
  });

  let minSeq = 0;
  if (latestCR) {
    const parts = latestCR.changeRequestNumber.split("-");
    const lastNum = parseInt(parts[2], 10);
    if (!isNaN(lastNum)) {
      minSeq = lastNum;
    }
  }

  const id = `seq_${organizationId}_${year}`;

  const updated: Array<{ lastSequence?: bigint | number; lastsequence?: bigint | number }> = await db.$queryRaw`
    INSERT INTO "ChangeRequestSequence" ("id", "organizationId", "year", "lastSequence", "createdAt", "updatedAt")
    VALUES (${id}, ${organizationId}, ${year}, ${minSeq + 1}, NOW(), NOW())
    ON CONFLICT ("organizationId", "year")
    DO UPDATE SET "lastSequence" = GREATEST("ChangeRequestSequence"."lastSequence" + 1, ${minSeq + 1}), "updatedAt" = NOW()
    RETURNING "lastSequence"
  `;

  const rawVal = updated[0]?.lastSequence ?? updated[0]?.lastsequence ?? (minSeq + 1);
  const seqStr = String(rawVal).padStart(6, "0");
  return `CR-${year}-${seqStr}`;
}
