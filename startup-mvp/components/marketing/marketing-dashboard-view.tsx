"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  FiTrendingUp,
  FiDollarSign,
  FiUsers,
  FiTarget,
  FiLayers,
  FiAlertCircle,
  FiRefreshCw,
  FiPlus,
  FiArrowUpRight,
  FiPieChart,
  FiActivity,
  FiFilter,
  FiCalendar,
  FiShare2,
  FiFileText,
  FiMail,
} from "react-icons/fi";
import MarketingStatCard from "./shared/marketing-stat-card";
import MarketingFilterBar from "./shared/marketing-filter-bar";

export default function MarketingDashboardView() {
  const [searchQuery, setSearchQuery] = useState("");
  const [periodFilter, setPeriodFilter] = useState("month");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const dashboardKPIs = [
    { title: "Marketing Spend", value: "৳1,45,000", change: "+12.4%", changeType: "positive" as const, subtitle: "vs Previous Month", icon: FiDollarSign },
    { title: "Active Campaigns", value: "8", change: "+2 New", changeType: "positive" as const, subtitle: "Across 4 Channels", icon: FiLayers },
    { title: "Leads Generated", value: "1,280", change: "+18.5%", changeType: "positive" as const, subtitle: "Form Submissions", icon: FiUsers },
    { title: "Qualified Leads (SQL)", value: "420", change: "+14.2%", changeType: "positive" as const, subtitle: "68.6% SQL Ratio", icon: FiTarget },
    { title: "Attributed Revenue", value: "৳48,00,000", change: "+24.0%", changeType: "positive" as const, subtitle: "Closed Deals", icon: FiTrendingUp },
    { title: "Marketing ROI", value: "3.41x", change: "+0.4x", changeType: "positive" as const, subtitle: "ROAS Ratio", icon: FiPieChart },
    { title: "Cost Per Lead (CPL)", value: "৳225", change: "-8.2%", changeType: "positive" as const, subtitle: "Target <৳500", icon: FiDollarSign },
    { title: "Customer Acq. Cost (CAC)", value: "৳4,935", change: "-5.1%", changeType: "positive" as const, subtitle: "Per Won Client", icon: FiActivity },
  ];

  const funnelData = [
    { stage: "Unique Visitors / Impressions", count: "250,000", percentage: "100%" },
    { stage: "Engaged Traffic / Content Views", count: "55,000", percentage: "22.0%" },
    { stage: "Lead Form Submissions", count: "1,280", percentage: "2.32%" },
    { stage: "Sales Qualified Leads (SQL)", count: "420", percentage: "32.8%" },
    { stage: "Closed Won Customers", count: "78", percentage: "18.5%" },
  ];

  const channelPerformance = [
    { channel: "Meta Ads (FB & IG)", spend: "৳55,000", leads: 480, cpl: "৳114", roas: "4.2x", share: 38 },
    { channel: "Google Search & Display", spend: "৳45,000", leads: 390, cpl: "৳115", roas: "3.8x", share: 30 },
    { channel: "Email & SMS Campaigns", spend: "৳15,000", leads: 220, cpl: "৳68", roas: "5.5x", share: 18 },
    { channel: "Organic SEO & Social", spend: "৳30,000", leads: 190, cpl: "৳157", roas: "2.9x", share: 14 },
  ];

  const marketingAlerts = [
    { id: 1, title: "Google Search Campaign Budget Alert", desc: "Campaign #CMP-01 has reached 88% of its allocated budget (৳65,000 / ৳75,000).", type: "warning" },
    { id: 2, title: "Content Sign-off Pending", desc: "3 Social media posts scheduled for tomorrow are awaiting client review.", type: "info" },
    { id: 3, title: "High Conversion Rate on Meta Lead Ads", desc: "Q3 Fintech Lead Gen campaign CTR increased by +4.2% today.", type: "success" },
  ];

  return (
    <div className="flex-1 space-y-6 max-w-[1600px] mx-auto text-foreground">
      {/* 1. HERO TITLE CARD & GLOBAL CONTROLS */}
      <div className="p-4 sm:p-5 rounded-2xl border border-border/50 bg-card/60 backdrop-blur-md shadow-xs flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          {/* EXACT MATCHED CARD BADGE FROM USER IMAGE */}
          <div className="inline-flex items-center gap-3.5 px-4 py-3 rounded-[16px] bg-secondary/80 border border-border/50 shadow-2xs">
            <div className="w-9 h-9 rounded-full border-2 border-foreground flex items-center justify-center shrink-0 bg-background/80">
              <svg className="w-5 h-5 text-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="9" />
                <circle cx="12" cy="12" r="5" />
                <circle cx="12" cy="12" r="1.5" fill="currentColor" />
              </svg>
            </div>
            <div className="text-left leading-snug">
              <div className="text-base font-semibold tracking-tight text-foreground">Marketing</div>
              <div className="text-base font-semibold tracking-tight text-foreground">Dashboard</div>
            </div>
          </div>

          <div>
            <Badge variant="outline" className="text-[11px] font-medium px-2.5 py-0.5 border-primary/30 text-primary bg-primary/5">
              Enterprise Command Center
            </Badge>
            <p className="text-xs text-muted-foreground mt-1">
              Real-time omnichannel marketing analytics, funnel stages, spend tracking & ROI intelligence
            </p>
          </div>
        </div>

        <MarketingFilterBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          periodFilter={periodFilter}
          onPeriodChange={setPeriodFilter}
          onRefresh={handleRefresh}
          isRefreshing={isRefreshing}
          actionButton={
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" className="h-8 text-xs font-semibold px-3" asChild>
                <Link href="/dashboard/marketing/marketing-funnel">
                  <FiFilter className="mr-1.5 h-3.5 w-3.5 text-purple-500" /> Marketing Funnel
                </Link>
              </Button>
              <Button size="sm" className="h-8 text-xs font-semibold px-3 shadow-xs" asChild>
                <Link href="/dashboard/marketing/campaigns/create">
                  <FiPlus className="mr-1.5 h-3.5 w-3.5" /> New Campaign
                </Link>
              </Button>
            </div>
          }
        />
      </div>

      {/* 2. TOP KPIS GRID */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-4 lg:grid-cols-4">
        {dashboardKPIs.map((kpi) => (
          <MarketingStatCard key={kpi.title} {...kpi} />
        ))}
      </div>

      {/* 3. MIDDLE SECTION: FUNNEL & CHANNEL BREAKDOWN */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* MARKETING FUNNEL */}
        <div className="lg:col-span-2 rounded-2xl border border-border/50 bg-card p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-border/40 pb-3">
            <div>
              <h2 className="text-sm font-bold text-foreground">Omnichannel Marketing Conversion Funnel</h2>
              <p className="text-xs text-muted-foreground">Visitor to Lead to Qualified Sales Deal conversion journey</p>
            </div>
            <Button variant="outline" size="sm" className="h-7 text-xs font-medium" asChild>
              <Link href="/dashboard/marketing/marketing-funnel">
                View Funnels <FiArrowUpRight className="ml-1 h-3 w-3" />
              </Link>
            </Button>
          </div>

          <div className="space-y-3">
            {funnelData.map((f, i) => (
              <div key={f.stage} className="space-y-1">
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-foreground font-semibold">{i + 1}. {f.stage}</span>
                  <span className="font-mono text-muted-foreground">{f.count} ({f.percentage})</span>
                </div>
                <Progress value={100 - i * 18} className="h-2.5" />
              </div>
            ))}
          </div>
        </div>

        {/* CHANNEL BREAKDOWN */}
        <div className="rounded-2xl border border-border/50 bg-card p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-border/40 pb-3">
            <div>
              <h2 className="text-sm font-bold text-foreground">Channel Performance</h2>
              <p className="text-xs text-muted-foreground">Spend vs CPL & ROAS</p>
            </div>
            <Badge variant="outline" className="text-[10px]">MTD Share</Badge>
          </div>

          <div className="space-y-3 text-xs">
            {channelPerformance.map((ch) => (
              <div key={ch.channel} className="p-3 rounded-xl border border-border/40 bg-background/50 space-y-1.5">
                <div className="flex justify-between font-bold text-foreground">
                  <span>{ch.channel}</span>
                  <span className="font-mono text-emerald-500">{ch.roas} ROAS</span>
                </div>
                <div className="flex justify-between text-[11px] text-muted-foreground">
                  <span>Spend: <strong className="text-foreground">{ch.spend}</strong></span>
                  <span>Leads: <strong className="text-blue-500">{ch.leads}</strong></span>
                  <span>CPL: <strong className="text-purple-500">{ch.cpl}</strong></span>
                </div>
                <Progress value={ch.share} className="h-1.5" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 4. QUICK MODULE SHORTCUTS & ALERTS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* QUICK NAVIGATION SHORTCUTS */}
        <div className="lg:col-span-2 rounded-2xl border border-border/50 bg-card p-5 shadow-xs space-y-4">
          <h2 className="text-sm font-bold text-foreground border-b border-border/40 pb-2">Marketing Workspace Modules</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <Link href="/dashboard/marketing/marketing-funnel" className="p-3 rounded-xl border border-purple-500/30 bg-purple-500/5 hover:bg-purple-500/10 transition-colors flex items-center gap-2.5 font-semibold text-purple-600 dark:text-purple-400">
              <FiFilter className="h-4 w-4" /> Marketing Funnel
            </Link>
            <Link href="/dashboard/marketing/campaigns" className="p-3 rounded-xl border border-border/40 bg-background/50 hover:bg-accent/40 transition-colors flex items-center gap-2.5 font-semibold text-foreground">
              <FiLayers className="h-4 w-4 text-blue-500" /> Campaigns
            </Link>
            <Link href="/dashboard/marketing/content-calendar" className="p-3 rounded-xl border border-border/40 bg-background/50 hover:bg-accent/40 transition-colors flex items-center gap-2.5 font-semibold text-foreground">
              <FiCalendar className="h-4 w-4 text-amber-500" /> Content Calendar
            </Link>
            <Link href="/dashboard/marketing/paid-ads" className="p-3 rounded-xl border border-border/40 bg-background/50 hover:bg-accent/40 transition-colors flex items-center gap-2.5 font-semibold text-foreground">
              <FiDollarSign className="h-4 w-4 text-emerald-500" /> Paid Ads
            </Link>
          </div>
        </div>

        {/* ALERTS */}
        <div className="rounded-2xl border border-border/50 bg-card p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-border/40 pb-3">
            <div className="flex items-center gap-2">
              <FiAlertCircle className="h-4 w-4 text-amber-500" />
              <h2 className="text-sm font-bold text-foreground">Marketing Alerts</h2>
            </div>
            <span className="text-[10px] text-muted-foreground font-mono">{marketingAlerts.length} Active</span>
          </div>

          <div className="space-y-2.5">
            {marketingAlerts.map((a) => (
              <div key={a.id} className="p-3 rounded-xl border border-amber-500/20 bg-amber-500/5 space-y-1">
                <div className="text-xs font-bold text-amber-600 dark:text-amber-400">{a.title}</div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">{a.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
