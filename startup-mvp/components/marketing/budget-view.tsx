"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  FiCreditCard,
  FiDollarSign,
  FiTrendingUp,
  FiPieChart,
  FiRefreshCw,
  FiPlus,
  FiChevronRight,
  FiLayers,
} from "react-icons/fi";

export default function BudgetView() {
  const [period, setPeriod] = useState("quarter");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const budgetAllocations = [
    { channel: "Paid Search (Google Ads)", totalBudget: "৳1,50,000", spent: "৳1,10,000", remaining: "৳40,000", utilization: 73.3 },
    { channel: "Paid Social (Meta Ads)", totalBudget: "৳1,20,000", spent: "৳85,000", remaining: "৳35,000", utilization: 70.8 },
    { channel: "LinkedIn B2B Advertising", totalBudget: "৳80,000", spent: "৳55,000", remaining: "৳25,000", utilization: 68.7 },
    { channel: "Email & SMS Marketing", totalBudget: "৳40,000", spent: "৳28,000", remaining: "৳12,000", utilization: 70.0 },
    { channel: "Content & SEO Tools", totalBudget: "৳35,000", spent: "৳32,000", remaining: "৳3,000", utilization: 91.4 },
    { channel: "Event Sponsorships", totalBudget: "৳75,000", spent: "৳40,000", remaining: "৳35,000", utilization: 53.3 },
  ];

  return (
    <div className="flex-1 space-y-6 max-w-[1600px] mx-auto text-foreground">
      {/* 1. TOP HEADER & CONTROLS */}
      <div className="p-4 sm:p-5 rounded-2xl border border-border/50 bg-card/60 backdrop-blur-md shadow-xs flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
              Campaign Budget Allocation
            </h1>
            <Badge variant="outline" className="text-[11px] font-medium px-2.5 py-0.5 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/5">
              Financial Spend Limits
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Channel-wise budget caps, spend tracking & cap enforcement
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="h-8 text-xs w-[120px] border-border/50 bg-background/50">
              <SelectValue placeholder="Period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="quarter">This Quarter</SelectItem>
              <SelectItem value="year">This Year</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground border-border/50"
            onClick={handleRefresh}
            title="Refresh"
          >
            <FiRefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin text-primary" : ""}`} />
          </Button>

          <Button size="sm" className="h-8 text-xs font-semibold px-3 shadow-xs" onClick={() => alert("Budget allocation updated.")}>
            <FiCreditCard className="mr-1.5 h-3.5 w-3.5" />
            Set Budget Cap
          </Button>
        </div>
      </div>

      {/* 2. SUMMARY CARDS */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-4 lg:grid-cols-4">
        <div className="p-4 rounded-xl border border-border/50 bg-card shadow-2xs space-y-1">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block">Total Marketing Budget</span>
          <div className="text-2xl font-extrabold text-foreground">৳5,00,000</div>
          <span className="text-[10px] text-muted-foreground">Q3 Allocated Budget</span>
        </div>
        <div className="p-4 rounded-xl border border-border/50 bg-card shadow-2xs space-y-1">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block">Total Spent (MTD)</span>
          <div className="text-2xl font-extrabold text-amber-500">৳3,50,000</div>
          <span className="text-[10px] text-amber-500 font-medium">70.0% of total budget</span>
        </div>
        <div className="p-4 rounded-xl border border-border/50 bg-card shadow-2xs space-y-1">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block">Remaining Pool</span>
          <div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">৳1,50,000</div>
          <span className="text-[10px] text-emerald-500 font-semibold">Available for Q3</span>
        </div>
        <div className="p-4 rounded-xl border border-border/50 bg-card shadow-2xs space-y-1">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block">Avg Burn Rate</span>
          <div className="text-2xl font-extrabold text-indigo-500">৳5,833 / day</div>
          <span className="text-[10px] text-muted-foreground">On target</span>
        </div>
      </div>

      {/* 3. BUDGET ALLOCATION TABLE */}
      <div className="rounded-2xl border border-border/50 bg-card p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-border/40 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-emerald-500/10 text-emerald-500">
              <FiDollarSign className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground">Channel-wise Budget Breakdown</h2>
              <p className="text-xs text-muted-foreground">Allocated caps vs actual spend across marketing channels</p>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          {budgetAllocations.map((item) => (
            <div key={item.channel} className="p-3.5 rounded-xl border border-border/40 bg-background/50 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-foreground">{item.channel}</span>
                <span className="font-bold text-foreground font-mono">{item.spent} / {item.totalBudget}</span>
              </div>
              <Progress value={item.utilization} className="h-1.5" />
              <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-0.5">
                <span>Remaining: <span className="font-mono text-emerald-500 font-semibold">{item.remaining}</span></span>
                <span className="font-mono text-foreground">{item.utilization}% Utilized</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
