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
import { FiAlertCircle, FiSearch } from "react-icons/fi";
import { createItem, updateItem, getActiveUnits, getActiveCategories } from "../_actions/item.action";
import MediaSelector from "@/components/MediaSelector";

const itemFormSchema = z.object({
  code: z.string().min(1, "Code is required"),
  description: z.string().min(1, "Description is required"),
  unitId: z.string().min(1, "Unit is required"),
  unitPrice: z.string().min(1, "Unit price is required").refine((val) => !isNaN(Number(val)) && Number(val) >= 0, {
    message: "Unit price must be a valid number greater than or equal to 0",
  }),
  categoryId: z.string().optional().or(z.literal("")),
  image: z.string().url("Invalid image URL").optional().or(z.literal("")),
  status: z.enum(["active", "inactive"]),
});

type ItemFormData = z.infer<typeof itemFormSchema>;

interface ItemFormProps {
  mode: "create" | "edit";
  initialData?: {
    id: string;
    code: string;
    description: string;
    unitId: string;
    unitPrice: number;
    categoryId: string | null;
    category?: {
      id: string;
      name: string;
    } | null;
    image: string | null;
    status: string;
  };
}

interface Unit {
  id: string;
  symbol: string;
  details: string;
}

interface Category {
  id: string;
  name: string;
  description: string | null;
}

export default function ItemForm({ mode, initialData }: ItemFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loadingUnits, setLoadingUnits] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [categorySearch, setCategorySearch] = useState("");

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
          code: initialData.code,
          description: initialData.description,
          unitId: initialData.unitId,
          unitPrice: String(initialData.unitPrice),
          categoryId: initialData.categoryId || "",
          image: initialData.image || "",
          status: (initialData.status === "trash" ? "active" : initialData.status) as "active" | "inactive",
        }
      : {
          code: "",
          description: "",
          unitId: "",
          unitPrice: "0",
          categoryId: "",
          image: "",
          status: "active",
        },
  });

  useEffect(() => {
    async function loadUnits() {
      try {
        const result = await getActiveUnits();
        if (result.success) {
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

  useEffect(() => {
    async function loadCategories() {
      try {
        const result = await getActiveCategories();
        if (result.success) {
          setCategories(result.categories);
        }
      } catch (err) {
        console.error("Failed to load categories:", err);
      } finally {
        setLoadingCategories(false);
      }
    }
    loadCategories();
  }, []);

  const onSubmit = async (data: ItemFormData): Promise<void> => {
    try {
      setLoading(true);
      setError("");

      if (mode === "create") {
        const result = await createItem({
          code: data.code,
          description: data.description,
          unitId: data.unitId,
          unitPrice: Number(data.unitPrice),
          categoryId: data.categoryId || undefined,
          image: data.image || undefined,
          status: data.status,
        });

        if (!result.success) {
          throw new Error(result.error || "Failed to create item");
        }

        router.push("/dashboard/items");
      } else {
        const result = await updateItem({
          id: initialData!.id,
          code: data.code,
          description: data.description,
          unitId: data.unitId,
          unitPrice: Number(data.unitPrice),
          categoryId: data.categoryId || undefined,
          image: data.image || undefined,
          status: data.status,
        });

        if (!result.success) {
          throw new Error(result.error || "Failed to update item");
        }

        router.push("/dashboard/items");
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
          <CardTitle>
            {mode === "create" ? "Add New Item" : "Edit Item"}
          </CardTitle>
          <CardDescription>
            {mode === "create" ? "Enter item details to create a new item" : "Update item information"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-4">
              {error && (
                <div className="flex items-start gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive border border-destructive/20">
                  <FiAlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="code">Code</Label>
                <Input
                  id="code"
                  type="text"
                  placeholder="ITEM-001"
                  {...register("code")}
                  disabled={loading}
                />
                {errors.code && (
                  <p className="text-sm text-destructive">{errors.code.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  type="text"
                  placeholder="Item description"
                  {...register("description")}
                  disabled={loading}
                />
                {errors.description && (
                  <p className="text-sm text-destructive">{errors.description.message}</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="unitId">Unit</Label>
                  <Controller
                    name="unitId"
                    control={control}
                    render={({ field }) => (
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                        disabled={loading || loadingUnits}
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

                <div className="space-y-2">
                  <Label htmlFor="unitPrice">Unit Price</Label>
                  <Input
                    id="unitPrice"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    {...register("unitPrice")}
                    disabled={loading}
                  />
                  {errors.unitPrice && (
                    <p className="text-sm text-destructive">{errors.unitPrice.message}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="categoryId">Category (Optional)</Label>
                <Controller
                  name="categoryId"
                  control={control}
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onValueChange={(value) => {
                        field.onChange(value);
                        setCategorySearch(""); // Clear search on selection
                      }}
                      disabled={loading || loadingCategories}
                    >
                      <SelectTrigger id="categoryId">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent className="max-h-[300px]">
                        <div className="p-2 border-b">
                          <div className="relative">
                            <FiSearch className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              placeholder="Search categories..."
                              value={categorySearch}
                              onChange={(e) => {
                                e.stopPropagation();
                                setCategorySearch(e.target.value);
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
                          {categories
                            .filter((category) =>
                              categorySearch
                                ? category.name.toLowerCase().includes(categorySearch.toLowerCase()) ||
                                  (category.description &&
                                    category.description.toLowerCase().includes(categorySearch.toLowerCase()))
                                : true
                            )
                            .map((category) => (
                              <SelectItem key={category.id} value={category.id}>
                                {category.name}
                              </SelectItem>
                            ))}
                          {categories.filter((category) =>
                            categorySearch
                              ? category.name.toLowerCase().includes(categorySearch.toLowerCase()) ||
                                (category.description &&
                                  category.description.toLowerCase().includes(categorySearch.toLowerCase()))
                              : true
                          ).length === 0 && (
                            <div className="px-2 py-1.5 text-sm text-muted-foreground text-center">
                              No categories found
                            </div>
                          )}
                        </div>
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.categoryId && (
                  <p className="text-sm text-destructive">{errors.categoryId.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
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

              <div className="flex items-center gap-3 pt-4">
                <Button type="submit" disabled={loading || loadingUnits}>
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

              {/* Right Column - Photo Upload (1 part) */}
              <div className="lg:col-span-1 flex justify-center items-start">
                <div className="space-y-2 text-center w-full">
                  <div className="flex justify-center items-center mb-4">
                    <Label className="text-center">Item Photo</Label>
                  </div>
                  <MediaSelector
                    value={watch("image") || ""}
                    onChange={(url) => setValue("image", url)}
                    allowedTypes={["image/*"]}
                    previewStyle="square"
                    width={250}
                    height={250}
                  />
                  {errors.image && (
                    <p className="text-sm text-destructive mt-2">{errors.image.message}</p>
                  )}
                </div>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
