"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FiDownload, FiFileText, FiFile, FiX } from "react-icons/fi";
import { getSingleEmployeeAttendanceForExport } from "../_actions/export.action";
import { exportToCSV } from "@/lib/utils/export-csv";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface ExportSingleAttendanceProps {
  employeeId: string;
  employeeName: string;
}

export default function ExportSingleAttendance({
  employeeId,
  employeeName,
}: ExportSingleAttendanceProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  // Set default date range: first day of current month to today
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
  const [fromDate, setFromDate] = useState(firstDay.toISOString().split("T")[0]);
  const [toDate, setToDate] = useState(now.toISOString().split("T")[0]);

  const handleExport = async (format: "csv" | "pdf") => {
    try {
      setLoading(true);
      const res = await getSingleEmployeeAttendanceForExport(employeeId, fromDate, toDate);

      if (!res.success || !res.employee || !res.attendances) {
        throw new Error(res.error || "Failed to fetch attendance records");
      }

      const emp = res.employee;
      const attendances = res.attendances;
      const weekends = res.weekends || [0, 6];

      // Check if employee's shift supports breaks (breakType is not NONE and breakDuration > 0)
      const hasBreaks = !!(emp.shift && emp.shift.breakType !== "NONE" && emp.shift.breakDuration > 0);

      // Generate all dates in range
      const start = new Date(fromDate);
      const end = new Date(toDate);
      const datesList: Date[] = [];
      const temp = new Date(start);

      while (temp <= end) {
        datesList.push(new Date(temp));
        temp.setDate(temp.getDate() + 1);
      }

      // Map attendances for lookup
      const attMap: Record<string, any> = {};
      attendances.forEach((att: any) => {
        const dStr = att.date.split("T")[0];
        attMap[dStr] = att;
      });

      // Format helpers
      const getLocalDateString = (d: Date) => {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
      };

      const getDayName = (d: Date) => {
        return d.toLocaleDateString("en-US", { weekday: "long" });
      };

      const formatTime = (isoString: string | null) => {
        if (!isoString) return "--:--";
        const dateObj = new Date(isoString);
        return dateObj.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
          timeZone: "Asia/Dhaka", // Database stores punch time correctly formatted, display in business timezone
        });
      };

      // Compile rows
      let totalWorkHrs = 0;
      let totalOtHrs = 0;
      let totalLateMins = 0;
      let totalBreakLateMins = 0;
      let presentDays = 0;
      let absentDays = 0;
      let weekendDays = 0;
      let leaveDays = 0;
      let holidayDays = 0;

      const rows = datesList.map((d) => {
        const dStr = getLocalDateString(d);
        const dayName = getDayName(d);
        const att = attMap[dStr];

        let status = "";
        let checkInStr = "--:--";
        let checkOutStr = "--:--";
        let breakOutStr = "--:--";
        let breakInStr = "--:--";
        let workHrs = 0;
        let otHrs = 0;
        let lateMins = 0;
        let breakLateMins = 0;

        if (att) {
          status = att.status;
          workHrs = att.workHours;
          otHrs = att.otHours;
          lateMins = att.lateMinutes;
          breakLateMins = att.breakLateMinutes || 0;
          checkInStr = formatTime(att.checkIn);
          checkOutStr = formatTime(att.checkOut);
          breakOutStr = formatTime(att.breakCheckOut);
          breakInStr = formatTime(att.breakCheckIn);

          if (status === "WEEKEND") weekendDays++;
          else if (status === "ABSENT") absentDays++;
          else if (status === "LEAVE") leaveDays++;
          else if (status === "HOLIDAY") holidayDays++;
          else presentDays++;
        } else {
          // Fallback weekend check
          if (weekends.includes(d.getDay())) {
            status = "WEEKEND";
            weekendDays++;
          } else {
            status = "N/A";
          }
        }

        totalWorkHrs += workHrs;
        totalOtHrs += otHrs;
        totalLateMins += lateMins;
        totalBreakLateMins += breakLateMins;

        return {
          date: dStr,
          day: dayName,
          status,
          checkIn: checkInStr,
          checkOut: checkOutStr,
          breakOut: breakOutStr,
          breakIn: breakInStr,
          workHours: workHrs,
          otHours: otHrs,
          lateMinutes: lateMins,
          breakLateMinutes: breakLateMins,
        };
      });

      if (format === "csv") {
        // CSV Export
        const dataToExport = rows.map((r) => {
          const rowData: any = {
            Date: r.date,
            Day: r.day,
            Status: r.status,
            "Check In": r.checkIn,
            "Check Out": r.checkOut,
          };
          if (hasBreaks) {
            rowData["Break Out"] = r.breakOut;
            rowData["Break In"] = r.breakIn;
            rowData["Break Late (Min)"] = r.breakLateMinutes;
          }
          rowData["Work Hours"] = r.workHours.toFixed(1);
          rowData["Overtime Hours"] = r.otHours.toFixed(1);
          rowData["Late Minutes"] = r.lateMinutes;
          return rowData;
        });

        // Append totals row
        const totalsRow: any = {
          Date: "TOTALS / SUMMARY",
          Day: `Present: ${presentDays} | Absent: ${absentDays} | Leave: ${leaveDays} | Holiday: ${holidayDays}`,
          Status: `Weekend: ${weekendDays}`,
          "Check In": "",
          "Check Out": "",
        };
        if (hasBreaks) {
          totalsRow["Break Out"] = "";
          totalsRow["Break In"] = "";
          totalsRow["Break Late (Min)"] = totalBreakLateMins;
        }
        totalsRow["Work Hours"] = totalWorkHrs.toFixed(1);
        totalsRow["Overtime Hours"] = totalOtHrs.toFixed(1);
        totalsRow["Late Minutes"] = totalLateMins;
        dataToExport.push(totalsRow);

        exportToCSV(dataToExport, { filename: `attendance_${emp.employeeCode || emp.name}.csv` });
        toast({ title: "Success", description: "Attendance sheet CSV downloaded successfully" });
      } else {
        // PDF Export - dynamic orientation based on column width
        const doc = new jsPDF(hasBreaks ? "landscape" : "portrait");

        // Header Title
        doc.setFontSize(16);
        doc.setFont("helvetica", "bold");
        doc.text("EMPLOYEE ATTENDANCE REPORT", 14, 15);

        // Meta box info
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text(`Employee Code :  ${emp.employeeCode || "N/A"}`, 14, 25);
        doc.text(`Employee Name :  ${emp.name}`, 14, 30);
        doc.text(`Designation   :  ${emp.designation || "N/A"}`, 14, 35);
        doc.text(`Department    :  ${emp.department}`, 14, 40);

        const rightAlignX = hasBreaks ? 215 : 145;
        doc.text(`Report Period :  ${fromDate} to ${toDate}`, rightAlignX, 25);
        doc.text(`Printed On    :  ${new Date().toLocaleDateString()}`, rightAlignX, 30);

        // AutoTable body data
        const tableData = rows.map((r) => {
          const rowData = [
            r.date,
            r.day.slice(0, 3), // short day name (e.g. Mon, Tue)
            r.status,
            r.checkIn,
            r.checkOut,
          ];
          if (hasBreaks) {
            rowData.push(r.breakOut);
            rowData.push(r.breakIn);
            rowData.push(r.breakLateMinutes > 0 ? String(r.breakLateMinutes) : "--");
          }
          rowData.push(r.workHours > 0 ? r.workHours.toFixed(1) : "--");
          rowData.push(r.otHours > 0 ? r.otHours.toFixed(1) : "--");
          rowData.push(r.lateMinutes > 0 ? String(r.lateMinutes) : "--");
          return rowData;
        });

        const headers = ["Date", "Day", "Status", "Check-In", "Check-Out"];
        if (hasBreaks) {
          headers.push("Break Out", "Break In", "Break Late (m)");
        }
        headers.push("Work Hrs", "OT Hrs", "Gate Late (m)");

        autoTable(doc, {
          startY: 46,
          head: [headers],
          body: tableData,
          theme: "grid",
          headStyles: { fillColor: [30, 41, 59], textColor: 255 },
          styles: { fontSize: 8 },
        });

        // Summary box after table with page overflow check
        const pageHeight = doc.internal.pageSize.height || doc.internal.pageSize.getHeight();
        const requiredSpace = 65; // Height needed for summary stats + signature lines
        let finalY = (doc as any).lastAutoTable.finalY + 10;

        if (finalY + requiredSpace > pageHeight - 15) {
          doc.addPage();
          finalY = 20; // reset to top of new page
        }

        doc.setFont("helvetica", "bold");
        doc.text("Summary statistics:", 14, finalY);

        doc.setFont("helvetica", "normal");
        doc.text(`Present Days: ${presentDays}`, 14, finalY + 6);
        doc.text(`Absent Days : ${absentDays}`, 14, finalY + 11);
        doc.text(`Weekend Days: ${weekendDays}`, 14, finalY + 16);
        doc.text(`Leave Days  : ${leaveDays} | Holiday: ${holidayDays}`, 14, finalY + 21);

        const secondColX = hasBreaks ? 100 : 80;
        doc.text(`Total Work Hours: ${totalWorkHrs.toFixed(1)} hrs`, secondColX, finalY + 6);
        doc.text(`Total OT Hours  : ${totalOtHrs.toFixed(1)} hrs`, secondColX, finalY + 11);
        doc.text(`Total Gate Late : ${totalLateMins} mins`, secondColX, finalY + 16);
        if (hasBreaks) {
          doc.text(`Total Break Late: ${totalBreakLateMins} mins`, secondColX, finalY + 21);
        }

        // Sign off section
        const sigLineLength = hasBreaks ? 56 : 46;
        const authSigX = hasBreaks ? 210 : 130;
        doc.line(14, finalY + 40, 14 + sigLineLength, finalY + 40);
        doc.text("Employee Signature", 14, finalY + 44);

        doc.line(authSigX, finalY + 40, authSigX + sigLineLength, finalY + 40);
        doc.text("Authorized Signature", authSigX, finalY + 44);

        doc.save(`attendance_${emp.employeeCode || emp.name}.pdf`);
        toast({ title: "Success", description: "Attendance sheet PDF downloaded successfully" });
      }
      setIsOpen(false);
    } catch (err: any) {
      console.error(err);
      toast({
        variant: "destructive",
        title: "Error",
        description: err.message || "Something went wrong while exporting.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="border-primary/30 text-primary bg-primary/5 hover:bg-primary/10">
          <FiDownload className="mr-2 h-4 w-4" />
          Export Attendance
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Export Attendance Sheet</DialogTitle>
          <DialogDescription>
            Select the date range and format to export the attendance details for <strong>{employeeName}</strong>.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="single-from-date" className="text-right">
              From Date
            </Label>
            <Input
              id="single-from-date"
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="single-to-date" className="text-right">
              To Date
            </Label>
            <Input
              id="single-to-date"
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="col-span-3"
            />
          </div>
        </div>

        <DialogFooter className="flex sm:justify-between gap-2 mt-2">
          <Button
            variant="ghost"
            onClick={() => setIsOpen(false)}
            disabled={loading}
            className="flex items-center gap-1"
          >
            <FiX className="h-4 w-4" />
            Cancel
          </Button>

          <div className="flex gap-2">
            <Button
              variant="outline"
              disabled={loading}
              onClick={() => handleExport("csv")}
              className="flex items-center gap-1"
            >
              <FiFileText className="h-4 w-4" />
              CSV
            </Button>
            <Button
              disabled={loading}
              onClick={() => handleExport("pdf")}
              className="flex items-center gap-1"
            >
              <FiFile className="h-4 w-4" />
              PDF
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
