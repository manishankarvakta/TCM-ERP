"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FiDownload, FiFilter, FiPrinter, FiUserPlus } from "react-icons/fi";
import { exportToExcel } from "@/lib/utils/export-excel";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";

interface JoiningReportViewProps {
  data: any[];
  departments: any[];
  filters: any;
}

export default function JoiningReportView({
  data,
  departments,
  filters,
}: JoiningReportViewProps) {
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
      filename: `Joining_Report_${new Date().toISOString().split("T")[0]}.xlsx`,
      sheetName: "Joinings",
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
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
              <label className="text-xs font-medium">Joining From</label>
              <Input
                type="date"
                className="h-9"
                value={filters.dateFrom || ""}
                onChange={(e) => handleFilterChange("dateFrom", e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium">Joining To</label>
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
          <CardTitle className="text-lg font-medium flex items-center gap-2">
            <FiUserPlus className="h-5 w-5 text-primary" /> Staff Joining Data ({data.length})
          </CardTitle>
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
                  <TableHead>Joining Date</TableHead>
                  <TableHead>Employee</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Designation</TableHead>
                  <TableHead>Branch</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                      No new joinings recorded for this period.
                    </TableCell>
                  </TableRow>
                ) : (
                  data.map((row, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">{row.joiningDate}</TableCell>
                      <TableCell>
                        <div className="font-medium">{row.employeeName}</div>
                        <div className="text-xs text-muted-foreground">{row.employeeCode}</div>
                      </TableCell>
                      <TableCell>{row.department}</TableCell>
                      <TableCell>{row.designation}</TableCell>
                      <TableCell>{row.branch}</TableCell>
                      <TableCell>
                        <Badge variant={row.status === "active" ? "default" : "secondary"}>
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
