import React from "react";
import { getBrandById } from "../../_actions/brand.action";
import BrandForm from "../../_components/brandForm";
import PageGuard from "@/components/permissions/page-guard";
import { notFound } from "next/navigation";

interface EditBrandPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function EditBrandPage({ params }: EditBrandPageProps) {
  const { id } = await params;
  const result = await getBrandById(id);

  if (!result.success || !result.brand) {
    notFound();
  }

  return (
    <PageGuard permissionKey="master.brands" requiredOperation="edit">
      <div className="space-y-6">
        <BrandForm mode="edit" initialData={result.brand} />
      </div>
    </PageGuard>
  );
}
