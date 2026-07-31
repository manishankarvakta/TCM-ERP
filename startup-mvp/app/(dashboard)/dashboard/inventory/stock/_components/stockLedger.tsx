"use client";

import { useState, useTransition, useEffect, useCallback } from "react";
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
import Link from "next/link";
import { cn } from "@/lib/utils";
import { SearchableSelect } from "@/components/ui/searchable-select";

interface StockLedgerEntry {
  id: string;
  itemId: string;
  warehouseId: string;
  transactionType: StockTransactionType;
  quantity: number; // Converted from Decimal
  referenceType: string | null;
  referenceId: string | null;
  notes: string | null;
  createdAt: Date;
  item: {
    id: string;
    name: string;
    code: string;
    images: any;
    featuredImage: string | null;
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
  isNormalUser?: boolean;
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
  isNormalUser = false,
}: StockLedgerClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [itemFilter, setItemFilter] = useState(initialItemId || "all");
  const [warehouseFilter, setWarehouseFilter] = useState(initialWarehouseId || "all");
  const [transactionTypeFilter, setTransactionTypeFilter] = useState(initialTransactionType);
  const [dateFrom, setDateFrom] = useState(initialDateFrom || "");
  const [dateTo, setDateTo] = useState(initialDateTo || "");
  const [isPending, startTransition] = useTransition();
  const [searchInput, setSearchInput] = useState(initialSearch);

  // Debounce search input - only update if search actually changed
  useEffect(() => {
    // Skip if search hasn't changed from initial value (prevents initial load trigger)
    if (searchInput === initialSearch) {
      return;
    }

    const timer = setTimeout(() => {
      startTransition(() => {
        const params = new URLSearchParams();
        
        if (searchInput.trim()) {
          params.set("search", searchInput.trim());
        }

        if (itemFilter !== "all") {
          params.set("itemId", itemFilter);
        }

        if (warehouseFilter !== "all") {
          params.set("warehouseId", warehouseFilter);
        }

        if (transactionTypeFilter !== "all") {
          params.set("transactionType", transactionTypeFilter);
        }

        if (dateFrom) {
          params.set("dateFrom", dateFrom);
        }

        if (dateTo) {
          params.set("dateTo", dateTo);
        }

        params.set("page", "1");
        router.push(`/dashboard/inventory/stock/ledger?${params.toString()}`);
      });
    }, 500); // 500ms debounce

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  const handleSearchChange = (value: string) => {
    setSearchInput(value);
  };

  const handleSearchClear = () => {
    setSearchInput("");
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("search");
      params.set("page", "1");
      router.push(`/dashboard/inventory/stock/ledger?${params.toString()}`);
    });
  };

  const getTransactionTypeBadge = (type: StockTransactionType) => {
    const variants: Record<StockTransactionType, { label: string; variant: "default" | "secondary" | "outline" | "destructive"; icon: React.ComponentType<{ className?: string }> }> = {
      IN: { label: "IN", variant: "default", icon: FiArrowDown },
      OUT: { label: "OUT", variant: "destructive", icon: FiArrowUp },
      ADJUSTMENT: { label: "ADJUST", variant: "secondary", icon: FiEdit },
      PRODUCTION: { label: "PRODUCTION", variant: "outline", icon: FiRefreshCw },
      PURCHASE_RETURN: { label: "RETURN", variant: "destructive", icon: FiArrowUp },
      TRANSFER: { label: "TRANSFER", variant: "outline", icon: FiRefreshCw },
      DAMAGE: { label: "DAMAGE", variant: "destructive", icon: FiArrowUp },
    };
    const config = variants[type] || { label: type || "UNKNOWN", variant: "secondary", icon: FiBox };
    const Icon = config.icon;
    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const getPageNumbers = (currentPage: number, totalPages: number) => {
    const pages: (number | string)[] = [];
    const windowSize = 2;
    pages.push(1);
    const startRange = Math.max(2, currentPage - windowSize);
    const endRange = Math.min(totalPages - 1, currentPage + windowSize);
    if (startRange > 2) {
      pages.push("...");
    }
    for (let i = startRange; i <= endRange; i++) {
      pages.push(i);
    }
    if (endRange < totalPages - 1) {
      pages.push("...");
    }
    if (totalPages > 1) {
      pages.push(totalPages);
    }
    return pages;
  };

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", newPage.toString());
    router.push(`/dashboard/inventory/stock/ledger?${params.toString()}`);
  };

  const handleLimitChange = (newLimit: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("limit", newLimit.toString());
    params.set("page", "1");
    router.push(`/dashboard/inventory/stock/ledger?${params.toString()}`);
  };

  const renderLimitSelector = () => {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Rows per page:</span>
        <Select
          value={String(initialPagination.limit)}
          onValueChange={(val) => handleLimitChange(Number(val))}
          disabled={isPending}
        >
          <SelectTrigger className="w-[70px] h-8 text-xs">
            <SelectValue placeholder={String(initialPagination.limit)} />
          </SelectTrigger>
          <SelectContent>
            {[20, 50, 100, 200].map((opt) => (
              <SelectItem key={opt} value={String(opt)}>
                {opt}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  };

  const renderPaginationButtons = () => {
    if (initialPagination.totalPages <= 1) return null;
    return (
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => handlePageChange(initialPagination.page - 1)}
          disabled={initialPagination.page === 1 || isPending}
        >
          Previous
        </Button>
        
        <div className="flex items-center gap-1">
          {getPageNumbers(initialPagination.page, initialPagination.totalPages).map((p, idx) => {
            if (p === "...") {
              return (
                <span key={`dots-${idx}`} className="px-1 text-sm text-muted-foreground">
                  ...
                </span>
              );
            }
            const isCurrent = p === initialPagination.page;
            return (
              <Button
                key={`page-${p}`}
                variant={isCurrent ? "default" : "outline"}
                size="sm"
                className="h-8 w-8 p-0 text-xs"
                onClick={() => handlePageChange(p as number)}
                disabled={isPending}
              >
                {p}
              </Button>
            );
          })}
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => handlePageChange(initialPagination.page + 1)}
          disabled={initialPagination.page === initialPagination.totalPages || isPending}
        >
          Next
        </Button>
      </div>
    );
  };

  const formatQuantity = (qty: number) => {
    if (qty === undefined || qty === null) return "0.00";
    const num = Number(qty);
    const sign = num >= 0 ? "+" : "";
    return `${sign}${num.toLocaleString("en-BD", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const itemOptions = [
    { label: "All Items", value: "all" },
    ...items.map((item) => ({
      label: item.name,
      value: item.id,
      description: item.code,
    })),
  ];

  const warehouseOptions = [
    { label: "All Warehouses", value: "all" },
    ...warehouses.map((wh) => ({
      label: wh.name,
      value: wh.id,
      description: wh.code,
    })),
  ];

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by item name, code, or warehouse..."
            value={searchInput}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-10"
            disabled={isPending}
          />
          {searchInput && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
              onClick={handleSearchClear}
              disabled={isPending}
            >
              <FiX className="h-4 w-4" />
            </Button>
          )}
        </div>

        <SearchableSelect
          options={itemOptions}
          value={itemFilter}
          onValueChange={(val) => {
            const value = val || "all";
            setItemFilter(value);
            startTransition(() => {
              const params = new URLSearchParams();
              
              if (searchInput.trim()) {
                params.set("search", searchInput.trim());
              }

              if (value !== "all") {
                params.set("itemId", value);
              }

              if (warehouseFilter !== "all") {
                params.set("warehouseId", warehouseFilter);
              }

              if (transactionTypeFilter !== "all") {
                params.set("transactionType", transactionTypeFilter);
              }

              if (dateFrom) {
                params.set("dateFrom", dateFrom);
              }

              if (dateTo) {
                params.set("dateTo", dateTo);
              }

              params.set("page", "1");
              router.push(`/dashboard/inventory/stock/ledger?${params.toString()}`);
            });
          }}
          placeholder="Filter by item"
          searchPlaceholder="Search items..."
          className="w-[200px]"
        />

        <SearchableSelect
          options={warehouseOptions}
          value={warehouseFilter}
          onValueChange={(val) => {
            const value = val || "all";
            setWarehouseFilter(value);
            startTransition(() => {
              const params = new URLSearchParams();
              
              if (searchInput.trim()) {
                params.set("search", searchInput.trim());
              }

              if (itemFilter !== "all") {
                params.set("itemId", itemFilter);
              }

              if (value !== "all") {
                params.set("warehouseId", value);
              }

              if (transactionTypeFilter !== "all") {
                params.set("transactionType", transactionTypeFilter);
              }

              if (dateFrom) {
                params.set("dateFrom", dateFrom);
              }

              if (dateTo) {
                params.set("dateTo", dateTo);
              }

              params.set("page", "1");
              router.push(`/dashboard/inventory/stock/ledger?${params.toString()}`);
            });
          }}
          placeholder="Filter by warehouse"
          searchPlaceholder="Search warehouses..."
          className="w-[200px]"
          disabled={isNormalUser}
        />

        <Select value={transactionTypeFilter} onValueChange={(value) => {
          setTransactionTypeFilter(value as StockTransactionType | "all");
          // Update filters immediately for select changes
          startTransition(() => {
            const params = new URLSearchParams();
            
            if (searchInput.trim()) {
              params.set("search", searchInput.trim());
            }

            if (itemFilter !== "all") {
              params.set("itemId", itemFilter);
            }

            if (warehouseFilter !== "all") {
              params.set("warehouseId", warehouseFilter);
            }

            if (value !== "all") {
              params.set("transactionType", value);
            }

            if (dateFrom) {
              params.set("dateFrom", dateFrom);
            }

            if (dateTo) {
              params.set("dateTo", dateTo);
            }

            params.set("page", "1");
            router.push(`/dashboard/inventory/stock/ledger?${params.toString()}`);
          });
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
            <SelectItem value="PURCHASE_RETURN">Return (RTV)</SelectItem>
          </SelectContent>
        </Select>

        <Input
          type="date"
          placeholder="From Date"
          value={dateFrom}
          onChange={(e) => {
            setDateFrom(e.target.value);
            // Update filters immediately for date changes
            startTransition(() => {
              const params = new URLSearchParams();
              
              if (searchInput.trim()) {
                params.set("search", searchInput.trim());
              }

              if (itemFilter !== "all") {
                params.set("itemId", itemFilter);
              }

              if (warehouseFilter !== "all") {
                params.set("warehouseId", warehouseFilter);
              }

              if (transactionTypeFilter !== "all") {
                params.set("transactionType", transactionTypeFilter);
              }

              if (e.target.value) {
                params.set("dateFrom", e.target.value);
              }

              if (dateTo) {
                params.set("dateTo", dateTo);
              }

              params.set("page", "1");
              router.push(`/dashboard/inventory/stock/ledger?${params.toString()}`);
            });
          }}
          className="w-[150px]"
        />

        <Input
          type="date"
          placeholder="To Date"
          value={dateTo}
          onChange={(e) => {
            setDateTo(e.target.value);
            // Update filters immediately for date changes
            startTransition(() => {
              const params = new URLSearchParams();
              
              if (searchInput.trim()) {
                params.set("search", searchInput.trim());
              }

              if (itemFilter !== "all") {
                params.set("itemId", itemFilter);
              }

              if (warehouseFilter !== "all") {
                params.set("warehouseId", warehouseFilter);
              }

              if (transactionTypeFilter !== "all") {
                params.set("transactionType", transactionTypeFilter);
              }

              if (dateFrom) {
                params.set("dateFrom", dateFrom);
              }

              if (e.target.value) {
                params.set("dateTo", e.target.value);
              }

              params.set("page", "1");
              router.push(`/dashboard/inventory/stock/ledger?${params.toString()}`);
            });
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
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded border bg-muted overflow-hidden flex items-center justify-center shrink-0">
                          {entry.item.featuredImage || (entry.item.images && Array.isArray(entry.item.images) && entry.item.images.length > 0) ? (
                            <img 
                              src={entry.item.featuredImage || entry.item.images[0]} 
                              alt={entry.item.name} 
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <FiPackage className="h-5 w-5 text-muted-foreground" />
                          )}
                        </div>
                        <div>
                          <Link
                            href={`/dashboard/master/items/${entry.item.id}`}
                            className="font-medium hover:underline block leading-tight"
                          >
                            {entry.item.name}
                          </Link>
                          <p className="text-[11px] text-muted-foreground font-mono mt-0.5">
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
      {(initialPagination.totalPages > 1 || initialPagination.total > 0) && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="text-sm text-muted-foreground">
              Showing {((initialPagination.page - 1) * initialPagination.limit) + 1} to{" "}
              {Math.min(initialPagination.page * initialPagination.limit, initialPagination.total)} of{" "}
              {initialPagination.total} ledger entries
            </div>
            {renderLimitSelector()}
          </div>
          {renderPaginationButtons()}
        </div>
      )}
    </div>
  );
}
