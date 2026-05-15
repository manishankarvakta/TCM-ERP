"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FiDownload, FiFilter, FiPrinter } from "react-icons/fi";
import { exportToExcel } from "@/lib/utils/export-excel";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";

interface PayrollReportViewProps {
  data: any[];
  departments: any[];
  branches: any[];
  filters: any;
}

export default function PayrollReportView({
  data,
  departments,
  branches,
  filters,
}: PayrollReportViewProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handleFilterChange = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== "all") {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleExportExcel = () => {
    exportToExcel(data, {
      filename: `Payroll_Report_${new Date().toISOString().split("T")[0]}.xlsx`,
      sheetName: "Payroll",
    });
  };

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);
  const months = [
    { value: "1", label: "January" },
    { value: "2", label: "February" },
    { value: "3", label: "March" },
    { value: "4", label: "April" },
    { value: "5", label: "May" },
    { value: "6", label: "June" },
    { value: "7", label: "July" },
    { value: "8", label: "August" },
    { value: "9", label: "September" },
    { value: "10", label: "October" },
    { value: "11", label: "November" },
    { value: "12", label: "December" },
  ];

  const totalGross = data.reduce((sum, row) => sum + row.grossPay, 0);
  const totalDeduction = data.reduce((sum, row) => sum + row.totalDeduction, 0);
  const totalNet = data.reduce((sum, row) => sum + row.netPay, 0);

  return (
    <div className="space-y-4">
      <Card className="border-none shadow-sm bg-slate-50/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <FiFilter className="h-4 w-4" /> Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1">
              <label className="text-xs font-medium">Month</label>
              <Select
                value={filters.month?.toString() || "all"}
                onValueChange={(v) => handleFilterChange("month", v)}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="All Months" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Months</SelectItem>
                  {months.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium">Year</label>
              <Select
                value={filters.year?.toString() || "all"}
                onValueChange={(v) => handleFilterChange("year", v)}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="All Years" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Years</SelectItem>
                  {years.map((y) => (
                    <SelectItem key={y} value={y.toString()}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium">Department</label>
              <Select
                value={filters.departmentId || "all"}
                onValueChange={(v) => handleFilterChange("departmentId", v)}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="All Departments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {departments.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-9 flex-1"
                onClick={() => router.push(pathname)}
              >
                Reset
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-none shadow-sm bg-blue-50/50">
          <CardContent className="pt-6">
            <div className="text-xs text-blue-600 font-medium uppercase tracking-wider">Total Gross Pay</div>
            <div className="text-2xl font-bold text-blue-900 mt-1">৳{totalGross.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm bg-red-50/50">
          <CardContent className="pt-6">
            <div className="text-xs text-red-600 font-medium uppercase tracking-wider">Total Deductions</div>
            <div className="text-2xl font-bold text-red-900 mt-1">৳{totalDeduction.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm bg-green-50/50">
          <CardContent className="pt-6">
            <div className="text-xs text-green-600 font-medium uppercase tracking-wider">Total Net Payable</div>
            <div className="text-2xl font-bold text-green-900 mt-1">৳{totalNet.toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-none shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg font-medium">Payroll Data ({data.length} items)</CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleExportExcel}>
              <FiDownload className="h-4 w-4 mr-2" /> Excel
            </Button>
            <Button variant="outline" size="sm" onClick={() => window.print()}>
              <FiPrinter className="h-4 w-4 mr-2" /> Print
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/50">
                  <TableHead>Period</TableHead>
                  <TableHead>Employee</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead className="text-right">Gross Pay</TableHead>
                  <TableHead className="text-right">Deductions</TableHead>
                  <TableHead className="text-right">Net Pay</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">
                      No payroll records found for the selected period.
                    </TableCell>
                  </TableRow>
                ) : (
                  data.map((row, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-mono text-xs">{row.period}</TableCell>
                      <TableCell>
                        <div className="font-medium">{row.employeeName}</div>
                        <div className="text-xs text-muted-foreground">{row.employeeCode}</div>
                      </TableCell>
                      <TableCell className="text-xs">{row.department}</TableCell>
                      <TableCell className="text-right font-medium">৳{row.grossPay.toLocaleString()}</TableCell>
                      <TableCell className="text-right text-red-600">৳{row.totalDeduction.toLocaleString()}</TableCell>
                      <TableCell className="text-right text-green-700 font-bold">৳{row.netPay.toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px] uppercase">
                          {row.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
