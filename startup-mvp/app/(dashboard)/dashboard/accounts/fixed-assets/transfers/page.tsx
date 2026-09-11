import React from "react";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import PageGuard from "@/components/permissions/page-guard";
import FixedAssetTabs from "../_components/fixed-asset-tabs";
import TransfersView from "../_components/transfers-view";
import { getTransferEntries, getFixedAssetAccounts } from "../_actions/fixed-asset.action";

export default async function AssetTransfersPage() {
  const session = await auth();
  const userId = session?.user?.id;

  const canView = userId
    ? (await hasPermission(userId, "accounts.chart-of-accounts", "view")) ||
      (await hasPermission(userId, "accounts.vouchers", "view"))
    : false;

  if (!canView) {
    return <div className="p-8 text-center text-destructive">Access Denied</div>;
  }

  const { assets = [] } = await getFixedAssetAccounts();
  const assetAccounts = assets.filter((a) => !a.isAccumulatedDepr);
  const { entries = [] } = await getTransferEntries();

  return (
    <PageGuard permissionKey="accounts.chart-of-accounts">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Asset Transfers</h1>
          <p className="text-sm text-muted-foreground">
            Reclassify fixed asset valuations and record inter-account asset transfers
          </p>
        </div>

        <FixedAssetTabs />

        <TransfersView entries={entries} assetAccounts={assetAccounts} />
      </div>
    </PageGuard>
  );
}
