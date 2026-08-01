"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FiDownload, FiFileText, FiFile } from "react-icons/fi";
import { useToast } from "@/hooks/use-toast";
import { getAllCategoriesForExport } from "../_actions/category.action";
import { exportToCSV } from "@/lib/utils/export-csv";
import { exportToExcel } from "@/lib/utils/export-excel";

interface ExportCategoriesButtonProps {
  search?: string;
  tab?: string;
}

export default function ExportCategoriesButton({
  search = "",
  tab = "all",
}: ExportCategoriesButtonProps) {
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();

  const handleExport = async (format: "csv" | "excel") => {
    try {
      setIsExporting(true);
      const statusParam = tab === "trash" ? "trash" : "all";
      const result = await getAllCategoriesForExport(search, statusParam);

      if (!result.success || !result.categories) {
        toast({
          title: "Export Failed",
          description: result.error || "Failed to fetch categories for export",
          variant: "destructive",
        });
        return;
      }

      if (result.categories.length === 0) {
        toast({
          title: "No Data",
          description: "No categories available to export",
        });
        return;
      }

      const formattedData = result.categories.map((cat: any) => ({
        "Category Name": cat.name || "",
        "Type": cat.parentId ? "Sub-Category" : "Primary Category",
        "Parent Category": cat.parent?.name || "-",
        "Description": cat.description || "-",
        "Total Items": cat._count?.items ?? 0,
        "Sub-Categories": cat._count?.children ?? 0,
        "Status": cat.status || "",
        "Created At": cat.createdAt ? new Date(cat.createdAt).toISOString().split("T")[0] : "",
      }));

      const dateStr = new Date().toISOString().split("T")[0];

      if (format === "csv") {
        exportToCSV(formattedData, {
          filename: `categories-export-${dateStr}.csv`,
        });
        toast({
          title: "Success",
          description: `Exported ${formattedData.length} categories to CSV`,
        });
      } else {
        exportToExcel(formattedData, {
          filename: `categories-export-${dateStr}.xlsx`,
          sheetName: "Categories",
        });
        toast({
          title: "Success",
          description: `Exported ${formattedData.length} categories to Excel`,
        });
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "An unexpected error occurred during export",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" disabled={isExporting}>
          <FiDownload className="mr-2 h-4 w-4" />
          {isExporting ? "Exporting..." : "Export"}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleExport("csv")}>
          <FiFileText className="mr-2 h-4 w-4" />
          Export as CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport("excel")}>
          <FiFile className="mr-2 h-4 w-4" />
          Export as Excel
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
