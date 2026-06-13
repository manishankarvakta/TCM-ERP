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
import Link from "next/link";
import { FiSearch, FiEdit, FiTrash2, FiX, FiCircle, FiCheck, FiMoreVertical, FiEye, FiRotateCw } from "react-icons/fi";
import { deleteWarehouse, bulkUpdateWarehouseStatus, deleteWarehousesPermanently, restoreWarehouses } from "../_actions/warehouse.action";
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

interface Warehouse {
  id: string;
  code: string;
  name: string;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  country: string | null;
  status: string;
  isTrash: boolean;
  createdAt: Date;
  updatedAt: Date;
  creator: {
    id: string;
    name: string | null;
    email: string;
  };
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface WarehousesListClientProps {
  initialWarehouses: Warehouse[];
  initialPagination: Pagination;
  initialSearch: string;
  isTrash?: boolean;
}

export default function WarehousesListClient({
  initialWarehouses,
  initialPagination,
  initialSearch,
  isTrash = false,
}: WarehousesListClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(initialSearch);
  const [deleteWarehouseId, setDeleteWarehouseId] = useState<string | null>(null);
  const [restoreWarehouseId, setRestoreWarehouseId] = useState<string | null>(null);
  const [errorModalMsg, setErrorModalMsg] = useState<string | null>(null);
  const [selectedWarehouses, setSelectedWarehouses] = useState<Set<string>>(new Set());
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
    router.push(`/dashboard/master/warehouses?${params.toString()}`);
  };

  const handleSelectWarehouse = (warehouseId: string, selected: boolean) => {
    setSelectedWarehouses((prev) => {
      const newSet = new Set(prev);
      if (selected) {
        newSet.add(warehouseId);
      } else {
        newSet.delete(warehouseId);
      }
      return newSet;
    });
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedWarehouses(new Set(initialWarehouses.map((w) => w.id)));
    } else {
      setSelectedWarehouses(new Set());
    }
  };

  const handleDelete = async () => {
    if (!deleteWarehouseId) return;

    startTransition(async () => {
      if (isTrash) {
        const result = await deleteWarehousesPermanently([deleteWarehouseId]);
        if (result.success) {
          setDeleteWarehouseId(null);
          toast({
            title: "Success",
            description: "Warehouse deleted permanently",
          });
          router.refresh();
        } else {
          setDeleteWarehouseId(null);
          if (result.error?.includes("existing stock")) {
            setErrorModalMsg(result.error);
          } else {
            toast({
              title: "Error",
              description: result.error || "Failed to delete warehouse",
              variant: "destructive",
            });
          }
        }
      } else {
        const result = await deleteWarehouse(deleteWarehouseId);
        if (result.success) {
          setDeleteWarehouseId(null);
          toast({
            title: "Success",
            description: "Warehouse moved to trash",
          });
          router.refresh();
        } else {
          toast({
            title: "Error",
            description: result.error || "Failed to delete warehouse",
            variant: "destructive",
          });
        }
      }
    });
  };

  const handleRestore = async () => {
    if (!restoreWarehouseId) return;

    startTransition(async () => {
      const result = await restoreWarehouses([restoreWarehouseId]);
      if (result.success) {
        setRestoreWarehouseId(null);
        toast({
          title: "Success",
          description: "Warehouse restored successfully",
        });
        router.refresh();
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to restore warehouse",
          variant: "destructive",
        });
      }
    });
  };

  const handleBulkAction = (action: string) => {
    const warehouseIds = Array.from(selectedWarehouses);
    if (warehouseIds.length === 0) return;

    startTransition(async () => {
      let result;
      
      if (action === "activate") {
        result = await bulkUpdateWarehouseStatus(warehouseIds, "active");
      } else if (action === "deactivate") {
        result = await bulkUpdateWarehouseStatus(warehouseIds, "inactive");
      } else if (action === "trash") {
        // For trash, we need to delete each one (soft delete)
        for (const id of warehouseIds) {
          await deleteWarehouse(id);
        }
        result = { success: true };
      } else if (action === "restore") {
        result = await restoreWarehouses(warehouseIds);
      } else if (action === "deletePermanently") {
        result = await deleteWarehousesPermanently(warehouseIds);
      } else {
        return;
      }

      if (result.success) {
        setSelectedWarehouses(new Set());
        setBulkAction(null);
        toast({
          title: "Success",
          description: `Bulk action completed successfully`,
        });
        router.refresh();
      } else {
        if (result.error?.includes("existing stock")) {
          setErrorModalMsg(result.error);
        } else {
          toast({
            title: "Error",
            description: result.error || "Failed to perform bulk action",
            variant: "destructive",
          });
        }
      }
    });
  };

  const allSelected = initialWarehouses.length > 0 && selectedWarehouses.size === initialWarehouses.length;
  const someSelected = selectedWarehouses.size > 0 && selectedWarehouses.size < initialWarehouses.length;

  const getLocationString = (warehouse: Warehouse) => {
    const parts = [warehouse.city, warehouse.state, warehouse.country].filter(Boolean);
    return parts.length > 0 ? parts.join(", ") : "-";
  };

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, code, or location..."
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

        {/* Bulk Actions Dropdown */}
        <div className="flex items-center gap-2">
          {selectedWarehouses.size > 0 && (
            <span className="text-sm text-muted-foreground whitespace-nowrap">
              {selectedWarehouses.size} selected
            </span>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="outline" 
                size="sm" 
                disabled={isPending || selectedWarehouses.size === 0}
              >
                <FiMoreVertical className="mr-2 h-4 w-4" />
                Bulk Actions
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {isTrash ? (
                <>
                  <DropdownMenuItem
                    onClick={() => {
                      setBulkAction("restore");
                      handleBulkAction("restore");
                    }}
                    disabled={selectedWarehouses.size === 0}
                  >
                    <FiRotateCw className="mr-2 h-4 w-4" />
                    Restore
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      setBulkAction("deletePermanently");
                      handleBulkAction("deletePermanently");
                    }}
                    disabled={selectedWarehouses.size === 0}
                    className="text-destructive"
                  >
                    <FiTrash2 className="mr-2 h-4 w-4" />
                    Delete Permanently
                  </DropdownMenuItem>
                </>
              ) : (
                <>
                  <DropdownMenuItem
                    onClick={() => {
                      setBulkAction("activate");
                      handleBulkAction("activate");
                    }}
                    disabled={selectedWarehouses.size === 0}
                  >
                    <FiCheck className="mr-2 h-4 w-4" />
                    Activate
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      setBulkAction("deactivate");
                      handleBulkAction("deactivate");
                    }}
                    disabled={selectedWarehouses.size === 0}
                  >
                    <FiCircle className="mr-2 h-4 w-4" />
                    Deactivate
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      setBulkAction("trash");
                      handleBulkAction("trash");
                    }}
                    disabled={selectedWarehouses.size === 0}
                    className="text-destructive"
                  >
                    <FiTrash2 className="mr-2 h-4 w-4" />
                    Move to Trash
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Warehouses Table */}
      <div className="rounded-md border">
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
              <TableHead>Code</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created At</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {initialWarehouses.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No warehouses found
                </TableCell>
              </TableRow>
            ) : (
              initialWarehouses.map((warehouse) => {
                const isSelected = selectedWarehouses.has(warehouse.id);
                
                return (
                  <TableRow key={warehouse.id} className={cn(isSelected && "bg-muted/50")}>
                    <TableCell>
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={(checked) => handleSelectWarehouse(warehouse.id, checked as boolean)}
                        aria-label={`Select ${warehouse.name}`}
                      />
                    </TableCell>
                    <TableCell className="font-mono text-sm">{warehouse.code}</TableCell>
                    <TableCell className="font-medium">{warehouse.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {getLocationString(warehouse)}
                    </TableCell>
                    <TableCell>
                      {warehouse.status === "trash" ? (
                        <Badge variant="destructive">Trash</Badge>
                      ) : warehouse.status === "inactive" ? (
                        <Badge variant="secondary">Inactive</Badge>
                      ) : (
                        <Badge variant="default">Active</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(warehouse.createdAt), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {!isTrash && (
                          <>
                            <Button variant="ghost" size="sm" asChild>
                              <Link href={`/dashboard/master/warehouses/${warehouse.id}`}>
                                <FiEye className="h-4 w-4" />
                              </Link>
                            </Button>
                            <Button variant="ghost" size="sm" asChild>
                              <Link href={`/dashboard/master/warehouses/${warehouse.id}/edit`}>
                                <FiEdit className="h-4 w-4" />
                              </Link>
                            </Button>
                          </>
                        )}
                        {isTrash && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setRestoreWarehouseId(warehouse.id)}
                            title="Restore warehouse"
                            disabled={isPending}
                          >
                            <FiRotateCw className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteWarehouseId(warehouse.id)}
                          className="text-destructive hover:text-destructive"
                          disabled={isPending}
                          title={isTrash ? "Delete permanently" : "Move to trash"}
                        >
                          <FiTrash2 className="h-4 w-4" />
                        </Button>
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
      {initialPagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Showing {((initialPagination.page - 1) * initialPagination.limit) + 1} to{" "}
            {Math.min(initialPagination.page * initialPagination.limit, initialPagination.total)} of{" "}
            {initialPagination.total} warehouses
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const params = new URLSearchParams(searchParams.toString());
                params.set("page", String(Math.max(1, initialPagination.page - 1)));
                router.push(`/dashboard/master/warehouses?${params.toString()}`);
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
                router.push(`/dashboard/master/warehouses?${params.toString()}`);
              }}
              disabled={initialPagination.page === initialPagination.totalPages || isPending}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteWarehouseId} onOpenChange={(open) => !open && setDeleteWarehouseId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isTrash ? "Delete Warehouse Permanently" : "Move Warehouse to Trash"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isTrash
                ? "This action cannot be undone. This will permanently delete the warehouse and all associated data."
                : "This will move the warehouse to trash. You can restore it later from the Trash tab."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isPending}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Restore Confirmation Dialog */}
      <AlertDialog open={!!restoreWarehouseId} onOpenChange={(open) => !open && setRestoreWarehouseId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore Warehouse</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to restore this warehouse? It will be set to active status.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRestore} disabled={isPending}>
              Restore
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!errorModalMsg} onOpenChange={() => setErrorModalMsg(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cannot Delete Warehouse</AlertDialogTitle>
            <AlertDialogDescription className="text-destructive font-medium">
              {errorModalMsg}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setErrorModalMsg(null)}>Understood</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
