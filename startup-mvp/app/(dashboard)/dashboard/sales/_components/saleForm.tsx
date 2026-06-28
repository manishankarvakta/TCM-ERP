"use client";

import React,{ useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller, useFieldArray, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FiAlertCircle, FiPlus, FiTrash2, FiUserPlus, FiSearch } from "react-icons/fi";
import { createSale, updateSale } from "../_actions/sale.action";
import { createClient } from "@/app/(dashboard)/dashboard/clients/_actions/client.action";
import { SaleStatus, OrderType } from "@prisma/client";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

// Redux imports
import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch, RootState } from "@/lib/store";
import {
  setSaleMetadata,
  setSaleItemQuantity,
  setSaleItemUnitPrice,
  setSaleDiscount,
  setSaleTax,
  toggleSaleAutoTax,
  resetSale,
  initializeSale,
} from "@/lib/redux/slices/salesSlice";

const saleItemSchema = z.object({
  itemId: z.string().min(1, "Item is required"),
  description: z.string().min(1, "Description is required"),
  quantity: z.coerce.number().positive("Quantity must be greater than 0"),
  unitPrice: z.coerce.number().min(0, "Unit price must be 0 or greater"),
  amount: z.coerce.number().min(0, "Amount must be 0 or greater"),
});

const saleFormSchema = z.object({
  clientId: z.string().min(1, "Client is required"),
  warehouseId: z.string().min(1, "Warehouse is required"),
  date: z.coerce.date(),
  status: z.nativeEnum(SaleStatus),
  orderType: z.nativeEnum(OrderType),
  notes: z.string().optional().nullable(),
  attachmentUrl: z.string().url("Invalid URL").optional().nullable().or(z.literal("")),
  discount: z.coerce.number().min(0).optional().nullable(),
  tax: z.coerce.number().min(0).optional().nullable(),
  items: z.array(saleItemSchema).min(1, "At least one item is required"),
});

type SaleFormData = z.infer<typeof saleFormSchema>;

interface SaleFormProps {
  mode: "create" | "edit";
  clients: Array<{
    id: string;
    name: string | null;
    email: string | null;
    company: string | null;
  }>;
  items: Array<{
    id: string;
    code: string;
    description: string;
    unitPrice: number;
    unit: string;
    itemType: string;
    stocks: Array<{
      warehouseId: string;
      quantity: number;
    }>;
  }>;
  warehouses: Array<{
    id: string;
    name: string;
    code: string;
  }>;
  initialData?: {
    id: string;
    client: { id: string };
    warehouse: { id: string };
    saleNumber: string;
    date: Date;
    status: SaleStatus;
    orderType?: OrderType | null;
    notes: string | null;
    attachmentUrl: string | null;
    discount: number | null;
    tax: number | null;
    items: Array<{
      id: string;
      itemId: string;
      description: string;
      quantity: number;
      unitPrice: number;
      amount: number;
    }>;
  };
}

export default function SaleForm({
  mode,
  clients: initialClients,
  items,
  warehouses,
  initialData,
}: SaleFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(false);
  // autoTaxEnabled is now managed by Redux, but we might keep local for UI toggle if needed? 
  // No, let's rely on Redux for calculations.
  const [clientDialogOpen, setClientDialogOpen] = useState(false);
  const [creatingClient, setCreatingClient] = useState(false);
  const [clients, setClients] = useState(initialClients);
  const [clientFormData, setClientFormData] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    address: "",
    city: "",
    state: "",
    zip: "",
    country: "Bangladesh",
  });
  
  // Redux hooks
  const dispatch = useDispatch<AppDispatch>();
  const salesState = useSelector((state: RootState) => state.sales);

  const defaultItems =
    initialData?.items.map((item) => ({
      itemId: item.itemId,
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

  // Get default date: current date for create, sale date for edit
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
    trigger,
  } = useForm<SaleFormData>({
    resolver: zodResolver(saleFormSchema) as any,
    defaultValues: initialData
      ? {
          clientId: initialData.client.id,
          warehouseId: initialData.warehouse.id,
          date: defaultDate,
          status: initialData.status,
          orderType: initialData.orderType || OrderType.RETAIL,
          notes: initialData.notes || "",
          attachmentUrl: initialData.attachmentUrl || "",
          discount: initialData.discount ?? 0,
          tax: initialData.tax ?? 0,
          items: defaultItems,
        }
      : {
          clientId: "",
          warehouseId: warehouses.length > 0 ? warehouses[0].id : "",
          date: defaultDate,
          status: "DRAFT",
          orderType: OrderType.RETAIL,
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

  const watchedItems = watch("items");
  const watchedWarehouseId = watch("warehouseId");
  const watchedDiscount = watch("discount") || 0;
  const watchedTax = watch("tax") || 0;

  // Initialize Redux state on mount
  useEffect(() => {
    // Initialize Redux with form data
    const items = getValues("items");
    dispatch(initializeSale({
      clientId: getValues("clientId"),
      warehouseId: getValues("warehouseId"),
      date: defaultDate.toISOString(),
      status: getValues("status"),
      notes: getValues("notes") || "",
      items: items.map(item => ({
        itemId: item.itemId || "",
        description: item.description || "",
        quantity: Number(item.quantity) || 1,
        unitPrice: Number(item.unitPrice) || 0,
        amount: Number(item.amount) || 0,
      })),
      discount: Number(watchedDiscount) || 0,
      tax: Number(watchedTax) || 0,
      autoTaxEnabled: false, // Default to false unless logic enables it?
    }));

    return () => {
      dispatch(resetSale());
    };
  }, []); // Run once on mount

  // Sync form changes to Redux for instant calculations
  
  // 1. Sync metadata
  const watchedMetadata = watch(["clientId", "warehouseId", "status", "notes", "date"]);
  useEffect(() => {
    dispatch(setSaleMetadata({
        clientId: watchedMetadata[0],
        warehouseId: watchedMetadata[1],
        status: watchedMetadata[2],
        notes: watchedMetadata[3] || "",
        date: watchedMetadata[4] ? new Date(watchedMetadata[4]).toISOString() : undefined
    }));
  }, [watchedMetadata, dispatch]);

  // 2. Sync Items (Quantity/Price) - Complete sync including array length
  useEffect(() => {
    // Get current Redux items count
    const reduxItemsCount = salesState.items.length;
    const formItemsCount = watchedItems.length;
    
    // If array lengths don't match, we need to sync the entire items array
    if (reduxItemsCount !== formItemsCount) {
      // Reinitialize with current form state to sync items array
      dispatch(initializeSale({
        clientId: getValues("clientId"),
        warehouseId: getValues("warehouseId"),
        date: getValues("date") ? new Date(getValues("date")).toISOString() : defaultDate.toISOString(),
        status: getValues("status"),
        notes: getValues("notes") || "",
        items: watchedItems.map(item => ({
          itemId: item.itemId || "",
          description: item.description || "",
          quantity: Number(item.quantity) || 1,
          unitPrice: Number(item.unitPrice) || 0,
          amount: Number(item.amount) || 0,
        })),
        discount: Number(watchedDiscount) || 0,
        tax: Number(watchedTax) || 0,
        autoTaxEnabled: salesState.autoTaxEnabled,
      }));
    } else {
      // If lengths match, just update quantity and unitPrice for each item
      watchedItems.forEach((item, index) => {
        const quantity = Number(item.quantity);
        const unitPrice = Number(item.unitPrice);
        
        if (!isNaN(quantity) && salesState.items[index]?.quantity !== quantity) {
          dispatch(setSaleItemQuantity({ index, quantity }));
        }
        if (!isNaN(unitPrice) && salesState.items[index]?.unitPrice !== unitPrice) {
          dispatch(setSaleItemUnitPrice({ index, unitPrice }));
        }
      });
    }
  }, [watchedItems.length, watchedItems.map(i => `${i.quantity}:${i.unitPrice}`).join('|'), dispatch, salesState.items.length, salesState.autoTaxEnabled, getValues, defaultDate, watchedDiscount, watchedTax]);

  // 3. Sync Discount
  useEffect(() => {
    dispatch(setSaleDiscount(Number(watchedDiscount) || 0));
  }, [watchedDiscount, dispatch]);

  // 4. Sync Tax
  useEffect(() => {
    // Only sync tax from Form to Redux if NOT auto-tax enabled?
    // Actually, if user types in tax input, it updates form state -> watches triggers this -> updates Redux.
    // If Redux updates tax (via auto-calc), we need to update Form state (handled below).
    // To avoid loop:
    // User Input -> Form State -> Redux State (here) -> Form State (feedback loop)
    // We break loop by checking if values differ significantly?
    // Or just trust that if Redux matches Form, no re-render happens.
    if (!salesState.autoTaxEnabled) {
         dispatch(setSaleTax(Number(watchedTax) || 0));
    }
  }, [watchedTax, dispatch, salesState.autoTaxEnabled]);

  // Recalculate amounts locally and update RHF to ensure submission has correct values
  // Also sync calc results back to form fields (like amount)
  const itemsCalcKey = useMemo(() => {
    return watchedItems.map((item, idx) => `${idx}:${item.quantity}:${item.unitPrice}`).join('|');
  }, [watchedItems]);

  useEffect(() => {
    const items = getValues("items");
    items.forEach((item, index) => {
      const quantity = Number(item.quantity) || 0;
      const unitPrice = Number(item.unitPrice) || 0;
      const currentAmount = Number(item.amount) || 0;
      const calculatedAmount = Number.isFinite(quantity * unitPrice) ? quantity * unitPrice : 0;
      
      if (Math.abs(calculatedAmount - currentAmount) > 0.001) {
        setValue(`items.${index}.amount`, calculatedAmount, { shouldValidate: false });
      }
    });
  }, [itemsCalcKey, getValues, setValue]);

  // Sync Redux Tax back to Form (if Auto Tax is enabled)
  useEffect(() => {
    if (salesState.autoTaxEnabled) {
        // Redux calculated a new tax, update the form field
        const currentFormTax = Number(getValues("tax"));
        if (Math.abs(salesState.tax - currentFormTax) > 0.001) {
            setValue("tax", salesState.tax, { shouldValidate: true });
        }
    }
  }, [salesState.tax, salesState.autoTaxEnabled, getValues, setValue]);


  // Use Redux state for calculated totals (instant updates)
  const subTotal = salesState.subTotal;
  const grandTotal = salesState.grandTotal;

  const onSubmit = async (data: SaleFormData) => {
    setError("");
    setLoading(true);

    try {
      let result;
      if (mode === "create") {
        result = await createSale(data as any);
      } else {
        if (!initialData) {
          setError("Initial data is required for edit mode");
          setLoading(false);
          return;
        }
        result = await updateSale({ ...data, id: initialData.id } as any);
      }

      if (result.success) {
        toast({
          title: "Success",
          description: mode === "create" ? "Sale created successfully" : "Sale updated successfully",
        });
        router.push("/dashboard/sales");
        router.refresh();
      } else {
        setError(result.error || "Failed to save sale");
        toast({
          title: "Error",
          description: result.error || "Failed to save sale",
          variant: "destructive",
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "An error occurred",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-6">
      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
          <div className="flex items-center gap-2">
            <FiAlertCircle className="h-5 w-5 text-destructive" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{mode === "create" ? "Create Sale" : "Edit Sale"}</CardTitle>
          <CardDescription>
            {mode === "create"
              ? "Create a new sale order"
              : `Edit sale ${initialData?.saleNumber}`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="space-y-2">
              <Label htmlFor="clientId">Client *</Label>
              <div className="flex gap-2">
                <Controller
                  name="clientId"
                  control={control}
                  render={({ field }) => (
                    <Select 
                      value={field.value || ""} 
                      onValueChange={field.onChange}
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Select client" />
                      </SelectTrigger>
                      <SelectContent>
                        {clients.map((client) => (
                          <SelectItem key={client.id} value={client.id}>
                            {client.name || client.email}
                            {client.company && ` (${client.company})`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setClientDialogOpen(true)}
                  disabled={loading}
                  title="Add New Client"
                >
                  <FiUserPlus className="h-4 w-4" />
                </Button>
              </div>
              {errors.clientId && (
                <p className="text-sm text-destructive">{errors.clientId.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="warehouseId">Warehouse *</Label>
              <Controller
                name="warehouseId"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select warehouse" />
                    </SelectTrigger>
                    <SelectContent>
                      {warehouses.map((warehouse) => (
                        <SelectItem key={warehouse.id} value={warehouse.id}>
                          {warehouse.name} ({warehouse.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.warehouseId && (
                <p className="text-sm text-destructive">{errors.warehouseId.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="date">Date *</Label>
              <Controller
                name="date"
                control={control}
                render={({ field }) => {
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
              <Controller
                name="status"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DRAFT">Draft</SelectItem>
                      <SelectItem value="COMPLETED">Completed</SelectItem>
                      <SelectItem value="CANCELLED">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.status && <p className="text-sm text-destructive">{errors.status.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="orderType">Order Type *</Label>
              <Controller
                name="orderType"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="RETAIL">Retail</SelectItem>
                      <SelectItem value="READY_PRODUCT">Ready Product</SelectItem>
                      <SelectItem value="WHOLESALE">Wholesale</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.orderType && <p className="text-sm text-destructive">{errors.orderType.message}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              {...register("notes")}
              placeholder="Additional notes..."
              disabled={loading}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Items</CardTitle>
          <CardDescription>Add items to this sale (Ready Products and Retail only)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Sale Items</h3>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                append({
                  itemId: "",
                  description: "",
                  quantity: 1,
                  unitPrice: 0,
                  amount: 0,
                });
                // Focus the new row's select trigger after a brief delay
                setTimeout(() => {
                  const newIndex = fields.length;
                  const trigger = document.querySelector(`[data-item-select-index="${newIndex}"]`) as HTMLElement;
                  if (trigger) {
                    trigger.click();
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
                  const currentItem = watchedItems[index] || {};
                  const selectedItem = items.find((item) => item.id === currentItem.itemId);
                  
                  // Calculate stock for the selected item and current warehouse
                  const stock = selectedItem?.stocks?.find(s => s.warehouseId === watchedWarehouseId);
                  const selectedItemStock = stock?.quantity ?? 0;

                  return (
                    <tr key={field.id} className="border-t">
                      <td className="px-3 py-2 align-top min-w-[280px]">
                        <Controller
                          name={`items.${index}.itemId`}
                          control={control}
                          render={({ field: itemField }) => {
                            const [open, setOpen] = useState(false);
                            const [itemSearch, setItemSearch] = useState("");
                            const searchInputRef = React.useRef<HTMLInputElement>(null);

                            // Filter items based on availability and search
                            const filteredItems = items
                                .filter((i) => 
                                    (i.id === currentItem.itemId || !watchedItems.some((row, rIdx) => rIdx !== index && row.itemId === i.id)) &&
                                    (i.code.toLowerCase().includes(itemSearch.toLowerCase()) || i.description.toLowerCase().includes(itemSearch.toLowerCase()))
                                );

                            return (
                                <Select
                                  value={itemField.value || ""}
                                  // Control open state to handle search focus and cleanup
                                  open={open}
                                  onOpenChange={(isOpen) => {
                                      setOpen(isOpen);
                                      if (isOpen) {
                                          setTimeout(() => searchInputRef.current?.focus(), 0);
                                      } else {
                                          // Delay clearing search slightly or just clear it
                                          setItemSearch(""); 
                                      }
                                  }}
                                  onValueChange={(value) => {
                                    itemField.onChange(value || "");
                                    const item = items.find((i) => i.id === value);
                                    if (item) {
                                      setValue(`items.${index}.description`, item.description);
                                      setValue(`items.${index}.unitPrice`, item.unitPrice);
                                      // Calculate amount immediately
                                      const qty = Number(getValues(`items.${index}.quantity`)) || 1;
                                      setValue(`items.${index}.amount`, qty * item.unitPrice);
                                    } else {
                                        setValue(`items.${index}.description`, "");
                                        setValue(`items.${index}.unitPrice`, 0);
                                        setValue(`items.${index}.amount`, 0);
                                    }
                                  }}
                                >
                                  <SelectTrigger className="text-left w-full" data-item-select-index={index}>
                                    <SelectValue placeholder="Select item">
                                        {(() => {
                                            const selected = items.find(i => i.id === currentItem.itemId);
                                            return selected ? `${selected.code} - ${selected.description}` : "Select item";
                                        })()}
                                    </SelectValue>
                                  </SelectTrigger>
                                  <SelectContent className="max-h-[300px]">
                                    <div className="p-2 sticky top-0 bg-popover z-10">
                                      <div className="relative">
                                        <FiSearch className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 z-10 pointer-events-none" />
                                        <Input
                                          ref={searchInputRef}
                                          placeholder="Search items..."
                                          value={itemSearch}
                                          onChange={(e) => setItemSearch(e.target.value)}
                                          onKeyDown={(e) => {
                                            if (['ArrowUp', 'ArrowDown', 'Enter', 'Escape'].includes(e.key)) {
                                                return; // Let duplicate select handle navigation
                                            }
                                            e.stopPropagation(); // Stop enter from submitting form if just searching
                                          }}
                                          className="pl-8 h-8 text-xs"
                                          // Prevent click propagation to keep dropdown open
                                          onClick={(e) => e.stopPropagation()} 
                                        />
                                      </div>
                                    </div>
                                    
                                    <div className="max-h-[200px] overflow-y-auto">
                                        {filteredItems.length > 0 ? (
                                            filteredItems.map((item) => {
                                              // Find stock for selected warehouse
                                              const stock = item.stocks?.find(
                                                (s) => s.warehouseId === watchedWarehouseId
                                              );
                                              const stockQty = stock?.quantity ?? 0;

                                              return (
                                                  <SelectItem key={item.id} value={item.id} className="text-left">
                                                      <div className="flex justify-between items-center w-full gap-4">
                                                          <span>{item.code} - {item.description}</span>
                                                          <span className="text-xs text-muted-foreground whitespace-nowrap">Stock: {stockQty}</span>
                                                      </div>
                                                  </SelectItem>
                                              );
                                            })
                                        ) : (
                                            <div className="px-2 py-4 text-sm text-muted-foreground text-center">
                                                {itemSearch ? "No items found" : "All items selected"}
                                            </div>
                                        )}
                                    </div>
                                  </SelectContent>
                                </Select>
                            );
                          }}
                        />
                        {errors.items?.[index]?.itemId && (
                          <p className="text-xs text-destructive mt-1">
                            {errors.items[index]?.itemId?.message}
                          </p>
                        )}
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
                      <td className="px-3 py-2 align-top text-right">
                        <div className={`text-sm font-medium ${selectedItemStock <= 0 ? 'text-destructive' : ''}`}>
                          {selectedItemStock}
                        </div>
                      </td>
                      <td className="px-3 py-2 align-top text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Input
                            type="number"
                            step="1"
                            className="text-right w-24 text-center"
                            {...register(`items.${index}.quantity`, { 
                              valueAsNumber: true,
                              onChange: (e) => {
                                const qty = Number(e.target.value) || 0;
                                const price = Number(getValues(`items.${index}.unitPrice`)) || 0;
                                setValue(`items.${index}.amount`, qty * price);
                              }
                            })}
                            disabled={loading}
                          />
                          {selectedItem && (
                            <div className="text-xs text-muted-foreground w-12 text-left">
                              {selectedItem.unit || "unit"}
                            </div>
                          )}
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
                            onChange: (e) => {
                              const price = Number(e.target.value) || 0;
                              const qty = Number(getValues(`items.${index}.quantity`)) || 0;
                              setValue(`items.${index}.amount`, qty * price);
                            }
                          })}
                          disabled={loading}
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
                          value={currentItem.amount || 0}
                          disabled
                          readOnly
                        />
                        {/* Hidden input to keep amount in form state */}
                        <input type="hidden" {...register(`items.${index}.amount`, { valueAsNumber: true })} />
                      </td>
                      <td className="px-3 py-2 align-top text-right">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            remove(index);
                            // Redux sync will happen automatically via useEffect
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Financial Summary</CardTitle>
        </CardHeader>
        <CardContent>
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
              <Label htmlFor="tax">Tax (15% VAT)</Label>
              <div className="flex gap-2">
                <Input
                  id="tax"
                  type="number"
                  step="1"
                  {...register("tax", { 
                    valueAsNumber: true,
                    onChange: (e) => {
                      // If user manually changes tax, disable auto tax via effect logic or explicit dispatch if needed
                      // But our effect `!salesState.autoTaxEnabled` handles sync. 
                      // If we want to force disable auto tax on manual type:
                      if (salesState.autoTaxEnabled) {
                        dispatch(toggleSaleAutoTax(false));
                      }
                    }
                  })}
                  disabled={loading || salesState.autoTaxEnabled}
                  placeholder={salesState.autoTaxEnabled ? "Auto: 15% of subtotal" : "Enter tax amount"}
                />
                <Button
                  type="button"
                  variant={salesState.autoTaxEnabled ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                     // Toggle auto tax
                     dispatch(toggleSaleAutoTax(!salesState.autoTaxEnabled));
                     // If enabling, tax update is handled by reducer
                     // If disabling, tax stays as is until edited
                  }}
                  disabled={loading}
                >
                  {salesState.autoTaxEnabled ? "Auto 15% ✓" : "Auto 15%"}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                {salesState.autoTaxEnabled 
                  ? "Auto tax enabled: 15% VAT calculated automatically from subtotal."
                  : "Tax is calculated as 15% VAT on subtotal. Click 'Auto 15%' to enable automatic calculation."}
              </p>
            </div>
            <div className="space-y-2">
              <Label>Grand Total</Label>
              <div className="rounded-md border px-3 py-2 text-lg font-semibold">
                ৳{grandTotal.toFixed(2)}
              </div>
            </div>
          </div>
          <div className="mt-4 text-sm text-muted-foreground">
            Subtotal: ৳{subTotal.toFixed(2)}
          </div>
        </CardContent>
      </Card>

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
          {loading ? "Saving..." : mode === "create" ? "Create Sale" : "Update Sale"}
        </Button>
      </div>

      {/* Create Client Dialog */}
      <Dialog open={clientDialogOpen} onOpenChange={setClientDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Client</DialogTitle>
            <DialogDescription>
              Add a new client to the system. The client will be automatically selected after creation.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              e.stopPropagation();
              setCreatingClient(true);
              try {
                const result = await createClient({
                  name: clientFormData.name || undefined,
                  email: clientFormData.email,
                  phone: clientFormData.phone || undefined,
                  address: clientFormData.address || undefined,
                  city: clientFormData.city || undefined,
                  state: clientFormData.state || undefined,
                  zip: clientFormData.zip || undefined,
                  country: clientFormData.country || undefined,
                  company: clientFormData.company || undefined,
                  status: "active",
                });

                if (result.success && result.client) {
                  toast({
                    title: "Success",
                    description: "Client created successfully",
                  });
                  // Add new client to the local list
                  const newClient = {
                    id: result.client.id,
                    name: result.client.name,
                    email: result.client.email,
                    company: result.client.company,
                  };
                  // Update clients list
                  const updatedClients = [...clients, newClient];
                  setClients(updatedClients);
                  
                  // Update the form to select the new client immediately
                  setValue("clientId", result.client.id, { shouldValidate: true, shouldDirty: true });
                  trigger("clientId");
                  
                  // Close dialog and reset form
                  setClientDialogOpen(false);
                  setClientFormData({
                    name: "",
                    email: "",
                    phone: "",
                    company: "",
                    address: "",
                    city: "",
                    state: "",
                    zip: "",
                    country: "Bangladesh",
                  });
                } else {
                  toast({
                    title: "Error",
                    description: result.error || "Failed to create client",
                    variant: "destructive",
                  });
                }
              } catch (err) {
                toast({
                  title: "Error",
                  description: err instanceof Error ? err.message : "An error occurred",
                  variant: "destructive",
                });
              } finally {
                setCreatingClient(false);
              }
            }}
            className="space-y-4"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="client-name">Name</Label>
                <Input
                  id="client-name"
                  value={clientFormData.name}
                  onChange={(e) =>
                    setClientFormData({ ...clientFormData, name: e.target.value })
                  }
                  placeholder="Client name"
                  disabled={creatingClient}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="client-email">Email *</Label>
                <Input
                  id="client-email"
                  type="email"
                  value={clientFormData.email}
                  onChange={(e) =>
                    setClientFormData({ ...clientFormData, email: e.target.value })
                  }
                  placeholder="client@example.com"
                  required
                  disabled={creatingClient}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="client-phone">Phone</Label>
                <Input
                  id="client-phone"
                  value={clientFormData.phone}
                  onChange={(e) =>
                    setClientFormData({ ...clientFormData, phone: e.target.value })
                  }
                  placeholder="+8801712345678"
                  disabled={creatingClient}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="client-company">Company</Label>
                <Input
                  id="client-company"
                  value={clientFormData.company}
                  onChange={(e) =>
                    setClientFormData({ ...clientFormData, company: e.target.value })
                  }
                  placeholder="Company name"
                  disabled={creatingClient}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="client-address">Address</Label>
                <Input
                  id="client-address"
                  value={clientFormData.address}
                  onChange={(e) =>
                    setClientFormData({ ...clientFormData, address: e.target.value })
                  }
                  placeholder="Street address"
                  disabled={creatingClient}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="client-city">City</Label>
                <Input
                  id="client-city"
                  value={clientFormData.city}
                  onChange={(e) =>
                    setClientFormData({ ...clientFormData, city: e.target.value })
                  }
                  placeholder="City"
                  disabled={creatingClient}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="client-state">State</Label>
                <Input
                  id="client-state"
                  value={clientFormData.state}
                  onChange={(e) =>
                    setClientFormData({ ...clientFormData, state: e.target.value })
                  }
                  placeholder="State/Province"
                  disabled={creatingClient}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="client-zip">ZIP Code</Label>
                <Input
                  id="client-zip"
                  value={clientFormData.zip}
                  onChange={(e) =>
                    setClientFormData({ ...clientFormData, zip: e.target.value })
                  }
                  placeholder="ZIP/Postal code"
                  disabled={creatingClient}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="client-country">Country</Label>
                <Input
                  id="client-country"
                  value={clientFormData.country}
                  onChange={(e) =>
                    setClientFormData({ ...clientFormData, country: e.target.value })
                  }
                  placeholder="Country"
                  disabled={creatingClient}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setClientDialogOpen(false);
                  setClientFormData({
                    name: "",
                    email: "",
                    phone: "",
                    company: "",
                    address: "",
                    city: "",
                    state: "",
                    zip: "",
                    country: "Bangladesh",
                  });
                }}
                disabled={creatingClient}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={creatingClient || !clientFormData.email}>
                {creatingClient ? "Creating..." : "Create Client"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </form>
  );
}
