"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FiUsers, FiPackage, FiShoppingBag, FiTruck, FiLayers, FiFileText } from "react-icons/fi";

interface DashboardStats {
  clients: {
    total: number;
    recent: number;
  };
  users: {
    total: number;
    admin: number;
    regular: number;
  };
  categories: {
    total: number;
  };
  suppliers: {
    total: number;
  };
  files: {
    total: number;
  };
}

interface AdminDashboardStatsProps {
  stats: DashboardStats | null;
}

export default function AdminDashboardStats({ stats }: AdminDashboardStatsProps) {
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

  const statsData = [
    {
      title: "Total Clients",
      value: stats.clients.total.toLocaleString(),
      description: `${stats.clients.recent} new this week`,
      icon: FiUsers,
      color: "text-blue-600",
      bgColor: "bg-blue-100 dark:bg-blue-900/20"
    },
    {
      title: "Active Suppliers",
      value: stats.suppliers.total.toLocaleString(),
      description: "Vendors & Partners",
      icon: FiTruck,
      color: "text-orange-600",
      bgColor: "bg-orange-100 dark:bg-orange-900/20"
    },
    {
      title: "Total Users",
      value: stats.users.total.toLocaleString(),
      description: `${stats.users.admin} Admins, ${stats.users.regular} Staff`,
      icon: FiUsers,
      color: "text-emerald-600",
      bgColor: "bg-emerald-100 dark:bg-emerald-900/20"
    },
    {
      title: "Item Categories",
      value: stats.categories.total.toLocaleString(),
      description: "Menu & Inventory Groups",
      icon: FiLayers,
      color: "text-purple-600",
      bgColor: "bg-purple-100 dark:bg-purple-900/20"
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {statsData.map((stat) => {
        const Icon = stat.icon;
        
        return (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {stat.title}
              </CardTitle>
              <div className={`p-1.5 rounded-md ${stat.bgColor}`}>
                <Icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-black">{stat.value}</div>
              <p className="text-xs text-muted-foreground mt-1 font-medium">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
