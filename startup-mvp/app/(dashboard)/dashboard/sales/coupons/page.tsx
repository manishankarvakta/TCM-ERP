import React from "react";
import { getCoupons } from "./_actions/coupon.action";
import CouponsList from "./_components/coupons";
import PageGuard from "@/components/permissions/page-guard";

export default async function CouponsPage() {
  const result = await getCoupons();

  if (!result.success) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Coupons</h1>
          <p className="text-sm text-muted-foreground">Manage discounts coupons</p>
        </div>
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
          <p className="text-sm text-destructive">
            {result.error || "Failed to load coupons"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <PageGuard permissionKey="sales.coupons" requiredOperation="view">
      <CouponsList initialCoupons={result.coupons || []} />
    </PageGuard>
  );
}
