import React from "react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import PageGuard from "@/components/permissions/page-guard";
import { getActiveWarehouses } from "@/app/(dashboard)/dashboard/inventory/stock/_actions/stock.action";
import { hasPermission } from "@/lib/permissions";
import { redirect } from "next/navigation";
import AddStockScannerClient from "./_components/add-stock-scanner-client";

export default async function AddStockScannerPage() {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    redirect("/login");
  }

  let isAdmin = false;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true, defaultWarehouseId: true }
  });

  if (user && (user.role === "admin" || user.role === "superadmin")) {
    isAdmin = true;
  }

  const [hasScannerPerm, hasEntriesPerm, hasCreatePerm, hasFinishPerm] = await Promise.all([
    hasPermission(userId, "inventory.add_stock.scanner", "view_scanner"),
    hasPermission(userId, "inventory.add_stock.entries", "view_entries"),
    hasPermission(userId, "inventory.add_stock.scanner", "create"),
    hasPermission(userId, "inventory.add_stock.scanner", "finish")
  ]);

  const canViewScanner = hasScannerPerm || isAdmin;
  const canViewEntries = hasEntriesPerm || isAdmin;
  const canCreate = hasCreatePerm || isAdmin;
  const canFinish = hasFinishPerm || isAdmin;

  // Auto redirect router if scanner view is disabled
  if (!canViewScanner && canViewEntries) {
    redirect("/dashboard/inventory/add-stock/entries");
  }

  let isNormalUser = false;
  const defaultWarehouseId = user?.defaultWarehouseId || null;

  if (user && user.role !== "admin" && user.role !== "superadmin") {
    isNormalUser = true;
  }

  const warehousesResult = await getActiveWarehouses();
  const activeWarehouses = warehousesResult.success ? warehousesResult.warehouses || [] : [];

  return (
    <PageGuard permissionKey="inventory.add_stock.scanner" requiredOperation="view_scanner">
      <div className="space-y-6">
        <AddStockScannerClient
          warehouses={activeWarehouses}
          defaultWarehouseId={defaultWarehouseId}
          isNormalUser={isNormalUser}
          canCreate={canCreate}
          canFinish={canFinish}
          allowedPages={{
            scanner: canViewScanner,
            entries: canViewEntries
          }}
        />
      </div>
    </PageGuard>
  );
}
