import { Metadata } from "next";
import PageGuard from "@/components/permissions/page-guard";
import SyncCenterClient from "./_components/sync-center-client";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Biometric Sync & Recovery | HRMS",
  description: "Recover and reprocess missing biometric attendance data",
};

export default async function BiometricSyncCenterPage() {
  const devices = await prisma.biometricDevice.findMany({
    select: { 
      id: true, 
      name: true, 
      serialNumber: true,
      isActive: true,
      lastPingAt: true
    },
    orderBy: { name: 'asc' }
  });

  return (
    <PageGuard permissionKey="hr.biometric.sync">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Sync & Recovery Center</h1>
          <p className="text-muted-foreground mt-1">
            Safely reprocess raw logs, unresolved punches, and test ADMS capabilities.
          </p>
        </div>

        <SyncCenterClient devices={devices} />
      </div>
    </PageGuard>
  );
}
