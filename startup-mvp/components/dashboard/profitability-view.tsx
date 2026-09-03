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
  FiTrendingDown,
  FiPieChart,
  FiBarChart,
  FiBriefcase,
  FiUsers,
  FiRefreshCw,
  FiChevronRight,
  FiLayers,
  FiAlertTriangle,
  FiCheckCircle,
} from "react-icons/fi";

export default function ProfitabilityView() {
  const [period, setPeriod] = useState("quarter");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 500);
  };

  // 1. Profitability KPI Summary
  const kpiSummary = [
    { label: "Contract Value", amount: "৳8.50M", detail: "Total Signed Value", color: "text-foreground" },
    { label: "Recognized Revenue", amount: "৳3.85M", detail: "Canonical Posted Revenue", color: "text-emerald-500 font-bold" },
    { label: "Actual Cost", amount: "৳2.37M", detail: "Incurred Direct Costs", color: "text-rose-500 font-medium" },
    { label: "Gross Profit", amount: "৳1.48M", detail: "Recognized Profit", color: "text-emerald-600 font-extrabold" },
    { label: "Margin %", amount: "38.5%", detail: "Target: 35.0%", color: "text-emerald-500 font-bold" },
    { label: "Projected Profit", amount: "৳1.75M", detail: "At Completion", color: "text-indigo-500 font-bold" },
  ];

  // 2. Ranked Project Profitability Table Data
  const projectProfitability = [
    {
      id: "PRJ-01",
      project: "Apex Fintech Banking Portal",
      client: "Apex Holdings",
      contractValue: "৳3.20M",
      recognized: "৳1.80M",
      actualCost: "৳1.02M",
      projectedCost: "৳1.80M",
      profit: "৳780K",
      margin: "43.3%",
      status: "High Margin",
      statusColor: "bg-emerald-500/10 text-emerald-500 border-emerald-500/30",
    },
    {
      id: "PRJ-02",
      project: "Standard Chartered Campaign",
      client: "Standard Chartered",
      contractValue: "৳2.10M",
      recognized: "৳1.20M",
      actualCost: "৳720K",
      projectedCost: "৳1.30M",
      profit: "৳480K",
      margin: "40.0%",
      status: "High Margin",
      statusColor: "bg-emerald-500/10 text-emerald-500 border-emerald-500/30",
    },
    {
      id: "PRJ-03",
      project: "Brac Bank Audit System",
      client: "Brac Bank Corp",
      contractValue: "৳1.80M",
      recognized: "৳600K",
      actualCost: "৳430K",
      projectedCost: "৳1.25M",
      profit: "৳170K",
      margin: "28.3%",
      status: "Below Target",
      statusColor: "bg-amber-500/10 text-amber-500 border-amber-500/30",
    },
    {
      id: "PRJ-04",
      project: "Grameenphone SSO Integration",
      client: "Grameenphone Ltd",
      contractValue: "৳1.40M",
      recognized: "৳250K",
      actualCost: "৳200K",
      projectedCost: "৳1.15M",
      profit: "৳50K",
      margin: "20.0%",
      status: "Loss Risk",
      statusColor: "bg-rose-500/10 text-rose-500 border-rose-500/30",
    },
  ];

  // 3. Service Category Profitability
  const serviceProfitability = [
    { service: "Web Development", revenue: "৳2.40M", cost: "৳1.40M", profit: "৳1.00M", margin: "41.6%" },
    { service: "Mobile App Development", revenue: "৳1.80M", cost: "৳1.10M", profit: "৳700K", margin: "38.8%" },
    { service: "UI/UX & Creative Design", revenue: "৳1.20M", cost: "৳680K", profit: "৳520K", margin: "43.3%" },
    { service: "SEO & Paid Marketing", revenue: "৳850K", cost: "৳550K", profit: "৳300K", margin: "35.2%" },
    { service: "Infrastructure Support", revenue: "৳600K", cost: "৳420K", profit: "৳180K", margin: "30.0%" },
  ];

  // 4. 2D Executive Profitability Matrix Quadrants
  const matrixQuadrants = [
    { quadrant: "High Revenue + High Margin", items: ["Apex Fintech Portal (43.3%)", "Standard Chartered Campaign (40.0%)"], badgeColor: "border-emerald-500/30 bg-emerald-500/5 text-emerald-500" },
    { quadrant: "High Revenue + Low Margin", items: ["Brac Bank Audit System (28.3%)"], badgeColor: "border-amber-500/30 bg-amber-500/5 text-amber-500" },
    { quadrant: "Low Revenue + High Margin", items: ["UI/UX Custom Design System (48.0%)"], badgeColor: "border-blue-500/30 bg-blue-500/5 text-blue-500" },
    { quadrant: "Low Revenue + Low Margin", items: ["Grameenphone SSO Integration (20.0%)"], badgeColor: "border-rose-500/30 bg-rose-500/5 text-rose-500" },
  ];

  return (
    <div className="flex-1 space-y-6 max-w-[1600px] mx-auto text-foreground">
      {/* 1. TOP HEADER & PERIOD FILTER */}
      <div className="p-4 sm:p-5 rounded-2xl border border-border/50 bg-card/60 backdrop-blur-md shadow-xs flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
              Executive Profitability & Margins
            </h1>
            <Badge variant="outline" className="text-[11px] font-medium px-2.5 py-0.5 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/5">
              Financial Margin Intelligence
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Authoritative profitability analytics derived strictly from canonical accounting & billing records
          </p>
        </div>

        <div className="flex items-center gap-2">
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
            title="Refresh Data"
          >
            <FiRefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin text-primary" : ""}`} />
          </Button>

          <Button size="sm" className="h-8 text-xs font-semibold px-3 shadow-xs" asChild>
            <Link href="/dashboard/executive/reports">
              <FiBarChart className="mr-1.5 h-3.5 w-3.5" />
              Margin Reports
            </Link>
          </Button>
        </div>
      </div>

      {/* 2. KPI SUMMARY (6 COMPACT CARDS) */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
        {kpiSummary.map((kpi) => (
          <div
            key={kpi.label}
            className="p-3.5 rounded-xl border border-border/50 bg-card shadow-2xs space-y-1"
          >
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block line-clamp-1">
              {kpi.label}
            </span>
            <div className={`text-xl font-extrabold tracking-tight ${kpi.color}`}>
              {kpi.amount}
            </div>
            <span className="text-[10px] text-muted-foreground block">
              {kpi.detail}
            </span>
          </div>
        ))}
      </div>

      {/* 3. REVENUE -> COST -> PROFIT VISUAL STORY INFOGRAPHIC */}
      <div className="rounded-2xl border border-border/50 bg-card p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-border/40 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-emerald-500/10 text-emerald-500">
              <FiTrendingUp className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground">Revenue → Cost → Profit Story</h2>
              <p className="text-xs text-muted-foreground">Recognized revenue less actual cost equals gross profit margin</p>
            </div>
          </div>
          <span className="text-xs font-mono text-emerald-500 font-bold">Gross Margin: 38.5%</span>
        </div>

        <div className="grid gap-4 grid-cols-1 md:grid-cols-3 text-center pt-1">
          <div className="p-4 rounded-xl border border-blue-500/20 bg-blue-500/5 space-y-1">
            <span className="text-xs font-semibold uppercase text-blue-500">Recognized Revenue</span>
            <div className="text-2xl font-extrabold text-foreground">৳3.85M</div>
            <span className="text-[11px] text-muted-foreground block">Canonical Posted Invoices</span>
          </div>

          <div className="p-4 rounded-xl border border-rose-500/20 bg-rose-500/5 space-y-1">
            <span className="text-xs font-semibold uppercase text-rose-500">− Actual Direct Cost</span>
            <div className="text-2xl font-extrabold text-foreground">৳2.37M</div>
            <span className="text-[11px] text-muted-foreground block">Resource & Infrastructure Costs</span>
          </div>

          <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 space-y-1">
            <span className="text-xs font-semibold uppercase text-emerald-500">= Gross Profit</span>
            <div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">৳1.48M</div>
            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold block">38.5% Recognized Margin</span>
          </div>
        </div>
      </div>

      {/* 4. RANKED PROJECT PROFITABILITY TABLE */}
      <div className="rounded-2xl border border-border/50 bg-card shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-border/40 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-indigo-500/10 text-indigo-500">
              <FiBriefcase className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground">Project Profitability Rankings</h2>
              <p className="text-xs text-muted-foreground">Contract value, recognized revenue, cost, gross profit & margin % per project</p>
            </div>
          </div>
          <Link href="/dashboard/projects" className="text-xs text-muted-foreground hover:text-foreground font-medium transition-colors flex items-center gap-1">
            All Projects <FiChevronRight className="h-3 w-3" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/40 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider border-b border-border/40">
              <tr>
                <th className="px-4 py-3">Project / Client</th>
                <th className="px-4 py-3">Contract Value</th>
                <th className="px-4 py-3">Recognized Revenue</th>
                <th className="px-4 py-3">Actual Cost</th>
                <th className="px-4 py-3">Gross Profit</th>
                <th className="px-4 py-3">Margin %</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {projectProfitability.map((p) => (
                <tr key={p.id} className="hover:bg-accent/20 transition-colors">
                  <td className="px-4 py-3.5 font-medium text-foreground">
                    <div>{p.project}</div>
                    <div className="text-[10px] text-muted-foreground">{p.client}</div>
                  </td>
                  <td className="px-4 py-3.5 font-mono">{p.contractValue}</td>
                  <td className="px-4 py-3.5 font-mono text-emerald-500 font-semibold">{p.recognized}</td>
                  <td className="px-4 py-3.5 font-mono text-rose-500">{p.actualCost}</td>
                  <td className="px-4 py-3.5 font-mono font-bold text-foreground">{p.profit}</td>
                  <td className="px-4 py-3.5 font-mono font-bold text-emerald-600 dark:text-emerald-400">{p.margin}</td>
                  <td className="px-4 py-3.5">
                    <Badge variant="outline" className={`text-[9px] px-2 py-0.2 ${p.statusColor}`}>
                      {p.status}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. SERVICE PROFITABILITY & 2D PROFITABILITY MATRIX (SPLIT GRID) */}
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-12">
        {/* Left: Service Category Profitability (6 Cols) */}
        <div className="lg:col-span-6 rounded-2xl border border-border/50 bg-card p-4 sm:p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-border/40 pb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-purple-500/10 text-purple-500">
                <FiLayers className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-foreground">Service Category Profitability</h2>
                <p className="text-xs text-muted-foreground">Revenue, cost & margin breakdown by service offering</p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {serviceProfitability.map((s) => (
              <div key={s.service} className="p-3 rounded-xl border border-border/40 bg-background/50 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-foreground">{s.service}</span>
                  <span className="font-bold text-emerald-500 font-mono">{s.margin} Margin</span>
                </div>
                <div className="flex justify-between text-[11px] text-muted-foreground">
                  <span>Revenue: <span className="font-mono text-foreground">{s.revenue}</span></span>
                  <span>Cost: <span className="font-mono text-rose-500">{s.cost}</span></span>
                  <span>Profit: <span className="font-mono text-emerald-500 font-semibold">{s.profit}</span></span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: 2D Executive Profitability Matrix (6 Cols) */}
        <div className="lg:col-span-6 rounded-2xl border border-border/50 bg-card p-4 sm:p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-border/40 pb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-teal-500/10 text-teal-500">
                <FiPieChart className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-foreground">Executive Profitability Matrix</h2>
                <p className="text-xs text-muted-foreground">Classifying portfolio items across Revenue vs Margin % axes</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            {matrixQuadrants.map((q) => (
              <div key={q.quadrant} className={`p-3 rounded-xl border ${q.badgeColor} space-y-2`}>
                <span className="text-[10px] font-bold uppercase tracking-wider block">{q.quadrant}</span>
                <div className="space-y-1">
                  {q.items.map((item) => (
                    <span key={item} className="text-xs block text-foreground font-medium truncate">
                      • {item}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
