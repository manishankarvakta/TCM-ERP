import React from "react";
import { getAppointmentLetters } from "./_actions/appointment-letter.action";
import { getEmployees } from "../../employees/_actions/employee.action";
import AppointmentLettersClient from "./_components/appointment-letters-client";
import PageGuard from "@/components/permissions/page-guard";

interface AppointmentLettersPageProps {
  searchParams: Promise<{ page?: string; search?: string }>;
}

export default async function AppointmentLettersPage({ searchParams }: AppointmentLettersPageProps) {
  const params = await searchParams;
  const page = parseInt(params.page || "1");
  const search = params.search || "";

  const [lettersRes, employeesRes] = await Promise.all([
    getAppointmentLetters(page, 10, search),
    getEmployees(1, 100, "", "active"),
  ]);

  return (
    <PageGuard permissionKey="hr">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Appointment Letters</h1>
          <p className="text-sm text-muted-foreground">Generate, issue, and manage formal employee appointment letters</p>
        </div>

        <AppointmentLettersClient
          initialLetters={lettersRes.letters || []}
          initialPagination={lettersRes.pagination || { page: 1, limit: 10, total: 0, totalPages: 0 }}
          employees={employeesRes.employees || []}
        />
      </div>
    </PageGuard>
  );
}
