import React, { Suspense } from "react";
import CreateCampaignView from "@/components/marketing/create-campaign-view";

export default function CreateCampaignPage() {
  return (
    <Suspense fallback={<div className="p-6 text-xs text-muted-foreground">Loading Campaign Form...</div>}>
      <CreateCampaignView />
    </Suspense>
  );
}
