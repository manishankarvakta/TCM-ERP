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
import { FiSearch, FiEdit, FiTrash2, FiX, FiCircle, FiCheck, FiMoreVertical, FiEye, FiRotateCw, FiShoppingCart, FiImage, FiFileText } from "react-icons/fi";
import { deleteItem, bulkUpdateItemStatus, deleteItemsPermanently, toggleItemEcom } from "../_actions/item.action";
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
  subCategoryId: string | null;
  unitId: string;
  costPrice: any;
  salesPrice: any | null;
  wholesalePrice?: any | null;
  discount?: any | null;
  trackInventory: boolean;
  images: string[] | null;
  featuredImage: string | null;
  isEnableEcom: boolean;
  status: string;
  isTrash: boolean;
  createdAt: Date;
  updatedAt: Date;
  category: {
    id: string;
    name: string;
  } | null;
  subCategory?: {
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
  const [stockErrorMsg, setStockErrorMsg] = useState<string | null>(null);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const [togglingEcomId, setTogglingEcomId] = useState<string | null>(null);

  const handleToggleEcom = async (itemId: string, currentStatus: boolean) => {
    try {
      setTogglingEcomId(itemId);
      const newStatus = !currentStatus;
      const result = await toggleItemEcom(itemId, newStatus);
      if (result.success) {
        toast({
          title: "E-commerce status updated",
          description: `Successfully ${newStatus ? "enabled" : "disabled"} E-commerce service.`,
        });
        router.refresh();
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to update E-commerce status",
          variant: "destructive",
        });
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setTogglingEcomId(null);
    }
  };

  const handleSearch = (value: string) => {
    setSearch(value);
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set("search", value); else params.delete("search");
    params.set("page", "1");
    router.push(`/dashboard/master/items?${params.toString()}`);
  };

  const handleItemTypeFilter = (value: ItemType | "all") => {
    setItemTypeFilter(value);
    const params = new URLSearchParams(searchParams.toString());
    if (value !== "all") params.set("itemType", value); else params.delete("itemType");
    params.set("page", "1");
    router.push(`/dashboard/master/items?${params.toString()}`);
  };

  const handleSelectItem = (itemId: string, selected: boolean) => {
    setSelectedItems((prev) => {
      const newSet = new Set(prev);
      if (selected) newSet.add(itemId); else newSet.delete(itemId);
      return newSet;
    });
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) setSelectedItems(new Set(initialItems.map((i) => i.id))); else setSelectedItems(new Set());
  };

  const handleDelete = async () => {
    if (!deleteItemId) return;
    startTransition(async () => {
      const result = isTrash ? await deleteItemsPermanently([deleteItemId]) : await deleteItem(deleteItemId);
      if (result.success) {
        setDeleteItemId(null);
        toast({ title: "Success", description: isTrash ? "Item deleted permanently" : "Item moved to trash" });
        router.refresh();
      } else {
        setDeleteItemId(null);
        if (result.error?.includes("existing stock")) {
          setStockErrorMsg(result.error);
        } else {
          toast({ title: "Error", description: result.error || "Failed to delete item", variant: "destructive" });
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
        toast({ title: "Success", description: "Item restored successfully" });
        router.refresh();
      } else {
        toast({ title: "Error", description: result.error || "Failed to restore item", variant: "destructive" });
      }
    });
  };

  const handleBulkAction = (action: string) => {
    const itemIds = Array.from(selectedItems);
    if (itemIds.length === 0) return;
    startTransition(async () => {
      let result;
      if (action === "activate") result = await bulkUpdateItemStatus(itemIds, "active");
      else if (action === "deactivate") result = await bulkUpdateItemStatus(itemIds, "inactive");
      else if (action === "trash") result = await bulkUpdateItemStatus(itemIds, "trash");
      else if (action === "restore") result = await bulkUpdateItemStatus(itemIds, "active");
      else if (action === "deletePermanently") result = await deleteItemsPermanently(itemIds);
      else return;

      if (result.success) {
        setSelectedItems(new Set());
        setBulkAction(null);
        toast({ title: "Success", description: `Bulk action completed successfully` });
        router.refresh();
      } else {
        if (result.error?.includes("existing stock")) {
          setStockErrorMsg(result.error);
        } else {
          toast({ title: "Error", description: result.error || "Failed to perform bulk action", variant: "destructive" });
        }
      }
    });
  };

  const allSelected = initialItems.length > 0 && selectedItems.size === initialItems.length;

  const getItemTypeBadge = (type: ItemType) => {
    const variants: Record<ItemType, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
      RAW_MATERIAL: { label: "Raw Material", variant: "secondary" },
      READY_PRODUCT: { label: "Ready Product", variant: "default" },
      RETAIL: { label: "Retail", variant: "outline" },
      WHOLESALE: { label: "Wholesale", variant: "secondary" },
    };
    const config = variants[type];
    return (
      <>
        <Badge variant={config.variant} className="print:hidden">{config.label}</Badge>
        <span className="hidden print:inline text-black">{config.label}</span>
      </>
    );
  };

  const formatPrice = (price: any) => {
    if (!price) return "-";
    return (
      <>
        <span className="print:hidden">৳</span>
        {Number(price).toLocaleString("en-BD", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </>
    );
  };

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
    router.push(`/dashboard/master/items?${params.toString()}`);
  };

  const handleLimitChange = (newLimit: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("limit", newLimit.toString());
    params.set("page", "1");
    router.push(`/dashboard/master/items?${params.toString()}`);
  };

  const renderLimitSelector = () => {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Rows per page:</span>
        <Select
          value={String(initialPagination.limit)}
          onValueChange={(val) => handleLimitChange(Number(val))}
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
      <div className="flex items-center gap-2 flex-wrap print:hidden">
        <div className="relative flex-1 max-w-sm">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search..." value={search} onChange={(e) => handleSearch(e.target.value)} className="pl-10" />
        </div>
        {!isTrash && (
          <Select value={itemTypeFilter} onValueChange={handleItemTypeFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="RAW_MATERIAL">Raw Material</SelectItem>
              <SelectItem value="READY_PRODUCT">Ready Product</SelectItem>
              <SelectItem value="RETAIL">Retail</SelectItem>
              <SelectItem value="WHOLESALE">Wholesale</SelectItem>
            </SelectContent>
          </Select>
        )}
        <div className="flex items-center gap-2">
          {selectedItems.size > 0 && <span className="text-sm text-muted-foreground">{selectedItems.size} selected</span>}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" disabled={isPending || selectedItems.size === 0}>
                <FiMoreVertical className="mr-2 h-4 w-4" /> Bulk Actions
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {isTrash ? (
                <>
                  <DropdownMenuItem onClick={() => handleBulkAction("restore")}><FiRotateCw className="mr-2 h-4 w-4" /> Restore</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleBulkAction("deletePermanently")} className="text-destructive"><FiTrash2 className="mr-2 h-4 w-4" /> Delete Permanently</DropdownMenuItem>
                </>
              ) : (
                <>
                  <DropdownMenuItem onClick={() => handleBulkAction("activate")}><FiCheck className="mr-2 h-4 w-4" /> Activate</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleBulkAction("deactivate")}><FiCircle className="mr-2 h-4 w-4" /> Deactivate</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleBulkAction("trash")} className="text-destructive"><FiTrash2 className="mr-2 h-4 w-4" /> Move to Trash</DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="rounded-md border bg-card overflow-hidden">
        <Table className="print-bordered">
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead className="w-12 print:hidden"><Checkbox checked={allSelected} onCheckedChange={handleSelectAll} /></TableHead>
              <TableHead className="w-16 text-center print:hidden"><FiImage className="mx-auto" /></TableHead>
              <TableHead className="print:w-[25%] whitespace-nowrap">Code & Name</TableHead>
              <TableHead className="print:w-[10%] whitespace-nowrap">Type</TableHead>
              <TableHead className="print:w-[15%]">Category</TableHead>
              <TableHead className="print:w-[15%]">Sub-category</TableHead>
              <TableHead className="print:w-[20%] whitespace-nowrap">Price (Cost / Sales)</TableHead>
              <TableHead className="print:w-[15%] whitespace-nowrap">Stock & Unit</TableHead>
              <TableHead className="print:hidden">E-com</TableHead>
              <TableHead className="print:hidden">Status</TableHead>
              <TableHead className="text-right print:hidden">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {initialItems.length === 0 ? (
              <TableRow><TableCell colSpan={11} className="text-center py-8 text-muted-foreground">No items found</TableCell></TableRow>
            ) : (
              initialItems.map((item) => {
                const isSelected = selectedItems.has(item.id);
                const displayImg = item.featuredImage || (item.images && item.images.length > 0 ? item.images[0] : null);

                return (
                  <TableRow key={item.id} className={cn(isSelected && "bg-muted/50")}>
                    <TableCell className="print:hidden"><Checkbox checked={isSelected} onCheckedChange={(checked) => handleSelectItem(item.id, checked as boolean)} /></TableCell>
                    <TableCell className="print:hidden">
                      <div className="w-10 h-10 rounded border bg-muted overflow-hidden flex items-center justify-center mx-auto">
                        {displayImg ? <img src={displayImg} alt="" className="w-full h-full object-cover" /> : <FiImage className="text-muted-foreground" />}
                      </div>
                    </TableCell>
                    <TableCell className="print:whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="font-medium text-foreground">{item.name}</span>
                        <span className="text-xs font-mono text-muted-foreground uppercase">{item.code}</span>
                      </div>
                    </TableCell>
                    <TableCell className="print:whitespace-nowrap">{getItemTypeBadge(item.itemType)}</TableCell>
                    <TableCell>
                      {item.category ? (
                        <>
                          <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 whitespace-nowrap print:hidden">
                            {item.category.name}
                          </Badge>
                          <span className="hidden print:inline text-black">{item.category.name}</span>
                        </>
                      ) : (
                        <span className="text-muted-foreground text-sm print:text-black">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {item.subCategory ? (
                        <>
                          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200/50 whitespace-nowrap print:hidden">
                            {item.subCategory.name}
                          </Badge>
                          <span className="hidden print:inline text-black">{item.subCategory.name}</span>
                        </>
                      ) : (
                        <span className="text-muted-foreground text-sm print:text-black">—</span>
                      )}
                    </TableCell>
                    <TableCell className="print:whitespace-nowrap print:text-black">
                      <div className="flex flex-col text-sm">
                        <span className="text-muted-foreground line-through decoration-muted-foreground/30">{formatPrice(item.costPrice)}</span>
                        <span className="font-semibold text-primary">{formatPrice(item.salesPrice)}</span>
                      </div>
                    </TableCell>
                    <TableCell className="print:whitespace-nowrap print:text-black">
                      <div className="flex items-center gap-1">
                        <span className="font-medium">{item.unit.symbol}</span>
                        {item.trackInventory && (
                          <>
                            <Badge variant="outline" className="text-[10px] h-4 px-1 print:hidden">Tracked</Badge>
                            <span className="hidden print:inline text-[10px] text-black italic">(Tracked)</span>
                          </>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="print:hidden">
                      <button
                        type="button"
                        onClick={() => handleToggleEcom(item.id, item.isEnableEcom)}
                        disabled={togglingEcomId === item.id}
                        className={cn(
                          "p-1.5 rounded-lg border border-transparent hover:border-border hover:bg-muted/50 transition-all focus:outline-none focus:ring-2 focus:ring-primary/20",
                          togglingEcomId === item.id && "opacity-50 cursor-not-allowed"
                        )}
                        title={item.isEnableEcom ? "Disable E-commerce service" : "Enable E-commerce service"}
                      >
                        {item.isEnableEcom ? (
                          <FiShoppingCart className="text-green-600 h-4 w-4" />
                        ) : (
                          <FiX className="text-muted-foreground h-4 w-4" />
                        )}
                      </button>
                    </TableCell>
                    <TableCell className="print:hidden">
                      <Badge variant={item.status === "active" ? "default" : "secondary"} className="capitalize">{item.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right print:hidden">
                      <div className="flex items-center justify-end gap-1">
                        {!isTrash ? (
                          <>
                            <Button variant="ghost" size="icon" className="h-8 w-8" title="View Ledger" asChild>
                              <Link href={`/dashboard/master/items/ledger?id=${item.id}`}>
                                <FiFileText className="h-4 w-4 text-amber-600" />
                              </Link>
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8" title="View Details" asChild>
                              <Link href={`/dashboard/master/items/${item.id}`}>
                                <FiEye className="h-4 w-4" />
                              </Link>
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8" title="Edit Item" asChild>
                              <Link href={`/dashboard/master/items/${item.id}/edit`}>
                                <FiEdit className="h-4 w-4" />
                              </Link>
                            </Button>
                          </>
                        ) : (
                          <Button variant="ghost" size="icon" className="h-8 w-8" title="Restore Item" onClick={() => setRestoreItemId(item.id)}>
                            <FiRotateCw className="h-4 w-4" />
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" title="Delete Item" onClick={() => setDeleteItemId(item.id)}>
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

      {(initialPagination.totalPages > 1 || initialPagination.total > 0) && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4 pt-2 print:hidden">
          <div className="flex flex-wrap items-center gap-4">
            <div className="text-sm text-muted-foreground">
              Showing {((initialPagination.page - 1) * initialPagination.limit) + 1} to{" "}
              {Math.min(initialPagination.page * initialPagination.limit, initialPagination.total)} of{" "}
              {initialPagination.total} items
            </div>
            {renderLimitSelector()}
          </div>
          {renderPaginationButtons()}
        </div>
      )}

      <AlertDialog open={!!deleteItemId} onOpenChange={() => setDeleteItemId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{isTrash ? "Delete Permanently?" : "Move to Trash?"}</AlertDialogTitle>
            <AlertDialogDescription>{isTrash ? "This action cannot be undone." : "You can restore this item later."}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-white">Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!restoreItemId} onOpenChange={() => setRestoreItemId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Restore Item?</AlertDialogTitle></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRestore}>Restore</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={!!stockErrorMsg} onOpenChange={() => setStockErrorMsg(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cannot Delete Item(s)</AlertDialogTitle>
            <AlertDialogDescription className="text-destructive font-medium">
              {stockErrorMsg}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setStockErrorMsg(null)}>Understood</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
