"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  FiLayers,
  FiPlus,
  FiSearch,
  FiRefreshCw,
  FiEye,
  FiTrash2,
  FiDollarSign,
  FiGrid,
  FiList,
  FiInbox,
  FiMessageSquare,
  FiSmartphone,
  FiMail,
  FiBriefcase,
  FiArrowRight,
} from "react-icons/fi";
import {
  MarketingCampaignListItem,
  deleteMarketingCampaignAction,
} from "@/app/actions/crm/marketing-operations.action";
import { toast } from "sonner";
import { MarketingCampaignType } from "@prisma/client";

interface CampaignsViewProps {
  initialCampaigns?: MarketingCampaignListItem[];
}

interface ChannelOption {
  id: string;
  type: MarketingCampaignType;
  title: string;
  subtitle: string;
  channelName: string;
  icon: React.ComponentType<{ className?: string }>;
  colorClass: string;
  badge: string;
  href: string;
}

const CHANNEL_OPTIONS: ChannelOption[] = [
  {
    id: "ads",
    type: MarketingCampaignType.PAID_ADS,
    title: "Meta & Google Ads",
    subtitle: "Search Ads, GDN & Social PPC",
    channelName: "Google Search & Meta Ads",
    icon: FiDollarSign,
    colorClass: "amber",
    badge: "PPC / Ads",
    href: "/dashboard/marketing/paid-ads/create",
  },
  {
    id: "sms",
    type: MarketingCampaignType.DIGITAL_MARKETING,
    title: "SMS Broadcast",
    subtitle: "Bulk SMS blasts & instant alerts",
    channelName: "Telco SMS Gateway",
    icon: FiMessageSquare,
    colorClass: "rose",
    badge: "SMS Blast",
    href: "/dashboard/marketing/sms-campaign/create",
  },
  {
    id: "wa",
    type: MarketingCampaignType.DIGITAL_MARKETING,
    title: "WhatsApp Marketing",
    subtitle: "Direct 1-on-1 engagement & catalog",
    channelName: "WhatsApp Business API",
    icon: FiSmartphone,
    colorClass: "emerald",
    badge: "WhatsApp",
    href: "/dashboard/marketing/wa-campaign/create",
  },
  {
    id: "email",
    type: MarketingCampaignType.EMAIL_CAMPAIGN,
    title: "Email Broadcast",
    subtitle: "Newsletter & automated nurture",
    channelName: "Email Broadcast Engine",
    icon: FiMail,
    colorClass: "teal",
    badge: "Newsletter",
    href: "/dashboard/marketing/email-campaigns/create",
  },
  {
    id: "physical",
    type: MarketingCampaignType.DIGITAL_MARKETING,
    title: "Physical & Billboard",
    subtitle: "Trade shows, events & outdoor banners",
    channelName: "Offline Events & Billboards",
    icon: FiBriefcase,
    colorClass: "blue",
    badge: "Offline",
    href: "/dashboard/marketing/physical-campaign/create",
  },
  {
    id: "funnel",
    type: MarketingCampaignType.DIGITAL_MARKETING,
    title: "7-Stage Funnel Plan",
    subtitle: "End-to-end full marketing funnel",
    channelName: "Multi-Channel Sequential Funnel",
    icon: FiLayers,
    colorClass: "purple",
    badge: "Strategic",
    href: "/dashboard/marketing/campaigns/create",
  },
];

export default function CampaignsView({
  initialCampaigns = [],
}: CampaignsViewProps) {
  const router = useRouter();
  const [campaignsList, setCampaignsList] = useState<MarketingCampaignListItem[]>(initialCampaigns);
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterStage, setFilterStage] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    setCampaignsList(initialCampaigns);
  }, [initialCampaigns]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    router.refresh();
    setTimeout(() => setIsRefreshing(false), 600);
  };

  const handleTrashCampaign = async (id: string) => {
    if (!confirm("Are you sure you want to delete this marketing campaign?")) return;
    try {
      const res = await deleteMarketingCampaignAction(id);
      if (res.success) {
        setCampaignsList((prev) => prev.filter((c) => c.id !== id));
        toast.success("Campaign deleted successfully");
        router.refresh();
      } else {
        toast.error(res.error || "Failed to delete campaign");
      }
    } catch {
      toast.error("An error occurred while deleting the campaign");
    }
  };

  const filteredCampaigns = campaignsList.filter((c) => {
    const matchesType =
      filterType === "all" ||
      c.type.toLowerCase() === filterType.toLowerCase() ||
      c.channel.toLowerCase().includes(filterType.toLowerCase());
    const matchesStatus =
      filterStatus === "all" ||
      c.status.toLowerCase() === filterStatus.toLowerCase();
    const matchesStage =
      filterStage === "all" ||
      c.stage.toLowerCase() === filterStage.toLowerCase();
    const matchesSearch =
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.channel.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.objective.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.id.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesStatus && matchesStage && matchesSearch;
  });

  // Dynamic Metrics
  const activeCount = campaignsList.filter(
    (c) => c.status.toUpperCase() === "ACTIVE"
  ).length;

  const leadGenCount = campaignsList.filter((c) =>
    c.stage.toLowerCase().includes("lead")
  ).length;

  const totalBudgetSum = campaignsList.reduce((acc, c) => {
    const num = parseInt(c.budget.replace(/[^0-9]/g, ""), 10) || 0;
    return acc + num;
  }, 0);

  const totalSpentSum = campaignsList.reduce((acc, c) => {
    const num = parseInt(c.spent.replace(/[^0-9]/g, ""), 10) || 0;
    return acc + num;
  }, 0);

  const totalLeadsSum = campaignsList.reduce((acc, c) => acc + (c.leads || 0), 0);
  const avgCpl =
    totalLeadsSum > 0
      ? `৳${Math.round(totalSpentSum / totalLeadsSum).toLocaleString()}`
      : "—";

  return (
    <div className="flex-1 space-y-6 max-w-[1600px] mx-auto text-foreground">
      {/* 1. TOP HEADER & CONTROLS */}
      <div className="p-4 sm:p-5 rounded-2xl border border-border/50 bg-card/60 backdrop-blur-md shadow-xs flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
              Marketing Campaign Operations
            </h1>
            <Badge
              variant="outline"
              className="text-[11px] font-medium px-2.5 py-0.5 border-purple-500/30 text-purple-600 dark:text-purple-400 bg-purple-500/5"
            >
              Master Campaigns Ledger
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Centralized ledger across Paid Ads, SMS, WhatsApp, Email, Physical, and Strategic Funnel campaigns
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
          {/* View Toggle */}
          <div className="flex items-center bg-muted/60 p-0.5 rounded-lg border border-border/40">
            <Button
              size="sm"
              variant={viewMode === "table" ? "default" : "ghost"}
              className="h-7 px-2.5 text-xs gap-1.5 font-medium"
              onClick={() => setViewMode("table")}
              title="List / Ledger View"
            >
              <FiList className="h-3.5 w-3.5" />
              List
            </Button>
            <Button
              size="sm"
              variant={viewMode === "grid" ? "default" : "ghost"}
              className="h-7 px-2.5 text-xs gap-1.5 font-medium"
              onClick={() => setViewMode("grid")}
              title="Card Grid View"
            >
              <FiGrid className="h-3.5 w-3.5" />
              Cards
            </Button>
          </div>

          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground border-border/50"
            onClick={handleRefresh}
            title="Refresh"
          >
            <FiRefreshCw
              className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin text-primary" : ""}`}
            />
          </Button>

          <Button
            size="sm"
            asChild
            className="h-8 text-xs font-semibold px-3.5 shadow-xs gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Link href="/dashboard/marketing/campaigns/create">
              <FiPlus className="h-3.5 w-3.5" />
              New Campaign
            </Link>
          </Button>
        </div>
      </div>

      {/* 2. STATS & KPIS STRIP */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-4 lg:grid-cols-4">
        <div className="p-4 rounded-xl border border-border/50 bg-card shadow-2xs space-y-1">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block">
            Active Campaigns
          </span>
          <div className="text-2xl font-extrabold text-foreground">{activeCount}</div>
          <span className="text-[10px] text-muted-foreground">
            {campaignsList.length} Total Campaigns
          </span>
        </div>

        <div className="p-4 rounded-xl border border-border/50 bg-card shadow-2xs space-y-1">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block">
            Lead Gen Campaigns
          </span>
          <div className="text-2xl font-extrabold text-blue-500">{leadGenCount}</div>
          <span className="text-[10px] text-muted-foreground">Active funnel stages</span>
        </div>

        <div className="p-4 rounded-xl border border-border/50 bg-card shadow-2xs space-y-1">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block">
            Budget vs Spend
          </span>
          <div className="text-2xl font-extrabold text-amber-500">
            ৳{totalSpentSum.toLocaleString()}
          </div>
          <span className="text-[10px] text-muted-foreground">
            Allocated: ৳{totalBudgetSum.toLocaleString()}
          </span>
        </div>

        <div className="p-4 rounded-xl border border-border/50 bg-card shadow-2xs space-y-1">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block">
            Total Leads / Avg CPL
          </span>
          <div className="text-2xl font-extrabold text-emerald-500">
            {totalLeadsSum.toLocaleString()} Leads
          </div>
          <span className="text-[10px] text-muted-foreground">Avg CPL: {avgCpl}</span>
        </div>
      </div>

      {/* 3. CHANNEL QUICK-LAUNCH TILES */}
      <div className="p-4 sm:p-5 rounded-2xl border border-border/50 bg-card/60 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
              <FiLayers className="h-4 w-4 text-purple-500" />
              Launch Specialized Channel Campaign
            </h2>
            <p className="text-xs text-muted-foreground">
              Select a dedicated channel studio to create and manage campaigns with custom telemetry
            </p>
          </div>
          <Button variant="ghost" size="sm" asChild className="text-xs gap-1 text-primary">
            <Link href="/dashboard/marketing/campaigns/create">
              Multi-Stage Setup
              <FiArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {CHANNEL_OPTIONS.map((c) => {
            const Icon = c.icon;
            return (
              <Link
                key={c.id}
                href={c.href}
                className="p-3.5 rounded-xl border border-border/50 bg-card hover:bg-accent/30 hover:border-border transition-all flex flex-col justify-between space-y-2.5 group shadow-2xs"
              >
                <div className="flex items-center justify-between">
                  <div className={`p-2 rounded-lg bg-muted text-foreground group-hover:scale-105 transition-transform`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-muted/60 text-muted-foreground uppercase font-semibold">
                    {c.badge}
                  </span>
                </div>
                <div>
                  <div className="font-bold text-foreground text-xs leading-tight group-hover:text-primary transition-colors">
                    {c.title}
                  </div>
                  <div className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5">
                    {c.subtitle}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* 4. FILTER & SEARCH TOOLBAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border border-border/50 bg-card/60 shadow-xs">
        <div className="relative flex-1 max-w-sm">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search campaigns by name, channel, objective, ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-8 pl-8 pr-3 rounded-lg border border-border bg-background text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="h-8 text-xs w-[130px]">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="PAID_ADS">Paid PPC Ads</SelectItem>
              <SelectItem value="DIGITAL_MARKETING">Digital & Broadcast</SelectItem>
              <SelectItem value="EMAIL_CAMPAIGN">Email Campaigns</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="h-8 text-xs w-[120px]">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="SCHEDULED">Scheduled</SelectItem>
              <SelectItem value="COMPLETED">Completed</SelectItem>
              <SelectItem value="DRAFT">Draft</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterStage} onValueChange={setFilterStage}>
            <SelectTrigger className="h-8 text-xs w-[140px]">
              <SelectValue placeholder="All Stages" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Funnel Stages</SelectItem>
              <SelectItem value="Awareness">Awareness</SelectItem>
              <SelectItem value="Engagement">Engagement</SelectItem>
              <SelectItem value="Lead Generation">Lead Generation</SelectItem>
              <SelectItem value="Conversion">Conversion</SelectItem>
              <SelectItem value="Retention">Retention</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* 5. MAIN LEDGER OR GRID VIEW */}
      {filteredCampaigns.length === 0 ? (
        <div className="p-12 text-center rounded-2xl border border-border/50 bg-card flex flex-col items-center justify-center space-y-3">
          <div className="h-12 w-12 rounded-full bg-muted/60 text-muted-foreground flex items-center justify-center">
            <FiInbox className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-foreground">
              No Marketing Campaigns Found
            </h3>
            <p className="text-xs text-muted-foreground max-w-sm">
              {searchQuery || filterType !== "all" || filterStage !== "all" || filterStatus !== "all"
                ? "No campaigns match your selected search or filter criteria. Try resetting filters."
                : "You haven't created any marketing campaigns yet. Launch your first campaign now."}
            </p>
          </div>
          <Button
            size="sm"
            asChild
            className="mt-2 text-xs font-semibold gap-1.5"
          >
            <Link href="/dashboard/marketing/campaigns/create">
              <FiPlus className="h-3.5 w-3.5" />
              Create Your First Campaign
            </Link>
          </Button>
        </div>
      ) : viewMode === "table" ? (
        /* 5A. MODERN PROFESSIONAL LIST / LEDGER VIEW (DEFAULT) */
        <div className="rounded-2xl border border-border/50 bg-card shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/40 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider border-b border-border/40">
                <tr>
                  <th className="px-4 py-3.5">Campaign Identity</th>
                  <th className="px-4 py-3.5">Funnel Stage</th>
                  <th className="px-4 py-3.5">Primary Channel</th>
                  <th className="px-4 py-3.5">Duration</th>
                  <th className="px-4 py-3.5 min-w-[140px]">Budget & Spend</th>
                  <th className="px-4 py-3.5">Leads & CPL</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {filteredCampaigns.map((c) => {
                  const budgetNum = parseInt(c.budget.replace(/[^0-9]/g, ""), 10) || 1;
                  const spentNum = parseInt(c.spent.replace(/[^0-9]/g, ""), 10) || 0;
                  const spendPct = Math.min(100, Math.round((spentNum / budgetNum) * 100));

                  return (
                    <tr key={c.id} className="hover:bg-accent/20 transition-colors">
                      {/* Name & ID */}
                      <td className="px-4 py-3.5 font-medium text-foreground">
                        <div className="font-semibold text-foreground flex items-center gap-1.5">
                          <Link
                            href={`/dashboard/marketing/campaigns/${c.id}`}
                            className="hover:text-primary hover:underline"
                          >
                            {c.name}
                          </Link>
                        </div>
                        <div className="text-[10px] font-mono text-muted-foreground">{c.id}</div>
                      </td>

                      {/* Stage */}
                      <td className="px-4 py-3.5">
                        <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-semibold border bg-purple-500/5 text-purple-600 dark:text-purple-400 border-purple-500/30">
                          {c.stage}
                        </span>
                      </td>

                      {/* Channel */}
                      <td className="px-4 py-3.5 text-muted-foreground">{c.channel}</td>

                      {/* Dates */}
                      <td className="px-4 py-3.5 text-muted-foreground font-mono text-[11px]">
                        {c.startDate} → {c.endDate}
                      </td>

                      {/* Budget & Spend Meter */}
                      <td className="px-4 py-3.5 space-y-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-bold text-foreground font-mono">{c.spent}</span>
                          <span className="text-[10px] text-muted-foreground font-mono">/ {c.budget}</span>
                        </div>
                        <Progress value={spendPct} className="h-1.5" />
                      </td>

                      {/* Leads & CPL */}
                      <td className="px-4 py-3.5 font-mono">
                        <div className="font-bold text-emerald-500 text-xs">{c.leads} Leads</div>
                        <div className="text-[10px] text-muted-foreground">CPL: {c.cpl}</div>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3.5">
                        <Badge
                          variant="outline"
                          className={`text-[9px] px-2 py-0.5 uppercase font-bold ${
                            c.status.toUpperCase() === "ACTIVE"
                              ? "text-emerald-500 border-emerald-500/30 bg-emerald-500/5"
                              : c.status.toUpperCase() === "SCHEDULED"
                              ? "text-blue-500 border-blue-500/30 bg-blue-500/5"
                              : "text-muted-foreground border-border"
                          }`}
                        >
                          {c.status}
                        </Badge>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center justify-center gap-1.5">
                          <Button size="sm" variant="outline" className="h-7 px-2.5 text-[11px] font-medium" asChild>
                            <Link href={`/dashboard/marketing/campaigns/${c.id}`}>
                              <FiEye className="mr-1 h-3 w-3 text-blue-500" />
                              View
                            </Link>
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2 text-[11px] font-medium text-rose-500 border-rose-200 dark:border-rose-900/40 hover:bg-rose-500/10"
                            onClick={() => handleTrashCampaign(c.id)}
                            title="Delete Campaign"
                          >
                            <FiTrash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* 5B. CARD GRID VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCampaigns.map((c) => {
            const budgetNum = parseInt(c.budget.replace(/[^0-9]/g, ""), 10) || 1;
            const spentNum = parseInt(c.spent.replace(/[^0-9]/g, ""), 10) || 0;
            const spendPct = Math.min(100, Math.round((spentNum / budgetNum) * 100));

            return (
              <div
                key={c.id}
                className="p-5 rounded-2xl border border-border/50 bg-card hover:border-border transition-all shadow-xs flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className="text-[9px] px-2 py-0.2 font-mono uppercase text-muted-foreground"
                        >
                          {c.type}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground font-mono">
                          {c.id}
                        </span>
                      </div>
                      <h3 className="font-bold text-foreground text-sm leading-tight">
                        <Link
                          href={`/dashboard/marketing/campaigns/${c.id}`}
                          className="hover:text-primary hover:underline"
                        >
                          {c.name}
                        </Link>
                      </h3>
                    </div>

                    <Badge
                      variant="outline"
                      className={`text-[9px] px-2 py-0.5 uppercase font-bold shrink-0 ${
                        c.status.toUpperCase() === "ACTIVE"
                          ? "text-emerald-500 border-emerald-500/30 bg-emerald-500/5"
                          : c.status.toUpperCase() === "SCHEDULED"
                          ? "text-blue-500 border-blue-500/30 bg-blue-500/5"
                          : "text-muted-foreground border-border"
                      }`}
                    >
                      {c.status}
                    </Badge>
                  </div>

                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {c.objective}
                  </p>

                  <div className="p-2.5 rounded-xl bg-muted/40 border border-border/30 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground text-[11px]">Channel:</span>
                      <span className="font-semibold text-foreground truncate max-w-[160px]">
                        {c.channel}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground text-[11px]">Funnel Stage:</span>
                      <span className="font-semibold text-purple-600 dark:text-purple-400">
                        {c.stage}
                      </span>
                    </div>
                  </div>

                  {/* Budget & Spent Bar */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground text-[11px]">Spent vs Budget</span>
                      <span className="font-mono font-bold text-foreground">
                        {c.spent} <span className="text-muted-foreground font-normal">/ {c.budget}</span>
                      </span>
                    </div>
                    <Progress value={spendPct} className="h-1.5" />
                  </div>

                  {/* Leads Metrics */}
                  <div className="grid grid-cols-2 gap-2 pt-1 border-t border-border/40 text-center">
                    <div className="p-2 rounded-lg bg-background border border-border/40">
                      <div className="text-[10px] text-muted-foreground uppercase font-semibold">
                        Leads
                      </div>
                      <div className="text-sm font-extrabold text-emerald-500 font-mono">
                        {c.leads}
                      </div>
                    </div>
                    <div className="p-2 rounded-lg bg-background border border-border/40">
                      <div className="text-[10px] text-muted-foreground uppercase font-semibold">
                        CPL
                      </div>
                      <div className="text-sm font-extrabold text-foreground font-mono">
                        {c.cpl}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-border/30 text-xs">
                  <span className="text-muted-foreground font-mono text-[10px]">
                    {c.startDate}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <Button size="sm" variant="outline" className="h-7 px-2.5 text-[11px] font-medium" asChild>
                      <Link href={`/dashboard/marketing/campaigns/${c.id}`}>
                        <FiEye className="mr-1 h-3 w-3 text-blue-500" />
                        View
                      </Link>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 px-2 text-[11px] font-medium text-rose-500 border-rose-200 dark:border-rose-900/40 hover:bg-rose-500/10"
                      onClick={() => handleTrashCampaign(c.id)}
                      title="Delete Campaign"
                    >
                      <FiTrash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
