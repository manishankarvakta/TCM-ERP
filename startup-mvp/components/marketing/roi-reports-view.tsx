"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  FiBarChart,
  FiTrendingUp,
  FiDollarSign,
  FiRefreshCw,
  FiPrinter,
  FiDownload,
} from "react-icons/fi";

export default function RoiReportsView() {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const roiSummary = [
    { metric: "Total Ad Spend", amount: "৳1,45,000", detail: "MTD Marketing Spend", color: "text-foreground" },
    { metric: "Attributed Revenue", amount: "৳4,95,000", detail: "Closed Won Revenue", color: "text-emerald-500 font-bold" },
    { metric: "Gross Marketing ROI", amount: "3.41x", detail: "Return On Ad Spend (ROAS)", color: "text-emerald-600 font-extrabold" },
    { metric: "Customer Acquisition Cost", amount: "৳8,055", detail: "CAC per Won Client", color: "text-blue-500 font-bold" },
  ];

  return (
    <div className="flex-1 space-y-6 max-w-[1600px] mx-auto text-foreground">
      {/* 1. TOP HEADER & CONTROLS */}
      <div className="p-4 sm:p-5 rounded-2xl border border-border/50 bg-card/60 backdrop-blur-md shadow-xs flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
              Marketing ROI & Performance Intelligence
            </h1>
            <Badge variant="outline" className="text-[11px] font-medium px-2.5 py-0.5 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/5">
              Marketing BI Reports
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Omnichannel Marketing Return on Ad Spend (ROAS), Customer Acquisition Cost (CAC) & Revenue BI
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground border-border/50"
            onClick={handleRefresh}
            title="Refresh"
          >
            <FiRefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin text-primary" : ""}`} />
          </Button>

          <Button variant="outline" size="sm" className="h-8 text-xs font-semibold px-3" onClick={() => window.print()}>
            <FiPrinter className="mr-1.5 h-3.5 w-3.5" /> Print
          </Button>
          <Button size="sm" className="h-8 text-xs font-semibold px-3 shadow-xs" onClick={() => alert("Report downloaded.")}>
            <FiDownload className="mr-1.5 h-3.5 w-3.5" /> Export PDF
          </Button>
        </div>
      </div>

      {/* 2. SUMMARY GRID */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-4 lg:grid-cols-4">
        {roiSummary.map((item) => (
          <div key={item.metric} className="p-4 rounded-xl border border-border/50 bg-card shadow-2xs space-y-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block">{item.metric}</span>
            <div className={`text-2xl font-extrabold tracking-tight ${item.color}`}>{item.amount}</div>
            <span className="text-[10px] text-muted-foreground block">{item.detail}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
