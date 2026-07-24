import React from "react";
import { getSuppliers, getWarehousesForSupplier } from "./_actions/supplier.action";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";
import { FiPlus } from "react-icons/fi";
import SuppliersListClient from "./_components/suppliers";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";

interface SuppliersPageProps {
  searchParams: Promise<{
    page?: string;
    search?: string;
    tab?: string;
    warehouse?: string;
  }>;
}

export default async function SuppliersPage({ searchParams }: SuppliersPageProps) {
  const params = await searchParams;
  const page = parseInt(params.page || "1");
  const search = params.search || "";
  const tab = params.tab || "all";
  const warehouse = params.warehouse || "all";

  const session = await auth();
  const userId = session?.user?.id;

  const status = tab === "trash" ? "trash" : "all";
  
  // Check permissions on server side for better performance
  const [result, warehousesResult, canView, canEdit, canMoveToTrash, canDeletePermanently, canViewLedger] = await Promise.all([
    getSuppliers(page, 10, search, status, warehouse),
    getWarehousesForSupplier(),
    userId ? hasPermission(userId, "peoples.suppliers", "view") : false,
    userId ? hasPermission(userId, "peoples.suppliers", "edit") : false,
    userId ? hasPermission(userId, "peoples.suppliers", "move-to-trash") : false,
    userId ? hasPermission(userId, "peoples.suppliers", "delete-permanently") : false,
    userId ? hasPermission(userId, "peoples.suppliers", "ledger") : false,
  ]);

  // Handle errors
  if (!result.success) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Suppliers</h1>
            <p className="text-sm text-muted-foreground">Manage suppliers in your system</p>
          </div>
        </div>
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
          <p className="text-sm text-destructive">
            {result.error || "Failed to load suppliers"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Suppliers</h1>
          <p className="text-sm text-muted-foreground">Manage suppliers in your system</p>
        </div>
        {tab !== "trash" && (
          <Button asChild>
            <Link href="/dashboard/suppliers/add">
              <FiPlus className="mr-2 h-4 w-4" />
              Add Supplier
            </Link>
          </Button>
        )}
      </div>

      <Tabs defaultValue={tab} className="w-full">
        <TabsList>
          <TabsTrigger value="all" asChild>
            <Link href="/dashboard/suppliers?tab=all&page=1">All Suppliers</Link>
          </TabsTrigger>
          <TabsTrigger value="trash" asChild>
            <Link href="/dashboard/suppliers?tab=trash&page=1">Trash</Link>
          </TabsTrigger>
        </TabsList>
        <TabsContent value="all" className="mt-4">
          <SuppliersListClient
            initialSuppliers={(result.suppliers as any) || []}
            initialPagination={result.pagination || {
              page: 1,
              limit: 10,
              total: 0,
              totalPages: 0,
            }}
            initialSearch={search}
            initialWarehouse={warehouse}
            warehouses={warehousesResult.warehouses || []}
            isTrash={false}
            userId={userId || undefined}
            permissions={{
              view: canView,
              edit: canEdit,
              moveToTrash: canMoveToTrash,
              deletePermanently: canDeletePermanently,
              viewLedger: canViewLedger,
            }}
          />
        </TabsContent>
        <TabsContent value="trash" className="mt-4">
          <SuppliersListClient
            initialSuppliers={(result.suppliers as any) || []}
            initialPagination={result.pagination || {
              page: 1,
              limit: 10,
              total: 0,
              totalPages: 0,
            }}
            initialSearch={search}
            initialWarehouse={warehouse}
            warehouses={warehousesResult.warehouses || []}
            isTrash={true}
            userId={userId || undefined}
            permissions={{
              view: canView,
              edit: canEdit,
              moveToTrash: canMoveToTrash,
              deletePermanently: canDeletePermanently,
              viewLedger: canViewLedger,
            }}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

