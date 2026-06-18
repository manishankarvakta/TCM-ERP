import React from "react";
import { getUnmappedBiometricLogs, getActiveEmployeesForResolve, getActiveDevicesForResolve } from "./_actions/unmapped-logs.action";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";
import UnmappedLogsListClient from "./_components/unmapped-logs-list";
import PageGuard from "@/components/permissions/page-guard";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";

interface UnmappedLogsPageProps {
  searchParams: Promise<{
    page?: string;
    search?: string;
    tab?: string;
  }>;
}

export default async function UnmappedBiometricLogsPage({ searchParams }: UnmappedLogsPageProps) {
  const params = await searchParams;
  const page = parseInt(params.page || "1");
  const search = params.search || "";
  const tab = params.tab || "unresolved";

  const session = await auth();
  const userId = session?.user?.id;

  const status = tab;

  const [result, employees, devices, canView, canManage] = await Promise.all([
    getUnmappedBiometricLogs(page, 10, search, status),
    getActiveEmployeesForResolve(),
    getActiveDevicesForResolve(),
    userId ? hasPermission(userId, "hr.biometric.view", "view") : false,
    userId ? hasPermission(userId, "hr.biometric.manage", "manage") : false,
  ]);

  if (!result.success) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Unknown Punches</h1>
            <p className="text-sm text-muted-foreground">Punches received from biometric devices that could not be matched to an employee.</p>
          </div>
        </div>
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
          <p className="text-sm text-destructive">{result.error || "Failed to load unmapped logs"}</p>
        </div>
      </div>
    );
  }

  return (
    <PageGuard permissionKey="hr.biometric.view">
      <div className="space-y-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold">Unknown Punches</h1>
          <p className="text-sm text-muted-foreground">Punches received from biometric devices that could not be matched to an employee.</p>
        </div>

        <Tabs defaultValue={tab} className="w-full">
          <TabsList>
            <TabsTrigger value="unresolved" asChild>
              <Link href="/dashboard/hr/biometric/unmapped-logs?tab=unresolved&page=1">Unresolved</Link>
            </TabsTrigger>
            <TabsTrigger value="resolved" asChild>
              <Link href="/dashboard/hr/biometric/unmapped-logs?tab=resolved&page=1">Resolved</Link>
            </TabsTrigger>
            <TabsTrigger value="all" asChild>
              <Link href="/dashboard/hr/biometric/unmapped-logs?tab=all&page=1">All</Link>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value={tab} className="mt-4">
            <UnmappedLogsListClient
              initialLogs={result.logs || []}
              initialPagination={result.pagination || {
                page: 1,
                limit: 10,
                total: 0,
                totalPages: 0,
              }}
              initialSearch={search}
              employees={employees}
              devices={devices}
              permissions={{ view: canView, manage: canManage }}
            />
          </TabsContent>
        </Tabs>
      </div>
    </PageGuard>
  );
}
