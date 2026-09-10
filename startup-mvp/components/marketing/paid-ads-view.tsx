"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FiDollarSign,
  FiPlus,
  FiRefreshCw,
  FiTrash2,
  FiSearch,
  FiInbox,
  FiTrendingUp,
  FiMousePointer,
  FiEye,
  FiTarget,
  FiExternalLink,
} from "react-icons/fi";
import {
  ChannelCampaignData,
  deleteMarketingCampaignAction,
  getChannelCampaignsAction,
} from "@/app/actions/crm/marketing-operations.action";
import { toast } from "sonner";

interface PaidAdsViewProps {
  initialCampaigns?: ChannelCampaignData[];
}

export default function PaidAdsView({ initialCampaigns = [] }: PaidAdsViewProps) {
  const [campaigns, setCampaigns] = useState<ChannelCampaignData[]>(initialCampaigns);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [platformFilter, setPlatformFilter] = useState("ALL");
  const [deletingCampaign, setDeletingCampaign] = useState<{ id: string; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const res = await getChannelCampaignsAction("PAID_ADS");
      if (res.success) {
        setCampaigns(res.campaigns);
        toast.success("Ad campaigns synced with database");
      }
    } catch {
      toast.error("Failed to refresh campaigns");
    } finally {
      setIsRefreshing(false);
    }
  };

  const confirmDelete = async () => {
    if (!deletingCampaign) return;
    setIsDeleting(true);
    try {
      const res = await deleteMarketingCampaignAction(deletingCampaign.id);
      if (res.success) {
        toast.success("Campaign deleted successfully");
        setCampaigns((prev) => prev.filter((c) => c.id !== deletingCampaign.id));
        setDeletingCampaign(null);
      } else {
        toast.error(res.error || "Failed to delete campaign");
      }
    } catch {
      toast.error("Failed to delete campaign");
    } finally {
      setIsDeleting(false);
    }
  };

  // Filter campaigns
  const filtered = campaigns.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.channel.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPlatform =
      platformFilter === "ALL" ||
      c.channel.toLowerCase().includes(platformFilter.toLowerCase());
    return matchesSearch && matchesPlatform;
  });

  // Calculate totals
  const totalSpend = campaigns.reduce((acc, c) => {
    const num = Number(c.spent.replace(/[^0-9.-]+/g, "")) || 0;
    return acc + num;
  }, 0);
  const totalImpressions = campaigns.reduce((acc, c) => acc + (c.impressions || 0), 0);
  const totalClicks = campaigns.reduce((acc, c) => acc + (c.clicks || 0), 0);
  const totalLeads = campaigns.reduce((acc, c) => acc + (c.leads || 0), 0);
  const overallCtr =
    totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(2) + "%" : "0.00%";
  const avgCpl =
    totalLeads > 0 ? `৳${Math.round(totalSpend / totalLeads).toLocaleString()}` : "—";

  return (
    <div className="flex-1 space-y-6 max-w-[1600px] mx-auto text-foreground">
      {/* 1. TOP HEADER & CONTROLS */}
      <div className="p-4 sm:p-5 rounded-2xl border border-border/50 bg-card/60 backdrop-blur-md shadow-xs flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl flex items-center gap-2">
              <FiDollarSign className="h-6 w-6 text-amber-500" />
              Paid Advertising & PPC Performance
            </h1>
            <Badge
              variant="outline"
              className="text-[11px] font-medium px-2.5 py-0.5 border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/5"
            >
              Live Database Integrated
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Google Ads, Meta Ads & LinkedIn PPC campaign management, live spend tracking & conversion ROI
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
            className="h-8 text-xs font-semibold px-3 gap-1.5 bg-amber-600 hover:bg-amber-700 text-white shadow-xs"
          >
            <Link href="/dashboard/marketing/paid-ads/create">
              <FiPlus className="h-3.5 w-3.5" />
              New Ad Campaign & Snapshot
            </Link>
          </Button>
        </div>
      </div>

      {/* 2. SUMMARY METRIC CARDS */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border/50 bg-card/50 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Total Ad Spend
            </CardTitle>
            <FiDollarSign className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">৳{totalSpend.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">{campaigns.length} Active Campaigns</p>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/50 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Impressions & Reach
            </CardTitle>
            <FiEye className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{totalImpressions.toLocaleString()}</div>
            <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1">
              <FiTrendingUp className="h-3 w-3" /> CTR: {overallCtr}
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/50 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Clicks Generated
            </CardTitle>
            <FiMousePointer className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{totalClicks.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">Direct traffic generated</p>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/50 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Leads & Avg CPL
            </CardTitle>
            <FiTarget className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{totalLeads} Leads</div>
            <p className="text-xs text-muted-foreground mt-1">Avg CPL: {avgCpl}</p>
          </CardContent>
        </Card>
      </div>

      {/* 3. AD ACCOUNTS SUMMARY TABLE */}
      <div className="rounded-2xl border border-border/50 bg-card shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-border/40 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-amber-500/10 text-amber-500">
              <FiDollarSign className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground">Paid Ad Campaigns & PPC Accounts</h2>
              <p className="text-xs text-muted-foreground">
                Live campaign snapshots, performance metrics, and spend breakdown
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative w-48 sm:w-64">
              <FiSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search ad campaigns..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 pl-8 text-xs bg-muted/30"
              />
            </div>

            <Select value={platformFilter} onValueChange={setPlatformFilter}>
              <SelectTrigger className="h-8 text-xs w-[130px] bg-muted/30">
                <SelectValue placeholder="Platform" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Platforms</SelectItem>
                <SelectItem value="Google">Google Ads</SelectItem>
                <SelectItem value="Meta">Meta / FB Ads</SelectItem>
                <SelectItem value="LinkedIn">LinkedIn</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center justify-center space-y-3">
            <div className="h-12 w-12 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <FiInbox className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-foreground">No Paid Ad Campaigns Found</h3>
              <p className="text-xs text-muted-foreground max-w-sm">
                {searchQuery
                  ? "No campaigns match your search criteria. Try a different query."
                  : "You haven't recorded any paid ad campaigns or snapshots yet. Click below to add your first campaign."}
              </p>
            </div>
            <Button
              size="sm"
              asChild
              className="h-8 text-xs bg-amber-600 hover:bg-amber-700 text-white gap-1.5"
            >
              <Link href="/dashboard/marketing/paid-ads/create">
                <FiPlus className="h-3.5 w-3.5" />
                Create First Ad Campaign
              </Link>
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/40 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider border-b border-border/40">
                <tr>
                  <th className="px-4 py-3">Campaign & Platform</th>
                  <th className="px-4 py-3">Impressions</th>
                  <th className="px-4 py-3">Clicks</th>
                  <th className="px-4 py-3">CTR</th>
                  <th className="px-4 py-3">Total Spend</th>
                  <th className="px-4 py-3">CPC</th>
                  <th className="px-4 py-3">Leads</th>
                  <th className="px-4 py-3">CPL</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {filtered.map((acc) => (
                  <tr key={acc.id} className="hover:bg-accent/20 transition-colors">
                    <td className="px-4 py-3.5 font-medium text-foreground">
                      <div className="font-semibold text-foreground flex items-center gap-1.5">
                        <Link
                          href={`/dashboard/marketing/campaigns/${acc.id}`}
                          className="hover:text-primary hover:underline flex items-center gap-1"
                        >
                          {acc.name}
                          <FiExternalLink className="h-3 w-3 opacity-60" />
                        </Link>
                      </div>
                      <span className="text-[10px] font-mono text-muted-foreground">
                        {acc.channel} • {acc.id}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 font-mono text-muted-foreground">{acc.impressions.toLocaleString()}</td>
                    <td className="px-4 py-3.5 font-mono text-foreground font-semibold">
                      {acc.clicks.toLocaleString()}
                    </td>
                    <td className="px-4 py-3.5 font-mono text-emerald-500 font-semibold">{acc.ctr}</td>
                    <td className="px-4 py-3.5 font-mono font-bold text-amber-500">{acc.spent}</td>
                    <td className="px-4 py-3.5 font-mono text-foreground">{acc.cpc}</td>
                    <td className="px-4 py-3.5 font-mono font-bold text-blue-500">{acc.leads}</td>
                    <td className="px-4 py-3.5 font-mono font-bold text-emerald-500">{acc.cpl}</td>
                    <td className="px-4 py-3.5">
                      <Badge
                        variant="outline"
                        className={`text-[9px] px-2 py-0.2 uppercase font-bold ${
                          acc.status === "Active" || acc.status === "LAUNCHED"
                            ? "text-emerald-500 border-emerald-500/30 bg-emerald-500/5"
                            : acc.status === "COMPLETED"
                            ? "text-blue-500 border-blue-500/30 bg-blue-500/5"
                            : "text-amber-500 border-amber-500/30 bg-amber-500/5"
                        }`}
                      >
                        {acc.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-rose-500"
                        onClick={() => setDeletingCampaign({ id: acc.id, name: acc.name })}
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
      </div>

      {/* DELETE CONFIRMATION MODAL */}
      {deletingCampaign && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl bg-card border border-border/80 p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-500 shrink-0">
                <FiTrash2 className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-semibold text-foreground">
                  Delete Paid Ad Campaign?
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Are you sure you want to delete <span className="font-semibold text-foreground">"{deletingCampaign.name}"</span>? This ad campaign and all associated tracking data will be removed.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isDeleting}
                onClick={() => setDeletingCampaign(null)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                variant="destructive"
                disabled={isDeleting}
                onClick={confirmDelete}
                className="text-xs font-semibold"
              >
                {isDeleting ? "Deleting..." : "Delete Campaign"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
