import React from "react";
import { getEmployees, getEmployeeStats } from "./_actions/employee.action";
import { getEmployeeTypes } from "./types/_actions/employee-type.action";
import { getDepartments } from "./departments/_actions/department.action";
import { getDesignations } from "./designations/_actions/designation.action";
import { getFloors } from "./floors/_actions/floor.action";
import { getLines } from "./lines/_actions/line.action";
import { getAllEmployeeSkills } from "./_actions/employee.action";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";
import { FiPlus } from "react-icons/fi";
import EmployeesListClient from "./_components/employees";
import SyncBiometricButton from "./_components/sync-biometric-button";
import PageGuard from "@/components/permissions/page-guard";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";

import ExportButtons from "./_components/export-buttons";

interface EmployeesPageProps {
  searchParams: Promise<{
    page?: string;
    search?: string;
    tab?: string;
    employeeTypeId?: string;
    gender?: string;
    status?: string;
    departmentId?: string;
    designationId?: string;
    floorId?: string;
    lineId?: string;
    skill?: string;
    limit?: string;
  }>;
}

export default async function EmployeesPage({ searchParams }: EmployeesPageProps) {
  const params = await searchParams;
  const page = parseInt(params.page || "1");
  const limit = parseInt(params.limit || "20");
  const search = params.search || "";
  const tab = params.tab || "all";
  const employeeTypeId = params.employeeTypeId || "all";
  const gender = params.gender || "all";
  const statusParam = params.status || "all";
  const departmentId = params.departmentId || "all";
  const designationId = params.designationId || "all";
  const floorId = params.floorId || "all";
  const lineId = params.lineId || "all";
  const skill = params.skill || "all";

  const session = await auth();
  const userId = session?.user?.id;

  const status = tab === "trash" ? "trash" : (statusParam as any);
  
  // Check permissions and fetch data concurrently
  const [result, statsResult, typesResult, departmentsResult, designationsResult, floorsResult, linesResult, allSkills, canView, canEdit, canCreate, canMoveToTrash, canDeletePermanently, canViewLedger] = await Promise.all([
    getEmployees(page, limit, search, status, employeeTypeId, gender, departmentId, designationId, floorId, lineId, skill),
    getEmployeeStats(),
    getEmployeeTypes(1, 100, "", "active"),
    getDepartments(1, 100, "", "active"),
    getDesignations(1, 100, "", "active"),
    getFloors(1, 100, "", "active"),
    getLines(1, 100, "", "active"),
    getAllEmployeeSkills(),
    userId ? hasPermission(userId, "peoples.employees", "view") : false,
    userId ? hasPermission(userId, "peoples.employees", "edit") : false,
    userId ? hasPermission(userId, "peoples.employees", "create") : false,
    userId ? hasPermission(userId, "peoples.employees", "move-to-trash") : false,
    userId ? hasPermission(userId, "peoples.employees", "delete-permanently") : false,
    userId ? hasPermission(userId, "peoples.employees", "ledger") : false,
  ]);

  // Handle errors
  if (!result.success) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Employees</h1>
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

  const employeeTypes = typesResult.success && typesResult.employeeTypes ? (typesResult.employeeTypes as any[]) : [];
  const designations = designationsResult.success && designationsResult.designations ? (designationsResult.designations as any[]) : [];

  return (
    <PageGuard permissionKey="peoples.employees">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Employees</h1>
            <p className="text-sm text-muted-foreground">Manage employees in your system</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="flex gap-2 flex-wrap items-center">
             
              {canEdit && (
                <Button variant="outline" asChild>
                  <Link href="/dashboard/employees/types">
                    Employee Types Setup
                  </Link>
                </Button>
              )}
              {canEdit && (
                <Button variant="outline" asChild>
                  <Link href="/dashboard/employees/departments">
                    Department Setup
                  </Link>
                </Button>
              )}
              {canEdit && (
                <Button variant="outline" asChild>
                  <Link href="/dashboard/employees/designations">
                    Designation Setup
                  </Link>
                </Button>
              )}
              {canEdit && (
                <Button variant="outline" asChild>
                  <Link href="/dashboard/employees/floors">
                    Floor Setup
                  </Link>
                </Button>
              )}
              {canEdit && (
                <Button variant="outline" asChild>
                  <Link href="/dashboard/employees/lines">
                    Line Setup
                  </Link>
                </Button>
              )}
              {tab !== "trash" && canCreate && (
                <Button asChild>
                  <Link href="/dashboard/employees/add">
                    <FiPlus className="mr-2 h-4 w-4" />
                    Add Employee
                  </Link>
                </Button>
              )}
            </div>

            {/* Summary Stats Row */}
            {statsResult.success && statsResult.stats && (
              <div className="flex items-center gap-4 text-xs mt-1 text-muted-foreground font-medium">
                <div className="flex items-center gap-1">
                  <span>All Employees:</span>
                  <span className="font-bold text-foreground bg-muted px-2 py-0.5 rounded-full text-[10px]">
                    {statsResult.stats.all}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <span>Active:</span>
                  <span className="font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20 px-2 py-0.5 rounded-full text-[10px]">
                    {statsResult.stats.active}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <span>On Duty:</span>
                  <span className="font-bold text-blue-600 bg-blue-50 dark:bg-blue-950/20 px-2 py-0.5 rounded-full text-[10px]">
                    {statsResult.stats.onDuty}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        <Tabs defaultValue={tab} className="w-full">
          <TabsContent value="all" className="mt-0">
            <EmployeesListClient
              initialEmployees={result.employees || []}
              initialPagination={result.pagination || {
                page: 1,
                limit: 20,
                total: 0,
                totalPages: 0,
              }}
              initialSearch={search}
              isTrash={false}
              userId={userId || undefined}
              employeeTypes={employeeTypes}
              employeeTypeId={employeeTypeId}
              gender={gender}
              status={statusParam}
              departments={departmentsResult.success && departmentsResult.departments ? (departmentsResult.departments as any[]) : []}
              departmentId={departmentId}
              designations={designations}
              designationId={designationId}
              floors={floorsResult.success && floorsResult.floors ? (floorsResult.floors as any[]) : []}
              floorId={floorId}
              lines={linesResult.success && linesResult.lines ? (linesResult.lines as any[]) : []}
              lineId={lineId}
              allSkills={allSkills || []}
              skill={skill}
              permissions={{
                view: canView,
                edit: canEdit,
                create: canCreate,
                moveToTrash: canMoveToTrash,
                deletePermanently: canDeletePermanently,
                viewLedger: canViewLedger,
              }}
            />
          </TabsContent>
          <TabsContent value="trash" className="mt-4">
            <EmployeesListClient
              initialEmployees={result.employees || []}
              initialPagination={result.pagination || {
                page: 1,
                limit: 20,
                total: 0,
                totalPages: 0,
              }}
              initialSearch={search}
              isTrash={true}
              userId={userId || undefined}
              employeeTypes={employeeTypes}
              employeeTypeId={employeeTypeId}
              gender={gender}
              status={statusParam}
              departments={departmentsResult.success && departmentsResult.departments ? (departmentsResult.departments as any[]) : []}
              departmentId={departmentId}
              designations={designations}
              designationId={designationId}
              floors={floorsResult.success && floorsResult.floors ? (floorsResult.floors as any[]) : []}
              floorId={floorId}
              lines={linesResult.success && linesResult.lines ? (linesResult.lines as any[]) : []}
              lineId={lineId}
              allSkills={allSkills || []}
              skill={skill}
              permissions={{
                view: canView,
                edit: canEdit,
                create: canCreate,
                moveToTrash: canMoveToTrash,
                deletePermanently: canDeletePermanently,
                viewLedger: canViewLedger,
              }}
            />
          </TabsContent>
        </Tabs>
      </div>
    </PageGuard>
  );
}

