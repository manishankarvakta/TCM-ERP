import React from "react";
import PageGuard from "@/components/permissions/page-guard";

export default function AdminContactsPage() {
  return (
    <PageGuard permissionKey="peoples.contacts" requiredOperation="view">
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <h1 className="text-3xl font-bold text-primary">Admin: Contacts Management</h1>
        <p className="text-muted-foreground text-lg">
          Organization-wide contact administration and permissions.
        </p>
        <div className="p-8 border-2 border-dashed rounded-lg bg-primary/5">
          <p className="text-sm font-medium">Coming Soon</p>
        </div>
      </div>
    </PageGuard>
  );
}
