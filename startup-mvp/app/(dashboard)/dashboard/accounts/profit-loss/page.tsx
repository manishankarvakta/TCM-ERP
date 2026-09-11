import { getProfitLoss } from "../reports/_actions/report.action";
import ProfitLossView from "./_components/profit-loss-view";

interface ProfitLossPageProps {
  searchParams: Promise<{
    startDate?: string;
    endDate?: string;
  }>;
}

export default async function ProfitLossPage({ searchParams }: ProfitLossPageProps) {
  const params = await searchParams;
  const startDateParam = params.startDate;
  const endDateParam = params.endDate;

  const startDate = startDateParam
    ? new Date(startDateParam)
    : new Date(new Date().getFullYear(), 0, 1);
  const endDate = endDateParam ? new Date(endDateParam) : new Date();

  const reportData = await getProfitLoss(startDate, endDate);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Profit & Loss</h1>
          <p className="text-sm text-muted-foreground">View profit and loss statement</p>
        </div>
      </div>

      {!reportData.success ? (
        <div className="p-4 text-sm text-red-600 bg-red-50 rounded-md border border-red-200">
          {reportData.error || "Failed to load Profit & Loss"}
        </div>
      ) : (
        <ProfitLossView
          revenue={reportData.revenue}
          expenses={reportData.expenses}
          netIncome={reportData.netIncome}
          startDate={reportData.startDate}
          endDate={reportData.endDate}
          startDateParam={startDateParam}
          endDateParam={endDateParam}
        />
      )}
    </div>
  );
}
