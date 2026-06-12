import React from "react";
import { getPurchaseById, getItemsForPurchase, getSuppliersForPurchase, getWarehousesForPurchase } from "../../_actions/purchase.action";
import PurchaseForm from "../../_components/purchaseForm";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

interface EditPurchasePageProps {
  params: Promise<{ id: string }>;
}

export default async function EditPurchasePage({ params }: EditPurchasePageProps) {
  const { id } = await params;

  const session = await auth();
  const dbUser = session?.user?.id ? await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true, defaultWarehouseId: true }
  }) : null;

  const isNormalUser = dbUser?.role !== "admin" && dbUser?.role !== "superadmin";

  const [purchaseResult, suppliersResult, itemsResult, warehousesResult] = await Promise.all([
    getPurchaseById(id),
    getSuppliersForPurchase(),
    getItemsForPurchase(),
    getWarehousesForPurchase(),
  ]);

  if (!purchaseResult.success || !purchaseResult.purchase) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <PurchaseForm
        mode="edit"
        suppliers={suppliersResult.suppliers || []}
        warehouses={warehousesResult.warehouses || []}
        items={itemsResult.items || []}
        initialData={purchaseResult.purchase}
        userContext={{
          isNormalUser,
          defaultWarehouseId: dbUser?.defaultWarehouseId || null,
        }}
      />
    </div>
  );
}
