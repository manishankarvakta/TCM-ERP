"use client";

import { useState, useEffect } from "react";
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
import { FiAlertCircle, FiPlus, FiTrash2, FiSearch } from "react-icons/fi";
import { createGroup, updateGroup } from "../_actions/group.action";
import { getActiveUnits } from "../../_actions/item.action";

const groupItemSchema = z.object({
  sl: z.number(),
  code: z.string().optional(),
  description: z.string().optional(),
  height: z.number().optional(),
  width: z.number().optional(),
  depth: z.number().optional(),
  unit: z.string().optional(),
  unitPrice: z.number().min(0),
  quantity: z.number().min(0),
  unitShutter: z.number().optional(),
  totalShutter: z.number().optional(),
  amount: z.number().min(0),
  note: z.string().optional(),
  sortOrder: z.number(),
  itemId: z.string().optional(),
});

const groupFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  code: z.string().optional(),
  description: z.string().optional(),
  quantity: z.string().optional(),
  number: z.string().optional(),
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
    name: string;
    code?: string;
    description?: string;
    quantity?: number;
    number?: number;
    sortOrder?: number;
    status: string;
    items: Array<{
      id?: string;
      sl: number;
      code?: string;
      description?: string;
      height?: number;
      width?: number;
      depth?: number;
      unit?: string;
      unitPrice: number;
      quantity: number;
      unitShutter?: number;
      totalShutter?: number;
      amount: number;
      note?: string;
      sortOrder: number;
      itemId?: string;
    }>;
  };
}

interface Unit {
  id: string;
  symbol: string;
  details: string;
}

export default function GroupForm({ mode, initialData }: GroupFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(false);
   const [units, setUnits] = useState<Unit[]>([]);
  const [loadingUnits, setLoadingUnits] = useState(true);
  const [unitSearch, setUnitSearch] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors },
    control,
    watch,
    setValue,
  } = useForm<GroupFormData>({
    resolver: zodResolver(groupFormSchema),
    defaultValues: initialData
      ? {
          name: initialData.name,
          code: initialData.code || "",
          description: initialData.description || "",
          quantity: initialData.quantity?.toString() || "",
          number: initialData.number?.toString() || "",
          sortOrder: initialData.sortOrder?.toString() || "0",
          status: (initialData.status === "trash" ? "active" : initialData.status) as "active" | "inactive",
          items: initialData.items.map((item) => ({
            sl: item.sl,
            code: item.code || "",
            description: item.description || "",
            height: item.height,
            width: item.width,
            depth: item.depth,
            unit: item.unit || "",
            unitPrice: item.unitPrice,
            quantity: item.quantity,
            unitShutter: item.unitShutter,
            totalShutter: item.totalShutter,
            amount: item.amount,
            note: item.note || "",
            sortOrder: item.sortOrder,
            itemId: item.itemId || "",
          })),
        }
      : {
          name: "",
          code: "",
          description: "",
          quantity: "",
          number: "",
          sortOrder: "0",
          status: "active",
          items: [],
        },
  });

  const items = watch("items");

  useEffect(() => {
    async function loadUnits() {
      try {
        const result = await getActiveUnits();
        if (result.success && result.units) {
          setUnits(result.units);
        }
      } catch (err) {
        console.error("Failed to load units:", err);
      } finally {
        setLoadingUnits(false);
      }
    }
    loadUnits();
  }, []);

  const calculateItemAmount = (item: GroupItem): number => {
    if (item.height && item.width && item.depth && item.height > 0 && item.width > 0 && item.depth > 0) {
      return item.height * item.width * item.depth * item.unitPrice * item.quantity;
    }
    return item.unitPrice * item.quantity;
  };

  const addItem = () => {
    const newItem: GroupItem = {
      sl: items.length + 1,
      code: "",
      description: "",
      unitPrice: 0,
      quantity: 1,
      amount: 0,
      sortOrder: items.length,
      itemId: "",
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
    
    // Calculate amount when relevant fields change
    if (field === "height" || field === "width" || field === "depth" || field === "unitPrice" || field === "quantity") {
      updated[index].amount = calculateItemAmount(updated[index]);
    }
    
    setValue("items", updated);
  };

  const onSubmit = async (data: GroupFormData) => {
    try {
      setError("");
      setLoading(true);

      const submitData = {
        name: data.name,
        code: data.code || undefined,
        description: data.description || undefined,
        quantity: data.quantity ? Number(data.quantity) : undefined,
        number: data.number ? Number(data.number) : undefined,
        sortOrder: data.sortOrder ? Number(data.sortOrder) : 0,
        status: data.status,
        items: data.items.map((item) => ({
          sl: item.sl,
          code: item.code || undefined,
          description: item.description || undefined,
          height: item.height,
          width: item.width,
          depth: item.depth,
          unit: item.unit || undefined,
          unitPrice: item.unitPrice,
          quantity: item.quantity,
          unitShutter: item.unitShutter,
          totalShutter: item.totalShutter,
          amount: item.amount,
          note: item.note || undefined,
          sortOrder: item.sortOrder,
          itemId: item.itemId || undefined,
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
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{mode === "create" ? "Create Group" : "Edit Group"}</CardTitle>
          <CardDescription>
            {mode === "create"
              ? "Create a new group template that can be used in quotations"
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                type="text"
                placeholder="Group Name"
                {...register("name")}
                disabled={loading}
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="code">Code</Label>
              <Input
                id="code"
                type="text"
                placeholder="Optional code"
                {...register("code")}
                disabled={loading}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Group description"
              {...register("description")}
              disabled={loading}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                type="number"
                step="0.01"
                placeholder="0.00"
                {...register("quantity")}
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="number">Number</Label>
              <Input
                id="number"
                type="number"
                placeholder="0"
                {...register("number")}
                disabled={loading}
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

          {/* Items Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Items *</Label>
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

            {items.length > 0 && (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">SL</TableHead>
                      <TableHead>Code</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>H</TableHead>
                      <TableHead>W</TableHead>
                      <TableHead>D</TableHead>
                      <TableHead>Unit</TableHead>
                      <TableHead>Unit Price</TableHead>
                      <TableHead>Qty</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>{item.sl}</TableCell>
                        <TableCell>
                          <Input
                            value={item.code || ""}
                            onChange={(e) => updateItem(index, "code", e.target.value)}
                            placeholder="Code"
                            disabled={loading}
                            className="w-[150px]"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={item.description || ""}
                            onChange={(e) => updateItem(index, "description", e.target.value)}
                            placeholder="Description"
                            disabled={loading}
                            className="w-[200px]"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="0.01"
                            value={item.height || ""}
                            onChange={(e) => updateItem(index, "height", e.target.value ? Number(e.target.value) : undefined)}
                            placeholder="H"
                            disabled={loading}
                            className="w-20"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="0.01"
                            value={item.width || ""}
                            onChange={(e) => updateItem(index, "width", e.target.value ? Number(e.target.value) : undefined)}
                            placeholder="W"
                            disabled={loading}
                            className="w-20"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="0.01"
                            value={item.depth || ""}
                            onChange={(e) => updateItem(index, "depth", e.target.value ? Number(e.target.value) : undefined)}
                            placeholder="D"
                            disabled={loading}
                            className="w-20"
                          />
                        </TableCell>
                        <TableCell>
                          <Select
                            value={
                              units.find((u) => u.symbol === item.unit)?.id || ""
                            }
                            onValueChange={(value) => {
                              const selectedUnit = units.find((u) => u.id === value);
                              updateItem(index, "unit", selectedUnit ? selectedUnit.symbol : "");
                              setUnitSearch(""); // Clear search on selection
                            }}
                            disabled={loading || loadingUnits}
                          >
                            <SelectTrigger className="w-24">
                              <SelectValue placeholder="Unit" />
                            </SelectTrigger>
                            <SelectContent className="max-h-[300px]">
                              <div className="p-2 border-b">
                                <div className="relative">
                                  <FiSearch className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                  <Input
                                    placeholder="Search units..."
                                    value={unitSearch}
                                    onChange={(e) => {
                                      e.stopPropagation();
                                      setUnitSearch(e.target.value);
                                    }}
                                    onKeyDown={(e) => {
                                      e.stopPropagation();
                                      if (e.key === "Enter") {
                                        e.preventDefault();
                                      }
                                    }}
                                    className="pl-8"
                                    onClick={(e) => e.stopPropagation()}
                                  />
                                </div>
                              </div>
                              <div className="max-h-[200px] overflow-y-auto">
                                {units
                                  .filter((unit) =>
                                    unitSearch
                                      ? unit.symbol.toLowerCase().includes(unitSearch.toLowerCase()) ||
                                        unit.details.toLowerCase().includes(unitSearch.toLowerCase())
                                      : true
                                  )
                                  .map((unit) => (
                                    <SelectItem key={unit.id} value={unit.id}>
                                      {unit.symbol} - {unit.details}
                                    </SelectItem>
                                  ))}
                                {units.filter((unit) =>
                                  unitSearch
                                    ? unit.symbol.toLowerCase().includes(unitSearch.toLowerCase()) ||
                                      unit.details.toLowerCase().includes(unitSearch.toLowerCase())
                                    : true
                                ).length === 0 && (
                                  <div className="px-2 py-1.5 text-sm text-muted-foreground text-center">
                                    No units found
                                  </div>
                                )}
                              </div>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="0.01"
                            value={item.unitPrice}
                            onChange={(e) => updateItem(index, "unitPrice", Number(e.target.value))}
                            placeholder="0.00"
                            disabled={loading}
                            className="w-24"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="0.01"
                            value={item.quantity}
                            onChange={(e) => updateItem(index, "quantity", Number(e.target.value))}
                            placeholder="1"
                            disabled={loading}
                            className="w-20"
                          />
                        </TableCell>
                        <TableCell>
                          <span className="font-medium">{item.amount.toFixed(2)}</span>
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
                  </TableBody>
                </Table>
              </div>
            )}

            {items.length === 0 && (
              <div className="text-center py-8 text-muted-foreground border rounded-lg">
                No items added. Click "Add Item" to add items to this group.
              </div>
            )}

            {errors.items && (
              <p className="text-sm text-destructive">{errors.items.message}</p>
            )}
          </div>

          <div className="flex justify-end gap-4 pt-4 border-t">
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

