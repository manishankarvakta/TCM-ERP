
import { prisma } from "@/lib/prisma";

/**
 * Helper function to find control account by name
 */
export async function findControlAccount(accountName: string): Promise<string | null> {
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
}

/**
 * Generate unique voucher number
 * Format: VCH-YYYY-XXXX (e.g., VCH-2025-0001)
 */
export async function generateVoucherNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `VCH-${year}-`;
  
  const lastVoucher = await prisma.voucher.findFirst({
    where: {
      voucherNumber: {
        startsWith: prefix,
      },
    },
    orderBy: {
      voucherNumber: "desc",
    },
  });

  let nextNumber = 1;
  if (lastVoucher) {
    const lastNumber = parseInt(lastVoucher.voucherNumber.split("-").pop() || "0");
    nextNumber = lastNumber + 1;
  }

  return `${prefix}${nextNumber.toString().padStart(4, "0")}`;
}

/**
 * Generate unique journal entry number
 * Format: JE-YYYY-XXXX (e.g., JE-2025-0001)
 */
export async function generateJournalEntryNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `JE-${year}-`;
  
  const lastEntry = await prisma.journalEntry.findFirst({
    where: {
      entryNumber: {
        startsWith: prefix,
      },
    },
    orderBy: {
      entryNumber: "desc",
    },
  });

  let nextNumber = 1;
  if (lastEntry) {
    const lastNumber = parseInt(lastEntry.entryNumber.split("-").pop() || "0");
    nextNumber = lastNumber + 1;
  }

  return `${prefix}${nextNumber.toString().padStart(4, "0")}`;
}

/**
 * Validate voucher lines for double-entry accounting
 */
export function validateVoucherLines(lines: Array<{ debitAmount: number; creditAmount: number }>): {
  valid: boolean;
  error?: string;
} {
  if (lines.length < 2) {
    return {
      valid: false,
      error: "Voucher must have at least 2 lines",
    };
  }

  const totalDebit = lines.reduce((sum, line) => sum + Number(line.debitAmount || 0), 0);
  const totalCredit = lines.reduce((sum, line) => sum + Number(line.creditAmount || 0), 0);

  const difference = Math.abs(totalDebit - totalCredit);
  if (difference > 0.01) {
    return {
      valid: false,
      error: `Double-entry balance mismatch: Debit total (${totalDebit.toFixed(2)}) must equal Credit total (${totalCredit.toFixed(2)})`,
    };
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const hasDebit = Number(line.debitAmount || 0) > 0;
    const hasCredit = Number(line.creditAmount || 0) > 0;

    if (hasDebit && hasCredit) {
      return {
        valid: false,
        error: `Line ${i + 1}: Cannot have both debit and credit amounts`,
      };
    }

    if (!hasDebit && !hasCredit) {
      return {
        valid: false,
        error: `Line ${i + 1}: Must have either debit or credit amount`,
      };
    }
  }

  return { valid: true };
}
