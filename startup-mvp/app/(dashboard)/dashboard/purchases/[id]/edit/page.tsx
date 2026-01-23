import React from "react";
import { getPurchaseById, getItemsForPurchase, getSuppliersForPurchase } from "../../_actions/purchase.action";
import PurchaseForm from "../../_components/purchaseForm";
import { notFound } from "next/navigation";

interface EditPurchasePageProps {
  params: Promise<{ id: string }>;
}

export default async function EditPurchasePage({ params }: EditPurchasePageProps) {
  const { id } = await params;

  const [purchaseResult, suppliersResult, itemsResult] = await Promise.all([
    getPurchaseById(id),
    getSuppliersForPurchase(),
    getItemsForPurchase(),
  ]);

  if (!purchaseResult.success || !purchaseResult.purchase) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <PurchaseForm
        mode="edit"
        suppliers={suppliersResult.suppliers || []}
        items={itemsResult.items || []}
        initialData={purchaseResult.purchase}
      />
    </div>
  );
}
