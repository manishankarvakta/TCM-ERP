"use client";

import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { FiDownload, FiFilter, FiRefreshCw, FiFileText, FiList, FiPackage, FiTrash2, FiTag } from "react-icons/fi";
import { getAllCountEntries, deleteDraftCount } from "../../_actions/count.action";
import { exportToCSV } from "@/lib/utils/export-csv";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
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

interface UserInfo {
  id: string;
  name: string | null;
  email: string;
}

interface Warehouse {
  id: string;
  name: string;
  code: string;
}

interface EntriesClientProps {
  warehouses: Warehouse[];
  users: UserInfo[];
  defaultWarehouseId: string | null;
  isNormalUser: boolean;
  canDelete: boolean;
  allowedPages: {
    scanner: boolean;
    entries: boolean;
    adjustment: boolean;
  };
}

export default function EntriesClient({ warehouses, users, defaultWarehouseId, isNormalUser, canDelete, allowedPages }: EntriesClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  // Search parameters / filters
  const pageParam = Number(searchParams.get("page")) || 1;
  const warehouseParam = searchParams.get("warehouseId") || (isNormalUser ? (defaultWarehouseId || "") : "all");
  const userParam = searchParams.get("userId") || "all";
  const startDateParam = searchParams.get("startDate") || "";
  const endDateParam = searchParams.get("endDate") || "";

  const [entries, setEntries] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [summary, setSummary] = useState({ totalQuantity: 0, totalLines: 0, uniqueItems: 0 });
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const loadData = async () => {
    setIsLoading(true);
    const res = await getAllCountEntries({
      warehouseId: warehouseParam,
      userId: userParam,
      startDate: startDateParam || undefined,
      endDate: endDateParam || undefined,
      page: pageParam,
      limit: 10
    });

    if (res.success && res.entries) {
      setEntries(res.entries);
      setPagination(res.pagination || { page: 1, limit: 10, total: 0, totalPages: 1 });
      setSummary(res.summary || { totalQuantity: 0, totalLines: 0, uniqueItems: 0 });
    } else {
      toast.error(res.error || "Failed to load count logs");
    }
    setIsLoading(false);
  };

  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleDelete = (id: string) => {
    setDeleteId(id);
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    const id = deleteId;
    setDeleteId(null);
    const res = await deleteDraftCount(id);
    if (res.success) {
      toast.success("Entry deleted successfully");
      loadData();
    } else {
      toast.error(res.error || "Failed to delete entry");
    }
  };

  useEffect(() => {
    loadData();
  }, [warehouseParam, userParam, startDateParam, endDateParam, pageParam]);

  const updateFilters = (newFilters: { warehouseId?: string; userId?: string; page?: number }) => {
    const params = new URLSearchParams(searchParams.toString());
    if (newFilters.warehouseId !== undefined) {
      params.set("warehouseId", newFilters.warehouseId);
    }
    if (newFilters.userId !== undefined) {
      params.set("userId", newFilters.userId);
    }
    if (newFilters.page !== undefined) {
      params.set("page", String(newFilters.page));
    } else {
      params.set("page", "1"); // Reset page on filter changes
    }
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleExportCSV = () => {
    if (entries.length === 0) {
      toast.error("There are no entries to export");
      return;
    }

    const csvData = entries.map((e) => ({
      "SKU/Code": e.code,
      "Item Name": e.name,
      "Barcode": e.barcode,
      "Quantity": e.quantity,
      "Unit": e.unit,
      "Warehouse": `${e.warehouseName} (${e.warehouseCode})`,
      "Scanned By": e.userName,
      "Status": e.status,
      "Date Scanned": format(new Date(e.createdAt), "yyyy-MM-dd HH:mm:ss")
    }));

    exportToCSV(csvData, { filename: `inventory-count-report-${format(new Date(), "yyyy-MM-dd")}.csv` });
  };

  const handleExportPDF = () => {
    if (entries.length === 0) {
      toast.error("There are no entries to export");
      return;
    }

    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text("Inventory Count Entries Report", 14, 22);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated on: ${format(new Date(), "yyyy-MM-dd HH:mm")}`, 14, 30);
    
    const tableData = entries.map((e) => [
      e.code,
      e.name,
      e.barcode,
      e.quantity,
      e.unit,
      `${e.warehouseName} (${e.warehouseCode})`,
      e.userName,
      e.status,
      format(new Date(e.createdAt), "yyyy-MM-dd")
    ]);
    
    autoTable(doc, {
      startY: 35,
      head: [["SKU", "Item Name", "Barcode", "Qty", "Unit", "Warehouse", "Scanned By", "Status", "Date"]],
      body: tableData,
      theme: "striped",
      headStyles: { fillColor: [79, 70, 229] }, // indigo-600 color
    });
    
    doc.save(`inventory-count-report-${format(new Date(), "yyyy-MM-dd")}.pdf`);
  };

  return (
    <div className="space-y-6">
      {/* Top Header Row with Title and Submodule Navigation Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-muted pb-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Inventory Count Logs</h1>
          <p className="text-sm text-muted-foreground">Audit historical records and download count reports</p>
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

      {/* Filter and Export Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-muted/20 p-4 rounded-lg border border-muted/50">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <FiFilter className="text-muted-foreground" />
            <span className="text-sm font-medium">Filters:</span>
          </div>

          {/* User selector */}
          <div className="w-[180px]">
            <Select value={userParam} onValueChange={(val) => updateFilters({ userId: val })}>
              <SelectTrigger>
                <SelectValue placeholder="Filter User" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Users</SelectItem>
                {users.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.name || u.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Warehouse Selector (Admins only) */}
          {!isNormalUser && (
            <div className="w-[200px]">
              <Select value={warehouseParam} onValueChange={(val) => updateFilters({ warehouseId: val })}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter Warehouse" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Warehouses</SelectItem>
                  {warehouses.map((wh) => (
                    <SelectItem key={wh.id} value={wh.id}>
                      {wh.name} ({wh.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* Exports dropdown */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadData} disabled={isLoading} className="shrink-0">
            <FiRefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="default" size="sm" className="shadow-sm">
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-indigo-50/50 to-blue-50/50 dark:from-indigo-950/5 dark:to-blue-950/5 border-indigo-100/40 dark:border-indigo-950/20">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-3 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-lg shrink-0">
              <FiList className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold tracking-wider text-indigo-600/80 dark:text-indigo-400/80 leading-none">Total Log Entries</p>
              <h3 className="text-xl font-bold font-mono text-indigo-700 dark:text-indigo-300 mt-1.5">
                {summary.totalLines}
              </h3>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-violet-50/50 to-purple-50/50 dark:from-violet-950/5 dark:to-purple-950/5 border-violet-100/40 dark:border-violet-950/20">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-3 bg-violet-500/10 text-violet-600 dark:text-violet-400 rounded-lg shrink-0">
              <FiPackage className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold tracking-wider text-violet-600/80 dark:text-violet-400/80 leading-none">Total Quantities Counted</p>
              <h3 className="text-xl font-bold font-mono text-violet-700 dark:text-violet-300 mt-1.5">
                {summary.totalQuantity}
              </h3>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-50/50 to-teal-50/50 dark:from-emerald-950/5 dark:to-teal-950/5 border-emerald-100/40 dark:border-emerald-950/20">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-3 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-lg shrink-0">
              <FiTag className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold tracking-wider text-emerald-600/80 dark:text-emerald-400/80 leading-none">Unique Items Counted</p>
              <h3 className="text-xl font-bold font-mono text-emerald-700 dark:text-emerald-300 mt-1.5">
                {summary.uniqueItems}
              </h3>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Table Card */}
      <Card className="shadow-md border-muted">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FiFileText className="text-primary" />
            Inventory Count Logs History
          </CardTitle>
          <CardDescription>Audited physical stock counts registry log</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-16 text-center text-muted-foreground flex flex-col items-center gap-2">
              <FiRefreshCw className="h-7 w-7 animate-spin text-primary" />
              <span>Loading database count logs...</span>
            </div>
          ) : entries.length === 0 ? (
            <div className="p-16 text-center text-muted-foreground">
              <FiFileText className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
              <p className="font-medium">No count logs match the active filters</p>
              <p className="text-xs text-muted-foreground/75 mt-1">
                Try broadening your filter scopes.
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-muted/40">
                    <TableRow>
                      <TableHead className="w-[120px]">SKU/Code</TableHead>
                      <TableHead>Item Name</TableHead>
                      <TableHead className="w-[150px]">Barcode</TableHead>
                      <TableHead className="w-[80px] text-center">Unit</TableHead>
                      <TableHead className="w-[100px] text-center font-mono">Counted Qty</TableHead>
                      <TableHead>Warehouse</TableHead>
                      <TableHead>Scanned By</TableHead>
                      <TableHead className="w-[110px] text-center">Status</TableHead>
                      <TableHead className="w-[130px]">Date Scanned</TableHead>
                      {canDelete && <TableHead className="w-[60px] text-center">Actions</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {entries.map((e) => (
                      <TableRow key={e.id} className="hover:bg-muted/5">
                        <TableCell className="font-mono text-xs">{e.code}</TableCell>
                        <TableCell className="font-medium text-sm">{e.name}</TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">{e.barcode}</TableCell>
                        <TableCell className="text-center font-mono text-xs">{e.unit}</TableCell>
                        <TableCell className="text-center font-bold font-mono text-sm">{e.quantity}</TableCell>
                        <TableCell className="text-xs">
                          <div>
                            <p className="font-medium text-muted-foreground">{e.warehouseName}</p>
                            <p className="text-[10px] text-muted-foreground/70">({e.warehouseCode})</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{e.userName}</TableCell>
                        <TableCell className="text-center">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              e.status === "DRAFT" || e.status === "COUNTED"
                                ? "bg-amber-100 text-amber-800 dark:bg-amber-950/20 dark:text-amber-400"
                                : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-400"
                            }`}
                          >
                            {e.status}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {format(new Date(e.createdAt), "yyyy-MM-dd HH:mm")}
                        </TableCell>
                        {canDelete && (
                          <TableCell className="text-center">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:text-destructive/90 hover:bg-destructive/10 h-8 w-8 rounded-md"
                              onClick={() => handleDelete(e.id)}
                            >
                              <FiTrash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination Controls */}
              {pagination.totalPages > 1 && (
                <div className="flex items-center justify-between p-4 border-t border-muted bg-muted/10">
                  <span className="text-xs text-muted-foreground">
                    Showing {(pagination.page - 1) * pagination.limit + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} entries
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={pagination.page <= 1}
                      onClick={() => updateFilters({ page: pagination.page - 1 })}
                    >
                      Previous
                    </Button>
                    <span className="text-xs font-mono font-bold px-3 py-1.5 rounded-md border border-muted bg-white dark:bg-muted/30">
                      Page {pagination.page} / {pagination.totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={pagination.page >= pagination.totalPages}
                      onClick={() => updateFilters({ page: pagination.page + 1 })}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Count Entry</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this count entry?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteId(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
