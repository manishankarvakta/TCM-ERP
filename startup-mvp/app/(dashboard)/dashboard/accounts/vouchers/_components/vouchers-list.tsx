"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { FiSearch, FiEye, FiX, FiCheck } from "react-icons/fi";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import ProtectedAction from "@/components/permissions/protected-action";
import { postVoucher } from "../_actions/voucher.action";

interface Voucher {
  id: string;
  voucherNumber: string;
  date: Date;
  type: string;
  reference: string | null;
  description: string | null;
  status: string;
  totalAmount?: number;
  voucherLines?: Array<{
    debitAmount: number;
    creditAmount: number;
  }>;
  client: {
    id: string;
    name: string;
    email: string | null;
  } | null;
  supplier: {
    id: string;
    name: string;
    email: string | null;
  } | null;
  creator: {
    id: string;
    name: string;
    email: string;
  };
  postedBy: {
    id: string;
    name: string;
    email: string;
  } | null;
  postedAt: Date | null;
  createdAt: Date;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface VouchersListClientProps {
  initialVouchers: Voucher[];
  initialPagination: Pagination;
  initialSearch: string;
  userId?: string;
  permissions?: {
    view: boolean;
    edit: boolean;
    create: boolean;
  };
  warehouses?: Array<{ id: string; name: string; code: string }>;
  selectedWarehouseId?: string;
  selectedType?: string;
  isAdmin?: boolean;
}

export default function VouchersListClient({
  initialVouchers = [],
  initialPagination,
  initialSearch,
  userId,
  permissions,
  warehouses = [],
  selectedWarehouseId = "",
  selectedType = "all",
  isAdmin = false,
}: VouchersListClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(initialSearch);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

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

  const handlePageChange = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", page.toString());
    router.push(`/dashboard/accounts/vouchers?${params.toString()}`);
  };

  const handleLimitChange = (newLimit: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("limit", newLimit.toString());
    params.set("page", "1");
    router.push(`/dashboard/accounts/vouchers?${params.toString()}`);
  };

  const renderLimitSelector = () => {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Rows per page:</span>
        <Select
          value={String(initialPagination.limit)}
          onValueChange={(val: string) => handleLimitChange(Number(val))}
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

  const handleSearch = (value: string) => {
    setSearch(value);
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set("search", value);
    } else {
      params.delete("search");
    }
    params.set("page", "1");
    const tab = searchParams.get("tab") || "all";
    if (tab) {
      params.set("tab", tab);
    }
    router.push(`/dashboard/accounts/vouchers?${params.toString()}`);
  };

  const handleWarehouseChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== "all") {
      params.set("warehouseId", value);
    } else {
      params.delete("warehouseId");
    }
    params.set("page", "1");
    const tab = searchParams.get("tab") || "all";
    if (tab) {
      params.set("tab", tab);
    }
    router.push(`/dashboard/accounts/vouchers?${params.toString()}`);
  };

  const dateFrom = searchParams.get("dateFrom") || "";
  const dateTo = searchParams.get("dateTo") || "";

  const handleDateFromChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set("dateFrom", value);
    } else {
      params.delete("dateFrom");
    }
    params.set("page", "1");
    const tab = searchParams.get("tab") || "all";
    if (tab) {
      params.set("tab", tab);
    }
    router.push(`/dashboard/accounts/vouchers?${params.toString()}`);
  };

  const handleDateToChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set("dateTo", value);
    } else {
      params.delete("dateTo");
    }
    params.set("page", "1");
    const tab = searchParams.get("tab") || "all";
    if (tab) {
      params.set("tab", tab);
    }
    router.push(`/dashboard/accounts/vouchers?${params.toString()}`);
  };

  const handleTypeChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== "all") {
      params.set("type", value);
    } else {
      params.delete("type");
    }
    params.set("page", "1");
    const tab = searchParams.get("tab") || "all";
    if (tab) {
      params.set("tab", tab);
    }
    router.push(`/dashboard/accounts/vouchers?${params.toString()}`);
  };

  const handlePostVoucher = async (voucherId: string) => {
    startTransition(async () => {
      const result = await postVoucher(voucherId);
      if (result.success) {
        toast({
          title: "Success",
          description: "Voucher posted successfully",
        });
        router.refresh();
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to post voucher",
          variant: "destructive",
        });
      }
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "posted":
        return "bg-green-100 text-green-800";
      case "draft":
        return "bg-yellow-100 text-yellow-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "SALES":
        return "bg-blue-100 text-blue-800";
      case "PURCHASE":
        return "bg-purple-100 text-purple-800";
      case "PAYMENT":
        return "bg-red-100 text-red-800";
      case "RECEIPT":
        return "bg-green-100 text-green-800";
      case "JOURNAL":
        return "bg-orange-100 text-orange-800";
      case "CONTRA":
        return "bg-pink-100 text-pink-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="space-y-4">
      {/* Search, Type, Date Range & Warehouse Filters */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row items-center gap-4 flex-1">
          <div className="relative flex-1 max-w-sm w-full">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by voucher number, reference, or description..."
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

          <div className="w-full sm:w-[160px]">
            <Select
              value={selectedType || "all"}
              onValueChange={handleTypeChange}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Filter by Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="PAYMENT">Payment</SelectItem>
                <SelectItem value="RECEIPT">Receipt</SelectItem>
                <SelectItem value="JOURNAL">Journal</SelectItem>
                <SelectItem value="CONTRA">Transfer</SelectItem>
                <SelectItem value="SALES">Sales</SelectItem>
                <SelectItem value="PURCHASE">Purchase</SelectItem>
                <SelectItem value="RETURN">Return</SelectItem>
                <SelectItem value="DAMAGE">Damage</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="w-full sm:w-[200px]">
            <Select
              value={selectedWarehouseId || "all"}
              onValueChange={handleWarehouseChange}
              disabled={!isAdmin}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Filter by Warehouse" />
              </SelectTrigger>
              <SelectContent>
                {isAdmin && (
                  <SelectItem value="all">All Warehouses</SelectItem>
                )}
                {warehouses.map((w) => (
                  <SelectItem key={w.id} value={w.id}>
                    {w.name} ({w.code})
                  </SelectItem>
                ))}
                {!isAdmin && warehouses.length === 0 && (
                  <SelectItem value="none">No Warehouse Assigned</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Date Range Inputs */}
        <div className="flex items-center gap-2 w-full xl:w-auto">
          <Input
            type="date"
            placeholder="From Date"
            value={dateFrom}
            onChange={(e) => handleDateFromChange(e.target.value)}
            className="w-[140px] text-xs h-9"
          />
          <span className="text-xs text-muted-foreground">to</span>
          <Input
            type="date"
            placeholder="To Date"
            value={dateTo}
            onChange={(e) => handleDateToChange(e.target.value)}
            className="w-[140px] text-xs h-9"
          />
          {(dateFrom || dateTo) && (
            <Button
              variant="outline"
              size="sm"
              className="h-9 px-2 text-xs"
              onClick={() => {
                handleDateFromChange("");
                handleDateToChange("");
              }}
            >
              Clear Dates
            </Button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Voucher Number</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Reference</TableHead>
              <TableHead>Client/Supplier</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Posted At</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {initialVouchers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                  No vouchers found
                </TableCell>
              </TableRow>
            ) : (
              initialVouchers.map((voucher) => {
                const amount = voucher.totalAmount ?? (
                  voucher.voucherLines && voucher.voucherLines.length > 0
                    ? voucher.voucherLines.reduce((sum, l) => sum + Number(l.debitAmount || 0), 0)
                    : 0
                );
                return (
                  <TableRow key={voucher.id}>
                    <TableCell className="font-medium">
                      {voucher.voucherNumber}
                    </TableCell>
                    <TableCell>
                      {format(new Date(voucher.date), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell>
                      <Badge className={getTypeColor(voucher.type)}>
                        {voucher.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {voucher.reference || "-"}
                    </TableCell>
                    <TableCell>
                      {voucher.client?.name || voucher.supplier?.name || "-"}
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(voucher.status)}>
                        {voucher.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {voucher.postedAt ? format(new Date(voucher.postedAt), "MMM d, yyyy") : "-"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 justify-end">
                        <ProtectedAction 
                          permissionKey="accounts.vouchers" 
                          action="view"
                          href={`/dashboard/accounts/vouchers/${voucher.id}`}
                          userId={userId}
                          hasAccess={permissions?.view}
                        >
                          <FiEye className="h-4 w-4" />
                        </ProtectedAction>
                        {voucher.status === "draft" && (
                          <ProtectedAction 
                            permissionKey="accounts.vouchers" 
                            action="edit"
                            onClick={() => handlePostVoucher(voucher.id)}
                            buttonProps={{ disabled: isPending }}
                            userId={userId}
                            hasAccess={permissions?.edit}
                          >
                            <FiCheck className="h-4 w-4" />
                          </ProtectedAction>
                        )}
                      </div>
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
              {initialPagination.total} vouchers
            </div>
            {renderLimitSelector()}
          </div>
          {renderPaginationButtons()}
        </div>
      )}
    </div>
  );
}

