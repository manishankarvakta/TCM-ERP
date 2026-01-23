import React from "react";
import { getActiveBOMs, getActiveWarehouses } from "../_actions/production.action";
import ProductionForm from "../_components/productionForm";
import PageGuard from "@/components/permissions/page-guard";

export default async function AddProductionOrderPage() {
  const [bomsResult, warehousesResult] = await Promise.all([
    getActiveBOMs(),
    getActiveWarehouses(),
  ]);

  return (
    <PageGuard permissionKey="production.orders" requiredOperation="create">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Create Production Order</h1>
          <p className="text-sm text-muted-foreground">
            Create a new production order to manufacture finished goods
          </p>
        </div>

        <ProductionForm
          mode="create"
          boms={bomsResult.success ? bomsResult.boms : []}
          warehouses={warehousesResult.success ? warehousesResult.warehouses : []}
        />
      </div>
    </PageGuard>
  );
}
