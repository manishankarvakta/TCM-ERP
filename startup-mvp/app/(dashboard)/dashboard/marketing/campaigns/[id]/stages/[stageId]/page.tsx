import React from "react";
import StageDetailView from "@/components/marketing/stage-detail-view";

interface StageDetailPageProps {
  params: Promise<{ id: string; stageId: string }>;
}

export default async function StageDetailPage({ params }: StageDetailPageProps) {
  const { id, stageId } = await params;
  return <StageDetailView campaignId={id} stageId={stageId} />;
}
