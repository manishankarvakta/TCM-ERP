import React from "react";
import { getProductionOrders, getActiveWarehouses } from "./_actions/production.action";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { FiPlus } from "react-icons/fi";
import ProductionsListClient from "./_components/productions";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import PageGuard from "@/components/permissions/page-guard";
import type { ProductionOrderStatus } from "@prisma/client";

interface ProductionOrdersPageProps {
  searchParams: Promise<{
    page?: string;
    search?: string;
    status?: string;
    warehouseId?: string;
  }>;
}

export default async function ProductionOrdersPage({
  searchParams,
}: ProductionOrdersPageProps) {
  const params = await searchParams;
  const page = parseInt(params.page || "1");
  const search = params.search || "";
  const status = (params.status as ProductionOrderStatus | "all") || "all";
  const warehouseId = params.warehouseId || undefined;

  const session = await auth();
  const userId = session?.user?.id;

  const [result, warehousesResult, canView, canCreate, canEdit, canStart, canComplete, canCancel] =
    await Promise.all([
      getProductionOrders(page, 10, {
        search,
        status,
        warehouseId,
      }),
      getActiveWarehouses(),
      userId ? hasPermission(userId, "production.orders", "view") : false,
      userId ? hasPermission(userId, "production.orders", "create") : false,
      userId ? hasPermission(userId, "production.orders", "edit") : false,
      userId ? hasPermission(userId, "production.orders", "start") : false,
      userId ? hasPermission(userId, "production.orders", "complete") : false,
      userId ? hasPermission(userId, "production.orders", "cancel") : false,
    ]);

  if (!result.success) {
    return (
      <PageGuard permissionKey="production.orders" requiredOperation="view">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold">Production Orders</h1>
              <p className="text-sm text-muted-foreground">
                Manage production orders and track manufacturing
              </p>
            </div>
          </div>
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
            <p className="text-sm text-destructive">
              {result.error || "Failed to load production orders"}
            </p>
          </div>
        </div>
      </PageGuard>
    );
  }

  return (
    <PageGuard permissionKey="production.orders" requiredOperation="view">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Production Orders</h1>
            <p className="text-sm text-muted-foreground">
              Manage production orders and track manufacturing
            </p>
          </div>
          {canCreate && (
            <Button asChild>
              <Link href="/dashboard/production/orders/add">
                <FiPlus className="mr-2 h-4 w-4" />
                Create Production Order
              </Link>
            </Button>
          )}
        </div>

        <ProductionsListClient
          initialOrders={result.orders}
          initialPagination={result.pagination}
          initialSearch={search}
          initialStatus={status}
          initialWarehouseId={warehouseId}
          warehouses={warehousesResult.success ? warehousesResult.warehouses : []}
          canEdit={canEdit}
          canStart={canStart}
          canComplete={canComplete}
          canCancel={canCancel}
        />
      </div>
    </PageGuard>
  );
}
