import React from "react";
import { getStocks, getItemsWithStockMovements, getActiveWarehouses } from "./_actions/stock.action";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { FiPlus } from "react-icons/fi";
import StocksListClient from "./_components/stocks";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import PageGuard from "@/components/permissions/page-guard";

interface StockPageProps {
  searchParams: Promise<{
    page?: string;
    search?: string;
    itemId?: string;
    warehouseId?: string;
  }>;
}

export default async function StockPage({ searchParams }: StockPageProps) {
  const params = await searchParams;
  const page = parseInt(params.page || "1");
  const search = params.search || "";
  const itemId = params.itemId;
  const warehouseId = params.warehouseId;

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

  // Override warehouseId for normal user
  let finalWarehouseId = warehouseId;
  if (isNormalUser && defaultWarehouseId) {
    finalWarehouseId = defaultWarehouseId;
  }

  // Check permissions and fetch data
  const [result, itemsResult, warehousesResult, canView, canAdjust] = await Promise.all([
    getStocks(page, 10, {
      itemId,
      warehouseId: finalWarehouseId,
      search,
    }),
    getItemsWithStockMovements(finalWarehouseId),
    getActiveWarehouses(),
    userId ? hasPermission(userId, "inventory.stock", "view") : false,
    userId ? hasPermission(userId, "inventory.stock", "adjust") : false,
  ]);

  // Handle errors
  if (!result.success) {
    return (
      <PageGuard permissionKey="inventory.stock" requiredOperation="view">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold">Stock</h1>
              <p className="text-sm text-muted-foreground">View and manage inventory stock</p>
            </div>
          </div>
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
            <p className="text-sm text-destructive">
              {result.error || "Failed to load stock"}
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
            <h1 className="text-2xl font-semibold">Stock</h1>
            <p className="text-sm text-muted-foreground">View and manage inventory stock</p>
          </div>
          {canAdjust && (
            <Button asChild>
              <Link href="/dashboard/inventory/stock/adjust">
                <FiPlus className="mr-2 h-4 w-4" />
                Adjust Stock
              </Link>
            </Button>
          )}
        </div>

        <StocksListClient
          initialStocks={result.stocks || []}
          initialPagination={result.pagination || {
            page: 1,
            limit: 10,
            total: 0,
            totalPages: 0,
          }}
          initialSearch={search}
          initialItemId={itemId}
          initialWarehouseId={finalWarehouseId}
          items={itemsResult.success ? itemsResult.items || [] : []}
          warehouses={warehousesResult.success ? warehousesResult.warehouses || [] : []}
          isNormalUser={isNormalUser}
        />
      </div>
    </PageGuard>
  );
}
