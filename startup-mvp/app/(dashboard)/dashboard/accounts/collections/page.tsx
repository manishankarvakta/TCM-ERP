import React from "react";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import PageGuard from "@/components/permissions/page-guard";
import { serializeData } from "@/lib/utils/serialization";
import CollectionsView from "./_components/collections-view";

interface CollectionsPageProps {
  searchParams: Promise<{
    search?: string;
  }>;
}

export default async function CollectionsPage({ searchParams }: CollectionsPageProps) {
  const params = await searchParams;
  const search = params.search || "";

  const session = await auth();
  const userId = session?.user?.id;

  const canView = userId
    ? (await hasPermission(userId, "accounts.vouchers", "view") ||
       await hasPermission(userId, "accounts.accounts-receivable", "view"))
    : false;

  if (!canView) {
    return <div className="p-8 text-center text-destructive">Access Denied</div>;
  }

  // Fetch invoices for collections
  const whereFilter: any = {};
  if (search) {
    whereFilter.OR = [
      { invoiceNumber: { contains: search, mode: "insensitive" } },
      { Order: { Client: { name: { contains: search, mode: "insensitive" } } } },
    ];
  }

  const invoices = await prisma.invoice.findMany({
    where: whereFilter,
    orderBy: { date: "desc" },
    include: {
      Order: {
        include: {
          Client: {
            select: {
              id: true,
              name: true,
              email: true,
              company: true,
            },
          },
        },
      },
    },
  });

  let totalCollected = 0;
  let totalOutstanding = 0;
  let unpaidCount = 0;

  for (const inv of invoices) {
    const total = Number(inv.totalAmount || 0);
    const isPaid = inv.status === "PAID" || inv.status === "paid";
    const paid = isPaid ? total : 0;
    totalCollected += paid;
    totalOutstanding += isPaid ? 0 : total;
    if (!isPaid) {
      unpaidCount++;
    }
  }

  const serializedInvoices = serializeData(invoices);

  return (
    <PageGuard permissionKey="accounts.vouchers">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Payment Collections</h1>
          <p className="text-sm text-muted-foreground">
            Track customer payment receipts, outstanding balances, and collection history
          </p>
        </div>

        <CollectionsView
          invoices={serializedInvoices}
          totalCollected={totalCollected}
          totalOutstanding={totalOutstanding}
          unpaidCount={unpaidCount}
        />
      </div>
    </PageGuard>
  );
}
