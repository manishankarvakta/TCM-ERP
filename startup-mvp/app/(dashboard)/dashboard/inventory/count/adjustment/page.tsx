import React from "react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import PageGuard from "@/components/permissions/page-guard";
import { getActiveWarehouses } from "@/app/(dashboard)/dashboard/inventory/stock/_actions/stock.action";
import { hasPermission } from "@/lib/permissions";
import AdjustmentClient from "./_components/adjustment-client";

export default async function CountAdjustmentPage() {
  const session = await auth();
  const userId = session?.user?.id;

  let isNormalUser = false;
  let defaultWarehouseId = null;
  let isAdminOrSuperAdmin = false;

  if (userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, defaultWarehouseId: true }
    });

    if (user) {
      if (user.role !== "admin" && user.role !== "superadmin") {
        isNormalUser = true;
        defaultWarehouseId = user.defaultWarehouseId;
      } else {
        isAdminOrSuperAdmin = true;
      }
    }
  }

  const [warehousesResult, hasScannerPerm, hasEntriesPerm, hasAdjustmentPerm, hasApprovePermission] = await Promise.all([
    getActiveWarehouses(),
    userId ? hasPermission(userId, "inventory.count.scanner", "view_scanner") : Promise.resolve(false),
    userId ? hasPermission(userId, "inventory.count.entries", "view_entries") : Promise.resolve(false),
    userId ? hasPermission(userId, "inventory.count.adjustment", "view_adjustment") : Promise.resolve(false),
    userId ? hasPermission(userId, "inventory.count.adjustment", "approve") : Promise.resolve(false)
  ]);

  const canViewScanner = hasScannerPerm || isAdminOrSuperAdmin;
  const canViewEntries = hasEntriesPerm || isAdminOrSuperAdmin;
  const canViewAdjustment = hasAdjustmentPerm || isAdminOrSuperAdmin;
  const canApprove = hasApprovePermission || isAdminOrSuperAdmin;

  const activeWarehouses = warehousesResult.success ? warehousesResult.warehouses || [] : [];

  return (
    <PageGuard permissionKey="inventory.count.adjustment" requiredOperation="view_adjustment">
      <div className="space-y-6">
        <AdjustmentClient
          warehouses={activeWarehouses}
          defaultWarehouseId={defaultWarehouseId}
          isNormalUser={isNormalUser}
          canApprove={canApprove}
          allowedPages={{
            scanner: canViewScanner,
            entries: canViewEntries,
            adjustment: canViewAdjustment
          }}
        />
      </div>
    </PageGuard>
  );
}
