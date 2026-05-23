"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FiSearch, FiX, FiMoreVertical, FiCheck, FiXCircle } from "react-icons/fi";
import { updateLeaveStatus } from "../_actions/leave-application.action";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { LeaveStatus } from "@prisma/client";

interface LeaveApplication {
  id: string;
  startDate: Date;
  endDate: Date;
  totalDays: number;
  reason: string | null;
  status: LeaveStatus;
  employee: {
    id: string;
    name: string;
    employeeCode: string | null;
    designation: string | null;
  };
  leaveType: {
    id: string;
    name: string;
    isPaid: boolean;
  };
  manager: { id: string; name: string } | null;
  hr: { id: string; name: string } | null;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface LeaveApplicationsListClientProps {
  initialApplications: LeaveApplication[];
  initialPagination: Pagination;
  initialSearch: string;
  userId?: string;
  permissions?: {
    view: boolean;
    edit: boolean;
  };
}

export default function LeaveApplicationsListClient({
  initialApplications = [],
  initialPagination,
  initialSearch,
  userId,
  permissions,
}: LeaveApplicationsListClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(initialSearch);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const handleSearch = (value: string) => {
    setSearch(value);
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set("search", value);
    } else {
      params.delete("search");
    }
    params.set("page", "1");
    router.push(`/dashboard/hr/leave?${params.toString()}`);
  };

  const handleStatusUpdate = async (id: string, status: LeaveStatus) => {
    startTransition(async () => {
      const result = await updateLeaveStatus(id, status);
      if (result.success) {
        toast({ title: "Success", description: `Leave application marked as ${status}` });
        router.refresh();
      } else {
        toast({ title: "Error", description: result.error || "Failed to update status", variant: "destructive" });
      }
    });
  };

  const getStatusBadge = (status: LeaveStatus) => {
    switch (status) {
      case "PENDING":
        return <Badge variant="secondary" className="bg-amber-100 text-amber-800 hover:bg-amber-100">Pending</Badge>;
      case "MANAGER_APPROVED":
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800 hover:bg-blue-100">Mgr Approved</Badge>;
      case "HR_APPROVED":
        return <Badge className="bg-emerald-500 hover:bg-emerald-600">HR Approved</Badge>;
      case "REJECTED":
        return <Badge variant="destructive">Rejected</Badge>;
      case "CANCELLED":
        return <Badge variant="outline">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by employee name..."
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

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employee</TableHead>
              <TableHead>Leave Type</TableHead>
              <TableHead>Date Range</TableHead>
              <TableHead className="text-right">Days</TableHead>
              <TableHead>Status</TableHead>
              {permissions?.edit && <TableHead className="text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {initialApplications.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No leave applications found.
                </TableCell>
              </TableRow>
            ) : (
              initialApplications.map((app) => (
                <TableRow key={app.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{app.employee.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {app.employee.employeeCode || "N/A"} • {app.employee.designation || "No Desig."}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{app.leaveType.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {app.leaveType.isPaid ? "Paid" : "Unpaid"}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {format(new Date(app.startDate), "MMM d, yyyy")} - {format(new Date(app.endDate), "MMM d, yyyy")}
                    </div>
                    {app.reason && (
                      <div className="text-xs text-muted-foreground truncate max-w-[200px]" title={app.reason}>
                        {app.reason}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {app.totalDays}
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(app.status)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/dashboard/hr/leave/${app.id}`}>
                        View Details
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {initialPagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Showing {((initialPagination.page - 1) * initialPagination.limit) + 1} to{" "}
            {Math.min(initialPagination.page * initialPagination.limit, initialPagination.total)} of{" "}
            {initialPagination.total} applications
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={initialPagination.page === 1}
              onClick={() => {
                const params = new URLSearchParams(searchParams.toString());
                params.set("page", String(initialPagination.page - 1));
                router.push(`/dashboard/hr/leave?${params.toString()}`);
              }}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={initialPagination.page === initialPagination.totalPages}
              onClick={() => {
                const params = new URLSearchParams(searchParams.toString());
                params.set("page", String(initialPagination.page + 1));
                router.push(`/dashboard/hr/leave?${params.toString()}`);
              }}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
