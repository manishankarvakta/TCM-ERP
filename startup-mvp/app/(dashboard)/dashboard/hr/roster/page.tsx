import React from "react";
import { getShifts } from "../shifts/_actions/shift.action";
import { getDepartments } from "@/app/actions/hr/department.action";
import RosterMatrixClient from "./_components/roster-matrix-client";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { format } from "date-fns";

interface RosterPageProps {
  searchParams: Promise<{
    month?: string;
    departmentId?: string;
    search?: string;
  }>;
}

export default async function RosterPage({ searchParams }: RosterPageProps) {
  const params = await searchParams;
  const currentMonthStr = format(new Date(), "yyyy-MM");
  const month = params.month || currentMonthStr;
  const departmentId = params.departmentId || "all";
  const search = params.search || "";

  const session = await auth();
  const userId = session?.user?.id;

  const canView = userId
    ? (await hasPermission(userId, "hr.roster", "view")) || (await hasPermission(userId, "hr.attendance", "view"))
    : false;

  if (!canView) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Duty Roster Management</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Monthly employee shift scheduling & roster board</p>
        </div>
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-900/50 dark:bg-red-950/20 dark:text-red-400">
          You do not have permission to view the duty roster board.
        </div>
      </div>
    );
  }

  // Fetch active shifts and departments
  const [shiftsRes, deptsRes] = await Promise.all([
    getShifts(1, 100, "", "active"),
    getDepartments("active"),
  ]);

  const rawShifts = shiftsRes.success ? shiftsRes.shifts : [];
  const rawDepts = deptsRes.success ? deptsRes.departments : [];

  const shifts = rawShifts.map((s: any) => {
    const isNightShift = s.startTime > s.endTime;
    return {
      id: s.id,
      name: s.name,
      startTime: s.startTime,
      endTime: s.endTime,
      isNightShift,
    };
  });

  const departments = rawDepts.map((d: any) => ({
    id: d.id,
    name: d.name,
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Duty Roster Management
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Interactive monthly employee shift planning & dynamic duty matrix board
          </p>
        </div>
      </div>

      <RosterMatrixClient
        shifts={shifts}
        departments={departments}
        initialMonth={month}
        initialDept={departmentId}
        initialSearch={search}
      />
    </div>
  );
}
