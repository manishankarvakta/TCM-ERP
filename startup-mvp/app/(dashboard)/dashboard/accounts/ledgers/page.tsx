import React from "react";
import { getAccountLedger } from "./_actions/ledger.action";
import { getChartOfAccounts } from "../chart-of-accounts/_actions/chart-of-accounts.action";
import LedgerView from "./_components/ledger-view";
import PageGuard from "@/components/permissions/page-guard";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";

interface LedgersPageProps {
  searchParams: Promise<{
    accountId?: string;
    dateFrom?: string;
    dateTo?: string;
  }>;
}

export default async function AccountLedgerPage({ searchParams }: LedgersPageProps) {
  const params = await searchParams;
  const accountId = params.accountId || "";
  
  // Default date will be current date (today)
  const today = new Date().toISOString().split("T")[0];
  const dateFrom = params.dateFrom || today;
  const dateTo = params.dateTo || today;

  const session = await auth();
  const userId = session?.user?.id;

  // Check permissions
  const canView = userId ? (await hasPermission(userId, "accounts.ledgers", "read") || await hasPermission(userId, "accounts.ledgers", "view")) : false;

  // Get accounts for selector
  const accountsResult = await getChartOfAccounts(1, 1000, "", "active");
  const accounts = accountsResult.success ? accountsResult.accounts : [];

  // Get ledger data if account is selected
  let ledgerResult = null;
  if (accountId) {
    ledgerResult = await getAccountLedger(accountId, {
      dateFrom: dateFrom ? new Date(dateFrom) : undefined,
      dateTo: dateTo ? new Date(dateTo) : undefined,
    });
  }

  return (
    <PageGuard permissionKey="accounts.ledgers">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Account Ledger</h1>
            <p className="text-sm text-muted-foreground">View individual account ledgers and transaction history</p>
          </div>
        </div>

        {!canView ? (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
            <p className="text-sm text-destructive">
              You do not have permission to view ledgers
            </p>
          </div>
        ) : ledgerResult && !ledgerResult.success ? (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
            <p className="text-sm text-destructive">
              {ledgerResult.error || "Failed to load ledger"}
            </p>
          </div>
        ) : (
          <LedgerView
            ledger={ledgerResult?.ledger || []}
            summary={ledgerResult?.summary || { totalDebit: 0, totalCredit: 0, balance: 0 }}
            accounts={accounts.map((a) => ({ id: a.id, code: a.code, name: a.name }))}
            selectedAccountId={accountId}
            dateFrom={dateFrom}
            dateTo={dateTo}
          />
        )}
      </div>
    </PageGuard>
  );
}

