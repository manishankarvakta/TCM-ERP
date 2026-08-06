"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Link from "next/link";
import {
  FiArrowLeft,
  FiPrinter,
  FiSearch,
  FiCalendar,
  FiPackage,
  FiBox,
  FiTrendingUp,
  FiTrendingDown,
  FiFilter,
  FiRefreshCw,
  FiExternalLink,
  FiUser,
  FiTruck,
  FiLayers,
} from "react-icons/fi";
import PrintHeader, { PrintStyle } from "@/app/(dashboard)/dashboard/procurements/_components/print-header";

interface LedgerRow {
  sl: number;
  date: string;
  type: string;
  invoiceNo: string;
  invoiceUrl: string | null;
  party?: {
    type: "client" | "supplier" | "warehouse_transfer" | "warehouse";
    label: string;
    link: string | null;
    fromWarehouse?: string | null;
    toWarehouse?: string | null;
  } | null;
  opening: number;
  inQty: number;
  outQty: number;
  closing: number;
  rate: number;
  total: number;
  profitLoss?: number;
  details?: string;
  warehouse?: { name: string; code: string } | null;
  variant?: {
    id: string;
    sku: string;
    size?: string | null;
    color?: string | null;
  } | null;
}

interface VariantData {
  id: string;
  sku: string;
  size?: string | null;
  color?: string | null;
}

interface ItemData {
  id: string;
  code: string;
  name: string;
  unitSymbol: string;
  unitDetails: string;
  categoryName: string;
  subCategoryName: string;
  brandName: string;
  costPrice: number;
  salesPrice: number;
  wholesalePrice: number;
  currentStockTotal: number;
}

interface LedgerSummary {
  totalInQty: number;
  totalOutQty: number;
  currentStock: number;
  totalAmount: number;
  totalProfitLoss: number;
  totalEntries: number;
}

interface ItemLedgerProps {
  item: ItemData;
  variants?: VariantData[];
  ledger: LedgerRow[];
  summary: LedgerSummary;
  warehouses: Array<{ id: string; name: string; code: string }>;
  initialStartDate?: string;
  initialEndDate?: string;
  initialWarehouseId?: string;
  initialVariantId?: string;
  organization?: {
    name?: string | null;
    address?: string | null;
    email?: string | null;
    phone?: string | null;
  } | null;
}

export default function ItemLedger({
  item,
  variants = [],
  ledger,
  summary,
  warehouses,
  initialStartDate = "",
  initialEndDate = "",
  initialWarehouseId = "all",
  initialVariantId = "all",
  organization,
}: ItemLedgerProps) {
  const router = useRouter();
  const [startDate, setStartDate] = useState(initialStartDate);
  const [endDate, setEndDate] = useState(initialEndDate);
  const [warehouseId, setWarehouseId] = useState(initialWarehouseId);
  const [variantId, setVariantId] = useState(initialVariantId);
  const [search, setSearch] = useState("");

  const handleFilter = () => {
    const params = new URLSearchParams();
    params.set("id", item.id);
    if (startDate) params.set("startDate", startDate);
    if (endDate) params.set("endDate", endDate);
    if (warehouseId && warehouseId !== "all") params.set("warehouseId", warehouseId);
    if (variantId && variantId !== "all") params.set("variantId", variantId);
    router.push(`/dashboard/master/items/ledger?${params.toString()}`);
  };

  const handleResetFilter = () => {
    setStartDate("");
    setEndDate("");
    setWarehouseId("all");
    setVariantId("all");
    setSearch("");
    router.push(`/dashboard/master/items/ledger?id=${item.id}`);
  };

  const handlePrint = () => {
    window.print();
  };

  // Local search filter
  const filteredLedger = ledger.filter((row) => {
    if (!search.trim()) return true;
    const query = search.toLowerCase();
    return (
      row.invoiceNo.toLowerCase().includes(query) ||
      row.type.toLowerCase().includes(query) ||
      row.date.toLowerCase().includes(query) ||
      (row.party && row.party.label.toLowerCase().includes(query)) ||
      (row.details && row.details.toLowerCase().includes(query)) ||
      (row.variant && row.variant.sku.toLowerCase().includes(query)) ||
      (row.variant && row.variant.size && row.variant.size.toLowerCase().includes(query)) ||
      (row.variant && row.variant.color && row.variant.color.toLowerCase().includes(query))
    );
  });

  // Calculate local totals for filtered list
  const filterSummary = filteredLedger.reduce(
    (acc, row) => ({
      inQty: acc.inQty + (row.inQty || 0),
      outQty: acc.outQty + (row.outQty || 0),
      total: acc.total + (row.total || 0),
    }),
    { inQty: 0, outQty: 0, total: 0 }
  );

  const initialOpening = filteredLedger.length > 0 ? filteredLedger[0].opening : 0;
  const lastStock = filteredLedger.length > 0 ? filteredLedger[filteredLedger.length - 1].closing : summary.currentStock;

  const getTypeBadge = (type: string) => {
    if (type.includes("Opening")) {
      return <Badge variant="outline" className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-300 text-[11px]">Opening Stock</Badge>;
    } else if (type.includes("Purchase") || type.includes("GRN")) {
      return <Badge variant="outline" className="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 text-[11px]">Purchase / GRN</Badge>;
    } else if (type.includes("Sale")) {
      return <Badge variant="outline" className="bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border-blue-200 text-[11px]">Sale</Badge>;
    } else if (type.includes("Production")) {
      return <Badge variant="outline" className="bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-400 border-purple-200 text-[11px]">Production</Badge>;
    } else if (type.includes("Damage")) {
      return <Badge variant="outline" className="bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 border-red-200 text-[11px]">Damage</Badge>;
    } else if (type.includes("Return")) {
      return <Badge variant="outline" className="bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200 text-[11px]">Return</Badge>;
    } else if (type.includes("Transfer")) {
      return <Badge variant="outline" className="bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 border-indigo-200 text-[11px]">Transfer</Badge>;
    }
    return <Badge variant="outline" className="text-[11px]">{type}</Badge>;
  };

  return (
    <div className="space-y-6">
      <PrintStyle />

      {/* Ledger-specific print overrides */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page {
            size: A4 portrait;
            margin: 10mm 12mm 16mm 12mm;
          }

          /* Strip all colors — everything prints as plain black text */
          .ledger-print-table,
          .ledger-print-table * {
            color: #000 !important;
            background: #fff !important;
            border-color: #aaa !important;
            text-decoration: none !important;
            box-shadow: none !important;
          }

          /* Hide UI chrome */
          .ledger-print-table .col-type { display: none !important; }
          .footer-type-col              { display: none !important; }
          .ledger-print-icon            { display: none !important; }
          .ledger-no-print              { display: none !important; }

          /* Force overflow wrapper to be visible so table fills full page width */
          .ledger-overflow-wrap {
            overflow: visible !important;
            width: 100% !important;
            border: none !important;
            border-radius: 0 !important;
          }

          /* Strip the Card wrapper completely — no border, shadow, bg, or padding */
          .printable-content {
            border: none !important;
            box-shadow: none !important;
            background: transparent !important;
            border-radius: 0 !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .ledger-card-content {
            padding: 0 !important;
            margin: 0 !important;
          }

          /* Table fills full print area — dynamic layout via percentages */
          .ledger-print-table {
            width: 100% !important;
            table-layout: fixed !important;
            border-collapse: collapse !important;
            border: 0.5px solid #aaa !important;
            font-size: 7pt !important;
            line-height: 1.3 !important;
          }
          .ledger-print-table th,
          .ledger-print-table td {
            padding: 2px 3px !important;
            word-break: break-word !important;
            white-space: normal !important;
            overflow: hidden !important;
            border: 0.5px solid #aaa !important;
            vertical-align: middle !important;
            font-weight: normal !important;
          }
          .ledger-print-table th {
            font-weight: 700 !important;
            font-size: 6.5pt !important;
            background: #eeeeee !important;
          }

          /*
           * Percentage column widths — 10 visible columns (Type hidden).
           * All widths sum to 100% so table always fills the print area exactly.
           *   Sl=4 | Date=10 | Invoice=14 | Party=24 | Open=8 | In=7 | Out=7 | Close=8 | Rate=9 | Total=9
           */
          .ledger-print-table .col-sl    { width: 4%  !important; text-align: center !important; }
          .ledger-print-table .col-date  { width: 10% !important; }
          .ledger-print-table .col-inv   { width: 14% !important; }
          .ledger-print-table .col-party { width: 24% !important; }
          .ledger-print-table .col-open  { width: 8%  !important; text-align: center !important; }
          .ledger-print-table .col-in    { width: 7%  !important; text-align: center !important; }
          .ledger-print-table .col-out   { width: 7%  !important; text-align: center !important; }
          .ledger-print-table .col-close { width: 8%  !important; text-align: center !important; }
          .ledger-print-table .col-rate  { width: 9%  !important; text-align: center !important; }
          .ledger-print-table .col-total { width: 9%  !important; text-align: center !important; }
        }
      ` }} />

      {/* Screen-Only Header & Actions */}
      <div className="print:hidden space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" asChild>
              <Link href={`/dashboard/master/items/${item.id}`}>
                <FiArrowLeft className="h-4 w-4 mr-2" />
                Back to Item
              </Link>
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight">{item.name}</h1>
                <span className="text-xs font-mono bg-muted px-2 py-0.5 rounded border border-border font-semibold">
                  {item.code}
                </span>
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">
                Item Stock Ledger & Movement Traceability
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handlePrint}>
              <FiPrinter className="mr-2 h-4 w-4" />
              Print Ledger
            </Button>
          </div>
        </div>

        {/* Item Info KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-border/60 shadow-sm">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Total In Quantity</p>
                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">+{summary.totalInQty.toLocaleString()}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{item.unitSymbol}</p>
              </div>
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 border border-emerald-200/50">
                <FiTrendingUp className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60 shadow-sm">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Total Out Quantity</p>
                <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">-{summary.totalOutQty.toLocaleString()}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{item.unitSymbol}</p>
              </div>
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 border border-amber-200/50">
                <FiTrendingDown className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60 shadow-sm">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Closing Stock Balance</p>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">{summary.currentStock.toLocaleString()}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{item.unitSymbol}</p>
              </div>
              <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 border border-blue-200/50">
                <FiBox className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60 shadow-sm">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Item Classification</p>
                <p className="text-sm font-bold text-foreground mt-1 truncate max-w-[140px]">{item.categoryName}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{item.brandName || "Brand N/A"}</p>
              </div>
              <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 border border-purple-200/50">
                <FiPackage className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filter Controls Bar */}
        <Card className="border-border/60 shadow-sm">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row items-end gap-3">
              <div className="w-full md:w-48 space-y-1">
                <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <FiCalendar className="h-3.5 w-3.5" /> Start Date
                </label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              <div className="w-full md:w-48 space-y-1">
                <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <FiCalendar className="h-3.5 w-3.5" /> End Date
                </label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              <div className="w-full md:w-52 space-y-1">
                <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <FiFilter className="h-3.5 w-3.5" /> Warehouse Filter
                </label>
                <Select value={warehouseId} onValueChange={setWarehouseId}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="All Warehouses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Warehouses</SelectItem>
                    {warehouses.map((w) => (
                      <SelectItem key={w.id} value={w.id}>
                        {w.name} ({w.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {variants && variants.length > 0 && (
                <div className="w-full md:w-52 space-y-1">
                  <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                    <FiLayers className="h-3.5 w-3.5" /> SKU / Variant Filter
                  </label>
                  <Select value={variantId} onValueChange={setVariantId}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="All SKUs & Base" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All SKUs & Base</SelectItem>
                      <SelectItem value="base">Base Item Only</SelectItem>
                      {variants.map((v) => {
                        const attrStr = [v.size, v.color].filter(Boolean).join(" / ");
                        return (
                          <SelectItem key={v.id} value={v.id}>
                            {v.sku} {attrStr ? `(${attrStr})` : ""}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="w-full md:flex-1 space-y-1">
                <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <FiSearch className="h-3.5 w-3.5" /> Search Ledger
                </label>
                <Input
                  type="text"
                  placeholder="Filter by party, invoice no, type, date..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              <div className="flex items-center gap-2 w-full md:w-auto">
                <Button size="sm" onClick={handleFilter} className="h-9 px-4">
                  Filter
                </Button>
                <Button size="sm" variant="outline" onClick={handleResetFilter} className="h-9 px-3">
                  <FiRefreshCw className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Ledger Table Card */}
      <Card className="printable-content shadow-sm border-border/60">
        <CardHeader className="pb-3 border-b print:hidden">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg font-bold">Item Movement Ledger</CardTitle>
              <CardDescription>
                Historical ledger for {item.name} ({item.code}) with linked invoice & party details
              </CardDescription>
            </div>
            <Badge variant="outline" className="font-mono">
              {filteredLedger.length} Records
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="ledger-card-content p-4 sm:p-6 space-y-6">
          {/* Printable Header */}
          <PrintHeader
            docTitle="ITEM STOCK LEDGER"
            docNumber={item.code}
            organizationName={organization?.name}
            organizationAddress={organization?.address}
            organizationEmail={organization?.email}
            organizationPhone={organization?.phone}
          />

          {/* Item Header Metadata Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-3 bg-muted/40 rounded-lg border border-border/60 text-xs">
            <div>
              <span className="text-muted-foreground font-medium block">Item Name:</span>
              <span className="font-bold text-foreground">{item.name}</span>
            </div>
            <div>
              <span className="text-muted-foreground font-medium block">Item Code:</span>
              <span className="font-mono font-bold text-foreground">{item.code}</span>
            </div>
            <div>
              <span className="text-muted-foreground font-medium block">Unit / Category:</span>
              <span className="font-bold text-foreground">{item.unitSymbol} / {item.categoryName}</span>
            </div>
            <div>
              <span className="text-muted-foreground font-medium block">Cost Price / Sales Price:</span>
              <span className="font-bold text-foreground">৳{item.costPrice.toFixed(2)} / ৳{item.salesPrice.toFixed(2)}</span>
            </div>
          </div>

          {/* Table Element with Warehouse / Party Column */}
          <div className="ledger-overflow-wrap overflow-x-auto rounded-md border border-border">
            <Table className="text-xs ledger-print-table">
              <TableHeader className="bg-muted/60">
                <TableRow className="border-b">
                  <TableHead className="col-sl w-10 text-center font-bold text-foreground py-3">Sl</TableHead>
                  <TableHead className="col-date w-24 font-bold text-foreground py-3">Date</TableHead>
                  <TableHead className="col-type w-24 font-bold text-foreground py-3 print:hidden">Type</TableHead>
                  <TableHead className="col-inv w-28 font-bold text-foreground py-3">Invoice No</TableHead>
                  <TableHead className="col-party font-bold text-foreground py-3">Warehouse / Party</TableHead>
                  <TableHead className="col-open w-20 text-center font-bold text-slate-700 dark:text-slate-300 py-3">Opening</TableHead>
                  <TableHead className="col-in w-20 text-center font-bold text-emerald-600 dark:text-emerald-400 py-3">In</TableHead>
                  <TableHead className="col-out w-20 text-center font-bold text-amber-600 dark:text-amber-400 py-3">Out</TableHead>
                  <TableHead className="col-close w-20 text-center font-bold text-blue-600 dark:text-blue-400 py-3">Closing</TableHead>
                  <TableHead className="col-rate w-20 text-center font-bold text-foreground py-3">Rate</TableHead>
                  <TableHead className="col-total w-24 text-center font-bold text-foreground py-3">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLedger.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11} className="h-32 text-center text-muted-foreground text-sm">
                      No ledger transactions found for this item.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLedger.map((row) => (
                    <TableRow
                      key={row.sl}
                      className="hover:bg-muted/30 transition-colors border-b border-border/60 text-xs"
                    >
                      <TableCell className="col-sl text-center font-medium text-muted-foreground py-2">
                        {row.sl}
                      </TableCell>
                      <TableCell className="col-date font-mono text-muted-foreground py-2 text-[11px]">
                        {row.date}
                      </TableCell>
                      <TableCell className="col-type py-2 print:hidden">
                        {getTypeBadge(row.type)}
                      </TableCell>
                      <TableCell className="col-inv font-mono py-2 text-[11px]">
                        {row.invoiceUrl ? (
                          <Link
                            href={row.invoiceUrl}
                            className="text-blue-600 dark:text-blue-400 font-bold hover:underline inline-flex items-center gap-1 group"
                            title={`View invoice ${row.invoiceNo}`}
                          >
                            <span>{row.invoiceNo}</span>
                            <FiExternalLink className="ledger-print-icon h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </Link>
                        ) : row.invoiceNo !== "N/A" ? (
                          <span className="font-semibold text-foreground">{row.invoiceNo}</span>
                        ) : (
                          <span className="text-muted-foreground">N/A</span>
                        )}
                      </TableCell>
                      <TableCell className="col-party py-2">
                        {row.party?.link ? (
                          <Link
                            href={row.party.link}
                            className={`font-semibold hover:underline inline-flex flex-col gap-0 text-[11px]`}
                            title={`View details for ${row.party.label}`}
                          >
                            {row.party.type === "warehouse_transfer" ? (
                              <>
                                <span className={`inline-flex items-center gap-1 ${
                                  row.type.includes("Transfer In") || row.invoiceNo.startsWith("GRN")
                                    ? "text-emerald-600 dark:text-emerald-400"
                                    : "text-indigo-600 dark:text-indigo-400"
                                }`}>
                                  {row.party.toWarehouse
                                    ? (
                                      <>
                                        <span className="ledger-no-print text-[10px] font-normal opacity-70">To:</span>
                                        <span>{row.party.toWarehouse}</span>
                                      </>
                                    )
                                    : row.party.label
                                  }
                                  <FiExternalLink className="ledger-print-icon h-3 w-3 opacity-60" />
                                </span>
                                {row.party.fromWarehouse && (
                                  <span className="ledger-no-print text-[10px] text-muted-foreground font-normal">
                                    From: {row.party.fromWarehouse}
                                  </span>
                                )}
                              </>
                            ) : (
                              <span className={`inline-flex items-center gap-1 ${
                                row.party.type === "client"
                                  ? "text-blue-600 dark:text-blue-400"
                                  : "text-emerald-600 dark:text-emerald-400"
                              }`}>
                                <span>{row.party.label}</span>
                                <FiExternalLink className="ledger-print-icon h-3 w-3 opacity-60" />
                              </span>
                            )}
                          </Link>
                        ) : (
                          <span className="text-foreground/90 font-medium text-[11px]">
                            {row.party?.label || row.warehouse?.name || "—"}
                          </span>
                        )}
                        {row.variant && (
                          <div className="mt-1">
                            <Badge variant="outline" className="text-[10px] font-mono bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200/60 px-1.5 py-0 inline-flex items-center gap-1">
                              <FiLayers className="h-2.5 w-2.5 opacity-80" />
                              <span>SKU: {row.variant.sku}</span>
                              {(row.variant.size || row.variant.color) && (
                                <span className="opacity-80 font-normal">
                                  ({[row.variant.size, row.variant.color].filter(Boolean).join(" / ")})
                                </span>
                              )}
                            </Badge>
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="col-open text-center font-mono py-2 font-semibold text-slate-700 dark:text-slate-300">
                        {row.opening}
                      </TableCell>
                      <TableCell className="col-in text-center font-mono py-2">
                        {row.inQty > 0 ? (
                          <span className="font-semibold text-emerald-600 dark:text-emerald-400">+{row.inQty}</span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="col-out text-center font-mono py-2">
                        {row.outQty > 0 ? (
                          <span className="font-semibold text-amber-600 dark:text-amber-400">-{row.outQty}</span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="col-close text-center font-mono font-bold py-2 text-blue-600 dark:text-blue-400">
                        {row.closing}
                      </TableCell>
                      <TableCell className="col-rate text-center font-mono py-2">
                        {row.rate ? `৳${row.rate.toFixed(0)}` : "—"}
                      </TableCell>
                      <TableCell className="col-total text-center font-mono font-bold py-2">
                        {row.total ? `৳${row.total.toFixed(0)}` : "—"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>

              {/* Total Footer Row — each cell aligns with exact data column */}
              <TableHeader className="bg-muted/70 border-t-2 border-border">
                <TableRow className="hover:bg-transparent font-bold text-xs text-foreground">
                  <TableCell colSpan={3} className="col-sl py-2.5 px-3 font-bold text-foreground text-left uppercase tracking-wider text-xs">
                    Total Summary
                  </TableCell>
                  <TableCell className="footer-type-col py-2.5 px-1" />
                  <TableCell className="col-party py-2.5 px-2 text-muted-foreground font-semibold text-xs">
                    All Parties
                  </TableCell>
                  <TableCell className="col-open py-2.5 text-center font-mono text-slate-700 dark:text-slate-300 font-bold">
                    {initialOpening}
                  </TableCell>
                  <TableCell className="col-in py-2.5 text-center font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                    +{filterSummary.inQty}
                  </TableCell>
                  <TableCell className="col-out py-2.5 text-center font-mono text-amber-600 dark:text-amber-400 font-bold">
                    -{filterSummary.outQty}
                  </TableCell>
                  <TableCell className="col-close py-2.5 text-center font-mono text-blue-600 dark:text-blue-400 font-bold">
                    {lastStock}
                  </TableCell>
                  <TableCell className="col-rate py-2.5" />
                  <TableCell className="col-total py-2.5 text-center font-mono font-bold text-foreground">
                    ৳{filterSummary.total.toFixed(0)}
                  </TableCell>
                </TableRow>
              </TableHeader>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
