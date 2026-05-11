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
import { FiAlertCircle, FiPlus, FiTrash2 } from "react-icons/fi";
import { createItem, updateItem, getActiveCategories, getActiveUnits } from "../_actions/item.action";
import { ItemType } from "@prisma/client";
import MediaSelector from "@/components/MediaSelector";
import { Badge } from "@/components/ui/badge";

const itemFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  itemType: z.enum(["RAW_MATERIAL", "READY_PRODUCT", "RETAIL"]),
  categoryId: z.string().optional().nullable(),
  unitId: z.string().min(1, "Unit is required"),
  costPrice: z.number().min(0, "Cost price must be >= 0"),
  salesPrice: z.number().min(0, "Sales price must be >= 0").optional().nullable(),
  wholesalePrice: z.number().min(0, "Wholesale price must be >= 0").optional().nullable(),
  discount: z.number().min(0, "Discount must be >= 0").optional().nullable(),
  trackInventory: z.boolean().default(false),
  images: z.array(z.string()).default([]),
  sizes: z.array(z.string()).default([]),
  colors: z.array(z.string()).default([]),
  isEnableEcom: z.boolean().default(false),
  status: z.enum(["active", "inactive"]),
}).refine((data) => {
  // Sales price required for READY_PRODUCT and RETAIL
  if ((data.itemType === "READY_PRODUCT" || data.itemType === "RETAIL") && (!data.salesPrice || data.salesPrice <= 0)) {
    return false;
  }
  return true;
}, {
  message: "Sales price is required for Ready Products and Retail items",
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
    wholesalePrice: number | null;
    discount: number | null;
    trackInventory: boolean;
    images: string[] | null;
    sizes: string[];
    colors: string[];
    isEnableEcom: boolean;
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
  
  // State for sizes and colors input strings
  const [sizeInput, setSizeInput] = useState("");
  const [colorInput, setColorInput] = useState("");

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
          wholesalePrice: initialData.wholesalePrice ? Number(initialData.wholesalePrice) : null,
          discount: initialData.discount ? Number(initialData.discount) : null,
          trackInventory: initialData.trackInventory,
          images: initialData.images || [],
          sizes: initialData.sizes ?? [],
          colors: initialData.colors ?? [],
          isEnableEcom: initialData.isEnableEcom || false,
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
          wholesalePrice: null,
          discount: null,
          trackInventory: false,
          images: [],
          sizes: [],
          colors: [],
          isEnableEcom: false,
          status: "active",
        },
  });

  const watchedItemType = watch("itemType");
  const watchedImages = watch("images") || [];
  const watchedSizes = watch("sizes") || [];
  const watchedColors = watch("colors") || [];
  
  // Debug validation errors
  if (Object.keys(errors).length > 0) {
    console.log("Form Errors:", errors);
  }

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

      console.log("Form Submission Data:", data);

      const payload = {
        name: data.name,
        description: data.description || undefined,
        itemType: data.itemType,
        categoryId: data.categoryId || null,
        unitId: data.unitId,
        costPrice: data.costPrice,
        salesPrice: data.salesPrice || null,
        wholesalePrice: data.wholesalePrice || null,
        discount: data.discount || null,
        trackInventory: data.trackInventory,
        images: data.images,
        sizes: data.sizes,
        colors: data.colors,
        isEnableEcom: data.isEnableEcom,
        status: data.status,
      };

      if (mode === "create") {
        const result = await createItem(payload);
        if (!result.success) throw new Error(result.error || "Failed to create item");
      } else {
        const result = await updateItem({ id: initialData!.id, ...payload });
        if (!result.success) throw new Error(result.error || "Failed to update item");
      }

      router.push("/dashboard/master/items");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const addSize = () => {
    if (!sizeInput.trim()) return;
    const currentSizes = watchedSizes || [];
    const newSizes = Array.from(new Set([...currentSizes, sizeInput.trim()]));
    setValue("sizes", newSizes, { shouldDirty: true, shouldValidate: true });
    setSizeInput("");
  };

  const removeSize = (index: number) => {
    const currentSizes = [...(watchedSizes || [])];
    currentSizes.splice(index, 1);
    setValue("sizes", currentSizes, { shouldDirty: true, shouldValidate: true });
  };

  const addColor = () => {
    if (!colorInput.trim()) return;
    const currentColors = watchedColors || [];
    const newColors = Array.from(new Set([...currentColors, colorInput.trim()]));
    setValue("colors", newColors, { shouldDirty: true, shouldValidate: true });
    setColorInput("");
  };

  const removeColor = (index: number) => {
    const currentColors = [...(watchedColors || [])];
    currentColors.splice(index, 1);
    setValue("colors", currentColors, { shouldDirty: true, shouldValidate: true });
  };

  const addImage = (url: string) => {
    if (!url) return;
    setValue("images", [...watchedImages, url]);
  };

  const removeImage = (index: number) => {
    const newImages = [...watchedImages];
    newImages.splice(index, 1);
    setValue("images", newImages);
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

              <div className="grid grid-cols-1 lg:grid-cols-6 gap-6">
                <div className="lg:col-span-4 space-y-4">
                  {/* Basic Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Item Name *</Label>
                      <Input
                        id="name"
                        placeholder="e.g., Basmati Rice, Ready T-Shirt"
                        {...register("name")}
                        disabled={loading}
                      />
                      {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="itemType">Item Type *</Label>
                      <Controller
                        name="itemType"
                        control={control}
                        render={({ field }) => (
                          <Select value={field.value} onValueChange={field.onChange} disabled={loading}>
                            <SelectTrigger id="itemType">
                              <SelectValue placeholder="Select item type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="RAW_MATERIAL">Raw Material</SelectItem>
                              <SelectItem value="READY_PRODUCT">Ready Product</SelectItem>
                              <SelectItem value="RETAIL">Retail</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      />
                      {errors.itemType && <p className="text-sm text-destructive">{errors.itemType.message}</p>}
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
                              {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="unitId">Unit *</Label>
                      <Controller
                        name="unitId"
                        control={control}
                        render={({ field }) => (
                          <Select value={field.value} onValueChange={field.onChange} disabled={loading}>
                            <SelectTrigger id="unitId">
                              <SelectValue placeholder="Select unit" />
                            </SelectTrigger>
                            <SelectContent>
                              {units.map((u) => <SelectItem key={u.id} value={u.id}>{u.symbol} - {u.details}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </div>
                  </div>

                  {/* Variations (Sizes & Colors) */}
                  <div className="space-y-4 border-t pt-4">
                    <div className="flex items-center gap-2 text-primary font-semibold">
                      <FiPlus className="h-4 w-4" />
                      <h3>Product Variations</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label>Sizes</Label>
                        <div className="flex gap-2">
                          <Input 
                            placeholder="Add size (e.g. XL, 42)" 
                            value={sizeInput} 
                            onChange={(e) => setSizeInput(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSize())}
                          />
                          <Button type="button" variant="outline" size="icon" onClick={addSize}><FiPlus /></Button>
                        </div>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {watchedSizes.map((s, i) => (
                            <Badge key={i} variant="secondary" className="gap-1">
                              {s} <FiTrash2 className="h-3 w-3 cursor-pointer" onClick={() => removeSize(i)} />
                            </Badge>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Colors</Label>
                        <div className="flex gap-2">
                          <Input 
                            placeholder="Add color (e.g. Red, Blue)" 
                            value={colorInput} 
                            onChange={(e) => setColorInput(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addColor())}
                          />
                          <Button type="button" variant="outline" size="icon" onClick={addColor}><FiPlus /></Button>
                        </div>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {watchedColors.map((c, i) => (
                            <Badge key={i} variant="secondary" className="gap-1">
                              {c} <FiTrash2 className="h-3 w-3 cursor-pointer" onClick={() => removeColor(i)} />
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Pricing */}
                  <div className="space-y-4 border-t pt-4">
                    <div className="flex items-center gap-2 text-primary font-semibold">
                      <FiPlus className="h-4 w-4" />
                      <h3>Pricing Information</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="costPrice">Cost Price *</Label>
                        <Input
                          id="costPrice"
                          type="number"
                          step="0.01"
                          {...register("costPrice", { valueAsNumber: true })}
                          disabled={loading}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="salesPrice">Sales Price</Label>
                        <Input
                          id="salesPrice"
                          type="number"
                          step="0.01"
                          {...register("salesPrice", { valueAsNumber: true })}
                          disabled={loading}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="wholesalePrice">Wholesale Price</Label>
                        <Input
                          id="wholesalePrice"
                          type="number"
                          step="0.01"
                          {...register("wholesalePrice", { valueAsNumber: true })}
                          disabled={loading}
                        />
                      </div>

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
                    </div>
                  </div>

                  {/* Toggles */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border p-4 rounded-lg bg-muted/20">
                    <div className="flex items-center space-x-2">
                      <Controller
                        name="trackInventory"
                        control={control}
                        render={({ field }) => (
                          <Checkbox id="trackInventory" checked={field.value} onCheckedChange={field.onChange} disabled={loading} />
                        )}
                      />
                      <Label htmlFor="trackInventory">Track Inventory</Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Controller
                        name="isEnableEcom"
                        control={control}
                        render={({ field }) => (
                          <Checkbox id="isEnableEcom" checked={field.value} onCheckedChange={field.onChange} disabled={loading} />
                        )}
                      />
                      <Label htmlFor="isEnableEcom">Enable E-commerce</Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Controller
                        name="status"
                        control={control}
                        render={({ field }) => (
                          <Select value={field.value} onValueChange={field.onChange} disabled={loading}>
                            <SelectTrigger className="h-8 w-[120px]">
                              <SelectValue />
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

                  <div className="flex items-center gap-3 pt-4">
                    <Button type="submit" disabled={loading}>
                      {loading ? "Saving..." : mode === "create" ? "Create Item" : "Update Item"}
                    </Button>
                    <Button type="button" variant="outline" onClick={() => router.back()} disabled={loading}>
                      Cancel
                    </Button>
                  </div>
                </div>

                {/* Right Column - Multiple Photos */}
                <div className="lg:col-span-2 space-y-4">
                  <Label>Item Photos (Multiple)</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {watchedImages.map((img, i) => (
                      <div key={i} className="relative group aspect-square rounded-lg border overflow-hidden">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={img} alt={`Item ${i}`} className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => removeImage(i)}
                          className="absolute top-1 right-1 p-1 bg-destructive text-white rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <FiTrash2 size={14} />
                        </button>
                      </div>
                    ))}
                    {watchedImages.length < 6 && (
                      <div className="aspect-square">
                        <MediaSelector
                          label=""
                          value=""
                          onChange={(url) => addImage(url || "")}
                          allowedTypes={["image/*"]}
                          previewStyle="square"
                        />
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">Up to 6 photos allowed.</p>
                </div>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
