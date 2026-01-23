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
  FiSearch,
  FiTrash2,
  FiX,
  FiMoreVertical,
  FiRotateCw,
} from "react-icons/fi";
import {
  deleteSale,
  deleteSalesPermanently,
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
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import type { SaleStatus } from "@prisma/client";

interface Sale {
  id: string;
  saleNumber: string;
  date: Date;
  status: SaleStatus;
  grandTotal: number;
  isTrash: boolean;
  client: {
    id: string;
    name: string | null;
    email: string;
  };
  createdAt: Date;
  updatedAt: Date;
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
};

export default function SalesListClient({
  initialSales = [],
  initialPagination,
  initialSearch,
  isTrash = false,
  userId: providedUserId,
  permissions,
}: SalesListClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(initialSearch);
  const [deleteSaleId, setDeleteSaleId] = useState<string | null>(null);
  const [selectedSales, setSelectedSales] = useState<Set<string>>(new Set());
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

  const handleBulkAction = async (action: "delete-permanently") => {
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
      const result = await deleteSalesPermanently(saleIds);

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
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
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

        {isTrash && (
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
                <DropdownMenuItem
                  onClick={() => handleBulkAction("delete-permanently")}
                  className="text-destructive"
                  disabled={selectedSales.size === 0}
                >
                  <FiTrash2 className="mr-2 h-4 w-4" />
                  Delete Permanently
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              {isTrash && (
                <TableHead className="w-12">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={handleSelectAll}
                    aria-label="Select all"
                  />
                </TableHead>
              )}
              <TableHead>Sale #</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {initialSales.length === 0 ? (
              <TableRow>
                <TableCell colSpan={isTrash ? 7 : 6} className="text-center py-8 text-muted-foreground">
                  {isTrash ? "No trashed sales found" : "No sales found"}
                </TableCell>
              </TableRow>
            ) : (
              initialSales.map((sale) => {
                const isSelected = selectedSales.has(sale.id);

                return (
                  <TableRow key={sale.id} className={cn(isSelected && "bg-muted/50")}>
                    {isTrash && (
                      <TableCell>
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={(checked) =>
                            handleSelectSale(sale.id, checked as boolean)
                          }
                          aria-label={`Select ${sale.saleNumber}`}
                        />
                      </TableCell>
                    )}
                    <TableCell className="font-medium">
                      {sale.saleNumber}
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
                    <TableCell className="text-muted-foreground">
                      {format(new Date(sale.date), "MMM d, yyyy")}
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
