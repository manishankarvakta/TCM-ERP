
"use server";

import { prisma } from "@/lib/prisma";
import { Prisma, InventoryTransactionType, VoucherType } from "@prisma/client";
import { 
  findControlAccount, 
  generateVoucherNumber, 
  generateJournalEntryNumber, 
  validateVoucherLines 
} from "./accounting-helpers";
import { processInventoryMovement } from "./inventory-accounting";
import { randomUUID } from "crypto";

/**
 * Adjust Inventory Stock (Gain/Loss)
 * Creates accounting vouchers to reflect value change.
 * 
 * @param itemId Item ID to adjust
 * @param quantityChange Net change in quantity (Positive = Gain, Negative = Loss)
 * @param reason Mandatory reason for adjustment
 * @param userId User performing the adjustment
 */
export async function adjustInventory(
  itemId: string,
  quantityChange: number,
  reason: string,
  userId: string
): Promise<{ success: boolean; voucherId?: string; error?: string }> {
  try {
    if (quantityChange === 0) return { success: true }; // No change
    if (!reason) return { success: false, error: "Adjustment reason is required" };

    // 1. Fetch Item for Cost Price
    const item = await prisma.item.findUnique({
      where: { id: itemId }
    });

    if (!item) return { success: false, error: "Item not found" };

    const costPrice = Number(item.costPrice || 0);
    if (costPrice <= 0) return { success: false, error: "Item cost price invalid or zero. Cannot value adjustment." };

    const amount = Math.abs(quantityChange) * costPrice;

    // 2. Identify Accounts
    // Inventory Asset (Control)
    const inventoryAccountId = await findControlAccount("Inventory Asset");
    // Inventory Adjustment (Expense)
    const adjustmentAccountId = await findControlAccount("Inventory Adjustment Gain/Loss");

    if (!inventoryAccountId) return { success: false, error: "Inventory Asset account not found" };
    if (!adjustmentAccountId) return { success: false, error: "Inventory Adjustment account not found" };

    // 3. Determine DR/CR based on Gain/Loss
    // Gain (Qty > 0): Asset Increases (DR Inventory), Income/Expense Offset (CR Adjustment)
    // Loss (Qty < 0): Asset Decreases (CR Inventory), Expense Increases (DR Adjustment)
    
    let debitAccount: string;
    let creditAccount: string;
    let description: string;

    if (quantityChange > 0) {
      // Gain
      debitAccount = inventoryAccountId;
      creditAccount = adjustmentAccountId;
      description = `Inventory Adjustment (Gain): ${item.code} - ${reason}`;
    } else {
      // Loss
      debitAccount = adjustmentAccountId;
      creditAccount = inventoryAccountId;
      description = `Inventory Adjustment (Loss): ${item.code} - ${reason}`;
    }

    const voucherLines = [
      {
        lineNumber: 1,
        debitAmount: amount,
        creditAmount: 0,
        chartOfAccountId: debitAccount,
        description
      },
      {
        lineNumber: 2,
        debitAmount: 0,
        creditAmount: amount,
        chartOfAccountId: creditAccount,
        description
      }
    ];

    const validation = validateVoucherLines(voucherLines);
    if (!validation.valid) return { success: false, error: validation.error };

    // 4. Transaction: Voucher + Journal + Stock Update
    const result = await prisma.$transaction(async (tx) => {
       // A. Voucher
       const voucherNumber = await generateVoucherNumber();
       const voucher = await tx.voucher.create({
// @ts-expect-error - Legacy compatibility
         data: {
           id: randomUUID(),
           voucherNumber,
           date: new Date(),
           type: VoucherType.ADJUSTMENT,
           reference: `ADJ-${itemId}-${Date.now()}`,
           description,
           status: "posted",
           createdBy: userId,
           postedById: userId,
           postedAt: new Date(),
           updatedAt: new Date(),
           VoucherLine: {
             create: voucherLines.map(line => ({
               id: randomUUID(),
               updatedAt: new Date(),
               lineNumber: line.lineNumber,
               debitAmount: new Prisma.Decimal(line.debitAmount),
               creditAmount: new Prisma.Decimal(line.creditAmount),
               description: line.description,
               chartOfAccountId: line.chartOfAccountId
             }))
           }
         }
       });

       // B. Journal Entry
       const entryNumber = await generateJournalEntryNumber();
       await tx.journalEntry.create({
         data: {
           id: randomUUID(),
           entryNumber,
           date: new Date(),
           voucherId: voucher.id,
           description,
           status: "posted",
           createdBy: userId,
           postedBy: userId,
           postedAt: new Date(),
           JournalEntryLine: {
             create: voucherLines.map(line => ({
               id: randomUUID(),
               lineNumber: line.lineNumber,
               debitAmount: new Prisma.Decimal(line.debitAmount),
               creditAmount: new Prisma.Decimal(line.creditAmount),
               description: line.description,
               chartOfAccountId: line.chartOfAccountId
             }))
           }
         }
       });

       // C. Stock Update
       await processInventoryMovement({
         tx,
         itemId,
         quantity: quantityChange,
         type: InventoryTransactionType.ADJUSTMENT,
         reference: voucher.id,
         note: reason,
         userId
       });

       return voucher;
    });

    return { success: true, voucherId: result.id };

  } catch (error) {
    console.error("adjustInventory error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Details unknown" };
  }
}
