"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  FiClock,
  FiAlertCircle,
  FiAlertTriangle,
  FiDollarSign,
  FiUsers,
  FiFileText,
  FiPlus,
  FiHelpCircle,
  FiTrendingUp,
  FiShield,
  FiCalendar,
  FiCheckSquare,
  FiArrowUpRight,
  FiChevronRight,
  FiUserCheck,
  FiRefreshCw,
  FiTarget,
  FiBriefcase,
  FiActivity,
  FiCheckCircle,
  FiLayers,
  FiArrowRight,
  FiUser,
  FiCpu,
} from "react-icons/fi";
import RecentActivity from "@/components/dashboard/recent-activity";

interface CompanyTodayViewProps {
  stats: any;
  recentQuotations: any[];
  statusBreakdown: any;
  recentItems: any[];
  activities: any[];
  trends: any[];
  userRole?: string;
  userName?: string;
}

export default function CompanyTodayView({
  stats,
  recentQuotations,
  statusBreakdown,
  recentItems,
  activities,
  trends,
  userRole = "Admin",
  userName = "Manager",
}: CompanyTodayViewProps) {
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [timeFilter, setTimeFilter] = useState("today");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 500);
  };

  // Formatted Current Date string
  const todayDateString = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  // 1. KPI Ribbon (8 Cards)
  const kpiCards = [
    {
      title: "New Leads",
      value: "18",
      statusText: "+4 today · 12 qualified",
      statusColor: "text-muted-foreground",
      href: "/dashboard/crm/leads",
      icon: FiTarget,
    },
    {
      title: "Active Opportunities",
      value: "24",
      statusText: "৳4.2M pipeline value",
      statusColor: "text-blue-500 font-medium",
      href: "/dashboard/crm/opportunities",
      icon: FiTrendingUp,
    },
    {
      title: "Active Projects",
      value: "14",
      statusText: "10 on track · 2 at risk",
      statusColor: "text-amber-500 font-medium",
      href: "/dashboard/projects",
      icon: FiBriefcase,
    },
    {
      title: "Tasks Due Today",
      value: "8",
      statusText: "3 high priority",
      statusColor: "text-muted-foreground",
      href: "/dashboard/work-management/tasks",
      icon: FiCheckSquare,
    },
    {
      title: "Pending Approvals",
      value: "7",
      statusText: "3 urgent sign-offs",
      statusColor: "text-rose-500 font-semibold",
      href: "/dashboard/approvals",
      icon: FiShield,
    },
    {
      title: "Billable Amount",
      value: "৳1.20M",
      statusText: "Milestones ready for billing",
      statusColor: "text-indigo-500 font-medium",
      href: "/dashboard/billing/billable",
      icon: FiFileText,
    },
    {
      title: "Collections Today",
      value: "৳2.45L",
      statusText: "81.6% of daily target",
      statusColor: "text-emerald-500 font-medium",
      href: "/dashboard/accounts/collections",
      icon: FiDollarSign,
    },
    {
      title: "Open Tickets",
      value: "4",
      statusText: "1 SLA warning active",
      statusColor: "text-rose-500 font-semibold",
      href: "/dashboard/support/tickets",
      icon: FiHelpCircle,
    },
  ];

  // 2. Company Operations Flow Infographic Stages
  const operationsFlow = [
    { stage: "Marketing", count: "42", label: "Leads Generated", href: "/dashboard/marketing", icon: FiTarget, color: "text-blue-500 bg-blue-500/10" },
    { stage: "CRM", count: "27", label: "Qualified Leads", href: "/dashboard/crm", icon: FiUsers, color: "text-indigo-500 bg-indigo-500/10" },
    { stage: "Sales", count: "12", label: "Quotations Sent", href: "/dashboard/sales", icon: FiFileText, color: "text-purple-500 bg-purple-500/10" },
    { stage: "Projects", count: "18", label: "Active Projects", href: "/dashboard/projects", icon: FiBriefcase, color: "text-teal-500 bg-teal-500/10" },
    { stage: "QA", count: "4", label: "Awaiting Release", href: "/dashboard/qa", icon: FiCheckCircle, color: "text-cyan-500 bg-cyan-500/10" },
    { stage: "Billing", count: "৳1.2M", label: "Billable Milestones", href: "/dashboard/billing", icon: FiDollarSign, color: "text-amber-500 bg-amber-500/10" },
    { stage: "Collection", count: "৳850K", label: "Collected Today", href: "/dashboard/accounts/collections", icon: FiTrendingUp, color: "text-emerald-500 bg-emerald-500/10" },
    { stage: "Support", count: "13", label: "Open Tickets", href: "/dashboard/support", icon: FiHelpCircle, color: "text-rose-500 bg-rose-500/10" },
  ];

  // 3. Revenue Journey Visual Infographic
  const revenueJourney = [
    { stage: "Contract Value", amount: "৳8.50M", subtext: "Total Signed Value", percentage: 100, color: "bg-blue-500" },
    { stage: "Billable", amount: "৳5.20M", subtext: "Work Delivered", percentage: 61, color: "bg-indigo-500" },
    { stage: "Invoiced", amount: "৳4.10M", subtext: "Invoices Sent", percentage: 48, color: "bg-purple-500" },
    { stage: "Recognized Revenue", amount: "৳3.85M", subtext: "Posted & Recognized", percentage: 45, color: "bg-teal-500" },
    { stage: "Collected", amount: "৳3.15M", subtext: "Cash In Bank", percentage: 37, color: "bg-emerald-500" },
  ];

  // 4. Department Workload Capacity
  const departmentWorkload = [
    { name: "Sales", allocated: 85, capacity: 100, overdue: 1, color: "bg-blue-500" },
    { name: "PM / Operations", allocated: 92, capacity: 100, overdue: 3, color: "bg-indigo-500" },
    { name: "Creative", allocated: 78, capacity: 100, overdue: 0, color: "bg-purple-500" },
    { name: "Development", allocated: 96, capacity: 100, overdue: 2, color: "bg-rose-500" },
    { name: "QA", allocated: 70, capacity: 100, overdue: 0, color: "bg-teal-500" },
    { name: "Support", allocated: 64, capacity: 100, overdue: 1, color: "bg-amber-500" },
  ];

  // 5. Needs Attention Items
  const priorityItems = [
    {
      id: "ATTN-01",
      severity: "critical",
      title: "Unpaid Invoice #INV-2026-042 Overdue by 5 Days",
      context: "Grameenphone Ltd · Finance Desk",
      dueText: "5 days overdue",
      actionText: "Review",
      href: "/dashboard/quotations/invoices",
    },
    {
      id: "ATTN-02",
      severity: "critical",
      title: "SLA Warning: Client Portal SSO Authentication Issue",
      context: "Brac Bank Corp · DevOps Team",
      dueText: "SLA breach in 18m",
      actionText: "Open Ticket",
      href: "/dashboard/support/tickets",
    },
    {
      id: "ATTN-03",
      severity: "warning",
      title: "Pending Approval: Marketing Campaign Expense Voucher",
      context: "Rahim C. · ৳25,000 Ad Spend",
      dueText: "2h ago",
      actionText: "Approve",
      href: "/dashboard/approvals",
    },
    {
      id: "ATTN-04",
      severity: "warning",
      title: "Delayed Milestone: ERP Billing Integration Sign-off",
      context: "Apex Fintech Portal · Nadim Hossain",
      dueText: "Due 02:00 PM",
      actionText: "View",
      href: "/dashboard/projects/milestone",
    },
  ];

  // 6. My Decisions (Executive Approvals)
  const myDecisions = [
    {
      id: "DEC-01",
      title: "Quotation #Q-2026-089 Sign-off",
      details: "Apex Fintech Portal · ৳1,85,000",
      requester: "Alex Morgan",
      href: "/dashboard/approvals",
    },
    {
      id: "DEC-02",
      title: "Commercial Amendment Request #04",
      details: "Standard Chartered Campaign · +৳50,000 Scope Addition",
      requester: "Tanvir Ahmed",
      href: "/dashboard/governance/commercial-amendments",
    },
    {
      id: "DEC-03",
      title: "Annual Leave Application (3 Days)",
      details: "Sarah Jenkins (Creative Lead) · Aug 31 - Sep 02",
      requester: "Sarah Jenkins",
      href: "/dashboard/hr/leave",
    },
  ];

  // 7. Today's Priority Work
  const priorityTasks = [
    {
      id: "TSK-101",
      title: "Finalize Standard Chartered Campaign Creative Assets",
      project: "Standard Chartered",
      assignee: "Farhana Y.",
      due: "04:00 PM",
      priority: "High",
      status: "In Progress",
    },
    {
      id: "TSK-102",
      title: "Review Biometric Attendance Device Log Sync",
      project: "HR Ops",
      assignee: "System Admin",
      due: "05:30 PM",
      priority: "Medium",
      status: "Pending",
    },
    {
      id: "TSK-103",
      title: "Client Onboarding Sign-off for Apex Fintech",
      project: "Customer Success",
      assignee: "Alex Morgan",
      due: "End of Day",
      priority: "High",
      status: "Pending",
    },
  ];

  // 8. Today's Schedule
  const todaySchedule = [
    {
      id: "SCH-01",
      time: "11:30 AM",
      title: "Executive Operations Sync Meeting",
      type: "Meeting",
      location: "Conference Room A",
    },
    {
      id: "SCH-02",
      time: "02:30 PM",
      title: "Apex Fintech Deliverable Milestone Sign-off",
      type: "Milestone",
      location: "Client Portal",
    },
    {
      id: "SCH-03",
      time: "04:00 PM",
      title: "Q3 Sales Pipeline & Quotation Review",
      type: "Follow-up",
      location: "Sales Desk",
    },
  ];

  return (
    <div className="flex-1 space-y-6 max-w-[1600px] mx-auto text-foreground">
      {/* 1. TOP HEADER & QUICK ACTIONS */}
      <div className="p-4 sm:p-5 rounded-2xl border border-border/50 bg-card/60 backdrop-blur-md shadow-xs flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
              Executive Dashboard
            </h1>
            <Badge variant="outline" className="text-[11px] font-medium px-2.5 py-0.5 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse" />
              Daily Business Pulse
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
            <span>Welcome, {userName}</span>
            <span>•</span>
            <span>{todayDateString}</span>
          </p>
        </div>

        {/* Quick Actions & Controls */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <Select value={timeFilter} onValueChange={setTimeFilter}>
            <SelectTrigger className="h-8 text-xs w-[110px] border-border/50 bg-background/50">
              <SelectValue placeholder="Period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">This Week</SelectItem>
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

          {/* Quick Actions Dropdown / Buttons */}
          <div className="flex items-center gap-1.5">
            <Button size="sm" variant="outline" className="h-8 text-xs font-medium px-2.5" asChild>
              <Link href="/dashboard/crm/leads">
                <FiPlus className="mr-1 h-3.5 w-3.5" />
                Add Lead
              </Link>
            </Button>
            <Button size="sm" variant="outline" className="h-8 text-xs font-medium px-2.5 hidden sm:inline-flex" asChild>
              <Link href="/dashboard/projects">
                <FiPlus className="mr-1 h-3.5 w-3.5" />
                Project
              </Link>
            </Button>
            <Button size="sm" className="h-8 text-xs font-semibold px-3 shadow-xs" asChild>
              <Link href="/dashboard/quotations/new">
                <FiPlus className="mr-1.5 h-3.5 w-3.5" />
                Quotation
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* 2. KPI RIBBON (8 COMPACT CARDS) */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-4 lg:grid-cols-8">
        {kpiCards.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Link
              key={kpi.title}
              href={kpi.href}
              className="group flex flex-col justify-between p-3.5 rounded-xl border border-border/50 bg-card hover:border-primary/40 hover:-translate-y-0.5 shadow-2xs hover:shadow-xs transition-all duration-200"
            >
              <div>
                <div className="flex items-center justify-between text-muted-foreground mb-2">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/80 line-clamp-1">
                    {kpi.title}
                  </span>
                  <div className="p-1 rounded-md bg-muted/60 text-muted-foreground group-hover:text-primary transition-colors">
                    <Icon className="h-3 w-3" />
                  </div>
                </div>
                <div className="text-xl font-bold tracking-tight text-foreground">
                  {kpi.value}
                </div>
              </div>

              <div className="mt-2.5 pt-1.5 border-t border-border/30">
                <span className={`text-[10px] block line-clamp-1 ${kpi.statusColor}`}>
                  {kpi.statusText}
                </span>
              </div>
            </Link>
          );
        })}
      </div>

      {/* 3. COMPANY OPERATIONS FLOW INFOGRAPHIC */}
      <div className="rounded-2xl border border-border/50 bg-card p-4 sm:p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between border-b border-border/40 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-primary/10 text-primary">
              <FiActivity className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground">Company Operations Flow</h2>
              <p className="text-xs text-muted-foreground">Live operational metrics flowing through business stages</p>
            </div>
          </div>
          <span className="text-xs text-muted-foreground font-mono">End-to-End Pipeline</span>
        </div>

        {/* Infographic Steps */}
        <div className="grid gap-2 grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 pt-1">
          {operationsFlow.map((step, idx) => {
            const StepIcon = step.icon;
            return (
              <Link
                key={step.stage}
                href={step.href}
                className="group relative flex flex-col justify-between p-3 rounded-xl border border-border/40 bg-background/50 hover:bg-accent/30 hover:border-border/80 transition-all text-center"
              >
                <div className="flex flex-col items-center space-y-1.5">
                  <div className={`p-2 rounded-lg ${step.color} transition-transform group-hover:scale-110`}>
                    <StepIcon className="h-4 w-4" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    {step.stage}
                  </span>
                  <span className="text-base font-extrabold text-foreground tracking-tight">
                    {step.count}
                  </span>
                </div>
                <span className="text-[9px] text-muted-foreground mt-2 line-clamp-1 block">
                  {step.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* 4. REVENUE JOURNEY & PROJECT HEALTH (SPLIT 12-COL GRID) */}
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-12">
        {/* Left Column: Commercial Revenue Journey Infographic (7 Cols) */}
        <div className="lg:col-span-7 rounded-2xl border border-border/50 bg-card p-4 sm:p-5 shadow-xs space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-border/40 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-md bg-emerald-500/10 text-emerald-500">
                  <FiDollarSign className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-foreground">Commercial Revenue Journey</h2>
                  <p className="text-xs text-muted-foreground">Visualizing value conversion & bottlenecks across financial stages</p>
                </div>
              </div>
              <Link href="/dashboard/accounts" className="text-xs text-muted-foreground hover:text-foreground font-medium transition-colors flex items-center gap-1">
                Accounts <FiChevronRight className="h-3 w-3" />
              </Link>
            </div>

            <div className="space-y-3 pt-3">
              {revenueJourney.map((step) => (
                <div key={step.stage} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-foreground">{step.stage}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-muted-foreground">{step.subtext}</span>
                      <span className="font-bold text-foreground font-mono">{step.amount}</span>
                    </div>
                  </div>
                  <div className="w-full bg-accent/40 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full ${step.color} rounded-full transition-all duration-500`}
                      style={{ width: `${step.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Project Health Portfolio (5 Cols) */}
        <div className="lg:col-span-5 rounded-2xl border border-border/50 bg-card p-4 sm:p-5 shadow-xs space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-border/40 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-md bg-indigo-500/10 text-indigo-500">
                  <FiBriefcase className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-foreground">Project Portfolio Health</h2>
                  <p className="text-xs text-muted-foreground">Active delivery portfolio breakdown</p>
                </div>
              </div>
              <Link href="/dashboard/projects" className="text-xs text-muted-foreground hover:text-foreground font-medium transition-colors flex items-center gap-1">
                Projects <FiChevronRight className="h-3 w-3" />
              </Link>
            </div>

            <div className="space-y-4 pt-3">
              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="p-3 rounded-xl border border-border/40 bg-background/50">
                  <span className="text-2xl font-extrabold text-foreground">14</span>
                  <span className="text-[10px] text-muted-foreground uppercase font-medium block mt-0.5">Total Active Projects</span>
                </div>
                <div className="p-3 rounded-xl border border-rose-500/20 bg-rose-500/5">
                  <span className="text-2xl font-extrabold text-rose-500">4</span>
                  <span className="text-[10px] text-rose-500/80 uppercase font-semibold block mt-0.5">Attention Required</span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground">On Track (10)</span>
                  <span className="font-semibold text-emerald-500">71.4%</span>
                </div>
                <Progress value={71.4} className="h-1.5 bg-emerald-500/20" />

                <div className="flex justify-between items-center text-xs pt-1">
                  <span className="text-muted-foreground">Delayed / At Risk (4)</span>
                  <span className="font-semibold text-rose-500">28.6%</span>
                </div>
                <Progress value={28.6} className="h-1.5 bg-rose-500/20" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 5. DEPARTMENT WORKLOAD CAPACITY */}
      <div className="rounded-2xl border border-border/50 bg-card p-4 sm:p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between border-b border-border/40 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-purple-500/10 text-purple-500">
              <FiLayers className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground">Department Workload Capacity</h2>
              <p className="text-xs text-muted-foreground">Allocated vs available capacity & overdue tasks across teams</p>
            </div>
          </div>
          <span className="text-xs text-muted-foreground font-mono">Resource Utilization</span>
        </div>

        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 pt-1">
          {departmentWorkload.map((dept) => (
            <div key={dept.name} className="p-3 rounded-xl border border-border/40 bg-background/50 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-foreground">{dept.name}</span>
                <span className="font-mono text-[11px] font-bold text-foreground">{dept.allocated}%</span>
              </div>
              <Progress value={dept.allocated} className="h-1.5" />
              <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1">
                <span>Cap: {dept.capacity}%</span>
                {dept.overdue > 0 ? (
                  <span className="text-rose-500 font-semibold">{dept.overdue} overdue</span>
                ) : (
                  <span className="text-emerald-500 font-medium">On time</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 6. NEEDS ATTENTION & MY DECISIONS (SPLIT GRID) */}
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-12">
        {/* Needs Attention (7 Cols) */}
        <div className="lg:col-span-7 rounded-2xl border border-border/50 bg-card p-4 sm:p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-border/40 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-md bg-rose-500/10 text-rose-500">
                <FiAlertTriangle className="h-4 w-4" />
              </div>
              <h2 className="text-sm font-semibold text-foreground">Needs Attention</h2>
            </div>
            <Link href="/dashboard/approvals" className="text-xs text-muted-foreground hover:text-foreground font-medium transition-colors">
              View All →
            </Link>
          </div>

          <div className="space-y-2">
            {priorityItems.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-3 rounded-xl border border-border/30 bg-background/50 hover:bg-accent/30 transition-colors gap-3"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className={`h-2 w-2 rounded-full shrink-0 ${
                      item.severity === "critical" ? "bg-rose-500 animate-pulse" : "bg-amber-500"
                    }`}
                  />
                  <div className="space-y-0.5 min-w-0">
                    <p className="text-xs font-semibold text-foreground truncate">{item.title}</p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {item.context} · <span className="font-mono text-[10px]">{item.dueText}</span>
                    </p>
                  </div>
                </div>

                <Button size="sm" variant="outline" asChild className="h-7 px-2.5 text-[11px] font-medium shrink-0">
                  <Link href={item.href}>{item.actionText}</Link>
                </Button>
              </div>
            ))}
          </div>
        </div>

        {/* My Decisions (5 Cols) */}
        <div className="lg:col-span-5 rounded-2xl border border-border/50 bg-card p-4 sm:p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-border/40 pb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-amber-500/10 text-amber-500">
                <FiShield className="h-4 w-4" />
              </div>
              <h2 className="text-sm font-semibold text-foreground">My Decisions</h2>
            </div>
            <Badge variant="outline" className="text-[10px] font-semibold text-amber-500 border-amber-500/30">
              3 Awaiting
            </Badge>
          </div>

          <div className="space-y-2.5">
            {myDecisions.map((dec) => (
              <div
                key={dec.id}
                className="flex items-center justify-between p-3 rounded-xl border border-border/40 bg-background/50 hover:bg-accent/30 transition-colors"
              >
                <div className="space-y-0.5 min-w-0 pr-2">
                  <p className="text-xs font-semibold text-foreground truncate">{dec.title}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{dec.details}</p>
                </div>
                <Button size="sm" variant="default" asChild className="h-7 px-2.5 text-[11px] font-medium shrink-0">
                  <Link href={dec.href}>Sign-off</Link>
                </Button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 7. WORK & SCHEDULE (SPLIT GRID) */}
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-12">
        {/* Priority Work */}
        <div className="lg:col-span-7 rounded-2xl border border-border/50 bg-card p-4 sm:p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-border/40 pb-3">
            <h2 className="text-sm font-semibold text-foreground">Priority Work Due Today</h2>
            <Link href="/dashboard/work-management/tasks" className="text-xs text-muted-foreground hover:text-foreground font-medium transition-colors">
              Task Center →
            </Link>
          </div>

          <div className="space-y-2">
            {priorityTasks.map((task) => (
              <div
                key={task.id}
                className="flex items-center justify-between p-2.5 rounded-lg border border-border/30 bg-background/50 hover:bg-accent/30 transition-colors"
              >
                <div className="space-y-0.5 min-w-0">
                  <span className="text-xs font-medium text-foreground truncate block">{task.title}</span>
                  <p className="text-[11px] text-muted-foreground">
                    {task.project} · {task.assignee} · <span className="font-mono text-foreground/80">{task.due}</span>
                  </p>
                </div>
                <Badge variant="secondary" className="text-[10px] px-2 py-0.5 shrink-0">
                  {task.status}
                </Badge>
              </div>
            ))}
          </div>
        </div>

        {/* Schedule */}
        <div className="lg:col-span-5 rounded-2xl border border-border/50 bg-card p-4 sm:p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-border/40 pb-3">
            <h2 className="text-sm font-semibold text-foreground">Today's Schedule</h2>
            <Link href="/dashboard/hr/calendar" className="text-xs text-muted-foreground hover:text-foreground font-medium transition-colors">
              Calendar →
            </Link>
          </div>

          <div className="space-y-2">
            {todaySchedule.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-3 p-2.5 rounded-lg border border-border/30 bg-background/50 hover:bg-accent/30 transition-colors"
              >
                <span className="text-[11px] font-mono font-semibold px-2 py-1 rounded bg-accent text-foreground shrink-0">
                  {item.time}
                </span>
                <div className="space-y-0.5 min-w-0 flex-1">
                  <p className="text-xs font-medium text-foreground truncate">{item.title}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{item.location}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 8. RECENT BUSINESS ACTIVITY FEED */}
      <div className="rounded-2xl border border-border/50 bg-card p-4 sm:p-5 shadow-xs">
        <RecentActivity activities={activities} />
      </div>
    </div>
  );
}
