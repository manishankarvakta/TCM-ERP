import { Suspense } from "react";
import { Metadata } from "next";
import { FiDollarSign, FiPlus } from "react-icons/fi";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import LoanList from "./_components/loan-list";
import { getLoans } from "./_actions/loan.action";

export const metadata: Metadata = {
  title: "Employee Loans | HRMS",
  description: "Manage employee loans and advances",
};

export default async function LoansPage() {
  const result = await getLoans();
  const loans = result.success ? result.loans : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Employee Loans</h1>
          <p className="text-muted-foreground">
            Manage employee loan applications, approvals, and repayments.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild>
            <Link href="/dashboard/hr/loans/add">
              <FiPlus className="mr-2 h-4 w-4" />
              New Loan
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="rounded-full bg-primary/10 p-2 text-primary">
              <FiDollarSign className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Active Loans</p>
              <h3 className="text-2xl font-bold">{(loans || []).filter(l => l.status === 'APPROVED').length}</h3>
            </div>
          </div>
        </div>
        {/* Add more stats here if needed */}
      </div>

      <Suspense fallback={<div>Loading loans...</div>}>
        <LoanList initialLoans={(loans as any) || []} />
      </Suspense>
    </div>
  );
}
