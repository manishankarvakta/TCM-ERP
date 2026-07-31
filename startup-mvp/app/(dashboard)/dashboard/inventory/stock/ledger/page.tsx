import React from "react";
import { getStockLedger, getActiveItems, getActiveWarehouses } from "../_actions/stock.action";
import { prisma } from "@/lib/prisma";
import StockLedgerClient from "../_components/stockLedger";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import PageGuard from "@/components/permissions/page-guard";
import { StockTransactionType } from "@prisma/client";

interface StockLedgerPageProps {
  searchParams: Promise<{
    page?: string;
    search?: string;
    itemId?: string;
    warehouseId?: string;
    transactionType?: string;
    dateFrom?: string;
    dateTo?: string;
    limit?: string;
  }>;
}

export default async function StockLedgerPage({ searchParams }: StockLedgerPageProps) {
  const params = await searchParams;
  const page = parseInt(params.page || "1");
  const limit = parseInt(params.limit || "20");
  const search = params.search || "";
  const itemId = params.itemId;
  const warehouseId = params.warehouseId;
  const transactionType = params.transactionType as StockTransactionType | undefined;
  const dateFrom = params.dateFrom ? new Date(params.dateFrom) : undefined;
  const dateTo = params.dateTo ? new Date(params.dateTo) : undefined;

  const session = await auth();
  const userId = session?.user?.id;

  let isNormalUser = false;
  let defaultWarehouseId = null;

  if (userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, defaultWarehouseId: true }
    });
    
    if (user && user.role !== "admin" && user.role !== "superadmin") {
      isNormalUser = true;
      defaultWarehouseId = user.defaultWarehouseId;
    }
  }

  let finalWarehouseId = warehouseId;
  if (isNormalUser && defaultWarehouseId) {
    finalWarehouseId = defaultWarehouseId;
  }

  // Check permissions and fetch data
  const [result, itemsResult, warehousesResult, canView] = await Promise.all([
    getStockLedger(page, limit, {
      itemId,
      warehouseId: finalWarehouseId,
      transactionType,
      dateFrom,
      dateTo,
      search,
    }),
    getActiveItems(),
    getActiveWarehouses(),
    userId ? hasPermission(userId, "inventory.stock", "view") : false,
  ]);

  // Handle errors
  if (!result.success) {
    return (
      <PageGuard permissionKey="inventory.stock" requiredOperation="view">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold">Stock Ledger</h1>
              <p className="text-sm text-muted-foreground">View stock transaction history</p>
            </div>
          </div>
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
            <p className="text-sm text-destructive">
              {result.error || "Failed to load stock ledger"}
            </p>
          </div>
        </div>
      </PageGuard>
    );
  }

  return (
    <PageGuard permissionKey="inventory.stock" requiredOperation="view">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Stock Ledger</h1>
            <p className="text-sm text-muted-foreground">View stock transaction history</p>
          </div>
        </div>

        <StockLedgerClient
          initialEntries={(result.entries as any) || []}
          initialPagination={result.pagination || {
            page: 1,
            limit: 20,
            total: 0,
            totalPages: 0,
          }}
          initialSearch={search}
          initialItemId={itemId}
          initialWarehouseId={finalWarehouseId}
          initialTransactionType={transactionType || "all"}
          initialDateFrom={params.dateFrom}
          initialDateTo={params.dateTo}
          items={itemsResult.success ? itemsResult.items || [] : []}
          warehouses={warehousesResult.success ? warehousesResult.warehouses || [] : []}
          isNormalUser={isNormalUser}
        />
      </div>
    </PageGuard>
  );
}
