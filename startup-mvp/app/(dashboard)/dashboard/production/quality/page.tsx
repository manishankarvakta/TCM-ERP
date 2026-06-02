import React from "react";
import PageGuard from "@/components/permissions/page-guard";
import { isGarmentsModuleEnabled } from "@/lib/garment-features";
import { QualityDashboardClient } from "./_components/quality-dashboard";

export default async function QualityPage() {
  const isEnabled = await isGarmentsModuleEnabled();

  return (
    <PageGuard permissionKey="production.orders">
      <div className="space-y-6 p-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Quality Check Board</h1>
          <p className="text-sm text-muted-foreground">Monitor real-time AQL levels, track floor DHU counts, and analyze top sewing defect profiles.</p>
        </div>
        <QualityDashboardClient isEnabled={isEnabled} />
      </div>
    </PageGuard>
  );
}
