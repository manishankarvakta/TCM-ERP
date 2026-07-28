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
import { FiSearch, FiTrash2, FiX, FiCircle, FiCheck, FiMoreVertical, FiRotateCw, FiClock } from "react-icons/fi";
import { trashShift, bulkUpdateShiftStatus } from "../_actions/shift.action";
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

interface Shift {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  breakStartTime?: string | null;
  breakEndTime?: string | null;
  breakGraceMinutes?: number | null;
  breakLateAfter?: number | null;
  breakType?: string | null;
  breakDuration?: number | null;
  graceMinutes: number;
  lateAfter: number;
  halfDayAfter: number;
  otStartAfter: number;
  status: string;
  isTrash: boolean;
  createdAt: Date;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface ShiftsListClientProps {
  initialShifts: Shift[];
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

export default function ShiftsListClient({
  initialShifts = [],
  initialPagination,
  initialSearch,
  isTrash = false,
  userId: providedUserId,
  permissions,
}: ShiftsListClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(initialSearch);
  const [deleteShiftId, setDeleteShiftId] = useState<string | null>(null);
  const [restoreShiftId, setRestoreShiftId] = useState<string | null>(null);
  const [selectedShifts, setSelectedShifts] = useState<Set<string>>(new Set());
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
    router.push(`/dashboard/hr/shifts?${params.toString()}`);
  };

  const handleDelete = async () => {
    if (!deleteShiftId) return;

    startTransition(async () => {
      const result = await trashShift(deleteShiftId);
      if (result.success) {
        setDeleteShiftId(null);
        toast({
          title: "Success",
          description: "Shift moved to trash",
        });
        router.refresh();
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to delete shift",
          variant: "destructive",
        });
      }
    });
  };

  const handleRestore = async () => {
    if (!restoreShiftId) return;

    startTransition(async () => {
      const result = await bulkUpdateShiftStatus([restoreShiftId], "restore");
      if (result.success) {
        setRestoreShiftId(null);
        toast({
          title: "Success",
          description: "Shift restored successfully",
        });
        router.refresh();
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to restore shift",
          variant: "destructive",
        });
      }
    });
  };

  const handleSelectShift = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedShifts);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedShifts(newSelected);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedShifts(new Set(initialShifts.map((s) => s.id)));
    } else {
      setSelectedShifts(new Set());
    }
  };

  const handleBulkAction = async (action: "trash" | "active" | "inactive" | "restore") => {
    if (selectedShifts.size === 0) {
      toast({
        title: "No selection",
        description: "Please select at least one shift",
        variant: "destructive",
      });
      return;
    }

    const shiftIds = Array.from(selectedShifts);

    startTransition(async () => {
      const result = await bulkUpdateShiftStatus(shiftIds, action);

      if (result.success) {
        setSelectedShifts(new Set());
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

  // Convert "09:00" to "09:00 AM" formatting function
  const formatTime = (timeString: string) => {
    try {
      const [hours, minutes] = timeString.split(":");
      const date = new Date();
      date.setHours(parseInt(hours, 10));
      date.setMinutes(parseInt(minutes, 10));
      return format(date, "h:mm a");
    } catch {
      return timeString;
    }
  };

  const allSelected = initialShifts.length > 0 && selectedShifts.size === initialShifts.length;

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
          {selectedShifts.size > 0 && (
            <span className="text-sm text-muted-foreground whitespace-nowrap">
              {selectedShifts.size} selected
            </span>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="outline" 
                size="sm" 
                disabled={isPending || selectedShifts.size === 0}
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
              <TableHead>Shift Name</TableHead>
              <TableHead>Timing</TableHead>
              <TableHead>Break Info</TableHead>
              <TableHead>Policies</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {initialShifts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  {isTrash ? "No trashed shifts found" : "No shifts found"}
                </TableCell>
              </TableRow>
            ) : (
              initialShifts.map((shift) => {
                const isSelected = selectedShifts.has(shift.id);
                return (
                  <TableRow key={shift.id} className={cn(isSelected && "bg-muted/50")}>
                    <TableCell>
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={(checked) => handleSelectShift(shift.id, checked as boolean)}
                      />
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">{shift.name}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 text-sm">
                        <FiClock className="h-4 w-4 text-muted-foreground" />
                        <span>{formatTime(shift.startTime)} - {formatTime(shift.endTime)}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {shift.breakType === "FIXED" ? (
                        <div className="flex flex-col gap-0.5 text-xs text-muted-foreground">
                          <span className="font-semibold text-foreground text-sm flex items-center gap-1">
                            <FiClock className="h-3.5 w-3.5 text-primary" />
                            Fixed Deduction
                          </span>
                          <span>Duration: {shift.breakDuration ?? 60}m</span>
                        </div>
                      ) : (shift.breakType === "TRACKED" || (!shift.breakType && shift.breakStartTime && shift.breakEndTime)) ? (
                        <div className="flex flex-col gap-0.5 text-xs text-muted-foreground">
                          <span className="font-semibold text-foreground text-sm flex items-center gap-1">
                            <FiClock className="h-3.5 w-3.5 text-primary" />
                            {shift.breakStartTime && shift.breakEndTime 
                              ? `${formatTime(shift.breakStartTime)} - ${formatTime(shift.breakEndTime)}`
                              : "No Time Configured"
                            }
                          </span>
                          <span>Grace: {shift.breakGraceMinutes ?? 0}m | Late: {shift.breakLateAfter ?? 15}m</span>
                          {shift.breakDuration && shift.breakDuration > 0 ? (
                            <span>Fallback: {shift.breakDuration}m</span>
                          ) : null}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">No Break configured</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                        <span>Late after: {shift.lateAfter} mins</span>
                        <span>Half-day after: {shift.halfDayAfter} mins</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {shift.isTrash ? (
                        <Badge variant="destructive">Trash</Badge>
                      ) : shift.status === "inactive" ? (
                        <Badge variant="secondary">Inactive</Badge>
                      ) : (
                        <Badge variant="default">Active</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {!isTrash && (
                          <ProtectedAction
                            permissionKey="hr.shifts"
                            action="edit"
                            href={`/dashboard/hr/shifts/${shift.id}`}
                            userId={providedUserId || undefined}
                            hasAccess={permissions?.edit}
                            buttonProps={{ title: "Edit Shift" }}
                          />
                        )}
                        {isTrash && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setRestoreShiftId(shift.id);
                              handleRestore();
                            }}
                            disabled={isPending}
                          >
                            <FiRotateCw className="h-4 w-4" />
                          </Button>
                        )}
                        {!isTrash && (
                          <ProtectedAction
                            permissionKey="hr.shifts"
                            action="move-to-trash"
                            onClick={() => setDeleteShiftId(shift.id)}
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
            {initialPagination.total} shifts
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={initialPagination.page === 1}
              onClick={() => {
                const params = new URLSearchParams(searchParams.toString());
                params.set("page", String(initialPagination.page - 1));
                router.push(`/dashboard/hr/shifts?${params.toString()}`);
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
                router.push(`/dashboard/hr/shifts?${params.toString()}`);
              }}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      <AlertDialog open={!!deleteShiftId} onOpenChange={() => setDeleteShiftId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Move Shift to Trash</AlertDialogTitle>
            <AlertDialogDescription>
              This will move the shift to trash. You can restore it later from the Trash tab.
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
