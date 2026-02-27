"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { Prisma, VoucherType } from "@prisma/client";
import { generateVoucherNumber, generateJournalEntryNumber, findControlAccount } from "./accounting-helpers";

/**
 * Receive an advance payment for an order
 * 
 * Flow:
 * 1. Validate permissions and order
 * 2. Debit: Cash/Bank Account (Asset)
 * 3. Credit: Customer Advance Account (Liability - 2150)
 * 4. Create Receipt Voucher linked to Order
 */
export async function receiveOrderAdvance(input: {
  orderId: string;
  amount: number;
  paymentAccountId: string; // The ID of the Cash or Bank account receiving money
  date?: Date;
  reference?: string;
  description?: string;
  userId?: string; // Optional override for tests
}) {
  try {
    let effectiveUserId = input.userId;
    if (!effectiveUserId) {
        const session = await auth();
        effectiveUserId = session?.user?.id;
    }
    if (!effectiveUserId) return { success: false, error: "Unauthorized" };
    const userId = effectiveUserId;

    const { orderId, amount, paymentAccountId, date = new Date(), reference, description } = input;

    if (amount <= 0) return { success: false, error: "Amount must be greater than zero" };

    // 1. Fetch Order and Client
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { 
        id: true, 
        orderNumber: true, 
        clientId: true,
        Client: { select: { name: true } }
      }
    });

    if (!order) return { success: false, error: "Order not found" };

    // 2. Resolve Accounts
    // Target: Customer Advance (Liability)
    const advanceAccountId = await findControlAccount("Customer Advance");

    if (!advanceAccountId) {
      return { success: false, error: "Customer Advance account not found. Please contact admin." };
    }

    // Source: Payment Account (Verify it exists)
    const paymentAccount = await prisma.chartOfAccount.findUnique({
      where: { id: paymentAccountId }
    });


    if (!paymentAccount) {
      return { success: false, error: "Selected payment account not found" };
    }

    // 3. Prepare Voucher Data
    const voucherNumber = await generateVoucherNumber();
    const entryNumber = await generateJournalEntryNumber();
    const finalDescription = description || `Advance received for Order ${order.orderNumber}`;

    // 4. Execute Transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create Voucher
      const voucher = await tx.voucher.create({
        data: {
          voucherNumber,
          date,
          type: VoucherType.RECEIPT,
          reference: reference || order.orderNumber,
          description: finalDescription,
          status: "posted",
          createdBy: userId,
          postedById: userId,
          postedAt: new Date(),
          clientId: order.clientId,
          orderId: order.id,
          VoucherLine: {
            create: [
              {
                // Line 1: DEBIT the Asset (Cash/Bank) - Money Coming In
                lineNumber: 1,
                debitAmount: new Prisma.Decimal(amount),
                creditAmount: new Prisma.Decimal(0),
                chartOfAccountId: paymentAccountId,
                clientId: order.clientId, // Optional tracking
                description: `Receipt into ${paymentAccount.name}`
              },
              {
                // Line 2: CREDIT the Liability (Customer Advance) - Obligation Created
                lineNumber: 2,
                debitAmount: new Prisma.Decimal(0),
                creditAmount: new Prisma.Decimal(amount),
                chartOfAccountId: advanceAccountId,
                clientId: order.clientId,
                description: `Advance from ${order.Client.name}`
              }
            ]
          }
        }
      });

      // Create Journal Entry
      await tx.journalEntry.create({
        data: {
          entryNumber,
          date: voucher.date,
          voucherId: voucher.id,
          description: voucher.description,
          status: "posted",
          createdBy: userId,
          postedBy: userId,
          postedAt: new Date(),
          JournalEntryLine: {
            create: [
              {
                lineNumber: 1,
                debitAmount: new Prisma.Decimal(amount),
                creditAmount: new Prisma.Decimal(0),
                chartOfAccountId: paymentAccountId,
                clientId: order.clientId,
                description: `Receipt into ${paymentAccount.name}`
              },
              {
                lineNumber: 2,
                debitAmount: new Prisma.Decimal(0),
                creditAmount: new Prisma.Decimal(amount),
                chartOfAccountId: advanceAccountId,
                clientId: order.clientId,
                description: `Advance from ${order.Client.name}`
              }
            ]
          }
        }
      });

      return voucher;
    });

    return { success: true, voucherId: result.id };

  } catch (error) {
    console.error("receiveOrderAdvance error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to process advance" };
  }
}
