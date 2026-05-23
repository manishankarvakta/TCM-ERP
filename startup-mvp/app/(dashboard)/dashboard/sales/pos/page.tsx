import React from "react";
import PageGuard from "@/components/permissions/page-guard";
import { getClientsForSale, getItemsForSale, getWarehousesForSale } from "../_actions/sale.action";
import POSComponent from "./_components/POSComponent";

export default async function POSPage() {
  const [clientsResult, itemsResult, warehousesResult] = await Promise.all([
    getClientsForSale(),
    getItemsForSale(),
    getWarehousesForSale(),
  ]);

  return (
    <PageGuard permissionKey="sales.sales" requiredOperation="create">
      <POSComponent 
        items={itemsResult.items || []}
        clients={clientsResult.clients || []}
        warehouses={warehousesResult.warehouses || []}
      />
    </PageGuard>
  );
}
