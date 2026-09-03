"use server";

import { prisma } from "@/lib/prisma";
import { Prisma, VoucherType } from "@prisma/client";
import { auth } from "@/lib/auth";
import { 
  findControlAccount, 
  generateVoucherNumber, 
  generateJournalEntryNumber, 
  validateVoucherLines 
} from "./accounting-helpers";

/**
 * Record an advance receipt for an order
 * Creates a RECEIPT voucher: DR Cash/Bank, CR Customer Advance
 * 
 * @param input - Receipt details
 */
export async function recordOrderAdvance(input: {
  orderId: string;
  clientId: string;
  amount: number;
  paymentAccountId: string; // The COA ID of the Cash/Bank account
  date?: Date;
  description?: string;
  userId?: string; // Optional override for server-to-server calls
}): Promise<{ success: boolean; voucherId?: string; error?: string }> {
  try {
    let effectiveUserId = input.userId;
    
    if (!effectiveUserId) {
      const session = await auth();
      effectiveUserId = session?.user?.id;
    }
    
    if (!effectiveUserId) {
      return { success: false, error: "Unauthorized" };
    }

    const { orderId, clientId, amount, paymentAccountId, date = new Date(), description } = input;

    // 1. Validation
    if (amount <= 0) {
      return { success: false, error: "Amount must be greater than zero" };
    }

    // Verify Order exists
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { orderNumber: true, clientId: true }
    });

    if (!order) {
      return { success: false, error: "Order not found" };
    }

    if (order.clientId !== clientId) {
      return { success: false, error: "Client mismatch: Order does not belong to the selected client" };
    }

    // 2. Find Customer Advance account
    const advanceAccountId = await findControlAccount("Customer Advance");
    if (!advanceAccountId) {
      return { success: false, error: "Customer Advance control account not found. Please run seed." };
    }

    // 3. Prepare Voucher Lines
    // DR Cash/Bank
    // CR Customer Advance
    const voucherLines = [
      {
        lineNumber: 1,
        debitAmount: amount,
        creditAmount: 0,
        description: description || `Advance for Order ${order.orderNumber}`,
        chartOfAccountId: paymentAccountId,
        clientId: null, // Cash/Bank standardly doesn't need sub-ledger
      },
      {
        lineNumber: 2,
        debitAmount: 0,
        creditAmount: amount,
        description: description || `Advance receipt for Order ${order.orderNumber}`,
        chartOfAccountId: advanceAccountId,
        clientId: clientId, // Sub-ledger for Customer Advance
      }
    ];

    // Validate double-entry
    const validation = validateVoucherLines(voucherLines);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    // 4. Create and Post Voucher
    const voucherNumber = await generateVoucherNumber();
    const entryNumber = await generateJournalEntryNumber();

    const result = await prisma.$transaction(async (tx) => {
      // Create Voucher
      const voucher = await tx.voucher.create({
// @ts-expect-error - Legacy compatibility
        data: {
          voucherNumber,
          date: date,
          type: VoucherType.RECEIPT,
          reference: order.orderNumber,
          description: description || `Advance receipt for Order ${order.orderNumber}`,
          status: "posted",
          createdBy: effectiveUserId,
          clientId: clientId,
          orderId: orderId, // Linked via the new relation
          postedById: effectiveUserId,
          postedAt: new Date(),
          VoucherLine: {
            create: voucherLines.map((line) => ({
              id: crypto.randomUUID(),
              updatedAt: new Date(),
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
          postedById: effectiveUserId,
          postedAt: new Date(),
        },
      });

      // Create Journal Entry
      await tx.journalEntry.create({
        data: {
          id: crypto.randomUUID(), // Explicit ID
          entryNumber,
          date: voucher.date,
          voucherId: voucher.id,
          description: voucher.description,
          status: "posted",
          createdBy: effectiveUserId,
          postedBy: effectiveUserId,
          postedAt: new Date(),
          JournalEntryLine: {
            create: voucherLines.map((line) => ({
              id: crypto.randomUUID(),
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

      return voucher.id;
    });

    return { success: true, voucherId: result };
  } catch (error) {
    console.error("recordOrderAdvance error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to record advance receipt",
    };
  }
}
