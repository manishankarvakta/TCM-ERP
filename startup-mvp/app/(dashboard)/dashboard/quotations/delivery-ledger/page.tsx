import React from "react";
import { getDeliveries } from "@/app/actions/deliveries";
import DeliveryLedgerListClient from "./_components/delivery-ledger-list-client";

interface DeliveryLedgerPageProps {
  searchParams: Promise<{
    page?: string;
    search?: string;
    dateFrom?: string;
    dateTo?: string;
  }>;
}

export default async function DeliveryLedgerPage({ searchParams }: DeliveryLedgerPageProps) {
  const params = await searchParams;
  const page = parseInt(params.page || "1", 10);
  const search = params.search || "";
  const dateFrom = params.dateFrom || "";
  const dateTo = params.dateTo || "";

  // The existing action supports pagination, search (order/client), and date range.
  // We use limit 15 for a better ledger view.
  const result = await getDeliveries(page, 15, search, "all", dateFrom, dateTo);

  if (!result.success) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Delivery Ledger</h1>
          <p className="text-sm text-muted-foreground mt-1">
             Consolidated view of all item deliveries across all orders.
          </p>
        </div>
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
          <p className="text-sm text-destructive">
            {result.error || "Error loading delivery ledger"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight">Delivery Ledger</h1>
        <p className="text-muted-foreground">
           Track fulfillment history, quantities, and dates for every order item.
        </p>
      </div>

      <DeliveryLedgerListClient
        initialDeliveries={(result.deliveries as any) || []}
        initialPagination={result.pagination || {
          page: 1,
          limit: 15,
          total: 0,
          totalPages: 0,
        }}
        initialSearch={search}
        initialDateFrom={dateFrom}
        initialDateTo={dateTo}
      />
    </div>
  );
}
