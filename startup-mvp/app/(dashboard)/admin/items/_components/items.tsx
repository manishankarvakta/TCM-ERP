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

interface Item {
  id: string;
  code: string;
  description: string;
  unitId: string;
  unit: {
    id: string;
    symbol: string;
    details: string;
  };
  unitPrice: number;
  costPrice: number | null;
  categories: {
    id: string;
  category: {
    id: string;
    name: string;
    };
  }[];
  image: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface Category {
  id: string;
  name: string;
  description?: string | null;
}

interface ItemsListClientProps {
  initialItems: Item[];
  initialPagination: Pagination;
  initialSearch: string;
  initialCategory?: string;
  categories?: Category[];
  isTrash?: boolean;
}

export default function ItemsListClient({
  initialItems = [],
  initialPagination,
  initialSearch,
  initialCategory = "all",
  categories = [],
  isTrash = false,
}: ItemsListClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(initialSearch);
  const [category, setCategory] = useState(initialCategory);
  const [deleteItemId, setDeleteItemId] = useState<string | null>(null);
  const [restoreItemId, setRestoreItemId] = useState<string | null>(null);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
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
    const currentCategory = searchParams.get("category") || "all";
    if (currentCategory && currentCategory !== "all") {
      params.set("category", currentCategory);
    } else {
      params.delete("category");
    }
    router.push(`/admin/items?${params.toString()}`);
  };

  const handleCategoryChange = (value: string) => {
    setCategory(value);
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== "all") {
      params.set("category", value);
    } else {
      params.delete("category");
    }
    params.set("page", "1");
    const tab = searchParams.get("tab") || "all";
    if (tab) {
      params.set("tab", tab);
    }
    const currentSearch = searchParams.get("search");
    if (currentSearch) {
      params.set("search", currentSearch);
    }
    router.push(`/admin/items?${params.toString()}`);
  };

  const handleDelete = async () => {
    if (!deleteItemId) return;

    startTransition(async () => {
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

  const handleSelectItem = (itemId: string, checked: boolean) => {
    setSelectedItems((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(itemId);
      } else {
        next.delete(itemId);
      }
      return next;
    });
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedItems(new Set(initialItems.map((i) => i.id)));
    } else {
      setSelectedItems(new Set());
    }
  };

  const handleBulkAction = async (action: string) => {
    if (selectedItems.size === 0) {
      toast({
        title: "No selection",
        description: "Please select at least one item",
        variant: "destructive",
      });
      return;
    }

    const itemIds = Array.from(selectedItems);

    startTransition(async () => {
      let result;
      
      if (action === "trash") {
        result = await bulkUpdateItemStatus(itemIds, "trash");
      } else if (action === "active") {
        result = await bulkUpdateItemStatus(itemIds, "active");
      } else if (action === "inactive") {
        result = await bulkUpdateItemStatus(itemIds, "inactive");
      } else if (action === "restore") {
        result = await bulkUpdateItemStatus(itemIds, "active");
      } else if (action === "delete-permanently") {
        result = await deleteItemsPermanently(itemIds);
      } else {
        return;
      }

      if (result.success) {
        setSelectedItems(new Set());
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

  const allSelected = initialItems?.length > 0 && selectedItems.size === initialItems.length;

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(price);
  };

  return (
    <div className="space-y-4">
      {/* Search and Bulk Actions */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by code, description, or category..."
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

        {/* Category Filter */}
        <Select value={category} onValueChange={handleCategoryChange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>
                {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

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
              {!isTrash ? (
                <>
                  <DropdownMenuItem
                    onClick={() => handleBulkAction("trash")}
                    disabled={selectedItems.size === 0}
                  >
                    <FiTrash2 className="mr-2 h-4 w-4" />
                    Move to Trash
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleBulkAction("active")}
                    disabled={selectedItems.size === 0}
                  >
                    <FiCheck className="mr-2 h-4 w-4" />
                    Activate
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleBulkAction("inactive")}
                    disabled={selectedItems.size === 0}
                  >
                    <FiCircle className="mr-2 h-4 w-4" />
                    Deactivate
                  </DropdownMenuItem>
                </>
              ) : (
                <>
                  <DropdownMenuItem
                    onClick={() => handleBulkAction("restore")}
                    disabled={selectedItems.size === 0}
                  >
                    <FiCheck className="mr-2 h-4 w-4" />
                    Restore
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleBulkAction("delete-permanently")}
                    className="text-destructive"
                    disabled={selectedItems.size === 0}
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
              <TableHead>Image</TableHead>
              <TableHead className="whitespace-nowrap">Code</TableHead>
              <TableHead className="w-[240px] sm:w-[320px] lg:w-[420px]">Description</TableHead>
              <TableHead>Unit</TableHead>
              <TableHead>Unit Price</TableHead>
              <TableHead>Cost Price</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created At</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {initialItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                  {isTrash ? "No trashed items found" : "No items found"}
                </TableCell>
              </TableRow>
            ) : (
              initialItems.map((item) => {
                const isSelected = selectedItems.has(item.id);
                const itemStatus = item.status || "active";
                
                return (
                  <TableRow key={item.id} className={cn(isSelected && "bg-muted/50")}>
                    <TableCell>
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={(checked) => handleSelectItem(item.id, checked as boolean)}
                        aria-label={`Select ${item.code}`}
                      />
                    </TableCell>
                    <TableCell>
                      {item.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={item.image}
                          alt={item.description}
                          className="h-10 w-10 object-cover rounded border"
                        />
                      ) : (
                        <div className="h-10 w-10 rounded border bg-muted flex items-center justify-center">
                          <span className="text-xs text-muted-foreground">No image</span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-medium whitespace-nowrap break-keep">
                      {item.code}
                    </TableCell>
                    <TableCell className="w-[240px] sm:w-[320px] lg:w-[420px]">
                      <p className="line-clamp-2" title={item.description}>
                        {item.description}
                      </p>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {item.unit.symbol}
                      </span>
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatPrice(item.unitPrice)}
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatPrice(item.costPrice ?? 0)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {item.categories && item.categories.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {item.categories.map((itemCategory) => (
                            <Badge key={itemCategory.id} variant="secondary" className="text-xs">
                              {itemCategory.category.name}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell>
                      {itemStatus === "trash" ? (
                        <Badge variant="destructive">Trash</Badge>
                      ) : itemStatus === "inactive" ? (
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
                              <Link href={`/admin/items/details?id=${item.id}`}>
                                <FiEye className="h-4 w-4" />
                              </Link>
                            </Button>
                            <Button variant="ghost" size="sm" asChild>
                              <Link href={`/admin/items/${item.id}`}>
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
                            className="text-green-600 hover:text-green-700"
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
          <div className="text-sm text-muted-foreground">
            Showing {((initialPagination.page - 1) * initialPagination.limit) + 1} to{" "}
            {Math.min(initialPagination.page * initialPagination.limit, initialPagination.total)}{" "}
            of {initialPagination.total} items
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const params = new URLSearchParams(searchParams.toString());
                params.set("page", String(Math.max(1, initialPagination.page - 1)));
                const tab = searchParams.get("tab") || "all";
                if (tab) {
                  params.set("tab", tab);
                }
                const currentCategory = searchParams.get("category");
                if (currentCategory && currentCategory !== "all") {
                  params.set("category", currentCategory);
                }
                const currentSearch = searchParams.get("search");
                if (currentSearch) {
                  params.set("search", currentSearch);
                }
                router.push(`/admin/items?${params.toString()}`);
              }}
              disabled={initialPagination.page === 1}
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
                const tab = searchParams.get("tab") || "all";
                if (tab) {
                  params.set("tab", tab);
                }
                const currentCategory = searchParams.get("category");
                if (currentCategory && currentCategory !== "all") {
                  params.set("category", currentCategory);
                }
                const currentSearch = searchParams.get("search");
                if (currentSearch) {
                  params.set("search", currentSearch);
                }
                router.push(`/admin/items?${params.toString()}`);
              }}
              disabled={initialPagination.page === initialPagination.totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Restore Confirmation Dialog */}
      <AlertDialog open={!!restoreItemId} onOpenChange={() => setRestoreItemId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore Item</AlertDialogTitle>
            <AlertDialogDescription>
              This will restore the item and make it active again. You can use it normally after restoration.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRestore}
              disabled={isPending}
              className="bg-green-600 text-white hover:bg-green-700"
            >
              {isPending ? "Restoring..." : "Restore Item"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
              onClick={async () => {
                if (isTrash && deleteItemId) {
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
