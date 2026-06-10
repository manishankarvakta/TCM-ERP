import React from "react";
import PageGuard from "@/components/permissions/page-guard";
import { getActiveWarehouses } from "@/app/(dashboard)/dashboard/inventory/stock/_actions/stock.action";
import { getItemsForPurchase } from "../../purchases/_actions/purchase.action";
import TpnForm from "../_components/tpn-form";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function AddTpnPage() {
  const session = await auth();

  const [itemsResult, warehousesResult, user] = await Promise.all([
    getItemsForPurchase(),
    getActiveWarehouses(),
    session?.user?.id 
      ? prisma.user.findUnique({ 
          where: { id: session.user.id }, 
          select: { role: true, defaultWarehouseId: true } 
        }) 
      : null,
  ]);

  return (
    <PageGuard permissionKey="procurements.tpn" requiredOperation="create">
      <div className="w-full mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold">New Transfer Note</h1>
          <p className="text-muted-foreground">Transfer stock between warehouses</p>
        </div>

        <TpnForm 
          items={itemsResult.success ? itemsResult.items || [] : []}
          warehouses={warehousesResult.success ? warehousesResult.warehouses || [] : []}
          user={user}
        />
      </div>
    </PageGuard>
  );
}
