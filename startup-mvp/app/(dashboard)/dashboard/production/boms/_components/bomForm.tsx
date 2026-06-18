"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useFieldArray, useForm, Controller } from "react-hook-form";
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
import { FiAlertCircle, FiPlus, FiTrash2 } from "react-icons/fi";
import { createBOM, updateBOM } from "../_actions/bom.action";

const bomItemSchema = z.object({
  itemId: z.string().min(1, "Raw material is required"),
  quantityRequired: z.coerce.number().positive("Quantity must be greater than 0"),
});

const bomFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional().nullable(),
  itemId: z.string().min(1, "Finished good is required"),
  quantityPerUnit: z.coerce.number().positive("Quantity per unit must be greater than 0"),
  status: z.enum(["active", "inactive"]),
  items: z.array(bomItemSchema).min(1, "At least one raw material item is required"),
}).refine((data) => {
  // Check for duplicate raw materials
  const itemIds = data.items.map((item) => item.itemId);
  const uniqueIds = new Set(itemIds);
  return uniqueIds.size === itemIds.length;
}, {
  message: "Duplicate raw materials are not allowed",
  path: ["items"],
});

type BOMFormData = z.infer<typeof bomFormSchema>;

interface FinishedGood {
  id: string;
  name: string;
  code: string;
  unit: {
    symbol: string;
  };
}

interface RawMaterial {
  id: string;
  name: string;
  code: string;
  unit: {
    symbol: string;
  };
  costPrice: any;
}

interface BOMFormProps {
  mode: "create" | "edit";
  initialData?: {
    id: string;
    code: string;
    name: string;
    description: string | null;
    itemId: string;
    quantityPerUnit: number;
    status: string;
    items: Array<{
      id: string;
      itemId: string;
      quantityRequired: number;
    }>;
  };
  finishedGoods: FinishedGood[];
  rawMaterials: RawMaterial[];
}

export default function BOMForm({
  mode,
  initialData,
  finishedGoods,
  rawMaterials,
}: BOMFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const defaultItems =
    initialData?.items.map((item) => ({
      itemId: item.itemId,
      quantityRequired: item.quantityRequired,
    })) || [
      {
        itemId: "",
        quantityRequired: 1,
      },
    ];

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
    setValue,
    getValues,
    watch,
  } = useForm<BOMFormData>({
    resolver: zodResolver(bomFormSchema) as any,
    defaultValues: initialData
      ? {
          name: initialData.name,
          description: initialData.description || "",
          itemId: initialData.itemId,
          quantityPerUnit: initialData.quantityPerUnit,
          status: (initialData.status === "active" || initialData.status === "inactive")
            ? (initialData.status as "active" | "inactive")
            : "active",
          items: defaultItems,
        }
      : {
          name: "",
          description: "",
          itemId: "",
          quantityPerUnit: 1,
          status: "active",
          items: defaultItems,
        },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "items",
  });

  const watchedItems = watch("items");
  const watchedQuantityPerUnit = watch("quantityPerUnit") || 1;

  // Calculate total raw material cost (optional display)
  const totalCost = useMemo(() => {
    return watchedItems.reduce((sum, item) => {
      const rawMaterial = rawMaterials.find((rm) => rm.id === item.itemId);
      if (rawMaterial && item.quantityRequired) {
        return sum + (rawMaterial.costPrice * Number(item.quantityRequired));
      }
      return sum;
    }, 0);
  }, [watchedItems, rawMaterials]);

  const onSubmit = async (data: BOMFormData) => {
    try {
      setLoading(true);
      setError("");

      if (mode === "create") {
        const result = await createBOM({
          name: data.name,
          description: data.description || undefined,
          itemId: data.itemId,
          quantityPerUnit: data.quantityPerUnit,
          status: data.status,
          items: data.items.map((item) => ({
            itemId: item.itemId,
            quantityRequired: item.quantityRequired,
          })),
        });

        if (!result.success) {
          throw new Error(result.error || "Failed to create BOM");
        }

        router.push("/dashboard/production/boms");
        router.refresh();
      } else {
        const result = await updateBOM({
          id: initialData!.id,
          name: data.name,
          description: data.description || undefined,
          itemId: data.itemId,
          quantityPerUnit: data.quantityPerUnit,
          status: data.status,
          items: data.items.map((item) => ({
            itemId: item.itemId,
            quantityRequired: item.quantityRequired,
          })),
        });

        if (!result.success) {
          throw new Error(result.error || "Failed to update BOM");
        }

        router.push("/dashboard/production/boms");
        router.refresh();
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const selectedFG = finishedGoods.find((fg) => fg.id === watch("itemId"));

  return (
    <div className="w-full">
      <Card>
        <CardHeader>
          <CardTitle>{mode === "create" ? "Create Bill of Materials" : "Edit Bill of Materials"}</CardTitle>
          <CardDescription>
            {mode === "create"
              ? "Define the recipe for producing a finished good"
              : "Update the BOM recipe"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-6">
            {error && (
              <div className="flex items-start gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive border border-destructive/20">
                <FiAlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">BOM Name *</Label>
                <Input
                  id="name"
                  placeholder="e.g., Classic White T-shirt Recipe"
                  {...register("name")}
                  disabled={loading}
                />
                {errors.name && (
                  <p className="text-sm text-destructive">{errors.name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="itemId">Ready Product *</Label>
                <Controller
                  name="itemId"
                  control={control}
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={loading}
                    >
                      <SelectTrigger id="itemId">
                        <SelectValue placeholder="Select finished good" />
                      </SelectTrigger>
                      <SelectContent>
                        {finishedGoods.map((fg) => (
                          <SelectItem key={fg.id} value={fg.id}>
                            {fg.name} ({fg.code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.itemId && (
                  <p className="text-sm text-destructive">{errors.itemId.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="quantityPerUnit">Quantity Per Unit *</Label>
                <Input
                  id="quantityPerUnit"
                  type="number"
                  step="1"
                  placeholder="e.g., 10"
                  {...register("quantityPerUnit", { valueAsNumber: true })}
                  disabled={loading}
                />
                {errors.quantityPerUnit && (
                  <p className="text-sm text-destructive">{errors.quantityPerUnit.message}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Quantity of {selectedFG?.name || "finished good"} produced per BOM unit
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status *</Label>
                <Controller
                  name="status"
                  control={control}
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={loading}
                    >
                      <SelectTrigger id="status">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.status && (
                  <p className="text-sm text-destructive">{errors.status.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Optional description..."
                {...register("description")}
                disabled={loading}
                rows={3}
              />
              {errors.description && (
                <p className="text-sm text-destructive">{errors.description.message}</p>
              )}
            </div>

            {/* BOM Items Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Raw Materials *</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => append({ itemId: "", quantityRequired: 1 })}
                  disabled={loading}
                >
                  <FiPlus className="mr-2 h-4 w-4" />
                  Add Raw Material
                </Button>
              </div>

              {errors.items && typeof errors.items === "object" && "message" in errors.items && (
                <p className="text-sm text-destructive">{errors.items.message as string}</p>
              )}

              <div className="space-y-3">
                {fields.map((field, index) => {
                  const itemError = errors.items?.[index];
                  const selectedRM = rawMaterials.find(
                    (rm) => rm.id === getValues(`items.${index}.itemId`)
                  );

                  return (
                    <div
                      key={field.id}
                      className="flex items-start gap-3 p-4 border rounded-lg"
                    >
                      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label>Raw Material *</Label>
                          <Controller
                            name={`items.${index}.itemId`}
                            control={control}
                            render={({ field }) => (
                              <Select
                                value={field.value}
                                onValueChange={field.onChange}
                                disabled={loading}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select raw material" />
                                </SelectTrigger>
                                <SelectContent>
                                  {rawMaterials.map((rm) => (
                                    <SelectItem key={rm.id} value={rm.id}>
                                      {rm.name} ({rm.code}) - {rm.unit.symbol}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                          />
                          {itemError?.itemId && (
                            <p className="text-sm text-destructive">
                              {itemError.itemId.message}
                            </p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label>Quantity Required *</Label>
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              step="1"
                              placeholder="0.00"
                              {...register(`items.${index}.quantityRequired`, {
                                valueAsNumber: true,
                              })}
                              disabled={loading}
                              className="flex-1"
                            />
                            {selectedRM && (
                              <span className="text-sm text-muted-foreground whitespace-nowrap">
                                {selectedRM.unit.symbol}
                              </span>
                            )}
                          </div>
                          {itemError?.quantityRequired && (
                            <p className="text-sm text-destructive">
                              {itemError.quantityRequired.message}
                            </p>
                          )}
                          {selectedRM && (
                            <p className="text-xs text-muted-foreground">
                              Cost: ৳{selectedRM.costPrice.toLocaleString("en-BD", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })} per {selectedRM.unit.symbol}
                            </p>
                          )}
                        </div>
                      </div>

                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => remove(index)}
                        disabled={loading || fields.length === 1}
                        className="mt-8"
                      >
                        <FiTrash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  );
                })}
              </div>

              {/* Total Cost Display */}
              {totalCost > 0 && (
                <div className="p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Total Raw Material Cost:</span>
                    <span className="text-lg font-semibold">
                      ৳{totalCost.toLocaleString("en-BD", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                  {selectedFG && watchedQuantityPerUnit > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Cost per {selectedFG.name}: ৳
                      {(totalCost / watchedQuantityPerUnit).toLocaleString("en-BD", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 pt-4">
              <Button type="submit" disabled={loading}>
                {loading ? (mode === "create" ? "Creating..." : "Updating...") : mode === "create" ? "Create BOM" : "Update BOM"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={loading}
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
