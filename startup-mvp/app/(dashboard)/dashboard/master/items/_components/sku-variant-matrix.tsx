"use client";

import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FiGrid, FiImage, FiPercent } from "react-icons/fi";

interface VariantStock {
  id: string;
  warehouseId: string;
  quantity: number;
}

interface Variant {
  id: string;
  sku: string;
  barcode: string | null;
  size: string;
  color: string;
  costPrice: number | null;
  salesPrice: number | null;
  image: string | null;
  stocks: VariantStock[];
}

interface Warehouse {
  id: string;
  name: string;
  code: string;
}

interface SKUVariantMatrixProps {
  variants: Variant[];
  warehouses: Warehouse[];
  isVatEnabled: boolean;
  vatPercentage: number;
  itemSalesPrice: number | null;
  featuredImage: string | null;
}

export default function SKUVariantMatrix({
  variants,
  warehouses,
  isVatEnabled,
  vatPercentage,
  itemSalesPrice,
  featuredImage,
}: SKUVariantMatrixProps) {
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>("all");

  const formatPrice = (price: any) => {
    if (price === null || price === undefined) return "-";
    return `৳${Number(price).toLocaleString("en-BD", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const getVariantStock = (v: Variant) => {
    if (selectedWarehouseId === "all") {
      // Sum stock across all warehouses
      return v.stocks.reduce((sum, s) => sum + s.quantity, 0);
    } else {
      // Show stock for the selected warehouse only
      const stock = v.stocks.find((s) => s.warehouseId === selectedWarehouseId);
      return stock ? stock.quantity : 0;
    }
  };

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-muted">
              <FiGrid className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <CardTitle className="text-base">SKU Variant Matrix</CardTitle>
              <CardDescription className="mt-0.5">
                {variants.length} active size-color variants
              </CardDescription>
            </div>
          </div>
          
          <div className="flex items-center gap-2 self-end sm:self-auto">
            {/* Warehouse Filter */}
            <Select value={selectedWarehouseId} onValueChange={setSelectedWarehouseId}>
              <SelectTrigger className="w-[180px] h-8 text-xs bg-background">
                <SelectValue placeholder="All Warehouses Stock" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Warehouses</SelectItem>
                {warehouses.map((w) => (
                  <SelectItem key={w.id} value={w.id}>
                    {w.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Badge variant="outline" className="font-semibold text-xs h-6">
              {variants.length} SKUs
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-y border-border bg-muted/50">
                <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Photo</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Color</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Size</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">SKU Code</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Barcode</th>
                <th className="text-right py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Cost</th>
                <th className="text-right py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Sales</th>
                {isVatEnabled && (
                  <th className="text-right py-3 px-4 text-xs font-semibold text-orange-600 uppercase tracking-wide">incl. VAT</th>
                )}
                <th className="text-right py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Stock</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {variants.map((v: Variant, idx: number) => {
                const variantSalesPrice = v.salesPrice ? Number(v.salesPrice) : (itemSalesPrice ? Number(itemSalesPrice) : null);
                const priceInclVat = variantSalesPrice && isVatEnabled
                  ? variantSalesPrice * (1 + vatPercentage / 100)
                  : null;
                const stockQty = getVariantStock(v);

                return (
                  <tr key={v.id || idx} className="hover:bg-muted/20 transition-colors group">
                    {/* Photo */}
                    <td className="py-3 px-4">
                      {v.image || featuredImage ? (
                        <div className="w-10 h-10 rounded-lg border border-border overflow-hidden bg-muted shrink-0">
                          <img
                            src={v.image || featuredImage || ""}
                            alt={`${v.color} ${v.size}`}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded-lg border border-dashed border-border bg-muted/40 flex items-center justify-center text-muted-foreground">
                          <FiImage className="h-4 w-4" />
                        </div>
                      )}
                    </td>
                    {/* Color */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full border border-border shrink-0"
                          style={{ backgroundColor: v.color.toLowerCase() }}
                        />
                        <span className="font-medium text-foreground">{v.color}</span>
                      </div>
                    </td>
                    {/* Size */}
                    <td className="py-3 px-4">
                      <Badge variant="outline" className="text-xs font-bold">{v.size}</Badge>
                    </td>
                    {/* SKU */}
                    <td className="py-3 px-4">
                      <code className="text-xs bg-muted px-2 py-1 rounded font-mono text-foreground">{v.sku}</code>
                    </td>
                    {/* Barcode */}
                    <td className="py-3 px-4">
                      {v.barcode ? (
                        <span className="text-xs font-mono text-muted-foreground tracking-wider">{v.barcode}</span>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">—</span>
                      )}
                    </td>
                    {/* Cost */}
                    <td className="py-3 px-4 text-right">
                      <span className="text-sm font-medium text-muted-foreground">
                        {v.costPrice ? formatPrice(v.costPrice) : <span className="text-xs italic text-muted-foreground">Base</span>}
                      </span>
                    </td>
                    {/* Sales */}
                    <td className="py-3 px-4 text-right">
                      <span className="text-sm font-bold text-primary">
                        {v.salesPrice ? formatPrice(v.salesPrice) : <span className="text-xs italic text-muted-foreground">Base</span>}
                      </span>
                    </td>
                    {/* Price incl. VAT */}
                    {isVatEnabled && (
                      <td className="py-3 px-4 text-right">
                        {priceInclVat ? (
                          <span className="text-sm font-bold text-orange-600">
                            {formatPrice(priceInclVat)}
                          </span>
                        ) : (
                          <span className="text-xs italic text-muted-foreground">—</span>
                        )}
                      </td>
                    )}
                    {/* Stock */}
                    <td className="py-3 px-4 text-right font-mono font-semibold">
                      <span className={stockQty > 0 ? "text-green-600" : "text-muted-foreground"}>
                        {stockQty.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {isVatEnabled && (
          <div className="px-4 py-3 border-t border-border bg-orange-50/50 dark:bg-orange-950/10">
            <p className="text-xs text-orange-700 dark:text-orange-400 font-medium flex items-center gap-1.5">
              <FiPercent className="h-3 w-3" />
              Prices in the "incl. VAT" column include {vatPercentage}% VAT added on top of the sales price.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
