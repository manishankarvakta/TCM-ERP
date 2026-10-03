import React from "react";
import { getReturnToVendorById } from "../../_actions/rtv.action";
import { getSuppliersForPurchase, getItemsForPurchase, getPurchaseById } from "../../../purchases/_actions/purchase.action";
import { getActiveWarehouses } from "../../../../inventory/stock/_actions/stock.action";
import RTVForm from "../../_components/rtv-form";
import { notFound, redirect } from "next/navigation";
import PageGuard from "@/components/permissions/page-guard";

interface EditRTVPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditRTVPage({ params }: EditRTVPageProps) {
  const { id } = await params;

  const [rtvRes, suppliersRes, warehousesRes, itemsRes] = await Promise.all([
    getReturnToVendorById(id),
    getSuppliersForPurchase(),
    getActiveWarehouses(),
    getItemsForPurchase(),
  ]);

  if (!rtvRes.success || !rtvRes.rtv) {
    notFound();
  }

  const rtv = rtvRes.rtv;

  // Only DRAFT RTVs can be edited
  if (rtv.status !== "DRAFT") {
    redirect(`/dashboard/procurements/rtv/${id}/view`);
  }

  const purchaseRes = rtv.purchaseId
    ? await getPurchaseById(rtv.purchaseId)
    : { success: true, purchase: null };

  return (
    <PageGuard permissionKey="procurements.rtv" requiredOperation="edit">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Edit Return to Vendor ({rtv.rtvNumber})</h1>
          <p className="text-sm text-muted-foreground">
            Modify items, quantities, or details for this draft return
          </p>
        </div>

        <RTVForm
          mode="edit"
          initialData={rtv}
          suppliers={suppliersRes.suppliers || []}
          warehouses={warehousesRes.warehouses || []}
          items={itemsRes.items || []}
          purchase={purchaseRes.purchase || undefined}
        />
      </div>
    </PageGuard>
  );
}
