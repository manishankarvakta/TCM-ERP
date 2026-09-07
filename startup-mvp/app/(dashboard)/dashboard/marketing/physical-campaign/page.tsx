import React from "react";
import PhysicalCampaignView from "@/components/marketing/physical-campaign-view";
import { getChannelCampaignsAction } from "@/app/actions/crm/marketing-operations.action";

export const dynamic = "force-dynamic";

export default async function MarketingPhysicalCampaignPage() {
  const result = await getChannelCampaignsAction("PHYSICAL");
  const initialCampaigns = result.success ? result.campaigns : [];

  return <PhysicalCampaignView initialCampaigns={initialCampaigns} />;
}
