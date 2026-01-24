"use client";

import ReportFilters from "@/components/reports/report-filters";
import ReportTable from "@/components/reports/report-table";
import { format } from "date-fns";

interface RawMaterialConsumptionViewProps {
  data: Array<{
    itemCode: string;
    itemName: string;
    warehouse: string;
    warehouseCode: string;
    totalConsumed: number;
    unit: string;
    averageCost: number;
    totalCost: number;
    productionOrdersCount: number;
    lastConsumptionDate: Date;
  }>;
  warehouses: Array<{ id: string; name: string; code: string }>;
  items: Array<{ id: string; code: string; name: string }>;
  filters: {
    itemId?: string;
    warehouseId?: string;
    dateFrom?: string;
    dateTo?: string;
    productionOrderId?: string;
  };
}

export default function RawMaterialConsumptionView({
  data,
  warehouses,
  items,
  filters,
}: RawMaterialConsumptionViewProps) {
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
      key: "warehouse",
      label: "Warehouse",
      sortable: true,
    },
    {
      key: "totalConsumed",
      label: "Total Consumed",
      sortable: true,
      align: "right" as const,
      format: (value: number) => value.toFixed(2),
    },
    {
      key: "unit",
      label: "Unit",
    },
    {
      key: "averageCost",
      label: "Average Cost",
      sortable: true,
      align: "right" as const,
      format: (value: number) =>
        new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "USD",
        }).format(value),
    },
    {
      key: "totalCost",
      label: "Total Cost",
      sortable: true,
      align: "right" as const,
      format: (value: number) =>
        new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "USD",
        }).format(value),
    },
    {
      key: "productionOrdersCount",
      label: "Production Orders",
      sortable: true,
      align: "right" as const,
    },
    {
      key: "lastConsumptionDate",
      label: "Last Consumption",
      sortable: true,
      format: (value: Date) => format(new Date(value), "MMM dd, yyyy"),
    },
  ];

  // Calculate totals
  const totals = data.reduce(
    (acc, item) => ({
      totalConsumed: acc.totalConsumed + item.totalConsumed,
      totalCost: acc.totalCost + item.totalCost,
    }),
    { totalConsumed: 0, totalCost: 0 }
  );

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
        title="Raw Material Consumption"
        columns={columns}
        data={data}
        exportFilename={`raw-material-consumption-${format(new Date(), "yyyy-MM-dd")}`}
        emptyMessage="No raw material consumption data available"
      />

      {data.length > 0 && (
        <div className="flex justify-end gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Total Consumed: </span>
            <span className="font-medium">{totals.totalConsumed.toFixed(2)}</span>
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
        </div>
      )}
    </div>
  );
}
