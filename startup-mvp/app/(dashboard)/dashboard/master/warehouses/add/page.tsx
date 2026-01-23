import React from "react";
import WarehouseForm from "../_components/warehouseForm";
import PageGuard from "@/components/permissions/page-guard";

export default function AddWarehousePage() {
  return (
    <PageGuard permissionKey="master.warehouses" requiredOperation="create">
      <WarehouseForm mode="create" />
    </PageGuard>
  );
}
