import React from "react";
import PurchaseForm from "../_components/purchaseForm";
import { getItemsForPurchase, getSuppliersForPurchase, getWarehousesForPurchase } from "../_actions/purchase.action";

export default async function AddPurchasePage() {
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
      />
    </div>
  );
}


