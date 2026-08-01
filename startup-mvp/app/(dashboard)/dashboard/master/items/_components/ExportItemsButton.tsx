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
import { getAllItemsForExport } from "../_actions/item.action";
import { exportToCSV } from "@/lib/utils/export-csv";
import { exportToExcel } from "@/lib/utils/export-excel";
import { ItemType } from "@prisma/client";

interface ExportItemsButtonProps {
  search?: string;
  tab?: string;
  itemType?: ItemType;
}

export default function ExportItemsButton({
  search = "",
  tab = "all",
  itemType,
}: ExportItemsButtonProps) {
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();

  const handleExport = async (format: "csv" | "excel") => {
    try {
      setIsExporting(true);
      const statusParam = tab === "trash" ? "trash" : "all";
      const result = await getAllItemsForExport(search, statusParam, itemType);

      if (!result.success || !result.items) {
        toast({
          title: "Export Failed",
          description: result.error || "Failed to fetch items for export",
          variant: "destructive",
        });
        return;
      }

      if (result.items.length === 0) {
        toast({
          title: "No Data",
          description: "No items available to export",
        });
        return;
      }

      const formattedData = result.items.map((item: any) => ({
        "Item Code": item.code || "",
        "Item Name": item.name || "",
        "Item Type": item.itemType || "",
        "Category": item.category?.name || "-",
        "Sub Category": item.subCategory?.name || "-",
        "Brand": item.brand?.name || "-",
        "Unit": item.unit?.symbol || "-",
        "Cost Price": item.costPrice ?? 0,
        "Sales Price": item.salesPrice ?? 0,
        "Wholesale Price": item.wholesalePrice ?? 0,
        "Track Inventory": item.trackInventory ? "Yes" : "No",
        "E-Commerce Enabled": item.isEnableEcom ? "Yes" : "No",
        "Barcode": item.barcode || "-",
        "VAT Enabled": item.isVatEnabled ? "Yes" : "No",
        "VAT Percentage": item.isVatEnabled ? `${item.vatPercentage}%` : "0%",
        "Status": item.status || "",
        "Created At": item.createdAt ? new Date(item.createdAt).toISOString().split("T")[0] : "",
      }));

      const dateStr = new Date().toISOString().split("T")[0];

      if (format === "csv") {
        exportToCSV(formattedData, {
          filename: `items-export-${dateStr}.csv`,
        });
        toast({
          title: "Success",
          description: `Exported ${formattedData.length} items to CSV`,
        });
      } else {
        exportToExcel(formattedData, {
          filename: `items-export-${dateStr}.xlsx`,
          sheetName: "Items",
        });
        toast({
          title: "Success",
          description: `Exported ${formattedData.length} items to Excel`,
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
