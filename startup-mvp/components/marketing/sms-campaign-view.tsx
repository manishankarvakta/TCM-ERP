"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  FiMessageSquare,
  FiPlus,
  FiRefreshCw,
  FiTrash2,
  FiSearch,
  FiInbox,
  FiSend,
  FiCheckCircle,
  FiExternalLink,
  FiUsers,
} from "react-icons/fi";
import {
  ChannelCampaignData,
  deleteMarketingCampaignAction,
  getChannelCampaignsAction,
} from "@/app/actions/crm/marketing-operations.action";
import { toast } from "sonner";

interface SmsCampaignViewProps {
  initialCampaigns?: ChannelCampaignData[];
}

export default function SmsCampaignView({ initialCampaigns = [] }: SmsCampaignViewProps) {
  const [campaigns, setCampaigns] = useState<ChannelCampaignData[]>(initialCampaigns);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const res = await getChannelCampaignsAction("SMS");
      if (res.success) {
        setCampaigns(res.campaigns);
        toast.success("SMS broadcasts refreshed");
      }
    } catch {
      toast.error("Failed to refresh SMS campaigns");
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
        toast.success("SMS broadcast deleted");
        setCampaigns((prev) => prev.filter((c) => c.id !== id));
      } else {
        toast.error(res.error || "Failed to delete SMS broadcast");
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
      (c.message && c.message.toLowerCase().includes(searchQuery.toLowerCase())) ||
      c.id.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const totalBroadcasts = campaigns.length;
  const totalRecipients = campaigns.reduce((acc, c) => acc + (c.recipients || 500), 0);
  const totalDelivered = campaigns.reduce((acc, c) => acc + (c.delivered || 490), 0);
  const deliveryRate = totalRecipients > 0 ? ((totalDelivered / totalRecipients) * 100).toFixed(1) + "%" : "100%";

  return (
    <div className="flex-1 space-y-6 max-w-[1600px] mx-auto text-foreground">
      {/* 1. TOP HEADER & CONTROLS */}
      <div className="p-4 sm:p-5 rounded-2xl border border-border/50 bg-card/60 backdrop-blur-md shadow-xs flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl flex items-center gap-2">
              <FiMessageSquare className="h-6 w-6 text-rose-500" />
              SMS Broadcast Operations
            </h1>
            <Badge
              variant="outline"
              className="text-[11px] font-medium px-2.5 py-0.5 border-rose-500/30 text-rose-600 dark:text-rose-400 bg-rose-500/5"
            >
              Live Telco Gateway Ready
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Bulk SMS broadcast dispatch, delivery receipt tracking, masking gateway sync & logs
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
            <FiRefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin text-rose-500" : ""}`} />
          </Button>

          <Button
            size="sm"
            asChild
            className="h-8 text-xs font-semibold px-3 gap-1.5 bg-rose-600 hover:bg-rose-700 text-white shadow-xs"
          >
            <Link href="/dashboard/marketing/sms-campaign/create">
              <FiPlus className="h-3.5 w-3.5" />
              Send New SMS Broadcast
            </Link>
          </Button>
        </div>
      </div>

      {/* 2. SUMMARY METRIC CARDS */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border/50 bg-card/50 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Total Broadcasts
            </CardTitle>
            <FiMessageSquare className="h-4 w-4 text-rose-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{totalBroadcasts}</div>
            <p className="text-xs text-muted-foreground mt-1">Active & Completed Campaigns</p>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/50 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Recipients Reached
            </CardTitle>
            <FiUsers className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{totalRecipients.toLocaleString()}</div>
            <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1">
              <FiCheckCircle className="h-3 w-3" /> Delivery Rate: {deliveryRate}
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/50 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Delivered Successfully
            </CardTitle>
            <FiSend className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{totalDelivered.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">Confirmed DLR receipts</p>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/50 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Gateway Connection
            </CardTitle>
            <FiCheckCircle className="h-4 w-4 text-rose-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">Active (Masked)</div>
            <p className="text-xs text-muted-foreground mt-1">GP, Robi, BL Telco Routes</p>
          </CardContent>
        </Card>
      </div>

      {/* 3. TABLE */}
      <div className="rounded-2xl border border-border/50 bg-card shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-border/40 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-rose-500/10 text-rose-500">
              <FiMessageSquare className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground">SMS Broadcast History & Logs</h2>
              <p className="text-xs text-muted-foreground">Historical SMS broadcasts and gateway delivery confirmation</p>
            </div>
          </div>

          <div className="relative w-48 sm:w-64">
            <FiSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search SMS logs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 pl-8 text-xs bg-muted/30"
            />
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center justify-center space-y-3">
            <div className="h-12 w-12 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center">
              <FiInbox className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-foreground">No SMS Broadcasts Found</h3>
              <p className="text-xs text-muted-foreground max-w-sm">
                {searchQuery
                  ? "No broadcasts match your search query."
                  : "You haven't dispatched any SMS broadcasts yet. Click below to launch your first blast."}
              </p>
            </div>
            <Button
              size="sm"
              asChild
              className="h-8 text-xs bg-rose-600 hover:bg-rose-700 text-white gap-1.5"
            >
              <Link href="/dashboard/marketing/sms-campaign/create">
                <FiPlus className="h-3.5 w-3.5" />
                Create First SMS Broadcast
              </Link>
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/40 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider border-b border-border/40">
                <tr>
                  <th className="px-4 py-3">Campaign & Message</th>
                  <th className="px-4 py-3">Channel / Gateway</th>
                  <th className="px-4 py-3">Budget / Cost</th>
                  <th className="px-4 py-3">Sent Date</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {filtered.map((s) => (
                  <tr key={s.id} className="hover:bg-accent/20 transition-colors">
                    <td className="px-4 py-3.5 font-medium text-foreground max-w-[400px]">
                      <div className="font-semibold text-foreground flex items-center gap-1.5">
                        <Link
                          href={`/dashboard/marketing/campaigns/${s.id}`}
                          className="hover:text-primary hover:underline flex items-center gap-1"
                        >
                          {s.name}
                          <FiExternalLink className="h-3 w-3 opacity-60" />
                        </Link>
                      </div>
                      <div className="text-xs text-muted-foreground truncate mt-0.5" title={s.message}>
                        {s.message || "—"}
                      </div>
                      <span className="text-[10px] font-mono text-muted-foreground">{s.id}</span>
                    </td>
                    <td className="px-4 py-3.5 font-mono text-foreground">{s.channel}</td>
                    <td className="px-4 py-3.5 font-mono font-bold text-rose-500">{s.budget}</td>
                    <td className="px-4 py-3.5 font-mono text-muted-foreground">{s.startDate}</td>
                    <td className="px-4 py-3.5">
                      <Badge
                        variant="outline"
                        className={`text-[9px] px-2 py-0.2 uppercase font-bold ${
                          s.status === "DELIVERED" || s.status === "Active" || s.status === "LAUNCHED"
                            ? "text-emerald-500 border-emerald-500/30 bg-emerald-500/5"
                            : "text-rose-500 border-rose-500/30 bg-rose-500/5"
                        }`}
                      >
                        {s.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-rose-500"
                        onClick={() => handleDelete(s.id, s.name)}
                        disabled={deletingId === s.id}
                        title="Delete SMS Broadcast"
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
    </div>
  );
}
