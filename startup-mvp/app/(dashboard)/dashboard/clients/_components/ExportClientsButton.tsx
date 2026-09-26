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

interface ExportClientsButtonProps {
  search?: string;
  tab?: string;
  warehouse?: string;
  due?: string;
  clientType?: string;
}

export default function ExportClientsButton({
  search = "",
  tab = "all",
  warehouse,
  due = "all",
  clientType = "all",
}: ExportClientsButtonProps) {
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();

  const handleExport = async (format: "csv" | "excel") => {
    try {
      setIsExporting(true);
      const params = new URLSearchParams();
      params.set("format", format);
      if (search) params.set("search", search);
      if (tab) params.set("tab", tab);
      if (warehouse && warehouse !== "all") params.set("warehouse", warehouse);
      if (due && due !== "all") params.set("due", due);
      if (clientType && clientType !== "all") params.set("clientType", clientType);

      const url = `/api/export/clients?${params.toString()}`;

      const res = await fetch(url);
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Export failed with HTTP status ${res.status}`);
      }

      const blob = await res.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      const dateStr = new Date().toISOString().split("T")[0];
      link.download = `clients-export-${dateStr}.${format === "excel" ? "xlsx" : "csv"}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);

      toast({
        title: "Export Completed",
        description: `Downloaded clients list as ${format.toUpperCase()}.`,
      });
    } catch (err: any) {
      toast({
        title: "Export Failed",
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
