import React from "react";
import { getAttendanceRecordsPaginated } from "./_actions/attendance.action";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { FiPlus, FiSettings } from "react-icons/fi";
import AttendanceListClient from "./_components/attendance-list";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import BiometricSyncButton from "./_components/biometric-sync-button";
import { getPayrollSettings } from "@/lib/payroll-settings";

interface AttendancePageProps {
  searchParams: Promise<{
    page?: string;
    limit?: string;
    search?: string;
    warehouseId?: string;
    deviceId?: string;
    employeeId?: string;
    fromDate?: string;
    toDate?: string;
    status?: string;
  }>;
}

export default async function AttendancePage({ searchParams }: AttendancePageProps) {
  const params = await searchParams;
  
  const page = parseInt(params.page || "1", 10);
  const limit = parseInt(params.limit || "20", 10);
  const search = params.search || "";
  const warehouseId = params.warehouseId || undefined;
  const deviceId = params.deviceId || undefined;
  const employeeId = params.employeeId || undefined;
  
  // Set default date range if not provided (e.g. today)
  const today = new Date().toISOString().split("T")[0];
  const fromDate = params.fromDate || today;
  const toDate = params.toDate || today;
  const status = params.status || undefined;

  const session = await auth();
  const userId = session?.user?.id;

  // Check permissions & settings
  const [result, canView, canEdit, payrollSettings] = await Promise.all([
    getAttendanceRecordsPaginated({
      page,
      limit,
      search,
      warehouseId,
      deviceId,
      employeeId,
      fromDate,
      toDate,
      status
    }),
    userId ? hasPermission(userId, "hr.attendance", "view") : false,
    userId ? hasPermission(userId, "hr.attendance", "edit") : false,
    getPayrollSettings(),
  ]);

  if (!result.success) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Attendance</h1>
            <p className="text-sm text-muted-foreground">Manage employee daily attendance</p>
          </div>
        </div>
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
          <p className="text-sm text-destructive">
            {result.error || "Failed to load attendance"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Daily Attendance</h1>
          <p className="text-sm text-muted-foreground">Manage check-ins, check-outs, and daily status across all locations</p>
        </div>
        <div className="flex gap-2">
          {canEdit && (
            <>
              <BiometricSyncButton date={fromDate} />
              <Button asChild variant="outline">
                <Link href="/dashboard/hr/attendance/devices">
                  <FiSettings className="mr-2 h-4 w-4" />
                  Manage Devices
                </Link>
              </Button>
              <Button asChild>
                <Link href="/dashboard/hr/attendance/manual-punch">
                  <FiPlus className="mr-2 h-4 w-4" />
                  Manual Punch
                </Link>
              </Button>
            </>
          )}
        </div>
      </div>

      <AttendanceListClient
        initialAttendances={result.attendances || []}
        pagination={result.pagination || { page: 1, limit: 20, total: 0, pages: 0 }}
        filters={{
          page,
          limit,
          search,
          warehouseId: warehouseId || "",
          deviceId: deviceId || "",
          employeeId: employeeId || "",
          fromDate,
          toDate,
          status: status || "ALL",
        }}
        permissions={{
          view: canView,
          edit: canEdit,
        }}
        weekends={payrollSettings.calculation.weekends}
      />
    </div>
  );
}
