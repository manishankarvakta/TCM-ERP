"use server";

import { prisma } from "@/lib/prisma";
import { getEmployeeJoiningReport } from "../../_actions/hr-reports.action";
import JoiningReportView from "./_components/joining-report-view";
import PageGuard from "@/components/permissions/page-guard";

interface JoiningReportPageProps {
  searchParams: Promise<{
    dateFrom?: string;
    dateTo?: string;
    departmentId?: string;
  }>;
}

export default async function JoiningReportPage({
  searchParams,
}: JoiningReportPageProps) {
  const params = await searchParams;

  const filters = {
    dateFrom: params.dateFrom || undefined,
    dateTo: params.dateTo || undefined,
    departmentId: params.departmentId || undefined,
  };

  const result = await getEmployeeJoiningReport(filters);

  // Get filter options
  const [departments] = await Promise.all([
    prisma.department.findMany({
      where: { status: "active", isTrash: false },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <PageGuard permissionKey="reports.view">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-primary">Employee Joining Report</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track new talent acquisition and staffing trends
          </p>
        </div>

        {!result.success ? (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
            <p className="text-sm text-destructive">
              {result.error || "Failed to load joining report"}
            </p>
          </div>
        ) : (
          <JoiningReportView
            data={result.data || []}
            departments={departments}
            filters={filters}
          />
        )}
      </div>
    </PageGuard>
  );
}
