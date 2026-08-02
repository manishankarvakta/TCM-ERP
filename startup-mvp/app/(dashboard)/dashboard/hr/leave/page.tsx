import React from "react";
import { getLeaveApplications } from "./_actions/leave-application.action";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";
import { FiPlus } from "react-icons/fi";
import LeaveApplicationsListClient from "./_components/leave-applications-list";
import LeaveFormPrintButton from "./_components/leave-form-print-button";
import ExportLeaveButton from "./_components/ExportLeaveButton";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { LeaveStatus } from "@prisma/client";

interface LeavePageProps {
  searchParams: Promise<{
    page?: string;
    search?: string;
    status?: string;
    limit?: string;
  }>;
}

export default async function LeavePage({ searchParams }: LeavePageProps) {
  const params = await searchParams;
  const page = parseInt(params.page || "1");
  const limit = parseInt(params.limit || "20");
  const search = params.search || "";
  const statusParam = params.status || "ALL";

  const session = await auth();
  const userId = session?.user?.id;

  const [result, canView, canEdit] = await Promise.all([
    getLeaveApplications(page, limit, search, statusParam as any),
    userId ? hasPermission(userId, "hr.leave", "view") : false,
    userId ? hasPermission(userId, "hr.leave", "edit") : false,
  ]);

  if (!result.success) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Leave Applications</h1>
          </div>
        </div>
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
          <p className="text-sm text-destructive">{result.error || "Failed to load leave applications"}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Leave Applications</h1>
          <p className="text-sm text-muted-foreground">Manage employee leave requests and approvals</p>
        </div>
        <div className="flex gap-2">
          {canEdit && (
            <Button variant="outline" asChild>
              <Link href="/dashboard/hr/leave/types">
                Leave Types Setup
              </Link>
            </Button>
          )}
          <ExportLeaveButton search={search} status={statusParam} />
          <LeaveFormPrintButton />
          <Button asChild>
            <Link href="/dashboard/hr/leave/apply">
              <FiPlus className="mr-2 h-4 w-4" />
              Apply Leave
            </Link>
          </Button>
        </div>
      </div>

      <Tabs defaultValue={statusParam} className="w-full">
        <TabsList>
          <TabsTrigger value="ALL" asChild>
            <Link href="/dashboard/hr/leave?status=ALL&page=1">All</Link>
          </TabsTrigger>
          <TabsTrigger value="PENDING" asChild>
            <Link href="/dashboard/hr/leave?status=PENDING&page=1">Pending</Link>
          </TabsTrigger>
          <TabsTrigger value="MANAGER_APPROVED" asChild>
            <Link href="/dashboard/hr/leave?status=MANAGER_APPROVED&page=1">Manager Approved</Link>
          </TabsTrigger>
          <TabsTrigger value="HR_APPROVED" asChild>
            <Link href="/dashboard/hr/leave?status=HR_APPROVED&page=1">HR Approved</Link>
          </TabsTrigger>
          <TabsTrigger value="REJECTED" asChild>
            <Link href="/dashboard/hr/leave?status=REJECTED&page=1">Rejected</Link>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value={statusParam} className="mt-4">
          <LeaveApplicationsListClient
            initialApplications={(result.leaveApplications as any) || []}
            initialPagination={result.pagination || { page: 1, limit: 20, total: 0, totalPages: 0 }}
            initialSearch={search}
            userId={userId}
            permissions={{
              view: canView,
              edit: canEdit,
            }}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
