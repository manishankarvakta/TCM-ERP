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
import { FiSearch, FiTrash2, FiX, FiCircle, FiCheck, FiMoreVertical, FiRotateCw, FiCalendar } from "react-icons/fi";
import { trashHoliday, bulkUpdateHolidayStatus } from "../_actions/holiday.action";
import ProtectedAction from "@/components/permissions/protected-action";
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

interface Holiday {
  id: string;
  name: string;
  date: Date;
  warehouseId: string | null;
  status: string;
  isTrash: boolean;
  warehouse?: {
    id: string;
    name: string;
  } | null;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface HolidaysListClientProps {
  initialHolidays: Holiday[];
  initialPagination: Pagination;
  initialSearch: string;
  isTrash?: boolean;
  userId?: string;
  permissions?: {
    view: boolean;
    edit: boolean;
    moveToTrash: boolean;
    deletePermanently: boolean;
  };
}

export default function HolidaysListClient({
  initialHolidays = [],
  initialPagination,
  initialSearch,
  isTrash = false,
  userId: providedUserId,
  permissions,
}: HolidaysListClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(initialSearch);
  const [deleteHolidayId, setDeleteHolidayId] = useState<string | null>(null);
  const [restoreHolidayId, setRestoreHolidayId] = useState<string | null>(null);
  const [selectedHolidays, setSelectedHolidays] = useState<Set<string>>(new Set());
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
    router.push(`/dashboard/hr/holidays?${params.toString()}`);
  };

  const handleDelete = async () => {
    if (!deleteHolidayId) return;

    startTransition(async () => {
      const result = await trashHoliday(deleteHolidayId);
      if (result.success) {
        setDeleteHolidayId(null);
        toast({
          title: "Success",
          description: "Holiday moved to trash",
        });
        router.refresh();
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to delete holiday",
          variant: "destructive",
        });
      }
    });
  };

  const handleRestore = async () => {
    if (!restoreHolidayId) return;

    startTransition(async () => {
      const result = await bulkUpdateHolidayStatus([restoreHolidayId], "restore");
      if (result.success) {
        setRestoreHolidayId(null);
        toast({
          title: "Success",
          description: "Holiday restored successfully",
        });
        router.refresh();
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to restore holiday",
          variant: "destructive",
        });
      }
    });
  };

  const handleSelectHoliday = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedHolidays);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedHolidays(newSelected);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedHolidays(new Set(initialHolidays.map((h) => h.id)));
    } else {
      setSelectedHolidays(new Set());
    }
  };

  const handleBulkAction = async (action: "trash" | "active" | "inactive" | "restore") => {
    if (selectedHolidays.size === 0) {
      toast({
        title: "No selection",
        description: "Please select at least one holiday",
        variant: "destructive",
      });
      return;
    }

    const holidayIds = Array.from(selectedHolidays);

    startTransition(async () => {
      const result = await bulkUpdateHolidayStatus(holidayIds, action);

      if (result.success) {
        setSelectedHolidays(new Set());
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

  const allSelected = initialHolidays.length > 0 && selectedHolidays.size === initialHolidays.length;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name..."
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

        <div className="flex items-center gap-2">
          {selectedHolidays.size > 0 && (
            <span className="text-sm text-muted-foreground whitespace-nowrap">
              {selectedHolidays.size} selected
            </span>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="outline" 
                size="sm" 
                disabled={isPending || selectedHolidays.size === 0}
              >
                <FiMoreVertical className="mr-2 h-4 w-4" />
                Bulk Actions
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {!isTrash ? (
                <>
                  <DropdownMenuItem onClick={() => handleBulkAction("trash")}>
                    <FiTrash2 className="mr-2 h-4 w-4" />
                    Move to Trash
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleBulkAction("active")}>
                    <FiCheck className="mr-2 h-4 w-4" />
                    Activate
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleBulkAction("inactive")}>
                    <FiCircle className="mr-2 h-4 w-4" />
                    Deactivate
                  </DropdownMenuItem>
                </>
              ) : (
                <DropdownMenuItem onClick={() => handleBulkAction("restore")}>
                  <FiCheck className="mr-2 h-4 w-4" />
                  Restore
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox checked={allSelected} onCheckedChange={handleSelectAll} />
              </TableHead>
              <TableHead>Holiday Name</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Branch</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {initialHolidays.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  {isTrash ? "No trashed holidays found" : "No holidays found"}
                </TableCell>
              </TableRow>
            ) : (
              initialHolidays.map((holiday) => {
                const isSelected = selectedHolidays.has(holiday.id);
                return (
                  <TableRow key={holiday.id} className={cn(isSelected && "bg-muted/50")}>
                    <TableCell>
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={(checked) => handleSelectHoliday(holiday.id, checked as boolean)}
                      />
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">{holiday.name}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 text-sm">
                        <FiCalendar className="h-4 w-4 text-muted-foreground" />
                        <span>{format(new Date(holiday.date), "PPP")}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {holiday.warehouse ? (
                        <span className="text-sm">{holiday.warehouse.name}</span>
                      ) : (
                        <Badge variant="outline" className="bg-primary/5">Global</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {holiday.isTrash ? (
                        <Badge variant="destructive">Trash</Badge>
                      ) : holiday.status === "inactive" ? (
                        <Badge variant="secondary">Inactive</Badge>
                      ) : (
                        <Badge variant="default">Active</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {!isTrash && (
                          <ProtectedAction
                            permissionKey="hr.holidays"
                            action="edit"
                            href={`/dashboard/hr/holidays/${holiday.id}`}
                            userId={providedUserId || undefined}
                            hasAccess={permissions?.edit}
                            buttonProps={{ title: "Edit Holiday" }}
                          />
                        )}
                        {isTrash && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setRestoreHolidayId(holiday.id);
                              handleRestore();
                            }}
                            disabled={isPending}
                          >
                            <FiRotateCw className="h-4 w-4" />
                          </Button>
                        )}
                        {!isTrash && (
                          <ProtectedAction
                            permissionKey="hr.holidays"
                            action="move-to-trash"
                            onClick={() => setDeleteHolidayId(holiday.id)}
                            userId={providedUserId || undefined}
                            hasAccess={permissions?.moveToTrash}
                            buttonProps={{
                              disabled: isPending,
                              className: "text-destructive hover:text-destructive",
                              title: "Move to trash",
                            }}
                          />
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

      {initialPagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Showing {((initialPagination.page - 1) * initialPagination.limit) + 1} to{" "}
            {Math.min(initialPagination.page * initialPagination.limit, initialPagination.total)} of{" "}
            {initialPagination.total} holidays
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={initialPagination.page === 1}
              onClick={() => {
                const params = new URLSearchParams(searchParams.toString());
                params.set("page", String(initialPagination.page - 1));
                router.push(`/dashboard/hr/holidays?${params.toString()}`);
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
                router.push(`/dashboard/hr/holidays?${params.toString()}`);
              }}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      <AlertDialog open={!!deleteHolidayId} onOpenChange={() => setDeleteHolidayId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Move Holiday to Trash</AlertDialogTitle>
            <AlertDialogDescription>
              This will move the holiday to trash. You can restore it later from the Trash tab.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isPending ? "Moving..." : "Move to Trash"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
