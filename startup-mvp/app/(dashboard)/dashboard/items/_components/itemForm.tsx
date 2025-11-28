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
import { FiAlertCircle } from "react-icons/fi";
import { createUnit, updateUnit } from "../_actions/unit.action";

const unitFormSchema = z.object({
  details: z.string().min(1, "Details is required"),
  symbol: z.string().min(1, "Symbol is required"),
  status: z.enum(["active", "inactive"]),
});

type UnitFormDataWithId = z.infer<typeof unitFormSchema> & { id?: string };

interface UnitFormProps {
  mode: "create" | "edit";
  initialData?: {
    id: string;
    details: string;
    symbol: string;
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
    setValue,
  } = useForm<UnitFormDataWithId>({
    resolver: zodResolver(unitFormSchema),
    defaultValues: initialData
      ? {
          details: initialData.details,
          symbol: initialData.symbol,
          status: (initialData.status as "active" | "inactive") || "active",
        }
      : {
          details: "",
          symbol: "",
          status: "active",
        },
  });

  const onSubmit = async (data: UnitFormDataWithId) => {
    try {
      setLoading(true);
      setError("");

      if (mode === "create") {
        const result = await createUnit({
          details: data.details,
          symbol: data.symbol,
          status: data.status,
        });

        if (!result.success) {
          throw new Error(result.error || "Failed to create unit");
        }

        router.push("/dashboard/items/units");
      } else {
        const result = await updateUnit({
          id: initialData!.id,
          details: data.details,
          symbol: data.symbol,
          status: data.status,
        });

        if (!result.success) {
          throw new Error(result.error || "Failed to update unit");
        }

        router.push("/dashboard/items/units");
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
            {mode === "create" ? "Enter unit details to create a new unit" : "Update unit information"}
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

              <div className="space-y-2">
                <Label htmlFor="symbol">Symbol</Label>
                <Input
                  id="symbol"
                  type="text"
                  placeholder="kg, m, L, etc."
                  {...register("symbol")}
                  disabled={loading}
                />
                {errors.symbol && (
                  <p className="text-sm text-destructive">{errors.symbol.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="details">Details</Label>
                <Input
                  id="details"
                  type="text"
                  placeholder="Kilogram, Meter, Liter, etc."
                  {...register("details")}
                  disabled={loading}
                />
                {errors.details && (
                  <p className="text-sm text-destructive">{errors.details.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  defaultValue={initialData?.status || "active"}
                  onValueChange={(value) => setValue("status", value as "active" | "inactive")}
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
                {errors.status && (
                  <p className="text-sm text-destructive">{errors.status.message}</p>
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

