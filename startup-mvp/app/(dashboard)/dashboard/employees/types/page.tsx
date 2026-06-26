import React from "react";
import { getEmployeeTypes } from "./_actions/employee-type.action";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";
import { FiPlus } from "react-icons/fi";
import EmployeeTypesList from "./_components/employee-types-list";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import EmployeeTypeForm from "./_components/employee-type-form";

interface EmployeeTypesPageProps {
  searchParams: Promise<{
    page?: string;
    search?: string;
    tab?: string;
    action?: string;
    id?: string;
  }>;
}

export default async function EmployeeTypesPage({ searchParams }: EmployeeTypesPageProps) {
  const params = await searchParams;
  const page = parseInt(params.page || "1");
  const search = params.search || "";
  const tab = params.tab || "all";
  const action = params.action || "";
  const id = params.id || "";

  const session = await auth();
  const userId = session?.user?.id;

  const [result, canView, canEdit, canMoveToTrash] = await Promise.all([
    getEmployeeTypes(page, 10, search, tab === "trash" ? "trash" : "all"),
    userId ? hasPermission(userId, "peoples.employees", "view") : false,
    userId ? hasPermission(userId, "peoples.employees", "edit") : false,
    userId ? hasPermission(userId, "peoples.employees", "move-to-trash") : false,
  ]);

  if (!result.success) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Employee Types</h1>
          </div>
        </div>
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
          <p className="text-sm text-destructive">{result.error || "Failed to load employee types"}</p>
        </div>
      </div>
    );
  }

  // Show form if action is create or edit
  if (action === "create" && canEdit) {
    return (
      <div className="space-y-6">
        <EmployeeTypeForm mode="create" />
      </div>
    );
  }

  if (action === "edit" && canEdit && id) {
    const typeToEdit = (result.employeeTypes as any[]).find(et => et.id === id);
    if (typeToEdit) {
      return (
        <div className="space-y-6">
          <EmployeeTypeForm mode="edit" initialData={typeToEdit} />
        </div>
      );
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Employee Types</h1>
          <p className="text-sm text-muted-foreground">Manage dynamic categories for employee profiles</p>
        </div>
        {tab !== "trash" && canEdit && (
          <Button asChild>
            <Link href="/dashboard/employees/types?action=create">
              <FiPlus className="mr-2 h-4 w-4" />
              Add Employee Type
            </Link>
          </Button>
        )}
      </div>

      <Tabs defaultValue={tab} className="w-full">
        <TabsList>
          <TabsTrigger value="all" asChild>
            <Link href="/dashboard/employees/types?tab=all&page=1">All Types</Link>
          </TabsTrigger>
          <TabsTrigger value="trash" asChild>
            <Link href="/dashboard/employees/types?tab=trash&page=1">Trash</Link>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value={tab} className="mt-4">
          <EmployeeTypesList
            initialEmployeeTypes={(result.employeeTypes as any[]) || []}
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
