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
import { FiAlertCircle, FiPlus, FiTrash2, FiCopy } from "react-icons/fi";
import { createGroup, updateGroup } from "../_actions/group.action";
import { 
  convertAreaPriceToLengthPrice, 
  calculateSurfaceArea,
  GROUP_BASE_UNIT_OPTIONS, 
  type LengthUnit 
} from "@/lib/utils/unitConverter";

const groupItemSchema = z.object({
  sl: z.number(),
  code: z.string().optional(),
  description: z.string().optional(),
  height: z.number().optional(),
  width: z.number().optional(),
  depth: z.number().optional(),
  unit: z.string().optional(),
  unitPrice: z.number().min(0),
  amount: z.number().min(0),
  sortOrder: z.number(),
});

const groupFormSchema = z.object({
  code: z.string().optional(),
  description: z.string().optional(),
  sortOrder: z.string().optional(),
  status: z.enum(["active", "inactive"]),
  baseUnit: z.enum(["sqm", "sqft", "rft"]).optional(),
  baseUnitPrice: z.number().min(0).optional(),
  costPrice: z.number().min(0).default(0),
  items: z.array(groupItemSchema).min(1, "At least one item is required"),
});

type GroupFormData = z.infer<typeof groupFormSchema>;
type GroupItem = z.infer<typeof groupItemSchema>;

const GROUP_LENGTH_UNIT_OPTIONS: Array<{ value: LengthUnit; label: string }> = [
  { value: "in", label: "in" },
  { value: "mm", label: "mm" },
  { value: "ft", label: "ft" },
];

interface GroupFormProps {
  mode: "create" | "edit";
  initialData?: {
    id: string;
    code?: string;
    description?: string;
    sortOrder?: number;
    status: string;
    baseUnit?: string;
    baseUnitPrice?: number;
    costPrice?: number;
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
      amount: number;
      sortOrder: number;
    }>;
  };
}

export default function GroupForm({ mode, initialData }: GroupFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(false);

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
          code: initialData.code || "",
          description: initialData.description || "",
          sortOrder: initialData.sortOrder?.toString() || "0",
          status: (initialData.status === "trash" ? "active" : initialData.status) as "active" | "inactive",
          baseUnit: initialData.baseUnit ? (initialData.baseUnit as "sqm" | "sqft" | "rft") : "sqm",
          baseUnitPrice: initialData.baseUnitPrice !== null && initialData.baseUnitPrice !== undefined ? initialData.baseUnitPrice : undefined,
          costPrice: initialData.costPrice !== null && initialData.costPrice !== undefined ? initialData.costPrice : 0,
          items: initialData.items.map((item) => {
            // Recalculate unitPrice if baseUnit and baseUnitPrice are available
            let calculatedUnitPrice = item.unitPrice || 0;
            if (initialData.baseUnit && initialData.baseUnitPrice && initialData.baseUnitPrice > 0 && item.unit) {
              try {
                calculatedUnitPrice = convertAreaPriceToLengthPrice(
                  initialData.baseUnit as "sqm" | "sqft" | "rft",
                  initialData.baseUnitPrice,
                  item.unit as LengthUnit
                );
              } catch (error) {
                console.error("Error calculating initial unit price:", error);
              }
            }
            
            // Calculate amount if we have dimensions
            let calculatedAmount = item.amount || 0;
            if (item.height && item.width && item.depth && item.unit && calculatedUnitPrice > 0) {
              try {
                const surfaceArea = calculateSurfaceArea(
                  item.height,
                  item.width,
                  item.depth,
                  item.unit as LengthUnit
                );
                calculatedAmount = surfaceArea * calculatedUnitPrice;
              } catch (error) {
                console.error("Error calculating initial amount:", error);
              }
            }
            
            return {
              sl: item.sl,
              code: item.code || "",
              description: item.description || "",
              height: item.height,
              width: item.width,
              depth: item.depth,
              unit: item.unit || "",
              unitPrice: calculatedUnitPrice,
              amount: calculatedAmount,
              sortOrder: item.sortOrder,
            };
          }),
        }
      : {
          code: "",
          description: "",
          sortOrder: "0",
          status: "active",
          baseUnit: "sqm",
          baseUnitPrice: undefined,
          costPrice: 0,
          items: [],
        },
  });

  const items = watch("items");
  const baseUnit = watch("baseUnit");
  const baseUnitPrice = watch("baseUnitPrice");
  const hasRecalculatedOnMount = useRef(false);

  // Generate item code from H-W-D dimensions (format: "HH-WW-DD")
  const generateItemCode = (height?: number, width?: number, depth?: number): string => {
    const getFirstTwoDigits = (value?: number): string => {
      if (!value || value <= 0) return "00";
      const str = Math.floor(value).toString();
      return str.length >= 2 ? str.substring(0, 2) : str.padStart(2, "0");
    };

    const h = getFirstTwoDigits(height);
    const w = getFirstTwoDigits(width);
    const d = getFirstTwoDigits(depth);
    
    return `${h}-${w}-${d}`;
  };

  const calculateItemAmount = useCallback((item: GroupItem): number => {
    // If we have dimensions and unit, calculate surface area
    if (item.height && item.width && item.depth && 
        item.height > 0 && item.width > 0 && item.depth > 0 &&
        item.unit) {
      try {
        // Calculate surface area in the unit
        const surfaceArea = calculateSurfaceArea(
          item.height,
          item.width,
          item.depth,
          item.unit as LengthUnit
        );
        
        // Amount = surface area * unit price
        return surfaceArea * item.unitPrice;
      } catch (error) {
        console.error("Error calculating surface area:", error);
        // Fallback to simple calculation
        return item.unitPrice;
      }
    }
    
    // Fallback: simple calculation without surface area
    return item.unitPrice;
  }, []);

  const addItem = () => {
    // Calculate unit price if baseUnit and baseUnitPrice are set
    let initialUnitPrice = 0;
    if (baseUnit && baseUnitPrice && baseUnitPrice > 0) {
      try {
        initialUnitPrice = convertAreaPriceToLengthPrice(
          baseUnit as "sqm" | "sqft" | "rft",
          baseUnitPrice,
          "mm" as LengthUnit
        );
      } catch (error) {
        console.error("Error calculating initial unit price:", error);
      }
    }

    const newItem: GroupItem = {
      sl: items.length + 1,
      height: 1,
      width: 1,
      depth: 1,
      code: generateItemCode(1, 1, 1), // "01-01-01" for new items with default dimensions
      description: "",
      unit: "mm", // Default to mm
      unitPrice: initialUnitPrice,
      amount: 0, // Will be calculated by updateItem when dimensions are set
      sortOrder: items.length,
    };
    
    // Calculate amount with default dimensions
    const itemWithAmount = {
      ...newItem,
      amount: calculateItemAmount(newItem),
    };
    
    setValue("items", [...items, itemWithAmount]);
  };

  const duplicateItem = (index: number) => {
    if (index < 0 || index >= items.length) return;
    
    const itemToDuplicate = items[index];
    const newItem: GroupItem = {
      ...itemToDuplicate,
      sl: items.length + 1,
      sortOrder: items.length,
    };
    
    const updated = [...items, newItem];
    setValue("items", updated);
  };

  const removeItem = (index: number) => {
    const updated = items.filter((_, i) => i !== index);
    updated.forEach((item, i) => {
      item.sl = i + 1;
      item.sortOrder = i;
    });
    setValue("items", updated);
  };

  // Recalculate all items when group's baseUnit or baseUnitPrice changes
  const recalculateAllItems = useCallback(() => {
    const currentBaseUnit = watch("baseUnit");
    const currentBaseUnitPrice = watch("baseUnitPrice");
    const currentItems = watch("items");

    if (!currentBaseUnit || !currentBaseUnitPrice || currentBaseUnitPrice <= 0) {
      return;
    }

    if (!currentItems || currentItems.length === 0) {
      return;
    }

    const updated = currentItems.map((item) => {
      if (!item.unit) return item;

      try {
        // Convert group's base area price to item's unit price
        const calculatedUnitPrice = convertAreaPriceToLengthPrice(
          currentBaseUnit as "sqm" | "sqft" | "rft",
          currentBaseUnitPrice,
          item.unit as LengthUnit
        );
        
        const updatedItem = {
          ...item,
          unitPrice: calculatedUnitPrice,
        };
        
        updatedItem.amount = calculateItemAmount(updatedItem);
        return updatedItem;
      } catch (error) {
        console.error("Error converting unit price:", error);
        return item;
      }
    });

    setValue("items", updated, { shouldDirty: false });
  }, [watch, setValue, calculateItemAmount]);

  // Recalculate items on initial mount if baseUnit and baseUnitPrice are available
  useEffect(() => {
    if (!hasRecalculatedOnMount.current && baseUnit && baseUnitPrice && baseUnitPrice > 0 && items.length > 0) {
      // Use a longer delay on initial mount to ensure form is fully initialized
      const timer = setTimeout(() => {
        recalculateAllItems();
        hasRecalculatedOnMount.current = true;
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [baseUnit, baseUnitPrice, items.length, recalculateAllItems]);

  // Recalculate items on initial mount if baseUnit and baseUnitPrice are available
  useEffect(() => {
    if (!hasRecalculatedOnMount.current && baseUnit && baseUnitPrice && baseUnitPrice > 0 && items.length > 0) {
      // Use a longer delay on initial mount to ensure form is fully initialized
      const timer = setTimeout(() => {
        recalculateAllItems();
        hasRecalculatedOnMount.current = true;
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [baseUnit, baseUnitPrice, items.length, recalculateAllItems]);

  // Watch for changes to baseUnit or baseUnitPrice and recalculate all items
  // This runs after initial mount when values change
  useEffect(() => {
    // Skip if we haven't done initial recalculation yet
    if (!hasRecalculatedOnMount.current) return;
    
    if (baseUnit && baseUnitPrice && baseUnitPrice > 0 && items.length > 0) {
      // Use setTimeout to ensure form state is updated
      const timer = setTimeout(() => {
        recalculateAllItems();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [baseUnit, baseUnitPrice, items.length, recalculateAllItems]);

  const updateItem = (index: number, field: keyof GroupItem, value: unknown) => {
    if (index < 0 || index >= items.length) return;
    
    const updated = [...items];
    const currentItem = updated[index];
    if (!currentItem) return;
    
    updated[index] = { ...currentItem, [field]: value };
    const updatedItem = updated[index];
    
    // Auto-generate code when height, width, or depth changes
    if (field === "height" || field === "width" || field === "depth") {
      updatedItem.code = generateItemCode(
        updatedItem.height,
        updatedItem.width,
        updatedItem.depth
      );
    }
    
    // STEP 1: Convert group's baseUnitPrice to item's unit and set unitPrice
    // This happens when unit changes
    if (field === "unit") {
      if (baseUnit && baseUnitPrice && baseUnitPrice > 0 && updatedItem.unit) {
        try {
          // Convert group's base area price to the same square-unit as the selected unit (sqin/sqmm/sqft)
          const calculatedUnitPrice = convertAreaPriceToLengthPrice(
            baseUnit as "sqm" | "sqft" | "rft",
            baseUnitPrice,
            updatedItem.unit as LengthUnit
          );
          updatedItem.unitPrice = calculatedUnitPrice;
        } catch (error) {
          console.error("Error converting unit price:", error);
        }
      }
    }
    
    // STEP 2: Calculate amount = surface area (in unit) * unitPrice
    // This happens when height, width, depth, unit, unitPrice changes
    if (field === "height" || field === "width" || field === "depth" || field === "unit" || field === "unitPrice") {
      updatedItem.amount = calculateItemAmount(updatedItem);
    }
    
    setValue("items", updated);
  };

  // Watch for changes to group's baseUnit

  const onSubmit = async (data: GroupFormData) => {
    try {
      setError("");
      setLoading(true);

      const submitData = {
        code: data.code || undefined,
        description: data.description || undefined,
        sortOrder: data.sortOrder ? Number(data.sortOrder) : 0,
        status: data.status,
        baseUnit: data.baseUnit || undefined,
        baseUnitPrice: data.baseUnitPrice,
        costPrice: data.costPrice !== undefined && data.costPrice !== null ? Number(data.costPrice) : 0,
        items: data.items.map((item) => ({
          sl: item.sl,
          code: item.code || undefined,
          description: item.description || undefined,
          height: item.height,
          width: item.width,
          depth: item.depth,
          unit: item.unit || undefined,
          unitPrice: item.unitPrice,
          amount: item.amount,
          sortOrder: item.sortOrder,
        })),
      };

      if (mode === "create") {
        const result = await createGroup(submitData);
        if (!result.success) {
          throw new Error(result.error || "Failed to create group");
        }
        router.push("/admin/items/groups");
      } else {
        const result = await updateGroup({
          id: initialData!.id,
          ...submitData,
        });
        if (!result.success) {
          throw new Error(result.error || "Failed to update group");
        }
        router.push("/admin/items/groups");
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

          {/* Top Row: Code, Base Unit, Base Unit Price, Cost Price, Status */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
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

            <div className="space-y-2">
              <Label htmlFor="baseUnit">Base Unit</Label>
              <Controller
                name="baseUnit"
                control={control}
                render={({ field }) => (
                  <Select 
                    value={field.value || "sqm"} 
                    onValueChange={field.onChange}
                    disabled={loading}
                  >
                    <SelectTrigger id="baseUnit">
                      <SelectValue placeholder="Select base unit" />
                    </SelectTrigger>
                    <SelectContent>
                      {GROUP_BASE_UNIT_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="baseUnitPrice">Base Unit Price</Label>
              <Controller
                name="baseUnitPrice"
                control={control}
                render={({ field }) => (
                  <Input
                    id="baseUnitPrice"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={field.value !== undefined && field.value !== null ? field.value : ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      const numVal = val === "" ? undefined : Number(val);
                      field.onChange(numVal);
                    }}
                    disabled={loading}
                  />
                )}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="costPrice">Cost Price</Label>
              <Controller
                name="costPrice"
                control={control}
                render={({ field }) => (
                  <Input
                    id="costPrice"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={field.value !== undefined && field.value !== null ? field.value : ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      const numVal = val === "" ? 0 : Number(val);
                      field.onChange(numVal);
                    }}
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

          {/* Description */}
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
                            placeholder="Auto-generated"
                            disabled={true}
                            readOnly
                            className="w-[150px] bg-muted"
                            title="Code is auto-generated from H-W-D dimensions"
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
                            value={(item.unit as LengthUnit | undefined) || "mm"}
                            onValueChange={(value) => {
                              updateItem(index, "unit", value);
                            }}
                            disabled={loading}
                          >
                            <SelectTrigger className="w-24">
                              <SelectValue placeholder="Unit" />
                            </SelectTrigger>
                            <SelectContent>
                              {GROUP_LENGTH_UNIT_OPTIONS.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
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
                            readOnly
                            title="Calculated from Group Base Unit Price"
                          />
                        </TableCell>
                        <TableCell>
                          <span className="font-medium">{item.amount.toFixed(2)}</span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => duplicateItem(index)}
                              disabled={loading}
                              title="Duplicate item"
                            >
                              <FiCopy className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeItem(index)}
                              disabled={loading}
                              title="Remove item"
                            >
                              <FiTrash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {items.length === 0 && (
              <div className="text-center py-8 text-muted-foreground border rounded-lg">
                No items added. Click &quot;Add Item&quot; to add items to this group.
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

