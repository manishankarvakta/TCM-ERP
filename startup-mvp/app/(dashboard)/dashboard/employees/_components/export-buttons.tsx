"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FiDownload, FiCalendar, FiFileText, FiFile, FiX } from "react-icons/fi";
import { getEmployeesForExport, getAttendancesForExport } from "../_actions/export.action";
import { exportToCSV } from "@/lib/utils/export-csv";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface ExportButtonsProps {
  filters: {
    search?: string;
    status?: string;
    employeeTypeId?: string;
    gender?: string;
    departmentId?: string;
  };
}

export default function ExportButtons({ filters }: ExportButtonsProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  // Set default dates for attendance export (defaulting to the first day of current month to today)
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
  const [fromDate, setFromDate] = useState(firstDay.toISOString().split("T")[0]);
  const [toDate, setToDate] = useState(now.toISOString().split("T")[0]);

  // Export Employee List
  const handleExportEmployee = async (format: "csv" | "pdf") => {
    try {
      setLoading(true);
      const res = await getEmployeesForExport(filters);
      if (!res.success || !res.employees) {
        throw new Error(res.error || "Failed to fetch employee records");
      }

      const employees = res.employees;

      if (format === "csv") {
        const dataToExport = employees.map((emp: any) => ({
          "Employee Code": emp.employeeCode || "",
          "Name": emp.name,
          "Email": emp.email || "",
          "Phone": emp.phone || "",
          "Designation": emp.designation || "",
          "Department": emp.departmentRelation?.name || emp.department || "",
          "Employee Type": emp.employeeType?.name || "",
          "Gross Salary": emp.salary || 0,
          "Status": emp.status,
          "Joining Date": emp.joiningDate ? emp.joiningDate.split("T")[0] : "",
          "Biometric PIN": emp.deviceMappings?.map((m: any) => m.deviceUserId).join("; ") || ""
        }));

        exportToCSV(dataToExport, { filename: "employees-list.csv" });
        toast({ title: "Success", description: "Employee list CSV downloaded successfully" });
      } else {
        // PDF Export
        const doc = new jsPDF("landscape");
        doc.setFontSize(16);
        doc.text("Employee List Report", 14, 15);
        doc.setFontSize(9);
        doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 21);

        const tableData = employees.map((emp: any) => [
          emp.employeeCode || "N/A",
          emp.name,
          emp.email || "N/A",
          emp.phone || "N/A",
          emp.designation || "N/A",
          emp.departmentRelation?.name || emp.department || "N/A",
          emp.employeeType?.name || "N/A",
          emp.salary ? emp.salary.toFixed(2) : "0.00",
          emp.status,
          emp.joiningDate ? new Date(emp.joiningDate).toLocaleDateString() : "N/A",
          emp.deviceMappings?.map((m: any) => m.deviceUserId).join("; ") || "N/A"
        ]);

        autoTable(doc, {
          startY: 26,
          head: [["Code", "Name", "Email", "Phone", "Designation", "Department", "Type", "Gross Salary", "Status", "Joining", "Biometric ID"]],
          body: tableData,
          theme: "striped",
          headStyles: { fillColor: [41, 128, 185], textColor: 255 },
          styles: { fontSize: 8 }
        });

        doc.save("employees-list.pdf");
        toast({ title: "Success", description: "Employee list PDF downloaded successfully" });
      }
    } catch (err: any) {
      console.error(err);
      toast({
        variant: "destructive",
        title: "Export Failed",
        description: err.message || "An error occurred during export"
      });
    } finally {
      setLoading(false);
    }
  };

  // Export Attendance Sheets
  const handleExportAttendance = async (format: "csv" | "pdf") => {
    try {
      if (!fromDate || !toDate) {
        throw new Error("Please specify both Start Date and End Date");
      }
      setLoading(true);
      const res = await getAttendancesForExport({
        fromDate,
        toDate,
        employeeTypeId: filters.employeeTypeId,
        departmentId: filters.departmentId,
        search: filters.search
      });

      if (!res.success || !res.employees || !res.attendances) {
        throw new Error(res.error || "Failed to fetch attendance records");
      }

      const employees = res.employees;
      const attendances = res.attendances;

      if (employees.length === 0) {
        toast({
          variant: "destructive",
          title: "No Records",
          description: "No employee records found for the selected filters"
        });
        return;
      }

      // Generate all dates in the range
      const dates: Date[] = [];
      const startD = new Date(fromDate);
      const endD = new Date(toDate);
      startD.setHours(0, 0, 0, 0);
      endD.setHours(0, 0, 0, 0);
      
      const currentD = new Date(startD);
      while (currentD <= endD) {
        dates.push(new Date(currentD));
        currentD.setDate(currentD.getDate() + 1);
      }

      // Helper to format date in local timezone
      const getLocalDateString = (d: Date | string) => {
        const dateObj = typeof d === "string" ? new Date(d) : d;
        const year = dateObj.getFullYear();
        const month = String(dateObj.getMonth() + 1).padStart(2, "0");
        const day = String(dateObj.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
      };

      // Map attendance for quick lookup: employeeId_dateString -> attendance record
      const attendanceMap: Record<string, any> = {};
      attendances.forEach((att: any) => {
        const key = `${att.employeeId}_${getLocalDateString(att.date)}`;
        attendanceMap[key] = att;
      });

      const weekends = res.weekends || [0, 6];

      // Status translation
      const getStatusChar = (att: any, date: Date) => {
        if (att) {
          if (att.status === "WEEKEND") return "F";
          if (att.status === "ABSENT") return "A";
          if (att.status === "LEAVE") return "L";
          if (att.status === "HOLIDAY") return "H";
          if (att.workHours > 0) return att.workHours.toFixed(1);
          if (att.status === "PRESENT" || att.status === "LATE" || att.status === "HALF_DAY") {
            return att.workHours > 0 ? att.workHours.toFixed(1) : "P";
          }
        }
        // Fallback: Check if date is in the configured weekends list
        if (weekends.includes(date.getDay())) {
          return "F";
        }
        return "";
      };

      // Process rows
      const rowsData = employees.map((emp: any) => {
        let totalHrs = 0;
        let totalLate = 0;
        let totalOT = 0;
        
        const dayValues: Record<string, string> = {};
        
        dates.forEach((date) => {
          const dateStr = getLocalDateString(date);
          const key = `${emp.id}_${dateStr}`;
          const att = attendanceMap[key];
          
          if (att) {
            totalHrs += att.workHours || 0;
            totalLate += att.lateMinutes || 0;
            totalOT += att.otHours || 0;
          }
          
          dayValues[dateStr] = getStatusChar(att, date);
        });
        
        return {
          code: emp.employeeCode || "",
          name: emp.name,
          department: emp.departmentRelation?.name || emp.department || "",
          designation: emp.designation || "",
          dayValues,
          totalHrs,
          totalLate,
          totalOT
        };
      });

      if (format === "csv") {
        const csvHeaders = [
          "Employee Code",
          "Employee Name",
          "Department",
          "Designation",
          ...dates.map(d => String(d.getDate())),
          "Total Hrs",
          "Total Late",
          "Total OT"
        ];

        const dataToExport = rowsData.map((row: any) => {
          const item: Record<string, any> = {
            "Employee Code": row.code,
            "Employee Name": row.name,
            "Department": row.department,
            "Designation": row.designation
          };
          
          dates.forEach((d) => {
            const dateStr = getLocalDateString(d);
            const dayNum = String(d.getDate());
            item[dayNum] = row.dayValues[dateStr];
          });
          
          item["Total Hrs"] = row.totalHrs > 0 ? row.totalHrs.toFixed(2) : "";
          item["Total Late"] = row.totalLate > 0 ? row.totalLate : "";
          item["Total OT"] = row.totalOT > 0 ? row.totalOT.toFixed(2) : "";
          
          return item;
        });

        exportToCSV(dataToExport, { 
          filename: `attendance-matrix-${fromDate}-to-${toDate}.csv`,
          headers: csvHeaders
        });
        setIsOpen(false);
        toast({ title: "Success", description: "Attendance records CSV downloaded successfully" });
      } else {
        // PDF Export
        const doc = new jsPDF("landscape");
        doc.setFontSize(14);
        doc.text("Attendance Summary Report", 14, 15);
        doc.setFontSize(8);
        doc.text(`Period: ${fromDate} to ${toDate}`, 14, 20);

        const pdfHeaders = [
          "Code",
          "Name",
          "Dept",
          "Desig",
          ...dates.map(d => String(d.getDate())),
          "Hrs",
          "Late",
          "OT"
        ];

        const tableBody = rowsData.map((row: any) => [
          row.code,
          row.name,
          row.department,
          row.designation,
          ...dates.map(d => row.dayValues[getLocalDateString(d)]),
          row.totalHrs > 0 ? row.totalHrs.toFixed(1) : "",
          row.totalLate > 0 ? String(row.totalLate) : "",
          row.totalOT > 0 ? row.totalOT.toFixed(1) : ""
        ]);

        autoTable(doc, {
          startY: 24,
          head: [pdfHeaders],
          body: tableBody,
          theme: "grid",
          styles: { fontSize: 5, cellPadding: 1 },
          headStyles: { fillColor: [39, 174, 96], textColor: 255, fontStyle: "bold" },
          columnStyles: {
            0: { cellWidth: 15 }, // Code
            1: { cellWidth: 25 }, // Name
            2: { cellWidth: 15 }, // Dept
            3: { cellWidth: 15 }  // Desig
          }
        });

        doc.save(`attendance-matrix-${fromDate}-to-${toDate}.pdf`);
        setIsOpen(false);
        toast({ title: "Success", description: "Attendance records PDF downloaded successfully" });
      }
    } catch (err: any) {
      console.error(err);
      toast({
        variant: "destructive",
        title: "Export Failed",
        description: err.message || "An error occurred during export"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex gap-2">
      {/* 1. Export Employee Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" disabled={loading}>
            <FiDownload className="mr-2 h-4 w-4" />
            Export Employee
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => handleExportEmployee("csv")}>
            <FiFileText className="mr-2 h-4 w-4 text-emerald-600" />
            Export CSV
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleExportEmployee("pdf")}>
            <FiFile className="mr-2 h-4 w-4 text-indigo-600" />
            Export PDF
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* 2. Export Attendances Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" disabled={loading}>
            <FiFileText className="mr-2 h-4 w-4" />
            Export Attendances
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Export Attendance Sheet</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="from-date" className="text-right font-medium">
                From Date
              </Label>
              <Input
                id="from-date"
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="to-date" className="text-right font-medium">
                To Date
              </Label>
              <Input
                id="to-date"
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter className="flex sm:justify-between gap-2 w-full mt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
              className="mr-auto sm:mr-0 flex items-center gap-1.5"
              disabled={loading}
            >
              <FiX className="h-4 w-4" />
              Cancel
            </Button>
            <div className="flex gap-2 justify-end">
              <Button
                type="button"
                onClick={() => handleExportAttendance("csv")}
                disabled={loading}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium flex items-center gap-1.5"
              >
                <FiFileText className="h-4 w-4" />
                CSV
              </Button>
              <Button
                type="button"
                onClick={() => handleExportAttendance("pdf")}
                disabled={loading}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium flex items-center gap-1.5"
              >
                <FiFile className="h-4 w-4" />
                PDF
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
