"use client";

import React, { useState, useEffect, useRef } from "react";
import { useReactToPrint } from "react-to-print";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FiPrinter, FiPlus, FiMinus, FiGrid, FiSliders, FiImage } from "react-icons/fi";
import { BsLayoutWtf, BsGrid, BsGrid3X3, BsGrid3X3Gap } from "react-icons/bs";
import { TbLayoutColumns } from "react-icons/tb";

// ─── Standard label printer paper sizes ───────────────────────────────────────
type PaperSizeKey =
  | "45x35"
  | "38x25";

interface PaperSizeOption {
  key: PaperSizeKey;
  label: string;
  widthMm: number;
  heightMm: number;
}

const PAPER_SIZES: PaperSizeOption[] = [
  { key: "45x35", label: "45 × 35 mm (Rongta)", widthMm: 45, heightMm: 35 },
  { key: "38x25", label: "38 × 25 mm (Zebra)",  widthMm: 38, heightMm: 25 },
];

// ─── Layout options with icons ─────────────────────────────────────────────────
const LAYOUT_OPTIONS = [
  { value: "1col" as const, icon: TbLayoutColumns,   title: "1 Label per Row (Roll printer)" },
  { value: "2col" as const, icon: BsGrid,            title: "2 Labels per Row (Medium)" },
  { value: "3col" as const, icon: BsGrid3X3,         title: "3 Labels per Row (Compact)" },
  { value: "sheet" as const, icon: BsGrid3X3Gap,     title: "Standard A4 Sheet Grid" },
];
import BarcodePrintTemplate, { PrintableLabel } from "./BarcodePrintTemplate";

interface ProductVariant {
  id: string;
  sku: string;
  barcode: string | null;
  size: string;
  color: string;
  costPrice: number | null;
  salesPrice: number | null;
  image?: string | null;
}

interface ItemDetails {
  id: string;
  code: string;
  name: string;
  barcode: string | null;
  salesPrice: number | null;
  variants?: ProductVariant[];
  featuredImage?: string | null;
  images?: any;
}

interface BarcodePrintModalProps {
  item: ItemDetails;
  isOpen: boolean;
  onClose: () => void;
}

interface PrintItemRow {
  id: string;
  name: string;
  code: string;
  barcode: string;
  color: string | null;
  size: string | null;
  price: number | null;
  selected: boolean;
  copies: number;
  isVariant: boolean;
  image: string | null;
}

export default function BarcodePrintModal({ item, isOpen, onClose }: BarcodePrintModalProps) {
  const componentRef = useRef<HTMLDivElement>(null);

  // Print items state
  const [printRows, setPrintRows] = useState<PrintItemRow[]>([]);

  // Configuration options
  const [showCompany, setShowCompany] = useState(false);
  const [companyName, setCompanyName] = useState("Ferrari Fashion ");
  const [showName, setShowName] = useState(true);
  const [showVariant, setShowVariant] = useState(true);
  const [showPrice, setShowPrice] = useState(true);
  const [showBarcodeText, setShowBarcodeText] = useState(true);
  const [layout, setLayout] = useState<"1col" | "2col" | "3col" | "sheet">("1col");

  // Paper size
  const [paperSizeKey, setPaperSizeKey] = useState<PaperSizeKey>("45x35");

  const activePaperSize = PAPER_SIZES.find((p) => p.key === paperSizeKey)!;
  const pageSizeMm = { width: activePaperSize.widthMm, height: activePaperSize.heightMm };

  // Format Price helper
  const formatPrice = (price: any) => {
    if (price === null || price === undefined) return "";
    return `৳${Number(price).toLocaleString("en-BD", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Initialize rows from item prop
  useEffect(() => {
    if (!isOpen) return;

    const rows: PrintItemRow[] = [];

    // Parse base item image
    let baseFeaturedImage: string | null = item.featuredImage || null;
    if (!baseFeaturedImage && item.images) {
      try {
        const parsedImages = typeof item.images === "string" ? JSON.parse(item.images) : item.images;
        if (Array.isArray(parsedImages) && parsedImages.length > 0) {
          baseFeaturedImage = parsedImages[0];
        }
      } catch (e) {
        console.error("Failed to parse item.images", e);
      }
    }

    // 1. Add base item
    rows.push({
      id: `${item.id}-base`,
      name: item.name,
      code: item.code,
      barcode: item.barcode || "",
      color: null,
      size: null,
      price: item.salesPrice ? Number(item.salesPrice) : null,
      selected: !!item.barcode,
      copies: 1,
      isVariant: false,
      image: baseFeaturedImage,
    });

    // 2. Add variants
    if (item.variants && item.variants.length > 0) {
      item.variants.forEach((v) => {
        const variantPrice = v.salesPrice !== null && v.salesPrice !== undefined
          ? Number(v.salesPrice)
          : (item.salesPrice ? Number(item.salesPrice) : null);

        rows.push({
          id: v.id,
          name: item.name,
          code: v.sku,
          barcode: v.barcode || "",
          color: v.color,
          size: v.size,
          price: variantPrice,
          selected: !!v.barcode,
          copies: 1,
          isVariant: true,
          image: v.image || baseFeaturedImage,
        });
      });
    }

    setPrintRows(rows);
  }, [item.id, isOpen]);

  // If a roll size is selected, force layout to "1col" if it was "2col" or "3col"
  useEffect(() => {
    if (paperSizeKey === "45x35" || paperSizeKey === "38x25") {
      if (layout === "2col" || layout === "3col") {
        setLayout("1col");
      }
    }
  }, [paperSizeKey, layout]);

  // Quick helper: toggle selection for a row
  const toggleRow = (id: string) => {
    setPrintRows((prev) =>
      prev.map((row) =>
        row.id === id ? { ...row, selected: !row.selected } : row
      )
    );
  };

  // Quick helper: update copies for a row
  const updateCopies = (id: string, copies: number) => {
    const val = Math.max(1, copies);
    setPrintRows((prev) =>
      prev.map((row) => (row.id === id ? { ...row, copies: val } : row))
    );
  };

  // Quick actions
  const selectAll = () => {
    setPrintRows((prev) => prev.map((row) => ({ ...row, selected: !!row.barcode })));
  };

  // Clear all
  const clearAll = () => {
    setPrintRows((prev) => prev.map((row) => ({ ...row, selected: false })));
  };

  const setAllCopies = (num: number) => {
    setPrintRows((prev) => prev.map((row) => ({ ...row, copies: num })));
  };

  // Generate flat array of labels to render based on copies count
  const getFlatPrintList = (): PrintableLabel[] => {
    const list: PrintableLabel[] = [];
    printRows.forEach((row) => {
      if (row.selected && row.barcode) {
        for (let i = 0; i < row.copies; i++) {
          list.push({
            name: row.name,
            code: row.code,
            barcode: row.barcode,
            color: row.color,
            size: row.size,
            price: formatPrice(row.price),
            image: row.image,
          });
        }
      }
    });
    return list;
  };

  const printableItems = getFlatPrintList();

  // Print action
  const handlePrint = useReactToPrint({
    contentRef: componentRef,
    documentTitle: `Barcodes-${item.code}`,
  });

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-6xl w-[95vw] max-h-[90vh] overflow-y-auto p-6 flex flex-col gap-4">
        <DialogHeader className="pb-2 border-b border-border">
          <div className="flex items-center gap-2">
            <FiPrinter className="h-5 w-5 text-primary" />
            <DialogTitle className="text-xl font-bold">Print Barcodes & SKU Labels</DialogTitle>
          </div>
          <DialogDescription>
            Configure copies, printable fields, and page layout for {item.name} ({item.code}).
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start overflow-hidden min-h-0 flex-1">
          {/* LEFT: Print Type + Page Size bar, then Quick Actions + SKU table (7 cols) */}
          <div className="lg:col-span-7 flex flex-col space-y-3 max-h-[60vh] overflow-y-auto pr-1">

            {/* ── Print Type (icons row) + Page Size ── */}
            <div className="flex items-end gap-4 bg-muted/30 rounded-xl border border-border px-4 py-3">
              {/* 4 icon buttons in one horizontal line */}
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Print Type</span>
                <div className="flex items-center gap-1.5">
                  {LAYOUT_OPTIONS.map(({ value, icon: Icon, title }) => {
                    const isRollSize = paperSizeKey === "45x35" || paperSizeKey === "38x25";
                    const isOptionDisabled = isRollSize && (value === "2col" || value === "3col");
                    
                    if (isOptionDisabled) return null;
                    
                    return (
                      <button
                        key={value}
                        type="button"
                        title={title}
                        onClick={() => setLayout(value)}
                        className={`flex items-center justify-center rounded-lg border p-2 h-9 w-9 transition-all ${
                          layout === value
                            ? "border-primary bg-primary/10 text-primary shadow-sm ring-1 ring-primary"
                            : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:bg-muted/40"
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Page size dropdown */}
              <div className="flex flex-col gap-1 flex-1">
                <Label htmlFor="paperSize" className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Page Size</Label>
                <Select
                  value={paperSizeKey}
                  onValueChange={(val) => setPaperSizeKey(val as PaperSizeKey)}
                >
                  <SelectTrigger id="paperSize" className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAPER_SIZES.map((ps) => (
                      <SelectItem key={ps.key} value={ps.key} className="text-xs">
                        {ps.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Dimension hint */}
              <span className="text-[10px] text-muted-foreground whitespace-nowrap pb-1">
                {activePaperSize.widthMm}&nbsp;×&nbsp;{activePaperSize.heightMm}&nbsp;mm
              </span>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center justify-between bg-muted/40 p-3 rounded-lg border border-border">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Quick Actions
              </span>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={selectAll} className="text-xs h-7">
                  Select All
                </Button>
                <Button variant="outline" size="sm" onClick={clearAll} className="text-xs h-7">
                  Clear All
                </Button>
                <Button variant="outline" size="sm" onClick={() => setAllCopies(5)} className="text-xs h-7">
                  Set Copies to 5
                </Button>
                <Button variant="outline" size="sm" onClick={() => setAllCopies(1)} className="text-xs h-7">
                  Reset Qty
                </Button>
              </div>
            </div>

            {/* Selection Table */}
            <div className="border border-border rounded-xl overflow-y-auto bg-background max-h-[380px] scrollbar-thin">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-background z-10 shadow-[0_1px_0_0_rgba(0,0,0,0.1)] dark:shadow-[0_1px_0_0_rgba(255,255,255,0.1)]">
                  <tr className="bg-muted/95 backdrop-blur-sm text-xs text-muted-foreground font-semibold uppercase tracking-wider">
                    <th className="py-3 px-4 text-left w-12">Print</th>
                    <th className="py-3 px-4 text-left w-14">Photo</th>
                    <th className="py-3 px-4 text-left">SKU/Item Details</th>
                    <th className="py-3 px-4 text-left">Barcode</th>
                    <th className="py-3 px-4 text-right">Price</th>
                    <th className="py-3 px-4 text-center w-32">Copies</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {printRows.map((row) => (
                    <tr
                      key={row.id}
                      className={`hover:bg-muted/20 transition-colors ${
                        row.selected ? "bg-primary/5" : ""
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="py-3 px-4 text-center">
                        <Checkbox
                          checked={row.selected}
                          onCheckedChange={() => toggleRow(row.id)}
                          disabled={!row.barcode}
                        />
                      </td>

                      {/* Photo Column */}
                      <td className="py-3 px-4">
                        {row.image ? (
                          <div className="w-9 h-9 rounded-md border border-border overflow-hidden bg-muted shrink-0">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={row.image}
                              alt={row.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="w-9 h-9 rounded-md border border-dashed border-border bg-muted/40 flex items-center justify-center text-muted-foreground">
                            <FiImage className="h-4 w-4" />
                          </div>
                        )}
                      </td>

                      {/* Details */}
                      <td className="py-3 px-4">
                        <div className="flex flex-col">
                          <span className="font-semibold text-foreground truncate max-w-[200px]">
                            {row.isVariant ? `${row.color} / ${row.size}` : "Base Item"}
                          </span>
                          <span className="text-[10px] font-mono text-muted-foreground mt-0.5">
                            {row.code}
                          </span>
                        </div>
                      </td>

                      {/* Barcode value */}
                      <td className="py-3 px-4">
                        {row.barcode ? (
                          <span className="text-xs font-mono bg-muted px-2 py-1 rounded border border-border">
                            {row.barcode}
                          </span>
                        ) : (
                          <span className="text-[10px] text-destructive font-semibold italic bg-destructive/10 px-2 py-0.5 rounded">
                            No Barcode
                          </span>
                        )}
                      </td>

                      {/* Price */}
                      <td className="py-3 px-4 text-right font-medium">
                        {row.price !== null ? formatPrice(row.price) : <span className="text-xs text-muted-foreground italic">Base</span>}
                      </td>

                      {/* Copies Counter */}
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-center gap-1.5">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-7 w-7 rounded-md"
                            onClick={() => updateCopies(row.id, row.copies - 1)}
                            disabled={!row.selected}
                          >
                            <FiMinus className="h-3 w-3" />
                          </Button>
                          <Input
                            type="number"
                            min="1"
                            value={row.copies}
                            onChange={(e) => updateCopies(row.id, parseInt(e.target.value) || 1)}
                            className="h-7 w-12 text-center p-0 rounded-md text-xs font-bold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            disabled={!row.selected}
                          />
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-7 w-7 rounded-md"
                            onClick={() => updateCopies(row.id, row.copies + 1)}
                            disabled={!row.selected}
                          >
                            <FiPlus className="h-3 w-3" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* RIGHT: Options & Live Preview (5 columns) */}
          <div className="lg:col-span-5 space-y-4 max-h-[60vh] overflow-y-auto pr-1">
            {/* Options card */}
            <div className="rounded-xl border border-border p-4 space-y-4 bg-muted/20">
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <FiSliders className="h-3.5 w-3.5" /> Label Config
              </h3>

              {/* Toggles grid — Name & Price are on by default */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="showName"
                    checked={showName}
                    onCheckedChange={(checked) => setShowName(!!checked)}
                  />
                  <Label htmlFor="showName" className="text-xs cursor-pointer select-none">Show Name</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="showPrice"
                    checked={showPrice}
                    onCheckedChange={(checked) => setShowPrice(!!checked)}
                  />
                  <Label htmlFor="showPrice" className="text-xs cursor-pointer select-none">Show Price</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="showVariant"
                    checked={showVariant}
                    onCheckedChange={(checked) => setShowVariant(!!checked)}
                  />
                  <Label htmlFor="showVariant" className="text-xs cursor-pointer select-none">Show Variant Info</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="showBarcodeText"
                    checked={showBarcodeText}
                    onCheckedChange={(checked) => setShowBarcodeText(!!checked)}
                  />
                  <Label htmlFor="showBarcodeText" className="text-xs cursor-pointer select-none">Barcode Numbers</Label>
                </div>
              </div>
            </div>

            {/* Live Interactive Preview Box */}
            <div className="rounded-xl border border-border overflow-hidden bg-background">
              <div className="bg-muted/40 px-3 py-2 border-b border-border flex items-center justify-between">
                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <FiGrid className="h-3.5 w-3.5" /> Interactive Print Preview
                </h4>
                <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold">
                  {printableItems.length} labels queued
                </span>
              </div>
              <div className="p-4 bg-slate-100/50 dark:bg-slate-900/50 overflow-y-auto max-h-[40vh] border-b border-border flex flex-col items-center justify-start">
                {printableItems.length > 0 ? (
                  <div className="origin-top my-2">
                    <BarcodePrintTemplate
                      items={printableItems.slice(0, 3)} // limit preview to first 3 items to avoid UI lag
                      options={{
                        showCompany,
                        companyName,
                        showName,
                        showVariant,
                        showPrice,
                        showBarcodeText,
                        showImage: false,
                        layout,
                        pageSizeMm,
                      }}
                    />
                    {printableItems.length > 3 && (
                      <div className="text-center text-[10px] text-muted-foreground mt-2 italic bg-muted/60 py-1.5 px-2 rounded">
                        Showing first 3 of {printableItems.length} labels in preview. All {printableItems.length} labels will print (one label per page).
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="py-8 text-center text-xs text-muted-foreground italic">
                    Select at least one barcode to view preview.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Action buttons footer */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-border mt-auto">
          <Button variant="outline" onClick={onClose} className="px-4">
            Cancel
          </Button>

          {/* Hidden printable target container (positioned offscreen, not display:none, to allow print engines to calculate pages correctly) */}
          <div className="absolute -left-[9999px] -top-[9999px] opacity-0 pointer-events-none" aria-hidden="true">
            <div ref={componentRef}>
              <BarcodePrintTemplate
                items={printableItems}
                options={{
                  showCompany,
                  companyName,
                  showName,
                  showVariant,
                  showPrice,
                  showBarcodeText,
                  showImage: false,
                  layout,
                  pageSizeMm,
                }}
              />
            </div>
          </div>

          <Button
            onClick={() => handlePrint()}
            disabled={printableItems.length === 0}
            className="px-6 font-bold shadow-md hover:shadow-lg transition-all"
          >
            <FiPrinter className="mr-2 h-4 w-4" />
            Print Barcodes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
