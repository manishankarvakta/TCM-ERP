import { Metadata } from "next";
import OperationAccountMappingForm from "./_components/operation-account-mapping-form";

export const metadata: Metadata = {
  title: "Operation Account Mapping | Settings",
  description: "Configure account mappings for business operations",
};

export default function OperationAccountMappingPage() {
  return (
    <div className="container max-w-4xl py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Operation Account Mapping</h1>
        <p className="text-muted-foreground mt-2">
          Configure which accounts are used for automated accounting entries in each business operation.
        </p>
      </div>

      <OperationAccountMappingForm />
    </div>
  );
}
