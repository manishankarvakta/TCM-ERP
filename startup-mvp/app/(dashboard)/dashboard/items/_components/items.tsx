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
import { FiSearch, FiEdit, FiTrash2, FiX, FiCircle, FiCheck, FiMoreVertical, FiRotateCw } from "react-icons/fi";
import { deleteUnit, bulkUpdateUnitStatus, deleteUnitsPermanently } from "../_actions/unit.action";
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

interface Unit {
  id: string;
  details: string;
  symbol: string;
  status: string;
  createdBy: string;
  creator: {
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

interface UnitsListClientProps {
  initialUnits: Unit[];
  initialPagination: Pagination;
  initialSearch: string;
  isTrash?: boolean;
}

export default function UnitsListClient({
  initialUnits,
  initialPagination,
  initialSearch,
  isTrash = false,
}: UnitsListClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(initialSearch);
  const [deleteUnitId, setDeleteUnitId] = useState<string | null>(null);
  const [restoreUnitId, setRestoreUnitId] = useState<string | null>(null);
  const [selectedUnits, setSelectedUnits] = useState<Set<string>>(new Set());
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
    // Preserve tab parameter
    const tab = searchParams.get("tab") || "all";
    if (tab) {
      params.set("tab", tab);
    }
    router.push(`/dashboard/items/units?${params.toString()}`);
  };

  const handleDelete = async () => {
    if (!deleteUnitId) return;

    startTransition(async () => {
      const result = await deleteUnit(deleteUnitId);
      if (result.success) {
        setDeleteUnitId(null);
        toast({
          title: "Success",
          description: "Unit moved to trash",
        });
        router.refresh();
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to delete unit",
          variant: "destructive",
        });
      }
    });
  };

  const handleRestore = async () => {
    if (!restoreUnitId) return;

    startTransition(async () => {
      const result = await bulkUpdateUnitStatus([restoreUnitId], "active");
      if (result.success) {
        setRestoreUnitId(null);
        toast({
          title: "Success",
          description: "Unit restored successfully",
        });
        router.refresh();
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to restore unit",
          variant: "destructive",
        });
      }
    });
  };

  const handleSelectUnit = (unitId: string, checked: boolean) => {
    setSelectedUnits((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(unitId);
      } else {
        next.delete(unitId);
      }
      return next;
    });
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedUnits(new Set(initialUnits.map((u) => u.id)));
    } else {
      setSelectedUnits(new Set());
    }
  };

  const handleBulkAction = async (action: string) => {
    if (selectedUnits.size === 0) {
      toast({
        title: "No selection",
        description: "Please select at least one unit",
        variant: "destructive",
      });
      return;
    }

    const unitIds = Array.from(selectedUnits);

    startTransition(async () => {
      let result;
      
      if (action === "trash") {
        result = await bulkUpdateUnitStatus(unitIds, "trash");
      } else if (action === "active") {
        result = await bulkUpdateUnitStatus(unitIds, "active");
      } else if (action === "inactive") {
        result = await bulkUpdateUnitStatus(unitIds, "inactive");
      } else if (action === "restore") {
        result = await bulkUpdateUnitStatus(unitIds, "active");
      } else if (action === "delete-permanently") {
        result = await deleteUnitsPermanently(unitIds);
      } else {
        return;
      }

      if (result.success) {
        setSelectedUnits(new Set());
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

  const allSelected = initialUnits.length > 0 && selectedUnits.size === initialUnits.length;
  const someSelected = selectedUnits.size > 0 && selectedUnits.size < initialUnits.length;

  return (
    <div className="space-y-4">
      {/* Search and Bulk Actions */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by symbol or details..."
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
          {selectedUnits.size > 0 && (
            <span className="text-sm text-muted-foreground whitespace-nowrap">
              {selectedUnits.size} selected
            </span>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="outline" 
                size="sm" 
                disabled={isPending || selectedUnits.size === 0}
              >
                <FiMoreVertical className="mr-2 h-4 w-4" />
                Bulk Actions
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {!isTrash ? (
                <>
                  <DropdownMenuItem
                    onClick={() => {
                      setBulkAction("trash");
                      handleBulkAction("trash");
                    }}
                    disabled={selectedUnits.size === 0}
                  >
                    <FiTrash2 className="mr-2 h-4 w-4" />
                    Move to Trash
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      setBulkAction("active");
                      handleBulkAction("active");
                    }}
                    disabled={selectedUnits.size === 0}
                  >
                    <FiCheck className="mr-2 h-4 w-4" />
                    Activate
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      setBulkAction("inactive");
                      handleBulkAction("inactive");
                    }}
                    disabled={selectedUnits.size === 0}
                  >
                    <FiCircle className="mr-2 h-4 w-4" />
                    Deactivate
                  </DropdownMenuItem>
                </>
              ) : (
                <>
                  <DropdownMenuItem
                    onClick={() => {
                      setBulkAction("restore");
                      handleBulkAction("restore");
                    }}
                    disabled={selectedUnits.size === 0}
                  >
                    <FiCheck className="mr-2 h-4 w-4" />
                    Restore
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      setBulkAction("delete-permanently");
                      handleBulkAction("delete-permanently");
                    }}
                    className="text-destructive"
                    disabled={selectedUnits.size === 0}
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
              <TableHead>Symbol</TableHead>
              <TableHead>Details</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created By</TableHead>
              <TableHead>Created At</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {initialUnits.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  {isTrash ? "No trashed units found" : "No units found"}
                </TableCell>
              </TableRow>
            ) : (
              initialUnits.map((unit) => {
                const isSelected = selectedUnits.has(unit.id);
                const unitStatus = unit.status || "active";
                
                return (
                  <TableRow key={unit.id} className={cn(isSelected && "bg-muted/50")}>
                    <TableCell>
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={(checked) => handleSelectUnit(unit.id, checked as boolean)}
                        aria-label={`Select ${unit.symbol}`}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{unit.symbol}</TableCell>
                    <TableCell>{unit.details}</TableCell>
                    <TableCell>
                      {unitStatus === "trash" ? (
                        <Badge variant="destructive">Trash</Badge>
                      ) : unitStatus === "inactive" ? (
                        <Badge variant="secondary">Inactive</Badge>
                      ) : (
                        <Badge variant="default">Active</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {unit.creator.name || unit.creator.email}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(unit.createdAt), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {!isTrash && (
                          <>
                            <Button variant="ghost" size="sm" asChild>
                              <Link href={`/dashboard/items/units/details?id=${unit.id}`}>View</Link>
                            </Button>
                            <Button variant="ghost" size="sm" asChild>
                              <Link href={`/dashboard/items/units/${unit.id}`}>
                                <FiEdit className="h-4 w-4" />
                              </Link>
                            </Button>
                          </>
                        )}
                        {isTrash && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setRestoreUnitId(unit.id)}
                            className="text-green-600 hover:text-green-700"
                            title="Restore unit"
                            disabled={isPending}
                          >
                            <FiRotateCw className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteUnitId(unit.id)}
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
            of {initialPagination.total} units
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
                router.push(`/dashboard/items/units?${params.toString()}`);
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
                router.push(`/dashboard/items/units?${params.toString()}`);
              }}
              disabled={initialPagination.page === initialPagination.totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Restore Confirmation Dialog */}
      <AlertDialog open={!!restoreUnitId} onOpenChange={() => setRestoreUnitId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore Unit</AlertDialogTitle>
            <AlertDialogDescription>
              This will restore the unit and make it active again. You can use it normally after restoration.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRestore}
              disabled={isPending}
              className="bg-green-600 text-white hover:bg-green-700"
            >
              {isPending ? "Restoring..." : "Restore Unit"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteUnitId} onOpenChange={() => setDeleteUnitId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isTrash ? "Delete Unit Permanently" : "Move Unit to Trash"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isTrash
                ? "This action cannot be undone. This will permanently delete the unit and all associated data."
                : "This will move the unit to trash. You can restore it later from the Trash tab."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (isTrash && deleteUnitId) {
                  const result = await deleteUnitsPermanently([deleteUnitId]);
                  if (result.success) {
                    setDeleteUnitId(null);
                    toast({
                      title: "Success",
                      description: "Unit deleted permanently",
                    });
                    router.refresh();
                  } else {
                    toast({
                      title: "Error",
                      description: result.error || "Failed to delete unit",
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

