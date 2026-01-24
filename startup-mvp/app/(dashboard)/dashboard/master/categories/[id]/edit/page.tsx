import React from "react";
import { getCategoryById } from "../../_actions/category.action";
import CategoryForm from "../../_components/categoryForm";
import PageGuard from "@/components/permissions/page-guard";
import { notFound } from "next/navigation";

interface EditCategoryPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function EditCategoryPage({ params }: EditCategoryPageProps) {
  const { id } = await params;
  const result = await getCategoryById(id);

  if (!result.success || !result.category) {
    notFound();
  }

  return (
    <PageGuard permissionKey="master.categories" requiredOperation="edit">
      <div className="space-y-6">
        <CategoryForm mode="edit" initialData={result.category} />
      </div>
    </PageGuard>
  );
}
