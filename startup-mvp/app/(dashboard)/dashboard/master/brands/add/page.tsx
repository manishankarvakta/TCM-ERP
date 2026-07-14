import React from "react";
import BrandForm from "../_components/brandForm";
import PageGuard from "@/components/permissions/page-guard";

export default function AddBrandPage() {
  return (
    <PageGuard permissionKey="master.brands" requiredOperation="create">
      <div className="space-y-6">
        <BrandForm mode="create" />
      </div>
    </PageGuard>
  );
}
