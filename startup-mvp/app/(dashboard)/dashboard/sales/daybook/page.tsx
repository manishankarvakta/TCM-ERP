import React from "react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import PageGuard from "@/components/permissions/page-guard";
import DayBookDashboardClient from "./_components/DayBookDashboardClient";
import { getWarehousesForSale } from "../_actions/sale.action";

export default async function DaybookPage() {
  const session = await auth();
  const userId = session?.user?.id;

  let isAdmin = false;
  let userWarehouseId: string | undefined = undefined;

  if (userId) {
    const dbUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, defaultWarehouseId: true }
    });
    if (dbUser) {
      isAdmin = ["admin", "superadmin", "manager"].includes(dbUser.role.toLowerCase());
      userWarehouseId = dbUser.defaultWarehouseId || undefined;
    }
  }

  // Get warehouses for sale dropdown
  const warehousesRes = await getWarehousesForSale();
  let warehouses = warehousesRes.success ? warehousesRes.warehouses || [] : [];

  // Filter warehouses for regular cashiers to only show their default warehouse
  if (!isAdmin && userWarehouseId) {
    warehouses = warehouses.filter((w) => w.id === userWarehouseId);
  }

  return (
    <PageGuard permissionKey="sales.daybook" requiredOperation="view">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <DayBookDashboardClient
          warehouses={warehouses}
          isAdmin={isAdmin}
          defaultWarehouseId={userWarehouseId || (warehouses[0]?.id || "")}
          currentUserId={userId || ""}
        />
      </div>
    </PageGuard>
  );
}
