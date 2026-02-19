import React from "react";
import { getEmployeeById } from "../_actions/employee.action";
import EmployeeForm from "../_components/employeeForm";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

interface EditEmployeePageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function EditEmployeePage({ params }: EditEmployeePageProps) {
  const { id } = await params;
  
  // Exclude reserved route names
  const reservedRoutes = ["add", "details", "new", "edit"];
  if (reservedRoutes.includes(id.toLowerCase())) {
    notFound();
  }

  const result = await getEmployeeById(id);

  if (!result.success || !result.employee) {
    notFound();
  }

  const employee = result.employee;
  const displayName = employee.employeeCode || employee.name;

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        <Link
          href="/dashboard/employees"
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          Employees
        </Link>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
        <span className="font-semibold">Edit {displayName}</span>
      </div>

      <EmployeeForm mode="edit" initialData={employee} />
    </div>
  );
}

