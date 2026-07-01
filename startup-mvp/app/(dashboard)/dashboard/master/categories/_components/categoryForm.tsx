"use client";

import { useState } from "react";
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
import { FiAlertCircle } from "react-icons/fi";
import { createCategory, updateCategory } from "../_actions/category.action";
import MediaSelector from "@/components/MediaSelector";

const categoryFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional().or(z.literal("")),
  status: z.enum(["active", "inactive"]),
  image: z.string().optional().nullable(),
});

type CategoryFormData = z.infer<typeof categoryFormSchema>;

interface CategoryFormProps {
  mode: "create" | "edit";
  initialData?: {
    id: string;
    name: string;
    description: string | null;
    status: string;
    image?: string | null;
  };
}

export default function CategoryForm({ mode, initialData }: CategoryFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    control,
    setValue,
    watch,
  } = useForm<CategoryFormData>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: initialData
      ? {
          name: initialData.name,
          description: initialData.description || "",
          status: (initialData.status === "active" || initialData.status === "inactive") 
            ? initialData.status as "active" | "inactive"
            : "active",
          image: initialData.image || null,
        }
      : {
          name: "",
          description: "",
          status: "active",
          image: null,
        },
  });

  const watchedImage = watch("image");

  const onSubmit = async (data: CategoryFormData) => {
    try {
      setLoading(true);
      setError("");

      if (mode === "create") {
        const result = await createCategory({
          name: data.name,
          description: data.description || undefined,
          status: data.status,
          image: data.image,
        });

        if (!result.success) {
          throw new Error(result.error || "Failed to create category");
        }

        router.push("/dashboard/master/categories");
        router.refresh();
      } else {
        const result = await updateCategory({
          id: initialData!.id,
          name: data.name,
          description: data.description || undefined,
          status: data.status,
          image: data.image,
        });

        if (!result.success) {
          throw new Error(result.error || "Failed to update category");
        }

        router.push("/dashboard/master/categories");
        router.refresh();
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
            {mode === "create" ? "Add New Category" : "Edit Category"}
          </CardTitle>
          <CardDescription>
            {mode === "create" 
              ? "Enter category details to create a new category" 
              : "Update category information"}
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

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Left Column (Category Details) */}
                <div className="md:col-span-2 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Category Name</Label>
                    <Input
                      id="name"
                      type="text"
                      placeholder="e.g., Furniture, Flooring, Paint"
                      {...register("name")}
                      disabled={loading}
                    />
                    {errors.name && (
                      <p className="text-sm text-destructive">{errors.name.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description (Optional)</Label>
                    <Textarea
                      id="description"
                      placeholder="Category description..."
                      {...register("description")}
                      disabled={loading}
                      rows={4}
                    />
                    {errors.description && (
                      <p className="text-sm text-destructive">{errors.description.message}</p>
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
                </div>

                {/* Right Column (Category Image) */}
                <div className="md:col-span-1 space-y-2 border-t md:border-t-0 md:border-l pt-6 md:pt-0 pl-0 md:pl-6 border-border/40">
                  <Label htmlFor="image">Category Image (Optional)</Label>
                  <div className="flex flex-col gap-3">
                    {watchedImage ? (
                      <div className="relative w-full aspect-square rounded-lg border overflow-hidden bg-muted/20">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={watchedImage} alt="Category" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setValue("image", null, { shouldDirty: true, shouldValidate: true })}
                          className="absolute top-2 right-2 p-1.5 bg-destructive text-white rounded-full hover:bg-destructive/90 transition-colors shadow-sm"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                        </button>
                      </div>
                    ) : (
                      <div className="w-full aspect-square">
                        <MediaSelector
                          label=""
                          value=""
                          onChange={(url) => setValue("image", url || null, { shouldDirty: true, shouldValidate: true })}
                          allowedTypes={["image/*"]}
                          previewStyle="square"
                        />
                      </div>
                    )}
                    <div className="text-xs text-muted-foreground leading-normal">
                      Upload a representative photo for this category. Allowed formats: PNG, JPG, JPEG.
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-4">
                <Button type="submit" disabled={loading}>
                  {loading ? "Saving..." : mode === "create" ? "Create Category" : "Update Category"}
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
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
