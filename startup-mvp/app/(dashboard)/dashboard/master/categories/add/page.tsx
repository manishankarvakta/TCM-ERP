import React from "react";
import CategoryForm from "../_components/categoryForm";
import PageGuard from "@/components/permissions/page-guard";

export default function AddCategoryPage() {
  return (
    <PageGuard permissionKey="master.categories" requiredOperation="create">
      <div className="space-y-6">
        <CategoryForm mode="create" />
      </div>
    </PageGuard>
  );
}
