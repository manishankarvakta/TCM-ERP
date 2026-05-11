"use client";

import ReportFilters from "@/components/reports/report-filters";
import ReportTable from "@/components/reports/report-table";
import { format } from "date-fns";

interface CostPerBatchViewProps {
  data: Array<{
    productionOrderCode: string;
    finishedGoodItem: string;
    finishedGoodItemCode: string;
    bomName: string;
    bomCode: string;
    batchQuantity: number;
    rawMaterialCost: number;
    costPerUnit: number;
    completionDate: Date | null;
    warehouse: string;
    warehouseCode: string;
  }>;
  warehouses: Array<{ id: string; name: string; code: string }>;
  items: Array<{ id: string; code: string; name: string }>;
  boms: Array<{ id: string; name: string; code: string }>;
  filters: {
    itemId?: string;
    bomId?: string;
    warehouseId?: string;
    dateFrom?: string;
    dateTo?: string;
  };
}

export default function CostPerBatchView({
  data,
  warehouses,
  items,
  boms,
  filters,
}: CostPerBatchViewProps) {
  const columns = [
    {
      key: "productionOrderCode",
      label: "Order Code",
      sortable: true,
    },
    {
      key: "finishedGoodItem",
      label: "Ready Product",
      sortable: true,
    },
    {
      key: "bomName",
      label: "BOM",
      sortable: true,
    },
    {
      key: "batchQuantity",
      label: "Batch Quantity",
      sortable: true,
      align: "right" as const,
      format: (value: number) => value.toFixed(2),
    },
    {
      key: "rawMaterialCost",
      label: "Raw Material Cost",
      sortable: true,
      align: "right" as const,
      format: (value: number) =>
        new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "USD",
        }).format(value),
    },
    {
      key: "costPerUnit",
      label: "Cost Per Unit",
      sortable: true,
      align: "right" as const,
      format: (value: number) =>
        new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "USD",
        }).format(value),
    },
    {
      key: "completionDate",
      label: "Completion Date",
      sortable: true,
      format: (value: Date | null) =>
        value ? format(new Date(value), "MMM dd, yyyy") : "-",
    },
    {
      key: "warehouse",
      label: "Warehouse",
      sortable: true,
    },
  ];

  // Calculate averages
  const totals = data.reduce(
    (acc, item) => ({
      totalBatches: acc.totalBatches + 1,
      totalQuantity: acc.totalQuantity + item.batchQuantity,
      totalCost: acc.totalCost + item.rawMaterialCost,
    }),
    { totalBatches: 0, totalQuantity: 0, totalCost: 0 }
  );

  const averageCostPerUnit =
    totals.totalQuantity > 0 ? totals.totalCost / totals.totalQuantity : 0;

  return (
    <div className="space-y-4">
      <ReportFilters
        config={{
          warehouses,
          items,
        }}
        showDateRange={true}
        showWarehouse={true}
        showItem={true}
        dateFrom={filters.dateFrom}
        dateTo={filters.dateTo}
        warehouseId={filters.warehouseId}
        itemId={filters.itemId}
      />

      <ReportTable
        title="Cost Per Batch"
        columns={columns}
        data={data}
        exportFilename={`cost-per-batch-${format(new Date(), "yyyy-MM-dd")}`}
        emptyMessage="No cost per batch data available"
      />

      {data.length > 0 && (
        <div className="flex justify-end gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Total Batches: </span>
            <span className="font-medium">{totals.totalBatches}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Total Quantity: </span>
            <span className="font-medium">{totals.totalQuantity.toFixed(2)}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Total Cost: </span>
            <span className="font-medium">
              {new Intl.NumberFormat("en-US", {
                style: "currency",
                currency: "USD",
              }).format(totals.totalCost)}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground">Average Cost/Unit: </span>
            <span className="font-medium">
              {new Intl.NumberFormat("en-US", {
                style: "currency",
                currency: "USD",
              }).format(averageCostPerUnit)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
