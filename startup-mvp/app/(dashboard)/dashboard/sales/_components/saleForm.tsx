"use client";

import { useState, useMemo, useEffect } from "react";
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
import { FiAlertCircle, FiPlus, FiTrash2, FiUserPlus } from "react-icons/fi";
import { createSale, updateSale } from "../_actions/sale.action";
import { createClient } from "@/app/(dashboard)/dashboard/clients/_actions/client.action";
import { SaleStatus } from "@prisma/client";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

// Redux imports
import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch, RootState } from "@/lib/store";
import {
  setSaleItem,
  setSaleItemQuantity,
  setSaleItemUnitPrice,
  setSaleItemDescription,
  addSaleItem,
  removeSaleItem,
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
    email: string;
    company: string | null;
  }>;
  items: Array<{
    id: string;
    code: string;
    description: string;
    unitPrice: number;
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
    resolver: zodResolver(saleFormSchema),
    defaultValues: initialData
      ? {
          clientId: initialData.client.id,
          warehouseId: initialData.warehouse.id,
          date: defaultDate,
          status: initialData.status,
          notes: initialData.notes || "",
          attachmentUrl: initialData.attachmentUrl || "",
          discount: initialData.discount ?? 0,
          tax: initialData.tax ?? 0,
          items: defaultItems,
        }
      : {
          clientId: "",
          warehouseId: "",
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

  // Use useWatch for better reactivity
  const watchedItems = useWatch({ control, name: "items" }) || [];
  const watchedDiscount = useWatch({ control, name: "discount" }) || 0;
  const watchedTax = useWatch({ control, name: "tax" }) || 0;

  // Recalculate subtotal whenever items change
  const subTotal = useMemo(() => {
    if (!watchedItems || watchedItems.length === 0) return 0;
    return watchedItems.reduce((sum, item) => {
      const amount = Number(item?.amount) || 0;
      return sum + amount;
    }, 0);
  }, [watchedItems]);

  const grandTotal = useMemo(() => {
    const discount = Number(watchedDiscount) || 0;
    const tax = Number(watchedTax) || 0;
    return subTotal - discount + tax;
  }, [subTotal, watchedDiscount, watchedTax]);

  // Auto-calculate tax when subtotal changes and auto tax is enabled
  useEffect(() => {
    if (autoTaxEnabled) {
      const calculatedTax = subTotal * 0.15;
      setValue("tax", calculatedTax);
    }
  }, [subTotal, autoTaxEnabled, setValue]);

  const updateAmount = (index: number) => {
    const quantity = Number(getValues(`items.${index}.quantity`) || 0);
    const unitPrice = Number(getValues(`items.${index}.unitPrice`) || 0);
    const amount = Number.isFinite(quantity * unitPrice) ? quantity * unitPrice : 0;
    setValue(`items.${index}.amount`, amount, { shouldValidate: true, shouldDirty: true });
    // Force form to update watched values
    trigger(`items.${index}.amount`);
  };

  const onSubmit = async (data: SaleFormData) => {
    setError("");
    setLoading(true);

    try {
      let result;
      if (mode === "create") {
        result = await createSale(data);
      } else {
        if (!initialData) {
          setError("Initial data is required for edit mode");
          setLoading(false);
          return;
        }
        result = await updateSale({ ...data, id: initialData.id });
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
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
          <CardDescription>Add items to this sale (Finished Goods and Retail only)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Sale Items</h3>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                append({
                  itemId: "",
                  description: "",
                  quantity: 1,
                  unitPrice: 0,
                  amount: 0,
                })
              }
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
                  <th className="text-right px-3 py-2">Qty</th>
                  <th className="text-right px-3 py-2">Unit Price</th>
                  <th className="text-right px-3 py-2">Amount</th>
                  <th className="text-right px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {fields.map((field, index) => (
                  <tr key={field.id} className="border-t">
                    <td className="px-3 py-2 align-top min-w-[180px]">
                      <Select
                        defaultValue={getValues(`items.${index}.itemId`) || ""}
                        onValueChange={(value) => {
                          setValue(`items.${index}.itemId`, value);
                          const selectedItem = items.find((item) => item.id === value);
                          if (selectedItem) {
                            setValue(`items.${index}.description`, selectedItem.description);
                            setValue(`items.${index}.unitPrice`, selectedItem.unitPrice);
                            updateAmount(index);
                          }
                        }}
                        disabled={loading}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select item" />
                        </SelectTrigger>
                        <SelectContent>
                          {items.map((item) => (
                            <SelectItem key={item.id} value={item.id}>
                              {item.code} - {item.description}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
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
                      <Input
                        type="number"
                        step="0.01"
                        className="text-right"
                        {...register(`items.${index}.quantity`, {
                          valueAsNumber: true,
                          onChange: () => updateAmount(index),
                        })}
                        disabled={loading}
                      />
                      {errors.items?.[index]?.quantity && (
                        <p className="text-xs text-destructive mt-1">
                          {errors.items[index]?.quantity?.message}
                        </p>
                      )}
                    </td>
                    <td className="px-3 py-2 align-top text-right">
                      <Input
                        type="number"
                        step="0.01"
                        className="text-right"
                        {...register(`items.${index}.unitPrice`, {
                          valueAsNumber: true,
                          onChange: () => updateAmount(index),
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
                      <Controller
                        name={`items.${index}.amount`}
                        control={control}
                        render={({ field }) => (
                          <Input
                            type="number"
                            step="0.01"
                            className="text-right"
                            {...field}
                            value={field.value || 0}
                            disabled
                          />
                        )}
                      />
                    </td>
                    <td className="px-3 py-2 align-top text-right">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => remove(index)}
                        disabled={loading || fields.length === 1}
                      >
                        <FiTrash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </td>
                  </tr>
                ))}
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
                step="0.01"
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
                  step="0.01"
                  {...register("tax", { 
                    valueAsNumber: true,
                    onChange: (e) => {
                      // If user manually changes tax, disable auto tax
                      const value = Number(e.target.value) || 0;
                      setValue("tax", value);
                      if (autoTaxEnabled && value !== subTotal * 0.15) {
                        setAutoTaxEnabled(false);
                      }
                    }
                  })}
                  disabled={loading || autoTaxEnabled}
                  placeholder={autoTaxEnabled ? "Auto: 15% of subtotal" : "Enter tax amount"}
                />
                <Button
                  type="button"
                  variant={autoTaxEnabled ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    if (autoTaxEnabled) {
                      // Disable auto tax and reset to 0
                      setAutoTaxEnabled(false);
                      setValue("tax", 0);
                    } else {
                      // Enable auto tax and calculate
                      setAutoTaxEnabled(true);
                      const calculatedTax = subTotal * 0.15;
                      setValue("tax", calculatedTax);
                    }
                  }}
                  disabled={loading}
                >
                  {autoTaxEnabled ? "Auto 15% ✓" : "Auto 15%"}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                {autoTaxEnabled 
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
