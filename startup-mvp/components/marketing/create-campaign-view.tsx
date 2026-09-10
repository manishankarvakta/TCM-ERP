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
  FiPlus,
  FiExternalLink,
  FiImage,
  FiLink,
  FiGlobe,
  FiVideo,
  FiTag,
  FiGift,
  FiPlay,
} from "react-icons/fi";
import MediaSelector from "@/components/MediaSelector";
import {
  createChannelSpecificCampaignAction,
  quickCreateMarketingCampaignAction,
  getMarketingFunnelsAction,
  MarketingFunnelListItem,
} from "@/app/actions/crm/marketing-operations.action";
import { toast } from "sonner";
import { MarketingCampaignType } from "@prisma/client";

type ChannelTab = "funnel" | "ads" | "sms" | "wa" | "email" | "physical";

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
];

const CREATIVE_FORMAT_OPTIONS = [
  { value: "SINGLE_IMAGE_BANNER", label: "Single Image Banner / Graphic (1200x630)", badge: "🖼️ Image Banner" },
  { value: "CAROUSEL_GRAPHIC", label: "Multi-Slide Carousel (1:1 / 1080x1080)", badge: "📑 Carousel" },
  { value: "VIDEO_REEL", label: "Short-Form Video / Reel (9:16 vertical)", badge: "📱 Video Reel" },
  { value: "EXPLAINER_VIDEO", label: "Product Demo / Explainer Video (16:9)", badge: "🎬 Explainer Video" },
  { value: "INFOGRAPHIC_FLYER", label: "Infographic / Digital Flyer", badge: "📊 Infographic" },
  { value: "PDF_BROCHURE", label: "PDF Brochure / Case Study Whitepaper", badge: "📄 PDF Brochure" },
  { value: "SOCIAL_POST", label: "Organic Social Media Post / Article", badge: "💬 Social Post" },
];

const AUDIENCE_SUGGESTIONS = [
  "B2B C-Suite & Decision Makers",
  "SMEs & Business Owners",
  "Tech Startups & Founders",
  "Corporate Enterprise Leads",
  "Retail Consumers",
];

const OFFER_HOOK_SUGGESTIONS = [
  "Flat 25% Off + Free Setup",
  "Free 14-Day Enterprise Trial",
  "Zero Setup Fee This Month",
  "Free Product Audit Included",
];

interface CreateCampaignViewProps {
  initialFunnels?: MarketingFunnelListItem[];
}

export default function CreateCampaignView({ initialFunnels = [] }: CreateCampaignViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialChannel = (searchParams?.get("channel") as ChannelTab) || "funnel";
  const prefilledStage = searchParams?.get("stageId") || searchParams?.get("stageName") || "Awareness";
  const prefilledFunnelId = searchParams?.get("funnelId") || searchParams?.get("planId") || "none";

  const [activeTab, setActiveTab] = useState<ChannelTab>(
    ["funnel", "ads", "sms", "wa", "email", "physical"].includes(initialChannel) ? initialChannel : "funnel"
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Marketing Funnels list from /dashboard/marketing/marketing-funnel
  const [funnelsList, setFunnelsList] = useState<MarketingFunnelListItem[]>(initialFunnels);
  const [selectedFunnelPlanId, setSelectedFunnelPlanId] = useState<string>(prefilledFunnelId);

  React.useEffect(() => {
    if (initialFunnels.length === 0) {
      getMarketingFunnelsAction().then((res) => {
        if (res.success && res.funnels) {
          setFunnelsList(res.funnels);
        }
      });
    }
  }, [initialFunnels]);

  const selectedFunnel = funnelsList.find(
    (f) => f.planId === selectedFunnelPlanId || f.id === selectedFunnelPlanId
  );

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
    mediaUrl: "",
    headline: "",
    bodyCopy: "",
    creativeFormat: "SINGLE_IMAGE_BANNER",
    offerHook: "",
    targetAudience: "",
    utmTag: "",
    videoUrl: "",
    ctaLabel: "Book a VIP Demo",
    destinationUrl: "",
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
    mediaUrl: "",
    headline: "",
    ctaLabel: "Book a VIP Demo",
    destinationUrl: "",
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
    destinationUrl: "",
    recipients: "",
    budget: "",
    status: "LAUNCHED",
    startDate: "",
  });
  const smsFullText = smsForm.destinationUrl ? `${smsForm.message}\n${smsForm.destinationUrl}` : smsForm.message;
  const smsCharCount = smsFullText.length;
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
    mediaUrl: "",
    ctaLabel: "Book VIP Demo",
    destinationUrl: "",
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
    mediaUrl: "",
    ctaLabel: "View Live Demo",
    destinationUrl: "",
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
    mediaUrl: "",
    bannerDimensions: "20ft x 10ft",
    qrCodeUrl: "",
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
        stage: funnelForm.primaryStage || selectedStages[0] || "Lead Generation",
        budget: Number(funnelForm.budget) || 0,
        objective: funnelForm.objective || (selectedFunnel ? `Campaign for Funnel: ${selectedFunnel.name}` : undefined),
        startDate: funnelForm.startDate,
        endDate: funnelForm.endDate,
        status: "ACTIVE",
        marketingPlanId: selectedFunnel && selectedFunnel.planId !== "none" ? selectedFunnel.planId : undefined,
        mediaUrl: funnelForm.mediaUrl,
        headline: funnelForm.headline,
        bodyCopy: funnelForm.bodyCopy,
        creativeFormat: funnelForm.creativeFormat,
        offerHook: funnelForm.offerHook,
        targetAudience: funnelForm.targetAudience,
        utmTag: funnelForm.utmTag,
        videoUrl: funnelForm.videoUrl,
        ctaLabel: funnelForm.ctaLabel,
        destinationUrl: funnelForm.destinationUrl,
        stages: selectedStages.map((stgName, idx) => ({
          name: stgName,
          position: idx + 1,
          plannedBudget:
            Number(funnelForm.budget) > 0 && selectedStages.length > 0
              ? Number(funnelForm.budget) / selectedStages.length
              : 0,
        })),
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
        mediaUrl: adsForm.mediaUrl,
        headline: adsForm.headline,
        ctaLabel: adsForm.ctaLabel,
        destinationUrl: adsForm.destinationUrl,
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
      const fullMsg = smsForm.destinationUrl ? `${smsForm.message}\n${smsForm.destinationUrl}` : smsForm.message;
      const res = await createChannelSpecificCampaignAction({
        category: "SMS",
        name: smsForm.name,
        channel: `SMS (${smsForm.senderGateway})`,
        message: fullMsg,
        budget: Number(smsForm.budget) || 0,
        status: smsForm.status,
        startDate: smsForm.startDate,
        destinationUrl: smsForm.destinationUrl,
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
        mediaUrl: waForm.mediaUrl,
        ctaLabel: waForm.ctaLabel,
        destinationUrl: waForm.destinationUrl,
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
        mediaUrl: emailForm.mediaUrl,
        ctaLabel: emailForm.ctaLabel,
        destinationUrl: emailForm.destinationUrl,
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
        mediaUrl: physicalForm.mediaUrl,
        bannerDimensions: physicalForm.bannerDimensions,
        qrCodeUrl: physicalForm.qrCodeUrl,
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
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <FiZap className="h-4 w-4 text-amber-500" />
                    2. Link Target Marketing Funnel
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Connect this campaign directly to a strategic Marketing Funnel from your Funnel Ledger.
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                  className="h-7 text-xs font-semibold text-purple-600 dark:text-purple-400 border-purple-500/30 hover:bg-purple-500/10 gap-1"
                >
                  <Link href="/dashboard/marketing/marketing-funnel/create" target="_blank">
                    <FiPlus className="h-3 w-3" />
                    + Create New Funnel
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-4 space-y-4 text-xs">
              {/* Funnel Selection Dropdown */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold">
                    Select Target Marketing Funnel *
                  </Label>
                  <Link
                    href="/dashboard/marketing/marketing-funnel"
                    target="_blank"
                    className="text-[11px] text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1 font-medium"
                  >
                    View Funnel Ledger <FiExternalLink className="h-2.5 w-2.5" />
                  </Link>
                </div>
                <Select
                  value={selectedFunnelPlanId}
                  onValueChange={(val) => {
                    setSelectedFunnelPlanId(val);
                    const found = funnelsList.find((f) => f.planId === val || f.id === val);
                    if (found && found.stages && found.stages.length > 0) {
                      setSelectedStages(found.stages.map((s) => s.name));
                      if (found.stages[0]?.name) {
                        setFunnelForm((prev) => ({ ...prev, primaryStage: found.stages![0].name }));
                      }
                    } else if (val === "none") {
                      setSelectedStages([
                        "Awareness",
                        "Acknowledgment",
                        "Engagement",
                        "Lead Generation",
                        "Lead Nurturing",
                        "Sales Conversion",
                        "Retention / Remarketing",
                      ]);
                    }
                  }}
                >
                  <SelectTrigger className="h-9.5 text-xs bg-background">
                    <SelectValue placeholder="Choose a Marketing Funnel to link..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">
                      <div className="flex items-center gap-2 py-0.5">
                        <span className="font-semibold text-muted-foreground">⚙️ Standalone / Custom Funnel (No Parent Link)</span>
                      </div>
                    </SelectItem>
                    {funnelsList.map((f) => (
                      <SelectItem key={f.planId || f.id} value={f.planId || f.id}>
                        <div className="flex items-center gap-2 py-0.5">
                          <span className="font-bold text-foreground">{f.name}</span>
                          <span className="text-[10px] text-muted-foreground">
                            ({f.targetValue || "৳0 Target"} • {f.status} • {f.stages?.length || 0} Stages)
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* If a Funnel is selected, show info card */}
              {selectedFunnel && (
                <div className="p-3.5 rounded-xl border border-purple-500/30 bg-purple-500/5 space-y-2 text-xs">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className="text-[10px] bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30 font-semibold"
                      >
                        Linked Funnel: {selectedFunnel.name}
                      </Badge>
                      <span className="text-muted-foreground text-[11px]">
                        Status: <strong className="text-foreground">{selectedFunnel.status}</strong>
                      </span>
                    </div>
                    <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                      Target Revenue: {selectedFunnel.targetValue}
                    </span>
                  </div>
                  {selectedFunnel.objective && (
                    <p className="text-[11px] text-muted-foreground">
                      <strong>Objective:</strong> {selectedFunnel.objective}
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/60 shadow-xs">
            <CardHeader className="pb-4 border-b border-border/40">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <FiImage className="h-4 w-4 text-purple-500" />
                    3. Creative & Content Studio (Visuals, Copy & Live Ad Simulator)
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Configure high-converting creative formats, ad copy, value propositions, and live real-time simulation
                  </CardDescription>
                </div>
                <Badge variant="outline" className="text-[10px] font-semibold bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30 w-fit">
                  Live Ad Simulator Active
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-5 space-y-6 text-xs">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* LEFT COLUMN: CREATIVE CONFIGURATION (7 Cols) */}
                <div className="lg:col-span-7 space-y-4">
                  {/* Row 1: Format & Headline */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold flex items-center gap-1.5">
                        <FiLayers className="h-3.5 w-3.5 text-purple-500" /> Creative Asset Format
                      </Label>
                      <Select
                        value={funnelForm.creativeFormat}
                        onValueChange={(val) => setFunnelForm({ ...funnelForm, creativeFormat: val })}
                      >
                        <SelectTrigger className="h-9 text-xs bg-background">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CREATIVE_FORMAT_OPTIONS.map((fmt) => (
                            <SelectItem key={fmt.value} value={fmt.value}>
                              <span className="flex items-center gap-2 text-xs">
                                <span>{fmt.badge}</span>
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Catchy Headline / Punchline *</Label>
                      <Input
                        placeholder="e.g. Next-Gen ERP for High-Growth Enterprises"
                        value={funnelForm.headline}
                        onChange={(e) => setFunnelForm({ ...funnelForm, headline: e.target.value })}
                        className="h-9 text-xs"
                      />
                    </div>
                  </div>

                  {/* Row 2: Value Proposition & Offer Hook */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold flex items-center gap-1.5">
                      <FiGift className="h-3.5 w-3.5 text-amber-500" /> Key Value Proposition / Special Offer Hook
                    </Label>
                    <Input
                      placeholder="e.g. Flat 25% Off + Free Implementation & Migration"
                      value={funnelForm.offerHook}
                      onChange={(e) => setFunnelForm({ ...funnelForm, offerHook: e.target.value })}
                      className="h-9 text-xs"
                    />
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      <span className="text-[10px] text-muted-foreground self-center">Suggestions:</span>
                      {OFFER_HOOK_SUGGESTIONS.map((sug) => (
                        <button
                          key={sug}
                          type="button"
                          onClick={() => setFunnelForm({ ...funnelForm, offerHook: sug })}
                          className="text-[10px] px-2 py-0.5 rounded-full border border-border/60 bg-muted/30 hover:bg-amber-500/10 hover:border-amber-500/40 hover:text-amber-600 transition-colors cursor-pointer"
                        >
                          + {sug}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Row 3: Target Audience Persona */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold flex items-center gap-1.5">
                      <FiUsers className="h-3.5 w-3.5 text-blue-500" /> Target Audience Persona / Market Segment
                    </Label>
                    <Input
                      placeholder="e.g. B2B C-Suite Decision Makers & Founders"
                      value={funnelForm.targetAudience}
                      onChange={(e) => setFunnelForm({ ...funnelForm, targetAudience: e.target.value })}
                      className="h-9 text-xs"
                    />
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      <span className="text-[10px] text-muted-foreground self-center">Quick Select:</span>
                      {AUDIENCE_SUGGESTIONS.map((aud) => (
                        <button
                          key={aud}
                          type="button"
                          onClick={() => setFunnelForm({ ...funnelForm, targetAudience: aud })}
                          className="text-[10px] px-2 py-0.5 rounded-full border border-border/60 bg-muted/30 hover:bg-blue-500/10 hover:border-blue-500/40 hover:text-blue-600 transition-colors cursor-pointer"
                        >
                          + {aud}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Row 4: Primary Ad Body Copy */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold flex items-center gap-1.5">
                        <FiFileText className="h-3.5 w-3.5 text-purple-500" /> Primary Ad Body Copy / Marketing Pitch
                      </Label>
                      <span className="text-[10px] font-mono text-muted-foreground">
                        {funnelForm.bodyCopy.length} characters
                      </span>
                    </div>
                    <Textarea
                      rows={3}
                      placeholder="e.g. Streamline enterprise operations with intelligent CRM, automated sales funnels, and real-time P&L analytics. Trusted by leading enterprises across South Asia."
                      value={funnelForm.bodyCopy}
                      onChange={(e) => setFunnelForm({ ...funnelForm, bodyCopy: e.target.value })}
                      className="text-xs resize-none"
                    />
                  </div>

                  {/* Row 5: CTA & Destination URL */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold flex items-center gap-1.5">
                        <FiTarget className="h-3.5 w-3.5 text-emerald-500" /> Call to Action (CTA) Button
                      </Label>
                      <Select
                        value={funnelForm.ctaLabel}
                        onValueChange={(val) => setFunnelForm({ ...funnelForm, ctaLabel: val })}
                      >
                        <SelectTrigger className="h-9 text-xs bg-background">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CTA_OPTIONS.map((cta) => (
                            <SelectItem key={cta} value={cta}>
                              {cta}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold flex items-center gap-1.5">
                        <FiGlobe className="h-3.5 w-3.5 text-teal-500" /> Destination / Landing URL
                      </Label>
                      <Input
                        placeholder="https://techcorp.com/solutions"
                        value={funnelForm.destinationUrl}
                        onChange={(e) => setFunnelForm({ ...funnelForm, destinationUrl: e.target.value })}
                        className="h-9 text-xs font-mono"
                      />
                    </div>
                  </div>

                  {/* Row 6: Primary Banner Graphic */}
                  <div className="space-y-1.5">
                    <MediaSelector
                      label="Primary Campaign Banner / Visual Graphic (Recommended: 1200x630px PNG/JPG)"
                      value={funnelForm.mediaUrl}
                      onChange={(url) => setFunnelForm({ ...funnelForm, mediaUrl: url })}
                    />
                  </div>

                  {/* Row 7: Secondary Video Asset URL */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold flex items-center gap-1.5">
                      <FiVideo className="h-3.5 w-3.5 text-rose-500" /> Secondary Asset / Video Demo URL (Optional)
                    </Label>
                    <Input
                      placeholder="https://youtube.com/watch?v=demo or Vimeo / Loom video link"
                      value={funnelForm.videoUrl}
                      onChange={(e) => setFunnelForm({ ...funnelForm, videoUrl: e.target.value })}
                      className="h-9 text-xs font-mono"
                    />
                  </div>
                </div>

                {/* RIGHT COLUMN: LIVE REAL-TIME AD SIMULATOR (5 Cols) */}
                <div className="lg:col-span-5 space-y-3 lg:sticky lg:top-4">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <FiEye className="h-3.5 w-3.5 text-purple-500" /> Live Creative Simulator
                    </span>
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded-full">
                      ● Real-Time Rendering
                    </span>
                  </div>

                  {/* AD CARD PREVIEW MOCKUP */}
                  <div className="rounded-2xl border border-border/80 bg-card shadow-md overflow-hidden transition-all">
                    {/* Simulator Header */}
                    <div className="p-3 border-b border-border/40 bg-muted/30 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-lg bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white font-bold text-xs shadow-xs">
                          TS
                        </div>
                        <div>
                          <div className="font-bold text-xs text-foreground leading-tight">TechSoul Enterprise</div>
                          <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <span>Sponsored</span> • <span>🌐 Global</span>
                          </div>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-[9px] font-semibold uppercase bg-background text-purple-600 dark:text-purple-400 border-purple-500/30">
                        {CREATIVE_FORMAT_OPTIONS.find((f) => f.value === funnelForm.creativeFormat)?.badge || "Image Banner"}
                      </Badge>
                    </div>

                    {/* Headline & Body Copy inside Preview */}
                    <div className="p-3.5 space-y-2 text-xs">
                      {funnelForm.offerHook && (
                        <div className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                          <FiGift className="h-3 w-3" /> {funnelForm.offerHook}
                        </div>
                      )}

                      <div className="font-bold text-sm text-foreground leading-snug">
                        {funnelForm.headline || "Your High-Converting Campaign Headline Appears Here"}
                      </div>

                      <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-4 whitespace-pre-wrap">
                        {funnelForm.bodyCopy ||
                          "Your promotional copy, key service features, value propositions, and customer benefits will be previewed right here in real time."}
                      </p>

                      {funnelForm.targetAudience && (
                        <div className="flex items-center gap-1 text-[10px] text-blue-600 dark:text-blue-400 font-medium">
                          <FiTag className="h-2.5 w-2.5" /> For: {funnelForm.targetAudience}
                        </div>
                      )}
                    </div>

                    {/* Banner Graphic Preview */}
                    <div className="relative aspect-[16/9] w-full bg-muted/40 border-y border-border/40 overflow-hidden flex items-center justify-center group">
                      {funnelForm.mediaUrl ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={funnelForm.mediaUrl}
                          alt="Campaign Creative Proof"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center text-center p-4 text-muted-foreground space-y-1.5">
                          <FiImage className="h-8 w-8 opacity-30 text-purple-500" />
                          <span className="text-[11px] font-semibold text-foreground/70">Creative Visual Preview</span>
                          <span className="text-[9px] text-muted-foreground">Select an image banner on the left</span>
                        </div>
                      )}

                      {funnelForm.videoUrl && (
                        <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px] flex items-center justify-center">
                          <div className="h-10 w-10 rounded-full bg-white/90 text-purple-600 flex items-center justify-center shadow-lg">
                            <FiPlay className="h-5 w-5 ml-0.5" />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Simulator Action Footer */}
                    <div className="p-3 bg-muted/20 flex items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="text-[9px] uppercase font-bold text-muted-foreground truncate">
                          {funnelForm.destinationUrl
                            ? funnelForm.destinationUrl.replace(/^https?:\/\//, "").split("/")[0]
                            : "techsoul.com/campaign"}
                        </div>
                        <div className="text-[11px] font-semibold text-foreground truncate">
                          {funnelForm.headline ? funnelForm.headline.slice(0, 32) + "..." : "Learn More & Register"}
                        </div>
                      </div>

                      <Button
                        type="button"
                        size="sm"
                        className="h-8 px-3.5 text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs shrink-0"
                      >
                        {funnelForm.ctaLabel || "Book a VIP Demo"}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/60 shadow-xs">
            <CardHeader className="pb-4 border-b border-border/40">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <FiDollarSign className="h-4 w-4 text-emerald-500" />
                4. Budget & Schedule Limits
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
                    <FiImage className="h-4 w-4 text-amber-500" />
                    Ad Creative Assets & Call to Action
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Ad Headline / Catchy Punchline</Label>
                      <Input
                        placeholder="e.g. Transform Enterprise Workflow with Next-Gen CRM"
                        value={adsForm.headline}
                        onChange={(e) => setAdsForm({ ...adsForm, headline: e.target.value })}
                        className="h-9 text-xs"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Call to Action (CTA) Button</Label>
                      <Select
                        value={adsForm.ctaLabel}
                        onValueChange={(val) => setAdsForm({ ...adsForm, ctaLabel: val })}
                      >
                        <SelectTrigger className="h-9 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CTA_OPTIONS.map((cta) => (
                            <SelectItem key={cta} value={cta}>
                              {cta}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Landing Page / Destination URL</Label>
                    <Input
                      placeholder="https://techcorp.com/landing/enterprise-erp"
                      value={adsForm.destinationUrl}
                      onChange={(e) => setAdsForm({ ...adsForm, destinationUrl: e.target.value })}
                      className="h-9 text-xs font-mono"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <MediaSelector
                      label="Ad Visual Banner / Image Asset (Square 1:1 or 16:9 Landscape)"
                      value={adsForm.mediaUrl}
                      onChange={(url) => setAdsForm({ ...adsForm, mediaUrl: url })}
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
                    Live Ad Mockup & Forecast
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4 space-y-4 text-xs">
                  {/* Visual Ad Preview Card */}
                  <div className="rounded-xl border border-border/60 bg-card overflow-hidden shadow-xs">
                    <div className="p-3 border-b border-border/40 flex items-center gap-2">
                      <div className="h-6 w-6 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 font-bold flex items-center justify-center text-[10px]">
                        AD
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-xs text-foreground truncate">TechCorp Software</div>
                        <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                          Sponsored • <span>{adsForm.platform.split(" ")[0]}</span>
                        </div>
                      </div>
                    </div>

                    <div className="p-3 space-y-2">
                      <p className="text-[11px] text-foreground font-medium line-clamp-2">
                        {adsForm.headline || adsForm.objective || "Empower your business operations with our industry-leading suite. Book a free demo today."}
                      </p>
                    </div>

                    {adsForm.mediaUrl ? (
                      <div className="relative aspect-video w-full bg-muted overflow-hidden border-y border-border/40">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={adsForm.mediaUrl}
                          alt="Ad Banner Preview"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="aspect-video w-full bg-muted/40 border-y border-dashed border-border/60 flex flex-col items-center justify-center text-muted-foreground gap-1 p-3 text-center">
                        <FiImage className="h-6 w-6 opacity-40" />
                        <span className="text-[10px]">No Banner Uploaded Yet</span>
                      </div>
                    )}

                    <div className="p-3 bg-muted/30 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-[10px] text-muted-foreground truncate uppercase tracking-wider font-mono">
                          {adsForm.destinationUrl ? new URL(adsForm.destinationUrl.startsWith("http") ? adsForm.destinationUrl : `https://${adsForm.destinationUrl}`).hostname : "techcorp.com"}
                        </div>
                        <div className="text-xs font-bold text-foreground truncate">
                          {adsForm.name || "Enterprise Promotion"}
                        </div>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        className="h-7 text-xs px-3 bg-amber-600 hover:bg-amber-700 text-white shrink-0 font-semibold"
                      >
                        {adsForm.ctaLabel || "Learn More"}
                      </Button>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl border border-border/40 bg-background/50 space-y-2.5">
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

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Action / Short Destination URL (Optional)</Label>
                    <Input
                      placeholder="https://techcorp.com/promo/vip-demo"
                      value={smsForm.destinationUrl}
                      onChange={(e) => setSmsForm({ ...smsForm, destinationUrl: e.target.value })}
                      className="h-9 text-xs font-mono"
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
                    <div className="bg-rose-500/10 border border-rose-500/20 text-foreground p-3 rounded-2xl rounded-tl-xs text-[11px] leading-relaxed shadow-xs space-y-1.5">
                      <p>{smsForm.message || "Your SMS text message will appear here..."}</p>
                      {smsForm.destinationUrl && (
                        <div className="text-[10px] text-rose-600 dark:text-rose-400 underline font-mono break-all">
                          {smsForm.destinationUrl}
                        </div>
                      )}
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

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Quick Action CTA Button Label</Label>
                      <Select
                        value={waForm.ctaLabel}
                        onValueChange={(val) => setWaForm({ ...waForm, ctaLabel: val })}
                      >
                        <SelectTrigger className="h-9 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CTA_OPTIONS.map((cta) => (
                            <SelectItem key={cta} value={cta}>
                              {cta}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Destination Website Link</Label>
                      <Input
                        placeholder="https://techcorp.com/demo"
                        value={waForm.destinationUrl}
                        onChange={(e) => setWaForm({ ...waForm, destinationUrl: e.target.value })}
                        className="h-9 text-xs font-mono"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5 pt-1">
                    <MediaSelector
                      label="WhatsApp Header Graphic Banner (Optional Attachment)"
                      value={waForm.mediaUrl}
                      onChange={(url) => setWaForm({ ...waForm, mediaUrl: url })}
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

                    <div className="bg-[#005c4b] text-[#e9edef] rounded-2xl rounded-tl-xs overflow-hidden text-[11px] leading-relaxed shadow-xs">
                      {waForm.mediaUrl && (
                        <div className="w-full aspect-video bg-black/40 overflow-hidden">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={waForm.mediaUrl}
                            alt="WhatsApp Header Graphic"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      <div className="p-3 space-y-1.5">
                        <p>{waPreviewText}</p>
                        <div className="text-[9px] text-[#8696a0] text-right">10:30 AM • ✓✓</div>
                      </div>
                      {waForm.ctaLabel && (
                        <div className="border-t border-white/15 bg-black/20 p-2 text-center text-xs font-semibold text-emerald-300 hover:bg-black/30 flex items-center justify-center gap-1.5">
                          <FiExternalLink className="h-3 w-3" />
                          {waForm.ctaLabel}
                        </div>
                      )}
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
                    Email Creative Banner, Copy & Call to Action
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-xs">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Message Body</Label>
                    <Textarea
                      rows={6}
                      placeholder="Hello,&#10;&#10;We are excited to share our latest product updates and architectural enhancements for your enterprise workflow. Our modular ERP solutions help reduce operational latency while empowering your finance and management teams with real-time analytics.&#10;&#10;Best regards,&#10;The TechCorp Team"
                      value={emailForm.body}
                      onChange={(e) => setEmailForm({ ...emailForm, body: e.target.value })}
                      className="text-xs resize-none leading-relaxed font-sans"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Call to Action Button Label</Label>
                      <Select
                        value={emailForm.ctaLabel}
                        onValueChange={(val) => setEmailForm({ ...emailForm, ctaLabel: val })}
                      >
                        <SelectTrigger className="h-9 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CTA_OPTIONS.map((cta) => (
                            <SelectItem key={cta} value={cta}>
                              {cta}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Destination / Landing URL</Label>
                      <Input
                        placeholder="https://techcorp.com/solutions"
                        value={emailForm.destinationUrl}
                        onChange={(e) => setEmailForm({ ...emailForm, destinationUrl: e.target.value })}
                        className="h-9 text-xs font-mono"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5 pt-1">
                    <MediaSelector
                      label="Email Header Banner Graphic (600x250px Recommended)"
                      value={emailForm.mediaUrl}
                      onChange={(url) => setEmailForm({ ...emailForm, mediaUrl: url })}
                    />
                  </div>
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
                      {emailForm.preheader && (
                        <div className="text-[10px] text-muted-foreground truncate">{emailForm.preheader}</div>
                      )}
                    </div>

                    {emailForm.mediaUrl && (
                      <div className="w-full aspect-[21/9] bg-muted overflow-hidden border-b border-border/30">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={emailForm.mediaUrl}
                          alt="Email Banner Header"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}

                    <div className="p-3 bg-background/80 text-foreground text-[11px] leading-relaxed whitespace-pre-wrap max-h-[160px] overflow-y-auto space-y-3">
                      <p>{emailForm.body || "Your email newsletter message preview will appear here..."}</p>
                      {emailForm.ctaLabel && (
                        <div className="pt-2 text-center">
                          <span className="inline-block px-4 py-2 bg-teal-600 text-white rounded-lg text-xs font-semibold shadow-xs">
                            {emailForm.ctaLabel}
                          </span>
                        </div>
                      )}
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
                    <FiImage className="h-4 w-4 text-amber-500" />
                    Signage Artwork, Dimensions & QR Link
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Artwork Dimensions</Label>
                      <Input
                        placeholder="e.g. 20ft x 10ft / A4 Flyer"
                        value={physicalForm.bannerDimensions}
                        onChange={(e) => setPhysicalForm({ ...physicalForm, bannerDimensions: e.target.value })}
                        className="h-9 text-xs"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">QR Code Action URL</Label>
                      <Input
                        placeholder="https://techcorp.com/expo-registration"
                        value={physicalForm.qrCodeUrl}
                        onChange={(e) => setPhysicalForm({ ...physicalForm, qrCodeUrl: e.target.value })}
                        className="h-9 text-xs font-mono"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <MediaSelector
                      label="Physical Artwork Visual Proof / Mockup Blueprint"
                      value={physicalForm.mediaUrl}
                      onChange={(url) => setPhysicalForm({ ...physicalForm, mediaUrl: url })}
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
                  {physicalForm.mediaUrl && (
                    <div className="rounded-xl border border-border/60 bg-card overflow-hidden shadow-xs space-y-1">
                      <div className="p-2.5 bg-muted/40 border-b border-border/40 flex items-center justify-between">
                        <span className="font-semibold text-foreground text-[11px]">Artwork Proof</span>
                        <span className="text-[10px] text-muted-foreground font-mono">{physicalForm.bannerDimensions}</span>
                      </div>
                      <div className="relative aspect-video w-full bg-muted overflow-hidden">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={physicalForm.mediaUrl}
                          alt="Artwork Preview"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </div>
                  )}

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
