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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Upload,
  Download,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Building2,
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

export interface VerifiedPurchaseItem {
  id: string;
  rawCode: string;
  rawQty: string | number;
  rawPrice?: string | number;
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
  unitPrice: number;
  amount: number;
  currentStock?: number;
}

interface PurchaseCsvImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: any[];
  suppliers?: any[];
  stockMap?: Record<string, number>;
  supplierId?: string;
  onSelectSupplier?: (id: string) => void;
  onImport: (
    items: Array<{
      itemId: string;
      variantId: string | null;
      description: string;
      quantity: number;
      unitPrice: number;
      amount: number;
    }>
  ) => void;
}

export default function PurchaseCsvImportDialog({
  open,
  onOpenChange,
  items = [],
  suppliers = [],
  stockMap = {},
  supplierId,
  onSelectSupplier,
  onImport,
}: PurchaseCsvImportDialogProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<"file" | "paste">("file");
  const [pastedText, setPastedText] = useState("");
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [verifiedRows, setVerifiedRows] = useState<VerifiedPurchaseItem[]>([]);
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
      ["item_code", "quantity", "unit_price"],
      ["ITM-001", "10", "150.00"],
      ["SKU-RED-L", "50", "250.00"],
      ["ITM-002", "20", ""],
      ["SKU-BLK-M", "100", ""],
    ];

    const csvContent = sampleRows.map((row) => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "purchase_item_import_sample.csv";
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
    const qtyKeywords = ["qty", "quantity", "purchaseqty", "purchase_qty", "orderqty", "order_qty", "count", "units"];
    const priceKeywords = ["price", "unitprice", "unit_price", "rate", "cost", "costprice", "cost_price", "unitcost", "purchaserate"];

    let codeIdx = -1;
    let qtyIdx = -1;
    let priceIdx = -1;

    headerRow.forEach((cell, idx) => {
      if (codeKeywords.includes(cell) && codeIdx === -1) codeIdx = idx;
      if (qtyKeywords.includes(cell) && qtyIdx === -1) qtyIdx = idx;
      if (priceKeywords.includes(cell) && priceIdx === -1) priceIdx = idx;
    });

    let dataRows: any[][];
    if (codeIdx !== -1 || qtyIdx !== -1) {
      dataRows = cleanedRows.slice(1);
      if (codeIdx === -1) codeIdx = 0;
      if (qtyIdx === -1) qtyIdx = 1;
    } else {
      dataRows = cleanedRows;
      codeIdx = 0;
      qtyIdx = 1;
      priceIdx = 2;
    }

    const verified: VerifiedPurchaseItem[] = [];

    dataRows.forEach((row, index) => {
      const rawCode = String(row[codeIdx] ?? "").trim();
      const rawQtyStr = String(row[qtyIdx] ?? "").trim();
      const rawPriceStr = priceIdx !== -1 && row[priceIdx] !== undefined ? String(row[priceIdx]).trim() : "";

      if (!rawCode && !rawQtyStr) return; // Skip completely empty row

      const itemRecord: VerifiedPurchaseItem = {
        id: `row-${index}-${Date.now()}`,
        rawCode,
        rawQty: rawQtyStr,
        rawPrice: rawPriceStr,
        isValid: false,
        quantity: 0,
        unitPrice: 0,
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
          const descMatch = it.description && it.description.trim().toLowerCase() === searchCode;
          return codeMatch || barcodeMatch || nameMatch || descMatch;
        });
      }

      if (!matchedItem) {
        itemRecord.errorMessage = `Item "${rawCode}" not found in catalog.`;
        verified.push(itemRecord);
        return;
      }

      // Check supplier association if supplier is set and item has supplierIds
      if (supplierId) {
        const itemSupplierIds = Array.isArray(matchedItem.supplierIds) ? matchedItem.supplierIds : [];
        if (itemSupplierIds.length > 0 && !itemSupplierIds.includes(supplierId)) {
          itemRecord.errorMessage = `Item "${matchedItem.code}" is not linked to selected supplier.`;
          verified.push(itemRecord);
          return;
        }
      }

      // 2. Validate Quantity
      const parsedQty = parseFloat(rawQtyStr);
      if (isNaN(parsedQty) || parsedQty <= 0) {
        itemRecord.errorMessage = `Invalid quantity "${rawQtyStr}". Must be greater than 0.`;
        verified.push(itemRecord);
        return;
      }

      const unitSymbol = matchedItem.unit?.symbol || matchedItem.unit || "Pcs";
      if (isDiscreteUnit(unitSymbol) && parsedQty % 1 !== 0) {
        itemRecord.errorMessage = `Quantity for ${unitSymbol} must be a whole integer.`;
        verified.push(itemRecord);
        return;
      }

      // 3. Determine Unit Price
      let unitPrice = 0;
      if (rawPriceStr && !isNaN(parseFloat(rawPriceStr)) && parseFloat(rawPriceStr) >= 0) {
        unitPrice = parseFloat(rawPriceStr);
      } else if (matchedVariant && matchedVariant.costPrice) {
        unitPrice = Number(matchedVariant.costPrice);
      } else {
        unitPrice = Number(matchedItem.unitPrice || matchedItem.costPrice || 0);
      }

      // Description
      let description = matchedItem.description || matchedItem.name || matchedItem.code;
      if (matchedVariant) {
        description = `${matchedVariant.sku}${matchedVariant.size ? `, ${matchedVariant.size}` : ""}${matchedVariant.color ? `, ${matchedVariant.color}` : ""}`;
      }

      const currentStock = matchedVariant?.id ? stockMap[matchedVariant.id] : stockMap[matchedItem.id];

      itemRecord.isValid = true;
      itemRecord.itemId = matchedItem.id;
      itemRecord.variantId = matchedVariant?.id || null;
      itemRecord.itemName = matchedItem.description || matchedItem.name;
      itemRecord.itemCode = matchedItem.code;
      itemRecord.variantSku = matchedVariant?.sku;
      itemRecord.description = description;
      itemRecord.unitSymbol = unitSymbol;
      itemRecord.quantity = parsedQty;
      itemRecord.unitPrice = unitPrice;
      itemRecord.amount = Number((parsedQty * unitPrice).toFixed(2));
      itemRecord.currentStock = currentStock;

      verified.push(itemRecord);
    });

    setVerifiedRows(verified);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFileName(file.name);
    const reader = new FileReader();

    if (file.name.endsWith(".csv")) {
      reader.onload = (evt) => {
        const text = evt.target?.result as string;
        const workbook = XLSX.read(text, { type: "string" });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
        parseAndVerifyRows(rows);
      };
      reader.readAsText(file);
    } else {
      reader.onload = (evt) => {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
        parseAndVerifyRows(rows);
      };
      reader.readAsArrayBuffer(file);
    }
  };

  const handlePasteVerify = () => {
    if (!pastedText.trim()) {
      toast({
        title: "Empty text",
        description: "Please paste CSV or Tab-separated rows from Excel.",
        variant: "destructive",
      });
      return;
    }

    const lines = pastedText.split(/\r?\n/).filter((l) => l.trim().length > 0);
    const rawRows = lines.map((line) => {
      if (line.includes("\t")) {
        return line.split("\t");
      }
      return line.split(",");
    });

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

    const importedData = validItems.map((item) => ({
      itemId: item.itemId!,
      variantId: item.variantId || null,
      description: item.description || item.itemName || "",
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      amount: item.amount,
    }));

    onImport(importedData);
    toast({
      title: "Items imported",
      description: `Successfully imported ${importedData.length} items to purchase order.`,
    });
    onOpenChange(false);
    resetState();
  };

  const displayedRows =
    filterMode === "valid"
      ? validItems
      : filterMode === "errors"
      ? invalidItems
      : verifiedRows;

  return (
    <Dialog
      open={open}
      onOpenChange={(val) => {
        if (!val) resetState();
        onOpenChange(val);
      }}
    >
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-6">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl font-bold flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-indigo-600" />
                Import Purchase Order Items (CSV / Excel)
              </DialogTitle>
              <DialogDescription className="mt-1 text-xs">
                Upload or paste spreadsheets containing item codes, purchase quantities, and unit rates.
              </DialogDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadSample}
              className="text-xs shrink-0"
            >
              <Download className="mr-1.5 h-3.5 w-3.5" />
              Download Sample CSV
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-2">
          {/* Supplier indicator / selector */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900 border text-xs">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-slate-500" />
              <span className="font-medium text-slate-700 dark:text-slate-300">Supplier:</span>
              {supplierId ? (
                <Badge variant="secondary" className="font-semibold text-xs">
                  {suppliers.find((s) => s.id === supplierId)?.name ||
                    suppliers.find((s) => s.id === supplierId)?.company ||
                    "Selected Supplier"}
                </Badge>
              ) : (
                <span className="text-amber-600 font-medium">No supplier selected (Catalog search)</span>
              )}
            </div>

            {!supplierId && suppliers.length > 0 && onSelectSupplier && (
              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground text-[11px]">Set Supplier:</span>
                <Select onValueChange={(val) => onSelectSupplier(val)}>
                  <SelectTrigger className="h-7 w-[200px] text-xs">
                    <SelectValue placeholder="Select supplier..." />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.map((s) => (
                      <SelectItem key={s.id} value={s.id} className="text-xs">
                        {s.supplierCode || "N/A"} - {s.name || s.company}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {verifiedRows.length === 0 ? (
            <Tabs
              value={activeTab}
              onValueChange={(v) => setActiveTab(v as "file" | "paste")}
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="file">
                  <Upload className="mr-2 h-4 w-4" />
                  Upload Excel / CSV
                </TabsTrigger>
                <TabsTrigger value="paste">
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                  Paste Text from Excel
                </TabsTrigger>
              </TabsList>

              <TabsContent value="file" className="mt-4 space-y-4">
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                    const file = e.dataTransfer.files?.[0];
                    if (file) {
                      const input = fileInputRef.current;
                      if (input) {
                        const dt = new DataTransfer();
                        dt.items.add(file);
                        input.files = dt.files;
                        handleFileUpload({ target: input } as any);
                      }
                    }
                  }}
                  className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                    isDragging
                      ? "border-primary bg-primary/5"
                      : "border-muted-foreground/25 hover:border-muted-foreground/50"
                  }`}
                >
                  <Upload className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
                  <p className="text-sm font-medium">
                    Drag and drop your spreadsheet file here, or click to browse
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Supports .xlsx, .xls, and .csv files
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="purchase-csv-upload-input"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="mt-4"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Select File
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="paste" className="mt-4 space-y-4">
                <div className="space-y-2">
                  <Textarea
                    placeholder="Paste rows copied directly from Excel or CSV (e.g., ITM-001, 10, 150.00)..."
                    value={pastedText}
                    onChange={(e) => setPastedText(e.target.value)}
                    rows={8}
                    className="font-mono text-xs"
                  />
                  <div className="flex justify-end">
                    <Button type="button" size="sm" onClick={handlePasteVerify}>
                      Verify Pasted Data
                    </Button>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          ) : (
            <div className="space-y-4">
              {/* Summary Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-lg bg-muted/50 border">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="font-semibold text-xs">
                    Total: {verifiedRows.length}
                  </Badge>
                  <Badge
                    variant="default"
                    className="bg-emerald-600 hover:bg-emerald-700 text-xs flex items-center gap-1"
                  >
                    <CheckCircle2 className="h-3 w-3" />
                    Valid: {validItems.length}
                  </Badge>
                  {invalidItems.length > 0 && (
                    <Badge variant="destructive" className="text-xs flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      Errors: {invalidItems.length}
                    </Badge>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center rounded-md border bg-background p-0.5 text-xs">
                    <button
                      type="button"
                      onClick={() => setFilterMode("all")}
                      className={`px-2.5 py-1 rounded-sm font-medium ${
                        filterMode === "all" ? "bg-muted shadow-sm" : "text-muted-foreground"
                      }`}
                    >
                      All ({verifiedRows.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setFilterMode("valid")}
                      className={`px-2.5 py-1 rounded-sm font-medium ${
                        filterMode === "valid" ? "bg-muted shadow-sm" : "text-muted-foreground"
                      }`}
                    >
                      Valid ({validItems.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setFilterMode("errors")}
                      className={`px-2.5 py-1 rounded-sm font-medium ${
                        filterMode === "errors" ? "bg-muted shadow-sm" : "text-muted-foreground"
                      }`}
                    >
                      Errors ({invalidItems.length})
                    </button>
                  </div>

                  <Button type="button" variant="ghost" size="sm" onClick={resetState} className="text-xs">
                    Upload Another
                  </Button>
                </div>
              </div>

              {/* Verified Items Table */}
              <div className="border rounded-md overflow-hidden max-h-[360px] overflow-y-auto">
                <Table>
                  <TableHeader className="bg-muted/80 sticky top-0 z-10">
                    <TableRow>
                      <TableHead className="w-12 text-center">Status</TableHead>
                      <TableHead>Item Code / SKU</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Quantity</TableHead>
                      <TableHead className="text-right">Unit Price</TableHead>
                      <TableHead className="text-right">Total Amount</TableHead>
                      <TableHead>Status / Error</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {displayedRows.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                          No records in this view.
                        </TableCell>
                      </TableRow>
                    ) : (
                      displayedRows.map((row) => (
                        <TableRow
                          key={row.id}
                          className={row.isValid ? "hover:bg-muted/40" : "bg-destructive/5 hover:bg-destructive/10"}
                        >
                          <TableCell className="text-center">
                            {row.isValid ? (
                              <CheckCircle2 className="h-4 w-4 text-emerald-600 inline-block" />
                            ) : (
                              <AlertCircle className="h-4 w-4 text-destructive inline-block" />
                            )}
                          </TableCell>
                          <TableCell className="font-mono text-xs font-medium">
                            {row.rawCode}
                          </TableCell>
                          <TableCell className="text-xs">
                            {row.isValid ? (
                              <div>
                                <span className="font-medium">{row.description}</span>
                                {row.currentStock !== undefined && (
                                  <span className="block text-[10px] text-muted-foreground">
                                    Current Stock: {row.currentStock} {row.unitSymbol}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs font-semibold">
                            {row.quantity > 0 ? (
                              <span>
                                {row.quantity} {row.unitSymbol || ""}
                              </span>
                            ) : (
                              row.rawQty
                            )}
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs">
                            {row.isValid ? `৳${row.unitPrice.toFixed(2)}` : row.rawPrice || "-"}
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs font-bold text-slate-800">
                            {row.isValid ? `৳${row.amount.toFixed(2)}` : "-"}
                          </TableCell>
                          <TableCell className="text-xs">
                            {row.isValid ? (
                              <Badge variant="outline" className="text-emerald-700 border-emerald-300 text-[10px]">
                                Ready to import
                              </Badge>
                            ) : (
                              <span className="text-destructive font-medium">{row.errorMessage}</span>
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

          {/* Guidelines info */}
          <div className="rounded-lg bg-slate-50 dark:bg-slate-900/50 p-3 border border-slate-200 dark:border-slate-800 text-xs text-muted-foreground space-y-1">
            <div className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <HelpCircle className="h-3.5 w-3.5" />
              Spreadsheet Column Format:
            </div>
            <p>
              1. <strong>Item Code / SKU / Barcode</strong> (Required) &bull; 2.{" "}
              <strong>Purchase Quantity</strong> (Required, &gt; 0) &bull; 3.{" "}
              <strong>Unit Rate / Cost Price</strong> (Optional, defaults to catalog cost).
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              resetState();
              onOpenChange(false);
            }}
          >
            Cancel
          </Button>
          {verifiedRows.length > 0 && (
            <Button
              type="button"
              onClick={handleConfirmImport}
              disabled={validItems.length === 0}
              className="bg-primary"
            >
              Import {validItems.length} Valid Item{validItems.length !== 1 ? "s" : ""}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
