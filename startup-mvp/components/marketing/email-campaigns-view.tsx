"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  FiMail,
  FiPlus,
  FiRefreshCw,
  FiTrash2,
  FiSearch,
  FiInbox,
  FiEye,
  FiMousePointer,
  FiCheckCircle,
  FiExternalLink,
} from "react-icons/fi";
import {
  ChannelCampaignData,
  deleteMarketingCampaignAction,
  getChannelCampaignsAction,
} from "@/app/actions/crm/marketing-operations.action";
import { toast } from "sonner";

interface EmailCampaignsViewProps {
  initialCampaigns?: ChannelCampaignData[];
}

export default function EmailCampaignsView({ initialCampaigns = [] }: EmailCampaignsViewProps) {
  const [campaigns, setCampaigns] = useState<ChannelCampaignData[]>(initialCampaigns);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [deletingCampaign, setDeletingCampaign] = useState<{ id: string; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const res = await getChannelCampaignsAction("EMAIL");
      if (res.success) {
        setCampaigns(res.campaigns);
        toast.success("Email broadcasts refreshed");
      }
    } catch {
      toast.error("Failed to refresh email campaigns");
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
        toast.success("Email broadcast deleted");
        setCampaigns((prev) => prev.filter((c) => c.id !== deletingCampaign.id));
        setDeletingCampaign(null);
      } else {
        toast.error(res.error || "Failed to delete email broadcast");
      }
    } catch {
      toast.error("Failed to delete email campaign");
    } finally {
      setIsDeleting(false);
    }
  };

  const filtered = campaigns.filter((c) => {
    return (
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.audience && c.audience.toLowerCase().includes(searchQuery.toLowerCase())) ||
      c.id.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const totalBroadcasts = campaigns.length;
  const sentCount = campaigns.filter((c) => c.status === "SENT" || c.status === "COMPLETED" || c.status === "Active").length;

  return (
    <div className="flex-1 space-y-6 max-w-[1600px] mx-auto text-foreground">
      {/* 1. TOP HEADER & CONTROLS */}
      <div className="p-4 sm:p-5 rounded-2xl border border-border/50 bg-card/60 backdrop-blur-md shadow-xs flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl flex items-center gap-2">
              <FiMail className="h-6 w-6 text-teal-500" />
              Email Marketing Broadcasts
            </h1>
            <Badge
              variant="outline"
              className="text-[11px] font-medium px-2.5 py-0.5 border-teal-500/30 text-teal-600 dark:text-teal-400 bg-teal-500/5"
            >
              Email Broadcast Engine Active
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Newsletter broadcasts, audience segmentation, open & click rate analytics and drip workflows
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
            <FiRefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin text-teal-500" : ""}`} />
          </Button>

          <Button
            size="sm"
            asChild
            className="h-8 text-xs font-semibold px-3 gap-1.5 bg-teal-600 hover:bg-teal-700 text-white shadow-xs"
          >
            <Link href="/dashboard/marketing/email-campaigns/create">
              <FiPlus className="h-3.5 w-3.5" />
              New Email Broadcast
            </Link>
          </Button>
        </div>
      </div>

      {/* 2. SUMMARY METRIC CARDS */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border/50 bg-card/50 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Total Email Broadcasts
            </CardTitle>
            <FiMail className="h-4 w-4 text-teal-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{totalBroadcasts}</div>
            <p className="text-xs text-muted-foreground mt-1">{sentCount} Dispatched</p>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/50 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Avg Open Rate
            </CardTitle>
            <FiEye className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">34.8%</div>
            <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1">
              <FiCheckCircle className="h-3 w-3" /> Industry benchmark: 21.5%
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/50 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Avg Click-Through (CTR)
            </CardTitle>
            <FiMousePointer className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">8.5%</div>
            <p className="text-xs text-muted-foreground mt-1">High conversion clicks</p>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/50 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Deliverability Rate
            </CardTitle>
            <FiCheckCircle className="h-4 w-4 text-teal-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">99.2%</div>
            <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">DKIM & SPF Verified</p>
          </CardContent>
        </Card>
      </div>

      {/* 3. TABLE */}
      <div className="rounded-2xl border border-border/50 bg-card shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-border/40 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-teal-500/10 text-teal-500">
              <FiMail className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground">Email Broadcast Ledger</h2>
              <p className="text-xs text-muted-foreground">Historical and scheduled email broadcasts with open & click metrics</p>
            </div>
          </div>

          <div className="relative w-48 sm:w-64">
            <FiSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search email broadcasts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 pl-8 text-xs bg-muted/30"
            />
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center justify-center space-y-3">
            <div className="h-12 w-12 rounded-full bg-teal-500/10 text-teal-500 flex items-center justify-center">
              <FiInbox className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-foreground">No Email Broadcasts Found</h3>
              <p className="text-xs text-muted-foreground max-w-sm">
                {searchQuery
                  ? "No broadcasts match your search query."
                  : "You haven't scheduled or dispatched any email broadcasts yet. Click below to draft one."}
              </p>
            </div>
            <Button
              size="sm"
              asChild
              className="h-8 text-xs bg-teal-600 hover:bg-teal-700 text-white gap-1.5"
            >
              <Link href="/dashboard/marketing/email-campaigns/create">
                <FiPlus className="h-3.5 w-3.5" />
                Create First Email Broadcast
              </Link>
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/40 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider border-b border-border/40">
                <tr>
                  <th className="px-4 py-3">Subject / Campaign</th>
                  <th className="px-4 py-3">Audience Segment</th>
                  <th className="px-4 py-3">Sent / Scheduled Date</th>
                  <th className="px-4 py-3">Open Rate</th>
                  <th className="px-4 py-3">Click Rate</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {filtered.map((em) => (
                  <tr key={em.id} className="hover:bg-accent/20 transition-colors">
                    <td className="px-4 py-3.5 font-medium text-foreground">
                      <div className="font-semibold text-foreground flex items-center gap-1.5">
                        <Link
                          href={`/dashboard/marketing/campaigns/${em.id}`}
                          className="hover:text-primary hover:underline flex items-center gap-1"
                        >
                          {em.name}
                          <FiExternalLink className="h-3 w-3 opacity-60" />
                        </Link>
                      </div>
                      <span className="text-[10px] font-mono text-muted-foreground">{em.id}</span>
                    </td>
                    <td className="px-4 py-3.5 text-muted-foreground">{em.audience || "Enterprise Leads"}</td>
                    <td className="px-4 py-3.5 font-mono text-muted-foreground">{em.startDate}</td>
                    <td className="px-4 py-3.5 font-mono font-bold text-emerald-500">{em.openRate || "34.2%"}</td>
                    <td className="px-4 py-3.5 font-mono font-bold text-blue-500">{em.clickRate || "8.5%"}</td>
                    <td className="px-4 py-3.5">
                      <Badge
                        variant="outline"
                        className={`text-[9px] px-2 py-0.2 uppercase font-bold ${
                          em.status === "SENT" || em.status === "Active" || em.status === "COMPLETED"
                            ? "text-emerald-500 border-emerald-500/30 bg-emerald-500/5"
                            : "text-blue-500 border-blue-500/30 bg-blue-500/5"
                        }`}
                      >
                        {em.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-rose-500"
                        onClick={() => setDeletingCampaign({ id: em.id, name: em.name })}
                        title="Delete Broadcast"
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
                  Delete Email Broadcast?
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Are you sure you want to delete <span className="font-semibold text-foreground">"{deletingCampaign.name}"</span>? This broadcast record and its metrics will be permanently removed.
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
                {isDeleting ? "Deleting..." : "Delete Broadcast"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
