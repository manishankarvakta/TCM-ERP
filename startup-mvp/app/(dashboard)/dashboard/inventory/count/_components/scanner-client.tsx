"use client";

import React, { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FiTag, FiPackage, FiTrash2, FiPlus, FiMinus, FiRefreshCw } from "react-icons/fi";
import { scanBarcode, getDraftCounts, updateDraftCountQty, deleteDraftCount } from "../_actions/count.action";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface Warehouse {
  id: string;
  name: string;
  code: string;
}

interface ScannerClientProps {
  warehouses: Warehouse[];
  defaultWarehouseId: string | null;
  isNormalUser: boolean;
  canCreate: boolean;
  allowedPages: {
    scanner: boolean;
    entries: boolean;
    adjustment: boolean;
  };
}

export default function ScannerClient({ warehouses, defaultWarehouseId, isNormalUser, canCreate, allowedPages }: ScannerClientProps) {
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>(
    defaultWarehouseId || (warehouses.length > 0 ? warehouses[0].id : "")
  );
  const [barcodeInput, setBarcodeInput] = useState<string>("");
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [entries, setEntries] = useState<any[]>([]);
  const [summary, setSummary] = useState({ totalQty: 0, totalItems: 0 });
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const pathname = usePathname();

  // Load entries for selected warehouse
  const loadEntries = async (whId: string) => {
    if (!whId) return;
    setIsLoading(true);
    const res = await getDraftCounts(whId);
    if (res.success && res.entries) {
      setEntries(res.entries);
      setSummary(res.summary || { totalQty: 0, totalItems: 0 });
    } else {
      toast.error(res.error || "Failed to load count entries");
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadEntries(selectedWarehouseId);
  }, [selectedWarehouseId]);

  // Keep focus on input field for scanning efficiency
  useEffect(() => {
    if (barcodeInputRef.current) {
      barcodeInputRef.current.focus();
    }
  });

  const handleScanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = barcodeInput.trim();
    if (!cleanCode) return;

    if (!selectedWarehouseId) {
      toast.error("Please select a warehouse first");
      return;
    }

    setBarcodeInput(""); // Clear immediately for rapid scan input flow
    setIsScanning(true);
    const res = await scanBarcode(cleanCode, selectedWarehouseId);
    if (res.success && res.entry) {
      toast.success(`Scanned: ${res.entry.name} (${res.entry.code})`);
      loadEntries(selectedWarehouseId);
    } else {
      toast.error(res.error || "Item not found or could not be processed");
    }
    setIsScanning(false);
    if (barcodeInputRef.current) {
      barcodeInputRef.current.focus();
    }
  };

  const handleQtyChange = async (id: string, currentQty: number, change: number) => {
    const newQty = currentQty + change;
    if (newQty <= 0) {
      handleDelete(id);
      return;
    }

    const res = await updateDraftCountQty(id, newQty);
    if (res.success) {
      loadEntries(selectedWarehouseId);
    } else {
      toast.error(res.error || "Failed to update quantity");
    }
  };

  const handleDelete = async (id: string) => {
    const res = await deleteDraftCount(id);
    if (res.success) {
      toast.success("Scanned entry removed");
      loadEntries(selectedWarehouseId);
    } else {
      toast.error(res.error || "Failed to delete entry");
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header Row with Title and Submodule Navigation Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-muted pb-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Inventory Count</h1>
          <p className="text-sm text-muted-foreground">Perform physical stock auditing using barcode scans</p>
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

      {/* Global Warehouse Selector Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-muted/20 p-4 rounded-lg border border-muted/50">
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium">Active Warehouse:</span>
          <div className="w-[200px]">
            <Select
              value={selectedWarehouseId}
              onValueChange={setSelectedWarehouseId}
              disabled={isNormalUser}
            >
              <SelectTrigger className="w-full">
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

        {/* Inline Summaries (Moved to right side of active warehouse row) */}
        <div className="flex items-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-xs uppercase font-bold tracking-wider">Total Counted Qty:</span>
            <span className="font-bold font-mono text-primary text-base">{summary.totalQty}</span>
          </div>
          <div className="border-l border-muted h-4 hidden md:block" />
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-xs uppercase font-bold tracking-wider">Unique Items:</span>
            <span className="font-bold font-mono text-primary text-base">{summary.totalItems}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Input and Scanning */}
        <div className="lg:col-span-5 space-y-6">
          <Card className="shadow-md hover:shadow-lg transition-all duration-300 border-muted">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <FiTag className="text-primary h-5 w-5" />
                Physical Stock Scanner
              </CardTitle>
              <CardDescription>Scan barcodes directly to log physical stock</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <form onSubmit={handleScanSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Scan Barcode / Enter SKU
                  </label>
                  <div className="relative">
                    <Input
                      ref={barcodeInputRef}
                      type="text"
                      placeholder={canCreate ? "Scan barcode..." : "Scanning permission denied"}
                      value={barcodeInput}
                      onChange={(e) => setBarcodeInput(e.target.value)}
                      onKeyDown={async (e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleScanSubmit(e);
                        }
                      }}
                      disabled={!selectedWarehouseId || !canCreate}
                      className="pr-10 h-11 font-mono tracking-wide"
                      autoComplete="off"
                    />
                    <div className="absolute right-3 top-3 text-muted-foreground animate-pulse">
                      <FiTag className="h-5 w-5" />
                    </div>
                  </div>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Scanned List */}
        <div className="lg:col-span-7 space-y-6">
          {/* Scanned Entries List */}
          <Card className="shadow-md border-muted">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">Current Draft Scan Logs</CardTitle>
                <CardDescription>Your scanned items for this session</CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => loadEntries(selectedWarehouseId)}
                disabled={isLoading}
              >
                <FiRefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-8 text-center text-muted-foreground flex flex-col items-center gap-2">
                  <FiRefreshCw className="h-6 w-6 animate-spin text-primary" />
                  <span>Loading count entries...</span>
                </div>
              ) : entries.length === 0 ? (
                <div className="p-12 text-center text-muted-foreground">
                  <FiTag className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
                  <p className="font-medium">No items scanned yet in this warehouse</p>
                  <p className="text-xs text-muted-foreground/75 mt-1">
                    Your scans will appear here. Focus the scan field and begin.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto max-h-[450px] overflow-y-auto">
                  <Table>
                    <TableHeader className="bg-muted/30 sticky top-0 z-10">
                      <TableRow>
                        <TableHead className="w-[120px]">SKU/Code</TableHead>
                        <TableHead>Item Name</TableHead>
                        <TableHead className="w-[100px] text-center">Unit</TableHead>
                        <TableHead className="w-[100px] text-center">Quantity</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {entries.map((entry) => (
                        <TableRow key={entry.id} className="hover:bg-muted/10 transition-colors">
                          <TableCell className="font-mono text-xs">{entry.code}</TableCell>
                          <TableCell>
                            <div>
                              <p className="text-sm font-medium">{entry.name}</p>
                              {entry.barcode && (
                                <p className="text-[10px] text-muted-foreground">BC: {entry.barcode}</p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-center font-mono text-xs">{entry.unit}</TableCell>
                          <TableCell className="text-center font-bold font-mono text-sm">
                            {entry.quantity}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
