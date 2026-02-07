
"use server";

import { prisma } from "@/lib/prisma";
import { Prisma, VoucherType, InventoryTransactionType } from "@prisma/client";
import { 
  findControlAccount, 
  generateVoucherNumber, 
  generateJournalEntryNumber, 
  validateVoucherLines 
} from "./accounting-helpers";
import { processInventoryMovement } from "./inventory-accounting";

/**
 * Process purchase receipt:
 * 1. Create Purchase Voucher (Debit Inventory, Credit AP)
 * 2. Post Voucher (Create Journal Entry)
 * 3. Update Inventory Stock (processInventoryMovement)
 */
export async function processPurchaseReceipt(
  purchaseId: string, 
  userId: string
): Promise<{ success: boolean; voucherId?: string; error?: string }> {
  try {
    // 1. Fetch Purchase with Items
    const purchase = await prisma.purchase.findUnique({
      where: { id: purchaseId },
      include: { items: true, supplier: true }
    });

    if (!purchase) {
      return { success: false, error: "Purchase not found" };
    }

    // Check if already processed (Idempotency)
    // We check if a voucher exists with this purchase number as reference
    const existingVoucher = await prisma.voucher.findFirst({
      where: {
        type: VoucherType.PURCHASE,
        reference: purchase.purchaseNumber,
      }
    });

    if (existingVoucher) {
       return { success: true, voucherId: existingVoucher.id, error: "Purchase already processed (Voucher exists)" };
    }

    // 2. Identify Control Accounts
    // Inventory Asset Account
    // Accounts Payable Account
    const inventoryAccountId = await findControlAccount("Inventory Asset"); // Fallback check needed?
    const apAccountId = await findControlAccount("Accounts Payable");

    if (!inventoryAccountId) return { success: false, error: "Control Account 'Inventory Asset' not found" };
    if (!apAccountId) return { success: false, error: "Control Account 'Accounts Payable' not found" };

    // 3. Prepare Voucher Lines
    const grandTotal = Number(purchase.grandTotal);
    
    // Debit Inventory (Asset Increase)
    // Credit AP (Liability Increase)
    const voucherLines = [
      {
        lineNumber: 1,
        debitAmount: grandTotal,
        creditAmount: 0,
        description: `Purchase Inventory: ${purchase.purchaseNumber}`,
        chartOfAccountId: inventoryAccountId,
        organizationId: null, // Optional: Link to org?
      },
      {
        lineNumber: 2,
        debitAmount: 0,
        creditAmount: grandTotal,
        description: `Purchase Payable: ${purchase.supplier.name}`,
        chartOfAccountId: apAccountId,
        supplierId: purchase.supplierId,
      }
    ];

    const validation = validateVoucherLines(voucherLines);
    if (!validation.valid) return { success: false, error: "Accounting validation failed: " + validation.error };

    // 4. Execute Transaction
    const result = await prisma.$transaction(async (tx) => {
       // A. Create Voucher
       const voucherNumber = await generateVoucherNumber(); // Note: inside tx this might be risky if generic is not tx-aware, but distinct enough. ideally pass tx to generator. 
       // For now assuming low concurrency or retry.
       
       const voucher = await tx.voucher.create({
         data: {
           voucherNumber,
           date: new Date(),
           type: VoucherType.PURCHASE,
           reference: purchase.purchaseNumber,
           description: `Purchase Receipt for ${purchase.purchaseNumber}`,
           status: "posted", // Direct post
           createdBy: userId,
           postedById: userId,
           postedAt: new Date(),
           VoucherLine: {
             create: voucherLines.map((line) => ({
               lineNumber: line.lineNumber,
               debitAmount: new Prisma.Decimal(line.debitAmount),
               creditAmount: new Prisma.Decimal(line.creditAmount),
               description: line.description,
               chartOfAccountId: line.chartOfAccountId,
               supplierId: line.supplierId
             }))
           }
         }
       });

       // B. Create Journal Entry
       const entryNumber = await generateJournalEntryNumber();
       await tx.journalEntry.create({
         data: {
           entryNumber,
           date: new Date(),
           voucherId: voucher.id,
           description: voucher.description,
           status: "posted",
           createdBy: userId,
           postedBy: userId,
           postedAt: new Date(),
           JournalEntryLine: {
             create: voucherLines.map((line) => ({
               lineNumber: line.lineNumber,
               debitAmount: new Prisma.Decimal(line.debitAmount),
               creditAmount: new Prisma.Decimal(line.creditAmount),
               description: line.description,
               chartOfAccountId: line.chartOfAccountId,
               supplierId: line.supplierId
             }))
           }
         }
       });

       // C. Process Inventory Movements
       for (const item of purchase.items) {
         if (item.itemId) {
           await processInventoryMovement({
             tx,
             itemId: item.itemId,
             quantity: Number(item.quantity), // Positive = IN
             type: InventoryTransactionType.PURCHASE,
             reference: voucher.id,
             note: `Purchase: ${purchase.purchaseNumber}`,
             userId
           });
         }
       }

       // D. Ensure Purchase is Marked Received
       if (purchase.status !== "RECEIVED") {
         await tx.purchase.update({
           where: { id: purchaseId },
           data: { status: "RECEIVED" } // Or equivalent enum
         });
       }
       
       return voucher;
    });

    return { success: true, voucherId: result.id };

  } catch (error) {
    console.error("processPurchaseReceipt error", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}
