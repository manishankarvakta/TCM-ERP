"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { FiPrinter, FiCalendar, FiFileText, FiLayers } from "react-icons/fi";

interface ShiftOption {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
}

interface DepartmentOption {
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
  shift: ShiftOption | null;
  departmentRelation: DepartmentOption | null;
  designationRelation: { id: string; name: string } | null;
}

interface RosterEntryData {
  id: string;
  employeeId: string;
  date: string | Date;
  shiftId: string | null;
  isOffDay: boolean;
  notes: string | null;
  shift: ShiftOption | null;
}

interface LeaveEntryData {
  employeeId: string;
  dateStr: string;
  leaveTypeName: string;
  isPaid: boolean;
}

interface RosterPrintDialogProps {
  currentMonthStr: string;
  daysInMonth: number;
  employees: EmployeeData[];
  rosterEntries: RosterEntryData[];
  leaveEntries?: LeaveEntryData[];
  shifts: ShiftOption[];
  departments: DepartmentOption[];
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

export function RosterPrintDialog({
  currentMonthStr,
  daysInMonth,
  employees,
  rosterEntries,
  leaveEntries = [],
  shifts,
  departments,
}: RosterPrintDialogProps) {
  const [open, setOpen] = useState(false);
  const [printType, setPrintType] = useState<"monthly" | "weekly" | "daily">("monthly");
  const [departmentFilter, setDepartmentFilter] = useState<string>("all");
  const [selectedWeek, setSelectedWeek] = useState<number>(1);

  // Default daily target date to today if within month, else month-01
  const todayStr = new Date().toISOString().split("T")[0];
  const defaultDailyDate = todayStr.startsWith(currentMonthStr) ? todayStr : `${currentMonthStr}-01`;
  const [selectedDateStr, setSelectedDateStr] = useState<string>(defaultDailyDate);

  // Build lookup maps
  const rosterMap = new Map<string, RosterEntryData>();
  rosterEntries.forEach((entry) => {
    const d = new Date(entry.date);
    const year = d.getUTCFullYear();
    const month = String(d.getUTCMonth() + 1).padStart(2, "0");
    const day = String(d.getUTCDate()).padStart(2, "0");
    rosterMap.set(`${entry.employeeId}_${year}-${month}-${day}`, entry);
  });

  const leaveMap = new Map<string, LeaveEntryData>();
  (leaveEntries || []).forEach((entry) => {
    leaveMap.set(`${entry.employeeId}_${entry.dateStr}`, entry);
  });

  // Target filtered employees
  const filteredEmployees = employees.filter((emp) => {
    if (departmentFilter === "all") return true;
    return (
      emp.departmentId === departmentFilter ||
      emp.department === departmentFilter ||
      emp.departmentRelation?.id === departmentFilter ||
      emp.departmentRelation?.name === departmentFilter
    );
  });

  const selectedDeptObj = departments.find((d) => d.id === departmentFilter);
  const departmentName = departmentFilter === "all" ? "All Departments" : selectedDeptObj?.name || "Selected Department";

  const handleExecutePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Please allow popups to print the duty roster");
      return;
    }

    const htmlContent = buildPrintHTML();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();

    setTimeout(() => {
      printWindow.print();
    }, 400);
  };

  const buildPrintHTML = () => {
    const [yearNum, monthNum] = currentMonthStr.split("-").map(Number);
    const dateObj = new Date(yearNum, monthNum - 1, 1);
    const monthLongName = dateObj.toLocaleString("en-US", { month: "long", year: "numeric" });
    const printTimestamp = new Date().toLocaleString();

    let title = "";
    let orientation = "landscape";
    let bodyHTML = "";

    if (printType === "monthly") {
      title = `Monthly Duty Roster - ${monthLongName}`;
      orientation = "landscape";
      bodyHTML = renderMonthlyHTML(yearNum, monthNum);
    } else if (printType === "weekly") {
      title = `Weekly Duty Roster (Week ${selectedWeek}) - ${monthLongName}`;
      orientation = "landscape";
      bodyHTML = renderWeeklyHTML(yearNum, monthNum);
    } else {
      // Daily
      const dObj = new Date(selectedDateStr);
      const formattedDate = dObj.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      title = `Daily Shift Roster - ${formattedDate}`;
      orientation = "landscape";
      bodyHTML = renderDailyHTML();
    }

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${title}</title>
          <style>
            @page {
              size: ${orientation};
              margin: 8mm;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              color: #0f172a;
              margin: 0;
              padding: 12px;
              font-size: 11px;
              line-height: 1.3;
              background: #fff;
            }
            .header-container {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              border-bottom: 2px solid #1e293b;
              padding-bottom: 8px;
              margin-bottom: 12px;
            }
            .company-name {
              font-size: 18px;
              font-weight: 700;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              color: #0f172a;
            }
            .report-title {
              font-size: 13px;
              font-weight: 600;
              color: #059669;
              margin-top: 2px;
            }
            .meta-info {
              text-align: right;
              font-size: 10px;
              color: #475569;
            }
            .legend-bar {
              display: flex;
              gap: 16px;
              font-size: 10px;
              margin-bottom: 10px;
              padding: 6px 10px;
              background: #f8fafc;
              border: 1px solid #e2e8f0;
              border-radius: 6px;
            }
            .legend-item {
              display: flex;
              align-items: center;
              gap: 5px;
            }
            .dot {
              width: 10px;
              height: 10px;
              border-radius: 2px;
              display: inline-block;
            }
            table.roster-table {
              width: 100%;
              border-collapse: collapse;
              font-size: 10px;
            }
            table.roster-table th, table.roster-table td {
              border: 1px solid #cbd5e1;
              padding: 5px 4px;
              text-align: center;
            }
            table.roster-table th {
              background-color: #f1f5f9;
              font-weight: 600;
              color: #1e293b;
            }
            .emp-cell {
              text-align: left !important;
              font-weight: 600;
              white-space: nowrap;
            }
            .sub-text {
              font-size: 8.5px;
              color: #64748b;
              font-weight: normal;
            }
            .badge {
              display: block;
              padding: 2px 1px;
              border-radius: 4px;
              font-size: 9px;
              font-weight: 600;
              line-height: 1.1;
            }
            .badge-shift { background: #d1fae5; color: #047857; border: 1px solid #a7f3d0; }
            .badge-off { background: #ffe4e6; color: #be123c; border: 1px solid #fecdd3; }
            .badge-paid-leave { background: #dbeafe; color: #1d4ed8; border: 1px solid #bfdbfe; }
            .badge-unpaid-leave { background: #fef3c7; color: #b45309; border: 1px solid #fde68a; }
            .badge-default { background: #f1f5f9; color: #475569; border: 1px dashed #cbd5e1; }
            .badge-time {
              font-size: 8px;
              font-weight: normal;
              display: block;
              margin-top: 1px;
              opacity: 0.9;
            }
            .signature-box {
              margin-top: 30px;
              display: flex;
              justify-content: space-between;
              padding: 0 20px;
            }
            .sig-line {
              border-top: 1px solid #64748b;
              width: 180px;
              text-align: center;
              padding-top: 4px;
              font-size: 10px;
              color: #475569;
            }
          </style>
        </head>
        <body>
          <div class="header-container">
            <div>
              <div class="company-name">TCM ERP System</div>
              <div class="report-title">${title}</div>
            </div>
            <div class="meta-info">
              <div><strong>Department:</strong> ${departmentName}</div>
              <div><strong>Total Staff:</strong> ${filteredEmployees.length}</div>
              <div><strong>Printed:</strong> ${printTimestamp}</div>
            </div>
          </div>

          <div class="legend-bar">
            <div class="legend-item"><span class="dot" style="background:#10b981;"></span> Custom Shift</div>
            <div class="legend-item"><span class="dot" style="background:#f43f5e;"></span> Off Day</div>
            <div class="legend-item"><span class="dot" style="background:#3b82f6;"></span> Approved Paid Leave</div>
            <div class="legend-item"><span class="dot" style="background:#f59e0b;"></span> Approved Unpaid Leave</div>
            <div class="legend-item"><span class="dot" style="background:#cbd5e1;"></span> Default Shift</div>
          </div>

          ${bodyHTML}

          <div class="signature-box">
            <div class="sig-line">Prepared By (HR Executive)</div>
            <div class="sig-line">Verified By (Department Incharge)</div>
            <div class="sig-line">Approved By (HR Manager)</div>
          </div>
        </body>
      </html>
    `;
  };

  const renderMonthlyHTML = (yearNum: number, monthNum: number) => {
    const daysArr = Array.from({ length: daysInMonth }, (_, i) => i + 1);

    return `
      <table class="roster-table">
        <thead>
          <tr>
            <th style="width: 160px; text-align: left; padding-left: 8px;">Employee</th>
            ${daysArr
              .map((d) => {
                const dateObj = new Date(Date.UTC(yearNum, monthNum - 1, d));
                const dayName = dateObj.toLocaleDateString("en-US", { weekday: "narrow", timeZone: "UTC" });
                const isWeekend = dateObj.getUTCDay() === 5 || dateObj.getUTCDay() === 6; // Fri/Sat
                const bg = isWeekend ? "background-color:#fef3c7;" : "";
                return `<th style="${bg}"><div>${d}</div><div class="sub-text">${dayName}</div></th>`;
              })
              .join("")}
          </tr>
        </thead>
        <tbody>
          ${filteredEmployees
            .map((emp) => {
              const dept = emp.departmentRelation?.name || emp.department || "";
              const code = emp.employeeCode || "";

              const cellsHTML = daysArr
                .map((d) => {
                  const dayStr = String(d).padStart(2, "0");
                  const dateStr = `${currentMonthStr}-${dayStr}`;
                  const cellKey = `${emp.id}_${dateStr}`;
                  const rosterEntry = rosterMap.get(cellKey);
                  const leaveEntry = leaveMap.get(cellKey);

                  let badgeClass = "badge-default";
                  let label = emp.shift?.name || "Morning";
                  let timeText = emp.shift ? formatShiftRange12h(emp.shift.startTime, emp.shift.endTime) : "";

                  if (leaveEntry) {
                    if (leaveEntry.isPaid) {
                      badgeClass = "badge-paid-leave";
                      label = leaveEntry.leaveTypeName;
                      timeText = "Paid Leave";
                    } else {
                      badgeClass = "badge-unpaid-leave";
                      label = leaveEntry.leaveTypeName;
                      timeText = "Unpaid Leave";
                    }
                  } else if (rosterEntry) {
                    if (rosterEntry.isOffDay) {
                      badgeClass = "badge-off";
                      label = "OFF";
                      timeText = "";
                    } else if (rosterEntry.shift) {
                      badgeClass = "badge-shift";
                      label = rosterEntry.shift.name;
                      timeText = formatShiftRange12h(rosterEntry.shift.startTime, rosterEntry.shift.endTime);
                    }
                  }

                  return `
                    <td>
                      <span class="badge ${badgeClass}">
                        ${label}
                        ${timeText ? `<span class="badge-time">${timeText}</span>` : ""}
                      </span>
                    </td>
                  `;
                })
                .join("");

              return `
                <tr>
                  <td class="emp-cell">
                    <div>${emp.name}</div>
                    <div class="sub-text">${code ? `[${code}] ` : ""}${dept}</div>
                  </td>
                  ${cellsHTML}
                </tr>
              `;
            })
            .join("")}
        </tbody>
      </table>
    `;
  };

  const renderWeeklyHTML = (yearNum: number, monthNum: number) => {
    // Calculate 7-day range based on selectedWeek
    const startDay = (selectedWeek - 1) * 7 + 1;
    const endDay = Math.min(daysInMonth, selectedWeek * 7);
    const weekDaysArr: number[] = [];
    for (let d = startDay; d <= endDay; d++) {
      weekDaysArr.push(d);
    }

    return `
      <table class="roster-table">
        <thead>
          <tr>
            <th style="width: 40px;">#</th>
            <th style="width: 80px;">Emp Code</th>
            <th style="width: 150px; text-align: left; padding-left: 8px;">Employee Name</th>
            <th style="width: 110px;">Department</th>
            <th style="width: 110px;">Designation</th>
            ${weekDaysArr
              .map((d) => {
                const dateObj = new Date(Date.UTC(yearNum, monthNum - 1, d));
                const dayName = dateObj.toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" });
                const fullDateStr = `${currentMonthStr}-${String(d).padStart(2, "0")}`;
                return `<th><div>Day ${d} (${dayName})</div><div class="sub-text">${fullDateStr}</div></th>`;
              })
              .join("")}
          </tr>
        </thead>
        <tbody>
          ${filteredEmployees
            .map((emp, idx) => {
              const dept = emp.departmentRelation?.name || emp.department || "General";
              const desig = emp.designationRelation?.name || emp.designation || "-";
              const code = emp.employeeCode || "-";

              const cellsHTML = weekDaysArr
                .map((d) => {
                  const dayStr = String(d).padStart(2, "0");
                  const dateStr = `${currentMonthStr}-${dayStr}`;
                  const cellKey = `${emp.id}_${dateStr}`;
                  const rosterEntry = rosterMap.get(cellKey);
                  const leaveEntry = leaveMap.get(cellKey);

                  let badgeClass = "badge-default";
                  let label = emp.shift?.name || "Morning";
                  let timeText = emp.shift ? formatShiftRange12h(emp.shift.startTime, emp.shift.endTime) : "";

                  if (leaveEntry) {
                    if (leaveEntry.isPaid) {
                      badgeClass = "badge-paid-leave";
                      label = leaveEntry.leaveTypeName;
                      timeText = "Paid Leave";
                    } else {
                      badgeClass = "badge-unpaid-leave";
                      label = leaveEntry.leaveTypeName;
                      timeText = "Unpaid Leave";
                    }
                  } else if (rosterEntry) {
                    if (rosterEntry.isOffDay) {
                      badgeClass = "badge-off";
                      label = "OFF";
                      timeText = "";
                    } else if (rosterEntry.shift) {
                      badgeClass = "badge-shift";
                      label = rosterEntry.shift.name;
                      timeText = formatShiftRange12h(rosterEntry.shift.startTime, rosterEntry.shift.endTime);
                    }
                  }

                  return `
                    <td style="min-width: 95px;">
                      <span class="badge ${badgeClass}">
                        ${label}
                        ${timeText ? `<span class="badge-time">${timeText}</span>` : ""}
                      </span>
                    </td>
                  `;
                })
                .join("");

              return `
                <tr>
                  <td>${idx + 1}</td>
                  <td>${code}</td>
                  <td class="emp-cell">${emp.name}</td>
                  <td>${dept}</td>
                  <td>${desig}</td>
                  ${cellsHTML}
                </tr>
              `;
            })
            .join("")}
        </tbody>
      </table>
    `;
  };

  const renderDailyHTML = () => {
    let onDutyCount = 0;
    let offDayCount = 0;
    let leaveCount = 0;

    const rowsHTML = filteredEmployees
      .map((emp, idx) => {
        const dept = emp.departmentRelation?.name || emp.department || "General";
        const desig = emp.designationRelation?.name || emp.designation || "-";
        const code = emp.employeeCode || "-";

        const cellKey = `${emp.id}_${selectedDateStr}`;
        const rosterEntry = rosterMap.get(cellKey);
        const leaveEntry = leaveMap.get(cellKey);

        let badgeClass = "badge-default";
        let shiftName = emp.shift?.name || "Default Shift";
        let shiftTime = emp.shift ? formatShiftRange12h(emp.shift.startTime, emp.shift.endTime) : "-";
        let statusText = "On Duty";

        if (leaveEntry) {
          leaveCount++;
          statusText = leaveEntry.isPaid ? `Leave (${leaveEntry.leaveTypeName} - Paid)` : `Leave (${leaveEntry.leaveTypeName} - Unpaid)`;
          badgeClass = leaveEntry.isPaid ? "badge-paid-leave" : "badge-unpaid-leave";
          shiftName = leaveEntry.leaveTypeName;
          shiftTime = leaveEntry.isPaid ? "Paid Leave" : "Unpaid Leave";
        } else if (rosterEntry) {
          if (rosterEntry.isOffDay) {
            offDayCount++;
            statusText = "Weekly Off Day";
            badgeClass = "badge-off";
            shiftName = "OFF";
            shiftTime = "-";
          } else if (rosterEntry.shift) {
            onDutyCount++;
            statusText = "Custom Duty Shift";
            badgeClass = "badge-shift";
            shiftName = rosterEntry.shift.name;
            shiftTime = formatShiftRange12h(rosterEntry.shift.startTime, rosterEntry.shift.endTime);
          } else {
            onDutyCount++;
          }
        } else {
          onDutyCount++;
        }

        return `
          <tr>
            <td>${idx + 1}</td>
            <td>${code}</td>
            <td class="emp-cell">${emp.name}</td>
            <td>${dept}</td>
            <td>${desig}</td>
            <td><strong>${shiftName}</strong></td>
            <td>${shiftTime}</td>
            <td><span class="badge ${badgeClass}">${statusText}</span></td>
            <td style="width: 140px;"></td>
          </tr>
        `;
      })
      .join("");

    return `
      <div style="display: flex; gap: 20px; margin-bottom: 12px; font-size: 11px;">
        <div><strong>On Duty:</strong> ${onDutyCount}</div>
        <div><strong>Off Day:</strong> ${offDayCount}</div>
        <div><strong>On Leave:</strong> ${leaveCount}</div>
        <div><strong>Total Scheduled:</strong> ${filteredEmployees.length}</div>
      </div>

      <table class="roster-table">
        <thead>
          <tr>
            <th style="width: 35px;">#</th>
            <th style="width: 80px;">Emp Code</th>
            <th style="width: 170px; text-align: left; padding-left: 8px;">Employee Name</th>
            <th style="width: 120px;">Department</th>
            <th style="width: 120px;">Designation</th>
            <th style="width: 120px;">Assigned Shift</th>
            <th style="width: 140px;">Shift Time (12-Hour)</th>
            <th style="width: 150px;">Duty Status</th>
            <th>Employee Signature / Notes</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHTML}
        </tbody>
      </table>
    `;
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5 border-emerald-600 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50">
          <FiPrinter className="w-4 h-4 text-emerald-600" />
          <span>Print Roster</span>
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-semibold text-foreground">
            <FiPrinter className="w-5 h-5 text-emerald-600" />
            Print Duty Roster Report
          </DialogTitle>
          <DialogDescription>
            Select print type, target department, and date scope for roster document.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Print Type Selection */}
          <div className="space-y-2">
            <Label className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">
              Select Roster Print Scope
            </Label>
            <RadioGroup
              value={printType}
              onValueChange={(val: any) => setPrintType(val)}
              className="grid grid-cols-3 gap-2"
            >
              <div>
                <RadioGroupItem value="monthly" id="print-monthly" className="peer sr-only" />
                <Label
                  htmlFor="print-monthly"
                  className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-emerald-600 [&:has([data-state=checked])]:border-emerald-600 cursor-pointer text-center"
                >
                  <FiCalendar className="mb-1.5 h-5 w-5 text-emerald-600" />
                  <span className="text-xs font-semibold">Monthly</span>
                  <span className="text-[10px] text-muted-foreground mt-0.5">Full Month</span>
                </Label>
              </div>

              <div>
                <RadioGroupItem value="weekly" id="print-weekly" className="peer sr-only" />
                <Label
                  htmlFor="print-weekly"
                  className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-emerald-600 [&:has([data-state=checked])]:border-emerald-600 cursor-pointer text-center"
                >
                  <FiLayers className="mb-1.5 h-5 w-5 text-emerald-600" />
                  <span className="text-xs font-semibold">Weekly</span>
                  <span className="text-[10px] text-muted-foreground mt-0.5">7-Day Grid</span>
                </Label>
              </div>

              <div>
                <RadioGroupItem value="daily" id="print-daily" className="peer sr-only" />
                <Label
                  htmlFor="print-daily"
                  className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-emerald-600 [&:has([data-state=checked])]:border-emerald-600 cursor-pointer text-center"
                >
                  <FiFileText className="mb-1.5 h-5 w-5 text-emerald-600" />
                  <span className="text-xs font-semibold">Daily</span>
                  <span className="text-[10px] text-muted-foreground mt-0.5">Single Date</span>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Department Filter */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Target Department</Label>
            <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="All Departments" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments ({employees.length} employees)</SelectItem>
                {departments.map((dept) => {
                  const deptCount = employees.filter(
                    (e) =>
                      e.departmentId === dept.id ||
                      e.department === dept.name ||
                      e.department === dept.id ||
                      e.departmentRelation?.id === dept.id ||
                      e.departmentRelation?.name === dept.name
                  ).length;
                  return (
                    <SelectItem key={dept.id} value={dept.id}>
                      {dept.name} ({deptCount} employees)
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Type-Specific Options */}
          {printType === "weekly" && (
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Select Target Week</Label>
              <Select
                value={String(selectedWeek)}
                onValueChange={(val) => setSelectedWeek(Number(val))}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Select week" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Week 1 (Day 1 - 7)</SelectItem>
                  <SelectItem value="2">Week 2 (Day 8 - 14)</SelectItem>
                  <SelectItem value="3">Week 3 (Day 15 - 21)</SelectItem>
                  <SelectItem value="4">Week 4 (Day 22 - 28)</SelectItem>
                  <SelectItem value="5">Week 5 (Day 29 - {daysInMonth})</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {printType === "daily" && (
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Select Target Date</Label>
              <Input
                type="date"
                value={selectedDateStr}
                onChange={(e) => setSelectedDateStr(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
          )}

          {/* Print Info Preview Summary */}
          <div className="p-3 bg-muted/40 border rounded-lg text-xs space-y-1 text-muted-foreground">
            <div className="font-semibold text-foreground flex justify-between">
              <span>Print Target:</span>
              <span className="capitalize font-mono text-emerald-700 dark:text-emerald-400">
                {printType} Roster
              </span>
            </div>
            <div className="flex justify-between">
              <span>Department:</span>
              <span className="font-medium">{departmentName}</span>
            </div>
            <div className="flex justify-between">
              <span>Total Staff to Print:</span>
              <span className="font-medium text-foreground">{filteredEmployees.length} Employees</span>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleExecutePrint}
            className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <FiPrinter className="w-4 h-4" />
            <span>Generate Print View</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
