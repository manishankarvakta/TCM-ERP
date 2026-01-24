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
 * Uses the isControl flag from the database
 */
export async function isControlAccount(accountId: string): Promise<boolean> {
  try {
    const account = await prisma.chartOfAccount.findUnique({
      where: { id: accountId },
      select: {
        isControl: true,
      },
    });

    return account?.isControl || false;
  } catch (error) {
    console.error("isControlAccount error:", error);
    return false;
  }
}
