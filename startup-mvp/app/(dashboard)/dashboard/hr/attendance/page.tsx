import React from "react";
import { getAttendanceRecordsPaginated } from "./_actions/attendance.action";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { FiPlus, FiSettings, FiUpload } from "react-icons/fi";
import AttendanceListClient from "./_components/attendance-list";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import BiometricSyncButton from "./_components/biometric-sync-button";
import { getPayrollSettings } from "@/lib/payroll-settings";
import { getTodayInTimezone } from "@/lib/timezone-utils";
import { prisma } from "@/lib/prisma";

interface AttendancePageProps {
  searchParams: Promise<{
    page?: string;
    limit?: string;
    search?: string;
    warehouseId?: string;
    deviceId?: string;
    employeeId?: string;
    date?: string;
    fromDate?: string;
    toDate?: string;
    status?: string;
    departmentId?: string;
    designationId?: string;
    floorId?: string;
    lineId?: string;
    skill?: string;
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
  const departmentId = params.departmentId || undefined;
  const designationId = params.designationId || undefined;
  const floorId = params.floorId || undefined;
  const lineId = params.lineId || undefined;
  const skill = params.skill || undefined;
  
  // Set default date range if not provided (e.g. today in app timezone)
  const today = getTodayInTimezone();
  const fromDate = params.fromDate || params.date || today;
  const toDate = params.toDate || params.date || today;
  const status = params.status || undefined;

  const session = await auth();
  const userId = session?.user?.id;

  const dbUser = userId
    ? await prisma.user.findUnique({
        where: { id: userId },
        select: { 
          role: true, 
          defaultWarehouseId: true,
          defaultWarehouse: { select: { id: true, name: true } },
        },
      })
    : null;

  const isNormalUser = dbUser?.role !== "admin" && dbUser?.role !== "superadmin";
  const userWarehouseId = dbUser?.defaultWarehouseId || null;
  const userWarehouseName = dbUser?.defaultWarehouse?.name || null;
  const effectiveWarehouseId = (isNormalUser && userWarehouseId) ? userWarehouseId : (warehouseId || "");

  // Check permissions & settings
  const [result, canView, canEdit, payrollSettings] = await Promise.all([
    getAttendanceRecordsPaginated({
      page,
      limit,
      search,
      warehouseId: effectiveWarehouseId || undefined,
      deviceId,
      employeeId,
      fromDate,
      toDate,
      status,
      departmentId,
      designationId,
      floorId,
      lineId,
      skill,
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
              <Button asChild variant="outline">
                <Link href="/dashboard/hr/attendance/import">
                  <FiUpload className="mr-2 h-4 w-4" />
                  Import Attendance
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
          warehouseId: effectiveWarehouseId || "",
          deviceId: deviceId || "",
          employeeId: employeeId || "",
          fromDate,
          toDate,
          status: status || "ALL",
          departmentId: departmentId || "",
          designationId: designationId || "",
          floorId: floorId || "",
          lineId: lineId || "",
          skill: skill || "",
        }}
        permissions={{
          view: canView,
          edit: canEdit,
        }}
        userContext={{
          isNormalUser: Boolean(isNormalUser),
          userWarehouseId,
          userWarehouseName,
        }}
        weekends={payrollSettings.calculation.weekends}
      />
    </div>
  );
}
