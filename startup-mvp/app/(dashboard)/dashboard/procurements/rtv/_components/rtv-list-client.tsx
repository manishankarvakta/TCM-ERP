"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { FiSearch, FiChevronLeft, FiChevronRight, FiEye, FiDownload, FiPlus } from "react-icons/fi";
import { useDebounce } from "@/hooks/use-debounce";
import Link from "next/link";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { exportToCSV } from "@/lib/utils/export-csv";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import type { ReturnToVendorStatus } from "@prisma/client";

interface RTVListClientProps {
  initialData: any[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  searchStr: string;
  warehouses: Array<{ id: string; name: string; code: string }>;
  selectedWarehouseId: string;
  startDate: string;
  endDate: string;
  canChangeWarehouse: boolean;
}

export default function RTVListClient({
  initialData,
  pagination,
  searchStr,
  warehouses = [],
  selectedWarehouseId,
  startDate,
  endDate,
  canChangeWarehouse,
}: RTVListClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(searchStr);
  
  const [warehouseId, setWarehouseId] = useState(selectedWarehouseId);
  const [startDateVal, setStartDateVal] = useState(startDate);
  const [endDateVal, setEndDateVal] = useState(endDate);

  const debouncedSearch = useDebounce(search, 300);

  useEffect(() => {
    if (debouncedSearch !== searchStr) {
      const params = new URLSearchParams(searchParams.toString());
      if (debouncedSearch) {
        params.set("search", debouncedSearch);
      } else {
        params.delete("search");
      }
      params.set("page", "1");
      router.push(`/dashboard/procurements/rtv?${params.toString()}`);
    }
  }, [debouncedSearch, searchStr, searchParams, router]);

  const updateFilters = (newParams: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", "1");
    
    Object.entries(newParams).forEach(([key, value]) => {
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    });
    
    router.push(`/dashboard/procurements/rtv?${params.toString()}`);
  };

  const handleWarehouseChange = (val: string) => {
    setWarehouseId(val);
    updateFilters({ warehouseId: val });
  };

  const handleStartDateChange = (val: string) => {
    setStartDateVal(val);
    updateFilters({ startDate: val });
  };

  const handleEndDateChange = (val: string) => {
    setEndDateVal(val);
    updateFilters({ endDate: val });
  };

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", newPage.toString());
    router.push(`/dashboard/procurements/rtv?${params.toString()}`);
  };

  return (
    <Card>
      <div className="p-4 flex flex-wrap items-center justify-between gap-4 border-b">
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative w-full sm:w-72">
            <FiSearch className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <Input
              placeholder="Search RTVs..."
              className="pl-8"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search returns to vendor"
            />
          </div>

          {/* Warehouse Filter */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">Warehouse:</span>
            <Select
              value={warehouseId}
              onValueChange={(val) => handleWarehouseChange(val)}
              disabled={!canChangeWarehouse}
            >
              <SelectTrigger className="w-[180px] h-9">
                <SelectValue placeholder="Select warehouse" />
              </SelectTrigger>
              <SelectContent>
                {canChangeWarehouse && <SelectItem value="all">All Warehouses</SelectItem>}
                {warehouses.map((w) => (
                  <SelectItem key={w.id} value={w.id}>
                    {w.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date Range Filters */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">From:</span>
            <Input
              type="date"
              value={startDateVal}
              onChange={(e) => handleStartDateChange(e.target.value)}
              className="w-[140px] h-9"
            />
            <span className="text-sm font-medium text-muted-foreground">To:</span>
            <Input
              type="date"
              value={endDateVal}
              onChange={(e) => handleEndDateChange(e.target.value)}
              className="w-[140px] h-9"
            />
          </div>
        </div>
      </div>
      <CardContent className="p-0">
        <div className="rounded-md border-0 overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>RTV Number</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Warehouse</TableHead>
                <TableHead className="text-right">Items</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {initialData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                    No returns found.
                  </TableCell>
                </TableRow>
              ) : (
                initialData.map((rtv) => (
                  <TableRow key={rtv.id} className="hover:bg-muted/50 transition-colors">
                    <TableCell className="font-medium">{rtv.rtvNumber}</TableCell>
                    <TableCell>{new Date(rtv.date).toLocaleDateString()}</TableCell>
                    <TableCell>{rtv.supplier.name}</TableCell>
                    <TableCell>{rtv.warehouse.name}</TableCell>
                    <TableCell className="text-right font-mono text-muted-foreground">
                      {rtv._count?.items ?? 0}
                    </TableCell>
                    <TableCell className="text-right">৳{Number(rtv.grandTotal).toLocaleString()}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant={rtv.status === 'COMPLETED' ? 'default' : 'secondary'}>
                        {rtv.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" asChild aria-label={`View RTV ${rtv.rtvNumber}`}>
                        <Link href={`/dashboard/procurements/rtv/${rtv.id}/view`}>
                          <FiEye className="h-4 w-4" />
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        
        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t">
            <div className="text-sm text-muted-foreground">
              Showing page {pagination.page} of {pagination.totalPages}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page <= 1}
                aria-label="Previous page"
              >
                <FiChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page >= pagination.totalPages}
                aria-label="Next page"
              >
                Next
                <FiChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface RTVHeaderActionsProps {
  canCreate: boolean;
  rtvs: any[];
}

export function RTVHeaderActions({
  canCreate,
  rtvs,
}: RTVHeaderActionsProps) {
  const { toast } = useToast();

  const handleExportCSV = () => {
    if (!rtvs || rtvs.length === 0) {
      toast({
        title: "No data",
        description: "There are no RTVs to export",
        variant: "destructive",
      });
      return;
    }

    const csvData = rtvs.map((rtv) => ({
      "RTV Number": rtv.rtvNumber,
      "Supplier": rtv.supplier?.name || "-",
      "Warehouse": rtv.warehouse?.name || "-",
      "Amount (BDT)": Number(rtv.grandTotal).toFixed(2),
      "Status": rtv.status,
      "Date": format(new Date(rtv.date), "yyyy-MM-dd"),
    }));

    exportToCSV(csvData, { filename: `rtv-report-${format(new Date(), "yyyy-MM-dd")}.csv` });
  };

  const handleExportPDF = () => {
    if (!rtvs || rtvs.length === 0) {
      toast({
        title: "No data",
        description: "There are no RTVs to export",
        variant: "destructive",
      });
      return;
    }

    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text("Returns to Vendor (RTV) Report", 14, 22);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated on: ${format(new Date(), "yyyy-MM-dd HH:mm")}`, 14, 30);
    
    const tableData = rtvs.map((rtv) => [
      rtv.rtvNumber,
      rtv.supplier?.name || "-",
      rtv.warehouse?.name || "-",
      rtv.status,
      format(new Date(rtv.date), "yyyy-MM-dd"),
      `BDT ${Number(rtv.grandTotal).toFixed(2)}`
    ]);
    
    autoTable(doc, {
      startY: 35,
      head: [["RTV #", "Supplier", "Warehouse", "Status", "Date", "Amount"]],
      body: tableData,
      theme: "striped",
      headStyles: { fillColor: [79, 70, 229] }, // indigo-600 color
    });
    
    doc.save(`rtv-report-${format(new Date(), "yyyy-MM-dd")}.pdf`);
  };

  return (
    <div className="flex items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline">
            <FiDownload className="mr-2 h-4 w-4" />
            Export
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={handleExportCSV}>
            Export to CSV
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleExportPDF}>
            Export to PDF
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {canCreate && (
        <Button asChild>
          <Link href="/dashboard/procurements/rtv/new">
            <FiPlus className="mr-2 h-4 w-4" />
            Add RTV
          </Link>
        </Button>
      )}
    </div>
  );
}
