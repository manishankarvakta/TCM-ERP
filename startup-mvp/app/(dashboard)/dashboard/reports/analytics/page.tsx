import React from "react";
import { getAnalyticsData } from "../_actions/analytics.action";
import AnalyticsDashboardView from "./_components/analytics-dashboard-view";
import PageGuard from "@/components/permissions/page-guard";
import { prisma } from "@/lib/prisma";
import { ItemType } from "@prisma/client";

interface AnalyticsPageProps {
  searchParams: Promise<{
    dateFrom?: string;
    dateTo?: string;
    warehouseId?: string;
    itemType?: string;
  }>;
}

export default async function AnalyticsPage({
  searchParams,
}: AnalyticsPageProps) {
  const params = await searchParams;

  // Default to last 30 days
  const defaultDateTo = new Date();
  const defaultDateFrom = new Date();
  defaultDateFrom.setDate(defaultDateFrom.getDate() - 30);

  const filters = {
    dateFrom: params.dateFrom || defaultDateFrom.toISOString().split("T")[0],
    dateTo: params.dateTo || defaultDateTo.toISOString().split("T")[0],
    warehouseId: params.warehouseId || undefined,
    itemType: (params.itemType as ItemType | "all") || "all",
  };

  const result = await getAnalyticsData(filters);

  // Get filter options
  const [warehouses] = await Promise.all([
    prisma.warehouse.findMany({
      where: { status: "active", isTrash: false },
      select: { id: true, name: true, code: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const itemTypeOptions = [
    { value: "RAW_MATERIAL", label: "Raw Material" },
    { value: "READY_PRODUCT", label: "Ready Product" },
    { value: "RETAIL", label: "Retail" },
  ];

  return (
    <PageGuard permissionKey="reports.view">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Analytics Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Comprehensive analytics with charts and visualizations
          </p>
        </div>

        {!result.success ? (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
            <p className="text-sm text-destructive">
              {result.error || "Failed to load analytics data"}
            </p>
          </div>
        ) : (
          <AnalyticsDashboardView
            data={result.data}
            warehouses={warehouses}
            itemTypeOptions={itemTypeOptions}
            filters={filters}
          />
        )}
      </div>
    </PageGuard>
  );
}
