import React from "react";
import { getStockMovements } from "../../_actions/inventory-reports.action";
import StockMovementsView from "./_components/stock-movements-view";
import PageGuard from "@/components/permissions/page-guard";
import { prisma } from "@/lib/prisma";

interface StockMovementsPageProps {
  searchParams: Promise<{
    page?: string;
    warehouseId?: string;
    search?: string;
    date?: string;
    startDate?: string;
    endDate?: string;
    itemType?: string;
    limit?: string;
  }>;
}

export default async function StockMovementsPage({
  searchParams,
}: StockMovementsPageProps) {
  const params = await searchParams;
  const page = parseInt(params.page || "1");
  const limit = parseInt(params.limit || "20");
  const today = new Date().toISOString().split("T")[0];
  
  const startDate = params.startDate || params.date || today;
  const endDate = params.endDate || params.date || today;
  const itemType = params.itemType || "all";

  const filters = {
    warehouseId: params.warehouseId || undefined,
    search: params.search || undefined,
    startDate,
    endDate,
    itemType,
    limit,
  };

  const result = await getStockMovements(filters, { page, limit });

  // Load warehouses for selection filter
  const warehouses = await prisma.warehouse.findMany({
    where: { status: "active", isTrash: false },
    select: { id: true, name: true, code: true },
    orderBy: { name: "asc" },
  });

  return (
    <PageGuard permissionKey="inventory.stock-movements">
      <div className="space-y-6">
        {!result.success ? (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-semibold">Stock Movements Report</h1>
              <p className="text-sm text-muted-foreground">
                Opening balances, inflows, outflows, and closing balances as of a specific date
              </p>
            </div>
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
              <p className="text-sm text-destructive">
                {result.error || "Failed to load stock movements report"}
              </p>
            </div>
          </div>
        ) : (
          <StockMovementsView
            data={result.data || []}
            pagination={result.pagination || { page: 1, limit: 20, total: 0, totalPages: 0 }}
            warehouses={warehouses}
            filters={filters}
            summaryTotals={(result as any).summaryTotals}
          />
        )}
      </div>
    </PageGuard>
  );
}
