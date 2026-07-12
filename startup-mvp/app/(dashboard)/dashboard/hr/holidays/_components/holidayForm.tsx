"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
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
import { FiAlertCircle, FiCalendar, FiMapPin } from "react-icons/fi";
import { createHoliday, updateHoliday } from "../_actions/holiday.action";
import { getWarehouses } from "../../../master/warehouses/_actions/warehouse.action";
import { getBasePathFromPathname } from "@/lib/route-utils-client";
import { useToast } from "@/hooks/use-toast";
import { SearchableSelect } from "@/components/ui/searchable-select";

const holidayFormSchema = z.object({
  name: z.string().min(1, "Holiday name is required"),
  date: z.string().min(1, "Date is required"),
  warehouseId: z.string().optional().or(z.literal("")),
  status: z.enum(["active", "inactive"]),
});

type HolidayFormData = z.infer<typeof holidayFormSchema>;

interface HolidayFormProps {
  mode: "create" | "edit";
  initialData?: {
    id: string;
    name: string;
    date: Date;
    warehouseId: string | null;
    status: string;
  };
}

export default function HolidayForm({ mode, initialData }: HolidayFormProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [warehouses, setWarehouses] = useState<{id: string, name: string}[]>([]);

  useEffect(() => {
    async function loadWarehouses() {
      const result = await getWarehouses(1, 100);
      if (result.success && result.warehouses) {
        setWarehouses(result.warehouses);
      }
    }
    loadWarehouses();
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<HolidayFormData>({
    resolver: zodResolver(holidayFormSchema),
    defaultValues: initialData
      ? {
          name: initialData.name,
          date: new Date(initialData.date).toISOString().split("T")[0],
          warehouseId: initialData.warehouseId || "",
          status: (initialData.status === "trash" ? "active" : initialData.status) as "active" | "inactive",
        }
      : {
          name: "",
          date: new Date().toISOString().split("T")[0],
          warehouseId: "",
          status: "active",
        },
  });

  const onSubmit = async (data: HolidayFormData) => {
    try {
      setLoading(true);
      setError("");

      if (mode === "create") {
        const result = await createHoliday({
          ...data,
          warehouseId: data.warehouseId === "global" ? undefined : data.warehouseId,
        });

        if (!result.success || !result.holiday) {
          throw new Error(result.error || "Failed to create holiday");
        }

        toast({
          title: "Success",
          description: "Holiday created successfully",
        });

        const basePath = getBasePathFromPathname(pathname);
        router.push(`${basePath}/hr/holidays`);
      } else if (mode === "edit" && initialData) {
        const result = await updateHoliday(initialData.id, {
          ...data,
          warehouseId: data.warehouseId === "global" ? null : data.warehouseId,
        });

        if (!result.success) {
          throw new Error(result.error || "Failed to update holiday");
        }

        toast({
          title: "Success",
          description: "Holiday updated successfully",
        });

        const basePath = getBasePathFromPathname(pathname);
        router.push(`${basePath}/hr/holidays`);
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "An unexpected error occurred. Please try again.";
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>
            {mode === "create" ? "Add New Holiday" : "Edit Holiday"}
          </CardTitle>
          <CardDescription>
            {mode === "create"
              ? "Add a company holiday or a branch-specific holiday."
              : "Update holiday details."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="space-y-6">
              {error && (
                <div className="flex items-start gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive border border-destructive/20">
                  <FiAlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Holiday Name *</Label>
                    <Input
                      id="name"
                      placeholder="e.g., Eid ul-Fitr, National Day"
                      {...register("name")}
                      disabled={loading}
                    />
                    {errors.name && (
                      <p className="text-sm text-destructive">{errors.name.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="date">Date *</Label>
                    <div className="relative">
                      <FiCalendar className="absolute left-3 top-3 text-muted-foreground" />
                      <Input
                        id="date"
                        type="date"
                        className="pl-10"
                        {...register("date")}
                        disabled={loading}
                      />
                    </div>
                    {errors.date && (
                      <p className="text-sm text-destructive">{errors.date.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="warehouseId">Branch / Warehouse (Optional)</Label>
                    <SearchableSelect
                      value={watch("warehouseId") || "global"}
                      onValueChange={(value) => setValue("warehouseId", value || "global")}
                      disabled={loading}
                      placeholder="Select branch"
                      options={[
                        { value: "global", label: "Global (All Branches)" },
                        ...warehouses.map(w => ({ value: w.id, label: w.name }))
                      ]}
                    />
                    <p className="text-xs text-muted-foreground">
                      If Global is selected, this holiday applies to all employees. If a specific branch is selected, it only applies to employees assigned to that branch.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <Select
                      defaultValue={watch("status")}
                      onValueChange={(value) => setValue("status", value as "active" | "inactive")}
                      disabled={loading}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent className="max-h-[250px]">
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-4 mt-6 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Saving..." : mode === "create" ? "Add Holiday" : "Update Holiday"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
