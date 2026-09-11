import { getBalanceSheet } from "../reports/_actions/report.action";
import BalanceSheetView from "./_components/balance-sheet-view";

interface BalanceSheetPageProps {
  searchParams: Promise<{
    date?: string;
  }>;
}

export default async function BalanceSheetPage({ searchParams }: BalanceSheetPageProps) {
  const params = await searchParams;
  const dateParam = params.date;
  const date = dateParam ? new Date(dateParam) : new Date();

  const reportData = await getBalanceSheet(date);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Balance Sheet</h1>
          <p className="text-sm text-muted-foreground">View balance sheet report</p>
        </div>
      </div>

      {!reportData.success ? (
        <div className="p-4 text-sm text-red-600 bg-red-50 rounded-md border border-red-200">
          {reportData.error || "Failed to load Balance Sheet"}
        </div>
      ) : (
        <BalanceSheetView
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          assets={reportData.assets as any}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          liabilities={reportData.liabilities as any}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          equity={reportData.equity as any}
          validation={reportData.validation}
          date={reportData.date}
          dateParam={dateParam}
        />
      )}
    </div>
  );
}

