import React from "react";
import PurchaseForm from "../_components/purchaseForm";
import { getItemsForPurchase, getSuppliersForPurchase, getWarehousesForPurchase } from "../_actions/purchase.action";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function AddPurchasePage() {
  const session = await auth();
  const dbUser = session?.user?.id ? await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true, defaultWarehouseId: true }
  }) : null;

  const isNormalUser = dbUser?.role !== "admin" && dbUser?.role !== "superadmin";

  const [suppliersResult, itemsResult, warehousesResult] = await Promise.all([
    getSuppliersForPurchase(),
    getItemsForPurchase(),
    getWarehousesForPurchase(),
  ]);

  return (
    <div className="space-y-6">
      <PurchaseForm
        mode="create"
        suppliers={suppliersResult.suppliers || []}
        warehouses={warehousesResult.warehouses || []}
        items={itemsResult.items || []}
        userContext={{
          isNormalUser,
          defaultWarehouseId: dbUser?.defaultWarehouseId || null,
        }}
      />
    </div>
  );
}


