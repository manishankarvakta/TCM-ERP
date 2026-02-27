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
import { FiSearch, FiEye, FiX } from "react-icons/fi";
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
  Order: {
    id: string;
    orderNumber: string;
    Client: {
      name: string | null;
      company: string | null;
    } | null;
  };
  OrderItem: {
    description: string;
    unitPrice: any;
  };
}

interface DeliveryListClientProps {
  initialDeliveries: Delivery[];
  initialPagination: Pagination;
  initialSearch: string;
}

export default function DeliveryListClient({
  initialDeliveries,
  initialPagination,
  initialSearch,
}: DeliveryListClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  
  const [search, setSearch] = useState(initialSearch);

  const handleSearch = (value: string) => {
    setSearch(value);
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set("search", value);
    } else {
      params.delete("search");
    }
    params.set("page", "1");
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by order # or client..."
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
      </div>

      {/* Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order No</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Delivery Date</TableHead>
              <TableHead>Delivery Status</TableHead>
              <TableHead>Item</TableHead>
              <TableHead className="text-right">Delivered Qty</TableHead>
              <TableHead className="text-right">Value</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {initialDeliveries.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  No deliveries found
                </TableCell>
              </TableRow>
            ) : (
              initialDeliveries.map((delivery) => (
                <TableRow key={delivery.id}>
                  <TableCell className="font-medium">
                    <Link href={`/dashboard/quotations/orders/${delivery.Order.id}`} className="hover:underline text-primary">
                        {delivery.Order.orderNumber}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                        <span className="text-sm font-medium">{delivery.Order.Client?.company || delivery.Order.Client?.name || "N/A"}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {formatDate(delivery.date)}
                  </TableCell>
                  <TableCell>
                     <Badge variant="outline" className="uppercase text-xs">{delivery.status}</Badge>
                  </TableCell>
                  <TableCell className="max-w-xs truncate" title={delivery.OrderItem.description}>
                      {delivery.OrderItem.description}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {Number(delivery.quantity)}
                  </TableCell>
                   <TableCell className="text-right text-muted-foreground">
                    {formatCurrency(Number(delivery.quantity) * Number(delivery.OrderItem.unitPrice))}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" asChild className="h-8 w-8 p-0">
                      <Link href={`/dashboard/quotations/delivery-schedule/${delivery.id}`}>
                        <FiEye className="h-4 w-4" />
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
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Showing {((initialPagination.page - 1) * initialPagination.limit) + 1} to{" "}
            {Math.min(initialPagination.page * initialPagination.limit, initialPagination.total)}{" "}
            of {initialPagination.total} entries
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
                router.push(`${pathname}?${params.toString()}`);
              }}
              disabled={initialPagination.page === initialPagination.totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
