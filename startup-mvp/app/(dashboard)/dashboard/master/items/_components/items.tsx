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
import { deleteItem, bulkUpdateItemStatus, deleteItemsPermanently } from "../_actions/item.action";
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
import { ItemType } from "@prisma/client";

interface Item {
  id: string;
  code: string;
  name: string;
  description: string | null;
  itemType: ItemType;
  categoryId: string | null;
  unitId: string;
  costPrice: any; // Decimal from Prisma
  salesPrice: any | null; // Decimal from Prisma
  trackInventory: boolean;
  image: string | null;
  status: string;
  isTrash: boolean;
  createdAt: Date;
  updatedAt: Date;
  category: {
    id: string;
    name: string;
  } | null;
  unit: {
    id: string;
    symbol: string;
    details: string;
  };
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface ItemsListClientProps {
  initialItems: Item[];
  initialPagination: Pagination;
  initialSearch: string;
  initialItemType?: ItemType | "all";
  isTrash?: boolean;
}

export default function ItemsListClient({
  initialItems,
  initialPagination,
  initialSearch,
  initialItemType = "all",
  isTrash = false,
}: ItemsListClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(initialSearch);
  const [itemTypeFilter, setItemTypeFilter] = useState<ItemType | "all">(initialItemType);
  const [deleteItemId, setDeleteItemId] = useState<string | null>(null);
  const [restoreItemId, setRestoreItemId] = useState<string | null>(null);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
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
    if (itemTypeFilter !== "all") {
      params.set("itemType", itemTypeFilter);
    } else {
      params.delete("itemType");
    }
    router.push(`/dashboard/master/items?${params.toString()}`);
  };

  const handleItemTypeFilter = (value: ItemType | "all") => {
    setItemTypeFilter(value);
    const params = new URLSearchParams(searchParams.toString());
    if (value !== "all") {
      params.set("itemType", value);
    } else {
      params.delete("itemType");
    }
    params.set("page", "1");
    router.push(`/dashboard/master/items?${params.toString()}`);
  };

  const handleSelectItem = (itemId: string, selected: boolean) => {
    setSelectedItems((prev) => {
      const newSet = new Set(prev);
      if (selected) {
        newSet.add(itemId);
      } else {
        newSet.delete(itemId);
      }
      return newSet;
    });
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedItems(new Set(initialItems.map((i) => i.id)));
    } else {
      setSelectedItems(new Set());
    }
  };

  const handleDelete = async () => {
    if (!deleteItemId) return;

    startTransition(async () => {
      if (isTrash) {
        const result = await deleteItemsPermanently([deleteItemId]);
        if (result.success) {
          setDeleteItemId(null);
          toast({
            title: "Success",
            description: "Item deleted permanently",
          });
          router.refresh();
        } else {
          toast({
            title: "Error",
            description: result.error || "Failed to delete item",
            variant: "destructive",
          });
        }
      } else {
        const result = await deleteItem(deleteItemId);
        if (result.success) {
          setDeleteItemId(null);
          toast({
            title: "Success",
            description: "Item moved to trash",
          });
          router.refresh();
        } else {
          toast({
            title: "Error",
            description: result.error || "Failed to delete item",
            variant: "destructive",
          });
        }
      }
    });
  };

  const handleRestore = async () => {
    if (!restoreItemId) return;

    startTransition(async () => {
      const result = await bulkUpdateItemStatus([restoreItemId], "active");
      if (result.success) {
        setRestoreItemId(null);
        toast({
          title: "Success",
          description: "Item restored successfully",
        });
        router.refresh();
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to restore item",
          variant: "destructive",
        });
      }
    });
  };

  const handleBulkAction = (action: string) => {
    const itemIds = Array.from(selectedItems);
    if (itemIds.length === 0) return;

    startTransition(async () => {
      let result;
      
      if (action === "activate") {
        result = await bulkUpdateItemStatus(itemIds, "active");
      } else if (action === "deactivate") {
        result = await bulkUpdateItemStatus(itemIds, "inactive");
      } else if (action === "trash") {
        result = await bulkUpdateItemStatus(itemIds, "trash");
      } else if (action === "restore") {
        result = await bulkUpdateItemStatus(itemIds, "active");
      } else if (action === "deletePermanently") {
        result = await deleteItemsPermanently(itemIds);
      } else {
        return;
      }

      if (result.success) {
        setSelectedItems(new Set());
        setBulkAction(null);
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

  const allSelected = initialItems.length > 0 && selectedItems.size === initialItems.length;
  const someSelected = selectedItems.size > 0 && selectedItems.size < initialItems.length;

  const getItemTypeBadge = (type: ItemType) => {
    const variants: Record<ItemType, { label: string; variant: "default" | "secondary" | "outline" }> = {
      RAW_MATERIAL: { label: "Raw Material", variant: "secondary" },
      FINISHED_GOOD: { label: "Finished Good", variant: "default" },
      RETAIL: { label: "Retail", variant: "outline" },
    };
    const config = variants[type];
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const formatPrice = (price: any) => {
    if (!price) return "-";
    return `৳${Number(price).toLocaleString("en-BD", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, code, or description..."
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

        {!isTrash && (
          <Select value={itemTypeFilter} onValueChange={handleItemTypeFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="RAW_MATERIAL">Raw Material</SelectItem>
              <SelectItem value="FINISHED_GOOD">Finished Good</SelectItem>
              <SelectItem value="RETAIL">Retail</SelectItem>
            </SelectContent>
          </Select>
        )}

        {/* Bulk Actions Dropdown */}
        <div className="flex items-center gap-2">
          {selectedItems.size > 0 && (
            <span className="text-sm text-muted-foreground whitespace-nowrap">
              {selectedItems.size} selected
            </span>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="outline" 
                size="sm" 
                disabled={isPending || selectedItems.size === 0}
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
                    disabled={selectedItems.size === 0}
                  >
                    <FiRotateCw className="mr-2 h-4 w-4" />
                    Restore
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      setBulkAction("deletePermanently");
                      handleBulkAction("deletePermanently");
                    }}
                    disabled={selectedItems.size === 0}
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
                    disabled={selectedItems.size === 0}
                  >
                    <FiCheck className="mr-2 h-4 w-4" />
                    Activate
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      setBulkAction("deactivate");
                      handleBulkAction("deactivate");
                    }}
                    disabled={selectedItems.size === 0}
                  >
                    <FiCircle className="mr-2 h-4 w-4" />
                    Deactivate
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      setBulkAction("trash");
                      handleBulkAction("trash");
                    }}
                    disabled={selectedItems.size === 0}
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

      {/* Items Table */}
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
              <TableHead>Type</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Unit</TableHead>
              <TableHead>Cost Price</TableHead>
              <TableHead>Sales Price</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created At</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {initialItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                  No items found
                </TableCell>
              </TableRow>
            ) : (
              initialItems.map((item) => {
                const isSelected = selectedItems.has(item.id);
                
                return (
                  <TableRow key={item.id} className={cn(isSelected && "bg-muted/50")}>
                    <TableCell>
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={(checked) => handleSelectItem(item.id, checked as boolean)}
                        aria-label={`Select ${item.name}`}
                      />
                    </TableCell>
                    <TableCell className="font-mono text-sm">{item.code}</TableCell>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell>{getItemTypeBadge(item.itemType)}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {item.category?.name || "-"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {item.unit.symbol}
                    </TableCell>
                    <TableCell>{formatPrice(item.costPrice)}</TableCell>
                    <TableCell>{formatPrice(item.salesPrice)}</TableCell>
                    <TableCell>
                      {item.status === "trash" ? (
                        <Badge variant="destructive">Trash</Badge>
                      ) : item.status === "inactive" ? (
                        <Badge variant="secondary">Inactive</Badge>
                      ) : (
                        <Badge variant="default">Active</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(item.createdAt), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {!isTrash && (
                          <>
                            <Button variant="ghost" size="sm" asChild>
                              <Link href={`/dashboard/master/items/${item.id}`}>
                                <FiEye className="h-4 w-4" />
                              </Link>
                            </Button>
                            <Button variant="ghost" size="sm" asChild>
                              <Link href={`/dashboard/master/items/${item.id}/edit`}>
                                <FiEdit className="h-4 w-4" />
                              </Link>
                            </Button>
                          </>
                        )}
                        {isTrash && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setRestoreItemId(item.id)}
                            title="Restore item"
                            disabled={isPending}
                          >
                            <FiRotateCw className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteItemId(item.id)}
                          className="text-destructive hover:text-destructive"
                          title={isTrash ? "Delete permanently" : "Move to trash"}
                          disabled={isPending}
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
          <p className="text-sm text-muted-foreground">
            Showing {((initialPagination.page - 1) * initialPagination.limit) + 1} to{" "}
            {Math.min(initialPagination.page * initialPagination.limit, initialPagination.total)} of{" "}
            {initialPagination.total} items
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const params = new URLSearchParams(searchParams.toString());
                params.set("page", String(Math.max(1, initialPagination.page - 1)));
                router.push(`/dashboard/master/items?${params.toString()}`);
              }}
              disabled={initialPagination.page === 1 || isPending}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const params = new URLSearchParams(searchParams.toString());
                params.set("page", String(Math.min(initialPagination.totalPages, initialPagination.page + 1)));
                router.push(`/dashboard/master/items?${params.toString()}`);
              }}
              disabled={initialPagination.page === initialPagination.totalPages || isPending}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteItemId} onOpenChange={() => setDeleteItemId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isTrash ? "Delete Item Permanently" : "Move Item to Trash"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isTrash
                ? "This action cannot be undone. This will permanently delete the item and all associated data."
                : "This will move the item to trash. You can restore it later from the Trash tab."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isPending ? (isTrash ? "Deleting..." : "Moving...") : isTrash ? "Delete Permanently" : "Move to Trash"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Restore Confirmation Dialog */}
      <AlertDialog open={!!restoreItemId} onOpenChange={() => setRestoreItemId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore Item</AlertDialogTitle>
            <AlertDialogDescription>
              This will restore the item and make it active again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRestore}
              disabled={isPending}
            >
              {isPending ? "Restoring..." : "Restore Item"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
