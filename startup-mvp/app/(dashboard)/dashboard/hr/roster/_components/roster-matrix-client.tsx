"use client";

import { useState, useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  FiSearch,
  FiFilter,
  FiCalendar,
  FiTrash2,
  FiRefreshCw,
  FiClock,
  FiCheck,
  FiXCircle,
  FiHelpCircle,
  FiChevronLeft,
  FiChevronRight,
} from "react-icons/fi";
import { RosterGeneratorDialog } from "./roster-generator-dialog";
import { upsertRosterCell, clearRosterRange } from "../_actions/roster.action";
import { toast } from "sonner";

interface ShiftData {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
}

interface DepartmentData {
  id: string;
  name: string;
}

interface EmployeeData {
  id: string;
  name: string;
  employeeCode: string | null;
  department: string | null;
  designation: string | null;
  departmentId: string | null;
  designationId: string | null;
  shiftId: string | null;
  shift: ShiftData | null;
  departmentRelation: DepartmentData | null;
  designationRelation: { id: string; name: string } | null;
}

interface RosterEntryData {
  id: string;
  employeeId: string;
  date: string | Date;
  shiftId: string | null;
  isOffDay: boolean;
  notes: string | null;
  shift: ShiftData | null;
}

interface LeaveEntryData {
  employeeId: string;
  dateStr: string;
  leaveTypeName: string;
  isPaid: boolean;
}

interface RosterMatrixClientProps {
  initialData: {
    monthStr: string;
    daysInMonth: number;
    employees: EmployeeData[];
    rosterEntries: RosterEntryData[];
    leaveEntries?: LeaveEntryData[];
    shifts: ShiftData[];
    departments: DepartmentData[];
  };
  permissions?: {
    create?: boolean;
    edit?: boolean;
    bulkGenerate?: boolean;
    clearMonth?: boolean;
  };
}

function formatShiftTime12h(timeStr?: string | null): string {
  if (!timeStr) return "";
  const parts = timeStr.split(":");
  if (parts.length < 2) return timeStr;
  
  let hours = parseInt(parts[0], 10);
  const minutes = parts[1];
  if (isNaN(hours)) return timeStr;

  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  if (hours === 0) hours = 12;

  return `${hours}:${minutes} ${ampm}`;
}

function formatShiftRange12h(startTime?: string | null, endTime?: string | null): string {
  if (!startTime || !endTime) return "";
  return `${formatShiftTime12h(startTime)} - ${formatShiftTime12h(endTime)}`;
}

export function RosterMatrixClient({
  initialData,
  permissions = { create: true, edit: true, bulkGenerate: true, clearMonth: true },
}: RosterMatrixClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const {
    monthStr,
    daysInMonth,
    employees,
    rosterEntries,
    leaveEntries = [],
    shifts,
    departments,
  } = initialData;

  const [searchQuery, setSearchQuery] = useState(searchParams.get("search") || "");
  const [departmentFilter, setDepartmentFilter] = useState(
    searchParams.get("department") || "all"
  );
  const [activeCellKey, setActiveCellKey] = useState<string | null>(null);
  const [updatingCellKey, setUpdatingCellKey] = useState<string | null>(null);

  // Month navigation
  const handleMonthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (!val) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("month", val);
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  };

  // Month arrow navigation (-1 for prev, 1 for next)
  const navigateMonth = (direction: -1 | 1) => {
    const [year, month] = monthStr.split("-").map(Number);
    const date = new Date(year, month - 1 + direction, 1);
    const newYear = date.getFullYear();
    const newMonth = String(date.getMonth() + 1).padStart(2, "0");
    const newMonthStr = `${newYear}-${newMonth}`;

    const params = new URLSearchParams(searchParams.toString());
    params.set("month", newMonthStr);
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  };

  // Search submit
  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    const params = new URLSearchParams(searchParams.toString());
    if (val) {
      params.set("search", val);
    } else {
      params.delete("search");
    }
    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`);
    });
  };

  // Build matrix lookup map: key = `${employeeId}_${dateStr}`
  const rosterMap = new Map<string, RosterEntryData>();
  rosterEntries.forEach((entry) => {
    const d = new Date(entry.date);
    const year = d.getUTCFullYear();
    const month = String(d.getUTCMonth() + 1).padStart(2, "0");
    const day = String(d.getUTCDate()).padStart(2, "0");
    const dateKey = `${year}-${month}-${day}`;
    rosterMap.set(`${entry.employeeId}_${dateKey}`, entry);
  });

  // Build leave lookup map: key = `${employeeId}_${dateStr}`
  const leaveMap = new Map<string, LeaveEntryData>();
  (leaveEntries || []).forEach((entry) => {
    leaveMap.set(`${entry.employeeId}_${entry.dateStr}`, entry);
  });

  // Cell click action
  const handleSetShift = async (
    employeeId: string,
    dateStr: string,
    shiftId: string | null,
    isOffDay: boolean = false
  ) => {
    const cellKey = `${employeeId}_${dateStr}`;
    try {
      setUpdatingCellKey(cellKey);
      const res = await upsertRosterCell({
        employeeId,
        dateStr,
        shiftId,
        isOffDay,
      });

      if (res.success) {
        toast.success("Roster cell updated");
        setActiveCellKey(null);
        router.refresh();
      } else {
        toast.error(res.error || "Failed to update roster cell");
      }
    } catch (err: any) {
      toast.error(err.message || "An error occurred");
    } finally {
      setUpdatingCellKey(null);
    }
  };

  // Clear range action
  const handleClearRange = async () => {
    const [year, month] = monthStr.split("-").map(Number);
    const startDateStr = `${monthStr}-01`;
    const endDateStr = `${monthStr}-${String(daysInMonth).padStart(2, "0")}`;

    if (!confirm(`Are you sure you want to clear all custom roster overrides for ${monthStr}?`)) {
      return;
    }

    try {
      const res = await clearRosterRange({
        startDateStr,
        endDateStr,
        departmentFilter,
      });

      if (res.success) {
        toast.success(`Cleared ${res.deletedCount || 0} roster overrides`);
        router.refresh();
      } else {
        toast.error(res.error || "Failed to clear roster range");
      }
    } catch (err: any) {
      toast.error(err.message || "An error occurred");
    }
  };

  // Generate date columns metadata
  const [yearNum, monthNum] = monthStr.split("-").map(Number);
  const dateColumns = Array.from({ length: daysInMonth }, (_, i) => {
    const dayNum = i + 1;
    const dateObj = new Date(Date.UTC(yearNum, monthNum - 1, dayNum));
    const dayOfWeekStr = dateObj.toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" });
    const dateStr = `${monthStr}-${String(dayNum).padStart(2, "0")}`;
    const isWeekend = dateObj.getUTCDay() === 5 || dateObj.getUTCDay() === 6; // Fri / Sat
    return { dayNum, dayOfWeekStr, dateStr, isWeekend };
  });

  return (
    <div className="space-y-4">
      {/* Control Toolbar */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between bg-card p-4 rounded-xl border shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          {/* Month Navigation Control with Left / Right Arrows */}
          <div className="flex items-center bg-background border rounded-lg p-1 shadow-xs">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={() => navigateMonth(-1)}
              title="Previous Month"
            >
              <FiChevronLeft className="w-4 h-4" />
            </Button>
            <div className="flex items-center gap-1.5 px-2">
              <FiCalendar className="w-4 h-4 text-emerald-600" />
              <input
                type="month"
                value={monthStr}
                onChange={handleMonthChange}
                className="bg-transparent text-sm font-medium focus:outline-none cursor-pointer"
              />
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={() => navigateMonth(1)}
              title="Next Month"
            >
              <FiChevronRight className="w-4 h-4" />
            </Button>
          </div>

          {/* Search Input */}
          <div className="relative w-[220px]">
            <FiSearch className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search employee..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-8 h-9 text-sm"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {permissions.clearMonth && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearRange}
              className="gap-1.5 text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200"
            >
              <FiTrash2 className="w-4 h-4" />
              Clear Month
            </Button>
          )}

          {permissions.bulkGenerate && (
            <RosterGeneratorDialog
              shifts={shifts}
              departments={departments}
              currentMonthStr={monthStr}
              onSuccess={() => router.refresh()}
            />
          )}
        </div>
      </div>

      {/* Legend & Summary Info */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-1 text-xs text-muted-foreground">
        <div className="flex flex-wrap items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-xs bg-emerald-500 inline-block"></span>
            Custom Shift Override
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-xs bg-rose-500 inline-block"></span>
            Off Day
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-xs bg-blue-500 inline-block"></span>
            Approved Paid Leave
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-xs bg-amber-500 inline-block"></span>
            Approved Unpaid Leave
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-xs border border-dashed border-slate-400 bg-slate-100 dark:bg-slate-800 inline-block"></span>
            Default Assigned Shift
          </span>
        </div>
        <div>Total Employees: {employees.length}</div>
      </div>

      {/* Roster Matrix Grid Table */}
      <div className="border rounded-xl shadow-xs overflow-x-auto bg-card">
        <table className="w-full text-xs text-left border-collapse">
          <thead>
            <tr className="bg-muted/60 border-b">
              {/* Sticky Employee Header Column */}
              <th className="sticky left-0 z-20 bg-muted border-r p-3 min-w-[220px] font-semibold text-foreground">
                Employee Name / Code
              </th>
              {/* Day Columns */}
              {dateColumns.map((col) => (
                <th
                  key={col.dayNum}
                  className={`p-2 text-center border-r min-w-[90px] select-none ${
                    col.isWeekend ? "bg-amber-500/10 text-amber-700 dark:text-amber-400" : ""
                  }`}
                >
                  <div className="font-semibold">{col.dayNum}</div>
                  <div className="text-[10px] text-muted-foreground font-normal uppercase">
                    {col.dayOfWeekStr}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {employees.length === 0 ? (
              <tr>
                <td
                  colSpan={daysInMonth + 1}
                  className="p-8 text-center text-muted-foreground"
                >
                  No employees found matching the specified filters.
                </td>
              </tr>
            ) : (
              employees.map((emp) => {
                const deptName =
                  emp.departmentRelation?.name || emp.department || "General";
                const desigName =
                  emp.designationRelation?.name || emp.designation || "";

                return (
                  <tr
                    key={emp.id}
                    className="border-b hover:bg-muted/30 transition-colors"
                  >
                    {/* Sticky Employee Identity Cell */}
                    <td className="sticky left-0 z-10 bg-card border-r p-2.5 min-w-[220px]">
                      <div className="font-semibold text-foreground truncate max-w-[200px]">
                        {emp.name}
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mt-0.5">
                        {emp.employeeCode && (
                          <span className="font-mono bg-muted px-1 rounded-xs">
                            {emp.employeeCode}
                          </span>
                        )}
                        <span className="truncate max-w-[120px]">
                          {deptName}
                        </span>
                      </div>
                    </td>

                    {/* Matrix Cells for Days */}
                    {dateColumns.map((col) => {
                      const cellKey = `${emp.id}_${col.dateStr}`;
                      const rosterEntry = rosterMap.get(cellKey);
                      const leaveEntry = leaveMap.get(cellKey);
                      const isUpdating = updatingCellKey === cellKey;

                      // Evaluate shift / leave / off-day resolution overlay
                      let cellType: "CUSTOM" | "OFF" | "DEFAULT" | "PAID_LEAVE" | "UNPAID_LEAVE" = "DEFAULT";
                      let displayLabel = emp.shift?.name || "Morning";
                      let displayTime = emp.shift ? formatShiftRange12h(emp.shift.startTime, emp.shift.endTime) : "";

                      if (leaveEntry) {
                        if (leaveEntry.isPaid) {
                          cellType = "PAID_LEAVE";
                          displayLabel = leaveEntry.leaveTypeName;
                          displayTime = "Paid Leave";
                        } else {
                          cellType = "UNPAID_LEAVE";
                          displayLabel = leaveEntry.leaveTypeName;
                          displayTime = "Unpaid Leave";
                        }
                      } else if (rosterEntry) {
                        if (rosterEntry.isOffDay) {
                          cellType = "OFF";
                          displayLabel = "OFF";
                          displayTime = "";
                        } else if (rosterEntry.shift) {
                          cellType = "CUSTOM";
                          displayLabel = rosterEntry.shift.name;
                          displayTime = formatShiftRange12h(rosterEntry.shift.startTime, rosterEntry.shift.endTime);
                        }
                      }

                      return (
                        <td
                          key={col.dayNum}
                          className={`p-1 border-r text-center align-middle ${
                            col.isWeekend ? "bg-amber-500/5" : ""
                          }`}
                        >
                          <Popover
                            open={activeCellKey === cellKey}
                            onOpenChange={(open) =>
                              setActiveCellKey(open ? cellKey : null)
                            }
                          >
                            <PopoverTrigger asChild>
                              <button
                                disabled={isUpdating}
                                className={`w-full py-1 px-1 rounded-md text-[11px] font-medium transition-all flex flex-col items-center justify-center gap-0.5 min-h-[40px] ${
                                  cellType === "CUSTOM"
                                    ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/25"
                                    : cellType === "OFF"
                                    ? "bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/40 hover:bg-rose-500/25"
                                    : cellType === "PAID_LEAVE"
                                    ? "bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/40 hover:bg-blue-500/25"
                                    : cellType === "UNPAID_LEAVE"
                                    ? "bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/40 hover:bg-amber-500/25"
                                    : "bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 border border-dashed border-slate-300 dark:border-slate-700 hover:bg-slate-200/60"
                                }`}
                              >
                                {isUpdating ? (
                                  <FiRefreshCw className="w-3 h-3 animate-spin" />
                                ) : (
                                  <>
                                    <span className="truncate max-w-[85px] font-semibold leading-tight">
                                      {displayLabel}
                                    </span>
                                    {displayTime && (
                                      <span className="text-[9px] opacity-85 leading-none whitespace-nowrap font-normal">
                                        {displayTime}
                                      </span>
                                    )}
                                  </>
                                )}
                              </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-60 p-2" align="center">
                              <div className="text-xs font-semibold px-2 py-1 border-b mb-1.5 text-muted-foreground flex justify-between items-center">
                                <span>{col.dateStr}</span>
                                <span className="font-normal text-[10px]">
                                  {emp.name.split(" ")[0]}
                                </span>
                              </div>
                              {leaveEntry && (
                                <div className="bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 p-1.5 rounded text-[10px] mb-1.5 border border-blue-200 dark:border-blue-800 font-medium">
                                  Approved Leave: {leaveEntry.leaveTypeName} ({leaveEntry.isPaid ? "Paid" : "Unpaid"})
                                </div>
                              )}
                              <div className="space-y-1">
                                {/* Option 1: Revert to Default */}
                                <button
                                  onClick={() =>
                                    handleSetShift(emp.id, col.dateStr, null, false)
                                  }
                                  className="w-full text-left px-2 py-1.5 rounded-md hover:bg-muted text-xs flex items-center justify-between"
                                >
                                  <span className="text-muted-foreground">
                                    Default ({emp.shift?.name || "Morning"})
                                  </span>
                                  {cellType === "DEFAULT" && (
                                    <FiCheck className="w-3.5 h-3.5 text-emerald-600" />
                                  )}
                                </button>

                                {/* Option 2: Set Off Day */}
                                <button
                                  onClick={() =>
                                    handleSetShift(emp.id, col.dateStr, null, true)
                                  }
                                  className="w-full text-left px-2 py-1.5 rounded-md hover:bg-rose-50 text-rose-600 text-xs flex items-center justify-between"
                                >
                                  <span>Weekly Off Day</span>
                                  {cellType === "OFF" && (
                                    <FiCheck className="w-3.5 h-3.5 text-rose-600" />
                                  )}
                                </button>

                                <div className="border-t my-1"></div>

                                {/* Custom Shift Options */}
                                <div className="text-[10px] font-semibold text-muted-foreground px-2 py-0.5">
                                  Assign Custom Shift:
                                </div>
                                {shifts.map((s) => (
                                  <button
                                    key={s.id}
                                    onClick={() =>
                                      handleSetShift(emp.id, col.dateStr, s.id, false)
                                    }
                                    className="w-full text-left px-2 py-1 rounded-md hover:bg-emerald-50 text-xs flex items-center justify-between"
                                  >
                                    <div>
                                      <div className="font-medium">{s.name}</div>
                                      <div className="text-[10px] text-muted-foreground">
                                        {formatShiftRange12h(s.startTime, s.endTime)}
                                      </div>
                                    </div>
                                    {rosterEntry?.shiftId === s.id && (
                                      <FiCheck className="w-3.5 h-3.5 text-emerald-600" />
                                    )}
                                  </button>
                                ))}
                              </div>
                            </PopoverContent>
                          </Popover>
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
