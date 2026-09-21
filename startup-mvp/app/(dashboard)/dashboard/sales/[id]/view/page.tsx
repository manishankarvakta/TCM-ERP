import React from "react";
import { getSaleById } from "../../_actions/sale.action";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import PageGuard from "@/components/permissions/page-guard";
import SaleDetailsClient from "./_components/sale-details-client";
import { auth } from "@/lib/auth";

interface SaleDetailsPageProps {
  params: Promise<{ id: string }>;
}

export default async function SaleDetailsPage({ params }: SaleDetailsPageProps) {
  const { id } = await params;

  const [result, org] = await Promise.all([
    getSaleById(id),
    prisma.organization.findFirst({ where: { status: "active" } }).catch(() => null),
  ]);

  if (!result.success || !result.sale) {
    notFound();
  }

  const sale = result.sale;

  const notesStr = sale.notes || "";
  let extractedMembershipDiscount = 0;
  const match = notesStr.match(/Includes Membership Discount of ৳([\d.]+)/);
  if (match && match[1]) {
    extractedMembershipDiscount = Number(match[1]);
  }

  const paymentDetails = (sale as any).paymentDetails as {
    cashAmount?: number;
    cashAccountId?: string;
    cardAmount?: number;
    cardAccountId?: string;
    mfsAmount?: number;
    mfsAccountId?: string;
  } | null;

  let cashAccount = null;
  let cardAccount = null;
  let mfsAccount = null;

  if (paymentDetails) {
    if (paymentDetails.cashAccountId) {
      cashAccount = await prisma.chartOfAccount.findUnique({
        where: { id: paymentDetails.cashAccountId },
        select: { code: true, name: true }
      });
    }
    if (paymentDetails.cardAccountId) {
      cardAccount = await prisma.chartOfAccount.findUnique({
        where: { id: paymentDetails.cardAccountId },
        select: { code: true, name: true }
      });
    }
    if (paymentDetails.mfsAccountId) {
      mfsAccount = await prisma.chartOfAccount.findUnique({
        where: { id: paymentDetails.mfsAccountId },
        select: { code: true, name: true }
      });
    }
  }

  // If cashAccount is null (e.g. Return sale or missing paymentDetails), resolve using warehouse location
  const warehouseId = (sale as any).warehouseId || sale.warehouse?.id;
  if (!cashAccount && warehouseId) {
    const { getWarehouseCashAccount } = await import("../../_actions/sale.action");
    const warehouseCashAcctId = await getWarehouseCashAccount(warehouseId);
    if (warehouseCashAcctId) {
      cashAccount = await prisma.chartOfAccount.findUnique({
        where: { id: warehouseCashAcctId },
        select: { code: true, name: true }
      });
    }
  }

  // Fetch associated accounting vouchers
  const rawVouchers = await prisma.voucher.findMany({
    where: {
      OR: [
        { reference: sale.saleNumber },
        { id: (sale as any).voucherId || "non-existent" },
      ],
    },
    include: {
      VoucherLine: {
        include: {
          ChartOfAccount: { select: { id: true, code: true, name: true, type: true } },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  const vouchers = rawVouchers.map((v) => ({
    ...v,
    VoucherLine: v.VoucherLine.map((line) => ({
      ...line,
      debitAmount: Number(line.debitAmount || 0),
      creditAmount: Number(line.creditAmount || 0),
    })),
  }));

  // Load accounting settings to fetch mapped discount accounts
  const { getAccountingOperationSettings } = await import("@/lib/accounting-settings");
  let couponDiscountAccount = null;
  let salesDiscountAccount = null;

  try {
    const settings = await getAccountingOperationSettings();
    if (settings.sales.couponDiscountAccountId) {
      couponDiscountAccount = await prisma.chartOfAccount.findUnique({
        where: { id: settings.sales.couponDiscountAccountId },
        select: { code: true, name: true }
      });
    }
    if (settings.sales.salesDiscountAccountId) {
      salesDiscountAccount = await prisma.chartOfAccount.findUnique({
        where: { id: settings.sales.salesDiscountAccountId },
        select: { code: true, name: true }
      });
    }
  } catch (err) {
    console.error("Failed to load discount accounts in sale details page:", err);
  }

  let previousDue = 0;
  const targetClientId = sale.client?.id || (sale as any).clientId;
  if (targetClientId) {
    const openingBal = Number(sale.client?.openingBalance || 0);
    const coaId = (sale.client as any)?.ChartOfAccount?.id;
    let hasOpeningJournal = false;
    if (coaId) {
      const journalMatch = await prisma.journalEntryLine.findFirst({
        where: {
          chartOfAccountId: coaId,
          description: { contains: "opening balance", mode: "insensitive" },
        },
      });
      if (journalMatch) hasOpeningJournal = true;
    }

    if (openingBal > 0 && !hasOpeningJournal) {
      previousDue += openingBal;
    }

    const previousSales = await prisma.sale.findMany({
      where: {
        clientId: targetClientId,
        status: "COMPLETED",
        isTrash: false,
        id: { not: sale.id },
        createdAt: { lte: sale.createdAt },
      },
    });

    for (const pSale of previousSales) {
      const pGrandTotal = pSale.grandTotal.toNumber();
      const pDetails = pSale.paymentDetails as any;

      let pInitialPaid = 0;
      let pTotalCollected = 0;

      if (pDetails) {
        pInitialPaid = Number(pDetails.cashAmount || 0) + Number(pDetails.cardAmount || 0) + Number(pDetails.mfsAmount || 0) - Number(pDetails.changeAmount || 0);

        if (Array.isArray(pDetails.dueCollections)) {
          for (const col of pDetails.dueCollections) {
            pTotalCollected += Number(col.cashAmount || 0) + Number(col.cardAmount || 0) + Number(col.mfsAmount || 0);
          }
        }
      }

      const pRemainingDue = Number((pGrandTotal - pInitialPaid - pTotalCollected).toFixed(2));
      if (pRemainingDue > 0.01) {
        previousDue += pRemainingDue;
      }
    }

    const standaloneReceipts = await prisma.voucher.findMany({
      where: {
        clientId: targetClientId,
        type: "RECEIPT",
        status: "posted",
        createdAt: { lte: sale.createdAt },
        sales: { none: {} },
        AND: [
          { reference: { not: { startsWith: "SAL-" } } },
          { reference: { not: { startsWith: "EXC-" } } },
          { reference: { not: { startsWith: "RET-" } } },
        ],
      },
      include: {
        VoucherLine: true,
      },
    });

    for (const vReceipt of standaloneReceipts) {
      const vAmount = vReceipt.VoucherLine.reduce(
        (sum, line) => sum + Number(line.creditAmount || 0),
        0
      );
      previousDue = Math.max(0, previousDue - vAmount);
    }
  }

  const session = await auth().catch(() => null);
  const isAdmin = session?.user?.role === "admin";

  return (
    <PageGuard permissionKey="sales.sales" requiredOperation="view">
      <SaleDetailsClient
        sale={sale}
        organization={org}
        cashAccount={cashAccount}
        cardAccount={cardAccount}
        mfsAccount={mfsAccount}
        couponDiscountAccount={couponDiscountAccount}
        salesDiscountAccount={salesDiscountAccount}
        extractedMembershipDiscount={extractedMembershipDiscount}
        previousDue={previousDue}
        vouchers={vouchers}
        isAdmin={isAdmin}
      />
    </PageGuard>
  );
}
