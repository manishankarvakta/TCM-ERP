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
import { getAllSalesForExport } from "../_actions/sale.action";
import { exportToCSV } from "@/lib/utils/export-csv";
import { exportToExcel } from "@/lib/utils/export-excel";
import { OrderType } from "@prisma/client";

interface ExportSalesButtonProps {
  search?: string;
  tab?: string;
  filters?: {
    billerId?: string;
    warehouseId?: string;
    type?: OrderType | "all";
    startDate?: string;
    endDate?: string;
    salesAssistantId?: string;
  };
}

export default function ExportSalesButton({
  search = "",
  tab = "all",
  filters = {},
}: ExportSalesButtonProps) {
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();

  const handleExport = async (format: "csv" | "excel") => {
    try {
      setIsExporting(true);
      const statusParam = tab === "trash" ? "trash" : "all";
      const result = await getAllSalesForExport(search, statusParam, filters as any);

      if (!result.success || !result.sales) {
        toast({
          title: "Export Failed",
          description: result.error || "Failed to fetch sales for export",
          variant: "destructive",
        });
        return;
      }

      if (result.sales.length === 0) {
        toast({
          title: "No Data",
          description: "No sales records available to export",
        });
        return;
      }

      const formattedData = result.sales.map((sale: any) => ({
        "Sale Number": sale.saleNumber || "",
        "Date": sale.date ? new Date(sale.date).toISOString().split("T")[0] : "",
        "Customer Name": sale.client?.name || "-",
        "Customer Phone": sale.client?.phone || "-",
        "Customer Email": sale.client?.email || "-",
        "Warehouse": sale.warehouse?.name || "-",
        "Order Type": sale.orderType || "",
        "Biller / Created By": sale.createdByUser?.name || "-",
        "Sales Assistant": sale.salesAssistant?.name || "-",
        "Total Items": sale._count?.items ?? 0,
        "Subtotal": sale.subTotal ?? 0,
        "Discount": sale.discount ?? 0,
        "Tax": sale.tax ?? 0,
        "Grand Total": sale.grandTotal ?? 0,
        "Payment Method": sale.paymentMethod || "-",
        "Status": sale.status || "",
        "Notes": sale.notes || "-",
      }));

      const dateStr = new Date().toISOString().split("T")[0];

      if (format === "csv") {
        exportToCSV(formattedData, {
          filename: `sales-export-${dateStr}.csv`,
        });
        toast({
          title: "Success",
          description: `Exported ${formattedData.length} sales records to CSV`,
        });
      } else {
        exportToExcel(formattedData, {
          filename: `sales-export-${dateStr}.xlsx`,
          sheetName: "Sales",
        });
        toast({
          title: "Success",
          description: `Exported ${formattedData.length} sales records to Excel`,
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
