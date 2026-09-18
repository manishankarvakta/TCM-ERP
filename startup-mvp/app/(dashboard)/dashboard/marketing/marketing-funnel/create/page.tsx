import React, { Suspense } from "react";
import CreateMarketingFunnelView from "@/components/marketing/create-marketing-funnel-view";
import { getAssignableUsers } from "@/app/actions/user.action";

export default async function CreateMarketingFunnelPage() {
  const usersRes = await getAssignableUsers();
  const users = usersRes.success && usersRes.users ? usersRes.users : [];
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-muted-foreground animate-pulse">Loading funnel wizard...</div>}>
      <CreateMarketingFunnelView initialUsers={users} />
    </Suspense>
  );
}

