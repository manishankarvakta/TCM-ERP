import React from "react";
import MarketingFunnelDetailView from "@/components/marketing/marketing-funnel-detail-view";

interface MarketingFunnelDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function MarketingFunnelDetailPage({ params }: MarketingFunnelDetailPageProps) {
  const { id } = await params;
  return <MarketingFunnelDetailView funnelId={id} />;
}
