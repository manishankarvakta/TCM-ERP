import React from "react";
import { getRawMaterialConsumption } from "../../_actions/inventory-reports.action";
import RawMaterialConsumptionView from "./_components/raw-material-consumption-view";
import PageGuard from "@/components/permissions/page-guard";
import { prisma } from "@/lib/prisma";

interface RawMaterialConsumptionPageProps {
  searchParams: Promise<{
    itemId?: string;
    warehouseId?: string;
    dateFrom?: string;
    dateTo?: string;
    productionOrderId?: string;
    page?: string;
    limit?: string;
  }>;
}

export default async function RawMaterialConsumptionPage({
  searchParams,
}: RawMaterialConsumptionPageProps) {
  const params = await searchParams;
  const page = parseInt(params.page || "1", 10);
  const limit = parseInt(params.limit || "20", 10);

  const filters = {
    itemId: params.itemId || undefined,
    warehouseId: params.warehouseId || undefined,
    dateFrom: params.dateFrom || undefined,
    dateTo: params.dateTo || undefined,
    productionOrderId: params.productionOrderId || undefined,
    page,
    limit,
  };

  const result = await getRawMaterialConsumption(filters);

  // Get filter options
  const [warehouses, items] = await Promise.all([
    prisma.warehouse.findMany({
      where: { status: "active", isTrash: false },
      select: { id: true, name: true, code: true },
      orderBy: { name: "asc" },
    }),
    prisma.item.findMany({
      where: {
        trackInventory: true,
        isTrash: false,
        itemType: "RAW_MATERIAL",
      },
      select: { id: true, code: true, name: true },
      orderBy: { code: "asc" },
    }),
  ]);

  return (
    <PageGuard permissionKey="reports.view">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Raw Material Consumption Report</h1>
          <p className="text-sm text-muted-foreground">
            Raw material usage for production
          </p>
        </div>

        {!result.success ? (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
            <p className="text-sm text-destructive">
              {result.error || "Failed to load raw material consumption"}
            </p>
          </div>
        ) : (
          <RawMaterialConsumptionView
            data={result.data}
            warehouses={warehouses}
            items={items}
            filters={filters}
            pagination={result.pagination || { page: 1, limit: 20, total: 0, totalPages: 0 }}
          />
        )}
      </div>
    </PageGuard>
  );
}
