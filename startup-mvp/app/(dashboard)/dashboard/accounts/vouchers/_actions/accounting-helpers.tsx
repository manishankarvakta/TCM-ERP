"use server";

import { prisma } from "@/lib/prisma";

/**
 * Find control account by name (case-insensitive, partial match)
 * Used to find accounts like "Accounts Receivable", "Sales Revenue", "COGS", etc.
 */
export async function findControlAccount(accountName: string): Promise<string | null> {
  try {
    const account = await prisma.chartOfAccount.findFirst({
      where: {
        name: {
          contains: accountName,
          mode: "insensitive",
        },
        status: "active",
      },
      select: {
        id: true,
      },
    });

    return account?.id || null;
  } catch (error) {
    console.error("findControlAccount error:", error);
    return null;
  }
}

/**
 * Check if an account is a restricted control account
 * Restricted accounts: Accounts Receivable, Accounts Payable, and Inventory accounts
 */
export async function isControlAccount(accountId: string): Promise<boolean> {
  try {
    const account = await prisma.chartOfAccount.findUnique({
      where: { id: accountId },
      include: {
        ChartOfAccount: { // Parent account
          select: {
            name: true,
          },
        },
      },
    });

    if (!account) return false;

    const restrictedNames = [
      "Accounts Receivable",
      "Accounts Payable",
      "Raw Material Inventory",
      "Finished Goods Inventory",
      "Retail Inventory",
      "Inventory Stock",
      "Work In Progress (WIP)",
    ];

    // Check if account name is restricted
    if (restrictedNames.some(name => account.name.includes(name))) {
      return true;
    }

    // Check if parent account name is restricted (e.g., individual customer/supplier accounts)
    if (account.ChartOfAccount && restrictedNames.some(name => account.ChartOfAccount!.name.includes(name))) {
      return true;
    }

    return false;
  } catch (error) {
    console.error("isControlAccount error:", error);
    return false;
  }
}
