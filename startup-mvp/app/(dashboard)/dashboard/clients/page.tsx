import React from "react";
import { getClients, getWarehousesForClient, getClientSummaryMetrics } from "./_actions/client.action";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";
import { FiPlus, FiUsers, FiAward } from "react-icons/fi";
import ClientsListClient from "./_components/clients";
import ExportClientsButton from "./_components/ExportClientsButton";
import PageGuard from "@/components/permissions/page-guard";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import PrintHeader, { PrintStyle } from "../procurements/_components/print-header";
import { hasPermission } from "@/lib/permissions";

interface ClientsPageProps {
  searchParams: Promise<{
    page?: string;
    search?: string;
    tab?: string;
    warehouse?: string;
    limit?: string;
    due?: string;
    clientType?: string;
  }>;
}

export default async function ClientsPage({ searchParams }: ClientsPageProps) {
  const params = await searchParams;
  const page = parseInt(params.page || "1");
  const limit = parseInt(params.limit || "20");
  const search = params.search || "";
  const tab = params.tab || "all";
  const warehouse = params.warehouse || "all";
  const due = (params.due === "has_due" || params.due === "no_due") ? params.due : "all";
  const clientType = (params.clientType === "regular" || params.clientType === "wholesale") ? params.clientType : "all";

  // Note: Clients retrieval includes clientType ('regular' / 'wholesale') for list table display
  const session = await auth();
  const userId = session?.user?.id;

  const status = tab === "trash" ? "trash" : "all";
  
  // Check permissions & fetch clients, warehouses, summary metrics, and active organization in parallel
  const [result, warehousesResult, summaryResult, org, canView, canEdit, canMoveToTrash, canDeletePermanently, canViewLedger] = await Promise.all([
    getClients(page, limit, search, status, warehouse, due, clientType),
    getWarehousesForClient(),
    getClientSummaryMetrics(warehouse, clientType, status),
    prisma.organization.findFirst({ where: { status: "active" }, orderBy: { createdAt: "desc" } }).catch(() => null),
    userId ? hasPermission(userId, "peoples.clients", "view") : false,
    userId ? hasPermission(userId, "peoples.clients", "edit") : false,
    userId ? hasPermission(userId, "peoples.clients", "move-to-trash") : false,
    userId ? hasPermission(userId, "peoples.clients", "delete-permanently") : false,
    userId ? hasPermission(userId, "peoples.clients", "ledger") : false,
  ]);

  // Handle errors
  if (!result.success) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Clients</h1>
            <p className="text-sm text-muted-foreground">Manage clients in your system</p>
          </div>
        </div>
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
          <p className="text-sm text-destructive">
            {result.error || "Failed to load clients"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <PageGuard permissionKey="peoples.clients">
      <div className="space-y-6">
        <PrintStyle />
        <PrintHeader
          docTitle="Clients List"
          docNumber="CLNT-LIST"
          hideBarcode={true}
          organizationName={org?.name}
          organizationAddress={org?.address}
          organizationEmail={org?.email}
          organizationPhone={org?.phone}
          organizationLogo={org?.logo}
        />
        <div className="flex items-center justify-between print:hidden">
          <div>
            <h1 className="text-2xl font-semibold">Clients</h1>
            <p className="text-sm text-muted-foreground">Manage clients in your system</p>
          </div>
          <div className="flex items-center gap-2">
            <ExportClientsButton search={search} tab={tab} warehouse={warehouse} due={due} clientType={clientType} />
            {tab !== "trash" && (
              <Button asChild>
                <Link href="/dashboard/clients/add">
                  <FiPlus className="mr-2 h-4 w-4" />
                  Add Client
                </Link>
              </Button>
            )}
          </div>
        </div>

        <Tabs defaultValue={tab} className="w-full">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 print:hidden">
            {/* Tabs List */}
            <TabsList>
              <TabsTrigger value="all" asChild>
                <Link href="/dashboard/clients?tab=all&page=1">All Clients</Link>
              </TabsTrigger>
              <TabsTrigger value="trash" asChild>
                <Link href="/dashboard/clients?tab=trash&page=1">Trash</Link>
              </TabsTrigger>
            </TabsList>

            {/* Client Summary Analytics Cards Inline */}
            {tab !== "trash" && summaryResult.success && summaryResult.summary && (
              <div className="flex flex-wrap items-center gap-2.5">
                {/* Total Clients Card */}
                <div className="bg-blue-50/70 dark:bg-blue-950/25 border border-blue-100/80 dark:border-blue-900/40 rounded-lg px-3 py-1.5 h-10 flex items-center gap-2.5 shadow-sm hover:shadow-md transition-all duration-300">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 bg-blue-500/10 text-blue-600 dark:text-blue-400">
                    <FiUsers className="h-3.5 w-3.5" />
                  </div>
                  <div>
                    <p className="text-[9px] uppercase font-bold tracking-wider text-blue-600/80 dark:text-blue-400/80 leading-none mb-0.5">Total Clients</p>
                    <p className="text-xs font-bold font-mono text-blue-700 dark:text-blue-300 leading-none">
                      {summaryResult.summary.totalClients.toLocaleString()}{" "}
                      <span className="text-[10px] font-normal text-muted-foreground font-sans">({summaryResult.summary.activeClients} Active)</span>
                    </p>
                  </div>
                </div>

                {/* Total Receivable / Outstanding Due Card */}
                <div className="bg-amber-50/70 dark:bg-amber-950/25 border border-amber-100/80 dark:border-amber-900/40 rounded-lg px-3 py-1.5 h-10 flex items-center gap-2.5 shadow-sm hover:shadow-md transition-all duration-300">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 bg-amber-500/10 text-amber-600 dark:text-amber-400">
                    <span className="text-xs font-bold leading-none">৳</span>
                  </div>
                  <div>
                    <p className="text-[9px] uppercase font-bold tracking-wider text-amber-600/80 dark:text-amber-400/80 leading-none mb-0.5">Total Receivable</p>
                    <p className="text-xs font-bold font-mono text-amber-700 dark:text-amber-300 leading-none">
                      ৳{summaryResult.summary.totalDue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{" "}
                      <span className="text-[10px] font-normal text-muted-foreground font-sans">({summaryResult.summary.clientsWithDue} with due)</span>
                    </p>
                  </div>
                </div>

                {/* Total Customer Points Card */}
                <div className="bg-emerald-50/70 dark:bg-emerald-950/25 border border-emerald-100/80 dark:border-emerald-900/40 rounded-lg px-3 py-1.5 h-10 flex items-center gap-2.5 shadow-sm hover:shadow-md transition-all duration-300">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    <FiAward className="h-3.5 w-3.5" />
                  </div>
                  <div>
                    <p className="text-[9px] uppercase font-bold tracking-wider text-emerald-600/80 dark:text-emerald-400/80 leading-none mb-0.5">Customer Points</p>
                    <p className="text-xs font-bold font-mono text-emerald-700 dark:text-emerald-300 leading-none">
                      {summaryResult.summary.totalPoints.toLocaleString()}{" "}
                      <span className="text-[10px] font-normal text-muted-foreground font-sans">pts</span>
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
          <TabsContent value="all" className="mt-4">
            <ClientsListClient
              initialClients={result.clients || []}
              initialPagination={result.pagination || {
                page: 1,
                limit: 20,
                total: 0,
                totalPages: 0,
              }}
              initialSearch={search}
              initialWarehouse={warehouse}
              initialDue={due}
              initialClientType={clientType}
              warehouses={warehousesResult.warehouses || []}
              isTrash={false}
              userId={userId || undefined}
              permissions={{
                view: canView,
                edit: canEdit,
                moveToTrash: canMoveToTrash,
                deletePermanently: canDeletePermanently,
                viewLedger: canViewLedger,
              }}
            />
          </TabsContent>
          <TabsContent value="trash" className="mt-4">
            <ClientsListClient
              initialClients={result.clients || []}
              initialPagination={result.pagination || {
                page: 1,
                limit: 20,
                total: 0,
                totalPages: 0,
              }}
              initialSearch={search}
              initialWarehouse={warehouse}
              initialDue={due}
              initialClientType={clientType}
              warehouses={warehousesResult.warehouses || []}
              isTrash={true}
              userId={userId || undefined}
              permissions={{
                view: canView,
                edit: canEdit,
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

