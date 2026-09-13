import React from "react";
import PageGuard from "@/components/permissions/page-guard";
import { getDesignations } from "./_actions/designation.action";
import DesignationsList from "./_components/designations-list";
import DesignationForm from "./_components/designation-form";
import { prisma } from "@/lib/prisma";

interface DesignationsPageProps {
  searchParams: Promise<{
    action?: string;
    id?: string;
    page?: string;
    search?: string;
    status?: string;
    department?: string;
  }>;
}

export default async function DesignationsPage({ searchParams }: DesignationsPageProps) {
  const params = await searchParams;
  const action = params.action;
  const editId = params.id;
  const page = parseInt(params.page || "1");
  const search = params.search || "";
  const status = (params.status as any) || "all";
  const department = params.department || "all";

  if (action === "create" || (action === "edit" && editId)) {
    let initialData = null;
    if (editId) {
      initialData = await prisma.designation.findUnique({
        where: { id: editId },
      }).catch(() => null);
    }
    return (
      <PageGuard permissionKey="hr.designations">
        <DesignationForm initialData={initialData} />
      </PageGuard>
    );
  }

  const result = await getDesignations(page, 10, search, status, department);

  return (
    <PageGuard permissionKey="hr.designations">
      <DesignationsList
        data={result.data || []}
        pagination={result.pagination || { page: 1, limit: 10, total: 0, totalPages: 0 }}
        search={search}
        status={status}
        department={department}
      />
    </PageGuard>
  );
}
