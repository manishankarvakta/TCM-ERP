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
  const vouchers = await prisma.voucher.findMany({
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
        vouchers={vouchers}
        isAdmin={isAdmin}
      />
    </PageGuard>
  );
}
