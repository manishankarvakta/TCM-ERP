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
      {/* Search and Bulk Actions */}
      <div className="flex items-center gap-2">
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
              <TableHead className="w-16">Photo</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Parent Category</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created At</TableHead>
              <TableHead className="text-right">Actions</TableHead>
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
                    <TableCell>
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={(checked) => handleSelectCategory(category.id, checked as boolean)}
                        aria-label={`Select ${category.name}`}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="w-10 h-10 rounded border bg-muted overflow-hidden flex items-center justify-center">
                        {category.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={category.image} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <FiImage className="text-muted-foreground" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{category.name}</TableCell>
                    <TableCell>
                      {category.parent ? (
                        <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">
                          {category.parent.name}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {category.description || "-"}
                    </TableCell>
                    <TableCell>
                      {category.status === "trash" ? (
                        <Badge variant="destructive">Trash</Badge>
                      ) : category.status === "inactive" ? (
                        <Badge variant="secondary">Inactive</Badge>
                      ) : (
                        <Badge variant="default">Active</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(category.createdAt), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell className="text-right">
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
      {initialPagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {((initialPagination.page - 1) * initialPagination.limit) + 1} to{" "}
            {Math.min(initialPagination.page * initialPagination.limit, initialPagination.total)} of{" "}
            {initialPagination.total} categories
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const params = new URLSearchParams(searchParams.toString());
                params.set("page", String(Math.max(1, initialPagination.page - 1)));
                router.push(`/dashboard/master/categories?${params.toString()}`);
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
                router.push(`/dashboard/master/categories?${params.toString()}`);
              }}
              disabled={initialPagination.page === initialPagination.totalPages || isPending}
            >
              Next
            </Button>
          </div>
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

