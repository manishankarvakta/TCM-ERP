"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  FiFilter,
  FiPlus,
  FiEye,
  FiTrash2,
  FiDollarSign,
  FiTrendingUp,
  FiActivity,
  FiX,
  FiInbox,
} from "react-icons/fi";
import MarketingStatCard from "./shared/marketing-stat-card";
import MarketingFilterBar from "./shared/marketing-filter-bar";
import {
  MarketingFunnelListItem,
  deleteMarketingFunnelAction,
} from "@/app/actions/crm/marketing-operations.action";
import { toast } from "sonner";

interface MarketingFunnelViewProps {
  initialFunnels?: MarketingFunnelListItem[];
}

export default function MarketingFunnelView({
  initialFunnels = [],
}: MarketingFunnelViewProps) {
  const router = useRouter();
  const [funnelsList, setFunnelsList] = useState<MarketingFunnelListItem[]>(initialFunnels);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const [newFunnelName, setNewFunnelName] = useState("");
  const [newFunnelObjective, setNewFunnelObjective] = useState("");
  const [newTargetValue, setNewTargetValue] = useState("10000000");

  useEffect(() => {
    setFunnelsList(initialFunnels);
  }, [initialFunnels]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    router.refresh();
    setTimeout(() => setIsRefreshing(false), 600);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFunnelName) return;
    const newF: MarketingFunnelListItem = {
      id: `FNL-${Date.now().toString().slice(-4)}`,
      planId: `plan-${Date.now().toString().slice(-4)}`,
      name: newFunnelName,
      targetValue: `৳${parseInt(newTargetValue || "0", 10).toLocaleString()}`,
      actualRevenue: "৳0",
      totalLeads: 0,
      sqls: 0,
      wonDeals: 0,
      conversionRate: "0%",
      activeCampaigns: 0,
      status: "ACTIVE",
      createdAt: new Date().toISOString(),
    };
    setFunnelsList((prev) => [newF, ...prev]);
    setNewFunnelName("");
    setNewFunnelObjective("");
    setShowCreateModal(false);
    toast.success("Marketing Funnel draft added");
  };

  const handleTrashFunnel = async (id: string) => {
    if (!confirm("Are you sure you want to delete this Marketing Funnel?")) return;
    try {
      const res = await deleteMarketingFunnelAction(id);
      if (res.success) {
        setFunnelsList((prev) => prev.filter((f) => f.id !== id && f.planId !== id));
        toast.success("Marketing funnel removed successfully");
        router.refresh();
      } else {
        toast.error(res.error || "Failed to delete marketing funnel");
      }
    } catch {
      toast.error("An error occurred while deleting the funnel");
    }
  };

  const filteredFunnels = funnelsList.filter((f) => {
    const matchesStatus =
      statusFilter === "all" ||
      f.status.toLowerCase() === statusFilter.toLowerCase();
    const matchesSearch = f.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  // Dynamic KPI calculations
  const activeFunnelsCount = funnelsList.filter(
    (f) => f.status.toUpperCase() === "ACTIVE"
  ).length;

  const totalTargetSum = funnelsList.reduce((acc, f) => {
    const num = parseInt(f.targetValue.replace(/[^0-9]/g, ""), 10) || 0;
    return acc + num;
  }, 0);

  const totalRevenueSum = funnelsList.reduce((acc, f) => {
    const num = parseInt(f.actualRevenue.replace(/[^0-9]/g, ""), 10) || 0;
    return acc + num;
  }, 0);

  const totalLeadsSum = funnelsList.reduce((acc, f) => acc + (f.totalLeads || 0), 0);
  const totalWonDealsSum = funnelsList.reduce((acc, f) => acc + (f.wonDeals || 0), 0);
  const avgConversionRate =
    totalLeadsSum > 0
      ? `${((totalWonDealsSum / totalLeadsSum) * 100).toFixed(2)}%`
      : "0.00%";

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
        <MarketingStatCard
          title="Active Marketing Funnels"
          value={String(activeFunnelsCount)}
          change={`${funnelsList.length} Total`}
          changeType="positive"
          subtitle="End-to-End Pipelines"
          icon={FiFilter}
        />
        <MarketingStatCard
          title="Total Funnel Target"
          value={totalTargetSum > 0 ? `৳${totalTargetSum.toLocaleString()}` : "৳0"}
          change={funnelsList.length > 0 ? "Configured" : "No Plan"}
          changeType="positive"
          subtitle="Pipeline Goal"
          icon={FiDollarSign}
        />
        <MarketingStatCard
          title="Attributed Revenue"
          value={totalRevenueSum > 0 ? `৳${totalRevenueSum.toLocaleString()}` : "৳0"}
          change="Real-time"
          changeType="positive"
          subtitle="Closed Deals"
          icon={FiTrendingUp}
        />
        <MarketingStatCard
          title="Overall Funnel Conv. Rate"
          value={avgConversionRate}
          change={`${totalWonDealsSum} Won`}
          changeType="positive"
          subtitle="Lead to Customer"
          icon={FiActivity}
        />
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

        {filteredFunnels.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center justify-center space-y-3">
            <div className="p-3 rounded-full bg-muted/60 text-muted-foreground">
              <FiInbox className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-foreground">No Marketing Funnels Found</h3>
              <p className="text-xs text-muted-foreground max-w-sm">
                {searchQuery || statusFilter !== "all"
                  ? "No funnels match your search or filter criteria. Try resetting filters."
                  : "You have not created any marketing funnels yet. Start building sequential funnel stages and campaigns."}
              </p>
            </div>
            <Button size="sm" className="mt-2 text-xs font-semibold" asChild>
              <Link href="/dashboard/marketing/marketing-funnel/create">
                <FiPlus className="mr-1.5 h-3.5 w-3.5" />
                Create Marketing Funnel
              </Link>
            </Button>
          </div>
        ) : (
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
        )}
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
