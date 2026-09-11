import React from "react";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import PageGuard from "@/components/permissions/page-guard";
import FixedAssetTabs from "../_components/fixed-asset-tabs";
import DisposalsView from "../_components/disposals-view";
import { getDisposalEntries, getFixedAssetAccounts } from "../_actions/fixed-asset.action";

export default async function AssetDisposalsPage() {
  const session = await auth();
  const userId = session?.user?.id;
  const orgId = (session?.user as any)?.organizationId;

  const canView = userId
    ? (await hasPermission(userId, "accounts.chart-of-accounts", "view")) ||
      (await hasPermission(userId, "accounts.vouchers", "view"))
    : false;

  if (!canView) {
    return <div className="p-8 text-center text-destructive">Access Denied</div>;
  }

  const { assets = [] } = await getFixedAssetAccounts();
  const assetAccounts = assets.filter((a) => !a.isAccumulatedDepr);
  const accumAccounts = assets.filter((a) => a.isAccumulatedDepr);

  // Fetch payment accounts (Cash, Bank, MFS)
  const paymentAccounts = await prisma.chartOfAccount.findMany({
    where: {
      OR: [
        { type: "ASSET", code: { startsWith: "11" } }, // Cash
        { type: "ASSET", code: { startsWith: "12" } }, // Bank
        { type: "ASSET", code: { startsWith: "13" } }, // MFS
      ],
      status: "active",
      ...(orgId ? { OR: [{ organizationId: orgId }, { organizationId: null }] } : {}),
    },
    select: { id: true, code: true, name: true },
    orderBy: { code: "asc" },
  });

  const { entries = [] } = await getDisposalEntries();

  return (
    <PageGuard permissionKey="accounts.chart-of-accounts">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Asset Disposals</h1>
          <p className="text-sm text-muted-foreground">
            Derecognize retired or sold fixed assets, clear accumulated depreciation, and recognize gains or losses
          </p>
        </div>

        <FixedAssetTabs />

        <DisposalsView
          entries={entries}
          assetAccounts={assetAccounts}
          accumAccounts={accumAccounts}
          paymentAccounts={paymentAccounts}
        />
      </div>
    </PageGuard>
  );
}
