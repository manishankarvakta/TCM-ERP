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
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FiSearch,
  FiTrash2,
  FiX,
  FiMoreVertical,
  FiRotateCw,
  FiDownload,
  FiPlus,
} from "react-icons/fi";
import Link from "next/link";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { exportToCSV } from "@/lib/utils/export-csv";
import {
  deleteGRN,
  bulkUpdateGRNStatus,
  deleteGRNsPermanently,
} from "../_actions/grn.action";
import ProtectedAction from "@/components/permissions/protected-action";
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
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import type { GRNStatus } from "@prisma/client";

interface GRN {
  id: string;
  grnNumber: string;
  date: Date;
  status: GRNStatus;
  grandTotal: number;
  isTrash: boolean;
  source: {
    type: "PURCHASE" | "TPN";
    number: string;
    supplier: {
      id: string;
      name: string | null;
      email: string;
      company: string | null;
    } | null;
  };
  warehouse?: {
    name: string;
  } | null;
  createdAt: Date;
  updatedAt: Date;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface GRNsListClientProps {
  initialGRNs: GRN[];
  initialPagination: Pagination;
  initialSearch: string;
  isTrash?: boolean;
  userId?: string;
  permissions?: {
    view: boolean;
    edit: boolean;
    moveToTrash: boolean;
    deletePermanently: boolean;
  };
  warehouses: Array<{ id: string; name: string; code: string }>;
  selectedWarehouseId: string;
  startDate: string;
  endDate: string;
  canChangeWarehouse: boolean;
}

const STATUS_LABELS: Record<GRNStatus, string> = {
  DRAFT: "Draft",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

export default function GRNsListClient({
  initialGRNs = [],
  initialPagination,
  initialSearch,
  isTrash = false,
  userId: providedUserId,
  permissions,
  warehouses = [],
  selectedWarehouseId,
  startDate,
  endDate,
  canChangeWarehouse,
}: GRNsListClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(initialSearch);
  const [deleteGRNId, setDeleteGRNId] = useState<string | null>(null);
  const [restoreGRNId, setRestoreGRNId] = useState<string | null>(null);
  const [selectedGRNs, setSelectedGRNs] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const [warehouseId, setWarehouseId] = useState(selectedWarehouseId);
  const [startDateVal, setStartDateVal] = useState(startDate);
  const [endDateVal, setEndDateVal] = useState(endDate);

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
    const tab = searchParams.get("tab") || "all";
    if (tab) {
      params.set("tab", tab);
    }
    router.push(`/dashboard/procurements/grn?${params.toString()}`);
  };

  const handleLimitChange = (newLimit: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("limit", newLimit.toString());
    params.set("page", "1");
    const tab = searchParams.get("tab") || "all";
    if (tab) {
      params.set("tab", tab);
    }
    router.push(`/dashboard/procurements/grn?${params.toString()}`);
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

  const updateFilters = (newParams: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", "1");
    
    Object.entries(newParams).forEach(([key, value]) => {
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    });

    const tab = searchParams.get("tab") || "all";
    params.set("tab", tab);
    
    router.push(`/dashboard/procurements/grn?${params.toString()}`);
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
    router.push(`/dashboard/procurements/grn?${params.toString()}`);
  };

  const handleDelete = async () => {
    if (!deleteGRNId) return;

    startTransition(async () => {
      const result = await deleteGRN(deleteGRNId);
      if (result.success) {
        setDeleteGRNId(null);
        toast({
          title: "Success",
          description: "GRN moved to trash",
        });
        router.refresh();
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to delete GRN",
          variant: "destructive",
        });
      }
    });
  };

  const handleRestore = async () => {
    if (!restoreGRNId) return;

    startTransition(async () => {
      const result = await bulkUpdateGRNStatus([restoreGRNId], "restore");
      if (result.success) {
        setRestoreGRNId(null);
        toast({
          title: "Success",
          description: "GRN restored successfully",
        });
        router.refresh();
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to restore GRN",
          variant: "destructive",
        });
      }
    });
  };

  const handleSelectGRN = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedGRNs);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedGRNs(newSelected);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedGRNs(new Set(initialGRNs.map((grn) => grn.id)));
    } else {
      setSelectedGRNs(new Set());
    }
  };

  const handleBulkAction = async (action: "trash" | "restore" | "delete-permanently") => {
    if (selectedGRNs.size === 0) {
      toast({
        title: "No selection",
        description: "Please select at least one GRN",
        variant: "destructive",
      });
      return;
    }

    const grnIds = Array.from(selectedGRNs);

    startTransition(async () => {
      let result;

      if (action === "trash") {
        result = await bulkUpdateGRNStatus(grnIds, "trash");
      } else if (action === "restore") {
        result = await bulkUpdateGRNStatus(grnIds, "restore");
      } else {
        result = await deleteGRNsPermanently(grnIds);
      }

      if (result.success) {
        setSelectedGRNs(new Set());
        toast({
          title: "Success",
          description: "Bulk action completed successfully",
        });
        router.refresh();
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to perform bulk action",
          variant: "destructive",
        });
      }
    });
  };

  const allSelected =
    initialGRNs.length > 0 && selectedGRNs.size === initialGRNs.length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative flex-1 min-w-[240px] max-w-sm">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by number or supplier..."
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

          {/* Warehouse Filter */}
          {!isTrash && (
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
          )}

          {/* Date Range Filters */}
          {!isTrash && (
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
          )}
        </div>

        <div className="flex items-center gap-2">
          {selectedGRNs.size > 0 && (
            <span className="text-sm text-muted-foreground whitespace-nowrap">
              {selectedGRNs.size} selected
            </span>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                disabled={isPending || selectedGRNs.size === 0}
              >
                <FiMoreVertical className="mr-2 h-4 w-4" />
                Bulk Actions
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {!isTrash ? (
                <DropdownMenuItem
                  onClick={() => handleBulkAction("trash")}
                  disabled={selectedGRNs.size === 0}
                >
                  <FiTrash2 className="mr-2 h-4 w-4" />
                  Move to Trash
                </DropdownMenuItem>
              ) : (
                <>
                  <DropdownMenuItem
                    onClick={() => handleBulkAction("restore")}
                    disabled={selectedGRNs.size === 0}
                  >
                    <FiRotateCw className="mr-2 h-4 w-4" />
                    Restore
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleBulkAction("delete-permanently")}
                    className="text-destructive"
                    disabled={selectedGRNs.size === 0}
                  >
                    <FiTrash2 className="mr-2 h-4 w-4" />
                    Delete Permanently
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={handleSelectAll}
                  aria-label="Select all"
                />
              </TableHead>
              <TableHead>GRN #</TableHead>
              <TableHead>Source Doc #</TableHead>
              <TableHead>Origin / Supplier</TableHead>
              <TableHead>Warehouse</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Items</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {initialGRNs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                  {isTrash ? "No trashed GRNs found" : "No GRNs found"}
                </TableCell>
              </TableRow>
            ) : (
              initialGRNs.map((grn) => {
                const isSelected = selectedGRNs.has(grn.id);

                return (
                  <TableRow key={grn.id} className={cn(isSelected && "bg-muted/50")}>
                    <TableCell>
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={(checked) =>
                          handleSelectGRN(grn.id, checked as boolean)
                        }
                        aria-label={`Select ${grn.grnNumber}`}
                      />
                    </TableCell>
                    <TableCell className="font-medium">
                      {grn.grnNumber}
                    </TableCell>
                    <TableCell className="text-muted-foreground font-mono">
                      {grn.source?.number || "-"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {grn.source?.type === "TPN" ? "TPN Transfer" : grn.source?.supplier?.name || grn.source?.supplier?.company || "Unknown Supplier"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {grn.warehouse?.name || "-"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={grn.status === "CANCELLED" ? "destructive" : "secondary"}>
                        {STATUS_LABELS[grn.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(grn.date), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {(grn as any).itemsCount ?? 0}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {grn.grandTotal.toFixed(2)}
                    </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {!isTrash && (
                            <>
                              <ProtectedAction
                                permissionKey="procurements.grn"
                                action="view"
                                href={`/dashboard/procurements/grn/${grn.id}/view`}
                                userId={providedUserId || undefined}
                                hasAccess={permissions?.view}
                              />
                            </>
                          )}
                          {isTrash && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setRestoreGRNId(grn.id);
                                handleRestore();
                              }}
                              disabled={isPending}
                            >
                              <FiRotateCw className="h-4 w-4" />
                            </Button>
                          )}
                          {grn.status !== "COMPLETED" && (
                            <ProtectedAction
                              permissionKey="procurements.grn"
                              action={isTrash ? "delete-permanently" : "move-to-trash"}
                              onClick={() => setDeleteGRNId(grn.id)}
                              userId={providedUserId || undefined}
                              hasAccess={isTrash ? permissions?.deletePermanently : permissions?.moveToTrash}
                              buttonProps={{
                                disabled: isPending,
                                className: "text-destructive hover:text-destructive",
                                title: isTrash ? "Delete permanently" : "Move to trash",
                              }}
                            />
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

      {(initialPagination.totalPages > 1 || initialPagination.total > 0) && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="text-sm text-muted-foreground">
              Showing {((initialPagination.page - 1) * initialPagination.limit) + 1} to{" "}
              {Math.min(initialPagination.page * initialPagination.limit, initialPagination.total)} of{" "}
              {initialPagination.total} GRNs
            </div>
            {renderLimitSelector()}
          </div>
          {renderPaginationButtons()}
        </div>
      )}

      <AlertDialog open={!!deleteGRNId} onOpenChange={() => setDeleteGRNId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isTrash ? "Delete GRN Permanently" : "Move GRN to Trash"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isTrash
                ? "This action cannot be undone. This will permanently delete the GRN."
                : "This will move the GRN to trash. You can restore it later from the Trash tab."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (isTrash && deleteGRNId) {
                  const result = await deleteGRNsPermanently([deleteGRNId]);
                  if (result.success) {
                    setDeleteGRNId(null);
                    toast({
                      title: "Success",
                      description: "GRN deleted permanently",
                    });
                    router.refresh();
                  } else {
                    toast({
                      title: "Error",
                      description: result.error || "Failed to delete GRN",
                      variant: "destructive",
                    });
                  }
                } else {
                  handleDelete();
                }
              }}
              disabled={isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isPending ? (isTrash ? "Deleting..." : "Moving...") : isTrash ? "Delete Permanently" : "Move to Trash"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

interface GRNsHeaderActionsProps {
  canCreate: boolean;
  grns: any[];
}

export function GRNsHeaderActions({
  canCreate,
  grns,
}: GRNsHeaderActionsProps) {
  const { toast } = useToast();

  const handleExportCSV = () => {
    if (!grns || grns.length === 0) {
      toast({
        title: "No data",
        description: "There are no GRNs to export",
        variant: "destructive",
      });
      return;
    }

    const csvData = grns.map((grn) => ({
      "GRN Number": grn.grnNumber,
      "Source Doc #": grn.source?.number || "-",
      "Source Type": grn.source?.type || "-",
      "Origin / Supplier": grn.source?.type === "TPN" ? "TPN Transfer" : grn.source?.supplier?.name || grn.source?.supplier?.company || "Unknown Supplier",
      "Warehouse": grn.warehouse?.name || "-",
      "Status": STATUS_LABELS[grn.status as GRNStatus] || grn.status,
      "Date": format(new Date(grn.date), "yyyy-MM-dd"),
      "Total (BDT)": grn.grandTotal.toFixed(2),
    }));

    exportToCSV(csvData, { filename: `grn-report-${format(new Date(), "yyyy-MM-dd")}.csv` });
  };

  const handleExportPDF = () => {
    if (!grns || grns.length === 0) {
      toast({
        title: "No data",
        description: "There are no GRNs to export",
        variant: "destructive",
      });
      return;
    }

    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text("Goods Receipt Notes (GRN) Report", 14, 22);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated on: ${format(new Date(), "yyyy-MM-dd HH:mm")}`, 14, 30);
    
    const tableData = grns.map((grn) => [
      grn.grnNumber,
      grn.source?.number || "-",
      grn.source?.type === "TPN" ? "TPN Transfer" : grn.source?.supplier?.name || grn.source?.supplier?.company || "Unknown Supplier",
      grn.warehouse?.name || "-",
      STATUS_LABELS[grn.status as GRNStatus] || grn.status,
      format(new Date(grn.date), "yyyy-MM-dd"),
      `BDT ${grn.grandTotal.toFixed(2)}`
    ]);
    
    autoTable(doc, {
      startY: 35,
      head: [["GRN #", "Source Doc #", "Origin / Supplier", "Warehouse", "Status", "Date", "Total"]],
      body: tableData,
      theme: "striped",
      headStyles: { fillColor: [79, 70, 229] }, // indigo-600 color
    });
    
    doc.save(`grn-report-${format(new Date(), "yyyy-MM-dd")}.pdf`);
  };

  return (
    <div className="flex items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline">
            <FiDownload className="mr-2 h-4 w-4" />
            Export
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={handleExportCSV}>
            Export to CSV
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleExportPDF}>
            Export to PDF
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {canCreate && (
        <Button asChild>
          <Link href="/dashboard/procurements/grn/add">
            <FiPlus className="mr-2 h-4 w-4" />
            Add GRN
          </Link>
        </Button>
      )}
    </div>
  );
}
