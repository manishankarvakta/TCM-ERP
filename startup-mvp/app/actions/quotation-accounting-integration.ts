"use server";

import { prisma } from "@/lib/prisma";
import { Prisma, VoucherType } from "@prisma/client";

import { 
  findControlAccount, 
  generateVoucherNumber, 
  generateJournalEntryNumber, 
  validateVoucherLines 
} from "./accounting-helpers";

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
    if (!arAccountId) return { success: false, error: "Accounts Receivable control account not found." };

    // Find Sales account
    const salesAccountId = await findControlAccount("Sales");
    if (!salesAccountId) return { success: false, error: "Sales account not found." };

    // Find Inventory & COGS accounts
    const inventoryAccountId = await findControlAccount("Inventory Asset");
    const cogsAccountId = await findControlAccount("Cost of Goods Sold");
    
    // Fetch Quotation Items to calculate COGS
    const quotation = await prisma.quotation.findUnique({
      where: { id: quotationId },
      include: {
        section: {
          include: {
            items: { include: { item: true } },
            groups: {
              include: {
                items: { include: { item: true } }
              }
            },
            categoryGroups: {
              include: {
                 items: { include: { item: true } }
              }
            }
          }
        }
      }
    });

    if (!quotation) return { success: false, error: "Quotation not found" };

    // Calculate COGS and Gather Items
    let totalCOGS = 0;
    const inventoryItems: Array<{ itemId: string; quantity: number }> = [];

    // Helper to process items
    const processItems = (items: any[]) => {
      for (const qItem of items) {
        if (qItem.item) {
           const qty = Number(qItem.quantity);
           const cost = Number(qItem.item.costPrice || 0); // Assuming costPrice exists on Item
           totalCOGS += qty * cost;
           inventoryItems.push({ itemId: qItem.item.id, quantity: qty });
        }
      }
    };

    // Flatten structure
    quotation.section.forEach(sec => {
      processItems(sec.items);
      sec.groups.forEach(grp => processItems(grp.items));
      sec.categoryGroups.forEach(cat => processItems(cat.items));
    });

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

    // Add COGS Lines if applicable (and if accounts exist)
    if (totalCOGS > 0 && inventoryAccountId && cogsAccountId) {
      voucherLines.push({
        lineNumber: 3,
        debitAmount: totalCOGS,
        creditAmount: 0,
        description: `Cost of Goods Sold: ${quotationNumber}`,
        chartOfAccountId: cogsAccountId,
        clientId: null,
      });
      voucherLines.push({
        lineNumber: 4,
        debitAmount: 0,
        creditAmount: totalCOGS,
        description: `Inventory Consumption: ${quotationNumber}`,
        chartOfAccountId: inventoryAccountId,
        clientId: null,
      });
    }

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
          VoucherLine: {
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
          JournalEntryLine: {
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

      // Process Inventory Movements (Reduce Stock)
      // Import helper dynamically or at top? Assuming available
      const { processInventoryMovement } = await import("./inventory-accounting"); 
      const { InventoryTransactionType } = await import("@prisma/client");

      for (const item of inventoryItems) {
        await processInventoryMovement({
          tx,
          itemId: item.itemId,
          quantity: -1 * item.quantity, // Negative for OUT
          type: InventoryTransactionType.SALE, // Ensure Enum is imported
          reference: voucher.id,
          note: `Sale: ${quotationNumber}`,
          userId
        });
      }

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
        VoucherLine: {
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
      voucher.VoucherLine.map((line) => ({
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
          JournalEntryLine: {
            create: voucher.VoucherLine.map((line) => ({
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

