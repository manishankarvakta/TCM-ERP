"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FiAlertCircle } from "react-icons/fi";
import { submitResignation } from "../_actions/resignation.action";
import { getEmployees } from "../../../employees/_actions/employee.action";
import { useToast } from "@/hooks/use-toast";
import { SearchableSelect } from "@/components/ui/searchable-select";

const resignationSchema = z.object({
  employeeId: z.string().min(1, "Employee is required"),
  resignDate: z.string().min(1, "Resignation submission date is required"),
  effectiveDate: z.string().min(1, "Resignation effective date is required"),
  reason: z.string().optional(),
});

type ResignationFormData = z.infer<typeof resignationSchema>;

export default function ResignationForm() {
  const router = useRouter();
  const { toast } = useToast();
  
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState<{id: string, name: string, employeeCode: string | null}[]>([]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<ResignationFormData>({
    resolver: zodResolver(resignationSchema),
    defaultValues: {
      employeeId: "",
      resignDate: new Date().toISOString().split("T")[0],
      effectiveDate: new Date().toISOString().split("T")[0],
      reason: "",
    },
  });

  useEffect(() => {
    async function fetchEmployees() {
      try {
        const empRes = await getEmployees(1, 1000, "", "active");
        if (empRes.success) {
          setEmployees(empRes.employees);
        }
      } catch (err) {
        console.error("Error fetching employees:", err);
      }
    }
    fetchEmployees();
  }, []);

  const onSubmit = async (data: ResignationFormData) => {
    setLoading(true);
    setError("");
    try {
      const res = await submitResignation(data);
      if (res.success) {
        toast({
          title: "Success",
          description: "Resignation submitted successfully",
        });
        router.push("/dashboard/hr/resignation");
      } else {
        setError(res.error || "Failed to submit resignation");
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="max-w-2xl mx-auto mt-8">
      <CardHeader>
        <CardTitle>Submit Resignation</CardTitle>
        <CardDescription>
          Submit resignation for an active employee. Effective date will be calculated based on policy.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {error && (
            <div className="bg-destructive/15 text-destructive p-3 rounded-md flex items-center gap-2 text-sm">
              <FiAlertCircle className="h-4 w-4 shrink-0" />
              <p>{error}</p>
            </div>
          )}

          {/* Employee Selector */}
          <div className="space-y-2">
            <Label htmlFor="employeeId">Employee</Label>
            <SearchableSelect
              value={watch("employeeId")}
              onValueChange={(val) => setValue("employeeId", val || "")}
              placeholder="Select an active employee"
              options={employees.map((emp) => ({
                value: emp.id,
                label: emp.name,
                description: emp.employeeCode || undefined
              }))}
            />
            {errors.employeeId && (
              <p className="text-xs text-destructive">{errors.employeeId.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Submit Date */}
            <div className="space-y-2">
              <Label htmlFor="resignDate">Submission Date</Label>
              <Input
                type="date"
                id="resignDate"
                {...register("resignDate")}
              />
              {errors.resignDate && (
                <p className="text-xs text-destructive">{errors.resignDate.message}</p>
              )}
            </div>

            {/* Effective Date */}
            <div className="space-y-2">
              <Label htmlFor="effectiveDate">Effective Release Date</Label>
              <Input
                type="date"
                id="effectiveDate"
                {...register("effectiveDate")}
              />
              {errors.effectiveDate && (
                <p className="text-xs text-destructive">{errors.effectiveDate.message}</p>
              )}
            </div>
          </div>

          {/* Reason */}
          <div className="space-y-2">
            <Label htmlFor="reason">Reason for Resignation</Label>
            <Textarea
              id="reason"
              rows={4}
              placeholder="Provide context or explanation for the resignation request..."
              {...register("reason")}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/dashboard/hr/resignation")}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Submitting..." : "Submit Resignation"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
