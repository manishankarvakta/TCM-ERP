"use client";

import React, { useEffect, useState, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Trash2, Search } from "lucide-react";
import { createTPN } from "../_actions/tpn.action";
import { getWarehouseStocks } from "../../../inventory/stock/_actions/stock.action";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { getItemVariants } from "../../../master/items/_actions/item.action";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";


// Schema
const tpnSchema = z.object({
  sourceWarehouseId: z.string().min(1, "Source warehouse is required"),
  destinationWarehouseId: z.string().min(1, "Destination warehouse is required"),
  date: z.string().refine((val) => !isNaN(Date.parse(val)), "Invalid date"),
  notes: z.string().optional(),
  items: z.array(z.object({
    itemId: z.string().min(1, "Item is required"),
    variantId: z.string().optional().nullable(),
    quantity: z.number().min(1, "Quantity must be at least 1"),
    // UI only field
    description: z.string().optional(),
  })).min(1, "At least one item is required"),
}).refine(data => data.sourceWarehouseId !== data.destinationWarehouseId, {
  message: "Source and destination warehouses cannot be the same",
  path: ["destinationWarehouseId"],
});

type TpnFormValues = z.infer<typeof tpnSchema>;

interface TpnFormProps {
  warehouses: any[];
  items: any[]; 
  user?: { role: string; defaultWarehouseId: string | null } | null;
}

export default function TpnForm({ warehouses, items, user }: TpnFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [stockMap, setStockMap] = useState<Record<string, number>>({});
  const [itemSearch, setItemSearch] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  // SKU selection modal state
  const [skuModalOpen, setSkuModalOpen] = useState(false);
  const [skuModalItem, setSkuModalItem] = useState<{ id: string; description: string; code: string } | null>(null);
  const [skuModalIndex, setSkuModalIndex] = useState<number | null>(null);
  const [skuVariants, setSkuVariants] = useState<Array<{
    id: string;
    sku: string;
    size: string | null;
    color: string | null;
    costPrice: number | null;
  }>>([]);
  const [skuLoading, setSkuLoading] = useState(false);
  const [selectedVariants, setSelectedVariants] = useState<Record<string, boolean>>({});

  const handleSkuConfirm = () => {
    if (skuModalIndex === null || !skuModalItem) return;
    
    const selectedVariantIds = Object.keys(selectedVariants)
      .filter(id => selectedVariants[id])
      .sort((a, b) => {
        const indexA = skuVariants.findIndex(v => v.id === a);
        const indexB = skuVariants.findIndex(v => v.id === b);
        return indexA - indexB;
      });
    if (selectedVariantIds.length === 0) {
      setSkuModalOpen(false);
      return;
    }
    
    // Process first variant to update current row
    const firstVariantId = selectedVariantIds[0];
    const firstVariant = skuVariants.find(v => v.id === firstVariantId);
    if (firstVariant) {
      const desc = `${firstVariant.sku}${firstVariant.size ? `, ${firstVariant.size}` : ''}${firstVariant.color ? `, ${firstVariant.color}` : ''}`;
      
      form.setValue(`items.${skuModalIndex}.itemId`, skuModalItem.id);
      form.setValue(`items.${skuModalIndex}.variantId`, firstVariant.id);
      form.setValue(`items.${skuModalIndex}.description`, desc);
    }
    
    // Process remaining variants
    selectedVariantIds.slice(1).forEach((varId, idx) => {
      const variant = skuVariants.find(v => v.id === varId);
      if (variant) {
        const desc = `${variant.sku}${variant.size ? `, ${variant.size}` : ''}${variant.color ? `, ${variant.color}` : ''}`;
        
        append({
          itemId: skuModalItem.id,
          variantId: variant.id,
          description: desc,
          quantity: 1,
        });
      }
    });
    
    setSkuModalOpen(false);
  };


  const isNormalUser = user?.role !== "admin" && user?.role !== "super-admin";

  const form = useForm<TpnFormValues>({
    resolver: zodResolver(tpnSchema),
    defaultValues: {
      sourceWarehouseId: user?.defaultWarehouseId || "",
      destinationWarehouseId: "",
      date: new Date().toISOString().split("T")[0],
      notes: "",
      items: [{ itemId: "", quantity: 1, description: "" }],
    },
  });

  const { fields, append, prepend, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const sourceWarehouseId = useWatch({
    control: form.control,
    name: "sourceWarehouseId",
  });

  const watchedItems = form.watch("items") || [];

  const otherSelectedVariants = useMemo(() => {
    if (skuModalIndex === null) return new Set<string>();
    const items = form.getValues("items") || [];
    const set = new Set<string>();
    items.forEach((item: any, idx: number) => {
      if (idx !== skuModalIndex && item.variantId) {
        set.add(item.variantId);
      }
    });
    return set;
  }, [skuModalIndex, watchedItems]);
  
  const totalItems = watchedItems.filter((item: any) => !!item.itemId).length;
  
  const totalQuantity = watchedItems.reduce((sum: number, item: any) => sum + (Number(item.quantity) || 0), 0);

  const grandTotal = watchedItems.reduce((sum: number, wItem: any) => {
    if (!wItem.itemId) return sum;
    const itemObj = items.find(i => i.id === wItem.itemId);
    if (!itemObj) return sum;
    let unitPrice = 0;
    if (wItem.variantId) {
      const variantObj = itemObj.variants?.find((v: any) => v.id === wItem.variantId);
      unitPrice = variantObj?.costPrice ? Number(variantObj.costPrice) : Number(itemObj.costPrice || 0);
    } else {
      unitPrice = Number(itemObj.costPrice || 0);
    }
    const qty = Number(wItem.quantity) || 0;
    return sum + (qty * unitPrice);
  }, 0);

  const formatCurrency = (amount: number) => {
    return `৳${amount.toLocaleString("en-BD", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  // Filter items based on search
  const filteredItems = useMemo(() => {
    if (!itemSearch) return items;
    const searchLower = itemSearch.toLowerCase();
    return items.filter(
      (item) =>
        item.code?.toLowerCase().includes(searchLower) ||
        item.description?.toLowerCase().includes(searchLower) ||
        (item.barcode && item.barcode.toLowerCase().includes(searchLower)) ||
        item.variants?.some((v: any) => 
          (v.sku && v.sku.toLowerCase().includes(searchLower)) ||
          (v.barcode && v.barcode.toLowerCase().includes(searchLower))
        )
    );
  }, [items, itemSearch]);

  // Fetch stocks for source warehouse
  useEffect(() => {
     if (!sourceWarehouseId) return;
     
     const fetchAllStocks = async () => {
        const res = await getWarehouseStocks(sourceWarehouseId);
        if (res.success && res.stocks) {
           const map: Record<string, number> = {};
           res.stocks.forEach(s => {
             if (s.itemId) map[s.itemId] = s.quantity;
             if (s.variantId) map[s.variantId] = s.quantity;
           });
           setStockMap(map);
        }
     };
     
     fetchAllStocks();
  }, [sourceWarehouseId]); 

  const onSubmit = async (data: TpnFormValues) => {
    setIsSubmitting(true);
    try {
      const result = await createTPN({
         sourceWarehouseId: data.sourceWarehouseId,
         destinationWarehouseId: data.destinationWarehouseId,
         date: new Date(data.date),
         notes: data.notes,
         items: data.items.map(i => ({
             itemId: i.itemId,
             quantity: i.quantity,
             variantId: i.variantId,
         })),
      });

      if (result.success) {
        toast({
          title: "Success",
          description: "Transfer note created",
        }); 
        router.push("/dashboard/procurements/tpn");
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to create transfer note",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An error occurred",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleItemSelect = async (index: number, itemId: string) => {
    const selectedItem = items.find(i => i.id === itemId);
    if (selectedItem) {
      if (selectedItem.itemType === "RETAIL" || selectedItem.itemType === "READY_PRODUCT") {
        const query = itemSearch.trim().toLowerCase();
        const matchedVariant = selectedItem.variants?.find(
          (v: any) => (v.sku && v.sku.toLowerCase() === query) || (v.barcode && v.barcode.toLowerCase() === query)
        );

        if (matchedVariant) {
          // Direct add the matched variant, bypass modal completely!
          const desc = `${matchedVariant.sku}${matchedVariant.size ? `, ${matchedVariant.size}` : ''}${matchedVariant.color ? `, ${matchedVariant.color}` : ''}`;
          form.setValue(`items.${index}.itemId`, itemId);
          form.setValue(`items.${index}.variantId`, matchedVariant.id);
          form.setValue(`items.${index}.description`, desc);
        } else {
          // No direct variant match. Fetch variants asynchronously first
          setSkuLoading(true);
          const res = await getItemVariants(selectedItem.id);
          if (res.success && res.variants && res.variants.length > 0) {
            // Open modal only now, preventing any blinking
            setSkuVariants(res.variants);
            setSkuModalItem({
              id: selectedItem.id,
              description: selectedItem.description || selectedItem.name,
              code: selectedItem.code
            });
            setSkuModalIndex(index);
            setSkuModalOpen(true);
            setSkuLoading(false);
            setSelectedVariants({});
          } else {
            // Product has no variants at all! Add base product directly
            setSkuModalOpen(false);
            setSkuLoading(false);

            form.setValue(`items.${index}.itemId`, itemId);
            form.setValue(`items.${index}.variantId`, null);
            form.setValue(`items.${index}.description`, `${selectedItem.code} - ${selectedItem.description || selectedItem.name}`);
          }
        }
      } else {
        form.setValue(`items.${index}.itemId`, itemId);
        form.setValue(`items.${index}.variantId`, null);
        form.setValue(`items.${index}.description`, `${selectedItem.code} - ${selectedItem.description || selectedItem.name}`);
      }
      setItemSearch("");
    }
  };

  return (
    <>
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      <Card>
        <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Source Warehouse</Label>
            <Select 
              disabled={isNormalUser}
              onValueChange={(val) => form.setValue("sourceWarehouseId", val)} 
              defaultValue={form.getValues("sourceWarehouseId")}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select Source Warehouse" />
              </SelectTrigger>
              <SelectContent>
                {warehouses.map(w => (
                  <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.sourceWarehouseId && <p className="text-sm text-red-500">{form.formState.errors.sourceWarehouseId.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>Destination Warehouse</Label>
            <Select 
              onValueChange={(val) => form.setValue("destinationWarehouseId", val)} 
              defaultValue={form.getValues("destinationWarehouseId")}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select Destination Warehouse" />
              </SelectTrigger>
              <SelectContent>
                {warehouses.map(w => (
                  <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.destinationWarehouseId && <p className="text-sm text-red-500">{form.formState.errors.destinationWarehouseId.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>Date</Label>
            <Input type="date" {...form.register("date")} />
            {form.formState.errors.date && <p className="text-sm text-red-500">{form.formState.errors.date.message}</p>}
          </div>

          <div className="col-span-1 md:col-span-3 space-y-2">
            <Label>Notes</Label>
            <Textarea {...form.register("notes")} placeholder="Reason for transfer..." />
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">Items to Transfer</h3>
            <Button type="button" variant="outline" size="sm" onClick={() => prepend({ itemId: "", quantity: 1, description: "" })}>
              <Plus className="mr-2 h-4 w-4" /> Add Item
            </Button>
        </div>

        <Card>
            <div className="p-0">
               <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="w-[25%]">Item</TableHead>
                      <TableHead className="w-[25%]">Description</TableHead>
                      <TableHead className="w-[15%] text-right">Available Source Stock</TableHead>
                      <TableHead className="w-[12%] text-right">Transfer Qty</TableHead>
                      <TableHead className="w-[12%] text-right">Rate</TableHead>
                      <TableHead className="w-[12%] text-right">Amount</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fields.map((field, index) => {
                      const selectedItem = items.find(i => i.id === form.getValues(`items.${index}.itemId`));
                      
                      const itemVal = watchedItems[index];
                      let rate = 0;
                      if (selectedItem) {
                        if (itemVal?.variantId) {
                          const variant = selectedItem.variants?.find((v: any) => v.id === itemVal.variantId);
                          rate = variant?.costPrice ? Number(variant.costPrice) : Number(selectedItem.costPrice || 0);
                        } else {
                          rate = Number(selectedItem.costPrice || 0);
                        }
                      }
                      const qty = Number(itemVal?.quantity) || 0;
                      const amount = qty * rate;

                      return (
                      <TableRow key={field.id}>
                        <TableCell>
                          <Select
                            onValueChange={(val) => handleItemSelect(index, val)}
                            defaultValue={form.getValues(`items.${index}.itemId`)}
                            onOpenChange={(open) => {
                               if (open) {
                                 setTimeout(() => {
                                   searchInputRef.current?.focus();
                                 }, 0);
                               } else {
                                 setItemSearch("");
                               }
                            }}
                          >
                             <SelectTrigger>
                                <SelectValue placeholder="Select item">
                                   {selectedItem ? `${selectedItem.code} - ${selectedItem.description}` : "Select item"}
                                </SelectValue>
                             </SelectTrigger>
                             <SelectContent>
                                <div className="p-2 sticky top-0 bg-popover z-10">
                                   <div className="relative">
                                     <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4 z-10 pointer-events-none" />
                                     <Input 
                                       ref={searchInputRef}
                                       placeholder="Search items..."
                                       value={itemSearch}
                                       onChange={(e) => setItemSearch(e.target.value)}
                                       onKeyDown={(e) => {
                                         if (['ArrowUp', 'ArrowDown', 'Enter', 'Escape'].includes(e.key)) {
                                           return;
                                         }
                                         e.stopPropagation();
                                       }}
                                       onClick={(e) => e.stopPropagation()}
                                       onMouseDown={(e) => e.stopPropagation()}
                                       className="pl-8 h-8 text-xs"
                                     />
                                   </div>
                                </div>
                                <div className="max-h-[200px] overflow-y-auto">
                                  {filteredItems.length > 0 ? (
                                     filteredItems.map((item) => (
                                       <SelectItem key={item.id} value={item.id} className="text-left w-full">
                                           <div className="flex justify-between items-center w-full gap-4">
                                             <span>{item.code} - {item.description}</span>
                                             <span className="text-xs text-muted-foreground whitespace-nowrap">
                                                 Stock: {item.variants && item.variants.length > 0 ? item.variants.reduce((sum: number, v: any) => sum + (stockMap[v.id] || 0), 0) : (stockMap[item.id] || 0)}
                                             </span>
                                           </div>
                                       </SelectItem>
                                     ))
                                  ) : (
                                     <div className="px-2 py-4 text-sm text-muted-foreground text-center">
                                       No items found
                                     </div>
                                  )}
                                </div>
                             </SelectContent>
                          </Select>
                          {form.formState.errors.items?.[index]?.itemId && 
                            <p className="text-xs text-red-500">{form.formState.errors.items[index]?.itemId?.message}</p>
                          }
                        </TableCell>
                        <TableCell>
                           <Input 
                              readOnly
                              className="bg-muted"
                              {...form.register(`items.${index}.description`)}
                           />
                        </TableCell>
                        <TableCell>
                           <div className="text-sm font-medium text-right pr-4">
                              {stockMap[form.getValues(`items.${index}.variantId`) || form.getValues(`items.${index}.itemId`)] || 0}
                           </div>
                        </TableCell>
                        <TableCell>
                          <Input 
                            type="number" 
                            step="1" 
                            min="1"
                            className="text-center"
                            {...form.register(`items.${index}.quantity`, { valueAsNumber: true })} 
                          />
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm pr-4 align-middle">
                          {formatCurrency(rate)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm font-semibold pr-4 align-middle">
                          {formatCurrency(amount)}
                        </TableCell>
                        <TableCell>
                          <Button type="button" variant="ghost" size="sm" onClick={() => remove(index)}>
                             <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    )})}
                  </TableBody>
                  <tfoot>
                    <tr className="border-t bg-muted/20 font-semibold text-sm">
                      <td className="px-4 py-2 align-middle">Total</td>
                      <td className="px-4 py-2"></td>
                      <td className="px-4 py-2"></td>
                      <td className="px-4 py-2 text-right align-middle font-bold text-primary">
                        {totalQuantity.toFixed(2)}
                      </td>
                      <td className="px-4 py-2"></td>
                      <td className="px-4 py-2 text-right align-middle font-bold text-primary font-mono pr-4">
                        {formatCurrency(grandTotal)}
                      </td>
                      <td className="px-4 py-2"></td>
                    </tr>
                  </tfoot>
                </Table>
                {form.formState.errors.items?.root && (
                  <div className="p-2 text-center">
                    <p className="text-sm text-red-500">{form.formState.errors.items.root.message}</p>
                  </div>
                )}
             </div>
        </Card>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 border rounded-lg bg-muted/10 mt-4">
        <div>
          <p className="text-xs text-muted-foreground">Total Items</p>
          <p className="text-lg font-bold text-primary">{totalItems}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Total Quantity to Transfer</p>
          <p className="text-lg font-bold text-primary">{totalQuantity.toFixed(2)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Total Estimated Value</p>
          <p className="text-lg font-bold text-primary">{formatCurrency(grandTotal)}</p>
        </div>
      </div>

      <div className="flex justify-end gap-2">
         <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
         <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Creating..." : "Create TPN"}
         </Button>
      </div>
    </form>

      <Dialog open={skuModalOpen} onOpenChange={(open) => {
        if (!open) {
          setSkuModalOpen(false);
          if (skuModalIndex !== null && !form.getValues(`items.${skuModalIndex}.variantId`)) {
            form.setValue(`items.${skuModalIndex}.itemId`, "");
          }
        }
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Select SKUs/Variants</DialogTitle>
            <DialogDescription>
              Choose the specific SKUs for <strong>{skuModalItem?.code} - {skuModalItem?.description}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {skuLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : skuVariants.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No variants/SKUs found for this product.
              </div>
            ) : (
              <div className="max-h-[350px] overflow-y-auto border rounded-md">
                <table className="w-full text-sm">
                  <thead className="bg-muted sticky top-0">
                    <tr>
                      <th className="w-24 px-4 py-2 text-left">
                        <div className="flex items-center gap-2">
                          <Checkbox
                            checked={
                              skuVariants.length > 0 && 
                              skuVariants.every(v => otherSelectedVariants.has(v.id) || !!selectedVariants[v.id])
                            }
                            onCheckedChange={(checked) => {
                              const newSelected: Record<string, boolean> = {};
                              if (checked) {
                                skuVariants.forEach(v => {
                                  if (!otherSelectedVariants.has(v.id)) {
                                    newSelected[v.id] = true;
                                  }
                                });
                              }
                              setSelectedVariants(newSelected);
                            }}
                          />
                          <span>All</span>
                        </div>
                      </th>
                      <th className="px-4 py-2 text-left">SKU</th>
                      <th className="px-4 py-2 text-left">Size</th>
                      <th className="px-4 py-2 text-left">Color</th>
                      <th className="px-4 py-2 text-right">Stock</th>
                    </tr>
                  </thead>
                  <tbody>
                    {skuVariants.map((variant) => {
                      const isAlreadySelected = otherSelectedVariants.has(variant.id);
                      return (
                        <tr key={variant.id} className={cn("border-t hover:bg-muted/50", isAlreadySelected && "opacity-50 bg-muted/20")}>
                          <td className="px-4 py-2">
                            <Checkbox
                              checked={isAlreadySelected ? true : !!selectedVariants[variant.id]}
                              disabled={isAlreadySelected || skuLoading}
                              onCheckedChange={(checked) => {
                                setSelectedVariants(prev => ({
                                  ...prev,
                                  [variant.id]: !!checked
                                }));
                              }}
                            />
                          </td>
                          <td className="px-4 py-2 font-mono text-xs">{variant.sku}</td>
                          <td className="px-4 py-2">{variant.size || "-"}</td>
                          <td className="px-4 py-2">{variant.color || "-"}</td>
                          <td className="px-4 py-2 text-right font-medium">
                            <div className="flex items-center justify-end gap-1">
                              <span>{stockMap[variant.id] ?? 0}</span>
                              {isAlreadySelected && (
                                <Badge variant="secondary" className="ml-2 text-[10px]">Added</Badge>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setSkuModalOpen(false);
                if (skuModalIndex !== null && !form.getValues(`items.${skuModalIndex}.variantId`)) {
                  form.setValue(`items.${skuModalIndex}.itemId`, "");
                }
              }}
            >
              Cancel
            </Button>
            <Button type="button" onClick={handleSkuConfirm} disabled={skuLoading || Object.values(selectedVariants).filter(Boolean).length === 0}>
              Confirm Selection
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
