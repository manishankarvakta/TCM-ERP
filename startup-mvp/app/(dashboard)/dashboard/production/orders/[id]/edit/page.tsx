import React from "react";
import { getProductionOrderById, getActiveBOMs, getActiveWarehouses } from "../../_actions/production.action";
import ProductionForm from "../../_components/productionForm";
import PageGuard from "@/components/permissions/page-guard";
import { redirect } from "next/navigation";

interface EditProductionOrderPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditProductionOrderPage({ params }: EditProductionOrderPageProps) {
  const { id } = await params;

  const [orderResult, bomsResult, warehousesResult] = await Promise.all([
    getProductionOrderById(id),
    getActiveBOMs(),
    getActiveWarehouses(),
  ]);

  if (!orderResult.success || !orderResult.order) {
    redirect("/dashboard/production/orders");
  }

  const order = orderResult.order;

  // Can only edit if status is PLANNED
  if (order.status !== "PLANNED") {
    redirect(`/dashboard/production/orders/${id}`);
  }

  return (
    <PageGuard permissionKey="production.orders" requiredOperation="edit">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Edit Production Order</h1>
          <p className="text-sm text-muted-foreground">
            Edit production order {order.code}
          </p>
        </div>

        <ProductionForm
          mode="edit"
          initialData={{
            id: order.id,
            code: order.code,
            bomId: order.bomId,
            warehouseId: order.warehouseId,
            quantity: order.quantity,
            notes: order.notes,
          }}
          boms={bomsResult.success ? bomsResult.boms : []}
          warehouses={warehousesResult.success ? warehousesResult.warehouses : []}
        />
      </div>
    </PageGuard>
  );
}
