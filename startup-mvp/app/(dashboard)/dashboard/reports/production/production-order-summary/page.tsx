import React from "react";
import { getProductionOrderSummary } from "../../_actions/production-reports.action";
import ProductionOrderSummaryView from "./_components/production-order-summary-view";
import PageGuard from "@/components/permissions/page-guard";
import { prisma } from "@/lib/prisma";
import { ProductionOrderStatus } from "@prisma/client";

interface ProductionOrderSummaryPageProps {
  searchParams: Promise<{
    page?: string;
    status?: string;
    warehouseId?: string;
    itemId?: string;
    bomId?: string;
    dateFrom?: string;
    dateTo?: string;
    dateRangeType?: string;
  }>;
}

export default async function ProductionOrderSummaryPage({
  searchParams,
}: ProductionOrderSummaryPageProps) {
  const params = await searchParams;
  const page = parseInt(params.page || "1");

  const filters = {
    status:
      params.status && params.status !== "all"
        ? (params.status as ProductionOrderStatus)
        : "all",
    warehouseId: params.warehouseId || undefined,
    itemId: params.itemId || undefined,
    bomId: params.bomId || undefined,
    dateFrom: params.dateFrom || undefined,
    dateTo: params.dateTo || undefined,
    dateRangeType: (params.dateRangeType as "created" | "completed") || "created",
  };

  const result = await getProductionOrderSummary(filters as any, { page, limit: 50 });

  // Get filter options
  const [warehouses, items, boms] = await Promise.all([
    prisma.warehouse.findMany({
      where: { status: "active", isTrash: false },
      select: { id: true, name: true, code: true },
      orderBy: { name: "asc" },
    }),
    prisma.item.findMany({
      where: {
        isTrash: false,
        itemType: "READY_PRODUCT",
      },
      select: { id: true, code: true, name: true },
      orderBy: { code: "asc" },
    }),
    prisma.bOM.findMany({
      where: { status: "active", isTrash: false },
      select: { id: true, name: true, code: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const statusOptions = [
    { value: "PLANNED", label: "Planned" },
    { value: "IN_PROGRESS", label: "In Progress" },
    { value: "COMPLETED", label: "Completed" },
    { value: "CANCELLED", label: "Cancelled" },
  ];

  return (
    <PageGuard permissionKey="reports.view">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Production Order Summary</h1>
          <p className="text-sm text-muted-foreground">
            Overview of all production orders
          </p>
        </div>

        {!result.success ? (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
            <p className="text-sm text-destructive">
              {result.error || "Failed to load production order summary"}
            </p>
          </div>
        ) : (
          <ProductionOrderSummaryView
            data={result.data}
            pagination={result.pagination}
            statusBreakdown={result.statusBreakdown as any}
            warehouses={warehouses}
            items={items}
            boms={boms}
            statusOptions={statusOptions}
            filters={filters as any}
          />
        )}
      </div>
    </PageGuard>
  );
}
