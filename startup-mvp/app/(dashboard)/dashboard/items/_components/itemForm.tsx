"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
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
import { MultiSelect, type MultiSelectOption } from "@/components/ui/multi-select";
import { FiAlertCircle, FiSearch } from "react-icons/fi";
import { createItem, updateItem, getActiveUnits, getActiveCategories } from "../_actions/item.action";
import MediaSelector from "@/components/MediaSelector";
import { getBasePathFromPathname } from "@/lib/route-utils-client";

const itemFormSchema = z.object({
  code: z.string().min(1, "Code is required"),
  description: z.string().min(1, "Description is required"),
  unitId: z.string().min(1, "Unit is required"),
  unitPrice: z.string().min(1, "Unit price is required").refine((val) => !isNaN(Number(val)) && Number(val) >= 0, {
    message: "Unit price must be a valid number greater than or equal to 0",
  }),
  costPrice: z.string().min(1, "Cost price is required").refine((val) => !isNaN(Number(val)) && Number(val) >= 0, {
    message: "Cost price must be a valid number greater than or equal to 0",
  }),
  categoryIds: z.array(z.string()).optional(),
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
    costPrice?: number;
    categoryIds?: string[];
    categories?: {
      id: string;
      name: string;
    }[];
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
  const pathname = usePathname();
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loadingUnits, setLoadingUnits] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [unitSearch, setUnitSearch] = useState("");

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
          costPrice: String(initialData.costPrice || 0),
          categoryIds: initialData.categoryIds || initialData.categories?.map(c => c.id) || [],
          image: initialData.image || "",
          status: (initialData.status === "trash" ? "active" : initialData.status) as "active" | "inactive",
        }
      : {
          code: "",
          description: "",
          unitId: "",
          unitPrice: "0",
          costPrice: "0",
          categoryIds: [],
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
          costPrice: Number(data.costPrice),
          categoryIds: data.categoryIds || [],
          image: data.image || undefined,
          status: data.status,
        });

        if (!result.success) {
          throw new Error(result.error || "Failed to create item");
        }

        const basePath = getBasePathFromPathname(pathname);
        router.push(`${basePath}/items`);
      } else {
        const result = await updateItem({
          id: initialData!.id,
          code: data.code,
          description: data.description,
          unitId: data.unitId,
          unitPrice: Number(data.unitPrice),
          costPrice: Number(data.costPrice),
          categoryIds: data.categoryIds || [],
          image: data.image || undefined,
          status: data.status,
        });

        if (!result.success) {
          throw new Error(result.error || "Failed to update item");
        }

        const basePath = getBasePathFromPathname(pathname);
        router.push(`${basePath}/items`);
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
            {mode === "create" ? "Add New Service" : "Edit Service"}
          </CardTitle>
          <CardDescription>
            {mode === "create" ? "Enter service details to create a new service" : "Update service information"}
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
                  placeholder="SVC-001"
                  {...register("code")}
                  disabled={loading}
                />
                {errors.code && (
                  <p className="text-sm text-destructive">{errors.code.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Service Name</Label>
                <Input
                  id="description"
                  type="text"
                  placeholder="Service description"
                  {...register("description")}
                  disabled={loading}
                />
                {errors.description && (
                  <p className="text-sm text-destructive">{errors.description.message}</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="unitId">Unit</Label>
                  <Controller
                    name="unitId"
                    control={control}
                    render={({ field }) => (
                      <Select
                        value={field.value}
                        onValueChange={(value) => {
                          field.onChange(value);
                          setUnitSearch(""); // Clear search on selection
                        }}
                        disabled={loading || loadingUnits}
                      >
                        <SelectTrigger id="unitId">
                          <SelectValue placeholder="Select unit" />
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

                <div className="space-y-2">
                  <Label htmlFor="costPrice">Cost Price</Label>
                  <Input
                    id="costPrice"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    {...register("costPrice")}
                    disabled={loading}
                  />
                  {errors.costPrice && (
                    <p className="text-sm text-destructive">{errors.costPrice.message}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="categoryIds">Categories (Optional)</Label>
                {loadingCategories ? (
                  <p className="text-sm text-muted-foreground">Loading categories...</p>
                ) : categories.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No categories available</p>
                ) : (
                <Controller
                    name="categoryIds"
                  control={control}
                    render={({ field }) => {
                      const categoryOptions: MultiSelectOption[] = categories.map((category) => ({
                        label: category.name,
                        value: category.id,
                      }));

                      return (
                        <MultiSelect
                          options={categoryOptions}
                          value={field.value || []}
                          onValueChange={(values) => {
                            field.onChange(values);
                          }}
                          placeholder="Select categories..."
                          disabled={loading}
                          maxCount={3}
                        />
                      );
                    }}
                  />
                  )}
                {errors.categoryIds && (
                  <p className="text-sm text-destructive">{errors.categoryIds.message}</p>
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
                  {loading ? "Saving..." : mode === "create" ? "Create Service" : "Update Service"}
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
                    <Label className="text-center">Service Photo</Label>
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
