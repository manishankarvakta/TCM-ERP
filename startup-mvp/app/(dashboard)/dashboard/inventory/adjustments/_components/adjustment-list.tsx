"use client";

import React from "react";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { CheckCircle, Trash2, Search, Eye, Download, Plus } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { approveAdjustment, deleteAdjustment } from "../_actions/adjustment.action";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { exportToCSV } from "@/lib/utils/export-csv";
import ExportAdjustmentsButton from "./ExportAdjustmentsButton";
import Link from "next/link";
import type { InventoryAdjustmentStatus } from "@prisma/client";

interface AdjustmentListProps {
  adjustments: any[];
  pagination: any;
  warehouses: Array<{ id: string; name: string; code: string }>;
  selectedWarehouseId: string;
  startDate: string;
  endDate: string;
  canChangeWarehouse: boolean;
}

export default function AdjustmentList({
  adjustments,
  pagination,
  warehouses = [],
  selectedWarehouseId,
  startDate,
  endDate,
  canChangeWarehouse,
}: AdjustmentListProps) {
  const router = useRouter();
  const params = useSearchParams();
  const [loadingId, setLoadingId] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState(params.get("search") || "");
  const [deleteId, setDeleteId] = React.useState<string | null>(null);
  const [approveId, setApproveId] = React.useState<string | null>(null);
  const { toast } = useToast();
  const [isPending, startTransition] = React.useTransition();

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
    const newParams = new URLSearchParams(params.toString());
    newParams.set("page", page.toString());
    router.push(`?${newParams.toString()}`);
  };

  const handleLimitChange = (newLimit: number) => {
    const newParams = new URLSearchParams(params.toString());
    newParams.set("limit", newLimit.toString());
    newParams.set("page", "1");
    router.push(`?${newParams.toString()}`);
  };

  const renderLimitSelector = () => {
    const limit = pagination?.limit ?? 20;
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Rows per page:</span>
        <Select
          value={String(limit)}
          onValueChange={(val: string) => handleLimitChange(Number(val))}
          disabled={isPending}
        >
          <SelectTrigger className="w-[70px] h-8 text-xs">
            <SelectValue placeholder={String(limit)} />
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
    const totalPages = pagination?.totalPages ?? 0;
    const page = pagination?.page ?? 1;
    if (totalPages <= 1) return null;
    return (
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => handlePageChange(page - 1)}
          disabled={page === 1 || isPending}
        >
          Previous
        </Button>
        
        <div className="flex items-center gap-1">
          {getPageNumbers(page, totalPages).map((p, idx) => {
            if (p === "...") {
              return (
                <span key={`dots-${idx}`} className="px-1 text-sm text-muted-foreground">
                  ...
                </span>
              );
            }
            const isCurrent = p === page;
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
          onClick={() => handlePageChange(page + 1)}
          disabled={page === totalPages || isPending}
        >
          Next
        </Button>
      </div>
    );
  };

  const [warehouseId, setWarehouseId] = React.useState(selectedWarehouseId);
  const [startDateVal, setStartDateVal] = React.useState(startDate);
  const [endDateVal, setEndDateVal] = React.useState(endDate);

  const updateFilters = (newParams: Record<string, string | null>) => {
    const newQueryParams = new URLSearchParams(params.toString());
    newQueryParams.set("page", "1");
    
    Object.entries(newParams).forEach(([key, value]) => {
      if (value) {
        newQueryParams.set(key, value);
      } else {
        newQueryParams.delete(key);
      }
    });
    
    router.push(`?${newQueryParams.toString()}`);
  };

  const handleWarehouseChange = (val: string) => {
    setWarehouseId(val);
    updateFilters({ warehouseId: val });
  };

  const handleStartDateChange = (val: string) => {
    setStartDateVal(val);
    updateFilters({ startDate: val });
  };

  const handleEndDateChange = (val: string) => {
    setEndDateVal(val);
    updateFilters({ endDate: val });
  };

  const handleApprove = async () => {
    if (!approveId) return;
    
    setLoadingId(approveId);
    try {
      const result = await approveAdjustment(approveId);
      if (result.success) {
        toast({
          title: "Success",
          description: "Adjustment approved successfully",
        });
        router.refresh();
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to approve adjustment",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setLoadingId(null);
      setApproveId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    
    setLoadingId(deleteId);
    try {
      const result = await deleteAdjustment(deleteId);
      if (result.success) {
        toast({
          title: "Success",
          description: "Adjustment deleted successfully",
        });
        router.refresh();
      } else {
         toast({
          title: "Error",
          description: result.error || "Failed to delete adjustment",
          variant: "destructive",
        });
      }
    } catch (error) {
       toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setLoadingId(null);
      setDeleteId(null);
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const newParams = new URLSearchParams(params.toString());
    if (search) {
      newParams.set("search", search);
    } else {
      newParams.delete("search");
    }
    newParams.set("page", "1");
    router.push(`?${newParams.toString()}`);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <form onSubmit={handleSearch} className="flex flex-wrap items-center gap-4 flex-1">
          <div className="relative flex-1 min-w-[240px] max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search adjustment number..." 
              className="pl-8"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          
          {/* Warehouse Filter */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">Warehouse:</span>
            <Select
              value={warehouseId}
              onValueChange={(val) => handleWarehouseChange(val)}
              disabled={!canChangeWarehouse}
            >
              <SelectTrigger className="w-[180px] h-9">
                <SelectValue placeholder="Select warehouse" />
              </SelectTrigger>
              <SelectContent>
                {canChangeWarehouse && <SelectItem value="all">All Warehouses</SelectItem>}
                {warehouses.map((w) => (
                  <SelectItem key={w.id} value={w.id}>
                    {w.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date Range Filters */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">From:</span>
            <Input
              type="date"
              value={startDateVal}
              onChange={(e) => handleStartDateChange(e.target.value)}
              className="w-[140px] h-9"
            />
            <span className="text-sm font-medium text-muted-foreground">To:</span>
            <Input
              type="date"
              value={endDateVal}
              onChange={(e) => handleEndDateChange(e.target.value)}
              className="w-[140px] h-9"
            />
          </div>

          <Button type="submit" variant="secondary" className="h-9">Search</Button>
        </form>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Number</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Warehouse</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Items</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Created By</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {adjustments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  No adjustments found
                </TableCell>
              </TableRow>
            ) : (
              adjustments.map((adj) => (
                <TableRow key={adj.id}>
                  <TableCell className="font-medium">{adj.adjustmentNumber}</TableCell>
                  <TableCell>{format(new Date(adj.date), "dd MMM yyyy")}</TableCell>
                  <TableCell>{adj.warehouse?.name}</TableCell>
                  <TableCell>
                    <Badge variant={
                      adj.status === "COMPLETED" ? "default" : 
                      adj.status === "DRAFT" ? "secondary" : "destructive"
                    }>
                      {adj.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{adj._count.items}</TableCell>
                  <TableCell className="text-right font-medium">
                    ৳{Number(adj.grandTotal || 0).toLocaleString()}
                  </TableCell>
                  <TableCell>{adj.createdByUser?.name}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                       {/* View/Edit logic could be added here */}
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="h-8 w-8 p-0"
                              onClick={() => router.push(`/dashboard/inventory/adjustments/${adj.id}`)}
                              title="View"
                            >
                              <Eye className="h-4 w-4 text-blue-600" />
                            </Button>
                            {adj.status === "DRAFT" && (
                              <>
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  className="h-8 w-8 p-0"
                                  onClick={() => setApproveId(adj.id)}
                                  disabled={loadingId === adj.id}
                                  title="Approve"
                                >
                                  <CheckCircle className="h-4 w-4 text-green-600" />
                                </Button>
                                <Button
                                   size="sm" 
                                   variant="outline" 
                                   className="h-8 w-8 p-0"
                                   onClick={() => setDeleteId(adj.id)}
                                   disabled={loadingId === adj.id}
                                   title="Delete"
                                >
                                   <Trash2 className="h-4 w-4 text-red-600" />
                                </Button>
                              </>
                            )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination controls */}
      {pagination && ((pagination.totalPages ?? 0) > 1 || (pagination.total ?? 0) > 0) && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4 px-1">
          <div className="flex flex-wrap items-center gap-4">
            <div className="text-sm text-muted-foreground">
              Showing {(((pagination.page ?? 1) - 1) * (pagination.limit ?? 20)) + 1} to{" "}
              {Math.min((pagination.page ?? 1) * (pagination.limit ?? 20), pagination.total ?? 0)} of{" "}
              {pagination.total ?? 0} adjustments
            </div>
            {renderLimitSelector()}
          </div>
          {renderPaginationButtons()}
        </div>
      )}


      <AlertDialog open={!!approveId} onOpenChange={() => setApproveId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approve Adjustment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to approve and post this adjustment? This action cannot be undone.
              Stock levels will be updated and accounting entries will be created.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!loadingId}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleApprove();
              }}
              disabled={!!loadingId}
              className="bg-green-600 hover:bg-green-700 focus:ring-green-600"
            >
              {loadingId ? "Approving..." : "Approve"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Adjustment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this draft adjustment? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!loadingId}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
              disabled={!!loadingId}
              className="bg-destructive hover:bg-destructive/90"
            >
              {loadingId ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

interface AdjustmentsHeaderActionsProps {
  canCreate: boolean;
  adjustments: any[];
}

export function AdjustmentsHeaderActions({
  canCreate,
  adjustments,
}: AdjustmentsHeaderActionsProps) {
  const { toast } = useToast();

  const handleExportCSV = () => {
    if (!adjustments || adjustments.length === 0) {
      toast({
        title: "No data",
        description: "There are no adjustments to export",
        variant: "destructive",
      });
      return;
    }

    const csvData = adjustments.map((adj) => ({
      "Adjustment Number": adj.adjustmentNumber,
      "Warehouse": adj.warehouse?.name || "-",
      "Status": adj.status,
      "Items Count": adj._count?.items || 0,
      "Amount (BDT)": Number(adj.grandTotal || 0).toFixed(2),
      "Created By": adj.createdByUser?.name || "-",
      "Date": format(new Date(adj.date), "yyyy-MM-dd"),
    }));

    exportToCSV(csvData, { filename: `adjustments-report-${format(new Date(), "yyyy-MM-dd")}.csv` });
  };

  const handleExportPDF = () => {
    if (!adjustments || adjustments.length === 0) {
      toast({
        title: "No data",
        description: "There are no adjustments to export",
        variant: "destructive",
      });
      return;
    }

    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text("Stock Adjustments Report", 14, 22);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated on: ${format(new Date(), "yyyy-MM-dd HH:mm")}`, 14, 30);
    
    const tableData = adjustments.map((adj) => [
      adj.adjustmentNumber,
      adj.warehouse?.name || "-",
      adj.status,
      adj._count?.items || 0,
      `BDT ${Number(adj.grandTotal || 0).toFixed(2)}`,
      adj.createdByUser?.name || "-",
      format(new Date(adj.date), "yyyy-MM-dd")
    ]);
    
    autoTable(doc, {
      startY: 35,
      head: [["Adjustment #", "Warehouse", "Status", "Items", "Amount", "Created By", "Date"]],
      body: tableData,
      theme: "striped",
      headStyles: { fillColor: [79, 70, 229] }, // indigo-600 color
    });
    
    doc.save(`adjustments-report-${format(new Date(), "yyyy-MM-dd")}.pdf`);
  };

  return (
    <div className="flex items-center gap-2">
      <ExportAdjustmentsButton />

      {canCreate && (
        <Button asChild>
          <Link href="/dashboard/inventory/adjustments/add">
            <Plus className="mr-2 h-4 w-4" />
            New Adjustment
          </Link>
        </Button>
      )}
    </div>
  );
}
