import React from "react";
import { getBOMById, getActiveFinishedGoods, getActiveRawMaterials } from "../../_actions/bom.action";
import BOMForm from "../../_components/bomForm";
import PageGuard from "@/components/permissions/page-guard";
import { redirect } from "next/navigation";

interface EditBOMPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditBOMPage({ params }: EditBOMPageProps) {
  const { id } = await params;

  const [bomResult, fgResult, rmResult] = await Promise.all([
    getBOMById(id),
    getActiveFinishedGoods(),
    getActiveRawMaterials(),
  ]);

  if (!bomResult.success || !bomResult.bom) {
    redirect("/dashboard/production/boms");
  }

  return (
    <PageGuard permissionKey="production.boms" requiredOperation="edit">
      <BOMForm
        mode="edit"
        initialData={{
          id: bomResult.bom.id,
          code: bomResult.bom.code,
          name: bomResult.bom.name,
          description: bomResult.bom.description,
          itemId: bomResult.bom.itemId,
          quantityPerUnit: bomResult.bom.quantityPerUnit,
          status: bomResult.bom.status,
          items: bomResult.bom.items.map((item) => ({
            id: item.id,
            itemId: item.itemId,
            quantityRequired: item.quantityRequired,
          })),
        }}
        finishedGoods={fgResult.success ? fgResult.items || [] : []}
        rawMaterials={rmResult.success ? rmResult.items || [] : []}
      />
    </PageGuard>
  );
}
