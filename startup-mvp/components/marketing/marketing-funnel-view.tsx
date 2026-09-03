"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  FiFilter,
  FiPlus,
  FiSearch,
  FiRefreshCw,
  FiEye,
  FiEdit,
  FiTrash2,
  FiDollarSign,
  FiTrendingUp,
  FiUsers,
  FiLayers,
  FiActivity,
  FiX,
  FiChevronRight,
} from "react-icons/fi";
import MarketingStatCard from "./shared/marketing-stat-card";
import MarketingFilterBar from "./shared/marketing-filter-bar";

export default function MarketingFunnelView() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const [newFunnelName, setNewFunnelName] = useState("");
  const [newFunnelObjective, setNewFunnelObjective] = useState("");
  const [newTargetValue, setNewTargetValue] = useState("10000000");

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const initialFunnels = [
    {
      id: "FNL-01",
      name: "Enterprise ERP Marketing Funnel 2026",
      targetValue: "৳1,20,00,000",
      actualRevenue: "৳48,00,000",
      totalLeads: 1280,
      sqls: 420,
      wonDeals: 78,
      conversionRate: "6.09%",
      activeCampaigns: 5,
      status: "ACTIVE",
    },
    {
      id: "FNL-02",
      name: "Fintech Banking SaaS Acquisition Funnel",
      targetValue: "৳85,00,000",
      actualRevenue: "৳32,00,000",
      totalLeads: 850,
      sqls: 310,
      wonDeals: 42,
      conversionRate: "4.94%",
      activeCampaigns: 4,
      status: "ACTIVE",
    },
    {
      id: "FNL-03",
      name: "Biometric Attendance & HR Suite Funnel",
      targetValue: "৳50,00,000",
      actualRevenue: "৳18,50,000",
      totalLeads: 620,
      sqls: 190,
      wonDeals: 28,
      conversionRate: "4.51%",
      activeCampaigns: 3,
      status: "PLANNED",
    },
  ];

  const [funnelsList, setFunnelsList] = useState(initialFunnels);

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFunnelName) return;
    const newF = {
      id: `FNL-0${funnelsList.length + 1}`,
      name: newFunnelName,
      targetValue: `৳${parseInt(newTargetValue || "0").toLocaleString()}`,
      actualRevenue: "৳0",
      totalLeads: 0,
      sqls: 0,
      wonDeals: 0,
      conversionRate: "0%",
      activeCampaigns: 0,
      status: "ACTIVE",
    };
    setFunnelsList([newF, ...funnelsList]);
    setNewFunnelName("");
    setNewFunnelObjective("");
    setShowCreateModal(false);
  };

  const handleTrashFunnel = (id: string) => {
    if (confirm("Move this Marketing Funnel to Trash?")) {
      setFunnelsList(funnelsList.filter(f => f.id !== id));
    }
  };

  const filteredFunnels = funnelsList.filter(f => {
    const matchesStatus = statusFilter === "all" || f.status.toLowerCase() === statusFilter.toLowerCase();
    const matchesSearch = f.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="flex-1 space-y-6 max-w-[1600px] mx-auto text-foreground">
      {/* 1. TOP HEADER & CONTROLS */}
      <div className="p-4 sm:p-5 rounded-2xl border border-border/50 bg-card/60 backdrop-blur-md shadow-xs flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
              Enterprise Marketing Funnel Workspace
            </h1>
            <Badge variant="outline" className="text-[11px] font-medium px-2.5 py-0.5 border-purple-500/30 text-purple-600 dark:text-purple-400 bg-purple-500/5">
              Funnel & Campaign Alignment
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Map marketing campaigns to sequential marketing funnel stages, track lead conversion drop-offs & attributed revenue
          </p>
        </div>

        <MarketingFilterBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          statusFilter={statusFilter}
          onStatusChange={setStatusFilter}
          statusOptions={[
            { label: "All Statuses", value: "all" },
            { label: "Active", value: "active" },
            { label: "Planned", value: "planned" },
          ]}
          onRefresh={handleRefresh}
          isRefreshing={isRefreshing}
          actionButton={
            <Button size="sm" className="h-8 text-xs font-semibold px-3 shadow-xs" asChild>
              <Link href="/dashboard/marketing/marketing-funnel/create">
                <FiPlus className="mr-1.5 h-3.5 w-3.5" />
                New Marketing Funnel
              </Link>
            </Button>
          }
        />
      </div>

      {/* 2. KPIS STRIP */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-4 lg:grid-cols-4">
        <MarketingStatCard title="Active Marketing Funnels" value="3" change="+1 New" changeType="positive" subtitle="End-to-End Pipelines" icon={FiFilter} />
        <MarketingStatCard title="Total Funnel Target" value="৳2,55,00,000" change="+18.5%" changeType="positive" subtitle="Pipeline Goal" icon={FiDollarSign} />
        <MarketingStatCard title="Attributed Revenue" value="৳98,50,000" change="+24.0%" changeType="positive" subtitle="Closed Deals" icon={FiTrendingUp} />
        <MarketingStatCard title="Overall Funnel Conv. Rate" value="5.42%" change="+0.8%" changeType="positive" subtitle="Lead to Customer" icon={FiActivity} />
      </div>

      {/* 3. MARKETING FUNNEL LEDGER TABLE */}
      <div className="rounded-2xl border border-border/50 bg-card shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-border/40 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-purple-500/10 text-purple-500">
              <FiFilter className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground">Marketing Funnel Ledger</h2>
              <p className="text-xs text-muted-foreground">Master marketing funnels with campaign-to-stage mappings & revenue targets</p>
            </div>
          </div>
          <span className="text-xs font-mono text-muted-foreground">{filteredFunnels.length} Marketing Funnels</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/40 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider border-b border-border/40">
              <tr>
                <th className="px-4 py-3">Marketing Funnel Name</th>
                <th className="px-4 py-3">Target Pipeline Value</th>
                <th className="px-4 py-3">Attributed Revenue</th>
                <th className="px-4 py-3">Total Leads</th>
                <th className="px-4 py-3">Won Deals</th>
                <th className="px-4 py-3">Conversion Rate</th>
                <th className="px-4 py-3">Campaigns Assigned</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {filteredFunnels.map((fnl) => (
                <tr key={fnl.id} className="hover:bg-accent/20 transition-colors">
                  <td className="px-4 py-3.5 font-medium text-foreground">
                    <div className="font-semibold text-foreground">{fnl.name}</div>
                    <span className="text-[10px] font-mono text-muted-foreground">{fnl.id}</span>
                  </td>
                  <td className="px-4 py-3.5 font-mono text-foreground font-semibold">{fnl.targetValue}</td>
                  <td className="px-4 py-3.5 font-mono font-bold text-emerald-500">{fnl.actualRevenue}</td>
                  <td className="px-4 py-3.5 font-mono text-blue-500 font-semibold">{fnl.totalLeads}</td>
                  <td className="px-4 py-3.5 font-mono text-emerald-600 font-bold">{fnl.wonDeals}</td>
                  <td className="px-4 py-3.5 font-mono text-purple-500 font-bold">{fnl.conversionRate}</td>
                  <td className="px-4 py-3.5 font-mono text-foreground">{fnl.activeCampaigns} Campaigns</td>
                  <td className="px-4 py-3.5">
                    <Badge variant="outline" className="text-[9px] px-2 py-0.2 uppercase font-bold text-emerald-500 border-emerald-500/30 bg-emerald-500/5">
                      {fnl.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center justify-center gap-1.5">
                      <Button size="sm" variant="outline" className="h-7 px-2 text-[11px] font-medium" asChild title="Open Funnel Pipeline">
                        <Link href={`/dashboard/marketing/marketing-funnel/${fnl.id}`}>
                          <FiEye className="mr-1 h-3 w-3 text-blue-500" />
                          View
                        </Link>
                      </Button>
                      <Button size="sm" variant="outline" className="h-7 px-2 text-[11px] font-medium text-rose-500 border-rose-200 dark:border-rose-900/40 hover:bg-rose-500/10" onClick={() => handleTrashFunnel(fnl.id)} title="Move to Trash">
                        <FiTrash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE MARKETING FUNNEL MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl bg-card border border-border/60 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border/40 pb-3">
              <h3 className="text-lg font-bold text-foreground">Create New Marketing Funnel</h3>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowCreateModal(false)}>
                <FiX className="h-4 w-4" />
              </Button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-foreground mb-1">Marketing Funnel Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Q4 Garments ERP Marketing Funnel"
                  value={newFunnelName}
                  onChange={(e) => setNewFunnelName(e.target.value)}
                  className="w-full h-8 px-3 rounded-md border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block font-semibold text-foreground mb-1">Target Pipeline Value (৳)</label>
                <input
                  type="number"
                  placeholder="10000000"
                  value={newTargetValue}
                  onChange={(e) => setNewTargetValue(e.target.value)}
                  className="w-full h-8 px-3 rounded-md border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-foreground mb-1">Funnel Strategy & Objective</label>
                <textarea
                  rows={3}
                  placeholder="Describe target customers and conversion goals for this funnel..."
                  value={newFunnelObjective}
                  onChange={(e) => setNewFunnelObjective(e.target.value)}
                  className="w-full p-3 rounded-md border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-border/40">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" className="font-semibold">
                  Create Marketing Funnel
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
