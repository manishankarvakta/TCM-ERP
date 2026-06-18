import React from "react";
import { getGRNs } from "./_actions/grn.action";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";
import GRNsListClient from "./_components/grns";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { getActiveWarehouses } from "@/app/(dashboard)/dashboard/inventory/stock/_actions/stock.action";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { FiPlus } from "react-icons/fi";

interface GRNsPageProps {
  searchParams: Promise<{
    page?: string;
    search?: string;
    tab?: string;
    warehouseId?: string;
  }>;
}

export default async function GRNsPage({ searchParams }: GRNsPageProps) {
  const params = await searchParams;
  const page = parseInt(params.page || "1");
  const search = params.search || "";
  const tab = params.tab || "all";

  const session = await auth();
  const userId = session?.user?.id;

  const dbUser = userId ? await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true, defaultWarehouseId: true }
  }) : null;

  const userContext = {
    isNormalUser: dbUser?.role !== "admin" && dbUser?.role !== "superadmin",
    defaultWarehouseId: dbUser?.defaultWarehouseId || null,
  };

  const status = tab === "trash" ? "trash" : "all";
  const warehouseId = params.warehouseId || (userContext.isNormalUser ? userContext.defaultWarehouseId : undefined) || undefined;

  const [result, warehousesResult, canView, canCreate, canEdit, canMoveToTrash, canDeletePermanently] = await Promise.all([
    getGRNs(page, 10, search, status, warehouseId),
    getActiveWarehouses(),
    userId ? hasPermission(userId, "procurements.grn", "view") : false,
    userId ? hasPermission(userId, "procurements.grn", "create") : false,
    userId ? hasPermission(userId, "procurements.grn", "edit") : false,
    userId ? hasPermission(userId, "procurements.grn", "move-to-trash") : false,
    userId ? hasPermission(userId, "procurements.grn", "delete-permanently") : false,
  ]);

  if (!result.success) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Goods Receipt Notes</h1>
            <p className="text-sm text-muted-foreground">Manage Goods Receipt Notes in your system</p>
          </div>
        </div>
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
          <p className="text-sm text-destructive">
            {result.error || "Failed to load GRNs"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Goods Receipt Notes</h1>
          <p className="text-sm text-muted-foreground">Manage Goods Receipt Notes in your system</p>
        </div>
        {tab !== "trash" && canCreate && (
          <Button asChild>
            <Link href="/dashboard/procurements/grn/add">
              <FiPlus className="mr-2 h-4 w-4" />
              Create GRN
            </Link>
          </Button>
        )}
      </div>

      <Tabs defaultValue={tab} className="w-full">
        <TabsList>
          <TabsTrigger value="all" asChild>
            <Link href="/dashboard/procurements/grn?tab=all&page=1">All GRNs</Link>
          </TabsTrigger>
          <TabsTrigger value="trash" asChild>
            <Link href="/dashboard/procurements/grn?tab=trash&page=1">Trash</Link>
          </TabsTrigger>
        </TabsList>
        <TabsContent value="all" className="mt-4">
          <GRNsListClient
            initialGRNs={(result.grns as any) || []}
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
            warehouses={warehousesResult?.success ? warehousesResult.warehouses : []}
            userContext={userContext}
          />
        </TabsContent>
        <TabsContent value="trash" className="mt-4">
          <GRNsListClient
            initialGRNs={(result.grns as any) || []}
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
            warehouses={warehousesResult?.success ? warehousesResult.warehouses : []}
            userContext={userContext}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
