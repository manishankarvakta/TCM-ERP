import React from "react";
import { getDeliverySchedules } from "@/app/actions/delivery-schedules";
import ScheduleListClient from "./_components/schedule-list-client";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { FiPlus } from "react-icons/fi";

interface DeliverySchedulePageProps {
  searchParams: Promise<{
    page?: string;
    search?: string;
    status?: string;
  }>;
}

export default async function DeliverySchedulePage({ searchParams }: DeliverySchedulePageProps) {
  const params = await searchParams;
  const page = parseInt(params.page || "1", 10);
  const search = params.search || "";
  const status = params.status || "all";

  const result = await getDeliverySchedules(page, 15, search, status);

  if (!result.success) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto p-6">
        <h1 className="text-2xl font-bold">Delivery Schedules</h1>
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
          <p className="text-sm text-destructive">
            {result.error || "Error loading schedules"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Delivery Schedules</h1>
          <p className="text-sm text-muted-foreground">
             View and manage planned fulfillment events.
          </p>
        </div>
      </div>

      <ScheduleListClient
        initialSchedules={(result.schedules as any) || []}
        initialPagination={result.pagination || {
          page: 1,
          limit: 15,
          total: 0,
          totalPages: 0,
        }}
        initialSearch={search}
        initialStatus={status}
      />
    </div>
  );
}
