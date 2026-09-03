"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  FiDollarSign,
  FiTrendingUp,
  FiBarChart,
  FiPlus,
  FiRefreshCw,
  FiSearch,
} from "react-icons/fi";
import { recordPerformanceSnapshot } from "@/app/actions/crm/marketing-operations.action";

export default function PaidAdsView() {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const adAccounts = [
    { platform: "Google Ads (Search & GDN)", impressions: "245,000", clicks: "12,400", ctr: "5.06%", spend: "৳65,000", cpc: "৳5.24", cpl: "৳1,203", status: "Active" },
    { platform: "Meta Ads (Facebook & Instagram)", impressions: "180,000", clicks: "8,900", ctr: "4.94%", spend: "৳45,000", cpc: "৳5.05", cpl: "৳1,250", status: "Active" },
    { platform: "LinkedIn B2B Sponsored Content", impressions: "42,000", clicks: "2,100", ctr: "5.00%", spend: "৳35,000", cpc: "৳16.66", cpl: "৳1,590", status: "Active" },
  ];

  return (
    <div className="flex-1 space-y-6 max-w-[1600px] mx-auto text-foreground">
      {/* 1. TOP HEADER & CONTROLS */}
      <div className="p-4 sm:p-5 rounded-2xl border border-border/50 bg-card/60 backdrop-blur-md shadow-xs flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
              Paid Advertising & PPC Performance
            </h1>
            <Badge variant="outline" className="text-[11px] font-medium px-2.5 py-0.5 border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/5">
              Internal PPC & Ad Performance Tracking
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Google Ads, Meta Ads & LinkedIn Sponsored Content performance tracking & CPC/CPL optimization
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

          <Button size="sm" className="h-8 text-xs font-semibold px-3 shadow-xs" onClick={() => alert("Record performance snapshot opened.")}>
            <FiPlus className="mr-1.5 h-3.5 w-3.5" />
            Record Daily Snapshot
          </Button>
        </div>
      </div>

      {/* 2. AD ACCOUNTS SUMMARY TABLE */}
      <div className="rounded-2xl border border-border/50 bg-card shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-border/40 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-amber-500/10 text-amber-500">
              <FiDollarSign className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground">Paid Ad Accounts Performance</h2>
              <p className="text-xs text-muted-foreground">Aggregated impression, click & conversion metrics per platform</p>
            </div>
          </div>
          <span className="text-xs font-mono text-muted-foreground">{adAccounts.length} Connected Accounts</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/40 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider border-b border-border/40">
              <tr>
                <th className="px-4 py-3">Platform</th>
                <th className="px-4 py-3">Impressions</th>
                <th className="px-4 py-3">Clicks</th>
                <th className="px-4 py-3">CTR</th>
                <th className="px-4 py-3">Total Spend</th>
                <th className="px-4 py-3">CPC</th>
                <th className="px-4 py-3">CPL</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {adAccounts.map((acc) => (
                <tr key={acc.platform} className="hover:bg-accent/20 transition-colors">
                  <td className="px-4 py-3.5 font-medium text-foreground">{acc.platform}</td>
                  <td className="px-4 py-3.5 font-mono text-muted-foreground">{acc.impressions}</td>
                  <td className="px-4 py-3.5 font-mono text-foreground font-semibold">{acc.clicks}</td>
                  <td className="px-4 py-3.5 font-mono text-emerald-500 font-semibold">{acc.ctr}</td>
                  <td className="px-4 py-3.5 font-mono font-bold text-amber-500">{acc.spend}</td>
                  <td className="px-4 py-3.5 font-mono text-foreground">{acc.cpc}</td>
                  <td className="px-4 py-3.5 font-mono font-bold text-emerald-500">{acc.cpl}</td>
                  <td className="px-4 py-3.5">
                    <Badge variant="outline" className="text-[9px] px-2 py-0.2 uppercase font-bold text-emerald-500 border-emerald-500/30 bg-emerald-500/5">
                      {acc.status}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
