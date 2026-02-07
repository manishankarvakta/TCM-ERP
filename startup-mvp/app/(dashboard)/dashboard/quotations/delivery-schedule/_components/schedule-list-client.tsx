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
import { formatDate } from "@/lib/utils/formatters";

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface Schedule {
  id: string;
  scheduledDate: Date;
  status: string;
  description: string | null;
  order: {
    id: string;
    orderNumber: string;
    client: {
      name: string | null;
      company: string | null;
    } | null;
  };
  _count: {
    items: number;
  };
}

interface ScheduleListClientProps {
  initialSchedules: Schedule[];
  initialPagination: Pagination;
  initialSearch: string;
  initialStatus: string;
}

export default function ScheduleListClient({
  initialSchedules,
  initialPagination,
  initialSearch,
  initialStatus,
}: ScheduleListClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  
  const [search, setSearch] = useState(initialSearch);
  const [status, setStatus] = useState(initialStatus);

  const applyFilters = (newSearch: string, newStatus: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (newSearch) params.set("search", newSearch);
    else params.delete("search");
    
    if (newStatus && newStatus !== "all") params.set("status", newStatus);
    else params.delete("status");
    
    params.set("page", "1");
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleSearch = (value: string) => {
    setSearch(value);
    applyFilters(value, status);
  };

  const handleStatusChange = (value: string) => {
    setStatus(value);
    applyFilters(search, value);
  };

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case "scheduled": return <Badge variant="secondary" className="bg-slate-100 text-slate-700 hover:bg-slate-100 border-slate-200">Scheduled</Badge>;
      case "confirmed": return <Badge variant="secondary" className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-blue-200">Confirmed</Badge>;
      case "completed": return <Badge variant="secondary" className="bg-green-100 text-green-700 hover:bg-green-100 border-green-200">Completed</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4 bg-white p-3 rounded-lg border shadow-sm">
        <div className="relative flex-1 min-w-[250px]">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by order # or client..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-9 h-9 text-sm"
          />
        </div>
        
        <select 
          value={status} 
          onChange={(e) => handleStatusChange(e.target.value)}
          className="h-9 px-3 border rounded-md text-sm bg-transparent focus:outline-none focus:ring-1 focus:ring-primary"
        >
          <option value="all">All Statuses</option>
          <option value="scheduled">Scheduled</option>
          <option value="confirmed">Confirmed</option>
          <option value="completed">Completed</option>
        </select>

        {(search || (status && status !== "all")) && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => {
                setSearch("");
                setStatus("all");
                router.push(pathname);
            }} 
            className="h-9 text-xs"
          >
            <FiX className="mr-1 h-3 w-3" />
            Clear Filters
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden bg-white shadow-sm">
        <Table className="text-xs">
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead className="w-[120px]">Scheduled Date</TableHead>
              <TableHead className="w-[100px]">Order No</TableHead>
              <TableHead>Client</TableHead>
              <TableHead className="w-[100px]">Status</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="text-center w-[80px]">Items</TableHead>
              <TableHead className="text-right w-[80px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {initialSchedules.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-10 text-muted-foreground italic">
                  No delivery schedules found.
                </TableCell>
              </TableRow>
            ) : (
              initialSchedules.map((schedule) => (
                <TableRow key={schedule.id} className="hover:bg-slate-50/50">
                  <TableCell className="font-medium">
                    {formatDate(schedule.scheduledDate)}
                  </TableCell>
                  <TableCell>
                    <Link href={`/dashboard/quotations/orders/${schedule.order.id}`} className="hover:underline text-blue-600 font-semibold">
                        {schedule.order.orderNumber}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <div className="max-w-[200px] truncate" title={schedule.order.client?.company || schedule.order.client?.name || ""}>
                        <span className="font-medium">{schedule.order.client?.company || schedule.order.client?.name || "N/A"}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                     {getStatusBadge(schedule.status)}
                  </TableCell>
                  <TableCell className="max-w-xs truncate text-muted-foreground" title={schedule.description || ""}>
                      {schedule.description || "-"}
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-bold">
                        {schedule._count.items}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" asChild className="h-7 w-7">
                      <Link href={`/dashboard/quotations/delivery-schedule/${schedule.id}`}>
                        <FiEye className="h-4 w-4 text-slate-500 hover:text-primary transition-colors" />
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
        <div className="flex items-center justify-between py-2 px-1">
          <div className="text-xs text-muted-foreground">
            Showing <b>{((initialPagination.page - 1) * initialPagination.limit) + 1}</b> to{" "}
            <b>{Math.min(initialPagination.page * initialPagination.limit, initialPagination.total)}</b>{" "}
            of <b>{initialPagination.total}</b> schedules
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
              className="h-8 text-xs"
            >
              Prev
            </Button>
            <span className="text-[10px] uppercase font-bold text-slate-400">
              Page {initialPagination.page} / {initialPagination.totalPages}
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
              className="h-8 text-xs"
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
