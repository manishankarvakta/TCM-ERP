"use client";

import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Lock, ShieldAlert } from "lucide-react";

export default function DashboardAccessDenied() {
  return (
    <div className="w-full space-y-6 p-4 md:p-6">
      {/* Top Stat Cards Skeleton Row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-xl border bg-card/60 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-6 w-6 rounded-md" />
            </div>
            <Skeleton className="h-7 w-32" />
          </div>
        ))}
      </div>

      {/* Main Skeleton Section Container with Text Inside */}
      <div className="rounded-2xl border bg-card/60 p-6 md:p-8 space-y-6">
        {/* Top Header Controls Skeleton */}
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-40 rounded-md" />
          <Skeleton className="h-8 w-24 rounded-md" />
        </div>

        {/* Main Content Skeleton Area containing Access Denied Text & Icons */}
        <div className="flex min-h-[340px] flex-col items-center justify-center rounded-xl bg-muted/40 p-8 text-center border border-dashed border-border/60 space-y-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/10 text-red-500 ring-4 ring-red-500/5">
            <ShieldAlert className="h-8 w-8" />
          </div>

          <div className="space-y-1.5 max-w-md">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400">
              <Lock className="h-3 w-3" />
              Access Denied
            </div>
            <h3 className="text-xl font-bold tracking-tight text-foreground">
              Dashboard View Restricted
            </h3>
            <p className="text-sm text-muted-foreground">
              You do not have permission to access the Dashboard.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
