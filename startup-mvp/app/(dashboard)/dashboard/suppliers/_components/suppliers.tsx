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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import Link from "next/link";
import { FiSearch, FiEdit, FiTrash2, FiX, FiCircle, FiCheck, FiMoreVertical, FiEye, FiRotateCw, FiBook } from "react-icons/fi";
import { deleteSupplier, bulkUpdateSupplierStatus, deleteSuppliersPermanently } from "../_actions/supplier.action";
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

interface Supplier {
  id: string;
  name: string | null;
  supplierCode: string | null;
  email: string;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  country: string | null;
  company: string | null;
  image: string | null;
  status: string;
  warehouseId?: string | null;
  warehouse?: {
    id: string;
    name: string;
    code: string;
  } | null;
  createdBy: string;
  dueAmount: number;
  createdByUser: {
    id: string;
    name: string | null;
    email: string;
  };
  chartOfAccount: {
    id: string;
    code: string;
    name: string;
    type: string;
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

interface SuppliersListClientProps {
  initialSuppliers: Supplier[];
  initialPagination: Pagination;
  initialSearch: string;
  initialWarehouse?: string;
  warehouses?: Array<{ id: string; name: string; code: string }>;
  isTrash?: boolean;
  userId?: string;
  permissions?: {
    view: boolean;
    edit: boolean;
    moveToTrash: boolean;
    deletePermanently: boolean;
    viewLedger?: boolean;
  };
}

export default function SuppliersListClient({
  initialSuppliers = [],
  initialPagination,
  initialSearch,
  initialWarehouse = "all",
  warehouses = [],
  isTrash = false,
  userId: providedUserId,
  permissions,
}: SuppliersListClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(initialSearch);
  const [deleteSupplierId, setDeleteSupplierId] = useState<string | null>(null);
  const [restoreSupplierId, setRestoreSupplierId] = useState<string | null>(null);
  const [selectedSuppliers, setSelectedSuppliers] = useState<Set<string>>(new Set());
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
    const tab = searchParams.get("tab") || "all";
    if (tab) {
      params.set("tab", tab);
    }
    router.push(`/dashboard/suppliers?${params.toString()}`);
  };

  const handleLimitChange = (newLimit: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("limit", newLimit.toString());
    params.set("page", "1");
    const tab = searchParams.get("tab") || "all";
    if (tab) {
      params.set("tab", tab);
    }
    router.push(`/dashboard/suppliers?${params.toString()}`);
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
    router.push(`/dashboard/suppliers?${params.toString()}`);
  };

  const handleWarehouseFilter = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== "all") {
      params.set("warehouse", value);
    } else {
      params.delete("warehouse");
    }
    params.set("page", "1");
    const tab = searchParams.get("tab") || "all";
    if (tab) {
      params.set("tab", tab);
    }
    router.push(`/dashboard/suppliers?${params.toString()}`);
  };

  const handleDelete = async () => {
    if (!deleteSupplierId) return;

    startTransition(async () => {
      const result = await deleteSupplier(deleteSupplierId);
      if (result.success) {
        setDeleteSupplierId(null);
        toast({
          title: "Success",
          description: "Supplier moved to trash",
        });
        router.refresh();
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to delete supplier",
          variant: "destructive",
        });
      }
    });
  };

  const handleRestore = async () => {
    if (!restoreSupplierId) return;

    startTransition(async () => {
      const result = await bulkUpdateSupplierStatus([restoreSupplierId], "active");
      if (result.success) {
        setRestoreSupplierId(null);
        toast({
          title: "Success",
          description: "Supplier restored successfully",
        });
        router.refresh();
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to restore supplier",
          variant: "destructive",
        });
      }
    });
  };

  const handleSelectSupplier = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedSuppliers);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedSuppliers(newSelected);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedSuppliers(new Set(initialSuppliers.map((supplier) => supplier.id)));
    } else {
      setSelectedSuppliers(new Set());
    }
  };

  const handleBulkAction = async (action: string) => {
    if (selectedSuppliers.size === 0) {
      toast({
        title: "No selection",
        description: "Please select at least one supplier",
        variant: "destructive",
      });
      return;
    }

    const supplierIds = Array.from(selectedSuppliers);

    startTransition(async () => {
      let result;
      
      if (action === "trash") {
        result = await bulkUpdateSupplierStatus(supplierIds, "trash");
      } else if (action === "active") {
        result = await bulkUpdateSupplierStatus(supplierIds, "active");
      } else if (action === "inactive") {
        result = await bulkUpdateSupplierStatus(supplierIds, "inactive");
      } else if (action === "restore") {
        result = await bulkUpdateSupplierStatus(supplierIds, "active");
      } else if (action === "delete-permanently") {
        result = await deleteSuppliersPermanently(supplierIds);
      } else {
        return;
      }

      if (result.success) {
        setSelectedSuppliers(new Set());
        toast({
          title: "Success",
          description: `Bulk action completed successfully`,
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

  const getInitials = (name: string | null, email: string) => {
    if (name) {
      return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    return email[0].toUpperCase();
  };

  const allSelected = initialSuppliers.length > 0 && selectedSuppliers.size === initialSuppliers.length;

  return (
    <div className="space-y-4">
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          /* Reduce table padding and font size for clean print layout */
          .print-bordered th,
          .print-bordered td {
            padding: 4px 6px !important;
            font-size: 8.5pt !important;
          }
        }
      `}} />
      {/* Search and Bulk Actions */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 print:hidden">
        <div className="relative flex-1 max-w-sm">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, phone, or company..."
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
        <Select
          value={initialWarehouse}
          onValueChange={(value) => handleWarehouseFilter(value)}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Warehouses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Warehouses</SelectItem>
            {warehouses.map((wh) => (
              <SelectItem key={wh.id} value={wh.id}>
                {wh.name} ({wh.code})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Bulk Actions Dropdown */}
        <div className="flex items-center gap-2 ml-auto">
          {selectedSuppliers.size > 0 && (
            <span className="text-sm text-muted-foreground whitespace-nowrap">
              {selectedSuppliers.size} selected
            </span>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="outline" 
                size="sm" 
                disabled={isPending || selectedSuppliers.size === 0}
              >
                <FiMoreVertical className="mr-2 h-4 w-4" />
                Bulk Actions
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {!isTrash ? (
                <>
                  <DropdownMenuItem
                    onClick={() => handleBulkAction("trash")}
                    disabled={selectedSuppliers.size === 0}
                  >
                    <FiTrash2 className="mr-2 h-4 w-4" />
                    Move to Trash
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleBulkAction("active")}
                    disabled={selectedSuppliers.size === 0}
                  >
                    <FiCheck className="mr-2 h-4 w-4" />
                    Activate
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleBulkAction("inactive")}
                    disabled={selectedSuppliers.size === 0}
                  >
                    <FiCircle className="mr-2 h-4 w-4" />
                    Deactivate
                  </DropdownMenuItem>
                </>
              ) : (
                <>
                  <DropdownMenuItem
                    onClick={() => handleBulkAction("restore")}
                    disabled={selectedSuppliers.size === 0}
                  >
                    <FiCheck className="mr-2 h-4 w-4" />
                    Restore
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleBulkAction("delete-permanently")}
                    className="text-destructive"
                    disabled={selectedSuppliers.size === 0}
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

      {/* Table */}
      <div className="border rounded-lg">
        <Table className="print-bordered">
          <TableHeader>
            <TableRow>
              <TableHead className="w-12 print:hidden">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={handleSelectAll}
                  aria-label="Select all"
                />
              </TableHead>
              <TableHead className="print:w-[12%] whitespace-nowrap">Supplier Code</TableHead>
              <TableHead className="print:w-[18%] whitespace-nowrap">Supplier</TableHead>
              <TableHead className="print:w-[22%]">Email</TableHead>
              <TableHead className="print:w-[15%] whitespace-nowrap">Phone</TableHead>
              <TableHead className="print:w-[18%]">Company</TableHead>
              <TableHead className="print:hidden">Warehouse</TableHead>
              <TableHead className="print:hidden">Status</TableHead>
              <TableHead className="text-right print:w-[15%] whitespace-nowrap">Due</TableHead>
              <TableHead className="text-right print:hidden">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {initialSuppliers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                  {isTrash ? "No trashed suppliers found" : "No suppliers found"}
                </TableCell>
              </TableRow>
            ) : (
              initialSuppliers.map((supplier) => {
                const isSelected = selectedSuppliers.has(supplier.id);
                const supplierStatus = supplier.status || "active";
                
                return (
                  <TableRow key={supplier.id} className={cn(isSelected && "bg-muted/50")}>
                    <TableCell className="print:hidden">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={(checked) => handleSelectSupplier(supplier.id, checked as boolean)}
                        aria-label={`Select ${supplier.name || supplier.email}`}
                      />
                    </TableCell>
                    <TableCell className="text-muted-foreground print:text-black whitespace-nowrap">
                      {supplier.supplierCode || "-"}
                    </TableCell>
                    <TableCell className="print:whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8 print:hidden">
                          <AvatarImage src={supplier.image || undefined} alt={supplier.name || supplier.email} />
                          <AvatarFallback>{getInitials(supplier.name, supplier.email)}</AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{supplier.name || "No name"}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground print:text-black">{supplier.email}</TableCell>
                    <TableCell className="text-muted-foreground print:text-black whitespace-nowrap">{supplier.phone || "-"}</TableCell>
                    <TableCell className="text-muted-foreground print:text-black">{supplier.company || "-"}</TableCell>
                    <TableCell className="print:hidden">
                      {supplier.warehouse ? (
                        <Badge variant="outline" className="text-xs">
                          {supplier.warehouse.name}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-xs">-</span>
                      )}
                    </TableCell>
                    <TableCell className="print:hidden">
                      {supplierStatus === "trash" ? (
                        <Badge variant="destructive">Trash</Badge>
                      ) : supplierStatus === "inactive" ? (
                        <Badge variant="secondary">Inactive</Badge>
                      ) : (
                        <Badge variant="default">Active</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap print:text-black print:font-bold">
                      <span
                        className={cn(
                          (supplier.dueAmount ?? 0) > 0
                            ? "font-semibold text-amber-600 print:text-black"
                            : "text-muted-foreground print:text-black"
                        )}
                      >
                        <span className="print:hidden">৳</span>
                        {(supplier.dueAmount ?? 0).toLocaleString("en-US", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                    </TableCell>
                    <TableCell className="text-right print:hidden">
                      <div className="flex items-center justify-end gap-2">
                        {!isTrash && (
                          <>
                            <ProtectedAction
                              permissionKey="peoples.suppliers"
                              action="ledger"
                              href={`/dashboard/suppliers/ledger?id=${supplier.id}`}
                              userId={providedUserId || undefined}
                              hasAccess={permissions?.viewLedger}
                            />
                            <ProtectedAction
                              permissionKey="peoples.suppliers"
                              action="edit"
                              href={`/dashboard/suppliers/${supplier.id}`}
                              userId={providedUserId || undefined}
                              hasAccess={permissions?.edit}
                            />
                            <ProtectedAction
                              permissionKey="peoples.suppliers"
                              action="view"
                              href={`/dashboard/suppliers/details?id=${supplier.id}`}
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
                              setRestoreSupplierId(supplier.id);
                              handleRestore();
                            }}
                            disabled={isPending}
                          >
                            <FiRotateCw className="h-4 w-4" />
                          </Button>
                        )}
                        <ProtectedAction
                          permissionKey="peoples.suppliers"
                          action={isTrash ? "delete-permanently" : "move-to-trash"}
                          onClick={() => setDeleteSupplierId(supplier.id)}
                          userId={providedUserId || undefined}
                          hasAccess={isTrash ? permissions?.deletePermanently : permissions?.moveToTrash}
                          buttonProps={{
                            disabled: isPending,
                            className: "text-destructive hover:text-destructive",
                            title: isTrash ? "Delete permanently" : "Move to trash",
                          }}
                        />
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
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4 print:hidden">
          <div className="flex flex-wrap items-center gap-4">
            <div className="text-sm text-muted-foreground">
              Showing {((initialPagination.page - 1) * initialPagination.limit) + 1} to{" "}
              {Math.min(initialPagination.page * initialPagination.limit, initialPagination.total)} of{" "}
              {initialPagination.total} suppliers
            </div>
            {renderLimitSelector()}
          </div>
          {renderPaginationButtons()}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteSupplierId} onOpenChange={() => setDeleteSupplierId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isTrash ? "Delete Supplier Permanently" : "Move Supplier to Trash"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isTrash
                ? "This action cannot be undone. This will permanently delete the supplier and all associated data."
                : "This will move the supplier to trash. You can restore it later from the Trash tab."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (isTrash && deleteSupplierId) {
                  const result = await deleteSuppliersPermanently([deleteSupplierId]);
                  if (result.success) {
                    setDeleteSupplierId(null);
                    toast({
                      title: "Success",
                      description: "Supplier deleted permanently",
                    });
                    router.refresh();
                  } else {
                    toast({
                      title: "Error",
                      description: result.error || "Failed to delete supplier",
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

