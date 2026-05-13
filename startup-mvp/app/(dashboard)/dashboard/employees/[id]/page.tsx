import React from "react";
import { getEmployeeById } from "../_actions/employee.action";
import EmployeeForm from "../_components/employeeForm";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import PageGuard from "@/components/permissions/page-guard";

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
    <PageGuard permissionKey="peoples.employees" requiredOperation="edit">
      <div className="space-y-6">
        <EmployeeForm mode="edit" initialData={employee} />
      </div>
    </PageGuard>
  );
}

