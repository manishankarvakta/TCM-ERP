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
import Link from "next/link";
import { FiSearch, FiEdit, FiTrash2, FiX, FiCircle, FiCheck, FiMoreVertical, FiEye, FiRotateCw, FiList } from "react-icons/fi";
import { deleteBOM, bulkUpdateBOMStatus, deleteBOMPermanently } from "../_actions/bom.action";
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

interface BOM {
  id: string;
  code: string;
  name: string;
  description: string | null;
  itemId: string;
  quantityPerUnit: number;
  status: string;
  isTrash: boolean;
  createdAt: Date;
  updatedAt: Date;
  item: {
    id: string;
    name: string;
    code: string;
    unit: {
      symbol: string;
    };
  };
  creator: {
    id: string;
    name: string | null;
    email: string;
  };
  _count: {
    items: number;
  };
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface BOMsListClientProps {
  initialBOMs: BOM[];
  initialPagination: Pagination;
  initialSearch: string;
  initialStatus?: string;
  initialItemId?: string;
  finishedGoods?: Array<{ id: string; name: string; code: string }>;
  isTrash?: boolean;
}

export default function BOMsListClient({
  initialBOMs,
  initialPagination,
  initialSearch,
  initialStatus,
  initialItemId,
  finishedGoods = [],
  isTrash = false,
}: BOMsListClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(initialSearch);
  const [deleteBOMId, setDeleteBOMId] = useState<string | null>(null);
  const [restoreBOMId, setRestoreBOMId] = useState<string | null>(null);
  const [selectedBOMs, setSelectedBOMs] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<string | null>(null);
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
    if (initialItemId) {
      params.set("itemId", initialItemId);
    }
    router.push(`/dashboard/production/boms?${params.toString()}`);
  };

  const handleSelectBOM = (bomId: string, selected: boolean) => {
    setSelectedBOMs((prev) => {
      const newSet = new Set(prev);
      if (selected) {
        newSet.add(bomId);
      } else {
        newSet.delete(bomId);
      }
      return newSet;
    });
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedBOMs(new Set(initialBOMs.map((bom) => bom.id)));
    } else {
      setSelectedBOMs(new Set());
    }
  };

  const handleDelete = async () => {
    if (!deleteBOMId) return;

    startTransition(async () => {
      const result = await deleteBOM(deleteBOMId);
      if (result.success) {
        setDeleteBOMId(null);
        toast({
          title: "Success",
          description: "BOM moved to trash successfully",
        });
        router.refresh();
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to delete BOM",
          variant: "destructive",
        });
      }
    });
  };

  const handleRestore = async () => {
    if (!restoreBOMId) return;

    startTransition(async () => {
      const result = await bulkUpdateBOMStatus([restoreBOMId], "restore");
      if (result.success) {
        setRestoreBOMId(null);
        toast({
          title: "Success",
          description: "BOM restored successfully",
        });
        router.refresh();
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to restore BOM",
          variant: "destructive",
        });
      }
    });
  };

  const handleBulkAction = async () => {
    if (!bulkAction || selectedBOMs.size === 0) return;

    startTransition(async () => {
      const bomIds = Array.from(selectedBOMs);
      let result;

      if (bulkAction === "trash") {
        result = await bulkUpdateBOMStatus(bomIds, "trash");
      } else if (bulkAction === "restore") {
        result = await bulkUpdateBOMStatus(bomIds, "restore");
      } else if (bulkAction === "delete") {
        // For permanent delete, we need to handle individually
        let successCount = 0;
        let errorCount = 0;
        for (const bomId of bomIds) {
          const deleteResult = await deleteBOMPermanently(bomId);
          if (deleteResult.success) {
            successCount++;
          } else {
            errorCount++;
          }
        }
        if (successCount > 0) {
          toast({
            title: "Success",
            description: `${successCount} BOM(s) deleted permanently`,
          });
        }
        if (errorCount > 0) {
          toast({
            title: "Error",
            description: `Failed to delete ${errorCount} BOM(s)`,
            variant: "destructive",
          });
        }
        setBulkAction(null);
        setSelectedBOMs(new Set());
        router.refresh();
        return;
      } else {
        result = await bulkUpdateBOMStatus(bomIds, bulkAction as "active" | "inactive");
      }

      if (result.success) {
        setBulkAction(null);
        setSelectedBOMs(new Set());
        toast({
          title: "Success",
          description: "BOMs updated successfully",
        });
        router.refresh();
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to update BOMs",
          variant: "destructive",
        });
      }
    });
  };

  const handleStatusFilter = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value !== "all") {
      params.set("status", value);
    } else {
      params.delete("status");
    }
    params.set("page", "1");
    if (search) {
      params.set("search", search);
    }
    if (initialItemId) {
      params.set("itemId", initialItemId);
    }
    router.push(`/dashboard/production/boms?${params.toString()}`);
  };

  const handleItemFilter = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value !== "all") {
      params.set("itemId", value);
    } else {
      params.delete("itemId");
    }
    params.set("page", "1");
    if (search) {
      params.set("search", search);
    }
    if (initialStatus && initialStatus !== "all") {
      params.set("status", initialStatus);
    }
    router.push(`/dashboard/production/boms?${params.toString()}`);
  };

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, code, or item..."
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

        <Select value={initialStatus || "all"} onValueChange={handleStatusFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>

        <Select value={initialItemId || "all"} onValueChange={handleItemFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Ready Product" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Items</SelectItem>
            {finishedGoods.map((fg) => (
              <SelectItem key={fg.id} value={fg.id}>
                {fg.name} ({fg.code})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Bulk Actions */}
      {selectedBOMs.size > 0 && !isTrash && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            {selectedBOMs.size} selected
          </span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                Bulk Actions
                <FiMoreVertical className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => setBulkAction("active")}>
                Set Active
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setBulkAction("inactive")}>
                Set Inactive
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setBulkAction("trash")}>
                Move to Trash
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          {bulkAction && (
            <Button
              variant="default"
              size="sm"
              onClick={handleBulkAction}
              disabled={isPending}
            >
              Apply
            </Button>
          )}
        </div>
      )}

      {/* BOMs Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={selectedBOMs.size === initialBOMs.length && initialBOMs.length > 0}
                  onCheckedChange={handleSelectAll}
                />
              </TableHead>
              <TableHead>Code</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Ready Product</TableHead>
              <TableHead className="text-right">Qty/Unit</TableHead>
              <TableHead className="text-right">Items</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {initialBOMs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                  No BOMs found
                </TableCell>
              </TableRow>
            ) : (
              initialBOMs.map((bom) => (
                <TableRow key={bom.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedBOMs.has(bom.id)}
                      onCheckedChange={(checked) =>
                        handleSelectBOM(bom.id, checked === true)
                      }
                    />
                  </TableCell>
                  <TableCell className="font-mono text-sm">{bom.code}</TableCell>
                  <TableCell>
                    <div>
                      <Link
                        href={`/dashboard/production/boms/${bom.id}`}
                        className="font-medium hover:underline"
                      >
                        {bom.name}
                      </Link>
                      {bom.description && (
                        <p className="text-xs text-muted-foreground truncate max-w-xs">
                          {bom.description}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <Link
                        href={`/dashboard/master/items/${bom.item.id}`}
                        className="font-medium hover:underline"
                      >
                        {bom.item.name}
                      </Link>
                      <p className="text-xs text-muted-foreground font-mono">
                        {bom.item.code}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {bom.quantityPerUnit.toLocaleString("en-BD", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}{" "}
                    {bom.item.unit.symbol}
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge variant="secondary">{bom._count.items}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        bom.status === "active"
                          ? "default"
                          : bom.status === "inactive"
                          ? "secondary"
                          : "destructive"
                      }
                    >
                      {bom.status === "active" ? (
                        <FiCheck className="mr-1 h-3 w-3" />
                      ) : bom.status === "inactive" ? (
                        <FiCircle className="mr-1 h-3 w-3" />
                      ) : null}
                      {bom.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {format(new Date(bom.createdAt), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <FiMoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/dashboard/production/boms/${bom.id}`}>
                            <FiEye className="mr-2 h-4 w-4" />
                            View
                          </Link>
                        </DropdownMenuItem>
                        {!isTrash && (
                          <>
                            <DropdownMenuItem asChild>
                              <Link href={`/dashboard/production/boms/${bom.id}/edit`}>
                                <FiEdit className="mr-2 h-4 w-4" />
                                Edit
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => setDeleteBOMId(bom.id)}
                              className="text-destructive"
                            >
                              <FiTrash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </>
                        )}
                        {isTrash && (
                          <>
                            <DropdownMenuItem onClick={() => setRestoreBOMId(bom.id)}>
                              <FiRotateCw className="mr-2 h-4 w-4" />
                              Restore
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => setDeleteBOMId(bom.id)}
                              className="text-destructive"
                            >
                              <FiTrash2 className="mr-2 h-4 w-4" />
                              Delete Permanently
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

      {/* Pagination */}
      {initialPagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Showing {((initialPagination.page - 1) * initialPagination.limit) + 1} to{" "}
            {Math.min(initialPagination.page * initialPagination.limit, initialPagination.total)} of{" "}
            {initialPagination.total} BOMs
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const params = new URLSearchParams(searchParams.toString());
                params.set("page", String(Math.max(1, initialPagination.page - 1)));
                router.push(`/dashboard/production/boms?${params.toString()}`);
              }}
              disabled={initialPagination.page === 1 || isPending}
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
                router.push(`/dashboard/production/boms?${params.toString()}`);
              }}
              disabled={initialPagination.page === initialPagination.totalPages || isPending}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteBOMId} onOpenChange={() => setDeleteBOMId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete BOM</AlertDialogTitle>
            <AlertDialogDescription>
              {isTrash
                ? "This will permanently delete the BOM. This action cannot be undone."
                : "This will move the BOM to trash. You can restore it later."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={isTrash ? async () => {
                if (!deleteBOMId) return;
                startTransition(async () => {
                  const result = await deleteBOMPermanently(deleteBOMId);
                  if (result.success) {
                    setDeleteBOMId(null);
                    toast({
                      title: "Success",
                      description: "BOM deleted permanently",
                    });
                    router.refresh();
                  } else {
                    toast({
                      title: "Error",
                      description: result.error || "Failed to delete BOM",
                      variant: "destructive",
                    });
                  }
                });
              } : handleDelete}
              disabled={isPending}
              className={isTrash ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""}
            >
              {isPending ? "Deleting..." : isTrash ? "Delete Permanently" : "Move to Trash"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Restore Confirmation Dialog */}
      <AlertDialog open={!!restoreBOMId} onOpenChange={() => setRestoreBOMId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore BOM</AlertDialogTitle>
            <AlertDialogDescription>
              This will restore the BOM and set its status to active.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRestore} disabled={isPending}>
              {isPending ? "Restoring..." : "Restore"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
