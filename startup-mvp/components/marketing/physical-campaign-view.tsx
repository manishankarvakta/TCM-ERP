"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  FiBriefcase,
  FiMapPin,
  FiDollarSign,
  FiUsers,
  FiPlus,
  FiRefreshCw,
  FiCheckCircle,
  FiTrendingUp,
  FiTrash2,
  FiSearch,
  FiInbox,
  FiExternalLink,
} from "react-icons/fi";
import {
  ChannelCampaignData,
  deleteMarketingCampaignAction,
  getChannelCampaignsAction,
} from "@/app/actions/crm/marketing-operations.action";
import { toast } from "sonner";

interface PhysicalCampaignViewProps {
  initialCampaigns?: ChannelCampaignData[];
}

export default function PhysicalCampaignView({ initialCampaigns = [] }: PhysicalCampaignViewProps) {
  const [campaigns, setCampaigns] = useState<ChannelCampaignData[]>(initialCampaigns);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const res = await getChannelCampaignsAction("PHYSICAL");
      if (res.success) {
        setCampaigns(res.campaigns);
        toast.success("Physical campaigns refreshed");
      }
    } catch {
      toast.error("Failed to refresh physical campaigns");
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) return;
    setDeletingId(id);
    try {
      const res = await deleteMarketingCampaignAction(id);
      if (res.success) {
        toast.success("Physical campaign deleted");
        setCampaigns((prev) => prev.filter((c) => c.id !== id));
      } else {
        toast.error(res.error || "Failed to delete campaign");
      }
    } catch {
      toast.error("Failed to delete campaign");
    } finally {
      setDeletingId(null);
    }
  };

  const filtered = campaigns.filter((c) => {
    return (
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.channel.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.location && c.location.toLowerCase().includes(searchQuery.toLowerCase())) ||
      c.id.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const totalSpent = campaigns.reduce((acc, c) => {
    const num = Number(c.spent.replace(/[^0-9.-]+/g, "")) || 0;
    return acc + num;
  }, 0);
  const totalBudget = campaigns.reduce((acc, c) => {
    const num = Number(c.budget.replace(/[^0-9.-]+/g, "")) || 0;
    return acc + num;
  }, 0);
  const totalLeads = campaigns.reduce((acc, c) => acc + (c.leads || 0), 0);
  const totalConversions = campaigns.reduce((acc, c) => acc + (c.conversions || 0), 0);
  const costPerLead = totalLeads > 0 ? `৳${Math.round(totalSpent / totalLeads).toLocaleString()}` : "—";
  const conversionRate = totalLeads > 0 ? ((totalConversions / totalLeads) * 100).toFixed(1) + "%" : "0.0%";

  return (
    <div className="flex-1 space-y-6 max-w-[1600px] mx-auto text-foreground">
      {/* 1. HEADER */}
      <div className="p-4 sm:p-5 rounded-2xl border border-border/50 bg-card/60 backdrop-blur-md shadow-xs flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl flex items-center gap-2">
              <FiBriefcase className="h-6 w-6 text-amber-500" />
              Physical & Offline Campaigns
            </h1>
            <Badge
              variant="outline"
              className="text-[11px] font-medium px-2.5 py-0.5 border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/5"
            >
              Events, Billboards & Print Marketing
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Track offline marketing initiatives, exhibitions, print ads, billboards, and QR-code lead conversions
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground border-border/50"
            onClick={handleRefresh}
            title="Refresh"
            disabled={isRefreshing}
          >
            <FiRefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin text-amber-500" : ""}`} />
          </Button>
          <Button
            size="sm"
            asChild
            className="h-8 gap-1.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs"
          >
            <Link href="/dashboard/marketing/physical-campaign/create">
              <FiPlus className="h-3.5 w-3.5" />
              New Physical Campaign
            </Link>
          </Button>
        </div>
      </div>

      {/* 2. METRICS */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border/50 bg-card/50 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Total Offline Spend
            </CardTitle>
            <FiDollarSign className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">৳{totalSpent.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">Budget allocated: ৳{totalBudget.toLocaleString()}</p>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/50 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Offline Leads Captured
            </CardTitle>
            <FiUsers className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{totalLeads}</div>
            <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1">
              <FiTrendingUp className="h-3 w-3" /> Cost Per Lead: {costPerLead}
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/50 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Closed Deals (Offline)
            </CardTitle>
            <FiCheckCircle className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{totalConversions}</div>
            <p className="text-xs text-muted-foreground mt-1">{conversionRate} Conversion Rate</p>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/50 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Active Campaigns
            </CardTitle>
            <FiMapPin className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{campaigns.length} Active</div>
            <p className="text-xs text-muted-foreground mt-1">DHAKA & Regional Tech Hubs</p>
          </CardContent>
        </Card>
      </div>

      {/* 3. TABLE */}
      <Card className="border-border/50 bg-card/50 shadow-xs">
        <CardHeader className="border-b border-border/50 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <CardTitle className="text-base font-semibold">Active & Past Physical Campaigns</CardTitle>
            <div className="relative w-48 sm:w-64">
              <FiSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search offline campaigns..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 pl-8 text-xs bg-muted/30"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          {filtered.length === 0 ? (
            <div className="p-12 text-center flex flex-col items-center justify-center space-y-3">
              <div className="h-12 w-12 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center">
                <FiInbox className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-foreground">No Physical Campaigns Found</h3>
                <p className="text-xs text-muted-foreground max-w-sm">
                  {searchQuery
                    ? "No campaigns match your search query."
                    : "You haven't recorded any physical marketing events, expo booths or billboard campaigns yet."}
                </p>
              </div>
              <Button
                size="sm"
                asChild
                className="h-8 text-xs bg-amber-600 hover:bg-amber-700 text-white gap-1.5"
              >
                <Link href="/dashboard/marketing/physical-campaign/create">
                  <FiPlus className="h-3.5 w-3.5" />
                  Create First Physical Campaign
                </Link>
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/40 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider border-b border-border/40">
                  <tr>
                    <th className="px-4 py-3">Campaign Name</th>
                    <th className="px-4 py-3">Type & Venue</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Budget vs Spend</th>
                    <th className="px-4 py-3">Leads</th>
                    <th className="px-4 py-3">Conversions</th>
                    <th className="px-4 py-3">Duration</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {filtered.map((c) => (
                    <tr key={c.id} className="hover:bg-accent/20 transition-colors">
                      <td className="px-4 py-3.5 font-medium text-foreground">
                        <div className="font-semibold text-foreground flex items-center gap-1.5">
                          <Link
                            href={`/dashboard/marketing/campaigns/${c.id}`}
                            className="hover:text-primary hover:underline flex items-center gap-1"
                          >
                            {c.name}
                            <FiExternalLink className="h-3 w-3 opacity-60" />
                          </Link>
                        </div>
                        <span className="text-[10px] font-mono text-muted-foreground">{c.id}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="font-medium text-foreground">{c.channel}</div>
                        <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                          <FiMapPin className="h-3 w-3" /> {c.location || "Dhaka Venue"}
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <Badge
                          variant="outline"
                          className={`text-[9px] px-2 py-0.2 uppercase font-bold ${
                            c.status === "Active" || c.status === "LAUNCHED"
                              ? "border-emerald-500/40 text-emerald-600 bg-emerald-500/10"
                              : c.status === "COMPLETED"
                              ? "border-blue-500/40 text-blue-600 bg-blue-500/10"
                              : "border-amber-500/40 text-amber-600 bg-amber-500/10"
                          }`}
                        >
                          {c.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3.5 font-medium">
                        <span className="font-bold text-amber-500 font-mono">{c.spent}</span>
                        <span className="text-[11px] text-muted-foreground font-mono"> / {c.budget}</span>
                      </td>
                      <td className="px-4 py-3.5 font-bold font-mono text-blue-600 dark:text-blue-400">{c.leads}</td>
                      <td className="px-4 py-3.5 font-bold font-mono text-emerald-600 dark:text-emerald-400">{c.conversions}</td>
                      <td className="px-4 py-3.5 text-xs text-muted-foreground font-mono">
                        {c.startDate} to {c.endDate}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-rose-500"
                          onClick={() => handleDelete(c.id, c.name)}
                          disabled={deletingId === c.id}
                          title="Delete Campaign"
                        >
                          <FiTrash2 className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
