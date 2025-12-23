import React from "react";
import { getSupplierById } from "../_actions/supplier.action";
import SupplierForm from "../_components/supplierForm";
import { notFound } from "next/navigation";

interface EditSupplierPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function EditSupplierPage({ params }: EditSupplierPageProps) {
  const { id } = await params;
  const result = await getSupplierById(id);

  if (!result.success || !result.supplier) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <SupplierForm mode="edit" initialData={result.supplier} />
    </div>
  );
}

