"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FiDownload, FiFilter, FiCalendar, FiPrinter } from "react-icons/fi";
import { exportToExcel } from "@/lib/utils/export-excel";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";

interface AttendanceReportViewProps {
  data: any[];
  employees: any[];
  departments: any[];
  branches: any[];
  filters: any;
}

const statusColors: any = {
  PRESENT: "bg-green-100 text-green-800",
  ABSENT: "bg-red-100 text-red-800",
  LEAVE: "bg-blue-100 text-blue-800",
  LATE: "bg-yellow-100 text-yellow-800",
  HALF_DAY: "bg-orange-100 text-orange-800",
};

export default function AttendanceReportView({
  data,
  employees,
  departments,
  branches,
  filters,
}: AttendanceReportViewProps) {
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
      filename: `Attendance_Report_${new Date().toISOString().split("T")[0]}.xlsx`,
      sheetName: "Attendance",
    });
  };

  return (
    <div className="space-y-4">
      <Card className="border-none shadow-sm bg-slate-50/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <FiFilter className="h-4 w-4" /> Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
            <div className="space-y-1">
              <label className="text-xs font-medium">Employee</label>
              <Select
                value={filters.employeeId || "all"}
                onValueChange={(v) => handleFilterChange("employeeId", v)}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="All Employees" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Employees</SelectItem>
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.name} ({emp.employeeCode})
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

            <div className="space-y-1">
              <label className="text-xs font-medium">Status</label>
              <Select
                value={filters.status || "all"}
                onValueChange={(v) => handleFilterChange("status", v)}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="PRESENT">Present</SelectItem>
                  <SelectItem value="ABSENT">Absent</SelectItem>
                  <SelectItem value="LEAVE">Leave</SelectItem>
                  <SelectItem value="LATE">Late</SelectItem>
                  <SelectItem value="HALF_DAY">Half Day</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium">From Date</label>
              <Input
                type="date"
                className="h-9"
                value={filters.dateFrom || ""}
                onChange={(e) => handleFilterChange("dateFrom", e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium">To Date</label>
              <Input
                type="date"
                className="h-9"
                value={filters.dateTo || ""}
                onChange={(e) => handleFilterChange("dateTo", e.target.value)}
              />
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

      <Card className="border-none shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg font-medium">Report Results ({data.length})</CardTitle>
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
                  <TableHead className="w-[100px]">Date</TableHead>
                  <TableHead>Employee</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Check-In</TableHead>
                  <TableHead>Check-Out</TableHead>
                  <TableHead className="text-right">Hours</TableHead>
                  <TableHead className="text-right">OT</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center">
                      No records found for the selected filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  data.map((row, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium whitespace-nowrap">{row.date}</TableCell>
                      <TableCell>
                        <div className="font-medium">{row.employeeName}</div>
                        <div className="text-xs text-muted-foreground">{row.employeeCode}</div>
                      </TableCell>
                      <TableCell className="text-xs">{row.department}</TableCell>
                      <TableCell>
                        <Badge className={`${statusColors[row.status] || ""} border-none shadow-none`}>
                          {row.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm font-mono">{row.checkIn}</TableCell>
                      <TableCell className="text-sm font-mono">{row.checkOut}</TableCell>
                      <TableCell className="text-right font-medium">{row.workHours.toFixed(2)}</TableCell>
                      <TableCell className="text-right text-orange-600 font-medium">{row.otHours.toFixed(2)}</TableCell>
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
