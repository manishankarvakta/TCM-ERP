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
import { ItemType } from "@prisma/client";

interface ExportItemsButtonProps {
  search?: string;
  tab?: string;
  itemType?: ItemType | "all";
}

export default function ExportItemsButton({
  search = "",
  tab = "all",
  itemType,
}: ExportItemsButtonProps) {
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();

  const handleExport = (format: "csv" | "excel") => {
    try {
      setIsExporting(true);
      const params = new URLSearchParams();
      params.set("format", format);
      if (search) params.set("search", search);
      if (tab) params.set("tab", tab);
      if (itemType && itemType !== "all") params.set("itemType", itemType);

      const url = `/api/export/items?${params.toString()}`;

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
          description: `Downloading items catalog as ${format.toUpperCase()}...`,
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
