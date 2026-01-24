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
import { createUnit, updateUnit } from "../_actions/unit.action";

const unitFormSchema = z.object({
  symbol: z.string().min(1, "Symbol is required"),
  details: z.string().min(1, "Details are required"),
  status: z.enum(["active", "inactive"]),
});

type UnitFormData = z.infer<typeof unitFormSchema>;

interface UnitFormProps {
  mode: "create" | "edit";
  initialData?: {
    id: string;
    symbol: string;
    details: string;
    status: string;
  };
}

export default function UnitForm({ mode, initialData }: UnitFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    control,
  } = useForm<UnitFormData>({
    resolver: zodResolver(unitFormSchema),
    defaultValues: initialData
      ? {
          symbol: initialData.symbol,
          details: initialData.details,
          status: (initialData.status === "active" || initialData.status === "inactive") 
            ? initialData.status as "active" | "inactive"
            : "active",
        }
      : {
          symbol: "",
          details: "",
          status: "active",
        },
  });

  const onSubmit = async (data: UnitFormData) => {
    try {
      setLoading(true);
      setError("");

      if (mode === "create") {
        const result = await createUnit({
          symbol: data.symbol,
          details: data.details,
          status: data.status,
        });

        if (!result.success) {
          throw new Error(result.error || "Failed to create unit");
        }

        router.push("/dashboard/master/units");
        router.refresh();
      } else {
        const result = await updateUnit({
          id: initialData!.id,
          symbol: data.symbol,
          details: data.details,
          status: data.status,
        });

        if (!result.success) {
          throw new Error(result.error || "Failed to update unit");
        }

        router.push("/dashboard/master/units");
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
            {mode === "create" ? "Add New Unit" : "Edit Unit"}
          </CardTitle>
          <CardDescription>
            {mode === "create" 
              ? "Enter unit details to create a new unit" 
              : "Update unit information"}
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
                  <Label htmlFor="symbol">Symbol *</Label>
                  <Input
                    id="symbol"
                    type="text"
                    placeholder="e.g., kg, pcs, ltr"
                    {...register("symbol")}
                    disabled={loading}
                  />
                  {errors.symbol && (
                    <p className="text-sm text-destructive">{errors.symbol.message}</p>
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
                <Label htmlFor="details">Details *</Label>
                <Textarea
                  id="details"
                  placeholder="e.g., Kilograms, Pieces, Liters"
                  {...register("details")}
                  disabled={loading}
                  rows={3}
                />
                {errors.details && (
                  <p className="text-sm text-destructive">{errors.details.message}</p>
                )}
              </div>

              <div className="flex items-center gap-3 pt-4">
                <Button type="submit" disabled={loading}>
                  {loading ? "Saving..." : mode === "create" ? "Create Unit" : "Update Unit"}
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
