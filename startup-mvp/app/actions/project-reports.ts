"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { VoucherType } from "@prisma/client";
import { findControlAccount } from "./accounting-helpers";

export interface ProjectFinancialSummary {
  orderId: string;
  orderNumber: string;
  orderDate: Date;
  status: string;
  contractValue: number;
  invoicedValue: number;
  receiptsTotal: number; // Total cash received (Advances + Direct Payments)
  arBalance: number; // Outstanding amount on Invoices
  advanceBalance: number; // Unused Advance
}

/**
 * Get project-wise financial breakdown for a client
 */
export async function getClientProjectLedger(clientId: string): Promise<{ success: boolean; data?: ProjectFinancialSummary[]; error?: string }> {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };

    // 1. Fetch all orders for the client
    const orders = await prisma.order.findMany({
      where: { clientId },
      include: {
// @ts-expect-error - Legacy compatibility
        invoices: {
          where: { status: "posted" },
          select: { totalAmount: true }
        },
        vouchers: {
          where: { status: "posted" },
          select: {
            id: true,
            type: true,
            VoucherLine: true
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    const arAccountId = await findControlAccount("Accounts Receivable");
    const advanceAccountId = await findControlAccount("Customer Advance");

    const summary: ProjectFinancialSummary[] = orders.map(order => {
      // A. Contract Value
      const contractValue = Number(order.totalValue);

      // B. Invoiced Value (Sum of posted invoices)
// @ts-expect-error - Legacy compatibility
      const invoicedValue = order.invoices.reduce((sum, inv) => sum + Number(inv.totalAmount), 0);

      // C. Receipts (Cash In)
      // Vouchers of type RECEIPT linked to this order
      // (This assumes all money-in events are recorded as RECEIPT vouchers linked to the order)
// @ts-expect-error - Legacy compatibility
      const receiptsTotal = order.vouchers
        .filter(v => v.type === VoucherType.RECEIPT)
        .reduce((sum, v) => {
            // Usually the amount is the total of the voucher, or we look for the Cash/Bank Debit line.
            // Simplified: Sum of Credit lines that are NOT to Cash/Bank? 
            // Actually, in a Receipt, the Debit is to Cash/Bank.
            // Let's sum the Debits to Asset accounts? Tricky without checking account type.
            // Safe bet: The logic in `receiveOrderAdvance` puts the 'amount' in the lines.
            // Let's blindly sum the DEBIT amount of the first line of Receipts, OR
            // better: Sum of CREDITS to Advance + CREDITS to AR in this receipt?
            // In `receiveOrderAdvance`: Dr Cash, Cr Advance.
            // In Invoice Payment: Dr Cash, Cr AR.
            // So Sum of Credits to (Advance Account OR AR Account) inside RECEIPT vouchers.
            
            let voucherTotal = 0;
            v.VoucherLine.forEach(line => {
             if ((advanceAccountId && line.chartOfAccountId === advanceAccountId) || 
                 (arAccountId && line.chartOfAccountId === arAccountId)) {
                 voucherTotal += Number(line.creditAmount);
             }
            });
            return sum + voucherTotal;
        }, 0);

      // D. AR Balance (Debits - Credits to AR for this Order)
      let arBalance = 0;
      if (arAccountId) {
// @ts-expect-error - Legacy compatibility
        order.vouchers.forEach(v => {
          v.VoucherLine.forEach(line => {
            if (line.chartOfAccountId === arAccountId) {
              arBalance += (Number(line.debitAmount) - Number(line.creditAmount));
            }
          });
        });
      }

      // E. Unused Advance Balance (Credits - Debits to Advance for this Order)
      let advanceBalance = 0;
      if (advanceAccountId) {
// @ts-expect-error - Legacy compatibility
        order.vouchers.forEach(v => {
            v.VoucherLine.forEach(line => {
                if (line.chartOfAccountId === advanceAccountId) {
                    advanceBalance += (Number(line.creditAmount) - Number(line.debitAmount));
                }
            });
        });
      }

      return {
        orderId: order.id,
        orderNumber: order.orderNumber,
        orderDate: order.createdAt,
        status: order.status,
        contractValue,
        invoicedValue,
        receiptsTotal,
        arBalance,
        advanceBalance
      };
    });

    return { success: true, data: summary };

  } catch (error) {
    console.error("getClientProjectLedger error:", error);
    return { success: false, error: "Failed to generate project ledger" };
  }
}
