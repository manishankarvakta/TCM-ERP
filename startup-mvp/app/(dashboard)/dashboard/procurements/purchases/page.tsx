import React from "react";
import { getPurchases } from "./_actions/purchase.action";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PurchasesListClient, { PurchasesHeaderActions } from "./_components/purchases";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

interface PurchasesPageProps {
  searchParams: Promise<{
    page?: string;
    search?: string;
    tab?: string;
    warehouseId?: string;
    startDate?: string;
    endDate?: string;
  }>;
}

export default async function PurchasesPage({ searchParams }: PurchasesPageProps) {
  const params = await searchParams;
  const page = parseInt(params.page || "1");
  const search = params.search || "";
  const tab = params.tab || "all";
  
  const todayStr = new Date().toISOString().split("T")[0];
  const startDate = params.startDate || todayStr;
  const endDate = params.endDate || todayStr;

  const session = await auth();
  const userId = session?.user?.id;

  const user = userId ? await prisma.user.findUnique({
    where: { id: userId },
    include: { defaultWarehouse: true },
  }) : null;

  const isAdmin = user?.role === "admin" || user?.role === "superadmin";

  const activeWarehouses = isAdmin
    ? await prisma.warehouse.findMany({
        where: { status: "active" },
        select: { id: true, name: true, code: true },
        orderBy: { name: "asc" },
      })
    : user?.defaultWarehouse
    ? [{
        id: user.defaultWarehouse.id,
        name: user.defaultWarehouse.name,
        code: user.defaultWarehouse.code,
      }]
    : [];

  const selectedWarehouseId = isAdmin
    ? (params.warehouseId || "all")
    : (user?.defaultWarehouseId || "");

  const status = tab === "trash" ? "trash" : "all";

  const [result, canView, canCreate, canEdit, canMoveToTrash, canDeletePermanently] = await Promise.all([
    getPurchases(page, 10, search, status, selectedWarehouseId, startDate, endDate),
    userId ? hasPermission(userId, "procurements.purchases", "view") : false,
    userId ? hasPermission(userId, "procurements.purchases", "create") : false,
    userId ? hasPermission(userId, "procurements.purchases", "edit") : false,
    userId ? hasPermission(userId, "procurements.purchases", "move-to-trash") : false,
    userId ? hasPermission(userId, "procurements.purchases", "delete-permanently") : false,
  ]);

  if (!result.success) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Purchases</h1>
            <p className="text-sm text-muted-foreground">Manage purchases in your system</p>
          </div>
        </div>
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
          <p className="text-sm text-destructive">
            {result.error || "Failed to load purchases"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Purchases</h1>
          <p className="text-sm text-muted-foreground">Manage purchases in your system</p>
        </div>
        {tab !== "trash" && (
          <PurchasesHeaderActions
            canCreate={canCreate}
            purchases={result.purchases || []}
          />
        )}
      </div>

      <Tabs defaultValue={tab} className="w-full">
        <TabsList>
          <TabsTrigger value="all" asChild>
            <Link href={`/dashboard/procurements/purchases?tab=all&page=1&warehouseId=${selectedWarehouseId}&startDate=${startDate}&endDate=${endDate}`}>All Purchases</Link>
          </TabsTrigger>
          <TabsTrigger value="trash" asChild>
            <Link href={`/dashboard/procurements/purchases?tab=trash&page=1&warehouseId=${selectedWarehouseId}&startDate=${startDate}&endDate=${endDate}`}>Trash</Link>
          </TabsTrigger>
        </TabsList>
        <TabsContent value="all" className="mt-4">
          <PurchasesListClient
            initialPurchases={(result.purchases as any) || []}
            initialPagination={
              result.pagination || {
                page: 1,
                limit: 10,
                total: 0,
                totalPages: 0,
              }
            }
            initialSearch={search}
            isTrash={false}
            userId={userId || undefined}
            permissions={{
              view: canView,
              edit: canEdit,
              moveToTrash: canMoveToTrash,
              deletePermanently: canDeletePermanently,
            }}
            warehouses={activeWarehouses}
            selectedWarehouseId={selectedWarehouseId}
            startDate={startDate}
            endDate={endDate}
            canChangeWarehouse={isAdmin}
          />
        </TabsContent>
        <TabsContent value="trash" className="mt-4">
          <PurchasesListClient
            initialPurchases={(result.purchases as any) || []}
            initialPagination={
              result.pagination || {
                page: 1,
                limit: 10,
                total: 0,
                totalPages: 0,
              }
            }
            initialSearch={search}
            isTrash={true}
            userId={userId || undefined}
            permissions={{
              view: canView,
              edit: canEdit,
              moveToTrash: canMoveToTrash,
              deletePermanently: canDeletePermanently,
            }}
            warehouses={activeWarehouses}
            selectedWarehouseId={selectedWarehouseId}
            startDate={startDate}
            endDate={endDate}
            canChangeWarehouse={isAdmin}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}


