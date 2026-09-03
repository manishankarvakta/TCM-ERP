"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  FiBarChart,
  FiFileText,
  FiDownload,
  FiPrinter,
  FiSearch,
  FiFilter,
  FiTrendingUp,
  FiDollarSign,
  FiBriefcase,
  FiUsers,
  FiHelpCircle,
  FiPieChart,
  FiLayers,
  FiChevronRight,
  FiRefreshCw,
  FiX,
  FiCheckCircle,
} from "react-icons/fi";

export default function ReportsView() {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeReportModal, setActiveReportModal] = useState<any>(null);

  const reportCategories = [
    {
      id: "executive",
      title: "Executive Reports",
      icon: FiTrendingUp,
      color: "text-blue-500 bg-blue-500/10 border-blue-500/30",
      reports: ["Company Performance Overview", "Monthly Management Summary", "Department Scorecard Matrix"],
    },
    {
      id: "marketing",
      title: "Marketing Reports",
      icon: FiPieChart,
      color: "text-purple-500 bg-purple-500/10 border-purple-500/30",
      reports: ["Campaign Performance & Attribution", "Lead Source ROI", "Channel Conversion Analytics"],
    },
    {
      id: "sales",
      title: "Sales & Pipeline",
      icon: FiDollarSign,
      color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/30",
      reports: ["Quotation Win/Loss Analysis", "Agreement Contract Value", "Salesperson Performance Scorecard"],
    },
    {
      id: "projects",
      title: "Project & Delivery",
      icon: FiBriefcase,
      color: "text-indigo-500 bg-indigo-500/10 border-indigo-500/30",
      reports: ["Project Portfolio Health Matrix", "Milestone Delivery Performance", "Project Delay & Risk Report"],
    },
    {
      id: "resources",
      title: "Resource Utilization",
      icon: FiUsers,
      color: "text-teal-500 bg-teal-500/10 border-teal-500/30",
      reports: ["Employee Workload Allocation", "Department Utilization Matrix", "Capacity vs Demand Forecast"],
    },
    {
      id: "finance",
      title: "Billing & Finance",
      icon: FiFileText,
      color: "text-amber-500 bg-amber-500/10 border-amber-500/30",
      reports: ["Accounts Receivable Aging", "Trial Balance & P&L Statement", "Cash & Bank Balance Flow"],
    },
    {
      id: "profitability",
      title: "Profitability & Margin",
      icon: FiBarChart,
      color: "text-cyan-500 bg-cyan-500/10 border-cyan-500/30",
      reports: ["Project Profitability Ranking", "Client Margin Contribution", "Service Line Profitability"],
    },
    {
      id: "support",
      title: "Support Desk & SLA",
      icon: FiHelpCircle,
      color: "text-rose-500 bg-rose-500/10 border-rose-500/30",
      reports: ["Ticket Resolution Performance", "SLA Breach & Compliance Log", "Support Agent Productivity"],
    },
  ];

  return (
    <div className="flex-1 space-y-6 max-w-[1600px] mx-auto text-foreground">
      {/* 1. TOP HEADER & SEARCH BAR */}
      <div className="p-4 sm:p-5 rounded-2xl border border-border/50 bg-card/60 backdrop-blur-md shadow-xs flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
              Management Reporting & BI Library
            </h1>
            <Badge variant="outline" className="text-[11px] font-medium px-2.5 py-0.5 border-primary/30 text-primary bg-primary/5">
              Authoritative BI & Reports
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Discover, filter, analyze, print, and export canonical enterprise reports
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <div className="relative w-[180px] sm:w-[220px]">
            <FiSearch className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search reports..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-8 pl-8 pr-3 text-xs rounded-md border border-border/50 bg-background/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <Button size="sm" className="h-8 text-xs font-semibold px-3 shadow-xs" onClick={() => setActiveReportModal({ title: "Management Report Pack" })}>
            <FiDownload className="mr-1.5 h-3.5 w-3.5" />
            Export Report Pack
          </Button>
        </div>
      </div>

      {/* 2. PROMINENT MANAGEMENT REPORT PACK CARD */}
      <div className="rounded-2xl border border-primary/30 bg-primary/5 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Badge className="bg-primary text-primary-foreground text-[10px] uppercase font-bold">Featured</Badge>
            <h2 className="text-base font-bold text-foreground">CEO / Management Report Pack</h2>
          </div>
          <p className="text-xs text-muted-foreground max-w-[800px]">
            Consolidated management pack containing Executive Summary, Sales Performance, Project Portfolio, Resource Utilization, Accounts Receivable, Profitability & SLA metrics.
          </p>
        </div>
        <Button size="sm" className="h-9 px-4 text-xs font-semibold shrink-0" onClick={() => setActiveReportModal({ title: "CEO / Management Report Pack" })}>
          Open Report Pack →
        </Button>
      </div>

      {/* 3. INFOGRAPHIC REPORT CATEGORIES GRID */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {reportCategories.map((cat) => {
          const Icon = cat.icon;
          return (
            <div
              key={cat.id}
              className="rounded-2xl border border-border/50 bg-card p-4 shadow-xs space-y-3 flex flex-col justify-between"
            >
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`p-1.5 rounded-md ${cat.color}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <h3 className="text-sm font-semibold text-foreground">{cat.title}</h3>
                  </div>
                </div>

                <div className="space-y-1.5 pt-1">
                  {cat.reports.map((rep) => (
                    <button
                      key={rep}
                      onClick={() => setActiveReportModal({ title: rep, category: cat.title })}
                      className="w-full text-left text-xs p-2 rounded-lg border border-border/30 bg-background/50 hover:bg-accent/40 transition-colors flex items-center justify-between text-muted-foreground hover:text-foreground group"
                    >
                      <span className="truncate">{rep}</span>
                      <FiChevronRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2 border-t border-border/30 text-[10px] text-muted-foreground flex justify-between">
                <span>{cat.reports.length} Reports</span>
                <span className="text-primary font-medium">Canonical BI</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* 4. REPORT DETAIL VIEWER MODAL */}
      {activeReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-4xl rounded-2xl bg-card border border-border/60 p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border/40 pb-3">
              <div>
                <h3 className="text-lg font-bold text-foreground">{activeReportModal.title}</h3>
                <p className="text-xs text-muted-foreground">Canonical Management BI Report · Real-Time Data</p>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setActiveReportModal(null)}>
                <FiX className="h-4 w-4" />
              </Button>
            </div>

            {/* KPI Summary */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-xl border border-border/40 bg-accent/20 text-center">
                <span className="text-[10px] text-muted-foreground uppercase font-semibold block">Total Revenue</span>
                <span className="text-lg font-extrabold text-foreground font-mono">৳3.85M</span>
              </div>
              <div className="p-3 rounded-xl border border-border/40 bg-accent/20 text-center">
                <span className="text-[10px] text-muted-foreground uppercase font-semibold block">Gross Margin</span>
                <span className="text-lg font-extrabold text-emerald-500 font-mono">38.5%</span>
              </div>
              <div className="p-3 rounded-xl border border-border/40 bg-accent/20 text-center">
                <span className="text-[10px] text-muted-foreground uppercase font-semibold block">SLA Compliance</span>
                <span className="text-lg font-extrabold text-blue-500 font-mono">98.2%</span>
              </div>
            </div>

            {/* Simulated Data Table */}
            <div className="rounded-xl border border-border/40 overflow-hidden text-xs">
              <table className="w-full text-left">
                <thead className="bg-muted/50 text-[10px] uppercase font-semibold text-muted-foreground border-b border-border/40">
                  <tr>
                    <th className="px-4 py-2.5">Entity / Metric</th>
                    <th className="px-4 py-2.5">Category</th>
                    <th className="px-4 py-2.5">Value</th>
                    <th className="px-4 py-2.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  <tr className="hover:bg-accent/20">
                    <td className="px-4 py-2.5 font-medium text-foreground">Apex Fintech Banking Portal</td>
                    <td className="px-4 py-2.5 text-muted-foreground">Project Delivery</td>
                    <td className="px-4 py-2.5 font-mono text-emerald-500 font-semibold">৳1.80M</td>
                    <td className="px-4 py-2.5"><Badge variant="outline" className="text-[9px] text-emerald-500">On Track</Badge></td>
                  </tr>
                  <tr className="hover:bg-accent/20">
                    <td className="px-4 py-2.5 font-medium text-foreground">Standard Chartered Campaign</td>
                    <td className="px-4 py-2.5 text-muted-foreground">Sales & Marketing</td>
                    <td className="px-4 py-2.5 font-mono text-emerald-500 font-semibold">৳1.20M</td>
                    <td className="px-4 py-2.5"><Badge variant="outline" className="text-[9px] text-emerald-500">Completed</Badge></td>
                  </tr>
                  <tr className="hover:bg-accent/20">
                    <td className="px-4 py-2.5 font-medium text-foreground">Grameenphone SSO Integration</td>
                    <td className="px-4 py-2.5 text-muted-foreground">DevOps Support</td>
                    <td className="px-4 py-2.5 font-mono text-rose-500">৳250K</td>
                    <td className="px-4 py-2.5"><Badge variant="outline" className="text-[9px] text-amber-500">Warning</Badge></td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Modal Actions */}
            <div className="flex justify-end gap-2 pt-2 border-t border-border/40">
              <Button variant="outline" size="sm" className="h-8 text-xs font-semibold" onClick={() => window.print()}>
                <FiPrinter className="mr-1.5 h-3.5 w-3.5" /> Print
              </Button>
              <Button size="sm" className="h-8 text-xs font-semibold" onClick={() => alert("Report downloaded successfully.")}>
                <FiDownload className="mr-1.5 h-3.5 w-3.5" /> Export PDF / CSV
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
