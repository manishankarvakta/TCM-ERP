"use client";

import React, { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import SupplierDialog from "@/app/(dashboard)/dashboard/procurements/purchases/_components/supplierDialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { createReturnToVendor } from "../_actions/rtv.action";
import { ReturnToVendorStatus } from "@prisma/client";
import { useToast } from "@/hooks/use-toast";
import { FiTrash2, FiPlus, FiSearch, FiAlertCircle } from "react-icons/fi";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { getItemVariants } from "@/app/(dashboard)/dashboard/master/items/_actions/item.action";
import { getWarehouseStocks } from "@/app/(dashboard)/dashboard/inventory/stock/_actions/stock.action";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

const rtvItemSchema = z.object({
  itemId: z.string().min(1, "Item is required"),
  variantId: z.string().optional().nullable(),
  purchaseItemId: z.string().optional().nullable(),
  description: z.string().optional(),
  availableQuantity: z.coerce.number().optional(),
  quantity: z.coerce.number().positive("Quantity must be greater than 0"),
  unitPrice: z.coerce.number().min(0, "Unit price must be 0 or greater"),
  amount: z.coerce.number().min(0, "Amount must be 0 or greater"),
  reason: z.string().optional().nullable(),
});

const rtvFormSchema = z.object({
  supplierId: z.string().min(1, "Supplier is required"),
  warehouseId: z.string().min(1, "Warehouse is required"),
  purchaseId: z.string().optional().nullable(),
  date: z.coerce.date(),
  status: z.nativeEnum(ReturnToVendorStatus),
  notes: z.string().optional().nullable(),
  tax: z.coerce.number().min(0).optional().nullable(),
  items: z.array(rtvItemSchema).min(1, "At least one item is required"),
});

type RTVFormData = z.infer<typeof rtvFormSchema>;

export default function RTVForm({ suppliers, warehouses, items, purchase }: any) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [supplierSearch, setSupplierSearch] = useState("");
  const [localSuppliers, setLocalSuppliers] = useState(suppliers);
  const [isSupplierDialogOpen, setIsSupplierDialogOpen] = useState(false);

  useEffect(() => {
    setLocalSuppliers(suppliers);
  }, [suppliers]);

  const filteredSuppliers = useMemo(() => {
    if (!supplierSearch) return localSuppliers;
    const searchLower = supplierSearch.toLowerCase();
    return localSuppliers.filter(
      (s: any) =>
        s.name?.toLowerCase().includes(searchLower) ||
        s.email?.toLowerCase().includes(searchLower) ||
        s.company?.toLowerCase().includes(searchLower) ||
        (s.supplierCode?.toLowerCase().includes(searchLower) || false)
    );
  }, [localSuppliers, supplierSearch]);

  const [stockMap, setStockMap] = useState<Record<string, number>>({});
  const [skuModalOpen, setSkuModalOpen] = useState(false);
  const [skuModalItem, setSkuModalItem] = useState<{ id: string; description: string; code: string } | null>(null);
  const [skuModalIndex, setSkuModalIndex] = useState<number | null>(null);
  const [skuVariants, setSkuVariants] = useState<any[]>([]);
  const [selectedVariants, setSelectedVariants] = useState<Record<string, boolean>>({});
  const [skuLoading, setSkuLoading] = useState(false);


  const [itemSearch, setItemSearch] = useState("");

  const defaultDate = new Date();

  const defaultItems = purchase?.items?.map((item: any) => ({
    itemId: item.itemId,
    variantId: item.variantId || "",
    description: item.item.name,
    availableQuantity: item.quantity - (item.returnedQuantity || 0),
    quantity: 0,
    unitPrice: item.unitPrice,
    amount: 0,
    reason: "",
  })) || [{ itemId: "", variantId: "", description: "", availableQuantity: 0, quantity: 1, unitPrice: 0, amount: 0, reason: "" }];

  const {
    register,
    control,
    handleSubmit,
    setValue,
    getValues,
    watch,
    formState: { errors },
  } = useForm<RTVFormData>({
    resolver: zodResolver(rtvFormSchema) as any,
    defaultValues: {
      supplierId: purchase?.supplier?.id || "",
      warehouseId: purchase?.warehouse?.id || warehouses[0]?.id || "",
      purchaseId: purchase?.id || "",
      date: defaultDate,
      status: "DRAFT",
      notes: purchase ? `Return for Purchase #${purchase.purchaseNumber}` : "",
      tax: 0,
      items: defaultItems,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "items",
  });

  const watchedItems = watch("items") || [];
  const otherSelectedVariants = useMemo(() => {
    if (skuModalIndex === null) return new Set<string>();
    const items = getValues("items") || [];
    const set = new Set<string>();
    items.forEach((item, idx) => {
      if (idx !== skuModalIndex && item.variantId) {
        set.add(item.variantId);
      }
    });
    return set;
  }, [skuModalIndex, watchedItems]);
  const watchedTax = watch("tax");
  const watchedWarehouseId = watch("warehouseId");

  // Fetch ALL stocks for warehouse when warehouse changes
  useEffect(() => {
     if (!watchedWarehouseId) return;
     
     const fetchAllStocks = async () => {
        const res = await getWarehouseStocks(watchedWarehouseId);
        if (res.success && res.stocks) {
           const map: Record<string, number> = {};
           res.stocks.forEach((s: any) => {
             if (s.itemId) map[s.itemId] = s.quantity;
             if (s.variantId) map[s.variantId] = s.quantity;
           });
           setStockMap(map);
        }
     };
     
     fetchAllStocks();
  }, [watchedWarehouseId]);

  const subTotal = watchedItems.reduce((acc, item) => {
    const qty = Number(item.quantity) || 0;
    const price = Number(item.unitPrice) || 0;
    return acc + (qty * price);
  }, 0);
  
  const grandTotal = subTotal + (Number(watchedTax) || 0);

  const totalItems = watchedItems.filter((item: any) => !!item.itemId && (Number(item.quantity) || 0) > 0).length;
  const totalQuantity = watchedItems.reduce((sum: number, item: any) => sum + (Number(item.quantity) || 0), 0);

  const itemsCalcKey = useMemo(() => {
    return watchedItems.map((item, idx) => `${idx}:${item.quantity}:${item.unitPrice}`).join('|');
  }, [watchedItems]);

  // Recalculate amount values for form submission and UI
  React.useEffect(() => {
    const currentItems = getValues("items") || [];
    currentItems.forEach((item, index) => {
      const qty = Number(item.quantity) || 0;
      const price = Number(item.unitPrice) || 0;
      const amount = qty * price;
      if (Math.abs((Number(item.amount) || 0) - amount) > 0.001) {
        setValue(`items.${index}.amount`, amount, { shouldValidate: false, shouldDirty: true });
      }
    });
  }, [itemsCalcKey, getValues, setValue]);

  const handleSkuConfirm = () => {
    if (skuModalIndex === null || !skuModalItem) return;

    const selectedVariantIds = Object.keys(selectedVariants)
      .filter(id => selectedVariants[id])
      .sort((a, b) => {
        const indexA = skuVariants.findIndex(v => v.id === a);
        const indexB = skuVariants.findIndex(v => v.id === b);
        return indexA - indexB;
      });
    if (selectedVariantIds.length === 0) return;

    // The first selected variant updates the current row
    const firstVariantId = selectedVariantIds[0];
    const firstVariant = skuVariants.find(v => v.id === firstVariantId);
    
    if (firstVariant) {
      const description = `${firstVariant.sku}${firstVariant.size ? `, ${firstVariant.size}` : ''}${firstVariant.color ? `, ${firstVariant.color}` : ''}`;
      
      setValue(`items.${skuModalIndex}.itemId`, skuModalItem.id);
      setValue(`items.${skuModalIndex}.variantId`, firstVariantId);
      setValue(`items.${skuModalIndex}.description`, description);
      setValue(`items.${skuModalIndex}.unitPrice`, firstVariant.costPrice || 0);
      
      const currentQuantity = Number(getValues(`items.${skuModalIndex}.quantity`) || 0);
      const unitPrice = firstVariant.costPrice || 0;
      setValue(`items.${skuModalIndex}.amount`, currentQuantity * unitPrice);
    }

    // Additional selected variants are appended as new rows
    if (selectedVariantIds.length > 1) {
      const additionalVariants = selectedVariantIds.slice(1)
        .map(id => skuVariants.find(v => v.id === id))
        .filter((v): v is NonNullable<typeof v> => !!v);

      additionalVariants.forEach(variant => {
        const description = `${variant.sku}${variant.size ? `, ${variant.size}` : ''}${variant.color ? `, ${variant.color}` : ''}`;
        append({
          itemId: skuModalItem.id,
          variantId: variant.id,
          description: description,
          quantity: 1,
          unitPrice: variant.costPrice || 0,
          amount: (variant.costPrice || 0) * 1,
          reason: "",
        });
      });
    }

    setSkuModalOpen(false);
    setItemSearch("");
  };

  const onSubmit = async (data: RTVFormData, status: ReturnToVendorStatus) => {
    try {
      setLoading(true);
      setError("");

      const validItems = data.items.filter(item => item.itemId && item.quantity > 0).map(item => ({
        itemId: item.itemId,
        variantId: item.variantId || null,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        amount: item.amount,
        reason: item.reason,
      }));

      if (validItems.length === 0) {
        throw new Error("Please add at least one item with a valid quantity to return.");
      }

      if (purchase) {
        for (const item of validItems) {
          const original = data.items.find(i => i.itemId === item.itemId);
          if (original && original.availableQuantity !== undefined && item.quantity > original.availableQuantity) {
             throw new Error(`Cannot return more than available for item. Maximum allowed is ${original.availableQuantity}.`);
          }
        }
      }

      const payload = {
        ...data,
        status,
        items: validItems,
      };

      const result = await createReturnToVendor(payload);

      if (result.success) {
        toast({ title: "Success", description: "RTV created successfully" });
        router.push("/dashboard/procurements/rtv");
      } else {
        throw new Error(result.error || "Failed to create return");
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
    <Card className="w-full shadow-sm">
      <CardHeader>
        <CardTitle>{purchase ? "Return Items from Purchase" : "Standalone Return to Vendor"}</CardTitle>
        <CardDescription>
          {purchase ? `Returning items from Purchase Order #${purchase.purchaseNumber}` : "Create a direct return without a purchase reference"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-6">
          {error && (
            <div className="flex items-start gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive border border-destructive/20">
              <FiAlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="supplierId">Supplier *</Label>
                <Dialog open={isSupplierDialogOpen} onOpenChange={setIsSupplierDialogOpen}>
                  <DialogTrigger asChild>
                    <Button type="button" variant="link" size="sm" className="h-auto p-0 text-xs text-blue-600 hover:text-blue-700" disabled={loading || !!purchase}>
                      + Add Supplier
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                      <DialogTitle>Create New Supplier</DialogTitle>
                      <DialogDescription>
                        Fill in the details below. The supplier will be available instantly.
                      </DialogDescription>
                    </DialogHeader>
                    <SupplierDialog
                      onCancel={() => setIsSupplierDialogOpen(false)}
                      onCreated={(newSupplier: any) => {
                        setLocalSuppliers((prev: any) => [newSupplier, ...prev]);
                        setValue("supplierId", newSupplier.id, { shouldValidate: true, shouldDirty: true });
                        setIsSupplierDialogOpen(false);
                      }}
                    />
                  </DialogContent>
                </Dialog>
              </div>
              <Controller
                name="supplierId"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={loading || !!purchase}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select supplier" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                      <div className="p-2">
                        <div className="relative">
                          <FiSearch className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 z-10 pointer-events-none" />
                          <Input
                            placeholder="Search Supplier..."
                            value={supplierSearch}
                            onChange={(e) => {
                              setSupplierSearch(e.target.value);
                            }}
                            onKeyDown={(e) => {
                              e.stopPropagation();
                              if (e.key === "Enter") {
                                  e.preventDefault();
                              }
                            }}
                            className="pl-8 h-8 text-xs"
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                      </div>
                      <div className="max-h-[200px] overflow-y-auto">
                        {filteredSuppliers.map((s: any) => (
                          <SelectItem key={s.id} value={s.id} className="text-left">
                            {s.supplierCode || "N/A"} - {s.name || s.email}
                            {s.company && (
                              <span className="block text-xs text-muted-foreground">
                                {s.company}
                              </span>
                            )}
                          </SelectItem>
                        ))}
                      </div>
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.supplierId && <p className="text-sm text-destructive">{errors.supplierId.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="warehouseId">Warehouse *</Label>
              <Controller
                name="warehouseId"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value || ""}
                    onValueChange={field.onChange}
                    disabled={loading || !!purchase}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select warehouse" />
                    </SelectTrigger>
                    <SelectContent>
                       {warehouses.map((w: any) => (
                         <SelectItem key={w.id} value={w.id}>
                           {w.name} ({w.code})
                         </SelectItem>
                       ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.warehouseId && <p className="text-sm text-destructive">{errors.warehouseId.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="date">Date *</Label>
              <Controller
                name="date"
                control={control}
                render={({ field }) => {
                  const dateValue = field.value ? format(new Date(field.value), "yyyy-MM-dd") : format(defaultDate, "yyyy-MM-dd");
                  return (
                    <Input
                      type="date"
                      value={dateValue}
                      onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : new Date())}
                      disabled={loading}
                    />
                  );
                }}
              />
              {errors.date && <p className="text-sm text-destructive">{errors.date.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Input
                placeholder="Reason or notes"
                {...register("notes")}
                disabled={loading}
              />
            </div>
          </div>

          <div className="space-y-3 pt-6">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Items to Return</h3>
              {!purchase && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => append({ itemId: "", variantId: "", description: "", availableQuantity: 0, quantity: 1, unitPrice: 0, amount: 0, reason: "" })}
                >
                  <FiPlus className="mr-2 h-4 w-4" />
                  Add Item
                </Button>
              )}
            </div>

            <div className="border rounded-lg overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted">
                  <TableRow>
                    <TableHead className="w-[300px]">Item</TableHead>
                    <TableHead className="text-right w-32">Return Qty</TableHead>
                    <TableHead className="text-right w-32">Unit Price</TableHead>
                    <TableHead className="text-right w-32">Total Amount</TableHead>
                    <TableHead className="w-48">Reason</TableHead>
                    {!purchase && <TableHead className="w-12"></TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fields.map((field, index) => {
                    const otherSelectedItems = watch("items")
                      .map((item, idx) => idx !== index ? { itemId: item.itemId, variantId: item.variantId } : null)
                      .filter((val): val is { itemId: string; variantId: string | null } => !!val && !!val.itemId);
                    
                    // Filter out already selected items (only if all variants are selected, or it has no variants and is selected)
                    const availableItems = items.filter((item: any) => {
                      const hasVariants = item.variants && item.variants.length > 0;
                      if (!hasVariants) {
                        return !otherSelectedItems.some(osi => osi.itemId === item.id);
                      }
                      const unselectedVariants = item.variants.filter(
                        (v: any) => !otherSelectedItems.some(osi => osi.variantId === v.id)
                      );
                      return unselectedVariants.length > 0;
                    });

                    return (
                      <TableRow key={field.id}>
                        <TableCell className="align-top">
                          {purchase ? (
                            <div className="flex flex-col h-10 justify-center">
                              <span className="font-medium">{watch(`items.${index}.description`)}</span>
                              <span className="text-xs text-muted-foreground">Max available: {watch(`items.${index}.availableQuantity`)}</span>
                            </div>
                          ) : (
                            <Controller
                              name={`items.${index}.itemId`}
                              control={control}
                              render={({ field: itemField }) => {
                                const searchInputRef = React.useRef<HTMLInputElement>(null);
                                
                                return (
                                  <Select
                                    value={itemField.value || ""}
                                    onValueChange={async (value) => {
                                      const selectedItem = items.find((item: any) => item.id === value);
                                      if (selectedItem) {
                                        if (selectedItem.itemType === "RETAIL" || selectedItem.itemType === "READY_PRODUCT") {
                                          const query = itemSearch.trim().toLowerCase();
                                          const matchedVariant = selectedItem.variants?.find(
                                            (v: any) => (v.sku && v.sku.toLowerCase() === query) || (v.barcode && v.barcode.toLowerCase() === query)
                                          );

                                          if (matchedVariant) {
                                            // Direct add the matched variant, bypass modal completely!
                                            const desc = `${matchedVariant.sku}${matchedVariant.size ? `, ${matchedVariant.size}` : ''}${matchedVariant.color ? `, ${matchedVariant.color}` : ''}`;
                                            itemField.onChange(value);
                                            setValue(`items.${index}.variantId`, matchedVariant.id);
                                            setValue(`items.${index}.description`, desc);
                                            setValue(`items.${index}.unitPrice`, matchedVariant.costPrice || selectedItem.unitPrice);
                                            
                                            const currentQuantity = Number(getValues(`items.${index}.quantity`) || 0);
                                            const price = matchedVariant.costPrice || selectedItem.unitPrice;
                                            setValue(`items.${index}.amount`, currentQuantity * price);
                                          } else {
                                            // No direct variant match. Fetch variants asynchronously first
                                            setSkuLoading(true);
                                            const res = await getItemVariants(selectedItem.id);
                                            if (res.success && res.variants && res.variants.length > 0) {
                                              // Open modal only now, preventing any blinking
                                              setSkuVariants(res.variants);
                                              setSkuModalItem({
                                                id: selectedItem.id,
                                                description: selectedItem.description,
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

                                              itemField.onChange(value);
                                              setValue(`items.${index}.variantId`, null);
                                              setValue(`items.${index}.description`, selectedItem.description);
                                              setValue(`items.${index}.unitPrice`, selectedItem.unitPrice);
                                              
                                              const currentQuantity = Number(getValues(`items.${index}.quantity`) || 0);
                                              setValue(`items.${index}.amount`, currentQuantity * selectedItem.unitPrice);
                                            }
                                          }
                                        } else {
                                          itemField.onChange(value);
                                          setValue(`items.${index}.variantId`, null);
                                          setValue(`items.${index}.description`, selectedItem.description);
                                          setValue(`items.${index}.unitPrice`, selectedItem.unitPrice);
                                          
                                          const currentQuantity = Number(getValues(`items.${index}.quantity`) || 0);
                                          setValue(`items.${index}.amount`, currentQuantity * selectedItem.unitPrice);
                                        }
                                        setItemSearch("");
                                      }
                                    }}
                                    onOpenChange={(open) => {
                                      if (open) setTimeout(() => searchInputRef.current?.focus(), 0);
                                      else setItemSearch("");
                                    }}
                                    disabled={loading}
                                  >
                                    <SelectTrigger className="text-left w-full">
                                      <SelectValue placeholder="Select item">
                                        {watch(`items.${index}.description`) ? watch(`items.${index}.description`) : "Select item"}
                                      </SelectValue>
                                    </SelectTrigger>
                                    <SelectContent className="max-h-[300px]">
                                      <div className="p-2">
                                        <div className="relative">
                                          <FiSearch className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 z-10 pointer-events-none" />
                                          <Input
                                            ref={searchInputRef}
                                            placeholder="Search items..."
                                            value={itemSearch}
                                            onChange={(e) => setItemSearch(e.target.value)}
                                            onKeyDown={(e) => {
                                              if (['ArrowUp', 'ArrowDown', 'Enter', 'Escape'].includes(e.key)) return;
                                              e.stopPropagation();
                                            }}
                                            className="pl-8 h-8 text-xs"
                                            onClick={(e) => e.stopPropagation()}
                                            onMouseDown={(e) => e.stopPropagation()}
                                          />
                                        </div>
                                      </div>
                                      <div className="max-h-[200px] overflow-y-auto">
                                        {availableItems.filter((i: any) => 
                                          i.description?.toLowerCase().includes(itemSearch.toLowerCase()) || 
                                          i.code?.toLowerCase().includes(itemSearch.toLowerCase()) ||
                                          (i.barcode && i.barcode.toLowerCase().includes(itemSearch.toLowerCase())) ||
                                          i.variants?.some((v: any) => 
                                            (v.sku && v.sku.toLowerCase().includes(itemSearch.toLowerCase())) ||
                                            (v.barcode && v.barcode.toLowerCase().includes(itemSearch.toLowerCase()))
                                          )
                                        ).length > 0 ? (
                                          availableItems
                                            .filter((i: any) => 
                                              i.description?.toLowerCase().includes(itemSearch.toLowerCase()) || 
                                              i.code?.toLowerCase().includes(itemSearch.toLowerCase()) ||
                                              (i.barcode && i.barcode.toLowerCase().includes(itemSearch.toLowerCase())) ||
                                              i.variants?.some((v: any) => 
                                                (v.sku && v.sku.toLowerCase().includes(itemSearch.toLowerCase())) ||
                                                (v.barcode && v.barcode.toLowerCase().includes(itemSearch.toLowerCase()))
                                              )
                                            )
                                            .map((item: any) => (
                                            <SelectItem key={item.id} value={item.id} className="text-left">
                                              <div className="flex justify-between items-center w-full gap-2 min-w-[200px]">
                                                <span>{item.code} - {item.description}</span>
                                                <span className="text-xs text-muted-foreground ml-auto">Stock: {item.variants && item.variants.length > 0 ? item.variants.reduce((sum: number, v: any) => sum + (stockMap[v.id] ?? 0), 0) : (stockMap[item.id] ?? 0)}</span>
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
                                );
                              }}
                            />
                          )}
                          {errors.items?.[index]?.itemId && <p className="text-xs text-destructive mt-1">{errors.items[index].itemId?.message}</p>}
                        </TableCell>
                        <TableCell className="align-top">
                          <Input
                            type="number"
                            min="0"
                            max={purchase ? watch(`items.${index}.availableQuantity`) : undefined}
                            className="h-10 text-center"
                            {...register(`items.${index}.quantity`)}
                            disabled={loading}
                            aria-label={`Return Quantity for item ${index + 1}`}
                          />
                          {errors.items?.[index]?.quantity && <p className="text-xs text-destructive mt-1">{errors.items[index].quantity?.message}</p>}
                        </TableCell>
                        <TableCell className="align-top">
                          <Input
                            type="number"
                            min="0"
                            className="h-10 text-right bg-muted"
                            disabled={!!purchase || loading}
                            {...register(`items.${index}.unitPrice`)}
                            aria-label={`Unit Price for item ${index + 1}`}
                          />
                        </TableCell>
                        <TableCell className="align-top">
                          <div 
                            className="flex h-10 w-full items-center justify-end rounded-md border border-input bg-muted px-3 py-2 text-sm text-muted-foreground"
                            aria-label={`Total Amount for item ${index + 1}`}
                          >
                            {((Number(watchedItems[index]?.quantity) || 0) * (Number(watchedItems[index]?.unitPrice) || 0)).toFixed(2)}
                          </div>
                        </TableCell>
                        <TableCell className="align-top">
                          <Input
                            placeholder="Reason"
                            className="h-10"
                            {...register(`items.${index}.reason`)}
                            disabled={loading}
                            aria-label={`Reason for item ${index + 1}`}
                          />
                        </TableCell>
                        {!purchase && (
                          <TableCell className="align-top text-center">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="text-destructive h-10 w-10"
                              onClick={() => remove(index)}
                              disabled={fields.length === 1 || loading}
                              aria-label={`Remove item ${index + 1}`}
                            >
                              <FiTrash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="space-y-2">
              <Label>Sub Total</Label>
              <div className="rounded-md border bg-muted/50 px-3 py-2 text-sm text-right font-medium">
                {subTotal.toFixed(2)}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="tax">Tax Amount</Label>
              <Input
                id="tax"
                type="number"
                min="0"
                step="0.01"
                className="text-right"
                {...register("tax")}
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label>Total Items</Label>
              <div className="rounded-md border bg-muted/50 px-3 py-2 text-sm text-center font-medium">
                {totalItems}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Total Quantity</Label>
              <div className="rounded-md border bg-muted/50 px-3 py-2 text-sm text-center font-medium">
                {totalQuantity}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Grand Total</Label>
              <div className="rounded-md border bg-muted/50 px-3 py-2 text-sm text-right font-bold text-primary">
                {grandTotal.toFixed(2)}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-4 border-t pt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={handleSubmit((data) => onSubmit(data as any, "DRAFT")) as any}
              disabled={loading}
            >
              Save as Draft
            </Button>
            <Button
              type="button"
              onClick={handleSubmit((data) => onSubmit(data as any, "COMPLETED")) as any}
              disabled={loading}
            >
              Complete Return
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>

    <Dialog open={skuModalOpen} onOpenChange={(open) => {
      if (!open) {
        setSkuModalOpen(false);
        if (skuModalIndex !== null && !getValues(`items.${skuModalIndex}.variantId`)) {
          setValue(`items.${skuModalIndex}.itemId`, "");
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
                            skuVariants.every((v: any) => otherSelectedVariants.has(v.id) || !!selectedVariants[v.id])
                          }
                          onCheckedChange={(checked) => {
                            const newSelected: Record<string, boolean> = {};
                            if (checked) {
                              skuVariants.forEach((v: any) => {
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
                    <th className="px-4 py-2 text-right">Cost Price</th>
                  </tr>
                </thead>
                <tbody>
                  {skuVariants.map((variant: any) => {
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
                          {stockMap[variant.id] ?? 0}
                        </td>
                        <td className="px-4 py-2 text-right flex items-center justify-end gap-1">
                          {variant.costPrice !== null ? `৳${variant.costPrice.toFixed(2)}` : "-"}
                          {isAlreadySelected && (
                            <Badge variant="secondary" className="ml-2 text-[10px]">Added</Badge>
                          )}
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
              if (skuModalIndex !== null && !getValues(`items.${skuModalIndex}.variantId`)) {
                setValue(`items.${skuModalIndex}.itemId`, "");
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
    </>
  );
}
