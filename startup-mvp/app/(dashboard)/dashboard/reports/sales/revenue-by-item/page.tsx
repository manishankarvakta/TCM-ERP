import React from "react";
import { getRevenueByItem } from "../../_actions/sales-reports.action";
import RevenueByItemView from "./_components/revenue-by-item-view";
import PageGuard from "@/components/permissions/page-guard";
import { prisma } from "@/lib/prisma";
import { ItemType } from "@prisma/client";

interface RevenueByItemPageProps {
  searchParams: Promise<{
    itemId?: string;
    itemType?: string;
    clientId?: string;
    dateFrom?: string;
    dateTo?: string;
    warehouseId?: string;
    page?: string;
    limit?: string;
  }>;
}

export default async function RevenueByItemPage({
  searchParams,
}: RevenueByItemPageProps) {
  const params = await searchParams;
  const page = parseInt(params.page || "1", 10);
  const limit = parseInt(params.limit || "20", 10);

  const filters = {
    itemId: params.itemId || undefined,
    itemType: (params.itemType as ItemType | "all") || "all",
    clientId: params.clientId || undefined,
    dateFrom: params.dateFrom || undefined,
    dateTo: params.dateTo || undefined,
    warehouseId: params.warehouseId || undefined,
    page,
    limit,
  };

  const result = await getRevenueByItem(filters);

  // Get filter options
  const [warehouses, items, clients] = await Promise.all([
    prisma.warehouse.findMany({
      where: { status: "active", isTrash: false },
      select: { id: true, name: true, code: true },
      orderBy: { name: "asc" },
    }),
    prisma.item.findMany({
      where: {
        isTrash: false,
        itemType: { in: [ItemType.READY_PRODUCT, ItemType.RETAIL] },
      },
      select: { id: true, code: true, name: true, itemType: true },
      orderBy: { code: "asc" },
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
          <h1 className="text-2xl font-semibold">Revenue by Item Report</h1>
          <p className="text-sm text-muted-foreground">
            Sales breakdown by item with profit margins
          </p>
        </div>

        {!result.success ? (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
            <p className="text-sm text-destructive">
              {result.error || "Failed to load revenue by item"}
            </p>
          </div>
        ) : (
          <RevenueByItemView
            data={result.data}
            warehouses={warehouses}
            items={items}
            clients={clients as any}
            itemTypeOptions={itemTypeOptions}
            filters={filters}
            pagination={result.pagination || { page: 1, limit: 20, total: 0, totalPages: 0 }}
          />
        )}
      </div>
    </PageGuard>
  );
}
