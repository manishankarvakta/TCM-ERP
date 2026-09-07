import React from "react";
import CampaignsView from "@/components/marketing/campaigns-view";
import { getMarketingCampaignsListAction } from "@/app/actions/crm/marketing-operations.action";

export default async function MarketingCampaignsPage() {
  const res = await getMarketingCampaignsListAction();
  const campaigns = res.success && res.campaigns ? res.campaigns : [];
  return <CampaignsView initialCampaigns={campaigns} />;
}

