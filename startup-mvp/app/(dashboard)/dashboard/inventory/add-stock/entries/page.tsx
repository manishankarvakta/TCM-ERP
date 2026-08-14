import React from "react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import PageGuard from "@/components/permissions/page-guard";
import { getActiveWarehouses } from "@/app/(dashboard)/dashboard/inventory/stock/_actions/stock.action";
import { hasPermission } from "@/lib/permissions";
import AddStockEntriesClient from "./_components/add-stock-entries-client";

export default async function AddStockEntriesPage() {
  const session = await auth();
  const userId = session?.user?.id;

  let isNormalUser = false;
  let defaultWarehouseId = null;
  let isAdmin = false;

  if (userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, defaultWarehouseId: true }
    });

    if (user) {
      defaultWarehouseId = user.defaultWarehouseId;
      if (user.role !== "admin" && user.role !== "superadmin") {
        isNormalUser = true;
      } else {
        isAdmin = true;
      }
    }
  }

  const [warehousesResult, users, hasScannerPerm, hasEntriesPerm, hasDeletePermission] = await Promise.all([
    getActiveWarehouses(),
    prisma.user.findMany({
      select: { id: true, name: true, email: true },
      where: { status: "active" },
      orderBy: { name: "asc" }
    }),
    userId ? hasPermission(userId, "inventory.add_stock.scanner", "view_scanner") : Promise.resolve(false),
    userId ? hasPermission(userId, "inventory.add_stock.entries", "view_entries") : Promise.resolve(false),
    userId ? hasPermission(userId, "inventory.add_stock.entries", "delete") : Promise.resolve(false)
  ]);

  const canViewScanner = hasScannerPerm || isAdmin;
  const canViewEntries = hasEntriesPerm || isAdmin;
  const canDelete = hasDeletePermission || isAdmin;
  const activeWarehouses = warehousesResult.success ? warehousesResult.warehouses || [] : [];

  return (
    <PageGuard permissionKey="inventory.add_stock.entries" requiredOperation="view_entries">
      <div className="space-y-6">
        <AddStockEntriesClient
          warehouses={activeWarehouses}
          users={users}
          defaultWarehouseId={defaultWarehouseId}
          isNormalUser={isNormalUser}
          canDelete={canDelete}
          allowedPages={{
            scanner: canViewScanner,
            entries: canViewEntries
          }}
        />
      </div>
    </PageGuard>
  );
}
