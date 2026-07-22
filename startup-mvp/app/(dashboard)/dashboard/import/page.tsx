import React from "react";
import PageGuard from "@/components/permissions/page-guard";
import ImportWizard from "./_components/import-wizard";

export default function ImportPage() {
  return (
    <PageGuard permissionKey="master.import">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Central Data Import System</h1>
          <p className="text-sm text-muted-foreground">
            Dynamically import master data records, clients, suppliers, products, and employee records from CSV files.
          </p>
        </div>

        <ImportWizard />
      </div>
    </PageGuard>
  );
}
