import React from "react";
import PageGuard from "@/components/permissions/page-guard";
import { getDepartments } from "./_actions/department.action";
import DepartmentsList from "./_components/departments-list";
import DepartmentForm from "./_components/department-form";
import { prisma } from "@/lib/prisma";

interface DepartmentsPageProps {
  searchParams: Promise<{
    action?: string;
    id?: string;
    page?: string;
    search?: string;
    status?: string;
  }>;
}

export default async function DepartmentsPage({ searchParams }: DepartmentsPageProps) {
  const params = await searchParams;
  const action = params.action;
  const editId = params.id;
  const page = parseInt(params.page || "1");
  const search = params.search || "";
  const status = (params.status as any) || "all";

  if (action === "create" || (action === "edit" && editId)) {
    let initialData = null;
    if (editId) {
      initialData = await prisma.department.findUnique({
        where: { id: editId },
      }).catch(() => null);
    }
    return (
      <PageGuard permissionKey="hr.departments">
        <DepartmentForm initialData={initialData} />
      </PageGuard>
    );
  }

  const result = await getDepartments(page, 10, search, status);

  return (
    <PageGuard permissionKey="hr.departments">
      <DepartmentsList
        data={result.data || []}
        pagination={result.pagination || { page: 1, limit: 10, total: 0, totalPages: 0 }}
        search={search}
        status={status}
      />
    </PageGuard>
  );
}
