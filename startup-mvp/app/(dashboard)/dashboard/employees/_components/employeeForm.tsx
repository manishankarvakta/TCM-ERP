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
import { FiAlertCircle } from "react-icons/fi";
import { createEmployee, updateEmployee } from "../_actions/employee.action";
import { getBasePathFromPathname } from "@/lib/route-utils-client";
import { useToast } from "@/hooks/use-toast";

const employeeFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.union([z.string().email("Invalid email address"), z.literal("")]).optional(),
  phone: z.string().optional().or(z.literal("")),
  status: z.enum(["active", "inactive"]),
});

type EmployeeFormData = z.infer<typeof employeeFormSchema>;

interface EmployeeFormProps {
  mode: "create" | "edit";
  initialData?: {
    id: string;
    name: string;
    employeeCode: string | null;
    email: string | null;
    phone: string | null;
    userId: string | null;
    user: {
      id: string;
      name: string | null;
      email: string;
    } | null;
    status: string;
    salaryPayableAccount: {
      id: string;
      code: string;
      name: string;
      type: string;
    } | null;
    advanceAccount: {
      id: string;
      code: string;
      name: string;
      type: string;
    } | null;
    createdAt: Date;
    updatedAt: Date;
  };
}

export default function EmployeeForm({ mode, initialData }: EmployeeFormProps) {
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
  } = useForm<EmployeeFormData>({
    resolver: zodResolver(employeeFormSchema),
    defaultValues: initialData
      ? {
          name: initialData.name || "",
          email: initialData.email || "",
          phone: initialData.phone || "",
          status: (initialData.status === "trash" ? "active" : initialData.status) as "active" | "inactive",
        }
      : {
          name: "",
          email: "",
          phone: "",
          status: "active",
        },
  });


  const onSubmit = async (data: EmployeeFormData) => {
    try {
      setLoading(true);
      setError("");

      if (mode === "create") {
        const result = await createEmployee({
          name: data.name,
          email: data.email || undefined,
          phone: data.phone || undefined,
          status: data.status,
        });

        if (!result.success || !result.employee) {
          throw new Error(result.error || "Failed to create employee");
        }

        toast({
          title: "Success",
          description: "Employee created successfully",
        });

        const basePath = getBasePathFromPathname(pathname);
        router.push(`${basePath}/employees`);
      } else if (mode === "edit" && initialData) {
        const result = await updateEmployee({
          id: initialData.id,
          name: data.name,
          email: data.email || undefined,
          phone: data.phone || undefined,
          status: data.status,
        });

        if (!result.success) {
          throw new Error(result.error || "Failed to update employee");
        }

        toast({
          title: "Success",
          description: "Employee updated successfully",
        });

        const basePath = getBasePathFromPathname(pathname);
        router.push(`${basePath}/employees`);
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
    <div className="w-full">
      <Card>
        <CardHeader>
          <CardTitle>
            {mode === "create" ? "Add New Employee" : "Edit Employee"}
          </CardTitle>
          <CardDescription>
            {mode === "create"
              ? "Enter employee details to create a new employee"
              : "Update employee information. Accounting-linked fields cannot be edited directly."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Left Column - Form Fields (3 parts) */}
              <div className="lg:col-span-3 space-y-4">
                {error && (
                  <div className="flex items-start gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive border border-destructive/20">
                    <FiAlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                {/* Read-only Accounting Fields */}
                {mode === "edit" && initialData && (
                  <div className="rounded-lg border bg-muted/50 p-4 space-y-3">
                    <h3 className="text-sm font-medium text-muted-foreground">Accounting Information (Read-only)</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Employee Code</Label>
                        <div className="text-sm font-medium">
                          {initialData.employeeCode || "-"}
                        </div>
                      </div>
                    </div>

                    {initialData.salaryPayableAccount && (
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Salary Payable Account</Label>
                        <div className="text-sm font-medium">
                          {initialData.salaryPayableAccount.code} - {initialData.salaryPayableAccount.name}
                        </div>
                      </div>
                    )}

                    {initialData.advanceAccount && (
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Advance Account</Label>
                        <div className="text-sm font-medium">
                          {initialData.advanceAccount.code} - {initialData.advanceAccount.name}
                        </div>
                      </div>
                    )}

                    <p className="text-xs text-muted-foreground mt-2">
                      These fields are managed automatically and cannot be edited directly.
                    </p>
                  </div>
                )}

                {/* Editable Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Name *</Label>
                    <Input
                      id="name"
                      type="text"
                      placeholder="John Doe"
                      {...register("name")}
                      disabled={loading}
                    />
                    {errors.name && (
                      <p className="text-sm text-destructive">{errors.name.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="john@example.com"
                      {...register("email")}
                      disabled={loading}
                    />
                    {errors.email && (
                      <p className="text-sm text-destructive">{errors.email.message}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="+1 234 567 8900"
                      {...register("phone")}
                      disabled={loading}
                    />
                    {errors.phone && (
                      <p className="text-sm text-destructive">{errors.phone.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <Select
                      defaultValue={initialData?.status === "trash" ? "active" : initialData?.status || "active"}
                      onValueChange={(value) => setValue("status", value as "active" | "inactive")}
                      disabled={loading}
                    >
                      <SelectTrigger>
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
                </div>
              </div>

              {/* Right Column - Info (1 part) */}
              <div className="lg:col-span-1">
                <div className="space-y-2">
                  <Label>Employee Information</Label>
                  <div className="rounded-lg border bg-muted/30 p-4 space-y-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Status:</span>{" "}
                      <span className="font-medium capitalize">
                        {watch("status") || initialData?.status || "active"}
                      </span>
                    </div>
                    {mode === "edit" && initialData && (
                      <>
                        <div>
                          <span className="text-muted-foreground">Created:</span>{" "}
                          <span className="font-medium">
                            {new Date(initialData.createdAt || new Date()).toLocaleDateString()}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Last Updated:</span>{" "}
                          <span className="font-medium">
                            {new Date(initialData.updatedAt || new Date()).toLocaleDateString()}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-4 mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Saving..." : mode === "create" ? "Create Employee" : "Update Employee"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

