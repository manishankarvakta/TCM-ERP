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
import { createLeaveType, updateLeaveType } from "../_actions/leave-type.action";
import { useToast } from "@/hooks/use-toast";
import { LeaveCategory } from "@prisma/client";

const leaveTypeFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  category: z.nativeEnum(LeaveCategory),
  defaultDays: z.coerce.number().min(0, "Days must be 0 or more"),
  isPaid: z.enum(["true", "false"]),
  status: z.enum(["active", "inactive"]),
});

type LeaveTypeFormData = z.infer<typeof leaveTypeFormSchema>;

interface LeaveTypeFormProps {
  mode: "create" | "edit";
  initialData?: {
    id: string;
    name: string;
    category: string;
    defaultDays: number;
    isPaid: boolean;
    status: string;
  };
}

export default function LeaveTypeForm({ mode, initialData }: LeaveTypeFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<LeaveTypeFormData>({
    resolver: zodResolver(leaveTypeFormSchema as any),
    defaultValues: initialData
      ? {
          name: initialData.name,
          category: initialData.category as LeaveCategory,
          defaultDays: initialData.defaultDays,
          isPaid: initialData.isPaid ? "true" : "false",
          status: (initialData.status === "trash" ? "active" : initialData.status) as "active" | "inactive",
        }
      : {
          name: "",
          category: "ANNUAL",
          defaultDays: 0,
          isPaid: "true",
          status: "active",
        },
  });

  const onSubmit = async (data: LeaveTypeFormData) => {
    try {
      setLoading(true);
      setError("");

      if (mode === "create") {
        const result = await createLeaveType({
          name: data.name,
          category: data.category,
          defaultDays: data.defaultDays,
          isPaid: data.isPaid === "true",
          status: data.status,
        });

        if (!result.success) {
          throw new Error(result.error || "Failed to create leave type");
        }

        toast({ title: "Success", description: "Leave type created successfully" });
        router.push(`/dashboard/hr/leave/types`);
      } else if (mode === "edit" && initialData) {
        const result = await updateLeaveType(initialData.id, {
          name: data.name,
          category: data.category,
          defaultDays: data.defaultDays,
          isPaid: data.isPaid === "true",
          status: data.status,
        });

        if (!result.success) {
          throw new Error(result.error || "Failed to update leave type");
        }

        toast({ title: "Success", description: "Leave type updated successfully" });
        router.push(`/dashboard/hr/leave/types`);
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "An unexpected error occurred.";
      setError(errorMessage);
      toast({ title: "Error", description: errorMessage, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>
            {mode === "create" ? "Add New Leave Type" : "Edit Leave Type"}
          </CardTitle>
          <CardDescription>
            {mode === "create"
              ? "Create a new leave category and define its default yearly balance."
              : "Update leave type details."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit as any)}>
            <div className="space-y-6">
              {error && (
                <div className="flex items-start gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive border border-destructive/20">
                  <FiAlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="name">Leave Type Name *</Label>
                  <Input
                    id="name"
                    placeholder="e.g., Casual Leave, Sick Leave"
                    {...register("name")}
                    disabled={loading}
                  />
                  {errors.name && (
                    <p className="text-sm text-destructive">{errors.name.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Category *</Label>
                  <Select
                    defaultValue={watch("category")}
                    onValueChange={(val) => setValue("category", val as LeaveCategory)}
                    disabled={loading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Category" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[250px]">
                      <SelectItem value="ANNUAL">Annual Leave</SelectItem>
                      <SelectItem value="CASUAL">Casual Leave</SelectItem>
                      <SelectItem value="SICK">Sick Leave</SelectItem>
                      <SelectItem value="MATERNITY">Maternity Leave</SelectItem>
                      <SelectItem value="UNPAID">Unpaid Leave</SelectItem>
                      <SelectItem value="OTHER">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.category && (
                    <p className="text-sm text-destructive">{errors.category.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="defaultDays">Default Yearly Balance (Days) *</Label>
                  <Input
                    id="defaultDays"
                    type="number"
                    min={0}
                    {...register("defaultDays")}
                    disabled={loading}
                  />
                  {errors.defaultDays && (
                    <p className="text-sm text-destructive">{errors.defaultDays.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="isPaid">Paid Status *</Label>
                  <Select
                    defaultValue={watch("isPaid")}
                    onValueChange={(val) => setValue("isPaid", val as "true" | "false")}
                    disabled={loading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Paid Status" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[250px]">
                      <SelectItem value="true">Paid Leave</SelectItem>
                      <SelectItem value="false">Unpaid Leave</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">Used during payroll calculation.</p>
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

            <div className="flex justify-end gap-4 mt-6 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/dashboard/hr/leave/types")}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Saving..." : mode === "create" ? "Add Leave Type" : "Update Leave Type"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
