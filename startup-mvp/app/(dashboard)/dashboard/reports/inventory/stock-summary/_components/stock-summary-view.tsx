"use client";

import { useState } from "react";
import ReportFilters from "@/components/reports/report-filters";
import ReportTable from "@/components/reports/report-table";
import { format } from "date-fns";
import { ItemType } from "@prisma/client";

interface StockSummaryViewProps {
  data: Array<{
    itemCode: string;
    itemName: string;
    itemType: ItemType;
    warehouse: string;
    warehouseCode: string;
    currentQuantity: number;
    reservedQuantity: number;
    availableQuantity: number;
    unit: string;
    unitCost: number;
    totalValue: number;
    lastUpdated: Date;
  }>;
  warehouses: Array<{ id: string; name: string; code: string }>;
  items: Array<{ id: string; code: string; name: string; itemType: ItemType }>;
  filters: {
    warehouseId?: string;
    itemType?: ItemType | "all";
    itemId?: string;
    lowStockThreshold?: number;
  };
}

export default function StockSummaryView({
  data,
  warehouses,
  items,
  filters,
}: StockSummaryViewProps) {
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
      key: "warehouse",
      label: "Warehouse",
      sortable: true,
    },
    {
      key: "currentQuantity",
      label: "Current Qty",
      sortable: true,
      align: "right" as const,
      format: (value: number) => value.toFixed(2),
    },
    {
      key: "reservedQuantity",
      label: "Reserved Qty",
      sortable: true,
      align: "right" as const,
      format: (value: number) => value.toFixed(2),
    },
    {
      key: "availableQuantity",
      label: "Available Qty",
      sortable: true,
      align: "right" as const,
      format: (value: number) => value.toFixed(2),
    },
    {
      key: "unit",
      label: "Unit",
    },
    {
      key: "unitCost",
      label: "Unit Cost",
      sortable: true,
      align: "right" as const,
      format: (value: number) =>
        new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "USD",
        }).format(value),
    },
    {
      key: "totalValue",
      label: "Total Value",
      sortable: true,
      align: "right" as const,
      format: (value: number) =>
        new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "USD",
        }).format(value),
    },
    {
      key: "lastUpdated",
      label: "Last Updated",
      sortable: true,
      format: (value: Date) => format(new Date(value), "MMM dd, yyyy"),
    },
  ];

  const itemTypeOptions = [
    { value: "RAW_MATERIAL", label: "Raw Material" },
    { value: "READY_PRODUCT", label: "Ready Product" },
    { value: "RETAIL", label: "Retail" },
  ];

  // Calculate totals
  const totals = data.reduce(
    (acc, item) => ({
      totalValue: acc.totalValue + item.totalValue,
      totalQuantity: acc.totalQuantity + item.currentQuantity,
    }),
    { totalValue: 0, totalQuantity: 0 }
  );

  return (
    <div className="space-y-4">
      <ReportFilters
        config={{
          warehouses,
          items,
          itemTypes: itemTypeOptions,
        }}
        showWarehouse={true}
        showItem={true}
        showItemType={true}
        warehouseId={filters.warehouseId}
        itemId={filters.itemId}
        itemType={filters.itemType}
      />

      <ReportTable
        title="Stock Summary"
        columns={columns}
        data={data}
        exportFilename={`stock-summary-${format(new Date(), "yyyy-MM-dd")}`}
        emptyMessage="No stock data available"
      />

      {data.length > 0 && (
        <div className="flex justify-end gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Total Items: </span>
            <span className="font-medium">{data.length}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Total Quantity: </span>
            <span className="font-medium">{totals.totalQuantity.toFixed(2)}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Total Value: </span>
            <span className="font-medium">
              {new Intl.NumberFormat("en-US", {
                style: "currency",
                currency: "USD",
              }).format(totals.totalValue)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
