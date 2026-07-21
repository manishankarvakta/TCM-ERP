"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ReportTable from "@/components/reports/report-table";

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
          style: "currency",
          currency: "BDT",
        }).format(val),
    },
    {
      key: "totalValue",
      label: "Valuation",
      sortable: true,
      align: "right" as const,
      format: (val: number) =>
        new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "BDT",
        }).format(val),
    },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="date">As of Date</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                disabled={isPending}
              />
            </div>
            
            <div className="space-y-2">
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

            <div className="space-y-2">
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
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={handleReset} disabled={isPending}>
              Reset
            </Button>
            <Button onClick={handleApply} disabled={isPending}>
              Apply Filters
            </Button>
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
        emptyMessage="No stock movements or balances found for the selected filters"
      />
    </div>
  );
}
