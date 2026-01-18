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
  deletePurchase,
  bulkUpdatePurchaseStatus,
  deletePurchasesPermanently,
} from "../_actions/purchase.action";
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
import type { PurchaseStatus } from "@prisma/client";

interface Purchase {
  id: string;
  purchaseNumber: string;
  date: Date;
  status: PurchaseStatus;
  grandTotal: number;
  isTrash: boolean;
  supplier: {
    id: string;
    name: string | null;
    email: string;
    company: string | null;
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

interface PurchasesListClientProps {
  initialPurchases: Purchase[];
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

const STATUS_LABELS: Record<PurchaseStatus, string> = {
  DRAFT: "Draft",
  APPROVED: "Approved",
  PARTIALLY_RECEIVED: "Partial",
  RECEIVED: "Received",
  CANCELLED: "Cancelled",
};

export default function PurchasesListClient({
  initialPurchases = [],
  initialPagination,
  initialSearch,
  isTrash = false,
  userId: providedUserId,
  permissions,
}: PurchasesListClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(initialSearch);
  const [deletePurchaseId, setDeletePurchaseId] = useState<string | null>(null);
  const [restorePurchaseId, setRestorePurchaseId] = useState<string | null>(null);
  const [selectedPurchases, setSelectedPurchases] = useState<Set<string>>(new Set());
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
    router.push(`/dashboard/purchases?${params.toString()}`);
  };

  const handleDelete = async () => {
    if (!deletePurchaseId) return;

    startTransition(async () => {
      const result = await deletePurchase(deletePurchaseId);
      if (result.success) {
        setDeletePurchaseId(null);
        toast({
          title: "Success",
          description: "Purchase moved to trash",
        });
        router.refresh();
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to delete purchase",
          variant: "destructive",
        });
      }
    });
  };

  const handleRestore = async () => {
    if (!restorePurchaseId) return;

    startTransition(async () => {
      const result = await bulkUpdatePurchaseStatus([restorePurchaseId], "restore");
      if (result.success) {
        setRestorePurchaseId(null);
        toast({
          title: "Success",
          description: "Purchase restored successfully",
        });
        router.refresh();
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to restore purchase",
          variant: "destructive",
        });
      }
    });
  };

  const handleSelectPurchase = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedPurchases);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedPurchases(newSelected);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedPurchases(new Set(initialPurchases.map((purchase) => purchase.id)));
    } else {
      setSelectedPurchases(new Set());
    }
  };

  const handleBulkAction = async (action: "trash" | "restore" | "delete-permanently") => {
    if (selectedPurchases.size === 0) {
      toast({
        title: "No selection",
        description: "Please select at least one purchase",
        variant: "destructive",
      });
      return;
    }

    const purchaseIds = Array.from(selectedPurchases);

    startTransition(async () => {
      let result;

      if (action === "trash") {
        result = await bulkUpdatePurchaseStatus(purchaseIds, "trash");
      } else if (action === "restore") {
        result = await bulkUpdatePurchaseStatus(purchaseIds, "restore");
      } else {
        result = await deletePurchasesPermanently(purchaseIds);
      }

      if (result.success) {
        setSelectedPurchases(new Set());
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
    initialPurchases.length > 0 && selectedPurchases.size === initialPurchases.length;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
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

        <div className="flex items-center gap-2">
          {selectedPurchases.size > 0 && (
            <span className="text-sm text-muted-foreground whitespace-nowrap">
              {selectedPurchases.size} selected
            </span>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                disabled={isPending || selectedPurchases.size === 0}
              >
                <FiMoreVertical className="mr-2 h-4 w-4" />
                Bulk Actions
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {!isTrash ? (
                <DropdownMenuItem
                  onClick={() => handleBulkAction("trash")}
                  disabled={selectedPurchases.size === 0}
                >
                  <FiTrash2 className="mr-2 h-4 w-4" />
                  Move to Trash
                </DropdownMenuItem>
              ) : (
                <>
                  <DropdownMenuItem
                    onClick={() => handleBulkAction("restore")}
                    disabled={selectedPurchases.size === 0}
                  >
                    <FiRotateCw className="mr-2 h-4 w-4" />
                    Restore
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleBulkAction("delete-permanently")}
                    className="text-destructive"
                    disabled={selectedPurchases.size === 0}
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
              <TableHead>Purchase #</TableHead>
              <TableHead>Supplier</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {initialPurchases.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  {isTrash ? "No trashed purchases found" : "No purchases found"}
                </TableCell>
              </TableRow>
            ) : (
              initialPurchases.map((purchase) => {
                const isSelected = selectedPurchases.has(purchase.id);

                return (
                  <TableRow key={purchase.id} className={cn(isSelected && "bg-muted/50")}>
                    <TableCell>
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={(checked) =>
                          handleSelectPurchase(purchase.id, checked as boolean)
                        }
                        aria-label={`Select ${purchase.purchaseNumber}`}
                      />
                    </TableCell>
                    <TableCell className="font-medium">
                      {purchase.purchaseNumber}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {purchase.supplier.name || purchase.supplier.email}
                    </TableCell>
                    <TableCell>
                      <Badge variant={purchase.status === "CANCELLED" ? "destructive" : "secondary"}>
                        {STATUS_LABELS[purchase.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(purchase.date), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {purchase.grandTotal.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {!isTrash && (
                          <>
                            <ProtectedAction
                              permissionKey="purchases.purchases"
                              action="edit"
                              href={`/dashboard/purchases/${purchase.id}`}
                              userId={providedUserId || undefined}
                              hasAccess={permissions?.edit}
                            />
                            <ProtectedAction
                              permissionKey="purchases.purchases"
                              action="view"
                              href={`/dashboard/purchases/details?id=${purchase.id}`}
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
                              setRestorePurchaseId(purchase.id);
                              handleRestore();
                            }}
                            disabled={isPending}
                          >
                            <FiRotateCw className="h-4 w-4" />
                          </Button>
                        )}
                        <ProtectedAction
                          permissionKey="purchases.purchases"
                          action={isTrash ? "delete-permanently" : "move-to-trash"}
                          onClick={() => setDeletePurchaseId(purchase.id)}
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

      {initialPagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Showing {((initialPagination.page - 1) * initialPagination.limit) + 1} to{" "}
            {Math.min(initialPagination.page * initialPagination.limit, initialPagination.total)} of{" "}
            {initialPagination.total} purchases
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
                router.push(`/dashboard/purchases?${params.toString()}`);
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
                router.push(`/dashboard/purchases?${params.toString()}`);
              }}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      <AlertDialog open={!!deletePurchaseId} onOpenChange={() => setDeletePurchaseId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isTrash ? "Delete Purchase Permanently" : "Move Purchase to Trash"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isTrash
                ? "This action cannot be undone. This will permanently delete the purchase."
                : "This will move the purchase to trash. You can restore it later from the Trash tab."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (isTrash && deletePurchaseId) {
                  const result = await deletePurchasesPermanently([deletePurchaseId]);
                  if (result.success) {
                    setDeletePurchaseId(null);
                    toast({
                      title: "Success",
                      description: "Purchase deleted permanently",
                    });
                    router.refresh();
                  } else {
                    toast({
                      title: "Error",
                      description: result.error || "Failed to delete purchase",
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


