import React from "react";
import { prisma } from "@/lib/prisma";
import PageGuard from "@/components/permissions/page-guard";
import EmployeeLedgerClient from "./_components/employee-ledger-client";

interface EmployeeLedgerPageProps {
  searchParams: Promise<{
    id?: string;
  }>;
}

export default async function EmployeeLedgerPage({ searchParams }: EmployeeLedgerPageProps) {
  const params = await searchParams;
  const selectedEmployeeId = params.id;

  const employees = await prisma.employee.findMany({
    where: { status: { not: "trash" } },
    select: {
      id: true,
      name: true,
      employeeCode: true,
      designation: true,
      department: true,
    },
    orderBy: { name: "asc" },
  });

  return (
    <PageGuard permissionKey="peoples.employees" requiredOperation="view">
      <EmployeeLedgerClient employees={employees} selectedEmployeeId={selectedEmployeeId} />
    </PageGuard>
  );
}
