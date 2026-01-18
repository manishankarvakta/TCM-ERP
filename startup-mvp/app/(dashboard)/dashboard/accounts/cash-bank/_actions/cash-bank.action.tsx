"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { CashBankAccountType } from "@prisma/client";

interface CashBankAccount {
  id: string;
  type: CashBankAccountType;
  status: string;
  chartOfAccount: {
    id: string;
    code: string;
    name: string;
  };
}

interface CashBankAccountsResult {
  success: boolean;
  accounts?: {
    cash: CashBankAccount[];
    bank: CashBankAccount[];
  };
  error?: string;
}

/**
 * Get all Cash & Bank accounts grouped by type
 */
export async function getCashBankAccounts(): Promise<CashBankAccountsResult> {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return {
        success: false,
        error: "Unauthorized",
        accounts: {
          cash: [],
          bank: [],
        },
      };
    }

    // Check permission
    const canView = await hasPermission(session.user.id, "accounts.cash-bank", "read") ||
                    await hasPermission(session.user.id, "accounts.cash-bank", "view");

    if (!canView) {
      return {
        success: false,
        error: "You do not have permission to view cash & bank accounts",
        accounts: {
          cash: [],
          bank: [],
        },
      };
    }

    // Fetch all cash & bank accounts (exclude trash)
    const accounts = await prisma.cashBankAccount.findMany({
      where: {
        status: {
          not: "trash",
        },
      },
      select: {
        id: true,
        type: true,
        status: true,
        ChartOfAccount: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
      },
      orderBy: [
        { type: "asc" },
        { ChartOfAccount: { code: "asc" } },
      ],
    });

    // Group accounts by type
    const cash: CashBankAccount[] = [];
    const bank: CashBankAccount[] = [];

    accounts.forEach((account) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const accountData: CashBankAccount = {
        id: account.id,
        type: account.type,
        status: account.status,
        chartOfAccount: (account as any).ChartOfAccount,
      };

      if (account.type === CashBankAccountType.CASH) {
        cash.push(accountData);
      } else if (account.type === CashBankAccountType.BANK) {
        bank.push(accountData);
      }
    });

    return {
      success: true,
      accounts: {
        cash,
        bank,
      },
    };
  } catch (error) {
    console.error("getCashBankAccounts error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch cash & bank accounts",
      accounts: {
        cash: [],
        bank: [],
      },
    };
  }
}

