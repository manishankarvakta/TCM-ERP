import React from "react";
import { notFound } from "next/navigation";
import { getAdjustment } from "../_actions/adjustment.action";
import AdjustmentDetails from "../_components/adjustment-details";

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function AdjustmentDetailPage({ params }: PageProps) {
  const { id } = await params;
  const result = await getAdjustment(id);

  if (!result.success || !result.adjustment) {
    if (result.error === "Adjustment not found") {
      notFound();
    }
    return (
       <div className="p-8 text-center text-red-500">
          Error loading adjustment: {result.error}
       </div>
    );
  }

  return (
    <div className="flex-1 space-y-4">
      <AdjustmentDetails adjustment={result.adjustment} />
    </div>
  );
}
