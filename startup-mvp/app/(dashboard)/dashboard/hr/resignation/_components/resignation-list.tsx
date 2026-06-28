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
import { FiSearch, FiX, FiMoreVertical, FiCheck, FiXCircle, FiPrinter } from "react-icons/fi";
import { updateResignationStatus } from "../_actions/resignation.action";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ResignationStatus } from "@prisma/client";

interface Resignation {
  id: string;
  resignDate: Date;
  effectiveDate: Date;
  reason: string | null;
  status: ResignationStatus;
  employee: {
    id: string;
    name: string;
    employeeCode: string | null;
    designation: string | null;
  };
  manager: { id: string; name: string } | null;
  admin: { id: string; name: string } | null;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface ResignationListProps {
  initialResignations: Resignation[];
  initialPagination: Pagination;
  initialSearch: string;
  userId?: string;
  permissions?: {
    view: boolean;
    edit: boolean;
    approve: boolean;
  };
}

export default function ResignationList({
  initialResignations = [],
  initialPagination,
  initialSearch,
  userId,
  permissions,
}: ResignationListProps) {
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
    router.push(`/dashboard/hr/resignation?${params.toString()}`);
  };

  const handleStatusUpdate = async (id: string, status: ResignationStatus) => {
    startTransition(async () => {
      const result = await updateResignationStatus(id, status);
      if (result.success) {
        toast({ title: "Success", description: result.message || `Resignation application marked as ${status}` });
        router.refresh();
      } else {
        toast({ title: "Error", description: result.error, variant: "destructive" });
      }
    });
  };

  const getStatusBadge = (status: ResignationStatus) => {
    switch (status) {
      case "PENDING":
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Pending</Badge>;
      case "MANAGER_APPROVED":
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200">Manager Approved</Badge>;
      case "APPROVED":
        return <Badge className="bg-green-100 text-green-800 border-green-200">Approved</Badge>;
      case "REJECTED":
        return <Badge className="bg-red-100 text-red-800 border-red-200">Rejected</Badge>;
      case "CANCELLED":
        return <Badge className="bg-gray-100 text-gray-800 border-gray-200">Cancelled</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      {/* Filters and Search */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-sm">
          <FiSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search employee..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-9 pr-8"
          />
          {search && (
            <button
              onClick={() => handleSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <FiX className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employee</TableHead>
              <TableHead>Submission Date</TableHead>
              <TableHead>Effective Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Approvers</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead className="w-[80px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {initialResignations.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  No resignation requests found.
                </TableCell>
              </TableRow>
            ) : (
              initialResignations.map((resign) => (
                <TableRow key={resign.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium text-foreground">{resign.employee.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {resign.employee.employeeCode || "N/A"} • {resign.employee.designation || ""}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>{format(new Date(resign.resignDate), "dd MMM yyyy")}</TableCell>
                  <TableCell>{format(new Date(resign.effectiveDate), "dd MMM yyyy")}</TableCell>
                  <TableCell>{getStatusBadge(resign.status)}</TableCell>
                  <TableCell>
                    <div className="text-xs space-y-0.5">
                      {resign.manager && (
                        <p className="text-muted-foreground">
                          <span className="font-semibold">Mgr:</span> {resign.manager.name}
                        </p>
                      )}
                      {resign.admin && (
                        <p className="text-muted-foreground">
                          <span className="font-semibold">Adm:</span> {resign.admin.name}
                        </p>
                      )}
                      {!resign.manager && !resign.admin && <p className="text-muted-foreground">-</p>}
                    </div>
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate" title={resign.reason || ""}>
                    {resign.reason || "-"}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <FiMoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/dashboard/hr/resignation/${resign.id}`}>
                            View Details
                          </Link>
                        </DropdownMenuItem>

                        {/* Quick Approvals */}
                        {permissions?.approve && resign.status === "PENDING" && (
                          <>
                            <DropdownMenuItem
                              onClick={() => handleStatusUpdate(resign.id, "MANAGER_APPROVED")}
                              disabled={isPending}
                            >
                              <FiCheck className="mr-2 h-4 w-4 text-blue-600" />
                              Approve as Manager
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleStatusUpdate(resign.id, "APPROVED")}
                              disabled={isPending}
                            >
                              <FiCheck className="mr-2 h-4 w-4 text-green-600" />
                              Approve as Admin
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive focus:bg-destructive/10"
                              onClick={() => handleStatusUpdate(resign.id, "REJECTED")}
                              disabled={isPending}
                            >
                              <FiXCircle className="mr-2 h-4 w-4" />
                              Reject Request
                            </DropdownMenuItem>
                          </>
                        )}

                        {permissions?.approve && resign.status === "MANAGER_APPROVED" && (
                          <>
                            <DropdownMenuItem
                              onClick={() => handleStatusUpdate(resign.id, "APPROVED")}
                              disabled={isPending}
                            >
                              <FiCheck className="mr-2 h-4 w-4 text-green-600" />
                              Approve as Admin
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive focus:bg-destructive/10"
                              onClick={() => handleStatusUpdate(resign.id, "REJECTED")}
                              disabled={isPending}
                            >
                              <FiXCircle className="mr-2 h-4 w-4" />
                              Reject Request
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination controls */}
      {initialPagination.totalPages > 1 && (
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={initialPagination.page <= 1}
            onClick={() => {
              const params = new URLSearchParams(searchParams.toString());
              params.set("page", String(initialPagination.page - 1));
              router.push(`/dashboard/hr/resignation?${params.toString()}`);
            }}
          >
            Previous
          </Button>
          <div className="flex items-center text-sm font-medium">
            Page {initialPagination.page} of {initialPagination.totalPages}
          </div>
          <Button
            variant="outline"
            size="sm"
            disabled={initialPagination.page >= initialPagination.totalPages}
            onClick={() => {
              const params = new URLSearchParams(searchParams.toString());
              params.set("page", String(initialPagination.page + 1));
              router.push(`/dashboard/hr/resignation?${params.toString()}`);
            }}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
