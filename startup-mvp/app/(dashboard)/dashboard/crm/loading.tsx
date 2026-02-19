"use client";

import { usePathname } from "next/navigation";
import { TableSkeleton, KanbanSkeleton, DetailSkeleton } from "@/components/crm/skeletons";

export default function CRMLoading() {
  const pathname = usePathname();

  // Determine which skeleton to show based on the route
  if (pathname.includes("/opportunities") && !pathname.includes("/opportunities/")) { 
    // Exact match for opportunities list (Kanban) or just opportunities main page
    // Note: pathname includes allows for /opportunities?view=list etc to catch generic loading
    // But specific logic: if ID is present (detail page), show detail skeleton.
    // Simple heuristic: if segments > 4 (dashboard/crm/opportunities/[id]), it's detailed.
    const segments = pathname.split("/").filter(Boolean);
    if (segments.length > 3) { // dashboard, crm, opportunities, [id]
         return <DetailSkeleton />;
    }
    return <KanbanSkeleton />;
  }

  if (pathname.includes("/leads") || pathname.includes("/contacts") || pathname.includes("/clients")) {
    const segments = pathname.split("/").filter(Boolean);
    // dashboard / crm / leads / [id] -> length 4
    if (segments.length > 3) {
        return <DetailSkeleton />;
    }
    return <TableSkeleton />;
  }

  // Default fallback
  return <TableSkeleton />;
}
