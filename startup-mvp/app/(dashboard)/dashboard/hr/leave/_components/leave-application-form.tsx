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
import { FiAlertCircle, FiCalendar } from "react-icons/fi";
import { applyForLeave, getEmployeeLeaveBalances } from "../_actions/leave-application.action";
import { getEmployees } from "../../../employees/_actions/employee.action";
import { getLeaveTypes } from "../types/_actions/leave-type.action";
import { useToast } from "@/hooks/use-toast";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { differenceInDays } from "date-fns";

const leaveApplicationSchema = z.object({
  employeeId: z.string().min(1, "Employee is required"),
  leaveTypeId: z.string().min(1, "Leave Type is required"),
  startDate: z.string().min(1, "Start Date is required"),
  endDate: z.string().min(1, "End Date is required"),
  reason: z.string().optional(),
}).refine((data) => {
  const start = new Date(data.startDate);
  const end = new Date(data.endDate);
  return end >= start;
}, {
  message: "End date must be on or after start date",
  path: ["endDate"],
});

type LeaveApplicationFormData = z.infer<typeof leaveApplicationSchema>;

interface LeaveBalance {
  leaveTypeId: string;
  leaveTypeName: string;
  isPaid: boolean;
  totalDays: number;
  usedDays: number;
  remainingDays: number;
}

export default function LeaveApplicationForm() {
  const router = useRouter();
  const { toast } = useToast();
  
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState<{id: string, name: string, employeeCode: string | null}[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<{id: string, name: string, defaultDays: number, isPaid: boolean}[]>([]);
  const [balances, setBalances] = useState<LeaveBalance[]>([]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<LeaveApplicationFormData>({
    resolver: zodResolver(leaveApplicationSchema),
    defaultValues: {
      employeeId: "",
      leaveTypeId: "",
      startDate: new Date().toISOString().split("T")[0],
      endDate: new Date().toISOString().split("T")[0],
      reason: "",
    },
  });

  const selectedEmployeeId = watch("employeeId");
  const selectedLeaveTypeId = watch("leaveTypeId");
  const startDateStr = watch("startDate");
  const endDateStr = watch("endDate");

  // Calculate requested days
  let requestedDays = 0;
  if (startDateStr && endDateStr) {
    const start = new Date(startDateStr);
    const end = new Date(endDateStr);
    if (end >= start) {
      requestedDays = differenceInDays(end, start) + 1; // inclusive
    }
  }

  // Find balance for selected type
  const selectedBalance = balances.find(b => b.leaveTypeId === selectedLeaveTypeId);

  useEffect(() => {
    async function fetchData() {
      const empRes = await getEmployees(1, 1000, "", "active");
      if (empRes.success && empRes.employees) {
        setEmployees(empRes.employees);
      }
      const ltRes = await getLeaveTypes(1, 100, "", "active");
      if (ltRes.success && ltRes.leaveTypes) {
        setLeaveTypes(ltRes.leaveTypes);
      }
    }
    fetchData();
  }, []);

  // Fetch balances when employee changes
  useEffect(() => {
    if (selectedEmployeeId) {
      async function fetchBalances() {
        const res = await getEmployeeLeaveBalances(selectedEmployeeId);
        if (res.success && res.balances) {
          setBalances(res.balances);
        } else {
          setBalances([]);
        }
      }
      fetchBalances();
    } else {
      setBalances([]);
    }
  }, [selectedEmployeeId]);

  const onSubmit = async (data: LeaveApplicationFormData) => {
    try {
      setLoading(true);
      setError("");

      if (requestedDays <= 0) {
        throw new Error("Invalid date range.");
      }

      if (selectedBalance && selectedBalance.remainingDays < requestedDays && selectedBalance.totalDays > 0) {
        // Warning, but let's allow it maybe they take unpaid
        // Actually, if it's unpaid it shouldn't matter. If paid, maybe restrict?
        // Let's just pass a warning, but for MVP allow submission and HR can reject or convert to unpaid.
      }

      const result = await applyForLeave({
        ...data,
        totalDays: requestedDays,
      });

      if (!result.success) {
        throw new Error(result.error || "Failed to submit leave application");
      }

      toast({
        title: "Success",
        description: "Leave application submitted successfully",
      });

      router.push(`/dashboard/hr/leave`);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "An unexpected error occurred.";
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
    <div className="w-full max-w-4xl mx-auto flex flex-col md:flex-row gap-6">
      <div className="flex-1">
        <Card>
          <CardHeader>
            <CardTitle>Apply for Leave</CardTitle>
            <CardDescription>
              Submit a new leave request. It will be sent to the Manager and HR for approval.
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="employeeId">Employee *</Label>
                    <SearchableSelect
                      value={selectedEmployeeId}
                      onValueChange={(val) => setValue("employeeId", val || "")}
                      disabled={loading}
                      placeholder="Select Employee"
                      options={employees.map(emp => ({
                        value: emp.id,
                        label: emp.name,
                        description: emp.employeeCode || undefined
                      }))}
                    />
                    {errors.employeeId && (
                      <p className="text-sm text-destructive">{errors.employeeId.message}</p>
                    )}
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="leaveTypeId">Leave Type *</Label>
                    <SearchableSelect
                      value={selectedLeaveTypeId}
                      onValueChange={(val) => setValue("leaveTypeId", val || "")}
                      disabled={loading || !selectedEmployeeId}
                      placeholder="Select Leave Type"
                      options={leaveTypes.map(lt => ({
                        value: lt.id,
                        label: lt.name,
                        description: lt.isPaid ? "Paid" : "Unpaid"
                      }))}
                    />
                    {errors.leaveTypeId && (
                      <p className="text-sm text-destructive">{errors.leaveTypeId.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="startDate">Start Date *</Label>
                    <div className="relative">
                      <FiCalendar className="absolute left-3 top-3 text-muted-foreground" />
                      <Input
                        id="startDate"
                        type="date"
                        className="pl-10"
                        {...register("startDate")}
                        disabled={loading}
                      />
                    </div>
                    {errors.startDate && (
                      <p className="text-sm text-destructive">{errors.startDate.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="endDate">End Date *</Label>
                    <div className="relative">
                      <FiCalendar className="absolute left-3 top-3 text-muted-foreground" />
                      <Input
                        id="endDate"
                        type="date"
                        className="pl-10"
                        {...register("endDate")}
                        disabled={loading}
                      />
                    </div>
                    {errors.endDate && (
                      <p className="text-sm text-destructive">{errors.endDate.message}</p>
                    )}
                  </div>
                  
                  <div className="col-span-1 md:col-span-2 space-y-2">
                    <div className="flex items-center justify-between p-3 bg-muted rounded-md border">
                      <span className="text-sm font-medium">Requested Days:</span>
                      <span className="font-bold text-primary">{requestedDays} Days</span>
                    </div>
                    {selectedBalance && requestedDays > selectedBalance.remainingDays && selectedBalance.totalDays > 0 && (
                      <p className="text-xs text-amber-600 font-medium">
                        Warning: Requested days exceed remaining balance. HR may reject or convert to unpaid leave.
                      </p>
                    )}
                  </div>

                  <div className="col-span-1 md:col-span-2 space-y-2">
                    <Label htmlFor="reason">Reason (Optional)</Label>
                    <Textarea
                      id="reason"
                      placeholder="Please provide details for your leave request..."
                      {...register("reason")}
                      disabled={loading}
                      className="resize-none"
                      rows={4}
                    />
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
                  {loading ? "Submitting..." : "Submit Application"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Balance Sidebar */}
      {selectedEmployeeId && (
        <div className="w-full md:w-80">
          <Card className="sticky top-6">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Leave Balances</CardTitle>
              <CardDescription>Current Year Balance</CardDescription>
            </CardHeader>
            <CardContent>
              {balances.length === 0 ? (
                <p className="text-sm text-muted-foreground">No leave types configured.</p>
              ) : (
                <div className="space-y-4">
                  {balances.map(balance => (
                    <div key={balance.leaveTypeId} className="space-y-1 pb-3 border-b last:border-0">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">{balance.leaveTypeName}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${balance.isPaid ? 'bg-emerald-100 text-emerald-700' : 'bg-secondary text-secondary-foreground'}`}>
                          {balance.isPaid ? 'Paid' : 'Unpaid'}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Total: {balance.totalDays}</span>
                        <span className="text-muted-foreground">Used: {balance.usedDays}</span>
                      </div>
                      {balance.totalDays > 0 && (
                        <div className="flex justify-between text-sm font-medium pt-1">
                          <span>Remaining:</span>
                          <span className={balance.remainingDays > 0 ? "text-emerald-600" : "text-destructive"}>
                            {balance.remainingDays} Days
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
