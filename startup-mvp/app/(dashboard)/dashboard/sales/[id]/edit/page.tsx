import React from "react";
import { getSaleById, getClientsForSale, getItemsForSale, getWarehousesForSale } from "../../_actions/sale.action";
import SaleForm from "../../_components/saleForm";
import { notFound } from "next/navigation";
import PageGuard from "@/components/permissions/page-guard";

interface EditSalePageProps {
  params: Promise<{ id: string }>;
}

export default async function EditSalePage({ params }: EditSalePageProps) {
  const { id } = await params;

  const [saleResult, clientsResult, itemsResult, warehousesResult] = await Promise.all([
    getSaleById(id),
    getClientsForSale(),
    getItemsForSale(),
    getWarehousesForSale(),
  ]);

  if (!saleResult.success || !saleResult.sale) {
    notFound();
  }

  // Only allow editing DRAFT sales
  if (saleResult.sale.status !== "DRAFT") {
    notFound();
  }

  return (
    <PageGuard permissionKey="sales.sales" requiredOperation="edit">
      <div className="space-y-6">
        <SaleForm
          mode="edit"
          clients={clientsResult.clients || []}
          items={itemsResult.items || []}
          warehouses={warehousesResult.warehouses || []}
          initialData={saleResult.sale}
        />
      </div>
    </PageGuard>
  );
}
