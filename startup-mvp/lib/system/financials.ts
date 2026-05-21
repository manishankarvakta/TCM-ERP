import { prisma } from "../prisma";

/**
 * Project Financial Management Engine
 * Calculates P&L, Burn Rate, and Costs purely through non-destructive Tagging.
 */

export async function getProjectRevenue(projectId: string): Promise<number> {
  const invoices = await prisma.invoiceItem.aggregate({
    where: { projectId },
    _sum: { amount: true }
  });
  return Number(invoices._sum.amount || 0);
}

export async function getProjectMaterialCost(projectId: string): Promise<number> {
  const purchases = await prisma.purchaseItem.aggregate({
    where: { projectId },
    _sum: { amount: true }
  });
  return Number(purchases._sum.amount || 0);
}

export async function getProjectDirectLaborCost(projectId: string): Promise<number> {
  // Direct Tagging: If a PayrollItem was explicitly tagged to a single project
  const directPayroll = await prisma.payrollItem.aggregate({
    where: { projectId },
    _sum: { netPay: true }
  });
  return Number(directPayroll._sum.netPay || 0);
}

/**
 * Advanced Dynamic Labor Cost Allocation
 * This distributes a single monthly PayrollItem cost proportionally across
 * multiple projects based on the Employee's logged Timesheets for that month.
 */
export async function calculateDynamicLaborCost(projectId: string): Promise<number> {
  let totalAllocatedLaborCost = 0;

  // 1. Get all timesheets logged against this project
  const projectTimesheets = await prisma.timesheet.findMany({
    where: { projectId },
    select: { employeeId: true, hours: true, date: true }
  });

  if (!projectTimesheets.length) return await getProjectDirectLaborCost(projectId);

  // Group hours by Employee & Month/Year to cross-reference with Payroll
  const groupedByEmpMonth: Record<string, { totalProjHours: number, date: Date }> = {};

  projectTimesheets.forEach(ts => {
    const monthKey = `${ts.employeeId}-${ts.date.getFullYear()}-${ts.date.getMonth()}`;
    if (!groupedByEmpMonth[monthKey]) {
      groupedByEmpMonth[monthKey] = { totalProjHours: 0, date: ts.date };
    }
    groupedByEmpMonth[monthKey].totalProjHours += Number(ts.hours);
  });

  // 2. Cross-reference against Payroll and Total Timesheets for that month
  for (const [key, data] of Object.entries(groupedByEmpMonth)) {
    const [employeeId] = key.split('-');
    
    // Total hours worked by employee this month globally
    const globalTimesheets = await prisma.timesheet.aggregate({
      where: {
        employeeId,
        date: {
          gte: new Date(data.date.getFullYear(), data.date.getMonth(), 1),
          lt: new Date(data.date.getFullYear(), data.date.getMonth() + 1, 1)
        }
      },
      _sum: { hours: true }
    });

    const globalHours = Number(globalTimesheets._sum.hours || 0);
    if (globalHours === 0) continue;

    // Find the PayrollItem for this exact month
    const payrollItem = await prisma.payrollItem.findFirst({
      where: {
        employeeId,
        createdAt: {
          gte: new Date(data.date.getFullYear(), data.date.getMonth(), 1),
          lt: new Date(data.date.getFullYear(), data.date.getMonth() + 1, 1)
        }
      }
    });

    if (payrollItem) {
      const netPay = Number(payrollItem.netPay);
      // Allocation math: (Project Hours / Global Hours) * Net Pay
      const proportion = data.totalProjHours / globalHours;
      totalAllocatedLaborCost += (proportion * netPay);
    }
  }

  // Fallback to direct tagging if dynamic math yields 0
  const direct = await getProjectDirectLaborCost(projectId);
  return totalAllocatedLaborCost > 0 ? totalAllocatedLaborCost : direct;
}

export async function getProjectBudgetSummary(projectId: string) {
  const budgets = await prisma.projectBudget.findMany({
    where: { projectId }
  });

  const totals = {
    LABOR: 0,
    MATERIALS: 0,
    SOFTWARE: 0,
    OTHER: 0,
    TOTAL: 0
  };

  budgets.forEach(b => {
    const amt = Number(b.amount);
    if (totals.hasOwnProperty(b.category)) {
      (totals as any)[b.category] += amt;
    } else {
      totals.OTHER += amt;
    }
    totals.TOTAL += amt;
  });

  return totals;
}

export async function getProjectPnL(projectId: string) {
  const [revenue, materialCost, laborCost, budget] = await Promise.all([
    getProjectRevenue(projectId),
    getProjectMaterialCost(projectId),
    calculateDynamicLaborCost(projectId),
    getProjectBudgetSummary(projectId)
  ]);

  const totalCost = materialCost + laborCost;
  const grossMargin = revenue - totalCost;
  const marginPercentage = revenue > 0 ? (grossMargin / revenue) * 100 : 0;
  
  const burnRate = budget.TOTAL > 0 ? (totalCost / budget.TOTAL) * 100 : 0;

  return {
    revenue,
    costs: {
      materials: materialCost,
      labor: laborCost,
      total: totalCost
    },
    budget,
    profitability: {
      grossMargin,
      marginPercentage,
      status: grossMargin > 0 ? "PROFITABLE" : "LOSS"
    },
    burnRate: {
      percentage: burnRate,
      status: burnRate > 100 ? "OVER_BUDGET" : burnRate > 80 ? "WARNING" : "ON_TRACK"
    }
  };
}
