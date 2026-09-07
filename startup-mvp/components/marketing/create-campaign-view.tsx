"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
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
  FiLayers,
  FiDollarSign,
  FiCheckCircle,
  FiZap,
  FiMessageSquare,
  FiSmartphone,
  FiMail,
  FiBriefcase,
  FiRefreshCw,
  FiTrendingUp,
  FiMousePointer,
  FiEye,
  FiTarget,
  FiSend,
  FiUsers,
  FiMapPin,
  FiFileText,
} from "react-icons/fi";
import {
  createChannelSpecificCampaignAction,
  quickCreateMarketingCampaignAction,
} from "@/app/actions/crm/marketing-operations.action";
import { toast } from "sonner";
import { MarketingCampaignType } from "@prisma/client";

type ChannelTab = "funnel" | "ads" | "sms" | "wa" | "email" | "physical";

export default function CreateCampaignView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialChannel = (searchParams?.get("channel") as ChannelTab) || "funnel";
  const prefilledStage = searchParams?.get("stageId") || searchParams?.get("stageName") || "Awareness";

  const [activeTab, setActiveTab] = useState<ChannelTab>(
    ["funnel", "ads", "sms", "wa", "email", "physical"].includes(initialChannel) ? initialChannel : "funnel"
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 1. STRATEGIC FUNNEL FORM STATE
  const [selectedStages, setSelectedStages] = useState([
    "Awareness",
    "Acknowledgment",
    "Engagement",
    "Lead Generation",
    "Lead Nurturing",
    "Sales Conversion",
    "Retention / Remarketing",
  ]);
  const [funnelForm, setFunnelForm] = useState({
    name: "",
    campaignType: MarketingCampaignType.DIGITAL_MARKETING,
    primaryStage: prefilledStage,
    channel: "",
    objective: "",
    startDate: "",
    endDate: "",
    budget: "",
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

  // 2. PAID ADS FORM STATE
  const [adsForm, setAdsForm] = useState({
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

  const adsImpressionsNum = Number(adsForm.impressions) || 0;
  const adsClicksNum = Number(adsForm.clicks) || 0;
  const adsSpendNum = Number(adsForm.spend) || 0;
  const adsLeadsNum = Number(adsForm.leads) || 0;
  const adsCtr = adsImpressionsNum > 0 ? ((adsClicksNum / adsImpressionsNum) * 100).toFixed(2) + "%" : "0.00%";
  const adsCpc = adsClicksNum > 0 ? `৳${(adsSpendNum / adsClicksNum).toFixed(2)}` : "৳0.00";
  const adsCpl = adsLeadsNum > 0 ? `৳${Math.round(adsSpendNum / adsLeadsNum).toLocaleString()}` : "—";

  // 3. SMS BROADCAST FORM STATE
  const [smsForm, setSmsForm] = useState({
    name: "",
    senderGateway: "Grameenphone Masking Gateway",
    senderMask: "",
    audience: "Enterprise Leads & Prospects",
    message: "",
    recipients: "",
    budget: "",
    status: "LAUNCHED",
    startDate: "",
  });
  const smsCharCount = smsForm.message.length;
  const smsParts = Math.ceil(smsCharCount / 160) || 1;
  const smsRecipientsNum = Number(smsForm.recipients) || 0;
  const smsBudgetNum = Number(smsForm.budget) || 0;
  const smsCostPerRecipient = smsRecipientsNum > 0 ? (smsBudgetNum / smsRecipientsNum).toFixed(2) : "0.00";

  // 4. WHATSAPP BROADCAST FORM STATE
  const waTemplates = [
    {
      id: "broadcast_product_launch",
      name: "broadcast_product_launch",
      category: "MARKETING",
      defaultText: "Hi {{1}}, discover the all-new ERP suite modules designed specifically for {{2}}. Streamline operations, cut overhead by 30%, and boost team productivity. Tap below to schedule an exclusive VIP walkthrough!",
    },
    {
      id: "vip_demo_invitation",
      name: "vip_demo_invitation",
      category: "UTILITY",
      defaultText: "Hello {{1}}, you are cordially invited to our exclusive CXO Executive Demo on Enterprise ERP Solutions. RSVP today!",
    },
    {
      id: "service_reminder_v2",
      name: "service_reminder_v2",
      category: "UTILITY",
      defaultText: "Dear {{1}}, your scheduled consultation session with our technical team is confirmed for tomorrow.",
    },
    {
      id: "quarterly_billing_update",
      name: "quarterly_billing_update",
      category: "UTILITY",
      defaultText: "Hi {{1}}, your Q3 summary statement and analytics report is now ready for review.",
    },
  ];

  const [waForm, setWaForm] = useState({
    name: "",
    templateName: "broadcast_product_launch",
    audience: "Enterprise Leads",
    leadNamePlaceholder: "",
    companyPlaceholder: "",
    message: "",
    budget: "",
    status: "Active",
    startDate: "",
  });

  const waPreviewText = (waForm.message || "Hi {{1}}, discover the all-new suite designed for {{2}}. Tap below to schedule a walkthrough!")
    .replace("{{1}}", waForm.leadNamePlaceholder || "Recipient")
    .replace("{{2}}", waForm.companyPlaceholder || "Company");

  // 5. EMAIL BROADCAST FORM STATE
  const [emailForm, setEmailForm] = useState({
    subject: "",
    fromName: "",
    fromEmail: "",
    preheader: "",
    audience: "Enterprise Leads (1,450)",
    body: "",
    budget: "",
    status: "SENT",
    startDate: "",
  });

  // 6. PHYSICAL CAMPAIGN FORM STATE
  const [physicalForm, setPhysicalForm] = useState({
    name: "",
    venueType: "Event / Exhibition",
    location: "",
    vendorContractor: "",
    objective: "",
    budget: "",
    spend: "",
    leads: "",
    conversions: "",
    status: "Active",
    startDate: "",
    endDate: "",
  });
  const phySpendNum = Number(physicalForm.spend) || 0;
  const phyLeadsNum = Number(physicalForm.leads) || 0;
  const phyConversionsNum = Number(physicalForm.conversions) || 0;
  const phyCostPerLead = phyLeadsNum > 0 ? `৳${Math.round(phySpendNum / phyLeadsNum).toLocaleString()}` : "—";
  const phyConversionRate = phyLeadsNum > 0 ? `${((phyConversionsNum / phyLeadsNum) * 100).toFixed(1)}%` : "0.0%";

  // SUBMIT HANDLERS
  const handleFunnelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!funnelForm.name.trim()) return toast.error("Please enter a campaign name");
    setIsSubmitting(true);
    try {
      const res = await quickCreateMarketingCampaignAction({
        name: funnelForm.name,
        campaignType: funnelForm.campaignType,
        channel: funnelForm.channel,
        stage: funnelForm.primaryStage,
        budget: Number(funnelForm.budget) || 0,
        objective: funnelForm.objective,
        startDate: funnelForm.startDate,
        endDate: funnelForm.endDate,
        status: "ACTIVE",
      });
      if (res.success) {
        toast.success(`Strategic Campaign "${funnelForm.name}" created!`);
        router.push("/dashboard/marketing/campaigns");
      } else {
        toast.error(res.error || "Failed to create campaign");
        setIsSubmitting(false);
      }
    } catch {
      toast.error("An unexpected error occurred");
      setIsSubmitting(false);
    }
  };

  const handleAdsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adsForm.name.trim()) return toast.error("Please enter an ad campaign name");
    setIsSubmitting(true);
    try {
      const res = await createChannelSpecificCampaignAction({
        category: "PAID_ADS",
        name: adsForm.name,
        platform: adsForm.platform,
        objective: adsForm.objective,
        budget: Number(adsForm.budget) || 0,
        spend: Number(adsForm.spend) || 0,
        impressions: Number(adsForm.impressions) || 0,
        clicks: Number(adsForm.clicks) || 0,
        leads: Number(adsForm.leads) || 0,
        conversions: Number(adsForm.conversions) || 0,
        status: adsForm.status,
        startDate: adsForm.startDate,
        endDate: adsForm.endDate,
      });
      if (res.success) {
        toast.success(`Paid ad campaign "${adsForm.name}" created successfully!`);
        router.push("/dashboard/marketing/campaigns");
      } else {
        toast.error(res.error || "Failed to create campaign");
        setIsSubmitting(false);
      }
    } catch {
      toast.error("An unexpected error occurred");
      setIsSubmitting(false);
    }
  };

  const handleSmsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!smsForm.name.trim()) return toast.error("Please enter an SMS broadcast name");
    if (!smsForm.message.trim()) return toast.error("Please enter the SMS message body");
    setIsSubmitting(true);
    try {
      const res = await createChannelSpecificCampaignAction({
        category: "SMS",
        name: smsForm.name,
        channel: `SMS (${smsForm.senderGateway})`,
        message: smsForm.message,
        budget: Number(smsForm.budget) || 0,
        status: smsForm.status,
        startDate: smsForm.startDate,
      });
      if (res.success) {
        toast.success(`SMS Broadcast "${smsForm.name}" scheduled & saved!`);
        router.push("/dashboard/marketing/campaigns");
      } else {
        toast.error(res.error || "Failed to create SMS broadcast");
        setIsSubmitting(false);
      }
    } catch {
      toast.error("An unexpected error occurred");
      setIsSubmitting(false);
    }
  };

  const handleWaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!waForm.name.trim()) return toast.error("Please enter a WhatsApp broadcast name");
    setIsSubmitting(true);
    try {
      const res = await createChannelSpecificCampaignAction({
        category: "WA",
        name: waForm.name,
        templateName: waForm.templateName,
        audience: waForm.audience,
        message: waForm.message,
        budget: Number(waForm.budget) || 0,
        status: waForm.status,
        startDate: waForm.startDate,
      });
      if (res.success) {
        toast.success(`WhatsApp Broadcast "${waForm.name}" launched successfully!`);
        router.push("/dashboard/marketing/campaigns");
      } else {
        toast.error(res.error || "Failed to launch WhatsApp broadcast");
        setIsSubmitting(false);
      }
    } catch {
      toast.error("An unexpected error occurred");
      setIsSubmitting(false);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailForm.subject.trim()) return toast.error("Please enter an email subject line");
    setIsSubmitting(true);
    try {
      const res = await createChannelSpecificCampaignAction({
        category: "EMAIL",
        name: emailForm.subject,
        subject: emailForm.subject,
        audience: emailForm.audience,
        message: `${emailForm.preheader}\n\n${emailForm.body}`,
        budget: Number(emailForm.budget) || 0,
        status: emailForm.status,
        startDate: emailForm.startDate,
      });
      if (res.success) {
        toast.success(`Email Broadcast "${emailForm.subject}" scheduled & saved!`);
        router.push("/dashboard/marketing/campaigns");
      } else {
        toast.error(res.error || "Failed to create email broadcast");
        setIsSubmitting(false);
      }
    } catch {
      toast.error("An unexpected error occurred");
      setIsSubmitting(false);
    }
  };

  const handlePhysicalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!physicalForm.name.trim()) return toast.error("Please enter a physical campaign name");
    setIsSubmitting(true);
    try {
      const res = await createChannelSpecificCampaignAction({
        category: "PHYSICAL",
        name: physicalForm.name,
        venueType: physicalForm.venueType,
        location: physicalForm.location,
        objective: physicalForm.objective,
        budget: Number(physicalForm.budget) || 0,
        spend: Number(physicalForm.spend) || 0,
        leads: Number(physicalForm.leads) || 0,
        conversions: Number(physicalForm.conversions) || 0,
        status: physicalForm.status,
        startDate: physicalForm.startDate,
        endDate: physicalForm.endDate,
      });
      if (res.success) {
        toast.success(`Physical Campaign "${physicalForm.name}" created successfully!`);
        router.push("/dashboard/marketing/campaigns");
      } else {
        toast.error(res.error || "Failed to create campaign");
        setIsSubmitting(false);
      }
    } catch {
      toast.error("An unexpected error occurred");
      setIsSubmitting(false);
    }
  };

  const channelsConfig = [
    { id: "funnel" as ChannelTab, name: "Strategic Funnel", subtitle: "Sequential 7-Stage Plan", icon: FiLayers, color: "purple" },
    { id: "ads" as ChannelTab, name: "Paid Ads PPC", subtitle: "Google, Meta, LinkedIn", icon: FiDollarSign, color: "amber" },
    { id: "sms" as ChannelTab, name: "SMS Broadcast", subtitle: "Telco Gateways & Masking", icon: FiMessageSquare, color: "rose" },
    { id: "wa" as ChannelTab, name: "WhatsApp Broadcast", subtitle: "Meta HSM & Chat Blast", icon: FiSmartphone, color: "emerald" },
    { id: "email" as ChannelTab, name: "Email Broadcast", subtitle: "Newsletters & Drip Leads", icon: FiMail, color: "teal" },
    { id: "physical" as ChannelTab, name: "Physical / Billboard", subtitle: "Events, Expos & Out-of-Home", icon: FiBriefcase, color: "blue" },
  ];

  return (
    <div className="flex-1 space-y-6 max-w-[1400px] mx-auto text-foreground">
      {/* 1. TOP NAVIGATION HEADER */}
      <div className="flex items-center justify-between border-b border-border/40 pb-4">
        <Button variant="outline" size="sm" asChild className="h-8 text-xs font-semibold">
          <Link href="/dashboard/marketing/campaigns">
            <FiArrowLeft className="mr-1.5 h-3.5 w-3.5" />
            Back to Campaigns Ledger
          </Link>
        </Button>
        <Badge variant="outline" className="text-[11px] font-medium px-2.5 py-0.5 border-purple-500/30 text-purple-600 dark:text-purple-400 bg-purple-500/5">
          All-In-One Multi-Channel Campaign Studio
        </Badge>
      </div>

      {/* 2. PAGE TITLE */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl flex items-center gap-2">
          <FiZap className="h-7 w-7 text-purple-500" />
          Create New Marketing Campaign
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1">
          Select a marketing channel below to load its dedicated creation studio, live preview telemetry, and budget configuration.
        </p>
      </div>

      {/* 3. DYNAMIC CHANNEL SWITCHER TABS */}
      <div className="p-4 sm:p-5 rounded-2xl border border-border/50 bg-card/60 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Select Campaign Channel Type:
          </span>
          <span className="text-[11px] font-medium text-foreground bg-muted/60 px-2 py-0.5 rounded-md">
            Active Studio: <strong className="capitalize text-primary">{activeTab}</strong>
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {channelsConfig.map((c) => {
            const Icon = c.icon;
            const isSelected = activeTab === c.id;

            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setActiveTab(c.id)}
                className={`p-3 rounded-xl border text-left transition-all relative flex flex-col justify-between space-y-2 cursor-pointer ${
                  isSelected
                    ? "border-primary bg-primary/10 ring-1 ring-primary shadow-xs"
                    : "border-border/50 bg-background/50 hover:bg-accent/40 hover:border-border"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className={`p-1.5 rounded-lg ${isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  {isSelected && (
                    <FiCheckCircle className="h-4 w-4 text-primary" />
                  )}
                </div>
                <div>
                  <div className={`font-bold text-xs leading-tight ${isSelected ? "text-primary" : "text-foreground"}`}>
                    {c.name}
                  </div>
                  <div className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5">
                    {c.subtitle}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. DYNAMIC CHANNEL FORMS */}
      {/* 4A. STRATEGIC FUNNEL FORM */}
      {activeTab === "funnel" && (
        <form onSubmit={handleFunnelSubmit} className="space-y-6 animate-in fade-in-50 duration-200">
          <Card className="border-border/50 bg-card/60 shadow-xs">
            <CardHeader className="pb-4 border-b border-border/40">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <FiLayers className="h-4 w-4 text-purple-500" />
                1. Multi-Stage Strategic Campaign Identity
              </CardTitle>
              <CardDescription className="text-xs">
                Set overarching identity, customer journey objectives, and multi-channel coverage
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4 space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Campaign Name *</Label>
                  <Input
                    required
                    placeholder="e.g. Q4 Enterprise ERP Lead Gen Drive"
                    value={funnelForm.name}
                    onChange={(e) => setFunnelForm({ ...funnelForm, name: e.target.value })}
                    className="h-9 text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Primary Funnel Stage</Label>
                  <Input
                    value={funnelForm.primaryStage}
                    onChange={(e) => setFunnelForm({ ...funnelForm, primaryStage: e.target.value })}
                    className="h-9 text-xs"
                    placeholder="Awareness, Lead Generation, etc."
                  />
                </div>

                <div className="md:col-span-2 space-y-1.5">
                  <Label className="text-xs font-semibold">Target Channels</Label>
                  <Input
                    placeholder="e.g. Google Search, Meta Ads, LinkedIn Sponsored Posts, SMS, Email"
                    value={funnelForm.channel}
                    onChange={(e) => setFunnelForm({ ...funnelForm, channel: e.target.value })}
                    className="h-9 text-xs"
                  />
                </div>

                <div className="md:col-span-2 space-y-1.5">
                  <Label className="text-xs font-semibold">Campaign Objective</Label>
                  <Textarea
                    rows={2}
                    placeholder="e.g. Drive 1,000+ marketing qualified leads and 100 enterprise software demos..."
                    value={funnelForm.objective}
                    onChange={(e) => setFunnelForm({ ...funnelForm, objective: e.target.value })}
                    className="text-xs resize-none"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/60 shadow-xs">
            <CardHeader className="pb-4 border-b border-border/40">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <FiZap className="h-4 w-4 text-amber-500" />
                2. Campaign Funnel Stages Setup
              </CardTitle>
              <CardDescription className="text-xs">
                Sequential stage provisioning and customer journey mapping
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4 space-y-4 text-xs">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-foreground">Enabled Funnel Stages ({selectedStages.length}):</span>
                  <span className="text-[11px] text-muted-foreground">Click to toggle stages</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {availableDefaultStages.map((stg) => {
                    const isSelected = selectedStages.includes(stg);
                    return (
                      <button
                        key={stg}
                        type="button"
                        onClick={() => handleToggleStage(stg)}
                        className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                          isSelected
                            ? "border-purple-500/40 bg-purple-500/10 text-purple-500"
                            : "border-border/60 bg-background text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {isSelected ? "✓ " : "+ "}
                        {stg}
                      </button>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/60 shadow-xs">
            <CardHeader className="pb-4 border-b border-border/40">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <FiDollarSign className="h-4 w-4 text-emerald-500" />
                3. Budget & Schedule Limits
              </CardTitle>
              <CardDescription className="text-xs">
                Total planned budget and campaign execution timeframe
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4 space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Total Planned Budget (৳) *</Label>
                  <Input
                    type="number"
                    min="0"
                    required
                    placeholder="500000"
                    value={funnelForm.budget}
                    onChange={(e) => setFunnelForm({ ...funnelForm, budget: e.target.value })}
                    className="h-9 text-xs font-mono font-bold text-emerald-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Start Date</Label>
                  <Input
                    type="date"
                    value={funnelForm.startDate}
                    onChange={(e) => setFunnelForm({ ...funnelForm, startDate: e.target.value })}
                    className="h-9 text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">End Date</Label>
                  <Input
                    type="date"
                    value={funnelForm.endDate}
                    onChange={(e) => setFunnelForm({ ...funnelForm, endDate: e.target.value })}
                    className="h-9 text-xs"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-border/40">
                <Button type="button" variant="outline" asChild className="h-9 text-xs font-semibold">
                  <Link href="/dashboard/marketing/campaigns">Cancel</Link>
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="h-9 px-5 bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs gap-2 shadow-xs"
                >
                  {isSubmitting ? <FiRefreshCw className="h-4 w-4 animate-spin" /> : <FiCheckCircle className="h-4 w-4" />}
                  {isSubmitting ? "Creating Campaign..." : "Save Strategic Campaign"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
      )}

      {/* 4B. PAID ADS PPC FORM */}
      {activeTab === "ads" && (
        <form onSubmit={handleAdsSubmit} className="space-y-6 animate-in fade-in-50 duration-200">
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-6">
              <Card className="border-border/50 bg-card/60 shadow-xs">
                <CardHeader className="pb-4">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <FiLayers className="h-4 w-4 text-amber-500" />
                    PPC Campaign Identification & Platform
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-xs">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Campaign Name *</Label>
                    <Input
                      required
                      placeholder="e.g. Q4 Google Search Enterprise ERP Lead Generation"
                      value={adsForm.name}
                      onChange={(e) => setAdsForm({ ...adsForm, name: e.target.value })}
                      className="h-9 text-xs"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Advertising Platform *</Label>
                      <Select
                        value={adsForm.platform}
                        onValueChange={(val) => setAdsForm({ ...adsForm, platform: val })}
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
                        value={adsForm.status}
                        onValueChange={(val) => setAdsForm({ ...adsForm, status: val })}
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
                      placeholder="e.g. Drive high-intent demo bookings and qualified B2B leads..."
                      value={adsForm.objective}
                      onChange={(e) => setAdsForm({ ...adsForm, objective: e.target.value })}
                      className="text-xs resize-none"
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/50 bg-card/60 shadow-xs">
                <CardHeader className="pb-4">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <FiDollarSign className="h-4 w-4 text-emerald-500" />
                    Budget, Spend & Telemetry
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Planned Budget (৳) *</Label>
                      <Input
                        type="number"
                        min="0"
                        required
                        placeholder="50000"
                        value={adsForm.budget}
                        onChange={(e) => setAdsForm({ ...adsForm, budget: e.target.value })}
                        className="h-9 text-xs font-mono font-semibold"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Spend to Date (৳)</Label>
                      <Input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={adsForm.spend}
                        onChange={(e) => setAdsForm({ ...adsForm, spend: e.target.value })}
                        className="h-9 text-xs font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Impressions</Label>
                      <Input
                        type="number"
                        placeholder="0"
                        value={adsForm.impressions}
                        onChange={(e) => setAdsForm({ ...adsForm, impressions: e.target.value })}
                        className="h-9 text-xs font-mono"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Clicks</Label>
                      <Input
                        type="number"
                        placeholder="0"
                        value={adsForm.clicks}
                        onChange={(e) => setAdsForm({ ...adsForm, clicks: e.target.value })}
                        className="h-9 text-xs font-mono"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Leads</Label>
                      <Input
                        type="number"
                        placeholder="0"
                        value={adsForm.leads}
                        onChange={(e) => setAdsForm({ ...adsForm, leads: e.target.value })}
                        className="h-9 text-xs font-mono font-bold text-blue-500"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Conversions</Label>
                      <Input
                        type="number"
                        placeholder="0"
                        value={adsForm.conversions}
                        onChange={(e) => setAdsForm({ ...adsForm, conversions: e.target.value })}
                        className="h-9 text-xs font-mono font-bold text-emerald-500"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              <Card className="border-border/50 bg-card/60 shadow-xs sticky top-6">
                <CardHeader className="pb-3 border-b border-border/40">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <FiTrendingUp className="h-4 w-4 text-amber-500" />
                    Live PPC Forecast
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4 space-y-4 text-xs">
                  <div className="p-3.5 rounded-xl border border-border/40 bg-background/50 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground flex items-center gap-1.5">
                        <FiEye className="h-3.5 w-3.5 text-blue-500" /> CTR
                      </span>
                      <span className="font-mono font-bold text-emerald-500 text-sm">{adsCtr}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground flex items-center gap-1.5">
                        <FiMousePointer className="h-3.5 w-3.5 text-purple-500" /> CPC
                      </span>
                      <span className="font-mono font-bold text-foreground text-sm">{adsCpc}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground flex items-center gap-1.5">
                        <FiTarget className="h-3.5 w-3.5 text-amber-500" /> CPL
                      </span>
                      <span className="font-mono font-bold text-amber-500 text-sm">{adsCpl}</span>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full h-10 bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs gap-2 shadow-xs"
                  >
                    {isSubmitting ? <FiRefreshCw className="h-4 w-4 animate-spin" /> : <FiCheckCircle className="h-4 w-4" />}
                    {isSubmitting ? "Creating..." : "Save & Launch Ad Campaign"}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </form>
      )}

      {/* 4C. SMS BROADCAST FORM */}
      {activeTab === "sms" && (
        <form onSubmit={handleSmsSubmit} className="space-y-6 animate-in fade-in-50 duration-200">
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-6">
              <Card className="border-border/50 bg-card/60 shadow-xs">
                <CardHeader className="pb-4">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <FiMessageSquare className="h-4 w-4 text-rose-500" />
                    SMS Broadcast Message & Carrier Gateway
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-xs">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Broadcast Title *</Label>
                    <Input
                      required
                      placeholder="e.g. Q4 Banking Sync ERP Webinar VIP SMS Blast"
                      value={smsForm.name}
                      onChange={(e) => setSmsForm({ ...smsForm, name: e.target.value })}
                      className="h-9 text-xs"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Telco Gateway Route *</Label>
                      <Select
                        value={smsForm.senderGateway}
                        onValueChange={(val) => {
                          const mask = val.includes("Grameenphone") ? "TechCorp GP" : val.includes("Banglalink") ? "TechCorp BL" : "TechCorp CRM";
                          setSmsForm({ ...smsForm, senderGateway: val, senderMask: mask });
                        }}
                      >
                        <SelectTrigger className="h-9 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Grameenphone Masking Gateway">Grameenphone Masking</SelectItem>
                          <SelectItem value="Banglalink Gateway Direct">Banglalink Direct Route</SelectItem>
                          <SelectItem value="Robi Axiata Telecom Gateway">Robi Axiata Gateway</SelectItem>
                          <SelectItem value="InfoBip Global SMS Route">InfoBip Global Route</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Sender Masking ID</Label>
                      <Input
                        placeholder="e.g. TechCorp CRM"
                        value={smsForm.senderMask}
                        onChange={(e) => setSmsForm({ ...smsForm, senderMask: e.target.value })}
                        className="h-9 text-xs font-mono"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold">Message Body *</Label>
                      <span className="text-[11px] font-mono text-muted-foreground">
                        {smsCharCount} chars • <strong className="text-rose-500">{smsParts}</strong> SMS parts
                      </span>
                    </div>
                    <Textarea
                      required
                      rows={4}
                      placeholder="Special Offer: Upgrade to our next-gen Cloud ERP & CRM suite with 25% discount. Reply YES to book a VIP demo today!"
                      value={smsForm.message}
                      onChange={(e) => setSmsForm({ ...smsForm, message: e.target.value })}
                      className="text-xs resize-none"
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/50 bg-card/60 shadow-xs">
                <CardHeader className="pb-4">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <FiUsers className="h-4 w-4 text-blue-500" />
                    Audience & Budget
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Target Recipients *</Label>
                      <Input
                        type="number"
                        min="1"
                        required
                        placeholder="500"
                        value={smsForm.recipients}
                        onChange={(e) => setSmsForm({ ...smsForm, recipients: e.target.value })}
                        className="h-9 text-xs font-mono font-semibold"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Budget (৳) *</Label>
                      <Input
                        type="number"
                        min="0"
                        required
                        placeholder="2500"
                        value={smsForm.budget}
                        onChange={(e) => setSmsForm({ ...smsForm, budget: e.target.value })}
                        className="h-9 text-xs font-mono font-bold text-rose-500"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              <Card className="border-border/50 bg-card/60 shadow-xs sticky top-6">
                <CardHeader className="pb-3 border-b border-border/40">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <FiSmartphone className="h-4 w-4 text-rose-500" />
                    Live Handset Preview
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4 space-y-4 text-xs">
                  <div className="w-full max-w-[280px] mx-auto rounded-3xl border-4 border-muted-foreground/30 bg-background shadow-lg overflow-hidden p-3 space-y-3">
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground px-1 border-b border-border/30 pb-1">
                      <span>9:41 AM</span>
                      <span className="font-semibold text-rose-500">4G LTE</span>
                    </div>
                    <div className="text-center py-1">
                      <div className="text-xs font-bold text-foreground">{smsForm.senderMask || "TechCorp"}</div>
                      <div className="text-[10px] text-muted-foreground font-mono">SMS Broadcast</div>
                    </div>
                    <div className="bg-rose-500/10 border border-rose-500/20 text-foreground p-3 rounded-2xl rounded-tl-xs text-[11px] leading-relaxed shadow-xs">
                      {smsForm.message || "Your SMS text message will appear here..."}
                    </div>
                  </div>

                  <div className="p-3 rounded-xl border border-border/40 bg-background/50 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Total Units:</span>
                      <span className="font-mono font-bold text-foreground">
                        {(smsRecipientsNum * smsParts).toLocaleString()} SMS credits
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Cost per Recipient:</span>
                      <span className="font-mono font-bold text-rose-500">৳{smsCostPerRecipient}</span>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full h-10 bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs gap-2 shadow-xs"
                  >
                    {isSubmitting ? <FiRefreshCw className="h-4 w-4 animate-spin" /> : <FiSend className="h-4 w-4" />}
                    {isSubmitting ? "Dispatching..." : "Send SMS Broadcast"}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </form>
      )}

      {/* 4D. WHATSAPP BROADCAST FORM */}
      {activeTab === "wa" && (
        <form onSubmit={handleWaSubmit} className="space-y-6 animate-in fade-in-50 duration-200">
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-6">
              <Card className="border-border/50 bg-card/60 shadow-xs">
                <CardHeader className="pb-4">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <FiMessageSquare className="h-4 w-4 text-emerald-500" />
                    WhatsApp HSM Template & Dynamic Variables
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-xs">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Broadcast Campaign Name *</Label>
                    <Input
                      required
                      placeholder="e.g. Q4 Garments ERP Product Upgrade Broadcast"
                      value={waForm.name}
                      onChange={(e) => setWaForm({ ...waForm, name: e.target.value })}
                      className="h-9 text-xs"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Pre-Approved HSM Template *</Label>
                      <Select
                        value={waForm.templateName}
                        onValueChange={(tmplName) => {
                          const tmpl = waTemplates.find((t) => t.id === tmplName);
                          setWaForm((prev) => ({
                            ...prev,
                            templateName: tmplName,
                            message: tmpl ? tmpl.defaultText : prev.message,
                          }));
                        }}
                      >
                        <SelectTrigger className="h-9 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {waTemplates.map((t) => (
                            <SelectItem key={t.id} value={t.id}>
                              {t.name} ({t.category})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Audience Segment *</Label>
                      <Select
                        value={waForm.audience}
                        onValueChange={(val) => setWaForm({ ...waForm, audience: val })}
                      >
                        <SelectTrigger className="h-9 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Enterprise Leads">Enterprise Leads (1,450)</SelectItem>
                          <SelectItem value="High-Intent Contacts">High-Intent Contacts (680)</SelectItem>
                          <SelectItem value="All Subscribers">All Subscribers (3,200)</SelectItem>
                          <SelectItem value="VIP Client Accounts">VIP Accounts (120)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Variable {'{{1}}'} (Recipient Name)</Label>
                      <Input
                        placeholder="e.g. John Doe"
                        value={waForm.leadNamePlaceholder}
                        onChange={(e) => setWaForm({ ...waForm, leadNamePlaceholder: e.target.value })}
                        className="h-9 text-xs"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Variable {'{{2}}'} (Company)</Label>
                      <Input
                        placeholder="e.g. Apex Garments Ltd."
                        value={waForm.companyPlaceholder}
                        onChange={(e) => setWaForm({ ...waForm, companyPlaceholder: e.target.value })}
                        className="h-9 text-xs"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Template Message Body</Label>
                    <Textarea
                      rows={4}
                      placeholder="Hi {{1}}, discover the all-new ERP suite modules designed specifically for {{2}}. Streamline operations, cut overhead by 30%, and boost team productivity. Tap below to schedule an exclusive VIP walkthrough!"
                      value={waForm.message}
                      onChange={(e) => setWaForm({ ...waForm, message: e.target.value })}
                      className="text-xs resize-none"
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/50 bg-card/60 shadow-xs">
                <CardHeader className="pb-4">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <FiSend className="h-4 w-4 text-blue-500" />
                    Budget & Execution
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Allocated Budget (৳) *</Label>
                      <Input
                        type="number"
                        min="0"
                        required
                        placeholder="5000"
                        value={waForm.budget}
                        onChange={(e) => setWaForm({ ...waForm, budget: e.target.value })}
                        className="h-9 text-xs font-mono font-bold text-emerald-500"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Launch Date</Label>
                      <Input
                        type="date"
                        value={waForm.startDate}
                        onChange={(e) => setWaForm({ ...waForm, startDate: e.target.value })}
                        className="h-9 text-xs"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              <Card className="border-border/50 bg-card/60 shadow-xs sticky top-6">
                <CardHeader className="pb-3 border-b border-border/40">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <FiSmartphone className="h-4 w-4 text-emerald-500" />
                    WhatsApp Chat Preview
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4 space-y-4 text-xs">
                  <div className="w-full rounded-2xl border border-emerald-500/30 bg-[#0b141a] text-[#e9edef] p-3 space-y-2.5 shadow-md">
                    <div className="flex items-center gap-2 pb-2 border-b border-white/10">
                      <div className="h-7 w-7 rounded-full bg-emerald-600 flex items-center justify-center text-white font-bold text-xs">
                        TC
                      </div>
                      <div>
                        <div className="text-xs font-semibold">TechCorp Business Verified</div>
                        <div className="text-[10px] text-emerald-400">Official WhatsApp Account</div>
                      </div>
                    </div>
                    <div className="bg-[#005c4b] text-[#e9edef] p-3 rounded-2xl rounded-tl-xs text-[11px] leading-relaxed shadow-xs">
                      <p>{waPreviewText}</p>
                      <div className="text-[9px] text-[#8696a0] text-right mt-1.5">10:30 AM • ✓✓</div>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full h-10 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs gap-2 shadow-xs"
                  >
                    {isSubmitting ? <FiRefreshCw className="h-4 w-4 animate-spin" /> : <FiSend className="h-4 w-4" />}
                    {isSubmitting ? "Launching..." : "Launch WhatsApp Broadcast"}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </form>
      )}

      {/* 4E. EMAIL BROADCAST FORM */}
      {activeTab === "email" && (
        <form onSubmit={handleEmailSubmit} className="space-y-6 animate-in fade-in-50 duration-200">
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-6">
              <Card className="border-border/50 bg-card/60 shadow-xs">
                <CardHeader className="pb-4">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <FiMail className="h-4 w-4 text-teal-500" />
                    Email Subject & Sender Identity
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-xs">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Subject Line *</Label>
                    <Input
                      required
                      placeholder="e.g. August Enterprise ERP Product Newsletter"
                      value={emailForm.subject}
                      onChange={(e) => setEmailForm({ ...emailForm, subject: e.target.value })}
                      className="h-9 text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Preheader Snippet</Label>
                    <Input
                      placeholder="e.g. Exclusive insights and strategic ERP enhancements for your enterprise"
                      value={emailForm.preheader}
                      onChange={(e) => setEmailForm({ ...emailForm, preheader: e.target.value })}
                      className="h-9 text-xs"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Sender Name</Label>
                      <Input
                        placeholder="e.g. TechCorp Enterprise Team"
                        value={emailForm.fromName}
                        onChange={(e) => setEmailForm({ ...emailForm, fromName: e.target.value })}
                        className="h-9 text-xs"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Sender Email</Label>
                      <Input
                        type="email"
                        placeholder="e.g. marketing@techcorp.com"
                        value={emailForm.fromEmail}
                        onChange={(e) => setEmailForm({ ...emailForm, fromEmail: e.target.value })}
                        className="h-9 text-xs font-mono"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/50 bg-card/60 shadow-xs">
                <CardHeader className="pb-4">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <FiFileText className="h-4 w-4 text-teal-500" />
                    Message Body
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-xs">
                  <Textarea
                    rows={8}
                    placeholder="Hello,&#10;&#10;We are excited to share our latest product updates and architectural enhancements for your enterprise workflow. Our modular ERP solutions help reduce operational latency while empowering your finance and management teams with real-time analytics.&#10;&#10;Best regards,&#10;The TechCorp Team"
                    value={emailForm.body}
                    onChange={(e) => setEmailForm({ ...emailForm, body: e.target.value })}
                    className="text-xs resize-none leading-relaxed font-sans"
                  />
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              <Card className="border-border/50 bg-card/60 shadow-xs sticky top-6">
                <CardHeader className="pb-3 border-b border-border/40">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <FiMail className="h-4 w-4 text-teal-500" />
                    Live Inbox Preview
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4 space-y-4 text-xs">
                  <div className="w-full rounded-2xl border border-border/60 bg-card shadow-xs overflow-hidden">
                    <div className="p-3 bg-muted/40 border-b border-border/40 space-y-1">
                      <div className="text-[10px] text-muted-foreground">From: <strong className="text-foreground">{emailForm.fromName || "Sender Name"}</strong></div>
                      <div className="text-xs font-bold text-foreground truncate">{emailForm.subject || "Your Subject Line"}</div>
                    </div>
                    <div className="p-3 bg-background/80 text-foreground text-[11px] leading-relaxed whitespace-pre-wrap max-h-[160px] overflow-y-auto">
                      {emailForm.body || "Your email newsletter message preview will appear here..."}
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full h-10 bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs gap-2 shadow-xs"
                  >
                    {isSubmitting ? <FiRefreshCw className="h-4 w-4 animate-spin" /> : <FiSend className="h-4 w-4" />}
                    {isSubmitting ? "Dispatching..." : "Send Email Broadcast"}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </form>
      )}

      {/* 4F. PHYSICAL CAMPAIGN FORM */}
      {activeTab === "physical" && (
        <form onSubmit={handlePhysicalSubmit} className="space-y-6 animate-in fade-in-50 duration-200">
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-6">
              <Card className="border-border/50 bg-card/60 shadow-xs">
                <CardHeader className="pb-4">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <FiBriefcase className="h-4 w-4 text-amber-500" />
                    Physical Venue & Campaign Type
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-xs">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Campaign Title *</Label>
                    <Input
                      required
                      placeholder="e.g. Bangladesh Tech Expo 2026 Executive Pavilion"
                      value={physicalForm.name}
                      onChange={(e) => setPhysicalForm({ ...physicalForm, name: e.target.value })}
                      className="h-9 text-xs"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Campaign Type *</Label>
                      <Select
                        value={physicalForm.venueType}
                        onValueChange={(val) => setPhysicalForm({ ...physicalForm, venueType: val })}
                      >
                        <SelectTrigger className="h-9 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Event / Exhibition">Event / Exhibition Booth</SelectItem>
                          <SelectItem value="Outdoor Billboard">Outdoor Billboard</SelectItem>
                          <SelectItem value="Print / Direct Mail">Print / Flyer Distribution</SelectItem>
                          <SelectItem value="Corporate Seminar">Corporate Seminar</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Venue / Location *</Label>
                      <Input
                        required
                        placeholder="e.g. ICC BASHUNDHARA, Hall 4, Dhaka"
                        value={physicalForm.location}
                        onChange={(e) => setPhysicalForm({ ...physicalForm, location: e.target.value })}
                        className="h-9 text-xs"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Objective Brief</Label>
                    <Textarea
                      rows={2}
                      placeholder="e.g. Corporate brand visibility and high-value CXO lead acquisition at tech summit"
                      value={physicalForm.objective}
                      onChange={(e) => setPhysicalForm({ ...physicalForm, objective: e.target.value })}
                      className="text-xs resize-none"
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/50 bg-card/60 shadow-xs">
                <CardHeader className="pb-4">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <FiDollarSign className="h-4 w-4 text-emerald-500" />
                    Budget, Spend & Leads
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Allocated Budget (৳) *</Label>
                      <Input
                        type="number"
                        min="0"
                        required
                        placeholder="150000"
                        value={physicalForm.budget}
                        onChange={(e) => setPhysicalForm({ ...physicalForm, budget: e.target.value })}
                        className="h-9 text-xs font-mono font-bold"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Actual Spend (৳)</Label>
                      <Input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={physicalForm.spend}
                        onChange={(e) => setPhysicalForm({ ...physicalForm, spend: e.target.value })}
                        className="h-9 text-xs font-mono font-bold text-amber-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Offline Leads Captured</Label>
                      <Input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={physicalForm.leads}
                        onChange={(e) => setPhysicalForm({ ...physicalForm, leads: e.target.value })}
                        className="h-9 text-xs font-mono font-bold text-blue-500"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Closed Deals / Conversions</Label>
                      <Input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={physicalForm.conversions}
                        onChange={(e) => setPhysicalForm({ ...physicalForm, conversions: e.target.value })}
                        className="h-9 text-xs font-mono font-bold text-emerald-500"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              <Card className="border-border/50 bg-card/60 shadow-xs sticky top-6">
                <CardHeader className="pb-3 border-b border-border/40">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <FiTrendingUp className="h-4 w-4 text-amber-500" />
                    Offline Performance Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4 space-y-4 text-xs">
                  <div className="p-3.5 rounded-xl border border-border/40 bg-background/50 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground flex items-center gap-1.5">
                        <FiMapPin className="h-3.5 w-3.5 text-purple-500" /> Venue Type
                      </span>
                      <span className="font-semibold text-foreground truncate max-w-[150px]">{physicalForm.venueType}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground flex items-center gap-1.5">
                        <FiDollarSign className="h-3.5 w-3.5 text-amber-500" /> Cost Per Lead
                      </span>
                      <span className="font-mono font-bold text-amber-500 text-sm">{phyCostPerLead}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground flex items-center gap-1.5">
                        <FiCheckCircle className="h-3.5 w-3.5 text-emerald-500" /> Conversion Rate
                      </span>
                      <span className="font-mono font-bold text-emerald-500 text-sm">{phyConversionRate}</span>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full h-10 bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs gap-2 shadow-xs"
                  >
                    {isSubmitting ? <FiRefreshCw className="h-4 w-4 animate-spin" /> : <FiCheckCircle className="h-4 w-4" />}
                    {isSubmitting ? "Saving..." : "Save Physical Campaign"}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
