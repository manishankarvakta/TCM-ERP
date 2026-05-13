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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Link from "next/link";
import { FiSearch, FiEdit, FiTrash2, FiX, FiCircle, FiCheck, FiMoreVertical, FiEye, FiRotateCw, FiImage } from "react-icons/fi";
import { deleteEmployee, bulkUpdateEmployeeStatus, deleteEmployeesPermanently } from "../_actions/employee.action";
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

interface Employee {
  id: string;
  name: string;
  employeeCode: string | null;
  email: string | null;
  phone: string | null;
  userId: string | null;
  user: {
    id: string;
    name: string | null;
    email: string;
  } | null;
  status: string;
  photo: string | null;
  designation: string | null;
  department: string | null;
  salary: any | null;
  joiningDate: Date | null;
  gender: string | null;
  dateOfBirth: Date | null;
  nationalId: string | null;
  address: any | null;
  emergencyContact: any | null;
  warehouseId: string | null;
  salaryPayableAccount: {
    id: string;
    code: string;
    name: string;
  } | null;
  advanceAccount: {
    id: string;
    code: string;
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

interface EmployeesListClientProps {
  initialEmployees: Employee[];
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

export default function EmployeesListClient({
  initialEmployees = [],
  initialPagination,
  initialSearch,
  isTrash = false,
  userId: providedUserId,
  permissions,
}: EmployeesListClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(initialSearch);
  const [deleteEmployeeId, setDeleteEmployeeId] = useState<string | null>(null);
  const [restoreEmployeeId, setRestoreEmployeeId] = useState<string | null>(null);
  const [selectedEmployees, setSelectedEmployees] = useState<Set<string>>(new Set());
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
    router.push(`/dashboard/employees?${params.toString()}`);
  };

  const handleDelete = async () => {
    if (!deleteEmployeeId) return;

    startTransition(async () => {
      const result = await deleteEmployee(deleteEmployeeId);
      if (result.success) {
        setDeleteEmployeeId(null);
        toast({
          title: "Success",
          description: "Employee moved to trash",
        });
        router.refresh();
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to delete employee",
          variant: "destructive",
        });
      }
    });
  };

  const handleRestore = async () => {
    if (!restoreEmployeeId) return;

    startTransition(async () => {
      const result = await bulkUpdateEmployeeStatus([restoreEmployeeId], "active");
      if (result.success) {
        setRestoreEmployeeId(null);
        toast({
          title: "Success",
          description: "Employee restored successfully",
        });
        router.refresh();
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to restore employee",
          variant: "destructive",
        });
      }
    });
  };

  const handleSelectEmployee = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedEmployees);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedEmployees(newSelected);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedEmployees(new Set(initialEmployees.map((employee) => employee.id)));
    } else {
      setSelectedEmployees(new Set());
    }
  };

  const handleBulkAction = async (action: string) => {
    if (selectedEmployees.size === 0) {
      toast({
        title: "No selection",
        description: "Please select at least one employee",
        variant: "destructive",
      });
      return;
    }

    const employeeIds = Array.from(selectedEmployees);

    startTransition(async () => {
      let result;
      
      if (action === "trash") {
        result = await bulkUpdateEmployeeStatus(employeeIds, "trash");
      } else if (action === "active") {
        result = await bulkUpdateEmployeeStatus(employeeIds, "active");
      } else if (action === "inactive") {
        result = await bulkUpdateEmployeeStatus(employeeIds, "inactive");
      } else if (action === "restore") {
        result = await bulkUpdateEmployeeStatus(employeeIds, "active");
      } else if (action === "delete-permanently") {
        result = await deleteEmployeesPermanently(employeeIds);
      } else {
        return;
      }

      if (result.success) {
        setSelectedEmployees(new Set());
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

  const getInitials = (name: string, email: string | null) => {
    if (name) {
      return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    return email ? email[0].toUpperCase() : "E";
  };

  const allSelected = initialEmployees.length > 0 && selectedEmployees.size === initialEmployees.length;

  return (
    <div className="space-y-4">
      {/* Search and Bulk Actions */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or code..."
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
          {selectedEmployees.size > 0 && (
            <span className="text-sm text-muted-foreground whitespace-nowrap">
              {selectedEmployees.size} selected
            </span>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="outline" 
                size="sm" 
                disabled={isPending || selectedEmployees.size === 0}
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
                    disabled={selectedEmployees.size === 0}
                  >
                    <FiTrash2 className="mr-2 h-4 w-4" />
                    Move to Trash
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleBulkAction("active")}
                    disabled={selectedEmployees.size === 0}
                  >
                    <FiCheck className="mr-2 h-4 w-4" />
                    Activate
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleBulkAction("inactive")}
                    disabled={selectedEmployees.size === 0}
                  >
                    <FiCircle className="mr-2 h-4 w-4" />
                    Deactivate
                  </DropdownMenuItem>
                </>
              ) : (
                <>
                  <DropdownMenuItem
                    onClick={() => handleBulkAction("restore")}
                    disabled={selectedEmployees.size === 0}
                  >
                    <FiCheck className="mr-2 h-4 w-4" />
                    Restore
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleBulkAction("delete-permanently")}
                    className="text-destructive"
                    disabled={selectedEmployees.size === 0}
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
              <TableHead className="w-16 text-center"><FiImage className="mx-auto" /></TableHead>
              <TableHead>Code & Name</TableHead>
              <TableHead>Designation & Dept</TableHead>
              <TableHead>Email & Phone</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Joined At</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
              {initialEmployees.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    {isTrash ? "No trashed employees found" : "No employees found"}
                  </TableCell>
                </TableRow>
            ) : (
              initialEmployees.map((employee) => {
                const isSelected = selectedEmployees.has(employee.id);
                const employeeStatus = employee.status || "active";
                
                return (
                  <TableRow key={employee.id} className={cn(isSelected && "bg-muted/50")}>
                    <TableCell>
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={(checked) => handleSelectEmployee(employee.id, checked as boolean)}
                        aria-label={`Select ${employee.name}`}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="w-10 h-10 rounded border bg-muted overflow-hidden flex items-center justify-center mx-auto">
                        {employee.photo ? (
                          <img src={employee.photo} alt={employee.name} className="w-full h-full object-cover" />
                        ) : (
                          <FiImage className="text-muted-foreground" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium text-foreground">{employee.name}</span>
                        <span className="text-xs font-mono text-muted-foreground uppercase">{employee.employeeCode || "-"}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col text-sm">
                        <span className="font-medium">{employee.designation || "-"}</span>
                        <span className="text-xs text-muted-foreground">{employee.department || "-"}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col text-sm">
                        <span className="text-foreground">{employee.email || "-"}</span>
                        <span className="text-xs text-muted-foreground">{employee.phone || "-"}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {employeeStatus === "trash" ? (
                        <Badge variant="destructive">Trash</Badge>
                      ) : employeeStatus === "inactive" ? (
                        <Badge variant="secondary">Inactive</Badge>
                      ) : (
                        <Badge variant="default">Active</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {employee.joiningDate ? format(new Date(employee.joiningDate), "MMM d, yyyy") : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {!isTrash && (
                          <>
                            <ProtectedAction
                              permissionKey="peoples.employees"
                              action="edit"
                              href={`/dashboard/employees/${employee.id}`}
                              userId={providedUserId || undefined}
                              hasAccess={permissions?.edit}
                              buttonProps={{ title: "Edit Employee" }}
                            />
                            <ProtectedAction
                              permissionKey="peoples.employees"
                              action="view"
                              href={`/dashboard/employees/details?id=${employee.id}`}
                              userId={providedUserId || undefined}
                              hasAccess={permissions?.view}
                              buttonProps={{ title: "View Details" }}
                            />
                          </>
                        )}
                        {isTrash && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setRestoreEmployeeId(employee.id);
                              handleRestore();
                            }}
                            disabled={isPending}
                          >
                            <FiRotateCw className="h-4 w-4" />
                          </Button>
                        )}
                        <ProtectedAction
                          permissionKey="peoples.employees"
                          action={isTrash ? "delete-permanently" : "move-to-trash"}
                          onClick={() => setDeleteEmployeeId(employee.id)}
                          userId={providedUserId || undefined}
                          hasAccess={isTrash ? permissions?.deletePermanently : permissions?.moveToTrash}
                          buttonProps={{
                            disabled: isPending,
                            className: "text-destructive hover:text-destructive",
                            title: isTrash ? "Delete permanently" : "Move to trash",
                          }}
                        />
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
            {initialPagination.total} employees
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
                router.push(`/dashboard/employees?${params.toString()}`);
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
                router.push(`/dashboard/employees?${params.toString()}`);
              }}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteEmployeeId} onOpenChange={() => setDeleteEmployeeId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isTrash ? "Delete Employee Permanently" : "Move Employee to Trash"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isTrash
                ? "This action cannot be undone. This will permanently delete the employee and all associated data."
                : "This will move the employee to trash. You can restore it later from the Trash tab."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (isTrash && deleteEmployeeId) {
                  const result = await deleteEmployeesPermanently([deleteEmployeeId]);
                  if (result.success) {
                    setDeleteEmployeeId(null);
                    toast({
                      title: "Success",
                      description: "Employee deleted permanently",
                    });
                    router.refresh();
                  } else {
                    toast({
                      title: "Error",
                      description: result.error || "Failed to delete employee",
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

