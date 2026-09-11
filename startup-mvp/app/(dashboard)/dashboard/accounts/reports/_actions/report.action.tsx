"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma, AccountType } from "@prisma/client";
import { hasPermission } from "@/lib/permissions";

/**
 * Helper function to calculate account balance from JournalEntryLine
 * Returns { debit, credit, balance }
 */
async function calculateAccountBalance(
  accountId: string,
  dateFilter?: Prisma.DateTimeFilter
): Promise<{ debit: number; credit: number; balance: number }> {
  const where: Prisma.JournalEntryLineWhereInput = {
    chartOfAccountId: accountId,
  };

  if (dateFilter && Object.keys(dateFilter).length > 0) {
    where.JournalEntry = {
      date: dateFilter,
    };
  }

  const result = await prisma.journalEntryLine.aggregate({
    where,
    _sum: {
      debitAmount: true,
      creditAmount: true,
    },
  });

  const debit = Number(result._sum.debitAmount || 0);
  const credit = Number(result._sum.creditAmount || 0);
  const balance = debit - credit;

  return { debit, credit, balance };
}

/**
 * Get Trial Balance - Summary of all account balances up to a specific date
 */
export async function getTrialBalance(date: Date | string) {
  try {
    const session = await auth();

    if (!session?.user) {
      return {
        success: false,
        error: "Unauthorized",
        date: typeof date === "string" ? new Date(date) : date,
        accounts: [],
        totals: {
          totalDebit: 0,
          totalCredit: 0,
          difference: 0,
        },
      };
    }

    // Check permission
    const canView = await hasPermission(session.user.id, "accounts.trial-balance", "read") ||
                    await hasPermission(session.user.id, "accounts.trial-balance", "view");

    if (!canView) {
      return {
        success: false,
        error: "You do not have permission to view trial balance",
        date: typeof date === "string" ? new Date(date) : date,
        accounts: [],
        totals: {
          totalDebit: 0,
          totalCredit: 0,
          difference: 0,
        },
      };
    }

    // Convert date and set to end of day
    const reportDate = typeof date === "string" ? new Date(date) : date;
    const endOfDay = new Date(reportDate);
    endOfDay.setHours(23, 59, 59, 999);

    // Get all active accounts
    const accounts = await prisma.chartOfAccount.findMany({
      where: {
        status: "active",
      },
      select: {
        id: true,
        code: true,
        name: true,
        type: true,
      },
      orderBy: {
        code: "asc",
      },
    });

    // Calculate balance for each account up to the date
    const dateFilter: Prisma.DateTimeFilter = {
      lte: endOfDay,
    };

    const accountBalances = await Promise.all(
      accounts.map(async (account) => {
        const balance = await calculateAccountBalance(account.id, dateFilter);
        return {
          id: account.id,
          code: account.code,
          name: account.name,
          type: account.type,
          debit: balance.debit,
          credit: balance.credit,
          balance: balance.balance,
        };
      })
    );

    // Filter out accounts with zero balance (optional - can be removed if needed)
    const accountsWithActivity = accountBalances.filter(
      (acc) => acc.debit !== 0 || acc.credit !== 0 || acc.balance !== 0
    );

    // Calculate totals
    const totalDebit = accountBalances.reduce((sum, acc) => sum + acc.debit, 0);
    const totalCredit = accountBalances.reduce((sum, acc) => sum + acc.credit, 0);
    const difference = Math.abs(totalDebit - totalCredit);

    return {
      success: true,
      date: reportDate,
      accounts: accountsWithActivity,
      totals: {
        totalDebit,
        totalCredit,
        difference,
      },
    };
  } catch (error) {
    console.error("getTrialBalance error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch trial balance",
      date: typeof date === "string" ? new Date(date) : date,
      accounts: [],
      totals: {
        totalDebit: 0,
        totalCredit: 0,
        difference: 0,
      },
    };
  }
}

/**
 * Get Balance Sheet - Financial position (Assets = Liabilities + Equity) as of a specific date
 * Returns hierarchical account tree with parentId/children for collapsible display
 */
export async function getBalanceSheet(date: Date | string) {
  try {
    const session = await auth();

    if (!session?.user) {
      return {
        success: false,
        error: "Unauthorized",
        date: typeof date === "string" ? new Date(date) : date,
        assets: { accounts: [], total: 0 },
        liabilities: { accounts: [], total: 0 },
        equity: { accounts: [], netIncome: 0, total: 0 },
        validation: {
          assetsTotal: 0,
          liabilitiesTotal: 0,
          equityTotal: 0,
          isBalanced: false,
          difference: 0,
        },
      };
    }

    // Check permission
    const canView = await hasPermission(session.user.id, "accounts.balance-sheet", "read") ||
                    await hasPermission(session.user.id, "accounts.balance-sheet", "view");

    if (!canView) {
      return {
        success: false,
        error: "You do not have permission to view balance sheet",
        date: typeof date === "string" ? new Date(date) : date,
        assets: { accounts: [], total: 0 },
        liabilities: { accounts: [], total: 0 },
        equity: { accounts: [], netIncome: 0, total: 0 },
        validation: {
          assetsTotal: 0,
          liabilitiesTotal: 0,
          equityTotal: 0,
          isBalanced: false,
          difference: 0,
        },
      };
    }

    // Convert date and set to end of day
    const reportDate = typeof date === "string" ? new Date(date) : date;
    const endOfDay = new Date(reportDate);
    endOfDay.setHours(23, 59, 59, 999);

    const dateFilter: Prisma.DateTimeFilter = {
      lte: endOfDay,
    };

    // Helper to build hierarchical account tree for a given type
    async function buildAccountTree(type: AccountType, normalBalance: "debit" | "credit") {
      // Fetch all accounts of this type
      const allAccounts = await prisma.chartOfAccount.findMany({
        where: { status: "active", type },
        select: { id: true, code: true, name: true, parentId: true },
        orderBy: { code: "asc" },
      });

      // Calculate balance for each account
      const accountsWithBalance = await Promise.all(
        allAccounts.map(async (account) => {
          const bal = await calculateAccountBalance(account.id, dateFilter);
          const displayBalance = normalBalance === "credit" ? -bal.balance : bal.balance;
          return {
            id: account.id,
            code: account.code,
            name: account.name,
            parentId: account.parentId,
            balance: displayBalance,
            children: [] as {
              id: string;
              code: string;
              name: string;
              parentId: string | null;
              balance: number;
              children: unknown[];
            }[],
          };
        })
      );

      // Build tree structure
      const map = new Map(accountsWithBalance.map((a) => [a.id, a]));
      const roots: typeof accountsWithBalance = [];

      for (const acc of accountsWithBalance) {
        if (acc.parentId && map.has(acc.parentId)) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (map.get(acc.parentId) as any).children.push(acc);
        } else {
          roots.push(acc);
        }
      }

      // Compute rolled-up totals for parent nodes (sum of self + all descendants)
      function computeTotal(node: typeof accountsWithBalance[0]): number {
        if (node.children.length === 0) return node.balance;
        const childrenTotal = node.children.reduce((sum, child) => sum + computeTotal(child as typeof accountsWithBalance[0]), 0);
        // Parent balance = its own journal balance + children's totals
        return node.balance + childrenTotal;
      }

      // Enrich nodes with rollup total
      const enriched = roots.map((root) => ({
        ...root,
        total: computeTotal(root),
      }));

      const grandTotal = enriched.reduce((sum, r) => sum + r.total, 0);
      return { roots: enriched, grandTotal };
    }

    const [assetTree, liabilityTree, equityTree] = await Promise.all([
      buildAccountTree(AccountType.ASSET, "debit"),
      buildAccountTree(AccountType.LIABILITY, "credit"),
      buildAccountTree(AccountType.EQUITY, "credit"),
    ]);

    // Net Income (Revenue - Expenses)
    const revenueAccounts = await prisma.chartOfAccount.findMany({
      where: { status: "active", type: AccountType.REVENUE },
      select: { id: true },
    });
    const expenseAccounts = await prisma.chartOfAccount.findMany({
      where: { status: "active", type: AccountType.EXPENSE },
      select: { id: true },
    });

    let totalRevenue = 0;
    let totalExpenses = 0;

    for (const account of revenueAccounts) {
      const bal = await calculateAccountBalance(account.id, dateFilter);
      totalRevenue += bal.credit - bal.debit;
    }
    for (const account of expenseAccounts) {
      const bal = await calculateAccountBalance(account.id, dateFilter);
      totalExpenses += bal.debit - bal.credit;
    }

    const netIncome = totalRevenue - totalExpenses;

    const assetsTotal = assetTree.grandTotal;
    const liabilitiesTotal = liabilityTree.grandTotal;
    const equityTotal = equityTree.grandTotal + netIncome;
    const difference = Math.abs(assetsTotal - (liabilitiesTotal + equityTotal));
    const isBalanced = difference < 0.01;

    return {
      success: true,
      date: reportDate,
      assets: {
        accounts: assetTree.roots,
        total: assetsTotal,
      },
      liabilities: {
        accounts: liabilityTree.roots,
        total: liabilitiesTotal,
      },
      equity: {
        accounts: equityTree.roots,
        netIncome,
        total: equityTotal,
      },
      validation: {
        assetsTotal,
        liabilitiesTotal,
        equityTotal,
        isBalanced,
        difference,
      },
    };
  } catch (error) {
    console.error("getBalanceSheet error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch balance sheet",
      date: typeof date === "string" ? new Date(date) : date,
      assets: { accounts: [], total: 0 },
      liabilities: { accounts: [], total: 0 },
      equity: { accounts: [], netIncome: 0, total: 0 },
      validation: {
        assetsTotal: 0,
        liabilitiesTotal: 0,
        equityTotal: 0,
        isBalanced: false,
        difference: 0,
      },
    };
  }
}

/**
 * Get Profit & Loss - Income statement (Revenue - Expenses) for a date range
 */
export async function getProfitLoss(startDate: Date | string, endDate: Date | string) {
  try {
    const session = await auth();

    if (!session?.user) {
      return {
        success: false,
        error: "Unauthorized",
        startDate: typeof startDate === "string" ? new Date(startDate) : startDate,
        endDate: typeof endDate === "string" ? new Date(endDate) : endDate,
        revenue: { accounts: [], total: 0 },
        expenses: { accounts: [], total: 0 },
        netIncome: 0,
      };
    }

    // Check permission
    const canView = await hasPermission(session.user.id, "accounts.profit-loss", "read") ||
                    await hasPermission(session.user.id, "accounts.profit-loss", "view");

    if (!canView) {
      return {
        success: false,
        error: "You do not have permission to view profit & loss",
        startDate: typeof startDate === "string" ? new Date(startDate) : startDate,
        endDate: typeof endDate === "string" ? new Date(endDate) : endDate,
        revenue: { accounts: [], total: 0 },
        expenses: { accounts: [], total: 0 },
        netIncome: 0,
      };
    }

    // Convert dates
    const reportStartDate = typeof startDate === "string" ? new Date(startDate) : startDate;
    const reportEndDate = typeof endDate === "string" ? new Date(endDate) : endDate;

    // Validate date range
    if (reportStartDate > reportEndDate) {
      return {
        success: false,
        error: "Start date must be before or equal to end date",
        startDate: reportStartDate,
        endDate: reportEndDate,
        revenue: { accounts: [], total: 0 },
        expenses: { accounts: [], total: 0 },
        netIncome: 0,
      };
    }

    // Set end date to end of day
    const endOfDay = new Date(reportEndDate);
    endOfDay.setHours(23, 59, 59, 999);

    const dateFilter: Prisma.DateTimeFilter = {
      gte: reportStartDate,
      lte: endOfDay,
    };

    // Get REVENUE accounts
    const revenueAccounts = await prisma.chartOfAccount.findMany({
      where: {
        status: "active",
        type: AccountType.REVENUE,
      },
      select: {
        id: true,
        code: true,
        name: true,
      },
      orderBy: {
        code: "asc",
      },
    });

    // Get EXPENSE accounts
    const expenseAccounts = await prisma.chartOfAccount.findMany({
      where: {
        status: "active",
        type: AccountType.EXPENSE,
      },
      select: {
        id: true,
        code: true,
        name: true,
      },
      orderBy: {
        code: "asc",
      },
    });

    // Calculate revenue amounts (credit - debit, since revenue normal balance is credit)
    const revenueBalances = await Promise.all(
      revenueAccounts.map(async (account) => {
        const balance = await calculateAccountBalance(account.id, dateFilter);
        const amount = balance.credit - balance.debit; // Revenue normal balance is credit
        return {
          id: account.id,
          code: account.code,
          name: account.name,
          amount,
        };
      })
    );

    // Calculate expense amounts (debit - credit, since expense normal balance is debit)
    const expenseBalances = await Promise.all(
      expenseAccounts.map(async (account) => {
        const balance = await calculateAccountBalance(account.id, dateFilter);
        const amount = balance.debit - balance.credit; // Expense normal balance is debit
        return {
          id: account.id,
          code: account.code,
          name: account.name,
          amount,
        };
      })
    );

    // Calculate totals
    const revenueTotal = revenueBalances.reduce((sum, acc) => sum + acc.amount, 0);
    const expensesTotal = expenseBalances.reduce((sum, acc) => sum + acc.amount, 0);
    const netIncome = revenueTotal - expensesTotal;

    return {
      success: true,
      startDate: reportStartDate,
      endDate: reportEndDate,
      revenue: {
        accounts: revenueBalances.filter((acc) => acc.amount !== 0),
        total: revenueTotal,
      },
      expenses: {
        accounts: expenseBalances.filter((acc) => acc.amount !== 0),
        total: expensesTotal,
      },
      netIncome,
    };
  } catch (error) {
    console.error("getProfitLoss error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch profit & loss",
      startDate: typeof startDate === "string" ? new Date(startDate) : startDate,
      endDate: typeof endDate === "string" ? new Date(endDate) : endDate,
      revenue: { accounts: [], total: 0 },
      expenses: { accounts: [], total: 0 },
      netIncome: 0,
    };
  }
}

