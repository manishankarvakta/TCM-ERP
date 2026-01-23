import React from "react";
import { getItemById } from "../../_actions/item.action";
import ItemForm from "../../_components/itemForm";
import PageGuard from "@/components/permissions/page-guard";
import { redirect } from "next/navigation";

interface EditItemPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function EditItemPage({ params }: EditItemPageProps) {
  const { id } = await params;
  const result = await getItemById(id);

  if (!result.success || !result.item) {
    redirect("/dashboard/master/items");
  }

  const item = result.item;

  return (
    <PageGuard permissionKey="master.items" requiredOperation="edit">
      <div className="space-y-6">
        <ItemForm
          mode="edit"
          initialData={{
            id: item.id,
            code: item.code,
            name: item.name,
            description: item.description,
            itemType: item.itemType,
            categoryId: item.categoryId,
            unitId: item.unitId,
            costPrice: Number(item.costPrice),
            salesPrice: item.salesPrice ? Number(item.salesPrice) : null,
            trackInventory: item.trackInventory,
            image: item.image,
            status: item.status as "active" | "inactive",
          }}
        />
      </div>
    </PageGuard>
  );
}
