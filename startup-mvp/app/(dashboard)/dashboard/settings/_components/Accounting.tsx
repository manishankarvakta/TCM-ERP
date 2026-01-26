"use client";

import OperationAccountMappingForm from "../accounts/_components/operation-account-mapping-form";

// Accounting defaults and operation account mapping
export default function Accounting() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Accounting Defaults</h1>
        <p className="text-sm text-muted-foreground">
          Configure default accounts for automated accounting entries in business operations
        </p>
      </div>
      
      <OperationAccountMappingForm />
    </div>
  );
}
