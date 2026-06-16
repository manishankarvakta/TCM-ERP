import React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import DamageList from "./_components/damage-list";
import { getDamages } from "./_actions/damage.action";
import { getWarehouses } from "../../master/warehouses/_actions/warehouse.action";
import { getAccountingOperationSettings } from "@/lib/accounting-settings";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default async function DamagePage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; search?: string; warehouseId?: string; tab?: string }>;
}) {
  const params = await searchParams;
  const page = Number(params.page) || 1;
  const search = params.search || "";
  const warehouseId = params.warehouseId || "";
  const tab = params.tab || "active";
  const isTrash = tab === "trash";


  const [res, warehousesRes, settings] = await Promise.all([
    getDamages(page, 10, { search, warehouseId, isTrash }),
    getWarehouses(1, 100),
    getAccountingOperationSettings()
  ]);

  const damages = res.success ? res.damages : [];
  const totalPages = res.success ? res.pagination?.totalPages || 1 : 1;
  const warehouses = warehousesRes.success ? warehousesRes.warehouses : [];
  
  const setupIncomplete = !settings.inventoryAdjustment?.negativeAdjustmentExpenseId;


  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold">Inventory Damage</h1>
          <p className="text-sm text-muted-foreground">Record and manage damaged stock.</p>
        </div>
        <Link href="/dashboard/inventory/damage/add">
          <Button disabled={setupIncomplete}>
            <Plus className="mr-2 h-4 w-4" /> Add Damage
          </Button>
        </Link>
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
            <Link href="?tab=active">Active</Link>
          </TabsTrigger>
          <TabsTrigger value="trash" asChild>
            <Link href="?tab=trash">Trash</Link>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="mt-4">
          <DamageList 
            initialData={damages} 
            totalPages={totalPages}
            currentPage={page}
            warehouses={warehouses}
            isTrash={false}
          />
        </TabsContent>
        <TabsContent value="trash" className="mt-4">
          <DamageList 
            initialData={damages} 
            totalPages={totalPages}
            currentPage={page}
            warehouses={warehouses}
            isTrash={true}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
