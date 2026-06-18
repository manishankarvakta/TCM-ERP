"use server";

import { prisma } from "@/lib/prisma";
import { getAttendanceReport } from "../../_actions/hr-reports.action";
import AttendanceReportView from "./_components/attendance-report-view";
import PageGuard from "@/components/permissions/page-guard";

interface AttendanceReportPageProps {
  searchParams: Promise<{
    employeeId?: string;
    departmentId?: string;
    branchId?: string;
    dateFrom?: string;
    dateTo?: string;
    status?: string;
  }>;
}

export default async function AttendanceReportPage({
  searchParams,
}: AttendanceReportPageProps) {
  const params = await searchParams;

  const filters = {
    employeeId: params.employeeId || undefined,
    departmentId: params.departmentId || undefined,
    branchId: params.branchId || undefined,
    dateFrom: params.dateFrom || undefined,
    dateTo: params.dateTo || undefined,
    status: (params.status as any) || "all",
  };

  const result = await getAttendanceReport(filters);

  // Get filter options
  const [employees, departments, branches] = await Promise.all([
    prisma.employee.findMany({
      where: { isTrash: false },
      select: { id: true, name: true, employeeCode: true },
      orderBy: { name: "asc" },
    }),
    prisma.department.findMany({
      where: { status: "active", isTrash: false },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.branch.findMany({
      where: { status: "active", isTrash: false },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <PageGuard permissionKey="reports.view">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-primary">Attendance Report</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Analyze staff presence, late arrivals, and overtime
          </p>
        </div>

        {!result.success ? (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
            <p className="text-sm text-destructive">
              {result.error || "Failed to load attendance report"}
            </p>
          </div>
        ) : (
          <AttendanceReportView
            data={result.data || []}
            employees={employees}
            departments={departments}
            branches={branches}
            filters={filters}
          />
        )}
      </div>
    </PageGuard>
  );
}
