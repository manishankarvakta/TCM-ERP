import React from "react";
import { getEmployees } from "./_actions/employee.action";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { FiPlus, FiUserCheck, FiLayers, FiAward } from "react-icons/fi";
import EmployeesListClient from "./_components/employees";
import PageGuard from "@/components/permissions/page-guard";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";

interface EmployeesPageProps {
  searchParams: Promise<{
    page?: string;
    search?: string;
    tab?: string;
    department?: string;
    designation?: string;
    type?: string;
    warehouse?: string;
    gender?: string;
    statusFilter?: string;
  }>;
}

// Helper to safely query employee types without crashing if DB table is not yet created
async function getSafeEmployeeTypes() {
  try {
    return await prisma.employeeType.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });
  } catch (err) {
    return [];
  }
}

// Helper to safely query warehouses
async function getSafeWarehouses() {
  try {
    return await prisma.warehouse.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });
  } catch (err) {
    return [];
  }
}

export default async function EmployeesPage({ searchParams }: EmployeesPageProps) {
  const params = await searchParams;
  const page = parseInt(params.page || "1");
  const search = params.search || "";
  const tab = params.tab || "all";
  const department = params.department || "all";
  const designation = params.designation || "all";
  const type = params.type || "all";
  const warehouse = params.warehouse || "all";
  const gender = params.gender || "all";
  const statusFilter = params.statusFilter || "all";

  const session = await auth();
  const userId = session?.user?.id;

  const status = tab === "trash" ? "trash" : "all";

  // Fetch employee list and dropdown data safely in parallel
  const [
    result,
    canView,
    canEdit,
    canCreate,
    canMoveToTrash,
    canDeletePermanently,
    canAccessEmployeeTypes,
    canAccessDepartments,
    canAccessDesignations,
    departments,
    designations,
    employeeTypes,
    warehouses,
  ] = await Promise.all([
    getEmployees(page, 10, search, status, {
      department,
      designation,
      employeeTypeId: type,
      warehouseId: warehouse,
      gender,
    }),
    userId ? hasPermission(userId, "peoples.employees", "view") : false,
    userId ? hasPermission(userId, "peoples.employees", "edit") : false,
    userId ? hasPermission(userId, "peoples.employees", "create") : false,
    userId ? hasPermission(userId, "peoples.employees", "move-to-trash") : false,
    userId ? hasPermission(userId, "peoples.employees", "delete-permanently") : false,
    userId ? hasPermission(userId, "hr.employee-types", "view") : false,
    userId ? hasPermission(userId, "hr.departments", "view") : false,
    userId ? hasPermission(userId, "hr.designations", "view") : false,
    prisma.employee
      .findMany({
        where: { department: { not: null } },
        select: { department: true },
        distinct: ["department"],
      })
      .catch(() => []),
    prisma.employee
      .findMany({
        where: { designation: { not: null } },
        select: { designation: true },
        distinct: ["designation"],
      })
      .catch(() => []),
    getSafeEmployeeTypes(),
    getSafeWarehouses(),
  ]);

  if (!result.success) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Employees</h1>
            <p className="text-sm text-muted-foreground">Manage employees in your system</p>
          </div>
        </div>
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
          <p className="text-sm text-destructive">
            {result.error || "Failed to load employees"}
          </p>
        </div>
      </div>
    );
  }

  const summary = result.summary || { total: 0, active: 0, onDuty: 0 };
  const departmentList = departments.map((d) => d.department!).filter(Boolean);
  const designationList = designations.map((d) => d.designation!).filter(Boolean);

  return (
    <PageGuard permissionKey="peoples.employees">
      <div className="space-y-4">
        {/* Top Header Row matching screenshot */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Employees</h1>
            <p className="text-sm text-muted-foreground">Manage employees in your system</p>
          </div>

          <div className="flex flex-col items-end gap-2">
            {/* Setup Action Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              {canAccessEmployeeTypes && (
                <Button variant="outline" size="sm" asChild className="bg-card shadow-xs gap-1.5 text-xs">
                  <Link href="/dashboard/employees/types">
                    <FiUserCheck className="h-3.5 w-3.5 text-blue-600" />
                    Employee Types Setup
                  </Link>
                </Button>
              )}
              {canAccessDepartments && (
                <Button variant="outline" size="sm" asChild className="bg-card shadow-xs gap-1.5 text-xs">
                  <Link href="/dashboard/employees/departments">
                    <FiLayers className="h-3.5 w-3.5 text-amber-600" />
                    Department Setup
                  </Link>
                </Button>
              )}
              {canAccessDesignations && (
                <Button variant="outline" size="sm" asChild className="bg-card shadow-xs gap-1.5 text-xs">
                  <Link href="/dashboard/employees/designations">
                    <FiAward className="h-3.5 w-3.5 text-indigo-600" />
                    Designation Setup
                  </Link>
                </Button>
              )}
              {canCreate && (
                <Button size="sm" asChild className="bg-black hover:bg-slate-800 text-white gap-1.5 font-semibold shadow-xs">
                  <Link href="/dashboard/employees/add">
                    <FiPlus className="h-4 w-4" />
                    Add Employee
                  </Link>
                </Button>
              )}
            </div>

            {/* Counters Badge Row */}
            <div className="flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <span>All Employees:</span>
                <span className="font-bold bg-muted px-2 py-0.5 rounded text-foreground">
                  {summary.total}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-emerald-700 font-medium">
                <span>Active:</span>
                <span className="font-bold bg-emerald-100 dark:bg-emerald-950/60 px-2 py-0.5 rounded text-emerald-800 dark:text-emerald-300">
                  {summary.active}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-blue-700 font-medium">
                <span>On Duty:</span>
                <span className="font-bold bg-blue-100 dark:bg-blue-950/60 px-2 py-0.5 rounded text-blue-800 dark:text-blue-300">
                  {summary.onDuty}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Main List Client Component handling full toolbar & filter controls */}
        <EmployeesListClient
          initialEmployees={result.employees || []}
          initialPagination={result.pagination || { page: 1, limit: 10, total: 0, totalPages: 0 }}
          initialSearch={search}
          isTrash={tab === "trash"}
          userId={userId || undefined}
          permissions={{
            view: canView,
            edit: canEdit,
            moveToTrash: canMoveToTrash,
            deletePermanently: canDeletePermanently,
          }}
          filterOptions={{
            departments: departmentList,
            designations: designationList,
            employeeTypes,
            warehouses,
          }}
          currentFilters={{
            department,
            designation,
            type,
            warehouse,
            gender,
            statusFilter,
          }}
        />
      </div>
    </PageGuard>
  );
}
