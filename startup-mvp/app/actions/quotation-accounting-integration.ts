"use server";

import { prisma } from "@/lib/prisma";
import { Prisma, VoucherType } from "@prisma/client";

/**
 * Helper function to find control account by name
 */
async function findControlAccount(accountName: string): Promise<string | null> {
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
async function generateVoucherNumber(): Promise<string> {
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
async function generateJournalEntryNumber(): Promise<string> {
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
function validateVoucherLines(lines: Array<{ debitAmount: number; creditAmount: number }>): {
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

/**
 * Create and auto-post a SALES voucher for an accepted quotation
 * This function is idempotent - it checks if a voucher already exists for this quotation
 * 
 * @param quotationId - The quotation ID
 * @param quotationNumber - The quotation number (for reference)
 * @param clientId - The client ID
 * @param amount - The total amount (grandTotal)
 * @param userId - The user ID creating the voucher
 * @param quotationDate - The quotation date (used as voucher date)
 * @returns Created voucher ID or null if already exists or error
 */
export async function createSalesVoucherForQuotation(
  quotationId: string,
  quotationNumber: string,
  clientId: string,
  amount: number,
  userId: string,
  quotationDate: Date
): Promise<{ success: boolean; voucherId: string | null; error?: string }> {
  try {
    // Check if voucher already exists for this quotation (idempotency check)
    // We check by looking for a SALES voucher with the quotation number in reference
    const existingVoucher = await prisma.voucher.findFirst({
      where: {
        type: VoucherType.SALES,
        reference: quotationNumber,
        clientId: clientId,
        status: {
          in: ["draft", "posted"],
        },
      },
      select: {
        id: true,
        status: true,
      },
    });

    if (existingVoucher) {
      // If voucher exists and is posted, return success (already processed)
      if (existingVoucher.status === "posted") {
        return {
          success: true,
          voucherId: existingVoucher.id,
        };
      }

      // If voucher exists but is draft, post it
      if (existingVoucher.status === "draft") {
        return await postExistingVoucher(existingVoucher.id, userId);
      }
    }

    // Validate amount
    if (!amount || amount <= 0) {
      return {
        success: false,
        voucherId: null,
        error: "Quotation amount must be greater than zero",
      };
    }

    // Find Accounts Receivable account
    const arAccountId = await findControlAccount("Accounts Receivable");
    if (!arAccountId) {
      return {
        success: false,
        voucherId: null,
        error: "Accounts Receivable control account not found. Please ensure it exists in Chart of Accounts.",
      };
    }

    // Find Sales account
    const salesAccountId = await findControlAccount("Sales");
    if (!salesAccountId) {
      return {
        success: false,
        voucherId: null,
        error: "Sales account not found. Please ensure it exists in Chart of Accounts.",
      };
    }

    // Create voucher lines
    const voucherLines = [
      {
        lineNumber: 1,
        debitAmount: amount,
        creditAmount: 0,
        description: `Sales invoice: ${quotationNumber}`,
        chartOfAccountId: arAccountId,
        clientId: clientId,
      },
      {
        lineNumber: 2,
        debitAmount: 0,
        creditAmount: amount,
        description: `Sales revenue: ${quotationNumber}`,
        chartOfAccountId: salesAccountId,
        clientId: clientId,
      },
    ];

    // Validate voucher lines
    const validation = validateVoucherLines(voucherLines);
    if (!validation.valid) {
      return {
        success: false,
        voucherId: null,
        error: validation.error,
      };
    }

    // Generate voucher number
    const voucherNumber = await generateVoucherNumber();

    // Create voucher and post it in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create voucher
      const voucher = await tx.voucher.create({
        data: {
          voucherNumber,
          date: quotationDate,
          type: VoucherType.SALES,
          reference: quotationNumber,
          description: `Sales voucher for quotation ${quotationNumber}`,
          status: "draft",
          createdBy: userId,
          clientId: clientId,
          voucherLines: {
            create: voucherLines.map((line) => ({
              lineNumber: line.lineNumber,
              debitAmount: new Prisma.Decimal(line.debitAmount),
              creditAmount: new Prisma.Decimal(line.creditAmount),
              description: line.description,
              chartOfAccountId: line.chartOfAccountId,
              clientId: line.clientId,
            })),
          },
        },
      });

      // Immediately post the voucher
      // Generate journal entry number
      const entryNumber = await generateJournalEntryNumber();

      // Create JournalEntry
      const journalEntry = await tx.journalEntry.create({
        data: {
          entryNumber,
          date: voucher.date,
          voucherId: voucher.id,
          description: voucher.description,
          status: "posted",
          createdBy: userId,
          postedBy: userId,
          postedAt: new Date(),
          journalEntryLines: {
            create: voucherLines.map((line) => ({
              lineNumber: line.lineNumber,
              debitAmount: new Prisma.Decimal(line.debitAmount),
              creditAmount: new Prisma.Decimal(line.creditAmount),
              description: line.description,
              chartOfAccountId: line.chartOfAccountId,
              clientId: line.clientId,
            })),
          },
        },
      });

      // Update voucher status to posted
      await tx.voucher.update({
        where: { id: voucher.id },
        data: {
          status: "posted",
          postedById: userId,
          postedAt: new Date(),
        },
      });

      return { voucherId: voucher.id, journalEntryId: journalEntry.id };
    });

    return {
      success: true,
      voucherId: result.voucherId,
    };
  } catch (error) {
    console.error("createSalesVoucherForQuotation error:", error);
    return {
      success: false,
      voucherId: null,
      error: error instanceof Error ? error.message : "Failed to create sales voucher",
    };
  }
}

/**
 * Post an existing draft voucher
 */
async function postExistingVoucher(
  voucherId: string,
  userId: string
): Promise<{ success: boolean; voucherId: string | null; error?: string }> {
  try {
    // Get voucher with lines
    const voucher = await prisma.voucher.findUnique({
      where: { id: voucherId },
      include: {
        voucherLines: {
          orderBy: {
            lineNumber: "asc",
          },
        },
      },
    });

    if (!voucher) {
      return {
        success: false,
        voucherId: null,
        error: "Voucher not found",
      };
    }

    if (voucher.status !== "draft") {
      return {
        success: false,
        voucherId: null,
        error: `Cannot post voucher with status "${voucher.status}"`,
      };
    }

    // Check if journal entry already exists
    const existingJournalEntry = await prisma.journalEntry.findFirst({
      where: { voucherId: voucher.id },
    });

    if (existingJournalEntry) {
      // Already posted, just update voucher status
      await prisma.voucher.update({
        where: { id: voucher.id },
        data: {
          status: "posted",
          postedById: userId,
          postedAt: new Date(),
        },
      });

      return {
        success: true,
        voucherId: voucher.id,
      };
    }

    // Validate voucher lines
    const validation = validateVoucherLines(
      voucher.voucherLines.map((line) => ({
        debitAmount: Number(line.debitAmount),
        creditAmount: Number(line.creditAmount),
      }))
    );

    if (!validation.valid) {
      return {
        success: false,
        voucherId: null,
        error: validation.error,
      };
    }

    // Generate journal entry number
    const entryNumber = await generateJournalEntryNumber();

    // Post voucher in transaction
    await prisma.$transaction(async (tx) => {
      // Create JournalEntry
      await tx.journalEntry.create({
        data: {
          entryNumber,
          date: voucher.date,
          voucherId: voucher.id,
          description: voucher.description,
          status: "posted",
          createdBy: voucher.createdBy,
          postedBy: userId,
          postedAt: new Date(),
          journalEntryLines: {
            create: voucher.voucherLines.map((line) => ({
              lineNumber: line.lineNumber,
              debitAmount: line.debitAmount,
              creditAmount: line.creditAmount,
              description: line.description,
              chartOfAccountId: line.chartOfAccountId,
              clientId: line.clientId || null,
              supplierId: line.supplierId || null,
              userId: line.userId || null,
              organizationId: line.organizationId || null,
            })),
          },
        },
      });

      // Update voucher status
      await tx.voucher.update({
        where: { id: voucher.id },
        data: {
          status: "posted",
          postedById: userId,
          postedAt: new Date(),
        },
      });
    });

    return {
      success: true,
      voucherId: voucher.id,
    };
  } catch (error) {
    console.error("postExistingVoucher error:", error);
    return {
      success: false,
      voucherId: null,
      error: error instanceof Error ? error.message : "Failed to post voucher",
    };
  }
}

