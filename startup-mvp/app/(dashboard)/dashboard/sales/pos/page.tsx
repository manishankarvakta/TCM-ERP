import React from "react";
import PageGuard from "@/components/permissions/page-guard";
import { getClientsForSale, getItemsForSale, getWarehousesForSale, getPaymentAccountsForPOS, getActiveSalesmenForPOS } from "../_actions/sale.action";
import { getCurrentUser } from "@/app/actions/user.action";
import { hasPermission } from "@/lib/permissions";
import { getPOSSettingsAction } from "@/app/(dashboard)/dashboard/settings/_actions/pos-settings.action";
import POSComponent from "./_components/POSComponent";

export default async function POSPage() {
  const [clientsResult, itemsResult, warehousesResult, paymentAccountsResult, currentUser, posSettingsResult, activeSalesmenResult] = await Promise.all([
    getClientsForSale(),
    getItemsForSale(),
    getWarehousesForSale(),
    getPaymentAccountsForPOS(),
    getCurrentUser(),
    getPOSSettingsAction(),
    getActiveSalesmenForPOS(),
  ]);

  const isWholesaleAllowed = currentUser ? await hasPermission(currentUser.id, "sales.pos", "wholesale") : false;

  return (
    <PageGuard permissionKey="sales.pos" requiredOperation="create">
      <POSComponent 
        items={itemsResult.items || []}
        clients={clientsResult.clients || []}
        warehouses={warehousesResult.warehouses || []}
        paymentAccounts={paymentAccountsResult.accounts || []}
        currentUser={currentUser}
        isWholesaleAllowed={isWholesaleAllowed}
        posSettings={posSettingsResult.settings}
        activeSalesmen={activeSalesmenResult.employees || []}
      />
    </PageGuard>
  );
}
