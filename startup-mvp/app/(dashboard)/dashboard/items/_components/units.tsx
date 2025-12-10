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
import { FiSearch, FiEdit, FiTrash2, FiEye, FiRotateCw, FiCheck, FiCircle, FiMoreVertical } from "react-icons/fi";
import { deleteUnit, bulkUpdateUnitStatus, deleteUnitsPermanently } from "../_actions/unit.action";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface Unit {
  id: string;
  symbol: string;
  details: string;
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
  initialUnits = [],
  initialPagination,
  initialSearch,
  isTrash = false,
}: UnitsListClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(initialSearch);
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
    const tab = searchParams.get("tab") || "all";
    if (tab) {
      params.set("tab", tab);
    }
    router.push(`/dashboard/items/units?${params.toString()}`);
  };

  const handleDelete = async (unitId: string) => {
    console.log("handleDelete called with unitId:", unitId);
    startTransition(async () => {
      try {
        console.log("Calling deleteUnit server action...");
        const result = await deleteUnit(unitId);
        console.log("deleteUnit result:", result);
        if (result.success) {
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
      } catch (error) {
        console.error("Error in handleDelete:", error);
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to delete unit",
          variant: "destructive",
        });
      }
    });
  };

  const handleRestore = async (unitId: string) => {
    startTransition(async () => {
      try {
        const result = await bulkUpdateUnitStatus([unitId], "active");
        if (result.success) {
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
      } catch (error) {
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to restore unit",
          variant: "destructive",
        });
      }
    });
  };

  const handleDeletePermanently = async (unitId: string) => {
    console.log("handleDeletePermanently called with unitId:", unitId);
    startTransition(async () => {
      try {
        console.log("Calling deleteUnitsPermanently server action...");
        const result = await deleteUnitsPermanently([unitId]);
        console.log("deleteUnitsPermanently result:", result);
        if (result.success) {
          const count = ('count' in result && typeof result.count === 'number') ? result.count : 1;
          toast({
            title: "Success",
            description: count > 0 ? "Unit deleted permanently" : "Unit deletion completed",
          });
          router.refresh();
        } else {
          toast({
            title: "Error",
            description: result.error || "Failed to delete unit",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error("Error in handleDeletePermanently:", error);
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to delete unit",
          variant: "destructive",
        });
      }
    });
  };

  const handleSelectUnit = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedUnits);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedUnits(newSelected);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedUnits(new Set(initialUnits.map((unit) => unit.id)));
    } else {
      setSelectedUnits(new Set());
    }
  };

  const handleBulkAction = async (action: string) => {
    console.log("handleBulkAction called with action:", action, "selectedUnits:", Array.from(selectedUnits));
    if (selectedUnits.size === 0) {
      toast({
        title: "No selection",
        description: "Please select at least one unit",
        variant: "destructive",
      });
      return;
    }

    const unitIds = Array.from(selectedUnits);
    console.log("Processing bulk action for unitIds:", unitIds);

    startTransition(async () => {
      try {
        let result;
        
        if (action === "trash") {
          console.log("Calling bulkUpdateUnitStatus with trash...");
          result = await bulkUpdateUnitStatus(unitIds, "trash");
        } else if (action === "active") {
          console.log("Calling bulkUpdateUnitStatus with active...");
          result = await bulkUpdateUnitStatus(unitIds, "active");
        } else if (action === "inactive") {
          console.log("Calling bulkUpdateUnitStatus with inactive...");
          result = await bulkUpdateUnitStatus(unitIds, "inactive");
        } else if (action === "restore") {
          console.log("Calling bulkUpdateUnitStatus with active (restore)...");
          result = await bulkUpdateUnitStatus(unitIds, "active");
        } else if (action === "delete-permanently") {
          console.log("Calling deleteUnitsPermanently...");
          result = await deleteUnitsPermanently(unitIds);
        } else {
          console.log("Unknown action:", action);
          return;
        }

        console.log("Bulk action result:", result);

        if (result.success) {
          setSelectedUnits(new Set());
          setBulkAction(null);
          const warning = ('warning' in result && typeof result.warning === 'string') ? result.warning : undefined;
          const count = ('count' in result && typeof result.count === 'number') ? result.count : undefined;
          
          // Show appropriate success message based on action
          let successMessage = "Bulk action completed successfully";
          if (action === "trash") {
            successMessage = `${unitIds.length} unit(s) moved to trash`;
          } else if (action === "active") {
            successMessage = `${unitIds.length} unit(s) activated`;
          } else if (action === "inactive") {
            successMessage = `${unitIds.length} unit(s) deactivated`;
          } else if (action === "restore") {
            successMessage = `${unitIds.length} unit(s) restored`;
          } else if (action === "delete-permanently") {
            successMessage = count !== undefined ? `${count} unit(s) deleted permanently` : `${unitIds.length} unit(s) deleted permanently`;
          }
          
          toast({
            title: warning ? "Partial Success" : "Success",
            description: warning || successMessage,
          });
          router.refresh();
        } else {
          toast({
            title: "Error",
            description: result.error || "Failed to perform bulk action",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error("Error in handleBulkAction:", error);
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to perform bulk action",
          variant: "destructive",
        });
      }
    });
  };

  const allSelected = initialUnits.length > 0 && selectedUnits.size === initialUnits.length;

  return (
    <div className="space-y-4">
      {/* Search and Bulk Actions */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 max-w-sm">
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search units..."
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
        {/* Bulk Actions Dropdown - Always visible on the right */}
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
                    onClick={() => handleBulkAction("delete-permanently")}
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
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={handleSelectAll}
                  aria-label="Select all units"
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
                    <TableCell className="text-muted-foreground">
                      {unit.details || "-"}
                    </TableCell>
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
                        {isTrash ? (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRestore(unit.id)}
                              disabled={isPending}
                              title="Restore"
                            >
                              <FiRotateCw className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeletePermanently(unit.id)}
                              disabled={isPending}
                              title="Delete Permanently"
                              className="text-destructive hover:text-destructive"
                            >
                              <FiTrash2 className="h-4 w-4" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button variant="ghost" size="sm" asChild title="Edit">
                              <Link href={`/dashboard/items/units/${unit.id}`}>
                                <FiEdit className="h-4 w-4" />
                              </Link>
                            </Button>
                            <Button variant="ghost" size="sm" asChild title="View Details">
                              <Link href={`/dashboard/items/units/details?id=${unit.id}`}>
                                <FiEye className="h-4 w-4" />
                              </Link>
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(unit.id)}
                              disabled={isPending}
                              title="Move to Trash"
                              className="text-destructive hover:text-destructive"
                            >
                              <FiTrash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
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
            {initialPagination.total} units
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
                router.push(`/dashboard/items/units?${params.toString()}`);
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
                router.push(`/dashboard/items/units?${params.toString()}`);
              }}
            >
              Next
            </Button>
          </div>
        </div>
      )}

    </div>
  );
}

