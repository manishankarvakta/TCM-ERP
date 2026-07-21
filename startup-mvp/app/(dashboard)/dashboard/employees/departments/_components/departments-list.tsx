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
import { FiSearch, FiTrash2, FiX, FiCircle, FiCheck, FiMoreVertical, FiRotateCw } from "react-icons/fi";
import { trashDepartment, bulkUpdateDepartmentStatus } from "../_actions/department.action";
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
import { cn } from "@/lib/utils";

interface Department {
  id: string;
  name: string;
  description: string | null;
  status: string;
  isTrash: boolean;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface DepartmentsListProps {
  initialDepartments: Department[];
  initialPagination: Pagination;
  initialSearch: string;
  isTrash?: boolean;
  userId?: string;
  permissions?: {
    view: boolean;
    edit: boolean;
    moveToTrash: boolean;
  };
}

export default function DepartmentsList({
  initialDepartments = [],
  initialPagination,
  initialSearch,
  isTrash = false,
  userId,
  permissions,
}: DepartmentsListProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(initialSearch);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [restoreId, setRestoreId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
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
    router.push(`/dashboard/employees/departments?${params.toString()}`);
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    startTransition(async () => {
      const result = await trashDepartment(deleteId);
      if (result.success) {
        setDeleteId(null);
        toast({ title: "Success", description: "Department moved to trash" });
        router.refresh();
      } else {
        toast({ title: "Error", description: result.error || "Failed to delete department", variant: "destructive" });
      }
    });
  };

  const handleRestore = async () => {
    if (!restoreId) return;

    startTransition(async () => {
      const result = await bulkUpdateDepartmentStatus([restoreId], "restore");
      if (result.success) {
        setRestoreId(null);
        toast({ title: "Success", description: "Department restored successfully" });
        router.refresh();
      } else {
        toast({ title: "Error", description: result.error || "Failed to restore", variant: "destructive" });
      }
    });
  };

  const handleSelect = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedIds);
    if (checked) newSelected.add(id);
    else newSelected.delete(id);
    setSelectedIds(newSelected);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(initialDepartments.map((d) => d.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleBulkAction = async (action: "trash" | "active" | "inactive" | "restore") => {
    if (selectedIds.size === 0) return;

    const ids = Array.from(selectedIds);

    startTransition(async () => {
      const result = await bulkUpdateDepartmentStatus(ids, action);

      if (result.success) {
        setSelectedIds(new Set());
        toast({ title: "Success", description: `Bulk action completed successfully` });
        router.refresh();
      } else {
        toast({ title: "Error", description: result.error || "Failed to perform bulk action", variant: "destructive" });
      }
    });
  };

  const allSelected = initialDepartments.length > 0 && selectedIds.size === initialDepartments.length;

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
          {selectedIds.size > 0 && (
            <span className="text-sm text-muted-foreground whitespace-nowrap">
              {selectedIds.size} selected
            </span>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" disabled={isPending || selectedIds.size === 0}>
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
              <TableHead>Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {initialDepartments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  {isTrash ? "No trashed departments found" : "No departments found"}
                </TableCell>
              </TableRow>
            ) : (
              initialDepartments.map((item) => {
                const isSelected = selectedIds.has(item.id);
                return (
                  <TableRow key={item.id} className={cn(isSelected && "bg-muted/50")}>
                    <TableCell>
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={(checked) => handleSelect(item.id, checked as boolean)}
                      />
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">{item.name}</span>
                    </TableCell>
                    <TableCell className="max-w-xs truncate text-muted-foreground">
                      {item.description || "-"}
                    </TableCell>
                    <TableCell>
                      {item.isTrash ? (
                        <Badge variant="destructive">Trash</Badge>
                      ) : item.status === "inactive" ? (
                        <Badge variant="secondary">Inactive</Badge>
                      ) : (
                        <Badge variant="default" className="bg-emerald-500 hover:bg-emerald-600 text-white">Active</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {!isTrash && permissions?.edit && (
                          <Button variant="ghost" size="sm" asChild>
                            <Link href={`/dashboard/employees/departments?action=edit&id=${item.id}`}>
                              Edit
                            </Link>
                          </Button>
                        )}
                        {isTrash && permissions?.edit && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setRestoreId(item.id);
                              handleRestore();
                            }}
                            disabled={isPending}
                          >
                            <FiRotateCw className="h-4 w-4" />
                          </Button>
                        )}
                        {!isTrash && permissions?.moveToTrash && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteId(item.id)}
                            disabled={isPending}
                            className="text-destructive hover:text-destructive"
                          >
                            <FiTrash2 className="h-4 w-4" />
                          </Button>
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

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Move Department to Trash</AlertDialogTitle>
            <AlertDialogDescription>
              This will move the department to trash. You can restore it later from the Trash tab.
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
