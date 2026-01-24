"use client";

import ReportFilters from "@/components/reports/report-filters";
import ReportTable from "@/components/reports/report-table";
import { format } from "date-fns";

interface RevenueByClientViewProps {
  data: Array<{
    clientName: string;
    clientCode: string;
    totalSalesCount: number;
    totalRevenue: number;
    totalItemsSold: number;
    averageOrderValue: number;
    firstSaleDate: Date | null;
    lastSaleDate: Date | null;
  }>;
  warehouses: Array<{ id: string; name: string; code: string }>;
  clients: Array<{ id: string; name: string; clientCode: string | null }>;
  itemTypeOptions: Array<{ value: string; label: string }>;
  filters: {
    clientId?: string;
    dateFrom?: string;
    dateTo?: string;
    warehouseId?: string;
    itemType?: string;
  };
}

export default function RevenueByClientView({
  data,
  warehouses,
  clients,
  itemTypeOptions,
  filters,
}: RevenueByClientViewProps) {
  const columns = [
    {
      key: "clientName",
      label: "Client Name",
      sortable: true,
    },
    {
      key: "clientCode",
      label: "Client Code",
      sortable: true,
    },
    {
      key: "totalSalesCount",
      label: "Total Sales",
      sortable: true,
      align: "right" as const,
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
      key: "totalItemsSold",
      label: "Items Sold",
      sortable: true,
      align: "right" as const,
      format: (value: number) => value.toFixed(2),
    },
    {
      key: "averageOrderValue",
      label: "Avg Order Value",
      sortable: true,
      align: "right" as const,
      format: (value: number) =>
        new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "USD",
        }).format(value),
    },
    {
      key: "firstSaleDate",
      label: "First Sale",
      sortable: true,
      format: (value: Date | null) =>
        value ? format(new Date(value), "MMM dd, yyyy") : "-",
    },
    {
      key: "lastSaleDate",
      label: "Last Sale",
      sortable: true,
      format: (value: Date | null) =>
        value ? format(new Date(value), "MMM dd, yyyy") : "-",
    },
  ];

  // Calculate totals
  const totals = data.reduce(
    (acc, item) => ({
      totalRevenue: acc.totalRevenue + item.totalRevenue,
      totalSales: acc.totalSales + item.totalSalesCount,
      totalItems: acc.totalItems + item.totalItemsSold,
    }),
    { totalRevenue: 0, totalSales: 0, totalItems: 0 }
  );

  return (
    <div className="space-y-4">
      <ReportFilters
        config={{
          warehouses,
          clients,
          itemTypes: itemTypeOptions,
        }}
        showDateRange={true}
        showWarehouse={true}
        showClient={true}
        showItemType={true}
        dateFrom={filters.dateFrom}
        dateTo={filters.dateTo}
        warehouseId={filters.warehouseId}
        clientId={filters.clientId}
        itemType={filters.itemType || "all"}
      />

      <ReportTable
        title="Revenue by Client"
        columns={columns}
        data={data}
        exportFilename={`revenue-by-client-${format(new Date(), "yyyy-MM-dd")}`}
        emptyMessage="No revenue data available"
      />

      {data.length > 0 && (
        <div className="flex justify-end gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Total Clients: </span>
            <span className="font-medium">{data.length}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Total Sales: </span>
            <span className="font-medium">{totals.totalSales}</span>
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
        </div>
      )}
    </div>
  );
}
