import React from "react";
import { getAccountsReceivable } from "../reports/_actions/ar-ap.action";
import ARView from "./_components/ar-view";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import PageGuard from "@/components/permissions/page-guard";
import { serializeData } from "@/lib/utils/serialization";

interface AccountsReceivablePageProps {
  searchParams: Promise<{
    date?: string;
    aging?: string;
  }>;
}

export default async function AccountsReceivablePage({ searchParams }: AccountsReceivablePageProps) {
  const params = await searchParams;
  const dateParam = params.date || "";
  const includeAging = params.aging === "true";

  const session = await auth();
  const userId = session?.user?.id;

  const canView = userId
    ? (await hasPermission(userId, "accounts.accounts-receivable", "read") ||
       await hasPermission(userId, "accounts.accounts-receivable", "view") ||
       await hasPermission(userId, "accounts.vouchers", "view"))
    : false;

  if (!canView) {
    return <div className="p-8 text-center text-destructive">Access Denied</div>;
  }

  const asOfDate = dateParam ? new Date(dateParam) : new Date();
  const result = await getAccountsReceivable(asOfDate, includeAging);

  if (!result.success) {
    return (
      <div className="space-y-6 p-6">
        <h1 className="text-2xl font-semibold">Accounts Receivable</h1>
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
          <p className="text-sm text-destructive">
            {result.error || "Error loading accounts receivable"}
          </p>
        </div>
      </div>
    );
  }

  const serializedClients = serializeData(result.clients || []);

  return (
    <PageGuard permissionKey="accounts.accounts-receivable">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Accounts Receivable (AR)</h1>
          <p className="text-sm text-muted-foreground">
            Track client outstanding balances, customer transaction ledgers, and aging schedules
          </p>
        </div>

        <ARView
          initialClients={serializedClients}
          initialTotal={result.total || 0}
          asOfDate={result.asOfDate || asOfDate}
          dateParam={dateParam}
          initialIncludeAging={includeAging}
        />
      </div>
    </PageGuard>
  );
}
