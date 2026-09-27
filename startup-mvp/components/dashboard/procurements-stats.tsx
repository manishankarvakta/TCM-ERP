"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FiShoppingCart, FiBox, FiRotateCcw, FiTruck } from "react-icons/fi";

export interface ProcurementStats {
  purchases: {
    total: number;
    pending: number;
    completed: number;
    totalValue?: number;
  };
  grns: {
    total: number;
    totalValue?: number;
  };
  rtvs: {
    total: number;
    totalValue?: number;
  };
  tpns: {
    total: number;
    totalValue?: number;
  };
}

interface ProcurementsStatsProps {
  stats: ProcurementStats | null;
}

export default function ProcurementsStats({ stats }: ProcurementsStatsProps) {
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

  const formatCurrency = (amount: number) => {
    return `৳${amount.toLocaleString("en-BD", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const statsData = [
    {
      title: "Total Purchases",
      value: stats.purchases.total.toLocaleString(),
      description: `${stats.purchases.pending} pending, ${stats.purchases.completed} completed`,
      totalValue: stats.purchases.totalValue,
      icon: FiShoppingCart,
    },
    {
      title: "Total GRNs",
      value: stats.grns.total.toLocaleString(),
      description: "Goods Receipt Notes",
      totalValue: stats.grns.totalValue,
      icon: FiBox,
    },
    {
      title: "Return To Vendor",
      value: stats.rtvs.total.toLocaleString(),
      description: "Total RTVs processed",
      totalValue: stats.rtvs.totalValue,
      icon: FiRotateCcw,
    },
    {
      title: "Transfer Purchases",
      value: stats.tpns.total.toLocaleString(),
      description: "Total TPNs",
      totalValue: stats.tpns.totalValue,
      icon: FiTruck,
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {statsData.map((stat) => {
        const Icon = stat.icon;
        
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
              <div className="flex items-center justify-between gap-2 mt-2 pt-1 border-t border-border/40">
                <p className="text-xs text-muted-foreground truncate">
                  {stat.description}
                </p>
                {stat.totalValue !== undefined && (
                  <span className="text-xs font-bold font-mono text-foreground bg-muted/70 dark:bg-muted/40 px-2 py-0.5 rounded border border-border/60 shrink-0">
                    {formatCurrency(stat.totalValue)}
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
