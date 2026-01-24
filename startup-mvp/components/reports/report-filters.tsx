"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FiFilter, FiX } from "react-icons/fi";
import { format } from "date-fns";

export interface ReportFilterConfig {
  warehouses?: Array<{ id: string; name: string }>;
  items?: Array<{ id: string; code: string; name: string }>;
  clients?: Array<{ id: string; name: string; code?: string }>;
  suppliers?: Array<{ id: string; name: string; code?: string }>;
  itemTypes?: Array<{ value: string; label: string }>;
  statuses?: Array<{ value: string; label: string }>;
  transactionTypes?: Array<{ value: string; label: string }>;
}

interface ReportFiltersProps {
  config?: ReportFilterConfig;
  onApply?: (filters: Record<string, string>) => void;
  showDateRange?: boolean;
  showWarehouse?: boolean;
  showItem?: boolean;
  showClient?: boolean;
  showSupplier?: boolean;
  showItemType?: boolean;
  showStatus?: boolean;
  showTransactionType?: boolean;
  showSearch?: boolean;
  dateFrom?: string;
  dateTo?: string;
  warehouseId?: string;
  itemId?: string;
  clientId?: string;
  supplierId?: string;
  itemType?: string;
  status?: string;
  transactionType?: string;
}

export default function ReportFilters({
  config = {},
  onApply,
  showDateRange = true,
  showWarehouse = false,
  showItem = false,
  showClient = false,
  showSupplier = false,
  showItemType = false,
  showStatus = false,
  showTransactionType = false,
  showSearch = false,
  dateFrom: initialDateFrom,
  dateTo: initialDateTo,
  warehouseId: initialWarehouseId,
  itemId: initialItemId,
  clientId: initialClientId,
  supplierId: initialSupplierId,
  itemType: initialItemType,
  status: initialStatus,
  transactionType: initialTransactionType,
}: ReportFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [dateFrom, setDateFrom] = useState(
    initialDateFrom || searchParams.get("dateFrom") || ""
  );
  const [dateTo, setDateTo] = useState(
    initialDateTo || searchParams.get("dateTo") || ""
  );
  const [warehouseId, setWarehouseId] = useState(
    initialWarehouseId || searchParams.get("warehouseId") || "all"
  );
  const [itemId, setItemId] = useState(initialItemId || searchParams.get("itemId") || "all");
  const [clientId, setClientId] = useState(
    initialClientId || searchParams.get("clientId") || "all"
  );
  const [supplierId, setSupplierId] = useState(
    initialSupplierId || searchParams.get("supplierId") || "all"
  );
  const [itemType, setItemType] = useState(
    initialItemType || searchParams.get("itemType") || "all"
  );
  const [status, setStatus] = useState(initialStatus || searchParams.get("status") || "all");
  const [transactionType, setTransactionType] = useState(
    initialTransactionType || searchParams.get("transactionType") || "all"
  );
  const [search, setSearch] = useState(searchParams.get("search") || "");

  const applyFilters = () => {
    startTransition(() => {
      const params = new URLSearchParams();

      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);
      if (warehouseId && warehouseId !== "all") params.set("warehouseId", warehouseId);
      if (itemId && itemId !== "all") params.set("itemId", itemId);
      if (clientId && clientId !== "all") params.set("clientId", clientId);
      if (supplierId && supplierId !== "all") params.set("supplierId", supplierId);
      if (itemType && itemType !== "all") params.set("itemType", itemType);
      if (status && status !== "all") params.set("status", status);
      if (transactionType && transactionType !== "all")
        params.set("transactionType", transactionType);
      if (search) params.set("search", search);

      router.push(`?${params.toString()}`);
      if (onApply) {
        onApply(Object.fromEntries(params));
      }
    });
  };

  const resetFilters = () => {
    setDateFrom("");
    setDateTo("");
    setWarehouseId("all");
    setItemId("all");
    setClientId("all");
    setSupplierId("all");
    setItemType("all");
    setStatus("all");
    setTransactionType("all");
    setSearch("");

    startTransition(() => {
      router.push("?");
      if (onApply) {
        onApply({});
      }
    });
  };

  const hasActiveFilters =
    dateFrom ||
    dateTo ||
    (warehouseId && warehouseId !== "all") ||
    (itemId && itemId !== "all") ||
    (clientId && clientId !== "all") ||
    (supplierId && supplierId !== "all") ||
    (itemType && itemType !== "all") ||
    (status && status !== "all") ||
    (transactionType && transactionType !== "all") ||
    search;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <FiFilter className="h-4 w-4" />
            Filters
          </CardTitle>
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={resetFilters}
              disabled={isPending}
            >
              <FiX className="h-4 w-4 mr-1" />
              Clear
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {showDateRange && (
            <>
              <div className="space-y-2">
                <Label htmlFor="dateFrom">Date From</Label>
                <Input
                  id="dateFrom"
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dateTo">Date To</Label>
                <Input
                  id="dateTo"
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                />
              </div>
            </>
          )}

          {showWarehouse && config.warehouses && (
            <div className="space-y-2">
              <Label htmlFor="warehouse">Warehouse</Label>
              <Select value={warehouseId} onValueChange={setWarehouseId}>
                <SelectTrigger id="warehouse">
                  <SelectValue placeholder="All Warehouses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Warehouses</SelectItem>
                  {config.warehouses.map((warehouse) => (
                    <SelectItem key={warehouse.id} value={warehouse.id}>
                      {warehouse.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {showItem && config.items && (
            <div className="space-y-2">
              <Label htmlFor="item">Item</Label>
              <Select value={itemId} onValueChange={setItemId}>
                <SelectTrigger id="item">
                  <SelectValue placeholder="All Items" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Items</SelectItem>
                  {config.items.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.code} - {item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {showClient && config.clients && (
            <div className="space-y-2">
              <Label htmlFor="client">Client</Label>
              <Select value={clientId} onValueChange={setClientId}>
                <SelectTrigger id="client">
                  <SelectValue placeholder="All Clients" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Clients</SelectItem>
                  {config.clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.code ? `${client.code} - ` : ""}
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {showSupplier && config.suppliers && (
            <div className="space-y-2">
              <Label htmlFor="supplier">Supplier</Label>
              <Select value={supplierId} onValueChange={setSupplierId}>
                <SelectTrigger id="supplier">
                  <SelectValue placeholder="All Suppliers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Suppliers</SelectItem>
                  {config.suppliers.map((supplier) => (
                    <SelectItem key={supplier.id} value={supplier.id}>
                      {supplier.code ? `${supplier.code} - ` : ""}
                      {supplier.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {showItemType && config.itemTypes && (
            <div className="space-y-2">
              <Label htmlFor="itemType">Item Type</Label>
              <Select value={itemType} onValueChange={setItemType}>
                <SelectTrigger id="itemType">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {config.itemTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {showStatus && config.statuses && (
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger id="status">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {config.statuses.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {showTransactionType && config.transactionTypes && (
            <div className="space-y-2">
              <Label htmlFor="transactionType">Transaction Type</Label>
              <Select value={transactionType} onValueChange={setTransactionType}>
                <SelectTrigger id="transactionType">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {config.transactionTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {showSearch && (
            <div className="space-y-2">
              <Label htmlFor="search">Search</Label>
              <Input
                id="search"
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    applyFilters();
                  }
                }}
              />
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={resetFilters} disabled={isPending}>
            Reset
          </Button>
          <Button onClick={applyFilters} disabled={isPending}>
            Apply Filters
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
