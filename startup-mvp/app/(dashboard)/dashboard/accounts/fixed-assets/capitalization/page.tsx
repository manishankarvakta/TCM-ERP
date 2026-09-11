import React from "react";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import PageGuard from "@/components/permissions/page-guard";
import FixedAssetTabs from "../_components/fixed-asset-tabs";
import CapitalizationView from "../_components/capitalization-view";
import { getCapitalizationEntries, getFixedAssetAccounts } from "../_actions/fixed-asset.action";

export default async function AssetCapitalizationPage({
  searchParams,
}: {
  searchParams: Promise<{ assetId?: string }>;
}) {
  const { assetId } = await searchParams;
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

  // Fetch payment/funding accounts (Cash, Bank, MFS, Accounts Payable)
  const paymentAccounts = await prisma.chartOfAccount.findMany({
    where: {
      OR: [
        { type: "ASSET", code: { startsWith: "11" } }, // Cash
        { type: "ASSET", code: { startsWith: "12" } }, // Bank
        { type: "ASSET", code: { startsWith: "13" } }, // MFS
        { type: "LIABILITY", code: { startsWith: "21" } }, // Accounts Payable
      ],
      status: "active",
      ...(orgId ? { OR: [{ organizationId: orgId }, { organizationId: null }] } : {}),
    },
    select: { id: true, code: true, name: true },
    orderBy: { code: "asc" },
  });

  const { entries = [] } = await getCapitalizationEntries();

  return (
    <PageGuard permissionKey="accounts.chart-of-accounts">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Asset Capitalization</h1>
          <p className="text-sm text-muted-foreground">
            Record acquisitions, purchases, and work-in-progress capitalizations into fixed asset accounts
          </p>
        </div>

        <FixedAssetTabs />

        <CapitalizationView
          entries={entries}
          assetAccounts={assetAccounts}
          paymentAccounts={paymentAccounts}
          selectedAssetId={assetId}
        />
      </div>
    </PageGuard>
  );
}
