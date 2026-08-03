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
import { FiSearch, FiEdit, FiTrash2, FiX, FiCircle, FiCheck, FiMoreVertical, FiEye, FiRotateCw, FiImage } from "react-icons/fi";
import { deleteCategory, bulkUpdateCategoryStatus, deleteCategoriesPermanently } from "../_actions/category.action";
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

interface Category {
  id: string;
  name: string;
  description: string | null;
  status: string;
  image?: string | null;
  parentId?: string | null;
  parent?: {
    id: string;
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

interface CategoriesListClientProps {
  initialCategories: Category[];
  initialPagination: Pagination;
  initialSearch: string;
  isTrash?: boolean;
}

export default function CategoriesListClient({
  initialCategories,
  initialPagination,
  initialSearch,
  isTrash = false,
}: CategoriesListClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(initialSearch);
  const [deleteCategoryId, setDeleteCategoryId] = useState<string | null>(null);
  const [restoreCategoryId, setRestoreCategoryId] = useState<string | null>(null);
  const [errorModalMsg, setErrorModalMsg] = useState<string | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<string | null>(null);
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
    router.push(`/dashboard/master/categories?${params.toString()}`);
  };

  const handleLimitChange = (newLimit: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("limit", newLimit.toString());
    params.set("page", "1");
    const tab = searchParams.get("tab") || "all";
    if (tab) {
      params.set("tab", tab);
    }
    router.push(`/dashboard/master/categories?${params.toString()}`);
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
    router.push(`/dashboard/master/categories?${params.toString()}`);
  };

  const handleSelectCategory = (categoryId: string, selected: boolean) => {
    setSelectedCategories((prev) => {
      const newSet = new Set(prev);
      if (selected) {
        newSet.add(categoryId);
      } else {
        newSet.delete(categoryId);
      }
      return newSet;
    });
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedCategories(new Set(initialCategories.map((c) => c.id)));
    } else {
      setSelectedCategories(new Set());
    }
  };

  const handleDelete = async () => {
    if (!deleteCategoryId) return;

    startTransition(async () => {
      if (isTrash) {
        const result = await deleteCategoriesPermanently([deleteCategoryId]);
        if (result.success) {
          setDeleteCategoryId(null);
          toast({
            title: "Success",
            description: "Category deleted permanently",
          });
          router.refresh();
        } else {
          setDeleteCategoryId(null);
          if (result.error?.includes("in use by items")) {
            setErrorModalMsg(result.error);
          } else {
            toast({
              title: "Error",
              description: result.error || "Failed to delete category",
              variant: "destructive",
            });
          }
        }
      } else {
        const result = await deleteCategory(deleteCategoryId);
        if (result.success) {
          setDeleteCategoryId(null);
          toast({
            title: "Success",
            description: "Category moved to trash",
          });
          router.refresh();
        } else {
          toast({
            title: "Error",
            description: result.error || "Failed to delete category",
            variant: "destructive",
          });
        }
      }
    });
  };

  const handleRestore = async () => {
    if (!restoreCategoryId) return;

    startTransition(async () => {
      const result = await bulkUpdateCategoryStatus([restoreCategoryId], "active");
      if (result.success) {
        setRestoreCategoryId(null);
        toast({
          title: "Success",
          description: "Category restored successfully",
        });
        router.refresh();
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to restore category",
          variant: "destructive",
        });
      }
    });
  };

  const handleBulkAction = (action: string) => {
    const categoryIds = Array.from(selectedCategories);
    if (categoryIds.length === 0) return;

    startTransition(async () => {
      let result;
      
      if (action === "activate") {
        result = await bulkUpdateCategoryStatus(categoryIds, "active");
      } else if (action === "deactivate") {
        result = await bulkUpdateCategoryStatus(categoryIds, "inactive");
      } else if (action === "trash") {
        result = await bulkUpdateCategoryStatus(categoryIds, "trash");
      } else if (action === "restore") {
        result = await bulkUpdateCategoryStatus(categoryIds, "active");
      } else if (action === "deletePermanently") {
        result = await deleteCategoriesPermanently(categoryIds);
      } else {
        return;
      }

      if (result.success) {
        setSelectedCategories(new Set());
        setBulkAction(null);
        toast({
          title: "Success",
          description: `Bulk action completed successfully`,
        });
        router.refresh();
      } else {
        if (result.error?.includes("in use by items")) {
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

  const allSelected = initialCategories.length > 0 && selectedCategories.size === initialCategories.length;
  const someSelected = selectedCategories.size > 0 && selectedCategories.size < initialCategories.length;

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
      <div className="flex items-center gap-2 print:hidden">
        <div className="relative flex-1 max-w-sm">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or description..."
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
          {selectedCategories.size > 0 && (
            <span className="text-sm text-muted-foreground whitespace-nowrap">
              {selectedCategories.size} selected
            </span>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="outline" 
                size="sm" 
                disabled={isPending || selectedCategories.size === 0}
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
                    disabled={selectedCategories.size === 0}
                  >
                    <FiRotateCw className="mr-2 h-4 w-4" />
                    Restore
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      setBulkAction("deletePermanently");
                      handleBulkAction("deletePermanently");
                    }}
                    disabled={selectedCategories.size === 0}
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
                    disabled={selectedCategories.size === 0}
                  >
                    <FiCheck className="mr-2 h-4 w-4" />
                    Activate
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      setBulkAction("deactivate");
                      handleBulkAction("deactivate");
                    }}
                    disabled={selectedCategories.size === 0}
                  >
                    <FiCircle className="mr-2 h-4 w-4" />
                    Deactivate
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      setBulkAction("trash");
                      handleBulkAction("trash");
                    }}
                    disabled={selectedCategories.size === 0}
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

      {/* Categories Table */}
      <div className="rounded-md border">
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
              <TableHead className="w-16 print:hidden">Photo</TableHead>
              <TableHead className="print:w-[25%] whitespace-nowrap">Name</TableHead>
              <TableHead className="print:w-[25%] whitespace-nowrap">Parent Category</TableHead>
              <TableHead className="print:w-[35%]">Description</TableHead>
              <TableHead className="print:hidden">Status</TableHead>
              <TableHead className="print:w-[15%] whitespace-nowrap">Created At</TableHead>
              <TableHead className="text-right print:hidden">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {initialCategories.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  No categories found
                </TableCell>
              </TableRow>
            ) : (
              initialCategories.map((category) => {
                const isSelected = selectedCategories.has(category.id);
                
                return (
                  <TableRow key={category.id} className={cn(isSelected && "bg-muted/50")}>
                    <TableCell className="print:hidden">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={(checked) => handleSelectCategory(category.id, checked as boolean)}
                        aria-label={`Select ${category.name}`}
                      />
                    </TableCell>
                    <TableCell className="print:hidden">
                      <div className="w-10 h-10 rounded border bg-muted overflow-hidden flex items-center justify-center">
                        {category.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={category.image} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <FiImage className="text-muted-foreground" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium print:text-black print:whitespace-nowrap">{category.name}</TableCell>
                    <TableCell className="print:whitespace-nowrap print:text-black">
                      {category.parent ? (
                        <>
                          <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 print:hidden">
                            {category.parent.name}
                          </Badge>
                          <span className="hidden print:inline text-black">{category.parent.name}</span>
                        </>
                      ) : (
                        <span className="text-muted-foreground text-sm print:text-black">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground print:text-black">
                      {category.description || "-"}
                    </TableCell>
                    <TableCell className="print:hidden">
                      {category.status === "trash" ? (
                        <Badge variant="destructive">Trash</Badge>
                      ) : category.status === "inactive" ? (
                        <Badge variant="secondary">Inactive</Badge>
                      ) : (
                        <Badge variant="default">Active</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground print:text-black print:whitespace-nowrap">
                      {format(new Date(category.createdAt), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell className="text-right print:hidden">
                      <div className="flex items-center justify-end gap-2">
                        {!isTrash && (
                          <>
                            <Button variant="ghost" size="sm" asChild>
                              <Link href={`/dashboard/master/categories/${category.id}`}>
                                <FiEye className="h-4 w-4" />
                              </Link>
                            </Button>
                            <Button variant="ghost" size="sm" asChild>
                              <Link href={`/dashboard/master/categories/${category.id}/edit`}>
                                <FiEdit className="h-4 w-4" />
                              </Link>
                            </Button>
                          </>
                        )}
                        {isTrash && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setRestoreCategoryId(category.id)}
                            title="Restore category"
                            disabled={isPending}
                          >
                            <FiRotateCw className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteCategoryId(category.id)}
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
      {(initialPagination.totalPages > 1 || initialPagination.total > 0) && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4 print:hidden">
          <div className="flex flex-wrap items-center gap-4">
            <div className="text-sm text-muted-foreground">
              Showing {((initialPagination.page - 1) * initialPagination.limit) + 1} to{" "}
              {Math.min(initialPagination.page * initialPagination.limit, initialPagination.total)} of{" "}
              {initialPagination.total} categories
            </div>
            {renderLimitSelector()}
          </div>
          {renderPaginationButtons()}
        </div>
      )}


      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteCategoryId} onOpenChange={() => setDeleteCategoryId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isTrash ? "Delete Category Permanently" : "Move Category to Trash"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isTrash
                ? "This action cannot be undone. This will permanently delete the category and all associated data."
                : "This will move the category to trash. You can restore it later from the Trash tab."}
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
      <AlertDialog open={!!restoreCategoryId} onOpenChange={() => setRestoreCategoryId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore Category</AlertDialogTitle>
            <AlertDialogDescription>
              This will restore the category and make it active again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRestore}
              disabled={isPending}
            >
              {isPending ? "Restoring..." : "Restore Category"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!errorModalMsg} onOpenChange={() => setErrorModalMsg(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cannot Delete Category</AlertDialogTitle>
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

