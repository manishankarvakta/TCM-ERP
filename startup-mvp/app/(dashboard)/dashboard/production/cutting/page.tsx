import React from "react";
import PageGuard from "@/components/permissions/page-guard";
import { isGarmentsModuleEnabled } from "@/lib/garment-features";
import { CuttingFormClient } from "./_components/cutting-form";
import { prisma } from "@/lib/prisma";

export default async function CuttingPage() {
  const isEnabled = await isGarmentsModuleEnabled();
  
  // Fetch active production orders with item details for dropdowns
  const activeOrders = await prisma.productionOrder.findMany({
    where: { 
      status: "IN_PROGRESS",
      isTrash: false 
    },
    include: {
      item: true
    }
  });

  return (
    <PageGuard permissionKey="production.orders">
      <div className="space-y-6 p-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Cutting Room Input</h1>
          <p className="text-sm text-muted-foreground">Log daily fabric lays, record marker yields, and track cutting wastage.</p>
        </div>
        <CuttingFormClient isEnabled={isEnabled} activeOrders={activeOrders} />
      </div>
    </PageGuard>
  );
}
