import React from "react";
import { getTPNs } from "./_actions/tpn.action";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";
import { FiPlus } from "react-icons/fi";
import TpnListClient from "./_components/tpn-list";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";

interface TPNPageProps {
  searchParams: Promise<{
    page?: string;
    search?: string;
    tab?: string;
  }>;
}

export default async function TPNPage({ searchParams }: TPNPageProps) {
  const params = await searchParams;
  const page = parseInt(params.page || "1");
  const search = params.search || "";
  const tab = params.tab || "all";

  const session = await auth();
  const userId = session?.user?.id;

  const status = tab === "trash" ? "trash" : "all";

  const [result, canView, canEdit, canMoveToTrash, canDeletePermanently, canApprove] = await Promise.all([
    getTPNs(page, 10, search, status),
    userId ? hasPermission(userId, "procurements.tpn", "view") : false,
    userId ? hasPermission(userId, "procurements.tpn", "edit") : false,
    userId ? hasPermission(userId, "procurements.tpn", "move-to-trash") : false,
    userId ? hasPermission(userId, "procurements.tpn", "delete-permanently") : false,
    userId ? hasPermission(userId, "procurements.tpn", "approve") : false,
  ]);

  if (!result.success) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Transfer Notes</h1>
            <p className="text-sm text-muted-foreground">Manage warehouse transfers in your system</p>
          </div>
        </div>
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
          <p className="text-sm text-destructive">
            {result.error || "Failed to load transfer notes"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Transfer Notes</h1>
          <p className="text-sm text-muted-foreground">Manage warehouse transfers in your system</p>
        </div>
        {tab !== "trash" && (
          <Button asChild>
            <Link href="/dashboard/procurements/tpn/add">
              <FiPlus className="mr-2 h-4 w-4" />
              New Transfer Note
            </Link>
          </Button>
        )}
      </div>

      <Tabs defaultValue={tab} className="w-full">
        <TabsList>
          <TabsTrigger value="all" asChild>
            <Link href="/dashboard/procurements/tpn?tab=all&page=1">All Transfers</Link>
          </TabsTrigger>
          <TabsTrigger value="trash" asChild>
            <Link href="/dashboard/procurements/tpn?tab=trash&page=1">Trash</Link>
          </TabsTrigger>
        </TabsList>
        <TabsContent value="all" className="mt-4">
          <TpnListClient
            initialTPNs={result.data || []}
            initialPagination={
              result.pagination || {
                page: 1,
                limit: 10,
                total: 0,
                totalPages: 0,
              }
            }
            initialSearch={search}
            isTrash={false}
            userId={userId || undefined}
            permissions={{
              view: canView,
              edit: canEdit,
              moveToTrash: canMoveToTrash,
              deletePermanently: canDeletePermanently,
              approve: canApprove,
            }}
          />
        </TabsContent>
        <TabsContent value="trash" className="mt-4">
          <TpnListClient
            initialTPNs={result.data || []}
            initialPagination={
              result.pagination || {
                page: 1,
                limit: 10,
                total: 0,
                totalPages: 0,
              }
            }
            initialSearch={search}
            isTrash={true}
            userId={userId || undefined}
            permissions={{
              view: canView,
              edit: canEdit,
              moveToTrash: canMoveToTrash,
              deletePermanently: canDeletePermanently,
              approve: canApprove,
            }}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
