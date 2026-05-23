import React from "react";
import { getShiftById } from "../_actions/shift.action";
import ShiftForm from "../_components/shiftForm";
import { notFound } from "next/navigation";
import PageGuard from "@/components/permissions/page-guard";

interface EditShiftPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function EditShiftPage({ params }: EditShiftPageProps) {
  const { id } = await params;
  
  // Exclude reserved route names
  const reservedRoutes = ["add", "new", "edit"];
  if (reservedRoutes.includes(id.toLowerCase())) {
    notFound();
  }

  const result = await getShiftById(id);

  if (!result.success || !result.shift) {
    notFound();
  }

  return (
    <PageGuard permissionKey="hr.shifts" requiredOperation="edit">
      <div className="space-y-6">
        <ShiftForm mode="edit" initialData={result.shift} />
      </div>
    </PageGuard>
  );
}
