import React from "react";
import { getAccountsPayable } from "../reports/_actions/ar-ap.action";
import APView from "./_components/ap-view";
import PageGuard from "@/components/permissions/page-guard";

interface AccountsPayablePageProps {
  searchParams: Promise<{
    date?: string;
    aging?: string;
  }>;
}

export default async function AccountsPayablePage({ searchParams }: AccountsPayablePageProps) {
  const params = await searchParams;
  const date = params.date ? new Date(params.date) : new Date();
  const includeAging = params.aging === "true";

  const result = await getAccountsPayable(date, includeAging);

  return (
    <PageGuard permissionKey="accounts.accounts-payable">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Accounts Payable</h1>
            <p className="text-sm text-muted-foreground">View and manage accounts payable</p>
          </div>
        </div>

        {!result.success ? (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
            <p className="text-sm text-destructive">
              {result.error || "Failed to load accounts payable"}
            </p>
          </div>
        ) : (
          <APView
            initialSuppliers={result.suppliers}
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

