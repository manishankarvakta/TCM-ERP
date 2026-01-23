import React from "react";
import ItemForm from "../_components/itemForm";
import PageGuard from "@/components/permissions/page-guard";

export default function AddItemPage() {
  return (
    <PageGuard permissionKey="master.items" requiredOperation="create">
      <div className="space-y-6">
        <ItemForm mode="create" />
      </div>
    </PageGuard>
  );
}
