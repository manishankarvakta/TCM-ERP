import React from "react";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import PageGuard from "@/components/permissions/page-guard";
import FixedAssetTabs from "../_components/fixed-asset-tabs";
import DepreciationView from "../_components/depreciation-view";
import { getDepreciationEntries, getFixedAssetAccounts } from "../_actions/fixed-asset.action";

export default async function AssetDepreciationPage({
  searchParams,
}: {
  searchParams: Promise<{ accumId?: string }>;
}) {
  const { accumId } = await searchParams;
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
  const accumAccounts = assets.filter((a) => a.isAccumulatedDepr);

  // Fetch expense accounts (code starting with 5 or 6)
  const expenseAccounts = await prisma.chartOfAccount.findMany({
    where: {
      type: "EXPENSE",
      status: "active",
      ...(orgId ? { OR: [{ organizationId: orgId }, { organizationId: null }] } : {}),
    },
    select: { id: true, code: true, name: true },
    orderBy: { code: "asc" },
  });

  const { entries = [] } = await getDepreciationEntries();

  return (
    <PageGuard permissionKey="accounts.chart-of-accounts">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Asset Depreciation</h1>
          <p className="text-sm text-muted-foreground">
            Calculate and post periodic depreciation entries and contra-asset adjustments
          </p>
        </div>

        <FixedAssetTabs />

        <DepreciationView
          entries={entries}
          accumAccounts={accumAccounts}
          expenseAccounts={expenseAccounts}
          selectedAccumId={accumId}
        />
      </div>
    </PageGuard>
  );
}
