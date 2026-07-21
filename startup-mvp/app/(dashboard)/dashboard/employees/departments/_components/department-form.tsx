"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FiAlertCircle } from "react-icons/fi";
import { createDepartment, updateDepartment } from "../_actions/department.action";
import { useToast } from "@/hooks/use-toast";

const departmentFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional().or(z.literal("")),
  status: z.enum(["active", "inactive"]),
});

type DepartmentFormData = z.infer<typeof departmentFormSchema>;

interface DepartmentFormProps {
  mode: "create" | "edit";
  initialData?: {
    id: string;
    name: string;
    description: string | null;
    status: string;
  };
}

export default function DepartmentForm({ mode, initialData }: DepartmentFormProps) {
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
  } = useForm<DepartmentFormData>({
    resolver: zodResolver(departmentFormSchema as any),
    defaultValues: initialData
      ? {
          name: initialData.name,
          description: initialData.description || "",
          status: (initialData.status === "trash" ? "active" : initialData.status) as "active" | "inactive",
        }
      : {
          name: "",
          description: "",
          status: "active",
        },
  });

  const onSubmit = async (data: DepartmentFormData) => {
    try {
      setLoading(true);
      setError("");

      if (mode === "create") {
        const result = await createDepartment({
          name: data.name,
          description: data.description || undefined,
          status: data.status,
        });

        if (!result.success) {
          throw new Error(result.error || "Failed to create department");
        }

        toast({ title: "Success", description: "Department created successfully" });
        router.push(`/dashboard/employees/departments`);
      } else if (mode === "edit" && initialData) {
        const result = await updateDepartment(initialData.id, {
          name: data.name,
          description: data.description || undefined,
          status: data.status,
        });

        if (!result.success) {
          throw new Error(result.error || "Failed to update department");
        }

        toast({ title: "Success", description: "Department updated successfully" });
        router.push(`/dashboard/employees/departments`);
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
            {mode === "create" ? "Add New Department" : "Edit Department"}
          </CardTitle>
          <CardDescription>
            {mode === "create"
              ? "Create a dynamic department category. Used for employee profile setup and organizational filtering."
              : "Update department details."}
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

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Department Name *</Label>
                  <Input
                    id="name"
                    placeholder="e.g., HR, Engineering, Sales, Accounts"
                    {...register("name")}
                    disabled={loading}
                  />
                  {errors.name && (
                    <p className="text-sm text-destructive">{errors.name.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Describe this department's functions or details..."
                    {...register("description")}
                    disabled={loading}
                    rows={4}
                  />
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
                onClick={() => router.push("/dashboard/employees/departments")}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Saving..." : mode === "create" ? "Add Department" : "Update Department"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
