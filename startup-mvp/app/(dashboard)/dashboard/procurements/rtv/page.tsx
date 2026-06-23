import React from "react";
import { getReturnsToVendor } from "./_actions/rtv.action";
import Link from "next/link";
import RTVListClient, { RTVHeaderActions } from "./_components/rtv-list-client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getActiveWarehouses } from "@/app/(dashboard)/dashboard/inventory/stock/_actions/stock.action";
import { hasPermission } from "@/lib/permissions";

interface RTVPageProps {
  searchParams: Promise<{
    page?: string;
    search?: string;
    warehouseId?: string;
    startDate?: string;
    endDate?: string;
  }>;
}

export default async function RTVPage({ searchParams }: RTVPageProps) {
  const params = await searchParams;
  const page = parseInt(params.page || "1");
  const search = params.search || "";

  const todayStr = new Date().toISOString().split("T")[0];
  const startDate = params.startDate || todayStr;
  const endDate = params.endDate || todayStr;

  const session = await auth();
  const userId = session?.user?.id;

  const dbUser = userId ? await prisma.user.findUnique({
    where: { id: userId },
    include: { defaultWarehouse: true },
  }) : null;

  const isNormalUser = dbUser?.role !== "admin" && dbUser?.role !== "superadmin";

  const selectedWarehouseId = isNormalUser
    ? (dbUser?.defaultWarehouseId || "")
    : (params.warehouseId || "all");

  const [result, warehousesResult, canView, canCreate] = await Promise.all([
    getReturnsToVendor(page, 10, search, selectedWarehouseId, startDate, endDate),
    getActiveWarehouses(),
    userId ? hasPermission(userId, "procurements.rtv", "view") : false,
    userId ? hasPermission(userId, "procurements.rtv", "create") : false,
  ]);

  const activeWarehouses = !isNormalUser
    ? (warehousesResult.success ? warehousesResult.warehouses : [])
    : dbUser?.defaultWarehouse
    ? [{
        id: dbUser.defaultWarehouse.id,
        name: dbUser.defaultWarehouse.name,
        code: dbUser.defaultWarehouse.code,
      }]
    : [];

  if (!result.success) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold">Returns to Vendor (RTV)</h1>
        <div className="text-destructive">{result.error}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Returns to Vendor (RTV)</h1>
          <p className="text-sm text-muted-foreground">Manage supplier returns</p>
        </div>
        <RTVHeaderActions
          canCreate={canCreate}
          rtvs={result.rtvs || []}
        />
      </div>

      <RTVListClient 
        initialData={result.rtvs || []} 
        pagination={result.pagination || { page: 1, limit: 10, total: 0, totalPages: 0 }} 
        searchStr={search} 
        warehouses={activeWarehouses}
        selectedWarehouseId={selectedWarehouseId}
        startDate={startDate}
        endDate={endDate}
        canChangeWarehouse={!isNormalUser}
      />
    </div>
  );
}
