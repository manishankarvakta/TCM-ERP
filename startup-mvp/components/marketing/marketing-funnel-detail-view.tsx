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
  FiFilter,
  FiPlus,
  FiPieChart,
  FiActivity,
  FiCheckSquare,
  FiFileText,
  FiShare2,
  FiMail,
  FiUsers,
  FiGlobe,
  FiAward,
  FiShield,
} from "react-icons/fi";

interface MarketingFunnelDetailViewProps {
  funnelId: string;
}

export default function MarketingFunnelDetailView({ funnelId }: MarketingFunnelDetailViewProps) {
  const router = useRouter();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  // Executive Strategic Funnel State
  const [funnel, setFunnel] = useState({
    id: funnelId,
    name: "Enterprise Garments ERP Strategic Marketing Funnel 2026",
    productName: "Enterprise Garments ERP & HR Management Suite",
    productDescription: "All-in-one manufacturing, merchandising, inventory, Bengali payroll & export LC tracking platform for Bangladesh RMG factories.",
    keyFeatures: "Real-time floor tracking, automated OT calculation, biometric attendance, RFID bundle tracking, 1-click export invoice generation.",
    problemSolved: "Fabric wastage, delayed export shipments, payroll discrepancies & compliance audit failures.",
    usp: "The only ERP engineered specifically for Bangladesh Garment Factories with guaranteed 7-day deployment.",
    offer: "Free 1-on-1 Factory Digitalization Audit & 30-Day Risk-Free Trial.",
    pricing: "Standard Tier: ৳45,000/mo | Enterprise Custom: ৳1,20,000/mo",
    mainCTA: "Book Free Factory Digital Audit",
    
    // Objectives & Targets
    primaryObjective: "Acquire 100 new enterprise garment factory clients by Q4 2026 across Dhaka & Chittagong RMG hubs.",
    leadTarget: 1500,
    qualifiedLeadTarget: 500,
    customerTarget: 100,
    revenueTarget: "৳1,20,00,000",
    kpiTargets: "CPL < ৳500 | CAC < ৳5,000 | ROAS > 8.0x | SQL Ratio > 33.3%",

    // Financial Envelope
    approvedBudget: "৳5,00,000",
    allocatedBudget: "৳4,60,000",
    actualSpend: "৳2,85,00,0",
    remainingBudget: "৳2,15,000",
    actualLeads: 1280,
    sqls: 420,
    actualCustomers: 78,
    actualRevenue: "৳48,00,000",
    roas: "12.5x",
    roi: "340%",

    // Dates & Team
    startDate: "2026-09-01",
    endDate: "2026-12-31",
    funnelOwner: "Farhana Yeasmin (Head of Marketing)",
    marketingManager: "Kamrul Hasan (Senior Growth Lead)",
    status: "ACTIVE",
  });

  // 7 Sequential Funnel Stages
  const [funnelStages, setFunnelStages] = useState([
    {
      id: "stg-1",
      position: 1,
      name: "Awareness",
      objective: "Brand reach, product problem/solution education & impressions across RMG leaders",
      leadVolume: "250,000 Impressions",
      conversionRate: "100%",
      budget: "৳1,00,000",
      spend: "৳98,000",
      channels: ["Facebook", "LinkedIn", "Google Display", "YouTube"],
      assignedCampaigns: [
        { id: "CMP-02", name: "Enterprise ERP Brand Positioning", channel: "LinkedIn & Organic" },
      ],
    },
    {
      id: "stg-2",
      position: 2,
      name: "Acknowledgment",
      objective: "Message recognition, explainer posts, factory problem communication & case studies",
      leadVolume: "55,000 Views",
      conversionRate: "22.0%",
      budget: "৳50,000",
      spend: "৳48,500",
      channels: ["Website", "Email", "SMS", "Social Media"],
      assignedCampaigns: [
        { id: "CMP-03", name: "RMG Case Study & Video Series", channel: "Email Broadcast & SMS" },
      ],
    },
    {
      id: "stg-3",
      position: 3,
      name: "Engagement",
      objective: "Active interactions, comments, shares, webinar signups & assessment tool usage",
      leadVolume: "14,500 Engaged",
      conversionRate: "26.3%",
      budget: "৳70,000",
      spend: "৳43,500",
      channels: ["Webinar", "Landing Page", "WhatsApp"],
      assignedCampaigns: [
        { id: "CMP-04", name: "Garments Digital Audit Webinar Drive", channel: "Webinar & Social" },
      ],
    },
    {
      id: "stg-4",
      position: 4,
      name: "Lead Generation",
      objective: "Demo requests, inquiries, consultation forms & high-intent lead form captures",
      leadVolume: "1,280 Leads",
      conversionRate: "8.8%",
      budget: "৳1,40,000",
      spend: "৳95,000",
      channels: ["Meta Lead Ads", "Google Search", "Landing Page"],
      assignedCampaigns: [
        { id: "CMP-01", name: "Q3 Garments ERP Lead Generation", channel: "Meta & Google Ads" },
      ],
    },
    {
      id: "stg-5",
      position: 5,
      name: "Lead Nurturing",
      objective: "Email sequences, case study follow-ups, salesperson handoff & ROI calculations",
      leadVolume: "420 SQLs",
      conversionRate: "32.8%",
      budget: "৳40,000",
      spend: "৳0",
      channels: ["Email", "WhatsApp", "Sales Team"],
      assignedCampaigns: [
        { id: "CMP-06", name: "RMG Executive Nurture Sequence", channel: "Email & WhatsApp" },
      ],
    },
    {
      id: "stg-6",
      position: 6,
      name: "Sales Conversion",
      objective: "Proposal follow-ups, trial closes, contract reviews & won deal signatures",
      leadVolume: "78 Customers",
      conversionRate: "18.5%",
      budget: "৳70,000",
      spend: "৳0",
      channels: ["Sales Team", "Direct Consultation"],
      assignedCampaigns: [
        { id: "CMP-07", name: "Closing Deal Consultation Drive", channel: "Direct Outreach" },
      ],
    },
    {
      id: "stg-7",
      position: 7,
      name: "Retention / Remarketing",
      objective: "Customer onboarding, renewal drives, factory expansion upsells & referral campaigns",
      leadVolume: "78 Renewals",
      conversionRate: "100%",
      budget: "৳30,000",
      spend: "৳0",
      channels: ["Remarketing Ads", "Email", "Direct Account Manager"],
      assignedCampaigns: [
        { id: "CMP-05", name: "Q2 Client Retention & Upsell Drive", channel: "Google Display Network" },
      ],
    },
  ]);

  const [assignForm, setAssignForm] = useState({
    stageId: "stg-4",
    campaignName: "Q4 Garments ERP Search Ad Campaign",
    channel: "Google Ads",
  });

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const handleAssignSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignForm.campaignName) return;

    setFunnelStages(funnelStages.map(stg => {
      if (stg.id === assignForm.stageId) {
        return {
          ...stg,
          assignedCampaigns: [
            ...stg.assignedCampaigns,
            { id: `CMP-0${Math.floor(Math.random() * 90) + 10}`, name: assignForm.campaignName, channel: assignForm.channel }
          ]
        };
      }
      return stg;
    }));

    setShowAssignModal(false);
    setAssignForm({ stageId: "stg-4", campaignName: "", channel: "Google Ads" });
  };

  return (
    <div className="flex-1 space-y-6 max-w-[1600px] mx-auto text-foreground">
      {/* 1. TOP NAVIGATION HEADER */}
      <div className="flex items-center justify-between border-b border-border/40 pb-4">
        <Button variant="outline" size="sm" asChild className="h-8 text-xs font-semibold">
          <Link href="/dashboard/marketing/marketing-funnel">
            <FiArrowLeft className="mr-1.5 h-3.5 w-3.5" />
            Back to Strategic Marketing Funnels
          </Link>
        </Button>

        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" className="h-8 text-xs font-semibold px-3" asChild>
            <Link href="/dashboard/marketing/campaigns/create">
              <FiPlus className="mr-1.5 h-3.5 w-3.5" /> Create Execution Campaign
            </Link>
          </Button>
          <Button size="sm" className="h-8 text-xs font-semibold px-3 shadow-xs" onClick={() => setShowAssignModal(true)}>
            <FiPlus className="mr-1.5 h-3.5 w-3.5" /> Link Campaign to Stage
          </Button>
        </div>
      </div>

      {/* 2. HEADER STRATEGIC TITLE CARD */}
      <div className="p-4 sm:p-5 rounded-2xl border border-border/50 bg-card/60 backdrop-blur-md shadow-xs flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
              {funnel.name}
            </h1>
            <Badge variant="outline" className="text-[11px] font-bold px-2.5 py-0.5 border-purple-500/30 text-purple-600 dark:text-purple-400 bg-purple-500/5">
              Strategic Plan Envelope
            </Badge>
            <Badge variant="outline" className="text-[11px] font-bold px-2.5 py-0.5 uppercase text-emerald-500 border-emerald-500/30 bg-emerald-500/5">
              {funnel.status}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Funnel ID: {funnel.id} • Product: {funnel.productName} • Owner: {funnel.funnelOwner}
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
        </div>
      </div>

      {/* 3. EXECUTIVE SUMMARY SCORECARD */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-4 lg:grid-cols-6">
        <div className="p-3.5 rounded-xl border border-border/50 bg-card shadow-2xs space-y-1">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block">Revenue Goal</span>
          <div className="text-xl font-extrabold text-foreground">{funnel.revenueTarget}</div>
          <span className="text-[10px] text-emerald-500 font-semibold">Actual: {funnel.actualRevenue}</span>
        </div>

        <div className="p-3.5 rounded-xl border border-border/50 bg-card shadow-2xs space-y-1">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block">Approved Budget</span>
          <div className="text-xl font-extrabold text-amber-500">{funnel.approvedBudget}</div>
          <span className="text-[10px] text-muted-foreground">Spent: {funnel.actualSpend}</span>
        </div>

        <div className="p-3.5 rounded-xl border border-border/50 bg-card shadow-2xs space-y-1">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block">Lead Target</span>
          <div className="text-xl font-extrabold text-blue-500">{funnel.actualLeads} / {funnel.leadTarget}</div>
          <span className="text-[10px] text-blue-500 font-medium">85.3% Goal Met</span>
        </div>

        <div className="p-3.5 rounded-xl border border-border/50 bg-card shadow-2xs space-y-1">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block">Qualified SQLs</span>
          <div className="text-xl font-extrabold text-purple-500">{funnel.sqls} / {funnel.qualifiedLeadTarget}</div>
          <span className="text-[10px] text-purple-500 font-medium">84.0% SQL Goal</span>
        </div>

        <div className="p-3.5 rounded-xl border border-border/50 bg-card shadow-2xs space-y-1">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block">Customer Deals</span>
          <div className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400">{funnel.actualCustomers} / {funnel.customerTarget}</div>
          <span className="text-[10px] text-emerald-500 font-semibold">78.0% Deal Goal</span>
        </div>

        <div className="p-3.5 rounded-xl border border-border/50 bg-card shadow-2xs space-y-1">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block">Marketing ROI</span>
          <div className="text-xl font-extrabold text-purple-500">{funnel.roi}</div>
          <span className="text-[10px] text-purple-500 font-semibold">ROAS: {funnel.roas}</span>
        </div>
      </div>

      {/* 4. INTERNAL TABS (12 TABS AS SPECIFIED IN PROMPT) */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-muted/60 p-1 border border-border/40 flex flex-wrap h-auto gap-1">
          <TabsTrigger value="overview" className="text-xs font-semibold">1. Overview (Product/Service)</TabsTrigger>
          <TabsTrigger value="strategy" className="text-xs font-semibold">2. Strategy (Objective)</TabsTrigger>
          <TabsTrigger value="audience" className="text-xs font-semibold">3. Target Audience</TabsTrigger>
          <TabsTrigger value="market" className="text-xs font-semibold">4. Market Analysis</TabsTrigger>
          <TabsTrigger value="positioning" className="text-xs font-semibold">5. Positioning & Messaging</TabsTrigger>
          <TabsTrigger value="stages" className="text-xs font-semibold">6. Funnel Stages (7 Pipeline)</TabsTrigger>
          <TabsTrigger value="campaigns" className="text-xs font-semibold">7. Campaigns Plan</TabsTrigger>
          <TabsTrigger value="content" className="text-xs font-semibold">8. Content Plan</TabsTrigger>
          <TabsTrigger value="ads" className="text-xs font-semibold">9. Ads Plan</TabsTrigger>
          <TabsTrigger value="budget" className="text-xs font-semibold">10. Budget Roll-up</TabsTrigger>
          <TabsTrigger value="timeline" className="text-xs font-semibold">11. Timeline</TabsTrigger>
          <TabsTrigger value="performance" className="text-xs font-semibold">12. Performance & ROI</TabsTrigger>
        </TabsList>

        {/* TAB 1: OVERVIEW (PRODUCT / SERVICE) */}
        <TabsContent value="overview" className="space-y-4">
          <div className="rounded-2xl border border-border/50 bg-card p-5 shadow-xs space-y-4 text-xs">
            <h2 className="text-sm font-bold text-foreground border-b border-border/40 pb-2">Product / Service Strategic Blueprint</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <span className="text-muted-foreground text-[10px] uppercase font-semibold block">Product / Service Name</span>
                <p className="font-bold text-foreground text-sm mt-0.5">{funnel.productName}</p>
              </div>

              <div>
                <span className="text-muted-foreground text-[10px] uppercase font-semibold block">Main Call-To-Action (CTA)</span>
                <Badge variant="outline" className="text-xs font-bold text-blue-600 border-blue-300 mt-1">
                  {funnel.mainCTA}
                </Badge>
              </div>

              <div className="md:col-span-2">
                <span className="text-muted-foreground text-[10px] uppercase font-semibold block">Product Description</span>
                <p className="font-medium text-foreground mt-0.5 leading-relaxed">{funnel.productDescription}</p>
              </div>

              <div>
                <span className="text-muted-foreground text-[10px] uppercase font-semibold block">Key Features & Benefits</span>
                <p className="font-medium text-foreground mt-0.5">{funnel.keyFeatures}</p>
              </div>

              <div>
                <span className="text-muted-foreground text-[10px] uppercase font-semibold block">Problem Solved</span>
                <p className="font-medium text-foreground mt-0.5">{funnel.problemSolved}</p>
              </div>

              <div>
                <span className="text-muted-foreground text-[10px] uppercase font-semibold block">Unique Selling Proposition (USP)</span>
                <p className="font-bold text-purple-600 dark:text-purple-400 mt-0.5">{funnel.usp}</p>
              </div>

              <div>
                <span className="text-muted-foreground text-[10px] uppercase font-semibold block">Offer & Pricing Tiers</span>
                <p className="font-mono text-emerald-500 font-semibold mt-0.5">{funnel.pricing}</p>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* TAB 2: STRATEGY (MARKETING OBJECTIVE) */}
        <TabsContent value="strategy" className="space-y-4">
          <div className="rounded-2xl border border-border/50 bg-card p-5 shadow-xs space-y-4 text-xs">
            <h2 className="text-sm font-bold text-foreground border-b border-border/40 pb-2">Strategic Objectives & Target Benchmarks</h2>

            <div className="space-y-3">
              <div>
                <span className="text-muted-foreground text-[10px] uppercase font-semibold block">Primary Strategic Objective</span>
                <p className="font-bold text-foreground text-sm mt-0.5">{funnel.primaryObjective}</p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                <div className="p-3 rounded-xl border border-border/40 bg-background/50">
                  <span className="text-[10px] font-semibold text-muted-foreground block">Lead Target</span>
                  <div className="text-lg font-bold text-blue-500">{funnel.leadTarget} Leads</div>
                </div>
                <div className="p-3 rounded-xl border border-border/40 bg-background/50">
                  <span className="text-[10px] font-semibold text-muted-foreground block">SQL Target</span>
                  <div className="text-lg font-bold text-purple-500">{funnel.qualifiedLeadTarget} SQLs</div>
                </div>
                <div className="p-3 rounded-xl border border-border/40 bg-background/50">
                  <span className="text-[10px] font-semibold text-muted-foreground block">Customer Target</span>
                  <div className="text-lg font-bold text-emerald-500">{funnel.customerTarget} Won</div>
                </div>
                <div className="p-3 rounded-xl border border-border/40 bg-background/50">
                  <span className="text-[10px] font-semibold text-muted-foreground block">Revenue Goal</span>
                  <div className="text-lg font-bold text-foreground">{funnel.revenueTarget}</div>
                </div>
              </div>

              <div>
                <span className="text-muted-foreground text-[10px] uppercase font-semibold block">Main KPI Benchmark Targets</span>
                <p className="font-mono font-semibold text-emerald-500 mt-0.5">{funnel.kpiTargets}</p>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* TAB 3: TARGET AUDIENCE */}
        <TabsContent value="audience" className="space-y-4">
          <div className="rounded-2xl border border-border/50 bg-card p-5 shadow-xs space-y-4 text-xs">
            <h2 className="text-sm font-bold text-foreground border-b border-border/40 pb-2">Target Audience Persona & Segmentation</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <span className="text-muted-foreground text-[10px] uppercase font-semibold block">Target Industry</span>
                <p className="font-semibold text-foreground mt-0.5">Garments, Textiles, RMG Manufacturing & Apparel Exports</p>
              </div>

              <div>
                <span className="text-muted-foreground text-[10px] uppercase font-semibold block">Geography</span>
                <p className="font-semibold text-foreground mt-0.5">Dhaka, Chittagong, Gazipur, Narayanganj & SE Asia Industrial RMG Hubs</p>
              </div>

              <div>
                <span className="text-muted-foreground text-[10px] uppercase font-semibold block">Company / Customer Type</span>
                <p className="font-semibold text-foreground mt-0.5">Mid-Market & Large Enterprise Garment Factories (500+ Workers)</p>
              </div>

              <div>
                <span className="text-muted-foreground text-[10px] uppercase font-semibold block">Key Decision Makers</span>
                <p className="font-semibold text-foreground mt-0.5">Managing Directors, Chief Operating Officers, Factory Managers, Chief Accountants</p>
              </div>

              <div>
                <span className="text-muted-foreground text-[10px] uppercase font-semibold block">Core Pain Points</span>
                <p className="font-medium text-foreground mt-0.5">Manual attendance tracking, fabric wastage, compliance audit failures, delayed LC realization.</p>
              </div>

              <div>
                <span className="text-muted-foreground text-[10px] uppercase font-semibold block">Buying Triggers</span>
                <p className="font-medium text-foreground mt-0.5">Failed compliance audit, expanding to 2nd factory, loss of export order due to fabric inventory delay.</p>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* TAB 4: MARKET ANALYSIS */}
        <TabsContent value="market" className="space-y-4">
          <div className="rounded-2xl border border-border/50 bg-card p-5 shadow-xs space-y-4 text-xs">
            <h2 className="text-sm font-bold text-foreground border-b border-border/40 pb-2">Strategic Market Analysis & SWOT</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <span className="text-muted-foreground text-[10px] uppercase font-semibold block">Market Opportunity</span>
                <p className="font-medium text-foreground mt-0.5">$45 Billion Bangladesh RMG export market actively digitalizing floor operations.</p>
              </div>

              <div>
                <span className="text-muted-foreground text-[10px] uppercase font-semibold block">Competitors & Market Gaps</span>
                <p className="font-medium text-foreground mt-0.5">Legacy local desktop software & Excel. Gap: Lack of real-time mobile dashboard & Bengali UI for floor supervisors.</p>
              </div>

              <div className="md:col-span-2 p-4 rounded-xl border border-purple-500/20 bg-purple-500/5 space-y-2">
                <span className="font-bold text-purple-600 dark:text-purple-400 block">SWOT Analysis Summary</span>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div><strong>Strengths:</strong> Localized RMG workflow + guaranteed 7-day deployment.</div>
                  <div><strong>Weaknesses:</strong> Brand awareness expanding.</div>
                  <div><strong>Opportunities:</strong> 4,000+ factories upgrading for post-2025 compliance.</div>
                  <div><strong>Key Risks:</strong> Slow decision cycles in traditional family-owned factories.</div>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* TAB 5: POSITIONING & MESSAGING */}
        <TabsContent value="positioning" className="space-y-4">
          <div className="rounded-2xl border border-border/50 bg-card p-5 shadow-xs space-y-4 text-xs">
            <h2 className="text-sm font-bold text-foreground border-b border-border/40 pb-2">Brand Positioning & Core Messaging</h2>

            <div className="space-y-3">
              <div>
                <span className="text-muted-foreground text-[10px] uppercase font-semibold block">Value Proposition</span>
                <p className="font-bold text-foreground text-sm mt-0.5">&ldquo;The only ERP engineered specifically for Bangladesh Garment Factories.&rdquo;</p>
              </div>

              <div>
                <span className="text-muted-foreground text-[10px] uppercase font-semibold block">Core Campaign Message</span>
                <p className="font-medium text-foreground mt-0.5">&ldquo;Zero fabric wastage, 100% audit compliance &amp; real-time export tracking.&rdquo;</p>
              </div>

              <div>
                <span className="text-muted-foreground text-[10px] uppercase font-semibold block">Campaign Theme</span>
                <Badge variant="outline" className="text-xs font-bold text-purple-600 border-purple-300 mt-1">
                  Smart Factory 2026: Digitalize Your Garments Floor in 7 Days
                </Badge>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* TAB 6: FUNNEL STAGES PIPELINE (7 STAGES) */}
        <TabsContent value="stages" className="space-y-6">
          <div className="rounded-2xl border border-border/50 bg-card p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-border/40 pb-3">
              <div>
                <h2 className="text-sm font-bold text-foreground">7 Sequential Customer Journey Stages</h2>
                <p className="text-xs text-muted-foreground">Operational execution layers mapped directly to execution campaigns</p>
              </div>
              <span className="text-xs font-mono text-muted-foreground">7 Stages Active</span>
            </div>

            <div className="space-y-4">
              {funnelStages.map((stg, i) => (
                <div key={stg.id} className="p-4 rounded-2xl border border-border/50 bg-card shadow-2xs space-y-3">
                  <div className="flex items-center justify-between border-b border-border/30 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-foreground">0{i + 1}. {stg.name}</span>
                      <Badge variant="outline" className="text-[10px] font-mono text-purple-600 border-purple-300">
                        Conversion: {stg.conversionRate}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline" className="h-7 text-[11px] px-2.5" onClick={() => setShowAssignModal(true)}>
                        Connect Campaign
                      </Button>
                      <Button size="sm" className="h-7 text-[11px] px-2.5 font-semibold" asChild>
                        <Link href={`/dashboard/marketing/campaigns/create?funnelId=${funnel.id}&stageName=${encodeURIComponent(stg.name)}`}>
                          + Create Campaign
                        </Link>
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div>
                      <span className="text-[10px] text-muted-foreground uppercase font-semibold block">Stage Objective</span>
                      <p className="font-medium text-foreground mt-0.5">{stg.objective}</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground uppercase font-semibold block">Stage Channels</span>
                      <p className="font-medium text-foreground mt-0.5">{stg.channels?.join(", ") || "Omnichannel"}</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground uppercase font-semibold block">Budget Rollup</span>
                      <p className="font-mono text-amber-500 font-bold mt-0.5">Stage Budget: {stg.budget} (Spent: {stg.spend})</p>
                    </div>
                  </div>

                  {/* CONNECTED CAMPAIGNS SECTION */}
                  <div className="pt-2 border-t border-border/30">
                    <span className="text-[11px] font-bold text-foreground block mb-1.5">Connected Campaigns ({stg.assignedCampaigns.length})</span>
                    {stg.assignedCampaigns.length === 0 ? (
                      <div className="p-3 rounded-xl border border-dashed border-border/50 text-center text-muted-foreground text-xs">
                        No campaigns connected yet. Click <strong>+ Create Campaign</strong> to launch execution in Campaigns module.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                        {stg.assignedCampaigns.map(c => (
                          <div key={c.id} className="p-2.5 rounded-xl border border-border/40 bg-background/50 flex items-center justify-between text-xs">
                            <div>
                              <div className="font-bold text-foreground line-clamp-1">{c.name}</div>
                              <span className="text-[10px] text-muted-foreground block">{c.channel}</span>
                            </div>
                            <Button size="sm" variant="ghost" className="h-6 text-[10px] px-2 text-primary font-semibold" asChild>
                              <Link href={`/dashboard/marketing/campaigns/${c.id}`}>Open Campaign</Link>
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* TAB 7: CAMPAIGNS PLAN (LINK TO EXISTING CAMPAIGNS MODULE) */}
        <TabsContent value="campaigns" className="space-y-4">
          <div className="rounded-2xl border border-border/50 bg-card p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-border/40 pb-3">
              <div>
                <h2 className="text-sm font-bold text-foreground">Linked Execution Campaigns</h2>
                <p className="text-xs text-muted-foreground">Execution campaigns managed via the canonical Campaigns module</p>
              </div>
              <Button size="sm" className="h-8 text-xs font-semibold px-3" asChild>
                <Link href="/dashboard/marketing/campaigns/create">
                  <FiPlus className="mr-1.5 h-3.5 w-3.5" /> Create Campaign
                </Link>
              </Button>
            </div>

            <table className="w-full text-left text-xs">
              <thead className="bg-muted/40 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider border-b border-border/40">
                <tr>
                  <th className="px-4 py-3">Campaign Name</th>
                  <th className="px-4 py-3">Stage Link</th>
                  <th className="px-4 py-3">Primary Channel</th>
                  <th className="px-4 py-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {funnelStages.flatMap(stg => stg.assignedCampaigns.map(c => ({ ...c, stageName: stg.name }))).map((c) => (
                  <tr key={c.id} className="hover:bg-accent/20 transition-colors">
                    <td className="px-4 py-3.5 font-semibold text-foreground">{c.name}</td>
                    <td className="px-4 py-3.5">
                      <Badge variant="outline" className="text-[9px] px-2 py-0.2 font-semibold text-purple-600 border-purple-500/30">
                        {c.stageName}
                      </Badge>
                    </td>
                    <td className="px-4 py-3.5 text-muted-foreground">{c.channel}</td>
                    <td className="px-4 py-3.5 text-center">
                      <Button size="sm" variant="outline" className="h-7 px-2 text-[11px]" asChild>
                        <Link href={`/dashboard/marketing/campaigns/${c.id}`}>Open Campaign</Link>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* TAB 8: CONTENT PLAN (LINK TO CONTENT CALENDAR) */}
        <TabsContent value="content" className="space-y-4">
          <div className="rounded-2xl border border-border/50 bg-card p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-border/40 pb-3">
              <div>
                <h2 className="text-sm font-bold text-foreground">Content Strategy & Pillars</h2>
                <p className="text-xs text-muted-foreground">Actual scheduling and sign-off operates via Content Calendar</p>
              </div>
              <Button size="sm" variant="outline" className="h-8 text-xs font-semibold px-3" asChild>
                <Link href="/dashboard/marketing/content-calendar">
                  Open Content Calendar <FiChevronRight className="ml-1 h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
              <div className="p-3 rounded-xl border border-border/40 bg-background/50 space-y-1">
                <span className="font-bold text-foreground block">1. Educational</span>
                <p className="text-[11px] text-muted-foreground">4 Videos, 8 Posts on fabric wastage reduction.</p>
              </div>
              <div className="p-3 rounded-xl border border-border/40 bg-background/50 space-y-1">
                <span className="font-bold text-foreground block">2. Product Demos</span>
                <p className="text-[11px] text-muted-foreground">3 Floor dashboard walkthrough reels.</p>
              </div>
              <div className="p-3 rounded-xl border border-border/40 bg-background/50 space-y-1">
                <span className="font-bold text-foreground block">3. Social Proof</span>
                <p className="text-[11px] text-muted-foreground">2 Enterprise RMG client case studies.</p>
              </div>
              <div className="p-3 rounded-xl border border-border/40 bg-background/50 space-y-1">
                <span className="font-bold text-foreground block">4. Lead Offer</span>
                <p className="text-[11px] text-muted-foreground">1 Free Garments Digitalization Audit downloadable guide.</p>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* TAB 9: ADS PLAN (LINK TO PAID ADS MODULE) */}
        <TabsContent value="ads" className="space-y-4">
          <div className="rounded-2xl border border-border/50 bg-card p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-border/40 pb-3">
              <div>
                <h2 className="text-sm font-bold text-foreground">Paid Ads Strategy & Platform Allocations</h2>
                <p className="text-xs text-muted-foreground">Live PPC tracking operates via Paid Ads module</p>
              </div>
              <Button size="sm" variant="outline" className="h-8 text-xs font-semibold px-3" asChild>
                <Link href="/dashboard/marketing/paid-ads">
                  Open Paid Ads Manager <FiChevronRight className="ml-1 h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-xl border border-border/40 bg-background/50 space-y-2">
                <div className="font-bold text-foreground text-sm">Meta Lead Ads Strategy (FB & IG)</div>
                <p className="text-muted-foreground">Targeting Factory Owners & COOs in Dhaka & Gazipur with instant lead form demo bookings.</p>
                <div className="font-mono text-emerald-500 font-semibold">Planned Budget: ৳1,40,000 | Target CPL: &lt;৳250</div>
              </div>

              <div className="p-4 rounded-xl border border-border/40 bg-background/50 space-y-2">
                <div className="font-bold text-foreground text-sm">Google Search PPC Campaign</div>
                <p className="text-muted-foreground">High-intent keyword search for &apos;Garments ERP Software Bangladesh&apos;, &apos;RMG Payroll App&apos;.</p>
                <div className="font-mono text-emerald-500 font-semibold">Planned Budget: ৳1,00,000 | Target CPL: &lt;৳400</div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* TAB 10: BUDGET ROLL-UP (LINK TO BUDGET & EXPENSES) */}
        <TabsContent value="budget" className="space-y-4">
          <div className="rounded-2xl border border-border/50 bg-card p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-border/40 pb-3">
              <div>
                <h2 className="text-sm font-bold text-foreground">Financial Roll-Up Envelope</h2>
                <p className="text-xs text-muted-foreground">Total Budget → Stage Allocations → Campaign Budgets → Actual Vendor Expenses</p>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" className="h-7 text-xs font-medium" asChild>
                  <Link href="/dashboard/marketing/budget">Campaign Budget</Link>
                </Button>
                <Button size="sm" variant="outline" className="h-7 text-xs font-medium" asChild>
                  <Link href="/dashboard/marketing/expenses">Expenses Ledger</Link>
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
              <div className="p-3 rounded-xl border border-border/40 bg-background/50">
                <span className="text-[10px] text-muted-foreground font-semibold block">Approved Funnel Envelope</span>
                <div className="text-lg font-bold text-foreground">{funnel.approvedBudget}</div>
              </div>
              <div className="p-3 rounded-xl border border-border/40 bg-background/50">
                <span className="text-[10px] text-muted-foreground font-semibold block">Stage Allocations</span>
                <div className="text-lg font-bold text-purple-500">{funnel.allocatedBudget}</div>
              </div>
              <div className="p-3 rounded-xl border border-border/40 bg-background/50">
                <span className="text-[10px] text-muted-foreground font-semibold block">Actual Spend</span>
                <div className="text-lg font-bold text-amber-500">{funnel.actualSpend}</div>
              </div>
              <div className="p-3 rounded-xl border border-border/40 bg-background/50">
                <span className="text-[10px] text-muted-foreground font-semibold block">Remaining Unallocated</span>
                <div className="text-lg font-bold text-emerald-500">{funnel.remainingBudget}</div>
              </div>
              <div className="p-3 rounded-xl border border-border/40 bg-background/50">
                <span className="text-[10px] text-muted-foreground font-semibold block">Budget Variance</span>
                <div className="text-lg font-bold text-emerald-600">+৳1,75,000</div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* TAB 11: TIMELINE */}
        <TabsContent value="timeline" className="space-y-4">
          <div className="rounded-2xl border border-border/50 bg-card p-5 shadow-xs space-y-4 text-xs">
            <h2 className="text-sm font-bold text-foreground border-b border-border/40 pb-2">Funnel Timeline & Execution Windows</h2>
            <div className="space-y-2">
              <div className="flex justify-between p-3 rounded-xl border border-border/40 bg-background/50">
                <span className="font-semibold text-foreground">Overall Funnel Schedule</span>
                <span className="font-mono text-purple-500 font-bold">{funnel.startDate} to {funnel.endDate}</span>
              </div>
              <div className="flex justify-between p-3 rounded-xl border border-border/40 bg-background/50">
                <span className="font-semibold text-foreground">Awareness & Reach Campaign Launch</span>
                <span className="font-mono text-blue-500">Sep 01 – Sep 20, 2026</span>
              </div>
              <div className="flex justify-between p-3 rounded-xl border border-border/40 bg-background/50">
                <span className="font-semibold text-foreground">Lead Generation Form Launch</span>
                <span className="font-mono text-emerald-500 font-bold">Sep 15 – Oct 31, 2026</span>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* TAB 12: PERFORMANCE & ROI (LINK TO ATTRIBUTION & ROI REPORTS) */}
        <TabsContent value="performance" className="space-y-4">
          <div className="rounded-2xl border border-border/50 bg-card p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-border/40 pb-3">
              <div>
                <h2 className="text-sm font-bold text-foreground">Performance Roll-Up & Attribution</h2>
                <p className="text-xs text-muted-foreground">Rolled up from existing Attribution & ROI Report engines</p>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" className="h-7 text-xs font-medium" asChild>
                  <Link href="/dashboard/marketing/attribution">Attribution Models</Link>
                </Button>
                <Button size="sm" variant="outline" className="h-7 text-xs font-medium" asChild>
                  <Link href="/dashboard/marketing/roi-reports">ROI Reports</Link>
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="p-4 rounded-xl border border-border/40 bg-background/50 space-y-1">
                <span className="text-muted-foreground text-[10px] uppercase font-semibold block">First-Touch Revenue</span>
                <div className="text-xl font-bold text-foreground">৳48,00,000</div>
                <span className="text-[10px] text-muted-foreground">Meta Ads & Google Search</span>
              </div>
              <div className="p-4 rounded-xl border border-border/40 bg-background/50 space-y-1">
                <span className="text-muted-foreground text-[10px] uppercase font-semibold block">Cost Per Customer (CAC)</span>
                <div className="text-xl font-bold text-purple-500">৳4,935</div>
                <span className="text-[10px] text-emerald-500 font-semibold">Target &lt;৳8,000</span>
              </div>
              <div className="p-4 rounded-xl border border-border/40 bg-background/50 space-y-1">
                <span className="text-muted-foreground text-[10px] uppercase font-semibold block">Attributed ROAS</span>
                <div className="text-xl font-bold text-emerald-500">12.5x</div>
                <span className="text-[10px] text-emerald-500 font-semibold">Net Profit ROI: 340%</span>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* ASSIGN CAMPAIGN MODAL */}
      {showAssignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl bg-card border border-border/60 p-6 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-border/40 pb-3">
              <h3 className="text-base font-bold text-foreground">Link Campaign to Funnel Stage</h3>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowAssignModal(false)}>
                <FiX className="h-4 w-4" />
              </Button>
            </div>

            <form onSubmit={handleAssignSubmit} className="space-y-4">
              <div>
                <label className="block font-semibold text-foreground mb-1">Target Funnel Stage</label>
                <select
                  value={assignForm.stageId}
                  onChange={(e) => setAssignForm({ ...assignForm, stageId: e.target.value })}
                  className="w-full h-8 px-2 rounded-md border border-border bg-background text-foreground text-xs"
                >
                  {funnelStages.map((s) => (
                    <option key={s.id} value={s.id}>
                      Stage 0{s.position}: {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-foreground mb-1">Campaign Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Q4 Garments ERP Search Ad Campaign"
                  value={assignForm.campaignName}
                  onChange={(e) => setAssignForm({ ...assignForm, campaignName: e.target.value })}
                  className="w-full h-8 px-3 rounded-md border border-border bg-background text-foreground text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-foreground mb-1">Channel</label>
                <input
                  type="text"
                  placeholder="e.g. Google Ads, Meta Ads, Email"
                  value={assignForm.channel}
                  onChange={(e) => setAssignForm({ ...assignForm, channel: e.target.value })}
                  className="w-full h-8 px-3 rounded-md border border-border bg-background text-foreground text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-border/40">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowAssignModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" className="font-semibold">
                  Link Campaign to Stage
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
