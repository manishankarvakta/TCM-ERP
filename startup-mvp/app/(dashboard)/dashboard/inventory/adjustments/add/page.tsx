import React from "react";
import PageGuard from "@/components/permissions/page-guard";
import { getActiveItems, getActiveWarehouses } from "@/app/(dashboard)/dashboard/inventory/stock/_actions/stock.action";
import AdjustmentForm from "./_components/adjustment-form";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function AddAdjustmentPage() {
  const [itemsResult, warehousesResult] = await Promise.all([
    getActiveItems(),
    getActiveWarehouses(),
  ]);

  const session = await auth();
  const dbUser = session?.user?.id ? await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true, defaultWarehouseId: true }
  }) : null;
  const userContext = {
    isNormalUser: dbUser?.role !== "admin" && dbUser?.role !== "superadmin",
    defaultWarehouseId: dbUser?.defaultWarehouseId || null,
  };

  return (
    <PageGuard permissionKey="inventory.adjustments" requiredOperation="create">
      <div className="w-full mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold">New Inventory Adjustment</h1>
          <p className="text-muted-foreground">Record stock corrections manually</p>
        </div>

        <AdjustmentForm 
          items={itemsResult.success ? itemsResult.items || [] : []}
          warehouses={warehousesResult.success ? warehousesResult.warehouses || [] : []}
          userContext={userContext}
        />
      </div>
    </PageGuard>
  );
}
