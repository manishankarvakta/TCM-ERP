import React from "react";
import { getClients, getWarehousesForClient } from "./_actions/client.action";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";
import { FiPlus, FiBook } from "react-icons/fi";
import ClientsListClient from "./_components/clients";
import ExportClientsButton from "./_components/ExportClientsButton";
import PageGuard from "@/components/permissions/page-guard";
import { auth } from "@/lib/auth";
import PrintHeader, { PrintStyle } from "../procurements/_components/print-header";
import { hasPermission } from "@/lib/permissions";

interface ClientsPageProps {
  searchParams: Promise<{
    page?: string;
    search?: string;
    tab?: string;
    warehouse?: string;
    limit?: string;
  }>;
}

export default async function ClientsPage({ searchParams }: ClientsPageProps) {
  const params = await searchParams;
  const page = parseInt(params.page || "1");
  const limit = parseInt(params.limit || "20");
  const search = params.search || "";
  const tab = params.tab || "all";
  const warehouse = params.warehouse || "all";

  // Note: Clients retrieval includes clientType ('regular' / 'wholesale') for list table display
  const session = await auth();
  const userId = session?.user?.id;

  const status = tab === "trash" ? "trash" : "all";
  
  // Check permissions on server side for better performance
  const [result, warehousesResult, canView, canEdit, canMoveToTrash, canDeletePermanently, canViewLedger] = await Promise.all([
    getClients(page, limit, search, status, warehouse),
    getWarehousesForClient(),
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

  const firstClientId = result.clients && result.clients.length > 0 ? result.clients[0].id : null;

  return (
    <PageGuard permissionKey="peoples.clients">
      <div className="space-y-6">
        <PrintStyle />
        <PrintHeader docTitle="Clients List" docNumber="CLNT-LIST" hideBarcode={true} />
        <div className="flex items-center justify-between print:hidden">
          <div>
            <h1 className="text-2xl font-semibold">Clients</h1>
            <p className="text-sm text-muted-foreground">Manage clients in your system</p>
          </div>
          <div className="flex items-center gap-2">
            <ExportClientsButton search={search} tab={tab} warehouse={warehouse} />
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
          <TabsList className="print:hidden">
            <TabsTrigger value="all" asChild>
              <Link href="/dashboard/clients?tab=all&page=1">All Clients</Link>
            </TabsTrigger>
            <TabsTrigger value="trash" asChild>
              <Link href="/dashboard/clients?tab=trash&page=1">Trash</Link>
            </TabsTrigger>
          </TabsList>
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

