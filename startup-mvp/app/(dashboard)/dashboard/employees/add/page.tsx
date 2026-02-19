import React from "react";
import EmployeeForm from "../_components/employeeForm";

export default function AddEmployeePage() {
  return (
    <div className="space-y-6">
      <EmployeeForm mode="create" />
    </div>
  );
}

