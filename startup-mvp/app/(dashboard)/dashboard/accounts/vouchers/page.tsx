import React from "react";
import { listVouchers } from "./_actions/voucher.action";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";
import VouchersListClient from "./_components/vouchers-list";
import VoucherQuickCreate from "./_components/voucher-quick-create";
import ExportVouchersButton from "./_components/ExportVouchersButton";
import PageGuard from "@/components/permissions/page-guard";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

interface VouchersPageProps {
  searchParams: Promise<{
    page?: string;
    search?: string;
    tab?: string;
    type?: string;
    dateFrom?: string;
    dateTo?: string;
    warehouseId?: string;
    limit?: string;
  }>;
}

export default async function VouchersPage({ searchParams }: VouchersPageProps) {
  const params = await searchParams;
  const page = parseInt(params.page || "1");
  const limit = parseInt(params.limit || "20");
  const search = params.search || "";
  const tab = params.tab || "all";

  const session = await auth();
  const userId = session?.user?.id;
  const userRole = session?.user?.role || "";
  const isAdmin = userRole.toLowerCase() === "admin" || userRole.toLowerCase() === "super-admin";

  let userWarehouseId = "";
  if (userId && !isAdmin) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { defaultWarehouseId: true },
    });
    userWarehouseId = user?.defaultWarehouseId || "none";
  }

  const selectedWarehouseId = isAdmin ? params.warehouseId : userWarehouseId;

  const status = tab === "cancelled" || tab === "trash" ? "cancelled" : tab === "draft" ? "draft" : tab === "posted" ? "posted" : "all";
  
  // Check permissions on server side
  const [result, canView, canEdit, canCreate] = await Promise.all([
    listVouchers(page, limit, search, status, params.type, params.dateFrom, params.dateTo, selectedWarehouseId),
    userId ? hasPermission(userId, "accounts.vouchers", "view") : false,
    userId ? hasPermission(userId, "accounts.vouchers", "edit") : false,
    userId ? hasPermission(userId, "accounts.vouchers", "create") : false,
  ]);

  // Fetch active warehouses
  const allWarehouses = await prisma.warehouse.findMany({
    where: { status: "active", isTrash: false },
    select: { id: true, name: true, code: true },
    orderBy: { name: "asc" },
  });

  const warehouses = isAdmin 
    ? allWarehouses 
    : allWarehouses.filter((w: any) => w.id === userWarehouseId);

  // Handle errors
  if (!result.success) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Vouchers</h1>
            <p className="text-sm text-muted-foreground">Create and manage accounting vouchers</p>
          </div>
        </div>
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
          <p className="text-sm text-destructive">
            {result.error || "Failed to load vouchers"}
          </p>
        </div>
      </div>
    );
  }

  const buildTabHref = (targetTab: string) => {
    const qParams = new URLSearchParams();
    qParams.set("tab", targetTab);
    qParams.set("page", "1");
    if (search) qParams.set("search", search);
    if (params.type) qParams.set("type", params.type);
    if (params.warehouseId) qParams.set("warehouseId", params.warehouseId);
    if (params.limit) qParams.set("limit", params.limit);
    if (params.dateFrom) qParams.set("dateFrom", params.dateFrom);
    if (params.dateTo) qParams.set("dateTo", params.dateTo);
    return `/dashboard/accounts/vouchers?${qParams.toString()}`;
  };

  return (
    <PageGuard permissionKey="accounts.vouchers">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">Vouchers</h1>
            <p className="text-sm text-muted-foreground">Create and manage accounting vouchers</p>
          </div>
          <div className="flex items-center gap-2">
            <ExportVouchersButton
              search={search}
              tab={tab}
              filters={{
                type: params.type,
                dateFrom: params.dateFrom,
                dateTo: params.dateTo,
                warehouseId: selectedWarehouseId,
              }}
            />
            {canCreate && (
              <VoucherQuickCreate basePath="/dashboard/accounts/vouchers" />
            )}
          </div>
        </div>


        <Tabs defaultValue={tab} className="w-full">
          <TabsList>
            <TabsTrigger value="all" asChild>
              <Link href={buildTabHref("all")}>All Vouchers</Link>
            </TabsTrigger>
            <TabsTrigger value="draft" asChild>
              <Link href={buildTabHref("draft")}>Draft</Link>
            </TabsTrigger>
            <TabsTrigger value="posted" asChild>
              <Link href={buildTabHref("posted")}>Posted</Link>
            </TabsTrigger>
            <TabsTrigger value="cancelled" asChild>
              <Link href={buildTabHref("cancelled")}>Cancelled</Link>
            </TabsTrigger>
          </TabsList>
          <TabsContent value="all" className="mt-4">
            <VouchersListClient
              initialVouchers={result.vouchers || []}
              initialPagination={result.pagination || {
                page: 1,
                limit: 20,
                total: 0,
                totalPages: 0,
              }}
              initialSearch={search}
              userId={userId}
              permissions={{
                view: canView,
                edit: canEdit,
                create: canCreate,
              }}
              warehouses={warehouses}
              selectedWarehouseId={selectedWarehouseId || ""}
              selectedType={params.type || "all"}
              isAdmin={isAdmin}
            />
          </TabsContent>
          <TabsContent value="draft" className="mt-4">
            <VouchersListClient
              initialVouchers={result.vouchers || []}
              initialPagination={result.pagination || {
                page: 1,
                limit: 20,
                total: 0,
                totalPages: 0,
              }}
              initialSearch={search}
              userId={userId}
              permissions={{
                view: canView,
                edit: canEdit,
                create: canCreate,
              }}
              warehouses={warehouses}
              selectedWarehouseId={selectedWarehouseId || ""}
              selectedType={params.type || "all"}
              isAdmin={isAdmin}
            />
          </TabsContent>
          <TabsContent value="posted" className="mt-4">
            <VouchersListClient
              initialVouchers={result.vouchers || []}
              initialPagination={result.pagination || {
                page: 1,
                limit: 20,
                total: 0,
                totalPages: 0,
              }}
              initialSearch={search}
              userId={userId}
              permissions={{
                view: canView,
                edit: canEdit,
                create: canCreate,
              }}
              warehouses={warehouses}
              selectedWarehouseId={selectedWarehouseId || ""}
              selectedType={params.type || "all"}
              isAdmin={isAdmin}
            />
          </TabsContent>
          <TabsContent value="cancelled" className="mt-4">
            <VouchersListClient
              initialVouchers={result.vouchers || []}
              initialPagination={result.pagination || {
                page: 1,
                limit: 20,
                total: 0,
                totalPages: 0,
              }}
              initialSearch={search}
              userId={userId}
              permissions={{
                view: canView,
                edit: canEdit,
                create: canCreate,
              }}
              warehouses={warehouses}
              selectedWarehouseId={selectedWarehouseId || ""}
              selectedType={params.type || "all"}
              isAdmin={isAdmin}
            />
          </TabsContent>
        </Tabs>
      </div>
    </PageGuard>
  );
}

