"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FiSearch, FiX, FiPackage, FiBox, FiArrowDown, FiArrowUp, FiEdit, FiRefreshCw } from "react-icons/fi";
import { format } from "date-fns";
import { StockTransactionType } from "@prisma/client";

interface StockLedgerEntry {
  id: string;
  itemId: string;
  warehouseId: string;
  transactionType: StockTransactionType;
  quantity: any; // Decimal from Prisma
  referenceType: string | null;
  referenceId: string | null;
  notes: string | null;
  createdAt: Date;
  item: {
    id: string;
    name: string;
    code: string;
    unit: {
      symbol: string;
    };
  };
  warehouse: {
    id: string;
    name: string;
    code: string;
  };
  creator: {
    id: string;
    name: string | null;
    email: string;
  };
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface StockLedgerClientProps {
  initialEntries: StockLedgerEntry[];
  initialPagination: Pagination;
  initialSearch: string;
  initialItemId?: string;
  initialWarehouseId?: string;
  initialTransactionType?: StockTransactionType | "all";
  initialDateFrom?: string;
  initialDateTo?: string;
  items?: Array<{ id: string; name: string; code: string }>;
  warehouses?: Array<{ id: string; name: string; code: string }>;
}

export default function StockLedgerClient({
  initialEntries,
  initialPagination,
  initialSearch,
  initialItemId,
  initialWarehouseId,
  initialTransactionType = "all",
  initialDateFrom,
  initialDateTo,
  items = [],
  warehouses = [],
}: StockLedgerClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(initialSearch);
  const [itemFilter, setItemFilter] = useState(initialItemId || "all");
  const [warehouseFilter, setWarehouseFilter] = useState(initialWarehouseId || "all");
  const [transactionTypeFilter, setTransactionTypeFilter] = useState(initialTransactionType);
  const [dateFrom, setDateFrom] = useState(initialDateFrom || "");
  const [dateTo, setDateTo] = useState(initialDateTo || "");
  const [isPending, startTransition] = useTransition();

  const updateFilters = () => {
    const params = new URLSearchParams(searchParams.toString());
    
    if (search) {
      params.set("search", search);
    } else {
      params.delete("search");
    }

    if (itemFilter !== "all") {
      params.set("itemId", itemFilter);
    } else {
      params.delete("itemId");
    }

    if (warehouseFilter !== "all") {
      params.set("warehouseId", warehouseFilter);
    } else {
      params.delete("warehouseId");
    }

    if (transactionTypeFilter !== "all") {
      params.set("transactionType", transactionTypeFilter);
    } else {
      params.delete("transactionType");
    }

    if (dateFrom) {
      params.set("dateFrom", dateFrom);
    } else {
      params.delete("dateFrom");
    }

    if (dateTo) {
      params.set("dateTo", dateTo);
    } else {
      params.delete("dateTo");
    }

    params.set("page", "1");
    router.push(`/dashboard/inventory/stock/ledger?${params.toString()}`);
  };

  const handleSearch = (value: string) => {
    setSearch(value);
    updateFilters();
  };

  const getTransactionTypeBadge = (type: StockTransactionType) => {
    const variants: Record<StockTransactionType, { label: string; variant: "default" | "secondary" | "outline" | "destructive"; icon: any }> = {
      IN: { label: "IN", variant: "default", icon: FiArrowDown },
      OUT: { label: "OUT", variant: "destructive", icon: FiArrowUp },
      ADJUSTMENT: { label: "ADJUST", variant: "secondary", icon: FiEdit },
      PRODUCTION: { label: "PRODUCTION", variant: "outline", icon: FiRefreshCw },
    };
    const config = variants[type];
    const Icon = config.icon;
    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const formatQuantity = (qty: any) => {
    if (!qty) return "0.00";
    const num = Number(qty);
    const sign = num >= 0 ? "+" : "";
    return `${sign}${num.toLocaleString("en-BD", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by item name, code, or warehouse..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-10"
          />
          {search && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
              onClick={() => handleSearch("")}
            >
              <FiX className="h-4 w-4" />
            </Button>
          )}
        </div>

        <Select value={itemFilter} onValueChange={(value) => {
          setItemFilter(value);
          updateFilters();
        }}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by item" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Items</SelectItem>
            {items.map((item) => (
              <SelectItem key={item.id} value={item.id}>
                {item.name} ({item.code})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={warehouseFilter} onValueChange={(value) => {
          setWarehouseFilter(value);
          updateFilters();
        }}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by warehouse" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Warehouses</SelectItem>
            {warehouses.map((warehouse) => (
              <SelectItem key={warehouse.id} value={warehouse.id}>
                {warehouse.name} ({warehouse.code})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={transactionTypeFilter} onValueChange={(value) => {
          setTransactionTypeFilter(value as StockTransactionType | "all");
          updateFilters();
        }}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Transaction Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="IN">IN</SelectItem>
            <SelectItem value="OUT">OUT</SelectItem>
            <SelectItem value="ADJUSTMENT">Adjustment</SelectItem>
            <SelectItem value="PRODUCTION">Production</SelectItem>
          </SelectContent>
        </Select>

        <Input
          type="date"
          placeholder="From Date"
          value={dateFrom}
          onChange={(e) => {
            setDateFrom(e.target.value);
            updateFilters();
          }}
          className="w-[150px]"
        />

        <Input
          type="date"
          placeholder="To Date"
          value={dateTo}
          onChange={(e) => {
            setDateTo(e.target.value);
            updateFilters();
          }}
          className="w-[150px]"
        />
      </div>

      {/* Ledger Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date & Time</TableHead>
              <TableHead>Item</TableHead>
              <TableHead>Warehouse</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Quantity</TableHead>
              <TableHead>Reference</TableHead>
              <TableHead>Notes</TableHead>
              <TableHead>Created By</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {initialEntries.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  No ledger entries found
                </TableCell>
              </TableRow>
            ) : (
              initialEntries.map((entry) => {
                const quantity = Number(entry.quantity);
                const isPositive = quantity >= 0;

                return (
                  <TableRow key={entry.id}>
                    <TableCell className="font-mono text-sm">
                      {format(new Date(entry.createdAt), "MMM d, yyyy HH:mm")}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <FiPackage className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <Link
                            href={`/dashboard/master/items/${entry.item.id}`}
                            className="font-medium hover:underline"
                          >
                            {entry.item.name}
                          </Link>
                          <p className="text-xs text-muted-foreground font-mono">
                            {entry.item.code}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <FiBox className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <Link
                            href={`/dashboard/inventory/warehouses/${entry.warehouse.id}`}
                            className="font-medium hover:underline"
                          >
                            {entry.warehouse.name}
                          </Link>
                          <p className="text-xs text-muted-foreground font-mono">
                            {entry.warehouse.code}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {getTransactionTypeBadge(entry.transactionType)}
                    </TableCell>
                    <TableCell
                      className={cn(
                        "text-right font-mono font-semibold",
                        isPositive ? "text-green-600" : "text-red-600"
                      )}
                    >
                      {formatQuantity(entry.quantity)} {entry.item.unit.symbol}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {entry.referenceType && entry.referenceId ? (
                        <span>
                          {entry.referenceType}: {entry.referenceId.slice(0, 8)}...
                        </span>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                      {entry.notes || "-"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {entry.creator.name || entry.creator.email}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {initialPagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Showing {((initialPagination.page - 1) * initialPagination.limit) + 1} to{" "}
            {Math.min(initialPagination.page * initialPagination.limit, initialPagination.total)} of{" "}
            {initialPagination.total} ledger entries
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const params = new URLSearchParams(searchParams.toString());
                params.set("page", String(Math.max(1, initialPagination.page - 1)));
                router.push(`/dashboard/inventory/stock/ledger?${params.toString()}`);
              }}
              disabled={initialPagination.page === 1 || isPending}
            >
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {initialPagination.page} of {initialPagination.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const params = new URLSearchParams(searchParams.toString());
                params.set("page", String(Math.min(initialPagination.totalPages, initialPagination.page + 1)));
                router.push(`/dashboard/inventory/stock/ledger?${params.toString()}`);
              }}
              disabled={initialPagination.page === initialPagination.totalPages || isPending}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
