import React from "react";
import { getStockSummary } from "../../_actions/inventory-reports.action";
import StockSummaryView from "./_components/stock-summary-view";
import PageGuard from "@/components/permissions/page-guard";
import { prisma } from "@/lib/prisma";

interface StockSummaryPageProps {
  searchParams: Promise<{
    warehouseId?: string;
    itemType?: string;
    itemId?: string;
    lowStockThreshold?: string;
  }>;
}

export default async function StockSummaryPage({
  searchParams,
}: StockSummaryPageProps) {
  const params = await searchParams;

  const filters = {
    warehouseId: params.warehouseId || undefined,
    itemType: (params.itemType as any) || "all",
    itemId: params.itemId || undefined,
    lowStockThreshold:
      params.lowStockThreshold ? Number(params.lowStockThreshold) : undefined,
  };

  const result = await getStockSummary(filters);

  // Get filter options
  const [warehouses, items] = await Promise.all([
    prisma.warehouse.findMany({
      where: { status: "active", isTrash: false },
      select: { id: true, name: true, code: true },
      orderBy: { name: "asc" },
    }),
    prisma.item.findMany({
      where: { trackInventory: true, isTrash: false },
      select: { id: true, code: true, name: true, itemType: true },
      orderBy: { code: "asc" },
    }),
  ]);

  return (
    <PageGuard permissionKey="reports.view">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Stock Summary Report</h1>
          <p className="text-sm text-muted-foreground">
            Current stock levels by item and warehouse
          </p>
        </div>

        {!result.success ? (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
            <p className="text-sm text-destructive">
              {result.error || "Failed to load stock summary"}
            </p>
          </div>
        ) : (
          <StockSummaryView
            data={result.data}
            warehouses={warehouses}
            items={items}
            filters={filters}
          />
        )}
      </div>
    </PageGuard>
  );
}
