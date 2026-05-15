"use server";

import { prisma } from "@/lib/prisma";
import { getPayrollSummary } from "../../_actions/hr-reports.action";
import PayrollReportView from "./_components/payroll-report-view";
import PageGuard from "@/components/permissions/page-guard";

interface PayrollReportPageProps {
  searchParams: Promise<{
    month?: string;
    year?: string;
    departmentId?: string;
    branchId?: string;
  }>;
}

export default async function PayrollReportPage({
  searchParams,
}: PayrollReportPageProps) {
  const params = await searchParams;

  const filters = {
    month: params.month ? Number(params.month) : undefined,
    year: params.year ? Number(params.year) : undefined,
    departmentId: params.departmentId || undefined,
    branchId: params.branchId || undefined,
  };

  const result = await getPayrollSummary(filters);

  // Get filter options
  const [departments, branches] = await Promise.all([
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
          <h1 className="text-2xl font-semibold text-primary">Payroll Summary Report</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Analyze salary expenditures, deductions, and disbursement trends
          </p>
        </div>

        {!result.success ? (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
            <p className="text-sm text-destructive">
              {result.error || "Failed to load payroll report"}
            </p>
          </div>
        ) : (
          <PayrollReportView
            data={result.data || []}
            departments={departments}
            branches={branches}
            filters={filters}
          />
        )}
      </div>
    </PageGuard>
  );
}
