"use client";

import React, { useState, useEffect } from "react";
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
  FiDollarSign,
  FiCheckCircle,
  FiZap,
  FiMessageSquare,
  FiSmartphone,
  FiMail,
  FiBriefcase,
  FiRefreshCw,
  FiTarget,
  FiTag,
} from "react-icons/fi";
import AudienceAndContentSelector from "@/components/marketing/shared/AudienceAndContentSelector";
import {
  createChannelSpecificCampaignAction,
  getMarketingFunnelsAction,
  MarketingFunnelListItem,
} from "@/app/actions/crm/marketing-operations.action";
import { toast } from "sonner";

type ChannelTab = "funnel" | "ads" | "sms" | "wa" | "email" | "physical";

const TAB_CONFIGS: {
  id: ChannelTab;
  label: string;
  shortLabel: string;
  icon: React.ComponentType<{ className?: string }>;
  badge: string;
  description: string;
}[] = [
  {
    id: "funnel",
    label: "Strategic 7-Stage Funnel",
    shortLabel: "7-Stage Funnel",
    icon: FiZap,
    badge: "Full-Funnel Growth",
    description: "Multi-stage awareness to retention lifecycle campaign with stage-by-stage messaging",
  },
  {
    id: "ads",
    label: "Meta & Google Ads",
    shortLabel: "Paid Ads",
    icon: FiTarget,
    badge: "Paid Traffic",
    description: "Targeted digital advertising across Facebook, Instagram, Google Search & Display",
  },
  {
    id: "sms",
    label: "SMS Broadcast",
    shortLabel: "SMS Campaign",
    icon: FiSmartphone,
    badge: "Direct Mobile",
    description: "High-open-rate SMS broadcast for instant alerts, flash sales & urgent notices",
  },
  {
    id: "wa",
    label: "WhatsApp Business",
    shortLabel: "WhatsApp",
    icon: FiMessageSquare,
    badge: "High Engagement",
    description: "Interactive WhatsApp messaging for conversational sales, bookings & follow-ups",
  },
  {
    id: "email",
    label: "Email Broadcast",
    shortLabel: "Email Campaign",
    icon: FiMail,
    badge: "Email Marketing",
    description: "High-converting newsletters, product announcements & drip nurturing sequences",
  },
  {
    id: "physical",
    label: "Physical & Billboard",
    shortLabel: "Physical & OOH",
    icon: FiBriefcase,
    badge: "OOH & Print",
    description: "Billboards, LED display screens, print flyers, booth exhibitions & field activations",
  },
];

const CTA_OPTIONS = [
  "Book a VIP Demo",
  "Claim 25% Discount",
  "Get Instant Quote",
  "Download Brochure",
  "Talk to an Expert",
  "Sign Up Free",
  "Contact Sales Team",
  "Schedule Consultation",
  "Learn More",
  "Order Now",
];

const OFFER_HOOK_SUGGESTIONS = [
  "Flat 25% Off + Free Setup",
  "Free 14-Day Enterprise Trial",
  "Zero Setup Fee This Month",
  "Free Product Audit Included",
  "Exclusive VIP Invitation",
  "Limited Time Early Bird Access",
];

interface CreateCampaignViewProps {
  initialFunnels?: MarketingFunnelListItem[];
}

export default function CreateCampaignView({ initialFunnels = [] }: CreateCampaignViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const defaultTab = (searchParams.get("tab") as ChannelTab) || "funnel";

  const [activeTab, setActiveTab] = useState<ChannelTab>(defaultTab);
  const [funnels, setFunnels] = useState<MarketingFunnelListItem[]>(initialFunnels);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Common Form States per Channel
  // 1. Funnel
  const [funnelForm, setFunnelForm] = useState({
    name: "",
    objective: "Full-Funnel Customer Acquisition & Revenue Growth",
    funnelId: "",
    offerHook: "Flat 25% Off + Free Setup",
    cta: "Book a VIP Demo",
    budget: "50000",
    startDate: new Date().toISOString().split("T")[0],
    endDate: new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0],
    status: "SCHEDULED" as const,
    targetAudience: "B2B Decision Makers & Corporate Executives",
    selectedFormats: ["VIDEO", "REELS_SHORTS", "STATIC", "CAROUSEL"] as string[],
  });

  // 2. Paid Ads
  const [adsForm, setAdsForm] = useState({
    name: "",
    objective: "LEAD_GENERATION",
    platform: "FACEBOOK",
    offerHook: "Flat 25% Off + Free Setup",
    cta: "Get Instant Quote",
    budget: "30000",
    startDate: new Date().toISOString().split("T")[0],
    endDate: new Date(Date.now() + 14 * 86400000).toISOString().split("T")[0],
    status: "SCHEDULED" as const,
    targetAudience: "E-commerce Business Owners & Marketers",
    selectedFormats: ["VIDEO", "STATIC"] as string[],
  });

  // 3. SMS Broadcast
  const [smsForm, setSmsForm] = useState({
    name: "",
    gateway: "Default SMS Gateway (Masking)",
    senderId: "BRAND_SMS",
    messageText: "Special Offer! Get exclusive 20% discount on your next service. Claim now: https://example.com/deal",
    cta: "Claim Discount",
    budget: "10000",
    startDate: new Date().toISOString().split("T")[0],
    endDate: new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0],
    status: "SCHEDULED" as const,
    targetAudience: "Existing Customers & VIP Members",
    selectedFormats: ["STATIC"] as string[],
  });

  // 4. WhatsApp Business
  const [waForm, setWaForm] = useState({
    name: "",
    templateName: "promo_exclusive_offer",
    messageText: "Hello! We have an exclusive upgrade offer prepared for you. Would you like to check the details?",
    cta: "Chat with Sales",
    budget: "15000",
    startDate: new Date().toISOString().split("T")[0],
    endDate: new Date(Date.now() + 14 * 86400000).toISOString().split("T")[0],
    status: "SCHEDULED" as const,
    targetAudience: "Warm Leads & Recent Inquiries",
    selectedFormats: ["CAROUSEL", "REELS_SHORTS"] as string[],
  });

  // 5. Email Broadcast
  const [emailForm, setEmailForm] = useState({
    name: "",
    subject: "Exclusive Invitation: Supercharge your workflow today",
    preheader: "Don't miss our limited-time special offer inside...",
    cta: "Get Started Now",
    budget: "8000",
    startDate: new Date().toISOString().split("T")[0],
    endDate: new Date(Date.now() + 14 * 86400000).toISOString().split("T")[0],
    status: "SCHEDULED" as const,
    targetAudience: "Newsletter Subscribers & Inactive Leads",
    selectedFormats: ["STATIC", "CAROUSEL"] as string[],
  });

  // 6. Physical & Billboard
  const [physicalForm, setPhysicalForm] = useState({
    name: "",
    locationType: "BILLBOARD",
    locationAddress: "Gulshan-2 Circle / Airport Road LED Display, Dhaka",
    dimensions: "20ft x 10ft High-Definition LED Display",
    cta: "Visit Our Showroom / Scan QR Code",
    budget: "120000",
    startDate: new Date().toISOString().split("T")[0],
    endDate: new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0],
    status: "SCHEDULED" as const,
    targetAudience: "High Net-Worth Urban Commuters & Corporate Professionals",
    selectedFormats: ["STATIC", "VIDEO"] as string[],
  });

  // Fetch funnels if not passed
  useEffect(() => {
    if (funnels.length === 0) {
      getMarketingFunnelsAction().then((res) => {
        if (res.success && res.funnels) {
          setFunnels(res.funnels);
          if (res.funnels.length > 0 && !funnelForm.funnelId) {
            setFunnelForm((prev) => ({ ...prev, funnelId: res.funnels[0].id }));
          }
        }
      });
    }
  }, [funnels.length, funnelForm.funnelId]);

  // Handle Form Submission
  const handleLaunchCampaign = async () => {
    setIsSubmitting(true);
    try {
      if (activeTab === "funnel") {
        if (!funnelForm.name.trim()) {
          toast.error("Please enter a campaign name");
          setIsSubmitting(false);
          return;
        }

        const res = await createChannelSpecificCampaignAction({
          channel: "funnel",
          name: funnelForm.name,
          objective: funnelForm.objective,
          budget: parseFloat(funnelForm.budget) || 0,
          startDate: funnelForm.startDate,
          endDate: funnelForm.endDate,
          status: funnelForm.status,
          targetAudience: funnelForm.targetAudience,
          contentFormats: funnelForm.selectedFormats,
          offerHook: funnelForm.offerHook,
          ctaText: funnelForm.cta,
          funnelId: funnelForm.funnelId || undefined,
        });

        if (res.success) {
          toast.success("Strategic Funnel Campaign launched successfully!");
          router.push(`/dashboard/marketing/campaigns/${res.campaignId}`);
        } else {
          toast.error(res.error || "Failed to create campaign");
        }
      } else if (activeTab === "ads") {
        if (!adsForm.name.trim()) {
          toast.error("Please enter an ad campaign name");
          setIsSubmitting(false);
          return;
        }

        const res = await createChannelSpecificCampaignAction({
          channel: "ads",
          name: adsForm.name,
          objective: adsForm.objective,
          budget: parseFloat(adsForm.budget) || 0,
          startDate: adsForm.startDate,
          endDate: adsForm.endDate,
          status: adsForm.status,
          targetAudience: adsForm.targetAudience,
          contentFormats: adsForm.selectedFormats,
          offerHook: adsForm.offerHook,
          ctaText: adsForm.cta,
          platform: adsForm.platform,
        });

        if (res.success) {
          toast.success("Meta & Google Ads Campaign created!");
          router.push(`/dashboard/marketing/campaigns/${res.campaignId}`);
        } else {
          toast.error(res.error || "Failed to create ads campaign");
        }
      } else if (activeTab === "sms") {
        if (!smsForm.name.trim()) {
          toast.error("Please enter an SMS campaign name");
          setIsSubmitting(false);
          return;
        }

        const res = await createChannelSpecificCampaignAction({
          channel: "sms",
          name: smsForm.name,
          objective: "SMS Direct Broadcast",
          budget: parseFloat(smsForm.budget) || 0,
          startDate: smsForm.startDate,
          endDate: smsForm.endDate,
          status: smsForm.status,
          targetAudience: smsForm.targetAudience,
          contentFormats: smsForm.selectedFormats,
          ctaText: smsForm.cta,
          message: smsForm.messageText,
          senderId: smsForm.senderId,
        });

        if (res.success) {
          toast.success("SMS Campaign scheduled successfully!");
          router.push(`/dashboard/marketing/campaigns/${res.campaignId}`);
        } else {
          toast.error(res.error || "Failed to create SMS campaign");
        }
      } else if (activeTab === "wa") {
        if (!waForm.name.trim()) {
          toast.error("Please enter a WhatsApp campaign name");
          setIsSubmitting(false);
          return;
        }

        const res = await createChannelSpecificCampaignAction({
          channel: "wa",
          name: waForm.name,
          objective: "WhatsApp Direct Engagement",
          budget: parseFloat(waForm.budget) || 0,
          startDate: waForm.startDate,
          endDate: waForm.endDate,
          status: waForm.status,
          targetAudience: waForm.targetAudience,
          contentFormats: waForm.selectedFormats,
          ctaText: waForm.cta,
          message: waForm.messageText,
        });

        if (res.success) {
          toast.success("WhatsApp Campaign created successfully!");
          router.push(`/dashboard/marketing/campaigns/${res.campaignId}`);
        } else {
          toast.error(res.error || "Failed to create WhatsApp campaign");
        }
      } else if (activeTab === "email") {
        if (!emailForm.name.trim()) {
          toast.error("Please enter an email campaign name");
          setIsSubmitting(false);
          return;
        }

        const res = await createChannelSpecificCampaignAction({
          channel: "email",
          name: emailForm.name,
          objective: "Email Lead Nurture & Conversion",
          budget: parseFloat(emailForm.budget) || 0,
          startDate: emailForm.startDate,
          endDate: emailForm.endDate,
          status: emailForm.status,
          targetAudience: emailForm.targetAudience,
          contentFormats: emailForm.selectedFormats,
          ctaText: emailForm.cta,
          subject: emailForm.subject,
        });

        if (res.success) {
          toast.success("Email Campaign scheduled successfully!");
          router.push(`/dashboard/marketing/campaigns/${res.campaignId}`);
        } else {
          toast.error(res.error || "Failed to create email campaign");
        }
      } else if (activeTab === "physical") {
        if (!physicalForm.name.trim()) {
          toast.error("Please enter a billboard/physical campaign name");
          setIsSubmitting(false);
          return;
        }

        const res = await createChannelSpecificCampaignAction({
          channel: "physical",
          name: physicalForm.name,
          objective: "Outdoor Brand Awareness & Footfall",
          budget: parseFloat(physicalForm.budget) || 0,
          startDate: physicalForm.startDate,
          endDate: physicalForm.endDate,
          status: physicalForm.status,
          targetAudience: physicalForm.targetAudience,
          contentFormats: physicalForm.selectedFormats,
          ctaText: physicalForm.cta,
          location: physicalForm.locationAddress,
          materials: physicalForm.dimensions,
        });

        if (res.success) {
          toast.success("Physical / Billboard Campaign launched!");
          router.push(`/dashboard/marketing/campaigns/${res.campaignId}`);
        } else {
          toast.error(res.error || "Failed to create physical campaign");
        }
      }
    } catch (err: any) {
      toast.error(err.message || "An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentConfig = TAB_CONFIGS.find((t) => t.id === activeTab) || TAB_CONFIGS[0];

  return (
    <div className="min-h-screen bg-slate-50/60 text-zinc-900 p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-zinc-200/80 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/marketing/campaigns"
              className="p-2 rounded-lg bg-white border border-zinc-200 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50 transition-colors shadow-xs"
            >
              <FiArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-semibold tracking-tight text-zinc-900">Create Marketing Campaign</h1>
                <Badge variant="outline" className="text-[11px] font-normal border-zinc-200 text-zinc-600 bg-zinc-50">
                  Universal Builder
                </Badge>
              </div>
              <p className="text-xs text-zinc-500 mt-0.5">
                Configure your campaign details, audience target, and content format plan.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Link href="/dashboard/marketing/campaigns">
            <Button
              variant="outline"
              className="bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 rounded-lg text-xs h-9 font-normal shadow-xs"
            >
              Cancel
            </Button>
          </Link>
          <Button
            onClick={handleLaunchCampaign}
            disabled={isSubmitting}
            className="bg-zinc-900 hover:bg-zinc-800 text-white font-medium text-xs h-9 px-4 rounded-lg shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <FiRefreshCw className="h-3.5 w-3.5 animate-spin" />
                <span>Launching...</span>
              </>
            ) : (
              <>
                <FiZap className="h-3.5 w-3.5" />
                <span>Launch Campaign</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Channel Tabs Selector Header */}
      <div className="space-y-2">
        <Label className="text-xs font-medium text-zinc-600 uppercase tracking-wider block">
          Select Marketing Channel:
        </Label>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 bg-zinc-100/70 p-1.5 rounded-xl border border-zinc-200/80">
          {TAB_CONFIGS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                  isActive
                    ? "bg-white border-zinc-300 shadow-xs text-zinc-900"
                    : "bg-transparent border-transparent hover:bg-white/60 text-zinc-600 hover:text-zinc-900"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div
                    className={`p-1.5 rounded-md border ${
                      isActive
                        ? "bg-zinc-900 text-white border-zinc-900"
                        : "bg-zinc-200/70 text-zinc-600 border-zinc-300/60"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  {isActive && (
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-zinc-900" />
                  )}
                </div>
                <div>
                  <h4 className="text-xs font-medium truncate">{tab.shortLabel}</h4>
                  <p className="text-[10px] text-zinc-400 truncate font-normal">{tab.badge}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Channel Hero Summary Banner */}
      <div className="rounded-xl border border-zinc-200 bg-white p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-zinc-100 text-zinc-700 border border-zinc-200">
            <currentConfig.icon className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-zinc-900">{currentConfig.label}</h2>
              <Badge variant="outline" className="text-[10px] font-normal border-zinc-200 text-zinc-600 bg-zinc-50">
                {currentConfig.badge}
              </Badge>
            </div>
            <p className="text-xs text-zinc-500 font-normal mt-0.5">{currentConfig.description}</p>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4-TIER MODULAR CAMPAIGN BUILDER SECTIONS */}
      {/* ========================================================================= */}
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* ------------------------------------------------------------- */}
        {/* CARD 1: IDENTITY & CHANNEL BASICS */}
        {/* ------------------------------------------------------------- */}
        <Card className="border-zinc-200 bg-white rounded-xl shadow-xs">
          <CardHeader className="border-b border-zinc-100 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-zinc-100 text-zinc-700 border border-zinc-200">
                <FiTag className="h-4 w-4" />
              </div>
              <div>
                <CardTitle className="text-sm font-semibold text-zinc-900">
                  1. Campaign Identity & Channel Basics
                </CardTitle>
                <CardDescription className="text-xs text-zinc-500 font-normal">
                  Define campaign name, objective, messaging hooks & Call to Action.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            {/* Channel-Specific Form 1 */}
            {activeTab === "funnel" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1 md:col-span-2">
                  <Label className="text-xs font-medium text-zinc-700">Campaign Name *</Label>
                  <Input
                    placeholder="e.g. Q4 Growth Acceleration — 7-Stage Full Lifecycle Funnel"
                    value={funnelForm.name}
                    onChange={(e) => setFunnelForm({ ...funnelForm, name: e.target.value })}
                    className="h-9 text-xs bg-white border-zinc-300 text-zinc-800 placeholder:text-zinc-400 rounded-lg focus-visible:ring-1 focus-visible:ring-zinc-400"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-medium text-zinc-700">Connect to Existing Funnel (Optional)</Label>
                  <Select
                    value={funnelForm.funnelId}
                    onValueChange={(val) => setFunnelForm({ ...funnelForm, funnelId: val })}
                  >
                    <SelectTrigger className="h-9 text-xs bg-white border-zinc-300 text-zinc-800 rounded-lg">
                      <SelectValue placeholder="Select a marketing funnel..." />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-zinc-200 text-zinc-800">
                      {funnels.map((f) => (
                        <SelectItem key={f.id} value={f.id} className="text-xs">
                          {f.name} ({f.stages?.length || 0} stages)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-medium text-zinc-700">Core Campaign Objective</Label>
                  <Input
                    value={funnelForm.objective}
                    onChange={(e) => setFunnelForm({ ...funnelForm, objective: e.target.value })}
                    className="h-9 text-xs bg-white border-zinc-300 text-zinc-800 rounded-lg"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-medium text-zinc-700">Promotional Offer / Hook</Label>
                  <Input
                    value={funnelForm.offerHook}
                    onChange={(e) => setFunnelForm({ ...funnelForm, offerHook: e.target.value })}
                    className="h-9 text-xs bg-white border-zinc-300 text-zinc-800 rounded-lg"
                  />
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {OFFER_HOOK_SUGGESTIONS.slice(0, 3).map((hook) => (
                      <button
                        key={hook}
                        type="button"
                        onClick={() => setFunnelForm({ ...funnelForm, offerHook: hook })}
                        className="text-[11px] px-2 py-0.5 rounded bg-zinc-100 hover:bg-zinc-200 text-zinc-600 border border-zinc-200 transition-colors cursor-pointer"
                      >
                        {hook}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-medium text-zinc-700">Call to Action (CTA)</Label>
                  <Select
                    value={funnelForm.cta}
                    onValueChange={(val) => setFunnelForm({ ...funnelForm, cta: val })}
                  >
                    <SelectTrigger className="h-9 text-xs bg-white border-zinc-300 text-zinc-800 rounded-lg">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-zinc-200 text-zinc-800">
                      {CTA_OPTIONS.map((c) => (
                        <SelectItem key={c} value={c} className="text-xs">
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Channel-Specific Form 2: Paid Ads */}
            {activeTab === "ads" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1 md:col-span-2">
                  <Label className="text-xs font-medium text-zinc-700">Ad Campaign Name *</Label>
                  <Input
                    placeholder="e.g. Meta Ads — Direct Lead Gen & Conversion Wave"
                    value={adsForm.name}
                    onChange={(e) => setAdsForm({ ...adsForm, name: e.target.value })}
                    className="h-9 text-xs bg-white border-zinc-300 text-zinc-800 rounded-lg"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-medium text-zinc-700">Ad Platform</Label>
                  <Select
                    value={adsForm.platform}
                    onValueChange={(val) => setAdsForm({ ...adsForm, platform: val })}
                  >
                    <SelectTrigger className="h-9 text-xs bg-white border-zinc-300 text-zinc-800 rounded-lg">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-zinc-200 text-zinc-800">
                      <SelectItem value="META">Meta Ads (Facebook & Instagram)</SelectItem>
                      <SelectItem value="GOOGLE">Google Ads (Search & Display)</SelectItem>
                      <SelectItem value="TIKTOK">TikTok Ads</SelectItem>
                      <SelectItem value="LINKEDIN">LinkedIn Ads</SelectItem>
                      <SelectItem value="YOUTUBE">YouTube Video Ads</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-medium text-zinc-700">Optimization Goal</Label>
                  <Select
                    value={adsForm.objective}
                    onValueChange={(val) => setAdsForm({ ...adsForm, objective: val })}
                  >
                    <SelectTrigger className="h-9 text-xs bg-white border-zinc-300 text-zinc-800 rounded-lg">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-zinc-200 text-zinc-800">
                      <SelectItem value="LEAD_GENERATION">Lead Generation</SelectItem>
                      <SelectItem value="CONVERSIONS">Direct Conversions</SelectItem>
                      <SelectItem value="BRAND_AWARENESS">Brand Awareness</SelectItem>
                      <SelectItem value="TRAFFIC">Website Traffic</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-medium text-zinc-700">Campaign Offer / Hook</Label>
                  <Input
                    value={adsForm.offerHook}
                    onChange={(e) => setAdsForm({ ...adsForm, offerHook: e.target.value })}
                    className="h-9 text-xs bg-white border-zinc-300 text-zinc-800 rounded-lg"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-medium text-zinc-700">Primary CTA Button</Label>
                  <Select
                    value={adsForm.cta}
                    onValueChange={(val) => setAdsForm({ ...adsForm, cta: val })}
                  >
                    <SelectTrigger className="h-9 text-xs bg-white border-zinc-300 text-zinc-800 rounded-lg">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-zinc-200 text-zinc-800">
                      {CTA_OPTIONS.map((c) => (
                        <SelectItem key={c} value={c} className="text-xs">
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Channel-Specific Form 3: SMS Broadcast */}
            {activeTab === "sms" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1 md:col-span-2">
                  <Label className="text-xs font-medium text-zinc-700">SMS Campaign Name *</Label>
                  <Input
                    placeholder="e.g. Flash Weekend Discount SMS Broadcast"
                    value={smsForm.name}
                    onChange={(e) => setSmsForm({ ...smsForm, name: e.target.value })}
                    className="h-9 text-xs bg-white border-zinc-300 text-zinc-800 rounded-lg"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-medium text-zinc-700">SMS Gateway</Label>
                  <Input
                    value={smsForm.gateway}
                    onChange={(e) => setSmsForm({ ...smsForm, gateway: e.target.value })}
                    className="h-9 text-xs bg-white border-zinc-300 text-zinc-800 rounded-lg"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-medium text-zinc-700">Sender ID</Label>
                  <Input
                    value={smsForm.senderId}
                    onChange={(e) => setSmsForm({ ...smsForm, senderId: e.target.value })}
                    className="h-9 text-xs bg-white border-zinc-300 text-zinc-800 rounded-lg"
                  />
                </div>

                <div className="space-y-1 md:col-span-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-medium text-zinc-700">SMS Message Copy</Label>
                    <span className="text-[11px] text-zinc-400 font-mono">
                      {smsForm.messageText.length} chars (
                      {Math.ceil(smsForm.messageText.length / 160) || 1} SMS)
                    </span>
                  </div>
                  <Textarea
                    rows={2}
                    value={smsForm.messageText}
                    onChange={(e) => setSmsForm({ ...smsForm, messageText: e.target.value })}
                    className="text-xs bg-white border-zinc-300 text-zinc-800 rounded-lg"
                  />
                </div>
              </div>
            )}

            {/* Channel-Specific Form 4: WhatsApp Business */}
            {activeTab === "wa" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1 md:col-span-2">
                  <Label className="text-xs font-medium text-zinc-700">WhatsApp Campaign Name *</Label>
                  <Input
                    placeholder="e.g. VIP Consultation WhatsApp Outreach"
                    value={waForm.name}
                    onChange={(e) => setWaForm({ ...waForm, name: e.target.value })}
                    className="h-9 text-xs bg-white border-zinc-300 text-zinc-800 rounded-lg"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-medium text-zinc-700">Meta Template</Label>
                  <Input
                    value={waForm.templateName}
                    onChange={(e) => setWaForm({ ...waForm, templateName: e.target.value })}
                    className="h-9 text-xs bg-white border-zinc-300 text-zinc-800 rounded-lg"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-medium text-zinc-700">Quick Reply CTA</Label>
                  <Input
                    value={waForm.cta}
                    onChange={(e) => setWaForm({ ...waForm, cta: e.target.value })}
                    className="h-9 text-xs bg-white border-zinc-300 text-zinc-800 rounded-lg"
                  />
                </div>

                <div className="space-y-1 md:col-span-2">
                  <Label className="text-xs font-medium text-zinc-700">WhatsApp Message</Label>
                  <Textarea
                    rows={2}
                    value={waForm.messageText}
                    onChange={(e) => setWaForm({ ...waForm, messageText: e.target.value })}
                    className="text-xs bg-white border-zinc-300 text-zinc-800 rounded-lg"
                  />
                </div>
              </div>
            )}

            {/* Channel-Specific Form 5: Email Broadcast */}
            {activeTab === "email" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1 md:col-span-2">
                  <Label className="text-xs font-medium text-zinc-700">Email Campaign Name *</Label>
                  <Input
                    placeholder="e.g. Monthly Newsletter & Product Update"
                    value={emailForm.name}
                    onChange={(e) => setEmailForm({ ...emailForm, name: e.target.value })}
                    className="h-9 text-xs bg-white border-zinc-300 text-zinc-800 rounded-lg"
                  />
                </div>

                <div className="space-y-1 md:col-span-2">
                  <Label className="text-xs font-medium text-zinc-700">Subject Line *</Label>
                  <Input
                    placeholder="Subject line..."
                    value={emailForm.subject}
                    onChange={(e) => setEmailForm({ ...emailForm, subject: e.target.value })}
                    className="h-9 text-xs bg-white border-zinc-300 text-zinc-800 rounded-lg"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-zinc-700">Preheader / Snippet</Label>
                  <Input
                    value={emailForm.preheader}
                    onChange={(e) => setEmailForm({ ...emailForm, preheader: e.target.value })}
                    className="h-9 text-xs bg-white border-zinc-300 text-zinc-800 rounded-lg"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-zinc-700">CTA Text</Label>
                  <Input
                    value={emailForm.cta}
                    onChange={(e) => setEmailForm({ ...emailForm, cta: e.target.value })}
                    className="h-9 text-xs bg-white border-zinc-300 text-zinc-800 rounded-lg"
                  />
                </div>
              </div>
            )}

            {/* Channel-Specific Form 6: Physical & Billboard */}
            {activeTab === "physical" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1 md:col-span-2">
                  <Label className="text-xs font-medium text-zinc-700">Physical Campaign Name *</Label>
                  <Input
                    placeholder="e.g. Airport Road Mega LED Billboard Display"
                    value={physicalForm.name}
                    onChange={(e) => setPhysicalForm({ ...physicalForm, name: e.target.value })}
                    className="h-9 text-xs bg-white border-zinc-300 text-zinc-800 rounded-lg"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-medium text-zinc-700">Location Details</Label>
                  <Input
                    value={physicalForm.locationAddress}
                    onChange={(e) => setPhysicalForm({ ...physicalForm, locationAddress: e.target.value })}
                    className="h-9 text-xs bg-white border-zinc-300 text-zinc-800 rounded-lg"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-medium text-zinc-700">Dimensions / Material</Label>
                  <Input
                    value={physicalForm.dimensions}
                    onChange={(e) => setPhysicalForm({ ...physicalForm, dimensions: e.target.value })}
                    className="h-9 text-xs bg-white border-zinc-300 text-zinc-800 rounded-lg"
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ------------------------------------------------------------- */}
        {/* CARD 2 & 3: AUDIENCE & CONTENT PLANNING (Modular Unified) */}
        {/* ------------------------------------------------------------- */}
        <AudienceAndContentSelector
          targetAudience={
            activeTab === "funnel"
              ? funnelForm.targetAudience
              : activeTab === "ads"
              ? adsForm.targetAudience
              : activeTab === "sms"
              ? smsForm.targetAudience
              : activeTab === "wa"
              ? waForm.targetAudience
              : activeTab === "email"
              ? emailForm.targetAudience
              : physicalForm.targetAudience
          }
          onAudienceChange={(aud) => {
            if (activeTab === "funnel") setFunnelForm((p) => ({ ...p, targetAudience: aud }));
            else if (activeTab === "ads") setAdsForm((p) => ({ ...p, targetAudience: aud }));
            else if (activeTab === "sms") setSmsForm((p) => ({ ...p, targetAudience: aud }));
            else if (activeTab === "wa") setWaForm((p) => ({ ...p, targetAudience: aud }));
            else if (activeTab === "email") setEmailForm((p) => ({ ...p, targetAudience: aud }));
            else if (activeTab === "physical") setPhysicalForm((p) => ({ ...p, targetAudience: aud }));
          }}
          selectedFormats={
            activeTab === "funnel"
              ? funnelForm.selectedFormats
              : activeTab === "ads"
              ? adsForm.selectedFormats
              : activeTab === "sms"
              ? smsForm.selectedFormats
              : activeTab === "wa"
              ? waForm.selectedFormats
              : activeTab === "email"
              ? emailForm.selectedFormats
              : physicalForm.selectedFormats
          }
          onFormatsChange={(fmts) => {
            if (activeTab === "funnel") setFunnelForm((p) => ({ ...p, selectedFormats: fmts }));
            else if (activeTab === "ads") setAdsForm((p) => ({ ...p, selectedFormats: fmts }));
            else if (activeTab === "sms") setSmsForm((p) => ({ ...p, selectedFormats: fmts }));
            else if (activeTab === "wa") setWaForm((p) => ({ ...p, selectedFormats: fmts }));
            else if (activeTab === "email") setEmailForm((p) => ({ ...p, selectedFormats: fmts }));
            else if (activeTab === "physical") setPhysicalForm((p) => ({ ...p, selectedFormats: fmts }));
          }}
        />

        {/* ------------------------------------------------------------- */}
        {/* CARD 4: BUDGET & SCHEDULE LIMITS */}
        {/* ------------------------------------------------------------- */}
        <Card className="border-zinc-200 bg-white rounded-xl shadow-xs">
          <CardHeader className="border-b border-zinc-100 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-zinc-100 text-zinc-700 border border-zinc-200">
                <FiDollarSign className="h-4 w-4" />
              </div>
              <div>
                <CardTitle className="text-sm font-semibold text-zinc-900">
                  4. Budget & Schedule Limits
                </CardTitle>
                <CardDescription className="text-xs text-zinc-500 font-normal">
                  Set financial budget (BDT ৳), activation timeline, and initial campaign state.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Budget */}
              <div className="space-y-1">
                <Label className="text-xs font-medium text-zinc-700">Budget (BDT ৳) *</Label>
                <div className="relative">
                  <Input
                    type="number"
                    value={
                      activeTab === "funnel"
                        ? funnelForm.budget
                        : activeTab === "ads"
                        ? adsForm.budget
                        : activeTab === "sms"
                        ? smsForm.budget
                        : activeTab === "wa"
                        ? waForm.budget
                        : activeTab === "email"
                        ? emailForm.budget
                        : physicalForm.budget
                    }
                    onChange={(e) => {
                      const val = e.target.value;
                      if (activeTab === "funnel") setFunnelForm((p) => ({ ...p, budget: val }));
                      else if (activeTab === "ads") setAdsForm((p) => ({ ...p, budget: val }));
                      else if (activeTab === "sms") setSmsForm((p) => ({ ...p, budget: val }));
                      else if (activeTab === "wa") setWaForm((p) => ({ ...p, budget: val }));
                      else if (activeTab === "email") setEmailForm((p) => ({ ...p, budget: val }));
                      else if (activeTab === "physical") setPhysicalForm((p) => ({ ...p, budget: val }));
                    }}
                    className="h-9 text-xs pl-7 bg-white border-zinc-300 text-zinc-800 rounded-lg"
                  />
                  <span className="absolute left-2.5 top-2 text-zinc-400 text-xs">৳</span>
                </div>
              </div>

              {/* Start Date */}
              <div className="space-y-1">
                <Label className="text-xs font-medium text-zinc-700">Start Date *</Label>
                <Input
                  type="date"
                  value={
                    activeTab === "funnel"
                      ? funnelForm.startDate
                      : activeTab === "ads"
                      ? adsForm.startDate
                      : activeTab === "sms"
                      ? smsForm.startDate
                      : activeTab === "wa"
                      ? waForm.startDate
                      : activeTab === "email"
                      ? emailForm.startDate
                      : physicalForm.startDate
                  }
                  onChange={(e) => {
                    const val = e.target.value;
                    if (activeTab === "funnel") setFunnelForm((p) => ({ ...p, startDate: val }));
                    else if (activeTab === "ads") setAdsForm((p) => ({ ...p, startDate: val }));
                    else if (activeTab === "sms") setSmsForm((p) => ({ ...p, startDate: val }));
                    else if (activeTab === "wa") setWaForm((p) => ({ ...p, startDate: val }));
                    else if (activeTab === "email") setEmailForm((p) => ({ ...p, startDate: val }));
                    else if (activeTab === "physical") setPhysicalForm((p) => ({ ...p, startDate: val }));
                  }}
                  className="h-9 text-xs bg-white border-zinc-300 text-zinc-800 rounded-lg"
                />
              </div>

              {/* End Date */}
              <div className="space-y-1">
                <Label className="text-xs font-medium text-zinc-700">End Date</Label>
                <Input
                  type="date"
                  value={
                    activeTab === "funnel"
                      ? funnelForm.endDate
                      : activeTab === "ads"
                      ? adsForm.endDate
                      : activeTab === "sms"
                      ? smsForm.endDate
                      : activeTab === "wa"
                      ? waForm.endDate
                      : activeTab === "email"
                      ? emailForm.endDate
                      : physicalForm.endDate
                  }
                  onChange={(e) => {
                    const val = e.target.value;
                    if (activeTab === "funnel") setFunnelForm((p) => ({ ...p, endDate: val }));
                    else if (activeTab === "ads") setAdsForm((p) => ({ ...p, endDate: val }));
                    else if (activeTab === "sms") setSmsForm((p) => ({ ...p, endDate: val }));
                    else if (activeTab === "wa") setWaForm((p) => ({ ...p, endDate: val }));
                    else if (activeTab === "email") setEmailForm((p) => ({ ...p, endDate: val }));
                    else if (activeTab === "physical") setPhysicalForm((p) => ({ ...p, endDate: val }));
                  }}
                  className="h-9 text-xs bg-white border-zinc-300 text-zinc-800 rounded-lg"
                />
              </div>

              {/* Status */}
              <div className="space-y-1">
                <Label className="text-xs font-medium text-zinc-700">Initial Status</Label>
                <Select
                  value={
                    activeTab === "funnel"
                      ? funnelForm.status
                      : activeTab === "ads"
                      ? adsForm.status
                      : activeTab === "sms"
                      ? smsForm.status
                      : activeTab === "wa"
                      ? waForm.status
                      : activeTab === "email"
                      ? emailForm.status
                      : physicalForm.status
                  }
                  onValueChange={(val: any) => {
                    if (activeTab === "funnel") setFunnelForm((p) => ({ ...p, status: val }));
                    else if (activeTab === "ads") setAdsForm((p) => ({ ...p, status: val }));
                    else if (activeTab === "sms") setSmsForm((p) => ({ ...p, status: val }));
                    else if (activeTab === "wa") setWaForm((p) => ({ ...p, status: val }));
                    else if (activeTab === "email") setEmailForm((p) => ({ ...p, status: val }));
                    else if (activeTab === "physical") setPhysicalForm((p) => ({ ...p, status: val }));
                  }}
                >
                  <SelectTrigger className="h-9 text-xs bg-white border-zinc-300 text-zinc-800 rounded-lg">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-zinc-200 text-zinc-800">
                    <SelectItem value="SCHEDULED">Scheduled</SelectItem>
                    <SelectItem value="ACTIVE">Active / Live Immediately</SelectItem>
                    <SelectItem value="DRAFT">Draft Mode</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ------------------------------------------------------------- */}
        {/* BOTTOM ACTION BAR */}
        {/* ------------------------------------------------------------- */}
        <div className="p-4 rounded-xl border border-zinc-200 bg-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2 text-xs text-zinc-500 font-normal">
            <FiCheckCircle className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>
              All campaign records and format assets will be automatically linked upon launch.
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <Link href="/dashboard/marketing/campaigns">
              <Button
                variant="outline"
                className="bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 rounded-lg text-xs h-9 px-4 font-normal cursor-pointer shadow-xs"
              >
                Cancel
              </Button>
            </Link>
            <Button
              onClick={handleLaunchCampaign}
              disabled={isSubmitting}
              className="bg-zinc-900 hover:bg-zinc-800 text-white font-medium text-xs h-9 px-5 rounded-lg shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <FiRefreshCw className="h-3.5 w-3.5 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <FiZap className="h-3.5 w-3.5" />
                  <span>Launch Campaign</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
