"use client";

import React, { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { FiSearch, FiCalendar, FiX, FiFilter, FiTrash2, FiChevronLeft, FiChevronRight, FiClock, FiCheck, FiRotateCcw } from "react-icons/fi";
import { getRosterMatrix, upsertRosterCell, clearRosterRange } from "../_actions/roster.action";
import RosterGeneratorDialog from "./roster-generator-dialog";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface RosterMatrixClientProps {
  shifts: { id: string; name: string; startTime: string; endTime: string; isNightShift: boolean }[];
  departments: { id: string; name: string }[];
  initialMonth: string;
  initialDept: string;
  initialSearch: string;
}

export default function RosterMatrixClient({
  shifts,
  departments,
  initialMonth,
  initialDept,
  initialSearch,
}: RosterMatrixClientProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const [monthStr, setMonthStr] = useState(initialMonth); // YYYY-MM
  const [departmentFilter, setDepartmentFilter] = useState(initialDept);
  const [search, setSearch] = useState(initialSearch);

  const [matrixData, setMatrixData] = useState<{
    employees: any[];
    daysInMonth: any[];
    rosterMap: Record<string, any>;
  }>({
    employees: [],
    daysInMonth: [],
    rosterMap: {},
  });

  const [loading, setLoading] = useState(true);
  const [activeCellKey, setActiveCellKey] = useState<string | null>(null);

  const loadMatrix = async () => {
    setLoading(true);
    try {
      const res = await getRosterMatrix(monthStr, departmentFilter, search);
      if (res.success) {
        setMatrixData({
          employees: res.employees,
          daysInMonth: res.daysInMonth,
          rosterMap: res.rosterMap,
        });
      } else {
        toast({ title: "Error", description: res.error || "Failed to load roster matrix", variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to load roster", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMatrix();
  }, [monthStr, departmentFilter, search]);

  const handleCellSelect = async (employeeId: string, dateStr: string, actionVal: string | null) => {
    let effectiveShiftId: string | null = null;
    let isOffDay = false;
    const isClear = actionVal === "CLEAR";

    if (actionVal === "OFF") {
      isOffDay = true;
      effectiveShiftId = null;
    } else if (actionVal === "CLEAR" || actionVal === null) {
      isOffDay = false;
      effectiveShiftId = null;
    } else {
      isOffDay = false;
      effectiveShiftId = actionVal;
    }

    const key = `${employeeId}_${dateStr}`;
    const selectedShift = shifts.find((s) => s.id === effectiveShiftId);

    // Optimistic UI update
    setMatrixData((prev) => {
      const nextRosterMap = { ...prev.rosterMap };
      if (isClear) {
        delete nextRosterMap[key];
      } else {
        nextRosterMap[key] = {
          ...(prev.rosterMap[key] || {}),
          shiftId: effectiveShiftId,
          shiftName: selectedShift ? selectedShift.name : isOffDay ? "OFF" : null,
          startTime: selectedShift?.startTime || null,
          endTime: selectedShift?.endTime || null,
          isOffDay,
        };
      }
      return { ...prev, rosterMap: nextRosterMap };
    });

    setActiveCellKey(null);

    const res = await upsertRosterCell({
      employeeId,
      dateStr,
      shiftId: effectiveShiftId,
      isOffDay,
    });

    if (!res.success) {
      toast({ title: "Error", description: res.error || "Cell update failed", variant: "destructive" });
      loadMatrix();
    }
  };

  const handleClearMonth = async () => {
    if (!confirm(`Are you sure you want to clear all roster entries for ${monthStr}?`)) return;
    const [y, m] = monthStr.split("-").map(Number);
    const daysCount = new Date(y, m, 0).getDate();
    const startDateStr = `${monthStr}-01`;
    const endDateStr = `${monthStr}-${daysCount < 10 ? "0" + daysCount : daysCount}`;

    const res = await clearRosterRange({
      startDateStr,
      endDateStr,
    });

    if (res.success) {
      toast({ title: "Cleared", description: `Cleared ${res.count} roster entries.` });
      loadMatrix();
    } else {
      toast({ title: "Error", description: res.error || "Failed to clear roster", variant: "destructive" });
    }
  };

  const changeMonth = (offset: number) => {
    const [y, m] = monthStr.split("-").map(Number);
    const date = new Date(y, m - 1 + offset, 1);
    const nextY = date.getFullYear();
    const nextM = date.getMonth() + 1;
    const nextMonthStr = `${nextY}-${nextM < 10 ? "0" + nextM : nextM}`;
    setMonthStr(nextMonthStr);
  };

  const shiftSelectOptions = [
    ...shifts.map((s) => ({
      label: `${s.name} (${s.startTime} - ${s.endTime})`,
      value: s.id,
    })),
    { label: "OFF / Weekly Holiday", value: "OFF" },
    { label: "Clear Assignment (Use Default Shift)", value: "" },
  ];

  return (
    <div className="space-y-4">
      {/* Header Controls Bar */}
      <Card className="p-4 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Left Group: Month Selector & Navigation */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 bg-muted rounded-md p-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => changeMonth(-1)}
                title="Previous Month"
              >
                <FiChevronLeft className="h-4 w-4" />
              </Button>

              <div className="flex items-center gap-2 px-3">
                <FiCalendar className="text-primary h-4 w-4" />
                <Input
                  type="month"
                  value={monthStr}
                  onChange={(e) => e.target.value && setMonthStr(e.target.value)}
                  className="h-7 text-xs font-bold w-32 border-none bg-transparent shadow-none p-0 focus-visible:ring-0"
                />
              </div>

              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => changeMonth(1)}
                title="Next Month"
              >
                <FiChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Department Searchable Select DW */}
            <div className="w-56">
              <SearchableSelect
                options={[
                  { label: "All Departments", value: "all" },
                  ...departments.map((d) => ({ label: d.name, value: d.name })),
                ]}
                value={departmentFilter}
                onValueChange={(val) => setDepartmentFilter(val || "all")}
                placeholder="All Departments"
                searchPlaceholder="Search department..."
              />
            </div>
          </div>

          {/* Right Group: Search, Generator Modal & Actions */}
          <div className="flex items-center gap-3">
            <div className="relative w-48 sm:w-60">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search employee..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9 text-xs"
              />
              {search && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
                  onClick={() => setSearch("")}
                >
                  <FiX className="h-3 w-3" />
                </Button>
              )}
            </div>

            {/* Roster Generator Modal */}
            <RosterGeneratorDialog
              departments={departments}
              shifts={shifts}
              currentMonth={monthStr}
              onSuccess={loadMatrix}
            />

            <Button
              variant="outline"
              size="sm"
              className="text-destructive hover:bg-destructive/10 h-9 gap-1 text-xs"
              onClick={handleClearMonth}
              title="Clear Month Roster"
            >
              <FiTrash2 className="h-3.5 w-3.5" />
              Clear Month
            </Button>
          </div>
        </div>
      </Card>

      {/* Main Roster Matrix Table */}
      <Card className="shadow-xs overflow-hidden border">
        <div className="overflow-x-auto max-h-[calc(100vh-280px)] overflow-y-auto">
          <Table className="border-collapse text-xs">
            <TableHeader className="sticky top-0 z-20 bg-muted/90 backdrop-blur-md border-b">
              <TableRow>
                <TableHead className="sticky left-0 z-30 bg-muted min-w-[220px] shadow-sm font-bold border-r">
                  Employee Details
                </TableHead>

                {matrixData.daysInMonth.map((day) => {
                  const isFriday = day.dayOfWeek === 5;
                  const isSaturday = day.dayOfWeek === 6;
                  return (
                    <TableHead
                      key={day.dateStr}
                      className={cn(
                        "text-center min-w-[70px] p-2 border-r text-xs font-semibold",
                        (isFriday || isSaturday) && "bg-amber-500/10 text-amber-900 font-bold"
                      )}
                    >
                      <div className="flex flex-col items-center leading-tight">
                        <span className="text-[10px] text-muted-foreground uppercase">{day.dayName}</span>
                        <span className="text-sm font-extrabold">{day.dayNumber}</span>
                      </div>
                    </TableHead>
                  );
                })}
              </TableRow>
            </TableHeader>

            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell
                    colSpan={matrixData.daysInMonth.length + 1}
                    className="text-center py-16 text-muted-foreground"
                  >
                    <div className="flex items-center justify-center gap-2">
                      <FiClock className="animate-spin h-4 w-4 text-primary" />
                      <span>Loading Duty Roster Matrix...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : matrixData.employees.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={matrixData.daysInMonth.length + 1}
                    className="text-center py-16 text-muted-foreground"
                  >
                    No employees found matching filter criteria.
                  </TableCell>
                </TableRow>
              ) : (
                matrixData.employees.map((emp) => (
                  <TableRow key={emp.id} className="hover:bg-muted/30 transition-colors">
                    {/* Sticky Employee Identity Cell */}
                    <TableCell className="sticky left-0 z-10 bg-card border-r shadow-xs py-2 px-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full border bg-muted overflow-hidden shrink-0 flex items-center justify-center font-bold text-[10px] text-muted-foreground">
                          {emp.photo ? (
                            <img src={emp.photo} alt={emp.name} className="w-full h-full object-cover" />
                          ) : (
                            emp.name.slice(0, 2).toUpperCase()
                          )}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="font-semibold text-foreground truncate max-w-[130px]" title={emp.name}>
                            {emp.name}
                          </span>
                          <span className="text-[10px] text-muted-foreground font-mono">
                            {emp.employeeCode || emp.id.slice(-6)}
                          </span>
                        </div>
                      </div>
                    </TableCell>

                    {/* Day Schedule Cells */}
                    {matrixData.daysInMonth.map((day) => {
                      const key = `${emp.id}_${day.dateStr}`;
                      const rosterItem = matrixData.rosterMap[key];

                      const isOffDay = rosterItem?.isOffDay || rosterItem?.shiftName === "OFF";
                      const hasCustomRoster = !!rosterItem?.shiftId || isOffDay;

                      // Morning shift fallback
                      const morningShiftFallback = shifts.find((s) => s.name.toLowerCase().includes("morning")) || shifts[0];
                      const defaultShiftName = emp.shift?.name || morningShiftFallback?.name || "Morning Shift";

                      // Display label logic
                      const displayShiftName = hasCustomRoster
                        ? isOffDay
                          ? "OFF"
                          : rosterItem.shiftName
                        : defaultShiftName;

                      const isDefaultShift = !hasCustomRoster;

                      return (
                        <TableCell key={day.dateStr} className="p-1 border-r text-center align-middle">
                          <Popover
                            open={activeCellKey === key}
                            onOpenChange={(open) => setActiveCellKey(open ? key : null)}
                          >
                            <PopoverTrigger asChild>
                              <button
                                type="button"
                                className={cn(
                                  "w-full h-9 rounded px-1.5 py-1 text-[11px] font-medium transition-all flex flex-col items-center justify-center gap-0.5 border cursor-pointer select-none",
                                  isOffDay
                                    ? "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100"
                                    : isDefaultShift
                                    ? "bg-background text-muted-foreground border-dashed border-border hover:bg-muted"
                                    : "bg-emerald-50 text-emerald-800 border-emerald-300 font-semibold hover:bg-emerald-100"
                                )}
                                title={`Click to edit shift for ${emp.name} on ${day.dateStr}`}
                              >
                                <span className="truncate max-w-[65px] font-semibold">{displayShiftName}</span>
                                {rosterItem?.startTime ? (
                                  <span className="text-[9px] font-mono opacity-80">
                                    {rosterItem.startTime.slice(0, 5)}
                                  </span>
                                ) : isDefaultShift && morningShiftFallback?.startTime ? (
                                  <span className="text-[9px] font-mono opacity-60">
                                    {emp.shift?.startTime?.slice(0, 5) || morningShiftFallback.startTime.slice(0, 5)}
                                  </span>
                                ) : null}
                              </button>
                            </PopoverTrigger>

                            <PopoverContent className="w-64 p-3 shadow-xl rounded-xl border border-slate-200 dark:border-slate-800" align="center">
                              <div className="space-y-3">
                                <div className="border-b pb-2 dark:border-slate-800 flex items-center justify-between">
                                  <div>
                                    <h4 className="font-bold text-xs text-slate-900 dark:text-white">{emp.name}</h4>
                                    <p className="text-[11px] text-muted-foreground">
                                      {day.dayName}, {day.dateStr}
                                    </p>
                                  </div>
                                  <Badge variant="outline" className="text-[10px] py-0 h-5 text-muted-foreground border-slate-200">
                                    Def: {defaultShiftName}
                                  </Badge>
                                </div>

                                <div className="space-y-1">
                                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
                                    Select Shift
                                  </span>

                                  {/* Clear Custom Roster / Use Default */}
                                  <button
                                    type="button"
                                    onClick={() => handleCellSelect(emp.id, day.dateStr, "CLEAR")}
                                    className={cn(
                                      "w-full text-left px-2.5 py-1.5 rounded-md text-xs font-medium transition-all flex items-center justify-between border",
                                      !rosterItem
                                        ? "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white border-slate-300 dark:border-slate-700 font-semibold"
                                        : "hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-600 dark:text-slate-400 border-transparent"
                                    )}
                                  >
                                    <div className="flex items-center gap-1.5">
                                      <FiRotateCcw className="w-3 h-3 text-slate-400" />
                                      <span>Default Shift ({defaultShiftName})</span>
                                    </div>
                                    {!rosterItem && <FiCheck className="w-3.5 h-3.5 text-blue-600" />}
                                  </button>

                                  {/* Weekly Off / Holiday */}
                                  <button
                                    type="button"
                                    onClick={() => handleCellSelect(emp.id, day.dateStr, "OFF")}
                                    className={cn(
                                      "w-full text-left px-2.5 py-1.5 rounded-md text-xs font-medium transition-all flex items-center justify-between border",
                                      rosterItem?.isOffDay
                                        ? "bg-rose-100 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border-rose-300 font-semibold"
                                        : "hover:bg-rose-50 dark:hover:bg-rose-950/20 text-rose-700 dark:text-rose-400 border-transparent"
                                    )}
                                  >
                                    <div className="flex items-center gap-1.5">
                                      <span className="w-2 h-2 rounded-full bg-rose-500" />
                                      <span>Off Day / Holiday</span>
                                    </div>
                                    {rosterItem?.isOffDay && <FiCheck className="w-3.5 h-3.5 text-rose-600" />}
                                  </button>

                                  <div className="h-px bg-slate-100 dark:bg-slate-800 my-1" />

                                  {/* Available Shifts */}
                                  {shifts.map((s) => {
                                    const isSelected = rosterItem && !rosterItem.isOffDay && rosterItem.shiftId === s.id;
                                    return (
                                      <button
                                        key={s.id}
                                        type="button"
                                        onClick={() => handleCellSelect(emp.id, day.dateStr, s.id)}
                                        className={cn(
                                          "w-full text-left px-2.5 py-1.5 rounded-md text-xs font-medium transition-all flex items-center justify-between border",
                                          isSelected
                                            ? "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-300 border-emerald-300 font-semibold"
                                            : "hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border-transparent"
                                        )}
                                      >
                                        <div className="flex flex-col">
                                          <span className="font-medium">{s.name}</span>
                                          <span className="text-[10px] text-muted-foreground font-mono">
                                            {s.startTime} - {s.endTime}
                                          </span>
                                        </div>
                                        {isSelected && <FiCheck className="w-3.5 h-3.5 text-emerald-600" />}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            </PopoverContent>
                          </Popover>
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
