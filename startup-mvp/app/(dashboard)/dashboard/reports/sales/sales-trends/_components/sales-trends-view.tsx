"use client";

import { useState } from "react";
import ReportFilters from "@/components/reports/report-filters";
import ReportTable from "@/components/reports/report-table";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface SalesTrendsViewProps {
  data: Array<{
    period: string;
    numberOfSales: number;
    totalRevenue: number;
    averageOrderValue: number;
    numberOfItemsSold: number;
    numberOfClients: number;
    revenueTrend: number | null;
  }>;
  warehouses: Array<{ id: string; name: string; code: string }>;
  clients: Array<{ id: string; name: string; clientCode: string | null }>;
  itemTypeOptions: Array<{ value: string; label: string }>;
  filters: {
    dateFrom: string;
    dateTo: string;
    groupingPeriod: "daily" | "weekly" | "monthly";
    clientId?: string;
    warehouseId?: string;
    itemType?: string;
  };
}

export default function SalesTrendsView({
  data,
  warehouses,
  clients,
  itemTypeOptions,
  filters,
}: SalesTrendsViewProps) {
  const [groupingPeriod, setGroupingPeriod] = useState(filters.groupingPeriod);

  const columns = [
    {
      key: "period",
      label: "Period",
      sortable: true,
    },
    {
      key: "numberOfSales",
      label: "Sales Count",
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
      key: "numberOfItemsSold",
      label: "Items Sold",
      sortable: true,
      align: "right" as const,
      format: (value: number) => value.toFixed(2),
    },
    {
      key: "numberOfClients",
      label: "Clients",
      sortable: true,
      align: "right" as const,
    },
    {
      key: "revenueTrend",
      label: "Trend",
      sortable: true,
      align: "right" as const,
      format: (value: number | null) => {
        if (value === null) return "-";
        const isPositive = value >= 0;
        return `${isPositive ? "+" : ""}${value.toFixed(1)}%`;
      },
    },
  ];

  // Calculate totals
  const totals = data.reduce(
    (acc, item) => ({
      totalSales: acc.totalSales + item.numberOfSales,
      totalRevenue: acc.totalRevenue + item.totalRevenue,
      totalItems: acc.totalItems + item.numberOfItemsSold,
    }),
    { totalSales: 0, totalRevenue: 0, totalItems: 0 }
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

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold">Grouping Period</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="groupingPeriod">Group By</Label>
            <Select
              value={groupingPeriod}
              onValueChange={(value) => {
                setGroupingPeriod(value as "daily" | "weekly" | "monthly");
                const params = new URLSearchParams(window.location.search);
                params.set("groupingPeriod", value);
                window.location.search = params.toString();
              }}
            >
              <SelectTrigger id="groupingPeriod">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <ReportTable
        title="Sales Trends"
        columns={columns}
        data={data}
        exportFilename={`sales-trends-${format(new Date(), "yyyy-MM-dd")}`}
        emptyMessage="No sales trends data available"
      />

      {data.length > 0 && (
        <div className="flex justify-end gap-4 text-sm">
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
          <div>
            <span className="text-muted-foreground">Total Items Sold: </span>
            <span className="font-medium">{totals.totalItems.toFixed(2)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
