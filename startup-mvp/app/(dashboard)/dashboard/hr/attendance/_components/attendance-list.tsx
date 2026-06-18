"use client";

import { useState, useTransition, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FiSearch, FiCheckSquare, FiAlertCircle } from "react-icons/fi";
import { processBulkAttendance } from "../_actions/attendance.action";
import { getWarehouses } from "../../../master/warehouses/_actions/warehouse.action";
import { getEmployees } from "../../../employees/_actions/employee.action";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import { DateRange } from "react-day-picker";

interface AttendanceRecord {
  id: string;
  date: Date;
  checkIn: Date | null;
  checkOut: Date | null;
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
}

export default function AttendanceListClient({
  initialAttendances = [],
  pagination,
  filters,
  permissions,
}: AttendanceListClientProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  // Local state for filters to allow debouncing/explicit search triggers
  const [localFilters, setLocalFilters] = useState(filters);
  const [warehouses, setWarehouses] = useState<{id: string, name: string}[]>([]);
  const [employees, setEmployees] = useState<{id: string, name: string, employeeCode: string | null}[]>([]);

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

  const pushFilters = useCallback((newFilters: Partial<typeof filters>) => {
    const updated = { ...localFilters, ...newFilters, page: newFilters.page || 1 };
    setLocalFilters(updated);
    
    const params = new URLSearchParams();
    if (updated.page > 1) params.set("page", updated.page.toString());
    if (updated.limit !== 10) params.set("limit", updated.limit.toString());
    if (updated.search) params.set("search", updated.search);
    if (updated.warehouseId && updated.warehouseId !== "all") params.set("warehouseId", updated.warehouseId);
    if (updated.employeeId && updated.employeeId !== "all") params.set("employeeId", updated.employeeId);
    if (updated.fromDate) params.set("fromDate", updated.fromDate);
    if (updated.toDate) params.set("toDate", updated.toDate);
    if (updated.status && updated.status !== "ALL") params.set("status", updated.status);
    if (updated.deviceId) params.set("deviceId", updated.deviceId);

    startTransition(() => {
      router.push(`/dashboard/hr/attendance?${params.toString()}`);
    });
  }, [localFilters, router]);

  const resetFilters = useCallback(() => {
    const todayStr = format(new Date(), "yyyy-MM-dd");
    setLocalFilters({ page: 1, limit: 10, search: "", warehouseId: "", deviceId: "", employeeId: "", status: "ALL", fromDate: todayStr, toDate: todayStr });
    startTransition(() => {
      router.push(`/dashboard/hr/attendance?fromDate=${todayStr}&toDate=${todayStr}`);
    });
  }, [router]);


  const handleProcessBulk = () => {
    startTransition(async () => {
      const result = await processBulkAttendance(localFilters.fromDate, localFilters.warehouseId === "all" ? undefined : localFilters.warehouseId);
      if (result.success) {
        toast({ title: "Success", description: `Processed ${result.count} un-punched attendances as ABSENT.` });
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
            <Select 
              value={localFilters.warehouseId || "all"} 
              onValueChange={(val) => pushFilters({ warehouseId: val })}
            >
              <SelectTrigger>
                <SelectValue placeholder="All Warehouses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Warehouses</SelectItem>
                {warehouses.map(w => (
                  <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
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
              <SelectContent>
                <SelectItem value="ALL">All Statuses</SelectItem>
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
              <Button onClick={handleProcessBulk} disabled={isPending || !localFilters.fromDate} variant="secondary">
                <FiCheckSquare className="mr-2 h-4 w-4" />
                Process Un-Punched as Absent
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Table Section */}
      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Employee</TableHead>
              <TableHead>Check In</TableHead>
              <TableHead>Check Out</TableHead>
              <TableHead>Work / OT</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Source</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {initialAttendances.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No attendance records found.
                </TableCell>
              </TableRow>
            ) : (
              initialAttendances.map((record) => (
                <TableRow key={record.id}>
                  <TableCell className="font-medium whitespace-nowrap">
                    {format(new Date(record.date), "MMM d, yyyy")}
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
                    {record.checkOut ? format(new Date(record.checkOut), "hh:mm a") : "-"}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">{Number(record.workHours).toFixed(2)}h</div>
                    {Number(record.otHours) > 0 && (
                      <div className="text-xs text-green-600">+{Number(record.otHours).toFixed(2)}h OT</div>
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
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {record.isManual ? "Manual" : "Biometric"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Controls */}
      {pagination && pagination.pages > 1 && (
        <div className="flex items-center justify-end space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => pushFilters({ page: pagination.page - 1 })}
            disabled={pagination.page <= 1 || isPending}
          >
            Previous
          </Button>
          <div className="text-sm text-muted-foreground">
            Page {pagination.page} of {pagination.pages}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => pushFilters({ page: pagination.page + 1 })}
            disabled={pagination.page >= pagination.pages || isPending}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
