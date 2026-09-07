import React from "react";
import PaidAdsView from "@/components/marketing/paid-ads-view";
import { getChannelCampaignsAction } from "@/app/actions/crm/marketing-operations.action";

export const dynamic = "force-dynamic";

export default async function MarketingPaidAdsPage() {
  const result = await getChannelCampaignsAction("PAID_ADS");
  const initialCampaigns = result.success ? result.campaigns : [];

  return <PaidAdsView initialCampaigns={initialCampaigns} />;
}
