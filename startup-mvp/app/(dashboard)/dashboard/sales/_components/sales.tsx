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
import { Label } from "@/components/ui/label";
import {
  FiSearch,
  FiTrash2,
  FiX,
  FiMoreVertical,
  FiRotateCw,
  FiCopy,
} from "react-icons/fi";
import {
  deleteSale,
  deleteSalesPermanently,
  bulkUpdateSaleStatus,
} from "../_actions/sale.action";
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
import { toast as sonnerToast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import type { SaleStatus, OrderType } from "@prisma/client";

interface Sale {
  id: string;
  saleNumber: string;
  date: Date;
  status: SaleStatus;
  orderType: OrderType;
  grandTotal: number;
  isTrash: boolean;
  client: {
    id: string;
    name: string | null;
    email: string;
  };
  warehouse?: {
    id: string;
    name: string;
  };
  createdByUser?: {
    id: string;
    name: string;
  };
  salesAssistant?: {
    id: string;
    name: string | null;
  } | null;
  createdAt: Date;
  updatedAt: Date;
  _count?: {
    items: number;
  };
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface SalesListClientProps {
  initialSales: Sale[];
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
}

const STATUS_LABELS: Record<SaleStatus, string> = {
  DRAFT: "Draft",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  RETURN: "Return",
};

export default function SalesListClient({
  initialSales = [],
  initialPagination,
  initialSearch,
  isTrash = false,
  userId: providedUserId,
  permissions,
  warehouses = [],
  billers = [],
  salesmen = [],
  isAdmin = false,
  userWarehouseId,
  filters,
}: SalesListClientProps & {
  warehouses?: { id: string; name: string }[];
  billers?: { id: string; name: string; email: string }[];
  salesmen?: { id: string; name: string; email: string | null }[];
  isAdmin?: boolean;
  userWarehouseId?: string;
  filters?: {
    billerId?: string;
    warehouseId?: string;
    type?: string;
    startDate?: string | null;
    endDate?: string | null;
    salesAssistantId?: string;
  };
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(initialSearch);
  const [deleteSaleId, setDeleteSaleId] = useState<string | null>(null);
  const [selectedSales, setSelectedSales] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const [billerId, setBillerId] = useState(filters?.billerId || "all");
  const [warehouseId, setWarehouseId] = useState(filters?.warehouseId || "all");
  const [type, setType] = useState(filters?.type || "all");
  const [salesAssistantId, setSalesAssistantId] = useState(filters?.salesAssistantId || "all");
  
  const formatForInput = (isoString?: string | null) => {
    if (!isoString) return "";
    try { 
      const d = new Date(isoString);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    } catch(e) { return ""; }
  };

  const [startDate, setStartDate] = useState(formatForInput(filters?.startDate));
  const [endDate, setEndDate] = useState(formatForInput(filters?.endDate));

  const applyFilters = (updates: any = {}) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", "1");
    
    const newBiller = updates.billerId !== undefined ? updates.billerId : billerId;
    const newWarehouse = updates.warehouseId !== undefined ? updates.warehouseId : warehouseId;
    const newType = updates.type !== undefined ? updates.type : type;
    const newStart = updates.startDate !== undefined ? updates.startDate : startDate;
    const newEnd = updates.endDate !== undefined ? updates.endDate : endDate;
    const newSalesAssistant = updates.salesAssistantId !== undefined ? updates.salesAssistantId : salesAssistantId;

    if (newBiller && newBiller !== "all") params.set("billerId", newBiller);
    else params.delete("billerId");

    if (newWarehouse && newWarehouse !== "all") params.set("warehouseId", newWarehouse);
    else params.delete("warehouseId");

    if (newType && newType !== "all") params.set("type", newType);
    else params.delete("type");

    if (newSalesAssistant && newSalesAssistant !== "all") params.set("salesAssistantId", newSalesAssistant);
    else params.delete("salesAssistantId");

    if (newStart) {
       const [year, month, day] = newStart.split('-');
       const d = new Date(Number(year), Number(month) - 1, Number(day), 0, 0, 0);
       params.set("startDate", d.toISOString());
    } else params.delete("startDate");

    if (newEnd) {
       const [year, month, day] = newEnd.split('-');
       const d = new Date(Number(year), Number(month) - 1, Number(day), 23, 59, 59, 999);
       params.set("endDate", d.toISOString());
    } else params.delete("endDate");

    router.push(`/dashboard/sales?${params.toString()}`);
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
    router.push(`/dashboard/sales?${params.toString()}`);
  };

  const handleDelete = async () => {
    if (!deleteSaleId) return;

    startTransition(async () => {
      const result = await deleteSale(deleteSaleId);
      if (result.success) {
        setDeleteSaleId(null);
        toast({
          title: "Success",
          description: "Sale moved to trash",
        });
        router.refresh();
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to delete sale",
          variant: "destructive",
        });
      }
    });
  };

  const handleSelectSale = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedSales);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedSales(newSelected);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedSales(new Set(initialSales.map((sale) => sale.id)));
    } else {
      setSelectedSales(new Set());
    }
  };

  const handleBulkAction = async (action: SaleStatus | "trash" | "restore" | "delete-permanently") => {
    if (selectedSales.size === 0) {
      toast({
        title: "No selection",
        description: "Please select at least one sale",
        variant: "destructive",
      });
      return;
    }

    const saleIds = Array.from(selectedSales);

    startTransition(async () => {
      let result;
      if (action === "delete-permanently") {
        result = await deleteSalesPermanently(saleIds);
      } else {
        result = await bulkUpdateSaleStatus(saleIds, action);
      }

      if (result.success) {
        setSelectedSales(new Set());
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
    initialSales.length > 0 && selectedSales.size === initialSales.length;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 mb-6 bg-muted/20 p-4 rounded-lg border border-border/50">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by number or client..."
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

        <div className="flex items-center gap-2">
          {selectedSales.size > 0 && (
            <span className="text-sm text-muted-foreground whitespace-nowrap">
              {selectedSales.size} selected
            </span>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                disabled={isPending || selectedSales.size === 0}
              >
                <FiMoreVertical className="mr-2 h-4 w-4" />
                Bulk Actions
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {!isTrash ? (
                <>
                  <DropdownMenuItem
                    onClick={() => handleBulkAction("COMPLETED")}
                    disabled={selectedSales.size === 0}
                  >
                    <FiRotateCw className="mr-2 h-4 w-4" />
                    Mark as Completed
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleBulkAction("CANCELLED")}
                    disabled={selectedSales.size === 0}
                  >
                    <FiX className="mr-2 h-4 w-4" />
                    Cancel Sales
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleBulkAction("trash")}
                    className="text-destructive"
                    disabled={selectedSales.size === 0}
                  >
                    <FiTrash2 className="mr-2 h-4 w-4" />
                    Move to Trash
                  </DropdownMenuItem>
                </>
              ) : (
                <>
                  <DropdownMenuItem
                    onClick={() => handleBulkAction("restore")}
                    disabled={selectedSales.size === 0}
                  >
                    <FiRotateCw className="mr-2 h-4 w-4" />
                    Restore
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleBulkAction("delete-permanently")}
                    className="text-destructive"
                    disabled={selectedSales.size === 0}
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

      {/* Filters Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground">Biller</Label>
          <Select value={billerId} onValueChange={(val) => { setBillerId(val); applyFilters({ billerId: val }); }}>
            <SelectTrigger className="h-9">
              <SelectValue placeholder="All Billers" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Billers</SelectItem>
              {billers.map((b) => (
                <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground">Warehouse</Label>
          <Select 
            value={warehouseId} 
            onValueChange={(val) => { setWarehouseId(val); applyFilters({ warehouseId: val }); }}
            disabled={!isAdmin}
          >
            <SelectTrigger className="h-9">
              <SelectValue placeholder="All Warehouses" />
            </SelectTrigger>
            <SelectContent>
              {isAdmin && <SelectItem value="all">All Warehouses</SelectItem>}
              {!isAdmin && (!userWarehouseId || userWarehouseId === "all") && <SelectItem value="all">All Warehouses</SelectItem>}
              {warehouses.map((w) => (
                <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground">Order Type</Label>
          <Select value={type} onValueChange={(val) => { setType(val); applyFilters({ type: val }); }}>
            <SelectTrigger className="h-9">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="RETAIL">Retail</SelectItem>
              <SelectItem value="WHOLESALE">Wholesale</SelectItem>
              <SelectItem value="READY_PRODUCT">Ready Product</SelectItem>
              <SelectItem value="RETURN">Return</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground">Sales Assistant</Label>
          <Select value={salesAssistantId} onValueChange={(val) => { setSalesAssistantId(val); applyFilters({ salesAssistantId: val }); }}>
            <SelectTrigger className="h-9">
              <SelectValue placeholder="All Assistants" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Assistants</SelectItem>
              {salesmen.map((s) => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground">Start Date</Label>
          <Input 
            type="date" 
            className="h-9" 
            value={startDate} 
            onChange={(e) => {
              setStartDate(e.target.value);
              applyFilters({ startDate: e.target.value });
            }} 
          />
        </div>

        <div className="space-y-1.5 flex items-end gap-2">
          <div className="flex-1 space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">End Date</Label>
            <Input 
              type="date" 
              className="h-9" 
              value={endDate} 
              onChange={(e) => {
                setEndDate(e.target.value);
                applyFilters({ endDate: e.target.value });
              }} 
            />
          </div>
          <Button 
            variant="outline" 
            className="h-9 px-3 shrink-0" 
            onClick={() => {
              setBillerId("all");
              const resetWarehouseId = isAdmin ? "all" : (userWarehouseId || "all");
              setWarehouseId(resetWarehouseId);
              setType("all");
              setStartDate("");
              setEndDate("");
              setSalesAssistantId("all");
              applyFilters({ billerId: "all", warehouseId: resetWarehouseId, type: "all", startDate: "", endDate: "", salesAssistantId: "all" });
            }}
            title="Clear Filters"
          >
            <FiX className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={(checked) => handleSelectAll(!!checked)}
                  aria-label="Select all"
                />
              </TableHead>
              <TableHead>Sale #</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Warehouse</TableHead>
              <TableHead>Biller</TableHead>
              <TableHead>Assistant</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Items</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {initialSales.length === 0 ? (
              <TableRow>
                <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                  {isTrash ? "No trashed sales found" : "No sales found"}
                </TableCell>
              </TableRow>
            ) : (
              initialSales.map((sale) => {
                const isSelected = selectedSales.has(sale.id);

                return (
                  <TableRow key={sale.id} className={cn(isSelected && "bg-muted/50")}>
                    <TableCell>
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={(checked) =>
                          handleSelectSale(sale.id, checked as boolean)
                        }
                        aria-label={`Select ${sale.saleNumber}`}
                      />
                    </TableCell>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {sale.saleNumber}
                        <button 
                          className="text-muted-foreground hover:text-foreground transition-colors"
                          onClick={async (e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            try {
                              await navigator.clipboard.writeText(sale.saleNumber);
                              sonnerToast.success("Copied successfully", { description: sale.saleNumber });
                            } catch (err) {
                              sonnerToast.error("Failed to copy");
                            }
                          }}
                          title="Copy Invoice Number"
                        >
                          <FiCopy className="w-4 h-4" />
                        </button>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {sale.client.name || sale.client.email}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          sale.status === "CANCELLED"
                            ? "destructive"
                            : sale.status === "COMPLETED"
                            ? "default"
                            : "secondary"
                        }
                      >
                        {STATUS_LABELS[sale.status]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          sale.orderType === "RETURN"
                            ? "destructive"
                            : sale.orderType === "WHOLESALE"
                            ? "outline"
                            : "secondary"
                        }
                        className={cn(
                          sale.orderType === "WHOLESALE" && "border-amber-500/30 text-amber-600 bg-amber-500/5",
                          sale.orderType === "RETAIL" && "border-blue-500/30 text-blue-600 bg-blue-500/5"
                        )}
                      >
                        {sale.orderType}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {sale.warehouse?.name || "N/A"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {sale.createdByUser?.name || "System"}
                    </TableCell>
                    <TableCell className="text-muted-foreground font-medium">
                      {sale.salesAssistant?.name || "-"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(sale.date), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell className="text-right font-mono text-muted-foreground">
                      {sale._count?.items ?? 0}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      ৳{sale.grandTotal.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {!isTrash && (
                          <>
                            {sale.status === "DRAFT" && (
                              <ProtectedAction
                                permissionKey="sales.sales"
                                action="edit"
                                href={`/dashboard/sales/${sale.id}/edit`}
                                userId={providedUserId || undefined}
                                hasAccess={permissions?.edit}
                              />
                            )}
                            <ProtectedAction
                              permissionKey="sales.sales"
                              action="view"
                              href={`/dashboard/sales/${sale.id}/view`}
                              userId={providedUserId || undefined}
                              hasAccess={permissions?.view}
                            />
                          </>
                        )}
                        <ProtectedAction
                          permissionKey="sales.sales"
                          action={isTrash ? "delete-permanently" : "move-to-trash"}
                          onClick={() => setDeleteSaleId(sale.id)}
                          userId={providedUserId || undefined}
                          hasAccess={isTrash ? permissions?.deletePermanently : permissions?.moveToTrash}
                          buttonProps={{
                            disabled: isPending || sale.status !== "DRAFT",
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

      {initialPagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Showing {((initialPagination.page - 1) * initialPagination.limit) + 1} to{" "}
            {Math.min(initialPagination.page * initialPagination.limit, initialPagination.total)} of{" "}
            {initialPagination.total} sales
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={initialPagination.page === 1}
              onClick={() => {
                const params = new URLSearchParams(searchParams.toString());
                params.set("page", String(initialPagination.page - 1));
                const tab = searchParams.get("tab") || "all";
                if (tab) {
                  params.set("tab", tab);
                }
                router.push(`/dashboard/sales?${params.toString()}`);
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
                const tab = searchParams.get("tab") || "all";
                if (tab) {
                  params.set("tab", tab);
                }
                router.push(`/dashboard/sales?${params.toString()}`);
              }}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      <AlertDialog open={!!deleteSaleId} onOpenChange={() => setDeleteSaleId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isTrash ? "Delete Sale Permanently" : "Move Sale to Trash"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isTrash
                ? "This action cannot be undone. This will permanently delete the sale."
                : "This will move the sale to trash. You can restore it later from the Trash tab."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (isTrash && deleteSaleId) {
                  const result = await deleteSalesPermanently([deleteSaleId]);
                  if (result.success) {
                    setDeleteSaleId(null);
                    toast({
                      title: "Success",
                      description: "Sale deleted permanently",
                    });
                    router.refresh();
                  } else {
                    toast({
                      title: "Error",
                      description: result.error || "Failed to delete sale",
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
