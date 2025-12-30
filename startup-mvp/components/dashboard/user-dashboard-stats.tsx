"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import { FiDollarSign, FiUsers, FiTrendingUp, FiActivity, FiFileText, FiPackage } from "react-icons/fi";

interface DashboardStats {
  quotations: {
    total: number;
    byStatus: Record<string, number>;
    recent: number;
    pending: number;
  };
  revenue: {
    total: number;
    formatted: string;
  };
  clients: {
    total: number;
    recent: number;
  };
  items: {
    total: number;
    recent: number;
  };
  suppliers: {
    total: number;
  };
  activity: {
    recent: number;
  };
  permissions: {
    canAccessQuotations: boolean;
    canAccessItems: boolean;
    canAccessClients: boolean;
    canAccessSuppliers: boolean;
  };
}

interface UserDashboardStatsProps {
  stats: DashboardStats | null;
}

export default function UserDashboardStats({ stats }: UserDashboardStatsProps) {
  if (!stats) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground animate-pulse bg-muted h-4 w-24 rounded" />
              <div className="h-4 w-4 animate-pulse bg-muted rounded" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold animate-pulse bg-muted h-8 w-20 rounded mb-2" />
              <div className="text-xs text-muted-foreground animate-pulse bg-muted h-3 w-32 rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const statsData = [];

  // Add quotations stat if user has access
  if (stats.permissions.canAccessQuotations) {
    statsData.push({
      title: "Total Quotations",
      value: stats.quotations.total.toLocaleString(),
      change: stats.quotations.recent > 0 ? `+${stats.quotations.recent}` : "0",
      trend: stats.quotations.recent > 0 ? "up" : "neutral",
      description: stats.quotations.recent > 0 
        ? `${stats.quotations.recent} new this week` 
        : "No new quotations",
      icon: FiFileText,
    });

    if (stats.quotations.pending > 0) {
      statsData.push({
        title: "Pending Quotations",
        value: stats.quotations.pending.toLocaleString(),
        change: "",
        trend: "neutral" as const,
        description: "Requires attention",
        icon: FiActivity,
      });
    }

    if (stats.revenue.total > 0) {
      statsData.push({
        title: "Total Revenue",
        value: stats.revenue.formatted,
        change: "",
        trend: "neutral" as const,
        description: "From accepted quotations",
        icon: FiDollarSign,
      });
    }
  }

  // Add clients stat if user has access
  if (stats.permissions.canAccessClients) {
    statsData.push({
      title: "Active Clients",
      value: stats.clients.total.toLocaleString(),
      change: stats.clients.recent > 0 ? `+${stats.clients.recent}` : "0",
      trend: stats.clients.recent > 0 ? "up" : "neutral",
      description: stats.clients.recent > 0 
        ? `${stats.clients.recent} new this week` 
        : "No new clients",
      icon: FiUsers,
    });
  }

  // Add items stat if user has access
  if (stats.permissions.canAccessItems) {
    statsData.push({
      title: "Total Items",
      value: stats.items.total.toLocaleString(),
      change: stats.items.recent > 0 ? `+${stats.items.recent}` : "0",
      trend: stats.items.recent > 0 ? "up" : "neutral",
      description: stats.items.recent > 0 
        ? `${stats.items.recent} new this week` 
        : "No new items",
      icon: FiPackage,
    });
  }

  // Add activity stat (always available)
  if (stats.activity.recent > 0) {
    statsData.push({
      title: "Recent Activity",
      value: stats.activity.recent.toLocaleString(),
      change: "",
      trend: "neutral" as const,
      description: "Actions this week",
      icon: FiTrendingUp,
    });
  }

  // If no stats available, show message
  if (statsData.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground text-center">
            No statistics available. Please contact your administrator to grant access to modules.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {statsData.map((stat) => {
        const Icon = stat.icon;
        const TrendIcon = stat.trend === "up" ? ArrowUpRight : ArrowDownRight;
        const showTrend = stat.trend !== "neutral" && stat.change;
        
        return (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              {showTrend && (
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
                  <span
                    className={`flex items-center gap-0.5 font-medium ${
                      stat.trend === "up"
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-red-600 dark:text-red-400"
                    }`}
                  >
                    <TrendIcon className="h-3 w-3" />
                    {stat.change}
                  </span>
                  <span className="text-muted-foreground">{stat.description}</span>
                </p>
              )}
              {!showTrend && (
                <p className="text-xs text-muted-foreground mt-1">
                  {stat.description}
                </p>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
