import React from "react";
import { getSales } from "./_actions/sale.action";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";
import { FiPlus } from "react-icons/fi";
import SalesListClient from "./_components/sales";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import PageGuard from "@/components/permissions/page-guard";

interface SalesPageProps {
  searchParams: Promise<{
    page?: string;
    search?: string;
    tab?: string;
    billerId?: string;
    warehouseId?: string;
    type?: string;
    startDate?: string;
    endDate?: string;
    salesAssistantId?: string;
  }>;
}

export default async function SalesPage({ searchParams }: SalesPageProps) {
  const params = await searchParams;
  const page = parseInt(params.page || "1");
  const search = params.search || "";
  const tab = params.tab || "all";
  const billerId = params.billerId || undefined;
  const warehouseId = params.warehouseId || undefined;
  const type = params.type as any || undefined;
  const salesAssistantId = params.salesAssistantId || undefined;
  
  let startDate = params.startDate;
  let endDate = params.endDate;

  if (!startDate && !endDate) {
    const today = new Date();
    startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0).toISOString();
    endDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999).toISOString();
  }

  const session = await auth();
  const userId = session?.user?.id;

  const status = tab === "trash" ? "trash" : "all";

  // Dynamic imports to avoid large bundle size in layout
  const { getWarehousesForSale } = await import("./_actions/sale.action");
  const { prisma } = await import("@/lib/prisma");

  let isAdmin = false;
  let userWarehouseId: string | undefined = undefined;

  if (userId) {
    const dbUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, defaultWarehouseId: true }
    });
    if (dbUser) {
      isAdmin = ['admin', 'superadmin'].includes(dbUser.role.toLowerCase());
      userWarehouseId = dbUser.defaultWarehouseId || undefined;
    }
  }

  let effectiveWarehouseId = warehouseId;
  if (!isAdmin) {
    effectiveWarehouseId = userWarehouseId || "all";
  }

  const [result, canView, canEdit, canMoveToTrash, canDeletePermanently, warehousesRes, users, salesmen] = await Promise.all([
    getSales(page, 10, search, status, { billerId, warehouseId: effectiveWarehouseId !== "all" ? effectiveWarehouseId : undefined, type, startDate, endDate, salesAssistantId }),
    userId ? hasPermission(userId, "sales.sales", "view") : false,
    userId ? hasPermission(userId, "sales.sales", "edit") : false,
    userId ? hasPermission(userId, "sales.sales", "move-to-trash") : false,
    userId ? hasPermission(userId, "sales.sales", "delete-permanently") : false,
    getWarehousesForSale(),
    prisma.user.findMany({ 
      where: { 
        status: "active",
        ...(!isAdmin && userWarehouseId ? { defaultWarehouseId: userWarehouseId } : {})
      }, 
      select: { id: true, name: true, email: true }, 
      orderBy: { name: "asc" } 
    }),
    prisma.employee.findMany({ 
      where: { 
        status: "active",
        employeeType: {
          name: {
            equals: "Salesman",
            mode: "insensitive"
          }
        },
        ...(!isAdmin && userWarehouseId ? { warehouseId: userWarehouseId } : {})
      }, 
      select: { id: true, name: true, email: true }, 
      orderBy: { name: "asc" } 
    }),
  ]);

  if (!result.success) {
    return (
      <PageGuard permissionKey="sales.sales" requiredOperation="view">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold">Sales</h1>
              <p className="text-sm text-muted-foreground">Manage sales in your system</p>
            </div>
          </div>
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
            <p className="text-sm text-destructive">
              {result.error || "Failed to load sales"}
            </p>
          </div>
        </div>
      </PageGuard>
    );
  }

  return (
    <PageGuard permissionKey="sales.sales" requiredOperation="view">
      <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Sales</h1>
          <p className="text-sm text-muted-foreground">Manage sales in your system</p>
        </div>
        {tab !== "trash" && (
          <Button asChild>
            <Link href="/dashboard/sales/pos">
              <FiPlus className="mr-2 h-4 w-4" />
              Add Sale
            </Link>
          </Button>
        )}
      </div>

      <Tabs defaultValue={tab} className="w-full">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <TabsList>
            <TabsTrigger value="all" asChild>
              <Link href="/dashboard/sales?tab=all&page=1">All Sales</Link>
            </TabsTrigger>
            <TabsTrigger value="trash" asChild>
              <Link href="/dashboard/sales?tab=trash&page=1">Trash</Link>
            </TabsTrigger>
          </TabsList>

          {tab !== "trash" && result.summary && (
            <div className="flex flex-wrap items-center gap-3">
              <div className="bg-card text-card-foreground border border-border/80 px-4 py-2 rounded-xl shadow-sm flex flex-col min-w-[120px]">
                <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Total Sales</span>
                <span className="text-sm font-black text-foreground">৳{result.summary.totalSale.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <div className="bg-card text-card-foreground border border-border/80 px-4 py-2 rounded-xl shadow-sm flex flex-col min-w-[100px]">
                <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Customers</span>
                <span className="text-sm font-black text-foreground">{result.summary.totalCustomers}</span>
              </div>
              <div className="bg-card text-card-foreground border border-border/80 px-4 py-2 rounded-xl shadow-sm flex flex-col min-w-[100px]">
                <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Sold Items</span>
                <span className="text-sm font-black text-foreground">{result.summary.totalSoldItems}</span>
              </div>
            </div>
          )}
        </div>
        <TabsContent value="all" className="mt-4">
          <SalesListClient
            initialSales={(result.sales as any) || []}
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
            warehouses={warehousesRes.warehouses || []}
            billers={(users as any) || []}
            salesmen={(salesmen as any) || []}
            isAdmin={isAdmin}
            userWarehouseId={userWarehouseId}
            filters={{
              billerId,
              warehouseId: effectiveWarehouseId,
              type,
              startDate,
              endDate,
              salesAssistantId,
            }}
          />
        </TabsContent>
        <TabsContent value="trash" className="mt-4">
          <SalesListClient
            initialSales={(result.sales as any) || []}
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
            warehouses={warehousesRes.warehouses || []}
            billers={(users as any) || []}
            salesmen={(salesmen as any) || []}
            isAdmin={isAdmin}
            userWarehouseId={userWarehouseId}
            filters={{
              billerId,
              warehouseId: effectiveWarehouseId,
              type,
              startDate,
              endDate,
              salesAssistantId,
            }}
          />
        </TabsContent>
      </Tabs>
    </div>
    </PageGuard>
  );
}
