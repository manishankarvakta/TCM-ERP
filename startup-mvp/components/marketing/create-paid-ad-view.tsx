"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FiArrowLeft,
  FiDollarSign,
  FiTrendingUp,
  FiMousePointer,
  FiEye,
  FiTarget,
  FiCheckCircle,
  FiRefreshCw,
  FiLayers,
} from "react-icons/fi";
import { createChannelSpecificCampaignAction } from "@/app/actions/crm/marketing-operations.action";
import { toast } from "sonner";

export default function CreatePaidAdView() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    platform: "Google Ads (Search & GDN)",
    objective: "",
    targetAudience: "",
    budget: "",
    spend: "",
    impressions: "",
    clicks: "",
    leads: "",
    conversions: "",
    status: "Active",
    startDate: "",
    endDate: "",
  });

  const impressionsNum = Number(formData.impressions) || 0;
  const clicksNum = Number(formData.clicks) || 0;
  const spendNum = Number(formData.spend) || 0;
  const leadsNum = Number(formData.leads) || 0;
  const calculatedCtr = impressionsNum > 0 ? ((clicksNum / impressionsNum) * 100).toFixed(2) + "%" : "0.00%";
  const calculatedCpc = clicksNum > 0 ? `৳${(spendNum / clicksNum).toFixed(2)}` : "৳0.00";
  const calculatedCpl = leadsNum > 0 ? `৳${Math.round(spendNum / leadsNum).toLocaleString()}` : "—";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error("Please enter a campaign name");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await createChannelSpecificCampaignAction({
        category: "PAID_ADS",
        name: formData.name,
        platform: formData.platform,
        objective: formData.objective,
        budget: Number(formData.budget) || 0,
        spend: Number(formData.spend) || 0,
        impressions: Number(formData.impressions) || 0,
        clicks: Number(formData.clicks) || 0,
        leads: Number(formData.leads) || 0,
        conversions: Number(formData.conversions) || 0,
        status: formData.status,
        startDate: formData.startDate,
        endDate: formData.endDate,
      });

      if (res.success) {
        toast.success(`Paid ad campaign "${formData.name}" created successfully!`);
        router.push("/dashboard/marketing/paid-ads");
      } else {
        toast.error(res.error || "Failed to create campaign");
        setIsSubmitting(false);
      }
    } catch {
      toast.error("An unexpected error occurred");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex-1 space-y-6 max-w-[1200px] mx-auto text-foreground">
      {/* 1. TOP NAVIGATION HEADER */}
      <div className="flex items-center justify-between border-b border-border/40 pb-4">
        <Button variant="outline" size="sm" asChild className="h-8 text-xs font-semibold">
          <Link href="/dashboard/marketing/paid-ads">
            <FiArrowLeft className="mr-1.5 h-3.5 w-3.5" />
            Back to Paid Ads
          </Link>
        </Button>
        <Badge variant="outline" className="text-[11px] font-medium px-2.5 py-0.5 border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/5">
          PPC Campaign Studio
        </Badge>
      </div>

      {/* 2. PAGE TITLE */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl flex items-center gap-2">
          <FiDollarSign className="h-7 w-7 text-amber-500" />
          Create New Paid Ad Campaign & Snapshot
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1">
          Configure advertising parameters, allocate budgets, set target KPIs, and record live PPC performance.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid gap-6 lg:grid-cols-3">
          {/* LEFT 2 COLS: MAIN FORM */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="border-border/50 bg-card/60 shadow-xs">
              <CardHeader className="pb-4">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <FiLayers className="h-4 w-4 text-amber-500" />
                  Campaign Identification & Platform
                </CardTitle>
                <CardDescription className="text-xs">
                  Basic platform routing and objective configuration
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-xs">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Campaign Name *</Label>
                  <Input
                    required
                    placeholder="e.g. Q4 Google Search Enterprise ERP Lead Generation"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="h-9 text-xs"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Advertising Platform *</Label>
                    <Select
                      value={formData.platform}
                      onValueChange={(val) => setFormData({ ...formData, platform: val })}
                    >
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Google Ads (Search & GDN)">Google Ads (Search & GDN)</SelectItem>
                        <SelectItem value="Meta Ads (Facebook & Instagram)">Meta Ads (Facebook & Instagram)</SelectItem>
                        <SelectItem value="LinkedIn B2B Sponsored Content">LinkedIn B2B Sponsored Content</SelectItem>
                        <SelectItem value="YouTube Video Ads">YouTube Video Ads</SelectItem>
                        <SelectItem value="TikTok For Business">TikTok For Business</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Campaign Status</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(val) => setFormData({ ...formData, status: val })}
                    >
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Active">Active / Running</SelectItem>
                        <SelectItem value="PLANNING">Planning / In Draft</SelectItem>
                        <SelectItem value="PAUSED">Paused</SelectItem>
                        <SelectItem value="COMPLETED">Completed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Campaign Objective</Label>
                  <Textarea
                    rows={2}
                    placeholder="e.g. Drive high-intent demo bookings and qualified B2B leads for ERP solutions..."
                    value={formData.objective}
                    onChange={(e) => setFormData({ ...formData, objective: e.target.value })}
                    className="text-xs resize-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Target Audience & Geographies</Label>
                  <Input
                    placeholder="e.g. Dhaka & Chittagong Business Hubs, CXOs, Finance Managers"
                    value={formData.targetAudience}
                    onChange={(e) => setFormData({ ...formData, targetAudience: e.target.value })}
                    className="h-9 text-xs"
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/50 bg-card/60 shadow-xs">
              <CardHeader className="pb-4">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <FiDollarSign className="h-4 w-4 text-emerald-500" />
                  Budget, Spend & Schedule
                </CardTitle>
                <CardDescription className="text-xs">
                  Financial limits and performance timeline
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Planned Total Budget (৳) *</Label>
                    <Input
                      type="number"
                      min="0"
                      required
                      placeholder="50000"
                      value={formData.budget}
                      onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                      className="h-9 text-xs font-mono font-semibold"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Spend to Date (৳)</Label>
                    <Input
                      type="number"
                      min="0"
                      placeholder="15000"
                      value={formData.spend}
                      onChange={(e) => setFormData({ ...formData, spend: e.target.value })}
                      className="h-9 text-xs font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Campaign Start Date</Label>
                    <Input
                      type="date"
                      value={formData.startDate}
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                      className="h-9 text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Campaign End Date</Label>
                    <Input
                      type="date"
                      value={formData.endDate}
                      onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                      className="h-9 text-xs"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/50 bg-card/60 shadow-xs">
              <CardHeader className="pb-4">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <FiTarget className="h-4 w-4 text-blue-500" />
                  Performance Snapshot & Conversions
                </CardTitle>
                <CardDescription className="text-xs">
                  Direct telemetry from ad platform reports
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-xs">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Impressions</Label>
                    <Input
                      type="number"
                      min="0"
                      placeholder="50000"
                      value={formData.impressions}
                      onChange={(e) => setFormData({ ...formData, impressions: e.target.value })}
                      className="h-9 text-xs font-mono"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Clicks</Label>
                    <Input
                      type="number"
                      min="0"
                      placeholder="2500"
                      value={formData.clicks}
                      onChange={(e) => setFormData({ ...formData, clicks: e.target.value })}
                      className="h-9 text-xs font-mono"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Leads Captured</Label>
                    <Input
                      type="number"
                      min="0"
                      placeholder="45"
                      value={formData.leads}
                      onChange={(e) => setFormData({ ...formData, leads: e.target.value })}
                      className="h-9 text-xs font-mono font-bold text-blue-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Conversions</Label>
                    <Input
                      type="number"
                      min="0"
                      placeholder="8"
                      value={formData.conversions}
                      onChange={(e) => setFormData({ ...formData, conversions: e.target.value })}
                      className="h-9 text-xs font-mono font-bold text-emerald-500"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* RIGHT 1 COL: LIVE FORECAST & PREVIEW */}
          <div className="space-y-6">
            <Card className="border-border/50 bg-card/60 shadow-xs sticky top-6">
              <CardHeader className="pb-3 border-b border-border/40">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <FiTrendingUp className="h-4 w-4 text-amber-500" />
                  Live Performance Forecast
                </CardTitle>
                <CardDescription className="text-xs">
                  Automated metric computation based on current inputs
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4 space-y-4 text-xs">
                <div className="p-3.5 rounded-xl border border-border/40 bg-background/50 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      <FiEye className="h-3.5 w-3.5 text-blue-500" /> CTR (Click Rate)
                    </span>
                    <span className="font-mono font-bold text-emerald-500 text-sm">{calculatedCtr}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      <FiMousePointer className="h-3.5 w-3.5 text-purple-500" /> Cost Per Click (CPC)
                    </span>
                    <span className="font-mono font-bold text-foreground text-sm">{calculatedCpc}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      <FiTarget className="h-3.5 w-3.5 text-amber-500" /> Cost Per Lead (CPL)
                    </span>
                    <span className="font-mono font-bold text-amber-500 text-sm">{calculatedCpl}</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl border border-amber-500/20 bg-amber-500/5 text-xs text-muted-foreground space-y-1.5">
                  <div className="font-semibold text-foreground flex items-center gap-1.5">
                    <FiCheckCircle className="h-3.5 w-3.5 text-amber-500" />
                    Database Persistence
                  </div>
                  <p>
                    Saving this form will register the campaign in the central CRM ledger and immediately update your PPC analytics.
                  </p>
                </div>

                <div className="pt-2 space-y-2">
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full h-10 bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs gap-2 shadow-xs"
                  >
                    {isSubmitting ? (
                      <FiRefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <FiCheckCircle className="h-4 w-4" />
                    )}
                    {isSubmitting ? "Creating Campaign..." : "Save & Launch Ad Campaign"}
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    asChild
                    className="w-full h-9 text-xs"
                  >
                    <Link href="/dashboard/marketing/paid-ads">
                      Cancel
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </div>
  );
}
