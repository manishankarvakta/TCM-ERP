import React from "react";
import { getSuppliersForPurchase, getItemsForPurchase, getPurchaseById } from "../../purchases/_actions/purchase.action";
import { getActiveWarehouses } from "../../../inventory/stock/_actions/stock.action";
import RTVForm from "../_components/rtv-form";

export default async function NewRTVPage({ searchParams }: { searchParams: Promise<{ purchaseId?: string }> }) {
  const params = await searchParams;
  const purchaseId = params.purchaseId;

  // Fetch necessary data
  const [suppliersRes, warehousesRes, itemsRes, purchaseRes] = await Promise.all([
    getSuppliersForPurchase(),
    getActiveWarehouses(),
    getItemsForPurchase(),
    purchaseId ? getPurchaseById(purchaseId) : Promise.resolve({ success: true, purchase: null })
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">New Return to Vendor (RTV)</h1>
        <p className="text-sm text-muted-foreground">
          {purchaseId ? `Returning items for Purchase #${purchaseRes.purchase?.purchaseNumber}` : "Create a new standalone return"}
        </p>
      </div>

      <RTVForm 
        suppliers={suppliersRes.suppliers || []}
        warehouses={warehousesRes.warehouses || []}
        items={itemsRes.items || []}
        purchase={purchaseRes.purchase || undefined}
      />
    </div>
  );
}
