"use client";

import React, { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Eye, Search, AlertCircle, Edit, Download, Plus } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import ProtectedAction from "@/components/permissions/protected-action";
import { FiRotateCw } from "react-icons/fi";
import { useToast } from "@/hooks/use-toast";
import { trashDamage, restoreDamage, deleteDamage } from "../_actions/damage.action";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { exportToCSV } from "@/lib/utils/export-csv";
import type { InventoryDamageStatus } from "@prisma/client";

interface DamageListProps {
  initialData: any[];
  totalPages: number;
  currentPage: number;
  warehouses: Array<{ id: string; name: string; code: string }>;
  selectedWarehouseId: string;
  startDate: string;
  endDate: string;
  canChangeWarehouse: boolean;
  isTrash?: boolean;
}

export default function DamageList({
  initialData,
  totalPages,
  currentPage,
  warehouses = [],
  selectedWarehouseId,
  startDate,
  endDate,
  canChangeWarehouse,
  isTrash = false,
}: DamageListProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [search, setSearch] = useState(searchParams.get("search") || "");
  
  const [warehouseId, setWarehouseId] = useState(selectedWarehouseId);
  const [startDateVal, setStartDateVal] = useState(startDate);
  const [endDateVal, setEndDateVal] = useState(endDate);

  const [isPending, setIsPending] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

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
    
    router.push(`/dashboard/inventory/damage?${params.toString()}`);
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

  const handleAction = async (actionFn: (id: string) => Promise<{success: boolean, error?: string}>, id: string, successMsg: string) => {
    setIsPending(true);
    try {
      const res = await actionFn(id);
      if (res.success) {
        toast({ title: "Success", description: successMsg });
        setDeleteId(null);
      } else {
        toast({ title: "Error", description: res.error, variant: "destructive" });
      }
    } finally {
      setIsPending(false);
    }
  };

  const handleSearch = () => {
    const params = new URLSearchParams(searchParams.toString());
    if (search) params.set("search", search);
    else params.delete("search");
    
    if (warehouseId && warehouseId !== "all") params.set("warehouseId", warehouseId);
    else params.delete("warehouseId");
    
    params.set("page", "1");
    router.push(`/dashboard/inventory/damage?${params.toString()}`);
  };

  return (
    <Card>
      <CardContent className="p-0">
        <div className="p-4 border-b flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-4 flex-1">
            <div className="relative flex-1 min-w-[240px] max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search damage No or notes..."
                className="pl-8"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
            </div>

            {/* Warehouse Filter */}
            {!isTrash && (
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
            )}

            {/* Date Range Filters */}
            {!isTrash && (
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
            )}

            <Button variant="secondary" onClick={handleSearch} className="h-9">Filter</Button>
          </div>
        </div>

        <div className="relative w-full overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Damage No</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Warehouse</TableHead>
                <TableHead>Items</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {initialData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    <div className="flex flex-col items-center justify-center">
                      <AlertCircle className="h-8 w-8 mb-2" />
                      <p>No damage records found.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                initialData.map((damage) => (
                  <TableRow key={damage.id}>
                    <TableCell className="font-medium">{damage.damageNumber}</TableCell>
                    <TableCell>{format(new Date(damage.date), "dd MMM yyyy")}</TableCell>
                    <TableCell>{damage.warehouse?.name}</TableCell>
                    <TableCell>{damage._count?.items}</TableCell>
                    <TableCell className="text-right font-medium">
                      ৳{Number(damage.grandTotal || 0).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Badge variant={damage.status === "COMPLETED" ? "default" : "secondary"}>
                        {damage.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">{damage.notes || "-"}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2 items-center">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => router.push(`/dashboard/inventory/damage/${damage.id}`)}
                          title="View"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {damage.status === "DRAFT" && !isTrash && (
                          <>
                            <ProtectedAction
                              permissionKey="inventory.damage"
                              action="edit"
                              href={`/dashboard/inventory/damage/${damage.id}/edit`}
                            />
                            <ProtectedAction
                              permissionKey="inventory.damage"
                              action="move-to-trash"
                              onClick={() => handleAction(trashDamage, damage.id, "Moved to trash")}
                              buttonProps={{ disabled: isPending, className: "text-destructive hover:text-destructive" }}
                            />
                            <ProtectedAction
                              permissionKey="inventory.damage"
                              action="delete-permanently"
                              onClick={() => setDeleteId(damage.id)}
                              buttonProps={{ disabled: isPending, className: "text-destructive hover:text-destructive" }}
                            />
                          </>
                        )}
                        {isTrash && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleAction(restoreDamage, damage.id, "Restored successfully")}
                              disabled={isPending}
                              title="Restore"
                            >
                              <FiRotateCw className="h-4 w-4" />
                            </Button>
                            <ProtectedAction
                              permissionKey="inventory.damage"
                              action="delete-permanently"
                              onClick={() => setDeleteId(damage.id)}
                              buttonProps={{ disabled: isPending, className: "text-destructive hover:text-destructive" }}
                            />
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-end space-x-2 p-4 border-t">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage <= 1}
              onClick={() => {
                const params = new URLSearchParams(searchParams.toString());
                params.set("page", (currentPage - 1).toString());
                router.push(`/dashboard/inventory/damage?${params.toString()}`);
              }}
            >
              Previous
            </Button>
            <div className="text-sm">Page {currentPage} of {totalPages}</div>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage >= totalPages}
              onClick={() => {
                const params = new URLSearchParams(searchParams.toString());
                params.set("page", (currentPage + 1).toString());
                router.push(`/dashboard/inventory/damage?${params.toString()}`);
              }}
            >
              Next
            </Button>
          </div>
        )}
      </CardContent>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this damage record. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => deleteId && handleAction(deleteDamage, deleteId, "Permanently deleted")} 
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

interface DamagesHeaderActionsProps {
  canCreate: boolean;
  damages: any[];
  setupIncomplete: boolean;
}

export function DamagesHeaderActions({
  canCreate,
  damages,
  setupIncomplete,
}: DamagesHeaderActionsProps) {
  const { toast } = useToast();

  const handleExportCSV = () => {
    if (!damages || damages.length === 0) {
      toast({
        title: "No data",
        description: "There are no damage records to export",
        variant: "destructive",
      });
      return;
    }

    const csvData = damages.map((damage) => ({
      "Damage Number": damage.damageNumber,
      "Warehouse": damage.warehouse?.name || "-",
      "Status": damage.status,
      "Items Count": damage._count?.items || 0,
      "Amount (BDT)": Number(damage.grandTotal || 0).toFixed(2),
      "Notes": damage.notes || "-",
      "Date": format(new Date(damage.date), "yyyy-MM-dd"),
    }));

    exportToCSV(csvData, { filename: `damage-report-${format(new Date(), "yyyy-MM-dd")}.csv` });
  };

  const handleExportPDF = () => {
    if (!damages || damages.length === 0) {
      toast({
        title: "No data",
        description: "There are no damage records to export",
        variant: "destructive",
      });
      return;
    }

    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text("Stock Damages Report", 14, 22);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated on: ${format(new Date(), "yyyy-MM-dd HH:mm")}`, 14, 30);
    
    const tableData = damages.map((damage) => [
      damage.damageNumber,
      damage.warehouse?.name || "-",
      damage.status,
      damage._count?.items || 0,
      `BDT ${Number(damage.grandTotal || 0).toFixed(2)}`,
      damage.notes || "-",
      format(new Date(damage.date), "yyyy-MM-dd")
    ]);
    
    autoTable(doc, {
      startY: 35,
      head: [["Damage #", "Warehouse", "Status", "Items", "Amount", "Notes", "Date"]],
      body: tableData,
      theme: "striped",
      headStyles: { fillColor: [79, 70, 229] }, // indigo-600 color
    });
    
    doc.save(`damage-report-${format(new Date(), "yyyy-MM-dd")}.pdf`);
  };

  return (
    <div className="flex items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
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
        <Button asChild disabled={setupIncomplete}>
          <Link href="/dashboard/inventory/damage/add">
            <Plus className="mr-2 h-4 w-4" />
            Add Damage
          </Link>
        </Button>
      )}
    </div>
  );
}
