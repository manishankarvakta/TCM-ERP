import React from "react";
import LeaveApplicationForm from "../_components/leave-application-form";
import PageGuard from "@/components/permissions/page-guard";

export default function LeaveApplyPage() {
  return (
    <PageGuard permissionKey="hr.leave" requiredOperation="create">
      <div className="space-y-6">
        <LeaveApplicationForm />
      </div>
    </PageGuard>
  );
}
