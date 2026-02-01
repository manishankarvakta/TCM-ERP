"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { CashBankAccountType, AccountType } from "@prisma/client";

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
    wallets: CashBankAccount[];
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
          wallets: [],
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
          wallets: [],
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

    // Get IDs of COAs that are already linked
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const linkedCoaIds = accounts.map((a) => (a as any).ChartOfAccount.id);

    // Fetch unlinked ChartOfAccounts that look like Cash/Bank (Name match & ASSET type)
    const unlinkedAccounts = await prisma.chartOfAccount.findMany({
      where: {
        id: { notIn: linkedCoaIds },
        type: AccountType.ASSET, // Must be Assets
        status: { not: "trash" },
        OR: [
          { name: { contains: "Cash", mode: "insensitive" } },
          { name: { contains: "Bank", mode: "insensitive" } },
          { name: { contains: "Bkash", mode: "insensitive" } },
          { name: { contains: "Nagad", mode: "insensitive" } },
          { name: { contains: "Rocket", mode: "insensitive" } },
          { name: { contains: "Upay", mode: "insensitive" } },
          { name: { contains: "Wallet", mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        code: true,
        name: true,
        status: true,
      },
    });

    // Group accounts by type
    const cash: CashBankAccount[] = [];
    const bank: CashBankAccount[] = [];
    const wallets: CashBankAccount[] = [];

    const isWalletName = (name: string) => {
      const n = name.toLowerCase();
      return n.includes("bkash") || n.includes("nagad") || n.includes("rocket") || n.includes("upay") || n.includes("wallet");
    };

    // Add explicitly linked accounts
    accounts.forEach((account) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const coa = (account as any).ChartOfAccount;
      
      const accountData: CashBankAccount = {
        id: account.id,
        type: account.type, // Keep original DB type
        status: account.status,
        chartOfAccount: coa,
      };

      // If it looks like a wallet, put it in wallets regardless of DB type
      if (isWalletName(coa.name)) {
        wallets.push(accountData);
      } else if (account.type === CashBankAccountType.CASH) {
        cash.push(accountData);
      } else if (account.type === CashBankAccountType.BANK) {
        bank.push(accountData);
      }
    });

    // Add inferred unlinked accounts
    unlinkedAccounts.forEach((coa) => {
      const isBank = coa.name.toLowerCase().includes("bank");
      const isWallet = isWalletName(coa.name);
      
      const accountData: CashBankAccount = {
        id: `inferred-${coa.id}`, // Virtual ID
        type: isBank ? CashBankAccountType.BANK : CashBankAccountType.CASH, // Default mapping
        status: coa.status,
        chartOfAccount: {
          id: coa.id,
          code: coa.code,
          name: coa.name,
        },
      };

      if (isWallet) {
        wallets.push(accountData);
      } else if (isBank) {
        bank.push(accountData);
      } else {
        cash.push(accountData);
      }
    });

    return {
      success: true,
      accounts: {
        cash,
        bank,
        wallets,
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
        wallets: [],
      },
    };
  }
}
