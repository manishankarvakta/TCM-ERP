"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  FiUsers,
  FiTrendingUp,
  FiRefreshCw,
  FiCheckCircle,
} from "react-icons/fi";

export default function LeadSourcesView() {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const sources = [
    { channel: "Google Search (Paid & Organic)", leads: 64, qualifiedLeads: 42, conversionRate: "65.6%", avgDealSize: "৳1,85,000", cpl: "৳1,200" },
    { channel: "Meta Ads (Facebook / Instagram)", leads: 48, qualifiedLeads: 28, conversionRate: "58.3%", avgDealSize: "৳1,40,000", cpl: "৳1,250" },
    { channel: "LinkedIn B2B Campaigns", leads: 28, qualifiedLeads: 22, conversionRate: "78.5%", avgDealSize: "৳2,50,000", cpl: "৳1,590" },
    { channel: "Email Broadcasts & Newsletters", leads: 18, qualifiedLeads: 14, conversionRate: "77.7%", avgDealSize: "৳1,60,000", cpl: "৳450" },
    { channel: "Direct Referrals & Partners", leads: 14, qualifiedLeads: 12, conversionRate: "85.7%", avgDealSize: "৳3,20,000", cpl: "৳0" },
  ];

  return (
    <div className="flex-1 space-y-6 max-w-[1600px] mx-auto text-foreground">
      {/* 1. TOP HEADER & CONTROLS */}
      <div className="p-4 sm:p-5 rounded-2xl border border-border/50 bg-card/60 backdrop-blur-md shadow-xs flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
              Lead Sources & Acquisition Channels
            </h1>
            <Badge variant="outline" className="text-[11px] font-medium px-2.5 py-0.5 border-blue-500/30 text-blue-600 dark:text-blue-400 bg-blue-500/5">
              Lead Acquisition Channels
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Tracking lead volume, qualification ratios & average deal sizes per channel
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

          <Button size="sm" className="h-8 text-xs font-semibold px-3 shadow-xs" onClick={() => alert("Source channel added.")}>
            + Add Source Channel
          </Button>
        </div>
      </div>

      {/* 2. TABLE */}
      <div className="rounded-2xl border border-border/50 bg-card shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-border/40 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-blue-500/10 text-blue-500">
              <FiUsers className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground">Lead Source Breakdown</h2>
              <p className="text-xs text-muted-foreground">Lead volume, qualified SQL count & average contract value</p>
            </div>
          </div>
          <span className="text-xs font-mono text-muted-foreground">{sources.length} Channels</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/40 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider border-b border-border/40">
              <tr>
                <th className="px-4 py-3">Channel / Source</th>
                <th className="px-4 py-3">Total Leads</th>
                <th className="px-4 py-3">Qualified SQLs</th>
                <th className="px-4 py-3">SQL Ratio</th>
                <th className="px-4 py-3">Avg Deal Size</th>
                <th className="px-4 py-3">Cost Per Lead</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {sources.map((s) => (
                <tr key={s.channel} className="hover:bg-accent/20 transition-colors">
                  <td className="px-4 py-3.5 font-medium text-foreground">{s.channel}</td>
                  <td className="px-4 py-3.5 font-mono text-foreground font-semibold">{s.leads}</td>
                  <td className="px-4 py-3.5 font-mono font-bold text-emerald-500">{s.qualifiedLeads}</td>
                  <td className="px-4 py-3.5 font-mono text-blue-500 font-semibold">{s.conversionRate}</td>
                  <td className="px-4 py-3.5 font-mono font-bold text-foreground">{s.avgDealSize}</td>
                  <td className="px-4 py-3.5 font-mono text-emerald-500 font-semibold">{s.cpl}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
