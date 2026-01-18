import { getCashLedger } from "../_actions/cash-bank-ledger.action";
import CashBankLedgerView from "../_components/cash-bank-ledger-view";
import PageGuard from "@/components/permissions/page-guard";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";

interface CashLedgerPageProps {
  searchParams: Promise<{
    dateFrom?: string;
    dateTo?: string;
  }>;
}

export default async function CashLedgerPage({ searchParams }: CashLedgerPageProps) {
  const params = await searchParams;
  const dateFrom = params.dateFrom;
  const dateTo = params.dateTo;

  const session = await auth();
  const userId = session?.user?.id;

  // Check permissions
  const canView = userId
    ? (await hasPermission(userId, "accounts.ledgers", "read") ||
       await hasPermission(userId, "accounts.ledgers", "view") ||
       await hasPermission(userId, "accounts.cash-bank", "read") ||
       await hasPermission(userId, "accounts.cash-bank", "view"))
    : false;

  // Get ledger data
  const ledgerResult = await getCashLedger({
    dateFrom: dateFrom ? new Date(dateFrom) : undefined,
    dateTo: dateTo ? new Date(dateTo) : undefined,
  });

  return (
    <PageGuard permissionKey="accounts.cash-bank">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Cash Ledger</h1>
            <p className="text-sm text-muted-foreground">
              View all Cash account transactions and voucher history
            </p>
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
          <CashBankLedgerView
            ledger={ledgerResult?.ledger || []}
            summary={ledgerResult?.summary || { totalDebit: 0, totalCredit: 0 }}
            type="cash"
            dateFrom={dateFrom}
            dateTo={dateTo}
          />
        )}
      </div>
    </PageGuard>
  );
}

