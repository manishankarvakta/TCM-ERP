import React from "react";
import CampaignDetailView from "@/components/marketing/campaign-detail-view";

interface CampaignDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function CampaignDetailPage({ params }: CampaignDetailPageProps) {
  const { id } = await params;
  return <CampaignDetailView campaignId={id} />;
}
