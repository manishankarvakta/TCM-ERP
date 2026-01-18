import React from "react";
import { getBalanceSheet } from "../reports/_actions/report.action";
import BalanceSheetView from "./_components/balance-sheet-view";
import PageGuard from "@/components/permissions/page-guard";

interface BalanceSheetPageProps {
  searchParams: Promise<{
    date?: string;
  }>;
}

export default async function BalanceSheetPage({ searchParams }: BalanceSheetPageProps) {
  const params = await searchParams;
  const date = params.date ? new Date(params.date) : new Date();

  const result = await getBalanceSheet(date);

  return (
    <PageGuard permissionKey="accounts.balance-sheet">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Balance Sheet</h1>
            <p className="text-sm text-muted-foreground">View balance sheet report</p>
          </div>
        </div>

        {!result.success ? (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
            <p className="text-sm text-destructive">
              {result.error || "Failed to load balance sheet"}
            </p>
          </div>
        ) : (
          <BalanceSheetView
            assets={result.assets}
            liabilities={result.liabilities}
            equity={result.equity}
            validation={result.validation}
            date={result.date}
            dateParam={params.date}
          />
        )}
      </div>
    </PageGuard>
  );
}

