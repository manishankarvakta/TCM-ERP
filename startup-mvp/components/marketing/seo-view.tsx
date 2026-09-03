"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  FiTrendingUp,
  FiSearch,
  FiRefreshCw,
  FiCheckCircle,
} from "react-icons/fi";

export default function SeoView() {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const keywords = [
    { keyword: "Enterprise ERP Software Bangladesh", rank: 2, volume: "1,200", change: "+1", status: "Top 3" },
    { keyword: "CRM Solutions Dhaka", rank: 4, volume: "850", change: "+2", status: "Page 1" },
    { keyword: "Biometric Attendance Software", rank: 3, volume: "1,400", change: "0", status: "Top 3" },
    { keyword: "Custom ERP Development Bangladesh", rank: 1, volume: "950", change: "0", status: "#1 Rank" },
  ];

  return (
    <div className="flex-1 space-y-6 max-w-[1600px] mx-auto text-foreground">
      {/* 1. TOP HEADER & CONTROLS */}
      <div className="p-4 sm:p-5 rounded-2xl border border-border/50 bg-card/60 backdrop-blur-md shadow-xs flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
              SEO & Organic Search Performance
            </h1>
            <Badge variant="outline" className="text-[11px] font-medium px-2.5 py-0.5 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/5">
              Internal Keyword & Search Tracking
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Organic keyword rankings, Domain Authority & technical SEO health
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

          <Button size="sm" className="h-8 text-xs font-semibold px-3 shadow-xs" onClick={() => alert("SEO audit triggered.")}>
            <FiSearch className="mr-1.5 h-3.5 w-3.5" />
            Run SEO Audit
          </Button>
        </div>
      </div>

      {/* 2. KEYWORDS TABLE */}
      <div className="rounded-2xl border border-border/50 bg-card shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-border/40 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-emerald-500/10 text-emerald-500">
              <FiTrendingUp className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground">Target Keyword Rankings</h2>
              <p className="text-xs text-muted-foreground">Google Search ranking positions for core commercial keywords</p>
            </div>
          </div>
          <span className="text-xs font-mono text-muted-foreground">{keywords.length} Keywords Tracked</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/40 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider border-b border-border/40">
              <tr>
                <th className="px-4 py-3">Keyword Query</th>
                <th className="px-4 py-3">Google Rank</th>
                <th className="px-4 py-3">Search Volume / Mo</th>
                <th className="px-4 py-3">Weekly Change</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {keywords.map((kw) => (
                <tr key={kw.keyword} className="hover:bg-accent/20 transition-colors">
                  <td className="px-4 py-3.5 font-medium text-foreground">{kw.keyword}</td>
                  <td className="px-4 py-3.5 font-mono font-bold text-emerald-500">#{kw.rank}</td>
                  <td className="px-4 py-3.5 font-mono text-foreground">{kw.volume}</td>
                  <td className="px-4 py-3.5 font-mono text-emerald-500 font-semibold">{kw.change}</td>
                  <td className="px-4 py-3.5">
                    <Badge variant="outline" className="text-[9px] px-2 py-0.2 uppercase font-bold text-emerald-500 border-emerald-500/30 bg-emerald-500/5">
                      {kw.status}
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
