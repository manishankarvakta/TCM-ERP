import React from "react";
import PageGuard from "@/components/permissions/page-guard";

export default async function POSPage() {
  return (
    <PageGuard permissionKey="sales.sales" requiredOperation="view">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Point of Sale (POS)</h1>
          <p className="text-sm text-muted-foreground">Quick sale interface for walk-in customers</p>
        </div>
        <div className="rounded-lg border border-dashed p-12 text-center">
          <p className="text-muted-foreground">POS interface coming soon...</p>
        </div>
      </div>
    </PageGuard>
  );
}
