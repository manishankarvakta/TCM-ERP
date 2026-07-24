import React from "react";
import { getClientLedger } from "../_actions/client.action";
import ClientLedger from "../_components/clientLedger";
import PageGuard from "@/components/permissions/page-guard";
import { notFound } from "next/navigation";

interface ClientLedgerPageProps {
  searchParams: Promise<{
    id?: string;
    startDate?: string;
    endDate?: string;
  }>;
}

export default async function ClientLedgerPage({ searchParams }: ClientLedgerPageProps) {
  const params = await searchParams;
  const clientId = params.id;

  if (!clientId) {
    notFound();
  }

  const result = await getClientLedger(clientId, params.startDate, params.endDate);

  if (!result.success || !result.client) {
    return (
      <div className="space-y-6">
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
          <p className="text-sm text-destructive">
            {result.error || "Failed to load client ledger"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <PageGuard permissionKey="peoples.clients" requiredOperation="ledger">
      <ClientLedger
        client={result.client}
        ledger={result.ledger || []}
        summary={result.summary || { totalBilled: 0, totalPaid: 0, closingBalance: 0, totalTransactions: 0 }}
        initialStartDate={params.startDate}
        initialEndDate={params.endDate}
      />
    </PageGuard>
  );
}
