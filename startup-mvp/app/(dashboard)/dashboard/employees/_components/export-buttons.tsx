"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FiDownload, FiFileText, FiTable } from "react-icons/fi";
import { useToast } from "@/hooks/use-toast";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";

interface EmployeeExportData {
  id: string;
  name: string;
  employeeCode: string | null;
  email: string | null;
  phone: string | null;
  status: string;
  designation: string | null;
  department: string | null;
  salary: any;
  joiningDate: Date | string | null;
}

interface ExportButtonsProps {
  employees: EmployeeExportData[];
}

export default function EmployeeExportButtons({ employees }: ExportButtonsProps) {
  const { toast } = useToast();
  const [isExporting, setIsExporting] = useState(false);

  const exportCSV = () => {
    try {
      const headers = ["Employee Code", "Full Name", "Designation", "Department", "Email", "Phone", "Status", "Salary (BDT)", "Joining Date"];
      const rows = employees.map((emp) => [
        `"${emp.employeeCode || ""}"`,
        `"${emp.name || ""}"`,
        `"${emp.designation || ""}"`,
        `"${emp.department || ""}"`,
        `"${emp.email || ""}"`,
        `"${emp.phone || ""}"`,
        `"${emp.status || "active"}"`,
        `"${emp.salary ? Number(emp.salary) : 0}"`,
        `"${emp.joiningDate ? format(new Date(emp.joiningDate), "yyyy-MM-dd") : ""}"`,
      ]);

      const csvContent =
        "data:text/csv;charset=utf-8," +
        [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `Employees_Export_${format(new Date(), "yyyyMMdd_HHmm")}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "Export Success",
        description: `${employees.length} employee records exported to CSV`,
      });
    } catch (err: any) {
      toast({
        title: "Export Failed",
        description: err.message || "Failed to export CSV",
        variant: "destructive",
      });
    }
  };

  const exportExcelStream = () => {
    // Append hidden iframe to trigger API backend export stream
    const iframe = document.createElement("iframe");
    iframe.style.display = "none";
    iframe.src = "/api/export/employees?format=excel";
    document.body.appendChild(iframe);

    setTimeout(() => {
      document.body.removeChild(iframe);
    }, 3000);

    toast({
      title: "Excel Download Started",
      description: "Generating employee Excel stream file...",
    });
  };

  const exportPDF = () => {
    try {
      setIsExporting(true);
      const doc = new jsPDF({ orientation: "landscape" });

      // Header Banner
      doc.setFillColor(41, 128, 185); // Blue header
      doc.rect(0, 0, 297, 24, "F");

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text("EMPLOYEE MASTER DIRECTORY REPORT", 14, 14);

      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.text(`ffERP System | Generated: ${format(new Date(), "yyyy-MM-dd HH:mm")} | Total Records: ${employees.length}`, 14, 20);

      const tableBody = employees.map((emp, index) => [
        index + 1,
        emp.employeeCode || "-",
        emp.name,
        emp.designation || "-",
        emp.department || "-",
        emp.email || "-",
        emp.phone || "-",
        emp.status.toUpperCase(),
        emp.salary ? `BDT ${Number(emp.salary).toLocaleString()}` : "-",
        emp.joiningDate ? format(new Date(emp.joiningDate), "yyyy-MM-dd") : "-",
      ]);

      autoTable(doc, {
        startY: 28,
        head: [["#", "Code", "Name", "Designation", "Department", "Email", "Phone", "Status", "Salary", "Joining Date"]],
        body: tableBody,
        theme: "striped",
        headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: "bold", fontSize: 8 },
        alternateRowStyles: { fillColor: [245, 247, 250] },
        styles: { fontSize: 8, cellPadding: 2.5 },
      });

      doc.save(`Employees_List_${format(new Date(), "yyyyMMdd")}.pdf`);

      toast({
        title: "PDF Generated",
        description: "Employee PDF report created successfully",
      });
    } catch (err: any) {
      toast({
        title: "PDF Generation Error",
        description: err.message || "Failed to generate PDF",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <FiDownload className="h-4 w-4" />
          Export Data
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={exportCSV} className="gap-2">
          <FiTable className="text-green-600 h-4 w-4" />
          <span>Export CSV Spreadsheet</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportExcelStream} className="gap-2">
          <FiTable className="text-blue-600 h-4 w-4" />
          <span>Export Excel Stream (.xlsx)</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportPDF} disabled={isExporting} className="gap-2">
          <FiFileText className="text-red-500 h-4 w-4" />
          <span>Export PDF Landscape</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
