import React from "react";
import PageGuard from "@/components/permissions/page-guard";
import { getEmployeeTypes } from "./_actions/employee-type.action";
import EmployeeTypesList from "./_components/employee-types-list";
import EmployeeTypeForm from "./_components/employee-type-form";
import { prisma } from "@/lib/prisma";

interface EmployeeTypesPageProps {
  searchParams: Promise<{
    action?: string;
    id?: string;
    page?: string;
    search?: string;
    status?: string;
  }>;
}

export default async function EmployeeTypesPage({ searchParams }: EmployeeTypesPageProps) {
  const params = await searchParams;
  const action = params.action;
  const editId = params.id;
  const page = parseInt(params.page || "1");
  const search = params.search || "";
  const status = (params.status as any) || "all";

  if (action === "create" || (action === "edit" && editId)) {
    let initialData = null;
    if (editId) {
      initialData = await prisma.employeeType.findUnique({
        where: { id: editId },
      }).catch(() => null);
    }
    return (
      <PageGuard permissionKey="hr.employee-types">
        <EmployeeTypeForm initialData={initialData} />
      </PageGuard>
    );
  }

  const result = await getEmployeeTypes(page, 10, search, status);

  return (
    <PageGuard permissionKey="hr.employee-types">
      <EmployeeTypesList
        data={result.data || []}
        pagination={result.pagination || { page: 1, limit: 10, total: 0, totalPages: 0 }}
        search={search}
        status={status}
      />
    </PageGuard>
  );
}
