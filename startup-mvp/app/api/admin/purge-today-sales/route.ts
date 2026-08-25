import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    // Get today's start date (local midnight)
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);

    // Find all sales created today
    const todaySales = await prisma.sale.findMany({
      where: {
        createdAt: { gte: todayStart }
      },
      select: { id: true, saleNumber: true }
    });

    const saleIds = todaySales.map((s) => s.id);
    const saleNumbers = todaySales.map((s) => s.saleNumber);

    // 1. Delete SaleItems for today's sales
    if (saleIds.length > 0) {
      await prisma.saleItem.deleteMany({
        where: { saleId: { in: saleIds } }
      });
    }

    // 2. Find and delete related Accounting Vouchers & Journal Entries created today or referencing today's sales
    const todayVouchers = await prisma.voucher.findMany({
      where: {
        OR: [
          ...(saleNumbers.length > 0 ? [{ reference: { in: saleNumbers } }] : []),
          { createdAt: { gte: todayStart }, type: { in: ["SALES", "RETURN", "RECEIPT", "PAYMENT"] } }
        ]
      },
      select: { id: true }
    });

    const voucherIds = todayVouchers.map((v) => v.id);

    if (voucherIds.length > 0) {
      // Find journal entries linked to these vouchers
      const journalEntries = await prisma.journalEntry.findMany({
        where: { voucherId: { in: voucherIds } },
        select: { id: true }
      });
      const jeIds = journalEntries.map((je) => je.id);

      if (jeIds.length > 0) {
        // Delete JournalEntryLines
        await prisma.journalEntryLine.deleteMany({
          where: { journalEntryId: { in: jeIds } }
        });
        // Delete JournalEntries
        await prisma.journalEntry.deleteMany({
          where: { id: { in: jeIds } }
        });
      }

      // Delete VoucherLines
      await prisma.voucherLine.deleteMany({
        where: { voucherId: { in: voucherIds } }
      });

      // Delete Vouchers
      await prisma.voucher.deleteMany({
        where: { id: { in: voucherIds } }
      });
    }

    // 3. Delete StockLedger entries (inventory audit) created today or referencing today's sales
    const stockLedgerDelete = await prisma.stockLedger.deleteMany({
      where: {
        OR: [
          ...(saleIds.length > 0 ? [{ referenceId: { in: saleIds } }] : []),
          { createdAt: { gte: todayStart }, referenceType: { in: ["SALE", "SALE_RETURN", "SALE_EXCHANGE"] } }
        ]
      }
    });

    // 4. Delete Sale records for today
    let deletedCount = 0;
    if (saleIds.length > 0) {
      const deleteResult = await prisma.sale.deleteMany({
        where: { id: { in: saleIds } }
      });
      deletedCount = deleteResult.count;
    }

    revalidatePath("/dashboard/sales");
    revalidatePath("/dashboard/accounts");
    revalidatePath("/dashboard/reports");
    revalidatePath("/dashboard");

    return NextResponse.json({
      success: true,
      message: `Successfully purged today's test sales, inventory ledgers, and accounting vouchers.`,
      purgedSalesCount: deletedCount,
      purgedVouchersCount: voucherIds.length,
      purgedStockLedgersCount: stockLedgerDelete.count,
      purgedSaleNumbers: saleNumbers
    });
  } catch (error: any) {
    console.error("Purge today sales error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
