/**
 * Excel Export Utility
 * Converts data arrays to Excel format using xlsx library
 */

import * as XLSX from "xlsx";

export interface ExcelExportOptions {
  filename?: string;
  sheetName?: string;
  headers?: string[];
  columnWidths?: number[];
  headerStyle?: {
    font?: { bold?: boolean; color?: string };
    fill?: { fgColor?: { rgb?: string } };
    alignment?: { horizontal?: string; vertical?: string };
  };
}

/**
 * Export data to Excel file
 */
export function exportToExcel(
  data: Record<string, any>[],
  options: ExcelExportOptions = {}
): void {
  const {
    filename = `export-${new Date().toISOString().split("T")[0]}.xlsx`,
    sheetName = "Sheet1",
    headers,
    columnWidths,
  } = options;

  if (data.length === 0) {
    // Create empty workbook
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([headers || []]);
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    XLSX.writeFile(wb, filename);
    return;
  }

  // Get headers from first object if not provided
  const csvHeaders = headers || Object.keys(data[0]);

  // Prepare data array
  const rows: any[][] = [csvHeaders]; // Header row

  // Add data rows
  for (const row of data) {
    const values = csvHeaders.map((header) => {
      const value = row[header];
      // Handle null/undefined
      if (value === null || value === undefined) {
        return "";
      }
      // Handle dates
      if (value instanceof Date) {
        return value;
      }
      return value;
    });
    rows.push(values);
  }

  // Create worksheet
  const ws = XLSX.utils.aoa_to_sheet(rows);

  // Set column widths if provided
  if (columnWidths) {
    ws["!cols"] = columnWidths.map((width) => ({ wch: width }));
  } else {
    // Auto-size columns
    const maxWidth = 50;
    ws["!cols"] = csvHeaders.map(() => ({ wch: maxWidth }));
  }

  // Create workbook and add worksheet
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);

  // Write file
  XLSX.writeFile(wb, filename);
}

/**
 * Export multiple sheets to Excel
 */
export function exportToExcelMultiSheet(
  sheets: Array<{
    name: string;
    data: Record<string, any>[];
    headers?: string[];
    columnWidths?: number[];
  }>,
  filename: string = `export-${new Date().toISOString().split("T")[0]}.xlsx`
): void {
  const wb = XLSX.utils.book_new();

  for (const sheet of sheets) {
    if (sheet.data.length === 0) {
      const ws = XLSX.utils.aoa_to_sheet([sheet.headers || []]);
      XLSX.utils.book_append_sheet(wb, ws, sheet.name);
      continue;
    }

    const headers = sheet.headers || Object.keys(sheet.data[0]);
    const rows: any[][] = [headers];

    for (const row of sheet.data) {
      const values = headers.map((header) => {
        const value = row[header];
        if (value === null || value === undefined) {
          return "";
        }
        if (value instanceof Date) {
          return value;
        }
        return value;
      });
      rows.push(values);
    }

    const ws = XLSX.utils.aoa_to_sheet(rows);

    if (sheet.columnWidths) {
      ws["!cols"] = sheet.columnWidths.map((width) => ({ wch: width }));
    } else {
      ws["!cols"] = headers.map(() => ({ wch: 20 }));
    }

    XLSX.utils.book_append_sheet(wb, ws, sheet.name);
  }

  XLSX.writeFile(wb, filename);
}

/**
 * Format number for Excel
 */
export function formatExcelNumber(value: number, decimals: number = 2): number {
  return Number(value.toFixed(decimals));
}
