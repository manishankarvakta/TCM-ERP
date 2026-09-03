// Phase 20 — CEO Command Center Engine Core
import { PrismaClient, Prisma, ChangeRequestStatus, ApprovalRequestStatus, BillingMilestoneStatus } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";
import prisma from "../prisma";
import { calculateProjectProfitability } from "../profitability/profitability-engine";

type DbClient = PrismaClient | Prisma.TransactionClient;

export interface CeoThresholdSettings {
  arOverdueWarningDays: number;
  approvalAgingThresholdHours: number;
  projectMarginWarningPercent: Decimal;
  projectOverdueWarningDays: number;
  resourceUtilizationWarningPercent: Decimal;
  slaCriticalityThresholdHours: number;
  largeCrAmountThreshold: Decimal;
  cashWarningThreshold: Decimal;
}

export interface CeoFinancialScorecard {
  recognizedRevenue: Decimal;
  invoicedAmount: Decimal;
  collectedAmount: Decimal;
  accountsReceivable: Decimal;
  accountsPayable: Decimal;
  operatingExpenses: Decimal;
  cashBankBalance: Decimal;
  grossProfit: Decimal;
  grossMarginPercent: Decimal;
}

export interface CeoCommercialScorecard {
  activePipeline: Decimal;
  qualifiedOpportunitiesCount: number;
  quotedAmount: Decimal;
  signedContractValue: Decimal;
  billableAmount: Decimal;
  invoicedAmount: Decimal;
  collectedAmount: Decimal;
  remainingBillableAuthority: Decimal;
  overdueReceivables: Decimal;
  approvedUnappliedCrCount: number;
  approvedUnappliedCrValue: Decimal;
  pendingCrCount: number;
  pendingCrValue: Decimal;
}

export interface CeoProjectHealthItem {
  projectId: string;
  projectTitle: string;
  clientName: string;
  contractValue: Decimal;
  invoicedAmount: Decimal;
  recognizedRevenue: Decimal;
  projectedProfit: Decimal;
  marginPercent: Decimal;
  healthStatus: "HEALTHY" | "ATTENTION" | "AT_RISK" | "CRITICAL";
  riskReasons: string[];
  plannedEndDate: Date | null;
  completionPercent: number;
  openSlaTicketsCount: number;
  pendingApprovalsCount: number;
  unappliedCrsCount: number;
}

export interface CeoWorkforceView {
  totalActiveEmployees: number;
  totalCapacityHours: number;
  totalAllocatedHours: number;
  averageUtilizationPercent: Decimal;
  overloadedEmployeeCount: number;
  unallocatedEmployeeCount: number;
  departmentUtilization: Array<{
    departmentId: string;
    departmentName: string;
    employeeCount: number;
    allocatedHours: number;
    capacityHours: number;
    utilizationPercent: Decimal;
  }>;
}

export interface CeoDepartmentExecutionView {
  creative: { activeDeliverables: number; overdueDeliverables: number; approvedDeliverables: number };
  marketing: { activeCampaigns: number; overdueCampaigns: number; totalContentItems: number };
  development: { activeWorkstreams: number; totalBuilds: number; failedBuilds: number };
  qa: { activeTestCycles: number; totalExecutions: number; passedExecutions: number; failedExecutions: number };
}

export interface CeoApprovalQueueSummary {
  totalPendingCount: number;
  agingPendingCount: number;
  highValuePendingCount: number;
  pendingBySourceType: Record<string, number>;
}

export interface CeoSupportSlaSummary {
  openTicketsCount: number;
  criticalTicketsCount: number;
  firstResponseBreachedCount: number;
  resolutionBreachedCount: number;
  reopenedTicketsCount: number;
}

export interface CeoChangeRequestSummary {
  draftCount: number;
  submittedCount: number;
  underAnalysisCount: number;
  pendingApprovalCount: number;
  approvedUnappliedCount: number;
  appliedCount: number;
  staleCount: number;
  totalPositiveCommercialDelta: Decimal;
  totalNegativeCommercialDelta: Decimal;
}

export interface CeoAttentionItem {
  id: string;
  sourceType: "PROJECT" | "INVOICE" | "APPROVAL" | "SLA" | "CHANGE_REQUEST" | "RESOURCE" | "FINANCE";
  sourceId: string;
  title: string;
  reason: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  detectedAt: Date;
  deepLink: string;
}

export interface CeoCommandCenterData {
  organizationId: string;
  calculatedAt: Date;
  settings: CeoThresholdSettings;
  financial: CeoFinancialScorecard;
  commercial: CeoCommercialScorecard;
  portfolioHealth: CeoProjectHealthItem[];
  portfolioSummary: {
    totalProjects: number;
    healthyCount: number;
    attentionCount: number;
    atRiskCount: number;
    criticalCount: number;
  };
  workforce: CeoWorkforceView;
  departmentExecution: CeoDepartmentExecutionView;
  approvalQueue: CeoApprovalQueueSummary;
  supportSla: CeoSupportSlaSummary;
  changeRequests: CeoChangeRequestSummary;
  attentionFeed: CeoAttentionItem[];
}

/**
 * Resolves or initializes tenant threshold configuration.
 */
export async function getOrCreateCeoSettings(
  organizationId: string,
  client?: DbClient
): Promise<CeoThresholdSettings> {
  const db = client || prisma;

  let settings = await db.ceoCommandCenterSettings.findUnique({
    where: { organizationId }
  });

  if (!settings) {
    settings = await db.ceoCommandCenterSettings.create({
      data: {
        organizationId,
        arOverdueWarningDays: 30,
        approvalAgingThresholdHours: 48,
        projectMarginWarningPercent: new Decimal(20.00),
        projectOverdueWarningDays: 7,
        resourceUtilizationWarningPercent: new Decimal(90.00),
        slaCriticalityThresholdHours: 24,
        largeCrAmountThreshold: new Decimal(50000.00),
        cashWarningThreshold: new Decimal(100000.00)
      }
    });
  }

  return {
    arOverdueWarningDays: settings.arOverdueWarningDays,
    approvalAgingThresholdHours: settings.approvalAgingThresholdHours,
    projectMarginWarningPercent: settings.projectMarginWarningPercent,
    projectOverdueWarningDays: settings.projectOverdueWarningDays,
    resourceUtilizationWarningPercent: settings.resourceUtilizationWarningPercent,
    slaCriticalityThresholdHours: settings.slaCriticalityThresholdHours,
    largeCrAmountThreshold: settings.largeCrAmountThreshold,
    cashWarningThreshold: settings.cashWarningThreshold
  };
}

export function getTenantLocalDateStr(date: Date, offsetHours: number = 6): string {
  const localMs = date.getTime() + offsetHours * 60 * 60 * 1000;
  return new Date(localMs).toISOString().split("T")[0];
}

/**
 * Main CEO Command Center Data Aggregation Engine
 * Consumes canonical authority across all closed ERP modules (Phases 0–19).
 * Wraps execution in a PostgreSQL ReadCommitted transaction to guarantee read snapshot consistency.
 */
export async function getCeoCommandCenterData(
  organizationId: string,
  client?: DbClient
): Promise<CeoCommandCenterData> {
  if (!client) {
    return prisma.$transaction(async (tx) => {
      return fetchCeoDataInternal(organizationId, tx);
    }, {
      isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted
    });
  }
  return fetchCeoDataInternal(organizationId, client);
}

async function fetchCeoDataInternal(
  organizationId: string,
  db: DbClient
): Promise<CeoCommandCenterData> {
  const now = new Date();

  // 1. Fetch Tenant Settings
  const settings = await getOrCreateCeoSettings(organizationId, db);

  // 2. Compute Financial Scorecard (Canonical Accounting Authority)
  const revenueLinesAgg = await db.journalEntryLine.aggregate({
    where: {
      organizationId,
      JournalEntry: { status: "posted" },
      ChartOfAccount: { type: "REVENUE" }
    },
    _sum: { debitAmount: true, creditAmount: true }
  });
  const recognizedRevenue = (revenueLinesAgg._sum.creditAmount || new Decimal(0)).sub(revenueLinesAgg._sum.debitAmount || new Decimal(0));

  const allActiveInvoicesAgg = await db.invoice.aggregate({
    where: { organizationId, status: { in: ["POSTED", "SENT", "DRAFT"] } },
    _sum: { totalAmount: true }
  });
  const invoicedAmount = allActiveInvoicesAgg._sum.totalAmount || new Decimal(0);

  // Collected Cash (debit sum of asset accounts flagged as CashBankAccount underposted RECEIPT vouchers)
  const cashAccounts = await db.chartOfAccount.findMany({
    where: {
      organizationId,
      CashBankAccount: { isNot: null }
    },
    select: { id: true }
  });
  const cashAccountIds = cashAccounts.map(a => a.id);

  const collectionsAgg = await db.journalEntryLine.aggregate({
    where: {
      chartOfAccountId: { in: cashAccountIds },
      JournalEntry: {
        status: "posted",
        Voucher: { type: "RECEIPT" }
      }
    },
    _sum: { debitAmount: true, creditAmount: true }
  });
  const collectedAmount = (collectionsAgg._sum.debitAmount || new Decimal(0)).sub(collectionsAgg._sum.creditAmount || new Decimal(0));

  // Accounts Receivable (debit - credit of accounts receivable control account and client child accounts)
  const arControlAccount = await db.chartOfAccount.findFirst({
    where: {
      organizationId,
      name: { contains: "Accounts Receivable", mode: "insensitive" },
      status: "active"
    }
  });
  let accountsReceivable = new Decimal(0);
  if (arControlAccount) {
    const clientAccounts = await db.chartOfAccount.findMany({
      where: {
        organizationId,
        parentId: arControlAccount.id,
        status: "active"
      },
      select: { id: true }
    });
    const arAccountIds = [arControlAccount.id, ...clientAccounts.map(c => c.id)];
    const arLinesAgg = await db.journalEntryLine.aggregate({
      where: {
        organizationId,
        chartOfAccountId: { in: arAccountIds },
        JournalEntry: { status: "posted" }
      },
      _sum: { debitAmount: true, creditAmount: true }
    });
    accountsReceivable = Decimal.max(
      new Decimal(0),
      (arLinesAgg._sum.debitAmount || new Decimal(0)).sub(arLinesAgg._sum.creditAmount || new Decimal(0))
    );
  }

  // Accounts Payable (credit - debit of accounts payable control account and supplier child accounts)
  const apControlAccount = await db.chartOfAccount.findFirst({
    where: {
      organizationId,
      name: { contains: "Accounts Payable", mode: "insensitive" },
      status: "active"
    }
  });
  let accountsPayable = new Decimal(0);
  if (apControlAccount) {
    const supplierAccounts = await db.chartOfAccount.findMany({
      where: {
        organizationId,
        parentId: apControlAccount.id,
        status: "active"
      },
      select: { id: true }
    });
    const apAccountIds = [apControlAccount.id, ...supplierAccounts.map(s => s.id)];
    const apLinesAgg = await db.journalEntryLine.aggregate({
      where: {
        organizationId,
        chartOfAccountId: { in: apAccountIds },
        JournalEntry: { status: "posted" }
      },
      _sum: { debitAmount: true, creditAmount: true }
    });
    accountsPayable = Decimal.max(
      new Decimal(0),
      (apLinesAgg._sum.creditAmount || new Decimal(0)).sub(apLinesAgg._sum.debitAmount || new Decimal(0))
    );
  }

  // Cash / Bank Balances (debits - credits of cash/bank asset accounts in posted ledger)
  const cashAccountsAgg = await db.journalEntryLine.aggregate({
    where: {
      chartOfAccountId: { in: cashAccountIds },
      JournalEntry: { status: "posted" }
    },
    _sum: { debitAmount: true, creditAmount: true }
  });
  const cashBankBalance = Decimal.max(
    new Decimal(0),
    (cashAccountsAgg._sum.debitAmount || new Decimal(0)).sub(cashAccountsAgg._sum.creditAmount || new Decimal(0))
  );

  // Operating Expenses (debits - credits of type EXPENSE in posted ledger)
  const expenseLinesAgg = await db.journalEntryLine.aggregate({
    where: {
      ChartOfAccount: { type: "EXPENSE", organizationId },
      JournalEntry: { status: "posted" }
    },
    _sum: { debitAmount: true, creditAmount: true }
  });
  const operatingExpenses = (expenseLinesAgg._sum.debitAmount || new Decimal(0)).sub(expenseLinesAgg._sum.creditAmount || new Decimal(0));

  const grossProfit = recognizedRevenue.sub(operatingExpenses);
  const grossMarginPercent = recognizedRevenue.gt(0)
    ? grossProfit.div(recognizedRevenue).mul(100)
    : new Decimal(0);

  const financial: CeoFinancialScorecard = {
    recognizedRevenue,
    invoicedAmount,
    collectedAmount,
    accountsReceivable,
    accountsPayable,
    operatingExpenses,
    cashBankBalance,
    grossProfit,
    grossMarginPercent
  };

  // 3. Compute Commercial Scorecard
  const pipelineAgg = await db.opportunity.aggregate({
    where: { organizationId, stage: { notIn: ["WON", "LOST"] } },
    _sum: { value: true },
    _count: { id: true }
  });
  const activePipeline = pipelineAgg._sum.value || new Decimal(0);

  const qualifiedOppsCount = await db.opportunity.count({
    where: { organizationId, stage: "QUALIFIED" }
  });

  const quotationsAgg = await db.quotation.aggregate({
    where: { organizationId, status: { in: ["SENT", "APPROVED", "ACCEPTED"] } },
    _sum: { grandTotal: true }
  });
  const quotedAmount = quotationsAgg._sum.grandTotal || new Decimal(0);

  const billingPlansAgg = await db.projectBillingPlan.aggregate({
    where: { organizationId, status: "ACTIVE" },
    _sum: { contractAmountSnapshot: true }
  });
  const billableAmount = billingPlansAgg._sum.contractAmountSnapshot || new Decimal(0);
  const signedContractValue = billableAmount;
  const remainingBillableAuthority = Decimal.max(new Decimal(0), billableAmount.sub(invoicedAmount));

  // Overdue Receivables
  const overdueInvoicesAgg = await db.invoice.aggregate({
    where: { organizationId, status: { in: ["POSTED", "SENT"] }, date: { lt: now } },
    _sum: { totalAmount: true }
  });
  const overdueReceivables = overdueInvoicesAgg._sum.totalAmount || new Decimal(0);

  // Unapplied & Pending Change Requests
  const unappliedCrsAgg = await db.changeRequest.aggregate({
    where: { organizationId, status: ChangeRequestStatus.APPROVED },
    _sum: { commercialImpactAmount: true },
    _count: { id: true }
  });
  const approvedUnappliedCrCount = unappliedCrsAgg._count.id || 0;
  const approvedUnappliedCrValue = unappliedCrsAgg._sum.commercialImpactAmount || new Decimal(0);

  const pendingCrsAgg = await db.changeRequest.aggregate({
    where: { organizationId, status: { in: [ChangeRequestStatus.SUBMITTED, ChangeRequestStatus.UNDER_ANALYSIS, ChangeRequestStatus.PENDING_APPROVAL] } },
    _sum: { commercialImpactAmount: true },
    _count: { id: true }
  });
  const pendingCrCount = pendingCrsAgg._count.id || 0;
  const pendingCrValue = pendingCrsAgg._sum.commercialImpactAmount || new Decimal(0);

  const commercial: CeoCommercialScorecard = {
    activePipeline,
    qualifiedOpportunitiesCount: qualifiedOppsCount,
    quotedAmount,
    signedContractValue,
    billableAmount,
    invoicedAmount,
    collectedAmount,
    remainingBillableAuthority,
    overdueReceivables,
    approvedUnappliedCrCount,
    approvedUnappliedCrValue,
    pendingCrCount,
    pendingCrValue
  };

  // 4. Compute Project Portfolio Health (Phase 17 & Delivery Integration)
  const projects = await db.project.findMany({
    where: { organizationId, status: { in: ["ACTIVE", "PLANNING", "ON_HOLD"] } },
    include: {
      Client: { select: { name: true } },
      ProjectBillingPlans: { where: { status: "ACTIVE" } },
      ChangeRequests: { where: { status: { in: ["APPROVED", "SUBMITTED", "PENDING_APPROVAL"] } } },
      SupportTickets: { where: { status: { notIn: ["RESOLVED", "CLOSED"] } } }
    }
  });

  const portfolioHealth: CeoProjectHealthItem[] = [];
  let healthyCount = 0;
  let attentionCount = 0;
  let atRiskCount = 0;
  let criticalCount = 0;

  for (const proj of projects) {
    const riskReasons: string[] = [];

    // Profitability via Phase 17 Canonical Helper
    let profMetrics;
    try {
      profMetrics = await calculateProjectProfitability(proj.id, organizationId, undefined, db);
    } catch {
      profMetrics = null;
    }

    const projContractVal = new Decimal(profMetrics?.contractValue || 0);
    const projInvoiced = new Decimal(profMetrics?.invoicedAmount || 0);
    const projRecognized = new Decimal(profMetrics?.recognizedRevenue || 0);
    const projProjectedProfit = new Decimal(profMetrics?.projectedProfit || 0);
    const projMarginPct = new Decimal(profMetrics?.projectedMarginPercent || 0);

    const openSlaTicketsCount = proj.SupportTickets.length;
    const pendingApprovalsCount = await db.approvalRequest.count({
      where: { organizationId, status: { in: ["PENDING", "IN_PROGRESS"] }, OR: [{ sourceId: proj.id }, { ChangeRequests: { some: { projectId: proj.id } } }] }
    });
    const unappliedCrsCount = proj.ChangeRequests.length;

    // Health Evaluation Logic
    let healthStatus: "HEALTHY" | "ATTENTION" | "AT_RISK" | "CRITICAL" = "HEALTHY";

    if (proj.endDate && proj.endDate < now) {
      riskReasons.push(`Overdue delivery by ${Math.ceil((now.getTime() - proj.endDate.getTime()) / 86400000)} days`);
      healthStatus = "CRITICAL";
    }

    if (projMarginPct.lt(0)) {
      riskReasons.push(`Projected loss (Margin: ${projMarginPct.toFixed(2)}%)`);
      healthStatus = "CRITICAL";
    }

    if (openSlaTicketsCount > 0) {
      riskReasons.push(`${openSlaTicketsCount} open support tickets`);
      if (healthStatus !== "CRITICAL") healthStatus = "AT_RISK";
    }

    if (projMarginPct.gte(0) && projMarginPct.lt(settings.projectMarginWarningPercent)) {
      riskReasons.push(`Low margin warning (${projMarginPct.toFixed(2)}% < ${settings.projectMarginWarningPercent}%)`);
      if (healthStatus !== "CRITICAL") healthStatus = "AT_RISK";
    }

    if (pendingApprovalsCount > 0) {
      riskReasons.push(`${pendingApprovalsCount} pending approvals`);
      if (healthStatus === "HEALTHY") healthStatus = "ATTENTION";
    }

    if (unappliedCrsCount > 0) {
      riskReasons.push(`${unappliedCrsCount} unapplied/pending Change Requests`);
      if (healthStatus === "HEALTHY") healthStatus = "ATTENTION";
    }

    if (healthStatus === "HEALTHY") healthyCount++;
    else if (healthStatus === "ATTENTION") attentionCount++;
    else if (healthStatus === "AT_RISK") atRiskCount++;
    else if (healthStatus === "CRITICAL") criticalCount++;

    portfolioHealth.push({
      projectId: proj.id,
      projectTitle: proj.title,
      clientName: proj.Client?.name || "N/A",
      contractValue: projContractVal,
      invoicedAmount: projInvoiced,
      recognizedRevenue: projRecognized,
      projectedProfit: projProjectedProfit,
      marginPercent: projMarginPct,
      healthStatus,
      riskReasons,
      plannedEndDate: proj.endDate,
      completionPercent: 50,
      openSlaTicketsCount,
      pendingApprovalsCount,
      unappliedCrsCount
    });
  }

  // 5. Compute Workforce View
  const employees = await db.employee.findMany({
    where: { organizationId, status: "ACTIVE" },
    include: { DepartmentRef: { select: { id: true, name: true } } }
  });
  const totalActiveEmployees = employees.length;
  const totalCapacityHours = totalActiveEmployees * 160;

  const allocationsAgg = await db.projectResourceAllocation.aggregate({
    where: { organizationId, status: "ACTIVE" },
    _sum: { plannedHours: true }
  });
  const totalAllocatedHours = allocationsAgg._sum.plannedHours || 0;
  const averageUtilizationPercent = totalCapacityHours > 0
    ? new Decimal((totalAllocatedHours / totalCapacityHours) * 100)
    : new Decimal(0);

  // Group by department
  const deptMap: Record<string, { id: string; name: string; empCount: number; allocated: number }> = {};
  for (const emp of employees) {
    const dId = emp.departmentId || "unassigned";
    const dName = emp.DepartmentRef?.name || "Unassigned";
    if (!deptMap[dId]) {
      deptMap[dId] = { id: dId, name: dName, empCount: 0, allocated: 0 };
    }
    deptMap[dId].empCount++;
  }

  const deptList = Object.values(deptMap).map(d => {
    const cap = d.empCount * 160;
    const util = cap > 0 ? new Decimal((d.allocated / cap) * 100) : new Decimal(0);
    return {
      departmentId: d.id,
      departmentName: d.name,
      employeeCount: d.empCount,
      allocatedHours: d.allocated,
      capacityHours: cap,
      utilizationPercent: util
    };
  });

  const workforce: CeoWorkforceView = {
    totalActiveEmployees,
    totalCapacityHours,
    totalAllocatedHours,
    averageUtilizationPercent,
    overloadedEmployeeCount: 0,
    unallocatedEmployeeCount: Math.max(0, totalActiveEmployees - Math.ceil(totalAllocatedHours / 160)),
    departmentUtilization: deptList
  };

  // 6. Compute Department Execution View
  const creative = {
    activeDeliverables: await db.projectCreativeDeliverable.count({ where: { organizationId, status: { not: "APPROVED" } } }),
    overdueDeliverables: 0,
    approvedDeliverables: await db.projectCreativeDeliverable.count({ where: { organizationId, status: "APPROVED" } })
  };

  const marketing = {
    activeCampaigns: await db.projectMarketingCampaign.count({ where: { organizationId, status: "ACTIVE" } }),
    overdueCampaigns: 0,
    totalContentItems: await db.marketingContentItem.count({ where: { organizationId } })
  };

  const development = {
    activeWorkstreams: await db.projectDevelopmentWorkstream.count({ where: { organizationId, status: "IN_PROGRESS" } }),
    totalBuilds: await db.developmentBuildRecord.count({ where: { organizationId } }),
    failedBuilds: await db.developmentBuildRecord.count({ where: { organizationId, status: "FAILED" } })
  };

  const qa = {
    activeTestCycles: await db.projectQATestCycle.count({ where: { organizationId, status: "IN_PROGRESS" } }),
    totalExecutions: await db.qATestExecution.count({ where: { organizationId } }),
    passedExecutions: await db.qATestExecution.count({ where: { organizationId, status: "PASSED" } }),
    failedExecutions: await db.qATestExecution.count({ where: { organizationId, status: "FAILED" } })
  };

  const departmentExecution: CeoDepartmentExecutionView = {
    creative,
    marketing,
    development,
    qa
  };

  // 7. Approval Command Queue
  const pendingApprovals = await db.approvalRequest.findMany({
    where: { organizationId, status: { in: [ApprovalRequestStatus.PENDING, ApprovalRequestStatus.IN_PROGRESS] } }
  });

  const agingThresholdMs = settings.approvalAgingThresholdHours * 3600000;
  let agingPendingCount = 0;
  let highValuePendingCount = 0;
  const pendingBySourceType: Record<string, number> = {};

  for (const app of pendingApprovals) {
    const age = now.getTime() - app.createdAt.getTime();
    if (age > agingThresholdMs) agingPendingCount++;
    const srcType = app.sourceType || "OTHER";
    pendingBySourceType[srcType] = (pendingBySourceType[srcType] || 0) + 1;
  }

  const approvalQueue: CeoApprovalQueueSummary = {
    totalPendingCount: pendingApprovals.length,
    agingPendingCount,
    highValuePendingCount,
    pendingBySourceType
  };

  // 8. Support / SLA Summary
  const openTickets = await db.supportTicket.findMany({
    where: { organizationId, status: { notIn: ["RESOLVED", "CLOSED"] } },
    include: { SupportTicketSLA: true }
  });

  let criticalTicketsCount = 0;
  let firstResponseBreachedCount = 0;
  let resolutionBreachedCount = 0;

  for (const t of openTickets) {
    if (t.priority === "CRITICAL" || t.priority === "HIGH") criticalTicketsCount++;
    if (t.SupportTicketSLA?.firstResponseStatus === "FIRST_RESPONSE_BREACHED" || (t.SupportTicketSLA?.firstResponseDueAt && t.SupportTicketSLA.firstResponseDueAt < now && !t.SupportTicketSLA.firstRespondedAt)) firstResponseBreachedCount++;
    if (t.SupportTicketSLA?.resolutionStatus === "RESOLUTION_BREACHED" || (t.SupportTicketSLA?.resolutionDueAt && t.SupportTicketSLA.resolutionDueAt < now && !t.SupportTicketSLA.resolvedAt)) resolutionBreachedCount++;
  }

  const supportSla: CeoSupportSlaSummary = {
    openTicketsCount: openTickets.length,
    criticalTicketsCount,
    firstResponseBreachedCount,
    resolutionBreachedCount,
    reopenedTicketsCount: await db.supportTicket.count({ where: { organizationId, status: "WAITING_CLIENT" } })
  };

  // 9. Change Request Summary
  const crGroup = await db.changeRequest.groupBy({
    by: ["status"],
    where: { organizationId },
    _count: { id: true },
    _sum: { commercialImpactAmount: true }
  });

  let draftCount = 0, submittedCount = 0, underAnalysisCount = 0, pendingApprovalCount = 0, approvedUnappliedCount = 0, appliedCount = 0, staleCount = 0;
  let totalPositiveCommercialDelta = new Decimal(0);
  let totalNegativeCommercialDelta = new Decimal(0);

  for (const g of crGroup) {
    const cnt = g._count.id;
    const val = g._sum.commercialImpactAmount || new Decimal(0);
    if (g.status === ChangeRequestStatus.DRAFT) draftCount = cnt;
    else if (g.status === ChangeRequestStatus.SUBMITTED) submittedCount = cnt;
    else if (g.status === ChangeRequestStatus.UNDER_ANALYSIS) underAnalysisCount = cnt;
    else if (g.status === ChangeRequestStatus.PENDING_APPROVAL) pendingApprovalCount = cnt;
    else if (g.status === ChangeRequestStatus.APPROVED) approvedUnappliedCount = cnt;
    else if (g.status === ChangeRequestStatus.APPLIED) appliedCount = cnt;

    if (val.gt(0)) totalPositiveCommercialDelta = totalPositiveCommercialDelta.add(val);
    else if (val.lt(0)) totalNegativeCommercialDelta = totalNegativeCommercialDelta.add(val);
  }

  staleCount = await db.changeRequest.count({ where: { organizationId, isStale: true } });

  const changeRequests: CeoChangeRequestSummary = {
    draftCount,
    submittedCount,
    underAnalysisCount,
    pendingApprovalCount,
    approvedUnappliedCount,
    appliedCount,
    staleCount,
    totalPositiveCommercialDelta,
    totalNegativeCommercialDelta
  };

  // 10. Compute Executive Attention Feed & Idempotent Executive Alerts
  const attentionFeed: CeoAttentionItem[] = [];

  // Overdue Receivables Warning
  if (overdueReceivables.gt(0)) {
    attentionFeed.push({
      id: `att_ar_${organizationId}`,
      sourceType: "FINANCE",
      sourceId: organizationId,
      title: "Overdue Accounts Receivable",
      reason: `TK ${overdueReceivables.toFixed(2)} in receivables past due date.`,
      severity: overdueReceivables.gt(settings.largeCrAmountThreshold) ? "CRITICAL" : "HIGH",
      detectedAt: now,
      deepLink: "/dashboard/accounts/accounts-receivable"
    });
  }

  // Critical Projects
  for (const p of portfolioHealth) {
    if (p.healthStatus === "CRITICAL" || p.healthStatus === "AT_RISK") {
      attentionFeed.push({
        id: `att_proj_${p.projectId}`,
        sourceType: "PROJECT",
        sourceId: p.projectId,
        title: `Project ${p.healthStatus}: ${p.projectTitle}`,
        reason: p.riskReasons.join("; "),
        severity: p.healthStatus === "CRITICAL" ? "CRITICAL" : "HIGH",
        detectedAt: now,
        deepLink: `/dashboard/projects/${p.projectId}`
      });
    }
  }

  // Aging Approvals
  if (agingPendingCount > 0) {
    attentionFeed.push({
      id: `att_app_${organizationId}`,
      sourceType: "APPROVAL",
      sourceId: organizationId,
      title: "Aging Approvals Awaiting Action",
      reason: `${agingPendingCount} approval requests aged past ${settings.approvalAgingThresholdHours}h threshold.`,
      severity: "HIGH",
      detectedAt: now,
      deepLink: "/dashboard/approvals"
    });
  }

  // SLA Breaches
  if (firstResponseBreachedCount + resolutionBreachedCount > 0) {
    attentionFeed.push({
      id: `att_sla_${organizationId}`,
      sourceType: "SLA",
      sourceId: organizationId,
      title: "Support SLA Breaches Detected",
      reason: `${firstResponseBreachedCount} response breaches, ${resolutionBreachedCount} resolution breaches.`,
      severity: "CRITICAL",
      detectedAt: now,
      deepLink: "/dashboard/support"
    });
  }

  // Stale / Approved Unapplied CRs
  if (approvedUnappliedCrCount > 0) {
    attentionFeed.push({
      id: `att_cr_${organizationId}`,
      sourceType: "CHANGE_REQUEST",
      sourceId: organizationId,
      title: "Approved Unapplied Change Requests",
      reason: `${approvedUnappliedCrCount} approved CRs valued at TK ${approvedUnappliedCrValue.toFixed(2)} pending application.`,
      severity: "MEDIUM",
      detectedAt: now,
      deepLink: "/dashboard/projects"
    });
  }

  // Persist / Sync Idempotent Executive Alerts (Requirement 26)
  for (const att of attentionFeed) {
    const cycle = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
    const idempotencyKey = `CEO_ALERT:${att.sourceType}:${att.sourceId}:${att.severity}:${cycle}`;

    try {
      await db.ceoExecutiveAlert.create({
        data: {
          organizationId,
          sourceType: att.sourceType,
          sourceId: att.sourceId,
          idempotencyKey,
          severity: att.severity,
          reason: att.reason,
          details: { title: att.title, deepLink: att.deepLink }
        }
      });
    } catch {
      // Idempotent duplicate ignore
    }
  }

  return {
    organizationId,
    calculatedAt: now,
    settings,
    financial,
    commercial,
    portfolioHealth,
    portfolioSummary: {
      totalProjects: projects.length,
      healthyCount,
      attentionCount,
      atRiskCount,
      criticalCount
    },
    workforce,
    departmentExecution,
    approvalQueue,
    supportSla,
    changeRequests,
    attentionFeed
  };
}

/**
 * Idempotently Generates Daily CEO KPI Snapshot
 */
export async function generateCeoDailySnapshot(
  organizationId: string,
  snapshotDate?: Date,
  client?: DbClient
) {
  const db = client || prisma;
  const date = snapshotDate || new Date();
  const dateStr = getTenantLocalDateStr(date); // Tenant local date YYYY-MM-DD
  const normalizedDate = new Date(`${dateStr}T00:00:00.000Z`);

  const data = await getCeoCommandCenterData(organizationId, db);

  const snapshot = await db.ceoKpiSnapshot.upsert({
    where: {
      organizationId_snapshotDate: {
        organizationId,
        snapshotDate: normalizedDate
      }
    },
    create: {
      organizationId,
      snapshotDate: normalizedDate,
      recognizedRevenue: data.financial.recognizedRevenue,
      invoicedAmount: data.financial.invoicedAmount,
      collectedAmount: data.financial.collectedAmount,
      accountsReceivable: data.financial.accountsReceivable,
      accountsPayable: data.financial.accountsPayable,
      cashBankBalance: data.financial.cashBankBalance,
      activeProjectCount: data.portfolioSummary.totalProjects,
      atRiskProjectCount: data.portfolioSummary.atRiskCount,
      criticalProjectCount: data.portfolioSummary.criticalCount,
      pendingApprovalCount: data.approvalQueue.totalPendingCount,
      openSlaBreachCount: data.supportSla.firstResponseBreachedCount + data.supportSla.resolutionBreachedCount
    },
    update: {
      recognizedRevenue: data.financial.recognizedRevenue,
      invoicedAmount: data.financial.invoicedAmount,
      collectedAmount: data.financial.collectedAmount,
      accountsReceivable: data.financial.accountsReceivable,
      accountsPayable: data.financial.accountsPayable,
      cashBankBalance: data.financial.cashBankBalance,
      activeProjectCount: data.portfolioSummary.totalProjects,
      atRiskProjectCount: data.portfolioSummary.atRiskCount,
      criticalProjectCount: data.portfolioSummary.criticalCount,
      pendingApprovalCount: data.approvalQueue.totalPendingCount,
      openSlaBreachCount: data.supportSla.firstResponseBreachedCount + data.supportSla.resolutionBreachedCount
    }
  });

  return snapshot;
}
