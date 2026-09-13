import React from "react";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { getRosterMatrix } from "./_actions/roster.action";
import { RosterMatrixClient } from "./_components/roster-matrix-client";
import { redirect } from "next/navigation";
import { FiCalendar } from "react-icons/fi";

interface RosterPageProps {
  searchParams: Promise<{
    month?: string;
    department?: string;
    search?: string;
  }>;
}

export default async function RosterPage({ searchParams }: RosterPageProps) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const userId = session.user.id;
  const canView =
    (await hasPermission(userId, "hr.roster", "view")) ||
    (await hasPermission(userId, "hr.attendance", "view"));

  if (!canView) {
    return (
      <div className="p-6 text-center text-rose-600 font-semibold">
        Access Denied: You do not have permission to view the Duty Roster.
      </div>
    );
  }

  const params = await searchParams;

  // Default to current year-month (YYYY-MM)
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = String(now.getMonth() + 1).padStart(2, "0");
  const defaultMonthStr = `${currentYear}-${currentMonth}`;

  const monthStr = params.month || defaultMonthStr;
  const departmentFilter = params.department || "all";
  const search = params.search || "";

  const matrixRes = await getRosterMatrix(monthStr, departmentFilter, search);

  if (!matrixRes.success || !matrixRes.data) {
    return (
      <div className="p-6 text-center text-rose-600">
        Error loading roster matrix: {matrixRes.error || "Unknown error"}
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2 text-foreground">
            <FiCalendar className="w-6 h-6 text-emerald-600" />
            Duty Roster & Daily Shift Scheduling
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage daily employee shifts, off-days, and overlay schedule matrix.
          </p>
        </div>
      </div>

      {/* Roster Matrix Board Client */}
      <RosterMatrixClient initialData={matrixRes.data} />
    </div>
  );
}
