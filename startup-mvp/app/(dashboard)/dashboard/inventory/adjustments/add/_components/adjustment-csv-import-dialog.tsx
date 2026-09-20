"use client";

import React, { useState, useRef } from "react";
import * as XLSX from "xlsx";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Upload,
  Download,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const isDiscreteUnit = (unit?: string | null): boolean => {
  if (!unit) return false;
  const norm = unit.trim().toLowerCase();
  const discreteUnits = [
    "pcs", "pc", "pcs.", "pc.", "piece", "pieces",
    "box", "boxes", "ctn", "carton", "cartons",
    "pack", "packs", "packet", "packets", "pkt",
    "bag", "bags", "set", "sets", "doz", "dozen",
    "pair", "pairs", "roll", "rolls", "can", "cans", "bottle", "bottles"
  ];
  return discreteUnits.includes(norm);
};

export interface VerifiedAdjustmentItem {
  id: string; // internal temp id
  rawCode: string;
  rawQty: string | number;
  rawRate?: string | number;
  isValid: boolean;
  errorMessage?: string;
  itemId?: string;
  variantId?: string | null;
  itemName?: string;
  itemCode?: string;
  variantSku?: string;
  description?: string;
  unitSymbol?: string;
  quantity: number;
  unitRate: number;
  amount: number;
  currentStock?: number;
}

interface AdjustmentCsvImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: any[];
  stockMap?: Record<string, number>;
  onImport: (
    items: Array<{
      itemId: string;
      variantId: string | null;
      description: string;
      quantity: number;
      unitRate: number;
      amount: number;
    }>
  ) => void;
}

export default function AdjustmentCsvImportDialog({
  open,
  onOpenChange,
  items,
  stockMap = {},
  onImport,
}: AdjustmentCsvImportDialogProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<"file" | "paste">("file");
  const [pastedText, setPastedText] = useState("");
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [verifiedRows, setVerifiedRows] = useState<VerifiedAdjustmentItem[]>([]);
  const [filterMode, setFilterMode] = useState<"all" | "valid" | "errors">("all");

  const validItems = verifiedRows.filter((r) => r.isValid);
  const invalidItems = verifiedRows.filter((r) => !r.isValid);

  const resetState = () => {
    setSelectedFileName(null);
    setPastedText("");
    setVerifiedRows([]);
    setFilterMode("all");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDownloadSample = () => {
    const sampleRows = [
      ["item_code", "quantity", "unit_rate"],
      ["ITM-001", "10", "150.00"],
      ["SKU-RED-L", "-5", "250.00"],
      ["ITM-002", "-2", ""],
      ["SKU-BLK-M", "8", ""],
    ];

    const csvContent = sampleRows.map((row) => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "inventory_adjustment_sample.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const parseAndVerifyRows = (rawRows: any[][]) => {
    if (!rawRows || rawRows.length === 0) {
      toast({
        title: "Empty file",
        description: "No data rows found in the uploaded file.",
        variant: "destructive",
      });
      return;
    }

    // Clean whitespace and quotation marks
    const cleanedRows = rawRows
      .map((row) =>
        row.map((cell) =>
          typeof cell === "string"
            ? cell.replace(/^["']|["']$/g, "").replace(/[\uFEFF\u200B-\u200D\u00A0]/g, "").trim()
            : cell
        )
      )
      .filter((row) => row.some((cell) => cell !== "" && cell !== undefined && cell !== null));

    if (cleanedRows.length === 0) {
      toast({
        title: "Empty data",
        description: "The file contains no readable records.",
        variant: "destructive",
      });
      return;
    }

    // Detect column indexes from header
    const headerRow = cleanedRows[0].map((c) => String(c || "").toLowerCase().replace(/[^a-z0-9]/g, ""));
    const codeKeywords = ["code", "itemcode", "item_code", "sku", "variantsku", "variant_sku", "barcode", "productcode", "product_code", "item"];
    const qtyKeywords = ["qty", "quantity", "adjqty", "adj_qty", "adjustmentqty", "adjustment_qty", "count", "diff", "units"];
    const rateKeywords = ["rate", "unitrate", "unit_rate", "cost", "costprice", "cost_price", "price", "unitcost"];

    let codeIdx = -1;
    let qtyIdx = -1;
    let rateIdx = -1;

    headerRow.forEach((cell, idx) => {
      if (codeKeywords.includes(cell) && codeIdx === -1) codeIdx = idx;
      if (qtyKeywords.includes(cell) && qtyIdx === -1) qtyIdx = idx;
      if (rateKeywords.includes(cell) && rateIdx === -1) rateIdx = idx;
    });

    let dataRows: any[][];
    if (codeIdx !== -1 || qtyIdx !== -1) {
      // Header row detected
      dataRows = cleanedRows.slice(1);
      if (codeIdx === -1) codeIdx = 0;
      if (qtyIdx === -1) qtyIdx = 1;
    } else {
      // No recognized header row, assume col 0 is code, col 1 is qty, col 2 is rate
      dataRows = cleanedRows;
      codeIdx = 0;
      qtyIdx = 1;
      rateIdx = 2;
    }

    const verified: VerifiedAdjustmentItem[] = [];

    dataRows.forEach((row, index) => {
      const rawCode = String(row[codeIdx] ?? "").trim();
      const rawQtyStr = String(row[qtyIdx] ?? "").trim();
      const rawRateStr = rateIdx !== -1 && row[rateIdx] !== undefined ? String(row[rateIdx]).trim() : "";

      if (!rawCode && !rawQtyStr) return; // Skip completely blank lines

      const itemRecord: VerifiedAdjustmentItem = {
        id: `row-${index}-${Date.now()}`,
        rawCode,
        rawQty: rawQtyStr,
        rawRate: rawRateStr,
        isValid: false,
        quantity: 0,
        unitRate: 0,
        amount: 0,
      };

      if (!rawCode) {
        itemRecord.errorMessage = "Missing item code or SKU";
        verified.push(itemRecord);
        return;
      }

      // 1. Match Item & Variant
      const searchCode = rawCode.toLowerCase();
      let matchedItem: any = null;
      let matchedVariant: any = null;

      // Look in variants first (precise SKU/barcode match)
      for (const it of items) {
        if (it.variants && it.variants.length > 0) {
          const v = it.variants.find((variant: any) => {
            const skuMatch = variant.sku && variant.sku.trim().toLowerCase() === searchCode;
            const barcodeMatch = variant.barcode && variant.barcode.trim().toLowerCase() === searchCode;
            return skuMatch || barcodeMatch;
          });
          if (v) {
            matchedVariant = v;
            matchedItem = it;
            break;
          }
        }
      }

      // If not matched in variants, match in base items
      if (!matchedItem) {
        matchedItem = items.find((it: any) => {
          const codeMatch = it.code && it.code.trim().toLowerCase() === searchCode;
          const barcodeMatch = it.barcode && it.barcode.trim().toLowerCase() === searchCode;
          const nameMatch = it.name && it.name.trim().toLowerCase() === searchCode;
          return codeMatch || barcodeMatch || nameMatch;
        });
      }

      if (!matchedItem) {
        itemRecord.errorMessage = `Item/SKU '${rawCode}' not found in database`;
        verified.push(itemRecord);
        return;
      }

      // Determine Description & Variant
      let description = "";
      let variantId: string | null = null;
      let unitCost = 0;

      if (matchedVariant) {
        variantId = matchedVariant.id;
        description = `${matchedVariant.sku}${matchedVariant.size ? `, ${matchedVariant.size}` : ""}${
          matchedVariant.color ? `, ${matchedVariant.color}` : ""
        }`;
        unitCost =
          matchedVariant.costPrice !== null && matchedVariant.costPrice !== undefined
            ? Number(matchedVariant.costPrice)
            : Number(matchedItem.costPrice || 0);
      } else {
        variantId = null;
        description = matchedItem.description || matchedItem.name || "";
        unitCost = Number(matchedItem.costPrice || 0);
      }

      // Custom unit rate override if provided in CSV
      if (rawRateStr && !isNaN(Number(rawRateStr)) && Number(rawRateStr) >= 0) {
        unitCost = Number(rawRateStr);
      }

      // 2. Validate Quantity
      const parsedQty = Number(rawQtyStr);
      if (isNaN(parsedQty) || rawQtyStr === "") {
        itemRecord.errorMessage = `Invalid quantity '${rawQtyStr}'`;
        verified.push(itemRecord);
        return;
      }

      if (parsedQty === 0) {
        itemRecord.errorMessage = "Adjustment quantity cannot be zero";
        verified.push(itemRecord);
        return;
      }

      const itemUnit = matchedItem.unit?.symbol || matchedItem.unit;
      const isIntegerOnly = isDiscreteUnit(itemUnit);
      if (isIntegerOnly && parsedQty % 1 !== 0) {
        itemRecord.errorMessage = `Quantity for ${itemUnit || "Pcs"} must be a whole number`;
        verified.push(itemRecord);
        return;
      }

      // Resolve Current Stock
      const stockKey = variantId || matchedItem.id;
      const currentStock = stockMap[stockKey] ?? 0;

      const lineAmount = Number(Math.abs(parsedQty * unitCost).toFixed(2));

      itemRecord.isValid = true;
      itemRecord.itemId = matchedItem.id;
      itemRecord.variantId = variantId;
      itemRecord.itemName = matchedItem.name;
      itemRecord.itemCode = matchedItem.code;
      itemRecord.variantSku = matchedVariant?.sku;
      itemRecord.description = description;
      itemRecord.unitSymbol = itemUnit || "pcs";
      itemRecord.quantity = parsedQty;
      itemRecord.unitRate = unitCost;
      itemRecord.amount = lineAmount;
      itemRecord.currentStock = currentStock;

      verified.push(itemRecord);
    });

    setVerifiedRows(verified);

    if (verified.length > 0) {
      const validCount = verified.filter((r) => r.isValid).length;
      const errorCount = verified.filter((r) => !r.isValid).length;

      if (errorCount === 0) {
        toast({
          title: "Verification successful",
          description: `All ${validCount} items verified and ready to add.`,
        });
      } else {
        toast({
          title: "Verification completed with issues",
          description: `${validCount} valid items, ${errorCount} errors detected.`,
          variant: "destructive",
        });
      }
    }
  };

  const handleFileUpload = (file: File) => {
    setSelectedFileName(file.name);
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const buffer = e.target?.result;
        if (!buffer) return;

        const workbook = XLSX.read(buffer, { type: "binary" });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const rawJson: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false });

        parseAndVerifyRows(rawJson);
      } catch (err: any) {
        toast({
          title: "File reading error",
          description: err.message || "Failed to parse the uploaded file.",
          variant: "destructive",
        });
      }
    };

    reader.readAsBinaryString(file);
  };

  const handlePasteVerify = () => {
    if (!pastedText.trim()) {
      toast({
        title: "Empty content",
        description: "Please paste text data to verify.",
        variant: "destructive",
      });
      return;
    }

    const lines = pastedText.split(/\r\n|\n|\r/).filter((l) => l.trim().length > 0);
    const rawRows = lines.map((line) => line.split(/[\t,;]/));
    setSelectedFileName("Pasted Data");
    parseAndVerifyRows(rawRows);
  };

  const handleConfirmImport = () => {
    if (validItems.length === 0) {
      toast({
        title: "No valid items",
        description: "There are no valid items to import.",
        variant: "destructive",
      });
      return;
    }

    const payload = validItems.map((v) => ({
      itemId: v.itemId!,
      variantId: v.variantId || null,
      description: v.description || "",
      quantity: v.quantity,
      unitRate: v.unitRate,
      amount: v.amount,
    }));

    onImport(payload);
    onOpenChange(false);
    resetState();

    toast({
      title: "Items imported",
      description: `Successfully added ${payload.length} item(s) to adjustment list.`,
    });
  };

  const displayedRows = verifiedRows.filter((row) => {
    if (filterMode === "valid") return row.isValid;
    if (filterMode === "errors") return !row.isValid;
    return true;
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) resetState();
        onOpenChange(isOpen);
      }}
    >
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-6 overflow-hidden">
        <DialogHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="h-6 w-6 text-primary" />
              <DialogTitle className="text-xl font-bold">Import Adjustment Items</DialogTitle>
            </div>
            <div className="flex items-center gap-2">
              {verifiedRows.length > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={resetState}
                  className="text-xs"
                >
                  <Upload className="mr-1.5 h-3.5 w-3.5" />
                  Upload Again
                </Button>
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleDownloadSample}
                className="text-xs"
              >
                <Download className="mr-1.5 h-3.5 w-3.5" />
                Download Sample CSV
              </Button>
            </div>
          </div>
          <DialogDescription className="text-sm text-muted-foreground">
            Upload or paste a CSV/Excel file with <strong>item_code</strong> and <strong>quantity</strong> (+ for Gain, - for Loss).
          </DialogDescription>
        </DialogHeader>

        {verifiedRows.length === 0 ? (
          <div className="flex-1 py-4 space-y-4">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "file" | "paste")}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="file">File Upload (.csv, .xlsx, .xls)</TabsTrigger>
                <TabsTrigger value="paste">Direct Text / Excel Paste</TabsTrigger>
              </TabsList>

              <TabsContent value="file" className="mt-4">
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                    if (e.dataTransfer.files?.[0]) {
                      handleFileUpload(e.dataTransfer.files[0]);
                    }
                  }}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3 ${
                    isDragging
                      ? "border-primary bg-primary/5 scale-[0.99]"
                      : "border-muted-foreground/30 hover:border-primary/60 hover:bg-muted/30"
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv, .xlsx, .xls, .txt, text/csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files?.[0]) {
                        handleFileUpload(e.target.files[0]);
                      }
                    }}
                  />
                  <div className="p-3 bg-primary/10 rounded-full text-primary">
                    <Upload className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">Click to upload or drag & drop CSV / Excel file</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Supports .csv, .xlsx, .xls (Headers: item_code, quantity, unit_rate)
                    </p>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="paste" className="mt-4 space-y-3">
                <Textarea
                  placeholder={`Paste rows copied from Excel or CSV here:\nITM-001\t10\t150.00\nSKU-RED-L\t-5\t250.00\nITM-002\t-2`}
                  value={pastedText}
                  onChange={(e) => setPastedText(e.target.value)}
                  className="font-mono text-xs min-h-[160px]"
                />
                <div className="flex justify-end">
                  <Button type="button" size="sm" onClick={handlePasteVerify} disabled={!pastedText.trim()}>
                    Verify Pasted Data
                  </Button>
                </div>
              </TabsContent>
            </Tabs>

            <div className="bg-muted/40 rounded-lg p-3 text-xs text-muted-foreground space-y-1.5 border">
              <div className="flex items-center gap-1.5 font-medium text-foreground">
                <HelpCircle className="h-4 w-4 text-primary" />
                <span>Format Guidelines:</span>
              </div>
              <ul className="list-disc list-inside space-y-0.5 ml-1">
                <li>
                  <strong>Item Code / SKU:</strong> Exact Item Code, Product Barcode, or Garment Variant SKU (e.g., <code>SKU-001-BLK-M</code>).
                </li>
                <li>
                  <strong>Quantity:</strong> Use positive numbers for stock additions/gains (e.g. <code>+10</code>) and negative numbers for losses/shrinkages (e.g. <code>-5</code>).
                </li>
                <li>
                  <strong>Unit Rate (Optional):</strong> Cost price per unit. If left blank, it will automatically populate from master item cost.
                </li>
              </ul>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col min-h-0 space-y-3 py-2">
            {/* Summary Counters Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-muted/40 p-3 rounded-lg border text-xs">
              <div className="flex items-center gap-2">
                <span className="font-medium text-muted-foreground">Source:</span>
                <Badge variant="outline" className="font-mono">
                  {selectedFileName}
                </Badge>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="text-muted-foreground">Total Parsed:</span>
                  <strong className="font-mono">{verifiedRows.length}</strong>
                </div>

                <div className="flex items-center gap-1.5 text-emerald-600">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Valid:</span>
                  <strong className="font-mono">{validItems.length}</strong>
                </div>

                {invalidItems.length > 0 && (
                  <div className="flex items-center gap-1.5 text-destructive">
                    <AlertCircle className="h-4 w-4" />
                    <span>Errors:</span>
                    <strong className="font-mono">{invalidItems.length}</strong>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-1.5">
                <Button
                  type="button"
                  variant={filterMode === "all" ? "default" : "outline"}
                  size="sm"
                  className="h-7 text-xs px-2.5"
                  onClick={() => setFilterMode("all")}
                >
                  All ({verifiedRows.length})
                </Button>
                <Button
                  type="button"
                  variant={filterMode === "valid" ? "default" : "outline"}
                  size="sm"
                  className="h-7 text-xs px-2.5"
                  onClick={() => setFilterMode("valid")}
                >
                  Valid ({validItems.length})
                </Button>
                {invalidItems.length > 0 && (
                  <Button
                    type="button"
                    variant={filterMode === "errors" ? "destructive" : "outline"}
                    size="sm"
                    className="h-7 text-xs px-2.5"
                    onClick={() => setFilterMode("errors")}
                  >
                    Errors ({invalidItems.length})
                  </Button>
                )}
              </div>
            </div>

            {/* Verification Preview Table */}
            <div className="flex-1 overflow-y-auto border rounded-md max-h-[380px]">
              <Table className="text-xs">
                <TableHeader className="bg-muted/80 sticky top-0 z-10">
                  <TableRow>
                    <TableHead className="w-[80px]">Status</TableHead>
                    <TableHead className="w-[140px]">Code / SKU</TableHead>
                    <TableHead>Matched Item</TableHead>
                    <TableHead className="w-[90px] text-right">Curr Stock</TableHead>
                    <TableHead className="w-[100px] text-right">Adj Qty</TableHead>
                    <TableHead className="w-[90px] text-right">Cost Rate</TableHead>
                    <TableHead className="w-[100px] text-right">Amount</TableHead>
                    <TableHead className="w-[180px]">Details / Error</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayedRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        No rows found matching current filter.
                      </TableCell>
                    </TableRow>
                  ) : (
                    displayedRows.map((row) => (
                      <TableRow
                        key={row.id}
                        className={!row.isValid ? "bg-destructive/5 hover:bg-destructive/10" : "hover:bg-muted/50"}
                      >
                        <TableCell>
                          {row.isValid ? (
                            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300">
                              Valid
                            </Badge>
                          ) : (
                            <Badge variant="destructive" className="text-[10px]">
                              Invalid
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="font-mono font-medium">{row.rawCode}</TableCell>
                        <TableCell>
                          {row.isValid ? (
                            <div>
                              <div className="font-medium text-foreground">{row.itemName}</div>
                              {row.description && (
                                <div className="text-[11px] text-muted-foreground">{row.description}</div>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground italic">Unmatched</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {row.isValid ? row.currentStock ?? 0 : "-"}
                        </TableCell>
                        <TableCell className="text-right font-mono font-bold">
                          {row.isValid ? (
                            <span className={row.quantity > 0 ? "text-emerald-600" : "text-red-600"}>
                              {row.quantity > 0 ? `+${row.quantity}` : row.quantity} {row.unitSymbol}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">{row.rawQty || "-"}</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right tabular-nums font-sans">
                          {row.isValid ? `৳${row.unitRate.toFixed(2)}` : "-"}
                        </TableCell>
                        <TableCell className="text-right tabular-nums font-sans font-medium">
                          {row.isValid ? `৳${row.amount.toFixed(2)}` : "-"}
                        </TableCell>
                        <TableCell>
                          {row.isValid ? (
                            <span className="text-muted-foreground text-[11px]">{row.itemCode}</span>
                          ) : (
                            <span className="text-destructive font-medium text-[11px] flex items-center gap-1">
                              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                              {row.errorMessage}
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        <DialogFooter className="pt-3 border-t flex flex-row items-center justify-between sm:justify-between">
          <div>
            {verifiedRows.length > 0 && (
              <Button type="button" variant="outline" size="sm" onClick={resetState} className="text-xs">
                <Upload className="mr-1.5 h-3.5 w-3.5" />
                Upload Again
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            {verifiedRows.length > 0 && (
              <Button
                type="button"
                size="sm"
                onClick={handleConfirmImport}
                disabled={validItems.length === 0}
                className="bg-primary"
              >
                Add {validItems.length} Valid Item(s) to List
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
