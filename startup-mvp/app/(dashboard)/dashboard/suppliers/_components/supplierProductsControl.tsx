"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SearchableSelect } from "@/components/ui/searchable-select";
import Link from "next/link";
import { FiPlus, FiTrash2, FiPackage, FiLoader, FiUpload, FiDownload, FiAlertTriangle } from "react-icons/fi";
import { X } from "lucide-react";
import { toast } from "sonner";
import { addSupplierProducts, removeSupplierProduct } from "../_actions/supplier.action";
import { getItemsForPurchase } from "@/app/(dashboard)/dashboard/procurements/purchases/_actions/purchase.action";


interface SuppliedItem {
  id: string;
  code: string;
  name: string;
  itemType: string;
  costPrice: number | string | null;
  salesPrice: number | string | null;
  status: string;
  unit?: {
    symbol: string;
  } | null;
}

interface SupplierProductsControlProps {
  supplierId: string;
  supplierName: string;
  initialItems: SuppliedItem[];
}

export default function SupplierProductsControl({
  supplierId,
  supplierName,
  initialItems,
}: SupplierProductsControlProps) {
  const router = useRouter();
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<SuppliedItem[]>(initialItems || []);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [availableItems, setAvailableItems] = useState<
    Array<{
      id: string;
      code: string;
      barcode?: string | null;
      name: string;
      description?: string;
      unit?: string;
      variants?: Array<{ id: string; sku?: string | null; barcode?: string | null }>;
    }>
  >([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [unmatchedCodes, setUnmatchedCodes] = useState<string[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Sync state if server revalidates props
  React.useEffect(() => {
    setItems(initialItems || []);
  }, [initialItems]);

  const loadAvailableItems = async () => {
    if (availableItems.length === 0) {
      setLoadingItems(true);
      try {
        const res = await getItemsForPurchase();
        if (res.success && res.items) {
          setAvailableItems(res.items as any);
          return res.items as any[];
        }
      } catch (err) {
        console.error("Failed to load products for modal:", err);
      } finally {
        setLoadingItems(false);
      }
    }
    return availableItems;
  };

  const handleOpenModal = async () => {
    setIsModalOpen(true);
    setSelectedIds([]);
    setUnmatchedCodes([]);
    await loadAvailableItems();
  };

  const handleExportUnmatched = (customCodes?: string[]) => {
    const codesToExport = customCodes || unmatchedCodes;
    if (codesToExport.length === 0) return;

    const csvRows = ["Product Code / SKU,Status,Reason"];
    codesToExport.forEach((code) => {
      const cleanCode = code.replace(/"/g, '""');
      csvRows.push(`"${cleanCode}","Failed","Product code or SKU not found in database"`);
    });

    const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const sanitizedName = (supplierName || "supplier").toLowerCase().replace(/[^a-z0-9]/g, "_");
    const filename = `${sanitizedName}_unmatched_product_codes.csv`;
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success(`Exported ${codesToExport.length} unmatched code(s) to ${filename}`);
  };

  const currentItemIds = items.map((i) => i.id);

  const handleCsvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Ensure database items are loaded for code/SKU lookup
    const dbItems = availableItems.length > 0 ? availableItems : (await loadAvailableItems()) || [];

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        if (!text) return;

        // Strip UTF-8 BOM if present
        const cleanText = text.replace(/^\uFEFF/, "");

        // 1. Split lines into non-empty rows
        const rawLines = cleanText.split(/\r\n|\n|\r/).map((l) => l.trim()).filter(Boolean);
        if (rawLines.length === 0) {
          toast.error("The uploaded CSV file is empty.");
          return;
        }

        // Parse lines into cell arrays (stripping surrounding quotes and hidden whitespace)
        const rows: string[][] = rawLines.map((line) =>
          line.split(/[,;\t]/).map((cell) => cell.replace(/^["']|["']$/g, "").replace(/[\uFEFF\u200B-\u200D\u00A0]/g, "").trim())
        );

        if (rows.length === 0) return;

        // 2. Identify Code Column Index from Header (if header row exists)
        const headerRow = rows[0];
        let codeColIndex = -1;
        const codeHeaderKeywords = [
          "code",
          "product_code",
          "item_code",
          "sku",
          "variant_sku",
          "barcode",
          "product code",
          "item code",
          "productcode",
          "itemcode",
        ];

        headerRow.forEach((cell, idx) => {
          const cleanCell = cell.toLowerCase().replace(/[^a-z0-9]/g, "");
          if (codeHeaderKeywords.some((kw) => kw.replace(/[^a-z0-9]/g, "") === cleanCell)) {
            codeColIndex = idx;
          }
        });

        let dataRows = rows;
        // If header detected, skip header row
        if (codeColIndex !== -1) {
          dataRows = rows.slice(1);
        } else {
          // If header not explicitly matched by index, check if first row contains header keywords
          const firstRowHeaderMatch = headerRow.some((cell) =>
            codeHeaderKeywords.some((kw) => cell.toLowerCase().includes(kw))
          );
          if (firstRowHeaderMatch) {
            dataRows = rows.slice(1);
          }
          // Default to column 0 if no specific code header found
          codeColIndex = 0;
        }

        // Helper for normalized comparison (strips spaces, dashes, underscores, quotes, uppercase)
        const normalize = (str?: string | null) => {
          if (!str) return "";
          return String(str).replace(/[\s\-_"']/g, "").toUpperCase();
        };

        // 3. Extract codes line-by-line from the identified code column
        const extractedCodes: string[] = [];

        dataRows.forEach((row) => {
          if (!row || row.length === 0) return;

          // Target code cell
          let codeVal = row[codeColIndex];

          // Fallback: if designated column cell is empty, find first non-empty cell in row
          if (!codeVal && row.length > 0) {
            codeVal = row.find((c) => Boolean(c)) || "";
          }

          if (codeVal && codeVal.length >= 1) {
            const rawCode = codeVal.trim();
            // Skip header text if somehow present in data rows
            if (codeHeaderKeywords.includes(rawCode.toLowerCase())) return;

            if (!extractedCodes.includes(rawCode)) {
              extractedCodes.push(rawCode);
            }
          }
        });

        if (extractedCodes.length === 0) {
          toast.error("No valid product codes or SKUs found in the uploaded file.");
          return;
        }

        // 4. Match against Database Items
        const matchedIds: string[] = [];
        const notFoundCodes: string[] = [];
        const alreadyConnectedCodes: string[] = [];
        const alreadySelectedCodes: string[] = [];

        extractedCodes.forEach((code) => {
          const normCode = normalize(code);

          const match = dbItems.find((item) => {
            const normItemCode = normalize(item.code);
            const normItemBarcode = normalize(item.barcode);
            const normItemDesc = normalize(item.description);
            const normItemName = normalize((item as any).name);

            if (normItemCode && normItemCode === normCode) return true;
            if (normItemBarcode && normItemBarcode === normCode) return true;
            if (normItemDesc && normItemDesc === normCode) return true;
            if (normItemName && normItemName === normCode) return true;

            if (
              item.variants?.some((v: any) => {
                const normSku = normalize(v.sku);
                const normVariantBarcode = normalize(v.barcode);
                return (normSku && normSku === normCode) || (normVariantBarcode && normVariantBarcode === normCode);
              })
            ) {
              return true;
            }

            return false;
          });

          if (match) {
            if (currentItemIds.includes(match.id)) {
              alreadyConnectedCodes.push(code);
            } else if (selectedIds.includes(match.id)) {
              alreadySelectedCodes.push(code);
            } else {
              if (!matchedIds.includes(match.id)) {
                matchedIds.push(match.id);
              }
            }
          } else {
            notFoundCodes.push(code);
          }
        });

        // 5. Update state & show feedback
        if (matchedIds.length > 0) {
          setSelectedIds((prev) => Array.from(new Set([...prev, ...matchedIds])));
          toast.success(`Successfully matched & added ${matchedIds.length} product(s) to selection list.`);
        } else if (alreadyConnectedCodes.length > 0 || alreadySelectedCodes.length > 0) {
          const count = alreadyConnectedCodes.length + alreadySelectedCodes.length;
          toast.info(`${count} product(s) in CSV are already connected to supplier or selected.`);
        } else {
          toast.error("No matching products found in the database for the codes/SKUs in CSV.");
        }

        setUnmatchedCodes(notFoundCodes);

        if (notFoundCodes.length > 0) {
          toast.warning(
            `${notFoundCodes.length} code/SKU(s) not found in system. You can export them to CSV.`,
            {
              action: {
                label: "Export Failed CSV",
                onClick: () => handleExportUnmatched(notFoundCodes),
              },
            }
          );
        }
      } catch (err) {
        console.error("CSV Parse error:", err);
        toast.error("Failed to parse CSV file. Please upload a valid plain text CSV.");
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    };

    reader.readAsText(file);
  };

  const handleAddProducts = async () => {
    if (selectedIds.length === 0) return;
    try {
      setActionLoading(true);
      const res = await addSupplierProducts(supplierId, selectedIds);
      if (res.success) {
        toast.success(`Successfully added ${selectedIds.length} product(s) to ${supplierName}.`);
        setIsModalOpen(false);
        setSelectedIds([]);
        router.refresh();
      } else {
        toast.error(res.error || "Failed to add products");
      }
    } catch (err) {
      console.error("handleAddProducts error:", err);
      toast.error("Failed to add products");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemoveProduct = async (itemId: string) => {
    if (!confirm("Are you sure you want to remove this product from the supplier?")) return;
    try {
      setDeletingId(itemId);
      const res = await removeSupplierProduct(supplierId, itemId);
      if (res.success) {
        toast.success("Product removed from supplier.");
        setItems(prev => prev.filter(i => i.id !== itemId));
        router.refresh();
      } else {
        toast.error(res.error || "Failed to remove product");
      }
    } catch (err) {
      console.error("handleRemoveProduct error:", err);
      toast.error("Failed to remove product");
    } finally {
      setDeletingId(null);
    }
  };

  const selectableOptions = availableItems
    .filter(item => !currentItemIds.includes(item.id) && !selectedIds.includes(item.id))
    .map(item => {
      const skus = item.variants?.map((v: any) => v.sku).filter(Boolean).join(", ");
      return {
        label: `${item.name || item.description} [${item.code}]${skus ? ` (SKUs: ${skus})` : ""}${item.unit ? ` (${item.unit})` : ""}`,
        value: item.id,
        description: skus || undefined,
      };
    });




  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <FiPackage className="h-5 w-5 text-primary" />
              Supplied Products ({items.length})
            </CardTitle>
            <CardDescription className="mt-1">
              Products and raw materials connected to and supplied by this vendor.
            </CardDescription>
          </div>
          <Button size="sm" onClick={handleOpenModal} className="flex items-center gap-1.5">
            <FiPlus className="h-4 w-4" />
            Add Product
          </Button>
        </CardHeader>
        <CardContent>
          {items.length > 0 ? (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Item Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Cost Price</TableHead>
                    <TableHead className="text-right">Sales Price</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right w-[80px]">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-mono text-xs uppercase font-medium">{item.code}</TableCell>
                      <TableCell className="font-medium">
                        <Link href={`/dashboard/master/items/${item.id}`} className="hover:underline text-primary">
                          {item.name}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {item.itemType}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">{item.costPrice ? Number(item.costPrice).toFixed(2) : "0.00"}</TableCell>
                      <TableCell className="text-right font-medium">{item.salesPrice ? Number(item.salesPrice).toFixed(2) : "-"}</TableCell>
                      <TableCell>{item.unit?.symbol || "pcs"}</TableCell>
                      <TableCell>
                        <Badge variant={item.status === "active" ? "default" : "secondary"} className="capitalize">
                          {item.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveProduct(item.id)}
                          disabled={deletingId === item.id}
                          className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                          title="Remove product from supplier"
                        >
                          {deletingId === item.id ? (
                            <FiLoader className="h-4 w-4 animate-spin text-destructive" />
                          ) : (
                            <FiTrash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="p-8 text-center text-muted-foreground border rounded-lg bg-muted/20 flex flex-col items-center justify-center gap-3">
              <FiPackage className="h-10 w-10 text-muted-foreground/50" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">No products currently connected to this supplier.</p>
                <p className="text-xs text-muted-foreground">Add products supplied by this vendor to enable automatic purchase order filtering.</p>
              </div>
              <Button size="sm" variant="outline" onClick={handleOpenModal} className="mt-1 flex items-center gap-1.5">
                <FiPlus className="h-4 w-4" />
                Add Product Now
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Products Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-3xl sm:max-w-[750px] h-[550px] flex flex-col p-6">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="flex items-center gap-2 text-lg">
              <FiPackage className="h-5 w-5 text-primary" />
              Add Products to {supplierName}
            </DialogTitle>
            <DialogDescription>
              Search and select products or raw materials to connect to this vendor.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 flex flex-col min-h-0 py-2 overflow-hidden">
            {loadingItems ? (
              <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground gap-2">
                <FiLoader className="h-5 w-5 animate-spin text-primary" />
                Loading available products...
              </div>
            ) : (
              <div className="flex-1 flex flex-col min-h-0 space-y-4">
                <div className="space-y-1.5 flex-shrink-0">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-muted-foreground uppercase">Search Product</label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      className="h-7 text-xs flex items-center gap-1.5 border-dashed hover:border-primary hover:text-primary transition-colors"
                      title="Upload a CSV file containing product codes"
                    >
                      <FiUpload className="h-3.5 w-3.5 text-primary" />
                      Import CSV
                    </Button>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleCsvUpload}
                      accept=".csv, .txt"
                      className="hidden"
                    />
                  </div>
                  <SearchableSelect
                    options={selectableOptions}
                    value={null}
                    onValueChange={(val) => {
                      if (val && !selectedIds.includes(val)) {
                        setSelectedIds(prev => [...prev, val]);
                      }
                    }}
                    placeholder="Type or click to search and select products..."
                    searchPlaceholder="Search products by code or name..."
                  />
                </div>

                {unmatchedCodes.length > 0 && (
                  <div className="flex items-center justify-between gap-2 p-2.5 px-3 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-200 text-xs flex-shrink-0">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <FiAlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                      <span className="truncate">
                        <strong>{unmatchedCodes.length}</strong> product code(s) from CSV could not be matched.
                      </span>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleExportUnmatched()}
                      className="h-7 text-xs bg-background text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700 hover:bg-amber-100 dark:hover:bg-amber-900/30 flex items-center gap-1.5 flex-shrink-0"
                    >
                      <FiDownload className="h-3.5 w-3.5" />
                      Download Failed Codes (.csv)
                    </Button>
                  </div>
                )}


                <div className="flex-1 flex flex-col min-h-0 space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground uppercase px-1 flex-shrink-0">
                    <span>Selected Products ({selectedIds.length})</span>
                    {selectedIds.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setSelectedIds([])}
                        className="text-destructive hover:underline text-xs normal-case font-normal"
                      >
                        Clear All
                      </button>
                    )}
                  </div>

                  <div className="flex-1 border rounded-lg overflow-y-auto bg-card min-h-0">
                    {selectedIds.length > 0 ? (
                      <Table>
                        <TableHeader className="bg-muted/60 sticky top-0 z-10 shadow-sm">
                          <TableRow>
                            <TableHead className="w-[140px]">Code</TableHead>
                            <TableHead>Item Name</TableHead>
                            <TableHead className="w-[100px]">Unit</TableHead>
                            <TableHead className="text-right w-[60px]">Action</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {selectedIds.map((id) => {
                            const found = availableItems.find(i => i.id === id);
                            return (
                              <TableRow key={id} className="hover:bg-muted/40">
                                <TableCell className="font-mono text-xs uppercase font-medium">{found?.code || id}</TableCell>
                                <TableCell className="font-medium text-sm">{found?.name || found?.description || "-"}</TableCell>
                                <TableCell className="text-xs text-muted-foreground">{found?.unit || "pcs"}</TableCell>
                                <TableCell className="text-right">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setSelectedIds(prev => prev.filter(itemId => itemId !== id))}
                                    className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                                    title="Remove from selection"
                                  >
                                    <FiTrash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    ) : (
                      <div className="h-full p-8 text-center text-muted-foreground flex flex-col items-center justify-center gap-2">
                        <FiPackage className="h-8 w-8 text-muted-foreground/40" />
                        <p className="text-xs font-medium">No products selected yet.</p>
                        <p className="text-[11px] text-muted-foreground">Use the search box above to add products to this list.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="flex-shrink-0 gap-2 sm:gap-0 pt-3 border-t mt-2">
            <Button variant="outline" onClick={() => setIsModalOpen(false)} disabled={actionLoading}>
              Cancel
            </Button>
            <Button onClick={handleAddProducts} disabled={selectedIds.length === 0 || actionLoading} className="gap-2">
              {actionLoading && <FiLoader className="h-4 w-4 animate-spin" />}
              Add {selectedIds.length > 0 ? `(${selectedIds.length}) ` : ""}Products
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


    </>
  );
}
