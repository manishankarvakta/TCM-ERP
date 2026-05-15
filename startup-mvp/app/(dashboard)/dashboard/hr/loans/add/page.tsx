import React from "react";
import PageGuard from "@/components/permissions/page-guard";

export default function AddLoanPage() {
  return (
    <PageGuard permissionKey="hr.loans" requiredOperation="create">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">New Loan Application</h1>
          <p className="text-muted-foreground">Create a new loan or advance for an employee.</p>
        </div>
        
        {/* Placeholder for now - you can add a LoanForm component here later */}
        <div className="rounded-lg border border-dashed p-12 text-center">
          <p className="text-muted-foreground">Loan application form is under development.</p>
        </div>
      </div>
    </PageGuard>
  );
}
