import React from "react";
import SaleForm from "../_components/saleForm";
import { getClientsForSale, getItemsForSale, getWarehousesForSale } from "../_actions/sale.action";
import PageGuard from "@/components/permissions/page-guard";

export default async function AddSalePage() {
  const [clientsResult, itemsResult, warehousesResult] = await Promise.all([
    getClientsForSale(),
    getItemsForSale(),
    getWarehousesForSale(),
  ]);

  return (
    <PageGuard permissionKey="sales.sales" requiredOperation="create">
      <div className="space-y-6">
        <SaleForm
          mode="create"
          clients={clientsResult.clients || []}
          items={itemsResult.items || []}
          warehouses={warehousesResult.warehouses || []}
        />
      </div>
    </PageGuard>
  );
}
