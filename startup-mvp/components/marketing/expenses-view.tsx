"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  FiDollarSign,
  FiFileText,
  FiPlus,
  FiRefreshCw,
  FiSearch,
  FiCheckCircle,
  FiClock,
  FiChevronRight,
} from "react-icons/fi";

export default function ExpensesView() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const expenses = [
    { id: "EXP-501", title: "Meta Ads Manager August Invoice", category: "Paid Media", vendor: "Meta Platforms Ireland", amount: "৳45,000", date: "2026-08-25", status: "PAID" },
    { id: "EXP-502", title: "Google Ads Invoice #8841-A", category: "Paid Search", vendor: "Google Asia Pacific", amount: "৳65,000", date: "2026-08-22", status: "PAID" },
    { id: "EXP-503", title: "SEMrush & Ahrefs Monthly Subscriptions", category: "SEO Tools", vendor: "SEMrush Inc.", amount: "৳15,000", date: "2026-08-15", status: "PAID" },
    { id: "EXP-504", title: "Standard Chartered Co-Op Media Print", category: "Events & Print", vendor: "Daily Star Media", amount: "৳35,000", date: "2026-08-10", status: "PENDING" },
  ];

  return (
    <div className="flex-1 space-y-6 max-w-[1600px] mx-auto text-foreground">
      {/* 1. TOP HEADER & CONTROLS */}
      <div className="p-4 sm:p-5 rounded-2xl border border-border/50 bg-card/60 backdrop-blur-md shadow-xs flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
              Marketing Expenses Ledger
            </h1>
            <Badge variant="outline" className="text-[11px] font-medium px-2.5 py-0.5 border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/5">
              Marketing Financial Records
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Vendor invoices, ad spend logs & marketing expense verification
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <div className="relative w-[180px]">
            <FiSearch className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search expenses..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-8 pl-8 pr-3 text-xs rounded-md border border-border/50 bg-background/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground border-border/50"
            onClick={handleRefresh}
            title="Refresh"
          >
            <FiRefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin text-primary" : ""}`} />
          </Button>

          <Button size="sm" className="h-8 text-xs font-semibold px-3 shadow-xs" onClick={() => alert("Log expense opened.")}>
            <FiPlus className="mr-1.5 h-3.5 w-3.5" />
            Log Expense
          </Button>
        </div>
      </div>

      {/* 2. EXPENSES TABLE */}
      <div className="rounded-2xl border border-border/50 bg-card shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-border/40 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-amber-500/10 text-amber-500">
              <FiFileText className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground">Marketing Expense Records</h2>
              <p className="text-xs text-muted-foreground">Detailed audit trail of marketing expenditures</p>
            </div>
          </div>
          <span className="text-xs font-mono text-muted-foreground">{expenses.length} Records</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/40 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider border-b border-border/40">
              <tr>
                <th className="px-4 py-3">Expense Title / ID</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Vendor / Provider</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {expenses.map((exp) => (
                <tr key={exp.id} className="hover:bg-accent/20 transition-colors">
                  <td className="px-4 py-3.5 font-medium text-foreground">
                    <div className="font-semibold text-foreground">{exp.title}</div>
                    <span className="text-[10px] font-mono text-muted-foreground">{exp.id}</span>
                  </td>
                  <td className="px-4 py-3.5 text-muted-foreground">{exp.category}</td>
                  <td className="px-4 py-3.5 text-foreground">{exp.vendor}</td>
                  <td className="px-4 py-3.5 font-mono text-muted-foreground">{exp.date}</td>
                  <td className="px-4 py-3.5 font-mono font-bold text-foreground">{exp.amount}</td>
                  <td className="px-4 py-3.5">
                    <Badge
                      variant="outline"
                      className={`text-[9px] px-2 py-0.2 uppercase font-bold ${
                        exp.status === "PAID" ? "text-emerald-500 border-emerald-500/30 bg-emerald-500/5" : "text-amber-500 border-amber-500/30 bg-amber-500/5"
                      }`}
                    >
                      {exp.status}
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
