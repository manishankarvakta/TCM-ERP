"use client";

import { useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
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
import Link from "next/link";
import { FiSearch, FiEye, FiX, FiCalendar } from "react-icons/fi";
import { formatDate, formatCurrency } from "@/lib/utils/formatters";

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface Delivery {
  id: string;
  date: Date;
  status: string;
  quantity: any;
  order: {
    id: string;
    orderNumber: string;
    client: {
      name: string | null;
      company: string | null;
    } | null;
  };
  orderItem: {
    description: string;
    unitPrice: any;
  };
  creator: {
    name: string | null;
    email: string | null;
  } | null;
}

interface DeliveryLedgerListClientProps {
  initialDeliveries: Delivery[];
  initialPagination: Pagination;
  initialSearch: string;
  initialDateFrom?: string;
  initialDateTo?: string;
}

export default function DeliveryLedgerListClient({
  initialDeliveries,
  initialPagination,
  initialSearch,
  initialDateFrom = "",
  initialDateTo = "",
}: DeliveryLedgerListClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  
  const [search, setSearch] = useState(initialSearch);
  const [dateFrom, setDateFrom] = useState(initialDateFrom);
  const [dateTo, setDateTo] = useState(initialDateTo);

  const applyFilters = (newSearch: string, newFrom: string, newTo: string) => {
    const params = new URLSearchParams(searchParams.toString());
    
    if (newSearch) params.set("search", newSearch);
    else params.delete("search");
    
    if (newFrom) params.set("dateFrom", newFrom);
    else params.delete("dateFrom");
    
    if (newTo) params.set("dateTo", newTo);
    else params.delete("dateTo");
    
    params.set("page", "1");
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleSearch = (value: string) => {
    setSearch(value);
    applyFilters(value, dateFrom, dateTo);
  };

  const handleDateChange = (type: "from" | "to", value: string) => {
    if (type === "from") {
      setDateFrom(value);
      applyFilters(search, value, dateTo);
    } else {
      setDateTo(value);
      applyFilters(search, dateFrom, value);
    }
  };

  const clearFilters = () => {
    setSearch("");
    setDateFrom("");
    setDateTo("");
    router.push(pathname);
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4 bg-muted/30 p-4 rounded-lg border">
        <div className="relative flex-1 min-w-[300px]">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search order # or client..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <div className="flex items-center gap-2">
          <div className="relative">
             <FiCalendar className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
             <Input
                type="date"
                value={dateFrom}
                onChange={(e) => handleDateChange("from", e.target.value)}
                className="pl-9 w-[160px] h-9 text-xs"
             />
          </div>
          <span className="text-muted-foreground">to</span>
          <div className="relative">
             <FiCalendar className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
             <Input
                type="date"
                value={dateTo}
                onChange={(e) => handleDateChange("to", e.target.value)}
                className="pl-9 w-[160px] h-9 text-xs"
             />
          </div>
        </div>

        {(search || dateFrom || dateTo) && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9">
            <FiX className="mr-2 h-4 w-4" />
            Clear
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden bg-background">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Date</TableHead>
              <TableHead>Order No</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Item / Description</TableHead>
              <TableHead className="text-right">Qty</TableHead>
              <TableHead className="text-right">Value</TableHead>
              <TableHead className="text-right w-[80px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {initialDeliveries.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12 text-muted-foreground italic">
                  No delivery records found matching your filters.
                </TableCell>
              </TableRow>
            ) : (
              initialDeliveries.map((delivery) => (
                <TableRow key={delivery.id} className="group overflow-hidden">
                  <TableCell className="whitespace-nowrap">
                    {formatDate(delivery.date)}
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    <Link href={`/dashboard/quotations/orders/${delivery.order.id}`} className="hover:underline text-primary font-semibold">
                        {delivery.order.orderNumber}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <div className="max-w-[150px] truncate" title={delivery.order.client?.company || delivery.order.client?.name || ""}>
                        <span className="text-sm font-medium">{delivery.order.client?.company || delivery.order.client?.name || "N/A"}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                     <Badge variant="secondary" className="text-[10px] h-5 px-1.5 uppercase font-bold tracking-tight">
                        {delivery.status}
                     </Badge>
                  </TableCell>
                  <TableCell className="max-w-xs truncate" title={delivery.orderItem.description}>
                      <span className="text-sm">{delivery.orderItem.description}</span>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {Number(delivery.quantity).toFixed(2)}
                  </TableCell>
                   <TableCell className="text-right text-muted-foreground font-mono text-xs">
                    {formatCurrency(Number(delivery.quantity) * Number(delivery.orderItem.unitPrice))}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" asChild className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Link href={`/dashboard/quotations/orders/${delivery.order.id}`}>
                        <FiEye className="h-4 w-4 text-primary" />
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {initialPagination.totalPages > 1 && (
        <div className="flex items-center justify-between py-4 border-t">
          <div className="text-sm text-muted-foreground">
            Showing <span className="font-medium text-foreground">{((initialPagination.page - 1) * initialPagination.limit) + 1}</span> to{" "}
            <span className="font-medium text-foreground">{Math.min(initialPagination.page * initialPagination.limit, initialPagination.total)}</span>{" "}
            of <span className="font-medium text-foreground">{initialPagination.total}</span> entries
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const params = new URLSearchParams(searchParams.toString());
                params.set("page", String(Math.max(1, initialPagination.page - 1)));
                router.push(`${pathname}?${params.toString()}`);
              }}
              disabled={initialPagination.page === 1}
              className="h-8"
            >
              Previous
            </Button>
            <div className="flex items-center gap-1">
                <span className="text-sm text-muted-foreground px-2">
                Page <span className="font-medium text-foreground">{initialPagination.page}</span> of {initialPagination.totalPages}
                </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const params = new URLSearchParams(searchParams.toString());
                params.set("page", String(Math.min(initialPagination.totalPages, initialPagination.page + 1)));
                router.push(`${pathname}?${params.toString()}`);
              }}
              disabled={initialPagination.page === initialPagination.totalPages}
              className="h-8"
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
