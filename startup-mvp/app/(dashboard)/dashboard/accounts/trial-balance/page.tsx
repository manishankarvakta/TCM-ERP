import { getTrialBalance } from "../reports/_actions/report.action";
import TrialBalanceView from "./_components/trial-balance-view";

interface TrialBalancePageProps {
  searchParams: Promise<{
    date?: string;
  }>;
}

export default async function TrialBalancePage({ searchParams }: TrialBalancePageProps) {
  const params = await searchParams;
  const dateParam = params.date;
  const date = dateParam ? new Date(dateParam) : new Date();

  const reportData = await getTrialBalance(date);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Trial Balance</h1>
          <p className="text-sm text-muted-foreground">View trial balance report</p>
        </div>
      </div>

      {!reportData.success ? (
        <div className="p-4 text-sm text-red-600 bg-red-50 rounded-md border border-red-200">
          {reportData.error || "Failed to load Trial Balance"}
        </div>
      ) : (
        <TrialBalanceView
          accounts={reportData.accounts}
          totals={reportData.totals}
          date={reportData.date}
          dateParam={dateParam}
        />
      )}
    </div>
  );
}
