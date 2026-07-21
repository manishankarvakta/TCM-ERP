import React from "react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import PageGuard from "@/components/permissions/page-guard";
import { getActiveWarehouses } from "@/app/(dashboard)/dashboard/inventory/stock/_actions/stock.action";
import { hasPermission } from "@/lib/permissions";
import EntriesClient from "./_components/entries-client";

export default async function CountEntriesPage() {
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

  let isAdmin = false;
  if (userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true }
    });
    if (user && (user.role === "admin" || user.role === "superadmin")) {
      isAdmin = true;
    }
  }

  // Fetch active warehouses, active users, and permissions check
  const [warehousesResult, users, hasScannerPerm, hasEntriesPerm, hasAdjustmentPerm, hasDeletePermission] = await Promise.all([
    getActiveWarehouses(),
    prisma.user.findMany({
      select: { id: true, name: true, email: true },
      where: { status: "active" },
      orderBy: { name: "asc" }
    }),
    userId ? hasPermission(userId, "inventory.count.scanner", "view_scanner") : Promise.resolve(false),
    userId ? hasPermission(userId, "inventory.count.entries", "view_entries") : Promise.resolve(false),
    userId ? hasPermission(userId, "inventory.count.adjustment", "view_adjustment") : Promise.resolve(false),
    userId ? hasPermission(userId, "inventory.count.entries", "delete") : Promise.resolve(false)
  ]);

  const canViewScanner = hasScannerPerm || isAdmin;
  const canViewEntries = hasEntriesPerm || isAdmin;
  const canViewAdjustment = hasAdjustmentPerm || isAdmin;
  const canDelete = hasDeletePermission || isAdmin;
  const activeWarehouses = warehousesResult.success ? warehousesResult.warehouses || [] : [];

  return (
    <PageGuard permissionKey="inventory.count.entries" requiredOperation="view_entries">
      <div className="space-y-6">
        <EntriesClient
          warehouses={activeWarehouses}
          users={users}
          defaultWarehouseId={defaultWarehouseId}
          isNormalUser={isNormalUser}
          canDelete={canDelete}
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
