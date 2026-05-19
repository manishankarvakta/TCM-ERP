import React from "react";
import EmployeeForm from "../_components/employeeForm";
import PageGuard from "@/components/permissions/page-guard";

export default function AddEmployeePage() {
  return (
    <PageGuard permissionKey="peoples.employees" requiredOperation="create">
      <div className="space-y-6">
        <EmployeeForm mode="create" />
      </div>
    </PageGuard>
  );
}

