import React from "react";
import Link from "next/link";
import DamageList, { DamagesHeaderActions } from "./_components/damage-list";
import { getDamages } from "./_actions/damage.action";
import { getActiveWarehouses } from "@/app/(dashboard)/dashboard/inventory/stock/_actions/stock.action";
import { getAccountingOperationSettings } from "@/lib/accounting-settings";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";

interface DamagePageProps {
  searchParams: Promise<{
    page?: string;
    search?: string;
    warehouseId?: string;
    tab?: string;
    startDate?: string;
    endDate?: string;
  }>;
}

export default async function DamagePage({ searchParams }: DamagePageProps) {
  const session = await auth();
  const userId = session?.user?.id || "";
  const params = await searchParams;
  const page = Number(params.page) || 1;
  const search = params.search || "";
  const tab = params.tab || "active";
  const isTrash = tab === "trash";

  const todayStr = new Date().toISOString().split("T")[0];
  const startDate = params.startDate || todayStr;
  const endDate = params.endDate || todayStr;

  const canCreate = await hasPermission(userId, "inventory.damage", "create");

  const dbUser = userId ? await prisma.user.findUnique({
    where: { id: userId },
    include: { defaultWarehouse: true },
  }) : null;

  const isNormalUser = dbUser?.role !== "admin" && dbUser?.role !== "superadmin";

  const selectedWarehouseId = isNormalUser
    ? (dbUser?.defaultWarehouseId || "")
    : (params.warehouseId || "all");

  const [res, warehousesRes, settings] = await Promise.all([
    getDamages(page, 10, {
      search,
      warehouseId: selectedWarehouseId,
      isTrash,
      startDate,
      endDate,
    }),
    getActiveWarehouses(),
    getAccountingOperationSettings()
  ]);

  const damages = res.success ? res.damages : [];
  const totalPages = res.success ? res.pagination?.totalPages || 1 : 1;
  
  const activeWarehouses = !isNormalUser
    ? (warehousesRes.success ? warehousesRes.warehouses : [])
    : dbUser?.defaultWarehouse
    ? [{
        id: dbUser.defaultWarehouse.id,
        name: dbUser.defaultWarehouse.name,
        code: dbUser.defaultWarehouse.code,
      }]
    : [];
  
  const setupIncomplete = !settings.inventoryAdjustment?.negativeAdjustmentExpenseId;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold">Inventory Damage</h1>
          <p className="text-sm text-muted-foreground">Record and manage damaged stock.</p>
        </div>
        <DamagesHeaderActions
          canCreate={canCreate}
          damages={damages || []}
          setupIncomplete={setupIncomplete}
        />
      </div>

      {setupIncomplete && (
        <Alert variant="destructive">
          <AlertDescription>
            Inventory Accounting settings are incomplete. Please configure the "Negative Adjustment / Damage Expense" account in Settings to enable recording damages.
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue={tab} className="w-full">
        <TabsList>
          <TabsTrigger value="active" asChild>
            <Link href={`?tab=active&page=1&warehouseId=${selectedWarehouseId}&startDate=${startDate}&endDate=${endDate}`}>Active</Link>
          </TabsTrigger>
          <TabsTrigger value="trash" asChild>
            <Link href={`?tab=trash&page=1&warehouseId=${selectedWarehouseId}&startDate=${startDate}&endDate=${endDate}`}>Trash</Link>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="mt-4">
          <DamageList 
            initialData={damages || []} 
            totalPages={totalPages}
            currentPage={page}
            warehouses={activeWarehouses}
            selectedWarehouseId={selectedWarehouseId}
            startDate={startDate}
            endDate={endDate}
            canChangeWarehouse={!isNormalUser}
            isTrash={false}
          />
        </TabsContent>
        <TabsContent value="trash" className="mt-4">
          <DamageList 
            initialData={damages || []} 
            totalPages={totalPages}
            currentPage={page}
            warehouses={activeWarehouses}
            selectedWarehouseId={selectedWarehouseId}
            startDate={startDate}
            endDate={endDate}
            canChangeWarehouse={!isNormalUser}
            isTrash={true}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
