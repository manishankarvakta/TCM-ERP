import React from "react";
import { getEmployees } from "./_actions/employee.action";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";
import { FiPlus } from "react-icons/fi";
import EmployeesListClient from "./_components/employees";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";

interface EmployeesPageProps {
  searchParams: Promise<{
    page?: string;
    search?: string;
    tab?: string;
  }>;
}

export default async function EmployeesPage({ searchParams }: EmployeesPageProps) {
  const params = await searchParams;
  const page = parseInt(params.page || "1");
  const search = params.search || "";
  const tab = params.tab || "all";

  const session = await auth();
  const userId = session?.user?.id;

  const status = tab === "trash" ? "trash" : "all";
  
  // Check permissions on server side for better performance
  const [result, canView, canEdit, canCreate, canMoveToTrash, canDeletePermanently] = await Promise.all([
    getEmployees(page, 10, search, status),
    userId ? hasPermission(userId, "peoples.employees", "view") : false,
    userId ? hasPermission(userId, "peoples.employees", "edit") : false,
    userId ? hasPermission(userId, "peoples.employees", "create") : false,
    userId ? hasPermission(userId, "peoples.employees", "move-to-trash") : false,
    userId ? hasPermission(userId, "peoples.employees", "delete-permanently") : false,
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

  return (
    <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Employees</h1>
            <p className="text-sm text-muted-foreground">Manage employees in your system</p>
          </div>
          {tab !== "trash" && canCreate && (
            <Button asChild>
              <Link href="/admin/employees/add">
                <FiPlus className="mr-2 h-4 w-4" />
                Add Employee
              </Link>
            </Button>
          )}
        </div>

        <Tabs defaultValue={tab} className="w-full">
          <TabsList>
            <TabsTrigger value="all" asChild>
              <Link href="/admin/employees?tab=all&page=1">All Employees</Link>
            </TabsTrigger>
            <TabsTrigger value="trash" asChild>
              <Link href="/admin/employees?tab=trash&page=1">Trash</Link>
            </TabsTrigger>
          </TabsList>
          <TabsContent value="all" className="mt-4">
            <EmployeesListClient
              initialEmployees={result.employees || []}
              initialPagination={result.pagination || {
                page: 1,
                limit: 10,
                total: 0,
                totalPages: 0,
              }}
              initialSearch={search}
              isTrash={false}
              userId={userId || undefined}
              permissions={{
                view: canView,
                edit: canEdit,
                moveToTrash: canMoveToTrash,
                deletePermanently: canDeletePermanently,
              }}
            />
          </TabsContent>
          <TabsContent value="trash" className="mt-4">
            <EmployeesListClient
              initialEmployees={result.employees || []}
              initialPagination={result.pagination || {
                page: 1,
                limit: 10,
                total: 0,
                totalPages: 0,
              }}
              initialSearch={search}
              isTrash={true}
              userId={userId || undefined}
              permissions={{
                view: canView,
                edit: canEdit,
                moveToTrash: canMoveToTrash,
                deletePermanently: canDeletePermanently,
              }}
            />
          </TabsContent>
        </Tabs>
    </div>
  );
}

