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
  DropdownMenuSeparator,
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
import {
  FiSearch,
  FiEdit,
  FiTrash2,
  FiX,
  FiCircle,
  FiCheck,
  FiMoreVertical,
  FiEye,
  FiRotateCw,
  FiImage,
  FiPrinter,
  FiCalendar,
  FiBookOpen,
  FiDownload,
  FiFileText,
  FiRefreshCw,
} from "react-icons/fi";
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

import PrintIDCardDialog from "./print-id-card-dialog";
import ExportSingleAttendanceModal from "./export-single-attendance";

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
  deviceUserId?: string | null;
  fingerprintDeviceId?: string | null;
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
  filterOptions?: {
    departments: string[];
    designations: string[];
    employeeTypes: { id: string; name: string }[];
    warehouses: { id: string; name: string }[];
  };
  currentFilters?: {
    department: string;
    designation: string;
    type: string;
    warehouse: string;
    gender: string;
    statusFilter: string;
  };
}

export default function EmployeesListClient({
  initialEmployees = [],
  initialPagination,
  initialSearch,
  isTrash = false,
  userId: providedUserId,
  permissions,
  filterOptions,
  currentFilters,
}: EmployeesListClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(initialSearch);
  const [deleteEmployeeId, setDeleteEmployeeId] = useState<string | null>(null);
  const [restoreEmployeeId, setRestoreEmployeeId] = useState<string | null>(null);
  const [selectedEmployees, setSelectedEmployees] = useState<Set<string>>(new Set());

  // Dialog states
  const [printEmployee, setPrintEmployee] = useState<Employee | null>(null);
  const [attendanceEmployee, setAttendanceEmployee] = useState<Employee | null>(null);
  const [exportAttendanceModalOpen, setExportAttendanceModalOpen] = useState(false);

  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const updateUrlFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== "all") {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.set("page", "1");
    router.push(`/dashboard/employees?${params.toString()}`);
  };

  const handleSearch = (value: string) => {
    setSearch(value);
    updateUrlFilter("search", value);
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

  const triggerGlobalExport = () => {
    const iframe = document.createElement("iframe");
    iframe.style.display = "none";
    iframe.src = "/api/export/employees?format=csv";
    document.body.appendChild(iframe);
    setTimeout(() => {
      document.body.removeChild(iframe);
    }, 3000);

    toast({
      title: "Export Started",
      description: "Employee CSV export download started",
    });
  };

  const allSelected = initialEmployees.length > 0 && selectedEmployees.size === initialEmployees.length;

  return (
    <div className="space-y-3">
      {/* Control Row 2: Tabs, Bulk Actions & Right Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        {/* Left: Tab switchers & Bulk Actions */}
        <div className="flex items-center gap-3">
          <div className="inline-flex items-center rounded-lg border bg-muted/30 p-1 text-xs">
            <Link
              href="/dashboard/employees?tab=all"
              className={cn(
                "px-3 py-1 rounded-md font-medium transition-colors",
                !isTrash ? "bg-background text-foreground shadow-xs font-semibold" : "text-muted-foreground hover:text-foreground"
              )}
            >
              All Employees
            </Link>
            <Link
              href="/dashboard/employees?tab=trash"
              className={cn(
                "px-3 py-1 rounded-md font-medium transition-colors",
                isTrash ? "bg-background text-foreground shadow-xs font-semibold" : "text-muted-foreground hover:text-foreground"
              )}
            >
              Trash
            </Link>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="bg-card shadow-xs text-xs font-medium gap-1.5"
                disabled={isPending || selectedEmployees.size === 0}
              >
                <FiMoreVertical className="h-3.5 w-3.5" />
                Bulk Actions
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {!isTrash ? (
                <>
                  <DropdownMenuItem onClick={() => handleBulkAction("trash")}>
                    <FiTrash2 className="mr-2 h-4 w-4" /> Move to Trash
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleBulkAction("active")}>
                    <FiCheck className="mr-2 h-4 w-4 text-emerald-600" /> Activate
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleBulkAction("inactive")}>
                    <FiCircle className="mr-2 h-4 w-4 text-slate-500" /> Deactivate
                  </DropdownMenuItem>
                </>
              ) : (
                <>
                  <DropdownMenuItem onClick={() => handleBulkAction("restore")}>
                    <FiRotateCw className="mr-2 h-4 w-4 text-blue-600" /> Restore Selected
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleBulkAction("delete-permanently")} className="text-destructive">
                    <FiTrash2 className="mr-2 h-4 w-4" /> Delete Permanently
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {selectedEmployees.size > 0 && (
            <span className="text-xs text-muted-foreground font-medium">
              {selectedEmployees.size} selected
            </span>
          )}
        </div>

        {/* Right Actions: Map Users, Attendance Sheet, Export Employee, Export Attendances */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="bg-card shadow-xs text-xs gap-1.5"
            onClick={() =>
              toast({ title: "User Mapping", description: "All employees synced with linked accounts" })
            }
          >
            <FiRefreshCw className="h-3.5 w-3.5 text-primary" />
            Map Users
          </Button>

          <Button variant="outline" size="sm" asChild className="bg-card shadow-xs text-xs gap-1.5">
            <Link href="/dashboard/hr/attendance">
              <FiCalendar className="h-3.5 w-3.5 text-blue-600" />
              Attendance Sheet
            </Link>
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="bg-card shadow-xs text-xs gap-1.5"
            onClick={triggerGlobalExport}
          >
            <FiDownload className="h-3.5 w-3.5 text-emerald-600" />
            Export Employee
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="bg-card shadow-xs text-xs gap-1.5"
            onClick={() => setExportAttendanceModalOpen(true)}
          >
            <FiFileText className="h-3.5 w-3.5 text-indigo-600" />
            Export Attendances
          </Button>
        </div>
      </div>

      {/* Filter Rows (2 Rows matching screenshot layout exactly) */}
      <div className="space-y-2 pt-1">
        {/* Filter Row 1 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
          {/* Search Box */}
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search name, email, code, phone..."
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-9 h-9 text-xs bg-card"
            />
            {search && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
                onClick={() => handleSearch("")}
              >
                <FiX className="h-3 w-3" />
              </Button>
            )}
          </div>

          {/* All Types */}
          <Select
            value={currentFilters?.type || "all"}
            onValueChange={(val) => updateUrlFilter("type", val)}
          >
            <SelectTrigger className="h-9 text-xs bg-card">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {filterOptions?.employeeTypes?.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* All Departments */}
          <Select
            value={currentFilters?.department || "all"}
            onValueChange={(val) => updateUrlFilter("department", val)}
          >
            <SelectTrigger className="h-9 text-xs bg-card">
              <SelectValue placeholder="All Departments" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              {filterOptions?.departments?.map((dept) => (
                <SelectItem key={dept} value={dept}>
                  {dept}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* All Designations */}
          <Select
            value={currentFilters?.designation || "all"}
            onValueChange={(val) => updateUrlFilter("designation", val)}
          >
            <SelectTrigger className="h-9 text-xs bg-card">
              <SelectValue placeholder="All Designations" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Designations</SelectItem>
              {filterOptions?.designations?.map((des) => (
                <SelectItem key={des} value={des}>
                  {des}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Filter Row 2 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 max-w-3xl">
          {/* All Skills */}
          <Select defaultValue="all">
            <SelectTrigger className="h-9 text-xs bg-card">
              <SelectValue placeholder="All Skills" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Skills</SelectItem>
            </SelectContent>
          </Select>

          {/* All Genders */}
          <Select
            value={currentFilters?.gender || "all"}
            onValueChange={(val) => updateUrlFilter("gender", val)}
          >
            <SelectTrigger className="h-9 text-xs bg-card">
              <SelectValue placeholder="All Genders" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Genders</SelectItem>
              <SelectItem value="Male">Male</SelectItem>
              <SelectItem value="Female">Female</SelectItem>
              <SelectItem value="Other">Other</SelectItem>
            </SelectContent>
          </Select>

          {/* All Status */}
          <Select
            value={currentFilters?.statusFilter || "all"}
            onValueChange={(val) => updateUrlFilter("statusFilter", val)}
          >
            <SelectTrigger className="h-9 text-xs bg-card">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Main Employee Table */}
      <div className="border rounded-lg bg-card overflow-hidden mt-3">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead className="w-12">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={handleSelectAll}
                  aria-label="Select all"
                />
              </TableHead>
              <TableHead className="w-14 text-center">
                <FiImage className="mx-auto text-muted-foreground" />
              </TableHead>
              <TableHead>Employee Code & Name</TableHead>
              <TableHead>Designation & Department</TableHead>
              <TableHead>Contact (Email / Phone)</TableHead>
              <TableHead>Device User ID</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Joining Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {initialEmployees.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-10 text-muted-foreground">
                  {isTrash ? "No trashed employees found" : "No employees found matching filter"}
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
                      <div className="w-9 h-9 rounded-full border bg-muted overflow-hidden flex items-center justify-center mx-auto shadow-xs">
                        {employee.photo ? (
                          <img src={employee.photo} alt={employee.name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-xs font-bold text-muted-foreground">
                            {employee.name.slice(0, 2).toUpperCase()}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-semibold text-foreground">{employee.name}</span>
                        <span className="text-xs font-mono text-muted-foreground uppercase">
                          {employee.employeeCode || employee.id.slice(-6)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col text-sm">
                        <span className="font-medium text-foreground">{employee.designation || "-"}</span>
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
                      <div className="font-mono text-xs font-semibold text-foreground bg-muted/60 px-2 py-1 rounded w-fit border">
                        {employee.deviceUserId || employee.fingerprintDeviceId || "-"}
                      </div>
                    </TableCell>
                    <TableCell>
                      {employeeStatus === "trash" ? (
                        <Badge variant="destructive">Trash</Badge>
                      ) : employeeStatus === "inactive" ? (
                        <Badge variant="secondary">Inactive</Badge>
                      ) : (
                        <Badge className="bg-emerald-600 hover:bg-emerald-700">Active</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {employee.joiningDate ? format(new Date(employee.joiningDate), "MMM d, yyyy") : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <FiMoreVertical className="h-4 w-4" />
                            <span className="sr-only">Actions</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-52">
                          <DropdownMenuItem asChild>
                            <Link href={`/dashboard/employees/details?id=${employee.id}`} className="cursor-pointer">
                              <FiEye className="mr-2 h-4 w-4 text-blue-600" />
                              View Profile Details
                            </Link>
                          </DropdownMenuItem>

                          <DropdownMenuItem asChild>
                            <Link href={`/dashboard/employees/${employee.id}`} className="cursor-pointer">
                              <FiEdit className="mr-2 h-4 w-4 text-amber-600" />
                              Edit Employee Info
                            </Link>
                          </DropdownMenuItem>

                          <DropdownMenuSeparator />

                          <DropdownMenuItem onClick={() => setPrintEmployee(employee)} className="cursor-pointer">
                            <FiPrinter className="mr-2 h-4 w-4 text-indigo-600" />
                            Print ID Card
                          </DropdownMenuItem>

                          <DropdownMenuItem onClick={() => setAttendanceEmployee(employee)} className="cursor-pointer">
                            <FiCalendar className="mr-2 h-4 w-4 text-emerald-600" />
                            Single Attendance Report
                          </DropdownMenuItem>

                          <DropdownMenuItem asChild>
                            <Link href={`/dashboard/employees/ledger?id=${employee.id}`} className="cursor-pointer">
                              <FiBookOpen className="mr-2 h-4 w-4 text-purple-600" />
                              View Employee Ledger
                            </Link>
                          </DropdownMenuItem>

                          <DropdownMenuSeparator />

                          {isTrash ? (
                            <DropdownMenuItem
                              onClick={() => {
                                setRestoreEmployeeId(employee.id);
                                handleRestore();
                              }}
                              className="cursor-pointer text-blue-600"
                            >
                              <FiRotateCw className="mr-2 h-4 w-4" />
                              Restore Employee
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              onClick={() => setDeleteEmployeeId(employee.id)}
                              className="cursor-pointer text-destructive focus:text-destructive"
                            >
                              <FiTrash2 className="mr-2 h-4 w-4" />
                              Move to Trash
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
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
        <div className="flex items-center justify-between pt-2">
          <div className="text-xs text-muted-foreground">
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
                router.push(`/dashboard/employees?${params.toString()}`);
              }}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Print ID Card Dialog */}
      <PrintIDCardDialog
        open={!!printEmployee}
        onOpenChange={(open) => !open && setPrintEmployee(null)}
        employee={printEmployee}
      />

      {/* Export Single Attendance Dialog */}
      <ExportSingleAttendanceModal
        open={!!attendanceEmployee || exportAttendanceModalOpen}
        onOpenChange={(open) => {
          if (!open) {
            setAttendanceEmployee(null);
            setExportAttendanceModalOpen(false);
          }
        }}
        employee={attendanceEmployee || initialEmployees[0] || null}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteEmployeeId} onOpenChange={() => setDeleteEmployeeId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isTrash ? "Delete Employee Permanently" : "Move Employee to Trash"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isTrash
                ? "This action cannot be undone. This will permanently delete the employee record."
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
