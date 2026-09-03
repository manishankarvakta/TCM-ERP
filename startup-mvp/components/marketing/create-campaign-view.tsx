"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  FiArrowLeft,
  FiPlus,
  FiLayers,
  FiTarget,
  FiCalendar,
  FiDollarSign,
  FiUser,
  FiCheckCircle,
  FiZap,
  FiCheckSquare,
} from "react-icons/fi";
import { createMarketingCampaign, initializeCampaignFunnel } from "@/app/actions/crm/marketing-operations.action";

export default function CreateCampaignView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const prefilledFunnel = searchParams?.get("funnelId") || searchParams?.get("funnelName") || "";
  const prefilledStage = searchParams?.get("stageId") || searchParams?.get("stageName") || "Awareness";

  const [isSubmitting, setIsSubmitting] = useState(false);

  const [funnelTemplate, setFunnelTemplate] = useState("STANDARD_7_STAGE");
  const [selectedStages, setSelectedStages] = useState([
    "Awareness",
    "Acknowledgment",
    "Engagement",
    "Lead Generation",
    "Lead Nurturing",
    "Sales Conversion",
    "Retention / Remarketing",
  ]);
  const [customStageInput, setCustomStageInput] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    campaignType: "DIGITAL_MARKETING",
    marketingFunnel: prefilledFunnel ? "Q4 Garments ERP Strategic Marketing Funnel" : "",
    primaryStage: prefilledStage,
    channel: "Meta & Google Ads",
    objective: "Lead Generation for Enterprise ERP & Fintech Solutions",
    targetAudience: "Enterprise CXOs, HR Directors & Finance Managers",
    startDate: "2026-09-01",
    endDate: "2026-10-31",
    budget: "500000",
    assignedEmployeeId: "",
  });

  const availableDefaultStages = [
    "Awareness",
    "Acknowledgment",
    "Engagement",
    "Lead Generation",
    "Lead Nurturing",
    "Sales Conversion",
    "Retention / Remarketing",
  ];

  const handleToggleStage = (stg: string) => {
    if (selectedStages.includes(stg)) {
      if (selectedStages.length > 1) {
        setSelectedStages(selectedStages.filter((s) => s !== stg));
      }
    } else {
      setSelectedStages([...selectedStages, stg]);
    }
  };

  const handleAddCustomStage = () => {
    if (!customStageInput.trim()) return;
    if (!selectedStages.includes(customStageInput.trim())) {
      setSelectedStages([...selectedStages, customStageInput.trim()]);
    }
    setCustomStageInput("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;
    setIsSubmitting(true);

    try {
      setTimeout(() => {
        setIsSubmitting(false);
        router.push("/dashboard/marketing/campaigns");
      }, 500);
    } catch (err) {
      console.error(err);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex-1 space-y-6 max-w-[1200px] mx-auto text-foreground">
      {/* 1. TOP NAVIGATION HEADER */}
      <div className="flex items-center gap-3 border-b border-border/40 pb-4">
        <Button variant="outline" size="sm" asChild className="h-8 text-xs font-semibold">
          <Link href="/dashboard/marketing/campaigns">
            <FiArrowLeft className="mr-1.5 h-3.5 w-3.5" />
            Back to Campaigns List
          </Link>
        </Button>
      </div>

      {/* 2. PAGE TITLE */}
      <div>
        <div className="flex items-center gap-2.5 flex-wrap">
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Create New Marketing Campaign
          </h1>
          <Badge variant="outline" className="text-[11px] font-medium px-2.5 py-0.5 border-purple-500/30 text-purple-600 dark:text-purple-400 bg-purple-500/5">
            Campaign & Funnel Setup Wizard
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Configure campaign identity, select sequential funnel stages, schedules, budget caps & team assignment
        </p>
      </div>

      {/* 3. FORM CARD */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* SECTION 1: CAMPAIGN IDENTITY */}
        <div className="rounded-2xl border border-border/50 bg-card p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-border/40 pb-3">
            <FiLayers className="h-4 w-4 text-purple-500" />
            <h2 className="text-base font-bold text-foreground">1. Campaign Identity & Channels</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-foreground mb-1.5">
                Campaign Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Q4 Enterprise ERP Lead Gen Drive"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full h-9 px-3 rounded-lg border border-border bg-background text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block font-semibold text-foreground mb-1.5">Campaign Type</label>
              <select
                value={formData.campaignType}
                onChange={(e) => setFormData({ ...formData, campaignType: e.target.value })}
                className="w-full h-9 px-3 rounded-lg border border-border bg-background text-foreground text-xs"
              >
                <option value="DIGITAL_MARKETING">Digital Marketing & PPC</option>
                <option value="BRANDING">Branding & Executive Awareness</option>
                <option value="EMAIL">Email Marketing & Broadcast</option>
                <option value="EVENTS">Events & Webinars</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block font-semibold text-foreground mb-1.5">Primary Channels</label>
              <input
                type="text"
                placeholder="e.g. Google Search, Meta Ads, LinkedIn Sponsored Posts"
                value={formData.channel}
                onChange={(e) => setFormData({ ...formData, channel: e.target.value })}
                className="w-full h-9 px-3 rounded-lg border border-border bg-background text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>
        </div>

        {/* SECTION 2: FUNNEL STAGES & STAGE PROVISIONING */}
        <div className="rounded-2xl border border-border/50 bg-card p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-border/40 pb-3">
            <FiZap className="h-4 w-4 text-amber-500" />
            <h2 className="text-base font-bold text-foreground">2. Campaign Funnel Stages Setup</h2>
          </div>

          <div className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-foreground mb-1.5">Funnel Template</label>
              <select
                value={funnelTemplate}
                onChange={(e) => {
                  setFunnelTemplate(e.target.value);
                  if (e.target.value === "STANDARD_7_STAGE") {
                    setSelectedStages(availableDefaultStages);
                  }
                }}
                className="w-full h-9 px-3 rounded-lg border border-border bg-background text-foreground text-xs"
              >
                <option value="STANDARD_7_STAGE">Standard 7-Stage Full Marketing Funnel (Recommended)</option>
                <option value="CUSTOM_STAGES">Custom Stage Selection</option>
              </select>
            </div>

            {/* STAGES CHECKBOX LIST */}
            <div>
              <label className="block font-semibold text-foreground mb-2">
                Included Funnel Stages ({selectedStages.length} Selected)
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                {availableDefaultStages.map((stg, i) => {
                  const isChecked = selectedStages.includes(stg);
                  return (
                    <label
                      key={stg}
                      className={`p-3 rounded-xl border flex items-center gap-2.5 cursor-pointer transition-all ${
                        isChecked
                          ? "border-primary/50 bg-primary/5 text-foreground font-semibold"
                          : "border-border/40 bg-background/50 text-muted-foreground"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleToggleStage(stg)}
                        className="rounded border-border text-primary focus:ring-primary h-4 w-4"
                      />
                      <span>
                        <span className="text-[10px] text-muted-foreground mr-1.5">0{i + 1}.</span>
                        {stg}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* ADD CUSTOM STAGE INPUT */}
            {funnelTemplate === "CUSTOM_STAGES" && (
              <div className="pt-2">
                <label className="block font-semibold text-foreground mb-1">Add Custom Stage Name</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="e.g. Free Trial Onboarding"
                    value={customStageInput}
                    onChange={(e) => setCustomStageInput(e.target.value)}
                    className="flex-1 h-8 px-3 rounded-md border border-border bg-background text-foreground text-xs"
                  />
                  <Button type="button" size="sm" variant="outline" className="h-8 text-xs font-semibold" onClick={handleAddCustomStage}>
                    <FiPlus className="mr-1 h-3.5 w-3.5" /> Add Stage
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* SECTION 3: CONTENT PLAN & OBJECTIVE */}
        <div className="rounded-2xl border border-border/50 bg-card p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-border/40 pb-3">
            <FiTarget className="h-4 w-4 text-blue-500" />
            <h2 className="text-base font-bold text-foreground">3. Objectives & Target Audience</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-foreground mb-1.5">Primary Starting Stage</label>
              <select
                value={formData.primaryStage}
                onChange={(e) => setFormData({ ...formData, primaryStage: e.target.value })}
                className="w-full h-9 px-3 rounded-lg border border-border bg-background text-foreground text-xs"
              >
                {selectedStages.map((stg) => (
                  <option key={stg} value={stg}>{stg}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-foreground mb-1.5">Target Audience</label>
              <input
                type="text"
                placeholder="e.g. Enterprise Decision Makers, CTOs & HR Managers"
                value={formData.targetAudience}
                onChange={(e) => setFormData({ ...formData, targetAudience: e.target.value })}
                className="w-full h-9 px-3 rounded-lg border border-border bg-background text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block font-semibold text-foreground mb-1.5">Campaign Objective</label>
              <textarea
                rows={3}
                placeholder="Describe the primary goal and KPI benchmarks for this campaign..."
                value={formData.objective}
                onChange={(e) => setFormData({ ...formData, objective: e.target.value })}
                className="w-full p-3 rounded-lg border border-border bg-background text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>
        </div>

        {/* SECTION 4: DURATION & BUDGET */}
        <div className="rounded-2xl border border-border/50 bg-card p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-border/40 pb-3">
            <FiCalendar className="h-4 w-4 text-emerald-500" />
            <h2 className="text-base font-bold text-foreground">4. Schedule & Budget Cap</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-foreground mb-1.5">Start Date</label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="w-full h-9 px-3 rounded-lg border border-border bg-background text-foreground text-xs"
              />
            </div>

            <div>
              <label className="block font-semibold text-foreground mb-1.5">End Date</label>
              <input
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                className="w-full h-9 px-3 rounded-lg border border-border bg-background text-foreground text-xs"
              />
            </div>

            <div>
              <label className="block font-semibold text-foreground mb-1.5">Planned Budget (৳)</label>
              <input
                type="number"
                placeholder="500000"
                value={formData.budget}
                onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                className="w-full h-9 px-3 rounded-lg border border-border bg-background text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary font-mono"
              />
            </div>
          </div>
        </div>

        {/* FOOTER ACTIONS */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-border/40">
          <Button variant="outline" type="button" size="sm" asChild className="h-9 text-xs font-semibold px-4">
            <Link href="/dashboard/marketing/campaigns">Cancel</Link>
          </Button>
          <Button type="submit" size="sm" disabled={isSubmitting} className="h-9 text-xs font-semibold px-6 shadow-xs">
            {isSubmitting ? "Provisioning..." : `Create Campaign (${selectedStages.length} Stages)`}
          </Button>
        </div>
      </form>
    </div>
  );
}
