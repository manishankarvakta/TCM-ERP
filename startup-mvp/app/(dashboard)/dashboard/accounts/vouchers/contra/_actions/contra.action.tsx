"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { determineAccountType } from "@/lib/payment-account-config";

/**
 * Get contra accounts from Chart of Accounts
 * Fetches ASSET accounts that can be used for transfers (Cash, Bank, Digital Wallets)
 */
export async function getContraAccounts(): Promise<{
  success: boolean;
  accounts: {
    cash: Array<{
      id: string;
      code: string;
      name: string;
      description?: string | null;
    }>;
    bank: Array<{
      id: string;
      code: string;
      name: string;
      description?: string | null;
    }>;
    digitalWallet: Array<{
      id: string;
      code: string;
      name: string;
      description?: string | null;
    }>;
  };
  error?: string;
}> {
  try {
    const session = await auth();
    if (!session?.user) {
      return {
        success: false,
        error: "Unauthorized",
        accounts: { cash: [], bank: [], digitalWallet: [] },
      };
    }

    const isAdmin = session.user.role?.toLowerCase() === "admin" || session.user.role?.toLowerCase() === "super-admin";
    const whereClause: any = {
      type: "ASSET",
      status: "active",
      isControl: false,
    };

    if (!isAdmin) {
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { defaultWarehouseId: true },
      });

      if (user?.defaultWarehouseId) {
        whereClause.CashBankAccount = {
          warehouses: {
            some: {
              id: user.defaultWarehouseId,
            },
          },
        };
      } else {
        whereClause.CashBankAccount = {
          warehouses: {
            some: {
              id: "none",
            },
          },
        };
      }
    }

    // Fetch ASSET accounts from Chart of Accounts
    const accounts = await prisma.chartOfAccount.findMany({
      where: whereClause,
      select: {
        id: true,
        code: true,
        name: true,
        description: true,
        CashBankAccount: {
          select: {
            type: true,
          },
        },
      },
      orderBy: {
        code: "asc",
      },
    });

    // Categorize accounts by type
    const cash: Array<{ id: string; code: string; name: string; description?: string | null }> = [];
    const bank: Array<{ id: string; code: string; name: string; description?: string | null }> = [];
    const digitalWallet: Array<{ id: string; code: string; name: string; description?: string | null }> = [];

    accounts.forEach((account) => {
      // Determine account type using pattern matching configuration
      const accountType = determineAccountType({
        code: account.code,
        name: account.name,
        // @ts-ignore - Prisma return type mismatch fix
        CashBankAccount: account.CashBankAccount,
      });

      if (!accountType) return; // Skip if not a known payment account type

      // Add to appropriate array
      const accountData = {
        id: account.id,
        code: account.code,
        name: account.name,
        description: account.description,
      };

      if (accountType === "CASH") {
        cash.push(accountData);
      } else if (accountType === "BANK") {
        bank.push(accountData);
      } else if (accountType === "DIGITAL_WALLET") {
        digitalWallet.push(accountData);
      }
    });

    return {
      success: true,
      accounts: {
        cash,
        bank,
        digitalWallet,
      },
    };
  } catch (error) {
    console.error("getContraAccounts error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch contra accounts",
      accounts: { cash: [], bank: [], digitalWallet: [] },
    };
  }
}

/**
 * Get current balance for a specific GL account
 * For Asset accounts: Debit - Credit
 */
export async function getAccountBalance(accountId: string): Promise<{
  success: boolean;
  balance: number;
  error?: string;
}> {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, balance: 0, error: "Unauthorized" };
    }

    // Get all posted voucher lines for this account
    const lines = await prisma.voucherLine.findMany({
      where: {
        chartOfAccountId: accountId,
        Voucher: {
          status: "posted",
        },
      },
      select: {
        debitAmount: true,
        creditAmount: true,
      },
    });

    // Calculate total balance (Debit - Credit for Assets)
    let totalDebit = 0;
    let totalCredit = 0;

    lines.forEach((line) => {
      totalDebit += Number(line.debitAmount);
      totalCredit += Number(line.creditAmount);
    });

    const balance = totalDebit - totalCredit;

    return { success: true, balance };
  } catch (error) {
    console.error("getAccountBalance error:", error);
    return {
      success: false,
      balance: 0,
      error: error instanceof Error ? error.message : "Failed to calculate balance",
    };
  }
}
