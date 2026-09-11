import React from "react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import PageGuard from "@/components/permissions/page-guard";
import { getAccountLedger } from "./_actions/ledger.action";
import LedgerView from "./_components/ledger-view";
import { serializeData } from "@/lib/utils/serialization";

interface LedgerPageProps {
  searchParams: Promise<{
    accountId?: string;
    dateFrom?: string;
    dateTo?: string;
  }>;
}

export default async function AccountLedgerPage({ searchParams }: LedgerPageProps) {
  const params = await searchParams;
  const session = await auth();
  const userId = session?.user?.id;

  const canView = userId
    ? (await hasPermission(userId, "accounts.ledgers", "read") ||
       await hasPermission(userId, "accounts.ledgers", "view") ||
       await hasPermission(userId, "accounts.vouchers", "view"))
    : false;

  if (!canView) {
    return <div className="p-8 text-center text-destructive">Access Denied</div>;
  }

  // Get active Chart of Accounts for selector
  const accounts = await prisma.chartOfAccount.findMany({
    where: { status: "active" },
    select: {
      id: true,
      code: true,
      name: true,
      type: true,
    },
    orderBy: { code: "asc" },
  });

  const selectedAccountId = params.accountId || accounts[0]?.id || "";

  let ledgerData: any[] = [];
  let summaryData = { totalDebit: 0, totalCredit: 0, balance: 0 };

  if (selectedAccountId) {
    const result = await getAccountLedger(selectedAccountId, {
      dateFrom: params.dateFrom,
      dateTo: params.dateTo,
    });

    if (result.success) {
      ledgerData = result.ledger || [];
      summaryData = result.summary || summaryData;
    }
  }

  return (
    <PageGuard permissionKey="accounts.ledgers">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">General Account Ledger</h1>
          <p className="text-sm text-muted-foreground">
            Audit individual account debit/credit histories, posted vouchers, and running balances
          </p>
        </div>

        <LedgerView
          ledger={serializeData(ledgerData)}
          summary={summaryData}
          accounts={serializeData(accounts)}
          selectedAccountId={selectedAccountId}
          dateFrom={params.dateFrom || ""}
          dateTo={params.dateTo || ""}
        />
      </div>
    </PageGuard>
  );
}
