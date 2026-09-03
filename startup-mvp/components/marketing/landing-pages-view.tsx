"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  FiFileText,
  FiPlus,
  FiRefreshCw,
  FiCheckCircle,
} from "react-icons/fi";

export default function LandingPagesView() {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const pages = [
    { title: "Enterprise ERP Free Demo Request", url: "/lp/enterprise-erp", visitors: "14,200", formSubmissions: 380, conversionRate: "2.67%", status: "Active" },
    { title: "Fintech Banking Integration Portal", url: "/lp/fintech-banking", visitors: "8,500", formSubmissions: 240, conversionRate: "2.82%", status: "Active" },
    { title: "HR & Biometric Attendance Suite", url: "/lp/hr-biometric", visitors: "6,400", formSubmissions: 190, conversionRate: "2.96%", status: "Active" },
  ];

  return (
    <div className="flex-1 space-y-6 max-w-[1600px] mx-auto text-foreground">
      {/* 1. TOP HEADER & CONTROLS */}
      <div className="p-4 sm:p-5 rounded-2xl border border-border/50 bg-card/60 backdrop-blur-md shadow-xs flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
              Landing Page Performance
            </h1>
            <Badge variant="outline" className="text-[11px] font-medium px-2.5 py-0.5 border-blue-500/30 text-blue-600 dark:text-blue-400 bg-blue-500/5">
              Lead Capture Pages
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Landing page traffic, form submission rates & conversion optimization
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

          <Button size="sm" className="h-8 text-xs font-semibold px-3 shadow-xs" onClick={() => alert("Create Landing Page opened.")}>
            <FiPlus className="mr-1.5 h-3.5 w-3.5" />
            New Landing Page
          </Button>
        </div>
      </div>

      {/* 2. TABLE */}
      <div className="rounded-2xl border border-border/50 bg-card shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-border/40 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-blue-500/10 text-blue-500">
              <FiFileText className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground">Published Landing Pages</h2>
              <p className="text-xs text-muted-foreground">Lead capture funnel performance per page</p>
            </div>
          </div>
          <span className="text-xs font-mono text-muted-foreground">{pages.length} Pages</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/40 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider border-b border-border/40">
              <tr>
                <th className="px-4 py-3">Page Title / URL</th>
                <th className="px-4 py-3">Unique Visitors</th>
                <th className="px-4 py-3">Form Submissions</th>
                <th className="px-4 py-3">Conversion Rate</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {pages.map((p) => (
                <tr key={p.url} className="hover:bg-accent/20 transition-colors">
                  <td className="px-4 py-3.5 font-medium text-foreground">
                    <div className="font-semibold text-foreground">{p.title}</div>
                    <span className="text-[10px] font-mono text-muted-foreground">{p.url}</span>
                  </td>
                  <td className="px-4 py-3.5 font-mono text-foreground">{p.visitors}</td>
                  <td className="px-4 py-3.5 font-mono font-bold text-emerald-500">{p.formSubmissions}</td>
                  <td className="px-4 py-3.5 font-mono font-bold text-blue-500">{p.conversionRate}</td>
                  <td className="px-4 py-3.5">
                    <Badge variant="outline" className="text-[9px] px-2 py-0.2 uppercase font-bold text-emerald-500 border-emerald-500/30 bg-emerald-500/5">
                      {p.status}
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
