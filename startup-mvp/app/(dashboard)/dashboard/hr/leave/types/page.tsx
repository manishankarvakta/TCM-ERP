import React from "react";
import { getLeaveTypes } from "./_actions/leave-type.action";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";
import { FiPlus } from "react-icons/fi";
import LeaveTypesListClient from "./_components/leave-types-list";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import LeaveTypeForm from "./_components/leave-type-form";

interface LeaveTypesPageProps {
  searchParams: Promise<{
    page?: string;
    search?: string;
    tab?: string;
    action?: string;
    id?: string;
  }>;
}

export default async function LeaveTypesPage({ searchParams }: LeaveTypesPageProps) {
  const params = await searchParams;
  const page = parseInt(params.page || "1");
  const search = params.search || "";
  const tab = params.tab || "all";
  const action = params.action || "";
  const id = params.id || "";

  const session = await auth();
  const userId = session?.user?.id;

  const [result, canView, canEdit, canMoveToTrash] = await Promise.all([
    getLeaveTypes(page, 10, search, tab === "trash" ? "trash" : "all"),
    userId ? hasPermission(userId, "hr.leave", "view") : false,
    userId ? hasPermission(userId, "hr.leave", "edit") : false,
    userId ? hasPermission(userId, "hr.leave", "move-to-trash") : false,
  ]);

  if (!result.success) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Leave Types</h1>
          </div>
        </div>
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
          <p className="text-sm text-destructive">{result.error || "Failed to load leave types"}</p>
        </div>
      </div>
    );
  }

  // Show form if action is create or edit
  if (action === "create" && canEdit) {
    return (
      <div className="space-y-6">
        <LeaveTypeForm mode="create" />
      </div>
    );
  }

  if (action === "edit" && canEdit && id) {
    const typeToEdit = result.leaveTypes.find(lt => lt.id === id);
    if (typeToEdit) {
      return (
        <div className="space-y-6">
          <LeaveTypeForm mode="edit" initialData={typeToEdit} />
        </div>
      );
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Leave Types</h1>
          <p className="text-sm text-muted-foreground">Manage categories and default balances for leaves</p>
        </div>
        {tab !== "trash" && canEdit && (
          <Button asChild>
            <Link href="/dashboard/hr/leave/types?action=create">
              <FiPlus className="mr-2 h-4 w-4" />
              Add Leave Type
            </Link>
          </Button>
        )}
      </div>

      <Tabs defaultValue={tab} className="w-full">
        <TabsList>
          <TabsTrigger value="all" asChild>
            <Link href="/dashboard/hr/leave/types?tab=all&page=1">All Types</Link>
          </TabsTrigger>
          <TabsTrigger value="trash" asChild>
            <Link href="/dashboard/hr/leave/types?tab=trash&page=1">Trash</Link>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value={tab} className="mt-4">
          <LeaveTypesListClient
            initialLeaveTypes={result.leaveTypes || []}
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
