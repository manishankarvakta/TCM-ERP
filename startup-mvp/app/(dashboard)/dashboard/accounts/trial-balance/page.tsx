import React from "react";
import { getTrialBalance } from "../reports/_actions/report.action";
import TrialBalanceView from "./_components/trial-balance-view";
import PageGuard from "@/components/permissions/page-guard";

interface TrialBalancePageProps {
  searchParams: Promise<{
    date?: string;
  }>;
}

export default async function TrialBalancePage({ searchParams }: TrialBalancePageProps) {
  const params = await searchParams;
  const date = params.date ? new Date(params.date) : new Date();

  const result = await getTrialBalance(date);

  return (
    <PageGuard permissionKey="accounts.trial-balance">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Trial Balance</h1>
            <p className="text-sm text-muted-foreground">View trial balance report</p>
          </div>
        </div>

        {!result.success ? (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
            <p className="text-sm text-destructive">
              {result.error || "Failed to load trial balance"}
            </p>
          </div>
        ) : (
          <TrialBalanceView
            accounts={result.accounts}
            totals={result.totals}
            date={result.date}
            dateParam={params.date}
          />
        )}
      </div>
    </PageGuard>
  );
}

