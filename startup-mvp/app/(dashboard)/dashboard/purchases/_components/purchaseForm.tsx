"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useFieldArray, useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch, RootState } from "@/lib/store";
import {
  setItem as setReduxItem,
  setQuantity as setReduxQuantity,
  setDiscount as setReduxDiscount,
  setTax as setReduxTax,
  addItem as addReduxItem,
  removeItem as removeReduxItem,
  initializePurchase,
  resetPurchase,
} from "@/lib/redux/slices/purchaseSlice";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { FiAlertCircle, FiPlus, FiTrash2, FiSearch } from "react-icons/fi";
import { createPurchase, updatePurchase } from "../_actions/purchase.action";
import { getWarehouseStocks } from "../../inventory/stock/_actions/stock.action";
import { PurchaseStatus } from "@prisma/client";
import { format } from "date-fns";
import MediaSelector from "@/components/MediaSelector";

const purchaseItemSchema = z.object({
  itemId: z.string().optional().nullable(),
  description: z.string().min(1, "Description is required"),
  quantity: z.coerce.number().positive("Quantity must be greater than 0"),
  unitPrice: z.coerce.number().min(0, "Unit price must be 0 or greater"),
  amount: z.coerce.number().min(0, "Amount must be 0 or greater"),
});

const purchaseFormSchema = z.object({
  supplierId: z.string().min(1, "Supplier is required"),
  warehouseId: z.string().optional(),
  date: z.coerce.date(),
  status: z.nativeEnum(PurchaseStatus),
  notes: z.string().optional().nullable(),
  attachmentUrl: z.string().url("Invalid URL").optional().nullable().or(z.literal("")),
  discount: z.coerce.number().min(0).optional().nullable(),
  tax: z.coerce.number().min(0).optional().nullable(),
  items: z.array(purchaseItemSchema).min(1, "At least one item is required"),
});

type PurchaseFormData = z.infer<typeof purchaseFormSchema>;

interface PurchaseFormProps {
  mode: "create" | "edit";
  suppliers: Array<{
    id: string;
    name: string | null;
    email: string;
    company: string | null;
    supplierCode: string | null;
  }>;
  warehouses: Array<{
    id: string;
    name: string;
    code: string;
  }>;
  items: Array<{
    id: string;
    code: string;
    description: string;
    unitPrice: number;
    stock: number;
    unit: string;
  }>;
  initialData?: {
    id: string;
    supplier: { id: string };
    warehouseId?: string | null;
    purchaseNumber: string;
    date: Date;
    status: PurchaseStatus;
    notes: string | null;
    attachmentUrl: string | null;
    discount: number | null;
    tax: number | null;
    items: Array<{
      id: string;
      itemId: string | null;
      description: string;
      quantity: number;
      unitPrice: number;
      amount: number;
    }>;
  };
}

const STATUS_OPTIONS: { value: PurchaseStatus; label: string }[] = [
  { value: "DRAFT", label: "Draft" },
  { value: "APPROVED", label: "Approved" },
  { value: "RECEIVED", label: "Received" },
  { value: "CANCELLED", label: "Cancelled" },
];

export default function PurchaseForm({
  mode,
  suppliers,
  warehouses,
  items,
  initialData,
}: PurchaseFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [supplierSearch, setSupplierSearch] = useState("");
  const [itemSearch, setItemSearch] = useState("");
  const [stockMap, setStockMap] = useState<Record<string, number>>({});

  const filteredSuppliers = useMemo(() => {
    if (!supplierSearch) return suppliers;
    const searchLower = supplierSearch.toLowerCase();
    return suppliers.filter(
      (s) =>
        (s.name?.toLowerCase().includes(searchLower) || false) ||
        s.email.toLowerCase().includes(searchLower) ||
        (s.company?.toLowerCase().includes(searchLower) || false) ||
        (s.supplierCode?.toLowerCase().includes(searchLower) || false)
    );
  }, [suppliers, supplierSearch]);

  const filteredItemsForSelect = useMemo(() => {
    if (!itemSearch) return items;
    const searchLower = itemSearch.toLowerCase();
    return items.filter(
      (item) =>
        item.code.toLowerCase().includes(searchLower) ||
        item.description.toLowerCase().includes(searchLower)
    );
  }, [items, itemSearch]);

  const defaultItems =
    initialData?.items.map((item) => ({
      itemId: item.itemId || "",
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      amount: item.amount,
    })) || [
      {
        itemId: "",
        description: "",
        quantity: 1,
        unitPrice: 0,
        amount: 0,
      },
    ];

  // Get default date: current date for create, purchase date for edit
  const defaultDate = initialData 
    ? new Date(initialData.date) 
    : new Date();

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
    setValue,
    getValues,
    watch,
  } = useForm<PurchaseFormData>({
    resolver: zodResolver(purchaseFormSchema),
    defaultValues: initialData
      ? {
          supplierId: initialData.supplier.id,
          warehouseId: initialData.warehouseId || (warehouses.length > 0 ? warehouses[0].id : ""),
          date: defaultDate,
          status: initialData.status,
          notes: initialData.notes || "",
          attachmentUrl: initialData.attachmentUrl || "",
          discount: initialData.discount ?? 0,
          tax: initialData.tax ?? 0,
          items: defaultItems,
        }
      : {
          supplierId: "",
          warehouseId: warehouses.length > 0 ? warehouses[0].id : "",
          date: defaultDate,
          status: "DRAFT",
          notes: "",
          attachmentUrl: "",
          discount: 0,
          tax: 0,
          items: defaultItems,
        },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "items",
  });

  // Redux integration for better calculation performance
  const dispatch = useDispatch<AppDispatch>();
  const reduxPurchase = useSelector((state: RootState) => state.purchase);

  const watchedItems = watch("items");
  const watchedDiscount = watch("discount") || 0;
  const watchedTax = watch("tax") || 0;

  // Initialize Redux state on mount with form's initial items
  React.useEffect(() => {
    const items = getValues("items");
    dispatch(initializePurchase({
      items: items.map(item => ({
        itemId: item.itemId || "",
        description: item.description || "",
        quantity: Number(item.quantity) || 1,
        unitPrice: Number(item.unitPrice) || 0,
        amount: Number(item.amount) || 0,
      })),
      discount: Number(watchedDiscount) || 0,
      tax: Number(watchedTax) || 0,
    }));
  }, []); // Run once on mount

  // Sync form changes to Redux for instant calculations
  React.useEffect(() => {
    watchedItems.forEach((item, index) => {
      // Dispatch to Redux for calculation
      if (item.quantity !== undefined && item.unitPrice !== undefined) {
        dispatch(setReduxQuantity({ index, quantity: Number(item.quantity) || 0 }));
      }
    });
  }, [watchedItems.map(i => `${i.quantity}:${i.unitPrice}`).join('|')]);

  React.useEffect(() => {
    dispatch(setReduxDiscount(Number(watchedDiscount) || 0));
  }, [watchedDiscount, dispatch]);

  React.useEffect(() => {
    dispatch(setReduxTax(Number(watchedTax) || 0));
  }, [watchedTax, dispatch]);

  const watchedWarehouseId = watch("warehouseId");

  // Fetch ALL stocks for warehouse when warehouse changes
  useEffect(() => {
     if (!watchedWarehouseId) return;
     
     const fetchAllStocks = async () => {
        const res = await getWarehouseStocks(watchedWarehouseId);
        if (res.success && res.stocks) {
           const map: Record<string, number> = {};
           res.stocks.forEach(s => {
             map[s.itemId] = s.quantity;
           });
           setStockMap(map);
        }
     };
     
     fetchAllStocks();
  }, [watchedWarehouseId]);

  // Create a stable dependency key for items that only changes when quantity or unitPrice changes
  const itemsCalcKey = useMemo(() => {
    return watchedItems.map((item, idx) => `${idx}:${item.quantity}:${item.unitPrice}`).join('|');
  }, [watchedItems]);

  // Recalculate amounts whenever quantity or unitPrice changes
  React.useEffect(() => {
    const items = getValues("items");
    items.forEach((item, index) => {
      const quantity = Number(item.quantity) || 0;
      const unitPrice = Number(item.unitPrice) || 0;
      const currentAmount = Number(item.amount) || 0;
      const calculatedAmount = Number.isFinite(quantity * unitPrice) ? quantity * unitPrice : 0;
      
      // Only update if amount changed to avoid infinite loops
      if (Math.abs(calculatedAmount - currentAmount) > 0.001) {
        setValue(`items.${index}.amount`, calculatedAmount, { shouldValidate: false });
      }
    });
  }, [itemsCalcKey, getValues, setValue]);

  // Use Redux state for calculated totals (instant updates)
  const subTotal = reduxPurchase.subTotal;
  const grandTotal = reduxPurchase.grandTotal;

  const onSubmit = async (data: PurchaseFormData) => {
    try {
      setLoading(true);
      setError("");

      if (mode === "create") {
        const result = await createPurchase(data);
        if (!result.success) {
          throw new Error(result.error || "Failed to create purchase");
        }
        router.push("/dashboard/purchases");
      } else {
        const result = await updatePurchase({ ...data, id: initialData!.id });
        if (!result.success) {
          throw new Error(result.error || "Failed to update purchase");
        }
        router.push("/dashboard/purchases");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full">
      <Card>
        <CardHeader>
          <CardTitle>{mode === "create" ? "Add New Purchase" : "Edit Purchase"}</CardTitle>
          <CardDescription>
            {mode === "create"
              ? "Enter purchase details to create a new purchase"
              : "Update purchase information"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {error && (
              <div className="flex items-start gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive border border-destructive/20">
                <FiAlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Row 1: Form Fields (5) and File Upload (1) */}
            <div className="grid grid-cols-1 lg:grid-cols-6 gap-6">
              {/* Left Column: Main Form Fields (5/6) */}
              <div className="lg:col-span-5 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="supplierId">Supplier *</Label>
                    <Controller
                      name="supplierId"
                      control={control}
                      render={({ field }) => (
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                          disabled={loading}
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
                              {filteredSuppliers.map((s) => (
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
                    {errors.supplierId && (
                      <p className="text-sm text-destructive">{errors.supplierId.message}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="warehouseId">Warehouse</Label>
                    <Controller
                      name="warehouseId"
                      control={control}
                      render={({ field }) => (
                        <Select
                          value={field.value || ""}
                          onValueChange={field.onChange}
                          disabled={loading}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select warehouse" />
                          </SelectTrigger>
                          <SelectContent>
                             {warehouses.map((w) => (
                               <SelectItem key={w.id} value={w.id}>
                                 {w.name} ({w.code})
                               </SelectItem>
                             ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="date">Date *</Label>
                    <Controller
                      name="date"
                      control={control}
                      render={({ field }) => {
                        // Convert Date object to yyyy-MM-dd string for input
                        const dateValue = field.value instanceof Date 
                          ? format(field.value, "yyyy-MM-dd")
                          : field.value 
                          ? format(new Date(field.value), "yyyy-MM-dd")
                          : format(defaultDate, "yyyy-MM-dd");
                        
                        return (
                          <Input
                            id="date"
                            type="date"
                            value={dateValue}
                            onChange={(e) => {
                              // Convert string back to Date object
                              const dateValue = e.target.value ? new Date(e.target.value) : new Date();
                              field.onChange(dateValue);
                            }}
                            disabled={loading}
                          />
                        );
                      }}
                    />
                    {errors.date && <p className="text-sm text-destructive">{errors.date.message}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="status">Status *</Label>
                    <Select
                      defaultValue={initialData?.status || "DRAFT"}
                      onValueChange={(value) => setValue("status", value as PurchaseStatus)}
                      disabled={loading}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUS_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.status && <p className="text-sm text-destructive">{errors.status.message}</p>}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea id="notes" rows={3} {...register("notes")} disabled={loading} />
                  {errors.notes && <p className="text-sm text-destructive">{errors.notes.message}</p>}
                </div>
              </div>

              {/* Right Column: File Upload (1/6) */}
              <div className="lg:col-span-1 space-y-2">
                <Label>Attachment</Label>
                <MediaSelector
                  label=""
                  value={watch("attachmentUrl") || ""}
                  onChange={(url) => setValue("attachmentUrl", url || "")}
                  allowedTypes={["application/pdf", "image/*", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"]}
                  previewStyle="square"
                  width={180}
                  height={120}
                />
                {errors.attachmentUrl && (
                  <p className="text-sm text-destructive">{errors.attachmentUrl.message}</p>
                )}
              </div>
            </div>

            {/* Row 2: Items Table and Calculations */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Items</h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const newIndex = fields.length;
                    append({
                      itemId: "",
                      description: "",
                      quantity: 1,
                      unitPrice: 0,
                      amount: 0,
                    });
                    // Sync with Redux
                    dispatch(addReduxItem());
                    // Auto-focus the new item's select dropdown after render
                    setTimeout(() => {
                      const newSelectTrigger = document.querySelector(`[data-item-select-index="${newIndex}"]`);
                      if (newSelectTrigger instanceof HTMLElement) {
                        newSelectTrigger.click();
                      }
                    }, 100);
                  }}
                >
                  <FiPlus className="mr-2 h-4 w-4" />
                  Add Item
                </Button>
              </div>

              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="text-left px-3 py-2">Item</th>
                      <th className="text-left px-3 py-2">Description</th>
                      <th className="text-right px-3 py-2">Stock</th>
                      <th className="text-right px-3 py-2">Qty</th>
                      <th className="text-right px-3 py-2">Unit Price</th>
                      <th className="text-right px-3 py-2">Amount</th>
                      <th className="text-right px-3 py-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {fields.map((field, index) => {
                      // Get list of already selected item IDs (excluding current row)
                      const selectedItemIds = watch("items")
                        .map((item, idx) => idx !== index ? item.itemId : null)
                        .filter((id): id is string => !!id);
                      
                      // Filter out already selected items
                      const availableItems = filteredItemsForSelect.filter(
                        item => !selectedItemIds.includes(item.id)
                      );
                      
                      // Get selected item details for display
                      const selectedItem = items.find(item => item.id === watch(`items.${index}.itemId`));
                      
                      return (
                        <tr key={field.id} className="border-t">
                        <td className="px-3 py-2 align-top min-w-[220px]">
                          <Controller
                            name={`items.${index}.itemId`}
                            control={control}
                            render={({ field: itemField }) => {
                              const searchInputRef = React.useRef<HTMLInputElement>(null);
                              
                              return (
                                <Select
                                  value={itemField.value || ""}
                                  onValueChange={(value) => {
                                    itemField.onChange(value || "");
                                    const selectedItem = items.find((item) => item.id === value);
                                    if (selectedItem) {
                                      setValue(`items.${index}.description`, selectedItem.description);
                                      setValue(`items.${index}.unitPrice`, selectedItem.unitPrice);
                                      
                                      // Calculate amount immediately with the new unit price
                                      const currentQuantity = Number(getValues(`items.${index}.quantity`) || 0);
                                      const amount = Number.isFinite(currentQuantity * selectedItem.unitPrice) 
                                        ? currentQuantity * selectedItem.unitPrice 
                                        : 0;
                                      setValue(`items.${index}.amount`, amount);
                                      
                                      // Dispatch to Redux for instant calculation
                                      dispatch(setReduxItem({
                                        index,
                                        itemId: value,
                                        description: selectedItem.description,
                                        unitPrice: selectedItem.unitPrice,
                                      }));
                                      
                                      // Clear search after selection
                                      setItemSearch("");
                                    }
                                  }}
                                  onOpenChange={(open) => {
                                    if (open) {
                                      // Auto-focus search when dropdown opens
                                      setTimeout(() => {
                                        searchInputRef.current?.focus();
                                      }, 0);
                                    } else {
                                      // Clear search when dropdown closes to prevent empty display
                                      setItemSearch("");
                                    }
                                  }}
                                  disabled={loading}
                                >
                                  <SelectTrigger className="text-left" data-item-select-index={index}>
                                    <SelectValue placeholder="Select item">
                                      {selectedItem ? `${selectedItem.code} - ${selectedItem.description}` : null}
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
                                          onChange={(e) => {
                                            setItemSearch(e.target.value);
                                          }}
                                          onKeyDown={(e) => {
                                            // Allow navigation keys (ArrowUp, ArrowDown, Enter, Escape) to bubble up to Select
                                            if (['ArrowUp', 'ArrowDown', 'Enter', 'Escape'].includes(e.key)) {
                                              // Don't stop propagation - let Select handle it
                                              return;
                                            }
                                            // For all other keys (typing), stop propagation
                                            e.stopPropagation();
                                          }}
                                          className="pl-8 h-8 text-xs"
                                          onClick={(e) => e.stopPropagation()}
                                          onMouseDown={(e) => e.stopPropagation()}
                                        />
                                      </div>
                                    </div>
                                    <div className="max-h-[200px] overflow-y-auto">
                                      {availableItems.length > 0 ? (
                                        availableItems.map((item) => (
                                          <SelectItem key={item.id} value={item.id} className="text-left">
                                            <div className="flex justify-between items-center w-full gap-2">
                                              <span>{item.code} - {item.description}</span>
                                              <span className="text-xs text-muted-foreground ml-auto">Stock: {stockMap[item.id] ?? 0}</span>
                                            </div>
                                          </SelectItem>
                                        ))
                                      ) : (
                                        <div className="px-2 py-4 text-sm text-muted-foreground text-center">
                                          {itemSearch ? "No items found" : "All items already selected"}
                                        </div>
                                      )}
                                    </div>
                                  </SelectContent>
                                </Select>
                              );
                            }}
                          />
                        </td>
                        <td className="px-3 py-2 align-top">
                          <Input
                            {...register(`items.${index}.description`)}
                            disabled={loading}
                          />
                          {errors.items?.[index]?.description && (
                            <p className="text-xs text-destructive mt-1">
                              {errors.items[index]?.description?.message}
                            </p>
                          )}
                        </td>
                        <td className="px-3 py-2 align-top text-right flex items-center gap-1">
                          <div className="text-sm font-medium">
                            {selectedItem ? (stockMap[selectedItem.id] ?? 0) : 0}
                          </div> 
                          {selectedItem && (
                              <span className="text-sm text-muted-foreground">
                                {selectedItem.unit}
                              </span>
                            )}
                        </td>
                        <td className="px-3 py-2 align-top text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Input
                              type="number"
                              step="1"
                              className="text-center w-40"
                              {...register(`items.${index}.quantity`, {
                                valueAsNumber: true,
                              })}
                              disabled={loading}
                            />
                           
                          </div>
                          {errors.items?.[index]?.quantity && (
                            <p className="text-xs text-destructive mt-1">
                              {errors.items[index]?.quantity?.message}
                            </p>
                          )}
                        </td>
                        <td className="px-3 py-2 align-top text-right">
                          <Input
                            type="number"
                            step="1"
                            className="text-right"
                            {...register(`items.${index}.unitPrice`, {
                              valueAsNumber: true,
                            })}
                            disabled
                          />
                          {errors.items?.[index]?.unitPrice && (
                            <p className="text-xs text-destructive mt-1">
                              {errors.items[index]?.unitPrice?.message}
                            </p>
                          )}
                        </td>
                        <td className="px-3 py-2 align-top text-right">
                          <Input
                            type="number"
                            step="1"
                            className="text-right"
                            {...register(`items.${index}.amount`, { valueAsNumber: true })}
                            disabled
                          />
                        </td>
                        <td className="px-3 py-2 align-top text-right">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              remove(index);
                              // Sync with Redux
                              dispatch(removeReduxItem(index));
                            }}
                            disabled={loading || fields.length === 1}
                          >
                            <FiTrash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </td>
                      </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {errors.items && (
                <p className="text-sm text-destructive">{errors.items.message}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="discount">Discount</Label>
                <Input
                  id="discount"
                  type="number"
                  step="1"
                  {...register("discount", { valueAsNumber: true })}
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tax">Tax</Label>
                <Input
                  id="tax"
                  type="number"
                  step="1"
                  {...register("tax", { valueAsNumber: true })}
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label>Total</Label>
                <div className="rounded-md border px-3 py-2 text-sm">
                  {grandTotal.toFixed(2)}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Saving..." : mode === "create" ? "Create Purchase" : "Update Purchase"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}


