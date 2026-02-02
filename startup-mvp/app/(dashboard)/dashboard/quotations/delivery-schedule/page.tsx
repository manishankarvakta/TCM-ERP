
import React from "react";
import { getDeliveries } from "@/app/actions/deliveries";
import DeliveryListClient from "./_components/delivery-list-client";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";

interface DeliverySchedulePageProps {
  searchParams: Promise<{
    page?: string;
    search?: string;
  }>;
}

export default async function DeliverySchedulePage({ searchParams }: DeliverySchedulePageProps) {
  const params = await searchParams;
  const page = parseInt(params.page || "1", 10);
  const search = params.search || "";

  const session = await auth();
  const userId = session?.user?.id;

  const canView = userId ? await hasPermission(userId, "quotations.orders", "view") : false;

  if (!canView) {
      return <div className="p-8 text-center text-destructive">Access Denied</div>;
  }

  const result = await getDeliveries(page, 20, search);

  if (!result.success) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold">Delivery Schedule</h1>
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
          <p className="text-sm text-destructive">
            {result.error || "Error loading deliveries"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Delivery Schedule</h1>
          <p className="text-sm text-muted-foreground">Manage and track all deliveries</p>
        </div>
      </div>

      <DeliveryListClient
        initialDeliveries={result.deliveries || []}
        initialPagination={result.pagination || {
          page: 1,
          limit: 20,
          total: 0,
          totalPages: 0,
        }}
        initialSearch={search}
      />
    </div>
  );
}
