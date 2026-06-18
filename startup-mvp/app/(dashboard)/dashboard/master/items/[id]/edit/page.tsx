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

  console.log(item);

  return (
    <PageGuard permissionKey="master.items" requiredOperation="edit">
      <div className="space-y-6">
        <ItemForm
          mode="edit"
          initialData={item as any}
        />
      </div>
    </PageGuard>
  );
}
