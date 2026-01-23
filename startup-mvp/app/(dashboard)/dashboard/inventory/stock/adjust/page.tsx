import React from "react";
import StockAdjustForm from "../_components/stockAdjustForm";
import PageGuard from "@/components/permissions/page-guard";

export default function AdjustStockPage() {
  return (
    <PageGuard permissionKey="inventory.stock" requiredOperation="adjust">
      <StockAdjustForm />
    </PageGuard>
  );
}
