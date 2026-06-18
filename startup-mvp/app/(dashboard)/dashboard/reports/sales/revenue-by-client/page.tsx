import React from "react";
import { getRevenueByClient } from "../../_actions/sales-reports.action";
import RevenueByClientView from "./_components/revenue-by-client-view";
import PageGuard from "@/components/permissions/page-guard";
import { prisma } from "@/lib/prisma";
import { ItemType } from "@prisma/client";

interface RevenueByClientPageProps {
  searchParams: Promise<{
    clientId?: string;
    dateFrom?: string;
    dateTo?: string;
    warehouseId?: string;
    itemType?: string;
  }>;
}

export default async function RevenueByClientPage({
  searchParams,
}: RevenueByClientPageProps) {
  const params = await searchParams;

  const filters = {
    clientId: params.clientId || undefined,
    dateFrom: params.dateFrom || undefined,
    dateTo: params.dateTo || undefined,
    warehouseId: params.warehouseId || undefined,
    itemType: (params.itemType as ItemType | "all") || "all",
  };

  const result = await getRevenueByClient(filters);

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
          <h1 className="text-2xl font-semibold">Revenue by Client Report</h1>
          <p className="text-sm text-muted-foreground">
            Sales breakdown by client
          </p>
        </div>

        {!result.success ? (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
            <p className="text-sm text-destructive">
              {result.error || "Failed to load revenue by client"}
            </p>
          </div>
        ) : (
          <RevenueByClientView
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
