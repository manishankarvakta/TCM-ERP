import React from "react";
import { getDeliverySchedule } from "@/app/actions/delivery-schedules";
import ScheduleDetailClient from "../_components/schedule-detail-client";
import { notFound } from "next/navigation";

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function ScheduleDetailPage({ params }: PageProps) {
  const { id } = await params;
  const result = await getDeliverySchedule(id);

  if (!result.success || !result.schedule) {
    notFound();
  }

  return <ScheduleDetailClient schedule={result.schedule as any} />;
}
