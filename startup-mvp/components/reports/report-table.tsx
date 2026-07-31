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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
    onLimitChange?: (limit: number) => void;
    limitOptions?: number[];
  };
  exportFilename?: string;
  loading?: boolean;
  emptyMessage?: string;
  onExport?: (type: "csv" | "excel") => void | Promise<void>;
  hideTopPagination?: boolean;
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
  hideTopPagination = false,
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

  const renderLimitSelector = () => {
    if (!pagination || !pagination.onLimitChange) return null;
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Rows per page:</span>
        <Select
          value={String(pagination.limit)}
          onValueChange={(val) => pagination.onLimitChange!(Number(val))}
        >
          <SelectTrigger className="w-[70px] h-8 text-xs">
            <SelectValue placeholder={String(pagination.limit)} />
          </SelectTrigger>
          <SelectContent>
            {(pagination.limitOptions || [20, 50, 100, 200]).map((opt) => (
              <SelectItem key={opt} value={String(opt)}>
                {opt}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  };

  const renderPaginationButtons = () => {
    if (!pagination || pagination.totalPages <= 1) return null;
    return (
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => pagination.onPageChange(pagination.page - 1)}
          disabled={pagination.page === 1}
        >
          <FiChevronLeft className="h-4 w-4 mr-1" />
          Previous
        </Button>
        
        <div className="flex items-center gap-1">
          {(() => {
            const pages: (number | string)[] = [];
            const windowSize = 2;
            const currentPage = pagination.page;
            const totalPages = pagination.totalPages;
            
            pages.push(1);
            const startRange = Math.max(2, currentPage - windowSize);
            const endRange = Math.min(totalPages - 1, currentPage + windowSize);
            
            if (startRange > 2) {
              pages.push("...");
            }
            
            for (let i = startRange; i <= endRange; i++) {
              pages.push(i);
            }
            
            if (endRange < totalPages - 1) {
              pages.push("...");
            }
            
            if (totalPages > 1) {
              pages.push(totalPages);
            }
            
            return pages.map((p, idx) => {
              if (p === "...") {
                return (
                  <span key={`dots-${idx}`} className="px-1 text-sm text-muted-foreground">
                    ...
                  </span>
                );
              }
              const isCurrent = p === currentPage;
              return (
                <Button
                  key={`page-${p}`}
                  variant={isCurrent ? "default" : "outline"}
                  size="sm"
                  className="h-8 w-8 p-0 text-xs"
                  onClick={() => pagination.onPageChange(p as number)}
                >
                  {p}
                </Button>
              );
            });
          })()}
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => pagination.onPageChange(pagination.page + 1)}
          disabled={pagination.page === pagination.totalPages}
        >
          Next
          <FiChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    );
  };

  return (
    <Card>
      {title && (
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <CardTitle className="text-base font-semibold">{title}</CardTitle>
            <div className="flex flex-wrap items-center gap-4">
              {!hideTopPagination && renderLimitSelector()}
              {!hideTopPagination && renderPaginationButtons()}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="default" className="bg-black text-white hover:bg-black/90 shadow-sm" size="sm" disabled={isExporting}>
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

            {pagination && (pagination.totalPages > 1 || pagination.onLimitChange) && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4">
                <div className="flex flex-wrap items-center gap-4">
                  <div className="text-sm text-muted-foreground">
                    Showing {((pagination.page - 1) * pagination.limit) + 1} to{" "}
                    {Math.min(pagination.page * pagination.limit, pagination.total)}{" "}
                    of {pagination.total} results
                  </div>
                  {renderLimitSelector()}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => pagination.onPageChange(pagination.page - 1)}
                    disabled={pagination.page === 1}
                  >
                    <FiChevronLeft className="h-4 w-4 mr-1" />
                    Previous
                  </Button>
                  
                  {pagination.totalPages > 1 && (
                    <div className="flex items-center gap-1">
                      {(() => {
                        const pages: (number | string)[] = [];
                        const windowSize = 2;
                        const currentPage = pagination.page;
                        const totalPages = pagination.totalPages;
                        
                        pages.push(1);
                        const startRange = Math.max(2, currentPage - windowSize);
                        const endRange = Math.min(totalPages - 1, currentPage + windowSize);
                        
                        if (startRange > 2) {
                          pages.push("...");
                        }
                        
                        for (let i = startRange; i <= endRange; i++) {
                          pages.push(i);
                        }
                        
                        if (endRange < totalPages - 1) {
                          pages.push("...");
                        }
                        
                        if (totalPages > 1) {
                          pages.push(totalPages);
                        }
                        
                        return pages.map((p, idx) => {
                          if (p === "...") {
                            return (
                              <span key={`dots-${idx}`} className="px-1 text-sm text-muted-foreground">
                                ...
                              </span>
                            );
                          }
                          const isCurrent = p === currentPage;
                          return (
                            <Button
                              key={`page-${p}`}
                              variant={isCurrent ? "default" : "outline"}
                              size="sm"
                              className="h-8 w-8 p-0 text-xs"
                              onClick={() => pagination.onPageChange(p as number)}
                            >
                              {p}
                            </Button>
                          );
                        });
                      })()}
                    </div>
                  )}

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => pagination.onPageChange(pagination.page + 1)}
                    disabled={pagination.page === pagination.totalPages}
                  >
                    Next
                    <FiChevronRight className="h-4 w-4 ml-1" />
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
