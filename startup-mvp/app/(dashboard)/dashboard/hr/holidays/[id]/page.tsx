import React from "react";
import { getHolidayById } from "../_actions/holiday.action";
import HolidayForm from "../_components/holidayForm";
import { notFound } from "next/navigation";
import PageGuard from "@/components/permissions/page-guard";

interface EditHolidayPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function EditHolidayPage({ params }: EditHolidayPageProps) {
  const { id } = await params;
  
  // Exclude reserved route names
  const reservedRoutes = ["add", "new", "edit"];
  if (reservedRoutes.includes(id.toLowerCase())) {
    notFound();
  }

  const result = await getHolidayById(id);

  if (!result.success || !result.holiday) {
    notFound();
  }

  return (
    <PageGuard permissionKey="hr.holidays" requiredOperation="edit">
      <div className="space-y-6">
        <HolidayForm mode="edit" initialData={result.holiday} />
      </div>
    </PageGuard>
  );
}
