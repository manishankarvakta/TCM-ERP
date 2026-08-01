"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ReportTable from "@/components/reports/report-table";
import { getStockMovements } from "@/app/(dashboard)/dashboard/reports/_actions/inventory-reports.action";
import { exportToCSV } from "@/lib/utils/export-csv";
import { exportToExcel } from "@/lib/utils/export-excel";

interface StockMovementsViewProps {
  data: any[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  warehouses: Array<{ id: string; name: string; code: string }>;
  filters: {
    warehouseId?: string;
    search?: string;
    startDate?: string;
    endDate?: string;
    itemType?: string;
    limit?: number;
  };
  summaryTotals?: {
    opening: number;
    inward: number;
    outward: number;
    closing: number;
    value: number;
    itemsCount: number;
    inwardValue?: number;
    outwardValue?: number;
  };
}

export default function StockMovementsView({
  data,
  pagination,
  warehouses,
  filters,
  summaryTotals,
}: StockMovementsViewProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const today = new Date().toISOString().split("T")[0];
  const [startDate, setStartDate] = useState(filters.startDate || today);
  const [endDate, setEndDate] = useState(filters.endDate || today);
  const [itemType, setItemType] = useState(filters.itemType || "all");
  const [warehouseId, setWarehouseId] = useState(filters.warehouseId || "all");
  const [search, setSearch] = useState(filters.search || "");

  const handleApply = () => {
    startTransition(() => {
      const currentLimit = new URLSearchParams(window.location.search).get("limit");
      const params = new URLSearchParams();
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);
      if (itemType && itemType !== "all") params.set("itemType", itemType);
      if (warehouseId && warehouseId !== "all") params.set("warehouseId", warehouseId);
      if (search) params.set("search", search);
      if (currentLimit) params.set("limit", currentLimit);
      router.push(`?${params.toString()}`);
    });
  };

  const handleReset = () => {
    setStartDate(today);
    setEndDate(today);
    setItemType("all");
    setWarehouseId("all");
    setSearch("");
    startTransition(() => {
      router.push(`?startDate=${today}&endDate=${today}`);
    });
  };

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(window.location.search);
    params.set("page", newPage.toString());
    router.push(`?${params.toString()}`);
  };

  const handleLimitChange = (newLimit: number) => {
    const params = new URLSearchParams(window.location.search);
    params.set("limit", newLimit.toString());
    params.set("page", "1");
    router.push(`?${params.toString()}`);
  };

  const columns = [
    {
      key: "itemCode",
      label: "Item Code / SKU",
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
      key: "openingQuantity",
      label: "Opening Qty",
      sortable: true,
      align: "right" as const,
      format: (val: number) => val.toFixed(2),
    },
    {
      key: "inwardQuantity",
      label: "Inward (+)",
      sortable: true,
      align: "right" as const,
      format: (val: number) => (val > 0 ? `+${val.toFixed(2)}` : "0.00"),
    },
    {
      key: "outwardQuantity",
      label: "Outward (-)",
      sortable: true,
      align: "right" as const,
      format: (val: number) => (val > 0 ? `-${val.toFixed(2)}` : "0.00"),
    },
    {
      key: "closingQuantity",
      label: "Closing Qty",
      sortable: true,
      align: "right" as const,
      format: (val: number) => val.toFixed(2),
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
      format: (val: number) =>
        new Intl.NumberFormat("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }).format(val),
    },
    {
      key: "totalValue",
      label: "Valuation",
      sortable: true,
      align: "right" as const,
      format: (val: number) =>
        new Intl.NumberFormat("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }).format(val),
    },
  ];

  const handleExport = async (type: "csv" | "excel") => {
    // Fetch all stock movements matching active filters (limit: 0 for full export)
    const result = await getStockMovements(filters, { page: 1, limit: 0 });
    const fullData = result.success && result.data ? result.data : data;

    const exportColumns = [
      { key: "itemCode", label: "Item Code / SKU" },
      { key: "itemName", label: "Item Name" },
      { key: "warehouse", label: "Warehouse" },
      {
        key: "openingQuantity",
        label: "Opening Qty",
        format: (val: number) => val.toFixed(2),
      },
      {
        key: "inwardQuantity",
        label: "Inward (+)",
        format: (val: number) => (val > 0 ? `+${val.toFixed(2)}` : "0.00"),
      },
      {
        key: "grnIn",
        label: "GRN (+)",
        format: (val: number) => (val > 0 ? val.toFixed(2) : "0.00"),
      },
      {
        key: "salesReturnIn",
        label: "Sales Return (+)",
        format: (val: number) => (val > 0 ? val.toFixed(2) : "0.00"),
      },
      {
        key: "tpnIn",
        label: "TPN In (+)",
        format: (val: number) => (val > 0 ? val.toFixed(2) : "0.00"),
      },
      {
        key: "adjIn",
        label: "Adj In (+)",
        format: (val: number) => (val > 0 ? val.toFixed(2) : "0.00"),
      },
      {
        key: "otherIn",
        label: "Other In (+)",
        format: (val: number) => (val > 0 ? val.toFixed(2) : "0.00"),
      },
      {
        key: "outwardQuantity",
        label: "Outward (-)",
        format: (val: number) => (val > 0 ? `-${val.toFixed(2)}` : "0.00"),
      },
      {
        key: "salesOut",
        label: "Sales (-)",
        format: (val: number) => (val > 0 ? val.toFixed(2) : "0.00"),
      },
      {
        key: "rtvOut",
        label: "RTV (-)",
        format: (val: number) => (val > 0 ? val.toFixed(2) : "0.00"),
      },
      {
        key: "tpnOut",
        label: "TPN Out (-)",
        format: (val: number) => (val > 0 ? val.toFixed(2) : "0.00"),
      },
      {
        key: "damageOut",
        label: "Damage (-)",
        format: (val: number) => (val > 0 ? val.toFixed(2) : "0.00"),
      },
      {
        key: "adjOut",
        label: "Adj Out (-)",
        format: (val: number) => (val > 0 ? val.toFixed(2) : "0.00"),
      },
      {
        key: "otherOut",
        label: "Other Out (-)",
        format: (val: number) => (val > 0 ? val.toFixed(2) : "0.00"),
      },
      {
        key: "closingQuantity",
        label: "Closing Qty",
        format: (val: number) => val.toFixed(2),
      },
      {
        key: "unit",
        label: "Unit",
      },
      {
        key: "unitCost",
        label: "Unit Cost",
        format: (val: number) =>
          new Intl.NumberFormat("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }).format(val),
      },
      {
        key: "totalValue",
        label: "Valuation",
        format: (val: number) =>
          new Intl.NumberFormat("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }).format(val),
      },
    ];

    const headers = exportColumns.map((col) => col.label);
    const exportData = fullData.map((row: any) => {
      const exportRow: Record<string, any> = {};
      exportColumns.forEach((col) => {
        const value = row[col.key];
        if (col.format) {
          try {
            const formatted = col.format(value);
            exportRow[col.label] =
              typeof formatted === "string" || typeof formatted === "number"
                ? formatted
                : value;
          } catch {
            exportRow[col.label] = value;
          }
        } else {
          exportRow[col.label] = value ?? "";
        }
      });
      return exportRow;
    });

    const filename = `stock-movements-${startDate}-to-${endDate}`;
    if (type === "csv") {
      exportToCSV(exportData, { filename: `${filename}.csv`, headers });
    } else {
      exportToExcel(exportData, { filename: `${filename}.xlsx`, headers });
    }
  };

  const totals = summaryTotals || {
    opening: 0,
    inward: 0,
    outward: 0,
    closing: 0,
    value: 0,
    itemsCount: 0,
    inwardValue: 0,
    outwardValue: 0,
  };

  return (
    <div className="space-y-6">
      {/* Title & Summary Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Stock Movements Report</h1>
          <p className="text-xs text-muted-foreground max-w-xs sm:max-w-sm">
            Opening, inflows, outflows, and closing balances for the selected date range
          </p>
        </div>
        {data.length > 0 && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs bg-card p-3 rounded-lg border border-border shadow-sm">
            <div className="text-right">
              <span className="text-muted-foreground text-[10px] block">Total Items</span>
              <span className="font-semibold text-xs">{totals.itemsCount || data.length}</span>
            </div>
            <div className="h-8 w-px bg-border hidden sm:block" />
            <div className="text-right">
              <span className="text-muted-foreground text-[10px] block">Total Opening</span>
              <span className="font-semibold text-xs">{totals.opening.toFixed(2)}</span>
            </div>
            <div className="h-8 w-px bg-border hidden sm:block" />
            <div className="text-right">
              <span className="text-muted-foreground text-[10px] block">Total Inward</span>
              <span className="font-semibold text-xs text-emerald-600 block">+{totals.inward.toFixed(2)}</span>
              <span className="text-[9px] text-muted-foreground block font-medium">
                +{new Intl.NumberFormat("en-US", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                }).format(totals.inwardValue || 0)}
              </span>
            </div>
            <div className="h-8 w-px bg-border hidden sm:block" />
            <div className="text-right">
              <span className="text-muted-foreground text-[10px] block">Total Outward</span>
              <span className="font-semibold text-xs text-rose-600 block">-{totals.outward.toFixed(2)}</span>
              <span className="text-[9px] text-muted-foreground block font-medium">
                -{new Intl.NumberFormat("en-US", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                }).format(totals.outwardValue || 0)}
              </span>
            </div>
            <div className="h-8 w-px bg-border hidden sm:block" />
            <div className="text-right">
              <span className="text-muted-foreground text-[10px] block">Total Closing</span>
              <span className="font-semibold text-xs">{totals.closing.toFixed(2)}</span>
            </div>
            <div className="h-8 w-px bg-border hidden sm:block" />
            <div className="text-right">
              <span className="text-muted-foreground text-[10px] block">Total Valuation</span>
              <span className="font-semibold text-xs text-primary block">
                {new Intl.NumberFormat("en-US", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                }).format(totals.value)}
              </span>
            </div>
          </div>
        )}
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap md:flex-nowrap gap-4 items-end">
            <div className="flex-1 min-w-[200px] space-y-2">
              <Label htmlFor="search">Search Items</Label>
              <Input
                id="search"
                placeholder="Search by name, code, SKU, or barcode..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleApply();
                }}
                disabled={isPending}
              />
            </div>

            <div className="w-full md:w-[150px] space-y-2">
              <Label htmlFor="itemType">Item Type</Label>
              <Select value={itemType} onValueChange={setItemType} disabled={isPending}>
                <SelectTrigger id="itemType">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="RAW_MATERIAL">Raw Material</SelectItem>
                  <SelectItem value="READY_PRODUCT">Ready Product</SelectItem>
                  <SelectItem value="RETAIL">Retail</SelectItem>
                  <SelectItem value="WHOLESALE">Wholesale</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="w-full md:w-[150px] space-y-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                disabled={isPending}
              />
            </div>

            <div className="w-full md:w-[150px] space-y-2">
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                disabled={isPending}
              />
            </div>
            
            <div className="w-full md:w-[200px] space-y-2">
              <Label htmlFor="warehouse">Warehouse</Label>
              <Select value={warehouseId} onValueChange={setWarehouseId} disabled={isPending}>
                <SelectTrigger id="warehouse">
                  <SelectValue placeholder="All Warehouses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Warehouses</SelectItem>
                  {warehouses.map((w) => (
                    <SelectItem key={w.id} value={w.id}>
                      {w.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2 w-full md:w-auto">
              <Button variant="outline" onClick={handleReset} disabled={isPending} className="w-full md:w-auto">
                Reset
              </Button>
              <Button onClick={handleApply} disabled={isPending} className="w-full md:w-auto">
                Apply Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <ReportTable
        title="Stock Movements Summary"
        columns={columns}
        data={data}
        pagination={{
          ...pagination,
          onPageChange: handlePageChange,
          onLimitChange: handleLimitChange,
          limitOptions: [20, 50, 100, 200],
        }}
        exportFilename={`stock-movements-${startDate}-to-${endDate}`}
        onExport={handleExport}
        emptyMessage="No stock movements or balances found for the selected filters"
      />
    </div>
  );
}
