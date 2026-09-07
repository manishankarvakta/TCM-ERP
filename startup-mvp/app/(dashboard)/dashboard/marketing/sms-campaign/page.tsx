import React from "react";
import SmsCampaignView from "@/components/marketing/sms-campaign-view";
import { getChannelCampaignsAction } from "@/app/actions/crm/marketing-operations.action";

export const dynamic = "force-dynamic";

export default async function MarketingSmsCampaignPage() {
  const result = await getChannelCampaignsAction("SMS");
  const initialCampaigns = result.success ? result.campaigns : [];

  return <SmsCampaignView initialCampaigns={initialCampaigns} />;
}
