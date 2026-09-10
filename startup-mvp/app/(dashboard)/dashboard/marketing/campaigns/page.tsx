// import React from "react";
// import CampaignsView from "@/components/marketing/campaigns-view";
// import { getMarketingCampaignsListAction } from "@/app/actions/crm/marketing-operations.action";

// export default async function MarketingCampaignsPage() {
//   const res = await getMarketingCampaignsListAction();
//   const campaigns = res.success && res.campaigns ? res.campaigns : [];
//   return <CampaignsView initialCampaigns={campaigns} />;
// }

import CampaignsView from "@/components/marketing/campaigns-view";
import { getMarketingCampaignsListAction } from "@/app/actions/crm/marketing-operations.action";

export default async function MarketingCampaignsPage() {
  const result = await getMarketingCampaignsListAction();

  const campaigns =
    result.success && Array.isArray(result.campaigns)
      ? result.campaigns
      : [];

  return (
    <main className="w-full min-w-0">
      <CampaignsView initialCampaigns={campaigns} />
    </main>
  );
}