"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
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
import { createWarehouse, updateWarehouse } from "../_actions/warehouse.action";
import { Controller } from "react-hook-form";

const warehouseFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
  country: z.string().optional(),
  status: z.enum(["active", "inactive"]),
});

type WarehouseFormData = z.infer<typeof warehouseFormSchema>;

interface WarehouseFormProps {
  mode: "create" | "edit";
  initialData?: {
    id: string;
    code: string;
    name: string;
    address: string | null;
    city: string | null;
    state: string | null;
    zip: string | null;
    country: string | null;
    status: string;
  };
}

export default function WarehouseForm({ mode, initialData }: WarehouseFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    control,
  } = useForm<WarehouseFormData>({
    resolver: zodResolver(warehouseFormSchema),
    defaultValues: initialData
      ? {
          name: initialData.name,
          address: initialData.address || "",
          city: initialData.city || "",
          state: initialData.state || "",
          zip: initialData.zip || "",
          country: initialData.country || "",
          status: (initialData.status === "active" || initialData.status === "inactive") 
            ? initialData.status as "active" | "inactive"
            : "active",
        }
      : {
          name: "",
          address: "",
          city: "",
          state: "",
          zip: "",
          country: "",
          status: "active",
        },
  });

  const onSubmit = async (data: WarehouseFormData) => {
    try {
      setLoading(true);
      setError("");

      if (mode === "create") {
        const result = await createWarehouse({
          name: data.name,
          address: data.address || undefined,
          city: data.city || undefined,
          state: data.state || undefined,
          zip: data.zip || undefined,
          country: data.country || undefined,
          status: data.status,
        });

        if (!result.success) {
          throw new Error(result.error || "Failed to create warehouse");
        }

        router.push("/dashboard/master/warehouses");
      } else {
        const result = await updateWarehouse({
          id: initialData!.id,
          name: data.name,
          address: data.address || undefined,
          city: data.city || undefined,
          state: data.state || undefined,
          zip: data.zip || undefined,
          country: data.country || undefined,
          status: data.status,
        });

        if (!result.success) {
          throw new Error(result.error || "Failed to update warehouse");
        }

        router.push("/dashboard/master/warehouses");
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
            {mode === "create" ? "Add New Warehouse" : "Edit Warehouse"}
          </CardTitle>
          <CardDescription>
            {mode === "create" 
              ? "Enter warehouse details to create a new warehouse" 
              : "Update warehouse information"}
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Warehouse Name *</Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="e.g., Main Warehouse, Kitchen Warehouse"
                    {...register("name")}
                    disabled={loading}
                  />
                  {errors.name && (
                    <p className="text-sm text-destructive">{errors.name.message}</p>
                  )}
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

              <div className="space-y-2">
                <Label htmlFor="address">Address (Optional)</Label>
                <Textarea
                  id="address"
                  placeholder="Street address..."
                  {...register("address")}
                  disabled={loading}
                  rows={2}
                />
                {errors.address && (
                  <p className="text-sm text-destructive">{errors.address.message}</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">City (Optional)</Label>
                  <Input
                    id="city"
                    type="text"
                    placeholder="City name"
                    {...register("city")}
                    disabled={loading}
                  />
                  {errors.city && (
                    <p className="text-sm text-destructive">{errors.city.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="state">State/Province (Optional)</Label>
                  <Input
                    id="state"
                    type="text"
                    placeholder="State or province"
                    {...register("state")}
                    disabled={loading}
                  />
                  {errors.state && (
                    <p className="text-sm text-destructive">{errors.state.message}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="zip">ZIP/Postal Code (Optional)</Label>
                  <Input
                    id="zip"
                    type="text"
                    placeholder="ZIP or postal code"
                    {...register("zip")}
                    disabled={loading}
                  />
                  {errors.zip && (
                    <p className="text-sm text-destructive">{errors.zip.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="country">Country (Optional)</Label>
                  <Input
                    id="country"
                    type="text"
                    placeholder="Country name"
                    {...register("country")}
                    disabled={loading}
                  />
                  {errors.country && (
                    <p className="text-sm text-destructive">{errors.country.message}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3 pt-4">
                <Button type="submit" disabled={loading}>
                  {loading ? "Saving..." : mode === "create" ? "Create Warehouse" : "Update Warehouse"}
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
