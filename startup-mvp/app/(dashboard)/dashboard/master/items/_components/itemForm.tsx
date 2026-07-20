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
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { FiAlertCircle, FiPlus, FiTrash2 } from "react-icons/fi";
import { createItem, updateItem, getActiveCategories, getActiveUnits } from "../_actions/item.action";
import { getActiveBrands } from "../../brands/_actions/brand.action";
import { ItemType } from "@prisma/client";
import MediaSelector from "@/components/MediaSelector";
import { Badge } from "@/components/ui/badge";
import UploadDialog from "@/components/UploadDialog";
import { Image as ImageIcon, X } from "lucide-react";

interface VariantState {
  id?: string;
  sku: string;
  barcode: string;
  size: string;
  color: string;
  costPrice: number | null;
  salesPrice: number | null;
  wholesalePrice: number | null;
  wholesaleDiscountAmount: number | null;
  initialStock: number;
  enabled: boolean;
  image?: string | null;
}

const itemFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  itemType: z.enum(["RAW_MATERIAL", "READY_PRODUCT", "RETAIL", "WHOLESALE"]),
  categoryId: z.string().optional().nullable(),
  subCategoryId: z.string().optional().nullable(),
  brandId: z.string().optional().nullable(),
  unitId: z.string().min(1, "Unit is required"),
  costPrice: z.number().min(0, "Cost price must be >= 0"),
  salesPrice: z.number().min(0, "Sales price must be >= 0").optional().nullable(),
  wholesalePrice: z.number().min(0, "Wholesale price must be >= 0").optional().nullable(),
  wholesaleDiscountAmount: z.number().min(0, "Wholesale discount amount must be >= 0").optional().nullable(),
  discount: z.number().min(0, "Discount must be >= 0").optional().nullable(),
  trackInventory: z.boolean().default(true),
  images: z.array(z.string()).default([]),
  featuredImage: z.string().optional().nullable(),
  sizes: z.array(z.string()).default([]),
  colors: z.array(z.string()).default([]),
  isEnableEcom: z.boolean().default(false),
  status: z.enum(["active", "inactive"]),
  isVatEnabled: z.boolean().default(false),
  vatPercentage: z.number().min(0, "VAT percentage must be >= 0").default(0),
  barcode: z.string().optional().nullable(),
  isPromo: z.boolean().default(false),
  promoEndsAt: z.union([z.string(), z.date()]).optional().nullable(),
}).refine((data) => {
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
    subCategoryId: string | null;
    brandId: string | null;
    unitId: string;
    costPrice: number;
    salesPrice: number | null;
    wholesalePrice: number | null;
    wholesaleDiscountAmount: number | null;
    discount: number | null;
    trackInventory: boolean;
    images: string[] | null;
    featuredImage?: string | null;
    sizes: string[];
    colors: string[];
    isEnableEcom: boolean;
    status: string;
    isVatEnabled?: boolean;
    vatPercentage?: number;
    barcode?: string | null;
    isPromo?: boolean;
    promoEndsAt?: any;
    variants?: Array<{
      id?: string;
      sku: string;
      barcode?: string | null;
      size: string;
      color: string;
      costPrice?: number | null;
      salesPrice?: number | null;
      wholesalePrice?: number | null;
      wholesaleDiscountAmount?: number | null;
      initialStock?: number;
      image?: string | null;
    }>;
  };
}

interface Category {
  id: string;
  name: string;
  description: string | null;
  parentId?: string | null;
}

interface Brand {
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
  const [brands, setBrands] = useState<Brand[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  
  // State for sizes and colors input strings
  const [sizeInput, setSizeInput] = useState("");
  const [colorInput, setColorInput] = useState("");

  // Variant upload dialog state
  const [isVariantUploadOpen, setIsVariantUploadOpen] = useState(false);
  const [activeVariantIdx, setActiveVariantIdx] = useState<number | null>(null);

  // SKU matrix state
  const [variants, setVariants] = useState<VariantState[]>(() => {
    if (initialData?.variants) {
      return initialData.variants.map((v) => ({
        id: v.id,
        sku: v.sku,
        barcode: v.barcode || "",
        size: v.size,
        color: v.color,
        costPrice: v.costPrice ?? null,
        salesPrice: v.salesPrice ?? null,
        wholesalePrice: v.wholesalePrice ?? null,
        wholesaleDiscountAmount: v.wholesaleDiscountAmount ?? null,
        initialStock: v.initialStock ?? 0,
        enabled: true,
        image: v.image || "",
      }));
    }
    return [];
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    control,
    watch,
    setValue,
  } = useForm<any>({
    resolver: zodResolver(itemFormSchema),
    defaultValues: initialData
      ? {
          name: initialData.name,
          description: initialData.description || "",
          itemType: initialData.itemType,
          categoryId: initialData.categoryId || null,
          subCategoryId: initialData.subCategoryId || null,
          brandId: initialData.brandId || null,
          unitId: initialData.unitId,
          costPrice: Number(initialData.costPrice),
          salesPrice: initialData.salesPrice !== null && initialData.salesPrice !== undefined ? Number(initialData.salesPrice) : 0,
          wholesalePrice: initialData.wholesalePrice !== null && initialData.wholesalePrice !== undefined ? Number(initialData.wholesalePrice) : 0,
          wholesaleDiscountAmount: initialData.wholesaleDiscountAmount !== null && initialData.wholesaleDiscountAmount !== undefined ? Number(initialData.wholesaleDiscountAmount) : 0,
          discount: initialData.discount !== null && initialData.discount !== undefined ? Number(initialData.discount) : 0,
          trackInventory: initialData.trackInventory,
          images: initialData.images || [],
          featuredImage: initialData.featuredImage || null,
          sizes: initialData.sizes ?? [],
          colors: initialData.colors ?? [],
          isEnableEcom: initialData.isEnableEcom || false,
          status: (initialData.status === "active" || initialData.status === "inactive") 
            ? initialData.status as "active" | "inactive"
            : "active",
          isVatEnabled: initialData.isVatEnabled || false,
          vatPercentage: initialData.vatPercentage ? Number(initialData.vatPercentage) : 0,
          barcode: initialData.barcode || "",
          isPromo: (initialData as any).isPromo || false,
          promoEndsAt: (initialData as any).promoEndsAt 
            ? new Date((initialData as any).promoEndsAt).toISOString().split('T')[0] 
            : "",
        }
      : {
          name: "",
          description: "",
          itemType: "RETAIL",
          categoryId: null,
          subCategoryId: null,
          brandId: null,
          unitId: "",
          costPrice: 0,
          salesPrice: 0,
          wholesalePrice: 0,
          wholesaleDiscountAmount: 0,
          discount: 0,
          trackInventory: true,
          images: [],
          featuredImage: null,
          sizes: [],
          colors: [],
          isEnableEcom: false,
          status: "active",
          isVatEnabled: false,
          vatPercentage: 0,
          barcode: "",
          isPromo: false,
          promoEndsAt: "",
        },
  });

  const watchedItemType = watch("itemType");
  const watchedImages = watch("images") || [];
  const watchedFeaturedImage = watch("featuredImage");
  const watchedSizes = watch("sizes") || [];
  const watchedColors = watch("colors") || [];
  const watchedIsVatEnabled = watch("isVatEnabled") || false;
  const watchedCategoryId = watch("categoryId");
  
  // Debug validation errors
  if (Object.keys(errors).length > 0) {
    console.log("Form Errors:", errors);
  }

  // Permute variations into SKU variants state when sizes or colors change
  useEffect(() => {
    if ((!watchedSizes || watchedSizes.length === 0) && (!watchedColors || watchedColors.length === 0)) {
      setVariants([]);
      return;
    }

    const activeSizes = watchedSizes && watchedSizes.length > 0 ? watchedSizes : ["ALL"];
    const activeColors = watchedColors && watchedColors.length > 0 ? watchedColors : ["ALL"];

    const newVariants: VariantState[] = [];
    const namePrefix = (watch("name") || "ITEM").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4);

    activeColors.forEach((color: string) => {
      activeSizes.forEach((size: string) => {
        const existing = variants.find(
          (v) => v.color === color && v.size === size
        );

        if (existing) {
          newVariants.push(existing);
        } else {
          const colorCode = color === "ALL" ? "GEN" : color.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 3);
          const sizeCode = size === "ALL" ? "GEN" : size.toUpperCase().replace(/[^A-Z0-9]/g, "");
          const generatedSku = `${namePrefix}-${colorCode}-${sizeCode}`;

          newVariants.push({
            sku: generatedSku,
            barcode: "",
            size: size,
            color: color,
            costPrice: null,
            salesPrice: null,
            wholesalePrice: null,
            wholesaleDiscountAmount: null,
            initialStock: 0,
            enabled: true,
            image: "",
          });
        }
      });
    });

    const hasChanged = JSON.stringify(newVariants.map(v => ({ color: v.color, size: v.size, sku: v.sku }))) !==
                      JSON.stringify(variants.map(v => ({ color: v.color, size: v.size, sku: v.sku })));

    if (hasChanged) {
      setVariants(newVariants);
    }
  }, [watchedSizes, watchedColors, watch("name")]);

  // Fetch categories, brands and units
  useEffect(() => {
    async function fetchData() {
      try {
        const [categoriesResult, brandsResult, unitsResult] = await Promise.all([
          getActiveCategories(),
          getActiveBrands(),
          getActiveUnits(),
        ]);

        if (categoriesResult.success) {
          setCategories(categoriesResult.categories || []);
        }

        if (brandsResult.success) {
          setBrands(brandsResult.brands || []);
        }

        if (unitsResult.success) {
          const loadedUnits = unitsResult.units || [];
          setUnits(loadedUnits);
          if (mode === "create") {
            const pcsUnit = loadedUnits.find(u => u.symbol.toLowerCase() === "pcs");
            if (pcsUnit) {
              setValue("unitId", pcsUnit.id);
            }
          }
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
        subCategoryId: data.subCategoryId || null,
        brandId: data.brandId || null,
        unitId: data.unitId,
        costPrice: data.costPrice,
        salesPrice: data.salesPrice || null,
        wholesalePrice: data.wholesalePrice || null,
        wholesaleDiscountAmount: data.wholesaleDiscountAmount || null,
        discount: data.discount || null,
        trackInventory: data.trackInventory,
        images: data.images,
        featuredImage: data.featuredImage,
        sizes: (data.itemType === "RETAIL" || data.itemType === "READY_PRODUCT") ? data.sizes : [],
        colors: (data.itemType === "RETAIL" || data.itemType === "READY_PRODUCT") ? data.colors : [],
        isEnableEcom: data.isEnableEcom,
        status: data.status,
        isVatEnabled: data.isVatEnabled,
        vatPercentage: data.vatPercentage,
        barcode: data.barcode || undefined,
        isPromo: data.isPromo,
        promoEndsAt: data.promoEndsAt ? (data.promoEndsAt instanceof Date ? data.promoEndsAt.toISOString() : new Date(data.promoEndsAt).toISOString()) : null,
        variants: (data.itemType === "RETAIL" || data.itemType === "READY_PRODUCT") ? variants.filter(v => v.enabled).map((v) => ({
          id: v.id,
          sku: v.sku,
          barcode: v.barcode || null,
          size: v.size,
          color: v.color,
          costPrice: v.costPrice,
          salesPrice: v.salesPrice,
          wholesalePrice: v.wholesalePrice,
          wholesaleDiscountAmount: v.wholesaleDiscountAmount,
          initialStock: v.initialStock || 0,
          image: v.image || null,
        })) : [],
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
    const newImages = [...watchedImages, url];
    setValue("images", newImages);
    if (!watchedFeaturedImage) {
      setValue("featuredImage", url);
    }
  };

  const removeImage = (index: number) => {
    const newImages = [...watchedImages];
    const removedUrl = newImages[index];
    newImages.splice(index, 1);
    setValue("images", newImages);
    
    if (watchedFeaturedImage === removedUrl) {
      setValue("featuredImage", newImages.length > 0 ? newImages[0] : null);
    }
  };

  const setFeaturedImage = (url: string) => {
    setValue("featuredImage", url);
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
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Item Name *</Label>
                      <Input
                        id="name"
                        placeholder="e.g.,T-Shirt"
                        {...register("name")}
                        disabled={loading}
                      />
                      {errors.name?.message && <p className="text-sm text-destructive">{String(errors.name.message)}</p>}
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
                              <SelectItem value="WHOLESALE">Wholesale</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      />
                      {errors.itemType?.message && <p className="text-sm text-destructive">{String(errors.itemType.message)}</p>}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="barcode">Base Barcode (Optional)</Label>
                      <Input
                        id="barcode"
                        placeholder="Auto-generated if empty"
                        {...register("barcode")}
                        disabled={loading}
                      />
                      {errors.barcode?.message && <p className="text-sm text-destructive">{String(errors.barcode.message)}</p>}
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
                          <SearchableSelect
                            options={categories.filter(c => !c.parentId).map(c => ({ label: c.name, value: c.id })).sort((a, b) => a.label.localeCompare(b.label))}
                            value={field.value || null}
                            onValueChange={(val) => {
                              field.onChange(val);
                              setValue("subCategoryId", null);
                            }}
                            placeholder="Select category"
                            searchPlaceholder="Search categories..."
                            allowClear
                            disabled={loading}
                          />
                        )}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="subCategoryId">Sub-category (Optional)</Label>
                      <Controller
                        name="subCategoryId"
                        control={control}
                        render={({ field }) => {
                          const activeSubCategories = watchedCategoryId
                            ? categories.filter(c => c.parentId === watchedCategoryId)
                            : [];
                          return (
                            <SearchableSelect
                              options={activeSubCategories.map(c => ({ label: c.name, value: c.id })).sort((a, b) => a.label.localeCompare(b.label))}
                              value={field.value || null}
                              onValueChange={field.onChange}
                              placeholder={watchedCategoryId ? "Select sub-category" : "Select a category first"}
                              searchPlaceholder="Search sub-categories..."
                              allowClear
                              disabled={loading || !watchedCategoryId}
                            />
                          );
                        }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="brandId">Brand (Optional)</Label>
                      <Controller
                        name="brandId"
                        control={control}
                        render={({ field }) => (
                          <SearchableSelect
                            options={brands.map(b => ({ label: b.name, value: b.id }))}
                            value={field.value || null}
                            onValueChange={field.onChange}
                            placeholder="Select brand"
                            searchPlaceholder="Search brands..."
                            allowClear
                            disabled={loading}
                          />
                        )}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="unitId">Unit *</Label>
                      <Controller
                        name="unitId"
                        control={control}
                        render={({ field }) => (
                          <SearchableSelect
                            options={units.map(u => ({ label: `${u.symbol} - ${u.details}`, value: u.id }))}
                            value={field.value || null}
                            onValueChange={field.onChange}
                            placeholder="Select unit"
                            searchPlaceholder="Search units..."
                            disabled={loading}
                          />
                        )}
                      />
                    </div>
                  </div>

                  {/* Pricing */}
                  <div className="space-y-4 border-t pt-4">
                    <div className="flex items-center gap-2 text-primary font-semibold">
                      <FiPlus className="h-4 w-4" />
                      <h3>Pricing Information</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="costPrice">Cost Price *</Label>
                        <Input
                          id="costPrice"
                          type="number"
                          step="1"
                          {...register("costPrice", { valueAsNumber: true })}
                          disabled={loading}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="salesPrice">Sales Price</Label>
                        <Input
                          id="salesPrice"
                          type="number"
                          step="1"
                          {...register("salesPrice", { valueAsNumber: true })}
                          disabled={loading}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="wholesalePrice">Wholesale Price</Label>
                        <Input
                          id="wholesalePrice"
                          type="number"
                          step="1"
                          {...register("wholesalePrice", { valueAsNumber: true })}
                          disabled={loading}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="wholesaleDiscountAmount">WS Discount Amt.</Label>
                        <Input
                          id="wholesaleDiscountAmount"
                          type="number"
                          step="1"
                          {...register("wholesaleDiscountAmount", { valueAsNumber: true })}
                          disabled={loading}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="discount">Retail Discount</Label>
                        <Input
                          id="discount"
                          type="number"
                          step="1"
                          {...register("discount", { valueAsNumber: true })}
                          disabled={loading}
                        />
                      </div>
                    </div>

                    <div className="flex flex-col md:flex-row gap-6 bg-muted/20 p-4 rounded-xl border border-muted-foreground/10 mt-2">
                      <div className="flex items-center space-x-3 pt-2">
                        <input
                          id="isPromo"
                          type="checkbox"
                          {...register("isPromo")}
                          disabled={loading}
                          className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                        />
                        <Label htmlFor="isPromo" className="cursor-pointer font-semibold">Enable Promotional Expiry</Label>
                      </div>

                      {watch("isPromo") && (
                        <div className="space-y-2 flex-1 max-w-sm">
                          <Label htmlFor="promoEndsAt" className="text-xs">Promotion Expiration Date *</Label>
                          <Input
                            id="promoEndsAt"
                            type="date"
                            {...register("promoEndsAt")}
                            disabled={loading}
                            required={watch("isPromo")}
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Variations (Sizes & Colors) */}
                  {(watchedItemType === "RETAIL" || watchedItemType === "READY_PRODUCT") && (
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
                          {watchedSizes.map((s: string, i: number) => (
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
                          {watchedColors.map((c: string, i: number) => (
                            <Badge key={i} variant="secondary" className="gap-1">
                              {c} <FiTrash2 className="h-3 w-3 cursor-pointer" onClick={() => removeColor(i)} />
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                    </div>
                  )}
                </div>

                {/* Right Column - Multiple Photos */}
                <div className="lg:col-span-2 space-y-4">
                  <Label>Item Photos (Multiple)</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {watchedImages.map((img: string, i: number) => (
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
                        <button
                          type="button"
                          onClick={() => setFeaturedImage(img)}
                          className={`absolute bottom-1 left-1 p-1 rounded-md transition-opacity ${
                            watchedFeaturedImage === img 
                              ? "bg-primary text-white opacity-100" 
                              : "bg-background/80 text-muted-foreground opacity-0 group-hover:opacity-100"
                          }`}
                          title="Set as featured image"
                        >
                          {watchedFeaturedImage === img ? (
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                          ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                          )}
                        </button>
                        {watchedFeaturedImage === img && (
                          <div className="absolute top-1 left-1 px-1.5 py-0.5 bg-primary text-[10px] text-white rounded font-medium shadow-sm">
                            Featured
                          </div>
                        )}
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

              {/* 2D SKU Variant Matrix Grid */}
              {(watchedItemType === "RETAIL" || watchedItemType === "READY_PRODUCT") && variants.length > 0 && (
                <div className="space-y-4 border-t pt-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-primary font-semibold">
                      <FiPlus className="h-4 w-4" />
                      <h3>SKU Variant Matrix ({variants.filter(v => v.enabled).length} Active)</h3>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm" 
                        onClick={() => {
                          const baseCost = Number(watch("costPrice")) || 0;
                          const baseSales = Number(watch("salesPrice")) || 0;
                          setVariants(prev => prev.map(v => ({
                            ...v,
                            costPrice: (v.costPrice === null || Number(v.costPrice) === 0) ? baseCost : v.costPrice,
                            salesPrice: (v.salesPrice === null || Number(v.salesPrice) === 0) ? baseSales : v.salesPrice,
                          })));
                        }}
                      >
                        Copy Base Pricing to Empty Variants
                      </Button>
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm" 
                        onClick={() => {
                          const baseCost = Number(watch("costPrice")) || 0;
                          const baseSales = Number(watch("salesPrice")) || 0;
                          setVariants(prev => prev.map(v => ({
                            ...v,
                            costPrice: baseCost,
                            salesPrice: baseSales,
                          })));
                        }}
                      >
                        Reset All to Base Pricing
                      </Button>
                    </div>
                  </div>
                  <div className="overflow-x-auto rounded-lg border border-border">
                    <table className="w-full text-sm text-left text-muted-foreground border-collapse">
                      <thead className="text-xs uppercase bg-muted/50 text-foreground font-semibold border-b border-border">
                        <tr>
                          <th className="p-3 w-12 text-center">Active</th>
                          <th className="p-3 w-16 text-center">Photo</th>
                          <th className="p-3">Color</th>
                          <th className="p-3">Size</th>
                          <th className="p-3">SKU Code</th>
                          <th className="p-3">Barcode</th>
                          <th className="p-3">Cost Price</th>
                          <th className="p-3">Sales Price</th>
                          <th className="p-3">WS Price</th>
                          <th className="p-3">WS Disc. Amount</th>
                          {mode === "create" && <th className="p-3">Init Stock</th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {variants.map((v, idx) => (
                          <tr key={idx} className={`hover:bg-muted/10 transition-colors ${!v.enabled ? "opacity-40" : ""}`}>
                            <td className="p-3 text-center">
                              <Checkbox 
                                checked={v.enabled} 
                                onCheckedChange={(checked) => {
                                  setVariants(prev => {
                                    const updated = [...prev];
                                    updated[idx].enabled = !!checked;
                                    return updated;
                                  });
                                }}
                              />
                            </td>
                            <td className="p-3 text-center">
                              {v.image ? (
                                <div className="relative group w-10 h-10 rounded border border-border overflow-hidden mx-auto bg-muted">
                                  <img 
                                    src={v.image} 
                                    alt={`${v.color}-${v.size}`} 
                                    className="w-full h-full object-cover cursor-pointer"
                                    onClick={() => {
                                      if (v.enabled) {
                                        setActiveVariantIdx(idx);
                                        setIsVariantUploadOpen(true);
                                      }
                                    }}
                                  />
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setVariants(prev => {
                                        const updated = [...prev];
                                        updated[idx].image = "";
                                        return updated;
                                      });
                                    }}
                                    className="absolute top-0 right-0 p-0.5 bg-destructive text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                  >
                                    <X size={10} />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  disabled={!v.enabled}
                                  onClick={() => {
                                    setActiveVariantIdx(idx);
                                    setIsVariantUploadOpen(true);
                                  }}
                                  className="w-10 h-10 rounded border-2 border-dashed border-muted-foreground/20 hover:border-primary flex items-center justify-center text-muted-foreground hover:text-primary transition-colors mx-auto bg-muted/30"
                                  title="Upload variant photo"
                                >
                                  <ImageIcon className="h-4 w-4" />
                                </button>
                              )}
                            </td>
                            <td className="p-3 font-medium text-foreground">{v.color}</td>
                            <td className="p-3 font-medium text-foreground">{v.size}</td>
                            <td className="p-3">
                              <Input 
                                value={v.sku} 
                                disabled={!v.enabled}
                                onChange={(e) => {
                                  setVariants(prev => {
                                    const updated = [...prev];
                                    updated[idx].sku = e.target.value;
                                    return updated;
                                  });
                                }}
                                className="h-8 font-mono text-xs max-w-[180px]"
                              />
                            </td>
                            <td className="p-3">
                              <Input 
                                value={v.barcode} 
                                placeholder="Auto-generated"
                                disabled={!v.enabled}
                                onChange={(e) => {
                                  setVariants(prev => {
                                    const updated = [...prev];
                                    updated[idx].barcode = e.target.value;
                                    return updated;
                                  });
                                }}
                                className="h-8 font-mono text-xs max-w-[180px]"
                              />
                            </td>
                            <td className="p-3">
                              <Input 
                                type="number"
                                placeholder="Use Base"
                                disabled={!v.enabled}
                                value={v.costPrice !== null ? v.costPrice : ""}
                                onChange={(e) => {
                                  const val = e.target.value === "" ? null : Number(e.target.value);
                                  setVariants(prev => {
                                    const updated = [...prev];
                                    updated[idx].costPrice = val;
                                    return updated;
                                  });
                                }}
                                className="h-8 max-w-[100px]"
                              />
                            </td>
                            <td className="p-3">
                              <Input 
                                type="number"
                                placeholder="Use Base"
                                disabled={!v.enabled}
                                value={v.salesPrice !== null ? v.salesPrice : ""}
                                onChange={(e) => {
                                  const val = e.target.value === "" ? null : Number(e.target.value);
                                  setVariants(prev => {
                                    const updated = [...prev];
                                    updated[idx].salesPrice = val;
                                    return updated;
                                  });
                                }}
                                className="h-8 max-w-[100px]"
                              />
                            </td>
                            <td className="p-3">
                              <Input 
                                type="number"
                                placeholder="Use Base"
                                disabled={!v.enabled}
                                value={v.wholesalePrice !== null ? v.wholesalePrice : ""}
                                onChange={(e) => {
                                  const val = e.target.value === "" ? null : Number(e.target.value);
                                  setVariants(prev => {
                                    const updated = [...prev];
                                    updated[idx].wholesalePrice = val;
                                    return updated;
                                  });
                                }}
                                className="h-8 max-w-[100px]"
                              />
                            </td>
                            <td className="p-3">
                              <Input 
                                type="number"
                                placeholder="Use Base"
                                disabled={!v.enabled}
                                value={v.wholesaleDiscountAmount !== null ? v.wholesaleDiscountAmount : ""}
                                onChange={(e) => {
                                  const val = e.target.value === "" ? null : Number(e.target.value);
                                  setVariants(prev => {
                                    const updated = [...prev];
                                    updated[idx].wholesaleDiscountAmount = val;
                                    return updated;
                                  });
                                }}
                                className="h-8 max-w-[100px]"
                              />
                            </td>
                            {mode === "create" && (
                              <td className="p-3">
                                <Input 
                                  type="number"
                                  disabled={!v.enabled}
                                  value={v.initialStock || ""}
                                  onChange={(e) => {
                                    const val = Number(e.target.value) || 0;
                                    setVariants(prev => {
                                      const updated = [...prev];
                                      updated[idx].initialStock = val;
                                      return updated;
                                    });
                                  }}
                                  className="h-8 max-w-[80px]"
                                />
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

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

              {/* VAT / Tax Settings */}
              <div className="space-y-4 border-t pt-4">
                <div className="flex items-center gap-2 text-primary font-semibold">
                  <FiPlus className="h-4 w-4" />
                  <h3>VAT & Tax Information</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border p-4 rounded-lg bg-muted/20">
                  <div className="flex items-center space-x-2 py-2">
                    <Controller
                      name="isVatEnabled"
                      control={control}
                      render={({ field }) => (
                        <Checkbox 
                          id="isVatEnabled" 
                          checked={field.value} 
                          onCheckedChange={(checked) => {
                            field.onChange(checked);
                            if (!checked) {
                              setValue("vatPercentage", 0);
                            }
                          }} 
                          disabled={loading} 
                        />
                      )}
                    />
                    <Label htmlFor="isVatEnabled" className="cursor-pointer font-medium">Enable VAT for this item</Label>
                  </div>

                  {watchedIsVatEnabled && (
                    <div className="space-y-2">
                      <Label htmlFor="vatPercentage">VAT Percentage (%)</Label>
                      <Input
                        id="vatPercentage"
                        type="number"
                        step="0.01"
                        placeholder="e.g. 5, 12, 18"
                        {...register("vatPercentage", { valueAsNumber: true })}
                        disabled={loading}
                        className="max-w-[200px]"
                      />
                      {errors.vatPercentage?.message && <p className="text-sm text-destructive">{String(errors.vatPercentage.message)}</p>}
                    </div>
                  )}
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
          </form>
        </CardContent>
      </Card>
      {isVariantUploadOpen && activeVariantIdx !== null && (
        <UploadDialog
          isOpen={isVariantUploadOpen}
          onClose={() => {
            setIsVariantUploadOpen(false);
            setActiveVariantIdx(null);
          }}
          onSelect={(url) => {
            if (activeVariantIdx !== null) {
              setVariants(prev => {
                const updated = [...prev];
                updated[activeVariantIdx].image = url;
                return updated;
              });
            }
            setIsVariantUploadOpen(false);
            setActiveVariantIdx(null);
          }}
          allowedTypes={["image/*"]}
        />
      )}
    </div>
  );
}
