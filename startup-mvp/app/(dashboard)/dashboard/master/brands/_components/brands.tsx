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
import { deleteBrand, bulkUpdateBrandStatus, deleteBrandsPermanently } from "../_actions/brand.action";
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

interface Brand {
  id: string;
  name: string;
  description: string | null;
  status: string;
  image?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface BrandsListClientProps {
  initialBrands: Brand[];
  initialPagination: Pagination;
  initialSearch: string;
  isTrash?: boolean;
}

export default function BrandsListClient({
  initialBrands,
  initialPagination,
  initialSearch,
  isTrash = false,
}: BrandsListClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(initialSearch);
  const [deleteBrandId, setDeleteBrandId] = useState<string | null>(null);
  const [restoreBrandId, setRestoreBrandId] = useState<string | null>(null);
  const [errorModalMsg, setErrorModalMsg] = useState<string | null>(null);
  const [selectedBrands, setSelectedBrands] = useState<Set<string>>(new Set());
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
    router.push(`/dashboard/master/brands?${params.toString()}`);
  };

  const handleSelectBrand = (brandId: string, selected: boolean) => {
    setSelectedBrands((prev) => {
      const newSet = new Set(prev);
      if (selected) {
        newSet.add(brandId);
      } else {
        newSet.delete(brandId);
      }
      return newSet;
    });
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedBrands(new Set(initialBrands.map((b) => b.id)));
    } else {
      setSelectedBrands(new Set());
    }
  };

  const handleDelete = async () => {
    if (!deleteBrandId) return;

    startTransition(async () => {
      if (isTrash) {
        const result = await deleteBrandsPermanently([deleteBrandId]);
        if (result.success) {
          setDeleteBrandId(null);
          toast({
            title: "Success",
            description: "Brand deleted permanently",
          });
          router.refresh();
        } else {
          setDeleteBrandId(null);
          if (result.error?.includes("in use by items")) {
            setErrorModalMsg(result.error);
          } else {
            toast({
              title: "Error",
              description: result.error || "Failed to delete brand",
              variant: "destructive",
            });
          }
        }
      } else {
        const result = await deleteBrand(deleteBrandId);
        if (result.success) {
          setDeleteBrandId(null);
          toast({
            title: "Success",
            description: "Brand moved to trash",
          });
          router.refresh();
        } else {
          toast({
            title: "Error",
            description: result.error || "Failed to delete brand",
            variant: "destructive",
          });
        }
      }
    });
  };

  const handleRestore = async () => {
    if (!restoreBrandId) return;

    startTransition(async () => {
      const result = await bulkUpdateBrandStatus([restoreBrandId], "active");
      if (result.success) {
        setRestoreBrandId(null);
        toast({
          title: "Success",
          description: "Brand restored successfully",
        });
        router.refresh();
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to restore brand",
          variant: "destructive",
        });
      }
    });
  };

  const handleBulkAction = (action: string) => {
    const brandIds = Array.from(selectedBrands);
    if (brandIds.length === 0) return;

    startTransition(async () => {
      let result;
      
      if (action === "activate") {
        result = await bulkUpdateBrandStatus(brandIds, "active");
      } else if (action === "deactivate") {
        result = await bulkUpdateBrandStatus(brandIds, "inactive");
      } else if (action === "trash") {
        result = await bulkUpdateBrandStatus(brandIds, "trash");
      } else if (action === "restore") {
        result = await bulkUpdateBrandStatus(brandIds, "active");
      } else if (action === "deletePermanently") {
        result = await deleteBrandsPermanently(brandIds);
      } else {
        return;
      }

      if (result.success) {
        setSelectedBrands(new Set());
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

  const allSelected = initialBrands.length > 0 && selectedBrands.size === initialBrands.length;
  const someSelected = selectedBrands.size > 0 && selectedBrands.size < initialBrands.length;

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

        {selectedBrands.size > 0 && (
          <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2 duration-200">
            <span className="text-sm text-muted-foreground">
              {selectedBrands.size} selected
            </span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  Bulk Actions
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {!isTrash ? (
                  <>
                    <DropdownMenuItem onClick={() => handleBulkAction("activate")}>
                      <FiCheck className="mr-2 h-4 w-4 text-emerald-500" />
                      Set Active
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleBulkAction("deactivate")}>
                      <FiCircle className="mr-2 h-4 w-4 text-amber-500" />
                      Set Inactive
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleBulkAction("trash")}
                      className="text-destructive focus:text-destructive"
                    >
                      <FiTrash2 className="mr-2 h-4 w-4" />
                      Move to Trash
                    </DropdownMenuItem>
                  </>
                ) : (
                  <>
                    <DropdownMenuItem onClick={() => handleBulkAction("restore")}>
                      <FiRotateCw className="mr-2 h-4 w-4 text-emerald-500" />
                      Restore Brands
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setBulkAction("deletePermanently")}
                      className="text-destructive focus:text-destructive"
                    >
                      <FiTrash2 className="mr-2 h-4 w-4" />
                      Delete Permanently
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>

      {/* Brands Table */}
      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={allSelected ? true : someSelected ? "indeterminate" : false}
                  onCheckedChange={handleSelectAll}
                />
              </TableHead>
              <TableHead className="w-16">Logo</TableHead>
              <TableHead>Brand Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="w-32">Status</TableHead>
              <TableHead className="w-48">Created At</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {initialBrands.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  No brands found.
                </TableCell>
              </TableRow>
            ) : (
              initialBrands.map((b) => (
                <TableRow key={b.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedBrands.has(b.id)}
                      onCheckedChange={(checked) =>
                        handleSelectBrand(b.id, !!checked)
                      }
                    />
                  </TableCell>
                  <TableCell>
                    {b.image ? (
                      <div className="h-8 w-8 rounded overflow-hidden border bg-muted">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={b.image}
                          alt={b.name}
                          className="h-full w-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="h-8 w-8 rounded border bg-muted flex items-center justify-center text-muted-foreground">
                        <FiImage className="h-4 w-4" />
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="font-medium">
                    <Link
                      href={`/dashboard/master/brands/${b.id}`}
                      className="hover:underline"
                    >
                      {b.name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground max-w-xs truncate">
                    {b.description || "—"}
                  </TableCell>
                  <TableCell>
                    {b.status === "trash" ? (
                      <Badge variant="destructive">Trash</Badge>
                    ) : b.status === "inactive" ? (
                      <Badge variant="secondary">Inactive</Badge>
                    ) : (
                      <Badge variant="default">Active</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {format(new Date(b.createdAt), "dd MMM yyyy, hh:mm a")}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <FiMoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/dashboard/master/brands/${b.id}`}>
                            <FiEye className="mr-2 h-4 w-4" />
                            View details
                          </Link>
                        </DropdownMenuItem>
                        {!isTrash ? (
                          <>
                            <DropdownMenuItem asChild>
                              <Link href={`/dashboard/master/brands/${b.id}/edit`}>
                                <FiEdit className="mr-2 h-4 w-4" />
                                Edit brand
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => setDeleteBrandId(b.id)}
                              className="text-destructive focus:text-destructive"
                            >
                              <FiTrash2 className="mr-2 h-4 w-4" />
                              Move to trash
                            </DropdownMenuItem>
                          </>
                        ) : (
                          <>
                            <DropdownMenuItem onClick={() => setRestoreBrandId(b.id)}>
                              <FiRotateCw className="mr-2 h-4 w-4 text-emerald-500" />
                              Restore Brand
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => setDeleteBrandId(b.id)}
                              className="text-destructive focus:text-destructive"
                            >
                              <FiTrash2 className="mr-2 h-4 w-4" />
                              Delete permanently
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
          <p className="text-sm text-muted-foreground">
            Showing Page {initialPagination.page} of {initialPagination.totalPages} ({initialPagination.total} total items)
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={initialPagination.page <= 1 || isPending}
              onClick={() => {
                const params = new URLSearchParams(searchParams.toString());
                params.set("page", String(initialPagination.page - 1));
                router.push(`/dashboard/master/brands?${params.toString()}`);
              }}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={initialPagination.page >= initialPagination.totalPages || isPending}
              onClick={() => {
                const params = new URLSearchParams(searchParams.toString());
                params.set("page", String(initialPagination.page + 1));
                router.push(`/dashboard/master/brands?${params.toString()}`);
              }}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Soft/Permanent Delete Confirmation Dialog */}
      <AlertDialog
        open={!!deleteBrandId}
        onOpenChange={(open) => !open && setDeleteBrandId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              {isTrash
                ? "This action cannot be undone. This will permanently delete the brand from the database."
                : "This will move the brand to the Trash. You can restore it later if needed."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
              disabled={isPending}
              className={cn(isTrash && "bg-destructive hover:bg-destructive/95")}
            >
              {isPending ? "Processing..." : isTrash ? "Delete Permanently" : "Move to Trash"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Restore Confirmation Dialog */}
      <AlertDialog
        open={!!restoreBrandId}
        onOpenChange={(open) => !open && setRestoreBrandId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore Brand</AlertDialogTitle>
            <AlertDialogDescription>
              This will restore the brand from the Trash and set its status to Active.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleRestore();
              }}
              disabled={isPending}
            >
              {isPending ? "Restoring..." : "Restore"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Delete Permanently Dialog */}
      <AlertDialog
        open={bulkAction === "deletePermanently"}
        onOpenChange={(open) => !open && setBulkAction(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the {selectedBrands.size} selected brands from the database.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleBulkAction("deletePermanently");
              }}
              disabled={isPending}
              className="bg-destructive hover:bg-destructive/95"
            >
              {isPending ? "Deleting..." : "Delete Permanently"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Error Modal (for Brands in Use) */}
      <AlertDialog
        open={!!errorModalMsg}
        onOpenChange={(open) => !open && setErrorModalMsg(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cannot Delete Brand</AlertDialogTitle>
            <AlertDialogDescription className="text-destructive font-medium pt-2">
              {errorModalMsg}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setErrorModalMsg(null)}>
              Ok
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
