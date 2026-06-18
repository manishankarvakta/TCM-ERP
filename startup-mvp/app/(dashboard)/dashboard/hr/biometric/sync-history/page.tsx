import React from "react";
import { getBiometricSyncHistory } from "./_actions/sync-history.action";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";
import SyncHistoryListClient from "./_components/sync-history-list";
import PageGuard from "@/components/permissions/page-guard";

interface SyncHistoryPageProps {
  searchParams: Promise<{
    page?: string;
    search?: string;
    tab?: string;
    source?: string;
  }>;
}

export default async function BiometricSyncHistoryPage({ searchParams }: SyncHistoryPageProps) {
  const params = await searchParams;
  const page = parseInt(params.page || "1");
  const search = params.search || "";
  const tab = params.tab || "all";
  const source = params.source || "all";

  const status = tab === "all" ? "all" : tab;

  const result = await getBiometricSyncHistory(page, 10, search, status, source);

  if (!result.success) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Sync Activity</h1>
            <p className="text-sm text-muted-foreground">History of device sync jobs and background biometric processing.</p>
          </div>
        </div>
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
          <p className="text-sm text-destructive">{result.error || "Failed to load sync history"}</p>
        </div>
      </div>
    );
  }

  return (
    <PageGuard permissionKey="hr.biometric.view">
      <div className="space-y-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold">Sync Activity</h1>
          <p className="text-sm text-muted-foreground">History of device sync jobs and background biometric processing.</p>
        </div>

        <div className="rounded-lg border bg-yellow-50/50 p-3 text-sm text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300">
          <strong>Notice:</strong> This page is mainly useful for Admin/IT troubleshooting.
        </div>

        <Tabs defaultValue={tab} className="w-full">
          <TabsList>
            <TabsTrigger value="all" asChild>
              <Link href="/dashboard/hr/biometric/sync-history?tab=all&page=1">All</Link>
            </TabsTrigger>
            <TabsTrigger value="SUCCESS" asChild>
              <Link href="/dashboard/hr/biometric/sync-history?tab=SUCCESS&page=1">Success</Link>
            </TabsTrigger>
            <TabsTrigger value="FAILED" asChild>
              <Link href="/dashboard/hr/biometric/sync-history?tab=FAILED&page=1">Failed</Link>
            </TabsTrigger>
            <TabsTrigger value="PARTIAL" asChild>
              <Link href="/dashboard/hr/biometric/sync-history?tab=PARTIAL&page=1">Partial</Link>
            </TabsTrigger>
            <TabsTrigger value="PENDING" asChild>
              <Link href="/dashboard/hr/biometric/sync-history?tab=PENDING&page=1">Pending</Link>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value={tab} className="mt-4">
            <SyncHistoryListClient
              initialLogs={result.logs || []}
              initialPagination={result.pagination || {
                page: 1,
                limit: 10,
                total: 0,
                totalPages: 0,
              }}
              initialSearch={search}
              initialSource={source}
            />
          </TabsContent>
        </Tabs>
      </div>
    </PageGuard>
  );
}
