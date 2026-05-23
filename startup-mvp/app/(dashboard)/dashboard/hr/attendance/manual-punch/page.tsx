import React from "react";
import ManualPunchForm from "../_components/manual-punch-form";
import PageGuard from "@/components/permissions/page-guard";

export default function ManualPunchPage() {
  return (
    <PageGuard permissionKey="hr.attendance" requiredOperation="edit">
      <div className="space-y-6">
        <ManualPunchForm />
      </div>
    </PageGuard>
  );
}
