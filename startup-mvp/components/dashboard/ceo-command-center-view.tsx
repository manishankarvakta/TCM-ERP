"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  FiDollarSign,
  FiTrendingUp,
  FiAlertTriangle,
  FiUsers,
  FiClock,
  FiCheckCircle,
  FiPieChart,
  FiFileText,
  FiActivity,
  FiSettings,
  FiExternalLink,
  FiShield,
  FiBriefcase,
  FiHelpCircle,
  FiArrowRight,
  FiBarChart,
  FiRefreshCw,
  FiLayers,
  FiChevronRight,
} from "react-icons/fi";

interface CeoCommandCenterViewProps {
  data?: any;
}

export default function CeoCommandCenterView({ data }: CeoCommandCenterViewProps) {
  const [period, setPeriod] = useState("month");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 500);
  };

  // 1. Company Health Scorecards (7 Areas)
  const companyHealth = [
    { area: "Sales & Pipeline", score: 92, status: "Healthy", trend: "up", detail: "৳4.2M pipeline · 78% win rate", href: "/dashboard/sales", color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/30" },
    { area: "Delivery & Projects", score: 78, status: "Warning", trend: "down", detail: "10 on track · 2 delayed · 2 at risk", href: "/dashboard/projects", color: "text-amber-500 bg-amber-500/10 border-amber-500/30" },
    { area: "Workforce & Resources", score: 88, status: "Healthy", trend: "up", detail: "92% utilization · 45 active staff", href: "/dashboard/employees", color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/30" },
    { area: "Financial Health", score: 85, status: "Healthy", trend: "up", detail: "৳3.85M recognized · ৳2.45L collected today", href: "/dashboard/accounts", color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/30" },
    { area: "Client Relationships", score: 80, status: "Healthy", trend: "neutral", detail: "24 active accounts · 2 attention", href: "/dashboard/crm/clients", color: "text-blue-500 bg-blue-500/10 border-blue-500/30" },
    { area: "Support Desk & SLA", score: 98, status: "Healthy", trend: "up", detail: "98.2% SLA met · 4 open tickets", href: "/dashboard/support", color: "text-purple-500 bg-purple-500/10 border-purple-500/30" },
    { area: "System Operations", score: 99, status: "Healthy", trend: "up", detail: "0 queue bottlenecks · 100% uptime", href: "/dashboard/system/health", color: "text-cyan-500 bg-cyan-500/10 border-cyan-500/30" },
  ];

  // 2. Executive KPI Ribbon (8 Strategic KPIs)
  const executiveKpis = [
    { title: "Pipeline Value", value: "৳4.20M", change: "+12%", target: "৳4.0M", href: "/dashboard/crm/opportunities" },
    { title: "Contract Value", value: "৳8.50M", change: "+18%", target: "৳8.0M", href: "/dashboard/crm/agreements" },
    { title: "Active Projects", value: "14", change: "0", target: "15", href: "/dashboard/projects" },
    { title: "Billable Amount", value: "৳1.20M", change: "+8%", target: "৳1.0M", href: "/dashboard/billing/billable" },
    { title: "Recognized Revenue", value: "৳3.85M", change: "+15%", target: "৳3.5M", href: "/dashboard/accounts/profit-loss" },
    { title: "Collections (MTD)", value: "৳3.15M", change: "+9%", target: "৳3.0M", href: "/dashboard/accounts/collections" },
    { title: "Gross Profit Margin", value: "38.5%", change: "+2.1%", target: "35.0%", href: "/dashboard/profitability" },
    { title: "Cash / Bank Position", value: "৳1.45M", change: "Stable", target: "৳1.0M", href: "/dashboard/accounts/cash-bank" },
  ];

  // 3. Sales Funnel Data
  const salesFunnel = [
    { stage: "Leads", count: 124, value: "—", convRate: "100%", dropOff: "—" },
    { stage: "Qualified", count: 78, value: "—", convRate: "62.9%", dropOff: "37.1%" },
    { stage: "Opportunities", count: 42, value: "৳6.80M", convRate: "53.8%", dropOff: "46.2%" },
    { stage: "Quotations", count: 28, value: "৳5.10M", convRate: "66.6%", dropOff: "33.4%" },
    { stage: "Agreements", count: 18, value: "৳4.20M", convRate: "64.2%", dropOff: "35.8%" },
    { stage: "Service Sales", count: 14, value: "৳3.85M", convRate: "77.7%", dropOff: "22.3%" },
  ];

  // 4. Commercial Revenue Journey (6 Concepts)
  const commercialJourney = [
    { name: "Pipeline", value: "৳6.80M", percentage: 100, desc: "Total Active Opportunities", color: "bg-blue-500" },
    { name: "Contract", value: "৳4.20M", percentage: 61.7, desc: "Signed Customer Agreements", color: "bg-indigo-500" },
    { name: "Billable", value: "৳3.20M", percentage: 47.0, desc: "Work Completed & Ready", color: "bg-purple-500" },
    { name: "Invoiced", value: "৳2.85M", percentage: 41.9, desc: "Billed Invoices Sent", color: "bg-teal-500" },
    { name: "Recognized", value: "৳2.50M", percentage: 36.7, desc: "Accounting Posted Revenue", color: "bg-emerald-500" },
    { name: "Collected", value: "৳2.15M", percentage: 31.6, desc: "Verified Cash Received", color: "bg-green-600" },
  ];

  // 5. Department Performance Scorecards
  const deptPerformance = [
    { dept: "Marketing", capacity: "100%", utilization: "82%", overdue: 0, health: "Healthy", onTime: "96%" },
    { dept: "Sales", capacity: "100%", utilization: "88%", overdue: 1, health: "Healthy", onTime: "92%" },
    { dept: "PM / Operations", capacity: "100%", utilization: "94%", overdue: 3, health: "Warning", onTime: "84%" },
    { dept: "Creative", capacity: "100%", utilization: "78%", overdue: 0, health: "Healthy", onTime: "98%" },
    { dept: "Development", capacity: "100%", utilization: "96%", overdue: 2, health: "Warning", onTime: "88%" },
    { dept: "QA", capacity: "100%", utilization: "72%", overdue: 0, health: "Healthy", onTime: "100%" },
    { dept: "Support", capacity: "100%", utilization: "68%", overdue: 1, health: "Healthy", onTime: "98%" },
  ];

  // 6. Forecast Blocks
  const forecasts = [
    { item: "Expected Sales", current: "৳3.85M", forecast: "৳4.50M", target: "৳4.20M" },
    { item: "Expected Billing", current: "৳2.85M", forecast: "৳3.20M", target: "৳3.00M" },
    { item: "Expected Collections", current: "৳2.15M", forecast: "৳2.80M", target: "৳2.50M" },
    { item: "Resource Demand", current: "92%", forecast: "95%", target: "90%" },
    { item: "Projected Profit", current: "৳1.48M", forecast: "৳1.75M", target: "৳1.60M" },
  ];

  return (
    <div className="flex-1 space-y-6 max-w-[1600px] mx-auto text-foreground">
      {/* 1. TOP HEADER & CONTROLS */}
      <div className="p-4 sm:p-5 rounded-2xl border border-border/50 bg-card/60 backdrop-blur-md shadow-xs flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
              CEO Command Center
            </h1>
            <Badge variant="outline" className="text-[11px] font-medium px-2.5 py-0.5 border-blue-500/30 text-blue-600 dark:text-blue-400 bg-blue-500/5">
              Strategic Control Cockpit
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Authoritative executive health monitoring & operational exception management
          </p>
        </div>

        {/* Action Controls */}
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
            title="Refresh Live Data"
          >
            <FiRefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin text-primary" : ""}`} />
          </Button>

          <Button size="sm" variant="outline" className="h-8 text-xs font-semibold px-3" asChild>
            <Link href="/dashboard/executive/alerts">
              <FiAlertTriangle className="mr-1.5 h-3.5 w-3.5 text-amber-500" />
              Alerts (4)
            </Link>
          </Button>

          <Button size="sm" className="h-8 text-xs font-semibold px-3 shadow-xs" asChild>
            <Link href="/dashboard/executive/reports">
              <FiFileText className="mr-1.5 h-3.5 w-3.5" />
              Report Pack
            </Link>
          </Button>
        </div>
      </div>

      {/* 2. COMPANY HEALTH SECTION (7 DOMAIN CARDS) */}
      <div className="rounded-2xl border border-border/50 bg-card p-4 sm:p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between border-b border-border/40 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-emerald-500/10 text-emerald-500">
              <FiActivity className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground">Company Health Scorecards</h2>
              <p className="text-xs text-muted-foreground">Deterministic health status across 7 operational domains</p>
            </div>
          </div>
          <span className="text-xs font-mono text-emerald-500 font-semibold">Overall: 88.7% (Healthy)</span>
        </div>

        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 pt-1">
          {companyHealth.map((item) => (
            <Link
              key={item.area}
              href={item.href}
              className="group p-3.5 rounded-xl border border-border/40 bg-background/50 hover:bg-accent/30 hover:border-border/80 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground line-clamp-1">
                    {item.area}
                  </span>
                  <Badge variant="outline" className={`text-[9px] px-1.5 py-0.2 ${item.color}`}>
                    {item.status}
                  </Badge>
                </div>
                <div className="text-xl font-bold tracking-tight text-foreground">
                  {item.score}%
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground mt-2 line-clamp-1">
                {item.detail}
              </p>
            </Link>
          ))}
        </div>
      </div>

      {/* 3. EXECUTIVE KPI RIBBON (8 STRATEGIC KPIS) */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-4 lg:grid-cols-8">
        {executiveKpis.map((kpi) => (
          <Link
            key={kpi.title}
            href={kpi.href}
            className="group flex flex-col justify-between p-3.5 rounded-xl border border-border/50 bg-card hover:border-primary/40 hover:-translate-y-0.5 shadow-2xs hover:shadow-xs transition-all duration-200"
          >
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/80 line-clamp-1">
                {kpi.title}
              </span>
              <div className="text-lg font-bold tracking-tight text-foreground mt-1">
                {kpi.value}
              </div>
            </div>
            <div className="mt-2.5 pt-1.5 border-t border-border/30 flex items-center justify-between text-[10px]">
              <span className="text-emerald-500 font-semibold">{kpi.change}</span>
              <span className="text-muted-foreground">Target: {kpi.target}</span>
            </div>
          </Link>
        ))}
      </div>

      {/* 4. COMMERCIAL REVENUE JOURNEY & SALES FUNNEL (SPLIT GRID) */}
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-12">
        {/* Left: Commercial Revenue Journey (6 Cols) */}
        <div className="lg:col-span-6 rounded-2xl border border-border/50 bg-card p-4 sm:p-5 shadow-xs space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-border/40 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-md bg-purple-500/10 text-purple-500">
                  <FiDollarSign className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-foreground">Commercial Revenue Journey</h2>
                  <p className="text-xs text-muted-foreground">Distinct tracking of value across 6 financial stages</p>
                </div>
              </div>
              <Link href="/dashboard/profitability" className="text-xs text-muted-foreground hover:text-foreground font-medium transition-colors flex items-center gap-1">
                Profitability <FiChevronRight className="h-3 w-3" />
              </Link>
            </div>

            <div className="space-y-3 pt-3">
              {commercialJourney.map((stage) => (
                <div key={stage.name} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground">{stage.name}</span>
                      <span className="text-[10px] text-muted-foreground">({stage.desc})</span>
                    </div>
                    <span className="font-bold text-foreground font-mono">{stage.value}</span>
                  </div>
                  <div className="w-full bg-accent/40 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full ${stage.color} rounded-full transition-all duration-500`}
                      style={{ width: `${stage.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Sales Conversion Funnel (6 Cols) */}
        <div className="lg:col-span-6 rounded-2xl border border-border/50 bg-card p-4 sm:p-5 shadow-xs space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-border/40 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-md bg-blue-500/10 text-blue-500">
                  <FiTrendingUp className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-foreground">Sales Conversion Funnel</h2>
                  <p className="text-xs text-muted-foreground">Stage-by-stage drop-off & conversion analytics</p>
                </div>
              </div>
              <Link href="/dashboard/sales" className="text-xs text-muted-foreground hover:text-foreground font-medium transition-colors flex items-center gap-1">
                Sales <FiChevronRight className="h-3 w-3" />
              </Link>
            </div>

            <div className="space-y-2.5 pt-3">
              {salesFunnel.map((step) => (
                <div key={step.stage} className="flex items-center justify-between p-2.5 rounded-xl border border-border/40 bg-background/50 text-xs">
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-foreground w-28">{step.stage}</span>
                    <span className="font-bold text-foreground font-mono">{step.count} items</span>
                  </div>
                  <div className="flex items-center gap-4 text-[11px]">
                    {step.value !== "—" && <span className="font-mono font-medium text-foreground">{step.value}</span>}
                    <span className="text-emerald-500 font-semibold">{step.convRate} Conv</span>
                    {step.dropOff !== "—" && <span className="text-rose-500 font-medium">({step.dropOff} Drop)</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 5. DEPARTMENT PERFORMANCE SCORECARDS */}
      <div className="rounded-2xl border border-border/50 bg-card p-4 sm:p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between border-b border-border/40 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-indigo-500/10 text-indigo-500">
              <FiLayers className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground">Department Performance Scorecards</h2>
              <p className="text-xs text-muted-foreground">Operational capacity, utilization & on-time delivery across departments</p>
            </div>
          </div>
          <span className="text-xs font-mono text-muted-foreground">7 Active Teams</span>
        </div>

        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 pt-1">
          {deptPerformance.map((dept) => (
            <div key={dept.dept} className="p-3.5 rounded-xl border border-border/40 bg-background/50 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-foreground">{dept.dept}</span>
                <Badge variant="outline" className={`text-[9px] px-1.5 py-0.2 ${dept.health === "Warning" ? "text-amber-500 border-amber-500/30" : "text-emerald-500 border-emerald-500/30"}`}>
                  {dept.health}
                </Badge>
              </div>
              <div className="space-y-1 text-[11px] text-muted-foreground pt-1">
                <div className="flex justify-between">
                  <span>Utilization:</span>
                  <span className="font-semibold text-foreground font-mono">{dept.utilization}</span>
                </div>
                <div className="flex justify-between">
                  <span>On-Time:</span>
                  <span className="font-semibold text-emerald-500 font-mono">{dept.onTime}</span>
                </div>
                <div className="flex justify-between">
                  <span>Overdue Tasks:</span>
                  <span className={dept.overdue > 0 ? "text-rose-500 font-semibold font-mono" : "text-foreground font-mono"}>{dept.overdue}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 6. STRATEGIC FORECAST BLOCKS */}
      <div className="rounded-2xl border border-border/50 bg-card p-4 sm:p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between border-b border-border/40 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-teal-500/10 text-teal-500">
              <FiBarChart className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground">Strategic Forecast & Target Alignment</h2>
              <p className="text-xs text-muted-foreground">Current performance vs projected forecast vs period target</p>
            </div>
          </div>
          <span className="text-xs font-mono text-muted-foreground">Forecast Horizon: Q3 2026</span>
        </div>

        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 pt-1">
          {forecasts.map((f) => (
            <div key={f.item} className="p-3.5 rounded-xl border border-border/40 bg-background/50 space-y-2">
              <span className="text-[11px] font-semibold text-foreground block">{f.item}</span>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between text-muted-foreground">
                  <span>Current:</span>
                  <span className="font-mono text-foreground">{f.current}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Forecast:</span>
                  <span className="font-mono font-bold text-primary">{f.forecast}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Target:</span>
                  <span className="font-mono text-emerald-500 font-semibold">{f.target}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
