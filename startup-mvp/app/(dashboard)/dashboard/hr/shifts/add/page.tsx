import React from "react";
import ShiftForm from "../_components/shiftForm";
import PageGuard from "@/components/permissions/page-guard";

export default function AddShiftPage() {
  return (
    <PageGuard permissionKey="hr.shifts" requiredOperation="create">
      <div className="space-y-6">
        <ShiftForm mode="create" />
      </div>
    </PageGuard>
  );
}
