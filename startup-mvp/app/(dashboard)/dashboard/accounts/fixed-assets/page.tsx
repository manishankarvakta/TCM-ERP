import React from "react";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import PageGuard from "@/components/permissions/page-guard";
import FixedAssetsView from "./_components/fixed-assets-view";
import FixedAssetTabs from "./_components/fixed-asset-tabs";
import { getFixedAssetAccounts } from "./_actions/fixed-asset.action";

export default async function FixedAssetRegisterPage() {
  const session = await auth();
  const userId = session?.user?.id;

  const canView = userId
    ? (await hasPermission(userId, "accounts.chart-of-accounts", "view")) ||
      (await hasPermission(userId, "accounts.vouchers", "view"))
    : false;

  if (!canView) {
    return <div className="p-8 text-center text-destructive">Access Denied</div>;
  }

  const { assets = [], metrics = { grossCost: 0, accumulatedDepreciation: 0, netBookValue: 0, totalAccounts: 0 } } =
    await getFixedAssetAccounts();

  return (
    <PageGuard permissionKey="accounts.chart-of-accounts">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Fixed Asset Register</h1>
          <p className="text-sm text-muted-foreground">
            Manage fixed asset general ledger accounts, acquisitions, depreciations, and net book values
          </p>
        </div>

        <FixedAssetTabs />

        <FixedAssetsView assets={assets} metrics={metrics} />
      </div>
    </PageGuard>
  );
}
