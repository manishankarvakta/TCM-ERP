import React from "react";
import { getProfitLoss } from "../reports/_actions/report.action";
import ProfitLossView from "./_components/profit-loss-view";
import PageGuard from "@/components/permissions/page-guard";

interface ProfitLossPageProps {
  searchParams: Promise<{
    startDate?: string;
    endDate?: string;
  }>;
}

export default async function ProfitLossPage({ searchParams }: ProfitLossPageProps) {
  const params = await searchParams;
  const startDate = params.startDate ? new Date(params.startDate) : new Date(new Date().getFullYear(), 0, 1);
  const endDate = params.endDate ? new Date(params.endDate) : new Date();

  const result = await getProfitLoss(startDate, endDate);

  return (
    <PageGuard permissionKey="accounts.profit-loss">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Profit & Loss</h1>
            <p className="text-sm text-muted-foreground">View profit and loss statement</p>
          </div>
        </div>

        {!result.success ? (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
            <p className="text-sm text-destructive">
              {result.error || "Failed to load profit & loss"}
            </p>
          </div>
        ) : (
          <ProfitLossView
            revenue={result.revenue}
            expenses={result.expenses}
            netIncome={result.netIncome}
            startDate={result.startDate}
            endDate={result.endDate}
            startDateParam={params.startDate}
            endDateParam={params.endDate}
          />
        )}
      </div>
    </PageGuard>
  );
}

