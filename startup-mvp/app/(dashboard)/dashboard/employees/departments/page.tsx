import React from "react";
import { getDepartments } from "./_actions/department.action";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";
import { FiPlus, FiArrowLeft } from "react-icons/fi";
import DepartmentsList from "./_components/departments-list";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import DepartmentForm from "./_components/department-form";

interface DepartmentsPageProps {
  searchParams: Promise<{
    page?: string;
    search?: string;
    tab?: string;
    action?: string;
    id?: string;
  }>;
}

export default async function DepartmentsPage({ searchParams }: DepartmentsPageProps) {
  const params = await searchParams;
  const page = parseInt(params.page || "1");
  const search = params.search || "";
  const tab = params.tab || "all";
  const action = params.action || "";
  const id = params.id || "";

  const session = await auth();
  const userId = session?.user?.id;

  const [result, canView, canEdit, canMoveToTrash] = await Promise.all([
    getDepartments(page, 10, search, tab === "trash" ? "trash" : "all"),
    userId ? hasPermission(userId, "peoples.employees", "view") : false,
    userId ? hasPermission(userId, "peoples.employees", "edit") : false,
    userId ? hasPermission(userId, "peoples.employees", "move-to-trash") : false,
  ]);

  if (!result.success) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Departments</h1>
          </div>
        </div>
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
          <p className="text-sm text-destructive">{result.error || "Failed to load departments"}</p>
        </div>
      </div>
    );
  }

  // Show form if action is create or edit
  if (action === "create" && canEdit) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="ghost" asChild>
            <Link href="/dashboard/employees/departments">
              <FiArrowLeft className="mr-2 h-4 w-4" />
              Back to Departments
            </Link>
          </Button>
        </div>
        <DepartmentForm mode="create" />
      </div>
    );
  }

  if (action === "edit" && canEdit && id) {
    const departmentToEdit = (result.departments as any[]).find(d => d.id === id);
    if (departmentToEdit) {
      return (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <Button variant="ghost" asChild>
              <Link href="/dashboard/employees/departments">
                <FiArrowLeft className="mr-2 h-4 w-4" />
                Back to Departments
              </Link>
            </Button>
          </div>
          <DepartmentForm mode="edit" initialData={departmentToEdit} />
        </div>
      );
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard/employees">
              <FiArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-semibold">Departments</h1>
            <p className="text-sm text-muted-foreground">Manage departments for employee profiles</p>
          </div>
        </div>
        {tab !== "trash" && canEdit && (
          <Button asChild>
            <Link href="/dashboard/employees/departments?action=create">
              <FiPlus className="mr-2 h-4 w-4" />
              Add Department
            </Link>
          </Button>
        )}
      </div>

      <Tabs defaultValue={tab} className="w-full">
        <TabsList>
          <TabsTrigger value="all" asChild>
            <Link href="/dashboard/employees/departments?tab=all&page=1">All Departments</Link>
          </TabsTrigger>
          <TabsTrigger value="trash" asChild>
            <Link href="/dashboard/employees/departments?tab=trash&page=1">Trash</Link>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value={tab} className="mt-4">
          <DepartmentsList
            initialDepartments={(result.departments as any[]) || []}
            initialPagination={result.pagination || { page: 1, limit: 10, total: 0, totalPages: 0 }}
            initialSearch={search}
            isTrash={tab === "trash"}
            userId={userId}
            permissions={{
              view: canView,
              edit: canEdit,
              moveToTrash: canMoveToTrash,
            }}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
