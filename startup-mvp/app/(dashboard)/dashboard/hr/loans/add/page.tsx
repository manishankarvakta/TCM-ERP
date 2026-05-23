import React from "react";
import PageGuard from "@/components/permissions/page-guard";
import { getEmployees } from "../../../employees/_actions/employee.action";
import LoanForm from "./_components/loan-form";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { FiArrowLeft } from "react-icons/fi";

export default async function AddLoanPage() {
  const result = await getEmployees(1, 1000, "", "active");
  const employees = result.employees || [];

  return (
    <PageGuard permissionKey="hr.loans" requiredOperation="create">
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard/hr/loans">
              <FiArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">New Loan Application</h1>
            <p className="text-muted-foreground text-sm">Create a new loan or advance for an employee.</p>
          </div>
        </div>

        <LoanForm employees={employees} />
      </div>
    </PageGuard>
  );
}
