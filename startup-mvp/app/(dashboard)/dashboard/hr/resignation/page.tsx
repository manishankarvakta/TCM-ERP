import React from "react";
import { getResignations } from "./_actions/resignation.action";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";
import { FiPlus } from "react-icons/fi";
import ResignationList from "./_components/resignation-list";
import ResignationFormPrintButton from "./_components/resignation-form-print-button";
import ExportResignationButton from "./_components/ExportResignationButton";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { ResignationStatus } from "@prisma/client";

interface ResignationPageProps {
  searchParams: Promise<{
    page?: string;
    search?: string;
    status?: string;
    limit?: string;
  }>;
}

export default async function ResignationPage({ searchParams }: ResignationPageProps) {
  const params = await searchParams;
  const page = parseInt(params.page || "1");
  const limit = parseInt(params.limit || "20");
  const search = params.search || "";
  const statusParam = params.status || "ALL";

  const session = await auth();
  const userId = session?.user?.id;

  const [result, canView, canEdit, canApprove] = await Promise.all([
    getResignations(page, limit, search, statusParam as any),
    userId ? hasPermission(userId, "hr.resignation", "view") : false,
    userId ? hasPermission(userId, "hr.resignation", "edit") : false,
    userId ? hasPermission(userId, "hr.resignation", "approve") : false,
  ]);

  if (!result.success) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Resignation Applications</h1>
          </div>
        </div>
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
          <p className="text-sm text-destructive">{result.error || "Failed to load resignation applications"}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Resignation Applications</h1>
          <p className="text-sm text-muted-foreground">Manage employee resignation requests and offboarding status</p>
        </div>
        <div className="flex gap-2">
          <ExportResignationButton search={search} status={statusParam} />
          <ResignationFormPrintButton />
          {canEdit && (
            <Button asChild>
              <Link href="/dashboard/hr/resignation/apply">
                <FiPlus className="mr-2 h-4 w-4" />
                Submit Resignation
              </Link>
            </Button>
          )}
        </div>
      </div>

      <Tabs defaultValue={statusParam} className="w-full">
        <TabsList>
          <TabsTrigger value="ALL" asChild>
            <Link href="/dashboard/hr/resignation?status=ALL&page=1">All</Link>
          </TabsTrigger>
          <TabsTrigger value="PENDING" asChild>
            <Link href="/dashboard/hr/resignation?status=PENDING&page=1">Pending</Link>
          </TabsTrigger>
          <TabsTrigger value="MANAGER_APPROVED" asChild>
            <Link href="/dashboard/hr/resignation?status=MANAGER_APPROVED&page=1">Manager Approved</Link>
          </TabsTrigger>
          <TabsTrigger value="APPROVED" asChild>
            <Link href="/dashboard/hr/resignation?status=APPROVED&page=1">Approved</Link>
          </TabsTrigger>
          <TabsTrigger value="REJECTED" asChild>
            <Link href="/dashboard/hr/resignation?status=REJECTED&page=1">Rejected</Link>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value={statusParam} className="mt-4">
          <ResignationList
            initialResignations={(result.resignations as any) || []}
            initialPagination={result.pagination || { page: 1, limit: 20, total: 0, totalPages: 0 }}
            initialSearch={search}
            userId={userId}
            permissions={{
              view: canView,
              edit: canEdit,
              approve: canApprove,
            }}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
