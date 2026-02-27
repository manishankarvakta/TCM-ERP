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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Link from "next/link";
import { FiSearch, FiEye, FiX } from "react-icons/fi";
import { formatDate, formatCurrency } from "@/lib/utils/formatters";
import { cn } from "@/lib/utils";

interface Order {
  id: string;
  orderNumber: string;
  quotationId: string | null;
  clientId: string | null;
  totalValue: number;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  Client: {
    id: string;
    name: string | null;
    company: string | null;
    email: string | null;
    image: string | null;
  } | null;
  Quotation?: {
    quotationNumber: string;
  } | null;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface OrdersListClientProps {
  initialOrders: Order[];
  initialPagination: Pagination;
  initialSearch: string;
  permissions: {
    view: boolean;
    create: boolean;
  };
}

export default function OrdersListClient({
  initialOrders,
  initialPagination,
  initialSearch,
  permissions,
}: OrdersListClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  
  // Determine base path based on current route
  // If we're on the nested route, use it. Otherwise fallback to standard dashboard path.
  const basePath = pathname?.includes("/quotations/orders") 
    ? "/dashboard/quotations/orders" 
    : (pathname?.startsWith("/dashboard") ? "/dashboard/orders" : "/dashboard/orders");
  
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
    const tab = searchParams.get("tab") || "all";
    if (tab) {
      params.set("tab", tab);
    }
    router.push(`${basePath}?${params.toString()}`);
  };

  const getInitials = (name: string | null, email: string | null) => {
    if (name) {
      return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    if (email) {
      return email[0].toUpperCase();
    }
    return "?";
  };

  const getStatusBadge = (status: string) => {
    const statusLower = status.toLowerCase();
    switch (statusLower) {
      case "pending":
        return <Badge variant="secondary">Pending</Badge>;
      case "processing":
        return <Badge className="bg-blue-600 hover:bg-blue-700">Processing</Badge>;
      case "delivered":
        return <Badge className="bg-indigo-600 hover:bg-indigo-700">Delivered</Badge>;
      case "completed":
        return <Badge className="bg-green-600 hover:bg-green-700">Completed</Badge>;
      case "cancelled":
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by order #, client, or quotation..."
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
              <TableHead>Order Number</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Quotation Ref</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Total Value</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {initialOrders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No orders found
                </TableCell>
              </TableRow>
            ) : (
              initialOrders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-medium">
                    <Link href={`${basePath}/${order.id}`} className="hover:underline text-primary">
                        {order.orderNumber}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage 
                          src={order.Client?.image || undefined} 
                          alt={order.Client?.name || order.Client?.company || "Client"} 
                        />
                        <AvatarFallback>
                          {getInitials(order.Client?.name || null, order.Client?.email || null)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">{order.Client?.name || order.Client?.company || "N/A"}</span>
                        {order.Client?.company && order.Client.name && (
                            <span className="text-xs text-muted-foreground">{order.Client.company}</span>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {order.Quotation ? (
                        <Link href={`/dashboard/quotations/${order.quotationId}`} className="text-muted-foreground hover:text-primary transition-colors">
                            {order.Quotation.quotationNumber}
                        </Link>
                    ) : (
                        <span className="text-muted-foreground italic">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(order.createdAt)}
                  </TableCell>
                  <TableCell>{getStatusBadge(order.status)}</TableCell>
                  <TableCell className="font-medium">
                    {formatCurrency(Number(order.totalValue || 0))}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" asChild className="h-8 w-8 p-0">
                      <Link href={`${basePath}/${order.id}`}>
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
            of {initialPagination.total} orders
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const params = new URLSearchParams(searchParams.toString());
                params.set("page", String(Math.max(1, initialPagination.page - 1)));
                router.push(`${basePath}?${params.toString()}`);
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
                router.push(`${basePath}?${params.toString()}`);
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
