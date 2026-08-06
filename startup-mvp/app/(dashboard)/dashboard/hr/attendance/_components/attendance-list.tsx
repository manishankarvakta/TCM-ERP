"use client";

import { useState, useTransition, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FiSearch, FiCheckSquare, FiAlertCircle, FiEdit } from "react-icons/fi";
import { processBulkAttendance, processBulkAttendanceRange, closeShiftBulk } from "../_actions/attendance.action";
import { getWarehouses } from "../../../master/warehouses/_actions/warehouse.action";
import { getEmployees } from "../../../employees/_actions/employee.action";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import { DateRange } from "react-day-picker";

interface AttendanceRecord {
  id: string;
  date: Date;
  checkIn: Date | null;
  checkOut: Date | null;
  breakCheckOut?: Date | null;
  breakCheckIn?: Date | null;
  workHours: any;
  otHours: any;
  status: string;
  isManual: boolean;
  notes: string | null;
  employee: {
    id: string;
    name: string;
    employeeCode: string | null;
    designation: string | null;
  };
  shift: {
    id: string;
    name: string;
    startTime: string;
    endTime: string;
    breakStartTime?: string | null;
    breakEndTime?: string | null;
    breakType?: string | null;
    breakDuration?: number | null;
  } | null;
}

interface AttendanceListClientProps {
  initialAttendances: AttendanceRecord[];
  pagination: {
    total: number;
    pages: number;
    page: number;
    limit: number;
  } | null;
  filters: {
    page: number;
    limit: number;
    search: string;
    warehouseId: string;
    deviceId: string;
    employeeId: string;
    fromDate: string;
    toDate: string;
    status: string;
  };
  permissions?: {
    view: boolean;
    edit: boolean;
  };
  weekends?: number[];
}

const formatHoursMinutes = (decimalHours: any) => {
  const val = Number(decimalHours);
  if (isNaN(val) || val <= 0) return "0m";
  let h = Math.floor(val);
  let m = Math.round((val - h) * 60);
  if (m === 60) {
    h += 1;
    m = 0;
  }
  if (h > 0) {
    return `${h}h ${m}m`;
  }
  return `${m}m`;
};

export default function AttendanceListClient({
  initialAttendances = [],
  pagination,
  filters,
  permissions,
  weekends = [0, 6],
}: AttendanceListClientProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  // Local state for filters to allow debouncing/explicit search triggers
  const [localFilters, setLocalFilters] = useState(filters);
  const [warehouses, setWarehouses] = useState<{id: string, name: string}[]>([]);
  const [employees, setEmployees] = useState<{id: string, name: string, employeeCode: string | null}[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isCloseShiftModalOpen, setIsCloseShiftModalOpen] = useState(false);

  // Clear selections when attendance records change (e.g. after pagination/filtering)
  useEffect(() => {
    setSelectedIds([]);
  }, [initialAttendances]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(initialAttendances.map((record) => record.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectRecord = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds((prev) => [...prev, id]);
    } else {
      setSelectedIds((prev) => prev.filter((x) => x !== id));
    }
  };

  const handleCloseShiftBulk = () => {
    if (selectedIds.length === 0) return;
    setIsCloseShiftModalOpen(true);
  };

  const confirmCloseShiftBulk = () => {
    setIsCloseShiftModalOpen(false);
    startTransition(async () => {
      const result = await closeShiftBulk(selectedIds);
      if (result.success) {
        toast({ 
          title: "Success", 
          description: result.message + (result.warnings ? ` Warnings: ${result.warnings.join(", ")}` : "")
        });
        setSelectedIds([]);
        router.refresh();
      } else {
        toast({ variant: "destructive", title: "Error", description: result.error });
      }
    });
  };

  useEffect(() => {
    async function loadDropdowns() {
      const [whRes, empRes] = await Promise.all([
        getWarehouses(1, 100),
        getEmployees(1, 1000)
      ]);
      if (whRes.success && whRes.warehouses) setWarehouses(whRes.warehouses);
      if (empRes.success && empRes.employees) setEmployees(empRes.employees);
    }
    loadDropdowns();
  }, []);

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
    pushFilters({ page });
  };

  const handleLimitChange = (newLimit: number) => {
    pushFilters({ limit: newLimit, page: 1 });
  };

  const renderLimitSelector = () => {
    if (!pagination) return null;
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Rows per page:</span>
        <Select
          value={String(pagination.limit)}
          onValueChange={(val: string) => handleLimitChange(Number(val))}
          disabled={isPending}
        >
          <SelectTrigger className="w-[70px] h-8 text-xs">
            <SelectValue placeholder={String(pagination.limit)} />
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
    if (!pagination || pagination.pages <= 1) return null;
    return (
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => handlePageChange(pagination.page - 1)}
          disabled={pagination.page === 1 || isPending}
        >
          Previous
        </Button>
        
        <div className="flex items-center gap-1">
          {getPageNumbers(pagination.page, pagination.pages).map((p, idx) => {
            if (p === "...") {
              return (
                <span key={`dots-${idx}`} className="px-1 text-sm text-muted-foreground">
                  ...
                </span>
              );
            }
            const isCurrent = p === pagination.page;
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
          onClick={() => handlePageChange(pagination.page + 1)}
          disabled={pagination.page === pagination.pages || isPending}
        >
          Next
        </Button>
      </div>
    );
  };

  const pushFilters = useCallback((newFilters: Partial<typeof filters>) => {
    const updated = { ...localFilters, ...newFilters, page: newFilters.page || 1 };
    setLocalFilters(updated);
    
    const params = new URLSearchParams();
    if (updated.page > 1) params.set("page", updated.page.toString());
    if (updated.limit !== 20) params.set("limit", updated.limit.toString());
    if (updated.search) params.set("search", updated.search);
    if (updated.warehouseId && updated.warehouseId !== "all") params.set("warehouseId", updated.warehouseId);
    if (updated.employeeId && updated.employeeId !== "all") params.set("employeeId", updated.employeeId);
    if (updated.fromDate) params.set("fromDate", updated.fromDate);
    if (updated.toDate) params.set("toDate", updated.toDate);
    if (updated.status && updated.status !== "ALL") params.set("status", updated.status);
    if (updated.deviceId) params.set("deviceId", updated.deviceId);

    // Keep active limit
    if (updated.limit) params.set("limit", updated.limit.toString());

    startTransition(() => {
      router.push(`/dashboard/hr/attendance?${params.toString()}`);
    });
  }, [localFilters, router]);

  const resetFilters = useCallback(() => {
    const todayStr = format(new Date(), "yyyy-MM-dd");
    setLocalFilters({ page: 1, limit: 20, search: "", warehouseId: "", deviceId: "", employeeId: "", status: "ALL", fromDate: todayStr, toDate: todayStr });
    startTransition(() => {
      router.push(`/dashboard/hr/attendance?fromDate=${todayStr}&toDate=${todayStr}&limit=20`);
    });
  }, [router]);


  const handleProcessBulk = () => {
    startTransition(async () => {
      const warehouseId = localFilters.warehouseId === "all" ? undefined : localFilters.warehouseId || undefined;
      // Use range version if toDate is set and differs from fromDate
      const useRange = localFilters.toDate && localFilters.toDate !== localFilters.fromDate;
      const result = useRange
        ? await processBulkAttendanceRange(localFilters.fromDate, localFilters.toDate, warehouseId)
        : await processBulkAttendance(localFilters.fromDate, warehouseId);
      if (result.success) {
        const days = (result as any).daysProcessed ? ` across ${(result as any).daysProcessed} days` : "";
        toast({ title: "Success", description: `Processed ${result.count} un-punched attendances as ABSENT${days}.` });
      } else {
        toast({ variant: "destructive", title: "Error", description: result.error });
      }
    });
  };

  const employeeOptions = [
    { label: "All Employees", value: "all" },
    ...employees.map(e => ({
      label: `${e.name} ${e.employeeCode ? `(${e.employeeCode})` : ''}`,
      value: e.id
    }))
  ];

  return (
    <div className="space-y-4">
      {filters.deviceId && (
        <Alert>
          <FiAlertCircle className="h-4 w-4" />
          <AlertDescription>
            You arrived from a Device Details page. Note: Daily Summaries aggregate punches from all hardware sources. To see exact, strict device-level logs, please check the <strong>Logs</strong> tab on the device details page.
          </AlertDescription>
        </Alert>
      )}

      {/* Filter Bar */}
      <div className="flex flex-col gap-4 p-4 border rounded-lg bg-card shadow-sm">
        <div className="flex flex-wrap items-end gap-3">
          
          <div className="space-y-1.5 flex-1 min-w-[200px]">
            <label className="text-xs font-semibold text-muted-foreground">Search</label>
            <div className="relative">
              <FiSearch className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Name or Code..."
                className="pl-9"
                value={localFilters.search}
                onChange={(e) => setLocalFilters({ ...localFilters, search: e.target.value })}
                onKeyDown={(e) => e.key === 'Enter' && pushFilters({ search: localFilters.search })}
              />
            </div>
          </div>

          <div className="space-y-1.5 flex-1 min-w-[200px]">
            <label className="text-xs font-semibold text-muted-foreground">Employee</label>
            <SearchableSelect
              options={employeeOptions}
              value={localFilters.employeeId || "all"}
              onValueChange={(val) => pushFilters({ employeeId: val || "all" })}
              placeholder="Select Employee"
            />
          </div>

          <div className="space-y-1.5 flex-1 min-w-[200px]">
            <label className="text-xs font-semibold text-muted-foreground">Warehouse</label>
            <SearchableSelect 
              value={localFilters.warehouseId || "all"} 
              onValueChange={(val) => pushFilters({ warehouseId: val || "all" })}
              placeholder="All Warehouses"
              options={[
                { value: "all", label: "All Warehouses" },
                ...warehouses.map(w => ({ value: w.id, label: w.name }))
              ]}
            />
          </div>

          <div className="space-y-1.5 flex-1 min-w-[160px]">
            <label className="text-xs font-semibold text-muted-foreground">Status</label>
            <Select 
              value={localFilters.status || "ALL"} 
              onValueChange={(val) => pushFilters({ status: val })}
            >
              <SelectTrigger>
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent className="max-h-[250px]">
                <SelectItem value="ALL">All Statuses</SelectItem>
                <SelectItem value="ON_DUTY">Still on duty</SelectItem>
                <SelectItem value="PRESENT">Present</SelectItem>
                <SelectItem value="ABSENT">Absent</SelectItem>
                <SelectItem value="LATE">Late</SelectItem>
                <SelectItem value="HALF_DAY">Half Day</SelectItem>
                <SelectItem value="LEAVE">Leave</SelectItem>
                <SelectItem value="HOLIDAY">Holiday</SelectItem>
                <SelectItem value="WEEKEND">Weekend</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5 flex-1 min-w-[260px]">
            <label className="text-xs font-semibold text-muted-foreground">Date Range</label>
            <div className="w-full">
              <DatePickerWithRange
                date={{
                  from: localFilters.fromDate ? new Date(localFilters.fromDate) : undefined,
                  to: localFilters.toDate ? new Date(localFilters.toDate) : undefined,
                }}
                setDate={(range: DateRange | undefined) => {
                  pushFilters({
                    fromDate: range?.from ? format(range.from, "yyyy-MM-dd") : "",
                    toDate: range?.to ? format(range.to, "yyyy-MM-dd") : "",
                  });
                }}
              />
            </div>
          </div>

        </div>

        <div className="flex justify-between items-center border-t pt-4 mt-2">
          <div className="text-sm text-muted-foreground">
            {isPending ? "Updating..." : `Found ${pagination?.total || 0} records`}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => resetFilters()}
              disabled={isPending}
            >
              Reset Filters
            </Button>
            <Button
              onClick={() => pushFilters({ search: localFilters.search })}
              disabled={isPending}
            >
              Apply Search
            </Button>
            {permissions?.edit && (
              <>
                <Button 
                  onClick={handleCloseShiftBulk} 
                  disabled={isPending || selectedIds.length === 0} 
                  className="bg-green-600 hover:bg-green-700 text-white font-medium"
                >
                  <FiCheckSquare className="mr-2 h-4 w-4" />
                  Close Shift {selectedIds.length > 0 ? `(${selectedIds.length})` : ""}
                </Button>
                <Button onClick={handleProcessBulk} disabled={isPending || !localFilters.fromDate} variant="secondary">
                  <FiCheckSquare className="mr-2 h-4 w-4" />
                  Process Un-Punched as Absent
                  {localFilters.toDate && localFilters.toDate !== localFilters.fromDate ? " (Range)" : ""}
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Table Section */}
      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40px]">
                <Checkbox
                  checked={initialAttendances.length > 0 && selectedIds.length === initialAttendances.length}
                  onCheckedChange={(checked) => handleSelectAll(!!checked)}
                />
              </TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Employee</TableHead>
              <TableHead>Check In</TableHead>
              <TableHead>Break Out/In</TableHead>
              <TableHead>Check Out</TableHead>
              <TableHead>Work / OT</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Source</TableHead>
              {permissions?.edit && <TableHead className="text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {initialAttendances.length === 0 ? (
              <TableRow>
                <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                  No attendance records found.
                </TableCell>
              </TableRow>
            ) : (
              initialAttendances.map((record) => {
                const isWeekend = record.status === "WEEKEND" || weekends.includes(new Date(record.date).getUTCDay());
                return (
                  <TableRow key={record.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.includes(record.id)}
                        onCheckedChange={(checked) => handleSelectRecord(record.id, !!checked)}
                      />
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <div className="font-medium">{format(new Date(record.date), "MMM d, yyyy")}</div>
                      <div 
                        className="text-xs text-muted-foreground"
                        style={isWeekend ? { color: "tomato" } : undefined}
                      >
                        {format(new Date(record.date), "EEEE")}
                      </div>
                    </TableCell>
                  <TableCell>
                    <div className="font-medium">{record.employee.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {record.employee.employeeCode || "No Code"}
                    </div>
                  </TableCell>
                  <TableCell>
                    {record.checkIn ? format(new Date(record.checkIn), "hh:mm a") : "-"}
                  </TableCell>
                  <TableCell>
                    {record.breakCheckOut || record.breakCheckIn ? (
                      <div className="flex flex-col gap-0.5 text-xs">
                        <div>Out: {record.breakCheckOut ? format(new Date(record.breakCheckOut), "hh:mm a") : "-"}</div>
                        <div>In: {record.breakCheckIn ? format(new Date(record.breakCheckIn), "hh:mm a") : "-"}</div>
                      </div>
                    ) : record.shift?.breakType === "FIXED" ? (
                      <div className="text-xs text-muted-foreground font-medium">
                        Fixed: {record.shift.breakDuration ?? 60}m
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {record.checkOut ? format(new Date(record.checkOut), "hh:mm a") : "-"}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">{formatHoursMinutes(record.workHours)}</div>
                    {Number(record.otHours) > 0 && (
                      <div className="text-xs text-green-600">+{formatHoursMinutes(record.otHours)} OT</div>
                    )}
                    {Number((record as any).calculatedOvertimeAmount) > 0 && (
                      <div className="text-[10px] text-orange-600 font-medium">+{Number((record as any).calculatedOvertimeAmount).toLocaleString()} BDT OT</div>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={
                      record.status === "PRESENT" ? "default" :
                      record.status === "ABSENT" ? "destructive" :
                      record.status === "LATE" || record.status === "HALF_DAY" ? "secondary" : "outline"
                    }>
                      {record.status}
                    </Badge>
                    {(Number((record as any).tiffinBillAmount) > 0 || 
                      Number((record as any).nightBillAmount) > 0 || 
                      Number((record as any).holidayBillAmount) > 0 || 
                      ((record as any).lateMinutes || 0) > 0) && (
                      <div className="text-[10px] text-muted-foreground mt-1 space-y-0.5 border-t pt-1 leading-tight font-sans">
                        {Number((record as any).tiffinBillAmount) > 0 && <div>Tiffin: {Number((record as any).tiffinBillAmount)} BDT</div>}
                        {Number((record as any).nightBillAmount) > 0 && <div>Night: {Number((record as any).nightBillAmount)} BDT</div>}
                        {Number((record as any).holidayBillAmount) > 0 && <div>Holiday: {Number((record as any).holidayBillAmount)} BDT</div>}
                        {((record as any).lateMinutes || 0) > 0 && <div>Late: {(record as any).lateMinutes} mins</div>}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {record.isManual ? "Manual" : "Biometric"}
                    </Badge>
                  </TableCell>
                  {permissions?.edit && (
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => router.push(`/dashboard/hr/attendance/manual-punch?employeeId=${record.employee.id}&date=${format(new Date(record.date), "yyyy-MM-dd")}`)}
                      >
                        <FiEdit className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Controls */}
      {pagination && (pagination.pages > 1 || pagination.total > 0) && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="text-sm text-muted-foreground">
              Showing {((pagination.page - 1) * pagination.limit) + 1} to{" "}
              {Math.min(pagination.page * pagination.limit, pagination.total)} of{" "}
              {pagination.total} records
            </div>
            {renderLimitSelector()}
          </div>
          {renderPaginationButtons()}
        </div>
      )}

      <AlertDialog open={isCloseShiftModalOpen} onOpenChange={setIsCloseShiftModalOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Auto-Close Shift Confirmation</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to automatically close the shift for {selectedIds.length} selected employee(s)?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsCloseShiftModalOpen(false)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmCloseShiftBulk}>Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
