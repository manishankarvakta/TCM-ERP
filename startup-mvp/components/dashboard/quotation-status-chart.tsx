"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

interface StatusBreakdown {
  status: string;
  count: number;
}

interface QuotationStatusChartProps {
  breakdown: StatusBreakdown[];
}

const statusConfig: Record<string, { label: string; color: string; hex: string }> = {
  DRAFT: { label: "Draft", color: "bg-gray-500", hex: "#6b7280" },
  SENT: { label: "Sent", color: "bg-blue-500", hex: "#3b82f6" },
  ACCEPTED: { label: "Accepted", color: "bg-green-500", hex: "#10b981" },
  REJECTED: { label: "Rejected", color: "bg-red-500", hex: "#ef4444" },
  EXPIRED: { label: "Expired", color: "bg-yellow-500", hex: "#f59e0b" },
  REVISED: { label: "Revised", color: "bg-purple-500", hex: "#8b5cf6" },
};

export default function QuotationStatusChart({ breakdown }: QuotationStatusChartProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Card className="col-span-full lg:col-span-2 h-[400px]">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Quotation Status</CardTitle>
          <CardDescription>Distribution of quotations by status</CardDescription>
        </CardHeader>
        <CardContent className="h-[280px] flex items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="text-xs text-muted-foreground">Loading chart...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (breakdown.length === 0) {
    return (
      <Card className="col-span-full lg:col-span-2 h-[400px]">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Quotation Status</CardTitle>
          <CardDescription>Distribution of quotations by status</CardDescription>
        </CardHeader>
        <CardContent className="h-[280px] flex items-center justify-center text-sm text-muted-foreground italic">
          No quotations found
        </CardContent>
      </Card>
    );
  }

  const total = breakdown.reduce((sum, item) => sum + item.count, 0);

  // Prepare data for Recharts Pie Chart
  const chartData = breakdown.map((item) => {
    const config = statusConfig[item.status] || { label: item.status, hex: "#94a3b8" };
    return {
      name: config.label,
      value: item.count,
      color: config.hex,
      status: item.status,
    };
  });

  return (
    <Card className="col-span-full lg:col-span-2 shadow-sm border border-border/50 flex flex-col justify-between h-[400px]">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">Quotation Status</CardTitle>
        <CardDescription className="text-sm">
          Distribution of {total} quotation{total !== 1 ? "s" : ""} by current status
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col justify-center pb-6">
        <div className="h-[200px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={4}
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  borderColor: "hsl(var(--border))",
                  borderRadius: "var(--radius)",
                  color: "hsl(var(--foreground))",
                  boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                }}
                formatter={(value: any) => {
                  const percent = total > 0 ? Math.round((Number(value) / total) * 100) : 0;
                  return [`${value} (${percent}%)`, "Count"];
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        
        {/* Render a custom, responsive legend/grid showing labels, counts & percentages */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs mt-2 px-2">
          {chartData.map((item) => {
            const percent = total > 0 ? Math.round((item.value / total) * 100) : 0;
            return (
              <div key={item.name} className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 min-w-0">
                  <div
                    className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="font-medium truncate text-muted-foreground">{item.name}</span>
                </div>
                <span className="font-semibold text-foreground ml-2">
                  {item.value} <span className="text-[10px] text-muted-foreground font-normal">({percent}%)</span>
                </span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
