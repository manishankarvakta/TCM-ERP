import React from "react";
// import { getWarehouseById } from "../_actions/warehouse.action";
import WarehouseForm from "../../_components/warehouseForm";
import PageGuard from "@/components/permissions/page-guard";
import { redirect } from "next/navigation";
import { getWarehouseById } from "../../_actions/warehouse.action";

interface EditWarehousePageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function EditWarehousePage({ params }: EditWarehousePageProps) {
  const { id } = await params;
  const result = await getWarehouseById(id);

  if (!result.success || !result.warehouse) {
    redirect("/dashboard/master/warehouses");
  }

  return (
    <PageGuard permissionKey="master.warehouses" requiredOperation="edit">
      <WarehouseForm mode="edit" initialData={result.warehouse} />
    </PageGuard>
  );
}
