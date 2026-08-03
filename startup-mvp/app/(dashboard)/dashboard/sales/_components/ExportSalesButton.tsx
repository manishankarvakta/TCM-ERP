"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FiDownload, FiFileText, FiFile, FiPrinter } from "react-icons/fi";
import { useToast } from "@/hooks/use-toast";
import { OrderType } from "@prisma/client";

interface ExportSalesButtonProps {
  search?: string;
  tab?: string;
  filters?: {
    billerId?: string;
    warehouseId?: string;
    type?: OrderType;
    startDate?: string;
    endDate?: string;
    salesAssistantId?: string;
  };
}

export default function ExportSalesButton({
  search = "",
  tab = "all",
  filters,
}: ExportSalesButtonProps) {
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();

  const handleExport = (format: "csv" | "excel") => {
    try {
      setIsExporting(true);
      const params = new URLSearchParams();
      params.set("format", format);
      if (search) params.set("search", search);
      if (tab) params.set("tab", tab);
      if (filters?.billerId && filters.billerId !== "all") params.set("billerId", filters.billerId);
      if (filters?.warehouseId && filters.warehouseId !== "all") params.set("warehouseId", filters.warehouseId);
      if (filters?.type && (filters.type as string) !== "all") params.set("type", filters.type);
      if (filters?.startDate) params.set("startDate", filters.startDate);
      if (filters?.endDate) params.set("endDate", filters.endDate);
      if (filters?.salesAssistantId && filters.salesAssistantId !== "all") params.set("salesAssistantId", filters.salesAssistantId);

      const url = `/api/export/sales?${params.toString()}`;
      
      const iframe = document.createElement("iframe");
      iframe.style.display = "none";
      iframe.src = url;
      document.body.appendChild(iframe);

      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
        setIsExporting(false);
        toast({
          title: "Export Triggered",
          description: `Downloading sales records as ${format.toUpperCase()}...`,
        });
      }, 1200);
    } catch (err: any) {
      setIsExporting(false);
      toast({
        title: "Error",
        description: err.message || "An unexpected error occurred during export",
        variant: "destructive",
      });
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
        <DropdownMenuItem onSelect={() => handleExport("csv")}>
          <FiFileText className="mr-2 h-4 w-4" />
          Export as CSV
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => handleExport("excel")}>
          <FiFile className="mr-2 h-4 w-4" />
          Export as Excel
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => window.print()}>
          <FiPrinter className="mr-2 h-4 w-4" />
          Print List
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
