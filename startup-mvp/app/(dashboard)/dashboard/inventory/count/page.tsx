import React from "react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import PageGuard from "@/components/permissions/page-guard";
import { getActiveWarehouses } from "@/app/(dashboard)/dashboard/inventory/stock/_actions/stock.action";
import { hasPermission } from "@/lib/permissions";
import { redirect } from "next/navigation";
import ScannerClient from "./_components/scanner-client";

export default async function CountScannerPage() {
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

  const [hasScannerPerm, hasEntriesPerm, hasAdjustmentPerm, hasCreatePermission] = await Promise.all([
    hasPermission(userId, "inventory.count.scanner", "view_scanner"),
    hasPermission(userId, "inventory.count.entries", "view_entries"),
    hasPermission(userId, "inventory.count.adjustment", "view_adjustment"),
    hasPermission(userId, "inventory.count.scanner", "create")
  ]);

  const canViewScanner = hasScannerPerm || isAdmin;
  const canViewEntries = hasEntriesPerm || isAdmin;
  const canViewAdjustment = hasAdjustmentPerm || isAdmin;
  const canCreate = hasCreatePermission || isAdmin;

  // Auto redirect router if scanner view is disabled
  if (!canViewScanner) {
    if (canViewEntries) {
      redirect("/dashboard/inventory/count/entries");
    }
    if (canViewAdjustment) {
      redirect("/dashboard/inventory/count/adjustment");
    }
  }

  let isNormalUser = false;
  let defaultWarehouseId = null;

  if (user && user.role !== "admin" && user.role !== "superadmin") {
    isNormalUser = true;
    defaultWarehouseId = user.defaultWarehouseId;
  }

  const warehousesResult = await getActiveWarehouses();
  const activeWarehouses = warehousesResult.success ? warehousesResult.warehouses || [] : [];

  return (
    <PageGuard permissionKey="inventory.count.scanner" requiredOperation="view_scanner">
      <div className="space-y-6">
        <ScannerClient
          warehouses={activeWarehouses}
          defaultWarehouseId={defaultWarehouseId}
          isNormalUser={isNormalUser}
          canCreate={canCreate}
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
