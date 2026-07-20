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
import { createDamage } from "../../_actions/damage.action";
import { getStock, getWarehouseStocks } from "../../../stock/_actions/stock.action";
import { getItemVariants } from "../../../../master/items/_actions/item.action";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";

const damageSchema = z.object({
  warehouseId: z.string().min(1, "Warehouse is required"),
  date: z.string().refine((val) => !isNaN(Date.parse(val)), "Invalid date"),
  notes: z.string().optional(),
  items: z.array(z.object({
    itemId: z.string().min(1, "Item is required"),
    variantId: z.string().optional().nullable(),
    quantity: z.number().min(0.01, "Quantity must be greater than zero"),
    unitRate: z.number().min(0, "Rate must be positive"),
    description: z.string().optional(),
    amount: z.number().optional()
  })).min(1, "At least one item is required"),
});

type DamageFormValues = z.infer<typeof damageSchema>;

interface DamageFormProps {
  warehouses: any[];
  items: any[]; 
  userContext?: {
    isNormalUser: boolean;
    defaultWarehouseId: string | null;
  };
  initialData?: any;
}

export default function DamageForm({ warehouses, items, userContext, initialData }: DamageFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  
  const [stockMap, setStockMap] = useState<Record<string, number>>({});
  const [itemSearch, setItemSearch] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [skuModalOpen, setSkuModalOpen] = useState(false);
  const [skuModalItem, setSkuModalItem] = useState<{ id: string; description: string; code: string } | null>(null);
  const [skuModalIndex, setSkuModalIndex] = useState<number | null>(null);
  const [skuVariants, setSkuVariants] = useState<any[]>([]);
  const [skuLoading, setSkuLoading] = useState(false);
  const [selectedVariants, setSelectedVariants] = useState<Record<string, boolean>>({});

  const form = useForm<DamageFormValues>({
    resolver: zodResolver(damageSchema),
    defaultValues: {
      warehouseId: initialData?.warehouseId || userContext?.defaultWarehouseId || (warehouses.length > 0 ? warehouses[0].id : ""),
      date: initialData?.date ? new Date(initialData.date).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
      notes: initialData?.notes || "",
      items: initialData?.items?.length > 0 
        ? initialData.items.map((i: any) => ({
            itemId: i.itemId,
            variantId: i.variantId || null,
            quantity: Number(i.quantity),
            unitRate: Number(i.unitRate),
            description: i.description || "",
            amount: Number(i.amount)
          }))
        : [{ itemId: "", variantId: null, quantity: 0, unitRate: 0, description: "", amount: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const warehouseId = useWatch({
    control: form.control,
    name: "warehouseId",
  });

  const watchedItems = useWatch({
    control: form.control,
    name: "items",
  }) || [];

  const totalItems = watchedItems.filter((item: any) => !!item?.itemId && (Number(item?.quantity) || 0) > 0).length;
  const totalQuantity = watchedItems.reduce((sum: number, item: any) => sum + (Number(item?.quantity) || 0), 0);
  const totalLoss = watchedItems.reduce((sum: number, item: any) => sum + ((Number(item?.quantity) || 0) * (Number(item?.unitRate) || 0)), 0);

  const filteredItems = useMemo(() => {
    if (!itemSearch) return items;
    const searchLower = itemSearch.toLowerCase();
    return items.filter(
      (item) =>
        item.name?.toLowerCase().includes(searchLower) ||
        item.code?.toLowerCase().includes(searchLower) ||
        (item.barcode && item.barcode.toLowerCase().includes(searchLower)) ||
        item.variants?.some((v: any) => 
          (v.sku && v.sku.toLowerCase().includes(searchLower)) ||
          (v.barcode && v.barcode.toLowerCase().includes(searchLower))
        )
    );
  }, [items, itemSearch]);

  useEffect(() => {
    const subscription = form.watch((value, { name, type }) => {
      if (name?.includes('quantity') || name?.includes('unitRate')) {
         const index = parseInt(name.split('.')[1]);
         if (!isNaN(index)) {
            const qty = value.items?.[index]?.quantity || 0;
            const rate = value.items?.[index]?.unitRate || 0;
            const amount = Math.abs(Number(qty) * Number(rate));
            form.setValue(`items.${index}.amount`, Number(amount.toFixed(2)));
         }
      }
    });
    return () => subscription.unsubscribe();
  }, [form]);

  useEffect(() => {
     if (!warehouseId) return;
     const fetchAllStocks = async () => {
        const res = await getWarehouseStocks(warehouseId);
        if (res.success && res.stocks) {
           const map: Record<string, number> = {};
           res.stocks.forEach(s => {
             if (s.variantId) {
               map[s.variantId] = s.quantity;
             } else if (s.itemId) {
               map[s.itemId] = s.quantity;
             }
           });
           setStockMap(map);
        }
     };
     fetchAllStocks();
  }, [warehouseId]); 

  const handleSkuConfirm = () => {
    if (skuModalIndex === null || !skuModalItem) return;

    const selectedIds = Object.keys(selectedVariants)
      .filter((id) => selectedVariants[id])
      .sort((a, b) => {
        const indexA = skuVariants.findIndex(v => v.id === a);
        const indexB = skuVariants.findIndex(v => v.id === b);
        return indexA - indexB;
      });
    if (selectedIds.length === 0) return;

    const firstVariantId = selectedIds[0];
    const firstVariant = skuVariants.find((v) => v.id === firstVariantId);
    
    if (firstVariant) {
      const description = `${firstVariant.sku}${firstVariant.size ? `, ${firstVariant.size}` : ''}${firstVariant.color ? `, ${firstVariant.color}` : ''}`;
      const costPrice = firstVariant.costPrice ? Number(firstVariant.costPrice) : 0;
      form.setValue(`items.${skuModalIndex}.itemId`, skuModalItem.id);
      form.setValue(`items.${skuModalIndex}.variantId`, firstVariantId);
      form.setValue(`items.${skuModalIndex}.description`, description);
      form.setValue(`items.${skuModalIndex}.unitRate`, costPrice);
    }

    for (let i = 1; i < selectedIds.length; i++) {
      const variantId = selectedIds[i];
      const variant = skuVariants.find((v) => v.id === variantId);
      if (variant) {
        const description = `${variant.sku}${variant.size ? `, ${variant.size}` : ''}${variant.color ? `, ${variant.color}` : ''}`;
        const costPrice = variant.costPrice ? Number(variant.costPrice) : 0;
        append({
          itemId: skuModalItem.id,
          variantId: variantId,
          description: description,
          quantity: 0,
          unitRate: costPrice,
          amount: 0,
        });
      }
    }

    setSkuModalOpen(false);
    setSkuModalItem(null);
    setSkuModalIndex(null);
    setSelectedVariants({});
    setSkuVariants([]);
  };

  const onSubmit = async (values: DamageFormValues) => {
    setIsSubmitting(true);
    try {
      const payload = {
         warehouseId: values.warehouseId,
         date: new Date(values.date),
         notes: values.notes,
         items: values.items.map(i => ({
             itemId: i.itemId,
             variantId: i.variantId || null,
             quantity: i.quantity,
             unitRate: i.unitRate
         })),
      };

      let res;
      if (initialData?.id) {
        const { updateDamage } = await import("../../_actions/damage.action");
        res = await updateDamage(initialData.id, payload);
      } else {
        res = await createDamage(payload);
      }
      
      if (res.success) {
        toast({ title: "Success", description: `Damage record ${initialData ? 'updated' : 'created'} successfully` });
        router.push("/dashboard/inventory/damage");
      } else {
        toast({
          title: "Error",
          description: res.error || "Failed to save damage",
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
    form.setValue(`items.${index}.itemId`, itemId);
    const selectedItem = items.find(i => i.id === itemId);
    if (selectedItem) {
       if (selectedItem.itemType === "RETAIL" || selectedItem.itemType === "READY_PRODUCT") {
           const query = itemSearch.trim().toLowerCase();
           const matchedVariant = selectedItem.variants?.find(
             (v: any) => (v.sku && v.sku.toLowerCase() === query) || (v.barcode && v.barcode.toLowerCase() === query)
           );

           if (matchedVariant) {
             // Direct add the matched variant, bypass modal completely!
             const description = `${matchedVariant.sku}${matchedVariant.size ? `, ${matchedVariant.size}` : ''}${matchedVariant.color ? `, ${matchedVariant.color}` : ''}`;
             const costPrice = matchedVariant.costPrice ? Number(matchedVariant.costPrice) : 0;
             form.setValue(`items.${index}.variantId`, matchedVariant.id);
             form.setValue(`items.${index}.description`, description);
             form.setValue(`items.${index}.unitRate`, costPrice);
             
             const qty = form.getValues(`items.${index}.quantity`) || 0;
             form.setValue(`items.${index}.amount`, Number(Math.abs(qty * costPrice).toFixed(2)));

             const currentWarehouseId = form.getValues("warehouseId");
             if (currentWarehouseId) {
                const res = await getStock(itemId, currentWarehouseId);
                if (res.success && res.stock) {
                   setStockMap(prev => ({ ...prev, [itemId]: Number(res.stock.quantity) }));
                } else {
                   setStockMap(prev => ({ ...prev, [itemId]: 0 }));
                }
             }
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

                 form.setValue(`items.${index}.variantId`, null);
                 form.setValue(`items.${index}.unitRate`, Number(selectedItem.costPrice || 0));
                 form.setValue(`items.${index}.description`, selectedItem.description || selectedItem.name || "");
                 
                 const qty = form.getValues(`items.${index}.quantity`) || 0;
                 const rate = Number(selectedItem.costPrice || 0);
                 form.setValue(`items.${index}.amount`, Number(Math.abs(qty * rate).toFixed(2)));

                 const currentWarehouseId = form.getValues("warehouseId");
                 if (currentWarehouseId) {
                    const res = await getStock(itemId, currentWarehouseId);
                    if (res.success && res.stock) {
                       setStockMap(prev => ({ ...prev, [itemId]: Number(res.stock.quantity) }));
                    } else {
                       setStockMap(prev => ({ ...prev, [itemId]: 0 }));
                    }
                 }
             }
           }
       } else {
           form.setValue(`items.${index}.variantId`, null);
           form.setValue(`items.${index}.unitRate`, Number(selectedItem.costPrice || 0));
           form.setValue(`items.${index}.description`, selectedItem.description || selectedItem.name || "");
           
           const qty = form.getValues(`items.${index}.quantity`) || 0;
           const rate = Number(selectedItem.costPrice || 0);
           form.setValue(`items.${index}.amount`, Number(Math.abs(qty * rate).toFixed(2)));

           const currentWarehouseId = form.getValues("warehouseId");
           if (currentWarehouseId) {
              const res = await getStock(itemId, currentWarehouseId);
              if (res.success && res.stock) {
                 setStockMap(prev => ({ ...prev, [itemId]: Number(res.stock.quantity) }));
              } else {
                 setStockMap(prev => ({ ...prev, [itemId]: 0 }));
              }
           }
       }
       setItemSearch("");
    }
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      <Card>
        <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Warehouse</Label>
            <Select 
              onValueChange={(val) => form.setValue("warehouseId", val)} 
              defaultValue={form.getValues("warehouseId")}
              disabled={userContext?.isNormalUser}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select Warehouse" />
              </SelectTrigger>
              <SelectContent>
                {warehouses.map(w => (
                  <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.warehouseId && <p className="text-sm text-red-500">{form.formState.errors.warehouseId.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>Date</Label>
            <Input type="date" {...form.register("date")} />
          </div>

          <div className="col-span-1 md:col-span-2 space-y-2">
            <Label>Notes</Label>
            <Textarea {...form.register("notes")} placeholder="Reason for damage..." />
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">Damaged Items</h3>
            <Button type="button" variant="outline" size="sm" onClick={() => append({ itemId: "", variantId: null, quantity: 0, unitRate: 0, description: "", amount: 0 })}>
              <Plus className="mr-2 h-4 w-4" /> Add Item
            </Button>
        </div>

        <Card>
            <div className="p-0">
               <Table>
                 <TableHeader>
                   <TableRow className="bg-muted/50">
                     <TableHead className="w-[20%]">Item</TableHead>
                     <TableHead className="w-[20%]">Description</TableHead>
                     <TableHead className="w-[10%]">Stock</TableHead>
                     <TableHead className="w-[15%]">Qty Lost</TableHead>
                     <TableHead className="w-[15%]">Cost Price</TableHead>
                     <TableHead className="w-[15%]">Total Loss</TableHead>
                     <TableHead className="w-[50px]"></TableHead>
                   </TableRow>
                 </TableHeader>
                 <TableBody>
                   {fields.map((field, index) => {
                     const selectedItem = items.find(i => i.id === form.getValues(`items.${index}.itemId`));
                     
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
                                  {selectedItem ? `${selectedItem.name} (${selectedItem.code})` : "Select item"}
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
                                            <span>{item.name} ({item.code})</span>
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
                          <div className="text-sm font-medium text-blue-600">
                             {stockMap[form.getValues(`items.${index}.variantId`) || form.getValues(`items.${index}.itemId`)] || 0}
                          </div>
                       </TableCell>
                       <TableCell>
                         <Input 
                           type="number" 
                           step="0.01" 
                           min="0"
                           className="text-center"
                           placeholder="Qty"
                           {...form.register(`items.${index}.quantity`, { valueAsNumber: true })} 
                         />
                       </TableCell>
                       <TableCell>
                          <Input 
                            readOnly
                            type="number" 
                            step="0.01" 
                            min="0"
                             className="text-right bg-muted"
                            {...form.register(`items.${index}.unitRate`, { valueAsNumber: true })} 
                          />
                       </TableCell>
                       <TableCell>
                          <Input 
                              readOnly
                              className="bg-muted text-right font-medium text-red-600"
                              value={form.watch(`items.${index}.amount`) || 0}
                          />
                       </TableCell>
                       <TableCell>
                         <Button type="button" variant="ghost" size="sm" onClick={() => remove(index)}>
                            <Trash2 className="h-4 w-4 text-red-500" />
                         </Button>
                       </TableCell>
                     </TableRow>
                   )})}
                 </TableBody>
               </Table>
            </div>
        </Card>
      </div>

      {/* Summaries Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-muted/50">
          <CardContent className="pt-6">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Total Items</p>
              <p className="text-2xl font-bold">{totalItems}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-muted/50">
          <CardContent className="pt-6">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Total Quantity Lost</p>
              <p className="text-2xl font-bold">{totalQuantity.toFixed(2)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-destructive/5 border-destructive/20">
          <CardContent className="pt-6">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Total Estimated Loss</p>
              <p className="text-2xl font-bold text-destructive">
                ৳{totalLoss.toLocaleString("en-BD", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end gap-2">
         <Button type="button" variant="outline" onClick={() => router.back()} disabled={isSubmitting}>
           Cancel
         </Button>
         <Button type="submit" disabled={isSubmitting}>
           {isSubmitting ? "Saving..." : initialData ? "Update Damage" : "Save Damage"}
         </Button>
      </div>

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
            <DialogTitle>Select SKUs/Variants for Damage</DialogTitle>
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
                <Table className="w-full text-sm">
                  <TableHeader className="bg-muted sticky top-0">
                    <TableRow>
                      <TableHead className="w-24 px-4 py-2 text-left">
                        <div className="flex items-center gap-2">
                          <Checkbox
                            checked={skuVariants.length > 0 && skuVariants.every(v => !!selectedVariants[v.id])}
                            onCheckedChange={(checked) => {
                              const newSelected: Record<string, boolean> = {};
                              if (checked) {
                                skuVariants.forEach(v => {
                                  newSelected[v.id] = true;
                                });
                              }
                              setSelectedVariants(newSelected);
                            }}
                          />
                          <span>All</span>
                        </div>
                      </TableHead>
                      <TableHead className="px-4 py-2 text-left">SKU</TableHead>
                      <TableHead className="px-4 py-2 text-left">Size</TableHead>
                      <TableHead className="px-4 py-2 text-left">Color</TableHead>
                      <TableHead className="px-4 py-2 text-right">Stock</TableHead>
                      <TableHead className="px-4 py-2 text-right">Cost Price</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {skuVariants.map((variant) => (
                      <TableRow key={variant.id} className="border-t hover:bg-muted/50">
                        <TableCell className="px-4 py-2">
                          <Checkbox
                            checked={!!selectedVariants[variant.id]}
                            onCheckedChange={(checked) => {
                              setSelectedVariants(prev => ({
                                ...prev,
                                [variant.id]: !!checked
                              }));
                            }}
                          />
                        </TableCell>
                        <TableCell className="px-4 py-2 font-mono text-xs">{variant.sku}</TableCell>
                        <TableCell className="px-4 py-2">{variant.size || "-"}</TableCell>
                        <TableCell className="px-4 py-2">{variant.color || "-"}</TableCell>
                        <TableCell className="px-4 py-2 text-right font-medium text-blue-600">
                          {stockMap[variant.id] ?? 0}
                        </TableCell>
                        <TableCell className="px-4 py-2 text-right">
                          {variant.costPrice !== null ? `৳${Number(variant.costPrice).toFixed(2)}` : "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
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
            <Button
              type="button"
              onClick={handleSkuConfirm}
              disabled={skuLoading || Object.keys(selectedVariants).filter(id => selectedVariants[id]).length === 0}
            >
              Confirm Selection
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </form>
  );
}
