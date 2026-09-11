import React from "react";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import PageGuard from "@/components/permissions/page-guard";
import FixedAssetTabs from "../_components/fixed-asset-tabs";
import ItemizedAssetsView from "../_components/itemized-assets-view";
import { getFixedAssetItems } from "../_actions/fixed-asset-item.action";
import { getFixedAssetAccounts } from "../_actions/fixed-asset.action";

export default async function ItemizedFixedAssetsPage() {
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
  const assetAccounts = assets.filter((a) => !a.isAccumulatedDepr && a.code.startsWith("17"));

  // Fetch employees for assignment
  const employees = await prisma.employee.findMany({
    where: {
      status: "active",
      ...(orgId ? { organizationId: orgId } : {}),
    },
    select: { id: true, name: true, employeeCode: true, designation: true },
    orderBy: { name: "asc" },
  });

  const { items = [], metrics = null } = await getFixedAssetItems();

  return (
    <PageGuard permissionKey="accounts.chart-of-accounts">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Itemized Physical Fixed Assets</h1>
          <p className="text-sm text-muted-foreground">
            Track individual physical asset units, serial numbers, locations, employee assignments, and unit-level depreciation
          </p>
        </div>

        <FixedAssetTabs />

        <ItemizedAssetsView
          items={items}
          metrics={metrics}
          assetAccounts={assetAccounts}
          employees={employees}
        />
      </div>
    </PageGuard>
  );
}
