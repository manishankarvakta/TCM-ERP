import React from "react";
import { getCostPerBatch } from "../../_actions/production-reports.action";
import CostPerBatchView from "./_components/cost-per-batch-view";
import PageGuard from "@/components/permissions/page-guard";
import { prisma } from "@/lib/prisma";

interface CostPerBatchPageProps {
  searchParams: Promise<{
    itemId?: string;
    bomId?: string;
    warehouseId?: string;
    dateFrom?: string;
    dateTo?: string;
  }>;
}

export default async function CostPerBatchPage({
  searchParams,
}: CostPerBatchPageProps) {
  const params = await searchParams;

  const filters = {
    itemId: params.itemId || undefined,
    bomId: params.bomId || undefined,
    warehouseId: params.warehouseId || undefined,
    dateFrom: params.dateFrom || undefined,
    dateTo: params.dateTo || undefined,
  };

  const result = await getCostPerBatch(filters);

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

  return (
    <PageGuard permissionKey="reports.view">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Cost Per Batch Report</h1>
          <p className="text-sm text-muted-foreground">
            Production cost analysis by batch
          </p>
        </div>

        {!result.success ? (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
            <p className="text-sm text-destructive">
              {result.error || "Failed to load cost per batch"}
            </p>
          </div>
        ) : (
          <CostPerBatchView
            data={result.data}
            warehouses={warehouses}
            items={items}
            boms={boms}
            filters={filters}
          />
        )}
      </div>
    </PageGuard>
  );
}
