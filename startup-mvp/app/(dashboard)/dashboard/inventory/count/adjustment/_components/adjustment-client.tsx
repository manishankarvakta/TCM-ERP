"use client";

import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { FiDownload, FiCheck, FiAlertCircle, FiRefreshCw, FiSliders, FiFileText } from "react-icons/fi";
import { getReconciliationReport, createAdjustmentFromReconciliation } from "../../_actions/count.action";
import { exportToCSV } from "@/lib/utils/export-csv";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

interface Warehouse {
  id: string;
  name: string;
  code: string;
}

interface AdjustmentClientProps {
  warehouses: Warehouse[];
  defaultWarehouseId: string | null;
  isNormalUser: boolean;
  canApprove: boolean;
  allowedPages: {
    scanner: boolean;
    entries: boolean;
    adjustment: boolean;
  };
}

export default function AdjustmentClient({ warehouses, defaultWarehouseId, isNormalUser, canApprove, allowedPages }: AdjustmentClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const warehouseParam = searchParams.get("warehouseId") || (isNormalUser ? (defaultWarehouseId || "") : "all");

  const [report, setReport] = useState<any[]>([]);
  const [summary, setSummary] = useState({ totalItems: 0, discrepancies: 0, matched: 0 });
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState<boolean>(false);

  const loadReport = async () => {
    if (!warehouseParam || warehouseParam === "all") {
      setReport([]);
      setSummary({ totalItems: 0, discrepancies: 0, matched: 0 });
      return;
    }

    setIsLoading(true);
    const res = await getReconciliationReport(warehouseParam);
    if (res.success && res.report) {
      setReport(res.report);
      
      // Calculate summaries
      const totalItems = res.report.length;
      const discrepancies = res.report.filter((r: any) => r.discrepancy !== 0).length;
      const matched = totalItems - discrepancies;

      setSummary({
        totalItems,
        discrepancies,
        matched
      });
    } else {
      toast.error(res.error || "Failed to compile reconciliation report");
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadReport();
  }, [warehouseParam]);

  const handleWarehouseChange = (val: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("warehouseId", val);
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleCreateAdjustment = async () => {
    if (!warehouseParam || warehouseParam === "all") return;
    
    setIsConfirmOpen(false); // Close dialog modal
    setIsProcessing(true);
    const res = await createAdjustmentFromReconciliation(warehouseParam);
    if (res.success) {
      toast.success(`Draft Adjustment ${res.adjustmentNumber} has been generated. You can approve it in the Adjustments module.`);
      // Refresh report
      loadReport();
      // Redirect with a slight delay so the toast is visible
      setTimeout(() => {
        router.push(`/dashboard/inventory/adjustments`);
      }, 1500);
    } else {
      toast.error(res.error || "Failed to Create Adjustment");
    }
    setIsProcessing(false);
  };

  const handleExportCSV = () => {
    if (report.length === 0) {
      toast.error("There are no reconciliation records to export");
      return;
    }

    const csvData = report.map((r) => ({
      "SKU/Code": r.code,
      "Item Name": r.name,
      "Barcode": r.barcode,
      "System Stock": r.systemStock,
      "Physical Count": r.physicalCount,
      "Discrepancy": r.discrepancy,
      "Unit": r.unit,
      "Status": r.discrepancy === 0 ? "MATCHED" : "DISCREPANCY"
    }));

    exportToCSV(csvData, { filename: `stock-reconciliation-${format(new Date(), "yyyy-MM-dd")}.csv` });
  };

  const handleExportPDF = () => {
    if (report.length === 0) {
      toast.error("There are no reconciliation records to export");
      return;
    }

    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text("Stock Reconciliation Report", 14, 22);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    const selectedWh = warehouses.find(w => w.id === warehouseParam);
    doc.text(`Warehouse: ${selectedWh ? selectedWh.name : "N/A"} | Date: ${format(new Date(), "yyyy-MM-dd HH:mm")}`, 14, 30);
    
    const tableData = report.map((r) => [
      r.code,
      r.name,
      r.barcode,
      r.systemStock,
      r.physicalCount,
      r.discrepancy > 0 ? `+${r.discrepancy}` : r.discrepancy,
      r.unit,
      r.discrepancy === 0 ? "MATCHED" : "MISMATCH"
    ]);
    
    autoTable(doc, {
      startY: 35,
      head: [["SKU", "Item Name", "Barcode", "System Stock", "Physical Count", "Discrepancy", "Unit", "Status"]],
      body: tableData,
      theme: "striped",
      headStyles: { fillColor: [79, 70, 229] }, // indigo-600 color
    });
    
    doc.save(`stock-reconciliation-${format(new Date(), "yyyy-MM-dd")}.pdf`);
  };

  return (
    <div className="space-y-6">
      {/* Top Header Row with Title and Submodule Navigation Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-muted pb-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Stock Auto Adjustment</h1>
          <p className="text-sm text-muted-foreground">Compare physical counts against system stocks and generate corrections</p>
        </div>
        <div className="flex items-center gap-1">
          {allowedPages.scanner && (
            <Link
              href="/dashboard/inventory/count"
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-all ${
                pathname === "/dashboard/inventory/count"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              Count Scanner
            </Link>
          )}
          {allowedPages.entries && (
            <Link
              href="/dashboard/inventory/count/entries"
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-all ${
                pathname.startsWith("/dashboard/inventory/count/entries")
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              All Count Entries
            </Link>
          )}
          {allowedPages.adjustment && (
            <Link
              href="/dashboard/inventory/count/adjustment"
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-all ${
                pathname.startsWith("/dashboard/inventory/count/adjustment")
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              Auto Adjustment (Reconcile)
            </Link>
          )}
        </div>
      </div>

      {/* Warehouse Selector & Actions Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-muted/20 p-4 rounded-lg border border-muted/50">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <FiSliders className="text-muted-foreground" />
            <span className="text-sm font-medium">Reconciliation Location:</span>
          </div>

          <div className="w-[200px]">
            <Select value={warehouseParam} onValueChange={handleWarehouseChange} disabled={isNormalUser}>
              <SelectTrigger>
                <SelectValue placeholder="Select Warehouse" />
              </SelectTrigger>
              <SelectContent>
                {warehouses.map((wh) => (
                  <SelectItem key={wh.id} value={wh.id}>
                    {wh.name} ({wh.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {report.length > 0 && canApprove && (
            <Button
              variant="default"
              size="sm"
              onClick={() => setIsConfirmOpen(true)}
              disabled={isProcessing || summary.discrepancies === 0}
              className="bg-indigo-600 hover:bg-indigo-700 text-white shrink-0 font-medium"
            >
              {isProcessing ? "Processing..." : "Create Adjustment"}
            </Button>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" disabled={report.length === 0}>
                <FiDownload className="mr-2 h-4 w-4" />
                Export Report
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleExportCSV}>Export to CSV</DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportPDF}>Export to PDF</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Metrics Widgets */}
      {warehouseParam && warehouseParam !== "all" && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="bg-blue-50/40 dark:bg-blue-950/5 border-blue-100/30">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-3 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-lg shrink-0">
                <FiFileText className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold tracking-wider text-blue-600/80 dark:text-blue-400/80">Total Tracked SKUs</p>
                <h3 className="text-xl font-bold font-mono mt-1 text-blue-700 dark:text-blue-300">
                  {summary.totalItems}
                </h3>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-emerald-50/40 dark:bg-emerald-950/5 border-emerald-100/30">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-3 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-lg shrink-0">
                <FiCheck className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold tracking-wider text-emerald-600/80 dark:text-emerald-400/80">Matched Stock SKUs</p>
                <h3 className="text-xl font-bold font-mono mt-1 text-emerald-700 dark:text-emerald-300">
                  {summary.matched}
                </h3>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-red-50/40 dark:bg-red-950/5 border-red-100/30">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-3 bg-red-500/10 text-red-600 dark:text-red-400 rounded-lg shrink-0">
                <FiAlertCircle className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold tracking-wider text-red-600/80 dark:text-red-400/80">Discrepancy SKUs</p>
                <h3 className="text-xl font-bold font-mono mt-1 text-red-700 dark:text-red-300">
                  {summary.discrepancies}
                </h3>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Reconciliation Table */}
      <Card className="shadow-md border-muted">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Stock Discrepancy Matrix</CardTitle>
            <CardDescription>Comparison of physical count drafts vs database system stock</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={loadReport} disabled={isLoading || !warehouseParam || warehouseParam === "all"}>
            <FiRefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {!warehouseParam || warehouseParam === "all" ? (
            <div className="p-16 text-center text-muted-foreground">
              <FiSliders className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
              <p className="font-medium">Please select a physical warehouse to check reconciliation</p>
            </div>
          ) : isLoading ? (
            <div className="p-16 text-center text-muted-foreground flex flex-col items-center gap-2">
              <FiRefreshCw className="h-7 w-7 animate-spin text-primary" />
              <span>Calculating stock discrepancies...</span>
            </div>
          ) : report.length === 0 ? (
            <div className="p-16 text-center text-muted-foreground">
              <FiCheck className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
              <p className="font-medium">No stock records found for this warehouse</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/40">
                  <TableRow>
                    <TableHead className="w-[120px]">SKU/Code</TableHead>
                    <TableHead>Item Name</TableHead>
                    <TableHead className="w-[150px]">Barcode</TableHead>
                    <TableHead className="w-[80px] text-center">Unit</TableHead>
                    <TableHead className="w-[120px] text-center font-mono">System Stock</TableHead>
                    <TableHead className="w-[120px] text-center font-mono">Physical Count</TableHead>
                    <TableHead className="w-[120px] text-center font-mono">Discrepancy</TableHead>
                    <TableHead className="w-[120px] text-center">Reconciliation Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {report.map((r, index) => (
                    <TableRow key={index} className="hover:bg-muted/5">
                      <TableCell className="font-mono text-xs">{r.code}</TableCell>
                      <TableCell className="font-medium text-sm">{r.name}</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">{r.barcode}</TableCell>
                      <TableCell className="text-center font-mono text-xs">{r.unit}</TableCell>
                      <TableCell className="text-center font-mono font-medium">{r.systemStock}</TableCell>
                      <TableCell className="text-center font-mono font-medium">{r.physicalCount}</TableCell>
                      <TableCell className="text-center font-bold font-mono">
                        <span
                          className={
                            r.discrepancy > 0
                              ? "text-emerald-600 dark:text-emerald-400"
                              : r.discrepancy < 0
                              ? "text-red-600 dark:text-red-400"
                              : "text-muted-foreground"
                          }
                        >
                          {r.discrepancy > 0 ? `+${r.discrepancy}` : r.discrepancy}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        {r.discrepancy === 0 ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-400 uppercase">
                            <FiCheck className="h-3 w-3" /> Matched
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800 dark:bg-red-950/20 dark:text-red-400 uppercase">
                            <FiAlertCircle className="h-3 w-3" /> Mismatch
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Create Stock Adjustment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to generate a stock auto-adjustment for all discrepancies? 
              This will reconcile the current physical counts for the selected warehouse.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleCreateAdjustment}
              disabled={isProcessing}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium"
            >
              {isProcessing ? "Processing..." : "Confirm"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
