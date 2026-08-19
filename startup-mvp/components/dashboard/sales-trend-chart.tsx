"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatCompactCurrency } from "@/lib/utils";
import { FiTrendingUp } from "react-icons/fi";
import {
  ComposedChart,
  Area,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface TrendData {
  month: string;
  revenue: number;
  quotations: number;
}

interface SalesTrendChartProps {
  trends: TrendData[];
}

export default function SalesTrendChart({ trends }: SalesTrendChartProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Card className="col-span-full lg:col-span-5 h-[400px]">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Sales & Quotations Trend</CardTitle>
          <CardDescription>Monthly revenue and quotation counts</CardDescription>
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

  if (trends.length === 0) {
    return (
      <Card className="col-span-full lg:col-span-5 h-[400px]">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Sales & Quotations Trend</CardTitle>
          <CardDescription>Monthly revenue and quotation counts</CardDescription>
        </CardHeader>
        <CardContent className="h-[280px] flex items-center justify-center text-sm text-muted-foreground italic">
          No historical trend data found
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="col-span-full lg:col-span-5 shadow-sm border border-border/50">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <FiTrendingUp className="h-4 w-4 text-indigo-500" />
              Sales & Quotations Trend
            </CardTitle>
            <CardDescription className="text-sm">
              Monthly overview of accepted quotation values vs. total requests
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="h-[320px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={trends}
            margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
          >
            <defs>
              <linearGradient id="colorRevenueTrend" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.25} />
                <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              className="stroke-muted/60 dark:stroke-muted/20"
            />
            <XAxis
              dataKey="month"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, className: "fill-muted-foreground" }}
              dy={10}
            />
            {/* Left Y Axis for Revenue */}
            <YAxis
              yAxisId="left"
              axisLine={false}
              tickLine={false}
              tickFormatter={(value) => formatCompactCurrency(value)}
              tick={{ fontSize: 11, className: "fill-muted-foreground" }}
            />
            {/* Right Y Axis for Quotations */}
            <YAxis
              yAxisId="right"
              orientation="right"
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
              tick={{ fontSize: 11, className: "fill-muted-foreground" }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                borderColor: "hsl(var(--border))",
                borderRadius: "var(--radius)",
                color: "hsl(var(--foreground))",
                boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
              }}
              formatter={(value: any, name: string) => {
                if (name === "revenue") return [formatCurrency(Number(value)), "Revenue"];
                return [value, "Quotations"];
              }}
              labelStyle={{ fontWeight: "semibold", marginBottom: "4px", className: "text-foreground" }}
            />
            <Legend
              verticalAlign="top"
              height={36}
              iconSize={8}
              iconType="circle"
              wrapperStyle={{ fontSize: "12px", paddingTop: "0px" }}
              formatter={(value) => (value === "revenue" ? "Revenue (BDT)" : "Quotations Count")}
            />
            <Area
              yAxisId="left"
              type="monotone"
              dataKey="revenue"
              fill="url(#colorRevenueTrend)"
              stroke="hsl(var(--chart-1))"
              strokeWidth={2}
            />
            <Bar
              yAxisId="right"
              dataKey="quotations"
              fill="hsl(var(--chart-2))"
              radius={[4, 4, 0, 0]}
              barSize={20}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
