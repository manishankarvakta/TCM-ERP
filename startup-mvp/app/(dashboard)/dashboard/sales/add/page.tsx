import React from "react";
import SaleForm from "../_components/saleForm";
import { getClientsForSale, getItemsForSale, getWarehousesForSale } from "../_actions/sale.action";

export default async function AddSalePage() {
  const [clientsResult, itemsResult, warehousesResult] = await Promise.all([
    getClientsForSale(),
    getItemsForSale(),
    getWarehousesForSale(),
  ]);

  return (
    <div className="space-y-6">
      <SaleForm
        mode="create"
        clients={clientsResult.clients || []}
        items={itemsResult.items || []}
        warehouses={warehousesResult.warehouses || []}
      />
    </div>
  );
}
