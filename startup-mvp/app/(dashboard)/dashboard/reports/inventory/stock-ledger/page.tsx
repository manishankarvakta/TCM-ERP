import React from "react";
import { getStockLedger } from "../../_actions/inventory-reports.action";
import StockLedgerView from "./_components/stock-ledger-view";
import PageGuard from "@/components/permissions/page-guard";
import { prisma } from "@/lib/prisma";
import { StockTransactionType } from "@prisma/client";

interface StockLedgerPageProps {
  searchParams: Promise<{
    page?: string;
    itemId?: string;
    warehouseId?: string;
    transactionType?: string;
    dateFrom?: string;
    dateTo?: string;
    referenceType?: string;
    referenceId?: string;
  }>;
}

export default async function StockLedgerPage({
  searchParams,
}: StockLedgerPageProps) {
  const params = await searchParams;
  const page = parseInt(params.page || "1");

  const filters = {
    itemId: params.itemId || undefined,
    warehouseId: params.warehouseId || undefined,
    transactionType:
      params.transactionType && params.transactionType !== "all"
        ? (params.transactionType as StockTransactionType)
        : "all",
    dateFrom: params.dateFrom || undefined,
    dateTo: params.dateTo || undefined,
    referenceType: params.referenceType || undefined,
    referenceId: params.referenceId || undefined,
  };

  const result = await getStockLedger(filters as any, { page, limit: 50 });

  // Get filter options
  const [warehouses, items] = await Promise.all([
    prisma.warehouse.findMany({
      where: { status: "active", isTrash: false },
      select: { id: true, name: true, code: true },
      orderBy: { name: "asc" },
    }),
    prisma.item.findMany({
      where: { trackInventory: true, isTrash: false },
      select: { id: true, code: true, name: true },
      orderBy: { code: "asc" },
    }),
  ]);

  const transactionTypeOptions = [
    { value: "IN", label: "IN" },
    { value: "OUT", label: "OUT" },
    { value: "ADJUSTMENT", label: "Adjustment" },
    { value: "PRODUCTION", label: "Production" },
  ];

  const referenceTypeOptions = [
    { value: "PURCHASE", label: "Purchase" },
    { value: "PRODUCTION", label: "Production" },
    { value: "SALE", label: "Sale" },
    { value: "ADJUSTMENT", label: "Adjustment" },
  ];

  return (
    <PageGuard permissionKey="reports.view">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Stock Ledger Report</h1>
          <p className="text-sm text-muted-foreground">
            Detailed stock movement transactions
          </p>
        </div>

        {!result.success ? (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
            <p className="text-sm text-destructive">
              {result.error || "Failed to load stock ledger"}
            </p>
          </div>
        ) : (
          <StockLedgerView
            data={result.data}
            pagination={result.pagination}
            warehouses={warehouses}
            items={items}
            transactionTypeOptions={transactionTypeOptions}
            referenceTypeOptions={referenceTypeOptions}
            filters={filters as any}
          />
        )}
      </div>
    </PageGuard>
  );
}
