import React from "react";
import { getOrders } from "@/app/actions/orders";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";
import { FiPlus } from "react-icons/fi";
import OrdersListClient from "./_components/orders-list-client";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";

interface OrdersPageProps {
  searchParams: Promise<{
    page?: string;
    search?: string;
    tab?: string;
  }>;
}

export default async function OrdersPage({ searchParams }: OrdersPageProps) {
  const params = await searchParams;
  const page = parseInt(params.page || "1", 10);
  const search = params.search || "";
  const tab = params.tab || "all";

  const session = await auth();
  const userId = session?.user?.id;

  // Check permissions parallely with data fetching
  const [result, canView, canCreate] = await Promise.all([
    getOrders(page, 10, search, tab),
    userId ? hasPermission(userId, "quotations.orders", "view") : false,
    userId ? hasPermission(userId, "quotations.orders", "create") : false,
  ]);

  if (!result.success) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Orders</h1>
            <p className="text-sm text-muted-foreground">Manage customer orders and fulfillment</p>
          </div>
        </div>
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
          <p className="text-sm text-destructive">
            {result.error || "Error loading orders"}
          </p>
        </div>
      </div>
    );
  }

  // Permission Guard for the whole page if needed, but we'll render restricted view
  if (!canView) {
      return (
        <div className="flex h-[50vh] items-center justify-center">
            <div className="text-center">
                <h2 className="text-xl font-semibold text-destructive">Access Denied</h2>
                <p className="text-muted-foreground">You do not have permission to view orders.</p>
            </div>
        </div>
      );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Orders</h1>
          <p className="text-sm text-muted-foreground">Manage customer orders and fulfillment</p>
        </div>
        {canCreate && (
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href="/dashboard/quotations">
                New Order (from Quote)
              </Link>
            </Button>
            <Button asChild>
              <Link href="/dashboard/quotations/orders/new">
                <FiPlus className="mr-2 h-4 w-4" />
                New Direct Order
              </Link>
            </Button>
          </div>
        )}
      </div>

      <Tabs defaultValue={tab} className="w-full">
        <TabsList>
          <TabsTrigger value="all" asChild>
            <Link href="/dashboard/quotations/orders?tab=all&page=1">All Orders</Link>
          </TabsTrigger>
          <TabsTrigger value="pending" asChild>
            <Link href="/dashboard/quotations/orders?tab=pending&page=1">Pending</Link>
          </TabsTrigger>
          <TabsTrigger value="processing" asChild>
            <Link href="/dashboard/quotations/orders?tab=processing&page=1">Processing</Link>
          </TabsTrigger>
          <TabsTrigger value="delivered" asChild>
            <Link href="/dashboard/quotations/orders?tab=delivered&page=1">Delivered</Link>
          </TabsTrigger>
          <TabsTrigger value="completed" asChild>
            <Link href="/dashboard/quotations/orders?tab=completed&page=1">Completed</Link>
          </TabsTrigger>
          <TabsTrigger value="cancelled" asChild>
            <Link href="/dashboard/quotations/orders?tab=cancelled&page=1">Cancelled</Link>
          </TabsTrigger>
        </TabsList>
        <TabsContent value={tab} className="mt-4">
          <OrdersListClient
            initialOrders={result.orders?.map(order => ({
                ...order,
                totalValue: Number(order.totalValue)
            })) || []}
            initialPagination={result.pagination || {
              page: 1,
              limit: 10,
              total: 0,
              totalPages: 0,
            }}
            initialSearch={search}
            permissions={{
                view: canView,
                create: canCreate
            }}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
