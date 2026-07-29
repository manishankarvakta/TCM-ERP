"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidateBothPaths } from "@/lib/route-utils-server";
import { VoucherType } from "@prisma/client";
import { createVoucher, postVoucher } from "@/app/(dashboard)/dashboard/accounts/vouchers/_actions/voucher.action";

export interface OutstandingSale {
  id: string;
  saleNumber: string;
  date: Date;
  grandTotal: number;
  initialPaid: number;
  totalCollected: number;
  remainingDue: number;
}

export async function getOutstandingSales(clientId: string) {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Unauthorized", sales: [] };
    }

    const sales = await prisma.sale.findMany({
      where: {
        clientId,
        status: "COMPLETED",
        isTrash: false,
      },
      orderBy: {
        date: "asc",
      },
    });

    const outstanding: OutstandingSale[] = [];

    for (const sale of sales) {
      const grandTotal = Number(sale.grandTotal);
      const details = sale.paymentDetails as any;

      let initialPaid = 0;
      let totalCollected = 0;

      if (details) {
        initialPaid = Number(details.cashAmount || 0) + Number(details.cardAmount || 0) + Number(details.mfsAmount || 0) - Number(details.changeAmount || 0);

        if (Array.isArray(details.dueCollections)) {
          for (const col of details.dueCollections) {
            totalCollected += Number(col.cashAmount || 0) + Number(col.cardAmount || 0) + Number(col.mfsAmount || 0);
          }
        }
      }

      const remainingDue = Number((grandTotal - initialPaid - totalCollected).toFixed(2));

      if (remainingDue > 0.01) {
        outstanding.push({
          id: sale.id,
          saleNumber: sale.saleNumber,
          date: sale.date,
          grandTotal,
          initialPaid,
          totalCollected,
          remainingDue,
        });
      }
    }

    return { success: true, sales: outstanding };
  } catch (error) {
    console.error("getOutstandingSales error:", error);
    return { success: false, error: "Failed to fetch outstanding sales", sales: [] };
  }
}

interface DueCollectionPayload {
  clientId: string;
  cashAmount: number;
  cashAccountId?: string;
  cardAmount: number;
  cardAccountId?: string;
  mfsAmount: number;
  mfsAccountId?: string;
  allocations: Array<{ saleId: string; amountToPay: number }>;
}

export async function collectCustomerDue(payload: DueCollectionPayload) {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Unauthorized" };
    }

    const { clientId, cashAmount, cashAccountId, cardAmount, cardAccountId, mfsAmount, mfsAccountId, allocations } = payload;
    const totalCollected = Number((cashAmount + cardAmount + mfsAmount).toFixed(2));
    const totalAllocated = Number(allocations.reduce((sum, item) => sum + item.amountToPay, 0).toFixed(2));

    if (totalCollected <= 0) {
      return { success: false, error: "Payment amount must be greater than zero." };
    }

    if (Math.abs(totalCollected - totalAllocated) > 0.01) {
      return { success: false, error: "Total paid amount does not match the sum of invoice allocations." };
    }

    const clientObj = await prisma.client.findUnique({
      where: { id: clientId },
      select: {
        name: true,
        chartOfAccountId: true,
      },
    });

    if (!clientObj) {
      return { success: false, error: "Client not found." };
    }

    // Resolve accounts settings to get default sales accounts
    const salesAccounts = await prisma.settings.findFirst({
      where: { code: "sales_accounts" },
    });
    const parsedSalesAccounts = salesAccounts ? (salesAccounts.settings as any) : {};
    const receivableAccountId = clientObj.chartOfAccountId || parsedSalesAccounts.receivableAccountId;

    if (!receivableAccountId) {
      return { success: false, error: "Client Accounts Receivable ledger not configured." };
    }

    // Start database transaction
    const result = await prisma.$transaction(async (tx) => {
      const collectionId = `COLL_${Date.now()}`;
      
      // Update each sale record with proportional payment allocation log
      for (const alloc of allocations) {
        const sale = await tx.sale.findUnique({
          where: { id: alloc.saleId },
        });

        if (!sale) {
          throw new Error(`Sale not found: ${alloc.saleId}`);
        }

        const ratio = alloc.amountToPay / totalAllocated;
        const allocCash = Number((cashAmount * ratio).toFixed(2));
        const allocCard = Number((cardAmount * ratio).toFixed(2));
        const allocMfs = Number((mfsAmount * ratio).toFixed(2));

        const originalDetails = sale.paymentDetails ? (sale.paymentDetails as any) : {};
        const collectionsList = Array.isArray(originalDetails.dueCollections) ? [...originalDetails.dueCollections] : [];

        collectionsList.push({
          id: collectionId,
          date: new Date(),
          cashAmount: allocCash,
          cashAccountId: cashAccountId || null,
          cardAmount: allocCard,
          cardAccountId: cardAccountId || null,
          mfsAmount: allocMfs,
          mfsAccountId: mfsAccountId || null,
        });

        const newDetails = {
          ...originalDetails,
          dueCollections: collectionsList,
        };

        await tx.sale.update({
          where: { id: alloc.saleId },
          data: {
            paymentDetails: newDetails,
          },
        });
      }

      // Generate Receipt Voucher Lines
      const voucherLines: any[] = [];
      let lineNum = 1;

      // 1. Debit lines (Cash / Card / MFS)
      if (cashAmount > 0 && cashAccountId) {
        voucherLines.push({
          lineNumber: lineNum++,
          debitAmount: cashAmount,
          creditAmount: 0,
          description: `Due collection (Cash) - ${clientObj.name}`,
          chartOfAccountId: cashAccountId,
        });
      }

      if (cardAmount > 0 && cardAccountId) {
        voucherLines.push({
          lineNumber: lineNum++,
          debitAmount: cardAmount,
          creditAmount: 0,
          description: `Due collection (Card) - ${clientObj.name}`,
          chartOfAccountId: cardAccountId,
        });
      }

      if (mfsAmount > 0 && mfsAccountId) {
        voucherLines.push({
          lineNumber: lineNum++,
          debitAmount: mfsAmount,
          creditAmount: 0,
          description: `Due collection (MFS/Wallet) - ${clientObj.name}`,
          chartOfAccountId: mfsAccountId,
        });
      }

      // 2. Credit line (Accounts Receivable reduction)
      voucherLines.push({
        lineNumber: lineNum++,
        debitAmount: 0,
        creditAmount: totalCollected,
        description: `Due collection payment - ${clientObj.name}`,
        chartOfAccountId: receivableAccountId,
        clientId: clientId,
      });

      // Create Voucher
      const voucherResult = await createVoucher({
        date: new Date(),
        type: VoucherType.RECEIPT,
        reference: collectionId,
        description: `Due Collection - ${clientObj.name}`,
        clientId: clientId,
        isSystemAction: true,
        lines: voucherLines,
      }, tx);

      if (!voucherResult.success || !voucherResult.voucher) {
        throw new Error(voucherResult.error || "Failed to create due collection receipt voucher");
      }

      // Post Voucher
      const postResult = await postVoucher(voucherResult.voucher.id, tx, true);
      if (!postResult.success) {
        throw new Error(postResult.error || "Failed to post due collection receipt voucher");
      }

      return { success: true };
    });

    if (result.success) {
      revalidateBothPaths("/dashboard/sales");
    }

    return result;
  } catch (error) {
    console.error("collectCustomerDue error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to process due collection" };
  }
}
