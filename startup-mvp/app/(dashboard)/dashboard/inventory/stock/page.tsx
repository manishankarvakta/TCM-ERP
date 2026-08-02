import { getStocks, getActiveItems, getActiveWarehouses, getStockSummaryMetrics } from "./_actions/stock.action";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { FiPlus, FiPackage } from "react-icons/fi";
import StocksListClient from "./_components/stocks";
import ExportStockButton from "./_components/ExportStockButton";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import PageGuard from "@/components/permissions/page-guard";

interface StockPageProps {
  searchParams: Promise<{
    page?: string;
    search?: string;
    itemId?: string;
    warehouseId?: string;
    limit?: string;
  }>;
}

export default async function StockPage({ searchParams }: StockPageProps) {
  const params = await searchParams;
  const page = parseInt(params.page || "1");
  const limit = parseInt(params.limit || "20");
  const search = params.search || "";
  const itemId = params.itemId;
  const warehouseId = params.warehouseId;

  const session = await auth();
  const userId = session?.user?.id;

  let isNormalUser = false;
  let defaultWarehouseId = null;

  if (userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, defaultWarehouseId: true }
    });
    
    if (user && user.role !== "admin") {
      isNormalUser = true;
      defaultWarehouseId = user.defaultWarehouseId;
    }
  }

  // Override warehouseId for normal user
  let finalWarehouseId = warehouseId;
  if (isNormalUser && defaultWarehouseId) {
    finalWarehouseId = defaultWarehouseId;
  }

  // Check permissions and fetch data
  const [result, itemsResult, warehousesResult, canView, canAdjust, metricsResult] = await Promise.all([
    getStocks(page, limit, {
      itemId,
      warehouseId: finalWarehouseId,
      search,
    }),
    getActiveItems(),
    getActiveWarehouses(),
    userId ? hasPermission(userId, "inventory.stock", "view") : false,
    userId ? hasPermission(userId, "inventory.stock", "adjust") : false,
    getStockSummaryMetrics({
      itemId,
      warehouseId: finalWarehouseId,
      search,
    }),
  ]);

  // Handle errors
  if (!result.success) {
    return (
      <PageGuard permissionKey="inventory.stock" requiredOperation="view">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold">Stock</h1>
              <p className="text-sm text-muted-foreground">View and manage inventory stock</p>
            </div>
          </div>
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
            <p className="text-sm text-destructive">
              {result.error || "Failed to load stock"}
            </p>
          </div>
        </div>
      </PageGuard>
    );
  }

  const totalQuantity = metricsResult?.success ? metricsResult.totalQuantity : 0;
  const totalValue = metricsResult?.success ? metricsResult.totalValue : 0;

  return (
    <PageGuard permissionKey="inventory.stock" requiredOperation="view">
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Stock</h1>
            <p className="text-sm text-muted-foreground">View and manage inventory stock</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-4">
            {/* Total Stock Quantity Card */}
            <div className="bg-blue-50/70 dark:bg-blue-950/25 border border-blue-100/80 dark:border-blue-900/40 rounded-lg px-4 h-12 flex items-center gap-3 shadow-sm hover:shadow-md transition-all duration-300">
              <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-blue-500/10 text-blue-600 dark:text-blue-400">
                <FiPackage className="h-4 w-4" />
              </div>
              <div>
                <p className="text-[9px] uppercase font-bold tracking-wider text-blue-600/80 dark:text-blue-400/80 leading-none mb-0.5">Total Stock</p>
                <p className="text-sm font-semibold font-mono text-blue-700 dark:text-blue-300 leading-none">
                  {totalQuantity.toLocaleString()}
                </p>
              </div>
            </div>

            {/* Total Stock Value Card */}
            <div className="bg-emerald-50/70 dark:bg-emerald-950/25 border border-emerald-100/80 dark:border-emerald-900/40 rounded-lg px-4 h-12 flex items-center gap-3 shadow-sm hover:shadow-md transition-all duration-300">
              <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <span className="text-sm font-bold leading-none">৳</span>
              </div>
              <div>
                <p className="text-[9px] uppercase font-bold tracking-wider text-emerald-600/80 dark:text-emerald-400/80 leading-none mb-0.5">Stock Value</p>
                <p className="text-sm font-semibold font-mono text-emerald-700 dark:text-emerald-300 leading-none">
                  ৳{totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
            </div>

            <ExportStockButton search={search} itemId={itemId} warehouseId={finalWarehouseId} />
            {canAdjust && (
              <Button asChild>
                <Link href="/dashboard/inventory/stock/adjust">
                  <FiPlus className="mr-2 h-4 w-4" />
                  Adjust Stock
                </Link>
              </Button>
            )}
          </div>
        </div>

        <StocksListClient
          initialStocks={(result.stocks as any) || []}
          initialPagination={result.pagination || {
            page: 1,
            limit: 20,
            total: 0,
            totalPages: 0,
          }}
          initialSearch={search}
          initialItemId={itemId}
          initialWarehouseId={finalWarehouseId}
          items={itemsResult.success ? itemsResult.items || [] : []}
          warehouses={warehousesResult.success ? warehousesResult.warehouses || [] : []}
          isNormalUser={isNormalUser}
        />
      </div>
    </PageGuard>
  );
}
