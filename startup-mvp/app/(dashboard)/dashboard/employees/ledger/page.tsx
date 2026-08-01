import React from "react";
import { getEmployeeLedger } from "../_actions/employee.action";
import EmployeeLedger from "../_components/employeeLedger";
import PageGuard from "@/components/permissions/page-guard";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

interface EmployeeLedgerPageProps {
  searchParams: Promise<{
    id?: string;
    startDate?: string;
    endDate?: string;
  }>;
}

export default async function EmployeeLedgerPage({ searchParams }: EmployeeLedgerPageProps) {
  const params = await searchParams;
  const employeeId = params.id;

  if (!employeeId) {
    notFound();
  }

  const [result, org] = await Promise.all([
    getEmployeeLedger(employeeId, params.startDate, params.endDate),
    prisma.organization.findFirst({ where: { status: "active" } }).catch(() => null),
  ]);

  if (!result.success || !result.employee) {
    return (
      <div className="space-y-6">
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
          <p className="text-sm text-destructive">
            {result.error || "Failed to load employee ledger"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <PageGuard permissionKey="peoples.employees" requiredOperation="ledger">
      <EmployeeLedger
        employee={result.employee}
        ledger={result.ledger || []}
        summary={result.summary || { totalEarned: 0, totalPaid: 0, closingBalance: 0, totalTransactions: 0 }}
        initialStartDate={params.startDate}
        initialEndDate={params.endDate}
        organization={org}
      />
    </PageGuard>
  );
}
