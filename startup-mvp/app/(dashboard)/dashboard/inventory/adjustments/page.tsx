import React from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Plus } from "lucide-react";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import PageGuard from "@/components/permissions/page-guard";
import { getAdjustments } from "./_actions/adjustment.action";
import AdjustmentList from "./_components/adjustment-list";

interface PageProps {
  searchParams: Promise<{
    page?: string;
    search?: string;
    warehouseId?: string;
  }>;
}

import { getActiveWarehouses } from "@/app/(dashboard)/dashboard/inventory/stock/_actions/stock.action";
import { prisma } from "@/lib/prisma";

export default async function AdjustmentPage({ searchParams }: PageProps) {
  const session = await auth();
  const params = await searchParams;
  const page = Number(params.page) || 1;
  
  const canCreate = await hasPermission(session?.user?.id || "", "inventory.adjustments", "create");

  const dbUser = session?.user?.id ? await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true, defaultWarehouseId: true }
  }) : null;
  const userContext = {
    isNormalUser: dbUser?.role !== "admin" && dbUser?.role !== "superadmin",
    defaultWarehouseId: dbUser?.defaultWarehouseId || null,
  };

  const warehousesResult = await getActiveWarehouses();

  const { adjustments, pagination, success, error } = await getAdjustments(page, 10, {
    search: params.search,
    warehouseId: params.warehouseId || (userContext.isNormalUser ? userContext.defaultWarehouseId : undefined),
  });

  if (!success) {
    return (
       <div className="p-4 text-red-500">Error: {error}</div>
    );
  }

  return (
    <PageGuard permissionKey="inventory.adjustments" requiredOperation="view">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Inventory Adjustments</h1>
            <p className="text-sm text-muted-foreground">Manage stock adjustments and corrections</p>
          </div>
          {canCreate && (
            <Button asChild>
              <Link href="/dashboard/inventory/adjustments/add">
                <Plus className="mr-2 h-4 w-4" />
                New Adjustment
              </Link>
            </Button>
          )}
        </div>

        <AdjustmentList 
          adjustments={adjustments || []} 
          pagination={pagination || { page: 1, totalPages: 1, total: 0, limit: 10 }}
          searchParams={params}
          warehouses={warehousesResult?.success ? warehousesResult.warehouses : []}
          userContext={userContext}
        />
      </div>
    </PageGuard>
  );
}
