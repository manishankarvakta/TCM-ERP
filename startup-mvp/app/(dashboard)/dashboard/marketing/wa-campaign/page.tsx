import React from "react";
import WaCampaignView from "@/components/marketing/wa-campaign-view";
import { getChannelCampaignsAction } from "@/app/actions/crm/marketing-operations.action";

export const dynamic = "force-dynamic";

export default async function MarketingWaCampaignPage() {
  const result = await getChannelCampaignsAction("WA");
  const initialCampaigns = result.success ? result.campaigns : [];

  return <WaCampaignView initialCampaigns={initialCampaigns} />;
}
