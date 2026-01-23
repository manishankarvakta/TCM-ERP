import React from "react";
import { getActiveFinishedGoods, getActiveRawMaterials } from "../_actions/bom.action";
import BOMForm from "../_components/bomForm";
import PageGuard from "@/components/permissions/page-guard";

export default async function AddBOMPage() {
  const [fgResult, rmResult] = await Promise.all([
    getActiveFinishedGoods(),
    getActiveRawMaterials(),
  ]);

  return (
    <PageGuard permissionKey="production.boms" requiredOperation="create">
      <BOMForm
        mode="create"
        finishedGoods={fgResult.success ? fgResult.items || [] : []}
        rawMaterials={rmResult.success ? rmResult.items || [] : []}
      />
    </PageGuard>
  );
}
