import React from "react";
import HolidayForm from "../_components/holidayForm";
import PageGuard from "@/components/permissions/page-guard";

export default function AddHolidayPage() {
  return (
    <PageGuard permissionKey="hr.holidays" requiredOperation="create">
      <div className="space-y-6">
        <HolidayForm mode="create" />
      </div>
    </PageGuard>
  );
}
