import React from "react";
import { getChartOfAccounts } from "./_actions/chart-of-accounts.action";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";
import { FiPlus } from "react-icons/fi";
import ChartOfAccountsListClient from "./_components/chart-of-accounts-list";
import PageGuard from "@/components/permissions/page-guard";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";

interface ChartOfAccountsPageProps {
  searchParams: Promise<{
    page?: string;
    search?: string;
    tab?: string;
  }>;
}

export default async function ChartOfAccountsPage({ searchParams }: ChartOfAccountsPageProps) {
  const params = await searchParams;
  const page = parseInt(params.page || "1");
  const search = params.search || "";
  const tab = params.tab || "all";

  const session = await auth();
  const userId = session?.user?.id;

  const status = tab === "trash" ? "trash" : tab === "active" ? "active" : tab === "inactive" ? "inactive" : "all";
  
  // Check permissions on server side
  const [result, canView, canEdit, canMoveToTrash, canDeletePermanently] = await Promise.all([
    getChartOfAccounts(page, 10, search, status),
    userId ? hasPermission(userId, "accounts.chart-of-accounts", "view") : false,
    userId ? hasPermission(userId, "accounts.chart-of-accounts", "edit") : false,
    userId ? hasPermission(userId, "accounts.chart-of-accounts", "move-to-trash") : false,
    userId ? hasPermission(userId, "accounts.chart-of-accounts", "delete-permanently") : false,
  ]);

  // Handle errors
  if (!result.success) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Chart of Accounts</h1>
            <p className="text-sm text-muted-foreground">Manage and organize your chart of accounts</p>
          </div>
        </div>
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
          <p className="text-sm text-destructive">
            {result.error || "Failed to load chart of accounts"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <PageGuard permissionKey="accounts.chart-of-accounts">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Chart of Accounts</h1>
            <p className="text-sm text-muted-foreground">Manage and organize your chart of accounts</p>
          </div>
          {tab !== "trash" && (
            <Button asChild>
              <Link href="/dashboard/accounts/chart-of-accounts/add">
                <FiPlus className="mr-2 h-4 w-4" />
                Add Account
              </Link>
            </Button>
          )}
        </div>

        <Tabs defaultValue={tab} className="w-full">
          <TabsList>
            <TabsTrigger value="all" asChild>
              <Link href="/dashboard/accounts/chart-of-accounts?tab=all&page=1">All Accounts</Link>
            </TabsTrigger>
            <TabsTrigger value="active" asChild>
              <Link href="/dashboard/accounts/chart-of-accounts?tab=active&page=1">Active</Link>
            </TabsTrigger>
            <TabsTrigger value="inactive" asChild>
              <Link href="/dashboard/accounts/chart-of-accounts?tab=inactive&page=1">Inactive</Link>
            </TabsTrigger>
            <TabsTrigger value="trash" asChild>
              <Link href="/dashboard/accounts/chart-of-accounts?tab=trash&page=1">Trash</Link>
            </TabsTrigger>
          </TabsList>
          <TabsContent value="all" className="mt-4">
            <ChartOfAccountsListClient
              initialAccounts={result.accounts || []}
              initialPagination={result.pagination || {
                page: 1,
                limit: 10,
                total: 0,
                totalPages: 0,
              }}
              initialSearch={search}
              isTrash={false}
              permissions={{
                view: canView,
                edit: canEdit,
                moveToTrash: canMoveToTrash,
                deletePermanently: canDeletePermanently,
              }}
            />
          </TabsContent>
          <TabsContent value="active" className="mt-4">
            <ChartOfAccountsListClient
              initialAccounts={result.accounts || []}
              initialPagination={result.pagination || {
                page: 1,
                limit: 10,
                total: 0,
                totalPages: 0,
              }}
              initialSearch={search}
              isTrash={false}
              permissions={{
                view: canView,
                edit: canEdit,
                moveToTrash: canMoveToTrash,
                deletePermanently: canDeletePermanently,
              }}
            />
          </TabsContent>
          <TabsContent value="inactive" className="mt-4">
            <ChartOfAccountsListClient
              initialAccounts={result.accounts || []}
              initialPagination={result.pagination || {
                page: 1,
                limit: 10,
                total: 0,
                totalPages: 0,
              }}
              initialSearch={search}
              isTrash={false}
              permissions={{
                view: canView,
                edit: canEdit,
                moveToTrash: canMoveToTrash,
                deletePermanently: canDeletePermanently,
              }}
            />
          </TabsContent>
          <TabsContent value="trash" className="mt-4">
            <ChartOfAccountsListClient
              initialAccounts={result.accounts || []}
              initialPagination={result.pagination || {
                page: 1,
                limit: 10,
                total: 0,
                totalPages: 0,
              }}
              initialSearch={search}
              isTrash={true}
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
    </PageGuard>
  );
}

