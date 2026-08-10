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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Link from "next/link";
import { FiSearch, FiEdit, FiTrash2, FiX, FiCircle, FiCheck, FiMoreVertical, FiEye, FiRotateCw, FiImage, FiBook } from "react-icons/fi";
import { deleteEmployee, bulkUpdateEmployeeStatus, deleteEmployeesPermanently } from "../_actions/employee.action";
import ProtectedAction from "@/components/permissions/protected-action";
import { TabsList, TabsTrigger } from "@/components/ui/tabs";
import SyncBiometricButton from "./sync-biometric-button";
import ExportButtons from "./export-buttons";
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

export function getEmployeeDutyStatus(attendanceLogs?: { timestamp: Date | string }[]): boolean {
  if (!attendanceLogs || attendanceLogs.length === 0) return false;

  const latestPunch = new Date(attendanceLogs[0].timestamp);
  const now = new Date();

  // If latest punch is older than 14 hours, they are automatically off duty
  const hoursSinceLatest = (now.getTime() - latestPunch.getTime()) / (1000 * 60 * 60);
  if (hoursSinceLatest > 14) {
    return false;
  }

  // If we only have 1 punch and it's within 14 hours, they are on duty
  if (attendanceLogs.length === 1) {
    return true;
  }

  // If we have 2 punches, check if they occurred on the same calendar date
  const prevPunch = new Date(attendanceLogs[1].timestamp);
  
  const latestDateString = latestPunch.getFullYear() + "-" + latestPunch.getMonth() + "-" + latestPunch.getDate();
  const prevDateString = prevPunch.getFullYear() + "-" + prevPunch.getMonth() + "-" + prevPunch.getDate();

  if (latestDateString === prevDateString) {
    // Both punches are on the same day -> Even count -> Checked out
    return false;
  }

  // Punches are on different days -> Latest punch is the start of a new day -> Checked in
  return true;
}

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
  deviceMappings?: {
    deviceUserId: string;
  }[];
  attendanceLogs?: {
    timestamp: Date;
  }[];
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
  employeeTypes?: { id: string; name: string }[];
  employeeTypeId?: string;
  gender?: string;
  status?: string;
  departments?: { id: string; name: string }[];
  departmentId?: string;
  designations?: { id: string; name: string }[];
  designationId?: string;
  floors?: { id: string; name: string }[];
  floorId?: string;
  lines?: { id: string; name: string }[];
  lineId?: string;
  allSkills?: string[];
  skill?: string;
  permissions?: {
    view: boolean;
    edit: boolean;
    create?: boolean;
    moveToTrash: boolean;
    deletePermanently: boolean;
    viewLedger?: boolean;
  };
}

export default function EmployeesListClient({
  initialEmployees = [],
  initialPagination,
  initialSearch,
  isTrash = false,
  userId: providedUserId,
  employeeTypes = [],
  employeeTypeId = "all",
  gender = "all",
  status = "all",
  departments = [],
  departmentId = "all",
  designations = [],
  designationId = "all",
  floors = [],
  floorId = "all",
  lines = [],
  lineId = "all",
  allSkills = [],
  skill = "all",
  permissions,
}: EmployeesListClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(initialSearch);
  const hasActiveFilters = !!(
    search || 
    (employeeTypeId && employeeTypeId !== "all") || 
    (gender && gender !== "all") || 
    (status && status !== "all") ||
    (departmentId && departmentId !== "all") ||
    (designationId && designationId !== "all") ||
    (floorId && floorId !== "all") ||
    (lineId && lineId !== "all") ||
    (skill && skill !== "all")
  );
  const [deleteEmployeeId, setDeleteEmployeeId] = useState<string | null>(null);
  const [restoreEmployeeId, setRestoreEmployeeId] = useState<string | null>(null);
  const [selectedEmployees, setSelectedEmployees] = useState<Set<string>>(new Set());
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
    router.push(`/dashboard/employees?${params.toString()}`);
  };

  const handleLimitChange = (newLimit: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("limit", newLimit.toString());
    params.set("page", "1");
    const tab = searchParams.get("tab") || "all";
    if (tab) {
      params.set("tab", tab);
    }
    router.push(`/dashboard/employees?${params.toString()}`);
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

  const handleFilterChange = (key: string, value: string) => {
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
      {/* Subheader: Tabs & Bulk Actions on left, Actions on right */}
      <div className="flex justify-between items-center flex-wrap gap-4 mb-2">
        <div className="flex items-center gap-3 flex-wrap">
          <TabsList>
            <TabsTrigger value="all" asChild>
              <Link href="/dashboard/employees?tab=all&page=1">All Employees</Link>
            </TabsTrigger>
            <TabsTrigger value="trash" asChild>
              <Link href="/dashboard/employees?tab=trash&page=1">Trash</Link>
            </TabsTrigger>
          </TabsList>

          {/* Bulk Actions Dropdown beside Tabs */}
          <div className="flex items-center gap-2">
            {selectedEmployees.size > 0 && (
              <span className="text-sm text-muted-foreground whitespace-nowrap font-medium">
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
              <DropdownMenuContent align="start">
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
                      Restore Selected
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleBulkAction("permanent-delete")}
                      disabled={selectedEmployees.size === 0}
                      className="text-destructive"
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

        <div className="flex items-center gap-2 flex-wrap">
          {permissions?.edit && <SyncBiometricButton />}
          <Button variant="outline" asChild>
            <Link href="/dashboard/hr/attendance">
              Attendance Sheet
            </Link>
          </Button>
          <ExportButtons
            filters={{
              search,
              status,
              employeeTypeId,
              gender,
              departmentId,
            }}
          />
        </div>
      </div>

      {/* Search & Filters Row */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[240px] max-w-sm">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search name, email, code, phone, biometric..."
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

          {/* Type Filter */}
          <div className="w-[180px]">
            <Select
              value={employeeTypeId}
              onValueChange={(val) => handleFilterChange("employeeTypeId", val)}
            >
              <SelectTrigger>
                <SelectValue placeholder="All Employee Types" />
              </SelectTrigger>
              <SelectContent className="max-h-[250px]">
                <SelectItem value="all">All Types</SelectItem>
                {employeeTypes.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Department Filter */}
          <div className="w-[180px]">
            <Select
              value={departmentId}
              onValueChange={(val) => handleFilterChange("departmentId", val)}
            >
              <SelectTrigger>
                <SelectValue placeholder="All Departments" />
              </SelectTrigger>
              <SelectContent className="max-h-[250px]">
                <SelectItem value="all">All Departments</SelectItem>
                {departments.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Designation Filter */}
          <div className="w-[180px]">
            <Select
              value={designationId}
              onValueChange={(val) => handleFilterChange("designationId", val)}
            >
              <SelectTrigger>
                <SelectValue placeholder="All Designations" />
              </SelectTrigger>
              <SelectContent className="max-h-[250px]">
                <SelectItem value="all">All Designations</SelectItem>
                {designations.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Floor Filter */}
          <div className="w-[180px]">
            <Select
              value={floorId}
              onValueChange={(val) => handleFilterChange("floorId", val)}
            >
              <SelectTrigger>
                <SelectValue placeholder="All Floors" />
              </SelectTrigger>
              <SelectContent className="max-h-[250px]">
                <SelectItem value="all">All Floors</SelectItem>
                {floors.map((f) => (
                  <SelectItem key={f.id} value={f.id}>
                    {f.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Line Filter */}
          <div className="w-[180px]">
            <Select
              value={lineId}
              onValueChange={(val) => handleFilterChange("lineId", val)}
            >
              <SelectTrigger>
                <SelectValue placeholder="All Lines" />
              </SelectTrigger>
              <SelectContent className="max-h-[250px]">
                <SelectItem value="all">All Lines</SelectItem>
                {lines.map((l) => (
                  <SelectItem key={l.id} value={l.id}>
                    {l.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Skill Filter */}
          <div className="w-[180px]">
            <Select
              value={skill}
              onValueChange={(val) => handleFilterChange("skill", val)}
            >
              <SelectTrigger>
                <SelectValue placeholder="All Skills" />
              </SelectTrigger>
              <SelectContent className="max-h-[250px]">
                <SelectItem value="all">All Skills</SelectItem>
                {allSkills.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Gender Filter */}
          <div className="w-[140px]">
            <Select
              value={gender}
              onValueChange={(val) => handleFilterChange("gender", val)}
            >
              <SelectTrigger>
                <SelectValue placeholder="All Genders" />
              </SelectTrigger>
              <SelectContent className="max-h-[250px]">
                <SelectItem value="all">All Genders</SelectItem>
                <SelectItem value="Male">Male</SelectItem>
                <SelectItem value="Female">Female</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Status Filter (Only visible if not in trash tab) */}
          {!isTrash && (
            <div className="w-[140px]">
              <Select
                value={status}
                onValueChange={(val) => handleFilterChange("status", val)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent className="max-h-[250px]">
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Clear Filters Button */}
          {hasActiveFilters && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearch("");
                router.push(`/dashboard/employees?tab=${isTrash ? "trash" : "all"}&page=1`);
              }}
            >
              Clear Filters
            </Button>
          )}
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
              <TableHead className="text-center">Biometric ID / PIN</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
              {initialEmployees.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <span>{isTrash ? "No trashed employees found" : "No employees found matching the filters."}</span>
                      {hasActiveFilters && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSearch("");
                            router.push(`/dashboard/employees?tab=${isTrash ? "trash" : "all"}&page=1`);
                          }}
                        >
                          Clear All Filters
                        </Button>
                      )}
                    </div>
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
                      <div className="flex items-center justify-center gap-3">
                        <span 
                          className={cn(
                            "w-2.5 h-2.5 rounded-full shrink-0",
                            getEmployeeDutyStatus(employee.attendanceLogs)
                              ? "bg-emerald-500 animate-pulse"
                              : "bg-muted-foreground/30"
                          )} 
                          title={getEmployeeDutyStatus(employee.attendanceLogs) ? "On Duty" : "Off Duty"}
                        />
                        <div className="w-10 h-10 rounded border bg-muted overflow-hidden flex items-center justify-center">
                          {employee.photo ? (
                            <img src={employee.photo} alt={employee.name} className="w-full h-full object-cover" />
                          ) : (
                            <FiImage className="text-muted-foreground" />
                          )}
                        </div>
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
                    <TableCell className="font-mono text-muted-foreground text-center">
                      {employee.deviceMappings && employee.deviceMappings.length > 0 ? (
                        <div className="flex flex-wrap justify-center gap-3">
                          {Array.from(new Set(employee.deviceMappings.map((m) => m.deviceUserId).filter(Boolean))).map((pin) => {
                            const count = employee.deviceMappings!.filter((m) => m.deviceUserId === pin).length;
                            return (
                              <div key={pin} className="font-mono font-normal inline-flex items-center gap-1.5 py-0.5">
                                <span>{pin}</span>
                                <span className="inline-flex items-center justify-center min-w-[16px] h-[16px] px-1 text-[10px] font-bold bg-emerald-500 text-white rounded-full">
                                  {count}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {!isTrash && (
                          <>
                            <ProtectedAction
                              permissionKey="peoples.employees"
                              action="ledger"
                              href={`/dashboard/employees/ledger?id=${employee.id}`}
                              userId={providedUserId || undefined}
                              hasAccess={permissions?.viewLedger}
                            />
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
      {(initialPagination.totalPages > 1 || initialPagination.total > 0) && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="text-sm text-muted-foreground">
              Showing {((initialPagination.page - 1) * initialPagination.limit) + 1} to{" "}
              {Math.min(initialPagination.page * initialPagination.limit, initialPagination.total)} of{" "}
              {initialPagination.total} employees
            </div>
            {renderLimitSelector()}
          </div>
          {renderPaginationButtons()}
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

