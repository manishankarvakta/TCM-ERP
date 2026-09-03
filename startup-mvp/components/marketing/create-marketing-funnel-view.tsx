"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  FiArrowLeft,
  FiChevronRight,
  FiChevronDown,
} from "react-icons/fi";
import { createMarketingFunnelPlanAction } from "@/app/actions/crm/marketing-operations.action";

export default function CreateMarketingFunnelView() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // STEP 1 — FUNNEL SETUP
  const [name, setName] = useState("Q4 Garments ERP Strategic Marketing Funnel");
  const [productName, setProductName] = useState("Enterprise Garments ERP & HR Suite");
  const [productDescription, setProductDescription] = useState("All-in-one manufacturing, merchandising, inventory, Bengali payroll & export LC tracking platform.");
  const [problemSolved, setProblemSolved] = useState("Fabric wastage, delayed export shipments, payroll discrepancies & audit failures.");
  const [usp, setUsp] = useState("100% Bangladesh RMG compliance + real-time floor tracking with 7-day deployment.");
  const [mainCTA, setMainCTA] = useState("Book Free Factory Digital Audit");
  const [primaryObjective, setPrimaryObjective] = useState("Acquire 100 new enterprise garment factory clients by Q4 2026 across Dhaka & Chittagong RMG hubs.");
  const [leadTarget, setLeadTarget] = useState("1500");
  const [sqlTarget, setSqlTarget] = useState("500");
  const [customerTarget, setCustomerTarget] = useState("100");
  const [targetRevenue, setTargetRevenue] = useState("12000000");

  // STEP 2 — AUDIENCE & MARKET
  const [audienceSegment, setAudienceSegment] = useState("Large Garment Export Factories (500+ workers)");
  const [decisionMakers, setDecisionMakers] = useState("Managing Directors, COOs, Factory Managers, Chief Accountants");
  const [marketOpportunity, setMarketOpportunity] = useState("$45 Billion RMG export market digitalizing floor operations.");
  const [keyCompetitors, setKeyCompetitors] = useState("Legacy desktop apps & Excel manual tracking.");
  const [marketGaps, setMarketGaps] = useState("Lack of real-time mobile dashboard & Bengali UI for floor supervisors.");
  const [valueProp, setValueProp] = useState("The only ERP engineered specifically for Bangladesh Garment Factories.");
  const [coreMessage, setCoreMessage] = useState("Zero fabric wastage, 100% audit compliance & real-time export tracking.");
  const [campaignTheme, setCampaignTheme] = useState("Smart Factory 2026: Digitalize Your Garments Floor in 7 Days");

  // STEP 3 — FUNNEL STAGES (STRATEGIC STAGE BLUEPRINT ONLY - NO CAMPAIGNS HERE)
  const [stages, setStages] = useState([
    { id: 1, name: "Awareness", selected: true, expanded: true, position: 1, objective: "Brand reach & problem education", plannedBudget: 100000, mainKPI: "Reach", kpiTarget: "250,000", channels: "Facebook, LinkedIn, YouTube" },
    { id: 2, name: "Acknowledgment", selected: true, expanded: false, position: 2, objective: "Message recognition & case studies", plannedBudget: 50000, mainKPI: "Content Views", kpiTarget: "55,000", channels: "Email, Website, SMS" },
    { id: 3, name: "Engagement", selected: true, expanded: false, position: 3, objective: "Webinars & interactive downloads", plannedBudget: 70000, mainKPI: "Interactions", kpiTarget: "14,500", channels: "Webinar, WhatsApp" },
    { id: 4, name: "Lead Generation", selected: true, expanded: false, position: 4, objective: "High-intent lead captures", plannedBudget: 140000, mainKPI: "Leads", kpiTarget: "1,280", channels: "Meta Lead Ads, Google Search" },
    { id: 5, name: "Lead Nurturing", selected: true, expanded: false, position: 5, objective: "Email sequences & sales handoff", plannedBudget: 40000, mainKPI: "SQLs", kpiTarget: "420", channels: "Email, WhatsApp" },
    { id: 6, name: "Sales Conversion", selected: true, expanded: false, position: 6, objective: "Proposals & closing won deals", plannedBudget: 70000, mainKPI: "Won Customers", kpiTarget: "78", channels: "Direct Sales Team" },
    { id: 7, name: "Retention / Remarketing", selected: true, expanded: false, position: 7, objective: "Customer renewals & referrals", plannedBudget: 30000, mainKPI: "Renewals", kpiTarget: "78", channels: "Google Display, Email" },
  ]);

  // STEP 4 — EXECUTION PLAN
  const channelOptions = ["Facebook", "Instagram", "LinkedIn", "YouTube", "Google Search", "SEO", "Email", "SMS", "WhatsApp", "Website", "Events", "Referral", "Sales Outreach"];
  const [selectedChannels, setSelectedChannels] = useState(["Facebook", "LinkedIn", "Google Search", "Email", "SMS", "WhatsApp"]);
  const [contentPillars, setContentPillars] = useState("Educational, Product Demos, Social Proof Case Studies, Lead Magnets");
  const [approvedBudget, setApprovedBudget] = useState("500000");
  const [startDate, setStartDate] = useState("2026-09-01");
  const [endDate, setEndDate] = useState("2026-12-31");
  const [mainConversionGoal, setMainConversionGoal] = useState("Factory Audit Form Submission");
  const [funnelOwner, setFunnelOwner] = useState("Farhana Yeasmin (Head of Marketing)");

  // Live Budget Calculations
  const allocatedStageBudget = stages.filter(s => s.selected).reduce((acc, curr) => acc + (curr.plannedBudget || 0), 0);
  const totalApproved = parseInt(approvedBudget || "0");
  const unallocatedBudget = Math.max(0, totalApproved - allocatedStageBudget);

  const stepsList = [
    { num: 1, title: "Funnel Setup" },
    { num: 2, title: "Audience & Market" },
    { num: 3, title: "Funnel Stages" },
    { num: 4, title: "Execution Plan" },
    { num: 5, title: "Review & Create" },
  ];

  const handleCreateSubmit = async (isDraft = false) => {
    setIsSubmitting(true);
    try {
      const res = await createMarketingFunnelPlanAction({
        name,
        productName,
        productDescription,
        problemSolved,
        usp,
        mainCTA,
        primaryObjective,
        leadTarget: parseInt(leadTarget || "0"),
        sqlTarget: parseInt(sqlTarget || "0"),
        customerTarget: parseInt(customerTarget || "0"),
        targetRevenue: parseInt(targetRevenue || "0"),
        approvedBudget: totalApproved,
        startDate,
        endDate,
        isDraft,
        selectedStages: stages.filter(s => s.selected).map(s => ({
          name: s.name,
          position: s.position,
          objective: s.objective,
          plannedBudget: s.plannedBudget,
          mainKPI: s.mainKPI,
        })),
      });

      setIsSubmitting(false);

      if (res.success && res.funnelId) {
        router.push(`/dashboard/marketing/marketing-funnel/${res.funnelId}`);
      } else {
        alert(res.error || "Failed to submit marketing funnel");
      }
    } catch (err) {
      console.error(err);
      setIsSubmitting(false);
      alert("Error submitting form");
    }
  };

  return (
    <div className="flex-1 space-y-6 max-w-[1300px] mx-auto text-foreground">
      {/* TOP HEADER */}
      <div className="flex items-center justify-between border-b border-border/40 pb-4">
        <Button variant="outline" size="sm" asChild className="h-8 text-xs font-semibold">
          <Link href="/dashboard/marketing/marketing-funnel">
            <FiArrowLeft className="mr-1.5 h-3.5 w-3.5" />
            Back to Marketing Funnels
          </Link>
        </Button>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-8 text-xs font-semibold" onClick={() => handleCreateSubmit(true)}>
            Save Draft
          </Button>
        </div>
      </div>

      {/* SIMPLIFIED 5-STEPPER BAR */}
      <div className="p-3 rounded-2xl border border-border/50 bg-card/60 overflow-x-auto">
        <div className="flex items-center justify-between min-w-max gap-2">
          {stepsList.map((st) => (
            <button
              key={st.num}
              onClick={() => setCurrentStep(st.num)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                currentStep === st.num
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : currentStep > st.num
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                  : "text-muted-foreground hover:bg-accent/40"
              }`}
            >
              <span className="w-5 h-5 rounded-full bg-background/30 flex items-center justify-center text-[11px] font-bold">
                {st.num}
              </span>
              <span>{st.title}</span>
            </button>
          ))}
        </div>
      </div>

      {/* STEP CONTENT */}
      <div className="space-y-6 text-xs">
        {/* STEP 1: FUNNEL SETUP */}
        {currentStep === 1 && (
          <div className="rounded-2xl border border-border/50 bg-card p-6 shadow-xs space-y-5">
            <div className="border-b border-border/40 pb-2">
              <h2 className="text-base font-bold text-foreground">Step 1 — Funnel Setup & Strategic Goals</h2>
              <p className="text-muted-foreground text-[11px]">Define funnel identity, product details and target revenue benchmarks</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block font-semibold mb-1">Marketing Funnel Name *</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full h-9 px-3 rounded-lg border border-border bg-background text-foreground text-xs" />
              </div>

              <div>
                <label className="block font-semibold mb-1">Product / Service Name</label>
                <input type="text" value={productName} onChange={(e) => setProductName(e.target.value)} className="w-full h-9 px-3 rounded-lg border border-border bg-background text-foreground text-xs" />
              </div>

              <div>
                <label className="block font-semibold mb-1">Main Call-To-Action (CTA)</label>
                <input type="text" value={mainCTA} onChange={(e) => setMainCTA(e.target.value)} className="w-full h-9 px-3 rounded-lg border border-border bg-background text-foreground text-xs" />
              </div>

              <div className="md:col-span-2">
                <label className="block font-semibold mb-1">Product Description</label>
                <textarea rows={2} value={productDescription} onChange={(e) => setProductDescription(e.target.value)} className="w-full p-3 rounded-lg border border-border bg-background text-foreground text-xs" />
              </div>

              <div>
                <label className="block font-semibold mb-1">Problem Solved</label>
                <input type="text" value={problemSolved} onChange={(e) => setProblemSolved(e.target.value)} className="w-full h-9 px-3 rounded-lg border border-border bg-background text-foreground text-xs" />
              </div>

              <div>
                <label className="block font-semibold mb-1">Unique Selling Proposition (USP)</label>
                <input type="text" value={usp} onChange={(e) => setUsp(e.target.value)} className="w-full h-9 px-3 rounded-lg border border-border bg-background text-foreground text-xs" />
              </div>

              <div className="md:col-span-2 pt-2 border-t border-border/40">
                <label className="block font-semibold mb-1">Primary Strategic Objective</label>
                <input type="text" value={primaryObjective} onChange={(e) => setPrimaryObjective(e.target.value)} className="w-full h-9 px-3 rounded-lg border border-border bg-background text-foreground text-xs" />
              </div>

              <div>
                <label className="block font-semibold mb-1">Target Revenue Goal (৳)</label>
                <input type="number" value={targetRevenue} onChange={(e) => setTargetRevenue(e.target.value)} className="w-full h-9 px-3 rounded-lg border border-border bg-background font-mono text-foreground text-xs" />
              </div>

              <div>
                <label className="block font-semibold mb-1">Lead Target</label>
                <input type="number" value={leadTarget} onChange={(e) => setLeadTarget(e.target.value)} className="w-full h-9 px-3 rounded-lg border border-border bg-background font-mono text-foreground text-xs" />
              </div>

              <div>
                <label className="block font-semibold mb-1">SQL Target</label>
                <input type="number" value={sqlTarget} onChange={(e) => setSqlTarget(e.target.value)} className="w-full h-9 px-3 rounded-lg border border-border bg-background font-mono text-foreground text-xs" />
              </div>

              <div>
                <label className="block font-semibold mb-1">Customer Deal Target</label>
                <input type="number" value={customerTarget} onChange={(e) => setCustomerTarget(e.target.value)} className="w-full h-9 px-3 rounded-lg border border-border bg-background font-mono text-foreground text-xs" />
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: AUDIENCE & MARKET */}
        {currentStep === 2 && (
          <div className="rounded-2xl border border-border/50 bg-card p-6 shadow-xs space-y-5">
            <div className="border-b border-border/40 pb-2">
              <h2 className="text-base font-bold text-foreground">Step 2 — Audience & Market Analysis</h2>
              <p className="text-muted-foreground text-[11px]">Define audience segments, decision makers, market gaps and core messaging</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold mb-1">Audience Segment</label>
                <input type="text" value={audienceSegment} onChange={(e) => setAudienceSegment(e.target.value)} className="w-full h-9 px-3 rounded-lg border border-border bg-background text-foreground text-xs" />
              </div>

              <div>
                <label className="block font-semibold mb-1">Decision Makers</label>
                <input type="text" value={decisionMakers} onChange={(e) => setDecisionMakers(e.target.value)} className="w-full h-9 px-3 rounded-lg border border-border bg-background text-foreground text-xs" />
              </div>

              <div>
                <label className="block font-semibold mb-1">Market Opportunity</label>
                <input type="text" value={marketOpportunity} onChange={(e) => setMarketOpportunity(e.target.value)} className="w-full h-9 px-3 rounded-lg border border-border bg-background text-foreground text-xs" />
              </div>

              <div>
                <label className="block font-semibold mb-1">Key Competitors</label>
                <input type="text" value={keyCompetitors} onChange={(e) => setKeyCompetitors(e.target.value)} className="w-full h-9 px-3 rounded-lg border border-border bg-background text-foreground text-xs" />
              </div>

              <div className="md:col-span-2">
                <label className="block font-semibold mb-1">Market Gaps</label>
                <input type="text" value={marketGaps} onChange={(e) => setMarketGaps(e.target.value)} className="w-full h-9 px-3 rounded-lg border border-border bg-background text-foreground text-xs" />
              </div>

              <div className="md:col-span-2 pt-2 border-t border-border/40">
                <label className="block font-semibold mb-1">Value Proposition</label>
                <input type="text" value={valueProp} onChange={(e) => setValueProp(e.target.value)} className="w-full h-9 px-3 rounded-lg border border-border bg-background text-foreground text-xs" />
              </div>

              <div>
                <label className="block font-semibold mb-1">Campaign Theme</label>
                <input type="text" value={campaignTheme} onChange={(e) => setCampaignTheme(e.target.value)} className="w-full h-9 px-3 rounded-lg border border-border bg-background text-foreground text-xs" />
              </div>

              <div>
                <label className="block font-semibold mb-1">Core Message</label>
                <input type="text" value={coreMessage} onChange={(e) => setCoreMessage(e.target.value)} className="w-full h-9 px-3 rounded-lg border border-border bg-background text-foreground text-xs" />
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: FUNNEL STAGES (STRATEGIC STAGE BLUEPRINT ONLY) */}
        {currentStep === 3 && (
          <div className="space-y-4">
            {/* LIVE BUDGET SUMMARY BAR */}
            <div className="p-4 rounded-2xl border border-purple-500/30 bg-purple-500/5 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-5">
                <div>
                  <span className="text-[10px] font-semibold uppercase text-muted-foreground block">Approved Budget</span>
                  <div className="text-lg font-bold text-foreground">৳{totalApproved.toLocaleString()}</div>
                </div>
                <div>
                  <span className="text-[10px] font-semibold uppercase text-muted-foreground block">Allocated Stages</span>
                  <div className="text-lg font-bold text-purple-500">৳{allocatedStageBudget.toLocaleString()}</div>
                </div>
                <div>
                  <span className="text-[10px] font-semibold uppercase text-muted-foreground block">Unallocated</span>
                  <div className="text-lg font-bold text-emerald-500">৳{unallocatedBudget.toLocaleString()}</div>
                </div>
              </div>

              <Badge variant="outline" className="text-xs font-bold text-purple-600 border-purple-300">
                {stages.filter(s => s.selected).length} Stages Defined
              </Badge>
            </div>

            {/* EXPANDABLE STAGE CARDS */}
            <div className="space-y-3">
              {stages.map((stg, i) => (
                <div key={stg.id} className="rounded-2xl border border-border/50 bg-card overflow-hidden shadow-2xs">
                  <div
                    className="p-4 bg-muted/30 flex items-center justify-between cursor-pointer select-none"
                    onClick={() => setStages(stages.map(s => s.id === stg.id ? { ...s, expanded: !s.expanded } : s))}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={stg.selected}
                        onChange={(e) => {
                          e.stopPropagation();
                          setStages(stages.map(s => s.id === stg.id ? { ...s, selected: !s.selected } : s));
                        }}
                        className="rounded border-border text-primary focus:ring-primary h-4 w-4"
                      />
                      <span className="font-bold text-sm text-foreground">0{i + 1}. {stg.name}</span>
                      <Badge variant="outline" className="text-[9px] font-mono text-amber-500 border-amber-500/30">
                        ৳{stg.plannedBudget.toLocaleString()}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">KPI: {stg.mainKPI} ({stg.kpiTarget})</span>
                      {stg.expanded ? <FiChevronDown className="h-4 w-4" /> : <FiChevronRight className="h-4 w-4" />}
                    </div>
                  </div>

                  {stg.expanded && (
                    <div className="p-4 border-t border-border/40 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                      <div className="md:col-span-2">
                        <label className="block font-semibold mb-1">Stage Objective</label>
                        <input
                          type="text"
                          value={stg.objective}
                          onChange={(e) => setStages(stages.map(s => s.id === stg.id ? { ...s, objective: e.target.value } : s))}
                          className="w-full h-8 px-3 rounded-md border border-border bg-background text-foreground text-xs"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold mb-1">Planned Budget (৳)</label>
                        <input
                          type="number"
                          value={stg.plannedBudget}
                          onChange={(e) => setStages(stages.map(s => s.id === stg.id ? { ...s, plannedBudget: parseInt(e.target.value || "0") } : s))}
                          className="w-full h-8 px-3 rounded-md border border-border bg-background font-mono text-foreground text-xs"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold mb-1">Main KPI & Target</label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={stg.mainKPI}
                            onChange={(e) => setStages(stages.map(s => s.id === stg.id ? { ...s, mainKPI: e.target.value } : s))}
                            className="w-1/2 h-8 px-2 rounded-md border border-border bg-background text-xs"
                          />
                          <input
                            type="text"
                            value={stg.kpiTarget}
                            onChange={(e) => setStages(stages.map(s => s.id === stg.id ? { ...s, kpiTarget: e.target.value } : s))}
                            className="w-1/2 h-8 px-2 rounded-md border border-border bg-background text-xs"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* STEP 4: EXECUTION PLAN */}
        {currentStep === 4 && (
          <div className="space-y-5">
            <div className="rounded-2xl border border-border/50 bg-card p-6 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-foreground border-b border-border/40 pb-2">1. Marketing Channels ({selectedChannels.length} Selected)</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {channelOptions.map(ch => (
                  <button
                    key={ch}
                    type="button"
                    onClick={() => setSelectedChannels(selectedChannels.includes(ch) ? selectedChannels.filter(c => c !== ch) : [...selectedChannels, ch])}
                    className={`p-2 rounded-xl border text-xs text-left ${selectedChannels.includes(ch) ? "border-primary bg-primary/10 font-bold" : "border-border/40 bg-background/50"}`}
                  >
                    {ch}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-border/50 bg-card p-6 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-foreground border-b border-border/40 pb-2">2. Content Strategy & Pillars</h3>
              <textarea rows={2} value={contentPillars} onChange={(e) => setContentPillars(e.target.value)} className="w-full p-3 rounded-lg border border-border bg-background text-xs" />
            </div>

            <div className="rounded-2xl border border-border/50 bg-card p-6 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-foreground border-b border-border/40 pb-2">3. Budget Envelope & Schedule</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block font-semibold mb-1">Approved Budget Envelope (৳)</label>
                  <input type="number" value={approvedBudget} onChange={(e) => setApprovedBudget(e.target.value)} className="w-full h-9 px-3 rounded-lg border border-border bg-background font-mono text-xs" />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Start Date</label>
                  <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full h-9 px-3 rounded-lg border border-border bg-background text-xs" />
                </div>
                <div>
                  <label className="block font-semibold mb-1">End Date</label>
                  <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full h-9 px-3 rounded-lg border border-border bg-background text-xs" />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-border/50 bg-card p-6 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-foreground border-b border-border/40 pb-2">4. Tracking & Team Assignment</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold mb-1">Main Conversion Goal</label>
                  <input type="text" value={mainConversionGoal} onChange={(e) => setMainConversionGoal(e.target.value)} className="w-full h-9 px-3 rounded-lg border border-border bg-background text-xs" />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Funnel Owner</label>
                  <input type="text" value={funnelOwner} onChange={(e) => setFunnelOwner(e.target.value)} className="w-full h-9 px-3 rounded-lg border border-border bg-background text-xs" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 5: REVIEW & CREATE */}
        {currentStep === 5 && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-purple-500/30 bg-card p-6 shadow-xs space-y-4">
              <h2 className="text-base font-bold text-foreground border-b border-border/40 pb-2">Step 5 — Final Blueprint Review & Creation</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <span className="text-muted-foreground text-[10px] uppercase font-semibold block">Funnel Name</span>
                  <p className="font-bold text-foreground text-sm mt-0.5">{name}</p>
                </div>
                <div>
                  <span className="text-muted-foreground text-[10px] uppercase font-semibold block">Product / Service</span>
                  <p className="font-bold text-foreground text-sm mt-0.5">{productName}</p>
                </div>
                <div>
                  <span className="text-muted-foreground text-[10px] uppercase font-semibold block">Revenue Goal</span>
                  <p className="font-mono font-bold text-emerald-500 text-sm mt-0.5">৳{parseInt(targetRevenue || "0").toLocaleString()}</p>
                </div>
                <div>
                  <span className="text-muted-foreground text-[10px] uppercase font-semibold block">Approved Budget Envelope</span>
                  <p className="font-mono font-bold text-amber-500 text-sm mt-0.5">৳{totalApproved.toLocaleString()}</p>
                </div>
              </div>

              {/* CONFIGURED STAGES TABLE */}
              <div className="pt-2">
                <span className="font-bold text-foreground block mb-2">Configured Funnel Stages ({stages.filter(s => s.selected).length})</span>
                <div className="space-y-1.5">
                  {stages.filter(s => s.selected).map(s => (
                    <div key={s.id} className="p-2.5 rounded-lg border border-border/40 bg-background/50 flex justify-between">
                      <span className="font-semibold">{s.position}. {s.name}</span>
                      <span className="font-mono text-amber-500">৳{s.plannedBudget.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <Button variant="outline" size="sm" onClick={() => setCurrentStep(4)}>
                <FiArrowLeft className="mr-1.5 h-3.5 w-3.5" /> Back
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => handleCreateSubmit(true)}>
                  Save Draft
                </Button>
                <Button size="sm" disabled={isSubmitting} onClick={() => handleCreateSubmit(false)} className="font-semibold px-6">
                  {isSubmitting ? "Creating..." : "Create Marketing Funnel"}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* STEP NAVIGATION BUTTONS (FOR STEPS 1-4) */}
        {currentStep < 5 && (
          <div className="flex items-center justify-between pt-4 border-t border-border/40">
            <Button
              variant="outline"
              size="sm"
              disabled={currentStep === 1}
              onClick={() => setCurrentStep(currentStep - 1)}
              className="h-9 px-4"
            >
              <FiArrowLeft className="mr-1.5 h-3.5 w-3.5" /> Previous Step
            </Button>

            <Button
              size="sm"
              onClick={() => setCurrentStep(currentStep + 1)}
              className="h-9 px-6 font-semibold shadow-xs"
            >
              Next: {stepsList[currentStep]?.title || "Review"} <FiChevronRight className="ml-1.5 h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
