/**
 * CSV Export Utility
 * Converts data arrays to CSV format and triggers browser download
 */

export interface CSVExportOptions {
  filename?: string;
  headers?: string[];
  delimiter?: string;
}

/**
 * Convert array of objects to CSV string
 */
export function arrayToCSV(
  data: Record<string, any>[],
  headers?: string[],
  delimiter: string = ","
): string {
  if (data.length === 0) {
    return "";
  }

  // Get headers from first object if not provided
  const csvHeaders = headers || Object.keys(data[0]);

  // Escape and quote values that contain delimiter, newline, or quotes
  const escapeValue = (value: any): string => {
    if (value === null || value === undefined) {
      return "";
    }
    const stringValue = String(value);
    if (
      stringValue.includes(delimiter) ||
      stringValue.includes("\n") ||
      stringValue.includes('"')
    ) {
      return `"${stringValue.replace(/"/g, '""')}"`;
    }
    return stringValue;
  };

  // Build CSV rows
  const rows: string[] = [];

  // Header row
  rows.push(csvHeaders.map(escapeValue).join(delimiter));

  // Data rows
  for (const row of data) {
    const values = csvHeaders.map((header) => escapeValue(row[header]));
    rows.push(values.join(delimiter));
  }

  return rows.join("\n");
}

/**
 * Export data to CSV file
 */
export function exportToCSV(
  data: Record<string, any>[],
  options: CSVExportOptions = {}
): void {
  const {
    filename = `export-${new Date().toISOString().split("T")[0]}.csv`,
    headers,
    delimiter = ",",
  } = options;

  const csvContent = arrayToCSV(data, headers, delimiter);

  // Create blob and download
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Format number for CSV (handle decimals, currency, etc.)
 */
export function formatCSVNumber(value: number, decimals: number = 2): string {
  return value.toFixed(decimals);
}

/**
 * Format date for CSV
 */
export function formatCSVDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toISOString().split("T")[0];
}
