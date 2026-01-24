"use client";

import ReportFilters from "@/components/reports/report-filters";
import ReportTable from "@/components/reports/report-table";
import { format } from "date-fns";
import { ItemType } from "@prisma/client";

interface RevenueByItemViewProps {
  data: Array<{
    itemCode: string;
    itemName: string;
    itemType: ItemType;
    totalQuantitySold: number;
    unit: string;
    totalRevenue: number;
    averageUnitPrice: number;
    numberOfSales: number;
    cogs: number;
    grossProfit: number;
    grossProfitMargin: number;
  }>;
  warehouses: Array<{ id: string; name: string; code: string }>;
  items: Array<{ id: string; code: string; name: string; itemType: ItemType }>;
  clients: Array<{ id: string; name: string; clientCode: string | null }>;
  itemTypeOptions: Array<{ value: string; label: string }>;
  filters: {
    itemId?: string;
    itemType?: ItemType | "all";
    clientId?: string;
    dateFrom?: string;
    dateTo?: string;
    warehouseId?: string;
  };
}

export default function RevenueByItemView({
  data,
  warehouses,
  items,
  clients,
  itemTypeOptions,
  filters,
}: RevenueByItemViewProps) {
  const columns = [
    {
      key: "itemCode",
      label: "Item Code",
      sortable: true,
    },
    {
      key: "itemName",
      label: "Item Name",
      sortable: true,
    },
    {
      key: "itemType",
      label: "Type",
      sortable: true,
    },
    {
      key: "totalQuantitySold",
      label: "Qty Sold",
      sortable: true,
      align: "right" as const,
      format: (value: number) => value.toFixed(2),
    },
    {
      key: "unit",
      label: "Unit",
    },
    {
      key: "totalRevenue",
      label: "Total Revenue",
      sortable: true,
      align: "right" as const,
      format: (value: number) =>
        new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "USD",
        }).format(value),
    },
    {
      key: "averageUnitPrice",
      label: "Avg Unit Price",
      sortable: true,
      align: "right" as const,
      format: (value: number) =>
        new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "USD",
        }).format(value),
    },
    {
      key: "numberOfSales",
      label: "Sales Count",
      sortable: true,
      align: "right" as const,
    },
    {
      key: "cogs",
      label: "COGS",
      sortable: true,
      align: "right" as const,
      format: (value: number) =>
        new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "USD",
        }).format(value),
    },
    {
      key: "grossProfit",
      label: "Gross Profit",
      sortable: true,
      align: "right" as const,
      format: (value: number) =>
        new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "USD",
        }).format(value),
    },
    {
      key: "grossProfitMargin",
      label: "Profit Margin %",
      sortable: true,
      align: "right" as const,
      format: (value: number) => `${value.toFixed(2)}%`,
    },
  ];

  // Calculate totals
  const totals = data.reduce(
    (acc, item) => ({
      totalRevenue: acc.totalRevenue + item.totalRevenue,
      totalCOGS: acc.totalCOGS + item.cogs,
      totalProfit: acc.totalProfit + item.grossProfit,
    }),
    { totalRevenue: 0, totalCOGS: 0, totalProfit: 0 }
  );

  const overallMargin =
    totals.totalRevenue > 0
      ? (totals.totalProfit / totals.totalRevenue) * 100
      : 0;

  return (
    <div className="space-y-4">
      <ReportFilters
        config={{
          warehouses,
          items,
          clients,
          itemTypes: itemTypeOptions,
        }}
        showDateRange={true}
        showWarehouse={true}
        showItem={true}
        showClient={true}
        showItemType={true}
        dateFrom={filters.dateFrom}
        dateTo={filters.dateTo}
        warehouseId={filters.warehouseId}
        itemId={filters.itemId}
        clientId={filters.clientId}
        itemType={filters.itemType || "all"}
      />

      <ReportTable
        title="Revenue by Item"
        columns={columns}
        data={data}
        exportFilename={`revenue-by-item-${format(new Date(), "yyyy-MM-dd")}`}
        emptyMessage="No revenue data available"
      />

      {data.length > 0 && (
        <div className="flex justify-end gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Total Items: </span>
            <span className="font-medium">{data.length}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Total Revenue: </span>
            <span className="font-medium">
              {new Intl.NumberFormat("en-US", {
                style: "currency",
                currency: "USD",
              }).format(totals.totalRevenue)}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground">Total COGS: </span>
            <span className="font-medium">
              {new Intl.NumberFormat("en-US", {
                style: "currency",
                currency: "USD",
              }).format(totals.totalCOGS)}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground">Total Profit: </span>
            <span className="font-medium">
              {new Intl.NumberFormat("en-US", {
                style: "currency",
                currency: "USD",
              }).format(totals.totalProfit)}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground">Overall Margin: </span>
            <span className="font-medium">{overallMargin.toFixed(2)}%</span>
          </div>
        </div>
      )}
    </div>
  );
}
