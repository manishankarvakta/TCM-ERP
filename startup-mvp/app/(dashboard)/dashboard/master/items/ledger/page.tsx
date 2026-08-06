import React from "react";
import { getItemLedger } from "../_actions/item.action";
import { getActiveWarehouses } from "@/app/(dashboard)/dashboard/inventory/stock/_actions/stock.action";
import ItemLedger from "../_components/itemLedger";
import PageGuard from "@/components/permissions/page-guard";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

interface ItemLedgerPageProps {
  searchParams: Promise<{
    id?: string;
    startDate?: string;
    endDate?: string;
    warehouseId?: string;
    variantId?: string;
  }>;
}

export default async function ItemLedgerPage({ searchParams }: ItemLedgerPageProps) {
  const params = await searchParams;
  const itemId = params.id;

  if (!itemId) {
    notFound();
  }

  const [result, warehousesResult, org] = await Promise.all([
    getItemLedger(itemId, params.startDate, params.endDate, params.warehouseId, params.variantId),
    getActiveWarehouses(),
    prisma.organization.findFirst({ where: { status: "active" } }).catch(() => null),
  ]);

  if (!result.success || !result.item) {
    return (
      <div className="space-y-6">
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
          <p className="text-sm text-destructive">
            {result.error || "Failed to load item ledger"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <PageGuard permissionKey="master.items" requiredOperation="view">
      <ItemLedger
        item={result.item}
        variants={result.variants || []}
        ledger={result.ledger || []}
        summary={
          result.summary || {
            totalInQty: 0,
            totalOutQty: 0,
            currentStock: 0,
            totalAmount: 0,
            totalProfitLoss: 0,
            totalEntries: 0,
          }
        }
        warehouses={warehousesResult.success ? warehousesResult.warehouses || [] : []}
        initialStartDate={params.startDate}
        initialEndDate={params.endDate}
        initialWarehouseId={params.warehouseId}
        initialVariantId={params.variantId}
        organization={org}
      />
    </PageGuard>
  );
}
