"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

import { determineAccountType } from "@/lib/payment-account-config";

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
 * - Cash, Bank, and Digital Wallet accounts (both linked and unlinked)
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

    // Get non-control active accounts with CashBankAccount relation
    const allAccounts = await prisma.chartOfAccount.findMany({
      where: {
        status: "active",
        isControl: false,
      },
      select: {
        id: true,
        code: true,
        name: true,
        type: true,
        CashBankAccount: {
          select: {
            type: true,
          },
        },
      },
      orderBy: [
        { type: "asc" },
        { code: "asc" },
      ],
    });

    // Filter out all Cash, Bank, and Digital Wallet accounts (both linked and unlinked)
    const validAccounts = allAccounts.filter((account) => {
      const paymentType = determineAccountType({
        code: account.code,
        name: account.name,
        CashBankAccount: account.CashBankAccount,
      });
      return paymentType === null;
    });

    return {
      success: true,
      accounts: validAccounts.map((a) => ({
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
