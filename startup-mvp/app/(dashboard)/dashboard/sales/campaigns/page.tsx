import React from "react";
import { getActivePromotions } from "./_actions/campaign.action";
import CampaignManager from "./_components/campaignManager";
import PageGuard from "@/components/permissions/page-guard";

export default async function CampaignsPage() {
  const result = await getActivePromotions();

  return (
    <PageGuard permissionKey="sales.campaigns" requiredOperation="view">
      <CampaignManager initialActivePromos={result.items || []} />
    </PageGuard>
  );
}
