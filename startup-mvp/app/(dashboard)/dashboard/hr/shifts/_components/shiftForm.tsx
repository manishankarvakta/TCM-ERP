"use client";

import { useState } from "react";
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
import { FiAlertCircle, FiClock, FiSettings, FiBriefcase } from "react-icons/fi";
import { createShift, updateShift } from "../_actions/shift.action";
import { getBasePathFromPathname } from "@/lib/route-utils-client";
import { useToast } from "@/hooks/use-toast";

const shiftFormSchema = z.object({
  name: z.string().min(1, "Shift name is required"),
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format (HH:MM)"),
  endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format (HH:MM)"),
  breakStartTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format (HH:MM)").nullable().or(z.literal("")).or(z.undefined()),
  breakEndTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format (HH:MM)").nullable().or(z.literal("")).or(z.undefined()),
  breakGraceMinutes: z.coerce.number().min(0, "Break grace minutes cannot be negative").optional(),
  breakLateAfter: z.coerce.number().min(0, "Break late after cannot be negative").optional(),
  breakType: z.enum(["NONE", "TRACKED", "FIXED"]),
  breakDuration: z.coerce.number().min(0, "Break duration cannot be negative").optional(),
  graceMinutes: z.coerce.number().min(0, "Grace minutes cannot be negative"),
  lateAfter: z.coerce.number().min(0, "Late after cannot be negative"),
  halfDayAfter: z.coerce.number().min(0, "Half-day after cannot be negative"),
  otStartAfter: z.coerce.number().min(0, "OT start after cannot be negative"),
  status: z.enum(["active", "inactive"]),
});

type ShiftFormData = z.infer<typeof shiftFormSchema>;

interface ShiftFormProps {
  mode: "create" | "edit";
  initialData?: {
    id: string;
    name: string;
    startTime: string;
    endTime: string;
    breakStartTime?: string | null;
    breakEndTime?: string | null;
    breakGraceMinutes?: number | null;
    breakLateAfter?: number | null;
    breakType?: string | null;
    breakDuration?: number | null;
    graceMinutes: number;
    lateAfter: number;
    halfDayAfter: number;
    otStartAfter: number;
    status: string;
  };
}

export default function ShiftForm({ mode, initialData }: ShiftFormProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<ShiftFormData>({
    resolver: zodResolver(shiftFormSchema as any),
    defaultValues: initialData
      ? {
          name: initialData.name,
          startTime: initialData.startTime,
          endTime: initialData.endTime,
          breakStartTime: initialData.breakStartTime ?? "",
          breakEndTime: initialData.breakEndTime ?? "",
          breakGraceMinutes: initialData.breakGraceMinutes ?? 0,
          breakLateAfter: initialData.breakLateAfter ?? 15,
          breakType: (initialData.breakType ?? "NONE") as "NONE" | "TRACKED" | "FIXED",
          breakDuration: initialData.breakDuration ?? 0,
          graceMinutes: initialData.graceMinutes,
          lateAfter: initialData.lateAfter,
          halfDayAfter: initialData.halfDayAfter,
          otStartAfter: initialData.otStartAfter,
          status: (initialData.status === "trash" ? "active" : initialData.status) as "active" | "inactive",
        }
      : {
          name: "",
          startTime: "09:00",
          endTime: "18:00",
          breakStartTime: "",
          breakEndTime: "",
          breakGraceMinutes: 0,
          breakLateAfter: 15,
          breakType: "NONE",
          breakDuration: 0,
          graceMinutes: 0,
          lateAfter: 15,
          halfDayAfter: 120,
          otStartAfter: 30,
          status: "active",
        },
  });

  const onSubmit = async (data: ShiftFormData) => {
    try {
      setLoading(true);
      setError("");

      const payload = {
        ...data,
        breakStartTime: data.breakType === "TRACKED" && data.breakStartTime !== "" ? data.breakStartTime : null,
        breakEndTime: data.breakType === "TRACKED" && data.breakEndTime !== "" ? data.breakEndTime : null,
        breakGraceMinutes: data.breakType === "TRACKED" ? data.breakGraceMinutes : 0,
        breakLateAfter: data.breakType === "TRACKED" ? data.breakLateAfter : 0,
        breakDuration: data.breakType === "NONE" ? 0 : data.breakDuration,
      };

      if (mode === "create") {
        const result = await createShift(payload);

        if (!result.success || !result.shift) {
          throw new Error(result.error || "Failed to create shift");
        }

        toast({
          title: "Success",
          description: "Shift created successfully",
        });

        const basePath = getBasePathFromPathname(pathname);
        router.push(`${basePath}/hr/shifts`);
      } else if (mode === "edit" && initialData) {
        const result = await updateShift(initialData.id, payload);

        if (!result.success) {
          throw new Error(result.error || "Failed to update shift");
        }

        toast({
          title: "Success",
          description: "Shift updated successfully",
        });

        const basePath = getBasePathFromPathname(pathname);
        router.push(`${basePath}/hr/shifts`);
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
    <div className="w-full max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>
            {mode === "create" ? "Create New Shift" : "Edit Shift"}
          </CardTitle>
          <CardDescription>
            {mode === "create"
              ? "Define a new working shift with its timing and policies."
              : "Update the timing and policies for this shift."}
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

              {/* Basic Information */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 border-b pb-2">
                  <FiBriefcase className="text-primary" />
                  <h3 className="font-semibold">Basic Information</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Shift Name *</Label>
                    <Input
                      id="name"
                      placeholder="e.g., General Shift, Morning Shift"
                      {...register("name")}
                      disabled={loading}
                    />
                    {errors.name && (
                      <p className="text-sm text-destructive">{errors.name.message}</p>
                    )}
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

              {/* Timing */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 border-b pb-2">
                  <FiClock className="text-primary" />
                  <h3 className="font-semibold">Timing</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="startTime">Start Time (HH:MM) *</Label>
                    <Input
                      id="startTime"
                      type="time"
                      {...register("startTime")}
                      disabled={loading}
                    />
                    {errors.startTime && (
                      <p className="text-sm text-destructive">{errors.startTime.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="endTime">End Time (HH:MM) *</Label>
                    <Input
                      id="endTime"
                      type="time"
                      {...register("endTime")}
                      disabled={loading}
                    />
                    {errors.endTime && (
                      <p className="text-sm text-destructive">{errors.endTime.message}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Break Settings */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 border-b pb-2">
                  <FiClock className="text-primary" />
                  <h3 className="font-semibold">Break Settings</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="breakType">Break Mode</Label>
                    <Select
                      disabled={loading}
                      onValueChange={(val) => setValue("breakType", val as any)}
                      value={watch("breakType")}
                    >
                      <SelectTrigger id="breakType">
                        <SelectValue placeholder="Select Break Mode" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="NONE">None (No Break)</SelectItem>
                        <SelectItem value="FIXED">Fixed Break Deduction</SelectItem>
                        <SelectItem value="TRACKED">Tracked Break (Punches & Lateness)</SelectItem>
                      </SelectContent>
                    </Select>
                    {errors.breakType && (
                      <p className="text-sm text-destructive">{errors.breakType.message}</p>
                    )}
                  </div>

                  {watch("breakType") !== "NONE" && (
                    <div className="space-y-2">
                      <Label htmlFor="breakDuration">Break Duration (minutes)</Label>
                      <Input
                        id="breakDuration"
                        type="number"
                        placeholder="e.g., 60"
                        {...register("breakDuration")}
                        disabled={loading}
                      />
                      <p className="text-xs text-muted-foreground">Break minutes to deduct from total work hours.</p>
                      {errors.breakDuration && (
                        <p className="text-sm text-destructive">{errors.breakDuration.message}</p>
                      )}
                    </div>
                  )}

                  {watch("breakType") === "TRACKED" && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="breakStartTime">Break Start Time (HH:MM)</Label>
                        <Input
                          id="breakStartTime"
                          type="time"
                          {...register("breakStartTime")}
                          disabled={loading}
                        />
                        {errors.breakStartTime && (
                          <p className="text-sm text-destructive">{errors.breakStartTime.message}</p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="breakEndTime">Break End Time (HH:MM)</Label>
                        <Input
                          id="breakEndTime"
                          type="time"
                          {...register("breakEndTime")}
                          disabled={loading}
                        />
                        {errors.breakEndTime && (
                          <p className="text-sm text-destructive">{errors.breakEndTime.message}</p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="breakGraceMinutes">Break Grace Period (minutes)</Label>
                        <Input
                          id="breakGraceMinutes"
                          type="number"
                          placeholder="e.g., 5"
                          {...register("breakGraceMinutes")}
                          disabled={loading}
                        />
                        <p className="text-xs text-muted-foreground">Minutes allowed after break ends without lateness penalty.</p>
                        {errors.breakGraceMinutes && (
                          <p className="text-sm text-destructive">{errors.breakGraceMinutes.message}</p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="breakLateAfter">Break Lateness Limit (minutes)</Label>
                        <Input
                          id="breakLateAfter"
                          type="number"
                          placeholder="e.g., 15"
                          {...register("breakLateAfter")}
                          disabled={loading}
                        />
                        <p className="text-xs text-muted-foreground">Minutes after break ends to mark re-entry as Late.</p>
                        {errors.breakLateAfter && (
                          <p className="text-sm text-destructive">{errors.breakLateAfter.message}</p>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Policies */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 border-b pb-2">
                  <FiSettings className="text-primary" />
                  <h3 className="font-semibold">Policies</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="graceMinutes">Grace Period (minutes)</Label>
                    <Input
                      id="graceMinutes"
                      type="number"
                      placeholder="e.g., 0"
                      {...register("graceMinutes")}
                      disabled={loading}
                    />
                    <p className="text-xs text-muted-foreground">Minutes allowed after start time without penalty.</p>
                    {errors.graceMinutes && (
                      <p className="text-sm text-destructive">{errors.graceMinutes.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="lateAfter">Mark Late After (minutes)</Label>
                    <Input
                      id="lateAfter"
                      type="number"
                      placeholder="e.g., 15"
                      {...register("lateAfter")}
                      disabled={loading}
                    />
                    <p className="text-xs text-muted-foreground">Minutes after start time to mark attendance as Late.</p>
                    {errors.lateAfter && (
                      <p className="text-sm text-destructive">{errors.lateAfter.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="halfDayAfter">Mark Half-Day After (minutes)</Label>
                    <Input
                      id="halfDayAfter"
                      type="number"
                      placeholder="e.g., 120"
                      {...register("halfDayAfter")}
                      disabled={loading}
                    />
                    <p className="text-xs text-muted-foreground">Minutes after start time to mark attendance as Half Day.</p>
                    {errors.halfDayAfter && (
                      <p className="text-sm text-destructive">{errors.halfDayAfter.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="otStartAfter">Overtime Starts After (minutes)</Label>
                    <Input
                      id="otStartAfter"
                      type="number"
                      placeholder="e.g., 30"
                      {...register("otStartAfter")}
                      disabled={loading}
                    />
                    <p className="text-xs text-muted-foreground">Minutes after end time before Overtime is counted.</p>
                    {errors.otStartAfter && (
                      <p className="text-sm text-destructive">{errors.otStartAfter.message}</p>
                    )}
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
                {loading ? "Saving..." : mode === "create" ? "Create Shift" : "Update Shift"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
