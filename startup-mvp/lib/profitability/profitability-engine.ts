// Phase 17 — Project Profitability & Financial Performance Engine Core
import { CostCategory, ProfitabilityStatus } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";
import prisma from "../prisma";

export interface SourceProvenanceItem {
  sourceType: string;
  sourceId: string;
  canonicalEconomicSource: string;
  projectAppliedAmount: number;
  actualOrCommitted: "ACTUAL" | "COMMITTED";
}

export interface ProjectProfitabilityMetrics {
  projectId: string;
  organizationId: string;
  calculatedAt: Date;
  contractValue: number;
  billableAmount: number;
  invoicedAmount: number;
  recognizedRevenue: number;
  collectedAmount: number;
  actualLaborCost: number;
  actualDirectCost: number;
  totalActualCost: number;
  committedCost: number;
  projectedRemainingCost: number;
  projectedFinalCost: number;
  grossProfit: number;
  projectedProfit: number;
  grossMarginPercent: number;
  projectedMarginPercent: number;
  status: ProfitabilityStatus;
  isComplete: boolean;
  missingCostSourceCount: number;
  missingLaborCostCount: number;
  warnings: string[];
  laborCostingHoursSnapshot: number;
  healthyMarginThresholdSnapshot: number;
  atRiskMarginThresholdSnapshot: number;
  revenueBreakdown: {
    contractSource: string;
    invoicedCount: number;
    recognizedCount: number;
    collectedCount: number;
  };
  costBreakdown: {
    laborHoursApproved: number;
    laborCost: number;
    procurementCost: number;
    expenseCost: number;
    allocatedCost: number;
  };
  sourceProvenanceMap: SourceProvenanceItem[];
}

export async function calculateProjectProfitability(
  projectId: string,
  organizationId?: string,
  callerUserId?: string,
  client?: any
): Promise<ProjectProfitabilityMetrics> {
  const db = client || prisma;

  let isComplete = true;
  let missingCostSourceCount = 0;
  let missingLaborCostCount = 0;
  const warnings: string[] = [];
  const sourceProvenanceMap: SourceProvenanceItem[] = [];

  // 1. Verify Project & Tenant Boundary
  const project = await db.project.findFirst({
    where: {
      id: projectId,
      ...(organizationId ? { organizationId } : {})
    },
    include: {
      ProjectBillingPlans: {
        where: { status: "ACTIVE" },
        include: { Milestones: true }
      },
      Order: {
        include: { Quotation: true }
      }
    }
  });

  if (!project) {
    throw new Error(`Project ${projectId} not found or tenant boundary violated.`);
  }

  const effectiveOrgId = organizationId || project.organizationId;

  // Read tenant organization configuration for labor costing hours & margin policy thresholds
  const tenantOrg = await db.organization.findUnique({
    where: { id: effectiveOrgId },
    select: {
      id: true,
      laborCostingHoursPerMonth: true,
      healthyMarginThreshold: true,
      atRiskMarginThreshold: true
    }
  });

  const laborCostingHoursDecimal = tenantOrg?.laborCostingHoursPerMonth
    ? new Decimal(tenantOrg.laborCostingHoursPerMonth)
    : new Decimal(160);

  const healthyThreshold = tenantOrg?.healthyMarginThreshold ?? 15.0;
  const atRiskThreshold = tenantOrg?.atRiskMarginThreshold ?? 0.0;

  if (laborCostingHoursDecimal.lte(0)) {
    isComplete = false;
    missingCostSourceCount++;
    warnings.push(`Invalid tenant labor costing hours configuration: ${laborCostingHoursDecimal.toString()}. Must be > 0.`);
  }

  // 2. Contract Value Determination (Precedence: BillingPlan -> Agreement -> Project Budget)
  let contractValueDecimal = new Decimal(0);
  let contractSource = "Budget";

  if (project.ProjectBillingPlans.length > 0 && project.ProjectBillingPlans[0].contractAmountSnapshot && Number(project.ProjectBillingPlans[0].contractAmountSnapshot) > 0) {
    contractValueDecimal = new Decimal(project.ProjectBillingPlans[0].contractAmountSnapshot);
    contractSource = "BillingPlan";
  } else {
    // Check signed/active agreement
    const agreement = await db.agreement.findFirst({
      where: { organizationId: effectiveOrgId, status: "ACTIVE", OR: [{ quotationId: project.Order?.quotationId || "none" }] }
    });
    if (agreement && agreement.contractValue && Number(agreement.contractValue) > 0) {
      contractValueDecimal = new Decimal(agreement.contractValue);
      contractSource = "Agreement";
    } else if (project.budget && Number(project.budget) > 0) {
      contractValueDecimal = new Decimal(project.budget);
      contractSource = "ProjectBudget";
    }
  }

  // 3. Billable Amount Determination
  let billableDecimal = new Decimal(0);
  if (project.ProjectBillingPlans.length > 0) {
    const milestones = project.ProjectBillingPlans[0].Milestones;
    for (const m of milestones) {
      if (m.status === "BILLABLE" || m.status === "INVOICED") {
        billableDecimal = billableDecimal.add(new Decimal(m.calculatedAmount));
      }
    }
  }

  // 4. Invoiced Amount Determination (Line item precision, non-cancelled/non-draft)
  const invoiceItems = await db.invoiceItem.findMany({
    where: {
      projectId,
      Invoice: {
        organizationId: effectiveOrgId,
        status: { notIn: ["draft", "cancelled", "void"] }
      }
    }
  });

  let invoicedDecimal = new Decimal(0);
  for (const item of invoiceItems) {
    invoicedDecimal = invoicedDecimal.add(new Decimal(item.amount));
  }

  // If no direct invoice items, check milestone link invoices
  if (invoiceItems.length === 0 && project.ProjectBillingPlans.length > 0) {
    const milestoneIds = project.ProjectBillingPlans[0].Milestones.map((m: any) => m.id);
    const links = await db.billingMilestoneInvoiceLink.findMany({
      where: {
        organizationId: effectiveOrgId,
        billingMilestoneId: { in: milestoneIds },
        Invoice: { status: { notIn: ["draft", "cancelled", "void"] } }
      }
    });
    for (const link of links) {
      invoicedDecimal = invoicedDecimal.add(new Decimal(link.amountApplied));
    }
  }

  // 5. Recognized Revenue Determination (STRICT Canonical posted accounting truth ONLY: CR Revenue accounts)
  // NO FALLBACK to ISSUED/unposted invoices. Unposted revenue = 0.
  const postedRevenueLines = await db.journalEntryLine.findMany({
    where: {
      organizationId: effectiveOrgId,
      projectId,
      JournalEntry: { status: "posted" },
      ChartOfAccount: { type: "REVENUE" }
    }
  });

  let recognizedRevenueDecimal = new Decimal(0);
  let recognizedCount = 0;
  for (const line of postedRevenueLines) {
    const amt = new Decimal(line.creditAmount).sub(new Decimal(line.debitAmount));
    recognizedRevenueDecimal = recognizedRevenueDecimal.add(amt);
    recognizedCount++;
    sourceProvenanceMap.push({
      sourceType: "JOURNAL_LINE_REVENUE",
      sourceId: line.id,
      canonicalEconomicSource: `JournalEntry ${line.journalEntryId}`,
      projectAppliedAmount: Number(amt.toFixed(2)),
      actualOrCommitted: "ACTUAL"
    });
  }

  // 6. Collected Cash Determination (Traced to client payment journal entries on Cash/Bank accounts)
  const postedCollectionLines = await db.journalEntryLine.findMany({
    where: {
      organizationId: effectiveOrgId,
      projectId,
      JournalEntry: { status: "posted" },
      ChartOfAccount: { type: "ASSET" }
    }
  });

  let collectedDecimal = new Decimal(0);
  let collectedCount = 0;
  for (const line of postedCollectionLines) {
    const amt = new Decimal(line.debitAmount).sub(new Decimal(line.creditAmount));
    collectedDecimal = collectedDecimal.add(amt);
    collectedCount++;
    sourceProvenanceMap.push({
      sourceType: "JOURNAL_LINE_COLLECTION",
      sourceId: line.id,
      canonicalEconomicSource: `JournalEntry ${line.journalEntryId}`,
      projectAppliedAmount: Number(amt.toFixed(2)),
      actualOrCommitted: "ACTUAL"
    });
  }

  // 7. Actual Labor Cost Authority (Approved timesheets only & Tenant-configured cost rate basis)
  // NO arbitrary 500 TK/h fallback! NO hardcoded 160 divisor!
  const approvedTimesheets = await db.timesheet.findMany({
    where: {
      projectId,
      organizationId: effectiveOrgId,
      status: "APPROVED"
    },
    select: {
      id: true,
      employeeId: true,
      hours: true
    }
  });

  // Fetch active resource allocations
  const activeAllocations = await db.projectResourceAllocation.findMany({
    where: { organizationId: effectiveOrgId, projectId, status: { in: ["PLANNED", "ACTIVE"] } },
    select: {
      id: true,
      employeeId: true,
      plannedHours: true,
      allocationPercent: true
    }
  });

  const employeeIds = new Set<string>();
  for (const ts of approvedTimesheets) if (ts.employeeId) employeeIds.add(ts.employeeId);
  for (const alloc of activeAllocations) if (alloc.employeeId) employeeIds.add(alloc.employeeId);

  const employees = await db.employee.findMany({
    where: { id: { in: Array.from(employeeIds) } },
    select: { id: true, name: true, salary: true }
  });

  const employeeMap = new Map<string, { id: string; name: string; salary: any }>();
  for (const emp of employees) {
    employeeMap.set(emp.id, emp);
  }

  let laborCostDecimal = new Decimal(0);
  let laborHoursApproved = 0;
  const approvedHoursByEmployee = new Map<string, number>();

  for (const ts of approvedTimesheets) {
    const hours = Number(ts.hours);
    laborHoursApproved += hours;

    const empId = ts.employeeId;
    approvedHoursByEmployee.set(empId, (approvedHoursByEmployee.get(empId) || 0) + hours);

    const emp = employeeMap.get(empId);
    const monthlySalary = emp?.salary ? Number(emp.salary) : 0;

    if (monthlySalary > 0 && laborCostingHoursDecimal.gt(0)) {
      const monthlySalaryDecimal = new Decimal(monthlySalary);
      const hourlyRateDecimal = monthlySalaryDecimal.div(laborCostingHoursDecimal);
      const tsCost = new Decimal(hours).mul(hourlyRateDecimal);
      laborCostDecimal = laborCostDecimal.add(tsCost);
      sourceProvenanceMap.push({
        sourceType: "TIMESHEET",
        sourceId: ts.id,
        canonicalEconomicSource: `Employee ${emp?.name || empId}`,
        projectAppliedAmount: Number(tsCost.toFixed(2)),
        actualOrCommitted: "ACTUAL"
      });
    } else {
      missingLaborCostCount++;
      isComplete = false;
      warnings.push(`Employee ${emp?.name || empId} has no authoritative salary or cost rate basis.`);
    }
  }

  // 8. Actual Direct Cost (Procurement, Expenses, CostAllocations) with Deduplication
  const purchaseItems = await db.purchaseItem.findMany({
    where: {
      projectId
    },
    select: {
      id: true,
      amount: true,
      purchaseId: true
    }
  });

  let procurementCostDecimal = new Decimal(0);
  for (const item of purchaseItems) {
    const amt = new Decimal(item.amount);
    procurementCostDecimal = procurementCostDecimal.add(amt);
    sourceProvenanceMap.push({
      sourceType: "PURCHASE_ITEM",
      sourceId: item.id,
      canonicalEconomicSource: `Purchase ${item.purchaseId}`,
      projectAppliedAmount: Number(amt.toFixed(2)),
      actualOrCommitted: "ACTUAL"
    });
  }

  // Expense lines from posted journal entries (EXPENSE accounts)
  const expenseJournalLines = await db.journalEntryLine.findMany({
    where: {
      organizationId: effectiveOrgId,
      projectId,
      JournalEntry: { status: "posted" },
      ChartOfAccount: { type: "EXPENSE" }
    },
    select: {
      id: true,
      journalEntryId: true,
      debitAmount: true,
      creditAmount: true
    }
  });

  let expenseCostDecimal = new Decimal(0);
  for (const line of expenseJournalLines) {
    const amt = new Decimal(line.debitAmount).sub(new Decimal(line.creditAmount));
    expenseCostDecimal = expenseCostDecimal.add(amt);
    sourceProvenanceMap.push({
      sourceType: "JOURNAL_LINE_EXPENSE",
      sourceId: line.id,
      canonicalEconomicSource: `JournalEntry ${line.journalEntryId}`,
      projectAppliedAmount: Number(amt.toFixed(2)),
      actualOrCommitted: "ACTUAL"
    });
  }

  // Custom Analytical Cost Allocations
  const costAllocations = await db.projectCostAllocation.findMany({
    where: { organizationId: effectiveOrgId, projectId },
    select: {
      id: true,
      sourceType: true,
      sourceId: true,
      amount: true
    }
  });

  let allocatedCostDecimal = new Decimal(0);
  for (const alloc of costAllocations) {
    const isStandalone = alloc.sourceType === "MANUAL" || alloc.sourceType === "MANUAL_ANALYTICAL";
    if (isStandalone) {
      const amt = new Decimal(alloc.amount);
      allocatedCostDecimal = allocatedCostDecimal.add(amt);
      sourceProvenanceMap.push({
        sourceType: "COST_ALLOCATION",
        sourceId: alloc.id,
        canonicalEconomicSource: `Manual Allocation ${alloc.id}`,
        projectAppliedAmount: Number(amt.toFixed(2)),
        actualOrCommitted: "ACTUAL"
      });
    } else {
      sourceProvenanceMap.push({
        sourceType: "COST_ALLOCATION_REF",
        sourceId: alloc.id,
        canonicalEconomicSource: `Attribution ${alloc.sourceType}:${alloc.sourceId}`,
        projectAppliedAmount: Number(new Decimal(alloc.amount).toFixed(2)),
        actualOrCommitted: "ACTUAL"
      });
    }
  }

  const actualDirectCostDecimal = procurementCostDecimal.add(expenseCostDecimal).add(allocatedCostDecimal);
  const totalActualCostDecimal = laborCostDecimal.add(actualDirectCostDecimal);

  // 9. Committed & Projected Costs (With Actual-vs-Committed Transition using same tenant rate basis)
  let committedLaborDecimal = new Decimal(0);

  for (const alloc of activeAllocations) {
    const planned = alloc.plannedHours || 0;
    const consumed = approvedHoursByEmployee.get(alloc.employeeId) || 0;
    const remainingHours = Math.max(0, planned - consumed);

    if (remainingHours > 0) {
      const emp = employeeMap.get(alloc.employeeId);
      const monthlySalary = emp?.salary ? Number(emp.salary) : 0;
      if (monthlySalary > 0 && laborCostingHoursDecimal.gt(0)) {
        const monthlySalaryDecimal = new Decimal(monthlySalary);
        const hourlyRateDecimal = monthlySalaryDecimal.div(laborCostingHoursDecimal);
        const commAmt = new Decimal(remainingHours).mul(hourlyRateDecimal);
        committedLaborDecimal = committedLaborDecimal.add(commAmt);
        sourceProvenanceMap.push({
          sourceType: "RESOURCE_ALLOCATION_COMMITMENT",
          sourceId: alloc.id,
          canonicalEconomicSource: `Allocation ${alloc.id}`,
          projectAppliedAmount: Number(commAmt.toFixed(2)),
          actualOrCommitted: "COMMITTED"
        });
      }
    }
  }

  const committedCostDecimal = committedLaborDecimal;
  const projectedRemainingCostDecimal = committedCostDecimal;
  const projectedFinalCostDecimal = totalActualCostDecimal.add(projectedRemainingCostDecimal);

  // 10. Gross Profit & Margins
  const grossProfitDecimal = recognizedRevenueDecimal.sub(totalActualCostDecimal);
  const projectedProfitDecimal = contractValueDecimal.sub(projectedFinalCostDecimal);

  const grossMarginPercent = recognizedRevenueDecimal.gt(0)
    ? (grossProfitDecimal.toNumber() / recognizedRevenueDecimal.toNumber()) * 100
    : 0.0;

  const projectedMarginPercent = contractValueDecimal.gt(0)
    ? (projectedProfitDecimal.toNumber() / contractValueDecimal.toNumber()) * 100
    : 0.0;

  // 11. Health Status Classification (Using Tenant-Configured Margin Policy Thresholds)
  let status: ProfitabilityStatus = ProfitabilityStatus.NOT_ENOUGH_DATA;
  if (contractValueDecimal.gt(0) || totalActualCostDecimal.gt(0) || recognizedRevenueDecimal.gt(0)) {
    if (grossMarginPercent >= healthyThreshold) {
      status = ProfitabilityStatus.HEALTHY;
    } else if (grossMarginPercent >= atRiskThreshold) {
      status = ProfitabilityStatus.AT_RISK;
    } else {
      status = ProfitabilityStatus.LOSS_MAKING;
    }
  }

  return {
    projectId,
    organizationId: effectiveOrgId,
    calculatedAt: new Date(),
    contractValue: Number(contractValueDecimal.toFixed(2)),
    billableAmount: Number(billableDecimal.toFixed(2)),
    invoicedAmount: Number(invoicedDecimal.toFixed(2)),
    recognizedRevenue: Number(recognizedRevenueDecimal.toFixed(2)),
    collectedAmount: Number(collectedDecimal.toFixed(2)),
    actualLaborCost: Number(laborCostDecimal.toFixed(2)),
    actualDirectCost: Number(actualDirectCostDecimal.toFixed(2)),
    totalActualCost: Number(totalActualCostDecimal.toFixed(2)),
    committedCost: Number(committedCostDecimal.toFixed(2)),
    projectedRemainingCost: Number(projectedRemainingCostDecimal.toFixed(2)),
    projectedFinalCost: Number(projectedFinalCostDecimal.toFixed(2)),
    grossProfit: Number(grossProfitDecimal.toFixed(2)),
    projectedProfit: Number(projectedProfitDecimal.toFixed(2)),
    grossMarginPercent: Number(grossMarginPercent.toFixed(2)),
    projectedMarginPercent: Number(projectedMarginPercent.toFixed(2)),
    status,
    isComplete,
    missingCostSourceCount,
    missingLaborCostCount,
    warnings,
    laborCostingHoursSnapshot: Number(laborCostingHoursDecimal.toFixed(2)),
    healthyMarginThresholdSnapshot: healthyThreshold,
    atRiskMarginThresholdSnapshot: atRiskThreshold,
    revenueBreakdown: {
      contractSource,
      invoicedCount: invoiceItems.length,
      recognizedCount,
      collectedCount
    },
    costBreakdown: {
      laborHoursApproved,
      laborCost: Number(laborCostDecimal.toFixed(2)),
      procurementCost: Number(procurementCostDecimal.toFixed(2)),
      expenseCost: Number(expenseCostDecimal.toFixed(2)),
      allocatedCost: Number(allocatedCostDecimal.toFixed(2))
    },
    sourceProvenanceMap
  };
}
