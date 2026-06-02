import React from "react";
import PageGuard from "@/components/permissions/page-guard";
import { isGarmentsModuleEnabled } from "@/lib/garment-features";
import { SewingTrackerClient } from "./_components/sewing-tracker";
import { prisma } from "@/lib/prisma";

export default async function SewingPage() {
  const isEnabled = await isGarmentsModuleEnabled();

  // Retrieve current active tracks for the board
  const activeTracks = await prisma.sewingLineTrack.findMany({
    orderBy: { createdAt: "desc" },
    take: 10,
    include: {
      productionOrder: {
        include: { item: true }
      }
    }
  });

  return (
    <PageGuard permissionKey="production.orders">
      <div className="space-y-6 p-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Sewing Line Tracking</h1>
          <p className="text-sm text-muted-foreground">Monitor real-time outputs per line, log hourly progress, and manage line targets.</p>
        </div>
        <SewingTrackerClient isEnabled={isEnabled} initialTracks={activeTracks} />
      </div>
    </PageGuard>
  );
}
