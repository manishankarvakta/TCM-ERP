"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

interface AccountForJournal {
  id: string;
  code: string;
  name: string;
  type: string;
}

/**
 * Get accounts available for journal entries.
 * Excludes:
 * - Control accounts (isControl = true) - AR, AP, Inventory, Sales Revenue, COGS
 * - Cash/Bank accounts (linked to CashBank table)
 */
export async function getAccountsForJournal(): Promise<{
  success: boolean;
  accounts: AccountForJournal[];
  error?: string;
}> {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Unauthorized", accounts: [] };
    }

    // Get IDs of accounts linked to CashBank
    const cashBankAccounts = await prisma.cashBankAccount.findMany({
      select: {
        chartOfAccountId: true,
      },
    });
    const cashBankAccountIds = cashBankAccounts.map((cb) => cb.chartOfAccountId);

    // Get non-control accounts that are NOT linked to CashBank
    const accounts = await prisma.chartOfAccount.findMany({
      where: {
        status: "active",
        isControl: false,
        id: {
          notIn: cashBankAccountIds,
        },
      },
      select: {
        id: true,
        code: true,
        name: true,
        type: true,
      },
      orderBy: [
        { type: "asc" },
        { code: "asc" },
      ],
    });

    return {
      success: true,
      accounts: accounts.map((a) => ({
        id: a.id,
        code: a.code,
        name: a.name,
        type: a.type,
      })),
    };
  } catch (error) {
    console.error("getAccountsForJournal error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch accounts",
      accounts: [],
    };
  }
}
