import React from "react";
import { getBiometricRawLogs } from "./_actions/raw-logs.action";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";
import RawLogsListClient from "./_components/raw-logs-list";
import PageGuard from "@/components/permissions/page-guard";

interface RawLogsPageProps {
  searchParams: Promise<{
    page?: string;
    search?: string;
    tab?: string;
    source?: string;
  }>;
}

export default async function BiometricRawLogsPage({ searchParams }: RawLogsPageProps) {
  const params = await searchParams;
  const page = parseInt(params.page || "1");
  const search = params.search || "";
  const tab = params.tab || "all";
  const source = params.source || "all";

  const status = tab === "all" ? "all" : tab;

  const result = await getBiometricRawLogs(page, 10, search, status, source);

  if (!result.success) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Hardware Diagnostics</h1>
            <p className="text-sm text-muted-foreground">Technical punch data received directly from biometric devices.</p>
          </div>
        </div>
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
          <p className="text-sm text-destructive">{result.error || "Failed to load raw logs"}</p>
        </div>
      </div>
    );
  }

  return (
    <PageGuard permissionKey="hr.biometric.view">
      <div className="space-y-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold">Hardware Diagnostics</h1>
          <p className="text-sm text-muted-foreground">Technical punch data received directly from biometric devices.</p>
        </div>

        <div className="rounded-lg border bg-yellow-50/50 p-3 text-sm text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300">
          <strong>Notice:</strong> This page is mainly for IT/admin troubleshooting. HR users should use Attendance or Unknown Punches instead.
        </div>

        <Tabs defaultValue={tab} className="w-full">
          <TabsList>
            <TabsTrigger value="all" asChild>
              <Link href="/dashboard/hr/biometric/raw-logs?tab=all&page=1">All</Link>
            </TabsTrigger>
            <TabsTrigger value="PENDING" asChild>
              <Link href="/dashboard/hr/biometric/raw-logs?tab=PENDING&page=1">Pending</Link>
            </TabsTrigger>
            <TabsTrigger value="PROCESSED" asChild>
              <Link href="/dashboard/hr/biometric/raw-logs?tab=PROCESSED&page=1">Processed</Link>
            </TabsTrigger>
            <TabsTrigger value="ERROR" asChild>
              <Link href="/dashboard/hr/biometric/raw-logs?tab=ERROR&page=1">Error</Link>
            </TabsTrigger>
            <TabsTrigger value="UNMAPPED" asChild>
              <Link href="/dashboard/hr/biometric/raw-logs?tab=UNMAPPED&page=1">Unmapped</Link>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value={tab} className="mt-4">
            <RawLogsListClient
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
