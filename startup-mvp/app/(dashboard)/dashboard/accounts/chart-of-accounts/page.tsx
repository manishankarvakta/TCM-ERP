import { Suspense } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { getChartOfAccounts } from "./_actions/chart-of-accounts.action";
import ChartOfAccountsListClient from "./_components/chart-of-accounts-list";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import PageGuard from "@/components/permissions/page-guard";

interface PageProps {
  searchParams: Promise<{
    page?: string;
    search?: string;
    status?: string;
  }>;
}

export default async function ChartOfAccountsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const page = Number(params.page) || 1;
  const search = params.search || "";
  
  // Cast status to expected type
  const rawStatus = params.status || "all";
  const validStatuses = ["active", "inactive", "trash", "all"];
  const status = validStatuses.includes(rawStatus) 
    ? (rawStatus as "active" | "inactive" | "trash" | "all") 
    : "all";

  const session = await auth();
  const userId = session?.user?.id;
  
  // Check permissions
  const canCreate = userId ? await hasPermission(userId, "accounts.chart-of-accounts", "create") : false;
  const canView = userId ? (await hasPermission(userId, "accounts.chart-of-accounts", "read") || await hasPermission(userId, "accounts.chart-of-accounts", "view")) : false;
  const canEdit = userId ? await hasPermission(userId, "accounts.chart-of-accounts", "edit") : false;
  const canMoveToTrash = userId ? await hasPermission(userId, "accounts.chart-of-accounts", "delete") : false;
  const canDeletePermanently = userId ? await hasPermission(userId, "accounts.chart-of-accounts", "delete-permanently") : false;

  const { accounts, pagination } = await getChartOfAccounts(page, 10, search, status);

  return (
    <PageGuard permissionKey="accounts.chart-of-accounts">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Chart of Accounts</h1>
            <p className="text-sm text-muted-foreground">Manage and organize your chart of accounts</p>
          </div>
          {canCreate && (
            <Button asChild>
              <Link href="/dashboard/accounts/chart-of-accounts/add">
                <Plus className="mr-2 h-4 w-4" />
                New Account
              </Link>
            </Button>
          )}
        </div>

        <ChartOfAccountsListClient
          initialAccounts={JSON.parse(JSON.stringify(accounts))}
          initialPagination={pagination}
          initialSearch={search}
          isTrash={status === "trash"}
          permissions={{
            view: canView,
            edit: canEdit,
            moveToTrash: canMoveToTrash,
            deletePermanently: canDeletePermanently,
          }}
        />
      </div>
    </PageGuard>
  );
}

