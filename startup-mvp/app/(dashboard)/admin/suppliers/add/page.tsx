import React from "react";
import SupplierForm from "../_components/supplierForm";

export default function AddSupplierPage() {
  return (
    <div className="space-y-6">
      <SupplierForm mode="create" />
    </div>
  );
}

