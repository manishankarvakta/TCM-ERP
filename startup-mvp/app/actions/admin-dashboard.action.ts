"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { Prisma, AccountType, ItemType, ProductionOrderStatus, PurchaseStatus, SaleStatus } from "@prisma/client";
import { startOfDay, endOfDay, startOfMonth, endOfMonth } from "date-fns";

/**
 * Check if user has admin-level access for dashboard data
 */
async function checkAdminAccess() {
  const session = await auth();
  if (!session?.user) return false;
  
  // Check if user is admin role or has specific dashboard view permission
  const userRole = session.user.role?.toLowerCase();
  if (userRole === "admin" || userRole === "super-admin") return true;
  
  const canView = await hasPermission(session.user.id, "reports.view", "view");
  return canView;
}

/**
 * 1. FINANCIAL OVERVIEW
 */
export async function getAdminFinancialOverview() {
  try {
    if (!(await checkAdminAccess())) return { success: false, error: "Unauthorized" };

    const today = new Date();
    const startOfToday = startOfDay(today);
    const endOfToday = endOfDay(today);
    const startOfMo = startOfMonth(today);
    const endOfMo = endOfMonth(today);

    // Revenue (Normal Credit balance)
    const revenueAccounts = await prisma.chartOfAccount.findMany({
      where: { type: AccountType.REVENUE, status: "active" },
      select: { id: true }
    });
    const revIds = revenueAccounts.map(a => a.id);

    const [revToday, revMonth] = await Promise.all([
      prisma.journalEntryLine.aggregate({
        where: { chartOfAccountId: { in: revIds }, JournalEntry: { date: { gte: startOfToday, lte: endOfToday } } },
        _sum: { creditAmount: true, debitAmount: true }
      }),
      prisma.journalEntryLine.aggregate({
        where: { chartOfAccountId: { in: revIds }, JournalEntry: { date: { gte: startOfMo, lte: endOfMo } } },
        _sum: { creditAmount: true, debitAmount: true }
      })
    ]);

    // Expenses (Normal Debit balance)
    const expenseAccounts = await prisma.chartOfAccount.findMany({
      where: { type: AccountType.EXPENSE, status: "active" },
      select: { id: true }
    });
    const expIds = expenseAccounts.map(a => a.id);

    const [expToday, expMonth] = await Promise.all([
      prisma.journalEntryLine.aggregate({
        where: { chartOfAccountId: { in: expIds }, JournalEntry: { date: { gte: startOfToday, lte: endOfToday } } },
        _sum: { debitAmount: true, creditAmount: true }
      }),
      prisma.journalEntryLine.aggregate({
        where: { chartOfAccountId: { in: expIds }, JournalEntry: { date: { gte: startOfMo, lte: endOfMo } } },
        _sum: { debitAmount: true, creditAmount: true }
      })
    ]);

    // Cash & Bank Balances
    const cashBankAccounts = await prisma.cashBankAccount.findMany({
      include: { ChartOfAccount: { select: { id: true, name: true } } }
    });
    
    const balances = await Promise.all(cashBankAccounts.map(async (acc) => {
      const agg = await prisma.journalEntryLine.aggregate({
        where: { chartOfAccountId: acc.chartOfAccountId },
        _sum: { debitAmount: true, creditAmount: true }
      });
      return {
        name: acc.ChartOfAccount.name,
        type: acc.type,
        balance: Number(agg._sum.debitAmount || 0) - Number(agg._sum.creditAmount || 0)
      };
    }));

    const totalRevenueMonth = Number(revMonth._sum.creditAmount || 0) - Number(revMonth._sum.debitAmount || 0);
    const totalExpensesMonth = Number(expMonth._sum.debitAmount || 0) - Number(expMonth._sum.creditAmount || 0);

    return {
      success: true,
      data: {
        revenue: {
          today: Number(revToday._sum.creditAmount || 0) - Number(revToday._sum.debitAmount || 0),
          month: totalRevenueMonth
        },
        expenses: {
          today: Number(expToday._sum.debitAmount || 0) - Number(expToday._sum.creditAmount || 0),
          month: totalExpensesMonth
        },
        netProfit: totalRevenueMonth - totalExpensesMonth,
        cashBankBalances: balances,
        totalLiquidity: balances.reduce((sum, b) => sum + b.balance, 0)
      }
    };
  } catch (error) {
    console.error("getAdminFinancialOverview error:", error);
    return { success: false, error: "Failed to fetch financial data" };
  }
}

/**
 * 2. INVENTORY SNAPSHOT
 */
export async function getAdminInventorySnapshot() {
  try {
    if (!(await checkAdminAccess())) return { success: false, error: "Unauthorized" };

    const stocks = await prisma.stock.findMany({
      include: {
        item: {
          select: { itemType: true, costPrice: true }
        }
      }
    });

    const snapshot = {
      [ItemType.RAW_MATERIAL]: 0,
      [ItemType.READY_PRODUCT]: 0,
      [ItemType.RETAIL]: 0,
      [ItemType.WHOLESALE]: 0
    };

    stocks.forEach(s => {
      if (s.item) {
        const val = Number(s.quantity) * Number(s.item.costPrice || 0);
        snapshot[s.item.itemType] += val;
      }
    });

    // Low Stock Alerts (using a threshold of 10 for now)
    const lowStockItems = await prisma.item.findMany({
      where: {
        trackInventory: true,
        status: "active",
        stocks: { some: { quantity: { lt: 10 } } }
      },
      select: { name: true, code: true, stocks: { select: { quantity: true } } },
      take: 5
    });

    return {
      success: true,
      data: {
        stockValue: snapshot,
        totalValue: Object.values(snapshot).reduce((a, b) => a + b, 0),
        lowStockAlerts: lowStockItems.map(i => ({
          name: i.name,
          code: i.code,
          qty: i.stocks.reduce((sum, s) => sum + Number(s.quantity), 0)
        }))
      }
    };
  } catch (error) {
    console.error("getAdminInventorySnapshot error:", error);
    return { success: false, error: "Failed to fetch inventory snapshot" };
  }
}

/**
 * 3. PRODUCTION STATUS
 */
export async function getAdminProductionStatus() {
  try {
    if (!(await checkAdminAccess())) return { success: false, error: "Unauthorized" };

    const today = new Date();
    const startOfToday = startOfDay(today);
    const endOfToday = endOfDay(today);

    const [ongoing, completedToday] = await Promise.all([
      prisma.productionOrder.count({ where: { status: ProductionOrderStatus.IN_PROGRESS, isTrash: false } }),
      prisma.productionOrder.count({
        where: {
          status: ProductionOrderStatus.COMPLETED,
          completedAt: { gte: startOfToday, lte: endOfToday },
          isTrash: false
        }
      })
    ]);

    // Summary of items produced today
    const productionsToday = await prisma.productionOrder.findMany({
      where: {
        status: ProductionOrderStatus.COMPLETED,
        completedAt: { gte: startOfToday, lte: endOfToday },
        isTrash: false
      },
      include: { item: { select: { name: true } } }
    });

    const itemSummary = productionsToday.reduce((acc, p) => {
      acc[p.item.name] = (acc[p.item.name] || 0) + Number(p.quantity);
      return acc;
    }, {} as Record<string, number>);

    return {
      success: true,
      data: {
        ongoing,
        completedToday,
        producedToday: Object.entries(itemSummary).map(([name, qty]) => ({ name, qty }))
      }
    };
  } catch (error) {
    console.error("getAdminProductionStatus error:", error);
    return { success: false, error: "Failed to fetch production status" };
  }
}

/**
 * 4. PURCHASE & PAYABLES
 */
export async function getAdminPurchasePayables() {
  try {
    if (!(await checkAdminAccess())) return { success: false, error: "Unauthorized" };

    const [pendingReceipts, apSummary] = await Promise.all([
      prisma.purchase.count({ where: { status: PurchaseStatus.APPROVED, isTrash: false } }),
      // AP calculation logic
      (async () => {
        const apAccount = await prisma.chartOfAccount.findFirst({
          where: { name: { contains: "Accounts Payable", mode: "insensitive" } }
        });
        if (!apAccount) return 0;
        const agg = await prisma.journalEntryLine.aggregate({
          where: { chartOfAccountId: apAccount.id },
          _sum: { creditAmount: true, debitAmount: true }
        });
        return Number(agg._sum.creditAmount || 0) - Number(agg._sum.debitAmount || 0);
      })()
    ]);

    // Recent overdue-like view (just pending for now)
    const pendingPurchases = await prisma.purchase.findMany({
      where: { status: PurchaseStatus.APPROVED, isTrash: false },
      include: { supplier: { select: { name: true } } },
      take: 5,
      orderBy: { date: "desc" }
    });

    return {
      success: true,
      data: {
        pendingReceipts,
        accountsPayable: apSummary,
        recentPending: pendingPurchases.map(p => ({
          number: p.purchaseNumber,
          supplier: p.supplier.name,
          amount: Number(p.grandTotal)
        }))
      }
    };
  } catch (error) {
    console.error("getAdminPurchasePayables error:", error);
    return { success: false, error: "Failed to fetch purchase data" };
  }
}

/**
 * 5. SALES & RECEIVABLES
 */
export async function getAdminSalesReceivables() {
  try {
    if (!(await checkAdminAccess())) return { success: false, error: "Unauthorized" };

    const today = new Date();
    const startOfToday = startOfDay(today);
    const endOfToday = endOfDay(today);

    const [todaySalesCount, arSummary] = await Promise.all([
      prisma.sale.count({ where: { date: { gte: startOfToday, lte: endOfToday }, status: SaleStatus.COMPLETED, isTrash: false } }),
      // AR calculation logic
      (async () => {
        const arAccount = await prisma.chartOfAccount.findFirst({
          where: { name: { contains: "Accounts Receivable", mode: "insensitive" } }
        });
        if (!arAccount) return 0;
        const agg = await prisma.journalEntryLine.aggregate({
          where: { chartOfAccountId: arAccount.id },
          _sum: { debitAmount: true, creditAmount: true }
        });
        return Number(agg._sum.debitAmount || 0) - Number(agg._sum.creditAmount || 0);
      })()
    ]);

    const recentSales = await prisma.sale.findMany({
      where: { status: SaleStatus.COMPLETED, isTrash: false },
      include: { client: { select: { name: true } } },
      take: 5,
      orderBy: { date: "desc" }
    });

    return {
      success: true,
      data: {
        todaySalesCount,
        accountsReceivable: arSummary,
        recentSales: recentSales.map(s => ({
          number: s.saleNumber,
          client: s.client.name,
          amount: Number(s.grandTotal)
        }))
      }
    };
  } catch (error) {
    console.error("getAdminSalesReceivables error:", error);
    return { success: false, error: "Failed to fetch sales data" };
  }
}

/**
 * 6. ALERTS & EXCEPTIONS
 */
export async function getAdminAlertsExceptions() {
  try {
    if (!(await checkAdminAccess())) return { success: false, error: "Unauthorized" };

    const [unpostedVouchers, negativeStockCount] = await Promise.all([
      prisma.voucher.count({ where: { status: "draft" } }),
      prisma.stock.count({ where: { quantity: { lt: 0 } } })
    ]);

    // Recent security/permission-like logs
    const recentLogs = await prisma.userLog.findMany({
      where: {
        OR: [
          { action: { contains: "SECURITY", mode: "insensitive" } },
          { action: { contains: "FAILED", mode: "insensitive" } },
          { action: { contains: "DELETE", mode: "insensitive" } }
        ]
      },
      include: { user: { select: { name: true } } },
      take: 5,
      orderBy: { createdAt: "desc" }
    });

    return {
      success: true,
      data: {
        unpostedVouchers,
        negativeStockCount,
        criticalLogs: recentLogs.map(l => ({
          action: l.action,
          user: l.user.name,
          time: l.createdAt
        }))
      }
    };
  } catch (error) {
    console.error("getAdminAlertsExceptions error:", error);
    return { success: false, error: "Failed to fetch alerts" };
  }
}
