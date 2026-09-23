"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
import { Switch } from "@/components/ui/switch";
import { FiAlertCircle, FiClock, FiCalendar, FiUser, FiUserX } from "react-icons/fi";
import { processManualAttendance, getAttendanceRecord } from "../_actions/attendance.action";
import { getEmployees } from "../../../employees/_actions/employee.action";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { getCurrentUser } from "@/app/actions/user.action";
import { SearchableSelect } from "@/components/ui/searchable-select";

const punchFormSchema = z.object({
  employeeId: z.string().min(1, "Employee is required"),
  date: z.string().min(1, "Date is required"),
  isAbsent: z.boolean().optional(),
  checkIn: z.string().optional().or(z.literal("")),
  checkOut: z.string().optional().or(z.literal("")),
  breakCheckOut: z.string().optional().or(z.literal("")),
  breakCheckIn: z.string().optional().or(z.literal("")),
  notes: z.string().optional(),
});

type PunchFormData = z.infer<typeof punchFormSchema>;

export default function ManualPunchForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  
  const initialEmployeeId = searchParams.get("employeeId") || "";
  const initialDate = searchParams.get("date") || searchParams.get("fromDate") || format(new Date(), "yyyy-MM-dd");

  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState<{id: string, name: string, employeeCode: string | null}[]>([]);

  useEffect(() => {
    async function fetchEmployees() {
      const [res, currentUser] = await Promise.all([
        getEmployees(1, 1000, "", "active"),
        getCurrentUser()
      ]);
      if (res.success && res.employees) {
        const isNormalUser = currentUser?.role !== "admin" && currentUser?.role !== "superadmin";
        if (isNormalUser && currentUser?.defaultWarehouseId) {
          const filtered = res.employees.filter((e: any) => e.warehouseId === currentUser.defaultWarehouseId);
          setEmployees(filtered);
        } else {
          setEmployees(res.employees);
        }
      }
    }
    fetchEmployees();
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<PunchFormData>({
    resolver: zodResolver(punchFormSchema),
    defaultValues: {
      employeeId: initialEmployeeId,
      date: initialDate,
      isAbsent: false,
      checkIn: "",
      checkOut: "",
      breakCheckOut: "",
      breakCheckIn: "",
      notes: "",
    },
  });

  const selectedEmployeeId = watch("employeeId");
  const selectedDate = watch("date");
  const isAbsent = watch("isAbsent");

  useEffect(() => {
    async function loadExistingAttendance() {
      if (!selectedEmployeeId || !selectedDate) return;

      try {
        setLoading(true);
        const res = await getAttendanceRecord(selectedEmployeeId, selectedDate);
        if (res.success && res.record) {
          const formatTime = (dateStr: any) => {
            if (!dateStr) return "";
            return formatInTimeZone(new Date(dateStr), "Asia/Dhaka", "HH:mm");
          };
          setValue("isAbsent", res.record.status === "ABSENT");
          setValue("checkIn", formatTime(res.record.checkIn));
          setValue("checkOut", formatTime(res.record.checkOut));
          setValue("breakCheckOut", formatTime(res.record.breakCheckOut));
          setValue("breakCheckIn", formatTime(res.record.breakCheckIn));
          setValue("notes", res.record.notes || "");
        } else {
          setValue("isAbsent", false);
          setValue("checkIn", "");
          setValue("checkOut", "");
          setValue("breakCheckOut", "");
          setValue("breakCheckIn", "");
          setValue("notes", "");
        }
      } catch (err) {
        console.error("Failed to load existing attendance:", err);
      } finally {
        setLoading(false);
      }
    }

    loadExistingAttendance();
  }, [selectedEmployeeId, selectedDate, setValue]);

  const onSubmit = async (data: PunchFormData) => {
    try {
      setLoading(true);
      setError("");

      if (!data.isAbsent && !data.checkIn && !data.checkOut) {
        throw new Error("You must provide either Check-in or Check-out time, or toggle 'Mark as Absent'.");
      }

      // Combine date and time (use undefined for blank times to preserve existing values if editing)
      const checkInDateTime = data.checkIn ? `${data.date}T${data.checkIn}:00` : undefined;
      const checkOutDateTime = data.checkOut ? `${data.date}T${data.checkOut}:00` : undefined;
      const breakCheckOutDateTime = data.breakCheckOut ? `${data.date}T${data.breakCheckOut}:00` : undefined;
      const breakCheckInDateTime = data.breakCheckIn ? `${data.date}T${data.breakCheckIn}:00` : undefined;

      const result = await processManualAttendance({
        employeeId: data.employeeId,
        date: data.date,
        isAbsent: data.isAbsent,
        checkIn: checkInDateTime,
        checkOut: checkOutDateTime,
        breakCheckOut: breakCheckOutDateTime,
        breakCheckIn: breakCheckInDateTime,
        notes: data.notes,
      });

      if (!result.success) {
        throw new Error(result.error || "Failed to save attendance");
      }

      toast({
        title: "Success",
        description: data.isAbsent 
          ? "Employee successfully recorded as Absent" 
          : "Attendance processed successfully",
      });

      router.push(`/dashboard/hr/attendance?fromDate=${data.date}&toDate=${data.date}`);
      router.refresh();
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
    <div className="w-full max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Manual Attendance Punch</CardTitle>
          <CardDescription>
            Record or update check-in/out times for an employee manually.
            The system will automatically calculate hours and OT based on their assigned shift.
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
                <div className="space-y-2">
                  <Label htmlFor="employeeId">Employee *</Label>
                  <SearchableSelect
                    value={watch("employeeId")}
                    onValueChange={(val) => setValue("employeeId", val || "")}
                    disabled={loading || !!initialEmployeeId}
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

                <div className="space-y-2">
                  <Label htmlFor="date">Date *</Label>
                  <div className="relative">
                    <FiCalendar className="absolute left-3 top-3 text-muted-foreground" />
                    <Input
                      id="date"
                      type="date"
                      className="pl-10"
                      {...register("date")}
                      disabled={loading || !!initialDate && !!initialEmployeeId}
                    />
                  </div>
                  {errors.date && (
                    <p className="text-sm text-destructive">{errors.date.message}</p>
                  )}
                </div>

                <div className="col-span-1 md:col-span-2">
                  <div className="flex items-center justify-between rounded-lg border p-3.5 shadow-sm bg-muted/20">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <FiUserX className={`h-4 w-4 ${isAbsent ? "text-destructive" : "text-muted-foreground"}`} />
                        <Label htmlFor="isAbsent" className="font-medium cursor-pointer">
                          Mark as Absent
                        </Label>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Explicitly designate this employee as Absent. Work hours, OT, and daily allowances will be set to zero.
                      </p>
                    </div>
                    <Switch
                      id="isAbsent"
                      checked={!!isAbsent}
                      onCheckedChange={(checked) => setValue("isAbsent", checked)}
                      disabled={loading}
                    />
                  </div>
                </div>

                <div className={`space-y-2 ${isAbsent ? "opacity-50 pointer-events-none" : ""}`}>
                  <Label htmlFor="checkIn">Check In Time</Label>
                  <div className="relative">
                    <FiClock className="absolute left-3 top-3 text-emerald-500" />
                    <Input
                      id="checkIn"
                      type="time"
                      className="pl-10"
                      {...register("checkIn")}
                      disabled={loading || isAbsent}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">Leave blank to keep existing</p>
                </div>

                <div className={`space-y-2 ${isAbsent ? "opacity-50 pointer-events-none" : ""}`}>
                  <Label htmlFor="checkOut">Check Out Time</Label>
                  <div className="relative">
                    <FiClock className="absolute left-3 top-3 text-amber-500" />
                    <Input
                      id="checkOut"
                      type="time"
                      className="pl-10"
                      {...register("checkOut")}
                      disabled={loading || isAbsent}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">Leave blank to keep existing</p>
                </div>

                <div className={`space-y-2 ${isAbsent ? "opacity-50 pointer-events-none" : ""}`}>
                  <Label htmlFor="breakCheckOut">Break Check Out Time</Label>
                  <div className="relative">
                    <FiClock className="absolute left-3 top-3 text-rose-500" />
                    <Input
                      id="breakCheckOut"
                      type="time"
                      className="pl-10"
                      {...register("breakCheckOut")}
                      disabled={loading || isAbsent}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">Leave blank to keep existing</p>
                </div>

                <div className={`space-y-2 ${isAbsent ? "opacity-50 pointer-events-none" : ""}`}>
                  <Label htmlFor="breakCheckIn">Break Check In Time</Label>
                  <div className="relative">
                    <FiClock className="absolute left-3 top-3 text-blue-500" />
                    <Input
                      id="breakCheckIn"
                      type="time"
                      className="pl-10"
                      {...register("breakCheckIn")}
                      disabled={loading || isAbsent}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">Leave blank to keep existing</p>
                </div>
                
                <div className="col-span-1 md:col-span-2 space-y-2">
                  <Label htmlFor="notes">Notes / Reason</Label>
                  <Textarea
                    id="notes"
                    placeholder={isAbsent ? "Reason for manual absence (e.g. Unapproved leave, Disciplinary, Forgot to punch)..." : "E.g., Forgot to punch, Client meeting..."}
                    {...register("notes")}
                    disabled={loading}
                    className="resize-none"
                    rows={3}
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
                {loading ? "Processing..." : "Save Punch"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
