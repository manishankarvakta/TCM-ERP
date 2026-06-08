import React from "react";
import PageGuard from "@/components/permissions/page-guard";
import { getClientsForSale, getItemsForSale, getWarehousesForSale, getPaymentAccountsForPOS } from "../_actions/sale.action";
import { getCurrentUser } from "@/app/actions/user.action";
import POSComponent from "./_components/POSComponent";

export default async function POSPage() {
  const [clientsResult, itemsResult, warehousesResult, paymentAccountsResult, currentUser] = await Promise.all([
    getClientsForSale(),
    getItemsForSale(),
    getWarehousesForSale(),
    getPaymentAccountsForPOS(),
    getCurrentUser(),
  ]);

  return (
    <PageGuard permissionKey="sales.pos" requiredOperation="create">
      <POSComponent 
        items={itemsResult.items || []}
        clients={clientsResult.clients || []}
        warehouses={warehousesResult.warehouses || []}
        paymentAccounts={paymentAccountsResult.accounts || []}
        currentUser={currentUser}
      />
    </PageGuard>
  );
}
