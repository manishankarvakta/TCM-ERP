"use client";

import ReportFilters from "@/components/reports/report-filters";
import BarChart from "@/components/reports/charts/bar-chart";
import LineChart from "@/components/reports/charts/line-chart";
import PieChart from "@/components/reports/charts/pie-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FiDownload } from "react-icons/fi";
import { exportToCSV } from "@/lib/utils/export-csv";
import { format } from "date-fns";
import { ItemType } from "@prisma/client";

interface AnalyticsDashboardViewProps {
  data: {
    inventory: {
      stockValueByType: Array<{ type: string; value: number }>;
      topItemsByValue: Array<{ itemCode: string; itemName: string; value: number }>;
      lowStockAlerts: Array<{ itemCode: string; itemName: string; availableQuantity: number }>;
      movementTrends: Array<{ date: string; in: number; out: number }>;
    };
    sales: {
      revenueTrend: Array<{ period: string; revenue: number }>;
      revenueByItemType: Array<{ type: string; revenue: number }>;
      topClientsByRevenue: Array<{ clientName: string; revenue: number }>;
      salesByWarehouse: Array<{ warehouseId: string; revenue: number }>;
    };
    production: {
      ordersByStatus: Array<{ status: string; count: number }>;
      volumeTrend: Array<{ period: string; volume: number }>;
      costPerBatchTrend: Array<{ period: string; averageCost: number }>;
      topFinishedGoods: Array<{ itemCode: string; itemName: string; volume: number }>;
    };
  } | null;
  warehouses: Array<{ id: string; name: string; code: string }>;
  itemTypeOptions: Array<{ value: string; label: string }>;
  filters: {
    dateFrom: string;
    dateTo: string;
    warehouseId?: string;
    itemType?: ItemType | "all";
  };
}

const itemTypeLabels: Record<string, string> = {
  RAW_MATERIAL: "Raw Material",
  READY_PRODUCT: "Ready Product",
  RETAIL: "Retail",
};

export default function AnalyticsDashboardView({
  data,
  warehouses,
  itemTypeOptions,
  filters,
}: AnalyticsDashboardViewProps) {
  if (!data) {
    return (
      <div className="flex items-center justify-center py-8">
        <p className="text-sm text-muted-foreground">No analytics data available</p>
      </div>
    );
  }

  const handleExportChartData = (chartName: string, chartData: any[]) => {
    exportToCSV(chartData, { filename: `${chartName}-${format(new Date(), "yyyy-MM-dd")}.csv` });
  };

  return (
    <div className="space-y-6">
      <ReportFilters
        config={{
          warehouses,
          itemTypes: itemTypeOptions,
        }}
        showDateRange={true}
        showWarehouse={true}
        showItemType={true}
        dateFrom={filters.dateFrom}
        dateTo={filters.dateTo}
        warehouseId={filters.warehouseId}
        itemType={filters.itemType || "all"}
      />

      {/* Inventory Analytics */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Inventory Analytics</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <PieChart
            title="Stock Value by Item Type"
            data={data.inventory.stockValueByType.map((item) => ({
              label: itemTypeLabels[item.type as ItemType] || item.type,
              value: item.value,
            }))}
            valueFormatter={(value) =>
              `৳ ${new Intl.NumberFormat("en-BD", {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              }).format(value)}`
            }
          />
          <BarChart
            title="Top 10 Items by Value"
            data={data.inventory.topItemsByValue.map((item) => ({
              label: `${item.itemCode} - ${item.itemName}`,
              value: item.value,
            }))}
            valueFormatter={(value) =>
              `৳ ${new Intl.NumberFormat("en-BD", {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              }).format(value)}`
            }
          />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold">Low Stock Alerts</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    handleExportChartData("low-stock-alerts", data.inventory.lowStockAlerts)
                  }
                >
                  <FiDownload className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {data.inventory.lowStockAlerts.length === 0 ? (
                <p className="text-sm text-muted-foreground">No low stock items</p>
              ) : (
                <div className="space-y-2">
                  {data.inventory.lowStockAlerts.map((item) => (
                    <div
                      key={item.itemCode}
                      className="flex items-center justify-between text-sm"
                    >
                      <span>{item.itemCode} - {item.itemName}</span>
                      <span className="text-destructive font-medium">
                        {item.availableQuantity.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
          <LineChart
            title="Stock Movement Trends (Last 30 Days)"
            data={data.inventory.movementTrends.map((item) => ({
              period: format(new Date(item.date), "MMM dd"),
              value: item.in - item.out,
            }))}
            valueFormatter={(value) => value.toFixed(2)}
          />
        </div>
      </div>

      {/* Sales Analytics */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Sales Analytics</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <LineChart
            title="Revenue Trend (Last 12 Months)"
            data={data.sales.revenueTrend.map((d: any) => ({ period: d.period, value: d.revenue }))}
            valueFormatter={(value) =>
              `৳ ${new Intl.NumberFormat("en-BD", {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              }).format(value)}`
            }
          />
          <PieChart
            title="Revenue by Item Type"
            data={data.sales.revenueByItemType.map((item) => ({
              label: itemTypeLabels[item.type as ItemType] || item.type,
              value: item.revenue,
            }))}
            valueFormatter={(value) =>
              `৳ ${new Intl.NumberFormat("en-BD", {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              }).format(value)}`
            }
          />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <BarChart
            title="Top 10 Clients by Revenue"
            data={data.sales.topClientsByRevenue.map((item) => ({
              label: item.clientName,
              value: item.revenue,
            }))}
            valueFormatter={(value) =>
              `৳ ${new Intl.NumberFormat("en-BD", {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              }).format(value)}`
            }
          />
          <BarChart
            title="Sales by Warehouse"
            data={data.sales.salesByWarehouse.map((item) => ({
              label: warehouses.find((w) => w.id === item.warehouseId)?.name || "Unknown",
              value: item.revenue,
            }))}
            valueFormatter={(value) =>
              `৳ ${new Intl.NumberFormat("en-BD", {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              }).format(value)}`
            }
          />
        </div>
      </div>

      {/* Production Analytics */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Production Analytics</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <PieChart
            title="Production Orders by Status"
            data={data.production.ordersByStatus.map((item) => ({
              label: item.status.replace("_", " "),
              value: item.count,
            }))}
          />
          <LineChart
            title="Production Volume Trend"
            data={data.production.volumeTrend.map((d: any) => ({ period: d.period, value: d.volume }))}
            valueFormatter={(value) => value.toFixed(2)}
          />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <LineChart
            title="Cost Per Batch Trend"
            data={data.production.costPerBatchTrend.map((item) => ({
              period: item.period,
              value: item.averageCost,
            }))}
            valueFormatter={(value) =>
              `৳ ${new Intl.NumberFormat("en-BD", {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              }).format(value)}`
            }
          />
          <BarChart
            title="Top 10 Ready Products by Production Volume"
            data={data.production.topFinishedGoods.map((item) => ({
              label: `${item.itemCode} - ${item.itemName}`,
              value: item.volume,
            }))}
            valueFormatter={(value) => value.toFixed(2)}
          />
        </div>
      </div>
    </div>
  );
}
