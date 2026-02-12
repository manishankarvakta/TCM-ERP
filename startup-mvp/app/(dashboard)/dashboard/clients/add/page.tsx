import React from "react";
import ClientForm from "../_components/clientForm";

export default function AddClientPage() {
  return (
    <div className="space-y-6">
      <ClientForm mode="create" />
    </div>
  );
}

