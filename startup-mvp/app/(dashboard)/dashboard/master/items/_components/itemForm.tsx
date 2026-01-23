"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
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
import { Checkbox } from "@/components/ui/checkbox";
import { FiAlertCircle } from "react-icons/fi";
import { createItem, updateItem, getActiveCategories, getActiveUnits } from "../_actions/item.action";
import { ItemType } from "@prisma/client";
import MediaSelector from "@/components/MediaSelector";

const itemFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  itemType: z.enum(["RAW_MATERIAL", "FINISHED_GOOD", "RETAIL"]),
  categoryId: z.string().optional().nullable(),
  unitId: z.string().min(1, "Unit is required"),
  costPrice: z.number().min(0, "Cost price must be >= 0"),
  salesPrice: z.number().min(0, "Sales price must be >= 0").optional().nullable(),
  trackInventory: z.boolean().default(false),
  image: z.string().optional().nullable().or(z.literal("")).refine((val) => {
    if (!val || val === "") return true;
    try {
      new URL(val);
      return true;
    } catch {
      return false;
    }
  }, {
    message: "Invalid URL",
  }),
  status: z.enum(["active", "inactive"]),
}).refine((data) => {
  // Sales price required for FINISHED_GOOD and RETAIL
  if ((data.itemType === "FINISHED_GOOD" || data.itemType === "RETAIL") && (!data.salesPrice || data.salesPrice <= 0)) {
    return false;
  }
  return true;
}, {
  message: "Sales price is required for Finished Goods and Retail items",
  path: ["salesPrice"],
});

type ItemFormData = z.infer<typeof itemFormSchema>;

interface ItemFormProps {
  mode: "create" | "edit";
  initialData?: {
    id: string;
    code: string;
    name: string;
    description: string | null;
    itemType: ItemType;
    categoryId: string | null;
    unitId: string;
    costPrice: number;
    salesPrice: number | null;
    trackInventory: boolean;
    image: string | null;
    status: string;
  };
}

interface Category {
  id: string;
  name: string;
  description: string | null;
}

interface Unit {
  id: string;
  symbol: string;
  details: string;
}

export default function ItemForm({ mode, initialData }: ItemFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  const {
    register,
    handleSubmit,
    formState: { errors },
    control,
    watch,
    setValue,
  } = useForm<ItemFormData>({
    resolver: zodResolver(itemFormSchema),
    defaultValues: initialData
      ? {
          name: initialData.name,
          description: initialData.description || "",
          itemType: initialData.itemType,
          categoryId: initialData.categoryId || null,
          unitId: initialData.unitId,
          costPrice: Number(initialData.costPrice),
          salesPrice: initialData.salesPrice ? Number(initialData.salesPrice) : null,
          trackInventory: initialData.trackInventory,
          image: initialData.image || "",
          status: (initialData.status === "active" || initialData.status === "inactive") 
            ? initialData.status as "active" | "inactive"
            : "active",
        }
      : {
          name: "",
          description: "",
          itemType: "RAW_MATERIAL",
          categoryId: null,
          unitId: "",
          costPrice: 0,
          salesPrice: null,
          trackInventory: false,
          image: "",
          status: "active",
        },
  });

  const watchedItemType = watch("itemType");

  // Fetch categories and units
  useEffect(() => {
    async function fetchData() {
      try {
        const [categoriesResult, unitsResult] = await Promise.all([
          getActiveCategories(),
          getActiveUnits(),
        ]);

        if (categoriesResult.success) {
          setCategories(categoriesResult.categories || []);
        }

        if (unitsResult.success) {
          setUnits(unitsResult.units || []);
        }
      } catch (err) {
        console.error("Error fetching data:", err);
      } finally {
        setLoadingData(false);
      }
    }

    fetchData();
  }, []);

  const onSubmit = async (data: ItemFormData) => {
    try {
      setLoading(true);
      setError("");

      if (mode === "create") {
        const result = await createItem({
          name: data.name,
          description: data.description || undefined,
          itemType: data.itemType,
          categoryId: data.categoryId || null,
          unitId: data.unitId,
          costPrice: data.costPrice,
          salesPrice: data.salesPrice || null,
          trackInventory: data.trackInventory,
          image: data.image || null,
          status: data.status,
        });

        if (!result.success) {
          throw new Error(result.error || "Failed to create item");
        }

        router.push("/dashboard/master/items");
      } else {
        const result = await updateItem({
          id: initialData!.id,
          name: data.name,
          description: data.description || undefined,
          itemType: data.itemType,
          categoryId: data.categoryId || null,
          unitId: data.unitId,
          costPrice: data.costPrice,
          salesPrice: data.salesPrice || null,
          trackInventory: data.trackInventory,
          image: data.image || null,
          status: data.status,
        });

        if (!result.success) {
          throw new Error(result.error || "Failed to update item");
        }

        router.push("/dashboard/master/items");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (loadingData) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <Card>
        <CardHeader>
          <CardTitle>
            {mode === "create" ? "Add New Item" : "Edit Item"}
          </CardTitle>
          <CardDescription>
            {mode === "create" 
              ? "Enter item details to create a new item" 
              : "Update item information"}
            {initialData && (
              <span className="block mt-1 text-xs font-mono text-muted-foreground">
                Code: {initialData.code}
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="space-y-4">
              {error && (
                <div className="flex items-start gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive border border-destructive/20">
                  <FiAlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Main Layout: 5:1 columns */}
              <div className="grid grid-cols-1 lg:grid-cols-6 gap-6">
                {/* Left Column - All Form Inputs (5 parts) */}
                <div className="lg:col-span-5 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Item Name *</Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="e.g., Basmati Rice, Chicken Biryani"
                    {...register("name")}
                    disabled={loading}
                  />
                  {errors.name && (
                    <p className="text-sm text-destructive">{errors.name.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="itemType">Item Type *</Label>
                  <Controller
                    name="itemType"
                    control={control}
                    render={({ field }) => (
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                        disabled={loading}
                      >
                        <SelectTrigger id="itemType">
                          <SelectValue placeholder="Select item type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="RAW_MATERIAL">Raw Material</SelectItem>
                          <SelectItem value="FINISHED_GOOD">Finished Good</SelectItem>
                          <SelectItem value="RETAIL">Retail</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.itemType && (
                    <p className="text-sm text-destructive">{errors.itemType.message}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  placeholder="Item description..."
                  {...register("description")}
                  disabled={loading}
                  rows={3}
                />
                {errors.description && (
                  <p className="text-sm text-destructive">{errors.description.message}</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="categoryId">Category (Optional)</Label>
                  <Controller
                    name="categoryId"
                    control={control}
                    render={({ field }) => (
                      <Select
                        value={field.value || "__none__"}
                        onValueChange={(value) => field.onChange(value === "__none__" ? null : value)}
                        disabled={loading}
                      >
                        <SelectTrigger id="categoryId">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">None</SelectItem>
                          {categories.map((category) => (
                            <SelectItem key={category.id} value={category.id}>
                              {category.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.categoryId && (
                    <p className="text-sm text-destructive">{errors.categoryId.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="unitId">Unit *</Label>
                  <Controller
                    name="unitId"
                    control={control}
                    render={({ field }) => (
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                        disabled={loading}
                      >
                        <SelectTrigger id="unitId">
                          <SelectValue placeholder="Select unit" />
                        </SelectTrigger>
                        <SelectContent>
                          {units.map((unit) => (
                            <SelectItem key={unit.id} value={unit.id}>
                              {unit.symbol} - {unit.details}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.unitId && (
                    <p className="text-sm text-destructive">{errors.unitId.message}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="costPrice">Cost Price *</Label>
                  <Input
                    id="costPrice"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    {...register("costPrice", { valueAsNumber: true })}
                    disabled={loading}
                  />
                  {errors.costPrice && (
                    <p className="text-sm text-destructive">{errors.costPrice.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="salesPrice">
                    Sales Price {(watchedItemType === "FINISHED_GOOD" || watchedItemType === "RETAIL") && "*"}
                  </Label>
                  <Input
                    id="salesPrice"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    {...register("salesPrice", { valueAsNumber: true })}
                    disabled={loading || (watchedItemType !== "FINISHED_GOOD" && watchedItemType !== "RETAIL")}
                  />
                  {errors.salesPrice && (
                    <p className="text-sm text-destructive">{errors.salesPrice.message}</p>
                  )}
                  {(watchedItemType === "FINISHED_GOOD" || watchedItemType === "RETAIL") && (
                    <p className="text-xs text-muted-foreground">
                      Sales price is required for Finished Goods and Retail items
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                          <SelectValue placeholder="Select status" />
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

                <div className="space-y-2">
                  <Label className="text-sm font-medium">Inventory Tracking</Label>
                  <div className="flex items-center space-x-2 pt-2">
                    <Controller
                      name="trackInventory"
                      control={control}
                      render={({ field }) => (
                        <Checkbox
                          id="trackInventory"
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          disabled={loading}
                        />
                      )}
                    />
                    <Label htmlFor="trackInventory" className="cursor-pointer">
                      Track Inventory
                    </Label>
                  </div>
                  {errors.trackInventory && (
                    <p className="text-sm text-destructive">{errors.trackInventory.message}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3 pt-4">
                <Button type="submit" disabled={loading}>
                  {loading ? "Saving..." : mode === "create" ? "Create Item" : "Update Item"}
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
                </div>

                {/* Right Column - Photo Uploader (1 part) */}
                <div className="lg:col-span-1">
                  <div className="space-y-2">
                    <Label>Item Image</Label>
                    <MediaSelector
                      label=""
                      value={watch("image") || ""}
                      onChange={(url) => setValue("image", url || "")}
                      allowedTypes={["image/*"]}
                      previewStyle="square"
                      width={200}
                      height={200}
                    />
                    {errors.image && (
                      <p className="text-sm text-destructive">{errors.image.message}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
