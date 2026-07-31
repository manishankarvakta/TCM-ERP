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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Link from "next/link";
import { FiSearch, FiX, FiBox, FiPackage } from "react-icons/fi";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface Stock {
  id: string;
  itemId: string;
  warehouseId: string;
  quantity: any; // Decimal from Prisma
  reservedQuantity: any; // Decimal from Prisma
  lastUpdated: Date;
  item: {
    id: string;
    name: string;
    code: string;
    images: any;
    featuredImage: string | null;
    unit: {
      symbol: string;
    };
    variant?: {
      id: string;
      sku: string;
      size: string;
      color: string;
    } | null;
  };
  warehouse: {
    id: string;
    name: string;
    code: string;
  };
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface StocksListClientProps {
  initialStocks: Stock[];
  initialPagination: Pagination;
  initialSearch: string;
  initialItemId?: string;
  initialWarehouseId?: string;
  items?: Array<{ id: string; name: string; code: string }>;
  warehouses?: Array<{ id: string; name: string; code: string }>;
  isNormalUser?: boolean;
}

export default function StocksListClient({
  initialStocks,
  initialPagination,
  initialSearch,
  initialItemId,
  initialWarehouseId,
  items = [],
  warehouses = [],
  isNormalUser = false,
}: StocksListClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(initialSearch);
  const [itemFilter, setItemFilter] = useState(initialItemId || "all");
  const [warehouseFilter, setWarehouseFilter] = useState(initialWarehouseId || "all");
  const [isPending, startTransition] = useTransition();

  const handleSearch = (value: string) => {
    setSearch(value);
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set("search", value);
    } else {
      params.delete("search");
    }
    params.set("page", "1");
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
    router.push(`/dashboard/inventory/stock?${params.toString()}`);
  };

  const handleItemFilter = (value: string) => {
    setItemFilter(value);
    const params = new URLSearchParams(searchParams.toString());
    if (value !== "all") {
      params.set("itemId", value);
    } else {
      params.delete("itemId");
    }
    params.set("page", "1");
    if (search) {
      params.set("search", search);
    }
    if (warehouseFilter !== "all") {
      params.set("warehouseId", warehouseFilter);
    }
    router.push(`/dashboard/inventory/stock?${params.toString()}`);
  };

  const handleWarehouseFilter = (value: string) => {
    setWarehouseFilter(value);
    const params = new URLSearchParams(searchParams.toString());
    if (value !== "all") {
      params.set("warehouseId", value);
    } else {
      params.delete("warehouseId");
    }
    params.set("page", "1");
    if (search) {
      params.set("search", search);
    }
    if (itemFilter !== "all") {
      params.set("itemId", itemFilter);
    }
    router.push(`/dashboard/inventory/stock?${params.toString()}`);
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
    router.push(`/dashboard/inventory/stock?${params.toString()}`);
  };

  const handleLimitChange = (newLimit: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("limit", newLimit.toString());
    params.set("page", "1");
    router.push(`/dashboard/inventory/stock?${params.toString()}`);
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

  const formatQuantity = (qty: any) => {
    if (!qty) return "0.00";
    return Number(qty).toLocaleString("en-BD", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const getAvailableQuantity = (stock: Stock) => {
    const qty = Number(stock.quantity);
    const reserved = Number(stock.reservedQuantity);
    return qty - reserved;
  };

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap flex-1">
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

          <Select value={warehouseFilter} onValueChange={handleWarehouseFilter} disabled={isNormalUser}>
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
        </div>

        <div className="flex items-center gap-4">
          {renderLimitSelector()}
          {renderPaginationButtons()}
        </div>
      </div>

      {/* Stocks Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Item</TableHead>
              <TableHead>Warehouse</TableHead>
              <TableHead className="text-right">Quantity</TableHead>
              <TableHead className="text-right">Reserved</TableHead>
              <TableHead className="text-right">Available</TableHead>
              <TableHead>Last Updated</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {initialStocks.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No stock records found
                </TableCell>
              </TableRow>
            ) : (
              initialStocks.map((stock) => {
                const available = getAvailableQuantity(stock);
                const isLowStock = available < 10; // Threshold for low stock warning

                return (
                  <TableRow key={stock.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded border bg-muted overflow-hidden flex items-center justify-center shrink-0">
                          {stock.item.featuredImage || (stock.item.images && Array.isArray(stock.item.images) && stock.item.images.length > 0) ? (
                            <img 
                              src={stock.item.featuredImage || stock.item.images[0]} 
                              alt={stock.item.name} 
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <FiPackage className="h-5 w-5 text-muted-foreground" />
                          )}
                        </div>
                        <div>
                          <Link
                            href={`/dashboard/master/items/${stock.item.id}`}
                            className="font-medium hover:underline block leading-tight text-foreground"
                          >
                            {stock.item.name}
                          </Link>
                          <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                            <span className="text-[11px] text-muted-foreground font-mono">
                              {stock.item.code}
                            </span>
                            {stock.item.variant && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-muted border border-border text-muted-foreground font-sans">
                                {stock.item.variant.color} / {stock.item.variant.size}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <FiBox className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <Link
                            href={`/dashboard/inventory/warehouses/${stock.warehouse.id}`}
                            className="font-medium hover:underline"
                          >
                            {stock.warehouse.name}
                          </Link>
                          <p className="text-xs text-muted-foreground font-mono">
                            {stock.warehouse.code}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatQuantity(stock.quantity)} {stock.item.unit.symbol}
                    </TableCell>
                    <TableCell className="text-right font-mono text-muted-foreground">
                      {formatQuantity(stock.reservedQuantity)} {stock.item.unit.symbol}
                    </TableCell>
                    <TableCell
                      className={cn(
                        "text-right font-mono font-semibold",
                        isLowStock && "text-orange-600",
                        available < 0 && "text-destructive"
                      )}
                    >
                      {formatQuantity(available)} {stock.item.unit.symbol}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(stock.lastUpdated), "MMM d, yyyy HH:mm")}
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
              {initialPagination.total} stock records
            </div>
            {renderLimitSelector()}
          </div>
          {renderPaginationButtons()}
        </div>
      )}
    </div>
  );
}
