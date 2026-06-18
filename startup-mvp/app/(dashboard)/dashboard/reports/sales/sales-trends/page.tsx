import React from "react";
import { getSalesTrends } from "../../_actions/sales-reports.action";
import SalesTrendsView from "./_components/sales-trends-view";
import PageGuard from "@/components/permissions/page-guard";
import { prisma } from "@/lib/prisma";
import { ItemType } from "@prisma/client";

interface SalesTrendsPageProps {
  searchParams: Promise<{
    dateFrom?: string;
    dateTo?: string;
    groupingPeriod?: string;
    clientId?: string;
    warehouseId?: string;
    itemType?: string;
  }>;
}

export default async function SalesTrendsPage({
  searchParams,
}: SalesTrendsPageProps) {
  const params = await searchParams;

  // Default to last 30 days if no dates provided
  const defaultDateTo = new Date();
  const defaultDateFrom = new Date();
  defaultDateFrom.setDate(defaultDateFrom.getDate() - 30);

  const filters = {
    dateFrom: params.dateFrom || defaultDateFrom.toISOString().split("T")[0],
    dateTo: params.dateTo || defaultDateTo.toISOString().split("T")[0],
    groupingPeriod: (params.groupingPeriod as "daily" | "weekly" | "monthly") || "daily",
    clientId: params.clientId || undefined,
    warehouseId: params.warehouseId || undefined,
    itemType: (params.itemType as ItemType | "all") || "all",
  };

  const result = await getSalesTrends(filters);

  // Get filter options
  const [warehouses, clients] = await Promise.all([
    prisma.warehouse.findMany({
      where: { status: "active", isTrash: false },
      select: { id: true, name: true, code: true },
      orderBy: { name: "asc" },
    }),
    prisma.client.findMany({
      where: { status: "active" },
      select: { id: true, name: true, clientCode: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const itemTypeOptions = [
    { value: "READY_PRODUCT", label: "Ready Product" },
    { value: "RETAIL", label: "Retail" },
  ];

  return (
    <PageGuard permissionKey="reports.view">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Sales Trends Report</h1>
          <p className="text-sm text-muted-foreground">
            Sales trends over time with charts
          </p>
        </div>

        {!result.success ? (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
            <p className="text-sm text-destructive">
              {result.error || "Failed to load sales trends"}
            </p>
          </div>
        ) : (
          <SalesTrendsView
            data={result.data}
            warehouses={warehouses}
            clients={clients as any}
            itemTypeOptions={itemTypeOptions}
            filters={filters}
          />
        )}
      </div>
    </PageGuard>
  );
}
