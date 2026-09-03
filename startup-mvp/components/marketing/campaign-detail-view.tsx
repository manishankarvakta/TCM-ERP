"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  FiArrowLeft,
  FiEdit,
  FiTrash2,
  FiAlertTriangle,
  FiCheckCircle,
  FiClock,
  FiDollarSign,
  FiTrendingUp,
  FiCalendar,
  FiUser,
  FiLayers,
  FiRefreshCw,
  FiX,
  FiCornerUpLeft,
  FiTarget,
  FiChevronRight,
  FiZap,
  FiPieChart,
} from "react-icons/fi";
import {
  updateMarketingCampaign,
  trashMarketingCampaignAction,
  restoreMarketingCampaignAction,
  deleteMarketingCampaignPermanentlyAction,
  initializeCampaignFunnel,
} from "@/app/actions/crm/marketing-operations.action";

interface CampaignDetailViewProps {
  campaignId: string;
}

export default function CampaignDetailView({ campaignId }: CampaignDetailViewProps) {
  const router = useRouter();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [activeTab, setActiveTab] = useState("funnel");

  // Mock / Initial Data
  const [campaign, setCampaign] = useState({
    id: campaignId,
    name: "Q3 Fintech Lead Generation",
    type: "DIGITAL_MARKETING",
    stage: "Lead Generation",
    channel: "Meta & Google Ads",
    objective: "Lead Generation for Enterprise ERP & Banking Solutions",
    startDate: "2026-08-01",
    endDate: "2026-09-30",
    status: "ACTIVE",
    budget: "৳5,00,000",
    allocatedBudget: "৳4,60,000",
    spent: "৳2,85,000",
    remaining: "৳2,15,000",
    leads: 1280,
    sqls: 420,
    customers: 78,
    revenue: "৳48,00,000",
    roas: "12.5x",
    roi: "340%",
    projectName: "Apex Fintech Banking Portal",
    assignedEmployee: "Farhana Yeasmin",
  });

  const [funnelStages, setFunnelStages] = useState([
    { id: "stg-1", position: 1, name: "Awareness", status: "COMPLETED", plannedBudget: "৳1,00,000", actualSpend: "৳98,000", leads: 250000, conversionRate: "100%", readiness: 100 },
    { id: "stg-2", position: 2, name: "Acknowledgment", status: "COMPLETED", plannedBudget: "৳50,000", actualSpend: "৳48,500", leads: 55000, conversionRate: "22.0%", readiness: 100 },
    { id: "stg-3", position: 3, name: "Engagement", status: "ACTIVE", plannedBudget: "৳70,000", actualSpend: "৳43,500", leads: 14500, conversionRate: "26.3%", readiness: 95 },
    { id: "stg-4", position: 4, name: "Lead Generation", status: "ACTIVE", plannedBudget: "৳1,40,000", actualSpend: "৳95,000", leads: 1280, conversionRate: "8.8%", readiness: 92 },
    { id: "stg-5", position: 5, name: "Lead Nurturing", status: "PLANNED", plannedBudget: "৳40,000", actualSpend: "৳0", leads: 420, conversionRate: "32.8%", readiness: 80 },
    { id: "stg-6", position: 6, name: "Sales Conversion", status: "PLANNED", plannedBudget: "৳70,000", actualSpend: "৳0", leads: 78, conversionRate: "18.5%", readiness: 75 },
    { id: "stg-7", position: 7, name: "Retention / Remarketing", status: "PLANNED", plannedBudget: "৳30,000", actualSpend: "৳0", leads: 0, conversionRate: "0%", readiness: 60 },
  ]);

  const [editForm, setEditForm] = useState({
    name: campaign.name,
    stage: campaign.stage,
    channel: campaign.channel,
    objective: campaign.objective,
    startDate: campaign.startDate,
    endDate: campaign.endDate,
    status: campaign.status,
  });

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const handleInitializeFunnel = async () => {
    if (confirm("Provision 7-Stage Standard Marketing Funnel for this campaign?")) {
      alert("Standard Marketing Funnel (Awareness → Retention) initialized!");
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCampaign({ ...campaign, ...editForm });
    setShowEditModal(false);
  };

  const handleMoveToTrash = async () => {
    if (confirm("Are you sure you want to move this campaign to Trash?")) {
      setCampaign({ ...campaign, status: "CANCELLED" });
    }
  };

  const handleRestore = async () => {
    setCampaign({ ...campaign, status: "ACTIVE" });
  };

  const handleDeletePermanently = async () => {
    if (confirm("⚠️ WARNING: This will PERMANENTLY delete this campaign from the database. Proceed?")) {
      router.push("/dashboard/marketing/campaigns");
    }
  };

  const isTrashed = campaign.status === "CANCELLED";

  return (
    <div className="flex-1 space-y-6 max-w-[1600px] mx-auto text-foreground">
      {/* 1. TOP HEADER */}
      <div className="flex items-center justify-between border-b border-border/40 pb-4">
        <Button variant="outline" size="sm" asChild className="h-8 text-xs font-semibold">
          <Link href="/dashboard/marketing/campaigns">
            <FiArrowLeft className="mr-1.5 h-3.5 w-3.5" />
            Back to Campaigns List
          </Link>
        </Button>

        <Button size="sm" variant="outline" className="h-8 text-xs font-semibold text-purple-600 border-purple-300" onClick={handleInitializeFunnel}>
          <FiZap className="mr-1.5 h-3.5 w-3.5" />
          Initialize Funnel
        </Button>
      </div>

      {/* TRASH WARNING BANNER */}
      {isTrashed && (
        <div className="p-4 rounded-2xl border border-rose-500/40 bg-rose-500/10 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
            <FiAlertTriangle className="h-5 w-5 shrink-0" />
            <div className="text-xs">
              <span className="font-bold block">This campaign is currently in Trash (Cancelled).</span>
              <span>It will be hidden from operational views until restored or permanently deleted.</span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button size="sm" variant="outline" className="h-8 text-xs font-semibold" onClick={handleRestore}>
              <FiCornerUpLeft className="mr-1.5 h-3.5 w-3.5" /> Restore Campaign
            </Button>
            <Button size="sm" variant="destructive" className="h-8 text-xs font-semibold" onClick={handleDeletePermanently}>
              <FiTrash2 className="mr-1.5 h-3.5 w-3.5" /> Delete Permanently
            </Button>
          </div>
        </div>
      )}

      {/* HEADER CARD */}
      <div className="p-4 sm:p-5 rounded-2xl border border-border/50 bg-card/60 backdrop-blur-md shadow-xs flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
              {campaign.name}
            </h1>
            <Badge variant="outline" className="text-[11px] font-bold px-2.5 py-0.5 border-purple-500/30 text-purple-600 dark:text-purple-400 bg-purple-500/5">
              Funnel Master Campaign
            </Badge>
            <Badge
              variant="outline"
              className={`text-[11px] font-bold px-2.5 py-0.5 uppercase ${
                isTrashed ? "text-rose-500 border-rose-500/30 bg-rose-500/5" : "text-emerald-500 border-emerald-500/30 bg-emerald-500/5"
              }`}
            >
              {isTrashed ? "TRASHED" : campaign.status}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
            <span>ID: {campaign.id}</span>
            <span>•</span>
            <span>Channel: {campaign.channel}</span>
            <span>•</span>
            <span>Project: {campaign.projectName}</span>
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

          <Button size="sm" variant="outline" className="h-8 text-xs font-semibold px-3" onClick={() => setShowEditModal(true)}>
            <FiEdit className="mr-1.5 h-3.5 w-3.5" /> Edit Campaign
          </Button>

          {!isTrashed ? (
            <Button size="sm" variant="outline" className="h-8 text-xs font-semibold px-3 text-rose-500 hover:text-rose-600 border-rose-200 dark:border-rose-900/40" onClick={handleMoveToTrash}>
              <FiTrash2 className="mr-1.5 h-3.5 w-3.5" /> Move to Trash
            </Button>
          ) : (
            <Button size="sm" variant="destructive" className="h-8 text-xs font-semibold px-3" onClick={handleDeletePermanently}>
              <FiTrash2 className="mr-1.5 h-3.5 w-3.5" /> Delete Permanently
            </Button>
          )}
        </div>
      </div>

      {/* 2. CEO SUMMARY SCORECARD */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-4 lg:grid-cols-6">
        <div className="p-3.5 rounded-xl border border-border/50 bg-card shadow-2xs space-y-1">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block">Approved Budget</span>
          <div className="text-xl font-extrabold text-foreground">{campaign.budget}</div>
          <span className="text-[10px] text-muted-foreground">Allocated: {campaign.allocatedBudget}</span>
        </div>

        <div className="p-3.5 rounded-xl border border-border/50 bg-card shadow-2xs space-y-1">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block">Actual Spend</span>
          <div className="text-xl font-extrabold text-amber-500">{campaign.spent}</div>
          <span className="text-[10px] text-emerald-500 font-medium">Remaining: {campaign.remaining}</span>
        </div>

        <div className="p-3.5 rounded-xl border border-border/50 bg-card shadow-2xs space-y-1">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block">Total Leads</span>
          <div className="text-xl font-extrabold text-blue-500">{campaign.leads}</div>
          <span className="text-[10px] text-muted-foreground">SQLs: {campaign.sqls}</span>
        </div>

        <div className="p-3.5 rounded-xl border border-border/50 bg-card shadow-2xs space-y-1">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block">Won Deals</span>
          <div className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400">{campaign.customers}</div>
          <span className="text-[10px] text-emerald-500 font-semibold">Customers</span>
        </div>

        <div className="p-3.5 rounded-xl border border-border/50 bg-card shadow-2xs space-y-1">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block">Attributed Revenue</span>
          <div className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400">{campaign.revenue}</div>
          <span className="text-[10px] text-emerald-500 font-semibold">ROAS: {campaign.roas}</span>
        </div>

        <div className="p-3.5 rounded-xl border border-border/50 bg-card shadow-2xs space-y-1">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block">Marketing ROI</span>
          <div className="text-xl font-extrabold text-purple-500">{campaign.roi}</div>
          <span className="text-[10px] text-purple-500 font-semibold">Profit Proxy</span>
        </div>
      </div>

      {/* 3. TABS (FUNNEL STAGES, SPECIFICATIONS, ETC.) */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-muted/60 p-1 border border-border/40 flex flex-wrap h-auto gap-1">
          <TabsTrigger value="funnel" className="text-xs font-semibold">Funnel Stages ({funnelStages.length})</TabsTrigger>
          <TabsTrigger value="specs" className="text-xs font-semibold">Campaign Specifications</TabsTrigger>
        </TabsList>

        {/* TAB 1: FUNNEL STAGES PIPELINE */}
        <TabsContent value="funnel" className="space-y-6">
          {/* HORIZONTAL FUNNEL STEPPER PIPELINE */}
          <div className="rounded-2xl border border-border/50 bg-card p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-border/40 pb-3">
              <div>
                <h2 className="text-sm font-bold text-foreground">Sequential Funnel Pipeline</h2>
                <p className="text-xs text-muted-foreground">Every stage acts as a complete operational marketing layer</p>
              </div>
              <span className="text-xs font-mono text-muted-foreground">7 Stages Configured</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-7 gap-2">
              {funnelStages.map((stg, i) => (
                <div
                  key={stg.id}
                  className={`p-3 rounded-xl border transition-all text-xs space-y-2 relative ${
                    stg.status === "ACTIVE"
                      ? "border-primary bg-primary/5 shadow-xs"
                      : stg.status === "COMPLETED"
                      ? "border-emerald-500/40 bg-emerald-500/5"
                      : "border-border/40 bg-background/50"
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                    <span className="font-bold">0{i + 1}</span>
                    <Badge variant="outline" className={`text-[8px] px-1 py-0.1 uppercase font-bold ${
                      stg.status === "ACTIVE" ? "text-primary border-primary/30" : stg.status === "COMPLETED" ? "text-emerald-500 border-emerald-500/30" : "text-muted-foreground"
                    }`}>
                      {stg.status}
                    </Badge>
                  </div>

                  <div className="font-bold text-foreground line-clamp-1">{stg.name}</div>

                  <div className="space-y-1 text-[10px]">
                    <div className="flex justify-between text-muted-foreground">
                      <span>Budget:</span>
                      <span className="font-mono text-foreground font-semibold">{stg.plannedBudget}</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Spent:</span>
                      <span className="font-mono text-amber-500 font-semibold">{stg.actualSpend}</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Readiness:</span>
                      <span className="font-mono text-emerald-500 font-bold">{stg.readiness}%</span>
                    </div>
                  </div>

                  <Button size="sm" variant="outline" className="w-full h-7 text-[10px] font-semibold mt-2" asChild>
                    <Link href={`/dashboard/marketing/campaigns/${campaignId}/stages/${stg.id}`}>
                      Open Stage <FiChevronRight className="ml-1 h-3 w-3" />
                    </Link>
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* TAB 2: SPECIFICATIONS */}
        <TabsContent value="specs" className="space-y-4">
          <div className="rounded-2xl border border-border/50 bg-card p-5 shadow-xs space-y-4 text-xs">
            <h2 className="text-sm font-bold text-foreground border-b border-border/40 pb-2">Campaign Master Specifications</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <span className="text-muted-foreground text-[10px] uppercase font-semibold block">Objective</span>
                <p className="font-medium text-foreground text-sm mt-0.5">{campaign.objective}</p>
              </div>

              <div>
                <span className="text-muted-foreground text-[10px] uppercase font-semibold block">Assigned Employee</span>
                <p className="font-medium text-foreground text-sm mt-0.5">{campaign.assignedEmployee}</p>
              </div>

              <div>
                <span className="text-muted-foreground text-[10px] uppercase font-semibold block">Duration</span>
                <p className="font-mono text-foreground font-semibold mt-0.5">{campaign.startDate} to {campaign.endDate}</p>
              </div>

              <div>
                <span className="text-muted-foreground text-[10px] uppercase font-semibold block">Associated Project</span>
                <p className="font-medium text-primary text-sm mt-0.5">{campaign.projectName}</p>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
