import React from "react";
import { getEmployeeTypes } from "../_actions/payroll-policies.action";
import PayrollPoliciesClient from "./_components/payroll-policies-client";
import PageGuard from "@/components/permissions/page-guard";

export default async function PayrollPoliciesPage() {
  const result = await getEmployeeTypes();

  return (
    <PageGuard permissionKey="settings">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">HR & Payroll Policies Matrix</h1>
          <p className="text-sm text-muted-foreground">
            Configure dynamic salary structures, overtime multipliers, attendance bonuses, late penalties, and shift allowances per employee type.
          </p>
        </div>

        <PayrollPoliciesClient initialEmployeeTypes={result.employeeTypes || []} />
      </div>
    </PageGuard>
  );
}
