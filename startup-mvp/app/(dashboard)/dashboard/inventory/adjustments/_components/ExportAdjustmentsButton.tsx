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

interface ExportAdjustmentsButtonProps {
  search?: string;
  warehouseId?: string;
  startDate?: string;
  endDate?: string;
}

export default function ExportAdjustmentsButton({
  search = "",
  warehouseId,
  startDate,
  endDate,
}: ExportAdjustmentsButtonProps) {
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();

  const handleExport = (format: "csv" | "excel") => {
    try {
      setIsExporting(true);
      const params = new URLSearchParams();
      params.set("format", format);
      if (search) params.set("search", search);
      if (warehouseId && warehouseId !== "all") params.set("warehouseId", warehouseId);
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);

      const url = `/api/export/adjustments?${params.toString()}`;

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
          description: `Downloading stock adjustments as ${format.toUpperCase()}...`,
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
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
