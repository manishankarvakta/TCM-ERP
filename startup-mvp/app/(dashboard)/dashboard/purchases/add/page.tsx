import React from "react";
import PurchaseForm from "../_components/purchaseForm";
import { getItemsForPurchase, getSuppliersForPurchase } from "../_actions/purchase.action";

export const dynamic = "force-dynamic";

export default async function AddPurchasePage() {
  const [suppliersResult, itemsResult] = await Promise.all([
    getSuppliersForPurchase(),
    getItemsForPurchase(),
  ]);

  return (
    <div className="space-y-6">
      <PurchaseForm
        mode="create"
        suppliers={suppliersResult.suppliers || []}
        items={itemsResult.items || []}
      />
    </div>
  );
}


