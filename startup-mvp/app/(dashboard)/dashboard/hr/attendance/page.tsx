import React from "react";
import { getAttendances } from "./_actions/attendance.action";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { FiPlus, FiDownload, FiSettings } from "react-icons/fi";
import AttendanceListClient from "./_components/attendance-list";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { startOfDay, endOfDay } from "date-fns";
import BiometricSyncButton from "./_components/biometric-sync-button";

interface AttendancePageProps {
  searchParams: Promise<{
    date?: string;
    warehouseId?: string;
  }>;
}

export default async function AttendancePage({ searchParams }: AttendancePageProps) {
  const params = await searchParams;
  
  const selectedDate = params.date ? new Date(params.date) : new Date();
  const warehouseId = params.warehouseId || undefined;

  const session = await auth();
  const userId = session?.user?.id;

  // Check permissions
  const [result, canView, canEdit] = await Promise.all([
    getAttendances(startOfDay(selectedDate), endOfDay(selectedDate), undefined, warehouseId),
    userId ? hasPermission(userId, "hr.attendance", "view") : false,
    userId ? hasPermission(userId, "hr.attendance", "edit") : false,
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
          <p className="text-sm text-muted-foreground">Manage check-ins, check-outs, and daily status</p>
        </div>
        <div className="flex gap-2">
          {canEdit && (
            <>
              <BiometricSyncButton date={selectedDate.toISOString().split("T")[0]} />
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
        selectedDate={selectedDate.toISOString().split("T")[0]}
        selectedWarehouseId={warehouseId || ""}
        permissions={{
          view: canView,
          edit: canEdit,
        }}
      />
    </div>
  );
}
