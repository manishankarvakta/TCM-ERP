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
