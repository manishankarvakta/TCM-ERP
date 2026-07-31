import React from "react";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import PageGuard from "@/components/permissions/page-guard";
import { getAdjustments } from "./_actions/adjustment.action";
import AdjustmentList, { AdjustmentsHeaderActions } from "./_components/adjustment-list";
import { getActiveWarehouses } from "@/app/(dashboard)/dashboard/inventory/stock/_actions/stock.action";
import { prisma } from "@/lib/prisma";

interface PageProps {
  searchParams: Promise<{
    page?: string;
    search?: string;
    warehouseId?: string;
    startDate?: string;
    endDate?: string;
    limit?: string;
  }>;
}

export default async function AdjustmentPage({ searchParams }: PageProps) {
  const session = await auth();
  const userId = session?.user?.id || "";
  const params = await searchParams;
  const page = Number(params.page) || 1;
  const limit = Number(params.limit) || 20;

  const todayStr = new Date().toISOString().split("T")[0];
  const startDate = params.startDate || todayStr;
  const endDate = params.endDate || todayStr;
  
  const canCreate = await hasPermission(userId, "inventory.adjustments", "create");

  const dbUser = userId ? await prisma.user.findUnique({
    where: { id: userId },
    include: { defaultWarehouse: true },
  }) : null;

  const isNormalUser = dbUser?.role !== "admin" && dbUser?.role !== "superadmin";

  const selectedWarehouseId = isNormalUser
    ? (dbUser?.defaultWarehouseId || "")
    : (params.warehouseId || "all");

  const warehousesResult = await getActiveWarehouses();

  const { adjustments, pagination, success, error } = await getAdjustments(page, limit, {
    search: params.search,
    warehouseId: selectedWarehouseId,
    startDate,
    endDate,
  });

  const activeWarehouses = !isNormalUser
    ? (warehousesResult.success ? warehousesResult.warehouses : [])
    : dbUser?.defaultWarehouse
    ? [{
        id: dbUser.defaultWarehouse.id,
        name: dbUser.defaultWarehouse.name,
        code: dbUser.defaultWarehouse.code,
      }]
    : [];

  if (!success) {
    return (
       <div className="p-4 text-red-500">Error: {error}</div>
    );
  }

  return (
    <PageGuard permissionKey="inventory.adjustments" requiredOperation="view">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Inventory Adjustments</h1>
            <p className="text-sm text-muted-foreground">Manage stock adjustments and corrections</p>
          </div>
          <AdjustmentsHeaderActions
            canCreate={canCreate}
            adjustments={adjustments || []}
          />
        </div>

        <AdjustmentList 
          adjustments={adjustments || []} 
          pagination={pagination || { page: 1, totalPages: 1, total: 0, limit: 20 }}
          warehouses={activeWarehouses}
          selectedWarehouseId={selectedWarehouseId}
          startDate={startDate}
          endDate={endDate}
          canChangeWarehouse={!isNormalUser}
        />
      </div>
    </PageGuard>
  );
}
