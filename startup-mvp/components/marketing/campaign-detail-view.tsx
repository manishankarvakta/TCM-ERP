"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  FiImage,
  FiExternalLink,
  FiUsers,
  FiMousePointer,
  FiEye,
} from "react-icons/fi";
import { toast } from "sonner";
import {
  getMarketingCampaignByIdAction,
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
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);
  const [activeTab, setActiveTab] = useState("funnel");

  const [showInitFunnelModal, setShowInitFunnelModal] = useState(false);
  const [showTrashModal, setShowTrashModal] = useState(false);
  const [showDeletePermModal, setShowDeletePermModal] = useState(false);
  const [isProcessingAction, setIsProcessingAction] = useState(false);

  // Real Database Campaign State
  const [campaignData, setCampaignData] = useState<any>(null);

  // Edit Modal State
  const [editForm, setEditForm] = useState({
    name: "",
    channel: "",
    objective: "",
    startDate: "",
    endDate: "",
    status: "ACTIVE",
  });

  const fetchCampaignData = useCallback(async () => {
    try {
      const res = await getMarketingCampaignByIdAction(campaignId);
      if (res.success && res.campaign) {
        setCampaignData(res.campaign);
        setEditForm({
          name: res.campaign.name || "",
          channel: res.campaign.channel || "",
          objective: res.campaign.objective || "",
          startDate: res.campaign.startDate ? new Date(res.campaign.startDate).toISOString().split("T")[0] : "",
          endDate: res.campaign.endDate ? new Date(res.campaign.endDate).toISOString().split("T")[0] : "",
          status: res.campaign.status || "ACTIVE",
        });
      } else {
        toast.error(res.error || "Failed to load campaign data");
      }
    } catch (err) {
      console.error("fetchCampaignData error:", err);
      toast.error("Error loading campaign details");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [campaignId]);

  useEffect(() => {
    fetchCampaignData();
  }, [fetchCampaignData]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchCampaignData();
  };

  const confirmInitializeFunnel = async () => {
    setIsProcessingAction(true);
    try {
      const res = await initializeCampaignFunnel(campaignId);
      if (res.success) {
        toast.success("Standard Marketing Funnel initialized!");
        setShowInitFunnelModal(false);
        fetchCampaignData();
      } else {
        toast.error(res.error || "Failed to initialize funnel");
      }
    } catch {
      toast.error("Error initializing funnel");
    } finally {
      setIsProcessingAction(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingEdit(true);
    try {
      const res = await updateMarketingCampaign({
        campaignId: campaignId,
        name: editForm.name,
        channel: editForm.channel,
        objective: editForm.objective,
        startDate: editForm.startDate || undefined,
        endDate: editForm.endDate || undefined,
        status: editForm.status as any,
      });

      if (res.success) {
        toast.success("Campaign updated successfully!");
        setShowEditModal(false);
        fetchCampaignData();
      } else {
        toast.error(res.error || "Failed to update campaign");
      }
    } catch {
      toast.error("Failed to update campaign");
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  const confirmMoveToTrash = async () => {
    setIsProcessingAction(true);
    try {
      const res = await trashMarketingCampaignAction(campaignId);
      if (res.success) {
        toast.success("Campaign moved to Trash");
        setShowTrashModal(false);
        fetchCampaignData();
      } else {
        toast.error(res.error || "Failed to trash campaign");
      }
    } catch {
      toast.error("Error moving campaign to trash");
    } finally {
      setIsProcessingAction(false);
    }
  };

  const handleRestore = async () => {
    try {
      const res = await restoreMarketingCampaignAction(campaignId);
      if (res.success) {
        toast.success("Campaign restored to Active");
        fetchCampaignData();
      } else {
        toast.error(res.error || "Failed to restore campaign");
      }
    } catch {
      toast.error("Error restoring campaign");
    }
  };

  const confirmDeletePermanently = async () => {
    setIsProcessingAction(true);
    try {
      const res = await deleteMarketingCampaignPermanentlyAction(campaignId);
      if (res.success) {
        toast.success("Campaign permanently deleted");
        setShowDeletePermModal(false);
        router.push("/dashboard/marketing/campaigns");
      } else {
        toast.error(res.error || "Failed to delete campaign");
      }
    } catch {
      toast.error("Error deleting campaign");
    } finally {
      setIsProcessingAction(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 space-y-6 max-w-[1600px] mx-auto text-foreground p-6">
        <div className="h-8 w-48 bg-muted animate-pulse rounded-lg" />
        <div className="h-28 bg-muted animate-pulse rounded-2xl" />
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-24 bg-muted animate-pulse rounded-xl" />
          ))}
        </div>
        <div className="h-64 bg-muted animate-pulse rounded-2xl" />
      </div>
    );
  }

  if (!campaignData) {
    return (
      <div className="flex-1 space-y-6 max-w-[1600px] mx-auto text-foreground p-6 text-center">
        <div className="p-12 rounded-2xl border border-dashed border-border/60 bg-card space-y-4">
          <FiAlertTriangle className="h-10 w-10 text-amber-500 mx-auto" />
          <h2 className="text-lg font-bold">Campaign Not Found</h2>
          <p className="text-xs text-muted-foreground">The requested campaign does not exist or you do not have permission to view it.</p>
          <Button size="sm" asChild variant="outline">
            <Link href="/dashboard/marketing/campaigns">Back to Campaigns List</Link>
          </Button>
        </div>
      </div>
    );
  }

  const isTrashed = campaignData.status === "CANCELLED";

  // Calculate Metrics from database
  const stagesList = campaignData.Stages || [];
  const contentItems = campaignData.ContentItems || [];
  const latestSnapshot = campaignData.PerformanceSnapshots?.[0] || null;

  // Budget calculations
  const totalPlannedBudget = Number(campaignData.plannedBudget) || (stagesList.reduce((acc: number, s: any) => acc + Number(s.plannedBudget || 0), 0)) || 0;
  const totalActualSpend = Number(latestSnapshot?.adSpend) || Number(campaignData.actualSpend) || (stagesList.reduce((acc: number, s: any) => acc + Number(s.actualSpend || 0), 0)) || 0;
  const remainingBudget = Math.max(0, totalPlannedBudget - totalActualSpend);

  // Performance metrics
  const totalLeads = Number(latestSnapshot?.leads) || Number(campaignData.leadsCount) || (stagesList.reduce((acc: number, s: any) => acc + Number(s.leadsCount || 0), 0)) || 0;
  const totalConversions = Number(latestSnapshot?.conversions) || Number(campaignData.wonDealsCount) || 0;
  const attributedRevenue = Number(latestSnapshot?.conversions ? latestSnapshot.conversions * 50000 : campaignData.attributedRevenue) || 0;
  const roas = totalActualSpend > 0 && attributedRevenue > 0 ? (attributedRevenue / totalActualSpend).toFixed(1) + "x" : "—";
  const roi = totalActualSpend > 0 && attributedRevenue > 0 ? Math.round(((attributedRevenue - totalActualSpend) / totalActualSpend) * 100) + "%" : "—";

  // Extract Creative Visual Assets & Content
  const primaryCreative = contentItems.find((c: any) => c.mediaUrl || c.copy || c.title) || contentItems[0] || null;
  const mediaUrl = primaryCreative?.mediaUrl || null;
  const headline = primaryCreative?.title || primaryCreative?.headline || null;
  const copyText = primaryCreative?.copy || campaignData.objective || null;

  return (
    <div className="flex-1 space-y-6 max-w-[1600px] mx-auto text-foreground">
      {/* 1. TOP HEADER NAVIGATION */}
      <div className="flex items-center justify-between border-b border-border/40 pb-4">
        <Button variant="outline" size="sm" asChild className="h-8 text-xs font-semibold">
          <Link href="/dashboard/marketing/campaigns">
            <FiArrowLeft className="mr-1.5 h-3.5 w-3.5" />
            Back to Campaigns List
          </Link>
        </Button>

        <div className="flex items-center gap-2">
          {stagesList.length === 0 && (
            <Button size="sm" variant="outline" className="h-8 text-xs font-semibold text-purple-600 border-purple-300" onClick={() => setShowInitFunnelModal(true)}>
              <FiZap className="mr-1.5 h-3.5 w-3.5" />
              Initialize Funnel
            </Button>
          )}
        </div>
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
            <Button size="sm" variant="destructive" className="h-8 text-xs font-semibold" onClick={() => setShowDeletePermModal(true)}>
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
              {campaignData.name}
            </h1>
            <Badge variant="outline" className="text-[11px] font-bold px-2.5 py-0.5 border-purple-500/30 text-purple-600 dark:text-purple-400 bg-purple-500/5">
              {campaignData.campaignType ? campaignData.campaignType.replace(/_/g, " ") : "Campaign"}
            </Badge>
            <Badge
              variant="outline"
              className={`text-[11px] font-bold px-2.5 py-0.5 uppercase ${
                isTrashed
                  ? "text-rose-500 border-rose-500/30 bg-rose-500/5"
                  : campaignData.status === "ACTIVE"
                  ? "text-emerald-500 border-emerald-500/30 bg-emerald-500/5"
                  : "text-amber-500 border-amber-500/30 bg-amber-500/5"
              }`}
            >
              {isTrashed ? "TRASHED" : campaignData.status}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-2 flex-wrap">
            <span className="font-mono">ID: {campaignData.id}</span>
            <span>•</span>
            <span>Channel: <strong className="text-foreground">{campaignData.channel || "Omnichannel"}</strong></span>
            <span>•</span>
            <span>Project: <strong className="text-foreground">{campaignData.Project?.title || "Internal Marketing Operations"}</strong></span>
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
            <Button size="sm" variant="outline" className="h-8 text-xs font-semibold px-3 text-rose-500 hover:text-rose-600 border-rose-200 dark:border-rose-900/40" onClick={() => setShowTrashModal(true)}>
              <FiTrash2 className="mr-1.5 h-3.5 w-3.5" /> Move to Trash
            </Button>
          ) : (
            <Button size="sm" variant="destructive" className="h-8 text-xs font-semibold px-3" onClick={() => setShowDeletePermModal(true)}>
              <FiTrash2 className="mr-1.5 h-3.5 w-3.5" /> Delete Permanently
            </Button>
          )}
        </div>
      </div>

      {/* 2. REAL SCORECARD / KPI TELEMETRY */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-4 lg:grid-cols-6">
        <div className="p-3.5 rounded-xl border border-border/50 bg-card shadow-2xs space-y-1">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block">Planned Budget</span>
          <div className="text-xl font-extrabold text-foreground">৳{totalPlannedBudget.toLocaleString()}</div>
          <span className="text-[10px] text-muted-foreground">Allocated: ৳{totalPlannedBudget.toLocaleString()}</span>
        </div>

        <div className="p-3.5 rounded-xl border border-border/50 bg-card shadow-2xs space-y-1">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block">Actual Spend</span>
          <div className="text-xl font-extrabold text-amber-500">৳{totalActualSpend.toLocaleString()}</div>
          <span className="text-[10px] text-emerald-500 font-medium">Remaining: ৳{remainingBudget.toLocaleString()}</span>
        </div>

        <div className="p-3.5 rounded-xl border border-border/50 bg-card shadow-2xs space-y-1">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block">Total Leads</span>
          <div className="text-xl font-extrabold text-blue-500">{totalLeads.toLocaleString()}</div>
          <span className="text-[10px] text-muted-foreground">Captured Contacts</span>
        </div>

        <div className="p-3.5 rounded-xl border border-border/50 bg-card shadow-2xs space-y-1">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block">Conversions</span>
          <div className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400">{totalConversions.toLocaleString()}</div>
          <span className="text-[10px] text-emerald-500 font-semibold">Won Deals</span>
        </div>

        <div className="p-3.5 rounded-xl border border-border/50 bg-card shadow-2xs space-y-1">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block">Attributed Revenue</span>
          <div className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400">
            {attributedRevenue > 0 ? `৳${attributedRevenue.toLocaleString()}` : "—"}
          </div>
          <span className="text-[10px] text-emerald-500 font-semibold">ROAS: {roas}</span>
        </div>

        <div className="p-3.5 rounded-xl border border-border/50 bg-card shadow-2xs space-y-1">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block">Marketing ROI</span>
          <div className="text-xl font-extrabold text-purple-500">{roi}</div>
          <span className="text-[10px] text-purple-500 font-semibold">Performance Yield</span>
        </div>
      </div>

      {/* 3. DYNAMIC TABS */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-muted/60 p-1 border border-border/40 flex flex-wrap h-auto gap-1">
          <TabsTrigger value="funnel" className="text-xs font-semibold">
            Funnel Pipeline ({stagesList.length})
          </TabsTrigger>
          <TabsTrigger value="creatives" className="text-xs font-semibold">
            Visual Creative Assets ({contentItems.length})
          </TabsTrigger>
          <TabsTrigger value="specs" className="text-xs font-semibold">
            Campaign Specifications
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: FUNNEL STAGES PIPELINE */}
        <TabsContent value="funnel" className="space-y-6">
          <div className="rounded-2xl border border-border/50 bg-card p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-border/40 pb-3">
              <div>
                <h2 className="text-sm font-bold text-foreground">Sequential Funnel & Execution Pipeline</h2>
                <p className="text-xs text-muted-foreground">Configured operational layers and stages for this campaign</p>
              </div>
              <span className="text-xs font-mono text-muted-foreground">
                {stagesList.length} Stage{stagesList.length !== 1 ? "s" : ""} Configured
              </span>
            </div>

            {stagesList.length > 0 ? (
              <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-${Math.min(stagesList.length, 7)} gap-3`}>
                {stagesList.map((stg: any, i: number) => {
                  const stageBudget = Number(stg.plannedBudget) || 0;
                  const stageSpend = Number(stg.actualSpend) || 0;
                  const stageLeads = Number(stg.leadsCount) || 0;
                  const readiness = stg.status === "COMPLETED" ? 100 : stg.status === "ACTIVE" ? 90 : 50;

                  return (
                    <div
                      key={stg.id || i}
                      className={`p-3.5 rounded-xl border transition-all text-xs space-y-2 relative ${
                        stg.status === "ACTIVE"
                          ? "border-primary bg-primary/5 shadow-xs"
                          : stg.status === "COMPLETED"
                          ? "border-emerald-500/40 bg-emerald-500/5"
                          : "border-border/40 bg-background/50"
                      }`}
                    >
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                        <span className="font-bold font-mono">0{i + 1}</span>
                        <Badge
                          variant="outline"
                          className={`text-[8px] px-1 py-0.1 uppercase font-bold ${
                            stg.status === "ACTIVE"
                              ? "text-primary border-primary/30"
                              : stg.status === "COMPLETED"
                              ? "text-emerald-500 border-emerald-500/30"
                              : "text-muted-foreground"
                          }`}
                        >
                          {stg.status}
                        </Badge>
                      </div>

                      <div className="font-bold text-foreground line-clamp-1">{stg.name}</div>

                      <div className="space-y-1 text-[10px]">
                        <div className="flex justify-between text-muted-foreground">
                          <span>Budget:</span>
                          <span className="font-mono text-foreground font-semibold">৳{stageBudget.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-muted-foreground">
                          <span>Spent:</span>
                          <span className="font-mono text-amber-500 font-semibold">৳{stageSpend.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-muted-foreground">
                          <span>Leads:</span>
                          <span className="font-mono text-blue-500 font-semibold">{stageLeads.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-muted-foreground">
                          <span>Readiness:</span>
                          <span className="font-mono text-emerald-500 font-bold">{readiness}%</span>
                        </div>
                      </div>

                      <Button size="sm" variant="outline" className="w-full h-7 text-[10px] font-semibold mt-2" asChild>
                        <Link href={`/dashboard/marketing/campaigns/${campaignId}/stages/${stg.id}`}>
                          Open Stage <FiChevronRight className="ml-1 h-3 w-3" />
                        </Link>
                      </Button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-8 text-center rounded-xl border border-dashed border-border/60 bg-muted/20 space-y-3">
                <FiLayers className="h-8 w-8 text-muted-foreground mx-auto" />
                <div className="text-xs font-semibold text-foreground">No Sub-stages Configured</div>
                <p className="text-[11px] text-muted-foreground max-w-md mx-auto">
                  This campaign is operating as a direct channel campaign. You can initialize a 7-stage strategic funnel at any time.
                </p>
                <Button size="sm" variant="outline" className="h-7 text-xs font-semibold text-purple-600 border-purple-300" onClick={() => setShowInitFunnelModal(true)}>
                  <FiZap className="mr-1 h-3 w-3" /> Initialize Standard 7-Stage Funnel
                </Button>
              </div>
            )}
          </div>
        </TabsContent>

        {/* TAB 2: VISUAL CREATIVE ASSETS & COPY */}
        <TabsContent value="creatives" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-6">
              <Card className="border-border/50 bg-card shadow-xs">
                <CardHeader className="pb-3 border-b border-border/40">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        <FiImage className="h-4 w-4 text-purple-500" />
                        Campaign Creative Visuals & Media Attachments
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Visual assets, marketing banners, and artwork proofs linked to this campaign
                      </CardDescription>
                    </div>
                    {primaryCreative?.contentType && (
                      <Badge variant="outline" className="text-[10px] font-semibold bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30">
                        {primaryCreative.contentType.replace(/_/g, " ")}
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="pt-4 space-y-4 text-xs">
                  {mediaUrl ? (
                    <div className="space-y-3">
                      <div className="rounded-xl border border-border/60 overflow-hidden bg-muted/40 max-w-2xl">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={mediaUrl}
                          alt="Campaign Creative Visual"
                          className="w-full max-h-[380px] object-contain bg-black/5 dark:bg-black/40"
                        />
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                        <span className="font-mono truncate max-w-md">Asset URL: {mediaUrl}</span>
                        <Button size="sm" variant="outline" asChild className="h-7 text-xs font-semibold gap-1">
                          <a href={mediaUrl} target="_blank" rel="noopener noreferrer">
                            View Full Resolution <FiExternalLink className="h-3 w-3" />
                          </a>
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-8 text-center rounded-xl border border-dashed border-border/60 bg-muted/20 space-y-2">
                      <FiImage className="h-8 w-8 text-muted-foreground mx-auto opacity-40" />
                      <div className="text-xs font-semibold text-foreground">No Media / Banner Graphic Attached</div>
                      <p className="text-[11px] text-muted-foreground">You can upload a banner or artwork proof via campaign edit.</p>
                    </div>
                  )}

                  {headline && (
                    <div className="p-3.5 rounded-xl border border-border/40 bg-background/50 space-y-1">
                      <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Campaign Headline / Punchline</span>
                      <p className="text-sm font-bold text-foreground">{headline}</p>
                    </div>
                  )}

                  {copyText && (
                    <div className="p-3.5 rounded-xl border border-border/40 bg-background/50 space-y-1">
                      <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Campaign Copy / Objective Message</span>
                      <p className="text-xs text-foreground leading-relaxed whitespace-pre-wrap">{copyText}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              <Card className="border-border/50 bg-card shadow-xs">
                <CardHeader className="pb-3 border-b border-border/40">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <FiEye className="h-4 w-4 text-emerald-500" />
                    Channel Live Telemetry
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4 space-y-3 text-xs">
                  <div className="p-3 rounded-xl border border-border/40 bg-background/50 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Primary Channel:</span>
                      <span className="font-semibold text-foreground">{campaignData.channel || "Omnichannel"}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Active Content Items:</span>
                      <span className="font-mono font-bold text-purple-500">{contentItems.length}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Target Leads:</span>
                      <span className="font-mono font-bold text-blue-500">{totalLeads}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Conversions:</span>
                      <span className="font-mono font-bold text-emerald-500">{totalConversions}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* TAB 3: SPECIFICATIONS */}
        <TabsContent value="specs" className="space-y-4">
          <div className="rounded-2xl border border-border/50 bg-card p-5 shadow-xs space-y-4 text-xs">
            <h2 className="text-sm font-bold text-foreground border-b border-border/40 pb-2">Campaign Master Specifications</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <span className="text-muted-foreground text-[10px] uppercase font-semibold block">Objective</span>
                <p className="font-medium text-foreground text-sm mt-0.5">{campaignData.objective || "No specific objective detailed."}</p>
              </div>

              <div>
                <span className="text-muted-foreground text-[10px] uppercase font-semibold block">Associated Project</span>
                <p className="font-medium text-primary text-sm mt-0.5">{campaignData.Project?.title || "Internal Marketing Operations"}</p>
              </div>

              <div>
                <span className="text-muted-foreground text-[10px] uppercase font-semibold block">Target Channel</span>
                <p className="font-medium text-foreground text-sm mt-0.5">{campaignData.channel || "Omnichannel"}</p>
              </div>

              <div>
                <span className="text-muted-foreground text-[10px] uppercase font-semibold block">Timeframe</span>
                <p className="font-mono text-foreground font-semibold mt-0.5">
                  {campaignData.startDate ? new Date(campaignData.startDate).toLocaleDateString() : "Immediate"}
                  {" → "}
                  {campaignData.endDate ? new Date(campaignData.endDate).toLocaleDateString() : "Ongoing"}
                </p>
              </div>

              <div>
                <span className="text-muted-foreground text-[10px] uppercase font-semibold block">Created Date</span>
                <p className="font-mono text-foreground font-semibold mt-0.5">
                  {campaignData.createdAt ? new Date(campaignData.createdAt).toLocaleString() : "—"}
                </p>
              </div>

              <div>
                <span className="text-muted-foreground text-[10px] uppercase font-semibold block">Assigned Lead</span>
                <p className="font-medium text-foreground text-sm mt-0.5">{campaignData.AssignedEmployee?.name || "Marketing Team"}</p>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* EDIT CAMPAIGN MODAL */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in-50">
          <div className="bg-card border border-border/60 rounded-2xl w-full max-w-lg shadow-xl overflow-hidden">
            <div className="p-4 border-b border-border/40 flex items-center justify-between">
              <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                <FiEdit className="h-4 w-4 text-purple-500" /> Edit Campaign Details
              </h3>
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setShowEditModal(false)}>
                <FiX className="h-4 w-4" />
              </Button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-4 space-y-3.5 text-xs">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Campaign Name *</Label>
                <Input
                  required
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Channel</Label>
                  <Input
                    value={editForm.channel}
                    onChange={(e) => setEditForm({ ...editForm, channel: e.target.value })}
                    className="h-9 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Status</Label>
                  <Select
                    value={editForm.status}
                    onValueChange={(val) => setEditForm({ ...editForm, status: val })}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ACTIVE">Active</SelectItem>
                      <SelectItem value="PLANNING">Planning / Draft</SelectItem>
                      <SelectItem value="PAUSED">Paused</SelectItem>
                      <SelectItem value="COMPLETED">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Campaign Objective</Label>
                <Textarea
                  rows={3}
                  value={editForm.objective}
                  onChange={(e) => setEditForm({ ...editForm, objective: e.target.value })}
                  className="text-xs resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Start Date</Label>
                  <Input
                    type="date"
                    value={editForm.startDate}
                    onChange={(e) => setEditForm({ ...editForm, startDate: e.target.value })}
                    className="h-9 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold">End Date</Label>
                  <Input
                    type="date"
                    value={editForm.endDate}
                    onChange={(e) => setEditForm({ ...editForm, endDate: e.target.value })}
                    className="h-9 text-xs"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border/40">
                <Button type="button" variant="outline" size="sm" className="h-8 text-xs font-semibold" onClick={() => setShowEditModal(false)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isSubmittingEdit}
                  className="h-8 px-4 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold"
                >
                  {isSubmittingEdit ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 1. INITIALIZE FUNNEL CONFIRMATION MODAL */}
      {showInitFunnelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in-50">
          <div className="bg-card border border-border/60 rounded-2xl w-full max-w-md shadow-xl overflow-hidden p-5 space-y-4 animate-in zoom-in-95">
            <div className="flex items-start gap-3.5">
              <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 shrink-0">
                <FiZap className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-sm text-foreground">Initialize Standard 7-Stage Marketing Funnel?</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  This will generate the standard 7-stage strategic marketing pipeline (Awareness, Acknowledgment, Engagement, Lead Gen, Nurturing, Conversion, and Retention) for <strong className="text-foreground font-semibold">&ldquo;{campaignData.name}&rdquo;</strong>.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-border/40">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 text-xs font-semibold"
                disabled={isProcessingAction}
                onClick={() => setShowInitFunnelModal(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                className="h-8 px-4 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold"
                disabled={isProcessingAction}
                onClick={confirmInitializeFunnel}
              >
                {isProcessingAction ? "Initializing..." : "Initialize Funnel"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 2. MOVE TO TRASH CONFIRMATION MODAL */}
      {showTrashModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in-50">
          <div className="bg-card border border-border/60 rounded-2xl w-full max-w-md shadow-xl overflow-hidden p-5 space-y-4 animate-in zoom-in-95">
            <div className="flex items-start gap-3.5">
              <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20 shrink-0">
                <FiTrash2 className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-sm text-foreground">Move Campaign to Trash?</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Are you sure you want to move <strong className="text-foreground font-semibold">&ldquo;{campaignData.name}&rdquo;</strong> to Trash? The campaign status will be marked as CANCELLED and paused from active views. You can restore it anytime.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-border/40">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 text-xs font-semibold"
                disabled={isProcessingAction}
                onClick={() => setShowTrashModal(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                className="h-8 px-4 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold"
                disabled={isProcessingAction}
                onClick={confirmMoveToTrash}
              >
                {isProcessingAction ? "Moving to Trash..." : "Move to Trash"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 3. PERMANENT DELETE CONFIRMATION MODAL */}
      {showDeletePermModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in-50">
          <div className="bg-card border border-border/60 rounded-2xl w-full max-w-md shadow-xl overflow-hidden p-5 space-y-4 animate-in zoom-in-95">
            <div className="flex items-start gap-3.5">
              <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-500 border border-rose-500/20 shrink-0">
                <FiAlertTriangle className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-sm text-foreground">Permanently Delete Campaign?</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  ⚠️ <strong className="text-rose-500">WARNING:</strong> This action will permanently remove <strong className="text-foreground font-semibold">&ldquo;{campaignData.name}&rdquo;</strong> and all associated funnel stages, content items, and performance records from the database. This action <span className="underline font-bold text-foreground">cannot be undone</span>.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-border/40">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 text-xs font-semibold"
                disabled={isProcessingAction}
                onClick={() => setShowDeletePermModal(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                className="h-8 px-4 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold"
                disabled={isProcessingAction}
                onClick={confirmDeletePermanently}
              >
                {isProcessingAction ? "Deleting..." : "Permanently Delete"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
