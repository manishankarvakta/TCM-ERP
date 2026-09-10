// import React, { Suspense } from "react";
// import CreateCampaignView from "@/components/marketing/create-campaign-view";
// import { getMarketingFunnelsAction } from "@/app/actions/crm/marketing-operations.action";

// export default async function CreateCampaignPage() {
//   const funnelsRes = await getMarketingFunnelsAction();
//   const initialFunnels = funnelsRes.success && funnelsRes.funnels ? funnelsRes.funnels : [];

//   return (
//     <Suspense fallback={<div className="p-6 text-xs text-muted-foreground">Loading Campaign Form...</div>}>
//       <CreateCampaignView initialFunnels={initialFunnels} />
//     </Suspense>
//   );
// }

import { Suspense } from "react";
import CreateCampaignView from "@/components/marketing/create-campaign-view";
import { getMarketingFunnelsAction } from "@/app/actions/crm/marketing-operations.action";

function CreateCampaignLoading() {
  return (
    <div className="w-full min-w-0 p-6">
      <div className="text-sm text-muted-foreground">
        Loading Campaign Form...
      </div>
    </div>
  );
}

export default async function CreateCampaignPage() {
  const result = await getMarketingFunnelsAction();

  const initialFunnels =
    result.success && Array.isArray(result.funnels)
      ? result.funnels
      : [];

  return (
    <main className="w-full min-w-0">
      <Suspense fallback={<CreateCampaignLoading />}>
        <CreateCampaignView initialFunnels={initialFunnels} />
      </Suspense>
    </main>
  );
}