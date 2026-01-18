import React from "react";
import { getWorkOrders } from "@/app/actions/work-orders";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";
import { FiPlus } from "react-icons/fi";
import WorkOrdersListClient from "@/components/work-order/work-orders-list-client";

interface WorkOrdersPageProps {
  searchParams: Promise<{
    page?: string;
    search?: string;
    tab?: string;
  }>;
}

export default async function WorkOrdersPage({ searchParams }: WorkOrdersPageProps) {
  const params = await searchParams;
  const page = parseInt(params.page || "1", 10);
  const search = params.search || "";
  const tab = params.tab || "all";

  const result = await getWorkOrders(page, 10, search, tab);

  if (!result.success) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Work Orders</h1>
            <p className="text-sm text-muted-foreground">Manage work orders in your system</p>
          </div>
        </div>
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
          <p className="text-sm text-destructive">
            {result.error || "Error loading work orders"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Work Orders</h1>
          <p className="text-sm text-muted-foreground">Manage work orders in your system</p>
        </div>
        {tab !== "trash" && (
          <Button asChild>
            <Link href="/admin/work-orders/new">
              <FiPlus className="mr-2 h-4 w-4" />
              New Work Order
            </Link>
          </Button>
        )}
      </div>

      <Tabs defaultValue={tab} className="w-full">
        <TabsList>
          <TabsTrigger value="all" asChild>
            <Link href="/admin/work-orders?tab=all&page=1">All</Link>
          </TabsTrigger>
          <TabsTrigger value="PROGRESS" asChild>
            <Link href="/admin/work-orders?tab=PROGRESS&page=1">Progress</Link>
          </TabsTrigger>
          <TabsTrigger value="COMPLETE" asChild>
            <Link href="/admin/work-orders?tab=COMPLETE&page=1">Complete</Link>
          </TabsTrigger>
          <TabsTrigger value="CANCELED" asChild>
            <Link href="/admin/work-orders?tab=CANCELED&page=1">Canceled</Link>
          </TabsTrigger>
          <TabsTrigger value="HOLD" asChild>
            <Link href="/admin/work-orders?tab=HOLD&page=1">Hold</Link>
          </TabsTrigger>
          <TabsTrigger value="trash" asChild>
            <Link href="/admin/work-orders?tab=trash&page=1">Trash</Link>
          </TabsTrigger>
        </TabsList>
        <TabsContent value="all" className="mt-4">
          <WorkOrdersListClient
            initialWorkOrders={result.workOrders || []}
            initialPagination={result.pagination || {
              page: 1,
              limit: 10,
              total: 0,
              totalPages: 0,
            }}
            initialSearch={search}
            isTrash={false}
          />
        </TabsContent>
        <TabsContent value="PROGRESS" className="mt-4">
          <WorkOrdersListClient
            initialWorkOrders={result.workOrders || []}
            initialPagination={result.pagination || {
              page: 1,
              limit: 10,
              total: 0,
              totalPages: 0,
            }}
            initialSearch={search}
            isTrash={false}
          />
        </TabsContent>
        <TabsContent value="COMPLETE" className="mt-4">
          <WorkOrdersListClient
            initialWorkOrders={result.workOrders || []}
            initialPagination={result.pagination || {
              page: 1,
              limit: 10,
              total: 0,
              totalPages: 0,
            }}
            initialSearch={search}
            isTrash={false}
          />
        </TabsContent>
        <TabsContent value="CANCELED" className="mt-4">
          <WorkOrdersListClient
            initialWorkOrders={result.workOrders || []}
            initialPagination={result.pagination || {
              page: 1,
              limit: 10,
              total: 0,
              totalPages: 0,
            }}
            initialSearch={search}
            isTrash={false}
          />
        </TabsContent>
        <TabsContent value="HOLD" className="mt-4">
          <WorkOrdersListClient
            initialWorkOrders={result.workOrders || []}
            initialPagination={result.pagination || {
              page: 1,
              limit: 10,
              total: 0,
              totalPages: 0,
            }}
            initialSearch={search}
            isTrash={false}
          />
        </TabsContent>
        <TabsContent value="trash" className="mt-4">
          <WorkOrdersListClient
            initialWorkOrders={result.workOrders || []}
            initialPagination={result.pagination || {
              page: 1,
              limit: 10,
              total: 0,
              totalPages: 0,
            }}
            initialSearch={search}
            isTrash={true}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

