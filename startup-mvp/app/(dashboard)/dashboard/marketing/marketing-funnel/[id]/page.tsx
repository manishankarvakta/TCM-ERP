import React from "react";
import MarketingFunnelDetailView from "@/components/marketing/marketing-funnel-detail-view";
import { getMarketingFunnelDetailAction } from "@/app/actions/crm/marketing-operations.action";

interface MarketingFunnelDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function MarketingFunnelDetailPage({ params }: MarketingFunnelDetailPageProps) {
  const { id } = await params;
  const res = await getMarketingFunnelDetailAction(id);
  const initialData = res.success && res.funnel ? res.funnel : null;

  return <MarketingFunnelDetailView funnelId={id} initialData={initialData} />;
}

