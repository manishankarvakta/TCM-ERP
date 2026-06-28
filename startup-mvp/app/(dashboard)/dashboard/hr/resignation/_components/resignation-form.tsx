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
        if (empRes.success && empRes.employees) {
          setEmployees(empRes.employees.map((e: any) => ({
            id: e.id,
            name: e.name,
            employeeCode: e.employeeCode
          })));
        }
      } catch (err) {
        console.error("Failed to load employees:", err);
      }
    }
    fetchEmployees();
  }, []);

  const onSubmit = async (data: ResignationFormData) => {
    setError("");
    setLoading(true);
    try {
      const result = await submitResignation(data);
      if (result.success) {
        toast({
          title: "Resignation Submitted",
          description: "Resignation request has been successfully submitted.",
        });
        router.push("/dashboard/hr/resignation");
        router.refresh();
      } else {
        setError(result.error || "Failed to submit resignation request.");
      }
    } catch (err) {
      console.error(err);
      setError("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Submit Resignation</CardTitle>
        <CardDescription>
          Record a new employee resignation request. The employee will be marked inactive only after final Admin approval.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
              <FiAlertCircle className="h-4 w-4 shrink-0" />
              <p>{error}</p>
            </div>
          )}

          {/* Employee Selector */}
          <div className="space-y-2">
            <Label htmlFor="employeeId">Employee</Label>
            <Select onValueChange={(val) => setValue("employeeId", val)}>
              <SelectTrigger>
                <SelectValue placeholder="Select an active employee" />
              </SelectTrigger>
              <SelectContent>
                {employees.map((emp) => (
                  <SelectItem key={emp.id} value={emp.id}>
                    {emp.name} {emp.employeeCode ? `(${emp.employeeCode})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
