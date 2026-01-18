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

    // Get ASSET accounts
    const assetAccounts = await prisma.chartOfAccount.findMany({
      where: {
        status: "active",
        type: AccountType.ASSET,
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

    // Get LIABILITY accounts
    const liabilityAccounts = await prisma.chartOfAccount.findMany({
      where: {
        status: "active",
        type: AccountType.LIABILITY,
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

    // Get EQUITY accounts
    const equityAccounts = await prisma.chartOfAccount.findMany({
      where: {
        status: "active",
        type: AccountType.EQUITY,
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

    // Get REVENUE and EXPENSE accounts for Net Income calculation
    const revenueAccounts = await prisma.chartOfAccount.findMany({
      where: {
        status: "active",
        type: AccountType.REVENUE,
      },
      select: {
        id: true,
      },
    });

    const expenseAccounts = await prisma.chartOfAccount.findMany({
      where: {
        status: "active",
        type: AccountType.EXPENSE,
      },
      select: {
        id: true,
      },
    });

    // Calculate balances for ASSET accounts (debit - credit)
    const assetBalances = await Promise.all(
      assetAccounts.map(async (account) => {
        const balance = await calculateAccountBalance(account.id, dateFilter);
        return {
          id: account.id,
          code: account.code,
          name: account.name,
          balance: balance.balance, // debit - credit (ASSET normal balance is debit)
        };
      })
    );

    // Calculate balances for LIABILITY accounts (credit - debit, since normal balance is credit)
    const liabilityBalances = await Promise.all(
      liabilityAccounts.map(async (account) => {
        const balance = await calculateAccountBalance(account.id, dateFilter);
        return {
          id: account.id,
          code: account.code,
          name: account.name,
          balance: -balance.balance, // credit - debit (LIABILITY normal balance is credit)
        };
      })
    );

    // Calculate balances for EQUITY accounts (credit - debit, since normal balance is credit)
    const equityBalances = await Promise.all(
      equityAccounts.map(async (account) => {
        const balance = await calculateAccountBalance(account.id, dateFilter);
        return {
          id: account.id,
          code: account.code,
          name: account.name,
          balance: -balance.balance, // credit - debit (EQUITY normal balance is credit)
        };
      })
    );

    // Calculate Net Income (Revenue - Expenses) up to date
    let totalRevenue = 0;
    let totalExpenses = 0;

    for (const account of revenueAccounts) {
      const balance = await calculateAccountBalance(account.id, dateFilter);
      // Revenue normal balance is credit, so credit - debit
      totalRevenue += balance.credit - balance.debit;
    }

    for (const account of expenseAccounts) {
      const balance = await calculateAccountBalance(account.id, dateFilter);
      // Expense normal balance is debit, so debit - credit
      totalExpenses += balance.debit - balance.credit;
    }

    const netIncome = totalRevenue - totalExpenses;

    // Calculate totals
    const assetsTotal = assetBalances.reduce((sum, acc) => sum + acc.balance, 0);
    const liabilitiesTotal = liabilityBalances.reduce((sum, acc) => sum + acc.balance, 0);
    const equityTotal = equityBalances.reduce((sum, acc) => sum + acc.balance, 0) + netIncome;

    // Validate: Assets = Liabilities + Equity
    const difference = Math.abs(assetsTotal - (liabilitiesTotal + equityTotal));
    const isBalanced = difference < 0.01; // Allow small floating point differences

    return {
      success: true,
      date: reportDate,
      assets: {
        accounts: assetBalances.filter((acc) => acc.balance !== 0),
        total: assetsTotal,
      },
      liabilities: {
        accounts: liabilityBalances.filter((acc) => acc.balance !== 0),
        total: liabilitiesTotal,
      },
      equity: {
        accounts: equityBalances.filter((acc) => acc.balance !== 0),
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

