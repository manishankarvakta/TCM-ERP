import React from "react";
import { getAccountsReceivable } from "../reports/_actions/ar-ap.action";
import ARView from "./_components/ar-view";
import PageGuard from "@/components/permissions/page-guard";

interface AccountsReceivablePageProps {
  searchParams: Promise<{
    date?: string;
    aging?: string;
  }>;
}

export default async function AccountsReceivablePage({ searchParams }: AccountsReceivablePageProps) {
  const params = await searchParams;
  const date = params.date ? new Date(params.date) : new Date();
  const includeAging = params.aging === "true";

  const result = await getAccountsReceivable(date, includeAging);

  return (
    <PageGuard permissionKey="accounts.accounts-receivable">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Accounts Receivable</h1>
            <p className="text-sm text-muted-foreground">View and manage accounts receivable</p>
          </div>
        </div>

        {!result.success ? (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
            <p className="text-sm text-destructive">
              {result.error || "Failed to load accounts receivable"}
            </p>
          </div>
        ) : (
          <ARView
            initialClients={result.clients}
            initialTotal={result.total}
            asOfDate={result.asOfDate}
            dateParam={params.date}
            initialIncludeAging={includeAging}
          />
        )}
      </div>
    </PageGuard>
  );
}

