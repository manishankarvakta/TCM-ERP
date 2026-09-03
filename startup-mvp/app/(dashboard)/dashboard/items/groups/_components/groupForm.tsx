"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FiAlertCircle, FiPlus, FiTrash2, FiCopy, FiSearch } from "react-icons/fi";
import { createGroup, updateGroup } from "../_actions/group.action";
import { useCatalogData } from "@/hooks/useCatalogData";
import { formatCurrency } from "@/lib/utils/formatters";

const groupItemSchema = z.object({
  id: z.string().optional(),
  sl: z.number(),
  itemId: z.string().min(1, "Item is required"),
  quantity: z.number().min(0.01, "Quantity must be greater than 0"),
  unitPrice: z.number().optional().nullable(),
  amount: z.number().optional().nullable(),
  sortOrder: z.number(),
  // For display purposes
  code: z.string().optional(),
  description: z.string().optional(),
  unit: z.string().optional(),
});

const groupFormSchema = z.object({
  code: z.string().optional(),
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  type: z.string().default("Combo"),
  price: z.number().min(0).default(0),
  sortOrder: z.string().optional(),
  status: z.enum(["active", "inactive"]),
  items: z.array(groupItemSchema).min(1, "At least one item is required"),
});

type GroupFormData = z.infer<typeof groupFormSchema>;
type GroupItem = z.infer<typeof groupItemSchema>;

interface GroupFormProps {
  mode: "create" | "edit";
  initialData?: {
    id: string;
    code?: string;
    name: string;
    description?: string;
    type: string;
    price: number;
    sortOrder?: number;
    status: string;
    items: Array<{
      id?: string;
      sl: number;
      itemId: string;
      code?: string;
      description?: string;
      unit?: string;
      quantity: number;
      unitPrice?: number;
      amount?: number;
      sortOrder: number;
    }>;
  };
}

export default function GroupForm({ mode, initialData }: GroupFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const { items: catalogItems, isLoading: isCatalogLoading } = useCatalogData();
  const [itemSearch, setItemSearch] = useState<{ [key: number]: string }>({});

  const {
    register,
    handleSubmit,
    formState: { errors },
    control,
    watch,
    setValue,
  } = useForm<GroupFormData>({
// @ts-expect-error - Legacy compatibility
    resolver: zodResolver(groupFormSchema),
    defaultValues: initialData
      ? {
          code: initialData.code || "",
          name: initialData.name,
          description: initialData.description || "",
          type: initialData.type || "Combo",
          price: initialData.price || 0,
          sortOrder: initialData.sortOrder?.toString() || "0",
          status: (initialData.status === "trash" ? "active" : initialData.status) as "active" | "inactive",
          items: initialData.items.map((item) => ({
            id: item.id,
            sl: item.sl,
            itemId: item.itemId,
            code: item.code,
            description: item.description,
            unit: item.unit,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            amount: item.amount,
            sortOrder: item.sortOrder,
          })),
        }
      : {
          code: "",
          name: "",
          description: "",
          type: "Combo",
          price: 0,
          sortOrder: "0",
          status: "active",
          items: [],
        },
  });

  const items = watch("items");

  const addItem = () => {
    const newItem: GroupItem = {
      sl: items.length + 1,
      itemId: "",
      quantity: 1,
      unitPrice: null,
      amount: null,
      sortOrder: items.length,
    };
    setValue("items", [...items, newItem]);
  };

  const removeItem = (index: number) => {
    const updated = items.filter((_, i) => i !== index);
    updated.forEach((item, i) => {
      item.sl = i + 1;
      item.sortOrder = i;
    });
    setValue("items", updated);
  };

  const updateItem = (index: number, field: keyof GroupItem, value: any) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };

    // If itemId changed, update other item details from catalog
    if (field === "itemId" && value) {
      const selectedCatalogItem = catalogItems.find(i => i.id === value);
      if (selectedCatalogItem) {
        updated[index].code = selectedCatalogItem.code;
        updated[index].description = selectedCatalogItem.description;
        updated[index].unit = selectedCatalogItem.unit?.symbol || "";
        // If no unitPrice set, use catalog's unitPrice
        if (!updated[index].unitPrice) {
          updated[index].unitPrice = selectedCatalogItem.unitPrice;
        }
      }
    }

    // Recalculate amount if quantity or unitPrice changed
    if (field === "quantity" || field === "unitPrice" || field === "itemId") {
      const quantity = updated[index].quantity || 0;
      const unitPrice = updated[index].unitPrice || 0;
      updated[index].amount = quantity * unitPrice;
    }

    setValue("items", updated);
  };

  const onSubmit = async (data: GroupFormData) => {
    try {
      setError("");
      setLoading(true);

      const submitData = {
        code: data.code || undefined,
        name: data.name,
        description: data.description || undefined,
        type: data.type,
        price: data.price,
        sortOrder: data.sortOrder ? Number(data.sortOrder) : 0,
        status: data.status,
        items: data.items.map((item) => ({
          sl: item.sl,
          itemId: item.itemId,
          quantity: item.quantity,
          unitPrice: item.unitPrice || undefined,
          amount: item.amount || undefined,
          sortOrder: item.sortOrder,
        })),
      };

      if (mode === "create") {
        const result = await createGroup(submitData);
        if (!result.success) {
          throw new Error(result.error || "Failed to create group");
        }
        router.push("/dashboard/items/groups");
      } else {
        const result = await updateGroup({
          id: initialData!.id,
          ...submitData,
        });
        if (!result.success) {
          throw new Error(result.error || "Failed to update group");
        }
        router.push("/dashboard/items/groups");
      }
    } catch (err: any) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
// @ts-expect-error - Legacy compatibility
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{mode === "create" ? "Create Group" : "Edit Group"}</CardTitle>
          <CardDescription>
            {mode === "create"
              ? "Create a new combo or offer group template"
              : "Update the group information"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <div className="flex items-start gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive border border-destructive/20">
              <FiAlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
          <div className="w-full">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                {...register("name")}
                placeholder="Group name"
                disabled={loading}
              />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>

          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

            <div className="space-y-2">
              <Label htmlFor="code">Code</Label>
              <Input
                id="code"
                {...register("code")}
                placeholder="Optional code"
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Type</Label>
              <Controller
                name="type"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange} disabled={loading}>
                    <SelectTrigger id="type">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Combo">Combo</SelectItem>
                      <SelectItem value="Offer">Offer</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="price">Price *</Label>
              <Controller
                name="price"
                control={control}
                render={({ field }) => (
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    value={field.value}
                    onChange={(e) => field.onChange(Number(e.target.value))}
                    disabled={loading}
                  />
                )}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Controller
                name="status"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange} disabled={loading}>
                    <SelectTrigger id="status">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              {...register("description")}
              placeholder="Group description"
              disabled={loading}
              rows={3}
            />
          </div>

          {/* Items Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-lg font-semibold">Items *</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addItem}
                disabled={loading}
              >
                <FiPlus className="mr-2 h-4 w-4" />
                Add Item
              </Button>
            </div>

            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">SL</TableHead>
                    <TableHead className="w-[300px]">Item</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Unit Price</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell>{item.sl}</TableCell>
                      <TableCell>
                        <Select
                          value={item.itemId || "none"}
                          onValueChange={(val) => updateItem(index, "itemId", val === "none" ? "" : val)}
                          disabled={loading || isCatalogLoading}
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue placeholder={isCatalogLoading ? "Loading..." : "Select item"}>
                              {item.itemId ? (
                                <div className="flex flex-col text-left">
                                  <span className="font-medium">{item.code}</span>
                                  <span className="text-[10px] text-muted-foreground truncate max-w-[200px]">
                                    {item.description}
                                  </span>
                                </div>
                              ) : "Select item"}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent className="max-h-[300px]">
                            <div className="p-2 border-b">
                              <div className="relative">
                                <FiSearch className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                  placeholder="Search items..."
                                  value={itemSearch[index] || ""}
                                  onChange={(e) => {
                                    e.stopPropagation();
                                    setItemSearch({ ...itemSearch, [index]: e.target.value });
                                  }}
                                  className="pl-8 h-8 text-xs font-normal"
                                  onClick={(e) => e.stopPropagation()}
                                />
                              </div>
                            </div>
                            <SelectItem value="none">Select an item</SelectItem>
                            {catalogItems
                              .filter(ci => 
                                !itemSearch[index] || 
                                ci.code.toLowerCase().includes(itemSearch[index].toLowerCase()) ||
                                ci.description.toLowerCase().includes(itemSearch[index].toLowerCase())
                              )
                              .map((ci) => (
                                <SelectItem key={ci.id} value={ci.id}>
                                  <div className="flex flex-col">
                                    <span className="font-medium">{ci.code}</span>
                                    <span className="text-xs text-muted-foreground truncate max-w-[250px]">
                                      {ci.description}
                                    </span>
                                  </div>
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="0.01"
                          value={item.quantity}
                          onChange={(e) => updateItem(index, "quantity", Number(e.target.value))}
                          className="h-9 w-24"
                          disabled={loading}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="0.01"
                          value={item.unitPrice || 0}
                          onChange={(e) => updateItem(index, "unitPrice", Number(e.target.value))}
                          className="h-9 w-32"
                          disabled={loading}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="font-semibold h-9 flex items-center">
                          {formatCurrency(item.amount || 0)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeItem(index)}
                          disabled={loading}
                        >
                          <FiTrash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {items.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No items added yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            {errors.items && <p className="text-sm text-destructive">{errors.items.message}</p>}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : mode === "create" ? "Create Group" : "Update Group"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
