import React from "react";
import { getResignations } from "./_actions/resignation.action";
import { getEmployees } from "../../employees/_actions/employee.action";
import ResignationClient from "./_components/resignation-client";
import PageGuard from "@/components/permissions/page-guard";

interface ResignationPageProps {
  searchParams: Promise<{ page?: string; status?: string }>;
}

export default async function ResignationPage({ searchParams }: ResignationPageProps) {
  const params = await searchParams;
  const page = parseInt(params.page || "1");
  const status = params.status || "ALL";

  const [resignationsRes, employeesRes] = await Promise.all([
    getResignations(page, 10, status),
    getEmployees(1, 100, "", "active"),
  ]);

  return (
    <PageGuard permissionKey="hr">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Resignation Management Center</h1>
          <p className="text-sm text-muted-foreground">Manage employee resignations, notice periods, and exit approvals</p>
        </div>

        <ResignationClient
          initialResignations={resignationsRes.resignations || []}
          initialPagination={resignationsRes.pagination || { page: 1, limit: 10, total: 0, totalPages: 0 }}
          employees={employeesRes.employees || []}
        />
      </div>
    </PageGuard>
  );
}
