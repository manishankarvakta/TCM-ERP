"use client";

import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  FiDownload,
  FiFileText,
  FiFile,
  FiChevronLeft,
  FiChevronRight,
} from "react-icons/fi";
import { exportToCSV } from "@/lib/utils/export-csv";
import { exportToExcel } from "@/lib/utils/export-excel";

export interface ReportTableColumn {
  key: string;
  label: string;
  sortable?: boolean;
  align?: "left" | "right" | "center";
  format?: (value: any) => string;
}

interface ReportTableProps {
  title?: string;
  columns: ReportTableColumn[];
  data: Record<string, any>[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    onPageChange: (page: number) => void;
  };
  exportFilename?: string;
  loading?: boolean;
  emptyMessage?: string;
  onExport?: (type: "csv" | "excel") => void | Promise<void>;
}

export default function ReportTable({
  title,
  columns,
  data,
  pagination,
  exportFilename,
  loading = false,
  emptyMessage = "No data available",
  onExport,
}: ReportTableProps) {
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [isExporting, setIsExporting] = useState(false);

  const handleSort = (columnKey: string) => {
    if (sortColumn === columnKey) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(columnKey);
      setSortDirection("asc");
    }
  };

  const sortedData = [...data];
  if (sortColumn) {
    const column = columns.find((col) => col.key === sortColumn);
    sortedData.sort((a, b) => {
      let aVal = a[sortColumn];
      let bVal = b[sortColumn];

      if (column?.format) {
        // For formatted values, compare original values
        aVal = a[sortColumn];
        bVal = b[sortColumn];
      }

      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;

      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortDirection === "asc" ? aVal - bVal : bVal - aVal;
      }

      const aStr = String(aVal);
      const bStr = String(bVal);
      return sortDirection === "asc"
        ? aStr.localeCompare(bStr)
        : bStr.localeCompare(aStr);
    });
  }

  const handleExportCSV = async () => {
    if (onExport) {
      try {
        setIsExporting(true);
        await onExport("csv");
      } finally {
        setIsExporting(false);
      }
      return;
    }
    const headers = columns.map((col) => col.label);
    // Convert data to export format (handle formatted values)
    const exportData = data.map((row) => {
      const exportRow: Record<string, any> = {};
      columns.forEach((col) => {
        const value = row[col.key];
        // For formatted values, try to get a string representation
        if (col.format) {
          try {
            const formatted = col.format(value);
            // If format returns JSX/React element, use original value
            exportRow[col.label] =
              typeof formatted === "string" || typeof formatted === "number"
                ? formatted
                : value;
          } catch {
            exportRow[col.label] = value;
          }
        } else {
          exportRow[col.label] = value ?? "";
        }
      });
      return exportRow;
    });
    exportToCSV(exportData, { filename: `${exportFilename || "report"}.csv`, headers });
  };

  const handleExportExcel = async () => {
    if (onExport) {
      try {
        setIsExporting(true);
        await onExport("excel");
      } finally {
        setIsExporting(false);
      }
      return;
    }
    const headers = columns.map((col) => col.label);
    // Convert data to export format
    const exportData = data.map((row) => {
      const exportRow: Record<string, any> = {};
      columns.forEach((col) => {
        const value = row[col.key];
        if (col.format) {
          try {
            const formatted = col.format(value);
            exportRow[col.label] =
              typeof formatted === "string" || typeof formatted === "number"
                ? formatted
                : value;
          } catch {
            exportRow[col.label] = value;
          }
        } else {
          exportRow[col.label] = value ?? "";
        }
      });
      return exportRow;
    });
    exportToExcel(exportData, {
      filename: `${exportFilename || "report"}.xlsx`,
      headers,
    });
  };

  return (
    <Card>
      {title && (
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold">{title}</CardTitle>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" disabled={isExporting}>
                  <FiDownload className="h-4 w-4 mr-2" />
                  {isExporting ? "Exporting..." : "Export"}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleExportCSV}>
                  <FiFileText className="h-4 w-4 mr-2" />
                  Export as CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportExcel}>
                  <FiFile className="h-4 w-4 mr-2" />
                  Export as Excel
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
      )}
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-sm text-muted-foreground">Loading...</div>
          </div>
        ) : sortedData.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-sm text-muted-foreground">{emptyMessage}</div>
          </div>
        ) : (
          <>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    {columns.map((column) => (
                      <TableHead
                        key={column.key}
                        className={
                          column.align === "right"
                            ? "text-right"
                            : column.align === "center"
                            ? "text-center"
                            : "text-left"
                        }
                      >
                        {column.sortable ? (
                          <button
                            className="flex items-center gap-1 hover:text-foreground"
                            onClick={() => handleSort(column.key)}
                          >
                            {column.label}
                            {sortColumn === column.key && (
                              <span>{sortDirection === "asc" ? "↑" : "↓"}</span>
                            )}
                          </button>
                        ) : (
                          column.label
                        )}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedData.map((row, index) => (
                    <TableRow key={index}>
                      {columns.map((column) => {
                        const value = row[column.key];
                        const displayValue = column.format
                          ? column.format(value)
                          : value ?? "";

                        return (
                          <TableCell
                            key={column.key}
                            className={
                              column.align === "right"
                                ? "text-right"
                                : column.align === "center"
                                ? "text-center"
                                : "text-left"
                            }
                          >
                            {displayValue}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {pagination && pagination.totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-muted-foreground">
                  Showing {((pagination.page - 1) * pagination.limit) + 1} to{" "}
                  {Math.min(pagination.page * pagination.limit, pagination.total)}{" "}
                  of {pagination.total} results
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => pagination.onPageChange(pagination.page - 1)}
                    disabled={pagination.page === 1}
                  >
                    <FiChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <div className="text-sm">
                    Page {pagination.page} of {pagination.totalPages}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => pagination.onPageChange(pagination.page + 1)}
                    disabled={pagination.page === pagination.totalPages}
                  >
                    Next
                    <FiChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
