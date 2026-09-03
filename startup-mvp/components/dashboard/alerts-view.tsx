"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  FiAlertTriangle,
  FiAlertCircle,
  FiCheckCircle,
  FiClock,
  FiDollarSign,
  FiShield,
  FiRefreshCw,
  FiChevronRight,
  FiExternalLink,
  FiUser,
  FiLayers,
  FiActivity,
  FiFilter,
} from "react-icons/fi";

export default function AlertsView() {
  const [severityFilter, setSeverityFilter] = useState("all");
  const [areaFilter, setAreaFilter] = useState("all");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 500);
  };

  // 1. Top Infographic Counters
  const alertCounters = [
    { label: "Critical", count: "4", badgeColor: "bg-rose-500/10 text-rose-500 border-rose-500/30 font-bold" },
    { label: "High Priority", count: "6", badgeColor: "bg-amber-500/10 text-amber-500 border-amber-500/30 font-semibold" },
    { label: "Medium", count: "8", badgeColor: "bg-blue-500/10 text-blue-500 border-blue-500/30" },
    { label: "Resolved Today", count: "12", badgeColor: "bg-emerald-500/10 text-emerald-500 border-emerald-500/30 font-semibold" },
    { label: "Total Active", count: "18", badgeColor: "bg-purple-500/10 text-purple-500 border-purple-500/30 font-bold" },
  ];

  // 2. Alert Volume Distribution by Area
  const areaDistribution = [
    { area: "Sales", count: 3, percentage: 16.6 },
    { area: "Projects", count: 4, percentage: 22.2 },
    { area: "Resources", count: 2, percentage: 11.1 },
    { area: "QA", count: 1, percentage: 5.5 },
    { area: "Billing", count: 2, percentage: 11.1 },
    { area: "Finance", count: 3, percentage: 16.6 },
    { area: "Support", count: 2, percentage: 11.1 },
    { area: "Governance", count: 1, percentage: 5.5 },
  ];

  // 3. Executive Action Required Cards
  const actionRequiredAlerts = [
    {
      id: "ALT-801",
      severity: "CRITICAL",
      problem: "Invoice #INV-2026-042 BDT 850,000 Overdue by 24 Days",
      clientProject: "ABC Ltd · Financial Operations",
      impact: "High Cash Flow Risk (BDT 850,000 Outstanding)",
      owner: "Finance Manager",
      age: "24 days",
      deadline: "Immediate",
      href: "/dashboard/quotations/invoices",
      actions: ["Open Invoice", "Escalate"],
    },
    {
      id: "ALT-802",
      severity: "CRITICAL",
      problem: "SLA Warning: Client Portal SSO Authentication Timeout",
      clientProject: "Grameenphone Ltd · Support Desk",
      impact: "SLA Breach Imminent in 18 minutes",
      owner: "DevOps Lead",
      age: "42 mins",
      deadline: "18 mins left",
      href: "/dashboard/support/tickets",
      actions: ["Open Ticket", "Assign"],
    },
    {
      id: "ALT-803",
      severity: "HIGH",
      problem: "ERP Billing Integration Milestone 5 Days Delayed",
      clientProject: "Apex Fintech Portal · Project Operations",
      impact: "BDT 1.20M Billing Milestone Blocked",
      owner: "Nadim Hossain (PM)",
      age: "5 days",
      deadline: "Today 05:00 PM",
      href: "/dashboard/projects/milestone",
      actions: ["View Milestone", "Reassign"],
    },
    {
      id: "ALT-804",
      severity: "HIGH",
      problem: "Approval Overdue: Marketing Campaign Expense Voucher",
      clientProject: "Rahim Chowdhury · ৳25,000 Ad Spend",
      impact: "Paid Ads Campaign Paused",
      owner: "Executive Manager",
      age: "2 hours",
      deadline: "Today 03:00 PM",
      href: "/dashboard/approvals",
      actions: ["Approve", "Review"],
    },
  ];

  // 4. Age Analysis Breakdown
  const ageBreakdown = [
    { period: "Today", count: 6, color: "text-blue-500 bg-blue-500/10" },
    { period: "1–3 Days", count: 5, color: "text-indigo-500 bg-indigo-500/10" },
    { period: "4–7 Days", count: 4, color: "text-amber-500 bg-amber-500/10" },
    { period: "7+ Days", count: 3, color: "text-rose-500 bg-rose-500/10 font-bold" },
  ];

  return (
    <div className="flex-1 space-y-6 max-w-[1600px] mx-auto text-foreground">
      {/* 1. TOP HEADER & FILTER BAR */}
      <div className="p-4 sm:p-5 rounded-2xl border border-border/50 bg-card/60 backdrop-blur-md shadow-xs flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
              Executive Action & Exception Center
            </h1>
            <Badge variant="outline" className="text-[11px] font-medium px-2.5 py-0.5 border-rose-500/30 text-rose-600 dark:text-rose-400 bg-rose-500/5">
              Authoritative Operational Exceptions
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Real-time risk warnings, SLA breaches & actionable executive exception feed
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <Select value={severityFilter} onValueChange={setSeverityFilter}>
            <SelectTrigger className="h-8 text-xs w-[120px] border-border/50 bg-background/50">
              <SelectValue placeholder="Severity" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Severities</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
            </SelectContent>
          </Select>

          <Select value={areaFilter} onValueChange={setAreaFilter}>
            <SelectTrigger className="h-8 text-xs w-[110px] border-border/50 bg-background/50">
              <SelectValue placeholder="Area" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Areas</SelectItem>
              <SelectItem value="sales">Sales</SelectItem>
              <SelectItem value="projects">Projects</SelectItem>
              <SelectItem value="finance">Finance</SelectItem>
              <SelectItem value="qa">QA</SelectItem>
              <SelectItem value="support">Support</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground border-border/50"
            onClick={handleRefresh}
            title="Refresh Alerts"
          >
            <FiRefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin text-primary" : ""}`} />
          </Button>
        </div>
      </div>

      {/* 2. INFOGRAPHIC COUNTERS (5 CARDS) */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
        {alertCounters.map((c) => (
          <div key={c.label} className="p-3.5 rounded-xl border border-border/50 bg-card shadow-2xs space-y-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block">
              {c.label}
            </span>
            <div className="text-2xl font-extrabold tracking-tight text-foreground">
              {c.count}
            </div>
          </div>
        ))}
      </div>

      {/* 3. EXECUTIVE ACTION REQUIRED CARDS */}
      <div className="rounded-2xl border border-border/50 bg-card p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-border/40 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-rose-500/10 text-rose-500">
              <FiAlertTriangle className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground">Executive Action Required</h2>
              <p className="text-xs text-muted-foreground">Highest-impact exceptions needing executive intervention</p>
            </div>
          </div>
          <Badge variant="destructive" className="text-xs px-2.5 py-0.5 font-bold">
            {actionRequiredAlerts.length} High Priority
          </Badge>
        </div>

        <div className="grid gap-3 grid-cols-1">
          {actionRequiredAlerts.map((alert) => (
            <div
              key={alert.id}
              className={`p-4 rounded-xl border transition-all space-y-3 ${
                alert.severity === "CRITICAL"
                  ? "border-rose-500/30 bg-rose-500/5 hover:border-rose-500/50"
                  : "border-amber-500/30 bg-amber-500/5 hover:border-amber-500/50"
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <Badge
                    variant={alert.severity === "CRITICAL" ? "destructive" : "secondary"}
                    className="text-[10px] px-2 py-0.2 uppercase font-bold"
                  >
                    {alert.severity}
                  </Badge>
                  <span className="text-xs font-bold text-foreground sm:text-sm">{alert.problem}</span>
                </div>
                <span className="text-[11px] font-mono text-muted-foreground">Age: {alert.age}</span>
              </div>

              <div className="grid gap-2 grid-cols-1 sm:grid-cols-3 text-xs text-muted-foreground pt-1">
                <div>
                  <span className="text-muted-foreground/70 block text-[10px] uppercase">Entity / Client</span>
                  <span className="font-medium text-foreground">{alert.clientProject}</span>
                </div>
                <div>
                  <span className="text-muted-foreground/70 block text-[10px] uppercase">Impact</span>
                  <span className="font-semibold text-rose-600 dark:text-rose-400">{alert.impact}</span>
                </div>
                <div>
                  <span className="text-muted-foreground/70 block text-[10px] uppercase">Owner / Deadline</span>
                  <span className="font-medium text-foreground">{alert.owner} ({alert.deadline})</span>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-border/30 justify-end">
                {alert.actions.map((act) => (
                  <Button size="sm" key={act} variant="outline" asChild className="h-7 text-xs font-semibold">
                    <Link href={alert.href}>{act}</Link>
                  </Button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 4. AREA DISTRIBUTION & AGE ANALYSIS (SPLIT GRID) */}
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-12">
        {/* Area Distribution (7 Cols) */}
        <div className="lg:col-span-7 rounded-2xl border border-border/50 bg-card p-4 sm:p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-border/40 pb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-blue-500/10 text-blue-500">
                <FiLayers className="h-4 w-4" />
              </div>
              <h2 className="text-sm font-semibold text-foreground">Alert Volume by Area</h2>
            </div>
            <span className="text-xs font-mono text-muted-foreground">8 Operational Areas</span>
          </div>

          <div className="space-y-2.5">
            {areaDistribution.map((dist) => (
              <div key={dist.area} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="font-medium text-foreground">{dist.area}</span>
                  <span className="font-mono text-muted-foreground">{dist.count} alerts ({dist.percentage}%)</span>
                </div>
                <div className="w-full bg-accent/40 rounded-full h-1.5 overflow-hidden">
                  <div className="bg-primary h-full rounded-full" style={{ width: `${dist.percentage * 3}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Age Analysis (5 Cols) */}
        <div className="lg:col-span-5 rounded-2xl border border-border/50 bg-card p-4 sm:p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-border/40 pb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-purple-500/10 text-purple-500">
                <FiClock className="h-4 w-4" />
              </div>
              <h2 className="text-sm font-semibold text-foreground">Alert Aging Analysis</h2>
            </div>
            <span className="text-xs font-mono text-muted-foreground">Unresolved Aging</span>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            {ageBreakdown.map((age) => (
              <div key={age.period} className="p-3.5 rounded-xl border border-border/40 bg-background/50 text-center space-y-1">
                <span className="text-xs font-medium text-muted-foreground block">{age.period}</span>
                <span className={`text-2xl font-extrabold block ${age.color.split(' ')[0]}`}>{age.count}</span>
                <span className="text-[10px] text-muted-foreground">Active Alerts</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
