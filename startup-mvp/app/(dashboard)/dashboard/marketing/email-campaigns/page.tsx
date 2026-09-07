import React from "react";
import EmailCampaignsView from "@/components/marketing/email-campaigns-view";
import { getChannelCampaignsAction } from "@/app/actions/crm/marketing-operations.action";

export const dynamic = "force-dynamic";

export default async function MarketingEmailCampaignsPage() {
  const result = await getChannelCampaignsAction("EMAIL");
  const initialCampaigns = result.success ? result.campaigns : [];

  return <EmailCampaignsView initialCampaigns={initialCampaigns} />;
}
