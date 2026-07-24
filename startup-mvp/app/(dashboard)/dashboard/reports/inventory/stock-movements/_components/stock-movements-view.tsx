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
    date?: string;
  };
}

export default function StockMovementsView({
  data,
  pagination,
  warehouses,
  filters,
}: StockMovementsViewProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [date, setDate] = useState(filters.date || new Date().toISOString().split("T")[0]);
  const [warehouseId, setWarehouseId] = useState(filters.warehouseId || "all");
  const [search, setSearch] = useState(filters.search || "");

  const handleApply = () => {
    startTransition(() => {
      const params = new URLSearchParams();
      if (date) params.set("date", date);
      if (warehouseId && warehouseId !== "all") params.set("warehouseId", warehouseId);
      if (search) params.set("search", search);
      router.push(`?${params.toString()}`);
    });
  };

  const handleReset = () => {
    const today = new Date().toISOString().split("T")[0];
    setDate(today);
    setWarehouseId("all");
    setSearch("");
    startTransition(() => {
      router.push(`?date=${today}`);
    });
  };

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(window.location.search);
    params.set("page", newPage.toString());
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

    const headers = columns.map((col) => col.label);
    const exportData = fullData.map((row: any) => {
      const exportRow: Record<string, any> = {};
      columns.forEach((col) => {
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

    const filename = `stock-movements-${date}`;
    if (type === "csv") {
      exportToCSV(exportData, { filename: `${filename}.csv`, headers });
    } else {
      exportToExcel(exportData, { filename: `${filename}.xlsx`, headers });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1 min-w-[200px] space-y-2">
              <Label htmlFor="search">Search Items</Label>
              <Input
                id="search"
                placeholder="Search by code or name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleApply();
                }}
                disabled={isPending}
              />
            </div>

            <div className="w-full md:w-[200px] space-y-2">
              <Label htmlFor="date">As of Date</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                disabled={isPending}
              />
            </div>
            
            <div className="w-full md:w-[250px] space-y-2">
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
        }}
        exportFilename={`stock-movements-${date}`}
        onExport={handleExport}
        emptyMessage="No stock movements or balances found for the selected filters"
      />
    </div>
  );
}
