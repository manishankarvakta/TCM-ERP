import React from "react";
import MarketingFunnelView from "@/components/marketing/marketing-funnel-view";
import { getMarketingFunnelsAction } from "@/app/actions/crm/marketing-operations.action";

export default async function MarketingFunnelPage() {
  const res = await getMarketingFunnelsAction();
  const funnels = res.success && res.funnels ? res.funnels : [];
  return <MarketingFunnelView initialFunnels={funnels} />;
}
